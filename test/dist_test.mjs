// הקבצים הבודדים: המלא (עם CAD) והקל (בלי) — נטענים בלי שום בקשת רשת
import { chromium } from 'playwright';
import {ok,done,realErrs} from './h.mjs';
import fs from 'fs';
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
for(const [file,lite] of [['BIOBUZZ-lab.html',false],['BIOBUZZ-lab-lite.html',true]]){
  const page=await browser.newPage({viewport:{width:1400,height:860}});
  const ext=[]; const errs=[];
  await page.route('**/*',rt=>{ const u=rt.request().url(); if(u.startsWith('file:')||u.startsWith('data:')||u.startsWith('blob:')) return rt.continue(); ext.push(u); return rt.abort(); });
  page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(new URL('../dist/'+file,import.meta.url).href);
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody,null,{timeout:90000});
  if(!lite) await page.waitForFunction(()=>window.__sim.cadRoot,null,{timeout:120000}).catch(()=>{});
  else await page.waitForTimeout(2500);
  const r=await page.evaluate(()=>({v:document.getElementById('verBadge').textContent, cad:!!__sim.cadRoot, brain:!!__sim.BRAIN,
    run:!!__sim.RUN, oCad:document.getElementById('oCad').innerText}));
  const mb=(fs.statSync(new URL('../dist/',import.meta.url).pathname+file).size/1048576).toFixed(1);
  ok(/^v(39|[4-9][0-9])/.test(r.v),file+': גרסה '+r.v+' · '+mb+' מ״ב');
  ok(lite?!r.cad&&/גרסה קלה/.test(r.oCad):r.cad, lite?'קל: בלי CAD, ומסביר את זה בלוח':'מלא: ה-CAD המוטמע נטען');
  ok(r.brain&&r.run,'המוח והמבצע האוטונומי קיימים');
  if(lite){ const m=await page.evaluate(()=>{ const S=__sim; S.MT.cd=0; S.GAME.randAuto=false; S.gameStart(true); for(const b of S.BOTS) b.autoLvl='preload'; S.matchStart(); for(const b of S.BOTS) b.autoLvl='preload'; S.advance(10,1/60);   /* v67: רמת אוטונומי קבועה — ״יציאה בלבד״ אקראית לשלושתם = אפס יריות */
      return {ph:S.MATCH.phase, shots:S.BOTS.reduce((a,b)=>a+b.shots,0)}; });
    ok(m.ph==='AUTO'&&m.shots>0,'קל: מאץ׳ מלא רץ (בוטים יורים באוטונומי)'); ok(+mb<3.5,'קל: פחות מ-3.5 מ״ב ('+mb+')');   /* 1.14: המסמכים המשפטיים (עברית+אנגלית) מוטמעים — ~0.2 מ״ב */ }
  ok(ext.filter(u=>!/^ws:/.test(u)).length===0,'אפס בקשות רשת החוצה '+ext.filter(u=>!/^ws:/.test(u)).slice(0,2).join(','));
  ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
  await page.close();
}
await browser.close(); done('dist_test');
