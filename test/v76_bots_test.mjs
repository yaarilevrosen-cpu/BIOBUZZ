// v76 בוטים ומשחק: מטח אחרון, מרווח חניה מסתגל ונוסחה אחת, נעילת הסטיק בסיוע, התרעת אגירה,
// אוטונומי לשותף, שחרור טנק, קריאות לשותף, נתיב חניה זוהר ורעידה בהיפוך
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);

// 1 — מטח אחרון: מפסיקים לאסוף, יורים, ואז חונים
let r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  const B=S.BOTS[2]; for(const o of S.BOTS) o.on=o===B; S.setMatchT(S.tEnd()-60); S.advance(0.05,1/60);
  B.role='score'; B.clip=['pollen','pollen']; B.ph='approach'; B.lastVol=false; B.lvChk=0; B.parkGo=false;
  X.v76LastVolley(B,40,0.1); const far=B.lastVol;
  B.lvChk=0; X.v76LastVolley(B,9,0.1); const near=B.lastVol, ph=B.ph;
  B.clip=[]; X.v76LastVolley(B,8,0.1); const go=B.parkGo;
  /* noPark (מהסקאוטינג): יורה ולא חונה — אחר כך חוסם */
  B.parkGo=false; B.lastVol=true; B.noPark=true; X.v76LastVolley(B,8,0.1); const np={go:B.parkGo,blk:B.lvBlock};
  B.noPark=undefined; B.lvBlock=false; B.lastVol=false;
  const out={far,near,ph,go,np}; S.matchStop(); for(const o of S.BOTS) o.on=true; return out; });
ok(!r.far&&r.near&&r.ph==='aim','מטח אחרון: 40 שנ׳ — ממשיך לאסוף; 9 שנ׳ — עובר לירי ('+r.ph+')');
ok(r.go,'מטח אחרון: המחסנית ריקה — יוצא לחנות');
ok(!r.np.go&&r.np.blk,'noPark: אחרי המטח לא חונה — חוסם עד הסוף');

// 2 — לא מתחילים איסוף שאין זמן לירות אחריו
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  const B=S.BOTS[2]; for(const o of S.BOTS) o.on=o===B; B.role='score'; B.clip=[];
  const fl={x:-60,z:24,loose:true};
  S.setMatchT(S.tEnd()-44); S.advance(0.05,1/60); const a=X.v76NoTimeForCycle(B,fl);
  S.setMatchT(S.tEnd()-7); S.advance(0.05,1/60); const b=X.v76NoTimeForCycle(B,fl);
  S.matchStop(); for(const o of S.BOTS) o.on=true; return {a,b}; });
ok(!r.a&&r.b,'איסוף: 44 שנ׳ — יוצא לאסוף; 7 שנ׳ — לא מתחיל (חוסם ליד האזור)');

// 3 — מרווח מסתגל ונוסחה אחת
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  const B=S.BOTS[2], O=S.BOTS[0]; for(const o of S.BOTS) o.on=o===B||o===O; S.setMatchT(S.tEnd()-30); S.advance(0.05,1/60);
  const s={x:-62,z:-44}; O.body.position.set(S.M(80),0,S.M(80));
  const n0=X.v76ParkNeed(B,60,s), n1=X.v76ParkNeed(B,160,s);
  O.body.position.set(S.M(-58),0,S.M(-40)); const n2=X.v76ParkNeed(B,60,s);
  const h=X.v76ParkNeed(null,60,s);
  S.matchStop(); for(const o of S.BOTS) o.on=true;
  return {n0,n1,n2,h,tr:X.v76ParkTrav(100,1.45)}; });
ok(r.n0.margin>=4.5&&r.n0.margin<8.5,'מרווח לבוט '+r.n0.margin.toFixed(1)+' שנ׳ (היה 8.5 קבוע, לפחות 4.5)');
ok(r.n1.margin>r.n0.margin,'נסיעה ארוכה — מרווח גדול יותר ('+r.n0.margin.toFixed(1)+' → '+r.n1.margin.toFixed(1)+')');
ok(r.n2.margin>r.n0.margin&&r.n2.cong>=1,'יריב ליד המשבצת — מרווח גדול יותר ('+r.n2.margin.toFixed(1)+', עומס '+r.n2.cong+')');
ok(Math.abs(r.tr-2.54/(1.45*0.55))<0.01&&r.h.margin>=3,'נוסחה אחת: 100″ ב-1.45 מ׳/ש׳ = '+r.tr.toFixed(2)+' שנ׳; לנהג מרווח '+r.h.margin.toFixed(1));

