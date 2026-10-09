// 1.12.5 / 1.13 — חוקים ובוטים (v72 rules): R1 R2 R3 R4 R6 R7 R8 R9 · B1 B2 B3 B4
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);

// R1 — בוט לא לוקח כדור שלקיחתו עבירה, והשופט רואה כל בוט (לא רק נהג אנושי)
let r=await E(()=>{ const S=__sim, X=S.v72rules; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  for(const b of S.BOTS) b.on=false; S.MATCH.t=40; S.advance(0.1,1/60); S.clearBalls();
  const B=S.BOTS[2]; B.on=true; B.body.position.set(S.M(-40),0,S.M(30)); B.yaw=0; B.vx=B.vz=0; B.clip.length=0; S.advance(0.05,1/60);
  const mouth=()=>({x:S.I(B.body.position.x)+Math.sin(B.yaw)*(17/2+1.4), z:S.I(B.body.position.z)+Math.cos(B.yaw)*(17/2+1.4)});
  const out={};
  // כדור שנשפך מהכוורת (G409) בפה של בוט AI — לא נלקח
  let m=mouth(); let bl=S.addBall('pollen',m.x,1.5,m.z); bl.fromTip=S.simT||1;
  out.tipIllegal=X.refIllegalTake(bl,'red'); out.blue=X.refIllegalTake({kind:'blue',body:bl.body},'red'); out.pol=X.refIllegalTake({kind:'pollen',body:{position:{x:0,y:0.03,z:0}}},'red');
  for(let i=0;i<10;i++) X.aiIntake(B,1/60);
  out.aiTookTip=B.clip.length; S.clearBalls();
  // פולן רגיל — נלקח
  m=mouth(); S.addBall('pollen',m.x,1.5,m.z); for(let i=0;i<10;i++) X.aiIntake(B,1/60); out.aiTookLegal=B.clip.length;
  // נהג אנושי באותו רובוט לוקח את הכדור מהכוורת — והשופט קורא לו (קודם: רק לנהג אנושי; עכשיו לכל בוט)
  B.clip.length=0; S.clearBalls(); S.REF.log.length=0; S.humSeat(B,'test','t');
  m=mouth(); bl=S.addBall('pollen',m.x,1.5,m.z); bl.fromTip=1; for(let i=0;i<10;i++) X.aiIntake(B,1/60);
  out.humTook=B.clip.length; out.log=S.REF.log.map(e=>e.rule+' '+e.team); S.humFree(B);
  S.matchStop(); return out; });
ok(r.tipIllegal&&r.blue&&!r.pol,'refIllegalTake: נשפך מהכוורת / נקטר יריב = עבירה, פולן על הרצפה = מותר');
ok(r.aiTookTip===0&&r.aiTookLegal===1,'R1: בוט AI מדלג על כדור שנשפך מהכוורת ('+r.aiTookTip+') ולוקח פולן רגיל ('+r.aiTookLegal+')');
ok(r.humTook===1&&r.log.some(x=>/^G409 /.test(x)&&!/ me$/.test(x)),'R1: לקיחה לא חוקית ע״י רובוט עמדה נקראת (G409 לשם שלו) · '+r.log.join(','));

// R2 — מצב פתוח לא משאיר אורכי שלבים/פרחים ריקים/היפוך כבוי לתחרות
r=await E(()=>{ const S=__sim;
  S.setRealm('open'); Object.assign(S.SETUP,{cd:0,auto:10,trans:0,tele:20,autoOn:true,flow:0,autoTip:false,mag:8});
  S.setupApply(); S.advance(0.2,1/60); S.matchStop(); if(S.setupClose) S.setupClose();
  const leak={MT:{...S.MT},flow:S.P.stageFlow,at:S.autoTip};
  S.setRealm('comp'); S.MT.cd=0; S.gameStart(true); S.matchStart();
  const res={leak, MT:{...S.MT}, tEnd:S.tEnd(), flow:S.P.stageFlow, at:S.autoTip}; S.matchStop(); return res; });
ok(r.leak.MT.tele===20&&r.leak.flow===0,'R2 לפני: במצב פתוח MT.tele=20 ופולן בפרחים 0');
ok(r.MT.auto===30&&r.MT.trans===8&&r.MT.tele===120&&r.tEnd===158&&r.flow===4&&r.at===true,'R2: בתחרות — 30/8/120 (סוף '+r.tEnd+'), פולן בפרחים '+r.flow+', היפוך אוטומטי '+r.at);

