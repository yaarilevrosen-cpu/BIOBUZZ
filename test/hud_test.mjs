// v43: כל שכבה על המסך אפשר להעלים · הודעת סוף המאץ׳ נעלמת לבד
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
const vis=id=>E(id=>{ const e=document.getElementById(id); return !!e&&getComputedStyle(e).display!=='none'&&!e.hidden; },id);
await E(()=>{ window.S=__sim; localStorage.removeItem('bbHud1'); S.HUD.off={}; });
ok(!(await vis('netTag')),'התגית הריקה בפינה כבר לא מופיעה');
// מאץ׳ קצר עד הסוף
await E(()=>{ S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=5; S.MYAUTO.lvl='none'; S.matchStart(); });
await E(()=>S.advance(5.5,1/60));
let r=await E(()=>({ph:S.MATCH.phase, show:document.getElementById('banner').classList.contains('show'), txt:document.getElementById('bannerBig').textContent}));
ok(r.ph==='סיום'&&r.show&&/ניצחון|הפסד|תיקו/.test(r.txt),'בסוף המשחק מופיעה התוצאה ״'+r.txt+'״');
await E(()=>S.advance(9,1/60));
r=await E(()=>document.getElementById('banner').classList.contains('show'));
ok(!r,'ההודעה נעלמת לבד אחרי 6 שניות — בלי רענון');
await E(()=>{ S.matchStart(); }); await E(()=>S.advance(5.5,1/60));
r=await E(()=>{ const a=document.getElementById('banner').classList.contains('show'); document.getElementById('bannerX').click(); return {a, b:document.getElementById('banner').classList.contains('show')}; });
ok(r.a&&!r.b,'כפתור ✕ סוגר אותה מיד');
// ✕ על הטלמטריה
await E(()=>{ document.querySelector('#telem .hudX').click(); });
ok(!(await vis('telem')),'✕ על הטלמטריה מעלים אותה');
// תפריט תצוגה
r=await E(()=>{ document.getElementById('tbHud').click(); const m=document.getElementById('hudMenu'); const open1=!m.hidden;
  const c=m.querySelector('[data-hud="telem"]'); const unchecked=!c.checked; c.click();
  const k=m.querySelector('[data-hud="keys"]'); k.click(); return {open1, unchecked}; });
ok(r.open1&&r.unchecked,'כפתור ״תצוגה״ פותח רשימה, והטלמטריה מסומנת ככבויה');
ok(await vis('telem')&&!(await vis('keys')),'מהרשימה: הטלמטריה חוזרת, רשימת המקשים נעלמת');
// H = מסך נקי
await page.keyboard.press('KeyH');
r=await E(()=>['telem','keys','verdict'].map(id=>getComputedStyle(document.getElementById(id)).display));
ok(r.every(d=>d==='none'),'H — מסך נקי');
await page.keyboard.press('KeyH');
r=await E(()=>['telem','keys','verdict'].map(id=>getComputedStyle(document.getElementById(id)).display));
ok(r.every(d=>d!=='none'),'H שוב — הכול חוזר');
// נשמר אחרי רענון
await E(()=>{ document.querySelector('#keys .hudX').click(); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:60000});
ok(!(await vis('keys'))&&(await vis('telem')),'הבחירה נשמרת גם אחרי רענון');
r=await E(()=>{ __sim.refreshAim&&__sim.refreshAim(); return {t:document.getElementById('verdictTxt').textContent, x:!!document.querySelector('#verdict .hudX')}; });
ok(r.t.length>2&&r.x,'פתרון הירי מתעדכן בלי למחוק את ה-✕ ('+r.t+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('hud_test');