// 4 — הנהג: ״לצאת לחניה בעוד״ לפי אותה נוסחה
r=await E(()=>{ const S=__sim, X=S.v74rb, Y=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  for(const b of S.BOTS) b.on=false; S.setMatchT(S.tEnd()-30); S.advance(0.05,1/60); S.setPose(40,40,0); S.advance(0.6,1/60);
  const P4=X.PARK4; const out={trav:P4.trav,margin:P4.margin,goIn:P4.goIn};
  let k=0; while(P4.goT==null&&k++<60*30) S.advance(1/60,1/60);
  S.advance(0.5,1/60); out.glow=!!(Y.V76G.grp&&Y.V76G.grp.visible); out.segs=Y.V76G.segs.filter(m=>m.visible).length;
  S.setPose(-62,-35,0); S.advance(0.6,1/60); out.glowAfter=!!(Y.V76G.grp&&Y.V76G.grp.visible);
  S.matchStop(); for(const b of S.BOTS) b.on=true; return out; });
ok(r.trav>0&&r.margin>=3,'U4 עם הנוסחה האחת: נסיעה '+(r.trav||0).toFixed(1)+' + מרווח '+(r.margin||0).toFixed(1)+' שנ׳');
ok(r.glow&&r.segs>0,'״לחניה עכשיו!״ — נתיב זוהר על הרצפה ('+r.segs+' קטעים)');
ok(!r.glowAfter,'בחניה — הנתיב נעלם');

// 5 — סיוע כיוון בסטרייף בנהיגה לפי הרובוט (ברירת המחדל לא משתנה)
r=await E(()=>{ const S=__sim, dt=1/120; S.setRealm('comp'); S.gameStart(false); S.stageMatch(); S.clearBalls(); for(const b of S.BOTS) b.on=false;
  const def=S.fieldCentric; let h=0;
  S.aimAssist=true; S.fieldCentric=false;
  for(let k=0;k<6;k++){ S.clearBalls(); S.shotPose(); const yaw=S.bot.yaw, fx=Math.sin(yaw), fz=Math.cos(yaw); const key=k%2?'KeyA':'KeyD';
    const dir={KeyA:[fz,-fx],KeyD:[-fz,fx]}[key]; S.botBody.position.x+=dir[0]*0.6; S.botBody.position.z+=dir[1]*0.6;
    S.advance(0.3,dt); S.key(key,true); S.advance(0.5,dt); S.bot.clip=['pollen','pollen','pollen','pollen']; S.refreshAim(); const rec=S.fire(); S.key(key,false);
    S.advance(1.6,dt); if(rec&&rec.logEntry&&rec.logEntry.hit) h++; }
  S.aimAssist=false; S.fieldCentric=false; S.clearBalls(); return {h,def}; });
ok(r.h>=5,'סטרייף עם סיוע לפי הרובוט: '+r.h+'/6 (היה 0–1)');
ok(r.def===false,'ברירת המחדל נשארת ״לפי הרובוט״');

// 6 — התרעת אגירה לנהג לפני G411
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.clearBalls();
  for(const b of S.BOTS) b.on=false; S.setMatchT(50); S.advance(0.05,1/60); S.setPose(-30,40,0); S.advance(0.3,1/60);
  S.intake=false; for(let k=0;k<4;k++) S.addBall('pollen',-30+(k-1.5)*4,1.5,40+12);
  const n0=(S.HUM.log||[]).length, f0=S.REF.log.filter(e=>e.rule==='G411').length; S.advance(3.4,1/60);
  const L=(S.HUM.log||[]).slice(n0), w=L.find(e=>/G411/.test(e.txt)), f1=S.REF.log.filter(e=>e.rule==='G411').length;
  const toast=document.getElementById('refToast').textContent;
  S.matchStop(); S.clearBalls(); for(const b of S.BOTS) b.on=true; S.intake=true; return {w:w&&w.txt,toast,calls:f1-f0}; });
ok(!!r.w&&/G411/.test(r.toast),'אגירה: כרטיס אחרי ~3 שנ׳ — '+r.w);
ok(r.calls===0,'ההתרעה מגיעה לפני הקריאה ('+r.calls+' קריאות G411)');

// 7 — אוטונומי: השותף תמיד מלא, יריבים ״ירי מהעמדה״ או ״מחזור״ בלבד; בחירה מפורשת נשמרת
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='blue'; S.MT.cd=0; S.gameStart(true);
  const seen=new Set(), part=new Set();
  for(let k=0;k<12;k++){ S.GAME.randAuto=true; S.matchStart(); S.BOTS.forEach((b,i)=>{ (X.v76BotPartner(b,i)?part:seen).add(b.autoLvl); }); S.matchStop(); }
  S.GAME.randAuto=false; S.matchStart(); const P=S.BOTS[2]; P.autoLvl='leave'; const kept=P.autoLvl; S.matchStop();
  return {seen:[...seen],part:[...part],kept}; });
