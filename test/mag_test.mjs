// v51 — מחסנית גדולה על המסך, בשני המצבים
import {open,ok,done,realErrs} from './h.mjs';
for(const mode of ['play','lab']){
  const {browser,page,errs}=await open({noraf:true,play:mode==='play'});
  const st=()=>page.evaluate(()=>{ const el=document.getElementById('magHud'), r=el.getBoundingClientRect();
    return {vis:getComputedStyle(el).display!=='none'&&r.width>150&&r.height>60, n:document.getElementById('mhN').textContent, msg:document.getElementById('mhMsg').textContent,
      full:el.classList.contains('full'), empty:el.classList.contains('empty'), slots:[...document.querySelectorAll('#mhSlots .ms')].map(x=>x.classList.contains('f')?1:0).join(''),
      nx:document.querySelectorAll('#mhSlots .ms.nx').length, w:r.width, h:r.height}; });
  let s=await st();
  ok(s.vis,mode+': המחסנית הגדולה מוצגת ('+Math.round(s.w)+'×'+Math.round(s.h)+')');
  await page.evaluate(()=>__sim.setClip(['pollen','red','pollen','blue']));
  s=await st(); ok(s.n==='4 / 4'&&s.full&&s.slots==='1111'&&/מלא/.test(s.msg),mode+': מלאה — 4/4, ״מלא — לירות!״');
  ok(s.nx===1,mode+': הכדור הבא מסומן');
  await page.evaluate(()=>__sim.setClip(['red','pollen']));
  s=await st(); ok(s.n==='2 / 4'&&!s.full&&!s.empty&&s.slots==='1100'&&/נקטר אדום/.test(s.msg),mode+': 2/4 — ״הבא: נקטר אדום״ ('+s.msg+')');
  await page.evaluate(()=>{ __sim.setClip([]); __sim.setIntake(true); });
  s=await st(); ok(s.empty&&s.n==='0 / 4'&&/ריק/.test(s.msg)&&/פתוח/.test(s.msg),mode+': ריקה — אדום, ״סעו לפרח״ ('+s.msg+')');
  await page.evaluate(()=>__sim.setIntake(false));
  s=await st(); ok(/פתחו חרטום \(F\)/.test(s.msg),mode+': ריקה וחרטום סגור — ״פתחו חרטום (F)״');
  await page.evaluate(()=>__sim.setIntake(true));
  // ירייה אמיתית מורידה כדור
  await page.evaluate(()=>{ __sim.setClip(['pollen','pollen','pollen']); __sim.fire(); __sim.advance(0.6,1/60); });
  s=await st(); ok(s.n==='2 / 4',mode+': אחרי ירייה — 2/4 ('+s.n+')');
  // הסתרה: ✕, תפריט התצוגה, H
  await page.evaluate(()=>document.querySelector('#magHud .hudX').click());
  s=await st(); ok(!s.vis,mode+': ✕ מסתיר');
  await page.evaluate(()=>{ const c=document.querySelector('#hudMenu [data-hud=mag]'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); });
  s=await st(); ok(s.vis,mode+': ״מחסנית גדולה על המסך״ בתפריט מחזיר');
  ok(realErrs(errs).length===0,mode+': אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
  await browser.close();
}
done('mag_test');
