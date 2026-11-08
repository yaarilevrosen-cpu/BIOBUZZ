// v75: באג ״חשבון חדש מתחבר לחשבון הקיים״ — בדיקה שנכתבה בסקירה, רצה מול app/ של המאגר
// שחזור: ״חשבון חדש מתחבר לחשבון הקיים״ — בלי Electron ובלי שרת אמיתי (שרת מדומה מקומי).
// הרצה: node v75_acct_test.mjs            (מול app/ של המאגר)
//        APP_DIR=/path/to/app node v75_acct_test.mjs   (מול עותק מתוקן)
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const APP = process.env.APP_DIR || new URL('../app', import.meta.url).pathname;
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USERS = { tA: { id: A, email: 'alice@x.io', user_metadata: { name: 'Alice', tos_v: '2026-10-01', age_bracket: '18+' } },
                tB: { id: B, email: 'bob@x.io', user_metadata: { tos_v: '2026-10-01', age_bracket: '13-17' } } };
const S = { userFail: false, profiles: [], signupConfirm: false };
const srv = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
  const u = new URL(q.url, 'http://x'), p = u.pathname, tok = String(q.headers.authorization || '').replace(/^Bearer /, '');
  const send = (c, o) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(o === undefined ? '' : JSON.stringify(o)); };
  const me = USERS[tok];
  if (p === '/auth/v1/signup') {
    if (S.signupConfirm) return send(200, { id: B, email: 'bob@x.io', user_metadata: USERS.tB.user_metadata });   // צריך אישור במייל — בלי אסימון
    return send(200, { access_token: 'tB', refresh_token: 'rB', expires_in: 3600, user: USERS.tB });
  }
  if (p === '/auth/v1/token') return send(200, { access_token: 'tA', refresh_token: 'rA', expires_in: 3600, user: USERS.tA });
  if (p === '/auth/v1/logout') return send(204);
  if (p === '/auth/v1/user') { if (S.userFail && tok === 'tB') return send(503, { message: 'upstream' }); if (q.method === 'PUT') { const d = JSON.parse(b).data || {}; Object.assign(me.user_metadata, d); } return me ? send(200, me) : send(401, { message: 'jwt' }); }
  if (p === '/rest/v1/bb_team_members') return send(200, me && me.id === A ? [{ team_id: 't1', uid: A, label: 'Alice' }] : []);
  if (p === '/rest/v1/bb_teams') return send(200, [{ id: 't1', code: 'ALICE1', name: 'Alice team', num: '9662', owner: A }]);
  if (p === '/rest/v1/bb_profiles' && q.method === 'GET') return send(200, S.profiles.filter(x => me && x.owner === me.id));
  if (p === '/rest/v1/bb_profiles' && q.method === 'POST') { for (const x of JSON.parse(b)) S.profiles.push(Object.assign({ owner: me.id }, x)); return send(201); }
  if (p === '/rest/v1/bb_matches') return send(q.method === 'GET' ? 200 : 201, q.method === 'GET' ? [] : undefined);
  if (p.startsWith('/rest/v1/rpc/')) return send(200, null);
  send(404, { message: 'no route ' + p });
}); });
await new Promise(res => srv.listen(0, '127.0.0.1', res));
process.env.BIOBUZZ_CLOUD_URL = 'http://127.0.0.1:' + srv.address().port; process.env.BIOBUZZ_CLOUD_KEY = 'anon';
const { Store } = require(path.join(APP, 'store.js'));
const { Sync } = require(path.join(APP, 'sync.js'));
const META = { tos_v: '2026-10-01', age_bracket: '13-17', guardian_ok: true };
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bbacct-')); const st = new Store(d); const y = new Sync(st, d, { tosNeed: '2026-10-01' }); return { d, st, y }; };