ok(r.part.length===1&&r.part[0]==='cycle','השותף תמיד ״מחזור מלא״ ('+r.part.join(',')+')');
ok(r.seen.every(x=>x==='preload'||x==='cycle')&&r.seen.length===2,'יריבים: רק '+r.seen.join(' / '));

// 8 — טנק: נסיגה של 0.6 שנ׳ ואז תכנון מחדש, בכל שלב
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true);
  S.bldSet(0,'starter',true); S.matchStart(); const B=S.BOTS[0], O=S.BOTS[1]; for(const o of S.BOTS) o.on=o===B||o===O; S.setMatchT(50); S.advance(0.05,1/60);
  B.role='score'; B.lvBlock=false; B.parkGo=false; B.parkA=false; B.v76Back=null; B.v76BackN=0; B.stallT=1.3;
  B.body.position.set(S.M(20),0,S.M(0)); O.body.position.set(S.M(90),0,S.M(90)); S.world.step(1/120); B.stallT=1.3;
  const free=X.v76TankBack(B,40,1/60);                       /* רק רצפה — לא נסיגה */
  B.body.position.set(S.M(20),0,S.M(0)); O.body.position.set(S.M(20+S.AIC.L-0.3),0,S.M(0)); S.world.step(1/120);
  B.stallT=1.3; const a=X.v76TankBack(B,40,1/60), had=!!B.v76Back; S.advance(0.7,1/60); B.stallT=0; const after=X.v76TankBack(B,40,1/60);
  const out={a,had,after,free,n:B.v76Backs};
  /* מגע עם רובוט של היריב — לא נסוגים (כל דחיפה חוזרת נספרת כהצמדה) */
  const Pp=S.BOTS[2]; Pp.on=true; Pp.body.position.set(S.M(20-S.AIC.L+0.3),0,S.M(0)); O.body.position.set(S.M(90),0,S.M(90)); S.world.step(1/120);
  B.v76Back=null; B.v76BackN=0; B.stallT=1.3; out.foe=X.v76TankBack(B,40,1/60);
  B.role='defend'; B.stallT=1.3; out.def=X.v76TankBack(B,40,1/60); B.role='score';
  S.bldSet(1,'classic',true); const C=S.BOTS[1]; C.on=true; C.stallT=1.3; C.v76Back=null; out.mec=X.v76TankBack(C,40,1/60);
  S.matchStop(); for(const o of S.BOTS) o.on=true; return out; });
ok(!r.free&&r.a&&r.had&&!r.after&&r.n>=1,'טנק תקוע במגע — נסיגה ('+r.n+') ואז ממשיך; בלי מגע — לא');
ok(!r.mec,'מכאנום — בלי נסיגה גנרית');
ok(!r.foe&&!r.def,'מול רובוט של היריב, או כבולם — בלי נסיגה (G421)');

// 9 — קריאות לשותף: מקלדת, שלט, סטודיו, ״השותף מדבר״
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  S.setMatchT(45); S.advance(0.5,1/60); const P=X.v76Partner();
  const kb=S.KB.binds.filter(b=>/^ptn/.test(b.a)).map(b=>b.k), pad=[10,11,16].map(i=>S.PADB[i].a);
  const grp=X.PSGRP.some(g=>g[1].indexOf('ptnPark')>=0);
  return {p:P&&P.name,kb,pad,grp}; });
ok(r.p&&r.kb.join()==='Digit7,Digit8,Digit9','מקשים 7 / 8 / 9 ('+r.kb.join()+')');
ok(r.pad.join()==='ptnDefend,ptnScore,ptnPark'&&r.grp,'שלט: L3 / R3 / בית, ובסטודיו קבוצת ״שותף״');
await E(()=>{ document.getElementById('refToast').className=''; });
await page.keyboard.press('Digit7');
r=await E(()=>{ const S=__sim, X=S.v76b; S.advance(0.6,1/60); const P=X.v76Partner();
  const o={role:P.role,call:P.callK,ico:P.v76Ico&&P.v76Ico.visible&&P.v76Ico.userData.k,toast:document.getElementById('refToast').textContent};
  /* המוח לא מחליף תפקיד שהנהג ביקש */
  S.GAME.randomRoles=true; S.advance(4.5,1/60); o.held=P.role; return o; });
