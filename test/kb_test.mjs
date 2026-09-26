// v39: מיפוי מקלדת — כמו בשלט
import {ok,done,realErrs} from './h.mjs';
import { chromium } from 'playwright';
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1400,height:860}});
const errs=[];
async function pg(){ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(()=>{ window.requestAnimationFrame=()=>0; });
  await p.goto('http://127.0.0.1:8899/sim.html?nocad=1');
  await p.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:60000});
  await p.evaluate(()=>{ __sim.setWS('drive'); document.querySelectorAll('details').forEach(d=>{ if(d.querySelector('#kbBinds')) d.open=true; }); });
  return p; }
let page=await pg();
const E=(f,a)=>page.evaluate(f,a);
const pos=()=>E(()=>[__sim.I(__sim.botBody.position.x),__sim.I(__sim.botBody.position.z)]);
const drive=async(key,sec)=>{ const a=await pos(); await page.keyboard.down(key); await E(s=>__sim.advance(s,1/120),sec); await page.keyboard.up(key); await E(()=>__sim.advance(0.3,1/120)); const b=await pos(); return Math.hypot(b[0]-a[0],b[1]-a[1]); };
await E(()=>{ __sim.homeRobot(); __sim.stageMatch(); });
await page.mouse.click(700,500);   // מיקוד על הדף

// 1. ברירת מחדל
let d=await drive('w',0.8);
ok(d>10,'ברירת מחדל: W נוסע ('+d.toFixed(0)+'″)');
let r=await E(()=>__sim.state().shots); await page.keyboard.press(' '); let r2=await E(()=>__sim.state().shots);
ok(r2===r+1,'רווח יורה');
r=await E(()=>__sim.intake); await page.keyboard.press('f'); r2=await E(()=>__sim.intake);
ok(r2===!r,'F מחליף חרטום');

// 2. להחליף ״קדימה״ ל-I דרך הממשק
await page.click('#kbBinds .kbm:nth-child(1) .kbk');
r=await E(()=>document.querySelector('#kbBinds .kbm:nth-child(1) .kbk').textContent);
ok(/לחצו? מקש/.test(r),'לחיצה על הכפתור מחכה למקש');
await page.keyboard.press('i');
r=await E(()=>({f:__sim.KB.move.fwd, t:document.querySelector('#kbBinds .kbm:nth-child(1) .kbk').textContent, hint:document.getElementById('keysMap').textContent}));
ok(r.f==='KeyI'&&r.t==='I','קדימה עכשיו I');
ok(/נהיגה I/.test(r.hint),'שורת הרמזים מתעדכנת ('+r.hint.slice(0,30)+')');
await E(()=>{ __sim.homeRobot(); });
d=await drive('i',0.8); ok(d>10,'I נוסע קדימה ('+d.toFixed(0)+'″)');
await E(()=>{ __sim.homeRobot(); });
d=await drive('w',0.8); ok(d<1,'W כבר לא נוסע ('+d.toFixed(1)+'″)');

// 3. החלפה בין מקשי נסיעה
await page.click('#kbBinds .kbm:nth-child(1) .kbk'); await page.keyboard.press('s');
r=await E(()=>__sim.KB.move);
ok(r.fwd==='KeyS'&&r.back==='KeyI','מקש של נסיעה אחרת — מתחלפים ('+r.fwd+'/'+r.back+')');

// 4. מקש שמור לשחקן 2
await page.click('#kbBinds .kbm:nth-child(2) .kbk'); await page.keyboard.press('ArrowUp');
r=await E(()=>({b:__sim.KB.move.back, note:__sim.KB.note}));
ok(r.b==='KeyI'&&/שחקן 2/.test(r.note),'חץ שמור לשחקן 2 — לא נלקח');

// 5. מקש חדש עם פעולה: G = היפוך… ואז ירי בהחזקה
const nb=await E(()=>__sim.KB.binds.length);
await page.click('#kbBinds .row .kbk'); await page.keyboard.press('g');
r=await E(()=>__sim.KB.binds.length);
ok(r===nb+1,'״הוסף מקש״ + G מוסיף שורה');
await page.selectOption('#kbBinds select[data-kact="'+nb+'"]','fire');
await page.click('#kbBinds button[data-kmode="'+nb+'"][data-m="hold"]');
r=await E(()=>__sim.KB.binds[__sim.KB.binds.length-1]);
ok(r.k==='KeyG'&&r.a==='fire'&&r.m==='hold','G = ירי בהחזקה');
await E(()=>{ __sim.stageMatch(); __sim.homeRobot(); __sim.bot.mag=4; __sim.resetCounters(); });
await page.keyboard.down('g'); await E(()=>__sim.advance(2.5,1/120)); await page.keyboard.up('g');
r=await E(()=>__sim.state().shots);
ok(r>=3,'החזקה יורה ברצף בקצב המשגר ('+r+' יריות)');

// 6. מצב דיוק בשיפט שמאלי
await E(()=>{ __sim.homeRobot(); });
const full=await drive('s',0.8);
await E(()=>{ __sim.homeRobot(); });
await page.keyboard.down('Shift'); const slowD=await drive('s',0.8); await page.keyboard.up('Shift');
ok(slowD<full*0.6,'שיפט שמאלי = מצב דיוק ('+slowD.toFixed(0)+'″ מול '+full.toFixed(0)+'″)');

// 7. הקלדה בתיבת טקסט לא מפעילה פעולות
await E(()=>{ __sim.setWS('auto'); document.querySelectorAll('details[data-ws=auto]').forEach(d=>d.open=true); });
r=await E(()=>__sim.intake);
await page.click('#pathOut'); await page.keyboard.type('fff');
r2=await E(()=>__sim.intake);
ok(r===r2,'הקלדה בתיבת טקסט לא מפעילה את החרטום');

// 8. נשמר אחרי פתיחה מחדש, ואיפוס מחזיר
await page.close(); page=await pg();
r=await page.evaluate(()=>({f:__sim.KB.move.fwd, g:__sim.KB.binds.some(b=>b.k==='KeyG'&&b.a==='fire')}));
ok(r.f==='KeyS'&&r.g,'המיפוי נשמר בפתיחה הבאה');
await page.click('#bKbReset');
r=await page.evaluate(()=>({f:__sim.KB.move.fwd, n:__sim.KB.binds.length}));
ok(r.f==='KeyW'&&r.n===8,'״החזר ברירת מחדל״ מחזיר W ושמונה מקשים');
await page.screenshot({path:'kb.png'});
ok(errs.filter(e=>!/WebSocket/.test(e)).length===0,'אין שגיאות: '+errs.slice(0,2).join(' | '));
await browser.close(); done('kb_test');
