// v72 (1.12.5 / 1.13) — אימון: תיקוני T1–T10 מסקירת התרגילים, וכרטיס סוף תרגיל/מאץ׳, סטטיסטיקות נקיות, אודומטריה בזמנים, האימון של היום
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
/* מריצים מאץ׳ עד הסוף בצעדים קטנים (בלי לחסום את הדף יותר מדי) */
const toEnd=async()=>{ for(let k=0;k<60;k++){ const on=await E(()=>{ const S=__sim; for(let i=0;i<10&&(S.MATCH.on||S.MATCH.cd>0);i++) S.advance(0.5,1/30); return S.MATCH.on||S.MATCH.cd>0; }); if(!on) break; } };
const toLive=()=>E(()=>{ const S=__sim; let g=0; while(!S.MATCH.on&&g++<200) S.advance(0.1,1/30); return S.MATCH.on; });
const clean=()=>E(()=>{ const S=__sim; ['biobuzz_debrief_best_v1','biobuzz_debrief_v1','biobuzz_records_v1','bbSeason1','bbAch1','biobuzz_ghost_v2','bbDrill1','bbDrillH1','bbPlan1','bbMissions1','bbCoach1'].forEach(k=>localStorage.removeItem(k));
  S.DRILL.best={}; S.DRILL.hist={}; S.ACH.st=null; S.achLoad(); S.ghostStoreReset(); S.debriefReset(); S.DRILL.lastK=null; S.v72training.V72T.card=null; });
await clean();

// ── T3: דיוק — התוצאה אחרי שהיריה העשירית נוחתת (קודם 9 כשנכנסו 10) ──
let r=await E(()=>{ const S=__sim, X=S.v72training; S.drillStart('acc'); S.clearBalls();
  for(let i=0;i<10;i++){ S.shotPose(); S.refreshAim(); S.bot.clip=['pollen','pollen','pollen','pollen']; S.bot.mag=4; S.fire(); if(i<9) S.advance(1.6,1/120); }
  X.drillTick(); const early={on:S.DRILL.on, best:S.DRILL.best.acc};
  S.advance(1.0,1/120); X.drillTick(); const mid={on:S.DRILL.on};
  S.advance(3.0,1/120); X.drillTick();
  return {early, mid, on:S.DRILL.on, best:S.DRILL.best.acc, hist:(S.DRILL.hist.acc||[]).length}; });
ok(r.early.on==='acc'&&r.early.best==null&&r.mid.on==='acc','אחרי היריה העשירית התרגיל מחכה שהכדור ינחת (לא נרשם מיד)');
ok(r.on===null&&r.best===10&&r.hist===1,'דיוק: נרשם 10/10 אחרי הנחיתה (קודם: 9) — '+r.best);

// ── U2: כרטיס סוף תרגיל — מדד, שיא, ספרקליין, ״↻ שוב (Enter)״ ──
r=await E(()=>{ const S=__sim; S.DRILL.hist.acc=[[1,6],[2,7],[3,10]]; S.v72training.v72tCard('acc',8,{nb:false,prev:10}); S.v72training.showBanner(); const bn=document.getElementById('banner');
  return {cls:bn.className, big:document.getElementById('bannerBig').textContent, sub:document.getElementById('bannerSub').textContent,
    act:!document.getElementById('bnAct').hidden, spark:!!document.querySelector('#bnAct .v72Spark'), again:(document.querySelector('#bnAct [data-bn="again"]')||{}).textContent||'',
    stop:document.getElementById('ppStop').textContent}; });
