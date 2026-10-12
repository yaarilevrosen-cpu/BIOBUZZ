// v74 rulesbots — R1–R5 (חוקים), B1–B10 (בוטים), U2 (ירי בתנועה), U4 (זמן לחנות)
import {open,ok,done,realErrs} from './h.mjs';
process.env.BB_PORT=process.env.BB_PORT||process.env.PORT||'8902';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
let r;

// R1 — האוטונומי שלי לא בולע נקטר של היריב
r=await E(()=>{ const S=__sim; let warn=0,opp=0;
  for(let i=0;i<4;i++){ S.REF.carry={}; S.REF.cards={}; S.setRealm('comp'); S.SETUP.ally=i%2?'blue':'red'; S.bldSet(-1,i<2?'classic':'double',true);
    S.MT.cd=0; S.gameStart(true); S.matchStart(); const op=S.SETUP.ally==='red'?'blue':'red'; let k=0;
    while(S.MATCH.on&&S.MATCH.t<30.5&&k++<4000){ const c0=S.bot.clip.filter(x=>x===op).length; S.advance(1/60,1/60); opp+=Math.max(0,S.bot.clip.filter(x=>x===op).length-c0); }
    warn+=S.REF.log.filter(e=>e.team==='me'&&e.rule==='G408').length; S.matchStop(); }
  S.bldSet(-1,'classic',true); S.REF.carry={}; S.REF.cards={}; return {warn,opp}; });
ok(r.warn===0&&r.opp===0,'R1: 4 אוטונומיים — 0 נקטר של היריב נבלע, 0 קריאות G408 נגדי ('+JSON.stringify(r)+')');

// R2 — אדום לשותף הבוט לא פוסל אותי; B3b — צהוב של בוט לא נגרר, שלי כן
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.REF.carry={}; S.REF.cards={};
  S.gameStart(true); S.matchStart(); for(const b of S.BOTS) b.on=false; S.setMatchT(40); S.advance(0.1,1/60);
  const P=S.BOTS[2]; for(let i=0;i<2;i++) S.refCall({rule:'G417',team:P.name,ally:P.ally,sev:['major','yellow'],what:'t'});
  S.refCall({rule:'G417',team:'me',ally:'red',sev:['major','yellow'],what:'t'});
  S.setMatchT(S.tEnd()-0.05); S.advance(0.2,1/60);
  const m1={final:{...S.MATCH.final},dq:S.MATCH.dq,dqA:{...S.MATCH.dqA},dqT:{...S.MATCH.dqT},rp:S.MATCH.rp.total,carry:{...S.REF.carry}}; S.matchStop();
  S.gameStart(true); S.matchStart(); const cards2={...S.REF.cards}; S.matchStop(); S.REF.carry={}; S.REF.cards={};
  return {m1,cards2,pn:P.name}; });
ok(!r.m1.dq&&!r.m1.dqA.red&&r.m1.dqT[r.pn],'R2: אדום לשותף הבוט — רק הוא נפסל (dqT), אני והברית לא ('+JSON.stringify(r.m1.final)+')');
ok(!r.m1.carry[r.pn]&&r.m1.carry.me,'B3b: צהוב של בוט לא נשמר לגרירה, צהוב שלי כן');
ok(r.cards2.me==='yellow'&&!r.cards2[r.pn],'B3b: במאץ׳ הבא — רק הצהוב שלי חוזר ('+JSON.stringify(r.cards2)+')');

// R3 — הכדור יורש את מהירות הלוע; הפתרון ״מוביל״ פוגע
r=await E(()=>{ const S=__sim, X=S.v74rb; S.setRealm('comp'); S.gameStart(false); S.stageMatch(); S.clearBalls();
  S.shotPose(); S.advance(0.3,1/120);
  S.botBody.velocity.x=1.2; S.botBody.velocity.z=0.3; S.bot.yawRate=0;
  const p=X.muzzleWorld(), vb=X.myMuzzleVel(p);
  S.bot.clip=['pollen','pollen','pollen','pollen'];
  const vx0=S.botBody.velocity.x, vz0=S.botBody.velocity.z;
  const rec=S.fire(); const bv=rec.body.velocity;
  // אותה ירייה בלי תנועה
  S.clearBalls(); S.shotPose(); S.advance(0.3,1/120); S.bot.clip=['pollen','pollen','pollen','pollen']; S.botBody.velocity.set(0,0,0); S.bot.yawRate=0;
  const rec0=S.fire(); const b0=rec0.body.velocity;
  S.clearBalls();
  return {dx:bv.x-b0.x, dz:bv.z-b0.z, vx0, vz0, mv:rec.logEntry.mv}; });
