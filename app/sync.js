/* BIOBUZZ — סנכרון בין מחשבים דרך Supabase (Auth + PostgREST), בלי ספריות חיצוניות.
   חשבון אחד (למשל של הקבוצה) = אותם נהגים, הגדרות ומאצ׳ים בכל מחשב שמתחבר.
   כללים:
   • נהג (שם/סמל/צבע) והגדרות — מי שהשתנה אחרון מנצח (meta_at / kv_at).
   • מאצ׳ים — איחוד: כל מאץ׳ שקיים באחד הצדדים מגיע לשני (מזהה = נהג + זמן).
   • מחיקת נהג — עוברת לכל המחשבים (deleted=true).
   • בלי אינטרנט הכול ממשיך לעבוד; הסנכרון הבא משלים. */
"use strict";
const fs = require("fs");
const path = require("path");
const { writeAtomic, readJSON, validId, KVAT } = require("./store");

const DEFAULT_CLOUD = {
  url: "https://somhwsjbhanyxzrxkyer.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbWh3c2piaGFueXh6cnhreWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MzAyNjUsImV4cCI6MjEwNjAwNjI2NX0.xwEQUo_RXVyMJ9_UJ7FJzKq5CHMIN5EuLM25UEaFIiE"
};
/* דף האישור באינטרנט — לשם מגיעים מהמייל (אישור חשבון, סיסמה חדשה) */
const SITE = "https://yaarilevrosen-cpu.github.io/BIOBUZZ/";
const HEB = {
  "Invalid login credentials": "המייל או הסיסמה לא נכונים",
  "Email not confirmed": "צריך לאשר את המייל קודם — חפשו מייל מ-Supabase (גם בספאם)",
  "User already registered": "כבר יש חשבון עם המייל הזה — התחברו",
  "Password should be at least 6 characters.": "הסיסמה צריכה להיות לפחות 6 תווים",
  "Unable to validate email address: invalid format": "כתובת המייל לא תקינה"
};
/* v60: שם החשבון שמור בשרת (user_metadata.name) — אותו שם בכל מחשב */
function userName(u) { const m = u && (u.user_metadata || u.meta); return m && typeof m.name === "string" ? m.name.trim().slice(0, 40) : ""; }
/* 1.14 (v73 legal): איזו גרסת תנאים החשבון אישר (user_metadata.tos_v). בלי תאריך לידה — רק טווח גיל בהרשמה */
const TOSV = /^\d{4}-\d\d-\d\d$/;
function userTos(u) { const m = u && (u.user_metadata || u.meta); return m && typeof m.tos_v === "string" && TOSV.test(m.tos_v) ? m.tos_v : ""; }
/* 1.14 (legalfix): טווח הגיל שנבחר בהרשמה (או באישור התנאים, לחשבון מלפני 1.14) — ״13-17״ מסתיר את הבינה המלאכותית */
const AGES = ["13-17", "18+"];
function userAge(u) { const m = u && (u.user_metadata || u.meta); return m && AGES.includes(m.age_bracket) ? m.age_bracket : ""; }
/* הפונקציה עוד לא קיימת בשרת (v73_privacy.sql לא הורץ) — PostgREST מחזיר 404 / PGRST202 */
function noFn(e) { const m = String(e && e.message || "") + " " + JSON.stringify(e && e.body || ""); return !!e && (e.status === 404 || /PGRST202|Could not find the function/i.test(m)); }
const TOS_WAIT = "עדכנו את תנאי השימוש ומדיניות הפרטיות — הסנכרון מושהה עד שמאשרים בחלונית החשבון";
/* מה שנשלח בהרשמה — רק השדות האלה, ורק בצורה הזו */
function signupMeta(meta) {
  meta = meta && typeof meta === "object" ? meta : {};
  const v = typeof meta.tos_v === "string" && TOSV.test(meta.tos_v) ? meta.tos_v : "";
  if (!v) return { why: "צריך לאשר את תנאי השימוש ומדיניות הפרטיות לפני פתיחת חשבון" };
  const age = meta.age_bracket;
  if (age === "u13") return { why: "חשבון בענן פתוח מגיל 13 — אפשר להשתמש בסימולטור בלי חשבון" };
  if (age !== "13-17" && age !== "18+") return { why: "צריך לאשר את תנאי השימוש ומדיניות הפרטיות לפני פתיחת חשבון" };
  if (age === "13-17" && meta.guardian_ok !== true) return { why: "מתחת לגיל 18 צריך הסכמה של הורה או אפוטרופוס" };
  return { data: { tos_v: v, tos_at: new Date().toISOString(), age_bracket: age, guardian_ok: age === "13-17" ? true : null } };
}
/* 1.12.4: מה שהשרת ידחה בכל מקרה (v63_security.sql) — מסננים לפני השליחה, ושורה שבכל זאת נדחתה לא תוקעת את כל הסנכרון */
const MATCH_MAX = 250000;            /* bb_matches_size_ok: pg_column_size(data) <= 262144 */
const KV_MAX = 1400000;              /* bb_profiles_size_ok: pg_column_size(kv) <= 1500000 (1.12.5, v72_security.sql; לפני כן 2000000) */
const AT_MAX = 4102444800000;        /* שנת 2100 — at הוא bigint; 1e300 נכשל */
const cut = (v, n) => typeof v === "string" ? Array.from(v).slice(0, n).join("") : null;
function cleanColor(c) { return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : null; }
function matchOk(m) { return !!m && typeof m === "object" && isFinite(m.at) && +m.at > 0 && +m.at < AT_MAX; }
/* הנתונים של מאץ׳ לענן: גדול מדי — בלי מסלול הירי והכדורים (sh/bl); עדיין גדול — לא עולה */
function matchData(m) {
  let j = JSON.stringify(m); if (Buffer.byteLength(j) <= MATCH_MAX) return m;
  const o = Object.assign({}, m); delete o.sh; delete o.bl; j = JSON.stringify(o);
  return Buffer.byteLength(j) <= MATCH_MAX ? o : null;
}
/* דחייה של השרת (לא תקלת רשת / אסימון) — השורה עצמה לא תקינה */
const rejected = e => e && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 408 && e.status !== 429;
/* שדות הסיכום של מאץ׳ של חבר קבוצה (store.summarize) — לא את כל המאץ׳ */
/* 1.13: גם סוג המשחק (תרגיל/אתגר לא נספרים בסיכום), רמת הבוטים, ושיא תרגיל (drill + dv) */
const TEAM_FIELDS = ["win", "my", "shots", "hits", "avgCycle", "fouls", "park", "autoPts", "kind", "skill", "drill", "dv"];
const TEAM_PAGE = 500;               /* לכל חבר בכל סנכרון; הבא ממשיך מאיפה שעצר */
/* 1.12.5: הודעת השרת כשהחשבון הגיע לתקרת האחסון (v72_security.sql) */
const QUOTA = /bb quota/i;
function heb(msg) {
  msg = String(msg || "שגיאה");
  for (const k in HEB) if (msg.indexOf(k) >= 0) return HEB[k];
  if (/rate limit/i.test(msg)) return "יותר מדי ניסיונות — נסו שוב בעוד כמה דקות";
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|network|timeout/i.test(msg)) return "אין חיבור לאינטרנט — הסנכרון יחכה";
  return msg;
}