ok(r.role==='defend'&&r.call==='defend','7 — השותף בולם');
ok(r.ico==='defend'&&/השותף: קיבלתי — בולם/.test(r.toast),'השותף מדבר: 🛡 מעליו ו״'+r.toast+'״');
ok(r.held==='defend','הקריאה נשמרת מול המוח');
await E(()=>{ document.getElementById('refToast').className=''; });
await page.keyboard.press('Digit9');
r=await E(()=>{ const S=__sim, X=S.v76b; S.advance(0.5,1/60); const P=X.v76Partner(); const o={go:P.parkGo,ico:P.v76Ico.userData.k,toast:document.getElementById('refToast').textContent}; return o; });
ok(r.go&&r.ico==='park'&&/חניה/.test(r.toast),'9 — ״חנה עכשיו״: '+r.toast);
await page.keyboard.press('Digit8');
r=await E(()=>{ const S=__sim, X=S.v76b; S.advance(0.5,1/60); const P=X.v76Partner(); const o={role:P.role,go:P.parkGo,ico:P.v76Ico.userData.k};
  S.matchStop(); S.advance(0.1,1/60); o.icoOff=!P.v76Ico.visible; return o; });
ok(r.role==='score'&&!r.go&&r.ico==='score','8 — חוזר לנקד, החניה בוטלה (🎯)');
ok(r.icoOff,'אחרי המאץ׳ — הסמל נעלם');

// 10 — רעידת מצלמה בהיפוך: רק במאץ׳, לא בשידור ולא בתנועה מופחתת
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(50); S.advance(0.05,1/60);
  X.V76SH.t=0; X.v76ShakeStart(); const on=X.V76SH.t; X.v76ShakeApply(0.35); const dec=X.V76SH.t;
  S.matchStop(); X.V76SH.t=0; X.v76ShakeStart(); const off=X.V76SH.t; return {on,dec,off}; });
ok(r.on>0&&r.on<=0.3&&r.dec===0,'היפוך במאץ׳ — רעידה '+r.on+' שנ׳ ודועכת');
ok(r.off===0,'מחוץ למאץ׳ — בלי רעידה');
await page.emulateMedia({reducedMotion:'reduce'});
r=await E(()=>{ const S=__sim, X=S.v76b; S.setRealm('comp'); S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(50); S.advance(0.05,1/60);
  X.V76SH.t=0; X.v76ShakeStart(); const t=X.V76SH.t; S.matchStop(); return t; });
ok(r===0,'תנועה מופחתת — בלי רעידה');
await page.emulateMedia({reducedMotion:'no-preference'});

// 11 — טווח מועדף מהסקאוטינג (b.prefRange)
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.setMatchT(50); S.advance(0.05,1/60);
  const B=S.BOTS[2]; const f=S.mouthFrame(S.hiveRed), mx=S.I(f.c.x), mz=S.I(f.c.z); const L=S.brainSpots(S.hiveRed);
  const rng=s=>Math.hypot(s.x-mx,s.z-mz); const pick=pr=>{ B.prefRange=pr; B.spot=null; const s=S.brainPickSpot(B); return s?rng(s):null; };
  const near=pick(10), far=pick(150); B.prefRange=undefined; S.matchStop(); return {near,far,n:L.length}; });
ok(r.near!=null&&r.far!=null&&r.near<=r.far,'prefRange: קרוב '+(r.near||0).toFixed(0)+'″ / רחוק '+(r.far||0).toFixed(0)+'″ ('+r.n+' עמדות)');

// 12 — שמירה ישנה של מקלדת ושלט מקבלת את הקריאות רק במקום פנוי
await E(()=>{ localStorage.setItem('bbKeyBind1',JSON.stringify({move:{fwd:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',turnL:'KeyQ',turnR:'KeyE'},binds:[{k:'Space',a:'fire',m:'press'},{k:'Digit7',a:'dump',m:'press'}],v58:1,v61:1}));
  const o={}; for(let i=0;i<17;i++) o[i]={a:'none',m:'press'}; o[11]={a:'tip',m:'press'}; localStorage.setItem('bbPadBind1',JSON.stringify(o)); });
await page.reload({timeout:90000}); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
r=await E(()=>{ const S=__sim; return {kb:S.KB.binds.map(b=>b.k+':'+b.a), pad:[10,11,16].map(i=>S.PADB[i].a)}; });
ok(r.kb.indexOf('Digit7:dump')>=0&&r.kb.indexOf('Digit8:ptnScore')>=0&&r.kb.indexOf('Digit9:ptnPark')>=0&&!r.kb.some(x=>/ptnDefend/.test(x)),'מקלדת ישנה: 7 נשאר ״רוקן״, 8 ו-9 נוספו');
ok(r.pad.join()==='ptnDefend,tip,ptnPark','שלט ישן: R3 נשאר ״היפוך״, L3 ובית קיבלו קריאות');
await E(()=>{ localStorage.removeItem('bbKeyBind1'); localStorage.removeItem('bbPadBind1'); });

ok(realErrs(errs).length===0,'אין שגיאות בדף '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();
done('v76_bots');
