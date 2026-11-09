// v77 מוח: הבוט משחק לפי הסקאוטינג (b.sb) — docs/v77-brain.md
// BB_PORT=8931 node v77_brain_test.mjs
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs';
import {eventFile} from './_v77brain/profiles.mjs';
const EV=JSON.stringify(eventFile(null,4));
const FX=fs.readFileSync(new URL('./fixtures/scout04-match.json',import.meta.url),'utf8');
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ let s=12345; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; });

/* ── 1. בלי b.sb — בדיוק כמו קודם ── */
let r=await E(()=>{ const S=__sim, V=S.v77b.V77B; V.hits={}; S.setRealm('comp'); S.SETUP.cd=0; S.SETUP.ally='red'; S.setupApply();
  for(let k=0;k<60*45;k++) S.advance(1/60,1/60);
  return {hits:Object.keys(V.hits).length, sbS:S.BOTS.filter(b=>b.sbS).length, t:+S.MATCH.t.toFixed(0)}; });
ok(r.hits===0&&r.sbS===0&&r.t>=44,`R1: מאץ׳ בלי סקאוטינג — אף הוק של המוח לא פעל (${r.hits}), אין b.sbS (${r.sbS})`);
r=await E(t=>{ const S=__sim, V=S.v77b.V77B; S.matchStop(); V.hits={}; S.sctLoadText(t); S.sctApply();
  const k0=S.BOTS.map(b=>Object.assign({},S.skill(b)));
  for(const b of S.BOTS){ b.sb=null; b.skC=null; } S.sctPlay();
  for(let k=0;k<60*45;k++) S.advance(1/60,1/60);
  return {hits:Object.keys(V.hits).length, sbS:S.BOTS.filter(b=>b.sbS).length, prof:S.BOTS.filter(b=>b.prof).length,
    v:S.BOTS.map(b=>S.skill(b).v), cyc:S.BOTS.map(b=>S.skill(b).cycle)}; },FX);
ok(r.hits===0&&r.sbS===0&&r.prof===3,`R2: פרופילים עם b.sb=null — המוח לא נוגע (הוקים ${r.hits}, sbS ${r.sbS}, פרופילים ${r.prof})`);
ok(r.v.every(v=>v<=1),`R3: בלי b.sb — מהירות לא עוברת את 1 (${r.v.map(v=>v.toFixed(2)).join()})`);

/* ── 2. מיפוי: sctBotMods כבר לא הופך יריות למאץ׳ / זמן בין היפוכים לזמן בין יריות ── */
r=await E(t=>{ const S=__sim; S.matchStop(); S.sctLoadText(t); S.sctApply();
  const b=S.BOTS[2], base=S.SKILL[2].cycle; const p=b.prof; const sv={spm:p.spm,cyc:p.cyc,vs:p.vs,vb:p.vb};
  p.spm=6; p.cyc=40; p.vs=null; p.vb=null; b.skC=null; const c1=S.skill(b).cycle;
  p.spm=60; p.fc=Object.assign({},p.fc,{shots_per_match:1}); const t0=b.sb.targets.spm; b.sb.targets.spm=60; b.skC=null; const s2=S.skill(b);
  b.sb.targets.spm=t0; p.vs=3; p.vb=3; b.skC=null; const c3=S.skill(b).cycle;
  Object.assign(p,sv); b.skC=null;
  return {base,c1,v2:s2.v,c2:s2.cycle,c3}; },EV);
ok(Math.abs(r.c1-r.base)<1e-9,`M1: 6 יריות ו-40 שנ׳ בין היפוכים — הזמן בין יריות נשאר ${r.c1.toFixed(2)} (בסיס ${r.base})`);
ok(r.v2>1.05&&r.c2<r.base,`M2: 60 יריות למאץ׳ (ביטחון 1) — מהיר מהבוט הרגיל (${r.v2.toFixed(2)}) וזמן בין יריות קצר (${r.c2.toFixed(2)})`);
ok(Math.abs(r.c3-1)<0.2,`M3: 3 כדורים ב-3 שנ׳ — זמן בין יריות ≈ 1 (${r.c3.toFixed(2)})`);

