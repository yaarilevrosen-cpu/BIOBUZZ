// v72 · export — ייצוא RoadRunner שהוא בדיוק מה שהסימולטור נוסע (A1–A7) + עמדות ירי מוקלטות (U1),
// עורך בצירי RR (U5) ומגבלות נסיעה + הערכת זמן (U9).
// בדיקת הקבלה: כל 12 רצפי המחולל וחמש הדוגמאות, בשתי הבריתות — הספליינים המיוצאים נדגמים בחזרה לצירי הסימולטור
// (rrToSim) ונבדקים במבחן המבנים והאמצע של הסימולטור עצמו: 0 התנגשויות, 0 חציות; כל ירי פונה לכוורת.
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);

/* דוגם את הקוד המיוצא כמו RoadRunner 1.0: ספליין חמישי (נגזרות שניות 0, אורך המשיק = המיתר),
   setTangent / splineTo / splineToConstantHeading / splineToLinearHeading / strafeTo / turnTo */
await E(()=>{ window.S=__sim; window.X=S.v72export; S.stageMatch();
  window.rrParse=(java)=>{
    const R=a=>a*Math.PI/180;
    const st=java.match(/new Pose2d\(([-\d.]+), ([-\d.]+), Math.toRadians\(([-\d.]+)\)\);/);
    let x=+st[1],y=+st[2],h=R(+st[3]),tan=h; const segs=[], shots=[], turns=[];
    for(const l of java.split('\n')){ let m;
      if((m=l.match(/\.setTangent\(Math\.toRadians\(([-\d.]+)\)\)/))){ tan=R(+m[1]); continue; }
      if((m=l.match(/\.turnTo\(Math\.toRadians\(([-\d.]+)\)\)/))){ h=R(+m[1]); turns.push(h); continue; }
      if(/ShootAction\(\)/.test(l)){ shots.push({x,y,h}); continue; }
      let X0,Y0,et,nh=null,kind;
      if((m=l.match(/\.(splineTo|splineToConstantHeading)\(new Vector2d\(([-\d.]+), ([-\d.]+)\), Math\.toRadians\(([-\d.]+)\)/))){ kind=m[1]; X0=+m[2];Y0=+m[3];et=R(+m[4]); nh=kind==='splineTo'?et:h; }
      else if((m=l.match(/\.splineToLinearHeading\(new Pose2d\(([-\d.]+), ([-\d.]+), Math\.toRadians\(([-\d.]+)\)\), Math\.toRadians\(([-\d.]+)\)/))){ kind='lin'; X0=+m[1];Y0=+m[2];nh=R(+m[3]);et=R(+m[4]); }
      else if((m=l.match(/\.strafeTo\(new Vector2d\(([-\d.]+), ([-\d.]+)\)\)/))){ kind='strafe'; X0=+m[1];Y0=+m[2]; tan=Math.atan2(Y0-y,X0-x); et=tan; nh=h; }
      else continue;
      const d=Math.hypot(X0-x,Y0-y), v0=[Math.cos(tan)*d,Math.sin(tan)*d], v1=[Math.cos(et)*d,Math.sin(et)*d];
      const seg=[]; for(let k=0;k<=40;k++){ const t=k/40,t3=t*t*t,t4=t3*t,t5=t4*t;
        const H0=1-10*t3+15*t4-6*t5,H1=t-6*t3+8*t4-3*t5,H4=-4*t3+7*t4-3*t5,H5=10*t3-15*t4+6*t5;
        seg.push([H0*x+H1*v0[0]+H4*v1[0]+H5*X0, H0*y+H1*v0[1]+H4*v1[1]+H5*Y0]); }
      segs.push({kind,seg,line:l.trim().slice(0,100),h0:h,h1:nh}); x=X0;y=Y0;tan=et;h=nh; }
    return {segs,shots,turns,end:{x,y,h}}; };
  /* אותו מבחן כמו בסימולטור: הקו האדום של העורך (pathHard על הדגימות) ושוליים של חצי רובוט מקו האמצע ומהקירות */
  window.rrCheck=(java)=>{ const P=rrParse(java), half=Math.max(S.P.botW||18,S.P.botL||18)/2, sg=S.myAlly()==='red'?-1:1;
    let struct=0, mid=0, wall=0; const bad=[];
    P.segs.forEach((s,i)=>{ const sp=s.seg.map(q=>S.rrToSim(q[0],q[1],0));
      let m=0,w=0; for(const p of sp){ if(p.x*sg-half<0) m++; if(Math.max(Math.abs(p.x),Math.abs(p.z))+half>72.01) w++; }
      const keep=S.PATH.pts; S.PATH.pts=sp.slice(0,-1).map(p=>({x:p.x,z:p.z,act:'none'})); S.pathAdd(sp[sp.length-1].x,sp[sp.length-1].z,{raw:true}); const b=S.PATH.bad; S.PATH.pts=keep;
      if(b) struct++; if(m) mid++; if(w) wall++; if(b||m||w) bad.push(i+':'+s.line+(b?' STRUCT':'')+(m?' MID':'')+(w?' WALL':'')); });
    const face=P.shots.map(q=>{ const p=S.rrToSim(q.x,q.y,q.h); const hy=X.pathHiveYaw(p.x,p.z); let d=p.yaw-hy; d=Math.atan2(Math.sin(d),Math.cos(d)); return Math.abs(d*180/Math.PI); });
    return {n:P.segs.length,struct,mid,wall,bad,face,maxFace:face.length?Math.max(...face):0,nShots:P.shots.length}; };
  window.setAlly=al=>{ S.SETUP.ally=al; const b=document.getElementById(al==='red'?'bAimRed':'bAimBlue'); if(b) b.click(); S.stageMatch(); };
});
const SEQ=[["S","P"],["S","F1","S","P"],["S","F2","S","P"],["S","F1","S","F2","S","P"],["S","F2","S","F1","S","P"],["S","F1","S"],["S","F1","S","F2","S"],["S","F1","P"],["S","F2","P"],["L","P"],["S","F1","S","F1","S","P"],["S","F2","S","F2","S"]];

// A1 + A2 + A3 — 12 רצפים + 5 דוגמאות × 2 בריתות, מהציור (בלי עמדות מוקלטות)
let r=await E((SEQ)=>{ const o=[];
  for(const al of ['red','blue']){ setAlly(al); S.PATH.shots=null;
    for(const k of ['leave','preload','cycle','park','two']){ S.pathLoad('ex:'+k); const c=rrCheck(S.pathJava()); c.k=al+' ex:'+k; c.nAct=S.PATH.pts.filter(p=>p.act==='shoot'||p.act==='shootspot').length; o.push(c); }
    for(const q of SEQ){ const pts=S.genPts(q); S.PATH.pts=pts.map(p=>Object.assign({},p)); S.pathRedetour(); const c=rrCheck(S.pathJava()); c.k=al+' '+q.join(''); c.nAct=pts.filter(p=>p.act==='shootspot').length; o.push(c); } }
  setAlly('red'); return o; },SEQ);
const sum=(k)=>r.reduce((a,c)=>a+c[k],0);
ok(r.length===34&&sum('struct')===0,'A1: 34 מסלולים מיוצאים (12 רצפים + 5 דוגמאות × 2 בריתות) — 0 קטעים שנכנסים למבנה (קודם: 9/12 רצפים ו-preload/cycle/two) '+r.filter(c=>c.struct).map(c=>c.k+' '+c.bad[0]).slice(0,2).join(' | '));
ok(sum('mid')===0,'A1: 0 קטעים שחוצים את קו האמצע (חצי רובוט) '+r.filter(c=>c.mid).map(c=>c.k+' '+c.bad[0]).slice(0,2).join(' | '));
ok(sum('wall')===0,'A2: אף דגימה לא מכניסה את הרובוט לקיר (preload: הספליין הראשון יוצא לכיוון היעד, לא לכיוון הקיר) '+r.filter(c=>c.wall).map(c=>c.k+' '+c.bad[0]).slice(0,2).join(' | '));
ok(r.every(c=>c.nShots===c.nAct)&&Math.max(...r.map(c=>c.maxFace))<3,'A3: כל ירי בקוד פונה לכוורת (turnTo או כיוון ההגעה) — סטייה מרבית '+Math.max(...r.map(c=>c.maxFace)).toFixed(2)+'°');

// U1 — עמדות הירי שהסימולטור באמת ירה מהן: ריצת מחולל → הייצוא משתמש בהן, ועדיין 0/0
r=await E((SEQ)=>{ setAlly('red'); const o=[];
  for(const q of SEQ){ const pts=S.genPts(q); const ev=S.genEvalSync(pts,q.includes('P'));
    S.PATH.pts=pts.map(p=>Object.assign({},p)); S.pathRedetour();
    S.PATH.shots={sig:X.pathSig(S.PATH.pts),map:X.pathShotMap(ev.shotPoses)};
    const j=S.pathJava(), c=rrCheck(j); c.k=q.join(''); c.poses=(ev.shotPoses||[]).length; c.rec=(j.match(/מההרצה בסימולטור/g)||[]).length;
    c.spots=pts.filter(p=>p.act==='shootspot').length; c.off=(j.match(/מהנקודה שצוירה/g)||[]).length; c.slack=ev.slack; c.simSlack=ev.simSlack; c.rrT=ev.rrT; o.push(c); }
  return o; },SEQ);
ok(r.filter(c=>c.spots).every(c=>c.poses>=c.spots&&c.rec===c.spots),'U1: כל ריצה רושמת את עמדות הירי, וכל ״ירי מעמדת הירי״ מיוצא מהעמדה שנרשמה ('+r.map(c=>c.rec+'/'+c.spots).join(' ')+')');
ok(r.some(c=>c.off>0),'U1: עמדה שרחוקה יותר מ-6″ מהנקודה שצוירה מקבלת הערה בקוד ('+r.reduce((a,c)=>a+c.off,0)+' הערות)');
ok(sum.call(null,'struct')===0&&r.every(c=>!c.struct&&!c.mid&&!c.wall),'U1: גם מהעמדות האמיתיות — 0 מבנים, 0 אמצע, 0 קיר '+r.filter(c=>c.bad.length).map(c=>c.k+' '+c.bad[0]).slice(0,2).join(' | '));
ok(r.every(c=>c.maxFace<6),'U1: מהעמדות האמיתיות הרובוט פונה לכוורת (סטייה מרבית '+Math.max(...r.map(c=>c.maxFace)).toFixed(1)+'°)');
ok(r.filter(c=>c.simSlack>0).every(c=>c.slack<=c.simSlack&&isFinite(c.rrT)&&c.rrT>0),'U9: המרווח במחולל = הקטן מבין הסימולטור והערכת RR ('+r.filter(c=>c.simSlack>0).slice(0,4).map(c=>c.slack+'≤'+c.simSlack+' (RR '+c.rrT+')').join(' · ')+')');

// U1 — pathRun רושם עמדות, הייצוא משתמש בהן; ״📌 הקפא״ הופך shootspot → shoot בעמדה שנרשמה
r=await E(()=>{ setAlly('red'); S.pathLoad('ex:cycle'); const res=S.pathRun(); const m=X.pathShotsFor(S.PATH.pts);
  const j=S.pathJava(); const sp=S.PATH.pts.filter(p=>!p.auto&&p.act==='shootspot').length;
  const info=document.getElementById('oPath').textContent;
  const n=X.pathFreezeShots(); const u=S.PATH.pts.filter(p=>!p.auto);
  const sh=u.filter(p=>p.act==='shoot'), mm=Object.values(m||{});
  const at=sh.every(p=>mm.some(q=>Math.abs(q.x-p.x)<0.11&&Math.abs(q.z-p.z)<0.11&&p.h!=null));
  const j2=S.pathJava(), c=rrCheck(j2);
  return {poses:(res.shotPoses||[]).length, rec:(j.match(/מההרצה בסימולטור/g)||[]).length, sp, n, nShoot:sh.length, left:u.filter(p=>p.act==='shootspot').length, at, c, info, warn:S.PATH.warn}; });
ok(r.poses>=2&&r.rec===r.sp,'U1: ״חשב זמן״ רושם '+r.poses+' יריות, והייצוא לוקח '+r.rec+'/'+r.sp+' עמדות מההרצה');
ok(/עמדות ירי/.test(r.info)&&/2\/2/.test(r.info),'U1: הלוח מציג כמה עמדות ירי הוקלטו ('+r.info.match(/עמדות ירי[^ע]*/)+')');
ok(r.n===2&&r.nShoot===2&&r.left===0&&r.at,'U1: ״📌 הקפא עמדות ירי״ — 2 נקודות הפכו ל״ירי״ בעמדה שנרשמה, עם כיוון ('+r.warn+')');
ok(!r.c.struct&&!r.c.mid&&r.c.maxFace<6,'U1: אחרי ההקפאה הקוד עדיין נקי ופונה לכוורת');
r=await E(()=>{ document.getElementById('bPathClear').click(); S.pathLoad('ex:preload'); S.PATH.shots=null;
  const before=S.PATH.pts.filter(p=>p.act==='shootspot').length; document.getElementById('bPathFreeze').click();
  return {before, after:S.PATH.pts.filter(p=>p.act==='shootspot').length, shoot:S.PATH.pts.filter(p=>p.act==='shoot').length}; });
ok(r.before===1&&r.after===0&&r.shoot===1,'U1: הכפתור בלי הרצה קודמת — מריץ לבד ומקפיא');

// A2 — הכיוון בסימולטור = הכיוון בקוד: הקטע הראשון מחזיק את כיוון ההתחלה (splineToConstantHeading)
r=await E(()=>{ setAlly('red'); const s=S.autoStartPose(); S.PATH.detour=false;
  S.PATH.pts=[{x:s.x,z:s.z,h:s.h,act:'none',start:true},{x:-40,z:30,h:null,act:'none'},{x:-30,z:10,h:null,act:'wait',sec:0.5}];
  S.PATH.shots=null; const j=S.pathJava(); const P=rrParse(j);
  S.pathRun(); const yawSim=S.bot.yaw; S.PATH.detour=true;
  const endSim=S.rrToSim(0,0,P.end.h).yaw; let d=endSim-yawSim; d=Math.atan2(Math.sin(d),Math.cos(d));
  const firstTan=j.match(/actionBuilder\(start\)\n\s*\.setTangent\(Math\.toRadians\(([-\d.]+)\)\)/);
  return {d:d*180/Math.PI, cst:/splineToConstantHeading/.test(j), firstTan:!!firstTan, j}; });
ok(r.cst&&Math.abs(r.d)<5,'A2: הסימולטור החזיק 90° והקוד מחזיק אותו כיוון (splineToConstantHeading) — הפרש '+r.d.toFixed(1)+'° (קודם 63°)');
ok(r.firstTan,'A2: הקטע הראשון מתחיל ב-setTangent לכיוון היעד (לא בכיוון שהרובוט פונה אליו)');
// A2 — משיק ההגעה בעצירה הוא כיוון ההגעה, ו-setTangent מפורש אחריה
r=await E(()=>{ const s=S.autoStartPose(); S.PATH.detour=false;
  S.PATH.pts=[{x:s.x,z:s.z,h:null,act:'none',start:true},{x:-40,z:40,h:null,act:'wait',sec:0.3},{x:-40,z:10,h:null,act:'none'}];
  const j=S.pathJava(); S.PATH.detour=true;
  const L=j.split('\n'), i=L.findIndex(l=>/waitSeconds/.test(l));
  const arr=L[i-1].match(/Math\.toRadians\(([-\d.]+)\)\)\s*$/), nxt=L[i+1].match(/setTangent\(Math\.toRadians\(([-\d.]+)\)\)/);
  const a=S.rrFromSim(0,0,Math.atan2(-40-s.x,40-s.z)).h*180/Math.PI, b=S.rrFromSim(0,0,Math.atan2(0,10-40)).h*180/Math.PI;
  const dd=(u,v)=>Math.abs(((u-v+540)%360)-180);
  return {arr:arr&&+arr[1], nxt:nxt&&+nxt[1], a, b, ok1:arr&&dd(+arr[1],a)<0.6, ok2:nxt&&dd(+nxt[1],b)<0.6}; });
ok(r.ok1&&r.ok2,'A2: בעצירה — משיק ההגעה '+r.arr+'° (כיוון ההגעה '+r.a.toFixed(1)+'°), ואחריה setTangent '+r.nxt+'° אל הנקודה הבאה');
// A3 — ירי אחרי קטע שעוקב משיק: head מתעדכן ולכן turnTo לא מדולג
r=await E(()=>{ setAlly('red'); const s=S.autoStartPose(); S.PATH.detour=false;
  const A={x:-40,z:-20}; let best=null;
  for(let a=0;a<36;a++){ const t=a*Math.PI/18, B={x:+(A.x+22*Math.sin(t)).toFixed(1),z:+(A.z+22*Math.cos(t)).toFixed(1)};
    if(S.pathBlocked(B.x,B.z)||B.x>-12) continue; const hy=X.pathHiveYaw(B.x,B.z); let d=hy-t; d=Math.abs(Math.atan2(Math.sin(d),Math.cos(d)));
    if(d>0.8&&d<1.4&&(!best||Math.abs(d-1.05)<Math.abs(best.d-1.05))) best={B,d}; }
  S.PATH.pts=[{x:s.x,z:s.z,h:s.h,act:'none',start:true},{x:A.x,z:A.z,h:null,act:'wait',sec:0.2},{x:best.B.x,z:best.B.z,h:null,act:'shoot'}];
  const j=S.pathJava(), c=rrCheck(j); S.PATH.detour=true;
  return {turns:(j.match(/turnTo/g)||[]).length, face:c.maxFace, d:best.d*180/Math.PI}; });
ok(r.turns>=1&&r.face<1,'A3: הגעה לירי '+r.d.toFixed(0)+'° מהכוורת → turnTo בקוד, והרובוט יורה מול הפתח (סטייה '+r.face.toFixed(2)+'°)');

// A4 — מסלול לא שמור שצויר לאדום, ומשחקים בכחול: עובר במראה
r=await E(()=>{ setAlly('red'); S.pathClear(); S.pathAdd(-40,30); S.pathAdd(-30,-20,{act:'wait'}); X.pathCurSet('');
  const red=S.PATH.pts.filter(p=>!p.auto).map(p=>[p.x,p.z]);
  S.SETUP.ally='blue'; S.SETUP.autoOn=true; S.SETUP.myAuto='cur'; S.SETUP.autos[0]='path';
  S.SETUP.red1=S.SETUP.red2=false; S.SETUP.blue1=S.SETUP.blue2=false; S.SETUP.partner=false;
  S.setupApply();
  const after=S.PATH.pts.filter(p=>!p.auto).map(p=>[p.x,p.z]), st=S.autoStartPose();
  let minX=1e9; for(let k=0;k<60*12;k++){ S.advance(1/60,1/60); minX=Math.min(minX,S.I(S.botBody.position.x)); }
  S.matchStop(); const o={red, after, st:[st.x,st.z], minX, n:after.length, warn:S.PATH.warn};
  S.SETUP.ally='red'; return o; });
ok(r.after[0][0]===r.st[0]&&r.after[0][1]===r.st[1]&&r.n===r.red.length&&r.after.slice(1).every((p,i)=>Math.abs(p[0]+r.red[i+1][0])<0.11&&Math.abs(p[1]+r.red[i+1][1])<0.11),'A4: המסלול עבר במראה לכחול ומתחיל בעמדת הפתיחה הכחולה (קודם: נוספה התחלה חדשה לפני המסלול האדום)');
ok(r.minX>0,'A4: באוטונומי הרובוט נשאר בצד הכחול (x מינימלי '+r.minX.toFixed(1)+', קודם -26.9)');
await E(()=>setAlly('red'));

// A5 — מחיקה בונה מחדש את העקיפות
r=await E(()=>{ S.pathClear(); S.pathAdd(-15,40); S.pathAdd(-15,-40); S.pathAdd(-40,-50);
  const iu=S.PATH.pts.findIndex(p=>!p.auto&&Math.abs(p.z+40)<1&&Math.abs(p.x+15)<1), b4=S.PATH.pts.filter(p=>p.auto).length;
  S.pathDel(iu); const u=S.PATH.pts.filter(p=>!p.auto); const stale=[];
  /* אחרי המחיקה: כל עקיפה שייכת לקטע אמיתי — אותה רשימה כמו בנייה מחדש מאפס */
  const now=S.PATH.pts.map(p=>[p.x,p.z,p.auto?1:0]).join(';'); S.pathRedetour(); const fresh=S.PATH.pts.map(p=>[p.x,p.z,p.auto?1:0]).join(';');
  return {b4, same:now===fresh, after:S.PATH.pts.filter(p=>p.auto).length}; });
ok(r.same&&r.b4>0,'A5: אחרי מחיקת נקודה אין עקיפות יתומות ('+r.b4+' → '+r.after+' עקיפות, זהה לבנייה מחדש)');
// A6 — לחיצה ליד עקיפה לא משנה פעולה של נקודה נסתרת
r=await E(()=>{ S.pathClear(); S.pathAdd(-15,40); S.pathAdd(-15,-40);
  const a=S.PATH.pts.find(p=>p.auto); if(!a) return null; const n0=S.PATH.pts.filter(p=>!p.auto).length;
  S.pathAdd(a.x+0.5,a.z+0.5); return {act:a.act, n1:S.PATH.pts.filter(p=>!p.auto).length, n0}; });
ok(r&&r.act==='none'&&r.n1===r.n0+1,'A6: לחיצה ליד נקודת עקיפה מוסיפה נקודה ולא מחליפה פעולה לעקיפה (פעולה: '+(r&&r.act)+')');
// A7 — הזזות פרח במתכנן שומרות 10″ מהאמצע
r=await E(()=>{ const base=S.autoExample('two'); let n=0,bad=0;
  for(let i=0;i<800;i++){ const q=S.optMutate(base,14,S.optRng(1000+i)); if(!q) continue;
    q.forEach(p=>{ if(p.act==='flower'){ n++; if(p.x>-10) bad++; } }); }
  return {n,bad}; });
ok(r.n>100&&r.bad===0,'A7: '+r.n+' פרחים אחרי 800 שינויים — 0 בתוך 10″ מהאמצע (קודם 3/800)');

// U5 — עריכה בצירי RR: X/Y/θ, ריק = משיק, 🎯 = פונה לכוורת; מוצמד למקום פנוי ובונה עקיפות
r=await E(()=>{ const o={}; S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,-30,{act:'shoot'});
  for(const rot of [0,90]){ S.rrSetRot(rot); S.pathInfo();
    const iu=S.PATH.pts.findIndex(p=>!p.auto&&!p.start&&p.act==='shoot');
    const tgt=S.rrFromSim(-25,-35); X.pathEditXY(iu,tgt.x.toFixed(1),tgt.y.toFixed(1));
    const p=S.PATH.pts.find(p=>!p.auto&&p.act==='shoot'); o['xy'+rot]=[p.x,p.z];
    X.pathEditH(S.PATH.pts.indexOf(p),'45'); o['h'+rot]=+(S.rrFromSim(0,0,p.h).h*180/Math.PI).toFixed(1);
    const el=document.querySelector('#pathList input[data-ph="'+S.PATH.pts.indexOf(p)+'"]'); o['ui'+rot]=el&&el.value;
    X.pathEditH(S.PATH.pts.indexOf(p),''); o['blank'+rot]=p.h; }
  S.rrSetRot(0);
  const p=S.PATH.pts.find(p=>!p.auto&&p.act==='shoot'), i=S.PATH.pts.indexOf(p);
  X.pathFaceHive(i); o.fh=[p.fh, p.h, X.pathHiveYaw(p.x,p.z)];
  const xIn=document.querySelector('#pathList input[data-px="'+S.PATH.pts.indexOf(p)+'"]'), hIn=document.querySelector('#pathList input[data-ph="'+S.PATH.pts.indexOf(p)+'"]');
  o.hDis=hIn&&hIn.disabled;
  /* דרך הממשק: שינוי שדה X מזיז את הנקודה, ונקודה בתוך מבנה נדחפת החוצה */
  xIn.value='0'; const yIn=document.querySelector('#pathList input[data-py="'+S.PATH.pts.indexOf(p)+'"]'); yIn.value='-20';
  xIn.dispatchEvent(new Event('change')); const q=S.PATH.pts.find(p=>!p.auto&&p.act==='shoot'); o.ui=[q.x,q.z,S.pathBlocked(q.x,q.z)];
  o.fh2=Math.abs(q.h-X.pathHiveYaw(q.x,q.z))<0.002;
  const iS=S.PATH.pts.findIndex(p=>p.start); o.start=X.pathEditXY(iS,'0','0');
  o.pack=JSON.parse(S.pathExportText()).pts.some(p=>p.fh===1);
  o.bad=X.pathEditXY(i,'abc','1');
  return o; });