class Sync {
  /* enc/dec: הצפנה של אסימון ההתחברות (safeStorage של Windows), אם יש */
  constructor(store, dir, opt) {
    opt = opt || {};
    this.store = store; this.dir = dir;
    /* v57: חשבון אחד לכל אדם. הקבוצה = קבוצה שמצטרפים אליה בקוד (bb_teams) */
    this.kind = "main";
    this.cloud = Object.assign({}, DEFAULT_CLOUD, readJSON(path.join(dir, "cloud.json"), {}) || {}, opt.cloud || {});
    /* 1.12.4: שרת אחר לבדיקות, בלי לגעת בייצור */
    if (process.env.BIOBUZZ_CLOUD_URL) this.cloud.url = process.env.BIOBUZZ_CLOUD_URL;
    if (process.env.BIOBUZZ_CLOUD_KEY) this.cloud.key = process.env.BIOBUZZ_CLOUD_KEY;
    this.enc = opt.enc || (s => Buffer.from(s, "utf8").toString("base64"));
    this.dec = opt.dec || (s => Buffer.from(s, "base64").toString("utf8"));
    /* v63: בלי הצפנה אמיתית (לינוקס בלי מחזיק מפתחות) — ההתחברות נשמרת רק בזיכרון, עד היציאה */
    this.canPersist = opt.canEnc || (() => true);
    this.file = path.join(dir, "account.json");
    /* v63: האם כבר התחבר מישהו במחשב הזה (בשביל ״של מי הנהגים״ בהתחברות הבאה) */
    this.hadAcct = ["account.json", "account-team.json", "account-personal.json"].some(f => fs.existsSync(path.join(dir, f)));
    this.migrated = "";
    /* 1.2–1.3 שמרו שני חשבונות (קבוצה/אישי). נשאר אחד: הקבוצה אם יש, אחרת האישי */
    if (!fs.existsSync(this.file)) {
      const t = path.join(dir, "account-team.json"), pr = path.join(dir, "account-personal.json");
      const has = f => { try { const o = readJSON(f, null); return !!(o && o.blob); } catch (e) { return false; } };
      try {
        if (has(t)) { fs.renameSync(t, this.file); if (has(pr)) { fs.renameSync(pr, pr.replace(/\.json$/, ".old.json")); this.migrated = "personal-dropped"; } }
        else if (has(pr)) fs.renameSync(pr, this.file);
      } catch (e) {}
    }
    /* 1.14 (legalfix): גרסת המסמכים המשפטיים (legal/VERSION) שהחשבון צריך לאשר; ריק = לא בודקים */
    this.tosNeed = typeof opt.tosNeed === "string" && TOSV.test(opt.tosNeed) ? opt.tosNeed : "";
    this.teamRpc = undefined;
    this.sess = null; this.busy = null; this.lastSync = 0; this.lastError = ""; this.lastResult = null; this.refreshing = null; this.viewerSwitched = false;
    this.teamFile = path.join(dir, "team-cache.json");
    this.team = readJSON(this.teamFile, null) || null;
    try { const o = readJSON(this.file, null); if (o && o.blob) this.sess = JSON.parse(this.dec(o.blob)); if (o) this.lastSync = o.lastSync || 0; } catch (e) { this.sess = null; }
    if (this.sess && !(this.sess.user && this.sess.user.id)) this.sess = null;
    this.sessAtBoot = !!this.sess;
    /* אסימון גלוי מגרסה קודמת, ועכשיו אין הצפנה — נשאר בזיכרון ונמחק מהדיסק */
    if (this.sess && !this.canPersist()) this.saveSess();
    if (this.store && this.store.setViewer) this.store.setViewer(this.uid() || null);
  }
  saveSess() {
    const o = { lastSync: this.lastSync };
    if (this.sess && this.canPersist()) { const b = this.enc(JSON.stringify(this.sess)); if (b) o.blob = b; }
    try { writeAtomic(this.file, JSON.stringify(o)); } catch (e) {}
  }
  /* נהגים של חשבון אחר במחשב הזה (לא מוצגים ולא עולים) */
  viewer(uid) { if (this.store && this.store.setViewer && this.store.setViewer(uid || null)) this.viewerSwitched = true; }
  uid() { return this.sess && this.sess.user && this.sess.user.id || ""; }
  status() {
    const t = this.team && this.team.team;
    return { kind: this.kind, loggedIn: !!this.sess, name: this.label(), parked: this.store && this.store.parked ? this.store.parked() : 0, persist: !!this.canPersist(), team: t ? { code: t.code, name: t.name, num: t.num, owner: t.owner === this.uid(), members: (this.team.members || []).length } : null, email: this.sess && this.sess.user && this.sess.user.email || "",
      lastSync: this.lastSync, lastError: this.lastError, busy: !!this.busy, cloud: !!this.cloud.url,
      tos: this.sess && this.sess.user && this.sess.user.tos_v || "",
      /* 1.14 (legalfix): גרסת המסמכים הנוכחית; כשהחשבון לא אישר אותה — הסנכרון והקבוצה מושהים (המחיקה וההורדה עובדות) */
      tosNeed: this.tosNeed || "", tosWait: this.tosWait(), age: this.sess && this.sess.user && this.sess.user.age || "" };
  }
  tosWait() { return !!(this.sess && this.tosNeed && (this.sess.user.tos_v || "") !== this.tosNeed); }
  /* ── רשת ── */
  async http(method, url, body, headers, timeoutMs) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs || 20000);
    try {
      const r = await fetch(url, { method, headers: Object.assign({ apikey: this.cloud.key, "Content-Type": "application/json" }, headers || {}),
        body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
      const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
      if (!r.ok) { const m = j && (j.msg || j.message || j.error_description || j.error) || ("HTTP " + r.status); const e = new Error(m); e.status = r.status; e.body = j; throw e; }
      return { data: j, headers: r.headers };
    } catch (e) { if (e.name === "AbortError") throw new Error("timeout"); throw e; }
    finally { clearTimeout(t); }
  }
  setSession(d) {
    const prev = this.uid();
    /* v63: התוקף לפי השעון של המחשב הזה (expires_in), לא לפי expires_at של השרת — שעון שזז לא מנתק */
    const ttl = +d.expires_in > 0 ? +d.expires_in : 3600;
    this.sess = { access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: Date.now() + ttl * 1000,
      user: { id: d.user && d.user.id, email: d.user && d.user.email, name: userName(d.user) || (this.sess && this.sess.user && this.sess.user.name) || "",
        tos_v: userTos(d.user) || (this.sess && this.sess.user && this.sess.user.tos_v) || "",
        age: userAge(d.user) || (this.sess && this.sess.user && this.sess.user.age) || "" } };
    this.saveSess();
    if (this.uid() !== prev) this.viewer(this.uid());
  }
  /* v63: רענון אחד בכל רגע (שתי בקשות במקביל לא שורפות את אסימון הרענון) */
  async token(force) {
    if (!this.sess) throw new Error("לא מחוברים");
    if (!force && Date.now() < this.sess.expires_at - 60000) return this.sess.access_token;
    if (!this.refreshing) this.refreshing = this._refresh().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async _refresh() {
    const s = this.sess;
    try {
      const { data } = await this.http("POST", this.cloud.url + "/auth/v1/token?grant_type=refresh_token", { refresh_token: s.refresh_token });
      if (this.sess !== s) throw new Error("לא מחוברים");
      this.setSession(data); return this.sess.access_token;
    } catch (e) {
      if ((e.status === 400 || e.status === 401) && this.sess === s) { this.sess = null; this.saveSess(); this.viewer(null); throw new Error("צריך להתחבר מחדש"); }
      throw e;
    }
  }
  /* בקשה עם אסימון; 401 = האסימון פג (למשל השעון זז) — רענון אחד ועוד ניסיון */
  async authed(method, url, body, headers, timeoutMs) {
    const go = tok => this.http(method, url, body, Object.assign({ Authorization: "Bearer " + tok }, headers || {}), timeoutMs);
    const tok = await this.token();
    try { return await go(tok); }
    catch (e) {
      if (e.status !== 401 || !this.sess) throw e;
      return go(await this.token(true));
    }
  }
  async rest(method, pathq, body, extraHeaders) {
    return this.authed(method, this.cloud.url + "/rest/v1/" + pathq, body, extraHeaders, 30000);
  }
  /* דיווח על באג — מותר רק להוסיף; מחובר = נרשם עם המשתמש, אחרת אנונימי */
  async bugSend(row) {
    const clean = {}; for (const k of ["what", "steps", "contact", "ver", "lang", "platform", "sys", "errors", "shot"]) if (row && row[k] != null) clean[k] = row[k];
    let auth = "Bearer " + this.cloud.key; try { if (this.sess) auth = "Bearer " + await this.token(); } catch (e) {}
    try { await this.http("POST", this.cloud.url + "/rest/v1/bb_bugs", clean, { Authorization: auth, Prefer: "return=minimal" }, 30000); return { ok: true }; }
    catch (e) { return { ok: false, why: e.message === "timeout" ? "אין תשובה מהשרת" : /fetch failed|ENOTFOUND|ECONN/.test(e.message) ? "אין חיבור לאינטרנט" : heb(e.message) }; }
  }
  /* ── חשבון ── */
  async signIn(email, password) {
    try {
      const { data } = await this.http("POST", this.cloud.url + "/auth/v1/token?grant_type=password", { email: String(email).trim(), password: String(password) });
      this.setSession(data); this.lastError = ""; return { ok: true, email: this.sess.user.email };
    } catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  /* 1.14 (v73 legal): בלי הסכמה לתנאים וטווח גיל (13+, ומתחת ל-18 עם הורה) — אין חשבון. ההסכמה נשמרת בחשבון (user_metadata) */
  async signUp(email, password, meta) {
    const m = signupMeta(meta);
    if (!m.data) return { ok: false, why: m.why };
    try {
      const { data } = await this.http("POST", this.cloud.url + "/auth/v1/signup?redirect_to=" + encodeURIComponent(SITE), { email: String(email).trim(), password: String(password), data: m.data });
      if (data && data.access_token) { this.setSession(data); return { ok: true, email: this.sess.user.email }; }
      return { ok: true, confirm: true };
    } catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  async recover(email) {
    try { await this.http("POST", this.cloud.url + "/auth/v1/recover?redirect_to=" + encodeURIComponent(SITE), { email: String(email).trim() }); return { ok: true }; }
    catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  async signOut() {
    this.team = null; this.saveTeam();
    try { if (this.sess) await this.http("POST", this.cloud.url + "/auth/v1/logout", {}, { Authorization: "Bearer " + this.sess.access_token }, 8000); } catch (e) {}
    this.sess = null; this.lastSync = 0; this.saveSess(); this.viewer(null); return { ok: true };
  }
  /* ── סנכרון ── */
  syncNow() {
    if (!this.sess) return Promise.resolve({ ok: false, why: "לא מחוברים" });
    if (this.busy) return this.busy;
    this.busy = this._sync().then(r => { this.lastError = ""; this.lastSync = Date.now(); this.saveSess(); this.lastResult = r; return r; },
      e => { this.lastError = heb(e.message); return e.needTos ? { ok: false, why: this.lastError, needTos: true } : { ok: false, why: this.lastError }; })
      .finally(() => { this.busy = null; });
    return this.busy;
  }
  async remoteAll(table, select, filter) {
    const out = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data } = await this.rest("GET", table + "?select=" + select + (filter ? "&" + filter : "") + "&order=" + (table === "bb_matches" ? "at" : "id"),
        undefined, { "Range-Unit": "items", Range: from + "-" + (from + page - 1) });
      if (!Array.isArray(data)) break;            /* 1.12.4: תשובה שאינה מערך — לולאה אינסופית */
      out.push.apply(out, data);
      if (data.length < page || from > 2e6) break;
    }
    return out;
  }
  /* v63: רק נהגים של החשבון המחובר (לא מקומיים, ולא של חשבון אחר שהתחבר קודם במחשב הזה) */
  mine(p) { return !!p && !p.local && !!p.owner && p.owner === this.uid(); }
  own() { return "owner=eq." + encodeURIComponent(this.uid()); }
  async _sync() {
    const S = this.store; S.flushKv(); const K = this.kind; const uid = this.uid();
    const res = { ok: true, changedActive: false, profilesChanged: false, pushedMatches: 0, pulledMatches: 0, pushedProfiles: 0, pulledProfiles: 0, skipped: [] };
    if (this.viewerSwitched) { this.viewerSwitched = false; res.changedActive = true; }
    const activeBefore = S.meta.active;
    try { await this.namePull(await this.myTeamLabel()); } catch (e) {}
    /* 1.14 (legalfix): תנאים מעודכנים שהחשבון עוד לא אישר — שום דבר לא עולה ולא יורד עד שמאשרים (מקומית הכול ממשיך) */
    if (this.tosWait()) { const e = new Error(TOS_WAIT); e.needTos = true; throw e; }
    const rows = (await this.remoteAll("bb_profiles", "id,name,emoji,color,created,meta_at,kv_at,deleted", this.own())).filter(r => r && validId(r.id));
    const R = new Map(rows.map(r => [r.id, r]));
    if (this.uid() !== uid) throw new Error("לא מחוברים");
    /* v63: של מי הנהגים. במחשב שעוד לא התחבר אליו אף חשבון (או שהחשבון הזה כבר היה מחובר בו כשעדכנו) — כל הנהגים הם של החשבון.
       אחרת — רק נהג שכבר קיים בחשבון הזה, או שנוצר בזמן שהחשבון הזה מחובר. */
    const claimAll = !S.meta.acctSeen && (this.sessAtBoot || !this.hadAcct);
    let claimed = false;
    for (const p of S.meta.list) if (!p.local && !p.owner && (claimAll || R.has(p.id))) { p.owner = uid; claimed = true; }
    for (const t of S.meta.tombs) if (!t.owner && claimAll) { t.owner = uid; claimed = true; }
    if (!S.meta.acctSeen || claimed) { S.meta.acctSeen = true; S.saveMeta(); }
    /* התקנה חדשה עם נהג ריק אחד, מול חשבון עם נהגים — הנהג הריק מפנה את מקומו */
    const live = rows.filter(r => !r.deleted);
    const vis = S.vis();
    if (live.length && vis.length === 1 && this.mine(vis[0]) && !R.has(vis[0].id) && S.isBlank(vis[0].id)) {
      const blank = vis[0].id;
      S.applyRemoteMeta(live[0], K); S.meta.active = live[0].id; S.saveMeta();
      S.removeProfile(blank, { noTomb: true }); S.loadKv(); res.profilesChanged = true;
    }
    /* מחיקות מקומיות → לענן (רק של החשבון הזה; של חשבון אחר מחכות לו) */
    for (const t of S.meta.tombs.slice()) {
      if (t.owner && t.owner !== uid) continue;
      const r = R.get(t.id);
      /* 1.12.5: נהג שלא הגיע לענן אף פעם — אין מה למחוק שם (ושורת מחיקה הייתה נספרת בתקרת הנהגים).
         מחיקה שהשרת דוחה — לא תוקעת את כל הסנכרון */
      if (t.owner && r && !r.deleted) {
        try { await this.rest("POST", "bb_profiles?on_conflict=owner,id", [{ id: t.id, deleted: true, kv: {}, meta_at: t.at, kv_at: t.at, name: "" }],
          { Prefer: "resolution=merge-duplicates,return=minimal" }); r.deleted = true; }
        catch (e) { if (!rejected(e)) throw e; res.skipped.push({ id: t.id, why: "tomb: " + String(e.message || e.status).slice(0, 100) }); }
      }
      S.meta.tombs = S.meta.tombs.filter(x => x.id !== t.id);
    }
    S.saveMeta();
    /* מחיקות מהענן → כאן */
    for (const r of rows) if (r.deleted) { if (S.meta.list.some(p => p.id === r.id && this.mine(p))) { if (S.removeFromRemote(r.id)) res.profilesChanged = true; } }
    /* נהגים שיש רק בענן → כאן */
    for (const r of live) if (!S.meta.list.some(p => p.id === r.id)) { if (S.applyRemoteMeta(r, K)) { res.profilesChanged = true; res.pulledProfiles++; } }
    /* השוואה אחד מול אחד. ההגדרות — איחוד לפי מפתח (v63) */
    const push = [];
    for (const p of S.meta.list.filter(q => this.mine(q))) {
      const r = R.get(p.id);
      if (r && r.deleted) continue;
      const pm = p.metaAt || 0, rm = r ? r.meta_at || 0 : -1, rk = r ? +r.kv_at || 0 : -1;
      if (r && rm > pm) { S.applyRemoteMeta(r, K); res.profilesChanged = true; }
      let kvPush = !r;
      if (r && rk > 0 && rk !== (p.kvSeen || 0)) {
        const { data } = await this.rest("GET", "bb_profiles?select=kv,kv_at&" + this.own() + "&id=eq." + encodeURIComponent(p.id));
        const q = S.meta.list.find(x => x.id === p.id);
        if (q && data && data[0]) {
          const at = +data[0].kv_at || rk;
          const m = S.mergeRemoteKv(p.id, data[0].kv || {}, at);
          q.kvSeen = at;
          if (m.changed) { if (p.id === S.meta.active) res.changedActive = true; res.pulledProfiles++; }
          if (m.needPush) kvPush = true;
        }
      }
      const q = S.meta.list.find(x => x.id === p.id); if (!q) continue;
      if ((q.kvAt || 0) > (q.kvDone || 0)) kvPush = true;
      const pushMeta = !r || pm > rm;
      if (pushMeta || kvPush) {
        const row = { id: q.id, name: cut(q.name, 60) || "נהג", emoji: cut(q.emoji, 16), color: cleanColor(q.color), created: isFinite(q.created) && q.created > 0 && q.created < AT_MAX ? Math.round(q.created) : null,
          meta_at: isFinite(q.metaAt) && q.metaAt >= 0 && q.metaAt < AT_MAX ? Math.round(q.metaAt) : 0, deleted: false };
        let done = null;
        if (kvPush) {
          const at = Math.max(Date.now(), rk + 1); done = q.kvAt || 0;
          row.kv = S.kvSynced(q.id); row.kv[KVAT] = JSON.stringify({ k: at, t: S.katSynced(q.id) }); row.kv_at = at;
          if (Buffer.byteLength(JSON.stringify(row.kv)) > KV_MAX) { res.skipped.push({ id: q.id, why: "kv-size" }); delete row.kv; row.kv_at = r ? r.kv_at : 0; done = null; if (!pushMeta) continue; }
        } else { row.kv_at = r.kv_at; }
        push.push({ row, done });
      }
    }
    S.saveMeta();
    /* שורה אחת לכל נהג (שורות בלי kv לא יכולות להיות באותה בקשה עם שורות עם kv) */
    for (const { row, done } of push) {
      try { await this.rest("POST", "bb_profiles?on_conflict=owner,id", [row], { Prefer: "resolution=merge-duplicates,return=minimal" }); }
      catch (e) { if (!rejected(e)) throw e; res.skipped.push({ id: row.id, why: String(e.message || e.status).slice(0, 120) }); continue; }
      const q = S.meta.list.find(x => x.id === row.id);
      if (q && row.kv) { q.kvSeen = row.kv_at; q.kvDone = Math.max(q.kvDone || 0, done); }
      res.pushedProfiles++;
    }
    S.saveMeta();
    /* מאצ׳ים — איחוד */
    const remoteM = await this.remoteAll("bb_matches", "profile_id,at", this.own());
    const rset = new Map();
    for (const m of remoteM) { if (!validId(m.profile_id)) continue; if (!rset.has(m.profile_id)) rset.set(m.profile_id, new Set()); rset.get(m.profile_id).add(+m.at); }
    /* 1.14 (legalfix): נהג שנמחק (כאן או במחשב אחר) — גם המאצ׳ים שלו נמחקים מהענן. נשארת רק המצבה (מזהה + זמן, בלי שם) */
    res.deletedMatches = 0;
    for (const [pid, ats] of rset) {
      const pr = R.get(pid); if (!pr || !pr.deleted || !ats.size) continue;
      try { await this.rest("DELETE", "bb_matches?" + this.own() + "&profile_id=eq." + encodeURIComponent(pid), undefined, { Prefer: "return=minimal" }); res.deletedMatches += ats.size; rset.delete(pid); }
      catch (e) { if (!rejected(e)) throw e; res.skipped.push({ id: pid, why: "del-matches: " + String(e.message || e.status).slice(0, 100) }); }
    }
    let quota = false;
    for (const p of S.meta.list.filter(q => this.mine(q))) {
      /* 1.12.5: נהג שנמחק בענן — המאצ׳ים שלו לא עולים */
      const pr = R.get(p.id); if (pr && pr.deleted) continue;
      const local = S.matches(p.id); const lset = new Set(local.map(m => Math.round(+m.at)));
      const rs = rset.get(p.id) || new Set();
      const up = [];
      for (const m of local) { if (!isFinite(m.at) || rs.has(Math.round(+m.at))) continue;
        const d = matchOk(m) ? matchData(m) : null;
        if (d) up.push({ profile_id: p.id, at: Math.round(+m.at), data: d }); else res.skipped.push({ id: p.id, at: m.at, why: "match" }); }
      const post = rows => this.rest("POST", "bb_matches?on_conflict=owner,profile_id,at", rows, { Prefer: "resolution=ignore-duplicates,return=minimal" });
      for (let i = 0; i < up.length && !quota; i += 200) {
        const chunk = up.slice(i, i + 200);
        try { await post(chunk); res.pushedMatches += chunk.length; }
        catch (e) {
          if (!rejected(e)) throw e;
          /* 1.12.5: החשבון הגיע לתקרת האחסון (v72_security.sql) — לא מנסים אחד־אחד; מה שלא עלה נשאר מקומי */
          if (QUOTA.test(String(e.message))) { quota = true; res.quota = true; res.skipped.push({ id: p.id, why: "quota" }); break; }
          /* חבילה נדחתה — אחד־אחד, ומה שנדחה נשאר מקומי בלי לעצור את השאר */
          for (const row of chunk) {
            try { await post([row]); res.pushedMatches++; }
            catch (e2) { if (!rejected(e2)) throw e2;
              if (QUOTA.test(String(e2.message))) { quota = true; res.quota = true; res.skipped.push({ id: p.id, why: "quota" }); break; }
              res.skipped.push({ id: p.id, at: row.at, why: String(e2.message || e2.status).slice(0, 120) }); }
          }
        }
      }
      const down = [...rs].filter(a => isFinite(a) && !lset.has(a));
      for (let i = 0; i < down.length; i += 100) {
        const ats = down.slice(i, i + 100);
        const { data } = await this.rest("GET", "bb_matches?select=at,data&" + this.own() + "&profile_id=eq." + encodeURIComponent(p.id) + "&at=in.(" + ats.join(",") + ")");
        const got = (data || []).map(x => x.data).filter(m => m && typeof m === "object" && isFinite(m.at)).sort((a, b) => a.at - b.at);
        res.pulledMatches += S.appendMatches(p.id, got);
      }
    }
    if (S.meta.active !== activeBefore) res.changedActive = true;
    try { res.team = await this.teamPull(); } catch (e) { res.teamError = heb(e.message); }
    return res;
  }
  /* ── קבוצה: קוד הצטרפות, חברים, ומה שהחברים שיחקו (קריאה בלבד) ── */
  async rpc(fn, args) { const { data } = await this.rest("POST", "rpc/" + fn, args || {}); return data; }
  saveTeam() { if (this.team) writeAtomic(this.teamFile, JSON.stringify(this.team)); else { try { fs.unlinkSync(this.teamFile); } catch (e) {} } }
  /* שם החשבון — אחד לכל חשבון, שמור בשרת. לא תלוי בנהג הפעיל (עד v59 היה, ולכן כל מחשב הציג שם אחר) */
  label() { const u = this.sess && this.sess.user || {}; return u.name || String(u.email || "").split("@")[0]; }
  /* מושך את השם מהשרת; אם עוד אין (חשבון מלפני v60) — קובע פעם אחת: השם שכבר מופיע בקבוצה, אחרת הנהג הפעיל, אחרת תחילת המייל */
  async namePull(teamLabel) {
    if (!this.sess) return "";
    const { data } = await this.authed("GET", this.cloud.url + "/auth/v1/user", undefined, {});
    let n = userName(data);
    { const tv = userTos(data), ag = userAge(data); if (tv !== (this.sess.user.tos_v || "") || ag !== (this.sess.user.age || "")) { this.sess.user.tos_v = tv; this.sess.user.age = ag; this.saveSess(); } }   /* 1.14 */
    if (!n) {
      const a = this.store.meta.list.find(p => p.id === this.store.meta.active);
      n = String(teamLabel || (a && !/^נהג( \d+)?$/.test(a.name || "") && a.name) || "").trim().slice(0, 40) || String(this.sess.user.email || "").split("@")[0];
      try { await this.nameSet(n, true); } catch (e) {}
    }
    if (n && this.sess.user.name !== n) { this.sess.user.name = n; this.saveSess(); }
    return n;
  }
  async nameSet(n, quiet) {
    if (!this.sess) return { ok: false, why: "לא מחוברים" };
    n = String(n || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!n) return { ok: false, why: "צריך שם" };
    try {
      await this.authed("PUT", this.cloud.url + "/auth/v1/user", { data: { name: n } }, {});
      this.sess.user.name = n; this.saveSess();
      if (this.team && this.team.members) { try { await this.rpc("bb_team_label", { p_label: n }); this.team.members.forEach(x => { if (x.me) x.label = n; }); this.saveTeam(); } catch (e) {} }
      return { ok: true, name: n };
    } catch (e) { if (quiet) throw e; return { ok: false, why: heb(e.message) }; }
  }
  /* ── 1.14 (v73 legal): זכויות על הנתונים ── */
  /* אישור תנאים מעודכנים — לחשבון קיים. 1.14 (legalfix): עד שמאשרים הסנכרון מושהה.
     חשבון בלי טווח גיל (מלפני 1.14) עונה עכשיו גם על הגיל: מתחת ל-13 — אין חשבון; 13–17 — עם הסכמת הורה */
  async tosAccept(v, meta) {
    if (!this.sess) return { ok: false, why: "לא מחוברים" };
    v = String(v || ""); if (!TOSV.test(v)) return { ok: false, why: "?" };
    const data = { tos_v: v, tos_at: new Date().toISOString() };
    if (!this.sess.user.age) {
      const m = signupMeta(Object.assign({}, meta && typeof meta === "object" ? meta : {}, { tos_v: v }));
      if (!m.data) return { ok: false, needAge: true, u13: !!(meta && meta.age_bracket === "u13"), why: meta && meta.age_bracket ? m.why : "בחרו את טווח הגיל" };
      data.age_bracket = m.data.age_bracket; data.guardian_ok = m.data.guardian_ok;
    }
    try {
      await this.authed("PUT", this.cloud.url + "/auth/v1/user", { data }, {});
      this.sess.user.tos_v = v; if (data.age_bracket) this.sess.user.age = data.age_bracket; this.saveSess(); return { ok: true, tos: v };
    } catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  /* כל מה ששמור עליי בענן, כ-JSON: החשבון, הנהגים (עם ההגדרות), המאצ׳ים, והחברות בקבוצה */
  async exportMine() {
    if (!this.sess) return { ok: false, why: "לא מחוברים" };
    try {
      const uid = this.uid();
      const { data: user } = await this.authed("GET", this.cloud.url + "/auth/v1/user", undefined, {});
      const profiles = await this.remoteAll("bb_profiles", "*", this.own());
      const matches = await this.remoteAll("bb_matches", "*", this.own());
      const { data: mem } = await this.rest("GET", "bb_team_members?select=*&uid=eq." + encodeURIComponent(uid));
      let team = null;
      if (Array.isArray(mem) && mem[0] && /^[0-9a-f-]{36}$/i.test(String(mem[0].team_id))) {
        const { data: tt } = await this.rest("GET", "bb_teams?select=id,code,name,num,owner,created_at&id=eq." + mem[0].team_id);
        team = Array.isArray(tt) && tt[0] || null;
      }
      const u = user && typeof user === "object" ? user : {}, md = u.user_metadata && typeof u.user_metadata === "object" ? u.user_metadata : {};
      /* 1.14 (legalfix): הדיווחים שלי — דרך bb_my_bugs() (את bb_bugs אי אפשר לקרוא ישירות). בלי הפונקציה בשרת — הערה במקום */
      let bugs = null, bugsNote = "";
      try { const b = await this.rpc("bb_my_bugs"); bugs = Array.isArray(b) ? b : []; }
      catch (e) { if (!noFn(e)) throw e; bugsNote = "bug reports are not available for download yet (server update pending) — ask us on GitHub"; }
      return { ok: true, data: { app: "BIOBUZZ", kind: "cloud-export", exported_at: new Date().toISOString(),
        account: { id: u.id || uid, email: u.email || this.sess.user.email || "", name: typeof md.name === "string" ? md.name : "",
          created_at: u.created_at || null, last_sign_in_at: u.last_sign_in_at || null,
          age_bracket: md.age_bracket || null, guardian_ok: md.guardian_ok == null ? null : md.guardian_ok, tos_v: md.tos_v || null, tos_at: md.tos_at || null,
          user_metadata: md },
        profiles, matches, team: { membership: Array.isArray(mem) ? mem : [], team }, bug_reports: bugs, ...(bugsNote ? { bug_reports_note: bugsNote } : {}) } };
    } catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  /* מחיקת החשבון וכל הנתונים בענן (bb_delete_me — supabase/v73_privacy.sql), ואז התנתקות במחשב הזה */
  async deleteMe() {
    if (!this.sess) return { ok: false, why: "לא מחוברים" };
    const uid = this.uid();
    try { await this.rpc("bb_delete_me"); }
    catch (e) {
      const m = String(e.message || "") + " " + JSON.stringify(e.body || "");
      /* הפונקציה עוד לא קיימת בשרת (v73_privacy.sql לא הורץ) */
      if (noFn(e) || /bb_delete_me/i.test(m))
        return { ok: false, missing: true, why: "מחיקה אוטומטית עוד לא זמינה בשרת — כתבו לנו בגיטהאב ונמחק את החשבון ידנית", contact: "https://github.com/yaarilevrosen-cpu/BIOBUZZ/issues" };
      return { ok: false, why: heb(e.message) };
    }
    /* המשתמש כבר לא קיים בשרת — לא צריך /logout; מנקים כאן */
    this.team = null; this.saveTeam();
    this.sess = null; this.lastSync = 0; this.saveSess(); this.viewer(null);
    return { ok: true, uid };
  }
  async teamCall(what, a, b) {
    if (!this.sess) return { ok: false, why: "צריך להתחבר לחשבון קודם" };
    if (this.tosWait()) return { ok: false, needTos: true, why: TOS_WAIT };   /* 1.14 (legalfix) */
    try {
      if (what === "create") await this.rpc("bb_team_create", { p_name: a || "", p_num: b || "", p_label: this.label() });
      else if (what === "join") {
        /* v63: קוד שגוי מחזיר null (כדי שהשרת יספור ניסיונות), ולא שגיאה */
        const t = await this.rpc("bb_team_join", { p_code: String(a || "").trim().toUpperCase(), p_label: this.label() });
        if (!t || (Array.isArray(t) && !t.length) || (typeof t === "object" && !Array.isArray(t) && !t.id)) return { ok: false, why: "אין קבוצה עם הקוד הזה — בדקו שוב" };
      }
      else if (what === "leave") await this.rpc("bb_team_leave");
      else if (what === "update") await this.rpc("bb_team_update", { p_name: a || "", p_num: b || "" });
      /* v63: רק מי שפתח את הקבוצה — הוצאת חבר והחלפת קוד */
      else if (what === "kick") await this.rpc("bb_team_kick", { p_uid: String(a || "") });
      else if (what === "rotate") await this.rpc("bb_team_rotate_code");
      else return { ok: false, why: "?" };
      /* 1.12.5: שינוי שם / קוד חדש לא זורקים את היסטוריית המאצ׳ים של החברים (3000 → 500) — רק הצטרפות/יצירה/יציאה/הוצאה */
      if (what === "create" || what === "join" || what === "leave" || what === "kick") { this.team = null; this.saveTeam(); }
      await this.teamPull();
      return { ok: true, team: this.status().team };
    } catch (e) {
      const m = String(e.message || "");
      return { ok: false, why: /code not found/.test(m) ? "אין קבוצה עם הקוד הזה — בדקו שוב"
        : /too many/.test(m) ? "יותר מדי ניסיונות עם קוד שגוי — נסו שוב בעוד שעה"
        : /only the team owner|not the owner/.test(m) ? "רק מי שפתח את הקבוצה יכול לעשות את זה"
        : /bb quota/i.test(m) ? "החשבון הגיע לתקרת האחסון בענן" : heb(m) };
    }
  }
  async myTeamLabel() {
    if (this.sess && this.sess.user && this.sess.user.name) return "";
    try { const { data } = await this.rest("GET", "bb_team_members?select=label&uid=eq." + encodeURIComponent(this.uid())); return data && data[0] && data[0].label || ""; } catch (e) { return ""; }
  }
  async teamPull() {
    if (!this.sess) return null;
    const me = this.uid();
    const { data: mem } = await this.rest("GET", "bb_team_members?select=team_id,uid,label");
    if (!mem || !mem.length) { if (this.team) { this.team = null; this.saveTeam(); } return null; }
    const tid = mem[0].team_id;
    const { data: tt } = await this.rest("GET", "bb_teams?select=id,code,name,num,owner&id=eq." + tid);
    if (!this.team || this.team.id !== tid) this.team = { id: tid, profiles: {}, matches: {}, since: "" };
    const T = this.team; T.team = tt && tt[0] || null; T.members = mem.map(m => ({ uid: m.uid, label: m.label, me: m.uid === me }));
    /* השם שלי בקבוצה = שם החשבון (אחד בכל המחשבים) */
    const mine = mem.find(m => m.uid === me), want = String(this.label() || "").slice(0, 40);
    if (mine && want && mine.label !== want) { try { await this.rpc("bb_team_label", { p_label: want }); mine.label = want; T.members.forEach(x => { if (x.me) x.label = want; }); } catch (e) {} }
    const others = mem.filter(m => m.uid !== me).map(m => m.uid).filter(u => /^[0-9a-f-]{36}$/i.test(String(u)));
    const alive = new Set(others);
    for (const k of Object.keys(T.profiles)) if (!alive.has(T.profiles[k].owner)) { delete T.profiles[k]; delete T.matches[k]; }
    /* v63: ״מאיפה להמשיך״ לכל חבר בנפרד — חבר חדש מקבל את כל ההיסטוריה שלו */
    if (!T.sinceBy || typeof T.sinceBy !== "object") T.sinceBy = {};
    delete T.since;
    for (const k of Object.keys(T.sinceBy)) if (!alive.has(k)) delete T.sinceBy[k];
    if (others.length) {
      /* 1.14 (legalfix): דרך הפונקציות של v73_privacy.sql (רק שם/סמל/צבע ושדות הסיכום). שרת בלי הפונקציות — השאילתות הישנות */
      let profs = null; this.teamRpc = false;
      try { const d = await this.rpc("bb_team_profiles"); if (Array.isArray(d)) { profs = d.filter(r => r && alive.has(r.owner)); this.teamRpc = true; } }
      catch (e) { if (!noFn(e)) throw e; }
      if (!profs) profs = await this.remoteAll("bb_profiles", "owner,id,name,emoji,color,deleted", "owner=in.(" + others.join(",") + ")");
      for (const r of profs) if (r && validId(r.id)) T.profiles[r.owner + "/" + r.id] = r;
      let pulled = 0;
      /* 1.12.4: רק שדות הסיכום (לא כל המאץ׳ עם sh/bl), עד TEAM_PAGE לכל חבר בכל סנכרון, ותקרה לכל נהג —
         חבר עם הרבה מאצ׳ים גדולים לא ממלא את הזיכרון והדיסק של כולם */
      const sel = "owner,profile_id,at,created_at," + TEAM_FIELDS.map(f => f + ":data->" + f).join(",");
      const num = v => (typeof v === "number" && isFinite(v) ? v : typeof v === "boolean" ? v : typeof v === "string" && /^[a-z]{1,12}$/.test(v) ? v : null);   /* 1.13: kind/drill — מילה קצרה בלבד */
      for (const u of others) {
        const since = T.sinceBy[u] || "";
        const { data: ms } = this.teamRpc ? { data: await this.rpc("bb_team_matches", { p_owner: u, p_since: since || null, p_limit: TEAM_PAGE }) }
          : await this.rest("GET", "bb_matches?select=" + sel + "&owner=eq." + u + (since ? "&created_at=gte." + encodeURIComponent(since) : "") + "&order=created_at.asc&limit=" + TEAM_PAGE);
        for (const m of Array.isArray(ms) ? ms : []) {
          if (!m || !validId(m.profile_id) || !isFinite(m.at)) continue;
          const k = m.owner + "/" + m.profile_id; if (!T.profiles[k]) continue;
          const l = T.matches[k] || (T.matches[k] = []);
          if (!l.some(x => +x.at === +m.at)) { const o = { at: +m.at }; for (const f of TEAM_FIELDS) { const v = num(m[f]); if (v != null) o[f] = v; } l.push(o); pulled++; }
          if (typeof m.created_at === "string" && m.created_at.length < 40 && (!T.sinceBy[u] || m.created_at > T.sinceBy[u])) T.sinceBy[u] = m.created_at;
        }
      }
      /* מטמון ישן (לפני 1.12.4) עם מאצ׳ים מלאים — מצמצמים לשדות הסיכום */
      for (const k in T.matches) { let l = T.matches[k]; if (!Array.isArray(l)) { delete T.matches[k]; continue; }
        if (l.length > 3000) l = l.slice(-3000);
        T.matches[k] = l.filter(x => x && isFinite(x.at)).map(x => { const o = { at: +x.at }; for (const f of TEAM_FIELDS) { const v = num(x[f]); if (v != null) o[f] = v; } return o; }); }
      T.pulled = pulled;
    }
    this.saveTeam();
    return { members: T.members.length, pulled: T.pulled || 0 };
  }
}
module.exports = { Sync, DEFAULT_CLOUD, heb, signupMeta, TEAM_FIELDS };
