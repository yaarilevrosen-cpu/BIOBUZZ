// v78 מצב סקאוטינג — מנהלים: app/sync.js מול שרת מדומה מקומי (בלי Electron ובלי שרת אמיתי), ובדיקה סטטית של קובץ ה-SQL.
// הרצה: node v78_admin_test.mjs            (מול app/ של המאגר)
//        APP_DIR=/path/to/app node v78_admin_test.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const APP = process.env.APP_DIR || new URL('../app', import.meta.url).pathname;
const ROOT = new URL('..', import.meta.url).pathname;
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };

// ── 1. בדיקה סטטית של supabase/v78_scout_admins.sql ──
{ const sql = fs.readFileSync(path.join(ROOT, 'supabase/v78_scout_admins.sql'), 'utf8');
  const code = sql.replace(/--[^\n]*/g, '');
  ok(/create table if not exists public\.bb_scout_admins/i.test(code), '[sql] הטבלה bb_scout_admins נוצרת בקובץ');
  ok(/alter table public\.bb_scout_admins enable row level security/i.test(code), '[sql] row level security מופעל באותו קובץ (החלטה 03)');
  const fns = [...code.matchAll(/create or replace function (public\.bb_scout_[a-z_]+)\s*\(([^)]*)\)[\s\S]*?\$\$[\s\S]*?\$\$/gi)];
  ok(fns.length === 5, '[sql] חמש פונקציות (' + fns.map(f => f[1]).join(', ') + ')');
  ok(fns.every(f => /security definer/i.test(f[0]) && /set search_path = public/i.test(f[0])), '[sql] כולן security definer עם search_path קבוע');
  const rv = (code.match(/revoke all on function([\s\S]*?)from public, anon;/i) || [])[1] || '';
  const gr = (code.match(/grant execute on function([\s\S]*?)to authenticated;/i) || [])[1] || '';
  ok(fns.every(f => rv.includes(f[1] + '(')), '[sql] ההרצה נלקחת מ-public ומ-anon לכל החמש');
  ok(fns.every(f => gr.includes(f[1] + '(')), '[sql] ההרצה ניתנת רק ל-authenticated');
  ok(!/grant\s+(insert|update|delete|all)[^;]*bb_scout_admins/i.test(code) && !/create policy[^;]*bb_scout_admins[^;]*for (insert|update|delete|all)/i.test(code), '[sql] אין הרשאת כתיבה ישירה ואין מדיניות כתיבה');
  ok(!/@/.test(sql), '[sql] אין כתובת מייל (שום ״@״) בקובץ');
  ok(!/service_role/i.test(code), '[sql] בלי service_role');
  ok(['no_account', 'last_admin', 'last_owner', 'not_admin', 'not_allowed', 'not_allowed_remove', 'not_owner', 'not_found'].every(x => code.includes("'" + x + "'")), '[sql] כל השגיאות (no_account, last_admin, last_owner, not_admin, not_allowed, not_allowed_remove, not_owner, not_found)');
  const fb = n => (fns.find(f => f[1] === 'public.' + n) || [''])[0];
  ok(/role\s+text not null default 'admin' check \(role in \('owner', 'admin'\)\)/.test(code) && /can_invite boolean not null default false/.test(code), '[sql] שלוש דרגות: role owner/admin (ברירת מחדל admin), can_invite (ברירת מחדל false)');
  const add = fb('bb_scout_admin_add');
  ok(/if me\.role <> 'owner' and not me\.can_invite then raise exception 'not_allowed'/.test(add), '[sql] הוספה: רק בעלים או מנהל עם can_invite (מנהל רגיל — not_allowed)');
  ok(/values \(v, 'admin', false, auth\.uid\(\)\)/.test(add) && /on conflict \(user_id\) do nothing/.test(add), '[sql] הוספה: תמיד admin בלי can_invite (ההרשאה לא עוברת הלאה), added_by = מי שהוסיף, קיים — בלי שינוי');
  const rmv = fb('bb_scout_admin_remove');
  ok(/t\.added_by is distinct from auth\.uid\(\) or t\.role <> 'admin'.*'not_allowed_remove'/.test(rmv) && /if not me\.can_invite then raise exception 'not_allowed'/.test(rmv), '[sql] הסרה: מנהל עם can_invite — רק מי שהוא הוסיף; בלי can_invite — לא');
  ok(/t\.role = 'owner' and \(select count\(\*\) from public\.bb_scout_admins a where a\.role = 'owner'\) <= 1 then raise exception 'last_owner'/.test(rmv) && /lock table/.test(rmv), '[sql] הסרה: הבעלים האחרון מוגן (עם נעילה)');
  const set = fb('bb_scout_admin_set');
  ok(/if me\.role <> 'owner' then raise exception 'not_owner'/.test(set) && /'last_owner'/.test(set) && /lock table/.test(set), '[sql] bb_scout_admin_set: רק בעלים; את הבעלים האחרון אי אפשר להוריד');
  ok(!/role\s*=\s*'owner'/.test(add) && !/can_invite\s*=\s*true/.test(add), '[sql] הוספה לא יוצרת בעלים ולא נותנת can_invite');
  ok(!/errcode/i.test(code), '[sql] בלי errcode מיוחד (P0002 היה חוזר כ-404 = ״הפונקציה חסרה״)');
  const doc = fs.readFileSync(path.join(ROOT, 'docs/v78-mode.md'), 'utf8');
  ok(/<האימייל שלך>/.test(doc) && /insert into public\.bb_scout_admins \(user_id, role, can_invite\) select id, 'owner', true/.test(doc), '[docs] תבנית הבעלים הראשון (owner, can_invite) עם <האימייל שלך>');
}