/* ── 3. כל התנהגות — השפעה שרואים (בדיקות יחידה על הפונקציות של המוח) ── */
r=await E(t=>{ const S=__sim, X=S.v77b; S.matchStop(); S.sctLoadText(t); S.SCT.ours='90099'; S.SCT.mi=0; S.sctApply();
  const out={}; const sbOf=team=>S.sctBehave(S.SCT.pack.robots[team]);
  const b=S.BOTS[2];
  /* אוטונומי */
  const roll=(sb,lv)=>{ X.v77bMatchArm(); b.sb=sb; b.autoLvl=lv||'cycle'; b.sbN=null; S.MATCH.cd=1; X.v77bRoll(b); S.MATCH.cd=0; return {lv:b.autoLvl,ap:b.sbS.aPark,cap:b.sbS.aCap,start:b.sbS.start,on:b.on,S:b.sbS}; };
  const rook=sbOf(90003); rook.noShowP=0;
  out.rook=Array.from({length:30}).map(()=>roll(Object.assign({},rook)).lv);
  const wall=sbOf(90002); out.wall=roll(wall); out.wallShare=b.sbS.share; out.wallFb0=b.sbS.fb0;
  const mid=sbOf(90004); out.mid=roll(mid);
  /* לא הגיע */
  const ns=Object.assign({},sbOf(90001),{noShowP:1}); b.on=true; const nr=roll(ns); out.noShow={on:nr.on,flag:b.sbS.noShow,toast:document.getElementById('refToast').textContent};
  b.on=true;
  /* נהיגה */
  const ace=sbOf(90001); out.dw={ace:X.v77bDw(ace),rook:X.v77bDw(rook),wall:X.v77bDw(wall)};
  /* אגרסיביות */
  b.sb=wall; b.sbN=null; S.MATCH.cd=1; X.v77bRoll(b); S.MATCH.cd=0; const Sw=b.sbS; Sw.ag=1; Sw.fb=1; Sw.tryAt=-1e9;
  const P1=X.v77bPinLim(b,30,0.1,10,false); Sw.ag=0; Sw.push=false; Sw.fb=0; const P0=X.v77bPinLim(b,30,0.1,10,false);
  out.pin={r1:P1.r,k1:P1.keep,r0:P0.r,p0:P0.p,v0:P0.v(0.1),v1:P1.v(0.1)};
  return out; },EV);
ok(r.rook.every(l=>l==='leave'||l==='none'),`A1: 0 כדורים באוטונומי (פיט) — רק יציאה או כלום (${r.rook.join()})`);
ok(r.rook.some(l=>l==='none')&&r.rook.some(l=>l==='leave'),`A2: יציאה ב-50% מהמאצ׳ים — גם וגם ב-30 הגרלות (${r.rook.join()})`);
ok(r.wall.ap===false||r.wall.ap===true,`A3: חניה באוטונומי מוגרלת (${r.wall.ap})`);
ok(r.mid.start==='B',`A4: עמדה B מהסקאוטינג נבחרת (${r.mid.start})`);
ok(r.noShow.on===false&&r.noShow.flag===true&&/90001/.test(r.noShow.toast),`N1: סיכוי 1 לא להגיע — הבוט כבוי, הודעה ״${r.noShow.toast}״`);
ok(Math.abs(r.wallShare-0.8)<0.01,`D1: חלק הזמן בבלימה בביטחון 1 = 0.8 (${r.wallShare})`);
ok(r.dw.ace===0&&r.dw.rook>0.6&&r.dw.wall>0.3,`DR1: נהיגה 0.9 — בלי השפעה (${r.dw.ace}); 0.3 — חלשה (${r.dw.rook.toFixed(2)}); 0.6 — בינונית (${r.dw.wall.toFixed(2)})`);
ok(r.pin.r1<17+3&&r.pin.k1<24&&r.pin.r0>=17+3&&r.pin.p0<2.6,`AG1: אגרסיבי — נצמד יותר (${r.pin.r1.toFixed(1)}″, ${r.pin.k1}); נקי — מרחק ${r.pin.r0.toFixed(1)}″ ומשחרר מוקדם (${r.pin.p0} שנ׳)`);
ok(r.pin.v0<r.pin.v1,`AG2: נקי נוסע לאט יותר בבלימה (${r.pin.v0.toFixed(2)} מול ${r.pin.v1.toFixed(2)})`);

