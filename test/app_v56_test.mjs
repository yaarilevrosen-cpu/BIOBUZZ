// v56 באפליקציה — הקבוצה וההגדרות, דיווח באג דרך האפליקציה, אנגלית עם ניווט משמאל
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bb56-'));
const launch=()=>electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_SIM:path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html'),BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none'}});
let app=await launch(); let win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
let E=f=>win.evaluate(f);
ok(await E(()=>!document.getElementById('welcome').hidden&&!!document.getElementById('wcTeamN')&&!!document.getElementById('wcLang')),'מסך פתיחה: שם קבוצה ומתג שפה');
ok(!/\u05D9\u05E2\u05E8\u05D9|\u05D0\u05E4\u05D5\u05DC\u05D5/.test(await E(()=>document.getElementById('welcome').innerText)),'מסך הפתיחה בלי שם של משתמש או קבוצה קבועים');
await E(()=>{ document.getElementById('wcName').value='נועה'; document.getElementById('wcTeamN').value='Robo Lions'; document.getElementById('wcTeamNum').value='12345'; document.getElementById('wcGo').click(); });
await win.waitForTimeout(600);
ok(await E(()=>document.getElementById('verBadge').textContent==='v56 · Robo Lions 12345'),'הקבוצה מהפתיחה — בתג הגרסה');
await E(()=>document.querySelector('#appNav [data-nav="settings"]').click()); await win.waitForTimeout(400);
let r=await E(()=>({n:document.getElementById('spTeamN').value, u:document.getElementById('spTeamNum').value, lang:!!document.querySelector('#appPage .langBtn'), about:document.getElementById('appPage').innerText}));
ok(r.n==='Robo Lions'&&r.u==='12345'&&r.lang,'בהגדרות: שם, מספר ומתג שפה');
ok(!/\u05D9\u05E2\u05E8\u05D9|\u05D0\u05E4\u05D5\u05DC\u05D5/.test(r.about),'דף ההגדרות בלי שם קבוצה קבוע');
// צילום מסך דרך האפליקציה
const shot=await E(()=>window.bbApp.shot());
ok(/^data:image\/jpeg;base64,/.test(shot)&&shot.length>5000,'צילום מסך של החלון כולו ('+Math.round(shot.length/1024)+' ק״ב)');
// שליחה אמיתית לטבלה (אנונימי — מותר רק להוסיף)
if(process.env.BB_BUG_LIVE){
  r=await E(()=>window.bbApp.bugSend({what:'בדיקה אוטומטית של v56 — להתעלם',ver:'ci',lang:'he',platform:'test',sys:{t:1},errors:[]}));
  ok(r&&r.ok,'דיווח אמיתי נשמר בענן ('+JSON.stringify(r)+')');
  r=await E(()=>window.bbApp.bugSend({what:'x'}));
  ok(r&&!r.ok,'דיווח קצר מדי — השרת דוחה');
}
await E(()=>{ localStorage.setItem('bbLang1','en'); window.bbApp.flush(); });
await app.close();
app=await launch(); win=await app.firstWindow(); win.on('pageerror',e=>errs.push(String(e))); E=f=>win.evaluate(f);
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
await win.waitForTimeout(500);
r=await E(()=>{ const n=document.getElementById('appNav').getBoundingClientRect(); return {lang:document.documentElement.lang, navL:n.left, w:innerWidth, heb:(document.body.innerText.match(/[֐-׿]+/g)||[]).filter(x=>x!=='נועה').slice(0,10), sync:localStorage.getItem('bbLang1')}; });
ok(r.lang==='en'&&r.sync==='en','השפה נשמרה אחרי הפעלה מחדש');
ok(r.navL<5,'באנגלית סרגל הניווט עובר לשמאל (x='+r.navL+')');
ok(r.heb.length<=2,'אין עברית בדף הבית ('+r.heb.join(' ')+')');
await win.screenshot({path:(process.env.BB_SHOTS||os.tmpdir())+'/app-en-home.png'});
await E(()=>document.querySelector('#appNav [data-nav="settings"]').click()); await win.waitForTimeout(500);
await win.screenshot({path:(process.env.BB_SHOTS||os.tmpdir())+'/app-en-settings.png'});
await E(()=>document.querySelector('#appNav [data-nav="play"]').click()); await win.waitForTimeout(300);
await E(()=>window.__sim.tourStart(true)); await win.waitForTimeout(100);
await E(()=>document.getElementById('tourNext').click()); await E(()=>document.getElementById('tourNext').click()); await win.waitForTimeout(500);
r=await E(()=>({t:document.getElementById('tourT').textContent, n:window.__sim.TOUR.steps.length}));
ok(r.n>=7,'בסיור באפליקציה יש גם סטטיסטיקות והגדרות ('+r.n+')');
await win.screenshot({path:(process.env.BB_SHOTS||os.tmpdir())+'/app-en-tour.png'});
ok(errs.length===0,'אין שגיאות: '+errs.join(' | '));
const st=JSON.parse(fs.readFileSync(path.join(DATA,'profiles.json'),'utf8'));
await app.close();
done('app v56'); process.exit(0);
