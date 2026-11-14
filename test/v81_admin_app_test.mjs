// v81 לוח מנהל — app/sync.js מול שרת מדומה מקומי: adminMe / adminCall (סינון של מה שנשלח וחוזר, הודעות שגיאה),
// הודעות לכולם (גם בלי חשבון), וחסימה (הסנכרון נעצר עם הסבר). את ה-SQL עצמו בודק v81_admin_sql_test.sh.
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const APP = process.env.APP_DIR || new URL('../app', import.meta.url).pathname;
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const mk = (id, em) => ({ id, email: em, user_metadata: { name: em.split('@')[0], tos_v: '2026-10-01', age_bracket: '18+' } });
const USERS = { tA: mk(A, 'alice@example.test'), tB: mk(B, 'bob@example.test'), tC: mk(C, 'carol@example.test') };
const S = { role: { [A]: 'owner', [B]: 'admin' }, missing: false, blocked: {}, calls: [], notices: [{ id: 7, created_at: '2026-11-14T10:00:00+00:00', text_he: 'שלום', text_en: 'Hello', until: '2026-12-01T00:00:00+00:00', secret: 'x' }] };
const srv = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
  const u = new URL(q.url, 'http://x'), p = u.pathname, tok = String(q.headers.authorization || '').replace(/^Bearer /, '');
  const send = (c, o) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(o === undefined ? '' : JSON.stringify(o)); };
  const me = USERS[tok]; let body = {}; try { body = b ? JSON.parse(b) : {}; } catch (e) {}
  if (p === '/auth/v1/token') { const t = u.searchParams.get('grant_type') === 'refresh_token' ? (body.refresh_token || '').replace(/^r/, 't') : 't' + String(body.email || 'a')[0].toUpperCase();
    return USERS[t] ? send(200, { access_token: t, refresh_token: 'r' + t.slice(1), expires_in: 3600, user: USERS[t] }) : send(400, { message: 'bad' }); }
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.slice(13); S.calls.push({ fn, body, tok });
    if (fn === 'bb_notices_active') return S.missing ? send(404, { code: 'PGRST202', message: 'Could not find the function' }) : send(200, S.notices);
    if (!me) return send(401, { message: 'JWT expired' });
    if (S.missing && /^bb_(admin|my_block)/.test(fn)) return send(404, { code: 'PGRST202', message: 'Could not find the function public.' + fn });
    const role = S.role[me.id], err = x => send(400, { code: 'P0001', message: x }), owner = () => role === 'owner';
    if (fn === 'bb_scout_is_admin') return send(200, !!role);
    if (fn === 'bb_my_block') return send(200, S.blocked[me.id] ? { blocked: true, reason: S.blocked[me.id], at: '2026-11-14T10:00:00+00:00' } : null);
    if (fn === 'bb_admin_me') return send(200, role ? { role, owner: owner() } : null);
    if (/^bb_admin_/.test(fn) && !role) return err('not_admin');
    if (fn === 'bb_admin_bugs') return send(200, [{ id: 5, created_at: '2026-11-14T10:00:00+00:00', ver: 'v80', lang: 'he', platform: 'Win32', what: 'x'.repeat(5000), steps: null, contact: 'c', has_shot: true, n_errors: 2, signed_in: true, email: owner() ? 'carol@example.test' : null, done: false, done_at: null, note: null, extra: 'leak' }, { id: 'zz' }]);
    if (fn === 'bb_admin_bug') return body.p_id === 5 ? send(200, { id: 5, created_at: '2026-11-14T10:00:00+00:00', what: 'w', shot: S.badShot ? 'https://evil.example.test/x.png' : 'data:image/jpeg;base64,AAAA', sys: { gpu: 'g' }, errors: [{ t: 1, m: 'boom' }, 'plain'], signed_in: true, email: null, done: false }) : err('not_found');
    if (fn === 'bb_admin_bug_set') return send(204);
    if (['bb_admin_bug_delete', 'bb_admin_users', 'bb_admin_block', 'bb_admin_delete_user', 'bb_admin_notices', 'bb_admin_notice_add', 'bb_admin_notice_off', 'bb_admin_log_list'].includes(fn) && !owner()) return err('not_owner');
    if (fn === 'bb_admin_users') return send(200, [{ user_id: C, email: 'carol@example.test', created_at: '2026-11-01T10:00:00+00:00', last_sign_in_at: null, team_name: 'T', team_num: '90001', n_profiles: 1, n_matches: 3, last_match: null, n_bugs: 1, blocked: !!S.blocked[C], block_reason: S.blocked[C] || null, admin_role: null, total: 1 }, { user_id: 'not-a-uuid', email: 'x' }]);
    if (fn === 'bb_admin_block') { if (body.p_user === me.id) return err('self'); if (S.role[body.p_user]) return err('is_admin'); if (body.p_block) S.blocked[body.p_user] = body.p_reason || ''; else delete S.blocked[body.p_user]; return send(204); }
    if (fn === 'bb_admin_delete_user') return S.role[body.p_user] ? err('is_admin') : send(204);
    if (fn === 'bb_admin_notices') return send(200, S.notices.map(n => Object.assign({ active: true, live: true }, n)));
    if (fn === 'bb_admin_notice_add') { if (String(body.p_he || '').trim().length < 2) return err('bad_text'); S.notices.push({ id: 8, created_at: 'x', text_he: body.p_he, text_en: body.p_en, until: 'y' }); return send(200, 8); }
    if (fn === 'bb_admin_notice_off') return send(204);
    if (fn === 'bb_admin_stats') return send(200, { users: 3, users_7d: '1', matches: -4, days: [{ d: '2026-11-14', matches: 2, players: 1, users: 0, bugs: 0 }], bug_vers: [{ ver: 'v80', n: 2 }], secret: 'leak' });
    if (fn === 'bb_admin_log_list') return send(200, [{ id: 1, at: '2026-11-14T10:00:00+00:00', by_email: 'alice@example.test', action: 'block', target: C, detail: 'r' }]);
    return send(404, { code: 'PGRST202', message: 'Could not find the function ' + fn });
  }
  if (p === '/auth/v1/user') return me ? send(200, me) : send(401, { message: 'jwt' });
  if (p === '/rest/v1/bb_team_members') return send(200, []);
  if (p === '/rest/v1/bb_profiles' || p === '/rest/v1/bb_matches') { S.calls.push({ fn: 'table:' + p.slice(9) }); return send(q.method === 'GET' ? 200 : 201, q.method === 'GET' ? [] : undefined); }
  send(404, { message: 'no route ' + p });
}); });
await new Promise(res => srv.listen(0, '127.0.0.1', res));
process.env.BIOBUZZ_CLOUD_URL = 'http://127.0.0.1:' + srv.address().port; process.env.BIOBUZZ_CLOUD_KEY = 'anon';
const { Store } = require(path.join(APP, 'store.js'));
const { Sync } = require(path.join(APP, 'sync.js'));
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bbadm-')); const st = new Store(d); return { d, st, y: new Sync(st, d, { tosNeed: '2026-10-01' }) }; };
const last = fn => [...S.calls].reverse().find(c => c.fn === fn);
let r;

