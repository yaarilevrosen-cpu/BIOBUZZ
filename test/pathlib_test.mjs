// v36: מסלולים שמורים עם שמות, העברה בטקסט, וגרירת נקודות בעורך
import {open,ok,done,realErrs} from './h.mjs';
import { chromium } from 'playwright';
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1400,height:860}});
const errs=[];
async function page1(){ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(/^arm/.test(m.text())) console.log('   ',m.text()); });
  await p.goto('http://127.0.0.1:'+(process.env.BB_PORT||8899)+'/sim.html?nocad=1');
  await p.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:60000}); return p; }
let page=await page1();
const E=(f,a)=>page.evaluate(f,a);

// 1. שמירה, ומסלול שני
let r=await E(()=>{ const S=__sim; S.pathClear(); S.homeRobot(); S.pathStartHere(); S.pathAdd(-40,40); S.pathAdd(-20,20); S.pathSetAct(S.PATH.pts.length-1,'shoot');
  const a=S.pathSave('פינה אחורית'); const nA=S.PATH.pts.length;
  S.pathClear(); S.pathStartHere(); S.pathAdd(-45,20); S.pathAdd(40,-40);
  const b=S.pathSave('חציה'); return {a,b,nA,lib:Object.keys(S.pathLib()), cur:S.PATH.cur}; });
ok(r.a&&r.b&&r.lib.length===2,'שני מסלולים נשמרו ('+r.lib.join(', ')+')');
ok(r.cur==='חציה','המסלול הנוכחי הוא האחרון שנשמר');
// 2. טעינה והחלפה
r=await E(()=>{ const S=__sim; S.pathLoad('פינה אחורית'); return {n:S.PATH.pts.filter(p=>!p.auto).length, act:S.PATH.pts.filter(p=>!p.auto)[2].act, cur:S.PATH.cur,
  sel:[...document.getElementById('pathLibSel').options].filter(o=>o.value&&o.value.indexOf('ex:')<0).length}; });
ok(r.n===3&&r.act==='shoot','טעינה מחזירה את הנקודות ואת הפעולות');
ok(r.sel===2,'שני המסלולים ברשימה');
// 3. אחרי פתיחה מחדש — המסלול האחרון עולה לבד
await page.close(); page=await page1();
r=await E(()=>({cur:__sim.PATH.cur, n:__sim.PATH.pts.filter(p=>!p.auto).length, info:document.getElementById('oPath').innerText}));
ok(r.cur==='פינה אחורית'&&r.n===3,'בפתיחה הבאה ״'+r.cur+'״ נטען לבד');
ok(/פינה אחורית/.test(r.info),'שם המסלול מופיע בלוח');
// 4. העתקה כטקסט והחזרה
r=await E(()=>{ const S=__sim; const t=S.pathExportText(); S.pathClear(); const ok1=S.pathImportText(t);
  return {ok1, n:S.PATH.pts.filter(p=>!p.auto).length, t:t.length}; });
ok(r.ok1&&r.n===3,'העתק כטקסט ← ייבא מהטקסט מחזיר את המסלול ('+r.t+' תווים)');
r=await E(()=>{ const S=__sim; const n0=S.PATH.pts.length; const ok2=S.pathImportText('שלום עולם'); return {ok2, same:S.PATH.pts.length===n0, warn:S.PATH.warn}; });
ok(!r.ok2&&r.same&&/לא נראה כמו מסלול/.test(r.warn),'טקסט שבור לא דורס את המסלול');
// 5. מחיקה בשתי לחיצות
await E(()=>{ __sim.setWS('auto'); document.querySelectorAll('details[data-ws=auto]').forEach(d=>d.open=true); });
await page.selectOption('#pathLibSel','חציה');
/* בסביבת הבדיקה פריים לוקח שנייה-שתיים, ולכן שתי לחיצות של פליירייט יכולות להיות רחוקות יותר
   מחלון האישור. הלחיצות כאן נשלחות ישר לכפתור. */
