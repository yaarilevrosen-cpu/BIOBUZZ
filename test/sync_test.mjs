// v54/v57 — סנכרון בין מחשבים מול Supabase האמיתי (חשבונות בדיקה). דורש BB_TEST_EMAIL / BB_TEST_PASS (+ BB_TEST_EMAIL2)
import fs from 'fs'; import os from 'os'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const { Store } = require(path.resolve(HERE,'../app/store.js'));
const { Sync } = require(path.resolve(HERE,'../app/sync.js'));
const E=process.env.BB_TEST_EMAIL, PW=process.env.BB_TEST_PASS, E2=process.env.BB_TEST_EMAIL2;
if(!E||!PW){ console.log('sync_test: אין חשבון בדיקה (BB_TEST_EMAIL) — מדלג'); process.exit(0); }
const mk=()=>{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbsync-')); const s=new Store(d); return {d,s,y:new Sync(s,d)}; };
// ניקוי החשבון בענן
{ const {y}=mk(); const r=await y.signIn(E,PW); ok(r.ok,'התחברות לחשבון הבדיקה '+(r.why||'')); await y.rpc('bb_team_leave');
  if(E2){ const z=mk().y; await z.signIn(E2,PW); await z.rpc('bb_team_leave'); }
  await y.rest('DELETE','bb_matches?profile_id=neq.__none',undefined,{Prefer:'return=minimal'});
  await y.rest('DELETE','bb_profiles?id=neq.__none',undefined,{Prefer:'return=minimal'});
  const {data}=await y.rest('GET','bb_profiles?select=id'); ok(data.length===0,'החשבון נוקה'); }
// מחשב א׳
const A=mk();
A.s.updateProfile(A.s.meta.active,{name:'מאיה',emoji:'🚀'});
A.s.kvSet('biobuzz_params_v1',JSON.stringify({wheelD:120})); A.s.kvSet('bbUiMode1','lab'); A.s.flushKv();
const pA=A.s.meta.active;
for(let i=0;i<3;i++) A.s.addMatch({at:1000+i,my:30+i,opp:20,win:1,shots:5,hits:3});
const shachar=A.s.addProfile('שחר',{emoji:'🦊'});
A.s.addMatch({at:5000,my:10,opp:40,win:-1},shachar.id);
let r=await A.y.signIn(E,PW); r=await A.y.syncNow();
ok(r.ok&&r.pushedProfiles===2&&r.pushedMatches===4,'א׳ העלה 2 נהגים ו-4 מאצ׳ים '+JSON.stringify(r));
// מחשב ב׳ — התקנה חדשה
const B=mk();
ok(B.s.meta.list.length===1&&B.s.isBlank(B.s.meta.active),'ב׳: התקנה חדשה עם נהג ריק');
await B.y.signIn(E,PW); r=await B.y.syncNow();
ok(r.ok&&r.changedActive,'ב׳ סונכרן והנהג הפעיל התחלף '+JSON.stringify(r));
ok(B.s.meta.list.length===2&&B.s.meta.list.some(p=>p.name==='מאיה'&&p.emoji==='🚀')&&B.s.meta.list.some(p=>p.name==='שחר'),'ב׳: מאיה ושחר הגיעו, הנהג הריק נעלם');
ok(JSON.parse(B.s.kvOf(pA).biobuzz_params_v1||'{}').wheelD===120,'ב׳: ההגדרות של מאיה (קוטר 120) הגיעו');
ok(B.s.kvOf(pA).bbUiMode1===undefined,'מפתח מקומי (מצב מסך) לא עבר');
ok(B.s.matches(pA).length===3&&B.s.matches(shachar.id).length===1,'ב׳: כל המאצ׳ים הגיעו');
// שינוי ב-ב׳ → א׳
B.s.switchTo(pA); await new Promise(r=>setTimeout(r,5));
B.s.kvSet('biobuzz_params_v1',JSON.stringify({wheelD:140})); B.s.flushKv();
B.s.addMatch({at:9000,my:77,opp:10,win:1});
B.s.updateProfile(shachar.id,{name:'שחר לוי'});
r=await B.y.syncNow(); ok(r.ok,'ב׳ העלה שינויים');
r=await A.y.syncNow();
ok(r.ok&&r.changedActive&&JSON.parse(A.s.kvAll().biobuzz_params_v1).wheelD===140,'א׳ קיבל את השינוי (140) — והנהג הפעיל סומן להטענה מחדש');
ok(A.s.kvAll().bbUiMode1==='lab','א׳ שמר את המפתח המקומי שלו');
ok(A.s.matches(pA).length===4&&A.s.meta.list.find(p=>p.id===shachar.id).name==='שחר לוי','א׳ קיבל את המאץ׳ החדש ואת השם החדש');
// מאצ׳ים בשני המחשבים בלי חיבור → איחוד
A.s.addMatch({at:11000,my:1,opp:2,win:-1},pA); B.s.addMatch({at:12000,my:3,opp:2,win:1},pA);
await A.y.syncNow(); await B.y.syncNow(); await A.y.syncNow();
ok(A.s.matches(pA).length===6&&B.s.matches(pA).length===6,'איחוד מאצ׳ים משני המחשבים: 6 ו-6');
// מחיקה
A.s.removeProfile(shachar.id); r=await A.y.syncNow(); r=await B.y.syncNow();
ok(!B.s.meta.list.some(p=>p.id===shachar.id)&&fs.existsSync(path.join(B.d,'trash')),'מחיקת שחר ב-א׳ הגיעה ל-ב׳ (לסל)');
// בידוד בין חשבונות
if(E2){ const C=mk(); const q=await C.y.signIn(E2,PW); const {data}=await C.y.rest('GET','bb_profiles?select=id'); const mineIds=new Set(A.s.meta.list.map(p=>p.id).concat([shachar.id])); ok(q.ok&&!data.some(r=>mineIds.has(r.id)),'חשבון אחר לא רואה את הנתונים'); }
// ── v57: קבוצה בקוד הצטרפות — כל אחד עם החשבון שלו, והקבוצה רואה את כולם ──
if(E2){
  { const {y}=mk(); await y.signIn(E2,PW); await y.rest('DELETE','bb_matches?profile_id=neq.__none',undefined,{Prefer:'return=minimal'}); await y.rest('DELETE','bb_profiles?id=neq.__none',undefined,{Prefer:'return=minimal'}); }
  let q=await A.y.teamCall('create','Test Lions','12345');
  const code=q.team&&q.team.code;
  ok(q.ok&&/^[A-Z0-9]{6}$/.test(code||'')&&q.team.owner&&q.team.members===1,'א׳ יצר קבוצה — קוד '+code);
  const C=mk(); C.s.updateProfile(C.s.meta.active,{name:'נועה',emoji:'🦅'}); C.s.addMatch({at:31000,my:50,opp:10,win:1,shots:4,hits:4}); C.s.addMatch({at:32000,my:20,opp:30,win:-1});
  await C.y.signIn(E2,PW);
  q=await C.y.teamCall('join','nope42'); ok(!q.ok&&/אין קבוצה/.test(q.why),'קוד שגוי: '+q.why);
  q=await C.y.teamCall('join',code.toLowerCase()); ok(q.ok&&q.team.members===2&&!q.team.owner,'ג׳ הצטרף עם הקוד (גם באותיות קטנות)');
  q=await C.y.syncNow(); ok(q.ok&&q.pushedProfiles===1&&q.pushedMatches===2,'ג׳ העלה את הנהג שלו');
  ok(C.s.meta.list.length===1&&C.s.meta.list[0].name==='נועה','הנהגים של א׳ לא נכנסו לחשבון של ג׳ (רק לקריאה בטבלה)');
  q=await A.y.syncNow(); ok(q.ok&&q.team&&q.team.members===2,'א׳ רואה 2 חברים');
  const tm=A.s.team(A.y.team); const noa=tm.find(t=>t.remote&&t.name==='נועה');
  ok(noa&&noa.sum.n===2&&noa.sum.W===1&&noa.who,'בטבלת הקבוצה של א׳: נועה עם 2 משחקים ('+(noa&&noa.who)+')');
  ok(!A.s.meta.list.some(p=>p.name==='נועה'),'נועה לא נכנסה לרשימת הנהגים של א׳');
  C.s.addMatch({at:33000,my:70,opp:10,win:1}); await C.y.syncNow(); q=await A.y.syncNow();
  ok(A.s.team(A.y.team).find(t=>t.remote&&t.name==='נועה').sum.n===3,'משחק חדש של נועה הגיע לטבלה של א׳ (משיכה מצטברת)');
  { const {data}=await A.y.rest('GET','bb_profiles?select=id&'+A.y.own()); ok(!data.some(r=>r.id===C.s.meta.active),'השאילתות של א׳ על הנהגים שלו לא כוללות את של ג׳'); }
  q=await C.y.teamCall('leave'); ok(q.ok&&!q.team,'ג׳ עזב את הקבוצה');
  q=await A.y.syncNow(); ok(!A.s.team(A.y.team).some(t=>t.remote),'אחרי שעזב — נעלם מהטבלה של א׳');
  q=await A.y.teamCall('leave'); ok(q.ok&&!A.y.status().team,'א׳ עזב — אין קבוצה');
  fs.rmSync(C.d,{recursive:true,force:true});
}
// מעבר מגרסה 1.3: שני חשבונות → אחד (הקבוצה נשאר)
{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbmig-')); const b=x=>JSON.stringify({blob:Buffer.from(JSON.stringify({access_token:x,refresh_token:'r',expires_at:Date.now()+1e6,user:{id:'u',email:x+'@x.dev'}})).toString('base64')});
  fs.writeFileSync(path.join(d,'account-team.json'),b('team')); fs.writeFileSync(path.join(d,'account-personal.json'),b('me'));
  const y=new Sync(new Store(d),d);
  ok(y.status().email==='team@x.dev'&&fs.existsSync(path.join(d,'account.json'))&&fs.existsSync(path.join(d,'account-personal.old.json'))&&y.migrated==='personal-dropped','מעבר: חשבון הקבוצה נשאר, האישי נשמר בצד');
  const d2=fs.mkdtempSync(path.join(os.tmpdir(),'bbmig-')); fs.writeFileSync(path.join(d2,'account-personal.json'),b('me'));
  ok(new Sync(new Store(d2),d2).status().email==='me@x.dev','מעבר: רק אישי → הוא החשבון');
  fs.rmSync(d,{recursive:true,force:true}); fs.rmSync(d2,{recursive:true,force:true}); }
// אסימון נשמר ומחזיק אחרי ״הפעלה מחדש״
const A2=new (require(path.resolve(HERE,'../app/sync.js')).Sync)(A.s,A.d);
ok(A2.status().loggedIn&&A2.status().email===E,'אחרי הפעלה מחדש: עדיין מחוברים');
A2.sess.expires_at=0; r=await A2.syncNow(); ok(r.ok,'רענון אסימון שפג תוקפו עובד');
// שגיאות בעברית
const X=mk(); r=await X.y.signIn(E,'wrong-pass'); ok(!r.ok&&/לא נכונים/.test(r.why),'סיסמה שגויה: '+r.why);
r=await A.y.signOut(); ok(!A.y.status().loggedIn,'התנתקות');
for(const x of [A,B,X]) fs.rmSync(x.d,{recursive:true,force:true});
done('sync_test');