r=await E(()=>{ const S=__sim, X=S.v77b, b=S.BOTS[2]; const Sx=b.sbS; const out={};
  /* ניסיון ״לא משחרר בזמן״ — רק בשליטה הידנית, עם תקציב, ליד קיר */
  S.MT.cd=0; S.matchStart(); S.MATCH.t=(S.tAuto()+S.MT.trans)+10; Sx.ag=1; Sx.fb=1; Sx.tryAt=-1e9; Sx.push=false;
  out.noWall=!!X.v77bPinLim(b,30,0.1,40,false).into; out.wall=!!X.v77bPinLim(b,30,0.1,10,false).into;
  return out; });
ok(!r.noWall&&r.wall,`AG3: דחיפה רק ליד קיר או מול נהג (רחוק מקיר ${r.noWall}, ליד קיר ${r.wall})`);

r=await E(()=>{ const S=__sim, b=S.BOTS[2], Sx=b.sbS, X=S.v77b; const out={};
  Sx.mv=true; out.d1=X.v77bAimDist(b); out.c1=X.v77bFireCap(b);
  Sx.mv=false; out.c0=X.v77bFireCap(b); Sx.mv=null; out.d0=X.v77bAimDist(b); out.cn=X.v77bFireCap(b);
  /* כיוון ידני: מחכה לפני הירייה הראשונה במטח */
  Sx.dw=0; Sx.aa=false; Sx.v0=b.shots; b.t=S.skill(b).cycle+0.1; out.hold1=X.v77bFireHold(b); b.t=S.skill(b).cycle+0.6; out.hold2=X.v77bFireHold(b);
  Sx.aa=null; b.t=S.skill(b).cycle+0.1; out.hold3=X.v77bFireHold(b);
  /* מקורות איסוף */
  Sx.src={flower:false,floor:true,human:false};
  const fake=(x,y,z,kind,lb)=>({kind:kind||'pollen',lastBy:lb,body:{position:{x:x*0.0254,y:y*0.0254,z:z*0.0254}}});
  const F0=X.flowers();
  out.flOk=F0.length?X.v77bTakeOk(b,fake(F0[0].x,3,F0[0].z)):null; out.floorOk=X.v77bTakeOk(b,fake(0,1.4,0));
  out.srcFlower=X.v77bSrcOk(b,'flower');
  Sx.src=null; out.any=X.v77bTakeOk(b,fake(0,1.4,0));
  return out; });
ok(r.d1===14&&r.d0===5,`S1: יורה בתנועה — מתחיל לירות 14″ מהעמדה (רגיל 5)`);
ok(r.c1>r.cn&&r.c0<r.cn,`S2: מהירות בשלב הירי: בתנועה ${r.c1}, עוצר ${r.c0}, רגיל ${r.cn}`);
ok(r.hold1===true&&r.hold2===false&&r.hold3===false,`S3: כיוון ידני — מתיישב עוד 0.45 שנ׳ לפני המטח (${r.hold1}/${r.hold2}); רגיל לא מחכה (${r.hold3})`);
ok(r.flOk===false&&r.floorOk===true&&r.srcFlower===false&&r.any===true,`I1: רק מהרצפה — לא לוקח מהפרח (${r.flOk}), כן מהרצפה (${r.floorOk}); לא ידוע — הכול (${r.any})`);

/* עמדות פתיחה B ו-C — חוקיות (G304) לשתי הבריתות */
r=await E(()=>{ const S=__sim, X=S.v77b, out=[];
  for(const ally of ['red','blue']) for(const st of ['B','C']){ S.SETUP.ally=ally==='red'?'red':'blue'; S.MT.cd=3; S.matchStart();
    const b=S.BOTS.find(q=>q.ally===ally&&q.body); b.on=true; const Sx={start:st}; X.v77bStartPos(b,Sx);
    out.push({ally,st,ok:!!Sx.startOk,x:Math.round(b.home.x),z:Math.round(b.home.z),v:X.g304Check(b.home.x,b.home.z,b.yaw,ally,17,17).map(q=>q.r).join('')}); }
  S.SETUP.ally='red'; S.matchStop(); return out; });
