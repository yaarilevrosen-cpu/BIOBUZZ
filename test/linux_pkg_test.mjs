// v59 — האפליקציה הארוזה ללינוקס עולה ועובדת (release/linux-unpacked)
// 1.12.5: ה-fuse של ‎--inspect כבוי (P10), ולכן playwright לא יכול להפעיל אותה כ-electron —
// מפעילים את הקובץ עם ‎--remote-debugging-port (של Chromium, רק הדף) ומתחברים ב-CDP
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BIN=path.resolve(HERE,'../app/release/linux-unpacked/biobuzz');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bblx-'));
ok(fs.existsSync(BIN),'יש קובץ הרצה ארוז ללינוקס');
const t0=Date.now();
const CDP=9361, INSP=9362;
const proc=spawn(BIN,['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+CDP,'--inspect=127.0.0.1:'+INSP],
  {env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none'},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let br=null; while(!br&&Date.now()-t0<120000){ try{ br=await chromium.connectOverCDP('http://127.0.0.1:'+CDP); }catch(e){ await sleep(500); } }
ok(!!br,'מתחברים לדף (CDP)');
let win=null; while(!win&&Date.now()-t0<150000){ for(const c of br.contexts()) for(const pg of c.pages()) if(/index\.html/.test(pg.url())) win=pg; if(!win) await sleep(500); }
const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:180000});
const secs=((Date.now()-t0)/1000).toFixed(1);
const E=f=>win.evaluate(f);
const VER=JSON.parse(fs.readFileSync(path.resolve(HERE,'../app/package.json'),'utf8')).version;
ok(await E(()=>window.bbApp.version)===VER,'גרסה '+VER);
ok(/Linux/.test(await E(()=>navigator.platform)),'רץ על לינוקס');
{ let insp=false; try{ const r=await fetch('http://127.0.0.1:'+INSP+'/json/version'); insp=r.ok; }catch(e){}
  ok(!insp,'P10: ‎--inspect לא פותח דיבאגר בתהליך הראשי (fuse כבוי)'); }
ok(await E(()=>document.documentElement.classList.contains('app')&&!!window.bbApp),'מצב אפליקציה (bbApp קיים)');
ok(await E(()=>window.__sim.BOTS.length===3),'הזירה עלתה עם שלושה בוטים');
await E(()=>{ const w=document.getElementById('welcome'); if(w) w.hidden=true; });
await win.waitForTimeout(1500);
await win.screenshot({path:'linux_app.png'});
const on=()=>E(()=>[...document.querySelectorAll('#appNav [data-nav].on')].map(b=>b.dataset.nav).join());
await win.keyboard.press('Meta+Digit4'); ok(await on()==='stats','⌘4 (מק) — סטטיסטיקות');
await win.keyboard.press('Control+Digit1'); ok(await on()==='home','Ctrl+1 — בית');
fs.writeFileSync(DATA+'/probe','x');
ok(fs.readdirSync(DATA).some(f=>/profiles|store/.test(f)),'הנתונים נכתבים לדיסק');
{ const a=await E(async()=>{ const s=await bbApp.aiStatus(); const d=await bbApp.aiDrills(); return {files:s.files, n:d.length}; });
  ok(a.files&&a.n===15,'v60: קבצי ai/ (הוראות ותרגילים) נארזו ונמצאים ('+a.n+' תרגילים)'); }
ok(errs.length===0,'בלי שגיאות בדף'+(errs.length?': '+errs[0]:''));
console.log('זמן עלייה: '+secs+' שניות');
await br.close(); proc.kill(); done();
