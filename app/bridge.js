/* BIOBUZZ — הגשר (שלט טלפון + חדר למשחק ברשת), מובנה באפליקציה.
   תרגום נאמן של padbridge.py: אותם נתיבים (/ws, /health, /, /sim, /join), אותם תפקידים
   (pad, sim, host, guest) ואותו קוד חדר — כך שהסימולטור לא יודע אם הגשר הוא פייתון או האפליקציה.
   רשת מקומית בלבד.
   v63 — אבטחה:
   • כל חיבור WebSocket נבדק לפי Origin: רק file:// / null (הסימולטור מקובץ ובאפליקציה) או הכתובת של הגשר עצמו
     (דף השלט ו-/join). אתר אחר בדפדפן לא יכול להתחבר.
   • sim / host (רק מהמחשב הזה) צריכים גם אסימון סודי שנוצר בכל הפעלה (האפליקציה נותנת אותו לדף דרך preload).
   • מפתח החדר 32 ביט, ומספר הניסיונות השגויים מוגבל לכל כתובת (ונעילה).
   • /health לא מחזיר קוד חדר ולא שמות/כתובות של אורחים.
   • הודעת אורח מפוענחת ונבנית מחדש (אין הדבקת טקסט לתוך JSON).
   • עמוד /join נשמר בזיכרון פעם אחת; תקרת חיבורים לכל כתובת; פינג לחיבורים מתים. */
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { WebSocketServer } = require("ws");

const AB = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY_MIN = 0x10000, KEY_MAX = 0x100000000;   /* מפתח חדש: 32 ביט (גדול מ-16 ביט כדי שלא יתבלבל עם קודים ישנים) */
function netCheck(d) { let s = 0; for (let i = 0; i < d.length; i++) s += (i + 1) * d[i]; return s % 32; }
function b32(n, len) { const d = []; for (let i = 0; i < len; i++) { d.unshift(Number(n & 31n)); n >>= 5n; } return d; }
/* קוד חדר = כתובת + מפתח. אותה פונקציה בדיוק בסימולטור ובגשר בפייתון.
   • מפתח ישן (עד 12/14 ביט): הפורמטים הישנים — XXX-XXX ב-192.168 ו-XXXX-XXXX-XXX אחרת.
   • מפתח 32 ביט (v63): ב-192.168 על הפורט הרגיל — XXXXX-XXXXX (16 ביט כתובת + 32 ביט מפתח + 2 ביט ביקורת);
     אחרת — XXXXX-XXXXX-XXXXX (32 ביט כתובת, 4 ביט פורט, 32 ביט מפתח, ספרת ביקורת). */
