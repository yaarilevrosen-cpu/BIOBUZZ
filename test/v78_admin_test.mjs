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
  ok(fns.length === 4, '[sql] ארבע פונקציות (' + fns.map(f => f[1]).join(', ') + ')');
  ok(fns.every(f => /security definer/i.test(f[0]) && /set search_path = public/i.test(f[0])), '[sql] כולן security definer עם search_path קבוע');
  const rv = (code.match(/revoke all on function([\s\S]*?)from public, anon;/i) || [])[1] || '';
  const gr = (code.match(/grant execute on function([\s\S]*?)to authenticated;/i) || [])[1] || '';
  ok(fns.every(f => rv.includes(f[1].replace(/^public\./, 'public.') + '(')), '[sql] ההרצה נלקחת מ-public ומ-anon לכל ארבע');
  ok(fns.every(f => gr.includes(f[1] + '(')), '[sql] ההרצה ניתנת רק ל-authenticated');
  ok(!/grant\s+(insert|update|delete|all)[^;]*bb_scout_admins/i.test(code) && !/create policy[^;]*bb_scout_admins[^;]*for (insert|update|delete|all)/i.test(code), '[sql] אין הרשאת כתיבה ישירה ואין מדיניות כתיבה');
  ok(!/@/.test(sql), '[sql] אין כתובת מייל (שום ״@״) בקובץ');
  ok(!/service_role/i.test(code), '[sql] בלי service_role');
  ok(/'no_account'/.test(code) && /'last_admin'/.test(code) && /'not_admin'/.test(code), '[sql] השגיאות no_account / last_admin / not_admin');
  ok(!/errcode/i.test(code), '[sql] בלי errcode מיוחד (P0002 היה חוזר כ-404 = ״הפונקציה חסרה״)');
  const doc = fs.readFileSync(path.join(ROOT, 'docs/v78-mode.md'), 'utf8');
  ok(/<האימייל שלך>/.test(doc) && /insert into public\.bb_scout_admins/.test(doc), '[docs] תבנית המנהל הראשון עם <האימייל שלך>');
}

// ── 2. app/sync.js מול שרת מדומה ──
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USERS = { tA: { id: A, email: 'alice@example.test', user_metadata: { name: 'Alice', tos_v: '2026-10-01', age_bracket: '18+' } },
                tB: { id: B, email: 'bob@example.test', user_metadata: { name: 'Bob', tos_v: '2026-10-01', age_bracket: '18+' } } };