ok(Math.abs(r.dx-r.vx0)<0.12&&Math.abs(r.dz-r.vz0)<0.12,'R3: מהירות הכדור = שיגור + מהירות הלוע (Δ '+r.dx.toFixed(2)+','+r.dz.toFixed(2)+' מול '+r.vx0.toFixed(2)+','+r.vz0.toFixed(2)+')');
r=await E(()=>{ const S=__sim, X=S.v74rb; const out={};
  for(const fc of [true]){ S.fieldCentric=fc; S.aimAssist=true;
    for(const key of ['KeyA','KeyD','KeyW']){ let h=0;
      for(let t=0;t<4;t++){ S.shotPose(); const yaw=S.bot.yaw, fx=Math.sin(yaw), fz=Math.cos(yaw);
        const dir={KeyA:[fz,-fx],KeyD:[-fz,fx],KeyW:[0,0]}[key]; S.botBody.position.x+=dir[0]*0.9; S.botBody.position.z+=dir[1]*0.9; S.advance(0.3,1/120);
        S.key(key,true); S.advance(0.55,1/120); S.bot.clip=['pollen','pollen','pollen','pollen']; S.refreshAim(); const rec=S.fire(); S.key(key,false);
        S.advance(1.6,1/120); if(rec&&rec.logEntry.hit) h++; S.clearBalls(); }
      out[key]=h; } }
  S.aimAssist=false; S.fieldCentric=false; return out; });
ok(r.KeyA+r.KeyD+r.KeyW>=8,'U2: סיוע כיוון ״מוביל״ בנסיעה (מרכז זירה) — פגיעות '+JSON.stringify(r)+' מתוך 4 לכל כיוון');
r=await E(()=>{ const S=__sim; const a=S.seasonAll().length; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  for(const b of S.BOTS) b.on=false; S.setMatchT(S.tEnd()-0.1); S.advance(0.3,1/60); const L=S.seasonAll(); const m=L[L.length-1]; S.matchStop(); return {pv:m&&m.pv,n:L.length-a}; });
ok(r.pv===2,'R3: רשומת העונה מסומנת pv:2 ('+JSON.stringify(r)+')');

// R4 — מטמון bldAll
r=await E(()=>{ const S=__sim, X=S.v74rb; const a=S.bldAll(), b=S.bldAll(); const v0=X.BLDC.ver; S.bldSet(0,'starter',true); const c=S.bldAll(); S.bldSet(0,'classic',true);
  let t=performance.now(); for(let i=0;i<20000;i++) S.bldMe(); const us=(performance.now()-t)/20000*1000;
  return {same:a===b, rebuilt:c!==a, ids:c.map(x=>x.id).join(), us}; });
ok(r.same&&r.rebuilt&&r.ids.includes('starter'),'R4: bldAll ממטמון (אותה רשימה), נבנה מחדש אחרי bldSave');
ok(r.us<1.5,'R4: bldMe '+r.us.toFixed(2)+' מיקרו־שנ׳ (היה 2.7–3.8)');

// R5 — חימום בספירה ופיזור התכנון הראשון
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=3; S.gameStart(true); S.BRAIN.spotC={}; S.matchStart();
  const k=S.BOTS.map(b=>b.warmK); for(let i=0;i<10;i++) S.advance(1/60,1/60);
  const warm=Object.keys(S.BRAIN.spotC).length; S.MATCH.cd=0.01; S.advance(1/60,1/60);
  let mx=0; for(let i=0;i<5;i++){ const t=performance.now(); S.advance(1/60,1/60); mx=Math.max(mx,performance.now()-t); }
  S.matchStop(); S.MT.cd=0; return {k,warm,mx}; });
ok(r.warm>=2&&r.k.join()==='0,1,2','R5: עמדות הירי חוממו בספירה ('+r.warm+'), התכנון הראשון מפוזר ('+r.k.join()+')');
ok(r.mx<60,'R5: הצעדים הראשונים אחרי הצפירה עד '+r.mx.toFixed(1)+' מ״ש (היה 41–151)');

// B1 — חניה מזווית אלכסונית
r=await E(()=>{ const S=__sim; const out=[];
  for(const deg of [30,45,60]){ S.setRealm('comp'); S.SETUP.ally='blue'; S.MT.cd=0; S.gameStart(true); S.matchStart(); const [B1,B2,RP]=S.BOTS; B1.on=false; B2.on=false;
    S.setMatchT(S.tEnd()-14); S.advance(0.05,1/60); S.setPose(60,22,-90); S.advance(0.3,1/60);
    RP.body.position.set(S.M(42),0,S.M(4)); RP.yaw=deg*Math.PI/180; RP.vx=RP.vz=0; RP.parkGo=true; RP.parkS=null;
    S.advance(12,1/60); out.push(S.botInLZ(RP)); S.matchStop(); }
  return out; });
