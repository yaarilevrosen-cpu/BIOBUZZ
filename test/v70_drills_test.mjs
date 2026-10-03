// v70: שישה תרגילים חדשים — טעינה על זמן, החלטות, עמדות משתנות, עקיפה בלי עבירות, מעבר אוטונומי ← טלאופ, סיבוב פרחים
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
const NEW=['load','decide','moveshoot','dodge','transition','circuit'];
/* עד שהספירה לאחור נגמרת והמאץ׳ רץ */
const toMatch=`let g=0; while(!S.MATCH.on&&g++<200) S.advance(0.1,1/30);`;

// 1. רשומים בכל מקום: DRILL, לוח התרגול, ai/drills.json, החיפוש
let r=await E((NEW)=>{ const S=__sim; localStorage.removeItem('bbDrillH1'); localStorage.removeItem('bbDrill1'); S.DRILL.hist={}; S.DRILL.best={};
  return {n:Object.keys(S.DRILL.N).length, btn:NEW.filter(k=>document.querySelector('#ppDrills [data-drill="'+k+'"]')).length,
    u:NEW.filter(k=>S.DRILL.U[k]).length, lower:Object.keys(S.DRILL.lower).sort().join(',')}; },NEW);
ok(r.n===15&&r.btn===6&&r.u===6,'חמישה עשר תרגילים ב-DRILL, שישה כפתורים חדשים בלוח, לכולם יחידה ('+r.n+'/'+r.btn+'/'+r.u+')');
ok(r.lower==='circuit,load,park,speed','״נמוך יותר = טוב יותר״: '+r.lower);
const J=JSON.parse(fs.readFileSync(new URL('../ai/drills.json',import.meta.url),'utf8'));
const jn=NEW.map(k=>J.drills.find(d=>d.id===k)).filter(d=>d&&d.he&&d.en&&d.metric&&d.better&&Array.isArray(d.trains)&&d.what_he&&d.what_en);
ok(jn.length===6&&J.drills.length===15&&jn.find(d=>d.id==='load').better==='lower'&&jn.find(d=>d.id==='circuit').better==='lower','ai/drills.json: שישה חדשים עם כל השדות ('+J.drills.length+' בסך הכול)');
r=await E(()=>{ const S=__sim; S.cmdkOpen(); const i=document.getElementById('cmdkIn'); i.value='סיבוב פרחים'; i.dispatchEvent(new Event('input'));
  const res=S.CMDK.res.map(c=>c.id); S.cmdkClose(); return res; });
ok(r.includes('drill-circuit'),'החיפוש מוצא את התרגיל החדש ('+r.slice(0,3).join(',')+')');

// 2. טעינה על זמן: עמדה קבועה, מחסנית ריקה, ארבעה כדורים → זמן נרשם והמאץ׳ נעצר
r=await E((toMatch)=>{ const S=__sim; S.drillStart('load'); eval(toMatch);
  const sp=S.startSpots()[S.myAlly()+'1'], p0={x:S.I(S.botBody.position.x),z:S.I(S.botBody.position.z)}, clip0=S.clip.length;
  S.advance(2,1/30); S.setClip(['pollen','pollen']); S.advance(0.5,1/30); const mid=S.DRILL.on;
  S.advance(1.2,1/30); S.setClip(['pollen','pollen','pollen','pollen']); S.advance(0.1,1/30);
  return {clip0, d:Math.hypot(p0.x-sp.x,p0.z-sp.z), mid, on:S.DRILL.on, m:S.MATCH.on, best:S.DRILL.best.load, h:(S.DRILL.hist.load||[]).length}; },toMatch);
ok(r.clip0===0&&r.d<1,'טעינה: מתחילים מעמדת הפתיחה (סטייה '+r.d.toFixed(2)+'″) עם מחסנית ריקה');
ok(r.mid==='load'&&r.on===null&&!r.m&&r.best>3.5&&r.best<4.2&&r.h===1,'טעינה: ב-2/4 התרגיל ממשיך; ב-4/4 נרשמו '+r.best+' שנ׳ בהיסטוריה והמאץ׳ נעצר');

