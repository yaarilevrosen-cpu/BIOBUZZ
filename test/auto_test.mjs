// אוטונומי v35: עורך מסלול, מבצע, הרצה חיה, פעולות, לימוד בהדגמה, ייצוא, מאץ׳
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; S.stageMatch(); });
const chunk=async(sec)=>{ for(let t=0;t<sec;t+=3) await E(()=>S.advance(3,1/60)); };

// 1. נקודה בתוך מבנה זזה החוצה
let r=await E(()=>{ S.pathClear(); S.homeRobot(); S.pathStartHere(); let bx=null,bz=0; for(let x=-60;x<=60&&bx===null;x+=3) for(let z=-60;z<=60;z+=3) if(S.pathBlocked(x,z)&&Math.abs(x)<50&&Math.abs(z)<50){ bx=x; bz=z; break; }
  const bl=S.pathBlocked(bx,bz);
  S.pathAdd(bx,bz); const p=S.PATH.pts[S.PATH.pts.length-1]; return {bl, p, blockedAfter:S.pathBlocked(p.x,p.z), warn:S.PATH.warn}; });
ok(r.bl&&!r.blockedAfter,'נקודה בתוך מבנה זזה למקום פנוי ('+r.p.x+', '+r.p.z+')');
ok(/הוזזה/.test(r.warn),'והמשתמש מקבל הסבר: '+r.warn);

// 2. התחלה מהרובוט + עקיפה אוטומטית
r=await E(()=>{ S.pathClear(); S.homeRobot(); const x0=S.I(S.botBody.position.x), z0=S.I(S.botBody.position.z);
  S.pathAdd(-40,40); S.pathAdd(40,-40);
  const pts=S.PATH.pts; return {first:pts[0], x0, z0, n:pts.length, auto:pts.filter(p=>p.auto).length, bad:S.PATH.bad}; });
ok(r.first.start&&Math.abs(r.first.x-r.x0)<0.2&&Math.abs(r.first.z-r.z0)<0.2,'הנקודה הראשונה היא הרובוט');
ok(r.auto>0&&!r.bad,'קטע שחוצה את המבנה קיבל עקיפה ('+r.auto+' נקודות), בלי קו אדום');

// 3. חישוב מהיר
r=await E(()=>{ const res=S.pathRun(); const last=S.PATH.pts[S.PATH.pts.length-1];
  return {res:{t:res.t,err:res.err,done:res.done,why:res.why}, d:Math.hypot(S.I(S.botBody.position.x)-last.x,S.I(S.botBody.position.z)-last.z)}; });
ok(r.res.done,'המסלול הושלם ('+r.res.why+', '+r.res.t+' שנ׳)');
ok(r.res.err<5,'שגיאת מעקב סבירה ('+r.res.err+'″)');
ok(r.d<3.5,'הרובוט עומד בנקודה האחרונה ('+r.d.toFixed(1)+'″)');

// 4. הרצה חיה דרך הלולאה הרגילה
r=await E(()=>{ S.pathGo('path'); const p0=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)]; S.advance(1,1/60);
  const p1=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)]; return {on:S.RUN.on, src:S.RUN.src, moved:Math.hypot(p1[0]-p0[0],p1[1]-p0[1])}; });
ok(r.on&&r.src==='path'&&r.moved>8,'הרצה חיה: נוסע בהדרגה, לא קופץ ('+r.moved.toFixed(1)+'″ בשנייה הראשונה)');
await chunk(9);
r=await E(()=>S.RUN.res);
ok(r&&r.done,'ההרצה החיה הסתיימה ('+(r&&r.why)+', '+(r&&r.t)+' שנ׳)');

// 5. נגיעה בסטיק עוצרת
r=await E(()=>{ S.pathGo('path'); S.advance(0.5,1/60); S.key('KeyW',true); S.advance(0.1,1/60); S.key('KeyW',false);
  return {on:S.RUN.on, why:S.RUN.res&&S.RUN.res.why}; });
ok(!r.on&&/ידנית/.test(r.why),'נגיעה בסטיק עוצרת את ההרצה');

// 6. פעולות: ירי מנקודת ירי, ואחר כך חניה
r=await E(()=>{ S.stageMatch(); S.pathClear(); S.homeRobot(); S.pathStartHere();
  const f=S.mouthFrame(S.hiveRed); const n=new THREE.Vector3(f.n.x,0,f.n.z).normalize();
  const sx=S.I(f.c.x)+n.x*S.P.standoff, sz=S.I(f.c.z)+n.z*S.P.standoff;
  S.pathAdd(sx,sz); S.pathCycleAct(S.PATH.pts.length-1);
  const act=S.PATH.pts[S.PATH.pts.length-1].act;
  S.pathAdd(-58,-35); S.pathSetAct(S.PATH.pts.length-1,'park');
  const prog=S.progFromPath(S.PATH.pts).map(s=>s.k).join(',');
  const res=S.pathRun();
  return {act, prog, res:{done:res.done,why:res.why,shots:res.shots,hits:res.hits,t:res.t}, lz:S.myInLZ()}; });
ok(r.act==='shoot','לחיצה על נקודה מחליפה פעולה (ירי)');
ok(/drive,shoot/.test(r.prog)&&/park$/.test(r.prog),'התוכנית בנויה נכון: '+r.prog);
ok(r.res.shots>=3&&r.res.hits>=2,'יורה בנקודת הירי ('+r.res.hits+'/'+r.res.shots+')');
ok(r.res.done&&r.lz,'וחונה באזור הטעינה ('+r.res.why+')');

