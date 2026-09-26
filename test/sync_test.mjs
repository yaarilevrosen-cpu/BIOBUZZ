// v54 — סנכרון בין מחשבים מול Supabase האמיתי (חשבונות בדיקה). דורש BB_TEST_EMAIL / BB_TEST_PASS (+ BB_TEST_EMAIL2)
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
{ const {y}=mk(); const r=await y.signIn(E,PW); ok(r.ok,'התחברות לחשבון הבדיקה '+(r.why||''));
  await y.rest('DELETE','bb_matches?profile_id=neq.__none',undefined,{Prefer:'return=minimal'});
  await y.rest('DELETE','bb_profiles?id=neq.__none',undefined,{Prefer:'return=minimal'});
  const {data}=await y.rest('GET','bb_profiles?select=id'); ok(data.length===0,'החשבון נוקה'); }
// מחשב א׳
const A=mk();
A.s.updateProfile(A.s.meta.active,{name:'יערי',emoji:'🚀'});
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
ok(B.s.meta.list.length===2&&B.s.meta.list.some(p=>p.name==='יערי'&&p.emoji==='🚀')&&B.s.meta.list.some(p=>p.name==='שחר'),'ב׳: יערי ושחר הגיעו, הנהג הריק נעלם');
ok(JSON.parse(B.s.kvOf(pA).biobuzz_params_v1||'{}').wheelD===120,'ב׳: ההגדרות של יערי (קוטר 120) הגיעו');
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
if(E2){ const C=mk(); const q=await C.y.signIn(E2,PW); const {data}=await C.y.rest('GET','bb_profiles?select=id'); ok(q.ok&&data.length===0,'חשבון אחר לא רואה את הנתונים'); }
// אסימון נשמר ומחזיק אחרי ״הפעלה מחדש״
const A2=new (require(path.resolve(HERE,'../app/sync.js')).Sync)(A.s,A.d);
ok(A2.status().loggedIn&&A2.status().email===E,'אחרי הפעלה מחדש: עדיין מחוברים');
A2.sess.expires_at=0; r=await A2.syncNow(); ok(r.ok,'רענון אסימון שפג תוקפו עובד');
// שגיאות בעברית
const X=mk(); r=await X.y.signIn(E,'wrong-pass'); ok(!r.ok&&/לא נכונים/.test(r.why),'סיסמה שגויה: '+r.why);
r=await A.y.signOut(); ok(!A.y.status().loggedIn,'התנתקות');
for(const x of [A,B,X]) fs.rmSync(x.d,{recursive:true,force:true});
done('sync_test');