// א. בלי חשבון
{ const { y } = fresh();
  r = await y.adminCall('bugs', {}); ok(!r.ok && /להתחבר/.test(r.why), 'בלי חשבון: לוח המנהל מבקש להתחבר');
  r = await y.notices(); ok(r.ok && r.list.length === 1 && r.list[0].he === 'שלום' && r.list[0].en === 'Hello' && !('secret' in r.list[0]) && last('bb_notices_active').tok === 'anon', 'הודעות לכולם נקראות גם בלי חשבון (מפתח ציבורי), רק השדות המוכרים');
  ok(y.status().admin === null && y.status().blocked === null, 'סטטוס: לא מנהל ולא חסום'); }
// ב. בעלים
{ const { y } = fresh(); await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin();
  ok(JSON.stringify(y.status().admin) === '{"owner":true}', 'בעלים: הסטטוס כולל admin.owner אחרי בדיקת המנהל');
  r = await y.adminCall('bugs', { state: 'weird', limit: 9999, before: 'x' });
  const b = r.list && r.list[0];
  ok(r.ok && r.list.length === 1 && b.what.length === 4000 && b.shot === true && b.errors === 2 && b.email === 'carol@example.test' && !('extra' in b), 'רשימת דיווחים: שורה לא תקינה נזרקת, טקסט נחתך, שדה לא מוכר לא עובר');
  ok(last('bb_admin_bugs').body.p_state === 'all' && last('bb_admin_bugs').body.p_limit === 200 && last('bb_admin_bugs').body.p_before === null, 'מה שנשלח לשרת מסונן (state / limit / before)');
  r = await y.adminCall('bug', { id: 5 }); ok(r.ok && r.bug.shot === 'data:image/jpeg;base64,AAAA' && /boom/.test(r.bug.errors) && /plain/.test(r.bug.errors) && /gpu/.test(r.bug.sys), 'דיווח מלא: צילום, שגיאות ופרטי מערכת כטקסט');
  S.badShot = true; r = await y.adminCall('bug', { id: 5 }); S.badShot = false; ok(r.ok && r.bug.shot === '', 'צילום שאינו תמונה מוטמעת (כתובת חיצונית) לא עובר לדף');
  r = await y.adminCall('bug', { id: 99 }); ok(!r.ok && /לא נמצא/.test(r.why), 'דיווח שלא קיים — הודעה בעברית');
  r = await y.adminCall('bug', { id: 'x' }); ok(!r.ok, 'מזהה לא תקין נדחה בלי לפנות לשרת');
  r = await y.adminCall('bugSet', { id: 5, done: 'yes', note: 'n'.repeat(3000) }); ok(r.ok && last('bb_admin_bug_set').body.p_done === null && last('bb_admin_bug_set').body.p_note.length === 1000, 'סימון: רק true/false, הערה עד 1000 תווים');
  r = await y.adminCall('users', { q: 'car' }); ok(r.ok && r.total === 1 && r.list.length === 1 && r.list[0].uid === C && r.list[0].matches === 3 && r.list[0].num === '90001', 'חשבונות: שורה בלי מזהה תקין נזרקת');
  r = await y.adminCall('block', { uid: A, block: true, reason: 'x' }); ok(!r.ok && /עצמך/.test(r.why), 'חסימת עצמי — הודעה ברורה');
  r = await y.adminCall('block', { uid: B, block: true }); ok(!r.ok && /מנהל/.test(r.why), 'חסימת מנהל — הודעה ברורה');
  r = await y.adminCall('block', { uid: 'nope', block: true }); ok(!r.ok, 'מזהה חשבון לא תקין נדחה');
  r = await y.adminCall('block', { uid: C, block: true, reason: 'שימוש לרעה' }); ok(r.ok && S.blocked[C] === 'שימוש לרעה', 'חסימה עם סיבה');
  r = await y.adminCall('noticeAdd', { he: ' ', en: '' }); ok(!r.ok && /ריקה/.test(r.why), 'הודעה ריקה נדחית עוד באפליקציה');
  r = await y.adminCall('noticeAdd', { he: 'גרסה חדשה', en: 'New', days: 500 }); ok(r.ok && last('bb_admin_notice_add').body.p_days === 60, 'הודעה: ימים עד 60');
  r = await y.adminCall('stats'); ok(r.ok && r.stats.users === 3 && r.stats.users_7d === 1 && r.stats.matches === 0 && r.stats.days.length === 1 && r.stats.vers[0].n === 2 && !('secret' in r.stats), 'סטטיסטיקה: רק מספרים מוכרים, שליליים מתאפסים');
  r = await y.adminCall('log'); ok(r.ok && r.list[0].action === 'block', 'יומן');
  r = await y.adminCall('drop table', {}); ok(!r.ok, 'פעולה לא מוכרת נדחית');
  await y.signOut(); ok(y.status().admin === null, 'התנתקות מנקה את דרגת המנהל'); }