// 7. לימוד בהדגמה → עורך → הרצה
r=await E(()=>{ S.stageMatch(); S.pathClear(); S.homeRobot(); S.teachStart();
  S.key('KeyW',true); S.advance(1.2,1/60); S.key('KeyW',false);
  S.key('KeyD',true); S.advance(0.9,1/60); S.key('KeyD',false);
  S.key('KeyQ',true); S.advance(0.5,1/60); S.key('KeyQ',false);
  S.key('KeyW',true); S.advance(0.8,1/60); S.key('KeyW',false); S.advance(0.6,1/60);
  S.fire(); S.advance(0.4,1/60); S.teachStop();
  const end=[S.I(S.botBody.position.x),S.I(S.botBody.position.z),S.bot.yaw];
  const tp=S.teachPts(); S.teachToPath();
  const java=S.teachJava();
  return {n:tp.length, hasH:tp.every(p=>p.h!=null), shoot:tp.some(p=>p.act==='fire'), end, java}; });
ok(r.n>=3&&r.hasH,'ההקלטה נותנת נקודות עם כיוון ('+r.n+')');
ok(r.shoot,'הירייה נרשמה כפעולת ירי');
ok(/splineToLinearHeading/.test(r.java)&&/ShootAction/.test(r.java)&&/TranslationalVelConstraint/.test(r.java),'הקוד: כיוון, מהירות וירי לכל נקודה');
const end=r.end;
r=await E(()=>{ const res=S.pathRun(); return {res:{done:res.done,why:res.why,err:res.err}, x:S.I(S.botBody.position.x), z:S.I(S.botBody.position.z), yaw:S.bot.yaw}; });
const dEnd=Math.hypot(r.x-end[0],r.z-end[1]);
ok(r.res.done&&dEnd<4,'מה שהוקלט רץ על השלדה ומגיע לאותו מקום ('+dEnd.toFixed(1)+'″, '+r.res.why+')');
{ let dy=r.yaw-end[2]; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); ok(Math.abs(dy)<0.2,'ובאותו כיוון ('+(dy*57.3).toFixed(1)+'°)'); }

// 8. ייצוא Java של המסלול
r=await E(()=>S.pathJava());
ok(/^\/\/ ── נוצר/.test(r)&&/Pose2d start = new Pose2d\(/.test(r)&&/\.build\(\);/.test(r),'ייצוא RoadRunner תקין');

// 9. במאץ׳: ״המסלול שלי״ לא נדרס באקראי, רץ, יוצא וחונה
r=await E(()=>{ S.stageMatch(); S.pathClear(); S.homeRobot(); S.MT.cd=0; S.GAME.randAuto=true; S.gameStart(false);
  S.matchStart(); S.matchStop(); S.homeRobot();
  S.pathStartHere(); S.pathAdd(-30,50); S.pathAdd(-20,10);
  S.MYAUTO.lvl='path'; S.PATH.autoPark=true; S.matchStart(); return S.MYAUTO.lvl; });
ok(r==='path','״אקראי״ לא דורס את האוטונומי שלי');
await chunk(31);
r=await E(()=>({lvl:S.MYAUTO.lvl, leave:S.MATCH.leave, park:S.MATCH.autoPark, res:S.RUN.res&&{why:S.RUN.res.why,src:S.RUN.res.src}, phase:S.MATCH.phase}));
ok(r.res&&r.res.src==='match','המסלול רץ באוטונומי של המאץ׳ ('+(r.res&&r.res.why)+')');
ok(r.leave&&r.park,'LEAVE ו-PARK של האוטונומי (יציאה '+r.leave+', חניה '+r.park+')');
await E(()=>S.matchStop());

// 10. רמות קבועות על אותו מבצע
for(const [L,minShots,park] of [['leave',0,false],['preload',3,true],['cycle',5,true]]){
  r=await E(L=>{ S.GAME.randAuto=false; S.MYAUTO.lvl=L; S.resetCounters(); S.matchStart(); return 1; },L);
  await chunk(31);
  r=await E(()=>({leave:S.MATCH.leave, park:S.MATCH.autoPark, shots:S.state().shots, hits:S.state().hits, pos:[S.I(S.botBody.position.x).toFixed(0),S.I(S.botBody.position.z).toFixed(0)].join(','), why:S.RUN.why||''}));
  ok(r.leave&&r.shots>=minShots&&(!park||r.park),'רמה '+L+': יציאה '+r.leave+', יריות '+r.hits+'/'+r.shots+', חניה '+r.park+(park&&!r.park?' · נעצר ב-('+r.pos+') '+r.why:''));
  await E(()=>S.matchStop());
}

// 11. כפתור ההדגמה
r=await E(()=>{ S.stageMatch(); S.homeRobot(); S.resetCounters(); S.autoStart(); return S.RUN.src; });
await chunk(33);
r=await E(()=>({on:S.RUN.on, shots:S.state().shots, hits:S.state().hits, why:S.RUN.res&&S.RUN.res.why}));
ok(!r.on&&r.shots>=4,'שגרת ההדגמה יורה ונעצרת אחרי 30 שניות ('+r.hits+'/'+r.shots+', '+r.why+')');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close(); done('auto_test');