// 3. החלטות: פרח מסומן, מחזור נספר רק בטעינה בו; אחרי מחזור — פרח אחר וחוקי
r=await E((toMatch)=>{ const S=__sim; S.drillStart('decide'); eval(toMatch); const D=S.DRILL, F=S.FLOWERS;
  const t0=D.dT, m0=S.v70Marks(), beacon=S.V70D.g.children.find(m=>m.userData.flower===t0);
  const near=i=>{ const f=F[i]; S.setPose(f.x*0.86,f.z*0.86,0); };
  near(t0); S.setClip(['pollen']); S.advance(0.1,1/30); S.setClip([]); S.drillFire({logEntry:{range:40}});
  const t1=D.dT, c1=D.cycles, legal=S.flowerCount(t1)>0;
  const wrong=[0,1,2,3].find(i=>i!==t1); near(wrong); S.setClip(['pollen']); S.advance(0.1,1/30); S.setClip([]); S.drillFire({logEntry:{range:40}});
  const c2=D.cycles, t2=D.dT;
  near(t1); S.setClip(['pollen','pollen']); S.advance(0.1,1/30); S.setClip([]); S.drillFire({logEntry:{range:40}});
  return {t0,m0,bx:beacon?+S.I(beacon.position.x).toFixed(1):null,fx:F[t0].x,t1,c1,legal,c2,t2,c3:D.cycles,t3:D.dT,on:D.on,m3:S.v70Marks()}; },toMatch);
ok(r.t0>=0&&r.m0===3&&Math.abs(r.bx-r.fx)<0.5,'החלטות: הפרח המסומן ('+r.t0+') — עמוד אור מעליו וטבעת מולו ('+r.m0+' סימונים)');
ok(r.c1===1&&r.t1!==r.t0&&r.legal,'החלטות: טעינה בפרח המסומן + ירי = מחזור; הפרח התחלף ל-'+r.t1+' (יש בו כדורים)');
ok(r.c2===1&&r.t2===r.t1,'החלטות: טעינה בפרח אחר — המחזור לא נספר והיעד נשאר');
ok(r.c3===2&&r.t3!==r.t1&&r.m3===3,'החלטות: מחזור נכון שני ('+r.c3+'), יעד חדש '+r.t3+', סימון אחד בכל רגע');
for(let k=0;k<12;k++){ r=await E(()=>{ const S=__sim; for(let i=0;i<12&&S.MATCH.on;i++) S.advance(0.5,1/30); return {on:S.MATCH.on}; }); if(!r.on) break; }
r=await E(()=>{ const S=__sim; return {on:S.DRILL.on, best:S.DRILL.best.decide, h:(S.DRILL.hist.decide||[]).map(x=>x[1]), marks:S.v70Marks()}; });
ok(!r.on&&r.best===2&&r.h.join()==='2'&&r.marks===0,'החלטות: בסוף 60 השניות נרשמו 2 מחזורים נכונים, והסימון נמחק ('+r.marks+')');

// 4. עמדות משתנות: נספר רק מתוך הטבעת, הטבעת זזה אחרי כל יריה ונשארת חוקית
r=await E(()=>{ const S=__sim; S.drillStart('moveshoot'); const D=S.DRILL; const rings=[D.ms.ring]; let legal=true;
  const chk=p=>{ const my=S.mouthFrame(S.aimHive()).c, d=Math.hypot(p.x-S.I(my.x),p.z-S.I(my.z));
    return Math.abs(p.x)<=56&&Math.abs(p.z)<=56&&d>=30&&d<=64&&S.FLOWERS.every(f=>Math.hypot(p.x-f.x,p.z-f.z)>=24); };
  for(let i=0;i<10;i++){ const g=D.ms.ring; if(!chk(g)) legal=false;
    if(i<7) S.setPose(g.x+3,g.z-2,0); else S.setPose(g.x+20,g.z,0);
    S.drillFire({logEntry:{range:40,hit:i!==2}}); if(i<9) rings.push(D.ms.ring); }
  const gaps=rings.slice(1).map((g,i)=>Math.hypot(g.x-rings[i].x,g.z-rings[i].z)), moved=gaps.every(d=>d>=24);
  return {n:D.ms.n, inn:D.ms.ent.filter(e=>e.in).length, moved, legal, gmin:+Math.min(...gaps).toFixed(1), rings:rings.length, marks:S.v70Marks(), on:D.on}; });
ok(r.n===10&&r.inn===7&&r.moved&&r.legal,'עמדות משתנות: '+r.n+' יריות, '+r.inn+' מתוך הטבעת; הטבעת זזה כל יריה (לפחות '+r.gmin+'″, '+r.rings+' עמדות) ותמיד בעמדה חוקית ('+r.legal+')');
ok(r.on==='moveshoot'&&r.marks===0,'אחרי היריה העשירית הטבעת נעלמת ומחכים שהכדורים ינחתו');
r=await E(()=>{ const S=__sim; S.advance(4,1/30); return {on:S.DRILL.on, best:S.DRILL.best.moveshoot}; });
ok(r.on===null&&r.best===6,'עמדות משתנות: 6/10 נרשם (7 מתוך הטבעת, אחת מהן פספוס; 3 מבחוץ לא נספרו)');
/* יריה אמיתית מתוך הטבעת עוברת דרך fire() */
r=await E(()=>{ const S=__sim; S.drillStart('moveshoot'); const D=S.DRILL, g0=D.ms.ring; S.setPose(g0.x,g0.z,0); S.setClip(['pollen','pollen']); S.advance(0.2,1/60);
  S.fire(); return {n:D.ms.n, in:D.ms.ent[0]&&D.ms.ent[0].in, moved:D.ms.ring.x!==g0.x||D.ms.ring.z!==g0.z, marks:S.v70Marks()}; });