ok(/show/.test(r.cls)&&/end/.test(r.cls)&&/drill/.test(r.cls)&&r.big==='8/10'&&/דיוק/.test(r.sub)&&/השיא 10/.test(r.sub),'כרטיס סוף תרגיל: ״'+r.big+'״ · '+r.sub);
ok(r.act&&r.spark&&/שוב/.test(r.again)&&/Enter/.test(r.again),'בכרטיס: ספרקליין של 10 האחרונות וכפתור ״'+r.again+'״');
ok(/שוב/.test(r.stop)&&/דיוק/.test(r.stop),'״עוד משחק״ בלוח הופך ל״'+r.stop+'״');
r=await E(()=>{ document.body.focus(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return {on:__sim.DRILL.on, card:__sim.v72training.v72tCardOn()}; });
ok(r.on==='acc'&&!r.card,'Enter בכרטיס — אותו תרגיל שוב');
await E(()=>{ const S=__sim; S.matchStop(); S.v72training.drillAbort(); });

// ── T1: מחולל/מתכנן בזמן תרגיל חופשי לא נרשם כשיא ──
r=await E(async()=>{ const S=__sim; S.DRILL.best={}; S.DRILL.hist={};
  S.drillStart('park'); const on0=S.DRILL.on; await S.genRun({only:[0,1]});
  S.drillStart('acc'); const on1=S.DRILL.on; await S.genRun({only:[3,4]}); await new Promise(r=>setTimeout(r,400)); S.v72training.drillTick();
  return {on0,on1,after:S.DRILL.on, park:S.DRILL.best.park, acc:S.DRILL.best.acc, h:Object.keys(S.DRILL.hist).length}; });
ok(r.on0==='park'&&r.on1==='acc'&&r.after===null&&r.park==null&&r.acc==null&&r.h===0,'המחולל עוצר את התרגיל הפתוח, ושום ריצה שלו לא נרשמת (קודם: דיוק 9, חניה 5.1)');

// ── T4 + T5 + U2: תרגיל עם שעון (60 שנ׳ לבד) ──
await clean();
await E(()=>{ const S=__sim; Object.assign(S.SETUP,{autoOn:true,auto:30,trans:8,tele:120,partner:true,blue1:true,blue2:true,cd:3,ghost:true}); S.setupSave&&S.setupSave(); S.matchStop(); S.drillStart('cycle'); });
await toLive(); await toEnd();
r=await E(()=>{ const S=__sim; const bn=document.getElementById('banner'); S.ppRefresh&&S.ppRefresh();
  return {debBest:localStorage.getItem('biobuzz_debrief_best_v1'), prevDeb:localStorage.getItem('biobuzz_debrief_v1'), rec:localStorage.getItem('biobuzz_records_v1'),
    big:document.getElementById('bannerBig').textContent, cls:bn.className, deb:!!document.querySelector('#bnAct [data-bn="debrief"]'),
    stop:document.getElementById('ppStop').textContent, kinds:S.seasonAll().map(m=>m.kind)}; });
ok(!r.debBest&&!r.prevDeb&&!r.rec,'תרגיל לא נכנס לשיא התחקיר, ל״קודם״ ולרשימת השיאים (קודם: [10])');
ok(/drill/.test(r.cls)&&!/תיקו|ניצחון|הפסד/.test(r.big)&&/נק׳/.test(r.big)&&r.deb,'סוף תרגיל לבד: ״'+r.big+'״ (לא ״תיקו״), עם ״תחקיר״');
r=await E(()=>{ document.getElementById('ppStop').click(); const S=__sim; return {on:S.DRILL.on, tele:S.MT.tele}; });
ok(r.on==='cycle'&&r.tele===60,'״🔁 שוב״ בלוח מתחיל את אותו תרגיל (לא מאץ׳ מהיר)');
await toLive(); await toEnd();
r=await E(()=>{ const S=__sim; S.matchStop(); S.matchStart(); let g=0; while(!S.MATCH.on&&g++<200) S.advance(0.1,1/30);
  return {tele:S.MT.tele, auto:S.MT.auto, bots:S.BOTS.filter(b=>b.on).length, drill:S.DRILL.on, lastK:S.DRILL.lastK}; });
ok(r.tele===120&&r.auto===30&&r.bots===3&&r.drill===null&&r.lastK===null,'מקש ״מאץ׳״ אחרי תרגיל — ההגדרות שלך חוזרות (טלאופ '+r.tele+', אוטונומי '+r.auto+', '+r.bots+' בוטים; קודם 60/0/0)');
await E(()=>__sim.matchStop());

// ── T7: 3 מחזורים על זמן — נשמרת רוח ──
r=await E(()=>{ const S=__sim; S.ghostStoreReset(); localStorage.removeItem('biobuzz_ghost_v2'); S.ghostStoreReset(); S.SETUP.ghost=true;
  S.drillStart('speed'); let g=0; while(!S.MATCH.on&&g++<200) S.advance(0.1,1/30);
  for(let i=0;i<3;i++){ S.advance(4,1/30); S.setClip([]); S.drillFire({logEntry:{range:40}}); }
  const st=S.ghostStore(); return {best:S.DRILL.best.speed, gb:Object.keys(st.best), metric:st.best.speed&&st.best.speed.metric, phase:S.MATCH.phase, card:S.v72training.v72tCardOn()}; });
ok(r.gb.includes('speed')&&r.metric===r.best,'3 מחזורים: נשמרה רוח, והשיא שלה לפי הזמן ('+r.metric+' שנ׳)');
ok(r.card,'גם כשהתרגיל נעצר באמצע המאץ׳ — כרטיס סוף');

// ── T8: רוח של תרגיל — השיא לפי מדד התרגיל ──
r=await E(()=>{ const S=__sim, G=S.v72training.GHOST; S.ghostStoreReset(); localStorage.removeItem('biobuzz_ghost_v2'); S.ghostStoreReset();
  const one=(pts,metric)=>{ S.DRILL.on='dodge'; S.ghostArm(); S.DRILL.on=null; for(let i=0;i<30;i++) G.rec.push([0,0,0,0,pts]); S.ghostCommit(pts,metric); };
  one(50,-10); one(20,5); const b=S.ghostStore().best.dodge;
  S.DRILL.lower.load=1; const l1=(m)=>{ S.DRILL.on='load'; S.ghostArm(); S.DRILL.on=null; for(let i=0;i<30;i++) G.rec.push([0,0,0,0,10]); S.ghostCommit(10,m); };
  l1(12); l1(9.5); l1(14); const L=S.ghostStore().best.load;
  return {dodge:b.metric, score:b.score, load:L.metric}; });
ok(r.dodge===5&&r.score===20,'עקיפה: השיא הוא 5 (נקודות פחות עבירות), לא 50 נקודות ברית עם עבירות');
ok(r.load===9.5,'טעינה: השיא הוא הזמן הקצר (9.5 שנ׳)');

// ── T2: אחרי אתגר יומי שנעצר — המאץ׳ הבא שומר רוח ──
r=await E(()=>{ const S=__sim; S.ghostStoreReset(); localStorage.removeItem('biobuzz_ghost_v2'); S.ghostStoreReset();
  let k=S.dailyKey(); for(let i=0;i<40;i++){ if(S.dailyDrillOf(k)==='cycle') break; k=S.dailyPrev(k); }
  S.DAILY.fake=k; const ok1=S.dailyStart(); let g=0; while(!S.MATCH.on&&g++<200) S.advance(0.1,1/30); S.advance(3,1/30); S.matchStop();
  Object.assign(S.SETUP,{autoOn:false,tele:15,cd:0,partner:false,blue1:false,blue2:false,ghost:true}); S.setupApply(); return ok1; });
await toEnd();
r=await E(()=>{ const S=__sim; const st=S.ghostStore(); S.DAILY.fake=null; return {last:!!st.last.match, best:!!st.best.match}; });
ok(r.last&&r.best,'מאץ׳ רגיל אחרי אתגר יומי שנעצר — הרוח נשמרת (קודם: לא נשמרה)');

// ── U8: כרטיס סוף מאץ׳ — עוד משחק / תחקיר / המחזור האיטי ──
r=await E(()=>{ const S=__sim, X=S.v72training; X.HUD.endGone=false; X.showBanner();
  X.DEB.report=Object.assign({},X.DEB.report||{},{cycD:[{t:4.2,at:6.1,b:{drive:3}},{t:5.9,at:12,b:{drive:6}},{t:1.6,at:13.6,b:{}}]});
  X.V72T.ver++; X.showBanner();
  const btns=[...document.querySelectorAll('#bnAct [data-bn]')].map(b=>b.dataset.bn);
  const sl=document.querySelector('#bnAct [data-bn="slow"]'); const txt=sl&&sl.textContent;
  if(sl) sl.click(); const R=X.REPLAY;
  const out={btns, txt, on:R.on, pos:R.frames[R.pos]&&R.frames[R.pos][2], stopAt:R.stopAt!=null&&R.frames[R.stopAt]&&R.frames[R.stopAt][2], follow:R.follow, speed:R.speed};
  S.replayClose&&S.replayClose(); return out; });
ok(r.btns.join()==='again,debrief,slow'&&/5\.9/.test(r.txt||''),'כרטיס סוף מאץ׳: '+r.btns.join(' / ')+' · ״'+r.txt+'״');
ok(r.on&&Math.abs(r.pos-5.1)<0.2&&Math.abs(r.stopAt-13)<0.2&&r.follow===0&&r.speed===0.5,'״המחזור האיטי שלי״ פותח את השידור החוזר ב-'+r.pos+'–'+r.stopAt+' שנ׳ (מחזור 5.9 שנ׳ שהסתיים ב-12), עוקב אחרי הרובוט שלי, חצי מהירות');
r=await E(()=>{ const S=__sim, X=S.v72training; S.renderDebrief(); const rows=[...document.querySelectorAll('#oDebrief .dbcr[data-cyc]')];
  if(rows[0]) rows[0].click(); const R=X.REPLAY; const o={n:rows.length, on:R.on, pos:R.frames[R.pos]&&R.frames[R.pos][2]}; S.replayClose&&S.replayClose(); return o; });
ok(r.n===3&&r.on&&Math.abs(r.pos-0.9)<0.2,'שורות המחזורים בתחקיר נלחצות — מחזור 1 נפתח ב-'+r.pos+' שנ׳');
r=await E(()=>{ const S=__sim, X=S.v72training; X.HUD.endGone=false; X.V72T.card=null; X.V72T.ver++; X.showBanner(); document.querySelector('#bnAct [data-bn="debrief"]').click();
  const o={modal:!document.getElementById('playModal').hidden, txt:document.getElementById('pmBody').textContent}; document.getElementById('pmX').click(); return o; });
ok(r.modal&&/זמן מחזור|ניקוד/.test(r.txt),'״📋 תחקיר״ פותח את התחקיר בחלון');
r=await E(()=>{ const S=__sim, X=S.v72training; X.HUD.endGone=false; X.showBanner(); const b=document.querySelector('#bnAct [data-bn="again"]'); b.click(); const o={cd:S.MATCH.cd>0||S.MATCH.on, tele:S.MT.tele}; S.matchStop(); return o; });
ok(r.cd&&r.tele===15,'״↻ עוד משחק״ — מאץ׳ חדש עם ההגדרות שלך');

// ── T9 / U3: סטטיסטיקות והישגים — משחקים בלבד ──
r=await E(()=>{ const S=__sim, X=S.v72training; const t0=Date.now()-1e6;
  const a=[{at:t0,kind:'match',my:40,opp:30,win:1,shots:10,hits:6,fouls:0,avgCycle:9,cycles:4},{at:t0+1,kind:'drill',my:10,opp:10,win:0,shots:5,hits:5,avgCycle:5,cycles:4},
    {at:t0+2,kind:'daily',my:30,opp:0,win:1,shots:4,hits:4},{at:t0+3,kind:'quick',my:20,opp:35,win:-1,shots:10,hits:4,fouls:1,avgCycle:8.5,cycles:3},{at:t0+4,kind:'drill',drill:'acc',dv:9}];
  localStorage.setItem('bbSeason1',JSON.stringify(a)); X.STAT.drills=false; S.statUI();
  const m=S.statCalc(); const t1=document.getElementById('stOut').textContent;
  document.querySelector('[data-stk="drills"]').click(); const d=S.statCalc(); const pressed=document.querySelector('[data-stk="drills"]').getAttribute('aria-pressed');
  document.querySelector('[data-stk="drills"]').click();
  const D=X.achData({all:a, best:{}, hist:{}, lower:{}}); const cs=S.coachSummary();
  return {mn:m.n, mW:m.W, dn:d.n, pressed, fast:D.fastCycle, csN:cs&&cs.analyzed, csTot:cs&&cs.matchesTotal}; });
ok(r.mn===2&&r.mW===1,'ברירת המחדל: 2 משחקים בלבד (תרגיל, אתגר ורשומת שיא לא נספרים) — '+r.mn+', ניצחונות '+r.mW);
ok(r.dn===2&&r.pressed==='true','הצ׳יפ ״🎯 תרגילים״ מציג רק את התרגיל והאתגר ('+r.dn+')');
ok(r.fast===false,'״מחזור מהיר״ לא נפתח מתרגיל (5 שנ׳ בתרגיל, 8.5 במאץ׳)');
ok(r.csN===2&&r.csTot===2,'״נתח אותי״ — רק משחקים ('+r.csN+')');

// ── U3: טבלת הקבוצה — לפי זמן מחזור, דיוק, עבירות, חניה; ושיאי תרגילים ──
r=await E(()=>{ const S=__sim, X=S.v72training;
  const team=[{name:'איטי',emoji:'🐢',sum:{n:10,W:9,L:1,avg:60,best:80,acc:0.9,cyc:9.5,fouls:0.1,park:1,drills:{acc:10,speed:30}}},
    {name:'מהיר',emoji:'⚡',sum:{n:5,W:1,L:4,avg:30,best:40,acc:0.6,cyc:6.1,fouls:0.4,park:0.6,drills:{load:7.2}}},
    {name:'מהיר ומדויק',emoji:'🎯',sum:{n:4,W:0,L:4,avg:25,best:30,acc:0.8,cyc:6.1,fouls:0.2,park:0.5}},{name:'חדש',emoji:'🐝',sum:{n:0}}];
  X.setAppOn(true); X.setAppTeam(team); const h=X.appTeamHTML(); const div=document.createElement('div'); div.innerHTML=h;
  const names=[...div.querySelectorAll('tr')].slice(1).map(tr=>tr.children[1].textContent.replace(/^\S+\s/,'').trim());
  const hdr=div.querySelector('tr').textContent; const accCell=div.querySelectorAll('tr')[3].textContent;
  const ct=S.coachTeamSummary(); X.setAppOn(false); X.setAppTeam(null);
  return {names, hdr, accCell, ct:ct.drivers.map(d=>d.name), dr:ct.drivers.find(d=>d.name==='איטי').drillBests}; });
ok(r.names.join(',')==='מהיר ומדויק,מהיר,איטי,חדש','טבלת הקבוצה ממוינת לפי זמן מחזור ואז דיוק (לא אחוז ניצחונות): '+r.names.join(' > '));
ok(/זמן מחזור/.test(r.hdr)&&/עבירות למשחק/.test(r.hdr)&&/חניה/.test(r.hdr)&&/דיוק/.test(r.hdr)&&/3 מחזורים על זמן/.test(r.hdr)&&/טעינה על זמן/.test(r.hdr)&&/10\/10/.test(r.accCell),'עמודות: זמן מחזור, דיוק, עבירות, חניה + שיאי דיוק / 3 מחזורים / טעינה');
ok(r.ct.join(',')==='מהיר ומדויק,מהיר,איטי'&&r.dr&&r.dr.acc===10&&r.dr.speed===30,'״נתח את הקבוצה״ באותו סדר, עם שיאי התרגילים');

// ── T6: ״🎯 משימות בשבילי״ שוב לא מוחק ימים שסומנו ──
r=await E(()=>{ const S=__sim; localStorage.removeItem('bbPlan1'); localStorage.removeItem('bbSeason1'); S.DRILL.best={}; S.DRILL.hist={};
  S.missionsOpen(true); const p0=S.planGet(); const k=p0.items[0].drill; S.planMark(k,5); const before=S.planGet().st.done.filter(Boolean).length;
  S.missionsOpen(true); const p2=S.planGet(); document.getElementById('coachX')&&document.getElementById('coachX').click();
  return {before, after:p2.st.done.filter(Boolean).length, k, same:p2.items[0].drill}; });
ok(r.before===1&&r.after===1,'בנייה מחדש של המשימות שומרת את היום שסומן ('+r.before+' → '+r.after+'; קודם 1 → 0)');

// ── T10: עקיפה עם שיא שלילי ──
r=await E(()=>{ const S=__sim; localStorage.removeItem('bbSeason1'); S.DRILL.best={dodge:-20}; S.DRILL.hist={dodge:[[1,-20],[2,-40]]};
  const L=S.missionsBuild(); const imp=L.json.improve.map(x=>x.what); const pl=L.json.plan.find(x=>x.drill==='dodge');
  S.DRILL.best={}; S.DRILL.hist={}; return {imp, goal:pl&&pl.goal}; });
ok(r.imp.includes('עקיפה בלי עבירות')&&/-27/.test(r.goal||''),'עקיפה: −40 מול שיא −20 היא חולשה, והיעד מעל הממוצע (״'+r.goal+'״; קודם: לא זוהתה)');

// ── U10: האימון של היום — חימום דיוק + התרגיל של היום ×3, סיכום וסימון ──
r=await E(()=>{ const S=__sim, X=S.v72training; localStorage.removeItem('bbPlan1');
  localStorage.setItem('bbMissions1',JSON.stringify({kind:'me',at:Date.now(),ok:true,model:'local',sum:{},json:{plan:[{day:1,drill:'park',goal:'מתחת ל-6 שנ׳'},{day:2,drill:'acc',goal:'8/10'}]}}));
  S.missionsOpen(); const btn=document.querySelector('#coachBody [data-sess-go]'); const has=!!btn; btn.click();
  const s=X.V72T.sess; const o={has, on:S.DRILL.on, q:s&&s.q.join(',')};
  /* חימום */
  S.drillRecord('acc',7,'/10'); o.next=(document.querySelector('#bnAct [data-bn="again"]')||{}).textContent||'';
  const parks=[]; for(const v of [7.1,5.4,6.3]){ document.querySelector('#bnAct [data-bn="again"]').click(); parks.push(S.DRILL.on); S.drillRecord('park',v,' שנ׳'); }
  o.parks=parks; o.sum=(document.querySelector('#bnAct .v72Sum')||{}).textContent||''; const p=S.planGet(); o.done=p.st.done.map(d=>d&&d.v); o.sessOn=X.v72tSessOn&&X.V72T.sess.on;
  return o; });
ok(r.has&&r.on==='acc'&&r.q==='acc,park,park,park','״▶ התחל את האימון של היום״: חימום דיוק ואז חניה ×3');
ok(/הבא/.test(r.next)&&/חניה/.test(r.next)&&r.parks.join()==='park,park,park','בין התרגילים: ״'+r.next+'״ — כל לחיצה מתחילה את הבא');
ok(/5\.4/.test(r.sum)&&/✓/.test(r.sum)&&r.done[0]===5.4&&r.done[1]==null,'סיכום: הכי טוב 5.4 מול היעד ✓, ויום 1 סומן בתוכנית עם 5.4 (יום 2 — לא)');

// ── U6: אודומטריה — זמן אמיתי מול סימולטור, פיגור, קטעים ישרים, כיול בלחיצה ──
r=await E(()=>{ const S=__sim, X=S.v72training; S.matchStop(); X.drillAbort();
  const P=X.PATH; P.pts.length=0; const s0=S.autoStartPose();
  P.pts.push({x:s0.x,z:s0.z,start:true}); P.pts.push({x:s0.x+(s0.x<0?30:-30),z:s0.z,act:'wait'}); P.pts.push({x:s0.x+(s0.x<0?30:-30),z:s0.z-(s0.z>0?20:-20)});
  const run=X.pathRun(); const tr=run.trail;
  /* יומן ״אמיתי״ = אותו מסלול, לאט ב-30% */
  const rows=['t,x_in,z_in,heading_deg']; for(const q of tr) rows.push([(q[2]*1.3).toFixed(3),q[0],q[1],0].join(','));
  X.odoLoad(rows.join('\n'),{align:false}); const tm=X.v72tOdoTiming(); const html=document.getElementById('oOdo')?document.getElementById('oOdo').innerHTML:X.v72tOdoHTML();
  return {Treal:tm.Treal, Tsim:tm.Tsim, gap:tm.gapPct, slow:tm.slowPct, pts:tm.pts.map(p=>p.lag), off:tm.off, btn:/data-odo-cal/.test(html)}; });
ok(Math.abs(r.gap-30)<4&&r.Treal>r.Tsim,'זמן עד הסוף: אמיתי '+r.Treal+' שנ׳ מול '+r.Tsim+' בסימולטור ('+r.gap+'%)');
ok(r.slow!=null&&r.slow>15&&r.slow<30,'״האמיתי איטי ב-'+r.slow+'% בקטעים ישרים״');
ok(r.pts.length===2&&r.pts.every(l=>l!=null&&l>0),'פיגור בכל נקודת פעולה: '+r.pts.join(', ')+' שנ׳');
ok(r.off&&r.btn,'פער מעל 10% — מופיע ״⚙ כייל נהיגה מהיומן והרץ שוב״');
r=await E(()=>{ const S=__sim, X=S.v72training; const sp0=S.P.speed; const o=X.v72tOdoCal(); return {n:o&&o.n, sp0, sp1:S.P.speed, before:o&&o.before.Tsim, after:o&&o.after&&o.after.Tsim, gap:o&&o.after&&o.after.gapPct}; });
ok(r.n>=1&&r.sp1<r.sp0&&r.after>r.before,'כיול בלחיצה: '+r.n+' ערכים, מהירות '+r.sp0+'→'+r.sp1+' מ׳/ש׳, הסימולטור עכשיו '+r.before+'→'+r.after+' שנ׳ (פער '+r.gap+'%)');

ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();

// ── אנגלית: הכרטיסים והטבלה בלי עברית ──
({browser,page,errs}=await open({noraf:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); }); await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.v72training);
r=await page.evaluate(()=>{ const S=__sim, X=S.v72training; const heb=/[֐-׿]/;
  S.DRILL.hist.acc=[[1,6],[2,7]]; X.v72tCard('acc',8,{nb:true}); X.showBanner(); const a=document.getElementById('banner').innerText;
  X.V72T.card=null; X.V72T.ver++; X.HUD.endGone=false; S.setMatchOn(false); X.REPLAY.frames.push([0,0,0]); X.DEB.report={cycD:[{t:5,at:9,b:{}}],when:1,bins:{},score:1}; S.MATCH.phase='סיום'; X.showBanner(); const b=document.getElementById('bnAct').innerText;
  X.setAppOn(true); X.setAppTeam([{name:'Maya',emoji:'🐝',sum:{n:3,acc:0.5,cyc:7,fouls:0,park:1,drills:{acc:9}}}]); const div=document.createElement('div'); div.innerHTML=X.appTeamHTML(); document.body.appendChild(div);
  return new Promise(res=>setTimeout(()=>{ const t=div.innerText; div.remove(); X.setAppOn(false); X.setAppTeam(null); S.MATCH.phase='idle'; X.REPLAY.frames.length=0;
    res({a,b,t,ha:heb.test(a),hb:heb.test(b),ht:heb.test(t)}); },300)); });
ok(!r.ha&&/Again/.test(r.a),'אנגלית: כרטיס סוף תרגיל בלי עברית ('+r.a.replace(/\s+/g,' ').slice(0,90)+')');
ok(!r.hb&&/slowest/i.test(r.b),'אנגלית: כרטיס סוף מאץ׳ בלי עברית ('+r.b.replace(/\s+/g,' ')+')');
ok(!r.ht,'אנגלית: טבלת הקבוצה בלי עברית ('+r.t.replace(/\s+/g,' ').slice(0,120)+')');
await page.evaluate(()=>localStorage.removeItem('bbLang1'));
await browser.close();
done('v72_training_test');