console.log('APP_DIR=' + APP);
// 1. מחוברים כ-A, ״＋ ✉ עם מייל״ (מה ש-appAddDriver(name,true) שולח: local=false) — הנהג החדש נרשם על A, בלי לשאול
{ const { st, y } = fresh();
  await y.signIn('alice@x.io', 'pw'); await y.syncNow();
  const p = st.addProfile('בוב', { local: false });   // bb:profileAdd(name,,,!withMail)
  ok(p.owner === A, '[סיבה 1] נהג ״עם מייל״ שנוצר כשמחוברים מקבל owner של החשבון הקיים (' + (p.owner === A ? 'A' : p.owner) + ')');
}
// 2. מחוברים כ-A, ויוצרים חשבון חדש B (Supabase בלי אישור מייל — מחזיר אסימון) — מה B יורש מ-A
{ const { st, y } = fresh();
  await y.signIn('alice@x.io', 'pw'); await y.syncNow();
  ok(y.status().team && y.status().team.code === 'ALICE1', 'A בקבוצה ALICE1');
  const r = await y.signUp('bob@x.io', 'pw123456', META);
  const s = y.status();
  ok(r.ok && s.email === 'bob@x.io', 'אחרי ההרשמה המייל הוא של B');
  ok(s.name !== 'Alice', '[סיבה 2] השם של B לא ירש את השם של A (יצא: ' + s.name + ')');
  ok(!s.team, '[סיבה 3] B לא רואה את הקבוצה של A לפני הסנכרון (יצא: ' + (s.team && s.team.code) + ')');
  // namePull נכשל (שרת עמוס / אין רשת לרגע) — הכשל נבלע ב-_sync, והשם/הקבוצה של A נשארים אצל B
  S.userFail = true; await y.syncNow(); S.userFail = false;
  ok(y.status().name !== 'Alice', '[סיבה 2] גם אחרי סנכרון שבו /auth/v1/user נכשל — השם לא של A (יצא: ' + y.status().name + ')');
}
// 3. ירושת הסכמה לתנאים: A אישר, B (חשבון ישן בלי tos_v) מתחבר — tosWait לא עוצר את B
{ const { y } = fresh();
  await y.signIn('alice@x.io', 'pw');
  delete USERS.tB.user_metadata.tos_v; delete USERS.tB.user_metadata.age_bracket;
  const r = await y.signUp('bob@x.io', 'pw123456', META);   // השרת מחזיר משתמש בלי tos_v (כמו חשבון מלפני 1.14)
  ok(y.status().tos !== '2026-10-01', '[סיבה 2] B לא יורש את ההסכמה של A (tos=' + y.status().tos + ', tosWait=' + y.status().tosWait + ')');
  USERS.tB.user_metadata.tos_v = '2026-10-01'; USERS.tB.user_metadata.age_bracket = '13-17';
}
// 4. התנתקות מ-A ואז ״＋ ✉ עם מייל״ והרשמה של B — הנהג לא נתפס לאף חשבון (acctSeen כבר true)
{ const { st, y } = fresh(); S.profiles = [];   // B חדש באמת — אין לו נהגים בענן
  await y.signIn('alice@x.io', 'pw'); await y.syncNow();
  await y.signOut();
  ok(st.vis().some(p => p.owner === A) && st.active().owner === A, '[סיבה 4] אחרי התנתקות: הנהגים של A גלויים והנהג הפעיל הוא של A (משחקים נרשמים אליו)');
  const p = st.addProfile('בוב', { local: false });
  await y.signUp('bob@x.io', 'pw123456', META); const rs = await y.syncNow(); if (!rs.ok) console.log('    (sync:', rs.why, ')');
  const q = st.meta.list.find(x => x.id === p.id);
  ok(q && q.owner === B, '[סיבה 4] הנהג ״עם מייל״ שנוצר לפני ההרשמה שייך ל-B אחרי הסנכרון (owner=' + (q && q.owner) + ')');
}
// 5. Supabase עם אישור מייל (ברירת המחדל): ההרשמה לא מחליפה חשבון — A נשאר מחובר, וה-UI לא אומר את זה
{ const { y } = fresh();
  await y.signIn('alice@x.io', 'pw'); S.signupConfirm = true;
  const r = await y.signUp('bob@x.io', 'pw123456', META); S.signupConfirm = false;
  ok(r.confirm && y.status().email === 'alice@x.io', '[מידע] הרשמה עם אישור מייל — עדיין מחוברים כ-A (' + y.status().email + ')');
}
srv.close();
console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
