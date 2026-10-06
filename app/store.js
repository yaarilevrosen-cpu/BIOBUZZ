/* BIOBUZZ — שכבת הנתונים של האפליקציה (Node בלבד, בלי ספריות חיצוניות)
   כל נהג (פרופיל) מקבל תיקייה:
     profiles/<id>/store.json    — כל מפתחות הסימולטור (bb… / biobuzz…) כמו שהם נשמרים בדפדפן
     profiles/<id>/matches.jsonl — כל מאץ׳ שנגמר, שורה לכל מאץ׳, בלי תקרה
   כתיבה בטוחה: קובץ זמני ואז החלפה, כדי שנפילה באמצע לא תשאיר קובץ שבור. */
"use strict";
const fs = require("fs");
const path = require("path");

const KEYRE = /^(bb|biobuzz)/i;
/* מפתחות של המחשב הזה בלבד — לא מסונכרנים (מצב מסך, לשונית, תצוגה, גיבויים מקומיים) */
const NOSYNC = new Set(["bbUiMode1", "biobuzz_ws_v1", "bbHud1", "bbBackups1", "bbQual1", "bbHelp1", "bbShellLast", "bbLive1", "bbRecAuto1", "bbLang1", "bbTour1", "bbNew57"]);
const EMOJI = ["🐝", "🚀", "🤖", "⚡", "🔥", "🦅", "🐺", "🦊", "🐉", "🎯", "🌟", "🏆"];
/* v63: זמני המפתחות בשורת הענן (לאיחוד לפי מפתח) */
const KVAT = "bb__at";
const COLORS = ["#FFB020", "#35D6A4", "#4C9AF5", "#F2545B", "#B07CFF", "#FF7AC6", "#7FD1FF", "#C6E26B"];

/* v63: מזהה נהג נכנס לנתיב קבצים — רק אותיות לטיניות, ספרות, _ ו-- (בלי ../ ובלי /) */
const IDRE = /^[A-Za-z0-9_-]{1,64}$/;
function validId(id) { return typeof id === "string" && IDRE.test(id); }
function sleepMs(ms) { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) {} }
/* כתיבה בטוחה: קובץ זמני + fsync ואז החלפה. ב-Windows אנטי־וירוס / OneDrive תופסים את הקובץ לרגע —
   מנסים שוב כמה פעמים, ובכישלון מוחקים את הזמני וזורקים שגיאה (מי שקורא מחליט מה לעשות) */
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  try {
    const fd = fs.openSync(tmp, "w");
    try { fs.writeFileSync(fd, text); try { fs.fsyncSync(fd); } catch (e) {} } finally { fs.closeSync(fd); }
    let err = null;
    for (let i = 0; i < 5; i++) {
      try { fs.renameSync(tmp, file); err = null; break; }
      catch (e) { err = e; if (!/EPERM|EBUSY|EACCES|EEXIST/.test(e.code || "")) break; sleepMs(20 * (i + 1) * (i + 1)); }
    }
    if (err) throw err;
  } catch (e) { try { fs.unlinkSync(tmp); } catch (x) {} throw e; }
}
function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return def; }
}
/* שורות JSON: שורה חצי־כתובה (נפילה באמצע) לא בולעת את המאץ׳ שאחריה */
function parseJsonl(txt) {
  const out = [];
  for (const line of String(txt || "").split("\n")) {
    const t = line.trim(); if (!t) continue;
    try { out.push(JSON.parse(t)); continue; } catch (e) {}
    /* שורה ישנה שבה חצי מאץ׳ ומיד אחריו מאץ׳ שלם: מחפשים את האובייקט השלם בסוף */
    let tries = 0;
    for (let i = t.indexOf("{", 1); i > 0 && tries < 200; i = t.indexOf("{", i + 1), tries++) {
      try { const o = JSON.parse(t.slice(i)); if (o && typeof o === "object") { out.push(o); break; } } catch (e) {}
    }
  }
  return out;
}
/* הוספה לסוף קובץ: אם השורה האחרונה לא נגמרה (נפילה באמצע) — קודם ירידת שורה */
function appendLines(file, text) {
  let pre = "";
  try {
    const st = fs.statSync(file);
    if (st.size > 0) { const fd = fs.openSync(file, "r"); try { const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, st.size - 1); if (b[0] !== 0x0a) pre = "\n"; } finally { fs.closeSync(fd); } }
  } catch (e) {}
  fs.appendFileSync(file, pre + text);
}
function newId() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function cleanName(n) { return String(n == null ? "" : n).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24); }