ok(Math.abs(r.xy0[0]+25)<0.11&&Math.abs(r.xy0[1]+35)<0.11&&Math.abs(r.xy90[0]+25)<0.11&&Math.abs(r.xy90[1]+35)<0.11,'U5: X/Y בצירי RR → אותה נקודה בסימולטור בסיבוב 0° וב-90° ('+r.xy0+' · '+r.xy90+')');
ok(r.h0===45&&r.h90===45&&r.ui0==='45'&&r.ui90==='45'&&r.blank0===null,'U5: θ=45° ב-RR נשמר ומוצג; ריק = לאורך הנסיעה');
ok(r.fh[0]===1&&Math.abs(r.fh[1]-r.fh[2])<0.002&&r.hDis,'U5: 🎯 — הכיוון אל הכוורת, השדה θ נעול');
ok(!r.ui[2]&&r.fh2,'U5: עריכה בשדה (X=0,Y=-20 — על קו האמצע) → הנקודה הוזזה למקום פנוי ('+r.ui+'), והכיוון לכוורת חושב מחדש');
ok(r.start===false&&r.bad===false&&r.pack,'U5: נקודת ההתחלה לא זזה, מספר לא תקין נדחה, ״פונה לכוורת״ נשמר בטקסט');

// U9 — מגבלות RR: נשמרות, משנות את ההערכה, כתובות בקוד; ההערכה מוצגת ליד זמן הסימולטור
r=await E(()=>{ S.pathLoad('ex:preload'); const plan=X.pathPlan(S.PATH.pts,null);
  const t1=X.pathRrTime(plan).t; X.rrcSet('maxWheelVel',25); const t2=X.pathRrTime(plan).t; const st=localStorage.getItem('bbRRcons1');
  const j=S.pathJava(); X.rrcSet('maxWheelVel',50);
  const T=X.pathRrTime({st:0,mv:[{k:'tan',a:0},{k:'spl',x:0,z:100,tan:0,hm:'tan',h:0,a:{x:0,z:0,t:0}}]});
  S.pathRun(); S.pathInfo(); const info=document.getElementById('oPath').textContent;
  const inp=document.getElementById('rrcV'); inp.value='9999'; inp.dispatchEvent(new Event('change')); const clamp=X.RRC.maxWheelVel; inp.value='50'; inp.dispatchEvent(new Event('change'));
  return {t1,t2,st:JSON.parse(st).maxWheelVel,j,T:T.t,info,clamp}; });
