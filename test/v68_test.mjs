// v68: כיול נהיגה מהרובוט האמיתי · פירוק לכל מחזור והשוואה לשיא · תוכנית אימון מהמאמן
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);

/* מדידה בפיזיקה המלאה, כמו סטופר על הרובוט האמיתי: מעמידה, סטיק מלא, עד 96 אינץ׳ */
const meas=()=>E(()=>{ const S=__sim;
  const lin=(key,yaw)=>{ S.allKeysUp(); S.setPose(-48,-55,yaw); S.advance(0.5,1/60);
    const x0=S.I(S.botBody.position.x), z0=S.I(S.botBody.position.z); S.key(key,true); let t=0;
    while(t<8){ S.advance(1/60,1/60); t+=1/60; if(Math.hypot(S.I(S.botBody.position.x)-x0,S.I(S.botBody.position.z)-z0)>=96) break; }
    S.key(key,false); S.advance(0.6,1/60); return t; };
  const tF=lin('KeyW',90), tS=lin('KeyD',180);
  S.allKeysUp(); S.setPose(-30,-40,0); S.advance(0.5,1/60); S.key('KeyE',true);
  let t=0,a=0,y0=S.bot.yaw; while(t<8){ S.advance(1/60,1/60); t+=1/60; const y=S.bot.yaw; a+=Math.abs(Math.atan2(Math.sin(y-y0),Math.cos(y-y0))); y0=y; if(a>=2*Math.PI) break; }
  S.key('KeyE',false); S.advance(0.6,1/60);
  return {tF:+tF.toFixed(3), tS:+tS.toFixed(3), t360:+t.toFixed(3)}; });
const near=(a,b,p)=>Math.abs(a-b)<=b*p;

// 1. המודל החד־ממדי שהאשף פותר בו = הפיזיקה המלאה
let m0=await meas();
let md=await E(()=>{ const S=__sim; return {tF:S.calDrive1D(96,false).t, tS:S.calDrive1D(96,true).t, t360:S.calTurn1D()}; });
ok(near(md.tF,m0.tF,0.05)&&near(md.tS,m0.tS,0.05)&&near(md.t360,m0.t360,0.05),
  'המודל של האשף תואם לפיזיקה: קדימה '+md.tF+'/'+m0.tF+' · הצידה '+md.tS+'/'+m0.tS+' · סיבוב '+md.t360+'/'+m0.t360);

// 2. במצב ״תחרות״ — אחיזה וסטרייף נעולים, מהירות וסיבוב עדיין מתכיילים
let r=await E(()=>{ const S=__sim; S.setRealm('comp'); const mu=S.P.muWheel;
  const set=(id,v)=>document.getElementById(id).value=v;
  set('calDv',''); set('calDd',96); set('calDtf',2.4); set('calDts',''); set('calDw','');
  S.calSolveDrive(); return {mu0:mu, mu:S.P.muWheel, out:document.getElementById('oCalW').textContent}; });
ok(r.mu===r.mu0&&/נעולים במצב/.test(r.out),'במצב ״תחרות״ האחיזה לא משתנה ויש הסבר');

// 3. ״פתוח״: מזינים מדידה של רובוט אחר → פותר → הפיזיקה המלאה נותנת את מה שנמדד
const want={v:1.30, tF:2.05, tS:2.30, t360:2.10};
r=await E((w)=>{ const S=__sim; S.setRealm('open');
  const set=(id,v)=>document.getElementById(id).value=v;
  set('calDv',w.v); set('calDd',96); set('calDtf',w.tF); set('calDts',w.tS); set('calDw',w.t360);
  const n=S.calSolveDrive(); return {n, P:[S.P.speed,S.P.muWheel,S.P.strafeEff,S.P.turn], out:document.getElementById('oCalW').textContent}; },want);
ok(r.n===4&&r.P[0]===1.3,'ארבעה מקדמים נפתרו: מהירות '+r.P[0]+', אחיזה '+r.P[1]+', סטרייף '+r.P[2]+', סיבוב '+r.P[3]+'°/ש׳');
let m1=await meas();
ok(near(m1.tF,want.tF,0.06),'קדימה בפיזיקה המלאה אחרי הכיול: '+m1.tF+' שנ׳ (נמדד '+want.tF+')');
ok(near(m1.tS,want.tS,0.06),'הצידה אחרי הכיול: '+m1.tS+' שנ׳ (נמדד '+want.tS+')');
ok(near(m1.t360,want.t360,0.06),'סיבוב שלם אחרי הכיול: '+m1.t360+' שנ׳ (נמדד '+want.t360+')');
r=await E(()=>{ const set=(id,v)=>document.getElementById(id).value=v; set('calDv',9); set('calDtf',''); set('calDts',''); set('calDw','');
  const S=__sim, sp=S.P.speed; S.calSolveDrive(); return {sp0:sp, sp:S.P.speed, out:document.getElementById('oCalW').textContent}; });
