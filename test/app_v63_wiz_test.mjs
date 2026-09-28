// v63 — אשף הגדרה אישית באפליקציה: מסך הפתיחה הוא הצעד הראשון, ואז אותו אשף (בלי מסך פתיחה שני)
import { _electron as electron } from 'playwright';
import fs from 'fs'; import path from 'path'; import os from 'os'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
import {ok,done} from './h.mjs';
const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bbwiz-'));
const SHOTS='/tmp/claude-0/wiz-shots'; fs.mkdirSync(SHOTS,{recursive:true});
const launch=async()=>{
  const app=await electron.launch({executablePath:APPDIR+'/node_modules/electron/dist/electron',
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
    env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1'}, timeout:90000});
  const win=await app.firstWindow();
  const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
  await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
  return {app,win,errs};
};
const J=f=>JSON.parse(fs.readFileSync(path.join(DATA,f),'utf8'));
let {app,win,errs}=await launch();
await win.setViewportSize({width:1280,height:800}).catch(()=>{});
ok(await win.evaluate(()=>!document.getElementById('welcome').hidden),'פתיחה ראשונה: מסך הפתיחה');
await win.waitForTimeout(1500);
ok(await win.evaluate(()=>!__sim.WZ.on&&document.getElementById('wzChip').hidden),'במצב בדיקות (BIOBUZZ_TEST) — האשף לא נפתח לבד');
/* מה שקורה אצל משתמש אמיתי בפתיחה ראשונה */
await win.evaluate(()=>__sim.wzWelcomeHook());
ok(await win.evaluate(()=>document.querySelectorAll('#welcome .wcDots i').length===6&&document.getElementById('wcGo').textContent==='המשך'),'מסך הפתיחה = צעד 1 מתוך 6 (״המשך״)');
await win.screenshot({path:SHOTS+'/app_0_welcome.png'});
await win.fill('#wcName','מאיה');
await win.evaluate(()=>document.querySelector('#wcEmo [data-wce="🚀"]').click());
await win.evaluate(()=>document.querySelector('#wcGo').click());
await win.waitForFunction(()=>__sim.WZ.on,null,{timeout:5000,polling:100}).catch(()=>{});
ok(await win.evaluate(()=>__sim.WZ.on&&document.getElementById('welcome').hidden),'אחרי ״המשך״ — האשף ממשיך, מסך הפתיחה נסגר');
ok(await win.evaluate(()=>JSON.stringify(__sim.WZ.steps))==='["gfx","you","ctl","exp","done"]','באפליקציה — בלי צעד שפה (כבר במסך הפתיחה)');
ok(await win.evaluate(()=>document.querySelectorAll('#wzDots i').length===6&&document.querySelectorAll('#wzDots i.done').length===1),'הנקודות ממשיכות: צעד 2 מתוך 6');
await win.waitForFunction(()=>!__sim.WZ.meas,null,{timeout:8000,polling:100}).catch(()=>{});
await win.evaluate(()=>__sim.wzGo(1));
ok(await win.evaluate(()=>document.getElementById('wzName').value==='מאיה'&&/🚀/.test(document.getElementById('wzMeEmo').textContent)),'בצעד ״מי נוהג״ — השם והסמל מהפתיחה');
ok(await win.evaluate(()=>document.querySelectorAll('#wizard .wzCol button').length===8),'באפליקציה — גם צבע לנהג');
await win.click('#wizard [data-wz="col:#4C9AF5"]');
await win.click('#wizard [data-wz="emo:🦊"]');
await win.screenshot({path:SHOTS+'/app_2_you.png'});
await win.click('#wzNext');
await win.waitForTimeout(500);
const p=J('profiles.json').list[0];
ok(p.color==='#4C9AF5'&&p.emoji==='🦊'&&p.name==='מאיה','הנהג באפליקציה עודכן: צבע, סמל, שם ('+p.color+' '+p.emoji+')');
ok(await win.evaluate(()=>/🦊/.test(document.getElementById('profChip').textContent)),'שבב הנהג בכותרת התעדכן');
await win.evaluate(()=>__sim.wzGo(4));
await win.click('#wzNext');
await win.waitForTimeout(1500);
const pid=J('profiles.json').active;
const st=J('profiles/'+pid+'/store.json');
const w=JSON.parse(st.bbWizard1||'null');
ok(w&&w.done===true&&w.v===1,'bbWizard1 נשמר בדיסק של הנהג');
ok(await win.evaluate(()=>!__sim.WZ.on),'האשף נסגר');
ok(await win.evaluate(()=>__sim.TOUR.on),'״להראות סיור קצר בסוף״ (ברירת מחדל למשתמש חדש) — הסיור מתחיל');
await win.screenshot({path:SHOTS+'/app_3_tour.png'});
await win.evaluate(()=>__sim.tourEnd());
/* פתיחה מחדש מדף ההגדרות */
await win.evaluate(()=>document.querySelector('#appNav [data-nav="settings"]').click());
await win.waitForTimeout(400);
ok(await win.evaluate(()=>{ const b=document.querySelector('#appPage #apSet [data-wiz]'); return !!b&&b.offsetParent!==null; }),'בדף ההגדרות של האפליקציה יש ״הגדרה אישית מחדש״');
await win.click('#appPage #apSet [data-wiz]');
ok(await win.evaluate(()=>__sim.WZ.on&&__sim.WZ.steps[0]==='lang'),'״הגדרה אישית מחדש״ בדף ההגדרות — אשף מלא (עם שפה)');
await win.keyboard.press('Escape');
ok(await win.evaluate(()=>!__sim.WZ.on),'Esc סוגר');
ok(errs.length===0,'בלי שגיאות: '+errs.slice(0,3).join(' | '));
await app.close();
fs.rmSync(DATA,{recursive:true,force:true});
done('app_v63_wiz');