function summarize(l) {
  const n = l.length; if (!n) return { n: 0 };
  let W = 0, L = 0, pts = 0, best = 0, shots = 0, hits = 0, last = 0;
  for (const m of l) { if (m.win > 0) W++; else if (m.win < 0) L++; pts += +m.my || 0; best = Math.max(best, +m.my || 0);
    shots += +m.shots || 0; hits += +m.hits || 0; last = Math.max(last, +m.at || 0); }
  /* v60: עוד כמה מספרים בשביל ״נתח את הקבוצה״ */
  const avgOf = (a, f) => { const v = a.map(f).filter(x => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const s = l.slice().sort((a, b) => (+a.at || 0) - (+b.at || 0)), l10 = s.slice(-10), p10 = s.slice(-20, -10);
  return { n, W, L, T: n - W - L, avg: pts / n, best, acc: shots ? hits / shots : null, shots, last,
    cyc: avgOf(l, m => m.avgCycle > 0 ? +m.avgCycle : null), fouls: avgOf(l, m => +m.fouls || 0), park: avgOf(l, m => m.park ? 1 : 0),
    auto: avgOf(l, m => m.autoPts != null ? +m.autoPts : null), l10: avgOf(l10, m => +m.my || 0), p10: p10.length >= 3 ? avgOf(p10, m => +m.my || 0) : null };
}
class Store {
  constructor(root) {
    this.root = root;
    fs.mkdirSync(root, { recursive: true });
    this.pfile = path.join(root, "profiles.json");
    this.viewer = null;           /* v63: החשבון המחובר (uid) — נהגים של חשבון אחר ״חונים״ ולא מוצגים */
    this.recovered = "";
    let meta = null;
    if (fs.existsSync(this.pfile)) {
      meta = readJSON(this.pfile, null);
      /* v63: קובץ פגום לא מוחק בשקט את רשימת הנהגים — מזיזים אותו הצידה ומשחזרים מגיבוי / מהתיקיות */
      if (!Store.metaOk(meta)) meta = this.recoverMeta();
    }
    this.meta = meta;
    if (this.meta) this.meta.list = this.meta.list.filter(p => p && typeof p === "object" && validId(p.id));
    this.firstRun = !this.meta || !Array.isArray(this.meta.list) || !this.meta.list.length;
    if (this.firstRun) {
      this.meta = { v: 1, active: null, list: [] };
      const p = this.addProfile("נהג 1", { quiet: true });
      this.meta.active = p.id; this.saveMeta();
    }
    if (!this.meta.list.find(p => p.id === this.meta.active)) { this.meta.active = this.meta.list[0].id; this.saveMeta(); }
    if (!Array.isArray(this.meta.tombs)) this.meta.tombs = [];
    this.meta.tombs = this.meta.tombs.filter(t => t && validId(t.id));
    this.kv = {};                 // מטמון של הפרופיל הפעיל
    this.kat = {};                // v63: מתי השתנה כל מפתח (לסנכרון לפי מפתח)
    this.kvDirty = false; this.kvTimer = null; this.flushFails = 0;
    this.loadKv();
  }
  static metaOk(m) { return !!(m && typeof m === "object" && Array.isArray(m.list) && m.list.some(p => p && validId(p.id))); }
  recoverMeta() {
    const tag = new Date().toISOString().replace(/[:.]/g, "-");
    try { fs.renameSync(this.pfile, this.pfile + ".bad-" + tag); } catch (e) {}
    let base = null, from = "";
    const bdir = path.join(this.root, "backups");
    let tags = []; try { tags = fs.readdirSync(bdir).filter(n => /^\d{4}-\d\d-\d\d$/.test(n)).sort().reverse(); } catch (e) {}
    for (const t of tags) { const m = readJSON(path.join(bdir, t, "profiles.json"), null); if (Store.metaOk(m)) { base = m; from = "backup " + t; break; } }
    if (!base) base = { v: 1, active: null, list: [] };
    base.list = base.list.filter(p => p && typeof p === "object" && validId(p.id));
    /* תיקיות נהגים שלא ברשימה (נוספו אחרי הגיבוי) — חוזרות עם שם זמני */
    let dirs = []; try { dirs = fs.readdirSync(path.join(this.root, "profiles"), { withFileTypes: true }).filter(d => d.isDirectory() && validId(d.name)).map(d => d.name); } catch (e) {}
    for (const id of dirs) if (!base.list.some(p => p.id === id)) {
      let created = Date.now(); try { created = Math.round(fs.statSync(path.join(this.root, "profiles", id)).mtimeMs); } catch (e) {}
      this.meta = base; base.list.push({ id, name: this.uniqueName("נהג משוחזר"), emoji: EMOJI[base.list.length % EMOJI.length], color: COLORS[base.list.length % COLORS.length], created, metaAt: 0, kvAt: 0 });
      if (!from) from = "scan";
    }
    this.meta = null;
    if (!base.list.length) return null;
    this.recovered = from || "scan";
    if (!base.list.some(p => p.id === base.active)) base.active = base.list[0].id;
    try { writeAtomic(this.pfile, JSON.stringify(base, null, 1)); } catch (e) {}
    return base;
  }
  /* ── פרופילים ── */
  saveMeta() {
    try { writeAtomic(this.pfile, JSON.stringify(this.meta, null, 1)); this.metaDirty = false; }
    catch (e) { this.metaDirty = true; this.retryFlush(e); }
  }
  dir(id) { if (!validId(id)) throw new Error("bad profile id"); return path.join(this.root, "profiles", id); }
  /* v63: נהג ״חונה״ = שייך לחשבון אחר (מישהו אחר התחבר במחשב הזה). נשמר בדיסק, לא מוצג ולא עולה */
  visible(p) { return !!p && (!this.viewer || !p.owner || p.owner === this.viewer); }
  vis() { return this.meta.list.filter(p => this.visible(p)); }
  parked() { return this.meta.list.filter(p => !this.visible(p)).length; }
  /* מחזיר true אם הנהג הפעיל התחלף (הדף צריך להיטען מחדש) */
  setViewer(uid) {
    this.viewer = uid || null;
    const a = this.active();
    if (a && this.visible(a)) return false;
    let next = this.vis()[0];
    if (!next) next = this.addProfile("נהג 1", { quiet: true });
    this.flushKv(); this.meta.active = next.id; this.saveMeta(); this.loadKv();
    return true;
  }
  profiles() {
    return this.vis().map(p => Object.assign({}, p, { active: p.id === this.meta.active, sum: this.summary(p.id) }));
  }
  active() { return this.meta.list.find(p => p.id === this.meta.active); }
  uniqueName(name, exceptId) {
    let n = cleanName(name) || "נהג"; const base = n; let i = 2;
    while (this.meta.list.some(p => p.id !== exceptId && p.name === n)) n = base + " " + (i++);
    return n;
  }
  addProfile(name, opt) {
    opt = opt || {};
    const i = this.meta.list.length;
    /* 1.12.4: סמל ארוך / צבע לא תקין נדחו בשרת ותקעו את הסנכרון */
    const p = { id: newId(), name: this.uniqueName(name), emoji: (typeof opt.emoji === "string" && opt.emoji ? Array.from(opt.emoji).slice(0, 4).join("") : "") || EMOJI[i % EMOJI.length],
      color: (typeof opt.color === "string" && /^#[0-9a-f]{6}$/i.test(opt.color) ? opt.color : "") || COLORS[i % COLORS.length], created: Date.now(), metaAt: opt.quiet ? 0 : Date.now(), kvAt: 0 };
    if (opt.id && validId(opt.id)) p.id = opt.id;
    if (opt.local) p.local = true;       /* נהג מקומי — נשאר רק במחשב הזה, לא עולה לחשבון */
    const owner = opt.owner !== undefined ? opt.owner : this.viewer;   /* נוצר בזמן שמחוברים — שייך לחשבון */
    if (owner && !p.local) p.owner = owner;
    this.meta.list.push(p);
    fs.mkdirSync(this.dir(p.id), { recursive: true });
    if (!opt.quiet) this.saveMeta();
    return p;
  }
  updateProfile(id, patch) {
    const p = this.meta.list.find(x => x.id === id); if (!p || !this.visible(p)) return null;
    if (patch.name != null) p.name = this.uniqueName(patch.name, id);
    if (patch.emoji) p.emoji = Array.from(String(patch.emoji)).slice(0, 4).join("");
    if (patch.color && /^#[0-9a-f]{6}$/i.test(patch.color)) p.color = patch.color;
    if (patch.local != null) { if (patch.local) p.local = true; else { delete p.local; p.kvAt = Date.now(); if (this.viewer && !p.owner) p.owner = this.viewer; } }
    p.metaAt = Date.now();
    this.saveMeta(); return p;
  }
  /* מחיקה = העברה לסל (trash/). אי אפשר למחוק את הפעיל או את האחרון. */
  removeProfile(id, opt) {
    if (!validId(id) || id === this.meta.active || this.vis().length <= 1) return false;
    const i = this.meta.list.findIndex(x => x.id === id); if (i < 0) return false;
    const p = this.meta.list[i];
    if (!this.visible(p) && !(opt && opt.noTomb)) return false;
    const src = this.dir(id), dst = path.join(this.root, "trash", id + "-" + Date.now());
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    try { fs.renameSync(src, dst); writeAtomic(path.join(dst, "profile.json"), JSON.stringify(p)); } catch (e) {}
    this.meta.list.splice(i, 1);
    if (!(opt && opt.noTomb) && !p.local && p.owner) this.meta.tombs.push({ id, at: Date.now(), acct: p.acct || "team", owner: p.owner });
    this.saveMeta(); return true;
  }
  switchTo(id) {
    const p = this.meta.list.find(x => x.id === id);
    if (!p || !this.visible(p)) return false;
    this.flushKv();
    this.meta.active = id; this.saveMeta(); this.loadKv(); return true;
  }
  /* ── מפתחות הסימולטור ── */
  loadKv() {
    const id = this.meta.active;
    this.kv = this.readStore(id);
    for (const k of Object.keys(this.kv)) if (!KEYRE.test(k) || typeof this.kv[k] !== "string" || k === KVAT) delete this.kv[k];
    this.kat = this.readKat(id, this.kv);
    this.katDirty = false;
    this.seedArchive(id);
  }
  /* 1.12.4: store.json פגום לא הופך בשקט ל-{} (השמירה הבאה הייתה דורסת הכול) —
     הקובץ עובר ל-store.json.bad-<זמן>, והמפתחות חוזרים מהגיבוי היומי הכי חדש שתקין */
  readStore(id) {
    const f = path.join(this.dir(id), "store.json");
    if (!fs.existsSync(f)) return {};
    let o; try { o = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { o = undefined; }
    if (o && typeof o === "object" && !Array.isArray(o)) return o;
    const tag = new Date().toISOString().replace(/[:.]/g, "-");
    try { fs.renameSync(f, f + ".bad-" + tag); } catch (e) {}
    for (const t of this.backupsList()) {
      const b = readJSON(path.join(this.root, "backups", t, "profiles", id, "store.json"), null);
      if (b && typeof b === "object" && !Array.isArray(b)) {
        this.kvRecovered = "backup " + t;
        try { writeAtomic(f, JSON.stringify(b)); } catch (e) {}
        return b;
      }
    }
    this.kvRecovered = "empty";
    return {};
  }
  /* זמני המפתחות. נהג מלפני v63 — כל המפתחות מקבלים את זמן השינוי האחרון של הנהג */
  readKat(id, kv) {
    let o = readJSON(path.join(this.dir(id), "kvat.json"), null);
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      o = {}; const p = this.meta.list.find(x => x.id === id); const t = p && p.kvAt || 0;
      if (t) { kv = kv || this.kvOf(id); for (const k in kv) if (!NOSYNC.has(k)) o[k] = t; }
    }
    for (const k of Object.keys(o)) if (!KEYRE.test(k) || !isFinite(o[k])) delete o[k];
    return o;
  }
  katOf(id) { return id === this.meta.active ? this.kat : this.readKat(id); }
  kvAll() { return Object.assign({}, this.kv); }
  kvSet(k, v) {
    if (!KEYRE.test(k) || k === KVAT) return;
    const nv = (v === null || v === undefined) ? undefined : String(v);
    if (this.kv[k] === nv) return;
    if (nv === undefined) delete this.kv[k]; else this.kv[k] = nv;
    if (!NOSYNC.has(k)) { const a = this.active(); const now = Date.now(); this.kat[k] = now; this.katDirty = true; if (a) { a.kvAt = now; this.metaDirty = true; } }
    this.kvDirty = true;
    if (!this.kvTimer) this.kvTimer = setTimeout(() => this.flushKv(), 250);
  }
  kvClear() {
    const now = Date.now();
    for (const k of Object.keys(this.kv)) if (!NOSYNC.has(k)) this.kat[k] = now;
    this.kv = {}; this.katDirty = true;
    const a = this.active(); if (a) { a.kvAt = now; this.metaDirty = true; } this.kvDirty = true; this.flushKv();
  }
  /* v63: שמירה שנכשלת (קובץ תפוס ב-Windows) לא מפילה את התהליך — מנסים שוב עם השהיה גדלה */
  retryFlush(err) {
    this.flushFails = (this.flushFails || 0) + 1;
    if (this.flushFails === 1 || this.flushFails % 20 === 0) { try { console.error("BIOBUZZ store: write failed (" + this.flushFails + ")", err && err.message); } catch (e) {} }
    if (this.kvTimer) return;
    const ms = Math.min(30000, 250 * Math.pow(2, Math.min(7, this.flushFails)));
    this.kvTimer = setTimeout(() => { this.kvTimer = null; this.flushKv(); }, ms);
    if (this.kvTimer.unref) this.kvTimer.unref();
  }
  flushKv() {
    if (this.kvTimer) { clearTimeout(this.kvTimer); this.kvTimer = null; }
    try {
      if (this.metaDirty) { writeAtomic(this.pfile, JSON.stringify(this.meta, null, 1)); this.metaDirty = false; }
      if (this.kvDirty) { writeAtomic(path.join(this.dir(this.meta.active), "store.json"), JSON.stringify(this.kv)); this.kvDirty = false; }
      if (this.katDirty) { writeAtomic(path.join(this.dir(this.meta.active), "kvat.json"), JSON.stringify(this.kat)); this.katDirty = false; }
      this.flushFails = 0;
      return true;
    } catch (e) { this.retryFlush(e); return false; }
  }
  /* ── לסנכרון ── */
  kvOf(id) {
    if (id === this.meta.active) return Object.assign({}, this.kv);
    const o = this.readStore(id);
    for (const k of Object.keys(o)) if (!KEYRE.test(k) || typeof o[k] !== "string" || k === KVAT) delete o[k];
    return o;
  }
  kvSynced(id) { const o = this.kvOf(id); for (const k of Object.keys(o)) if (NOSYNC.has(k)) delete o[k]; return o; }
  katSynced(id) { const o = Object.assign({}, this.katOf(id)); for (const k of Object.keys(o)) if (NOSYNC.has(k)) delete o[k]; return o; }
  /* v63: הגדרות שהגיעו ממחשב אחר — איחוד לפי מפתח: לכל מפתח מנצח מי ששינה אותו אחרון.
     שורה שכתבה גרסה ישנה (בלי זמנים לכל מפתח) — כל מה ששונה בה נחשב כאילו השתנה ב-rk.
     הכול סינכרוני — מה שנכתב כאן בזמן שחיכינו לרשת לא נדרס. */
  mergeRemoteKv(id, rkv, rk) {
    const p = this.meta.list.find(x => x.id === id); if (!p || !validId(id)) return { changed: false, needPush: false };
    rkv = rkv && typeof rkv === "object" ? rkv : {};
    let meta = null; try { meta = typeof rkv[KVAT] === "string" ? JSON.parse(rkv[KVAT]) : null; } catch (e) {}
    const legacy = !meta || typeof meta !== "object" || meta.k !== rk;
    const rkat = !legacy && meta.t && typeof meta.t === "object" ? meta.t : {};
    const act = id === this.meta.active;
    const cur = this.kvOf(id), kat = Object.assign({}, this.katOf(id)), out = {};
    for (const k in cur) if (NOSYNC.has(k)) out[k] = cur[k];
    const keys = new Set();
    for (const o of [cur, rkv, rkat, kat]) for (const k in o) if (KEYRE.test(k) && k !== KVAT && !NOSYNC.has(k)) keys.add(k);
    let changed = false, needPush = false;
    for (const k of keys) {
      const lv = cur[k], rv = typeof rkv[k] === "string" ? rkv[k] : undefined;
      const lt = +kat[k] || 0, rt = legacy ? (lv !== rv ? (+rk || 0) : 0) : (+rkat[k] || 0);
      if (lv === rv) { if (lv !== undefined) out[k] = lv; if (rt > lt) kat[k] = rt; continue; }
      if (rt > lt) { if (rv !== undefined) out[k] = rv; kat[k] = rt; changed = true; }
      else { if (lv !== undefined) out[k] = lv; needPush = true; }
    }
    if (changed) {
      if (act) { this.kv = out; this.kvDirty = true; }
      else writeAtomic(path.join(this.dir(id), "store.json"), JSON.stringify(out));
    }
    if (act) { this.kat = kat; this.katDirty = true; this.flushKv(); }
    else writeAtomic(path.join(this.dir(id), "kvat.json"), JSON.stringify(kat));
    return { changed, needPush: needPush || legacy };
  }
  applyRemoteMeta(row, kind) {
    if (!row || !validId(row.id)) return null;
    let p = this.meta.list.find(x => x.id === row.id);
    if (!p) { p = { id: row.id, created: +row.created || Date.now(), kvAt: 0, acct: kind || "team" }; if (this.viewer) p.owner = this.viewer; this.meta.list.push(p); fs.mkdirSync(this.dir(p.id), { recursive: true }); }
    p.name = cleanName(row.name) || p.name || "נהג"; if (row.emoji) p.emoji = String(row.emoji).slice(0, 8); if (row.color && /^#[0-9a-f]{6}$/i.test(row.color)) p.color = row.color;
    p.metaAt = +row.meta_at || 0; this.saveMeta(); return p;
  }
  /* לאיזה חשבון הנהג שייך: ״team״ (ברירת מחדל) או ״personal״. בהעברה — נמחק מהחשבון הקודם ונשלח לחדש */
  acctOf(id) { const p = this.meta.list.find(x => x.id === id); return p ? (p.acct || "team") : null; }
  setAcct(id, kind) {
    const p = this.meta.list.find(x => x.id === id); if (!p) return null;
    kind = kind === "personal" ? "personal" : "team";
    const old = p.acct || "team"; if (old === kind) return p;
    const now = Date.now();
    this.meta.tombs.push({ id, at: now, acct: old, owner: p.owner });
    p.acct = kind; p.metaAt = now; p.kvAt = Math.max(p.kvAt || 0, now);
    this.saveMeta(); return p;
  }
  /* נהג שנמחק במחשב אחר */
  removeFromRemote(id) {
    const i = this.meta.list.findIndex(x => x.id === id); if (i < 0) return false;
    if (this.vis().length <= 1) return false;
    let switched = false;
    if (id === this.meta.active) { this.flushKv(); this.meta.active = this.vis().find(x => x.id !== id).id; switched = true; }
    this.removeProfile(id, { noTomb: true });
    if (switched) this.loadKv();
    return true;
  }
  /* נהג ״ריק״ של התקנה חדשה — לא שווה כלום מול חשבון עם נהגים */
  isBlank(id) {
    const p = this.meta.list.find(x => x.id === id); if (!p) return false;
    return !p.kvAt && this.matches(id, { lite: true }).length === 0;
  }
  appendMatches(id, list) {
    if (!list.length || !validId(id)) return 0;
    fs.mkdirSync(this.dir(id), { recursive: true });
    appendLines(this.mfile(id), list.map(m => JSON.stringify(m)).join("\n") + "\n");
    return list.length;
  }
  /* ── ארכיון מאצ׳ים ── */
  mfile(id) { return path.join(this.dir(id), "matches.jsonl"); }
  matches(id, opt) {
    id = id || this.meta.active; opt = opt || {};
    if (!validId(id)) return [];
    let txt = ""; try { txt = fs.readFileSync(this.mfile(id), "utf8"); } catch (e) { return []; }
    const out = [];
    for (const m of parseJsonl(txt)) { if (!m || typeof m !== "object" || Array.isArray(m)) continue; if (opt.lite) { delete m.sh; delete m.bl; } out.push(m); }
    return out;
  }
  addMatch(m, id) {
    id = id || this.meta.active;
    if (!m || typeof m !== "object" || Array.isArray(m) || !isFinite(m.at) || +m.at <= 0 || +m.at > 4102444800000 || !validId(id)) return false;
    fs.mkdirSync(this.dir(id), { recursive: true });
    appendLines(this.mfile(id), JSON.stringify(m) + "\n");
    return true;
  }
  /* פעם ראשונה: מה שכבר היה בעונה של הסימולטור נכנס לארכיון */
  seedArchive(id) {
    if (fs.existsSync(this.mfile(id))) return;
    let season = [];
    try { season = JSON.parse(this.kv.bbSeason1 || "[]"); } catch (e) {}
    if (!Array.isArray(season)) season = [];
    const lines = season.filter(m => m && isFinite(m.at)).map(m => JSON.stringify(m)).join("\n");
    try { writeAtomic(this.mfile(id), lines ? lines + "\n" : ""); } catch (e) {}
  }
  summary(id) { return summarize(this.matches(id, { lite: true })); }
  /* טבלת הקבוצה: הנהגים במחשב הזה + (אם יש) הנהגים של חברי הקבוצה מהענן, לקריאה בלבד */
  team(remote) {
    const mine = this.vis().map(p => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, active: p.id === this.meta.active, sum: this.summary(p.id) }));
    if (!remote || !remote.profiles) return mine;
    const out = mine.slice();
    for (const k in remote.profiles) {
      const r = remote.profiles[k]; if (!r || r.deleted) continue;
      const mem = (remote.members || []).find(m => m.uid === r.owner);
      out.push({ id: k, name: r.name || "נהג", emoji: r.emoji, color: r.color, remote: true, who: mem ? mem.label : "", sum: summarize((remote.matches || {})[k] || []) });
    }
    return out;
  }
  /* ── גיבויים ── */
  dailyBackup(keep) {
    keep = keep || 14;
    this.flushKv();
    const d = new Date(), pad = x => String(x).padStart(2, "0");
    const tag = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const bdir = path.join(this.root, "backups");
    const dst = path.join(bdir, tag);
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true });
      fs.cpSync(path.join(this.root, "profiles"), path.join(dst, "profiles"), { recursive: true });
      fs.copyFileSync(this.pfile, path.join(dst, "profiles.json"));
    }
    const all = fs.readdirSync(bdir).filter(n => /^\d{4}-\d\d-\d\d$/.test(n)).sort();
    while (all.length > keep) { const old = all.shift(); try { fs.rmSync(path.join(bdir, old), { recursive: true, force: true }); } catch (e) {} }
    return tag;
  }
  backupsList() {
    const bdir = path.join(this.root, "backups");
    try { return fs.readdirSync(bdir).filter(n => /^\d{4}-\d\d-\d\d$/.test(n)).sort().reverse(); } catch (e) { return []; }
  }
  /* ── ייצוא/ייבוא של כל הקבוצה ── */
  teamExport() {
    this.flushKv();
    return JSON.stringify({ bb: "team", v: 1, at: Date.now(), profiles: this.vis().map(p => ({
      name: p.name, emoji: p.emoji, color: p.color, created: p.created,
      store: readJSON(path.join(this.dir(p.id), "store.json"), {}) || {},
      matches: this.matches(p.id) })) });
  }
  teamImport(txt) {
    let o; try { o = JSON.parse(txt); } catch (e) { return { ok: false, why: "הקובץ שבור" }; }
    if (!o || o.bb !== "team" || !Array.isArray(o.profiles)) return { ok: false, why: "זה לא קובץ קבוצה של BIOBUZZ" };
    const added = [];
    for (const q of o.profiles) {
      if (!q || typeof q !== "object") continue;
      const p = this.addProfile(q.name || "נהג", { emoji: q.emoji, color: q.color });
      const st = {}; for (const k in (q.store || {})) if (KEYRE.test(k) && k !== KVAT && typeof q.store[k] === "string") st[k] = q.store[k];
      const now = Date.now(), kat = {}; for (const k in st) if (!NOSYNC.has(k)) kat[k] = now;
      writeAtomic(path.join(this.dir(p.id), "store.json"), JSON.stringify(st)); writeAtomic(path.join(this.dir(p.id), "kvat.json"), JSON.stringify(kat)); p.kvAt = now; this.saveMeta();
      const ms = (Array.isArray(q.matches) ? q.matches : []).filter(m => m && isFinite(m.at));
      writeAtomic(this.mfile(p.id), ms.map(m => JSON.stringify(m)).join("\n") + (ms.length ? "\n" : ""));
      added.push(p.name);
    }
    return { ok: true, added };
  }
  /* גיבוי מהדפדפן (הקובץ של ״גיבוי ואיפוס״) → לפרופיל הפעיל */
  importBrowserBackup(txt) {
    let o; try { o = JSON.parse(txt); } catch (e) { return { ok: false, why: "הקובץ שבור" }; }
    if (!o || o.bb !== "backup" || !o.data || typeof o.data !== "object") return { ok: false, why: "זה לא קובץ גיבוי של הסימולטור" };
    const st = {}; for (const k in o.data) if (KEYRE.test(k) && typeof o.data[k] === "string") st[k] = o.data[k];
    const now = Date.now();
    for (const k of new Set(Object.keys(st).concat(Object.keys(this.kv)))) if (!NOSYNC.has(k) && k !== KVAT) this.kat[k] = now;
    delete st[KVAT];
    this.kv = st; this.kvDirty = true; this.katDirty = true; { const a = this.active(); if (a) a.kvAt = now; } this.saveMeta(); this.flushKv();
    /* המאצ׳ים מהעונה מצטרפים לארכיון (בלי כפילויות) */
    let season = []; try { season = JSON.parse(st.bbSeason1 || "[]"); } catch (e) {}
    const have = new Set(this.matches(null, { lite: true }).map(m => m.at));
    let n = 0; for (const m of (Array.isArray(season) ? season : [])) if (m && isFinite(m.at) && !have.has(m.at)) { this.addMatch(m); n++; }
    return { ok: true, keys: Object.keys(st).length, matches: n };
  }
}
module.exports = { Store, KEYRE, NOSYNC, EMOJI, COLORS, KVAT, IDRE, validId, writeAtomic, readJSON, parseJsonl, appendLines };