ok(r.sp===r.sp0&&/מהיר מהמנוע/.test(r.out),'מהירות שהמנוע לא יכול לתת — לא נכנסת, ויש הסבר');
r=await E(()=>{ const S=__sim; const o=S.calDriveSim(); return o; });
ok(r.v>0&&r.tF>0&&r.t360>0,'״מה הסימולטור נותן היום״ מציג את אותם שדות ('+r.tF+' שנ׳ קדימה)');

// 4. מילוי מיומן אודומטריה: האצה בקו ישר עד 1.2 מ׳/ש׳, ואז סיבוב של 180°/ש׳
r=await E(()=>{ const S=__sim, pts=[]; let x=0,v=0,t=0; const IN=39.37;
  for(let i=0;i<20;i++){ pts.push({t,x:-40,z:-40,yaw:0}); t+=0.02; }
  while(x<120){ v=Math.min(1.2,v+4*0.02); x+=v*0.02*IN; pts.push({t,x:-40,z:-40+x,yaw:0}); t+=0.02; }
  let y=0; for(let i=0;i<60;i++){ y+=Math.PI*0.02; pts.push({t,x:-40,z:-40+x,yaw:y}); t+=0.02; }
  S.ODO.pts=pts; document.getElementById('calDd').value=96; const o=S.calDriveFromOdo();
  return {o, v:document.getElementById('calDv').value, tF:document.getElementById('calDtf').value, w:document.getElementById('calDw').value}; });
ok(Math.abs(+r.v-1.2)<0.05&&Math.abs(+r.w-2)<0.15&&+r.tF>1.8&&+r.tF<2.4,'מהיומן: מהירות '+r.v+', 96″ ב-'+r.tF+' שנ׳, סיבוב שלם '+r.w+' שנ׳');
await E(()=>{ __sim.ODO.pts=[]; __sim.resetParams&&__sim.resetParams(); });

// 5. פירוק לכל מחזור + השוואה לשיא
r=await E(()=>{ const S=__sim; localStorage.removeItem('biobuzz_debrief_best_v1'); S.debriefReset(); S.DEB.on=true; S.setMatchOn(true);
  const cyc=[[4,{drive:2.5,load:1,aim:0.5}],[9,{drive:3,blocked:4,aim:2}],[5,{drive:3,aim:2}]]; let t=40;
  S.setMatchT(t); S.debriefShot();
  for(const [g,b] of cyc){ t+=g; S.DEB.cb=Object.assign({},b); S.setMatchT(t); S.debriefShot(); S.setMatchT(t+0.2); S.debriefShot(); t+=0.2; }
  S.DEB.bins={drive:30,aim:10,load:8,blocked:4,idle:6,auto:30};
  S.debriefFinish(60); S.setMatchOn(false);
  const el=document.getElementById('oDebrief');
  return {n:S.DEB.report.cycD.length, slow:S.DEB.report.cycD[1], html:el?el.textContent:'', rows:el?el.querySelectorAll('.dbcr').length:0, slowRow:el?!!el.querySelector('.dbcr.slow'):false,
    best:JSON.parse(localStorage.getItem('biobuzz_debrief_best_v1')||'null')}; });
