// v46: מצב ״משחק״ עצמאי · בלימה · הניקוד מסביר את עצמו · תחקיר לא סופר עמידה כטעינה
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true, play:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; });
// 1. שום דבר בלוח ״משחק״ לא מעביר ל״בדיקות״
const ids=await E(()=>[...document.querySelectorAll('#playPanel button, #playPanel a')].map(b=>b.id).filter(Boolean));
let jumped=[];
for(const id of ids){
  if(['ppStop','ppQuick','ppMatch'].includes(id)) continue;   // נבדקים בנפרד (מתחילים משחק / חלון הגדרות)
  const r=await E(id=>{ const b=document.getElementById(id); if(!b||b.offsetParent===null&&!/ppSplit|ppNet|ppPhone/.test(id)) return 'skip';
    if(/ppSplit|ppNet|ppPhone/.test(id)) document.getElementById('ppFriends').hidden=false;
    b.click(); const m=S.UI.mode; if(S.SPLIT&&S.SPLIT.on) {} document.getElementById('pmX').click(); document.getElementById('qrX').click(); if(S.BC&&S.BC.on) S.bcSet(false); if(S.REPLAY.on) S.replayClose(); return m; },id);
  if(r==='lab') jumped.push(id);
}
ok(jumped.length===0,'אף כפתור בלוח ״משחק״ לא מעביר ל״בדיקות״ (נבדקו '+ids.length+(jumped.length?' · עברו: '+jumped.join(','):'')+')');
let r=await E(()=>{ document.getElementById('ppFriends').hidden=false; document.getElementById('ppNet').click();
  const m=S.UI.mode, open1=!document.getElementById('playModal').hidden, hasNet=!!document.querySelector('#pmBody #netName');
  document.getElementById('pmX').click(); const back=!!document.querySelector('#netPanel #netName'); return {m,open1,hasNet,back}; });
ok(r.m==='play'&&r.open1&&r.hasNet&&r.back,'״ברשת״ נפתח בחלון צף עם אותם כלים, ובסגירה הכול חוזר למקום');
r=await E(()=>{ S.ppRefresh(); const a=document.getElementById('ppRebind'); a.click(); const m=S.UI.mode, k=!!document.querySelector('#pmBody #kbBinds');
  document.getElementById('pmX').click(); return {m,k}; });
ok(r.m==='play'&&r.k,'״לשנות מקשים״ נפתח בחלון צף, בלי לעבור מצב');
ok(await E(()=>!document.getElementById('ppToLab')),'אין יותר כפתור ״עוברים לבדיקות״ בתוך הלוח (המתג בכותרת נשאר)');
// 2. בלימה במקום עצירה מיידית
r=await E(()=>{ S.stageMatch(); S.homeRobot();
  S.key('KeyW',true); S.advance(1,1/60); S.key('KeyW',false); const v0=Math.hypot(S.botBody.velocity.x,S.botBody.velocity.z);
  S.advance(1/60,1/60); const v1=Math.hypot(S.botBody.velocity.x,S.botBody.velocity.z); let t=1/60;
  while(Math.hypot(S.botBody.velocity.x,S.botBody.velocity.z)>0.01&&t<1){ S.advance(1/60,1/60); t+=1/60; }
  return {v0,v1,t}; });
ok(r.v1>0.5*r.v0&&r.t>0.08&&r.t<0.45,'בלימה: '+r.v0.toFixed(2)+' מ׳/שנ׳ → עצירה תוך '+r.t.toFixed(2)+' שנ׳');
// 3. הניקוד מסביר את עצמו
r=await E(()=>{ S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=30; S.MYAUTO.lvl='none'; S.matchStart(); S.advance(0.6,1/60);
  S.tip(S.hiveRed); S.advance(1.5,1/60); return [...document.querySelectorAll('#scorePops .spop')].map(e=>e.textContent); });
ok(r.some(t=>/\+20 אדום · היפוך/.test(t)),'היפוך מופיע כ״+20 אדום · היפוך״ ('+r.join(' | ')+')');
// 4. תחקיר: עמידה בלי מגע היא ״עמידה״
r=await E(()=>{ S.matchStop(); S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=12; S.matchStart(); S.homeRobot(); for(let i=0;i<3;i++) S.advance(4,1/60);
  return S.DEB?S.DEB.report&&S.DEB.report.bins:null; });
ok(r&&(r.load||0)<1&&(r.idle||0)>8,'תחקיר: 12 שנ׳ בלי מגע נספרות כעמידה ('+JSON.stringify(r)+')');
r=await E(()=>{ S.matchStop(); S.matchStop(); if(S.SPLIT.on){ document.getElementById('ppFriends').hidden=false; document.getElementById('ppSplit').click(); } const on=()=>[...document.querySelectorAll('.ppCard.on')].map(b=>b.id);
  document.getElementById('ppFree').click(); const a=on();
  document.getElementById('ppQuick').click(); S.advance(0.1,1/60); S.ppRefresh(); const b=on(); const stopB=document.getElementById('ppStop'); stopB.click(); stopB.click(); S.ppRefresh(); const b2=on();
  document.getElementById('ppFree').click(); document.getElementById('ppFriends').hidden=false; document.getElementById('ppSplit').click(); S.ppRefresh(); const c=on();
  const sp=document.getElementById('ppSplit').classList.contains('on'); document.getElementById('ppSplit').click(); S.ppRefresh(); const d=on();
  return {a,b2,c,sp,d}; });
ok(r.a.join()==='ppFree'&&r.b2.join()==='ppQuick'&&r.c.join()==='ppFriendsBtn'&&r.sp&&r.d.join()==='ppFree','המצב שבחרת מסומן ״✓ עכשיו״ ('+[r.a,r.b2,r.c,r.d].map(x=>x.join()).join(' → ')+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('play_test');