ok(r.every(Boolean),'B1: שותף מזווית 30/45/60° חונה ('+r.join()+') — קודם נתקע');

// B2 — נסיגה בתקיעה בחניה
r=await E(()=>{ const S=__sim, X=S.v74rb; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(S.tEnd()-10);
  const B=S.BOTS[2]; B.parkGo=true; B.parkS=null; B.stallT=2; B.parkStall=0; B.body.position.set(S.M(-30),0,S.M(-10));
  X.aiParkStep(B,1/60); const back=!!B.parkBack, n1=B.parkStall; B.parkBack=null; B.stallT=2; X.aiParkStep(B,1/60);
  const wp=!!B.parkWp; S.matchStop(); return {back,n1,wp}; });
ok(r.back&&r.n1===1&&r.wp,'B2: תקיעה ראשונה — נסיגה; שנייה — נקודת ביניים מהצד השני');

// B3a — הגבלת מהירות ליד המסילה (לא רק ליד הרגל)
r=await E(()=>{ const S=__sim, X=S.v74rb; S.gameStart(true); S.GAME.skill=2; const B=S.BOTS[0]; for(const o of S.BOTS) o.on=o===B;
  B.body.position.set(S.M(24.73+18),0,S.M(-2)); B.vx=B.vz=0; let mx=0;
  for(let i=0;i<30;i++){ X.aiDrive(B,24.73+18,-60,1/60); mx=Math.max(mx,Math.hypot(B.vx,B.vz)); }
  for(const o of S.BOTS) o.on=true; return {mx,rd:X.v74rbRailDist(24.73+18,-2),leg:Math.min(...S.frameLegs().map(L=>Math.hypot(L.x-42.73,L.z+2)))}; });
ok(r.mx<=1.1+1e-6&&r.leg>16,'B3a: 18″ מהמסילה, '+r.leg.toFixed(0)+'″ מהרגל — מוגבל ל-'+r.mx.toFixed(2)+' מ׳/ש׳ (קודם 1.45)');

// B4 — יעד הבולם מחוץ למבנה
r=await E(()=>{ const S=__sim, X=S.v74rb; const q=X.v74rbDefFree(30,40,-22.9,-17.1); const g=S.navStatic(S.navClrBot?S.navClrBot():10.5);
  return q; });
ok(Math.hypot(r.x+22.9,r.z+17.1)>2,'B4: יעד חסום (-22.9,-17.1) → ('+r.x.toFixed(1)+','+r.z.toFixed(1)+') על הקו, מחוץ למבנה');

// B5 — כל הרמות חכמות; השותף תמיד עליון
r=await E(()=>{ const S=__sim; S.SETUP.ally='red'; S.GAME.skill=0; S.gameStart(true);
  const sk=S.SKILL.map(k=>[k.v,k.cycle,k.think]); const P=S.BOTS[2], O=S.BOTS[0];
  const out={sk,partner:S.skill(P).k,opp:S.skill(O).k,tol:S.SKILL.map(k=>k.tol)}; S.GAME.skill=1;
  out.hint=!!document.querySelector('.v74skH'); return out; });
ok(r.sk.every(x=>x[0]===1&&x[1]===0.95&&x[2]===0),'B5: כל הרמות — אותה מהירות, קצב וזמן חשיבה ('+JSON.stringify(r.sk)+')');
ok(r.partner===2&&r.opp===0&&r.tol[0]>r.tol[2],'B5: ברמה 0 — השותף ברמה '+r.partner+', היריב '+r.opp+'; רק פיזור קטן שונה');
ok(r.hint,'B5: הבורר נשאר, עם הסבר כן');

// B6 — סיום מחסנית לפני החניה כשיש זמן
r=await E(()=>{ const S=__sim, X=S.v74rb; S.gameStart(true); const B=S.BOTS[2]; B.role='score'; B.ph='fire'; B.clip=['pollen','pollen'];
  B.spot={x:S.I(B.body.position.x),z:S.I(B.body.position.z)}; B.parkTrav=8; const a=X.v74rbFinishClip(B,20), b=X.v74rbFinishClip(B,9);
  B.clip=[]; B.spot=null; return {a,b}; });
ok(r.a&&!r.b,'B6: 20 שנ׳ — מסיים לירות; 9 שנ׳ — יוצא לחנות');