ok(r.n>=1&&r.in&&r.moved&&r.marks===2,'יריה אמיתית מתוך הטבעת נספרת והטבעת קופצת ('+r.n+')');

// 5. החלפת תרגיל מנקה סימונים: עמדות משתנות → סיבוב פרחים → עקיפה
r=await E(()=>{ const S=__sim; const a=S.v70Marks(); S.drillStart('circuit'); const b=S.v70Marks(); const ms=S.DRILL.ms&&S.DRILL.ms.marks;
  return {a,b,own:S.V70D.owner}; });
ok(r.a===2&&r.b===14&&r.own==='circuit','מעבר לתרגיל אחר: הטבעת הקודמת נמחקה; בסיבוב 4 פרחים (3 סימונים לכל אחד) וטבעת התחלה = '+r.b);

// 6. סיבוב פרחים: לגעת בארבעה בכל סדר ולחזור לטבעת ההתחלה
r=await E(()=>{ const S=__sim; const D=S.DRILL, st=D.ci.start; S.key('KeyW',true); S.advance(0.3,1/60); S.key('KeyW',false); const t0=D.t0;
  const order=[2,0,3,1], seen=[];
  for(const i of order){ const f=S.FLOWERS[i]; S.setPose(f.x*0.82,f.z*0.82,0); S.advance(1.5,1/60); seen.push(D.ci?D.ci.left.size:-1); }
  const back0=D.on; S.setPose(st.x+30,st.z-30,0); S.advance(1,1/60); const away=D.on;
  S.setPose(st.x+2,st.z-3,90); S.advance(1,1/60);
  return {t0:t0!=null, seen:seen.join(','), back0, away, on:D.on, best:D.best.circuit, marks:S.v70Marks()}; });
ok(r.t0&&r.seen==='3,2,1,0','סיבוב: השעון התחיל בתזוזה, וכל פרח שנגעו בו ירד מהרשימה ('+r.seen+')');
ok(r.away==='circuit'&&r.on===null&&r.best>6&&r.best<9&&r.marks===0,'סיבוב: נגמר רק בחזרה לטבעת — '+r.best+' שנ׳, והסימונים נמחקו');

// 7. עקיפה בלי עבירות: בולם אחד, ציון = נקודות − 10 × העבירות שלי
r=await E((toMatch)=>{ const S=__sim; S.drillStart('dodge'); eval(toMatch); const on=S.BOTS.filter(b=>b.on);
  S.advance(1,1/30);
  S.REF.log.push({t:1,rule:'G421',team:'me',ally:S.myAlly(),pts:15,card:'',what:'בדיקה'},{t:2,rule:'G999',team:'me',ally:S.myAlly(),pts:0,card:'',what:'אזהרה',warn:true});
  const pts=S.allianceScore(S.myAlly())|0, f=S.v70Fouls(); S.drillEnd();
  return {n:on.length, role:on[0]&&on[0].role, pts, f, best:S.DRILL.best.dodge, dd:S.DRILL.dodge}; },toMatch);
ok(r.n===1&&r.role==='defend','עקיפה: רובוט יריב אחד בתפקיד בולם');
ok(r.f===1&&r.best===r.pts-10,'עקיפה: עבירה אחת (אזהרה לא נספרת) → '+r.pts+' − 10 = '+r.best);
await E(()=>{ __sim.matchStop(); });

// 8. מעבר אוטונומי ← טלאופ: האוטונומי שבחרת, מעבר, 30 שנ׳ טלאופ — ונקודות בסוף
r=await E((toMatch)=>{ const S=__sim; S.drillStart('transition'); return {on:S.DRILL.on, auto:S.MT.auto, trans:S.MT.trans, tele:S.MT.tele, bots:S.BOTS.filter(b=>b.on).length}; },toMatch);
ok(r.on==='transition'&&r.auto===30&&r.trans===8&&r.tele===30&&r.bots===0,'מעבר: 30 אוטונומי + 8 מעבר + 30 טלאופ, לבד ('+JSON.stringify(r)+')');
const ph=new Set();
for(let k=0;k<20;k++){ r=await E(()=>{ const S=__sim; const p=[]; for(let i=0;i<10&&(S.MATCH.on||S.MATCH.cd>0);i++){ S.advance(0.5,1/30); p.push(S.MATCH.phase); }
  return {on:S.MATCH.on||S.MATCH.cd>0, p, best:S.DRILL.best.transition, drill:S.DRILL.on, h:(S.DRILL.hist.transition||[]).length}; }); r.p.forEach(x=>ph.add(x)); if(!r.on) break; }
