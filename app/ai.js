/* BIOBUZZ — בינה מלאכותית (ג׳מיני של גוגל) בתהליך הראשי.
   • המפתח של המשתמש נשמר מוצפן (safeStorage) בקובץ ai-key.bin בתיקיית הנתונים — לא בנהג,
     לא בסנכרון, לא בגיבוי, לא בדיווח באג. הדף אף פעם לא מקבל אותו (רק ״יש מפתח ···abcd״).
   • ״בדוק״: מושך מגוגל את רשימת המודלים (בלי שמות קבועים בקוד), מנסה כל אחד בבקשה זעירה,
     ובוחר לבד: מהיר לעוזר, חזק למאמן.
   • BIOBUZZ_GEMINI_BASE — כתובת שרת אחרת (שרת מדומה בבדיקות). */
"use strict";
const fs = require("fs");
const path = require("path");
const { writeAtomic, readJSON } = require("./store");

const BASE = () => (process.env.BIOBUZZ_GEMINI_BASE || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
/* מודלים שלא מתאימים לשיחת טקסט — לפי מילים בשם, לא לפי רשימה קבועה */
const SKIP = /embed|aqa|imagen|image|tts|audio|live|veo|native|vision-only|learnlm|robotics|computer-use/i;
/* פורמט חופשי: מפתחות ישנים מתחילים ב-AIza, חדשים ב-AQ. (עם נקודה). גוגל עצמה מכריעה ב״בדוק״ */
const KEYRE = /^[A-Za-z0-9_.\-]{30,300}$/;
/* v63: הסיכום שנשלח למאמן — רק מספרים, בוליאנים ומחרוזות קצרות. שמות (של הנהג ושל חברי הקבוצה) נחתכים ומנוקים,
   כדי ששם של חבר לא יהיה ״הוראה״ למודל, והגודל מוגבל */
const NAMEK = /^(name|driver|team)$/;
function cleanStr(v, max) { return String(v).replace(/[\u0000-\u001f\u007f<>{}\[\]`\\|]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function cleanSummary(v, key, depth) {
  depth = depth || 0;
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return cleanStr(v, NAMEK.test(key || "") ? 24 : 60);
  if (depth > 5) return null;
  if (Array.isArray(v)) return v.slice(0, 40).map(x => cleanSummary(x, key, depth + 1));
  if (typeof v === "object") { const o = {}; let n = 0; for (const k of Object.keys(v)) { if (n++ >= 80) break; o[cleanStr(k, 40)] = cleanSummary(v[k], k, depth + 1); } return o; }
  return null;
}

function aiDir(dataDir) {
  /* קבצי ההוראות: באפליקציה הארוזה — resources/ai; בפיתוח — ai/ בשורש הריפו */
  const c = [process.env.BIOBUZZ_AI_DIR, process.resourcesPath && path.join(process.resourcesPath, "ai"), path.join(__dirname, "..", "ai"), path.join(__dirname, "ai")];
  for (const d of c) { try { if (d && fs.existsSync(path.join(d, "drills.json"))) return d; } catch (e) {} }
  return null;
}

class AI {
  constructor(dataDir, opt) {
    opt = opt || {};
    this.dir = dataDir;
    this.keyFile = path.join(dataDir, "ai-key.bin");
    this.stFile = path.join(dataDir, "ai-state.json");
    this.enc = opt.enc; this.dec = opt.dec; this.canEnc = opt.canEnc || (() => false);
    this.key = ""; this.mem = false;
    /* 1.14 (v73 legal): אישור ״18 ומעלה + התנאים של Gemini API״ — בלעדיו אין שמירת מפתח, בדיקה או שאלה (גם למפתח שכבר שמור) */
    this.ackFile = path.join(dataDir, "ai-ack.json");
    this.ack = (o => o && isFinite(o.at) ? { at: +o.at } : null)(readJSON(this.ackFile, null));
    this.st = readJSON(this.stFile, null) || { checkedAt: 0, ok: false, models: [], pick: { fast: "", strong: "" } };
    try { if (fs.existsSync(this.keyFile)) this.key = this.dec(fs.readFileSync(this.keyFile, "utf8")) || ""; } catch (e) { this.key = ""; }
    this.busy = null; this.gen = 0; this.ctl = null;
    this.files = aiDir(dataDir);
  }
  /* ── מה שהדף רואה: אין שם מפתח ── */
  status() {
    const s = this.st;
    return { has: !!this.key, tail: this.key ? this.key.slice(-4) : "", saved: !!this.key && !this.mem, enc: this.canEnc(),
      ok: !!this.key && !!this.ack && !!s.ok && !!(s.pick.fast || s.pick.strong), ack18: !!this.ack, checkedAt: s.checkedAt || 0, busy: !!this.busy,
      models: (s.models || []).map(m => ({ id: m.id, name: m.name, ok: m.ok, ms: m.ms, why: m.why })),
      pick: Object.assign({}, s.pick), error: s.error || "", files: !!this.files };
  }
  /* 1.14: מאשרים / מבטלים את האישור (ביטול עוצר בדיקה שרצה; המפתח נשאר שמור) */
  ack18(on) {
    if (on) { this.ack = { at: Date.now() }; try { writeAtomic(this.ackFile, JSON.stringify(this.ack)); } catch (e) {} }
    else { this.cancel(); this.ack = null; try { fs.unlinkSync(this.ackFile); } catch (e) {} }
    return this.status();
  }
  static NOACK() { return "קודם מאשרים בהגדרות: אני בן/בת 18 ומעלה ומסכים/ה לתנאים של Gemini API"; }
  saveSt() { try { writeAtomic(this.stFile, JSON.stringify(this.st)); } catch (e) {} }
  scrub(msg) { msg = String(msg || ""); if (this.key) msg = msg.split(this.key).join("•••"); return msg.replace(/key=[A-Za-z0-9_.\-]{10,}/g, "key=•••").slice(0, 240); }
  async setKey(k) {
    k = String(k || "").trim();
    if (!this.ack) return { ok: false, needAck: true, why: AI.NOACK() };
    if (!KEYRE.test(k)) return { ok: false, why: "זה לא נראה כמו מפתח של גוגל — מעתיקים אותו מ-Google AI Studio (מתחיל ב-AIza או ב-AQ.)" };
    this.cancel();
    this.key = k; this.mem = false;
    if (this.canEnc()) { try { writeAtomic(this.keyFile, this.enc(k)); } catch (e) { this.mem = true; } }
    else { this.mem = true; try { fs.unlinkSync(this.keyFile); } catch (e) {} }
    this.st = { checkedAt: 0, ok: false, models: [], pick: { fast: "", strong: "" } }; this.saveSt();
    const r = await this.check();
    return Object.assign({ saved: !this.mem }, r);
  }
  /* v63: מפתח חדש (או מחיקה) באמצע ״בדוק״ — הבדיקה הישנה נעצרת ותוצאותיה לא נשמרות */
  cancel() { this.gen++; try { this.ctl && this.ctl.abort(); } catch (e) {} this.ctl = null; }
  clear() {
    this.cancel();
    this.key = ""; this.mem = false; try { fs.unlinkSync(this.keyFile); } catch (e) {}
    this.st = { checkedAt: 0, ok: false, models: [], pick: { fast: "", strong: "" } }; this.saveSt();
    return this.status();
  }
  /* ── רשת ── */
  async req(method, p, body, ms, opt) {
    opt = opt || {};
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 20000); const t0 = Date.now();
    const outer = opt.signal; const onAbort = () => ctl.abort(); if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener("abort", onAbort); }
    try {
      const r = await fetch(BASE() + p, { method, signal: ctl.signal,
        headers: { "x-goog-api-key": opt.key || this.key, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (!r.ok) { const m = j && j.error && (j.error.message || j.error.status) || ("HTTP " + r.status); const e = new Error(m); e.status = r.status; throw e; }
      return { data: j, ms: Date.now() - t0 };
    } catch (e) { if (e.name === "AbortError") { const x = new Error(outer && outer.aborted ? "canceled" : "timeout"); x.status = 0; throw x; } throw e; }
    finally { clearTimeout(t); if (outer) outer.removeEventListener("abort", onAbort); }
  }
  why(e) {
    const s = e && e.status, m = this.scrub(e && e.message);
    if (s === 400 && /API key not valid|API_KEY_INVALID/i.test(m)) return "המפתח לא תקין";
    if (s === 401 || s === 403) return /PERMISSION|denied|not have access/i.test(m) ? "אין הרשאה למודל הזה במפתח שלך" : "המפתח לא תקין או חסום";
    if (s === 404) return "המודל לא זמין";
    if (s === 400) return /instruction/i.test(m) ? "המודל לא מקבל הוראות מערכת" : "המודל לא תומך בבקשה כזו";
    if (s === 429) return "עברת את המכסה החינמית (נסו מאוחר יותר)";
    if (m === "canceled") return "הבדיקה הופסקה";
    if (s >= 500) return "שגיאה בשרת של גוגל";
    if (m === "timeout") return "אין תשובה (לקח יותר מדי זמן)";
    if (/fetch failed|ENOTFOUND|ECONN|network/i.test(m)) return "אין חיבור לאינטרנט";
    return m || "שגיאה";
  }
  async listModels(opt) {
    const out = []; let tok = "";
    for (let i = 0; i < 10; i++) {
      const { data } = await this.req("GET", "/v1beta/models?pageSize=200" + (tok ? "&pageToken=" + encodeURIComponent(tok) : ""), null, 20000, opt);
      for (const m of (data && data.models) || []) out.push(m);
      tok = data && data.nextPageToken; if (!tok) break;
    }
    return out.filter(m => m && typeof m.name === "string" && (m.supportedGenerationMethods || []).includes("generateContent") && !SKIP.test(m.name + " " + (m.displayName || "")))
      .map(m => ({ id: String(m.name).replace(/^models\//, ""), name: m.displayName || String(m.name).replace(/^models\//, "") }));
  }
  /* דירוג בלי שמות קבועים: גרסה (המספר בשם), משפחה (pro > flash > lite), יציב לפני ניסיוני */
  static rank(id) {
    /* v63: הגרסה רק מ-״gemini-<מספר>״ (gemini-exp-1206 הוא לא גרסה 1206) */
    const v = (String(id).match(/gemini-(\d+(?:\.\d+)?)/i) || [0, 0])[1] * 1;
    const tier = /pro/i.test(id) ? 3 : /lite|nano|8b/i.test(id) ? 1 : /flash/i.test(id) ? 2 : 1.5;
    const stable = /exp|preview|experimental|latest/i.test(id) ? 0 : 1;
    return { v, tier, stable };
  }
  /* סדר המועמדים לכל תפקיד (בלי לבדוק) */
  static order(list) {
    const R = m => AI.rank(m.id);
    const strong = list.slice().sort((a, b) => (R(b).tier - R(a).tier) || (R(b).v - R(a).v) || (R(b).stable - R(a).stable));
    const fastT = m => { const t = R(m).tier; return t === 2 ? 3 : t === 1 ? 2 : t === 1.5 ? 1 : 0; };
    const fast = list.slice().sort((a, b) => (fastT(b) - fastT(a)) || (R(b).v - R(a).v) || (R(b).stable - R(a).stable));
    return { strong, fast };
  }
  static choose(models) {
    /* 429 = מכסה — המודל עובד, רק לא עכשיו. בוחרים בו רק אם אין אחר */
    let ok = models.filter(m => m.ok);
    if (!ok.length) ok = models.filter(m => m.quota).map(m => Object.assign({}, m, { ms: m.ms || 1e6 }));
    if (!ok.length) return { fast: "", strong: "" };
    const R = m => AI.rank(m.id);
    const strong = ok.slice().sort((a, b) => (R(b).tier - R(a).tier) || (R(b).v - R(a).v) || (R(b).stable - R(a).stable) || (a.ms - b.ms))[0];
    /* מהיר: לא ״פרו״ אם יש אחר, הכי מהיר; שוויון בערך (±20%) — הגרסה החדשה */
    const pool = ok.filter(m => R(m).tier < 3); const P = pool.length ? pool : ok;
    const minMs = Math.min(...P.map(m => m.ms));
    const fast = P.filter(m => m.ms <= minMs * 1.2 + 150).sort((a, b) => (R(b).v - R(a).v) || (R(b).stable - R(a).stable) || (a.ms - b.ms))[0];
    return { fast: fast.id, strong: strong.id };
  }
  check() {
    if (!this.ack) return Promise.resolve({ ok: false, needAck: true, why: AI.NOACK(), status: this.status() });
    if (this.busy && this.busyGen === this.gen) return this.busy;
    const g = this.gen;
    const p = this._check(g).finally(() => { if (this.busy === p) this.busy = null; });
    this.busy = p; this.busyGen = g;
    return p;
  }
  /* v63: לא בודקים את כל המודלים (זה שורף את המכסה החינמית) — רק 3 המועמדים הראשונים לכל תפקיד,
     ועוד 3 רק אם אף אחד מהם לא ענה */
  async _check(g) {
    if (!this.key) return { ok: false, why: "אין מפתח" };
    const key = this.key, ctl = new AbortController(); this.ctl = ctl;
    const stale = () => g !== this.gen;
    const canceled = () => ({ ok: false, why: "הבדיקה הופסקה", canceled: true, status: this.status() });
    let list;
    try { list = await this.listModels({ key, signal: ctl.signal }); }
    catch (e) {
      if (stale()) return canceled();
      this.st = { checkedAt: Date.now(), ok: false, models: [], pick: { fast: "", strong: "" }, error: this.why(e) }; this.saveSt(); return { ok: false, why: this.st.error, status: this.status() };
    }
    if (stale()) return canceled();
    const ord = AI.order(list.slice(0, 60));
    const res = [], tried = new Set();
    const probe = async m => {
      tried.add(m.id);
      try {
        const { ms } = await this.req("POST", "/v1beta/models/" + encodeURIComponent(m.id) + ":generateContent",
          /* כמו בשימוש האמיתי: עם הוראת מערכת (יש מודלים שלא מקבלים אותה — הם ייפסלו כאן ולא באמצע שאלה) */
          { systemInstruction: { parts: [{ text: "You are a test." }] }, contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }], generationConfig: { maxOutputTokens: 16, temperature: 0 } }, 15000, { key, signal: ctl.signal });
        res.push(Object.assign({}, m, { ok: true, ms, why: "" }));
      } catch (e) { res.push(Object.assign({}, m, { ok: false, quota: e.status === 429, ms: 0, why: this.why(e) })); }
    };
    for (let round = 0; round < 2; round++) {
      const want = [];
      for (const role of ["strong", "fast"]) {
        if (round > 0 && res.some(r => r.ok && ord[role].some(x => x.id === r.id))) continue;
        for (const m of ord[role].filter(x => !tried.has(x.id) && !want.includes(x)).slice(0, 3)) want.push(m);
      }
      if (!want.length) break;
      await Promise.all(want.map(probe));
      if (stale()) return canceled();
    }
    res.sort((a, b) => (b.ok - a.ok) || (a.ok ? a.ms - b.ms : a.id.localeCompare(b.id)));
    const pick = AI.choose(res);
    const quotaOnly = !res.some(r => r.ok) && res.some(r => r.quota);
    this.st = { checkedAt: Date.now(), ok: !!(pick.fast || pick.strong), models: res, pick,
      error: res.length ? (quotaOnly ? "עברת את המכסה החינמית — המפתח תקין, נסו שוב מאוחר יותר" : pick.fast ? "" : "אף מודל לא ענה") : "גוגל לא החזיר מודלים לטקסט" };
    if (this.ctl === ctl) this.ctl = null;
    this.saveSt();
    return { ok: this.st.ok, why: this.st.error, status: this.status() };
  }
  /* ── הקבצים: הוראות ותרגילים ── */
  file(n) { if (!this.files) return ""; try { return fs.readFileSync(path.join(this.files, n), "utf8"); } catch (e) { return ""; } }
  drills() { try { return JSON.parse(this.file("drills.json")).drills || []; } catch (e) { return []; } }
  sys(kind, lang, features) {
    const L = lang === "en" ? "English" : "Hebrew (עברית)";
    if (kind === "coach") {
      const D = this.drills().map(d => "- " + d.id + ": " + (lang === "en" ? d.en + " — " + d.what_en : d.he + " — " + d.what_he) + " (" + d.metric + ", " + d.better + " is better; trains: " + (d.trains || []).join(", ") + ")").join("\n");
      return this.file("coach-prompt.md").replace(/<!--[\s\S]*?-->/g, "").split("{{LANG}}").join(L).split("{{DRILLS}}").join(D);
    }
    const F = (Array.isArray(features) ? features : []).filter(f => f && typeof f === "object").slice(0, 220).map(f => "- " + cleanStr(f.id, 40) + " — " + cleanStr(f.n, 80)).join("\n");
    return this.file("helper-prompt.md").replace(/<!--[\s\S]*?-->/g, "").split("{{LANG}}").join(L).split("{{FEATURES}}").join(F || "(none)");
  }
  /* ── שאלה ── kind: helper (מהיר, שיחה) / coach (חזק, JSON) */
  async ask(kind, o) {
    o = o && typeof o === "object" ? o : {};
    if (!this.ack) return { ok: false, needAck: true, why: AI.NOACK() };
    if (!this.key) return { ok: false, why: "אין מפתח של גוגל — מוסיפים אותו בהגדרות" };
    if (!this.st.ok) return { ok: false, why: "המפתח עוד לא נבדק — ״בדוק״ בהגדרות" };
    const coach = kind === "coach";
    const order = coach ? [this.st.pick.strong, this.st.pick.fast] : [this.st.pick.fast, this.st.pick.strong];
    const models = order.filter((x, i, a) => x && a.indexOf(x) === i);
    let sent = null;
    if (coach) {
      sent = cleanSummary(o.summary && typeof o.summary === "object" ? o.summary : {}, "", 0) || {};
      if (JSON.stringify(sent).length > 24000) return { ok: false, why: "יותר מדי נתונים לניתוח" };
    }
    const msgs = coach ? [{ role: "user", text: JSON.stringify(sent) }]
      : (Array.isArray(o.messages) ? o.messages : []).filter(m => m && typeof m === "object").slice(-12).map(m => ({ role: m.role === "model" ? "model" : "user", text: String(m.text == null ? "" : m.text).slice(0, 2000) })).filter(m => m.text);
    if (!msgs.length) return { ok: false, why: "אין שאלה" };
    const sys = this.sys(coach ? "coach" : "helper", o.lang, o.features);
    const mk = extra => ({
      systemInstruction: { parts: [{ text: sys + (extra || "") }] },
      contents: msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: Object.assign({ temperature: coach ? 0.4 : 0.3, maxOutputTokens: coach ? 8192 : 2048 }, coach ? { responseMimeType: "application/json" } : {})
    });
    let last = null;
    for (const id of models) {
      /* המאמן: תשובה שנקטעה (JSON לא שלם) — עוד ניסיון אחד עם בקשה לתשובה קצרה יותר */
      for (let attempt = 0; attempt < (coach ? 2 : 1); attempt++) {
        try {
          const body = mk(attempt ? "\n\nIMPORTANT: your previous answer was cut off. Answer again with a SHORT, complete JSON object: at most 3 items per list and one short sentence per field." : "");
          const { data, ms } = await this.req("POST", "/v1beta/models/" + encodeURIComponent(id) + ":generateContent", body, coach ? 90000 : 45000);
          const c = data && data.candidates && data.candidates[0];
          const text = ((c && c.content && c.content.parts) || []).map(p => (p && p.text) || "").join("").trim();
          if (!text) { last = { status: 0, message: c && c.finishReason === "SAFETY" ? "safety" : c && c.finishReason === "MAX_TOKENS" ? "cut" : "empty" }; if (last.message === "cut") continue; break; }
          if (coach) {
            let j = null; try { j = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch (e) {}
            if (!j || typeof j !== "object" || Array.isArray(j)) { last = { status: 0, message: c && c.finishReason === "MAX_TOKENS" ? "cut" : "bad json" }; continue; }
            return { ok: true, model: id, ms, json: j, sent };
          }
          return { ok: true, model: id, ms, text: text.slice(0, 6000) };
        } catch (e) { last = e; break; }
      }
    }
    const m = last && last.message;
    return { ok: false, sent, why: m === "empty" ? "המודל לא החזיר תשובה — נסו שוב" : m === "cut" ? "התשובה נקטעה באמצע — נסו שוב" : m === "bad json" ? "התשובה לא הגיעה בצורה הנכונה — נסו שוב" : m === "safety" ? "המודל סירב לענות — נסו שוב" : this.why(last) };
  }
}
module.exports = { AI, aiDir, cleanSummary };