// B7 — כלל פינוי ראש בראש
r=await E(()=>{ const S=__sim, X=S.v74rb; S.setRealm('comp'); S.SETUP.ally='blue'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(50); const [A,,P]=S.BOTS; A.on=true; P.on=true;
  A.body.position.set(S.M(-6),0,S.M(-15)); P.body.position.set(S.M(-7),0,S.M(-32)); A.yieldT=0; P.yieldT=0;
  X.v74rbYieldCheck(A,-7,-60); X.v74rbYieldCheck(P,-6,10);
  const out={a:A.yieldT>0,p:P.yieldT>0}; S.matchStop(); return out; });
ok(r.a&&!r.p,'B7: מבוי סתום — היריב מפנה, השותף ממשיך');

// B8 — היפוך: עמדה חדשה קרובה → נשארים בירי
r=await E(()=>{ const S=__sim, X=S.v74rb; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(40);
  const B=S.BOTS[2]; for(const o of S.BOTS) o.on=o===B; B.role='score';
  const L=S.brainSpots(S.hiveRed); const s0=L[0]; B.body.position.set(S.M(s0.x),0,S.M(s0.z)); B.clip=['pollen','pollen'];
  B.spot={x:s0.x+1,z:s0.z,k:'old'}; B.ph='fire'; B.t=0; X.aiScoreStep(B,1/60); const ph=B.ph; S.matchStop(); for(const o of S.BOTS) o.on=true; return ph; });
ok(r==='fire','B8: העמדה נעלמה (היפוך) והחדשה קרובה — נשאר בשלב '+r);

// B9 — אזור מת: יעד באינץ׳ — בלי כוונת דחיפה
r=await E(()=>{ const S=__sim, X=S.v74rb; const B=S.BOTS[0]; B.body.position.set(S.M(10),0,S.M(10)); B.vx=B.vz=0;
  X.aiDrive(B,11,10,1/60); return Math.hypot(B.ivx,B.ivz); });
ok(r===0,'B9: יעד במרחק 1″ — כוונה '+r+' מ׳/ש׳ (היה 0.54–0.72)');

// B10 — בוט שעומד על 3 כדורים זז
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(50); S.clearBalls();
  const B=S.BOTS[0]; for(const o of S.BOTS) o.on=o===B; B.body.position.set(S.M(-20),0,S.M(50)); B.role='score'; B.ph='idle';
  for(let k=0;k<4;k++) S.addBall('pollen',-20+(k-1.5)*4,1.5,50+8);
  let n=0, x0=S.I(B.body.position.x), z0=S.I(B.body.position.z); for(let i=0;i<60*12;i++){ B.vx=B.vz=0; S.advance(1/60,1/60); }
  const g=S.REF.log.filter(e=>e.rule==='G411'&&e.team===B.name).length;
  const out={nudges:B.nudges||0,g411:g}; S.matchStop(); for(const o of S.BOTS) o.on=true; S.clearBalls(); return out; });
ok(r.g411===0,'B10: בוט ליד 4 כדורים 12 שנ׳ — '+r.g411+' קריאות G411 (תזוזות: '+r.nudges+')');

// U4 — זמן לחנות
r=await E(()=>{ const S=__sim, X=S.v74rb; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  for(const b of S.BOTS) b.on=false; S.setMatchT(S.tEnd()-30); S.advance(0.05,1/60); S.setPose(40,40,0); S.advance(0.6,1/60);
  const hud=X.v74rbParkHud(), g0=X.PARK4.goIn; let k=0; while(X.PARK4.goT==null&&k++<60*30) S.advance(1/60,1/60);
  const goT=X.PARK4.goT; S.advance(2,1/60); /* ״יוצא״ 2 שנ׳ אחרי */
  S.setPose(-62,-35,0); S.advance(0.6,1/60);
  const deb=X.v74rbParkDebrief(); S.matchStop(); return {hud,g0,goT,deb,said:!!S.SND&&S.SND.said&&S.SND.said.parkGo}; });
ok(/🅿/.test(r.hud)||r.g0>20,'U4: שורת 🅿 בכרטיס הירי ('+r.hud.replace(/<[^>]+>/g,'')+', goIn '+(r.g0||0).toFixed(1)+')');
ok(r.goT!=null,'U4: רגע היציאה חושב (t='+r.goT+')');
ok(/מאוחר|מוקדם|בזמן/.test(r.deb),'U4: שורת תחקיר — '+r.deb.replace(/<[^>]+>/g,' '));

ok(realErrs(errs).length===0,'אין שגיאות בדף '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();
done('v74_rulesbots');