ok(r.every(q=>q.ok&&!q.v&&(q.st==='B'?Math.abs(q.x)===36:Math.abs(q.x)===12)),`A5: עמדות B/C על הקיר הצדדי, חוקיות — ${r.map(q=>q.ally+q.st+':'+q.x+','+q.z+(q.v?'✗'+q.v:'')).join(' ')}`);

/* דיוק לכל ירייה */
r=await E(()=>{ const S=__sim, X=S.v77b, b=S.BOTS[2], Sx=b.sbS; const T3=window.__sim.THREE||null;
  const dir={x:1,y:0,z:0, clone(){ return {x:1,y:0,z:0}; }};
  let miss=0, clean=0; b.shots=0; b.hits=0; b.vSol=6;
  Sx.accT=0.4; for(let i=0;i<400;i++){ const q=X.v77bShotErr(b,dir,dir,6); if(q) miss++; }
  Sx.accT=0.99; for(let i=0;i<400;i++){ const q=X.v77bShotErr(b,dir,dir,6); if(q) clean++; }
  Sx.accT=null; const none=X.v77bShotErr(b,dir,dir,6);
  return {miss,clean,none}; });
ok(r.miss>220&&r.miss<330&&r.clean>300&&r.none===null,`AC1: דיוק 0.40 — ${r.miss}/400 יריות עם שגיאה מחטיאה; 0.99 — ${r.clean}/400 ״נקיות״; לא ידוע — אין שינוי`);

/* נקטר בסוף: קבוצה שלא מביאה נקטר — לא אוספת נקטר של הברית בדקה האחרונה */
r=await E(()=>{ const S=__sim, X=S.v77b, b=S.BOTS[2]; S.MT.cd=0; S.matchStart(); b.on=true; b.sb=b.sb||S.sctBehave(S.SCT.pack.robots[90002]); b.sbN=null; S.advance(1/60,1/60);
  const Sx=b.sbS; Sx.src=null; Sx.noNectar=true; const nb={kind:b.ally,body:{position:{x:0,y:0.03,z:0}}};
  S.MATCH.t=(S.tAuto()+S.MT.trans)+10; const early=X.v77bTakeOk(b,nb); S.MATCH.t=S.tEnd()-30; const late=X.v77bTakeOk(b,nb);
  S.matchStop(); return {early,late}; });
ok(r.early===true&&r.late===false,`L1: בלי נקטר בסוף — לפני הדקה האחרונה כן (${r.early}), בדקה האחרונה לא (${r.late})`);

/* ״איך הוא ישחק״ */
r=await E(t=>{ const S=__sim; S.sctLoadText(t); const P=S.SCT.pack.robots, f=n=>S.sbSummary(S.sctBehave(P[n]));
  const all=[90001,90002,90003,90004].flatMap(f);
  return {ace:f(90001), wall:f(90002), rook:f(90003), nul:S.sbSummary(null), lat:all.filter(c=>/[A-Za-z]{2,}/.test(c))}; },EV);
ok(r.nul.length===0,'X1: sbSummary(null) — רשימה ריקה');
ok(r.wall.includes('🛡 בולם 80%')&&r.wall.includes('🚫 לא יורה בתנועה')&&r.wall.includes('✋ כיוון ידני')&&r.wall.includes('📥 רק מהרצפה'),`X2: ״חומה״: ${r.wall.join(' · ')}`);
ok(r.rook.includes('🎮 נהיגה חלשה')&&r.rook.some(c=>/היעדרות/.test(c))&&r.rook.includes('📥 רק מהפרח'),`X3: ״טירון״: ${r.rook.join(' · ')}`);
ok(r.ace.includes('🏃 יורה בתנועה')&&r.ace.includes('🤝 משחק נקי')&&r.ace.includes('🚦 עמדה C'),`X4: ״אלוף״: ${r.ace.join(' · ')}`);
ok(r.lat.length===0,`X5: כל השבבים בעברית נקייה, בלי מילים באנגלית (${r.lat.length}); התרגום — v72_uiperf_test`);