ok(r.n===3&&r.slow.t===9&&r.slow.b.blocked===4,'שלושה מחזורים נשמרו (יריות ברצף לא נספרות), כל אחד עם הפירוק שלו');
ok(r.rows===3&&r.slowRow&&/המחזור האיטי/.test(r.html)&&/חסום על ידי בולם \(4\.0/.test(r.html),'פס לכל מחזור, והאיטי מסומן: ״רובו חסום על ידי בולם״');
ok(r.best&&r.best.score===60,'המאץ׳ הראשון נשמר כשיא');
r=await E(()=>{ const S=__sim; S.debriefReset(); S.DEB.on=true; S.setMatchOn(true); S.DEB.bins={drive:30,aim:10,load:8,blocked:4,idle:14,auto:30};
  S.debriefFinish(48); S.setMatchOn(false); return {html:document.getElementById('oDebrief').textContent, best:JSON.parse(localStorage.getItem('biobuzz_debrief_best_v1')).score}; });
ok(/השיא שלך/.test(r.html)&&/חסרות 12/.test(r.html),'מאץ׳ חלש יותר מוצג מול השיא (חסרות 12)');
ok(/יותר עומד ללא מטרה: \+8\.0/.test(r.html)&&r.best===60,'״לעומת השיא״ מצביע על הזמן שהלך לאיבוד (עמידה +8.0 שנ׳), והשיא לא הוחלף');
r=await E(()=>{ const S=__sim; S.debriefReset(); S.DEB.on=true; S.setMatchOn(true); S.DEB.bins={drive:30,aim:10,load:8,blocked:4,idle:2,auto:30};
  S.debriefFinish(75); S.setMatchOn(false); return {html:document.getElementById('oDebrief').textContent, best:JSON.parse(localStorage.getItem('biobuzz_debrief_best_v1')).score}; });
ok(/שיא חדש/.test(r.html)&&r.best===75,'שיא חדש מסומן ונשמר');

// 6. רשומת העונה כוללת לאן הלך הזמן
r=await E(()=>{ const S=__sim; S.DEB.bins={drive:31.24,aim:10,load:8,blocked:4,idle:2,auto:30}; S.DEB.total=85;
  S.SEASON.cur={autoName:'בדיקה',autoPts:0,faults:0,sh:[],bl:[]}; const m=S.seasonEnd(); return m&&m.bins; });
ok(r&&r.drive===31.2&&r.idle===2,'הרשומה של המאץ׳ בעונה כוללת את הפירוק (נסיעה '+(r&&r.drive)+')');

// 7. היסטוריית תרגילים ותוכנית אימון
r=await E(()=>{ const S=__sim; localStorage.removeItem('bbDrillH1'); S.DRILL.hist={};
  S.drillRecord('acc',6,'/10'); S.drillRecord('acc',7,'/10'); S.drillRecord('speed',31.5,' שנ׳');
  const sum=S.coachSummary(); return {h:JSON.parse(localStorage.getItem('bbDrillH1')), dh:sum&&sum.drillHistory, ts:sum&&sum.timeSplitAvgSec}; });
ok(r.h.acc.length===2&&r.h.speed[0][1]===31.5,'כל תוצאה של תרגיל נשמרת בהיסטוריה (לא רק השיא)');
ok(r.dh&&r.dh.acc.last5.join(',')==='6,7'&&r.dh.speed.lowerIsBetter===true,'הסיכום למאמן כולל היסטוריית תרגילים');
ok(r.ts&&r.ts.drive>0&&r.ts.matches>=1,'הסיכום למאמן כולל את ממוצע הזמן לפי סוג ('+(r.ts&&r.ts.matches)+' משחקים)');
r=await E(()=>{ const S=__sim; const at=Date.now();
  localStorage.setItem('bbCoach1',JSON.stringify({kind:'me',at,ok:true,model:'mock',sum:{},json:{headline:'כותרת',
    plan:[{day:1,drill:'acc',goal:'8/10',tip:'עצור לפני הירי'},{day:2,drill:'speed',goal:'מתחת ל-30 שנ׳'},{day:3,drill:'nope',goal:'x'},{day:4,drill:'acc',goal:'8/10'}]}}));
  localStorage.removeItem('bbPlan1');
  const p=S.planGet(); S.coachShow(S.coachLast()); const box=document.getElementById('coachBody');
  return {n:p.items.length, rows:box.querySelectorAll('.coPl').length, txt:box.textContent}; });
ok(r.n===3&&r.rows===3&&/תוכנית אימון/.test(r.txt),'התוכנית מוצגת אצל המאמן, ותרגיל לא מוכר מסונן (3 ימים)');
r=await E(()=>{ const S=__sim; S.drillRecord('acc',8,'/10'); const p=S.planGet(); S.drillRecord('acc',9,'/10'); const p2=S.planGet();
  return {d1:p.st.done.map(x=>!!x).join(','), d2:p2.st.done.map(x=>!!x).join(','), v:p2.st.done[0].v}; });
ok(r.d1==='true,false,false'&&r.d2==='true,false,true'&&r.v===8,'תרגיל שבוצע מסמן לבד את היום הבא שלו בתוכנית');
r=await E(()=>{ const S=__sim; S.planToggle(1); S.coachShow(S.coachLast()); const box=document.getElementById('coachBody');
  return {done:S.planGet().st.done.filter(Boolean).length, checked:box.querySelectorAll('[data-plan-i]:checked').length, bar:(document.getElementById('coachBar')||{}).textContent||''}; });
ok(r.done===3&&r.checked===3,'סימון ידני בתוכנית נשמר ומוצג (3/3)');
await E(()=>{ document.getElementById('coachBox').hidden=true; });

// 8. משימות אישיות בלי בינה מלאכותית — לפי החולשות במספרים
r=await E(()=>{ const S=__sim; const base={ally:'red',opp:20,win:1,auto:'x',fouls:0,leave:true,park:true,faults:0,sh:[],bl:[],kind:'match',skill:1};
  const a=[]; for(let i=0;i<10;i++) a.push(Object.assign({},base,{at:Date.now()-i*1000,my:60,shots:20,hits:10,avgCycle:11.5,autoPts:18,
    pts:{tip:0,cell:40,flower:0,garden:0,leave:3,park:5},bins:{drive:40,aim:15,load:20,blocked:2,idle:25,auto:30}}));
  localStorage.setItem('bbSeason1',JSON.stringify(a));
  localStorage.setItem('bbDrillH1',JSON.stringify({acc:[[1,5],[2,6],[3,6]]})); S.DRILL.hist=JSON.parse(localStorage.getItem('bbDrillH1'));
  const m=S.missionsBuild(); const top=m.json.improve.map(x=>x.what);
  return {top, plan:m.json.plan, why:m.json.improve.map(x=>x.why)}; });
/* v70: עמידה ללא מטרה מפנה עכשיו ל״החלטות״ (קודם ״מחזורים״) */
ok(r.top.length===3&&/דיוק/.test(r.top.join())&&/3 מחזורים על זמן/.test(r.top.join())&&/החלטות/.test(r.top.join()),'שלוש החולשות הכי יקרות: '+r.top.join(' · '));
ok(r.why.some(w=>/דיוק 50%/.test(w))&&r.why.some(w=>/11\.5 שנ׳/.test(w)),'הסיבה במספרים שלך ('+r.why.join(' | ')+')');
ok(r.plan.length===5&&r.plan.filter(x=>x.drill==='acc').every(x=>x.goal==='7/10')&&r.plan.some(x=>x.drill==='acc'),'חמישה ימים; יעד הדיוק קצת מעל האחרונות (5,6,6 ← 7/10)');
ok(r.plan[0].drill===r.plan[2].drill,'החולשה הכי יקרה מקבלת שני ימים ('+r.plan.map(x=>x.drill).join(',')+')');
ok(r.plan.some(x=>x.drill==='speed'&&/פעם ראשונה/.test(x.goal)),'תרגיל שלא נעשה — ״פעם ראשונה — רושמים תוצאה״');
r=await E(()=>{ const S=__sim; S.missionsOpen(); const box=document.getElementById('coachBody'); const p=S.planGet();
  S.drillRecord('acc',7,'/10'); const p2=S.planGet();
  return {title:document.getElementById('coachTitle').textContent, rows:box.querySelectorAll('.coPl').length, sent:!!box.querySelector('.coSent'), local:/בלי בינה מלאכותית/.test(box.textContent),
    src:S.planSrc().model, done:p2.st.done.filter(Boolean).length}; });
ok(/משימות בשבילך/.test(r.title)&&r.rows===5&&!r.sent&&r.local,'המשימות מוצגות (5 ימים), בלי ״מה נשלח לגוגל״ — מחושב מקומית');
ok(r.src==='local'&&r.done===1,'המשימות הן התוכנית הפעילה, ותרגיל שבוצע מסמן יום');
r=await E(()=>{ const S=__sim; const L=S.planSrc(); localStorage.setItem('bbCoach1',JSON.stringify({kind:'me',at:L.at+1000,ok:true,model:'mock',sum:{},json:{plan:[{day:1,drill:'end',goal:'x'}]}}));
  return S.planSrc().model; });
ok(r==='mock','ניתוח חדש של המאמן מחליף את המשימות כתוכנית הפעילה (החדש מנצח)');
r=await E(()=>{ const S=__sim; const base={ally:'red',opp:20,win:1,auto:'x',leave:true,park:true,faults:0,sh:[],bl:[],kind:'match',skill:1,my:80,shots:20,hits:17,avgCycle:7,autoPts:20,fouls:1.5,pts:{park:5}};
  const a=[]; for(let i=0;i<8;i++) a.push(Object.assign({},base,{at:i})); localStorage.setItem('bbSeason1',JSON.stringify(a)); S.DRILL.hist={};
  return S.missionsBuild().json.plan.map(x=>x.drill); });
/* v70: עבירות מפנות עכשיו ל״עקיפה בלי עבירות״ (קודם ״מול בולם״) */
ok(new Set(r).size===3&&r[0]==='dodge','חולשה אחת בלבד — השבוע משלים בבסיס ולא חוזר על אותו תרגיל ('+r.join(',')+')');
await E(()=>{ document.getElementById('coachBox').hidden=true; localStorage.removeItem('bbSeason1'); });

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v68_test');
