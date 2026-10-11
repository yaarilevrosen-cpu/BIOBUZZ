// v74 · auto — הייצוא נוסע כמו הסימולטור: טנק מסתובב במקום (A1), שומר החניה בקוד (A2), חניה למשבצת (A3), זחילת איסוף (A4),
// בדיקת שותף אחרי החלפת ברית/פינה (A5), יומן מול התוכנית המיוצאת (A6), אזהרת קו אמצע (A7), כרטיס לבור (A8/A9), קצב RR (U1),
// טבלת משגר (U3), Pedro Pathing ומחלקה מלאה (U7).
// בדיקת הקבלה: 5 דוגמאות + 12 רצפי מחולל × 2 בריתות × 2 פינות × מכאנום/StarterBot — RR ו-Pedro נדגמים בחזרה לצירי הסימולטור
// ונבדקים: בלי מבנים, בלי קו אמצע, בלי קיר, כיוון = משיק בטנק, מספר היריות, חניה באזור, RR ≤ 30 או מסומן.
import {open,ok,done,realErrs} from './h.mjs';
const PORT=process.env.PORT||process.env.BB_PORT||'8903';
let {browser,page,errs}=await open({noraf:true,url:'http://127.0.0.1:'+PORT+'/sim.html?nocad=1'});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);

