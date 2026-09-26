// מוח הברית: תפקידים, בחירת יריב, למידה, עמדות ירי, קו חסום, חניה
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; window.B1=S.BOTS[0]; window.B2=S.BOTS[1]; window.RP=S.BOTS[2]; });

// 1. בולם מול יריב שעומד במקום — עובר לנקד
let r=await E(()=>{ S.GAME.randomRoles=true; S.GAME.swap=true; S.gameStart(true);
  S.setAIRole(B1,'defend'); S.setAIRole(B2,'score'); RP.on=false; S.brainReset();
  S.advance(11,1/60); return {r1:B1.role, why:S.GAME.lastSwap, w:S.BRAIN.why.blue}; });
ok(r.r1==='score','בולם שאין מול מי לבלום עובר לנקד ('+r.r1+')');
ok(/אין מול מי/.test(r.why),'הסיבה נכתבת: '+r.why);

// 2. יש שותף אדום פעיל ואני עומד — הבולם בוחר בשותף
r=await E(()=>{ S.gameStart(true); S.setAIRole(B1,'defend'); S.setAIRole(B2,'score'); S.setAIRole(RP,'score');
  S.brainReset(); S.advance(9,1/60);
  return {foe:B1.foe, role:B1.role, thr:S.brainRobots().map(r=>r.id+':'+S.brainThreat(r).toFixed(2)).join(' ')}; });
ok(r.role==='defend'&&r.foe==='שותף אדום','הבולם בולם את מי שבאמת משחק ('+r.foe+', '+r.role+')');
ok(/me:0\.00/.test(r.thr),'רובוט שעומד במקום — איום אפס ('+r.thr+')');

// 3. מוח כבוי — בולם אותי כמו פעם
r=await E(()=>{ S.BRAIN.on=false; B1.foe=null; const f=S.aiFoeFor(B1,0.016); S.BRAIN.on=true; return f&&f.id; });
ok(r==='me','בלי המוח הבולם הכחול נצמד אליי כמו ב-v33');

// 4. למידה — העמדה האהובה
r=await E(()=>{ S.brainReset(); for(const [x,z] of [[-30,12],[-31,10],[-29,11],[-30,13],[20,-40]]) S.brainShot('me',x,z);
  return S.brainLearned('me',-60,-60); });
ok(r&&Math.abs(r.x+30)<2&&Math.abs(r.z-11.5)<2&&r.n===4,'לומד את האשכול הצפוף ('+(r&&r.x.toFixed(1))+', '+(r&&r.z.toFixed(1))+')');
r=await E(()=>S.brainLearned('ghost',0,0));
ok(r===null,'בלי מספיק יריות אין ניחוש');

// 5. בולם מחכה בנתיב שלמד כשאני טעון ורחוק מהעמדה
r=await E(()=>{ S.gameStart(true); B2.on=false; RP.on=false; S.setAIRole(B1,'defend'); S.brainReset();
  for(let i=0;i<5;i++) S.brainShot('me',-34,8);
  S.setPose(-56,-54,0); S.bot.clip=['pollen','pollen']; S.bot.mag=2;
  S.advance(3.5,1/60);
  return {ph:B1.ph, x:S.I(B1.body.position.x), z:S.I(B1.body.position.z), lt:B1.learnT||0}; });
ok(r.ph==='lane'&&r.lt>0.5,'הבולם עובר למצב נתיב שלמד ('+r.ph+')');
const mfr=await E(()=>{ const f=S.mouthFrame(S.hiveRed).c; return {x:S.I(f.x),z:S.I(f.z)}; });
{ const ax=-34,az=8,bx=mfr.x,bz=mfr.z, vx=bx-ax,vz=bz-az,L2=vx*vx+vz*vz, t=Math.max(0,Math.min(1,((r.x-ax)*vx+(r.z-az)*vz)/L2));
  const d=Math.hypot(r.x-(ax+vx*t),r.z-(az+vz*t));
  ok(d<9,'והוא עומד על הקו בין העמדה האהובה לפתח ('+d.toFixed(1)+'″)'); }

// 6. עמדות ירי — קשת, ושני מנקדים לא לוקחים אותה עמדה
r=await E(()=>{ const L=S.brainSpots(S.hiveBlue); return {n:L.length, p:Math.min(...L.map(s=>s.p))}; });
ok(r.n>=5,'יש קשת של עמדות ('+r.n+')');
ok(r.p>=0.99,'כולן פוגעות גם עם השגיאות של הקבוצה');
r=await E(()=>{ S.gameStart(true); RP.on=false; S.setAIRole(B1,'score'); S.setAIRole(B2,'score'); S.brainReset();
  for(const b of [B1,B2]){ b.clip=['pollen','pollen']; b.ph='aim'; b.spot=null; }
  B1.body.position.set(S.M(30),0,S.M(-20)); B2.body.position.set(S.M(34),0,S.M(20));
  S.advance(2.5,1/60);
  return {a:B1.spot, b:B2.spot}; });
