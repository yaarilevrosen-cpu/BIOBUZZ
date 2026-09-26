// v49 — כפתור ״עצור משחק״ ליד השעון, בשני המצבים
import {open,ok,done,realErrs} from './h.mjs';
for(const mode of ['lab','play']){
  const {browser,page,errs}=await open({noraf:true,play:mode==='play'});
  const vis=()=>page.evaluate(()=>{ const b=document.getElementById('clkStop'); return !!b&&getComputedStyle(b).display!=='none'&&b.getBoundingClientRect().width>0; });
  ok(!(await vis()),mode+': בלי משחק — הכפתור מוסתר');
  await page.evaluate(()=>{ __sim.matchStart(); __sim.advance(4,1/60); });
  ok(await vis(),mode+': במשחק רץ — הכפתור מופיע ליד השעון');
  await page.evaluate(()=>document.getElementById('clkStop').click());
  let st=await page.evaluate(()=>({txt:document.getElementById('clkStop').textContent, arm:document.getElementById('clkStop').classList.contains('arm')}));
  ok(st.arm&&/לחצו? שוב/.test(st.txt),mode+': לחיצה ראשונה — ״לחץ שוב לעצירה״ ('+st.txt+')');
  ok(await vis(),mode+': …והמשחק עדיין רץ');
  await page.evaluate(()=>document.getElementById('clkStop').click());
  ok(!(await vis()),mode+': לחיצה שנייה — המשחק נעצר והכפתור נעלם');
  ok(await page.evaluate(()=>document.body.classList.contains('nomatch')),mode+': השעון חזר ל״אין משחק״');
  ok(await page.evaluate(m=>document.body.classList.contains(m),mode) ,mode+': נשארים באותו מצב');
  // לחיצה אחת ואז המתנה — לא עוצר, והאישור מתבטל
  await page.evaluate(()=>{ __sim.matchStart(); __sim.advance(4,1/60); document.getElementById('clkStop').click(); });
  await page.waitForTimeout(3300);
  await page.evaluate(()=>{ __sim.advance(0.3,1/60); });
  st=await page.evaluate(()=>({arm:document.getElementById('clkStop').classList.contains('arm'),txt:document.getElementById('clkStop').textContent}));
  ok(!st.arm&&/עצור משחק/.test(st.txt),mode+': אחרי 3 שניות בלי אישור — חוזר ל״עצור משחק״');
  await page.evaluate(()=>document.getElementById('clkStop').click());
  ok(await vis(),mode+': ולחיצה בודדת אחרי זה שוב לא עוצרת');
  ok(realErrs(errs).length===0,mode+': אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
  await browser.close();
}
done('stop_test');