// R3 — דחיפה: חיכוך בלימה. הכבד/החזק מנצח, ואין החלקה אחרי שחרור
r=await E(()=>{ const S=__sim, out={}; S.setRealm('comp'); S.gameStart(true); S.clearBalls();
  const B=S.BOTS[0]; for(const o of S.BOTS) if(o!==B) o.on=false;
  for(const m of [4,20]){ S.setP('botMass',m); S.apply('chas'); S.humSeat(B,'test','t'); B.on=true;
    S.setPose2(-40,40,90); B.body.position.set(S.M(-19),0,S.M(40)); B.yaw=-Math.PI/2; B.vx=B.vz=0; B.body.velocity.set(0,0,0); S.advance(0.1,1/60);
    const x0=S.I(S.botBody.position.x);
    for(let i=0;i<120;i++){ S.humFeed(B,{x:0,y:1,t:0,fc:false}); S.advance(1/60,1/60); }
    const x1=S.I(S.botBody.position.x);
    for(let i=0;i<60;i++){ S.humFeed(B,{x:0,y:0,t:0,fc:false}); S.advance(1/60,1/60); }
    out['in'+m]={pushed:x0-x1, slide:Math.abs(x1-S.I(S.botBody.position.x))};
    S.setPose2(-40,40,90); B.body.position.set(S.M(-19),0,S.M(40)); B.vx=B.vz=0; B.body.velocity.set(0,0,0); S.advance(0.1,1/60);
    const b0=S.I(B.body.position.x); S.key('KeyW',true);
    for(let i=0;i<120;i++){ S.humFeed(B,{x:0,y:0,t:0,fc:false}); S.advance(1/60,1/60); }
    S.key('KeyW',false); const b1=S.I(B.body.position.x);
    for(let i=0;i<60;i++){ S.humFeed(B,{x:0,y:0,t:0,fc:false}); S.advance(1/60,1/60); }
    out['out'+m]={pushed:b1-b0, slide:Math.abs(S.I(B.body.position.x)-b1)};
    S.humFree(B); }
  S.setP('botMass',12.5); S.apply('chas'); return out; });
ok(r.in4.pushed>10&&r.in20.pushed<2,'R3: בוט של 13 ק״ג דוחף אותי בבלימה — 4 ק״ג זז '+r.in4.pushed.toFixed(1)+'″, 20 ק״ג רק '+r.in20.pushed.toFixed(1)+'″ (קודם 6.5″)');
ok(r.out20.pushed>30&&r.out4.pushed<2,'R3: אני דוחף רובוט עמדה בבלימה — 20 ק״ג מזיז '+r.out20.pushed.toFixed(1)+'″, 4 ק״ג רק '+r.out4.pushed.toFixed(1)+'″');
ok(r.in4.slide<0.5&&r.in20.slide<0.5&&r.out20.slide<4,'R3: אחרי שהדחיפה נגמרת עוצרים מהר (אני '+r.in4.slide.toFixed(2)+'″, הבוט '+r.out20.slide.toFixed(2)+'″)');

// R4 — מנוע הנעה חוקי ותקרת מהירות בתחרות; פתוח — חופשי
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.gameStart(false); S.clearBalls();
  S.setP('speed',4); S.setP('driveRpm',6000); S.setP('driveNm',20); S.apply('chas');
  S.setPose2(-55,-40,0); S.advance(0.3,1/60); S.key('KeyW',true); let mx=0;
  for(let i=0;i<120;i++){ S.advance(1/60,1/60); mx=Math.max(mx,Math.hypot(S.botBody.velocity.x,S.botBody.velocity.z)); }
  S.key('KeyW',false); S.advance(0.5,1/60);
  const comp={rpm:S.P.driveRpm,nm:S.P.driveNm,a:S.P.driveAmp,speed:S.P.speed,mx,legal:S.v72rules.compMotorOf(S.P.driveRpm,S.P.driveNm,S.P.driveAmp)};
  S.setRealm('open'); S.setP('speed',4); S.setP('driveRpm',6000); S.setP('driveNm',20); S.apply('chas'); S.advance(0.1,1/60);
  const open={rpm:S.P.driveRpm,nm:S.P.driveNm,speed:S.P.speed};
  S.setP('speed',2.2); S.setP('driveRpm',312); S.setP('driveNm',3.57); S.setP('driveAmp',9.2); S.apply('chas'); S.setRealm('comp');
  return {comp,open}; });