ok(r.t2>r.t1&&r.st===25,'U9: maxWheelVel 50 → 25 מאריך את ההערכה ('+r.t1+' → '+r.t2+' שנ׳) ונשמר ב-bbRRcons1');
ok(Math.abs(r.T-3.3)<0.05,'U9: טרפז — 100″ ב-50″/s, תאוצה 50 והאטה 30: '+r.T+' שנ׳ (צפוי 3.33)');
ok(/מגבלות RR: maxWheelVel 25/.test(r.j)&&/זמן משוער \(פרופיל טרפז\)/.test(r.j),'U9: המגבלות והערכת הזמן כתובות בראש הקוד');
ok(/RR ≈ [\d.]+/.test(r.info),'U9: בלוח — ״RR ≈ X שנ׳״ ליד הזמן על השלדה');
ok(r.clamp===300,'U9: ערך לא סביר נחתך לטווח (9999 → '+r.clamp+')');

// כותרת: מוסכמת הזירה בשורה אחת, ושורות הכותרת לפי הסיבוב
r=await E(()=>{ const o={}; S.pathLoad('ex:leave'); for(const rot of [0,90,180,270]){ S.rrSetRot(rot); const l=S.pathJava().split('\n').find(l=>/מוסכמת הזירה/.test(l)); o[rot]=l; } S.rrSetRot(0); return o; });
ok(/RR \+X → הקהל, \+Y → הצד הכחול/.test(r[0])&&/RR \+X → הצד האדום, \+Y → הקהל/.test(r[90])&&/הצד הרחוק מהקהל/.test(r[180]),'כותרת: ״מוסכמת הזירה״ — לאן מצביעים ‎+X ו-‎+Y בכל סיבוב');

