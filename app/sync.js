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
const { writeAtomic, readJSON } = require("./store");

const DEFAULT_CLOUD = {
  url: "https://somhwsjbhanyxzrxkyer.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbWh3c2piaGFueXh6cnhreWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MzAyNjUsImV4cCI6MjEwNjAwNjI2NX0.xwEQUo_RXVyMJ9_UJ7FJzKq5CHMIN5EuLM25UEaFIiE"
};
const HEB = {
  "Invalid login credentials": "המייל או הסיסמה לא נכונים",
  "Email not confirmed": "צריך לאשר את המייל קודם — חפשו מייל מ-Supabase (גם בספאם)",
  "User already registered": "כבר יש חשבון עם המייל הזה — התחברו",
  "Password should be at least 6 characters.": "הסיסמה צריכה להיות לפחות 6 תווים",
  "Unable to validate email address: invalid format": "כתובת המייל לא תקינה"
};
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
    /* שני סוגי חשבון יכולים לעבוד במקביל: ״team״ — כל נהגי הקבוצה; ״personal״ — רק הנהגים שסימנת כאישיים */
    this.kind = opt.kind === "personal" ? "personal" : "team";
    this.cloud = Object.assign({}, DEFAULT_CLOUD, readJSON(path.join(dir, "cloud.json"), {}) || {}, opt.cloud || {});
    this.enc = opt.enc || (s => Buffer.from(s, "utf8").toString("base64"));
    this.dec = opt.dec || (s => Buffer.from(s, "base64").toString("utf8"));
    this.file = path.join(dir, "account-" + this.kind + ".json");
    /* גרסה 1.1.0 שמרה חשבון אחד ב-account.json — הוא חשבון הקבוצה */
    if (this.kind === "team" && !fs.existsSync(this.file) && fs.existsSync(path.join(dir, "account.json"))) { try { fs.renameSync(path.join(dir, "account.json"), this.file); } catch (e) {} }
    this.sess = null; this.busy = null; this.lastSync = 0; this.lastError = ""; this.lastResult = null;
    try { const o = readJSON(this.file, null); if (o && o.blob) this.sess = JSON.parse(this.dec(o.blob)); if (o) this.lastSync = o.lastSync || 0; } catch (e) { this.sess = null; }
  }
  saveSess() {
    const o = { lastSync: this.lastSync };
    if (this.sess) o.blob = this.enc(JSON.stringify(this.sess));
    writeAtomic(this.file, JSON.stringify(o));
  }
  status() {
    return { kind: this.kind, loggedIn: !!this.sess, email: this.sess && this.sess.user && this.sess.user.email || "",
      lastSync: this.lastSync, lastError: this.lastError, busy: !!this.busy, cloud: !!this.cloud.url };
  }
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
    this.sess = { access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
      user: { id: d.user && d.user.id, email: d.user && d.user.email } };
    this.saveSess();
  }
  async token() {
    if (!this.sess) throw new Error("לא מחוברים");
    if (Date.now() < this.sess.expires_at - 60000) return this.sess.access_token;
    try {
      const { data } = await this.http("POST", this.cloud.url + "/auth/v1/token?grant_type=refresh_token", { refresh_token: this.sess.refresh_token });
      this.setSession(data); return this.sess.access_token;
    } catch (e) {
      if (e.status === 400 || e.status === 401) { this.sess = null; this.saveSess(); throw new Error("צריך להתחבר מחדש"); }
      throw e;
    }
  }
  async rest(method, pathq, body, extraHeaders) {
    const tok = await this.token();
    return this.http(method, this.cloud.url + "/rest/v1/" + pathq, body, Object.assign({ Authorization: "Bearer " + tok }, extraHeaders || {}), 30000);
  }
  /* ── חשבון ── */
  async signIn(email, password) {
    try {
      const { data } = await this.http("POST", this.cloud.url + "/auth/v1/token?grant_type=password", { email: String(email).trim(), password: String(password) });
      this.setSession(data); this.lastError = ""; return { ok: true, email: this.sess.user.email };
    } catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  async signUp(email, password) {
    try {
      const { data } = await this.http("POST", this.cloud.url + "/auth/v1/signup", { email: String(email).trim(), password: String(password) });
      if (data && data.access_token) { this.setSession(data); return { ok: true, email: this.sess.user.email }; }
      return { ok: true, confirm: true };
    } catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  async recover(email) {
    try { await this.http("POST", this.cloud.url + "/auth/v1/recover", { email: String(email).trim() }); return { ok: true }; }
    catch (e) { return { ok: false, why: heb(e.message) }; }
  }
  async signOut() {
    try { if (this.sess) await this.http("POST", this.cloud.url + "/auth/v1/logout", {}, { Authorization: "Bearer " + this.sess.access_token }, 8000); } catch (e) {}
    this.sess = null; this.lastSync = 0; this.saveSess(); return { ok: true };
  }
  /* ── סנכרון ── */
  syncNow() {
    if (!this.sess) return Promise.resolve({ ok: false, why: "לא מחוברים" });
    if (this.busy) return this.busy;
    this.busy = this._sync().then(r => { this.lastError = ""; this.lastSync = Date.now(); this.saveSess(); this.lastResult = r; return r; },
      e => { this.lastError = heb(e.message); return { ok: false, why: this.lastError }; })
      .finally(() => { this.busy = null; });
    return this.busy;
  }
  async remoteAll(table, select, filter) {
    const out = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data } = await this.rest("GET", table + "?select=" + select + (filter ? "&" + filter : "") + "&order=" + (table === "bb_matches" ? "at" : "id"),
        undefined, { "Range-Unit": "items", Range: from + "-" + (from + page - 1) });
      out.push.apply(out, data || []);
      if (!data || data.length < page) break;
    }
    return out;
  }
  mine(p) { return (p.acct || "team") === this.kind; }
  async _sync() {
    const S = this.store; S.flushKv(); const K = this.kind;
    const res = { ok: true, changedActive: false, profilesChanged: false, pushedMatches: 0, pulledMatches: 0, pushedProfiles: 0, pulledProfiles: 0 };
    const activeBefore = S.meta.active;
    const rows = await this.remoteAll("bb_profiles", "id,name,emoji,color,created,meta_at,kv_at,deleted");
    const R = new Map(rows.map(r => [r.id, r]));
    /* התקנה חדשה עם נהג ריק אחד, מול חשבון עם נהגים — הנהג הריק מפנה את מקומו */
    const live = rows.filter(r => !r.deleted);
    if (live.length && S.meta.list.length === 1 && !R.has(S.meta.list[0].id) && S.isBlank(S.meta.list[0].id)) {
      const blank = S.meta.list[0].id;
      S.applyRemoteMeta(live[0], K); S.meta.active = live[0].id; S.saveMeta();
      S.removeProfile(blank, { noTomb: true }); S.loadKv(); res.profilesChanged = true;
    }
    /* מחיקות מקומיות → לענן */
    for (const t of S.meta.tombs.filter(t => (t.acct || "team") === K)) {
      const r = R.get(t.id);
      if (!r || !r.deleted) await this.rest("POST", "bb_profiles?on_conflict=owner,id", [{ id: t.id, deleted: true, kv: {}, meta_at: t.at, kv_at: t.at, name: "" }],
        { Prefer: "resolution=merge-duplicates,return=minimal" });
      S.meta.tombs = S.meta.tombs.filter(x => !(x.id === t.id && (x.acct || "team") === K));
    }
    S.saveMeta();
    const tombIds = new Set();
    /* מחיקות מהענן → כאן */
    for (const r of rows) if (r.deleted) { tombIds.add(r.id); if (S.meta.list.some(p => p.id === r.id && this.mine(p))) { if (S.removeFromRemote(r.id)) res.profilesChanged = true; } }
    /* נהגים שיש רק בענן → כאן */
    for (const r of live) if (!S.meta.list.some(p => p.id === r.id)) { S.applyRemoteMeta(r, K); res.profilesChanged = true; res.pulledProfiles++; }
    /* השוואה אחד מול אחד */
    const push = [];
    for (const p of S.meta.list.filter(q => this.mine(q))) {
      const r = R.get(p.id);
      if (r && r.deleted) continue;
      const pm = p.metaAt || 0, pk = p.kvAt || 0, rm = r ? r.meta_at || 0 : -1, rk = r ? r.kv_at || 0 : -1;
      if (r && rm > pm) { S.applyRemoteMeta(r, K); res.profilesChanged = true; }
      if (r && rk > pk) {
        const { data } = await this.rest("GET", "bb_profiles?select=kv,kv_at&id=eq." + encodeURIComponent(p.id));
        if (data && data[0]) { S.applyRemoteKv(p.id, data[0].kv || {}, data[0].kv_at || rk); if (p.id === S.meta.active) res.changedActive = true; res.pulledProfiles++; }
      }
      const pushMeta = !r || pm > rm, pushKv = !r || pk > rk;
      if (pushMeta || pushKv) {
        const q = S.meta.list.find(x => x.id === p.id);
        const row = { id: q.id, name: q.name, emoji: q.emoji || null, color: q.color || null, created: q.created || null, meta_at: q.metaAt || 0, deleted: false };
        if (pushKv) { row.kv = S.kvSynced(q.id); row.kv_at = q.kvAt || 0; }
        else { row.kv_at = r.kv_at; }
        push.push(row);
      }
    }
    /* שורה אחת לכל נהג (שורות בלי kv לא יכולות להיות באותה בקשה עם שורות עם kv) */
    for (const row of push) {
      await this.rest("POST", "bb_profiles?on_conflict=owner,id", [row], { Prefer: "resolution=merge-duplicates,return=minimal" });
      res.pushedProfiles++;
    }
    /* מאצ׳ים — איחוד */
    const remoteM = await this.remoteAll("bb_matches", "profile_id,at");
    const rset = new Map();
    for (const m of remoteM) { if (!rset.has(m.profile_id)) rset.set(m.profile_id, new Set()); rset.get(m.profile_id).add(+m.at); }
    for (const p of S.meta.list.filter(q => this.mine(q))) {
      const local = S.matches(p.id); const lset = new Set(local.map(m => +m.at));
      const rs = rset.get(p.id) || new Set();
      const up = local.filter(m => isFinite(m.at) && !rs.has(+m.at));
      for (let i = 0; i < up.length; i += 200) {
        const chunk = up.slice(i, i + 200).map(m => ({ profile_id: p.id, at: Math.round(+m.at), data: m }));
        await this.rest("POST", "bb_matches?on_conflict=owner,profile_id,at", chunk, { Prefer: "resolution=ignore-duplicates,return=minimal" });
        res.pushedMatches += chunk.length;
      }
      const down = [...rs].filter(a => !lset.has(a));
      for (let i = 0; i < down.length; i += 100) {
        const ats = down.slice(i, i + 100);
        const { data } = await this.rest("GET", "bb_matches?select=at,data&profile_id=eq." + encodeURIComponent(p.id) + "&at=in.(" + ats.join(",") + ")");
        const got = (data || []).map(x => x.data).filter(m => m && isFinite(m.at)).sort((a, b) => a.at - b.at);
        res.pulledMatches += S.appendMatches(p.id, got);
      }
    }
    if (S.meta.active !== activeBefore) res.changedActive = true;
    return res;
  }
}
module.exports = { Sync, DEFAULT_CLOUD, heb };
