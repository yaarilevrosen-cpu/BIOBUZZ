// v55 — ממשק האפליקציה: ניווט, דפים, חשבון אישי ונהג אישי
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bbsh-'));
const app=await electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_SIM:path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html'),BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none'}});
const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
const E=f=>win.evaluate(f);
await E(()=>{ document.getElementById('welcome').hidden=true; });
ok(await E(()=>getComputedStyle(document.getElementById('appNav')).display==='flex'&&document.querySelectorAll('#appNav [data-nav]').length===7),'סרגל ניווט: בית, משחק, מעבדה, סטטיסטיקות, נהגים, הגדרות + הנהג');
ok(await E(()=>!document.getElementById('appPage').hidden&&document.getElementById('appPage').className==='ap-home'&&/טוב/.test(document.querySelector('.hmHero h1').textContent)),'פותחים בדף הבית עם ברכה');
ok(await E(()=>getComputedStyle(document.getElementById('uiMode')).display==='none'),'מתג משחק/בדיקות של האתר מוסתר (הסרגל מחליף אותו)');
ok(await E(()=>getComputedStyle(document.querySelector('header')).webkitAppRegion==='drag'),'הכותרת היא ידית החלון');
const nav=k=>win.evaluate(k=>document.querySelector('#appNav [data-nav="'+k+'"]:not(.navMe)').click(),k);
const on=()=>E(()=>[...document.querySelectorAll('#appNav [data-nav].on')].map(b=>b.dataset.nav).join());
await nav('play'); ok(await E(()=>document.getElementById('appPage').hidden&&document.body.classList.contains('play'))&&await on()==='play','״משחק״ — הזירה במצב משחק, ומסומן');
await nav('lab'); ok(await E(()=>document.body.classList.contains('lab'))&&await on()==='lab','״מעבדה״ — מצב בדיקות');
await nav('stats'); ok(await E(()=>!!document.querySelector('#apStats #stOut'))&&await on()==='stats','״סטטיסטיקות״ — דף מלא');
await nav('drivers'); ok(await E(()=>document.querySelectorAll('#drvGrid .drv').length===2),'״נהגים״ — כרטיס לנהג + כרטיס ״נהג חדש״');
await E(()=>{ document.getElementById('drvName').value='נועה'; document.getElementById('drvAdd').click(); }); await win.waitForTimeout(700);
ok(await E(()=>document.querySelectorAll('#drvGrid .drv').length===3),'הוספת נהג מהדף');
// העברת נועה לחשבון האישי
await E(()=>{ const b=[...document.querySelectorAll('#drvGrid [data-pfacct]')].find(x=>x.closest('.drv').textContent.includes('נועה')); b.click(); }); await win.waitForTimeout(800);
ok(await E(()=>[...document.querySelectorAll('#drvGrid .drv')].find(x=>x.textContent.includes('נועה')).querySelector('.drvAcct').textContent.includes('אישי')),'״העבר לאישי״ — נועה מסומנת 👤 אישי');
const pj=JSON.parse(fs.readFileSync(path.join(DATA,'profiles.json'),'utf8'));
ok(pj.list.find(p=>p.name==='נועה').acct==='personal'&&pj.tombs.some(t=>t.acct==='team'),'נשמר: acct=personal ומצבה לחשבון הקבוצה');
await nav('settings'); ok(await E(()=>/חשבון הקבוצה/.test(document.getElementById('spAcct').textContent)&&/חשבון אישי/.test(document.getElementById('spAcct').textContent)&&!!document.querySelector('#spVer [data-upd="check"]')),'״הגדרות״ — שני חשבונות, עדכונים, נתונים');
// ההגדרה ״מה מוצג על המסך״ עובדת
await E(()=>{ const c=document.querySelector('[data-sphud="mag"]'); c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})); });
ok(await E(()=>document.body.classList.contains('hud-mag')),'הסתרת המחסנית מדף ההגדרות');
await E(()=>{ const c=document.querySelector('[data-sphud="mag"]'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); });
// חלון חשבון — בחירת סוג
await E(()=>document.querySelector('#spAcct [data-acc="open"][data-k="personal"]').click());
ok(await E(()=>!document.getElementById('acctModal').hidden&&document.getElementById('acT').textContent==='חשבון אישי'&&document.querySelector('#acKind [data-kind="personal"]').classList.contains('on')),'״התחבר״ ליד החשבון האישי — החלון נפתח על ״חשבון אישי״');
await E(()=>document.querySelector('#acKind [data-kind="team"]').click());
ok(await E(()=>document.getElementById('acT').textContent==='חשבון הקבוצה'),'מעבר ל״חשבון הקבוצה״ בחלון');
await E(()=>document.getElementById('acClose').click());
// קיצורי מקשים
await win.keyboard.press('Control+Digit1'); ok(await on()==='home','Ctrl+1 — בית');
await win.keyboard.press('Control+Digit4'); ok(await on()==='stats','Ctrl+4 — סטטיסטיקות');
await win.keyboard.press('Escape'); ok(await E(()=>document.getElementById('appPage').hidden),'Esc — חוזרים לזירה');
// ״הסטטיסטיקות שלי״ בלוח המשחק פותח את הדף
await nav('play'); await E(()=>document.getElementById('ppStats').click());
ok(await on()==='stats'&&await E(()=>document.getElementById('playModal').hidden),'״📊 הסטטיסטיקות שלי״ — פותח את הדף (לא חלון קופץ)');
ok(errs.length===0,'אין שגיאות '+errs.slice(0,2).join(' | '));
await app.close(); fs.rmSync(DATA,{recursive:true,force:true});
done('app_shell_test'); process.exit(0);