// לימוד בהדגמה: עדיין עם כיוון, מהירות, סיבוב במקום וזמנים
r=await E(()=>{ S.stageMatch(); S.pathClear(); S.homeRobot(); S.teachStart();
  S.key('KeyW',true); S.advance(1.2,1/60); S.key('KeyW',false); S.key('KeyQ',true); S.advance(0.6,1/60); S.key('KeyQ',false);
  S.key('KeyW',true); S.advance(0.8,1/60); S.key('KeyW',false); S.advance(0.5,1/60); S.teachStop(); return S.teachJava(); });
ok(/splineToLinearHeading/.test(r)&&/TranslationalVelConstraint/.test(r)&&/t=\d/.test(r),'לימוד בהדגמה: הקוד עדיין עם כיוון, מהירות וזמנים (סיבוב במקום — teach_test)');

// אנגלית: הקוד והלוח בלי עברית
await page.evaluate(()=>localStorage.setItem('bbLang1','en')); await page.reload();
await page.waitForFunction(()=>window.__sim&&window.__sim.botBody,null,{timeout:60000});
r=await E(()=>{ const S=__sim; S.stageMatch(); S.setWS('auto'); S.pathLoad('ex:cycle'); S.pathRun(); S.pathInfo();
  document.getElementById('bPathJava').click(); const j=document.getElementById('pathOut').value;
  __sim.v72export.pathFreezeShots(); S.pathInfo(); window.__j=j; });