await E(()=>{ window.S=__sim; window.X=S.v72export; window.V=S.v74auto; S.stageMatch();
  const R=a=>a*Math.PI/180;
  /* RR 1.0: ספליין חמישי (נגזרות שניות 0, משיק = המיתר); setReversed(true) = setTangent(heading+π), splineTo אחריו — הכיוון = משיק+π */
  window.rrParse=(java)=>{
    const st=java.match(/Pose2d start = new Pose2d\(([-\d.]+), ([-\d.]+), Math.toRadians\(([-\d.]+)\)\);/)||java.match(/new Pose2d\(([-\d.]+), ([-\d.]+), Math.toRadians\(([-\d.]+)\)\)/);
    let x=+st[1],y=+st[2],h=R(+st[3]),tan=h,rev=false; const segs=[], shots=[]; let tankBad=0, worst=0;
    for(const l of java.split('\n')){ let m;
      if(/\.build\(\)/.test(l)) break;
      if((m=l.match(/\.setTangent\(Math\.toRadians\(([-\d.]+)\)\)/))){ tan=R(+m[1]); rev=false; continue; }
      if(/\.setReversed\(true\)/.test(l)){ tan=h+Math.PI; rev=true; continue; }
      if((m=l.match(/\.turnTo\(Math\.toRadians\(([-\d.]+)\)\)/))){ h=R(+m[1]); continue; }
      if(/ShootAction\(/.test(l)){ shots.push({x,y,h}); continue; }
      let X0,Y0,et,nh=null,kind;
      if((m=l.match(/\.(splineTo|splineToConstantHeading)\(new Vector2d\(([-\d.]+), ([-\d.]+)\), Math\.toRadians\(([-\d.]+)\)/))){ kind=m[1]; X0=+m[2];Y0=+m[3];et=R(+m[4]); nh=kind==='splineTo'?(rev?et+Math.PI:et):h; }
      else if((m=l.match(/\.splineToLinearHeading\(new Pose2d\(([-\d.]+), ([-\d.]+), Math\.toRadians\(([-\d.]+)\)\), Math\.toRadians\(([-\d.]+)\)/))){ kind='lin'; X0=+m[1];Y0=+m[2];nh=R(+m[3]);et=R(+m[4]); }
      else if((m=l.match(/\.strafeTo\(new Vector2d\(([-\d.]+), ([-\d.]+)\)\)/))){ kind='strafe'; X0=+m[1];Y0=+m[2]; tan=Math.atan2(Y0-y,X0-x); et=tan; nh=h; }
      else continue;
      /* כיוון בתחילת הקטע מול המשיק (טנק: חייב להיות 0, או π בנסיעה לאחור) */
      const dd=a=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))*180/Math.PI, gap=Math.min(dd(h-tan),dd(h-tan-Math.PI));
      if(gap>3){ tankBad++; worst=Math.max(worst,gap); }
      const d=Math.hypot(X0-x,Y0-y), v0=[Math.cos(tan)*d,Math.sin(tan)*d], v1=[Math.cos(et)*d,Math.sin(et)*d];
      const seg=[]; for(let k=0;k<=40;k++){ const t=k/40,t3=t*t*t,t4=t3*t,t5=t4*t;
        const H0=1-10*t3+15*t4-6*t5,H1=t-6*t3+8*t4-3*t5,H4=-4*t3+7*t4-3*t5,H5=10*t3-15*t4+6*t5;
        seg.push([H0*x+H1*v0[0]+H4*v1[0]+H5*X0, H0*y+H1*v0[1]+H4*v1[1]+H5*Y0]); }
      segs.push({kind,seg,line:l.trim().slice(0,90)}); x=X0;y=Y0;tan=et;h=nh; }
    return {segs,shots,end:{x,y,h},tankBad,worst,strafe:(java.match(/strafeTo|splineToLinearHeading|splineToConstantHeading/g)||[]).length,
      rr:+((java.match(/RR ≈ ([\d.]+)/)||[])[1]), flagged:/⚠ RR ≈|not finish|לא נגמר/.test(java)}; };
  /* Pedro: BezierCurve(a,c1,c2,b) / BezierLine — דגימה הפוכה (pedroToSim) */
  window.pedroParse=(java)=>{
    const P=s=>{ const m=s.match(/new Pose\(([-\d.]+), ([-\d.]+)\)/g).map(q=>q.match(/([-\d.]+), ([-\d.]+)/)).map(q=>[+q[1],+q[2]]); return m; };
    const segs=[]; let shots=0;
    for(const l of java.split('\n')){
      if(/\(\) -> shoot\(/.test(l)) shots++;
      if(/addPath\(new BezierCurve\(/.test(l)){ const c=P(l); const seg=[]; for(let k=0;k<=40;k++){ const t=k/40,u=1-t; seg.push([u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0], u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]); } segs.push({seg,line:l.trim().slice(0,90)}); }
      else if(/addPath\(new BezierLine\(/.test(l)){ const c=P(l); const seg=[]; for(let k=0;k<=20;k++){ const t=k/20; seg.push([c[0][0]+(c[1][0]-c[0][0])*t,c[0][1]+(c[1][1]-c[0][1])*t]); } segs.push({seg,line:l.trim().slice(0,90)}); } }
    return {segs,shots}; };
  /* אותו מבחן כמו בסימולטור: הקו האדום של העורך (pathHard) ושוליים של חצי רובוט מקו האמצע ומהקירות */
  window.geoCheck=(segs,toSim)=>{ const half=Math.max(S.P.botW||18,S.P.botL||18)/2, sg=S.myAlly()==='red'?-1:1; let struct=0,mid=0,wall=0; const bad=[];
    segs.forEach((s,i)=>{ const sp=s.seg.map(q=>toSim(q[0],q[1])); let m=0,w=0,b=0;
      for(const p of sp){ if(p.x*sg-half<0) m++; if(Math.max(Math.abs(p.x),Math.abs(p.z))+half>72.01) w++; if(X.pathHard(p.x,p.z)) b++; }
      if(b) struct++; if(m) mid++; if(w) wall++; if(b||m||w) bad.push(i+':'+s.line+(b?' STRUCT':'')+(m?' MID':'')+(w?' WALL':'')); });
    return {struct,mid,wall,bad,last:segs.length?toSim(...segs[segs.length-1].seg[segs[segs.length-1].seg.length-1]):null}; };
  window.setAlly=al=>{ S.SETUP.ally=al; const b=document.getElementById(al==='red'?'bAimRed':'bAimBlue'); if(b) b.click(); S.stageMatch(); };
});
const SEQ=[["S","P"],["S","F1","S","P"],["S","F2","S","P"],["S","F1","S","F2","S","P"],["S","F2","S","F1","S","P"],["S","F1","S"],["S","F1","S","F2","S"],["S","F1","P"],["S","F2","P"],["L","P"],["S","F1","S","F1","S","P"],["S","F2","S","F2","S"]];

/* ── המטריצה: 17 מסלולים × 2 בריתות × 2 פינות × 2 שלדות, RR ו-Pedro ── */
const all=[];
for(const bld of ['classic','starter']) for(const al of ['red','blue']) for(const sp of [1,2]){
  const r=await E(([SEQ,bld,al,sp])=>{ const C=S.v72corner, o=[];
    setAlly(al); if(C.mySpot()!==sp) C.spotSet(sp); S.bldSet(-1,bld,true); S.PATH.shots=null; S.PATH.autoPark=true;
    const one=(k,pts,nAct)=>{ S.PATH.pts=pts; S.pathRedetour();
      const plan=V.pathPlanCut(S.PATH.pts,null,{autoPark:!S.PATH.pts.some(p=>!p.auto&&p.act==='park')});
      const nShootPlan=plan.plan.mv.filter(m=>m.k==='act'&&m.a==='shoot').length;
      const j=S.pathJava(), P=rrParse(j), g=geoCheck(P.segs,(x,y)=>S.rrToSim(x,y,0));
      const pj=V.pathPedro(), PP=pedroParse(pj), gp=geoCheck(PP.segs,(x,y)=>V.pedroToSim(x,y,0));
      /* חניה: אם יש — הקטע האחרון נגמר באזור הטעינה (RR ו-Pedro) */
      const hasPark=true;   /* ״לצאת לחניה״ דלוק: כל מסלול נגמר בחניה (נקודה שצוירה או חניה בסוף) */
      const inLZ=!hasPark||(g.last&&V.pathInLZPt(g.last.x,g.last.z)&&gp.last&&V.pathInLZPt(gp.last.x,gp.last.z));
      const face=P.shots.map(q=>{ const p=S.rrToSim(q.x,q.y,q.h); const hy=X.pathHiveYaw(p.x,p.z); let d=p.yaw-hy; d=Math.atan2(Math.sin(d),Math.cos(d)); return Math.abs(d*180/Math.PI); });
      o.push({k:bld[0]+' '+al+sp+' '+k, n:P.segs.length, s:g.struct+gp.struct, m:g.mid+gp.mid, w:g.wall+gp.wall, bad:g.bad.concat(gp.bad).slice(0,2),
        tank:bld==='starter'?P.tankBad:0, worst:P.worst, strafe:bld==='starter'?P.strafe:0, shots:P.shots.length, pshots:PP.shots, nShoot:nShootPlan,
        cut:plan.cut?plan.cut.skipped.filter(a=>a==='shootspot'||a==='shoot').length:0, nAct, inLZ, rr:P.rr, flagged:P.flagged, face:face.length?Math.max(...face):0}); };
    for(const k of ['leave','preload','cycle','park','two']){ S.pathLoad('ex:'+k); const pts=S.PATH.pts.filter(p=>!p.auto).map(p=>Object.assign({},p)); one('ex:'+k,pts,pts.filter(p=>p.act==='shootspot'||p.act==='shoot').length); }
    for(const q of SEQ){ const pts=S.genPts(q); one(q.join(''),pts.map(p=>Object.assign({},p)),pts.filter(p=>p.act==='shootspot').length); }
    return o; },[SEQ,bld,al,sp]);
  all.push(...r);
}
await E(()=>{ setAlly('red'); if(S.v72corner.mySpot()!==1) S.v72corner.spotSet(1); S.bldSet(-1,'classic',true); });
const sum=k=>all.reduce((a,c)=>a+c[k],0), lst=f=>all.filter(f).slice(0,3).map(c=>c.k+' '+(c.bad[0]||'')).join(' | ');
ok(all.length===136,`מטריצה: ${all.length} ייצואים (17 מסלולים × 2 בריתות × 2 פינות × מכאנום/StarterBot), כל אחד ב-RR וב-Pedro`);
ok(sum('s')===0,'מטריצה: 0 קטעים שנכנסים למבנה (RR + Pedro, דגימה הפוכה) '+lst(c=>c.s));
ok(sum('m')===0,'מטריצה: 0 קטעים שחוצים את קו האמצע (חצי רובוט) '+lst(c=>c.m));
ok(sum('w')===0,'מטריצה: 0 דגימות בקיר '+lst(c=>c.w));
ok(sum('tank')===0&&sum('strafe')===0,`A1: StarterBot — 0 קטעים שמתחילים בכיוון ≠ משיק (68 ייצואים), 0 strafeTo/splineToLinearHeading/ConstantHeading (קודם: כל 17 המסלולים, עד 79°) `+lst(c=>c.tank||c.strafe));
ok(all.every(c=>c.shots===c.nShoot&&c.pshots===c.nShoot&&c.nShoot===c.nAct-c.cut),'מטריצה: מספר היריות בקוד = פעולות הירי פחות מה ששומר החניה חתך (RR ו-Pedro) '+all.filter(c=>!(c.shots===c.nShoot&&c.pshots===c.nShoot&&c.nShoot===c.nAct-c.cut)).slice(0,3).map(c=>c.k+' '+c.shots+'/'+c.pshots+'/'+c.nShoot+'/'+c.nAct+'-'+c.cut).join(' | '));
ok(Math.max(...all.map(c=>c.face))<3,'מטריצה: כל ירי בקוד פונה לכוורת — סטייה מרבית '+Math.max(...all.map(c=>c.face)).toFixed(2)+'°');
ok(all.every(c=>c.inLZ),'A3: כל מסלול עם חניה נגמר באזור הטעינה (RR ו-Pedro) '+all.filter(c=>!c.inLZ).slice(0,3).map(c=>c.k).join(' | '));
ok(all.every(c=>c.rr<=30||c.flagged),'A2: RR ≤ 30 שנ׳ או מסומן ⚠ בכותרת ('+all.filter(c=>c.rr>30).length+' מעל 30, כולם מסומנים) · מרבי '+Math.max(...all.map(c=>c.rr)));
console.log('    (מטריצה: '+all.length+' · זמני RR '+Math.min(...all.map(c=>c.rr))+'–'+Math.max(...all.map(c=>c.rr))+' שנ׳ · נחתכו '+all.filter(c=>c.cut).length+')');

/* ── A1: הסימולטור והקוד — טנק מסתובב במקום, ואין strafeTo בסיבוב במקום שזז ── */
let r=await E(()=>{ setAlly('red'); S.bldSet(-1,'starter',true); const s=S.autoStartPose(); S.PATH.detour=false;
  S.PATH.pts=[{x:s.x,z:s.z,h:s.h,act:'none',start:true},{x:-40,z:30,h:null,act:'none'},{x:-39,z:30,h:0.6,act:'wait',sec:0.3}];
  const j=S.pathJava(); S.PATH.detour=true; S.bldSet(-1,'classic',true); return {str:/strafeTo/.test(j), turns:(j.match(/turnTo/g)||[]).length}; });
ok(!r.str&&r.turns>=1,'A1: סיבוב במקום שזז 1″ בטנק — turnTo בלבד, בלי strafeTo ('+r.turns+' turnTo)');

/* ── A2: שומר החניה בקוד — S,F2,S,F1,S,F2,S,P ב-StarterBot ── */
r=await E(()=>{ setAlly('red'); S.bldSet(-1,'starter',true); const q=['S','F2','S','F1','S','F2','S','P']; const pts=S.genPts(q);
  const ev=S.genEvalSync(pts,true); const XR=X.RUN();
  S.PATH.pts=pts.map(p=>Object.assign({},p)); S.pathRedetour(); S.PATH.shots={sig:X.pathSig(S.PATH.pts),map:X.pathShotMap(ev.shotPoses)};
  const j=S.pathJava(); S.bldSet(-1,'classic',true);
  return {simShoot:XR.prog.filter(s=>s.k==='shoot').length, park:ev.park, code:(j.match(/ShootAction\(\)/g)||[]).length, hdr:(j.match(/^\/\/ ⚠ RR[^\n]*/m)||[''])[0], rr:+((j.match(/RR ≈ ([\d.]+)\s*\S*\s*$/)||[])[1]), rrOver:ev.rrOver, rrT:ev.rrT, parkLine:/חונה באזור הטעינה/.test(j)}; });
ok(r.code<4&&/קוצר כמו שומר החניה/.test(r.hdr)&&r.rr<=30&&r.parkLine,'A2: הקוד נחתך כמו בסימולטור — '+r.code+' יריות (קודם 4), RR ≈ '+r.rr+' שנ׳ (קודם 37.1) וחונה · '+r.hdr.slice(0,90));
r=await E(()=>{ setAlly('red'); S.bldSet(-1,'classic',true);
  const q=['S','F1','S','F1','S','F1','S','P']; const ev=S.genEvalSync(S.genPts(q),true);
  const q2=['S','F1','S','F2','S','P']; const ev2=S.genEvalSync(S.genPts(q2),true);
  /* המיון של genRun: מה שלא נגמר ב-RR — בסוף */
  const L=[Object.assign({},ev,{n:'A'}),Object.assign({},ev2,{n:'B'})]; L.sort((a,b)=>(a.rrOver?1:0)-(b.rrOver?1:0)||b.total-a.total||b.hits-a.hits);
  return {a:{t:ev.total,rr:ev.rrT,over:ev.rrOver,cut:ev.rrCut}, b:{t:ev2.total,rr:ev2.rrT,over:ev2.rrOver}, first:L[0].n}; });
ok(r.a.over===(r.a.rr>30)&&(r.a.over?r.first==='B':true),`A2: המחולל מסמן ״לא נגמר ב-RR״ ומעביר לסוף (S,F1×3,P: ${r.a.t} נק׳, RR ${r.a.rr} → ${r.a.over?'בסוף':'לא מעל 30'}; ראשון: ${r.first})`);
r=await E(()=>{ const a={total:52,hits:10,park:true,leave:true,slack:1.2,rrT:33}, b={total:49,hits:9,park:true,leave:true,slack:1.2,rrT:22}; return {a:V.optScore(a), b:V.optScore(b)}; });
ok(r.b>r.a,`A2: המתכנן מעניש מועמד שלא נגמר ב-RR (52 נק׳ ב-33 שנ׳: ${r.a.toFixed(0)} < 49 נק׳ ב-22 שנ׳: ${r.b.toFixed(0)})`);

/* ── A3: חניה שצוירה באמצע הזירה → משבצת באזור הטעינה, עם אזהרה ── */
r=await E(()=>{ setAlly('red'); const s=S.autoStartPose(); const pts=[{x:s.x,z:s.z,h:s.h,act:'none',start:true},{x:-40,z:40,h:null,act:'none'},{x:-30,z:20,h:null,act:'park'}];
  S.PATH.pts=pts.map(p=>Object.assign({},p)); S.pathRedetour(); const j=S.pathJava(), P=rrParse(j); const e=S.rrToSim(P.end.x,P.end.y,0);
  S.pathInfo(); return {e:[+e.x.toFixed(1),+e.z.toFixed(1)], inLZ:V.pathInLZPt(e.x,e.z), warn:/נקודת החניה שצוירה מחוץ לאזור הטעינה/.test(j), old:/חניה: הנקודה הזאת באזור הטעינה/.test(j)}; });
ok(r.inLZ&&r.warn&&!r.old,'A3: חניה שצוירה ב-(−30, 20) — הקוד מגיע ל-('+r.e+') באזור הטעינה (קודם: באמצע הזירה), ואזהרה בכותרת');

/* ── A4: איסוף — הסימולטור זוחל, והקוד זוחל אותו מרחק במקביל לאיסוף ── */
r=await E(()=>{ setAlly('red'); const XR=X.RUN; S.pathLoad('ex:preload'); const sh=S.PATH.pts.find(p=>p.act==='shootspot');
  S.pathClear(); S.pathAdd(-40,30); S.pathAdd(sh.x,sh.z,{act:'shoot'}); S.pathAdd(-40,-10,{act:'intake',sec:1.2}); S.pathAdd(-40,-35);
  const j=S.pathJava(); const pl=X.pathPlan(S.PATH.pts,null), cr=pl.mv.find(m=>m.k==='spl'&&m.par);
  S.pathGo('sim'); let pre=null, post=null, n=0;
  while(XR().on&&n++<60*30){ const st=XR().prog[XR().i]; const k=st&&st.k; const p=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)];
    if(k==='intake'&&!pre) pre=p; if(pre&&!post&&k!=='intake') post=p; S.advance(1/60,1/60); }
  const sim=Math.hypot(post[0]-pre[0],post[1]-pre[1]), code=cr?Math.hypot(cr.x-cr.a.x,cr.z-cr.a.z):0;
  return {sim, code, par:/afterTime\(0, new IntakeAction/.test(j), vc:/TranslationalVelConstraint/.test(j)}; });
ok(r.par&&r.vc&&Math.abs(r.sim-r.code)<3,`A4: איסוף — בסימולטור ${r.sim.toFixed(1)}″, בקוד ${r.code.toFixed(1)}″ (afterTime(0, IntakeAction) + ספליין איטי; קודם: 0″ בקוד)`);

/* ── A5: בדיקת השותף אחרי החלפת פינה וברית ── */
r=await E(async()=>{ const C=S.v72corner, o={}; setAlly('red');
  C.spotSet(2); S.pathLoad('ex:leave'); const ptxt=S.pathExportText(); C.spotSet(1);
  C.ptnImport(ptxt); S.pathLoad('ex:leave');
  C.spotSet(2); S.pathLoad('ex:leave'); C.ptnUI();
  o.corner={start:[C.PTN.pts[0].x,C.PTN.pts[0].z], mate:[+C.mateSpotPose().x.toFixed(1),+C.mateSpotPose().z.toFixed(1)], warn:C.PTN.msg};
  const a=await C.ptnRun({waits:false}); o.corner.n=a.conf.length; o.corner.first=a.first&&a.first.t; o.corner.bx=null;
  C.spotSet(1); setAlly('blue'); S.pathLoad('ex:leave');
  const b=await C.ptnRun({waits:false}); o.ally={start:[C.PTN.pts[0].x,C.PTN.pts[0].z], minX:Math.min(...C.PTN.pts.map(p=>p.x)), n:b.conf.length, park:b.pt.park};
  setAlly('red'); return o; });
ok(Math.abs(r.corner.start[0]-r.corner.mate[0])<0.2&&Math.abs(r.corner.start[1]-r.corner.mate[1])<0.2&&/אותה פינה/.test(r.corner.warn),`A5: אחרי החלפת פינה השותף מתחיל בפינה שלו (${r.corner.start}, קודם: בפינה שלי), ואזהרה שהמסלול שלו נבנה לפינה שלי · ${r.corner.n} התנגשויות, הראשונה ${r.corner.first} שנ׳`);
ok(r.ally.start[0]>0&&r.ally.minX>0&&r.ally.park,`A5: אחרי החלפת ברית המסלול עבר במראה לכחול (x מינימלי ${r.ally.minX}) והשותף חונה (קודם: נשאר אדום ונעצר באמצע)`);

/* ── A6: יומן מושלם (דגימות של הקוד המיוצא, בצירי RR) → סטייה ~0 ── */
r=await E(()=>{ setAlly('red'); const out={};
  for(const k of ['preload','cycle','two']){ S.stageMatch(); S.pathLoad('ex:'+k); S.pathRun();
    const sh=X.pathShotsFor(S.PATH.pts); const c=V.pathPlanCut(S.PATH.pts,sh,{autoPark:false}); const smp=[];
    for(const m of c.plan.mv){ if(m.k==='spl') smp.push(...X.rrQuintic(m.a,m.a.t,m,m.tan,12)); if(m.k==='str') smp.push(m.a,m); }
    let txt='t,x,y,heading\n'; smp.forEach((p,i)=>{ const q=S.rrFromSim(p.x,p.z,0); txt+=(i*0.05).toFixed(2)+','+q.x.toFixed(2)+','+q.y.toFixed(2)+',0\n'; });
    const st=S.odoLoad(txt,{align:false}); out[k]={max:+st.max.toFixed(2),vs:st.vsPlan}; }
  return out; });
ok(Object.values(r).every(v=>v.max<1&&v.vs),'A6: יומן מושלם מול התוכנית המיוצאת — סטייה מרבית '+Object.entries(r).map(([k,v])=>k+' '+v.max+'″').join(' · ')+' (קודם 44.2″)');

/* ── A7: קו אמצע — אזהרה בלוח ובכותרת ── */
r=await E(()=>{ setAlly('red'); S.pathClear(); S.pathAdd(-40,30); S.pathAdd(-4,20,{raw:true}); S.pathAdd(-40,-10); S.pathDraw(); S.pathInfo();
  const info=document.getElementById('oPath').textContent, j=S.pathJava(); S.pathClear(); S.pathAdd(-40,30); S.pathAdd(-40,-10); S.pathDraw(); S.pathInfo();
  return {mid:S.PATH.mid, info:/חוצה את קו האמצע/.test(info), hdr:/חוצה את קו האמצע \(G402\)/.test(j), clear:!/חוצה את קו האמצע/.test(document.getElementById('oPath').textContent)}; });
ok(r.info&&r.hdr&&r.clear,'A7: נקודה ב-(−4, 20) — אזהרת G402 בלוח ובראש הקוד; מסלול נקי — בלי אזהרה');

/* ── A8 + A9 + U3: כרטיס לבור ── */
r=await E(async()=>{ const C=S.v72corner; setAlly('red'); localStorage.setItem('bb_path_cur2','ex:preload'); S.PATH.bySpot={};
  if(C.mySpot()!==1) C.spotSet(1); S.pathLoad('ex:cycle'); S.SETUP.autoOn=true; S.SETUP.myAuto2='cur'; S.SETUP.myAuto='cur';
  const html=await C.pitCardBuild({}); const P2=C.PIT.last.pages[1];
  return {name2:P2.info.name, hasPts:!!P2.info.pts, rr:/RR ≈/.test(html), rr2:P2.rrT&&P2.rrT.full, lt:/טבלת ירי/.test(html)&&/קרוב מדי/.test(html)}; });
ok(r.hasPts&&!/אין מסלול/.test(r.name2),'A8: הכרטיס לבור לפינה 2 שלא ביקרו בה — נטען ״האחרון״ שלה (ex:preload) ולא ״אין מסלול — רק יציאה״');
ok(r.rr&&r.rr2>0,'A9: משבצת ״RR ≈ "'+' בכרטיס לבור ('+r.rr2+' שנ׳ לפינה 2)');
ok(r.lt,'U3: טבלת הירי בכרטיס לבור, עם ״קרוב מדי״');
r=await E(()=>{ S.pathLoad('ex:leave'); const j=S.pathJava(); S.bldSet(-1,'starter',true); const j2=S.pathJava(); S.bldSet(-1,'classic',true);
  const L=V.LIVE; L.ang='auto'; const a=V.liveParse({data:{x:1,y:2,heading:90}}), b=V.liveParse({data:{x:1,y:2,heading:3}}); L.ang='deg'; const c=V.liveParse({data:{x:1,y:2,heading:3}}); L.ang='rad'; const d=V.liveParse({data:{x:1,y:2,heading:3}}); L.ang='auto';
  return {ch:(j.match(/^\/\/ שלדה: [^\n]*/m)||[''])[0], ch2:(j2.match(/^\/\/ שלדה: [^\n]*/m)||[''])[0], a:a.h, b:b.h, c:c.h, d:d.h, sel:!!document.getElementById('liveAng')}; });
ok(/mecanum/.test(r.ch)&&/טנק/.test(r.ch2),'A9: שורת שלדה בכותרת — '+r.ch+' / '+r.ch2.slice(0,40));
ok(r.sel&&Math.abs(r.b-3)<1e-9&&Math.abs(r.c-3*Math.PI/180)<1e-9&&Math.abs(r.d-3)<1e-9&&Math.abs(r.a-Math.PI/2)<1e-9,'A9: ״כיוון״ ברובוט החי — לזהות לבד / מעלות / רדיאנים (heading=3 במעלות → '+(r.c*180/Math.PI).toFixed(1)+'°)');

/* ── U1: קצב RoadRunner ── */
r=await E(()=>{ setAlly('red'); const o=[]; for(const pace of [0,1]){ V.rrcPaceSet(pace);
  for(const k of ['leave','preload','cycle','park','two']){ S.stageMatch(); S.pathLoad('ex:'+k); const res=S.pathRun(); const sh=X.pathShotsFor(S.PATH.pts);
    o.push({pace,k,sim:res.t,rr:X.pathRrTime(X.pathPlan(S.PATH.pts,sh)).t,done:res.done}); } }
  V.rrcPaceSet(1); return o; });
const on1=r.filter(x=>x.pace===1), off=r.filter(x=>x.pace===0);
ok(on1.every(x=>x.done&&Math.abs(x.sim/x.rr-1)<=0.15),'U1: מתג דלוק — כל 5 הדוגמאות בטווח ±15% מ-pathRrTime: '+on1.map(x=>x.k+' '+x.sim+'/'+x.rr).join(' · '));
ok(off.filter(x=>Math.abs(x.sim/x.rr-1)>0.15).length>=3,'U1: מתג כבוי — הקצב הישן (מהיר מ-RR): '+off.map(x=>x.k+' '+(x.sim/x.rr).toFixed(2)).join(' · '));
r=await E(()=>{ const o={}; V.rrcPaceSet(1); S.v72corner.genKeySync(); o.k1=V.genResKey(); const G=window.__sim;
  const k=document.getElementById('kRrPace'); o.box=!!k&&k.checked; o.def=JSON.parse(localStorage.getItem('bbRRcons1')||'{}').pace;
  k.checked=false; k.dispatchEvent(new Event('change')); o.k2=V.genResKey(); o.st=JSON.parse(localStorage.getItem('bbRRcons1')).pace;
  k.checked=true; k.dispatchEvent(new Event('change')); return o; });
ok(r.box&&r.k1!==r.k2&&r.st===0,`U1: מתג ״נסיעה במגבלות RoadRunner״ (דלוק), נשמר ב-bbRRcons1, ותוצאות המחולל לפי מפתח אחר (${r.k1} → ${r.k2})`);

/* ── U3: טבלת משגר ── */
r=await E(()=>{ const t=V.launchTable(); document.getElementById('ltTpr').value='28'; document.getElementById('ltTpr').dispatchEvent(new Event('change'));
  document.getElementById('bLaunchTbl').click(); const j=document.getElementById('ltOut').value;
  const g=t.rows.filter(q=>!q.close&&q.v!=null&&!q.over);
  return {n:t.rows.length, close:t.rows.filter(q=>q.close).map(q=>q.d), j, g:g.length, mono:g.every((q,i)=>i<3||q.wheel>=g[i-1].wheel), rpm0:g[0]&&g[0].wheel, tps0:g[0]&&g[0].tps, ratio:t.ratio}; });
ok(r.n===14&&r.close.length>=1&&r.close.every(d=>d<30),'U3: 14 מרחקים (18–96″), ״קרוב מדי״ ב-'+r.close.join(', ')+'″');
ok(/DIST_IN/.test(r.j)&&/WHEEL_RPM/.test(r.j)&&/MOTOR_TPS/.test(r.j)&&/tpsForDistance/.test(r.j)&&/tooClose/.test(r.j)&&r.mono,'U3: קוד ג׳אווה — מערכים, אינטרפולציה ו-tooClose; סל״ד עולה עם המרחק מ-36″ ('+r.rpm0+' סל״ד גלגל, '+r.tps0+' פעימות/שנ׳ ב-'+r.g+' מרחקים)');

/* ── U7: Pedro ומחלקה מלאה ── */
r=await E(()=>{ setAlly('red'); S.pathLoad('ex:cycle'); const p=V.pathPedro(), c=V.pathClass('rr'), cp=V.pathClass('pedro');
  const sel=document.getElementById('expFmt'); sel.value='pedro'; sel.dispatchEvent(new Event('change')); document.getElementById('bPathJava').click(); const ui=document.getElementById('pathOut').value;
  sel.value='rr'; sel.dispatchEvent(new Event('change')); document.getElementById('bPathClass').click(); const ui2=document.getElementById('pathOut').value;
  /* Pedro מול RR: אותן נקודות קצה לכל קטע (המרה הפוכה) */
  const PP=pedroParse(p), RRp=rrParse(S.pathJava()); let maxD=0; const n=Math.min(PP.segs.length,RRp.segs.length);
  for(let i=0;i<n;i++){ const a=PP.segs[i].seg, b=RRp.segs[i].seg; const pa=V.pedroToSim(...a[a.length-1],0), pb=S.rrToSim(...b[b.length-1],0); maxD=Math.max(maxD,Math.hypot(pa.x-pb.x,pa.z-pb.z)); }
  return {ver:/Pedro Pathing 2\.1\.2/.test(p)&&/com\.pedropathing:ftc:2\.1\.2/.test(p), np:PP.segs.length, nr:RRp.segs.length, maxD,
    cls:(c.match(/private Action v\d\(/g)||[]).length, auto:/@Autonomous/.test(c)&&/@Autonomous/.test(cp), clsP:(cp.match(/private Step\[\] v\d\(/g)||[]).length,
    ui:/pathBuilder/.test(ui), ui2:/@Autonomous/.test(ui2), heb:(c+cp).match(/[֐-׿]/g)?1:0}; });
ok(r.ver,'U7: Pedro — גרסה נעולה בכותרת (2.1.2, com.pedropathing:ftc)');
ok(r.np===r.nr&&r.maxD<0.05,`U7: Pedro מול RR — ${r.np} קטעים, אותן נקודות קצה בהמרה ההפוכה (סטייה ${r.maxD.toFixed(3)}″)`);
ok(r.cls===4&&r.clsP===4&&r.auto,'U7: ״מחלקה מלאה״ — @Autonomous עם 4 גרסאות (אדום/כחול × פינה 1/2) ב-RR וב-Pedro');
ok(r.ui&&r.ui2,'U7: הבורר ״ייצוא: RoadRunner / Pedro״ והכפתור ״מחלקה מלאה״ בממשק');
/* כל ארבע הגרסאות: גאומטריה נקייה מכל פינה וברית */
r=await E(()=>{ setAlly('red'); S.pathLoad('ex:two'); const c=V.pathClass('rr'), o=[];
  const parts=c.split(/\n    \/\/ ── /).slice(1);
  const vars=[['red',1],['red',2],['blue',1],['blue',2]];
  parts.forEach((pt,i)=>{ const [al,sp]=vars[i]; const st=c.match(/static final Pose2d\[\] START = \{([\s\S]*?)\};/)[1].split(/,\s*\n\s*/)[i];
    const java='Pose2d start = '+st.trim()+';\n'+pt; setAlly(al); S.SETUP.spot=sp;
    const P=rrParse(java), g=geoCheck(P.segs,(x,y)=>S.rrToSim(x,y,0)); const s0=S.autoStartPose(), q=S.rrToSim(+st.match(/([-\d.]+), ([-\d.]+)/)[1],+st.match(/([-\d.]+), ([-\d.]+)/)[2],0);
    o.push({al,sp,b:g.bad.slice(0,2),bad:g.struct+g.mid+g.wall,start:Math.hypot(q.x-s0.x,q.z-s0.z)}); });
  setAlly('red'); S.SETUP.spot=1; return o; });
ok(r.length===4&&r.every(v=>v.bad===0&&v.start<0.2),'U7: מחלקה מלאה — 4 הגרסאות מתחילות בעמדת הפתיחה שלהן ונקיות (מבנים/אמצע/קיר) '+r.map(v=>v.al+v.sp+':'+v.bad+' '+v.b.join(';')).join(' '));

/* ── אנגלית ── */
await page.evaluate(()=>localStorage.setItem('bbLang1','en')); await page.reload();
await page.waitForFunction(()=>window.__sim&&window.__sim.botBody,null,{timeout:60000});
r=await E(()=>{ const S=__sim, V=S.v74auto; S.stageMatch(); S.bldSet(-1,'starter',true); S.pathLoad('ex:two');
  const heb=t=>(t.match(/[֐-׿][^\n]{0,24}/g)||[]);
  const j=V.javaEn(S.pathJava()), p=V.javaEn(V.pathPedro()), c=V.javaEn(V.pathClass('pedro')), lt=V.javaEn(V.launchJava());
  S.bldSet(-1,'classic',true);
  const ui=['rrcBox','expFmt','bPathClass','liveAng','bLaunchTbl'].map(id=>{ const e=document.getElementById(id); return e?(e.innerText||e.textContent)+' '+(e.title||''):''; }).join(' ');
  return {j:heb(j), p:heb(p), c:heb(c), lt:heb(lt), ui:heb(ui)}; });
ok(r.j.length+r.p.length+r.c.length+r.lt.length===0,'אנגלית: RR, Pedro, מחלקה מלאה וטבלת הירי — בלי עברית '+r.j.concat(r.p,r.c,r.lt).slice(0,3).join(' | '));
ok(r.ui.length===0,'אנגלית: הפקדים החדשים בלי עברית '+r.ui.slice(0,3).join(' | '));
await page.evaluate(()=>localStorage.removeItem('bbLang1'));

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v74_auto_test');