// ג. מנהל רגיל
{ const { y } = fresh(); await y.signIn('bob@example.test', 'pw'); await y.scoutIsAdmin();
  ok(JSON.stringify(y.status().admin) === '{"owner":false}', 'מנהל רגיל: admin.owner=false');
  r = await y.adminCall('bugs', {}); ok(r.ok && r.list[0].email === '', 'מנהל רגיל: דיווחים בלי מייל');
  r = await y.adminCall('users', {}); ok(!r.ok && /רק הבעלים/.test(r.why), 'מנהל רגיל: חשבונות — ״רק הבעלים״');
  r = await y.adminCall('deleteUser', { uid: C }); ok(!r.ok && /רק הבעלים/.test(r.why), 'מנהל רגיל: מחיקה — ״רק הבעלים״'); }
// ד. משתמש רגיל, וחסום
{ const { y } = fresh(); await y.signIn('carol@example.test', 'pw'); await y.scoutIsAdmin();
  ok(y.status().admin === null, 'משתמש רגיל: בלי לוח מנהל');
  r = await y.adminCall('stats'); ok(!r.ok && r.notAdmin && /רק מנהל/.test(r.why), 'משתמש רגיל: ״רק מנהל״');
  S.calls.length = 0; r = await y.syncNow();
  ok(!r.ok && /נחסם/.test(r.why) && /שימוש לרעה/.test(r.why) && !S.calls.some(c => /^table:/.test(c.fn)), 'חשבון חסום: הסנכרון נעצר עם הסיבה, בלי לגעת בטבלאות');
  ok(y.status().blocked && y.status().blocked.reason === 'שימוש לרעה', 'הסטטוס מסמן ״חסום״ עם הסיבה');
  delete S.blocked[C]; r = await y.syncNow(); ok(r.ok && y.status().blocked === null, 'אחרי שחרור — הסנכרון חוזר'); }
// ה. השרת בלי v81_admin.sql
{ S.missing = true; const { y } = fresh(); await y.signIn('alice@example.test', 'pw'); await y.scoutIsAdmin();
  ok(y.status().admin === null, 'בלי הקובץ בשרת: אין לוח מנהל');
  r = await y.adminCall('bugs', {}); ok(!r.ok && r.missing && /v81_admin\.sql/.test(r.why), 'ההודעה אומרת להריץ את v81_admin.sql');
  r = await y.notices(); ok(!r.ok && r.list.length === 0, 'הודעות: רשימה ריקה, בלי שגיאה');
  r = await y.syncNow(); ok(r.ok, 'הסנכרון עובד כרגיל בלי הקובץ'); S.missing = false; }
srv.close();
console.log(`v81_admin_app: ${pass} עברו, ${fail} נכשלו`); process.exit(fail ? 1 : 0);