await page.waitForTimeout(300);
r=await E(()=>{ const S=__sim, j=window.__j;
  const heb=t=>(t.match(/[֐-׿][^\n]{0,24}/g)||[]);
  const box=document.getElementById('rrcBox'), list=document.getElementById('pathList');
  const attrs=[...list.querySelectorAll('[title],[aria-label]')].map(e=>(e.getAttribute('title')||'')+(e.getAttribute('aria-label')||'')).join(' ');
  return {j:heb(j), box:heb(box.innerText+' '+box.querySelector('summary').textContent), list:heb(list.innerText+' '+attrs), fz:heb(document.getElementById('bPathFreeze').textContent+document.getElementById('bPathFreeze').title),
    info:heb([...document.querySelectorAll('#oPath > div')].filter(d=>/Shooting spots|RR ≈|Note/.test(d.textContent)).map(d=>d.textContent).join(' ')), warn:S.PATH.warn}; });
ok(r.j.length===0,'אנגלית: בקוד המיוצא אין עברית '+r.j.slice(0,3).join(' | '));
ok(r.box.length===0&&r.list.length===0&&r.fz.length===0,'אנגלית: מגבלות RR, רשימת הנקודות וכפתור ההקפאה בלי עברית '+r.box.concat(r.list,r.fz).slice(0,3).join(' | '));
ok(r.info.length===0,'אנגלית: שורות הלוח החדשות (עמדות ירי, RR ≈, הערת ההקפאה) בלי עברית '+r.info.slice(0,3).join(' | '));
await page.evaluate(()=>localStorage.removeItem('bbLang1'));

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v72_export_test');