/* ── 4. מאץ׳ מלא עם פרופילים: התנהגות שרואים, וכיול בטולרנס רחב (2 מאצ׳ים) ── */
const agg={};
for(const mi of [0,1]){
  r=await E(([t,mi])=>{ const S=__sim, V=S.v77b.V77B; S.matchStop(); V.seed=777+mi; S.setRealm('comp'); S.SETUP.cd=0; S.SETUP.ally='red'; S.REF.carry={}; S.REF.cards={};
    S.sctLoadText(t); S.SCT.ours='90099'; S.SCT.mi=mi; S.sctApply(); S.sctPlay();
    const st={}; for(const b of S.BOTS) st[b.name]={moved:0,px:b.body.position.x,pz:b.body.position.z};
    let k=0; while(S.MATCH.phase!=='סיום'&&k<11000){ S.advance(1/60,1/60); k++; }
    return S.BOTS.map(b=>({team:b.prof&&b.prof.team, on:b.on, sh:b.shots, hit:b.hits||0, def:b.sbS&&b.sbS.st.tele?b.sbS.st.def/b.sbS.st.tele:null, hes:b.sbS?b.sbS.st.hes:null, start:b.sbS?b.sbS.start:null, home:b.home, noShow:!!(b.sbS&&b.sbS.noShow)})); },[EV,mi]);
  for(const b of r){ if(!b.team) continue; const a=agg[b.team]||(agg[b.team]={n:0,sh:0,hit:0,def:[],hes:[],starts:[]}); if(!b.on){ a.ns=(a.ns||0)+1; continue; }
    a.n++; a.sh+=b.sh; a.hit+=b.hit; if(b.def!=null) a.def.push(b.def); a.hes.push(b.hes); a.starts.push(b.start+':'+Math.round(b.home.x)); }
}
const A=t=>agg[t]||{n:0,sh:0,hit:0,def:[],hes:[],starts:[]}, avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
console.log('  · '+JSON.stringify(agg));
const ace=A(90001), wall=A(90002), rook=A(90003), mid=A(90004);
if(wall.n) ok(avg(wall.def)>0.6,`F1: ״חומה״ (בלימה 0.8) בולם ${avg(wall.def).toFixed(2)} מהשליטה הידנית`);
if(ace.n) ok(avg(ace.def)<0.25,`F2: ״אלוף״ (בלימה 0) בולם רק ${avg(ace.def).toFixed(2)}`);
if(mid.n) ok(avg(mid.def)>0.2&&avg(mid.def)<0.65,`F3: ״בינוני״ (בלימה 0.4) — גם מנקד וגם בולם: ${avg(mid.def).toFixed(2)}`);
if(ace.n) ok(ace.sh/ace.n>16&&ace.sh/ace.n<42,`C1: ״אלוף״ — יעד 28 יריות, יצא ${(ace.sh/ace.n).toFixed(1)}`);
if(wall.n) ok(wall.sh/wall.n<13,`C2: ״חומה״ — יעד 6 יריות, יצא ${(wall.sh/wall.n).toFixed(1)}`);
if(rook.n) ok(rook.sh/rook.n<22,`C3: ״טירון״ — יעד 12 יריות, יצא ${(rook.sh/rook.n).toFixed(1)}`);
if(rook.n&&ace.n&&rook.sh>=6) ok(rook.hit/rook.sh<ace.hit/ace.sh-0.15,`C4: דיוק ״טירון״ (0.40) ${(rook.hit/rook.sh).toFixed(2)} נמוך מ״אלוף״ (0.85) ${(ace.hit/ace.sh).toFixed(2)}`);
if(rook.n) ok(rook.hes.every(h=>h>3),`DR2: נהג חלש מהסס בשליטה הידנית (${rook.hes.join()})`);
if(ace.n) ok(ace.hes.every(h=>h===0),`DR3: נהג טוב לא מהסס (${ace.hes.join()})`);
if(ace.n) ok(ace.starts.every(s=>/^C:-?12$/.test(s)||/^A:/.test(s)),`A6: ״אלוף״ פותח ב-C (${ace.starts.join()})`);
ok(realErrs(errs).length===0,'שגיאות בדף: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();
done('v77_brain_test');
