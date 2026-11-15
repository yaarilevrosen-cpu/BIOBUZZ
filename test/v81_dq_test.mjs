// v81: פסילה (כרטיס אדום) — T601 במוקדמות, צהוב מאימון לא נגרר, הודעה ברורה
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({play:true});
const E=(f,a)=>page.evaluate(f,a);
const Y={rule:'G408',team:'me',ally:'red',sev:['yellow'],what:'בדיקה'};
/* 1. צהוב באימון חופשי לא נגרר למאץ׳ */
let r=await E(Y=>{ const S=__sim; S.matchStop(); S.REF.carry={}; S.REF.cards={}; S.REF.on=true; S.SETUP.ally='red';
  S.refCall(Y); const free={card:S.REF.cards.me,carry:!!S.REF.carry.me};
  Object.assign(S.MT,{cd:0,auto:1,trans:1,tele:3}); S.matchStart(); S.REF.on=true;
  const start=S.REF.cards.me||''; S.refCall(Y);
  return {free,start,dq:S.MATCH.dq,card:S.REF.cards.me,carry:!!S.REF.carry.me}; },Y);
ok(r.free.card==='yellow'&&!r.free.carry,'צהוב באימון חופשי: יש כרטיס, אבל הוא לא נרשם לגרירה');
ok(r.start==='','המאץ׳ מתחיל בלי כרטיס');
ok(!r.dq&&r.card==='yellow','עבירה צהובה אחת במאץ׳ אחרי צהוב באימון — רק צהוב, בלי פסילה');
ok(r.carry,'צהוב שהתקבל במאץ׳ נגרר למאץ׳ הבא');
/* 2. צהוב שני במאץ׳ — פסילה, הודעה עם הכלל, והניקוד של הברית נשאר */
r=await E(Y=>{ const S=__sim; S.TIPS.red=2; S.refCall(Object.assign({},Y,{rule:'G417',what:'פגיעה במסגרת'}));
  const el=document.getElementById('refToast');
  const toast=el.textContent, shown=/show/.test(el.className);
  S.refCall({rule:'G404',team:'me',ally:'red',sev:['minor'],what:'עבירה קטנה'});
  return {dq:S.MATCH.dq,why:S.MATCH.dqWhy&&S.MATCH.dqWhy.rule,toast,shown,after:el.textContent}; },Y);
ok(r.dq&&r.why==='G417','צהוב שני במאץ׳ — פסילה, והכלל נשמר');
ok(r.shown&&/פסילה/.test(r.toast)&&/G417/.test(r.toast),'הודעת פסילה עם מספר הכלל: '+r.toast.slice(0,60));
ok(r.after===r.toast,'עבירה קטנה מיד אחרי לא דורסת את הודעת הפסילה');
await page.waitForFunction(()=>__sim.MATCH.on&&__sim.MATCH.phase==='TELEOP',null,{timeout:60000});
r=await E(()=>document.getElementById('v76Ph').textContent);
ok(/פסול/.test(r),'פס התוצאה מסמן ״פסול״ בזמן המאץ׳: '+r);
await page.waitForFunction(()=>__sim.MATCH.phase==='סיום',null,{timeout:90000});
r=await E(()=>{ const S=__sim, M=S.MATCH, q=id=>document.getElementById(id).textContent;
  return {fin:M.final.red,live:S.scoreNow().total,rp:M.rp.total,big:q('bannerBig'),sub:q('bannerSub'),cs:q('cScoreR')}; });
ok(r.fin>=40&&r.fin===r.live,'במוקדמות ניקוד הברית נשאר אחרי פסילה ('+r.fin+')');
ok(r.rp===0,'הקבוצה שנפסלה מקבלת 0 נקודות דירוג');
ok(r.big==='פסילה'&&/כרטיס אדום/.test(r.sub)&&/G417/.test(r.sub),'הבאנר: ״פסילה״, כרטיס אדום והכלל — '+r.sub);
ok(String(r.fin)===r.cs.trim()&&r.sub.includes('אדום '+r.fin),'לוח התוצאה והבאנר מראים אותו מספר ('+r.cs+')');
/* 2ב. המאץ׳ הבא מתחיל עם הצהוב שנגרר — ויש על זה הודעה בפתיחה */
r=await E(async()=>{ const S=__sim; S.matchStop(); S.REF.cards={}; S.REF.carry={me:true}; Object.assign(S.MT,{cd:0,auto:1,trans:1,tele:1}); S.REF.on=true; S.matchStart();
  const el=document.getElementById('refToast'); const o={card:S.REF.cards.me,t:el.textContent,shown:/show/.test(el.className)}; S.matchStop(); S.REF.carry={}; S.REF.cards={}; return o; });
ok(r.card==='yellow'&&r.shown&&/כרטיס צהוב מהמאץ׳ הקודם/.test(r.t),'מאץ׳ שמתחיל עם צהוב נגרר — הודעה בפתיחה');
/* 3. בפלייאוף — כל הברית 0 */
r=await E(async Y=>{ const S=__sim; S.matchStop(); S.REF.carry={}; S.REF.cards={};
  Object.assign(S.MT,{cd:0,auto:0,trans:0,tele:1}); S.matchStart(); S.REF.on=true; S.MATCH.playoff=true; S.TIPS.red=2;
  S.refCall(Y); S.refCall(Y); await new Promise(r=>{ const t=setInterval(()=>{ if(S.MATCH.phase==='סיום'){ clearInterval(t); r(); } },100); });
  const o={fin:S.MATCH.final.red,big:document.getElementById('bannerBig').textContent}; S.MATCH.playoff=false; S.matchStop(); S.REF.carry={}; S.REF.cards={}; return o; },Y);
ok(r.fin===0&&r.big==='פסילה','בפלייאוף פסילה מאפסת את הברית');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v81_dq');