function roomCode(ip, port, key) {
  const p = String(ip).split(".").map(Number); const off = port - 9662;
  if (p.length !== 4 || p.some(v => !(v >= 0 && v <= 255)) || off < 0 || off > 15 || !(key > 0)) return "";
  if (key < 0x1000 && p[0] === 192 && p[1] === 168 && off === 0) {
    let n = (p[2] << 20) | (p[3] << 12) | key; const d = [];
    for (let i = 0; i < 6; i++) { d.unshift(n & 31); n >>>= 5; }
    const s = d.map(v => AB[v]).join(""); return s.slice(0, 3) + "-" + s.slice(3);
  }
  if (key < 0x4000) {
    let n = 0n;
    for (const v of p) n = (n << 8n) | BigInt(v);
    n = (n << 4n) | BigInt(off); n = (n << 14n) | BigInt(key & 0x3FFF);
    const d = b32(n, 10);
    d.push(netCheck(d));
    const s = d.map(v => AB[v]).join("");
    return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8);
  }
  const k = BigInt(Math.floor(key) >>> 0);
  if (p[0] === 192 && p[1] === 168 && off === 0) {
    const d = b32((BigInt(p[2]) << 40n) | (BigInt(p[3]) << 32n) | k, 10);
    d[0] += 8 * (netCheck(d.slice(1)) & 3);
    const s = d.map(v => AB[v]).join(""); return s.slice(0, 5) + "-" + s.slice(5);
  }
  let n = 0n;
  for (const v of p) n = (n << 8n) | BigInt(v);
  n = (n << 4n) | BigInt(off); n = (n << 32n) | k;
  const d = b32(n, 14);
  d.push(netCheck(d));
  const s = d.map(v => AB[v]).join("");
  return s.slice(0, 5) + "-" + s.slice(5, 10) + "-" + s.slice(10);
}
function norm(a) { return String(a || "").replace(/^::ffff:/, ""); }
function isLocal(a) { a = norm(a); return a === "127.0.0.1" || a === "::1" || a.startsWith("127."); }
function isLan(a) {
  a = norm(a); if (isLocal(a)) return true;
  if (/^10\./.test(a) || /^192\.168\./.test(a) || /^169\.254\./.test(a)) return true;
  const m = /^172\.(\d+)\./.exec(a); if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (/^f[cd]/i.test(a) || /^fe80/i.test(a)) return true;
  return false;
}
/* שם מארח שמותר בכותרת Host / Origin: כתובת IP מספרית או localhost — לא שם דומיין (מונע DNS rebinding) */
function hostOk(h) {
  h = String(h || "").toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || /^[0-9a-f:]+$/.test(h);
}
function splitHost(hp) {
  hp = String(hp || "").toLowerCase();
  const m = /^\[([^\]]+)\](?::(\d+))?$/.exec(hp) || /^([^:]+)(?::(\d+))?$/.exec(hp);
  return m ? { host: m[1], port: m[2] ? +m[2] : 80 } : null;
}
/* Origin מותר: אין Origin (לא דפדפן), file:// / null, או הכתובת של הגשר עצמו (אותו Host).
   לאורחים מותר גם גשר BIOBUZZ אחר ברשת (http://<כתובת IP>:9662–9677) — סימולטור שנפתח מהגשר של האורח. */
function originOk(origin, hostHdr, role) {
  if (origin === undefined || origin === null) return true;
  origin = String(origin).toLowerCase();
  if (origin === "null" || origin === "file://" || origin.startsWith("file:")) return true;
  const m = /^http:\/\/(.+)$/.exec(origin); if (!m) return false;
  const o = splitHost(m[1]), h = splitHost(hostHdr);
  if (!o || !hostOk(o.host)) return false;
  const loop = x => x === "localhost" || isLocal(x);
  if (h && o.port === h.port && (o.host === h.host || (loop(o.host) && loop(h.host)))) return true;
  if (role === "guest" && o.port >= 9662 && o.port <= 9677 && (o.host === "localhost" || isLan(o.host))) return true;
  return false;
}
function lanIps() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) for (const i of list || []) {
    if (i.family !== "IPv4" || i.internal || !isLan(i.address) || i.address.startsWith("169.254.")) continue;
    /* מתאמים וירטואליים (VirtualBox, WSL, Hyper-V) בסוף */
    const virt = /virtual|vbox|vmware|wsl|hyper-v|vethernet|docker|loopback/i.test(name);
    out.push({ ip: i.address, virt });
  }
  out.sort((a, b) => a.virt - b.virt);
  return out.map(x => x.ip);
}
/* v63: רק תיקיות מוחלטות ב-PATH (לא ״.״ ולא נתיב יחסי), ובלי C:\platform-tools — תיקייה שכל משתמש יכול לכתוב אליה */
function findAdb() {
  const names = process.platform === "win32" ? ["adb.exe"] : ["adb"];
  const dirs = (process.env.PATH || "").split(path.delimiter).filter(d => d && path.isAbsolute(d));
  for (const env of ["ANDROID_HOME", "ANDROID_SDK_ROOT"]) if (process.env[env] && path.isAbsolute(process.env[env])) dirs.push(path.join(process.env[env], "platform-tools"));
  const home = os.homedir();
  dirs.push(path.join(home, "AppData", "Local", "Android", "Sdk", "platform-tools"), path.join(home, "Library", "Android", "sdk", "platform-tools"),
    path.join(home, "Android", "Sdk", "platform-tools"));
  for (const d of dirs) for (const n of names) { const p = path.join(d, n); try { if (fs.statSync(p).isFile()) return p; } catch (e) {} }
  return null;
}