const armed=await E(()=>{ const b=document.getElementById('bPathDel'); b.click(); return b.textContent; });
const keys1=await E(()=>Object.keys(__sim.pathLib()).length);
r=await E(()=>{ document.getElementById('bPathDel').click(); return Object.keys(__sim.pathLib()); });
ok(armed==='בטוח?'&&keys1===2,'לחיצה ראשונה על ״מחק״ רק שואלת');
ok(r.length===1&&r[0]==='פינה אחורית','לחיצה שנייה מוחקת');

// 6. גרירה אמיתית בעכבר
await E(()=>{ const S=__sim; S.setCamView&&S.setCamView('top'); S.pathClear(); S.homeRobot(); S.pathStartHere(); S.pathAdd(-40,40); S.pathAdd(-40,-40);
  document.getElementById('kPath').checked=true; S.PATH.mode=true; });
await page.evaluate(()=>{ window.requestAnimationFrame(()=>{}); });
await page.waitForTimeout(1500);
const scr=(x,z)=>page.evaluate(([x,z])=>{ const S=__sim, c=S.renderer.domElement.getBoundingClientRect();
  S.camera.updateMatrixWorld(); const v=new THREE.Vector3(S.M(x),S.M(1.2),S.M(z)).project(S.camera);
  return {x:c.left+(v.x+1)/2*c.width, y:c.top+(1-v.y)/2*c.height}; },[x,z]);
const before=await E(()=>__sim.PATH.pts.filter(p=>!p.auto).length);
let a=await scr(-40,-40), b=await scr(0,-50);
await page.mouse.move(a.x,a.y); await page.mouse.down(); 
for(let k=1;k<=6;k++){ await page.mouse.move(a.x+(b.x-a.x)*k/6, a.y+(b.y-a.y)*k/6); await page.waitForTimeout(120); }
await page.mouse.up(); await page.waitForTimeout(500);
r=await E(()=>{ const u=__sim.PATH.pts.filter(p=>!p.auto); return {n:u.length, last:u[u.length-1], auto:__sim.PATH.pts.filter(p=>p.auto).length}; });
ok(r.n===before&&Math.abs(r.last.x-0)<5&&Math.abs(r.last.z+50)<5,'גרירה הזיזה את הנקודה ('+r.last.x+', '+r.last.z+') בלי להוסיף נקודה');
// גרירה לתוך מבנה → הצמדה החוצה, ועקיפות מחושבות מחדש
const blk=await E(()=>{ for(let x=-45;x<=45;x+=3) for(let z=-45;z<=45;z+=3) if(__sim.pathBlocked(x,z)&&!__sim.pathBlocked(x+9,z)&&Math.abs(x)>20) return [x,z]; return null; });
a=await scr(r.last.x,r.last.z); b=await scr(blk[0],blk[1]);
await page.mouse.move(a.x,a.y); await page.mouse.down();
for(let k=1;k<=6;k++){ await page.mouse.move(a.x+(b.x-a.x)*k/6, a.y+(b.y-a.y)*k/6); await page.waitForTimeout(120); }
await page.mouse.up(); await page.waitForTimeout(500);
r=await E(()=>{ const u=__sim.PATH.pts.filter(p=>!p.auto); const l=u[u.length-1]; return {l, bl:__sim.pathBlocked(l.x,l.z), warn:__sim.PATH.warn, bad:__sim.PATH.bad}; });
ok(!r.bl,'גרירה לכיוון מבנה משאירה את הנקודה במקום פנוי ('+r.l.x+', '+r.l.z+')');
ok(!r.bad,'אחרי הגרירה המסלול לא נכנס למבנה (עקיפות נבנו מחדש)');
// לחיצה בלי תזוזה עדיין מחליפה פעולה
a=await scr(r.l.x,r.l.z);
await page.mouse.click(a.x,a.y); await page.waitForTimeout(400);
r=await E(()=>{ const u=__sim.PATH.pts.filter(p=>!p.auto); return u[u.length-1].act; });
ok(r==='shoot','לחיצה בלי גרירה מחליפה פעולה ('+r+')');
await page.screenshot({path:'pathlib.png'});
// המסלול שנטען רץ
r=await E(()=>{ const res=__sim.pathRun(); return {done:res.done, why:res.why}; });
ok(r.done,'המסלול אחרי העריכה רץ עד הסוף ('+r.why+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('pathlib_test');