ok(!r.on&&r.drill===null&&r.best!=null&&r.h===1&&ph.has('AUTO')&&ph.size>=3,'מעבר: עבר אוטונומי, מעבר וטלאופ, ונרשמו '+r.best+' נק׳ ('+[...ph].join(' → ')+')');

// 9. טעינה שלא הושלמה, ועצירה באמצע מנקה סימון
r=await E((toMatch)=>{ const S=__sim; S.drillStart('decide'); eval(toMatch); const a=S.v70Marks(); S.matchStop(); S.advance(0.1,1/30);
  return {a, b:S.v70Marks(), on:S.DRILL.on}; },toMatch);
ok(r.a===3&&r.b===0&&r.on===null,'עצירת המאץ׳ באמצע ״החלטות״ — הסימון נמחק ('+r.a+'→'+r.b+')');

// 10. משימות: החולשות מפנות לתרגילים החדשים
const ms=(bins,ex)=>E(([bins,ex])=>{ const S=__sim; const base={ally:'red',opp:20,win:1,auto:'x',fouls:0,leave:true,park:true,faults:0,sh:[],bl:[],kind:'match',skill:1,
    my:80,shots:20,hits:17,avgCycle:7,autoPts:20,pts:{park:5}};
  const a=[]; for(let i=0;i<8;i++) a.push(Object.assign({},base,{at:i,bins},ex||{})); localStorage.setItem('bbSeason1',JSON.stringify(a)); S.DRILL.hist={};
  const m=S.missionsBuild(); return {ids:m.json.plan.map(x=>x.drill), what:m.json.improve.map(x=>x.what)}; },[bins,ex]);
r=await ms({drive:20,aim:10,load:30,blocked:0,idle:2,auto:30});
ok(r.ids[0]==='load','טעינה ארוכה בפרח (48%) → ״טעינה על זמן״ ('+r.ids.join(',')+')');
r=await ms({drive:30,aim:10,load:5,blocked:0,idle:20,auto:30});
ok(r.ids[0]==='decide','הרבה עמידה ללא מטרה (31%) → ״החלטות״ ('+r.ids.join(',')+')');
r=await ms({drive:30,aim:10,load:5,blocked:20,idle:2,auto:30});
ok(r.ids[0]==='dodge'&&r.ids.includes('defense'),'הרבה חסימה → ״עקיפה בלי עבירות״, ו״מול בולם״ משני ('+r.ids.join(',')+')');
r=await ms(null,{fouls:1.5});
ok(r.ids[0]==='dodge','עבירות → ״עקיפה בלי עבירות״ ('+r.ids.join(',')+')');
r=await ms(null,{autoPts:4});
ok(r.ids[0]==='transition'&&r.ids.includes('auto'),'אוטונומי חלש → ״מעבר״, ו״אוטונומי בלבד״ משני ('+r.ids.join(',')+')');
r=await ms({drive:45,aim:5,load:3,blocked:0,idle:2,auto:30});
ok(r.ids[0]==='circuit','כמעט כל הזמן בנסיעה (82%) → ״סיבוב פרחים על זמן״ ('+r.ids.join(',')+')');
await E(()=>{ localStorage.removeItem('bbSeason1'); });

// 11. אנגלית: שמות, כפתורים והודעות מתורגמים
r=await E(()=>{ const he=/[֐-׿]/;
  const keys=['טעינה על זמן','החלטות','עמדות משתנות','עקיפה בלי עבירות','מעבר אוטונומי ← טלאופ','סיבוב פרחים על זמן','מחזורים נכונים',
    '📥 טעינה על זמן','🧭 החלטות · 60 שנ׳','⭕ עמדות משתנות · 10 יריות','🛡 עקיפה בלי עבירות · 60 שנ׳','🔁 מעבר אוטונומי ← טלאופ','🌼 סיבוב פרחים על זמן'];
  const d=JSON.parse(document.getElementById('i18nX_v70drills').textContent);
  return {miss:keys.filter(k=>!d[k]||he.test(d[k]))}; });
ok(r.miss.length===0,'לכל שם, יחידה וכפתור חדש יש תרגום באנגלית בלי עברית'+(r.miss.length?' — חסר: '+r.miss.join(' | '):''));

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v70_drills_test');