ok(r.comp.legal==='gb6000'&&r.comp.speed===2.5,'R4: בתחרות 6000 סל״ד + 20 N·m → המנוע האמיתי ('+r.comp.legal+', '+r.comp.nm+' N·m), תקרה '+r.comp.speed+' מ׳/ש׳');
ok(r.comp.mx<2.6,'R4: מהירות מרבית בתחרות '+r.comp.mx.toFixed(2)+' מ׳/ש׳ (קודם 3.99)');
ok(r.open.rpm===6000&&r.open.nm===20&&r.open.speed===4,'R4: במצב פתוח הכול נשאר חופשי');

// R6 — כרטיס אדום של בוט יריב פוסל את הברית שלו (סוף + RP)
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  for(const b of S.BOTS) b.on=false; S.MATCH.t=40; S.advance(0.1,1/60);
  const B=S.BOTS[0]; for(let i=0;i<2;i++) S.refCall({rule:"G417",team:B.name,ally:B.ally,sev:["major","yellow"],what:"t"});
  S.MATCH.t=S.tEnd()-0.05; S.advance(0.2,1/60);
  const out={ally:B.ally,dq:S.MATCH.dq,dqA:{...S.MATCH.dqA},final:{...S.MATCH.final},rp:S.MATCH.rp.win};
  S.matchStop(); S.REF.carry={}; return out; });
ok(r.final.blue===0&&r.dqA.blue&&!r.dq&&r.rp===3,'R6: כרטיס אדום לבוט כחול → כחול 0 בסוף, ניצחון לי ('+JSON.stringify(r.final)+')');

// R7 — G417 לא תלוי בקצב הפריימים
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  for(const b of S.BOTS) b.on=false; S.MATCH.t=40; S.advance(0.1,1/60);
  const L=S.frameLegs().find(l=>l.x<0&&l.z<0), out=[];
  for(const step of [1/60,1/30]){
    S.REF.log.length=0; S.REF.warn={}; S.REF.once={}; S.REF.legArmed=true; S.REF.legT=9;
    S.setPose2(L.x-40,L.z,90); S.advance(0.1,step); S.key('KeyW',true);
    for(let i=0;i<Math.round(1.6/step);i++) S.advance(step,step);
    S.key('KeyW',false); S.advance(0.3,step);
    out.push(S.REF.log.filter(e=>e.rule==='G417').length); }
  S.matchStop(); return out; });
ok(r[0]===1&&r[1]===1,'R7: פגיעה ב-1.64 מ׳/ש׳ ברגל המסגרת נקראת גם בצעד של 1/60 וגם של 1/30 ('+r.join(',')+')');

// R8 — botInLZ לפי זווית
r=await E(()=>{ const S=__sim; const P=S.BOTS[2]; P.on=true; const hd=Math.hypot(8.5,8.5);
  P.body.position.set(S.M(-59.1-2+hd),0,S.M(-35)); P.yaw=Math.PI/4; const a=S.botInLZ(P);
  P.body.position.set(S.M(-59.1+2+hd),0,S.M(-35)); const b=S.botInLZ(P); P.yaw=0; return {a,b}; });
ok(r.a&&!r.b,'R8: בוט מסובב 45° שפינתו 2″ בתוך אזור הטעינה — בפנים; 2″ בחוץ — לא');

// R9 — ניקוד אחד: הברית
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  S.advance(31,1/60); const a=S.scoreAlly('red'), n=S.scoreNow(); S.matchStop();
  return {a:a.total,n:n.total,al:a.leave+a.park,nl:n.leave+n.park,mine:n.mine}; });
ok(r.a===r.n&&r.al===r.nl&&r.mine&&typeof r.mine.leave==='number','R9: scoreNow = ניקוד הברית ('+r.n+'), התרומה שלי בנפרד ('+JSON.stringify(r.mine)+')');

// B1 — אותו מרווח לרגל, והבוט מאט ליד הרגליים
r=await E(()=>{ const S=__sim, X=S.v72rules; S.gameStart(true); S.GAME.skill=2; const B=S.BOTS[2]; for(const o of S.BOTS) o.on=o===B;
  const L=S.frameLegs()[0];
  B.yaw=Math.PI/2; B.body.position.set(S.M(L.x-8.5-1.8),0,S.M(L.z)); const far=S.legContact(B);
  B.body.position.set(S.M(L.x-8.5-1.0),0,S.M(L.z)); const near=S.legContact(B);
  B.body.position.set(S.M(L.x-14),0,S.M(L.z-6)); B.vx=B.vz=0; let mx=0;
  for(let i=0;i<30;i++){ X.aiDrive(B,L.x-14,L.z-60,1/60); mx=Math.max(mx,Math.hypot(B.vx,B.vz)); }
  B.body.position.set(S.M(-50),0,S.M(50)); B.vx=B.vz=0; let mx2=0;
  for(let i=0;i<30;i++){ X.aiDrive(B,-50,-10,1/60); mx2=Math.max(mx2,Math.hypot(B.vx,B.vz)); }
  return {far,near,mx,mx2}; });