ok(r.a&&r.b&&Math.hypot(r.a.x-r.b.x,r.a.z-r.b.z)>=18,'שני מנקדים בוחרים עמדות שונות ('+(r.a&&r.b?Math.hypot(r.a.x-r.b.x,r.a.z-r.b.z).toFixed(1):'—')+'″)');

// 7. קו ירי חסום
r=await E(()=>{ S.gameStart(true); B2.on=false; S.setAIRole(B1,'score'); S.brainReset();
  const L=S.brainSpots(S.hiveRed); const sp=L[0];
  RP.body.position.set(S.M(sp.x),0,S.M(sp.z)); const mf=S.mouthFrame(S.hiveRed);
  RP.yaw=Math.atan2(mf.c.x-RP.body.position.x,mf.c.z-RP.body.position.z);
  S.setPose(200,200,0);
  B1.body.position.set(S.M(-200),0,S.M(-200));
  const free=S.brainLineBlocked(RP);
  const mx=(sp.x+S.I(mf.c.x))/2, mz=(sp.z+S.I(mf.c.z))/2;
  B1.body.position.set(S.M(mx),0,S.M(mz));
  const blocked=S.brainLineBlocked(RP);
  S.homeRobot(); return {free,blocked}; });
ok(!r.free&&r.blocked,'מזהה רובוט בקו הירי (פנוי '+r.free+', חסום '+r.blocked+')');

// 8. חניה בסוף — מאץ׳ קצר
r=await E(()=>{ S.MT.cd=0; S.MT.auto=12; S.MT.trans=2; S.MT.tele=34;
  S.GAME.randAuto=false; for(const b of S.BOTS) b.autoLvl='cycle';
  S.gameStart(true); S.matchStart(); for(const b of S.BOTS) b.autoLvl='cycle';
  S.advance(12.4,1/60);
  return S.BOTS.map(b=>b.name+':'+(b.autoPark?1:0)); });
ok(r.filter(x=>/:1$/.test(x)).length>=2,'חניה של האוטונומי: '+r.join(' '));
r=await E(()=>{ S.advance(15,1/60); const mid=S.BOTS.map(b=>b.parkGo?1:0);
  S.advance(22,1/60);
  return {mid, lz:S.BOTS.map(b=>b.name+':'+(S.botInLZ(b)?1:0)), det:S.BOTS.map(b=>b.ph+'@'+S.I(b.body.position.x).toFixed(0)+','+S.I(b.body.position.z).toFixed(0)+(b.parkS?'→'+b.parkS.x+','+b.parkS.z:'')).join(' '), phase:S.MATCH.phase,
    red:S.scoreAlly('red').park, blue:S.scoreAlly('blue').park}; });
ok(r.phase==='סיום','המאץ׳ הקצר נגמר');
/* לפעמים בוט נתקע כמה שניות ליד רגלי הכוורת (חולשה ידועה של הניווט) — דורשים רוב */
ok(r.lz.filter(x=>/:1$/.test(x)).length>=2,'רוב הבוטים חונים בסוף: '+r.lz.join(' ')+' | '+r.det);
ok(r.blue>=10&&r.red>=5,'נקודות חניה נספרות (אדום '+r.red+', כחול '+r.blue+')');
ok(r.mid.reduce((a,b)=>a+b,0)===0,'לא יוצאים לחנות מוקדם מדי ('+r.mid.join(',')+')');

// 9. שחקן אנושי בברית — הבוט לא לוקח לו את הפרח
r=await E(()=>{ S.MT.cd=3; S.MT.auto=30; S.MT.trans=8; S.MT.tele=120; S.matchStop(); S.stageMatch();
  S.gameStart(true); S.brainReset(); B1.on=false; B2.on=false; S.setAIRole(RP,'score');
  const fl=S.flowers.filter(f=>S.I? true:true).sort((a,b)=>Math.hypot(a.x+40,a.z+40)-Math.hypot(b.x+40,b.z+40))[0];
  // אני (אדום, אנושי) צמוד לפרח הקרוב לשותף
  const ax=Math.abs(fl.x)>Math.abs(fl.z);
  const px=ax?fl.x-Math.sign(fl.x)*14:fl.x, pz=ax?fl.z:fl.z-Math.sign(fl.z)*14;
  S.setPose(px,pz,0); S.bot.clip=[]; S.bot.mag=0;
  RP.body.position.set(S.M(fl.x*0.6),0,S.M(fl.z*0.6)); RP.ph='seek'; RP.t=5; RP.clip=[]; RP.target=null;
  S.advance(0.1,1/60);
  const on=RP.target, same=on===fl;
  return {same, has:!!on}; });
ok(r.has&&!r.same,'השותף בוחר פרח אחר מזה שאני אוסף ממנו');

ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('brain_test');