const S = { admins: new Map([[A, '2026-11-01T10:00:00+00:00']]), missing: false, down: false, calls: [] };
const byMail = em => Object.values(USERS).find(u => u.email === em);
const srv = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
  if (S.down) { q.socket.destroy(); return; }
  const u = new URL(q.url, 'http://x'), p = u.pathname, tok = String(q.headers.authorization || '').replace(/^Bearer /, '');
  const send = (c, o) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(o === undefined ? '' : JSON.stringify(o)); };
  const me = USERS[tok]; let body = {}; try { body = b ? JSON.parse(b) : {}; } catch (e) {}
  if (p === '/auth/v1/token') { const t = u.searchParams.get('grant_type') === 'refresh_token' ? (body.refresh_token || '').replace(/^r/, 't') : (byMail(body.email) === USERS.tB ? 'tB' : 'tA');
    return USERS[t] ? send(200, { access_token: t, refresh_token: 'r' + t.slice(1), expires_in: 3600, user: USERS[t] }) : send(400, { message: 'bad refresh' }); }
  if (p === '/auth/v1/logout') return send(204);
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.slice(13); S.calls.push({ fn, body, tok });
    if (!me) return send(401, { message: 'JWT expired' });
    if (S.missing && /^bb_scout/.test(fn)) return send(404, { code: 'PGRST202', message: 'Could not find the function public.' + fn + ' without parameters in the schema cache' });
    const adm = S.admins.has(me.id), err = m => send(400, { code: 'P0001', message: m });
    if (fn === 'bb_scout_is_admin') return send(200, adm);
    if (fn === 'bb_delete_me') { S.admins.delete(me.id); return send(200, null); }
    if (!adm) return err('not_admin');
    if (fn === 'bb_scout_admins_list') return send(200, [...S.admins].map(([id, at]) => ({ user_id: id, email: Object.values(USERS).find(x => x.id === id).email, added_at: at })));
    if (fn === 'bb_scout_admin_add') { const t = byMail(String(body.p_email || '').trim().toLowerCase()); if (!t) return err('no_account'); if (!S.admins.has(t.id)) S.admins.set(t.id, '2026-11-09T08:00:00+00:00'); return send(204); }
    if (fn === 'bb_scout_admin_remove') { if (!S.admins.has(body.p_user)) return send(204); if (S.admins.size <= 1) return err('last_admin'); S.admins.delete(body.p_user); return send(204); }
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
  ok(l.ok && l.list.length === 1 && l.list[0].uid === A && l.list[0].email === 'alice@example.test' && l.list[0].me === true && /^2026-11-01/.test(l.list[0].at), 'רשימת המנהלים: מייל, מתי, ״אני״');
  S.calls = []; let a = await y.scoutAdminAdd('not-an-email');
  ok(!a.ok && /מייל תקין/.test(a.why) && S.calls.length === 0, 'מייל לא תקין — נעצר במחשב, בלי בקשה לשרת');
  a = await y.scoutAdminAdd('nobody@example.test');
  ok(!a.ok && /אין חשבון עם המייל הזה/.test(a.why), 'no_account → ״אין חשבון עם המייל הזה…״ (' + a.why + ')');
  let rm = await y.scoutAdminRemove(A);
  ok(!rm.ok && /המנהל האחרון/.test(rm.why) && y.status().scoutAdmin === true, 'last_admin → ״אי אפשר להסיר את המנהל האחרון…״, ועדיין מנהל');
  rm = await y.scoutAdminRemove('not-a-uuid'); ok(!rm.ok, 'מזהה לא תקין — נדחה במחשב');
  S.calls = []; a = await y.scoutAdminAdd('  Bob@Example.TEST ');
  ok(a.ok && a.list && a.list.length === 2 && S.calls[0].fn === 'bb_scout_admin_add' && S.calls[0].body.p_email === 'bob@example.test', 'הוספה לפי מייל (רווחים ואותיות גדולות מנוקים) → שני מנהלים');
  a = await y.scoutAdminAdd('bob@example.test'); ok(a.ok && a.list.length === 2, 'הוספה פעמיים — בלי שגיאה, עדיין שניים');
  S.calls = []; rm = await y.scoutAdminRemove(B);
  ok(rm.ok && rm.list.length === 1 && S.calls[0].body.p_user === B && rm.admin === true, 'הסרה של מנהל אחר → מנהל אחד');
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
  S.admins.delete(A); S.admins.set(B, '2026-11-09T08:00:00+00:00');   // מנהל אחר הסיר את A
  const l = await y.scoutAdmins(); ok(!l.ok && l.notAdmin && y.scoutAdmin() === false, 'הוסר בשרת: הבקשה הבאה (not_admin) מכבה את המצב מיד');
  S.admins.set(A, '2026-11-01T10:00:00+00:00'); await y.scoutIsAdmin(); ok(y.scoutAdmin(), 'הוחזר — שוב מנהל אחרי בדיקה');
  const rm = await y.scoutAdminRemove(A); ok(rm.ok && rm.admin === false && y.status().scoutAdmin === false, 'הסרתי את עצמי (יש עוד מנהל) — המצב נסגר מיד');
  S.admins = new Map([[A, '2026-11-01T10:00:00+00:00']]);
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
  S.admins.set(A, '2026-11-01T10:00:00+00:00');
}
// ח. main.js / preload.js: הערוצים קיימים, דרך handle() (בדיקת השולח), ו-scoutAdmin ב-status
{ const m = fs.readFileSync(path.join(APP, 'main.js'), 'utf8'), pl = fs.readFileSync(path.join(APP, 'preload.js'), 'utf8');
  ok(['bb:scoutAdmin', 'bb:scoutAdmins', 'bb:scoutAdminAdd', 'bb:scoutAdminRemove'].every(c => m.includes('handle("' + c + '"') && pl.includes('"' + c + '"')), '[app] ארבעת הערוצים: handle() ב-main, invoke ב-preload');
  ok(/setInterval\(\(\) => scoutRefresh\("timer"\), 600000\)/.test(m) && /scoutRefresh\("login"\)/.test(m) && /scoutRefresh\("start"\)/.test(m), '[app] רענון: בהתחברות, בהפעלה, כל 10 דקות');
  ok(/scoutAdmin: this\.scoutAdmin\(\)/.test(fs.readFileSync(path.join(APP, 'sync.js'), 'utf8')), '[app] scoutAdmin בתוך status() (ולכן ב-acctStatus())');
}
srv.close();
console.log(`\nv78_admin: ${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