/* 1.12.5: קישור ישן לשלט (בלי מפתח) — הודעה ברורה במקום שלט שלא נוהג */
const PAD_OLD = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
  "<body style='background:#0B0E12;color:#E9EFF5;font:18px system-ui;padding:24px;text-align:center'>" +
  "<h2 dir=rtl>הקישור לשלט ישן או לא נכון</h2>" +
  "<p dir=rtl>בסימולטור לחצו ״📱 חבר טלפון עם קוד QR״ וסרקו שוב את הקוד.</p>" +
  "<p dir=ltr style='color:#95A5B4'>This phone-pad link is old or wrong. In the simulator, open the phone QR code and scan it again.</p>";
/* הגבלות */
const LIM = { failsPerIp: 8, failWindow: 5 * 60e3, lockMs: 5 * 60e3, failsGlobal: 60, lockGlobalMs: 2 * 60e3,
  joinPerMin: 20, wsPerIp: 12, smallPayload: 64 * 1024, bigPayload: 4 * 1024 * 1024, pingMs: 20000 };

class Bridge {
  constructor(opt) {
    opt = opt || {};
    this.port = opt.port || 9662; this.dataDir = opt.dataDir; this.simPath = opt.simPath; this.padPath = opt.padPath;
    this.log = opt.log || (() => {});
    this.lim = Object.assign({}, LIM, opt.limits || {});
    this.token = opt.token || crypto.randomBytes(24).toString("base64url");
    this.key = this.loadKey(opt.key);
    /* 1.12.5: מפתח לשלט הטלפון (בתוך קוד ה-QR). נשמר בין הפעלות כדי שקישור שמור בטלפון ימשיך לעבוד */
    this.padKey = this.loadPadKey(opt.padKey);
    /* לבדיקות בלבד: ״האם הכתובת היא המחשב הזה״ (כדי לבדוק טלפון ״מהרשת״ מתוך אותו מחשב) */
    this.isLocal = opt.isLocal || isLocal;
    this.sims = new Set(); this.pads = new Set(); this.guests = new Map(); this.host = null; this.n = 0;
    this.lan = lanIps(); this.code = this.lan.length ? roomCode(this.lan[0], this.port, this.key) : "";
    this.on = false; this.error = ""; this.adb = null; this.adbSeen = new Set(); this.adbT = null; this.adbWanted = false;
    this.fails = new Map(); this.gFails = []; this.gLock = 0; this.joins = new Map(); this.conns = new Map();
    this.cache = null;
  }
  /* מפתח של 32 ביט. מפתח ישן (12 ביט) מוחלף */
  loadKey(fixed) {
    if (fixed != null) return Math.floor(+fixed) >>> 0;
    const f = this.dataDir ? path.join(this.dataDir, ".room-key") : null;
    try { if (f) { const k = parseInt(fs.readFileSync(f, "utf8"), 10); if (k >= KEY_MIN && k < KEY_MAX) return k; } } catch (e) {}
    return this._newKey(f);
  }
  loadPadKey(fixed) {
    const ok = k => typeof k === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(k);
    if (ok(fixed)) return fixed;
    const f = this.dataDir ? path.join(this.dataDir, ".pad-key") : null;
    try { if (f) { const k = fs.readFileSync(f, "utf8").trim(); if (ok(k)) return k; } } catch (e) {}
    const k = crypto.randomBytes(16).toString("base64url");
    try { if (f) fs.writeFileSync(f, k); } catch (e) {}
    return k;
  }
  padOk(v) {
    const a = Buffer.from(String(v || "")), b = Buffer.from(this.padKey);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  _newKey(f) { const k = crypto.randomInt(KEY_MIN, KEY_MAX); try { if (f) fs.writeFileSync(f, String(k)); } catch (e) {} return k; }
  /* קוד חדש לבקשת המארח — אורחים שכבר בפנים נשארים, חדשים צריכים את הקוד החדש */
  rekey() {
    const f = this.dataDir ? path.join(this.dataDir, ".room-key") : null;
    let k; do { k = this._newKey(f); } while (k === this.key); this.key = k;
    this.lan = lanIps(); this.code = this.lan.length ? roomCode(this.lan[0], this.port, this.key) : "";
  }
  info() { return { t: "info", lan: this.lan, port: this.port, key: this.key, code: this.code }; }
  /* v63: בלי קוד חדר ובלי שמות/כתובות של אורחים. כתובות הרשת — רק למחשב הזה (קוד ה-QR של הטלפון) */
  health(local) {
    const o = { ok: true, app: true, port: this.port, host: !!this.host, sims: this.sims.size, pad: this.pads.size > 0, guests: this.guests.size };
    if (local) { o.lan = this.lan; o.pk = this.padKey; }   /* 1.12.5: מפתח השלט — רק למחשב הזה (קוד ה-QR) */
    return o;
  }
  status() { return { on: this.on, port: this.port, error: this.error, code: this.code, lan: this.lan, pad: this.pads.size > 0,
    guests: this.guests.size, host: !!this.host, adb: !!this.adb, phones: this.adbSeen.size, pk: this.padKey }; }
  toSims(msg) { for (const s of this.sims) this.sendTxt(s, msg); }
  sendTxt(ws, s) { try { if (ws.readyState === 1) ws.send(String(s)); } catch (e) {} }
  /* ── ניסיונות שגויים ── */
  locked(ip) {
    const now = Date.now();
    if (this.gLock > now) return true;
    const f = this.fails.get(ip); return !!(f && f.until > now);
  }
  fail(ip) {
    const now = Date.now(), L = this.lim;
    let f = this.fails.get(ip); if (!f || now - f.t0 > L.failWindow) f = { n: 0, t0: now, until: 0 };
    f.n++; if (f.n >= L.failsPerIp) { f.until = now + L.lockMs; f.n = 0; f.t0 = now; }
    this.fails.set(ip, f);
    this.gFails = this.gFails.filter(t => now - t < L.failWindow); this.gFails.push(now);
    if (this.gFails.length >= L.failsGlobal) { this.gLock = now + L.lockGlobalMs; this.gFails = []; this.log("bridge: too many wrong room codes — joining paused"); }
    if (this.fails.size > 5000) this.fails.clear();
  }
  keyOk(v) { return /^\d{1,10}$/.test(String(v || "")) && parseInt(v, 10) === this.key; }
  tokOk(v) {
    const a = Buffer.from(String(v || "")), b = Buffer.from(this.token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  /* ── הסימולטור מהדיסק: נקרא פעם אחת ונשמר (מתחדש כשהקובץ משתנה) ── */
  simBody() {
    if (!this.simPath) return null;
    let st; try { st = fs.statSync(this.simPath); } catch (e) { this.cache = null; return null; }
    if (this.cache && this.cache.mtime === st.mtimeMs && this.cache.size === st.size) return this.cache;
    let body; try { body = fs.readFileSync(this.simPath); } catch (e) { return null; }
    const i = body.indexOf("<head>");
    this.cache = { mtime: st.mtimeMs, size: st.size, body, at: i >= 0 ? i + 6 : 0 };
    return this.cache;
  }
  /* הדף עם שורת הזרקה (BB_JOIN לאורחים, BB_TOK לסימולטור במחשב הזה) — בלי להעתיק 23 מ״ב */
  sendSim(r, inj) {
    const c = this.simBody(); if (!c) return this.send(r, 404, "sim not found");
    const add = Buffer.from(inj || "", "utf8");
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": c.body.length + add.length, "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    r.write(c.body.subarray(0, c.at)); if (add.length) r.write(add); r.end(c.body.subarray(c.at));
  }
  start() {
    return new Promise(resolve => {
      const srv = http.createServer((q, r) => this.onHttp(q, r));
      srv.requestTimeout = 20000; srv.headersTimeout = 10000; srv.keepAliveTimeout = 5000; srv.maxConnections = 400;
      /* שני שרתים: לסימולטור ולמארח (מצב זירה גדול) — ולטלפונים ולאורחים (הודעות קטנות) */
      const big = new WebSocketServer({ noServer: true, maxPayload: this.lim.bigPayload, perMessageDeflate: false });
      const small = new WebSocketServer({ noServer: true, maxPayload: this.lim.smallPayload, perMessageDeflate: false });
      srv.on("upgrade", (q, sock, head) => {
        const peer = norm(q.socket.remoteAddress); let u; try { u = new URL(q.url, "http://x"); } catch (e) { u = new URL("http://x/"); }
        const role = u.searchParams.get("role") || "";
        const deny = (code, txt) => { try { sock.write("HTTP/1.1 " + code + " " + (txt || "Forbidden") + "\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"); } catch (e) {} sock.destroy(); };
        sock.on("error", () => {});
        if (!isLan(peer) || u.pathname.replace(/\/$/, "") !== "/ws") return deny(403);
        if (!["pad", "sim", "host", "guest"].includes(role)) return deny(400, "Bad Request");
        const hh = splitHost(q.headers.host); if (!hh || !hostOk(hh.host)) return deny(403);
        if (!originOk(q.headers.origin, q.headers.host, role)) return deny(403);
        if ((role === "sim" || role === "host") && (!isLocal(peer) || !this.tokOk(u.searchParams.get("t")))) return deny(403);
        /* 1.12.5: טלפון מהרשת — רק עם המפתח מקוד ה-QR (בכבל USB הכתובת היא המחשב הזה) */
        if (role === "pad" && !this.isLocal(peer) && !this.padOk(u.searchParams.get("p"))) return deny(403);
        if ((this.conns.get(peer) || 0) >= this.lim.wsPerIp) return deny(429, "Too Many Requests");
        if (role === "guest") {
          if (this.locked(peer)) return deny(429, "Too Many Requests");
          if (!this.keyOk(u.searchParams.get("k"))) { this.fail(peer); return deny(403); }
        }
        const wss = role === "pad" || role === "guest" ? small : big;
        wss.handleUpgrade(q, sock, head, ws => {
          ws.role = role; ws.addr = peer; ws.name = String(u.searchParams.get("n") || "אורח").replace(/[\u0000-\u001f<>]/g, "").slice(0, 20) || "אורח";
          ws.alive = true; ws.on("pong", () => { ws.alive = true; });
          this.conns.set(peer, (this.conns.get(peer) || 0) + 1);
          this.add(ws);
          ws.on("message", (data, isBin) => this.route(ws, isBin ? 2 : 1, data));
          ws.on("close", () => { const n = (this.conns.get(peer) || 1) - 1; if (n > 0) this.conns.set(peer, n); else this.conns.delete(peer); this.drop(ws); });
          ws.on("error", () => {});
        });
      });
      /* חיבור שלא עונה לפינג — נסגר (טלפון שנכבה, אורח שיצא מהרשת) */
      this.pingT = setInterval(() => {
        for (const w of [...big.clients, ...small.clients]) { if (!w.alive) { try { w.terminate(); } catch (e) {} continue; } w.alive = false; try { w.ping(); } catch (e) {} }
      }, this.lim.pingMs);
      if (this.pingT.unref) this.pingT.unref();
      srv.on("error", e => { this.on = false; this.error = e.code === "EADDRINUSE" ? "הפורט " + this.port + " תפוס (אולי start.bat כבר רץ)" : String(e.message); resolve(false); });
      srv.listen(this.port, "0.0.0.0", () => { this.on = true; this.error = ""; this.srv = srv; this.wssAll = [big, small]; this.log("bridge on " + this.port); resolve(true); });
    });
  }
  stop() {
    try { clearInterval(this.adbT); this.adbT = null; } catch (e) {} try { clearInterval(this.pingT); } catch (e) {}
    try { (this.wssAll || []).forEach(w => w.clients.forEach(c => c.terminate())); } catch (e) {}
    try { this.srv && this.srv.close(); } catch (e) {} this.on = false;
  }
  send(r, code, body, type, extra) {
    if (typeof body === "string") body = Buffer.from(body, "utf8");
    r.writeHead(code, Object.assign({ "Content-Type": type || "text/html; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff" }, extra || {}));
    r.end(body);
  }
  onHttp(q, r) {
    const peer = norm(q.socket.remoteAddress);
    if (!isLan(peer)) return this.send(r, 403, "LAN only");
    const hh = splitHost(q.headers.host); if (!hh || !hostOk(hh.host)) return this.send(r, 403, "bad host");
    if (q.method !== "GET" && q.method !== "HEAD") return this.send(r, 405, "GET only");
    let u; try { u = new URL(q.url, "http://x"); } catch (e) { return this.send(r, 400, "bad url"); }
    const p = u.pathname.replace(/\/+$/, "") || "/";
    if (p === "/health") {
      /* הסימולטור שנפתח מקובץ (Origin: null) קורא כאן את כתובת הרשת בשביל קוד ה-QR — רק הוא מקבל CORS */
      const o = String(q.headers.origin || "").toLowerCase(), cors = o === "null" || o.startsWith("file:");
      return this.send(r, 200, JSON.stringify(this.health(isLocal(peer))), "application/json", cors ? { "Access-Control-Allow-Origin": "null", "Vary": "Origin" } : { "Vary": "Origin" });
    }
    if (p === "/" && !this.isLocal(peer) && !this.padOk(u.searchParams.get("p"))) return this.send(r, 403, PAD_OLD);
    if (p === "/") { let b = null; try { b = this.padBody || (this.padBody = fs.readFileSync(this.padPath)); } catch (e) {} return b ? this.send(r, 200, b) : this.send(r, 404, "pad not found"); }
    if (p === "/sim") { if (!isLocal(peer)) return this.send(r, 403, "local only"); return this.sendSim(r, "<script>window.BB_TOK=" + JSON.stringify(this.token) + ";</script>"); }
    if (p === "/join") {
      const now = Date.now(); let j = this.joins.get(peer); if (!j || now - j.t0 > 60e3) j = { n: 0, t0: now }; j.n++; this.joins.set(peer, j);
      if (this.joins.size > 5000) this.joins.clear();
      if (j.n > this.lim.joinPerMin || this.locked(peer)) return this.send(r, 429, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>יותר מדי ניסיונות — נסו שוב בעוד כמה דקות.");
      if (!this.keyOk(u.searchParams.get("k"))) {
        this.fail(peer);
        return this.send(r, 403, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>צריך את קוד החדר. פתח את הסימולטור והקלד אותו בלובי.");
      }
      return this.sendSim(r, "<script>window.BB_JOIN={port:" + (this.port | 0) + ",key:" + (this.key >>> 0) + "};</script>");
    }
    return this.send(r, 404, "not found");
  }
  add(ws) {
    if (ws.role === "sim") { this.sims.add(ws); this.sendTxt(ws, JSON.stringify({ t: "pad", on: this.pads.size > 0 })); for (const p of this.pads) this.sendTxt(p, '{"t":"sim","on":true}'); }
    else if (ws.role === "pad") {
      /* 1.12.5: טלפון אחד בכל רגע — החדש מחליף את הקודם (שני טלפונים ״נלחמו״ על אותו שלט, והסטיק קפץ לאפס) */
      for (const o of this.pads) { this.sendTxt(o, '{"t":"kick"}'); try { o.close(); } catch (e) {} }
      this.pads.clear(); this.pads.add(ws); this.toSims('{"t":"pad","on":true}'); this.log("phone connected " + ws.addr); }
    else if (ws.role === "host") { const old = this.host; this.host = ws; if (old) try { old.close(); } catch (e) {}
      this.sendTxt(ws, JSON.stringify(this.info())); for (const g of this.guests.values()) this.sendTxt(ws, JSON.stringify({ t: "gj", id: g.id, name: g.name })); }
    else if (ws.role === "guest") { ws.id = "g" + (++this.n); this.guests.set(ws.id, ws);
      if (this.host) this.sendTxt(this.host, JSON.stringify({ t: "gj", id: ws.id, name: ws.name })); else this.sendTxt(ws, '{"t":"nohost"}'); }
    this.adbSync();
  }
  drop(ws) {
    this.sims.delete(ws); this.pads.delete(ws);
    if (this.host === ws) { this.host = null; for (const g of this.guests.values()) this.sendTxt(g, '{"t":"nohost"}'); }
    if (ws.id && this.guests.get(ws.id) === ws) { this.guests.delete(ws.id); if (this.host) this.sendTxt(this.host, JSON.stringify({ t: "gl", id: ws.id })); }
    if (ws.role === "pad" && !this.pads.size) this.toSims('{"t":"pad","on":false}');
    this.adbSync();
  }
  route(ws, op, data) {
    const r = ws.role;
    if (r === "pad") { if (op === 1) this.toSims(data.toString("utf8")); }
    else if (r === "sim") {
      if (op !== 1) return; const s = data.toString("utf8");
      if (this.pads.size) for (const p of this.pads) this.sendTxt(p, s);
      else if (s.includes('"t":"q"')) this.sendTxt(ws, s.replace('"t":"q"', '"t":"qr"'));
    } else if (r === "host") {
      if (ws !== this.host) return;
      if (op === 2) { for (const g of this.guests.values()) { try { if (g.readyState === 1) g.send(data, { binary: true }); } catch (e) {} } return; }
      let m; try { m = JSON.parse(data.toString("utf8")); } catch (e) { return; }
      if (!m || typeof m !== "object" || Array.isArray(m)) return;
      if (m.t === "info") { this.sendTxt(ws, JSON.stringify(this.info())); return; }
      if (m.t === "rekey") { this.rekey(); this.sendTxt(ws, JSON.stringify(this.info())); return; }
      const to = m.to; delete m.to; const s = JSON.stringify(m);
      if (to === "*") for (const g of this.guests.values()) this.sendTxt(g, s);
      else if (typeof to === "string" && this.guests.has(to)) { const g = this.guests.get(to); this.sendTxt(g, s); if (m.t === "deny") try { g.close(); } catch (e) {} }
    } else if (r === "guest") {
      /* v63: מפענחים ובונים מחדש — אורח לא יכול להוסיף ״id״ משלו ולהתחזות לאורח אחר */
      if (op !== 1 || data.length > 2000) return;
      let m; try { m = JSON.parse(data.toString("utf8")); } catch (e) { return; }
      if (!m || typeof m !== "object" || Array.isArray(m)) return;
      if (this.host) this.sendTxt(this.host, JSON.stringify({ t: "g", id: ws.id, m }));
    }
  }
  /* טלפון בכבל: adb reverse לבד — רק כשצריך (הסימולטור מחובר לגשר או יש חדר) */
  adbWatch() { this.adbWanted = true; this.adbSync(); }
  adbSync() {
    const need = this.adbWanted && this.on && (this.sims.size > 0 || !!this.host);
    if (need && !this.adbT) {
      if (this.adb === null) this.adb = findAdb() || false;
      if (!this.adb) return;
      const tick = () => execFile(this.adb, ["devices"], { timeout: 5000, windowsHide: true }, (err, out) => {
        if (err) return;
        const now = new Set(String(out).split(/\r?\n/).slice(1).filter(l => /\tdevice$/.test(l.trim()) || /\sdevice$/.test(l)).map(l => l.split(/\s+/)[0]));
        for (const s of now) if (!this.adbSeen.has(s)) execFile(this.adb, ["-s", s, "reverse", "tcp:" + this.port, "tcp:" + this.port], { timeout: 5000, windowsHide: true }, () => {});
        this.adbSeen = now;
      });
      tick(); this.adbT = setInterval(tick, 2000); if (this.adbT.unref) this.adbT.unref();
    } else if (!need && this.adbT) { clearInterval(this.adbT); this.adbT = null; }
  }
}
module.exports = { Bridge, roomCode, findAdb, lanIps, isLan, originOk, hostOk, LIM };
