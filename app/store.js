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
const NOSYNC = new Set(["bbUiMode1", "biobuzz_ws_v1", "bbHud1", "bbBackups1", "bbQual1", "bbHelp1", "bbShellLast", "bbLive1", "bbRecAuto1", "bbLang1", "bbTour1"]);
const EMOJI = ["🐝", "🚀", "🤖", "⚡", "🔥", "🦅", "🐺", "🦊", "🐉", "🎯", "🌟", "🏆"];
const COLORS = ["#FFB020", "#35D6A4", "#4C9AF5", "#F2545B", "#B07CFF", "#FF7AC6", "#7FD1FF", "#C6E26B"];

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return def; }
}
function newId() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function cleanName(n) { return String(n == null ? "" : n).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24); }

class Store {
  constructor(root) {
    this.root = root;
    fs.mkdirSync(root, { recursive: true });
    this.pfile = path.join(root, "profiles.json");
    this.meta = readJSON(this.pfile, null);
    this.firstRun = !this.meta || !Array.isArray(this.meta.list) || !this.meta.list.length;
    if (this.firstRun) {
      this.meta = { v: 1, active: null, list: [] };
      const p = this.addProfile("נהג 1", { quiet: true });
      this.meta.active = p.id; this.saveMeta();
    }
    if (!this.meta.list.find(p => p.id === this.meta.active)) { this.meta.active = this.meta.list[0].id; this.saveMeta(); }
    if (!Array.isArray(this.meta.tombs)) this.meta.tombs = [];
    this.kv = {};                 // מטמון של הפרופיל הפעיל
    this.kvDirty = false; this.kvTimer = null;
    this.loadKv();
  }
  /* ── פרופילים ── */
  saveMeta() { writeAtomic(this.pfile, JSON.stringify(this.meta, null, 1)); }
  dir(id) { return path.join(this.root, "profiles", id); }
  profiles() {
    return this.meta.list.map(p => Object.assign({}, p, { active: p.id === this.meta.active, sum: this.summary(p.id) }));
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
    const p = { id: newId(), name: this.uniqueName(name), emoji: opt.emoji || EMOJI[i % EMOJI.length],
      color: opt.color || COLORS[i % COLORS.length], created: Date.now(), metaAt: opt.quiet ? 0 : Date.now(), kvAt: 0 };
    if (opt.id) p.id = opt.id;
    this.meta.list.push(p);
    fs.mkdirSync(this.dir(p.id), { recursive: true });
    if (!opt.quiet) this.saveMeta();
    return p;
  }
  updateProfile(id, patch) {
    const p = this.meta.list.find(x => x.id === id); if (!p) return null;
    if (patch.name != null) p.name = this.uniqueName(patch.name, id);
    if (patch.emoji) p.emoji = String(patch.emoji).slice(0, 4);
    if (patch.color && /^#[0-9a-f]{6}$/i.test(patch.color)) p.color = patch.color;
    p.metaAt = Date.now();
    this.saveMeta(); return p;
  }
  /* מחיקה = העברה לסל (trash/). אי אפשר למחוק את הפעיל או את האחרון. */
  removeProfile(id) {
    if (id === this.meta.active || this.meta.list.length <= 1) return false;
    const i = this.meta.list.findIndex(x => x.id === id); if (i < 0) return false;
    const p = this.meta.list[i];
    const src = this.dir(id), dst = path.join(this.root, "trash", id + "-" + Date.now());
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    try { fs.renameSync(src, dst); writeAtomic(path.join(dst, "profile.json"), JSON.stringify(p)); } catch (e) {}
    this.meta.list.splice(i, 1);
    if (!(arguments[1] && arguments[1].noTomb)) this.meta.tombs.push({ id, at: Date.now(), acct: p.acct || "team" });
    this.saveMeta(); return true;
  }
  switchTo(id) {
    if (!this.meta.list.find(x => x.id === id)) return false;
    this.flushKv();
    this.meta.active = id; this.saveMeta(); this.loadKv(); return true;
  }
  /* ── מפתחות הסימולטור ── */
  loadKv() {
    const id = this.meta.active;
    this.kv = readJSON(path.join(this.dir(id), "store.json"), {}) || {};
    for (const k of Object.keys(this.kv)) if (!KEYRE.test(k) || typeof this.kv[k] !== "string") delete this.kv[k];
    this.seedArchive(id);
  }
  kvAll() { return Object.assign({}, this.kv); }
  kvSet(k, v) {
    if (!KEYRE.test(k)) return;
    const nv = (v === null || v === undefined) ? undefined : String(v);
    if (this.kv[k] === nv) return;
    if (nv === undefined) delete this.kv[k]; else this.kv[k] = nv;
    if (!NOSYNC.has(k)) { const a = this.active(); if (a) { a.kvAt = Date.now(); this.metaDirty = true; } }
    this.kvDirty = true;
    if (!this.kvTimer) this.kvTimer = setTimeout(() => this.flushKv(), 250);
  }
  kvClear() { this.kv = {}; const a = this.active(); if (a) { a.kvAt = Date.now(); this.metaDirty = true; } this.kvDirty = true; this.flushKv(); }
  flushKv() {
    if (this.kvTimer) { clearTimeout(this.kvTimer); this.kvTimer = null; }
    if (this.metaDirty) { this.metaDirty = false; this.saveMeta(); }
    if (!this.kvDirty) return;
    writeAtomic(path.join(this.dir(this.meta.active), "store.json"), JSON.stringify(this.kv));
    this.kvDirty = false;
  }
  /* ── לסנכרון ── */
  kvOf(id) {
    if (id === this.meta.active) return Object.assign({}, this.kv);
    const o = readJSON(path.join(this.dir(id), "store.json"), {}) || {};
    for (const k of Object.keys(o)) if (!KEYRE.test(k) || typeof o[k] !== "string") delete o[k];
    return o;
  }
  kvSynced(id) { const o = this.kvOf(id); for (const k of Object.keys(o)) if (NOSYNC.has(k)) delete o[k]; return o; }
  /* הגדרות שהגיעו ממחשב אחר: מחליפות את המסונכרנות, ושומרות את המקומיות */
  applyRemoteKv(id, kv, at) {
    const p = this.meta.list.find(x => x.id === id); if (!p) return false;
    const cur = this.kvOf(id), out = {};
    for (const k in cur) if (NOSYNC.has(k)) out[k] = cur[k];
    for (const k in (kv || {})) if (KEYRE.test(k) && !NOSYNC.has(k) && typeof kv[k] === "string") out[k] = kv[k];
    if (id === this.meta.active) { if (this.kvTimer) { clearTimeout(this.kvTimer); this.kvTimer = null; } this.kv = out; this.kvDirty = false; }
    writeAtomic(path.join(this.dir(id), "store.json"), JSON.stringify(out));
    p.kvAt = at; this.saveMeta(); return true;
  }
  applyRemoteMeta(row, kind) {
    let p = this.meta.list.find(x => x.id === row.id);
    if (!p) { p = { id: row.id, created: row.created || Date.now(), kvAt: 0, acct: kind || "team" }; this.meta.list.push(p); fs.mkdirSync(this.dir(p.id), { recursive: true }); }
    p.name = cleanName(row.name) || p.name || "נהג"; if (row.emoji) p.emoji = row.emoji; if (row.color) p.color = row.color;
    p.metaAt = row.meta_at || 0; this.saveMeta(); return p;
  }
  /* לאיזה חשבון הנהג שייך: ״team״ (ברירת מחדל) או ״personal״. בהעברה — נמחק מהחשבון הקודם ונשלח לחדש */
  acctOf(id) { const p = this.meta.list.find(x => x.id === id); return p ? (p.acct || "team") : null; }
  setAcct(id, kind) {
    const p = this.meta.list.find(x => x.id === id); if (!p) return null;
    kind = kind === "personal" ? "personal" : "team";
    const old = p.acct || "team"; if (old === kind) return p;
    const now = Date.now();
    this.meta.tombs.push({ id, at: now, acct: old });
    p.acct = kind; p.metaAt = now; p.kvAt = Math.max(p.kvAt || 0, now);
    this.saveMeta(); return p;
  }
  /* נהג שנמחק במחשב אחר */
  removeFromRemote(id) {
    const i = this.meta.list.findIndex(x => x.id === id); if (i < 0) return false;
    if (this.meta.list.length <= 1) return false;
    let switched = false;
    if (id === this.meta.active) { this.flushKv(); this.meta.active = this.meta.list.find(x => x.id !== id).id; switched = true; }
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
    if (!list.length) return 0;
    fs.mkdirSync(this.dir(id), { recursive: true });
    fs.appendFileSync(this.mfile(id), list.map(m => JSON.stringify(m)).join("\n") + "\n");
    return list.length;
  }
  /* ── ארכיון מאצ׳ים ── */
  mfile(id) { return path.join(this.dir(id), "matches.jsonl"); }
  matches(id, opt) {
    id = id || this.meta.active; opt = opt || {};
    let txt = ""; try { txt = fs.readFileSync(this.mfile(id), "utf8"); } catch (e) { return []; }
    const out = [];
    for (const line of txt.split("\n")) {
      if (!line.trim()) continue;
      try { const m = JSON.parse(line); if (opt.lite) { delete m.sh; delete m.bl; } out.push(m); } catch (e) {}
    }
    return out;
  }
  addMatch(m, id) {
    id = id || this.meta.active;
    if (!m || typeof m !== "object" || !isFinite(m.at)) return false;
    fs.mkdirSync(this.dir(id), { recursive: true });
    fs.appendFileSync(this.mfile(id), JSON.stringify(m) + "\n");
    return true;
  }
  /* פעם ראשונה: מה שכבר היה בעונה של הסימולטור נכנס לארכיון */
  seedArchive(id) {
    if (fs.existsSync(this.mfile(id))) return;
    let season = [];
    try { season = JSON.parse(this.kv.bbSeason1 || "[]"); } catch (e) {}
    if (!Array.isArray(season)) season = [];
    const lines = season.filter(m => m && isFinite(m.at)).map(m => JSON.stringify(m)).join("\n");
    writeAtomic(this.mfile(id), lines ? lines + "\n" : "");
  }
  summary(id) {
    const l = this.matches(id, { lite: true }); const n = l.length;
    if (!n) return { n: 0 };
    let W = 0, L = 0, pts = 0, best = 0, shots = 0, hits = 0, last = 0;
    for (const m of l) { if (m.win > 0) W++; else if (m.win < 0) L++; pts += +m.my || 0; best = Math.max(best, +m.my || 0);
      shots += +m.shots || 0; hits += +m.hits || 0; last = Math.max(last, +m.at || 0); }
    return { n, W, L, T: n - W - L, avg: pts / n, best, acc: shots ? hits / shots : null, shots, last };
  }
  team() { return this.meta.list.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, active: p.id === this.meta.active, sum: this.summary(p.id) })); }
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
    return JSON.stringify({ bb: "team", v: 1, at: Date.now(), profiles: this.meta.list.map(p => ({
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
      const st = {}; for (const k in (q.store || {})) if (KEYRE.test(k) && typeof q.store[k] === "string") st[k] = q.store[k];
      writeAtomic(path.join(this.dir(p.id), "store.json"), JSON.stringify(st)); p.kvAt = Date.now(); this.saveMeta();
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
    this.kv = st; this.kvDirty = true; { const a = this.active(); if (a) a.kvAt = Date.now(); } this.saveMeta(); this.flushKv();
    /* המאצ׳ים מהעונה מצטרפים לארכיון (בלי כפילויות) */
    let season = []; try { season = JSON.parse(st.bbSeason1 || "[]"); } catch (e) {}
    const have = new Set(this.matches(null, { lite: true }).map(m => m.at));
    let n = 0; for (const m of (Array.isArray(season) ? season : [])) if (m && isFinite(m.at) && !have.has(m.at)) { this.addMatch(m); n++; }
    return { ok: true, keys: Object.keys(st).length, matches: n };
  }
}
module.exports = { Store, KEYRE, NOSYNC, EMOJI, COLORS, writeAtomic, readJSON };
