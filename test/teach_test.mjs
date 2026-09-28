// v40: לימוד בהדגמה עם זמנים, מהירויות ועצירות · המסלול נעלם כשלא עובדים עליו
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
const rec=await E(()=>{ const S=__sim; S.stageMatch(); S.pathClear(); S.homeRobot(); S.teachStart();
  const hold=(k,sec)=>{ S.key(k,true); S.advance(sec,1/60); S.key(k,false); };
  hold('KeyW',1.4); S.advance(1.0,1/60);             // עצירה של שנייה
  hold('KeyA',0.6); S.advance(0.4,1/60); hold('KeyQ',0.8);                 // הזזה הצידה וסיבוב במקום (v63: 0.6 — סיבוב בשטח פתוח, לא נגד הכוורת)
  hold('KeyW',1.1); S.advance(0.3,1/60); S.fire(); S.advance(0.6,1/60);
  hold('KeyS',0.8); S.advance(0.3,1/60);
  S.teachStop();
  return {T:S.TEACH.t, end:[S.I(S.botBody.position.x),S.I(S.botBody.position.z),S.bot.yaw], rows:S.TEACH.rows.length}; });
let r=await E(()=>{ const P=__sim.teachPts(); return P.map(p=>({x:+p.x.toFixed(1),z:+p.z.toFixed(1),h:+(p.h*57.3).toFixed(0),act:p.act,sec:p.sec,v:p.v,dt:p.dt,t:p.tRec})); });
console.log('    '+r.map(p=>`(${p.x},${p.z} ${p.h}° t${p.t}${p.dt?' +'+p.dt:''}${p.v?' v'+p.v:''}${p.act!=='none'?' '+p.act+(p.sec?p.sec:''):''})`).join(' '));
ok(r.length>=7,'יותר נקודות — כל עצירה, סיבוב ופעולה ('+r.length+' מתוך '+rec.rows+' דגימות)');
ok(r.slice(1).every(p=>p.t!=null&&p.dt!=null),'לכל נקודה זמן הגעה ומשך הקטע');
ok(r.some(p=>p.act==='wait'&&Math.abs(p.sec-1.0)<0.35),'העצירה של שנייה נשמרה כהמתנה ('+(r.find(p=>p.act==='wait')||{}).sec+' שנ׳)');
ok(r.some(p=>p.act==='fire'),'הירייה נשמרה כ״ירייה כמו שהוקלט״');
{ const turn=r.findIndex((p,i)=>i>0&&Math.hypot(p.x-r[i-1].x,p.z-r[i-1].z)<4&&Math.abs(p.h-r[i-1].h)>20);
  ok(turn>0,'הסיבוב במקום הוא נקודה עם כיוון חדש'); }
ok(r.filter(p=>p.v).every(p=>p.v>0.2&&p.v<120),'מהירות סבירה בכל קטע');
r=await E(()=>__sim.teachJava());
ok(/TranslationalVelConstraint/.test(r)&&/waitSeconds/.test(r)&&/turnTo/.test(r)&&/t=\d/.test(r),'הקוד: מגבלות מהירות, המתנה, סיבוב במקום וזמנים');
// דיוק הקלטה
r=await E(()=>{ const S=__sim, o=S.TEACH.tol; S.TEACH.tol=0.5; const a=S.teachPts().length; S.TEACH.tol=3.5; const b=S.teachPts().length; S.TEACH.tol=o; return {a,b}; });
ok(r.a>r.b,'סבילות קטנה = יותר נקודות ('+r.a+' מול '+r.b+')');
// שחזור
r=await E(()=>{ const S=__sim; S.stageMatch(); S.teachToPath(); const res=S.pathRun();
  return {res:{done:res.done,t:res.t,why:res.why}, x:S.I(S.botBody.position.x), z:S.I(S.botBody.position.z), yaw:S.bot.yaw, info:document.getElementById('oPath').innerText}; });
const dEnd=Math.hypot(r.x-rec.end[0],r.z-rec.end[1]); let dy=r.yaw-rec.end[2]; dy=Math.atan2(Math.sin(dy),Math.cos(dy));
ok(r.res.done&&dEnd<4&&Math.abs(dy)<0.2,'השחזור מגיע לאותו מקום וכיוון ('+dEnd.toFixed(1)+'″, '+(dy*57.3).toFixed(0)+'°)');
ok(Math.abs(r.res.t-rec.T)<=rec.T*0.2,'השחזור בזמן דומה להקלטה (הוקלט '+rec.T.toFixed(1)+', שוחזר '+r.res.t+' שנ׳)');
ok(/הוקלט · שוחזר/.test(r.info),'הלוח מראה הוקלט מול שוחזר');
// נראות
r=await E(()=>{ const S=__sim, o={};
  S.setWS('auto'); S.PATH.mode=false; S.advance(0.05,1/60); o.auto=S.PATH.grp.visible;
  S.setWS('drive'); S.advance(0.05,1/60); o.drive=S.PATH.grp.visible;
  S.setWS('auto'); S.MT.cd=0; S.matchStart(); S.advance(0.05,1/60); o.match=S.PATH.grp.visible; S.matchStop();
  S.advance(0.05,1/60); o.after=S.PATH.grp.visible;
  document.getElementById('kPathShow').click(); S.advance(0.05,1/60); o.off=S.PATH.grp.visible;
  document.getElementById('kPathShow').click(); S.advance(0.05,1/60); o.on=S.PATH.grp.visible;
  return o; });
ok(r.auto&&!r.drive,'המסלול נראה בלשונית אוטונומי ונעלם בנהיגה');
ok(!r.match&&r.after,'נעלם במאץ׳, וחוזר אחריו');
ok(!r.off&&r.on,'אפשר לכבות ולהדליק אותו');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('teach_test');