// ── 2. app/sync.js מול שרת מדומה ──
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USERS = { tA: { id: A, email: 'alice@example.test', user_metadata: { name: 'Alice', tos_v: '2026-10-01', age_bracket: '18+' } },
                tB: { id: B, email: 'bob@example.test', user_metadata: { name: 'Bob', tos_v: '2026-10-01', age_bracket: '18+' } },
                tC: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'carol@example.test', user_metadata: { name: 'Carol', tos_v: '2026-10-01', age_bracket: '18+' } } };
// השרת המדומה מחקה את הכללים של v78_scout_admins.sql: admins = uid → {role, inv, by, at}
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const own = () => new Map([[A, { role: 'owner', inv: true, by: null, at: '2026-11-01T10:00:00+00:00' }]]);
const S = { admins: own(), missing: false, down: false, calls: [] };
const byMail = em => Object.values(USERS).find(u => u.email === em);
const srv = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
  if (S.down) { q.socket.destroy(); return; }
  const u = new URL(q.url, 'http://x'), p = u.pathname, tok = String(q.headers.authorization || '').replace(/^Bearer /, '');
  const send = (c, o) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(o === undefined ? '' : JSON.stringify(o)); };
  const me = USERS[tok]; let body = {}; try { body = b ? JSON.parse(b) : {}; } catch (e) {}
  if (p === '/auth/v1/token') { const t = u.searchParams.get('grant_type') === 'refresh_token' ? (body.refresh_token || '').replace(/^r/, 't') : (byMail(body.email) === USERS.tB ? 'tB' : byMail(body.email) === USERS.tC ? 'tC' : 'tA');
    return USERS[t] ? send(200, { access_token: t, refresh_token: 'r' + t.slice(1), expires_in: 3600, user: USERS[t] }) : send(400, { message: 'bad refresh' }); }
  if (p === '/auth/v1/logout') return send(204);
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.slice(13); S.calls.push({ fn, body, tok });
    if (!me) return send(401, { message: 'JWT expired' });
    if (S.missing && /^bb_scout/.test(fn)) return send(404, { code: 'PGRST202', message: 'Could not find the function public.' + fn + ' without parameters in the schema cache' });
    const m = S.admins.get(me.id), err = x => send(400, { code: 'P0001', message: x }), mail = id => (Object.values(USERS).find(x => x.id === id) || {}).email || null;
    const owners = () => [...S.admins.values()].filter(x => x.role === 'owner').length;
    if (fn === 'bb_scout_is_admin') return send(200, !!m);
    if (fn === 'bb_delete_me') { S.admins.delete(me.id); return send(200, null); }
    if (!m) return err('not_admin');
    if (fn === 'bb_scout_admins_list') return send(200, [...S.admins].map(([id, x]) => ({ user_id: id, email: mail(id), role: x.role, can_invite: x.inv, added_at: x.at, added_by: x.by, added_by_email: x.by ? mail(x.by) : null })));
    if (fn === 'bb_scout_admin_add') { if (m.role !== 'owner' && !m.inv) return err('not_allowed'); const t = byMail(String(body.p_email || '').trim().toLowerCase()); if (!t) return err('no_account');
      if (!S.admins.has(t.id)) S.admins.set(t.id, { role: 'admin', inv: false, by: me.id, at: '2026-11-09T08:00:00+00:00' }); return send(204); }
    if (fn === 'bb_scout_admin_remove') { const t = S.admins.get(body.p_user); if (!t) return send(204);
      if (m.role !== 'owner') { if (!m.inv) return err('not_allowed'); if (t.by !== me.id || t.role !== 'admin') return err('not_allowed_remove'); }
      if (t.role === 'owner' && owners() <= 1) return err('last_owner'); if (S.admins.size <= 1) return err('last_admin'); S.admins.delete(body.p_user); return send(204); }
    if (fn === 'bb_scout_admin_set') { if (m.role !== 'owner') return err('not_owner'); const t = S.admins.get(body.p_user); if (!t) return err('not_found');
      const r = body.p_owner === true ? 'owner' : body.p_owner === false ? 'admin' : t.role; if (t.role === 'owner' && r === 'admin' && owners() <= 1) return err('last_owner');
      t.inv = r === 'owner' ? true : t.role === 'owner' ? body.p_can_invite === true : (body.p_can_invite == null ? t.inv : body.p_can_invite); t.role = r; return send(204); }
    return send(404, { code: 'PGRST202', message: 'Could not find the function ' + fn });
  }
  if (p === '/auth/v1/user') return me ? send(200, me) : send(401, { message: 'jwt' });
  if (p === '/rest/v1/bb_team_members') return send(200, []);
  if (p === '/rest/v1/bb_profiles' || p === '/rest/v1/bb_matches') return send(q.method === 'GET' ? 200 : 201, q.method === 'GET' ? [] : undefined);
  send(404, { message: 'no route ' + p });
}); });
await new Promise(res => srv.listen(0, '127.0.0.1', res));
process.env.BIOBUZZ_CLOUD_URL = 'http://127.0.0.1:' + srv.address().port; process.env.BIOBUZZ_CLOUD_KEY = 'anon';
const { Store } = require(path.join(APP, 'store.js'));
const { Sync } = require(path.join(APP, 'sync.js'));
const fresh = d => { d = d || fs.mkdtempSync(path.join(os.tmpdir(), 'bbscout-')); const st = new Store(d); const y = new Sync(st, d, { tosNeed: '2026-10-01' }); return { d, st, y }; };
const file = d => path.join(d, 'scout-admin.json');
const SQLMSG = 'צריך להריץ את v78_scout_admins.sql בשרת';
console.log('APP_DIR=' + APP);
const realNow = Date.now; const shift = days => { Date.now = () => realNow() + days * 864e5; };

