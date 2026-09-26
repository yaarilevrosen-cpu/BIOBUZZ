// v54 — באפליקציה: התחברות לחשבון, סנכרון בין שני ״מחשבים״, ובדיקת עדכונים
import { _electron as electron } from 'playwright';
import fs from 'fs'; import path from 'path'; import os from 'os'; import http from 'http'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const require=createRequire(import.meta.url);
const APPDIR=path.resolve(HERE,'../app');
const E=process.env.BB_TEST_EMAIL, PW=process.env.BB_TEST_PASS;
// שרת עדכונים מדומה
let tag='v9.9.9';
const srv=http.createServer((q,r)=>{ r.writeHead(200,{'Content-Type':'application/json'}); r.end(JSON.stringify({tag_name:tag,html_url:'https://github.com/yaarilevrosen-cpu/BIOBUZZ/releases/tag/'+tag})); }).listen(8977);
const launch=async(DATA)=>{
  const app=await electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
    env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_UPD_URL:'http://127.0.0.1:8977/latest',BIOBUZZ_SIM:path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html')}, timeout:90000});
  const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
  await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
  return {app,win,errs};
};
const D1=fs.mkdtempSync(path.join(os.tmpdir(),'bbc1-')), D2=fs.mkdtempSync(path.join(os.tmpdir(),'bbc2-'));
let {app,win,errs}=await launch(D1);
// עדכונים
await win.evaluate(()=>document.getElementById('welcome').hidden=true);
await win.evaluate(()=>document.querySelector('#appNav [data-nav="settings"]').click()); await win.waitForTimeout(700);
ok(await win.evaluate(()=>/BIOBUZZ/.test(document.getElementById('spVer').textContent)&&/בדוק עדכונים/.test(document.getElementById('spVer').textContent)),'בהגדרות: גרסה + ״בדוק עדכונים״');
await win.evaluate(()=>document.querySelector('#spVer [data-upd="check"]').click()); await win.waitForTimeout(1200);
let r=await win.evaluate(()=>({v:document.getElementById('spVer').textContent, b:document.getElementById('updBadge').hidden, bt:document.getElementById('updBadge').textContent}));
ok(/9\.9\.9 זמינה/.test(r.v)&&!r.b&&/9\.9\.9/.test(r.bt),'יש גרסה חדשה: 9.9.9 — וכפתור בכותרת ('+r.bt+')');
tag='v1.0.0'; await win.evaluate(()=>document.querySelector('#spVer [data-upd="check"]').click()); await win.waitForTimeout(1200);
r=await win.evaluate(()=>({v:document.getElementById('spVer').textContent, b:document.getElementById('updBadge').hidden}));
ok(/הכי חדשה/.test(r.v)&&r.b,'אין גרסה חדשה: ״זו הגרסה הכי חדשה״');
if(!E){ console.log('app_cloud_test: אין חשבון בדיקה — מדלג על הסנכרון'); await app.close(); srv.close(); done('app_cloud_test'); process.exit(0); }
// ניקוי החשבון
{ const { Store }=require(path.resolve(APPDIR,'store.js')); const { Sync }=require(path.resolve(APPDIR,'sync.js'));
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbcx-')); const y=new Sync(new Store(d),d); await y.signIn(E,PW); await y.rpc('bb_team_leave');
  await y.rest('DELETE','bb_matches?profile_id=neq.__none',undefined,{Prefer:'return=minimal'}); await y.rest('DELETE','bb_profiles?id=neq.__none',undefined,{Prefer:'return=minimal'}); }
ok(await win.evaluate(()=>/לא מחובר/.test(document.getElementById('spAcct').textContent)),'לפני התחברות: ״לא מחובר״');
// נתונים במחשב 1
await win.evaluate(async()=>{ await bbApp.profileUpdate(bbApp.profile.id,{name:'מאיה',emoji:'🚀'}); __sim.bk._set('wheelD',133); });
await win.waitForTimeout(900);
await win.evaluate(()=>document.querySelector('#spAcct [data-acc="open"]').click());
ok(await win.evaluate(()=>!document.getElementById('acctModal').hidden),'חלון ״החשבון שלך״ נפתח');
await win.fill('#acEmail',E); await win.fill('#acPass','wrong-pw');
await win.evaluate(()=>document.getElementById('acIn').click()); await win.waitForTimeout(2500);
ok(await win.evaluate(()=>/לא נכונים/.test(document.getElementById('acMsg').textContent)),'סיסמה שגויה — הודעה בעברית');
await win.fill('#acPass',PW); await win.evaluate(()=>document.getElementById('acIn').click());
await win.waitForFunction(()=>/סונכרן/.test(document.getElementById('spAcct').textContent),null,{timeout:30000});
r=await win.evaluate(()=>document.getElementById('spAcct').textContent);
ok(r.includes(E)&&/סונכרן/.test(r)&&/הקבוצה/.test(r),'מחובר ומסונכרן: '+r.replace(/\s+/g,' ').slice(0,80));
await app.close();
// מחשב 2 — התקנה חדשה, מתחברים מחלון ״ברוכים הבאים״
({app,win,errs}=await launch(D2));
ok(await win.evaluate(()=>!document.getElementById('welcome').hidden),'מחשב 2: ״ברוכים הבאים״');
await win.evaluate(()=>document.getElementById('wcAcct').click());
await win.fill('#acEmail',E); await win.fill('#acPass',PW);
const reload=win.waitForEvent('load',{timeout:60000});
await win.evaluate(()=>document.getElementById('acIn').click());
await reload; await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
r=await win.evaluate(()=>({chip:document.getElementById('profChip').textContent, w:document.getElementById('welcome').hidden, d:__sim.bk._diff().find(x=>x[0]==='wheelD')}));
ok(/מאיה/.test(r.chip)&&/🚀/.test(r.chip),'מחשב 2 קיבל את הנהג: '+r.chip);
ok(r.w,'בלי ״ברוכים הבאים״ אחרי ההתחברות');
ok(r.d&&r.d[2]===133,'מחשב 2 קיבל את ההגדרות (קוטר 133)');
ok(errs.length===0,'אין שגיאות '+errs.slice(0,2).join(' | '));
await app.close(); srv.close();
for(const d of [D1,D2]) fs.rmSync(d,{recursive:true,force:true});
done('app_cloud_test');
process.exit(0);
