/* BIOBUZZ — הגשר (שלט טלפון + חדר למשחק ברשת), מובנה באפליקציה.
   תרגום נאמן של padbridge.py: אותם נתיבים (/ws, /health, /, /sim, /join), אותם תפקידים
   (pad, sim, host, guest) ואותו קוד חדר — כך שהסימולטור לא יודע אם הגשר הוא פייתון או האפליקציה.
   רשת מקומית בלבד. */
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { WebSocketServer } = require("ws");

const AB = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/* קוד חדר. ברוב הבתים ובתי הספר הרשת היא 192.168.x.y — אז הקוד קצר: 6 תווים (XXX-XXX).
   אחרת — הקוד הארוך הישן (11 תווים). אותה פונקציה בדיוק בסימולטור ובגשר בפייתון. */
function roomCode(ip, port, key) {
  const p = ip.split(".").map(Number); const off = port - 9662;
  if (p.length !== 4 || off < 0 || off > 15) return "";
  if (p[0] === 192 && p[1] === 168 && off === 0 && key > 0 && key < 0x1000) {
    let n = (p[2] << 20) | (p[3] << 12) | key; const d = [];
    for (let i = 0; i < 6; i++) { d.unshift(n & 31); n >>>= 5; }
    const s = d.map(v => AB[v]).join(""); return s.slice(0, 3) + "-" + s.slice(3);
  }
  let n = 0n;
  for (const v of p) n = (n << 8n) | BigInt(v);
  n = (n << 4n) | BigInt(off); n = (n << 14n) | BigInt(key & 0x3FFF);
  const d = [];
  for (let i = 0; i < 10; i++) { d.unshift(Number(n & 31n)); n >>= 5n; }
  d.push(d.reduce((s, v, i) => s + (i + 1) * v, 0) % 32);
  const s = d.map(v => AB[v]).join("");
  return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8);
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
function findAdb() {
  const names = process.platform === "win32" ? ["adb.exe"] : ["adb"];
  const dirs = (process.env.PATH || "").split(path.delimiter);
  for (const env of ["ANDROID_HOME", "ANDROID_SDK_ROOT"]) if (process.env[env]) dirs.push(path.join(process.env[env], "platform-tools"));
  const home = os.homedir();
  dirs.push(path.join(home, "AppData", "Local", "Android", "Sdk", "platform-tools"), path.join(home, "Library", "Android", "sdk", "platform-tools"),
    path.join(home, "Android", "Sdk", "platform-tools"), "C:\\platform-tools", "C:\\Android\\platform-tools");
  for (const d of dirs) for (const n of names) { const p = path.join(d, n); try { if (fs.statSync(p).isFile()) return p; } catch (e) {} }
  return null;
}