// א. לא מחוברים
{ const { y } = fresh();
  const r = await y.scoutIsAdmin();
  ok(!r.ok && !r.admin && /להתחבר/.test(r.why), 'לא מחוברים: ״צריך להתחבר לחשבון קודם״ (' + r.why + ')');
  ok(y.status().scoutAdmin === false, 'לא מחוברים: status().scoutAdmin=false');
  const l = await y.scoutAdmins(); ok(!l.ok && /להתחבר/.test(l.why), 'לא מחוברים: רשימת המנהלים — אותה הודעה');
}
// ב. מנהל: בדיקה, מטמון, רשימה, הוספה, שגיאות
let dirA;
{ const { d, y } = fresh(); dirA = d;
  await y.signIn('alice@example.test', 'pw');
  ok(y.status().scoutAdmin === false, 'מיד אחרי ההתחברות, לפני בדיקה — עוד לא מנהל');
  S.calls = []; const r = await y.scoutIsAdmin();
  ok(r.ok && r.admin === true && S.calls.length === 1 && S.calls[0].fn === 'bb_scout_is_admin' && S.calls[0].tok === 'tA', 'scoutIsAdmin → rpc/bb_scout_is_admin עם האסימון של החשבון → מנהל');
  ok(y.status().scoutAdmin === true && fs.existsSync(file(d)), 'status().scoutAdmin=true, ונשמר במחשב (scout-admin.json)');
  const c = JSON.parse(fs.readFileSync(file(d), 'utf8'));
  ok(c.uid === A && c.admin === true && Math.abs(c.at - Date.now()) < 5000 && Object.keys(c).length === 3, 'המטמון: רק uid, admin, at (' + JSON.stringify(c) + ')');
  const l = await y.scoutAdmins();
  ok(l.ok && l.list.length === 1 && l.list[0].uid === A && l.list[0].email === 'alice@example.test' && l.list[0].me === true && /^2026-11-01/.test(l.list[0].at)
    && l.list[0].role === 'owner' && l.list[0].canInvite === true && l.list[0].addedBy === '', 'רשימת המנהלים: מייל, מתי, ״אני״, דרגה (בעלים), canInvite');
  S.calls = []; let a = await y.scoutAdminAdd('not-an-email');
  ok(!a.ok && /מייל תקין/.test(a.why) && S.calls.length === 0, 'מייל לא תקין — נעצר במחשב, בלי בקשה לשרת');
  a = await y.scoutAdminAdd('nobody@example.test');
  ok(!a.ok && /אין חשבון עם המייל הזה/.test(a.why), 'no_account → ״אין חשבון עם המייל הזה…״ (' + a.why + ')');
  let rm = await y.scoutAdminRemove(A);
  ok(!rm.ok && /הבעלים האחרון/.test(rm.why) && y.status().scoutAdmin === true, 'last_owner → ״אי אפשר להסיר את הבעלים האחרון…״, ועדיין מנהל (' + rm.why + ')');
  rm = await y.scoutAdminRemove('not-a-uuid'); ok(!rm.ok, 'מזהה לא תקין — נדחה במחשב');
  S.calls = []; a = await y.scoutAdminAdd('  Bob@Example.TEST ');
  ok(a.ok && a.list && a.list.length === 2 && S.calls[0].fn === 'bb_scout_admin_add' && S.calls[0].body.p_email === 'bob@example.test', 'הוספה לפי מייל (רווחים ואותיות גדולות מנוקים) → שני מנהלים');
  a = await y.scoutAdminAdd('bob@example.test'); ok(a.ok && a.list.length === 2, 'הוספה פעמיים — בלי שגיאה, עדיין שניים');
  S.calls = [];
  { const b = a.list.find(x => x.uid === B); ok(b && b.role === 'admin' && b.canInvite === false && b.addedBy === A && b.addedByEmail === 'alice@example.test', 'המנהל החדש: מנהל, בלי ״יכול להוסיף״, נוסף על ידי A (' + JSON.stringify(b) + ')'); }
  rm = await y.scoutAdminRemove(B);
  ok(rm.ok && rm.list.length === 1 && S.calls[0].body.p_user === B && rm.admin === true, 'הסרה של מנהל אחר → מנהל אחד');
}
// ב2. שלוש הדרגות מול השרת המדומה (אותם כללים כמו ב-SQL) — מיפוי השגיאות
{ S.admins = own();
  const a = fresh(), b = fresh(), c = fresh();
  await a.y.signIn('alice@example.test', 'pw'); await b.y.signIn('bob@example.test', 'pw'); await c.y.signIn('carol@example.test', 'pw');
  await a.y.scoutAdminAdd('bob@example.test');
  let r = await b.y.scoutAdminAdd('carol@example.test');
  ok(!r.ok && r.why === 'רק הבעלים או מי שקיבל הרשאה יכולים להוסיף מנהלים', 'מנהל רגיל מוסיף → not_allowed → ״' + r.why + '״');
  r = await b.y.scoutAdminSet(B, true, null);
  ok(!r.ok && r.why === 'רק הבעלים יכולים לשנות הרשאות של מנהלים', 'מנהל רגיל נותן לעצמו הרשאה → not_owner → ״' + r.why + '״');
  const l = await b.y.scoutAdmins(); ok(l.ok && l.list.length === 2, 'מנהל רגיל רואה את הרשימה (לקריאה)');
  S.calls = []; r = await a.y.scoutAdminSet(B, true, null);
  ok(r.ok && S.calls[0].fn === 'bb_scout_admin_set' && JSON.stringify(S.calls[0].body) === JSON.stringify({ p_user: B, p_can_invite: true, p_owner: null }) && r.list.find(x => x.uid === B).canInvite === true,
    'בעלים: scoutAdminSet(B, true, null) → rpc/bb_scout_admin_set {p_user, p_can_invite:true, p_owner:null}');
  r = await b.y.scoutAdminAdd('carol@example.test');
  const cRow = r.list && r.list.find(x => x.uid === C);
  ok(r.ok && cRow && cRow.role === 'admin' && cRow.canInvite === false && cRow.addedBy === B, 'B (עם הרשאה) מוסיף את C — C מנהל רגיל, ההרשאה לא עברה הלאה');
  r = await c.y.scoutAdminAdd('alice@example.test'); ok(!r.ok && /רק הבעלים או מי שקיבל הרשאה/.test(r.why), 'C (שהוסיף מי שקיבל הרשאה) לא יכול להוסיף');
  r = await b.y.scoutAdminSet(C, true, null); ok(!r.ok && /רק הבעלים/.test(r.why), 'B לא יכול לתת ל-C הרשאה (not_owner)');
  r = await b.y.scoutAdminRemove(A); ok(!r.ok && r.why === 'אפשר להסיר רק מנהלים שהוספת בעצמך', 'B מסיר את הבעלים → not_allowed_remove → ״' + r.why + '״');
  S.admins.get(C).by = A;
  r = await b.y.scoutAdminRemove(C); ok(!r.ok && /רק מנהלים שהוספת/.test(r.why), 'B לא מסיר מנהל שמישהו אחר הוסיף');
  S.admins.get(C).by = B;
  r = await b.y.scoutAdminRemove(C); ok(r.ok && !r.list.some(x => x.uid === C), 'B מסיר את מי שהוא עצמו הוסיף');
  r = await a.y.scoutAdminSet(A, null, false); ok(!r.ok && r.why === 'אי אפשר להסיר את הבעלים האחרון או להפוך אותו למנהל רגיל', 'הבעלים האחרון לא יורד לדרגת מנהל (last_owner)');
  r = await a.y.scoutAdminSet(C, true, null); ok(!r.ok && r.why === 'החשבון הזה כבר לא ברשימת המנהלים', 'הרשאה למי שכבר לא מנהל → not_found');
  r = await a.y.scoutAdminSet('bad', true, null); ok(!r.ok, 'מזהה לא תקין — נדחה במחשב');
  r = await a.y.scoutAdminSet(B, null, true); ok(r.ok && r.list.find(x => x.uid === B).role === 'owner', 'בעלים הופך את B לבעלים (bb_scout_admin_set, p_owner=true)');
  r = await b.y.scoutAdminSet(A, null, false); ok(r.ok && r.list.find(x => x.uid === A).role === 'admin', 'שני בעלים: B מוריד את A למנהל');
  r = await b.y.scoutAdminRemove(B); ok(!r.ok && /הבעלים האחרון/.test(r.why), 'הבעלים האחרון לא מסיר את עצמו');
  S.admins = own();
}
// ג. בלי אינטרנט: המטמון, גם אחרי הפעלה מחדש; 14 יום
{ S.down = true;
  const { y } = fresh(dirA);   // ״הפעלה מחדש״ של האפליקציה — אותה תיקייה
  ok(y.status().loggedIn && y.status().scoutAdmin === true, 'הפעלה מחדש בלי רשת: עדיין מנהל (מהמטמון)');
  let r = await y.scoutIsAdmin();
  ok(!r.ok && r.offline && r.admin === true && /אינטרנט/.test(r.why), 'בדיקה בלי רשת: offline, admin מהמטמון (' + r.why + ')');
  const l = await y.scoutAdmins(); ok(!l.ok && /אין חיבור לאינטרנט/.test(l.why), 'רשימת המנהלים בלי רשת: ״אין חיבור לאינטרנט…״');
  shift(13); ok(y.scoutAdmin() === true, 'אחרי 13 יום בלי רשת — עדיין מנהל');
  r = await y.scoutIsAdmin(); ok(r.admin === true, 'אחרי 13 יום, בדיקה נכשלת (אין רשת) — עדיין מנהל');
  shift(15); ok(y.scoutAdmin() === false && y.status().scoutAdmin === false, 'אחרי 15 יום בלי בדיקה מוצלחת — כבר לא (14 יום)');
  shift(-3); ok(y.scoutAdmin() === false, 'שעון שחזר אחורה יותר מיום — לא תקף');
  Date.now = realNow; S.down = false;
  r = await y.scoutIsAdmin(); ok(r.ok && r.admin === true && y.scoutAdmin() === true, 'הרשת חזרה — בדיקה מוצלחת מחדשת את 14 הימים');
}
// ד. התנתקות מוחקת; חשבון אחר לא יורש
{ const { d, y } = fresh(dirA);
  await y.signOut();
  ok(!fs.existsSync(file(d)) && y.status().scoutAdmin === false, 'התנתקות: המטמון נמחק');
  await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin(); ok(y.scoutAdmin() === true, 'שוב מחובר כמנהל');
  await y.signIn('bob@example.test', 'pw');   // חשבון אחר בלי להתנתק
  ok(y.status().scoutAdmin === false && !fs.existsSync(file(d)), 'החלפה לחשבון אחר (B): לא יורש, והמטמון של A נמחק');
  // A שוב; החיבור נופל (אסימון רענון לא תקף); B נכנס — עדיין לא יורש
  await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin();
  y.sess.expires_at = 0; y.sess.refresh_token = 'rX';
  await y.scoutIsAdmin(); ok(!y.sess && y.scoutAdmin() === false, 'אסימון רענון לא תקף: מנותקים, לא מנהל');
  await y.signIn('bob@example.test', 'pw');
  ok(y.scoutAdmin() === false && !fs.existsSync(file(d)), 'B נכנס אחרי שהחיבור של A נפל — לא יורש');
  // מטמון ״מזויף״ של A בקובץ, כש-B מחובר — לא נחשב
  fs.writeFileSync(file(d), JSON.stringify({ uid: A, admin: true, at: Date.now() }));
  const { y: y2 } = fresh(d); ok(y2.uid() === B && y2.scoutAdmin() === false, 'קובץ מטמון של A כש-B מחובר — לא מנהל');
  fs.writeFileSync(file(d), '{"uid":"x","admin":"yes","at":"now"}');
  const { y: y3 } = fresh(d); ok(y3.scout === null && y3.scoutAdmin() === false, 'קובץ מטמון פגום — מתעלמים');
  // B לא מנהל בשרת: התשובה נשמרת כ״לא״; רשימה → not_admin
  const r = await y3.scoutIsAdmin(); ok(r.ok && r.admin === false && JSON.parse(fs.readFileSync(file(d), 'utf8')).admin === false, 'B לא מנהל: התשובה ״לא״ נשמרת');
  const l = await y3.scoutAdmins(); ok(!l.ok && l.notAdmin && /רק מנהל סקאוטינג/.test(l.why), 'B מבקש רשימה → ״רק מנהל סקאוטינג יכול לעשות את זה״');
}
// ה. הפסקת ניהול: השרת אומר not_admin → המטמון מתעדכן מיד; הסרה עצמית
{ const { y } = fresh();
  await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin(); ok(y.scoutAdmin(), 'A מנהל');
  S.admins.delete(A); S.admins.set(B, { role: 'owner', inv: true, by: null, at: '2026-11-09T08:00:00+00:00' });   // מנהל אחר הסיר את A
  const l = await y.scoutAdmins(); ok(!l.ok && l.notAdmin && y.scoutAdmin() === false, 'הוסר בשרת: הבקשה הבאה (not_admin) מכבה את המצב מיד');
  S.admins.set(A, { role: 'owner', inv: true, by: null, at: '2026-11-01T10:00:00+00:00' }); await y.scoutIsAdmin(); ok(y.scoutAdmin(), 'הוחזר — שוב מנהל אחרי בדיקה');
  const rm = await y.scoutAdminRemove(A); ok(rm.ok && rm.admin === false && y.status().scoutAdmin === false, 'הסרתי את עצמי (יש עוד מנהל) — המצב נסגר מיד');
  S.admins = own();
}
// ו. הפונקציות חסרות בשרת (ה-SQL לא הורץ)
{ const { d, y } = fresh();
  await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin(); ok(y.scoutAdmin(), 'מנהל');
  S.missing = true;
  const r = await y.scoutIsAdmin(); ok(!r.ok && r.missing && r.why === SQLMSG && y.scoutAdmin() === false && !fs.existsSync(file(d)), 'פונקציה חסרה: ״' + SQLMSG + '״, והמטמון נמחק');
  const l = await y.scoutAdmins(); ok(!l.ok && l.missing && l.why === SQLMSG, 'רשימה כשהפונקציה חסרה — אותה הודעה');
  const a = await y.scoutAdminAdd('bob@example.test'); ok(!a.ok && a.why === SQLMSG, 'הוספה כשהפונקציה חסרה — אותה הודעה');
  S.missing = false;
}
// ז. מחיקת חשבון מוחקת את המטמון
{ const { d, y } = fresh();
  await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin();
  const r = await y.deleteMe(); ok(r.ok && !fs.existsSync(file(d)) && y.status().scoutAdmin === false, 'מחיקת חשבון: המטמון נמחק');
  S.admins = own();
}
// ח. main.js / preload.js: הערוצים קיימים, דרך handle() (בדיקת השולח), ו-scoutAdmin ב-status
{ const m = fs.readFileSync(path.join(APP, 'main.js'), 'utf8'), pl = fs.readFileSync(path.join(APP, 'preload.js'), 'utf8');
  ok(['bb:scoutAdmin', 'bb:scoutAdmins', 'bb:scoutAdminAdd', 'bb:scoutAdminRemove', 'bb:scoutAdminSet'].every(c => m.includes('handle("' + c + '"') && pl.includes('"' + c + '"')), '[app] חמשת הערוצים: handle() ב-main, invoke ב-preload');
  ok(/setInterval\(\(\) => scoutRefresh\("timer"\), 600000\)/.test(m) && /scoutRefresh\("login"\)/.test(m) && /scoutRefresh\("start"\)/.test(m), '[app] רענון: בהתחברות, בהפעלה, כל 10 דקות');
  ok(/scoutAdmin: this\.scoutAdmin\(\)/.test(fs.readFileSync(path.join(APP, 'sync.js'), 'utf8')), '[app] scoutAdmin בתוך status() (ולכן ב-acctStatus())');
}
srv.close();
console.log(`\nv78_admin: ${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