ok(!r.far&&r.near,'B1: בוט 1.8″ מהרגל — לא מגע; 1.0″ — מגע (אותו 1.3″ כמו אצלי)');
ok(r.mx<=1.1+1e-6&&r.mx2>1.3,'B1: ליד הרגל הבוט מוגבל ל-'+r.mx.toFixed(2)+' מ׳/ש׳, בשטח פתוח '+r.mx2.toFixed(2));

// B2 — השותף חונה כשאני באמצע אזור הטעינה, ולא דוחף אותי
/* מצב נקי: הבדיקות הקודמות משאירות כדורים/בוטים במקומות שמשנים את הנתיב לחניה */
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
r=await E(()=>{ const S=__sim; S.MT.cd=0; S.SETUP.ally='red'; S.gameStart(true); S.matchStart();
  const [B1,B2,RP]=S.BOTS; B1.on=false; B2.on=false;
  S.setMatchT(S.tEnd()-14); S.advance(0.05,1/60); S.setPose(-60.4,-35,90); S.advance(0.5,1/60);
  const me0={x:S.I(S.botBody.position.x),z:S.I(S.botBody.position.z)};
  RP.body.position.set(S.M(-36),0,S.M(-30)); RP.vx=RP.vz=0; RP.parkGo=true; RP.parkS=null;
  S.advance(11,1/60);
  const out={lz:S.botInLZ(RP), moved:Math.hypot(S.I(S.botBody.position.x)-me0.x,S.I(S.botBody.position.z)-me0.z), at:S.I(RP.body.position.x).toFixed(0)+','+S.I(RP.body.position.z).toFixed(0)};
  S.matchStop(); return out; });
ok(r.lz&&r.moved<3,'B2: השותף חנה ('+r.at+') כשאני באמצע אזור הטעינה, ואני זזתי '+r.moved.toFixed(1)+'″');

// B3 — תקלת סוללה מאטה בוט גם ברמה 0
r=await E(()=>{ const S=__sim; const out=[];
  for(const batt of [false,true]){ S.MT.cd=0; S.GAME.skill=0; S.gameStart(true); S.matchStart(); S.setMatchT(40);
    const [B1,B2,RP]=S.BOTS; B1.on=false; B2.on=false; S.FAULT.bots=true; RP.flt={k:null,t:0,next:999,batt};
    RP.body.position.set(S.M(-50),0,S.M(-30)); RP.vx=RP.vz=0; RP.parkGo=true; RP.parkS={x:40,z:30};
    let mx=0; for(let i=0;i<180;i++){ S.advance(1/60,1/60); mx=Math.max(mx,Math.hypot(RP.body.velocity.x,RP.body.velocity.z)); }
    out.push(mx); S.FAULT.bots=false; S.matchStop(); }
  S.GAME.skill=1; return out; });
ok(r[1]<r[0]*0.96,'B3: סוללה חלשה ברמה 0 — '+r[0].toFixed(3)+' → '+r[1].toFixed(3)+' מ׳/ש׳');

// B4 — תרגיל לא מלמד את הבולם
r=await E(()=>{ const S=__sim; const m0=S.MEM.matches;
  S.drillStart('end'); for(let i=0;i<5;i++){ S.advance(4.5,1/60); try{ S.uFire(); }catch(e){} }
  let k=0; while((S.MATCH.on||S.MATCH.cd>0)&&k++<200) S.advance(0.5,1/60);
  const last=S.seasonAll().slice(-1)[0]; return {kind:last&&last.kind, m0, m1:S.MEM.matches}; });
ok(r.kind==='drill'&&r.m1===r.m0,'B4: תרגיל ('+r.kind+') לא נכנס לזיכרון הבולם ('+r.m0+' → '+r.m1+')');

// אנגלית — המחרוזות החדשות מתורגמות
r=await E(()=>{ const d=document.getElementById('i18nX_v72rules'); return d?JSON.parse(d.textContent):null; });
ok(r&&Object.keys(r).length>=4&&Object.values(r).every(v=>!/[֐-׿]/.test(v)),'מילון v72rules: כל מחרוזת עם אנגלית');

ok(realErrs(errs).length===0,'בלי שגיאות בדף '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();
done('v72_rules_test');