class Bridge {
  constructor(opt) {
    opt = opt || {};
    this.port = opt.port || 9662; this.dataDir = opt.dataDir; this.simPath = opt.simPath; this.padPath = opt.padPath;
    this.log = opt.log || (() => {});
    this.key = this.loadKey(opt.key);
    this.sims = new Set(); this.pads = new Set(); this.guests = new Map(); this.host = null; this.n = 0;
    this.lan = lanIps(); this.code = this.lan.length ? roomCode(this.lan[0], this.port, this.key) : "";
    this.on = false; this.error = ""; this.adb = null; this.adbSeen = new Set(); this.adbT = null;
  }
  /* מפתח של 12 ביט (1–4095) — נכנס לקוד הקצר. מפתח ישן גדול יותר מוחלף */
  loadKey(fixed) {
    if (fixed != null) return fixed & 0x3FFF;
    const f = this.dataDir ? path.join(this.dataDir, ".room-key") : null;
    try { if (f) { const k = parseInt(fs.readFileSync(f, "utf8"), 10); if (k > 0 && k < 0x1000) return k; } } catch (e) {}
    return this._newKey(f);
  }
  _newKey(f) { const k = crypto.randomInt(1, 0x1000); try { if (f) fs.writeFileSync(f, String(k)); } catch (e) {} return k; }
  /* קוד חדש לבקשת המארח — אורחים שכבר בפנים נשארים, חדשים צריכים את הקוד החדש */
  rekey() {
    const f = this.dataDir ? path.join(this.dataDir, ".room-key") : null;
    let k; do { k = this._newKey(f); } while (k === this.key); this.key = k;
    this.lan = lanIps(); this.code = this.lan.length ? roomCode(this.lan[0], this.port, this.key) : "";
  }
  info() { return { t: "info", lan: this.lan, port: this.port, key: this.key, code: this.code }; }
  health() {
    return { ok: true, host: !!this.host, sims: this.sims.size, pad: this.pads.size > 0, app: true,
      guests: [...this.guests.values()].map(g => ({ id: g.id, name: g.name, addr: g.addr })), port: this.port, lan: this.lan, code: this.code };
  }
  status() { return { on: this.on, port: this.port, error: this.error, code: this.code, lan: this.lan, pad: this.pads.size > 0,
    guests: this.guests.size, host: !!this.host, adb: !!this.adb, phones: this.adbSeen.size }; }
  toSims(msg) { for (const s of this.sims) this.sendTxt(s, msg); }
  sendTxt(ws, s) { try { if (ws.readyState === 1) ws.send(String(s)); } catch (e) {} }
  simPage(join) {
    if (!this.simPath) return null;
    let body; try { body = fs.readFileSync(this.simPath); } catch (e) { return null; }
    if (join) {
      const inj = Buffer.from("<script>window.BB_JOIN={port:" + join[0] + ",key:" + join[1] + "};</script>");
      const i = body.indexOf("<head>");
      body = i >= 0 ? Buffer.concat([body.slice(0, i + 6), inj, body.slice(i + 6)]) : Buffer.concat([inj, body]);
    }
    return body;
  }
  start() {
    return new Promise(resolve => {
      const srv = http.createServer((q, r) => this.onHttp(q, r));
      const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
      srv.on("upgrade", (q, sock, head) => {
        const peer = q.socket.remoteAddress; const u = new URL(q.url, "http://x"); const role = u.searchParams.get("role") || "";
        const deny = code => { try { sock.write("HTTP/1.1 " + code + " Forbidden\r\n\r\n"); } catch (e) {} sock.destroy(); };
        if (!isLan(peer) || u.pathname.replace(/\/$/, "") !== "/ws") return deny(403);
        if (!["pad", "sim", "host", "guest"].includes(role)) return deny(400);
        if ((role === "sim" || role === "host") && !isLocal(peer)) return deny(403);
        if (role === "guest" && parseInt(u.searchParams.get("k"), 10) !== this.key) return deny(403);
        wss.handleUpgrade(q, sock, head, ws => {
          ws.role = role; ws.addr = norm(peer); ws.name = (u.searchParams.get("n") || "אורח").slice(0, 20);
          this.add(ws);
          ws.on("message", (data, isBin) => this.route(ws, isBin ? 2 : 1, data));
          ws.on("close", () => this.drop(ws)); ws.on("error", () => {});
        });
      });
      srv.on("error", e => { this.on = false; this.error = e.code === "EADDRINUSE" ? "הפורט " + this.port + " תפוס (אולי start.bat כבר רץ)" : String(e.message); resolve(false); });
      srv.listen(this.port, "0.0.0.0", () => { this.on = true; this.error = ""; this.srv = srv; this.wss = wss; this.log("bridge on " + this.port); resolve(true); });
    });
  }
  stop() { try { clearInterval(this.adbT); } catch (e) {} try { this.wss && this.wss.clients.forEach(c => c.terminate()); } catch (e) {} try { this.srv && this.srv.close(); } catch (e) {} this.on = false; }
  send(r, code, body, type) {
    if (typeof body === "string") body = Buffer.from(body, "utf8");
    r.writeHead(code, { "Content-Type": type || "text/html; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
    r.end(body);
  }
  onHttp(q, r) {
    const peer = q.socket.remoteAddress;
    if (!isLan(peer)) return this.send(r, 403, "LAN only");
    const u = new URL(q.url, "http://x"); const p = u.pathname.replace(/\/+$/, "") || "/";
    if (p === "/health") return this.send(r, 200, JSON.stringify(this.health()), "application/json");
    if (p === "/") { let b = null; try { b = fs.readFileSync(this.padPath); } catch (e) {} return b ? this.send(r, 200, b) : this.send(r, 404, "pad not found"); }
    if (p === "/sim") { if (!isLocal(peer)) return this.send(r, 403, "local only"); const b = this.simPage(); return b ? this.send(r, 200, b) : this.send(r, 404, "sim not found"); }
    if (p === "/join") {
      if (parseInt(u.searchParams.get("k"), 10) !== this.key)
        return this.send(r, 403, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>צריך את קוד החדר. פתח את הסימולטור והקלד אותו בלובי.");
      const b = this.simPage([this.port, this.key]); return b ? this.send(r, 200, b) : this.send(r, 404, "sim not found");
    }
    return this.send(r, 404, "not found");
  }
  add(ws) {
    if (ws.role === "sim") { this.sims.add(ws); this.sendTxt(ws, JSON.stringify({ t: "pad", on: this.pads.size > 0 })); for (const p of this.pads) this.sendTxt(p, '{"t":"sim","on":true}'); }
    else if (ws.role === "pad") { this.pads.add(ws); this.toSims('{"t":"pad","on":true}'); this.log("phone connected " + ws.addr); }
    else if (ws.role === "host") { const old = this.host; this.host = ws; if (old) try { old.close(); } catch (e) {}
      this.sendTxt(ws, JSON.stringify(this.info())); for (const g of this.guests.values()) this.sendTxt(ws, JSON.stringify({ t: "gj", id: g.id, name: g.name })); }
    else if (ws.role === "guest") { ws.id = "g" + (++this.n); this.guests.set(ws.id, ws);
      if (this.host) this.sendTxt(this.host, JSON.stringify({ t: "gj", id: ws.id, name: ws.name })); else this.sendTxt(ws, '{"t":"nohost"}'); }
  }
  drop(ws) {
    this.sims.delete(ws); this.pads.delete(ws);
    if (this.host === ws) { this.host = null; for (const g of this.guests.values()) this.sendTxt(g, '{"t":"nohost"}'); }
    if (ws.id && this.guests.get(ws.id) === ws) { this.guests.delete(ws.id); if (this.host) this.sendTxt(this.host, JSON.stringify({ t: "gl", id: ws.id })); }
    if (ws.role === "pad" && !this.pads.size) this.toSims('{"t":"pad","on":false}');
  }
  route(ws, op, data) {
    const r = ws.role;
    if (r === "pad") { if (op === 1) this.toSims(data.toString("utf8")); }
    else if (r === "sim") {
      if (op !== 1) return; const s = data.toString("utf8");
      if (this.pads.size) for (const p of this.pads) this.sendTxt(p, s);
      else if (s.includes('"t":"q"')) this.sendTxt(ws, s.replace('"t":"q"', '"t":"qr"'));
    } else if (r === "host") {
      if (op === 2) { for (const g of this.guests.values()) { try { if (g.readyState === 1) g.send(data, { binary: true }); } catch (e) {} } return; }
      let m; try { m = JSON.parse(data.toString("utf8")); } catch (e) { return; }
      if (m.t === "info") { this.sendTxt(ws, JSON.stringify(this.info())); return; }
      if (m.t === "rekey") { this.rekey(); this.sendTxt(ws, JSON.stringify(this.info())); return; }
      const to = m.to; delete m.to; const s = JSON.stringify(m);
      if (to === "*") for (const g of this.guests.values()) this.sendTxt(g, s);
      else if (this.guests.has(to)) { const g = this.guests.get(to); this.sendTxt(g, s); if (m.t === "deny") try { g.close(); } catch (e) {} }
    } else if (r === "guest") {
      if (op !== 1 || data.length > 2000 || data[0] !== 0x7b) return;
      if (this.host) this.sendTxt(this.host, '{"t":"g","id":"' + ws.id + '","m":' + data.toString("utf8") + "}");
    }
  }
  /* טלפון בכבל: adb reverse לבד */
  adbWatch() {
    this.adb = findAdb(); if (!this.adb) return;
    const tick = () => execFile(this.adb, ["devices"], { timeout: 5000, windowsHide: true }, (err, out) => {
      if (err) return;
      const now = new Set(String(out).split(/\r?\n/).slice(1).filter(l => /\tdevice$/.test(l.trim()) || /\sdevice$/.test(l)).map(l => l.split(/\s+/)[0]));
      for (const s of now) if (!this.adbSeen.has(s)) execFile(this.adb, ["-s", s, "reverse", "tcp:" + this.port, "tcp:" + this.port], { timeout: 5000, windowsHide: true }, () => {});
      this.adbSeen = now;
    });
    tick(); this.adbT = setInterval(tick, 2000);
  }
}
module.exports = { Bridge, roomCode, findAdb, lanIps, isLan };
