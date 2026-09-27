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
const KEYRE = /^[A-Za-z0-9_\-]{30,60}$/;

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
    this.st = readJSON(this.stFile, null) || { checkedAt: 0, ok: false, models: [], pick: { fast: "", strong: "" } };
    try { if (fs.existsSync(this.keyFile)) this.key = this.dec(fs.readFileSync(this.keyFile, "utf8")) || ""; } catch (e) { this.key = ""; }
    this.busy = null;
    this.files = aiDir(dataDir);
  }
  /* ── מה שהדף רואה: אין שם מפתח ── */
  status() {
    const s = this.st;
    return { has: !!this.key, tail: this.key ? this.key.slice(-4) : "", saved: !!this.key && !this.mem, enc: this.canEnc(),
      ok: !!this.key && !!s.ok && !!(s.pick.fast || s.pick.strong), checkedAt: s.checkedAt || 0, busy: !!this.busy,
      models: (s.models || []).map(m => ({ id: m.id, name: m.name, ok: m.ok, ms: m.ms, why: m.why })),
      pick: Object.assign({}, s.pick), error: s.error || "", files: !!this.files };
  }
  saveSt() { try { writeAtomic(this.stFile, JSON.stringify(this.st)); } catch (e) {} }
  scrub(msg) { msg = String(msg || ""); if (this.key) msg = msg.split(this.key).join("•••"); return msg.replace(/key=[A-Za-z0-9_\-]{10,}/g, "key=•••").slice(0, 240); }
  async setKey(k) {
    k = String(k || "").trim();
    if (!KEYRE.test(k)) return { ok: false, why: "זה לא נראה כמו מפתח של גוגל — מעתיקים אותו מ-Google AI Studio (מתחיל בדרך כלל ב-AIza)" };
    this.key = k; this.mem = false;
    if (this.canEnc()) { try { writeAtomic(this.keyFile, this.enc(k)); } catch (e) { this.mem = true; } }
    else { this.mem = true; try { fs.unlinkSync(this.keyFile); } catch (e) {} }
    this.st = { checkedAt: 0, ok: false, models: [], pick: { fast: "", strong: "" } }; this.saveSt();
    const r = await this.check();
    return Object.assign({ saved: !this.mem }, r);
  }
  clear() {
    this.key = ""; this.mem = false; try { fs.unlinkSync(this.keyFile); } catch (e) {}
    this.st = { checkedAt: 0, ok: false, models: [], pick: { fast: "", strong: "" } }; this.saveSt();
    return this.status();
  }
  /* ── רשת ── */
  async req(method, p, body, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 20000); const t0 = Date.now();
    try {
      const r = await fetch(BASE() + p, { method, signal: ctl.signal,
        headers: { "x-goog-api-key": this.key, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (!r.ok) { const m = j && j.error && (j.error.message || j.error.status) || ("HTTP " + r.status); const e = new Error(m); e.status = r.status; throw e; }
      return { data: j, ms: Date.now() - t0 };
    } catch (e) { if (e.name === "AbortError") { const x = new Error("timeout"); x.status = 0; throw x; } throw e; }
    finally { clearTimeout(t); }
  }
  why(e) {
    const s = e && e.status, m = this.scrub(e && e.message);
    if (s === 400 && /API key not valid|API_KEY_INVALID/i.test(m)) return "המפתח לא תקין";
    if (s === 401 || s === 403) return /PERMISSION|denied|not have access/i.test(m) ? "אין הרשאה למודל הזה במפתח שלך" : "המפתח לא תקין או חסום";
    if (s === 404) return "המודל לא זמין";
    if (s === 400) return /instruction/i.test(m) ? "המודל לא מקבל הוראות מערכת" : "המודל לא תומך בבקשה כזו";
    if (s === 429) return "עברת את המכסה החינמית (נסו מאוחר יותר)";
    if (s >= 500) return "שגיאה בשרת של גוגל";
    if (m === "timeout") return "אין תשובה (לקח יותר מדי זמן)";
    if (/fetch failed|ENOTFOUND|ECONN|network/i.test(m)) return "אין חיבור לאינטרנט";
    return m || "שגיאה";
  }
  async listModels() {
    const out = []; let tok = "";
    for (let i = 0; i < 10; i++) {
      const { data } = await this.req("GET", "/v1beta/models?pageSize=200" + (tok ? "&pageToken=" + encodeURIComponent(tok) : ""), null, 20000);
      for (const m of (data && data.models) || []) out.push(m);
      tok = data && data.nextPageToken; if (!tok) break;
    }
    return out.filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && !SKIP.test(m.name + " " + (m.displayName || "")))
      .map(m => ({ id: String(m.name).replace(/^models\//, ""), name: m.displayName || String(m.name).replace(/^models\//, "") }));
  }
  /* דירוג בלי שמות קבועים: גרסה (המספר בשם), משפחה (pro > flash > lite), יציב לפני ניסיוני */
  static rank(id) {
    const v = (String(id).match(/(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1;
    const tier = /pro/i.test(id) ? 3 : /lite|nano|8b/i.test(id) ? 1 : /flash/i.test(id) ? 2 : 1.5;
    const stable = /exp|preview|experimental|latest/i.test(id) ? 0 : 1;
    return { v, tier, stable };
  }
  static choose(models) {
    const ok = models.filter(m => m.ok);
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
    if (this.busy) return this.busy;
    this.busy = this._check().finally(() => { this.busy = null; });
    return this.busy;
  }
  async _check() {
    if (!this.key) return { ok: false, why: "אין מפתח" };
    let list;
    try { list = await this.listModels(); }
    catch (e) { this.st = { checkedAt: Date.now(), ok: false, models: [], pick: { fast: "", strong: "" }, error: this.why(e) }; this.saveSt(); return { ok: false, why: this.st.error, status: this.status() }; }
    list = list.slice(0, 40);
    const res = []; let i = 0;
    const one = async () => {
      while (i < list.length) {
        const m = list[i++];
        try {
          const { ms } = await this.req("POST", "/v1beta/models/" + encodeURIComponent(m.id) + ":generateContent",
            /* כמו בשימוש האמיתי: עם הוראת מערכת (יש מודלים שלא מקבלים אותה — הם ייפסלו כאן ולא באמצע שאלה) */
            { systemInstruction: { parts: [{ text: "You are a test." }] }, contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }], generationConfig: { maxOutputTokens: 16, temperature: 0 } }, 15000);
          res.push(Object.assign({}, m, { ok: true, ms, why: "" }));
        } catch (e) { res.push(Object.assign({}, m, { ok: false, ms: 0, why: this.why(e) })); }
      }
    };
    await Promise.all([one(), one(), one(), one()]);
    res.sort((a, b) => (b.ok - a.ok) || (a.ok ? a.ms - b.ms : a.id.localeCompare(b.id)));
    const pick = AI.choose(res);
    this.st = { checkedAt: Date.now(), ok: !!(pick.fast || pick.strong), models: res, pick, error: res.length ? (pick.fast ? "" : "אף מודל לא ענה") : "גוגל לא החזיר מודלים לטקסט" };
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
    const F = (Array.isArray(features) ? features : []).slice(0, 220).map(f => "- " + String(f.id).slice(0, 40) + " — " + String(f.n).slice(0, 80)).join("\n");
    return this.file("helper-prompt.md").replace(/<!--[\s\S]*?-->/g, "").split("{{LANG}}").join(L).split("{{FEATURES}}").join(F || "(none)");
  }
  /* ── שאלה ── kind: helper (מהיר, שיחה) / coach (חזק, JSON) */
  async ask(kind, o) {
    o = o || {};
    if (!this.key) return { ok: false, why: "אין מפתח של גוגל — מוסיפים אותו בהגדרות" };
    if (!this.st.ok) return { ok: false, why: "המפתח עוד לא נבדק — ״בדוק״ בהגדרות" };
    const coach = kind === "coach";
    const order = coach ? [this.st.pick.strong, this.st.pick.fast] : [this.st.pick.fast, this.st.pick.strong];
    const models = order.filter((x, i, a) => x && a.indexOf(x) === i);
    const msgs = coach ? [{ role: "user", text: JSON.stringify(o.summary || {}) }]
      : (Array.isArray(o.messages) ? o.messages : []).slice(-12).map(m => ({ role: m.role === "model" ? "model" : "user", text: String(m.text || "").slice(0, 2000) }));
    if (!msgs.length) return { ok: false, why: "אין שאלה" };
    const body = {
      systemInstruction: { parts: [{ text: this.sys(coach ? "coach" : "helper", o.lang, o.features) }] },
      contents: msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: Object.assign({ temperature: coach ? 0.4 : 0.3, maxOutputTokens: coach ? 8192 : 2048 }, coach ? { responseMimeType: "application/json" } : {})
    };
    let last = null;
    for (const id of models) {
      try {
        const { data, ms } = await this.req("POST", "/v1beta/models/" + encodeURIComponent(id) + ":generateContent", body, coach ? 90000 : 45000);
        const c = data && data.candidates && data.candidates[0];
        const text = ((c && c.content && c.content.parts) || []).map(p => p.text || "").join("").trim();
        if (!text) { last = { status: 0, message: c && c.finishReason === "SAFETY" ? "safety" : "empty" }; continue; }
        if (coach) {
          let j = null; try { j = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch (e) {}
          if (!j || typeof j !== "object") { last = { status: 0, message: "bad json" }; continue; }
          return { ok: true, model: id, ms, json: j };
        }
        return { ok: true, model: id, ms, text: text.slice(0, 6000) };
      } catch (e) { last = e; }
    }
    return { ok: false, why: last && last.message === "empty" ? "המודל לא החזיר תשובה — נסו שוב" : last && last.message === "bad json" ? "התשובה לא הגיעה בצורה הנכונה — נסו שוב" : this.why(last) };
  }
}
module.exports = { AI, aiDir };
