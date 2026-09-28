// v63 — בונה רובוטים: תיקוני הביקורת של v62 (סעיפים 4–10, 25–30 והשורות הקלות של הבונה)
import {open,ok,done,realErrs,URL0} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
/* עמדה נקייה: בלי מאץ׳, בלי בוטים בדרך, בלי כדורים קרובים, כל הבניות קלאסי, מצב פתוח */
const clean=()=>E(()=>{ const S=__sim; S.matchStop&&S.matchStop(); if(S.RUN.on) S.runStop(); S.assistStop();
  S.setRealm('open'); S.BLD.pend=null; S.BLD.pendUse=null; S.BLD.pendNet=null; S.BLD.net={};
  for(const b of S.BOTS){ if(b.hum) S.humFree(b); }
  S.bldSet(-1,'classic'); for(let i=0;i<3;i++) S.bldSet(i,'classic');
  for(const b of S.BOTS){ b.on=false; if(b.group) b.group.visible=false; if(b.body){ b.body.collisionResponse=false; b.body.position.set(9,0,9); } }
  for(let i=S.balls.length-1;i>=0;i--){ const b=S.balls[i]; if(S.flowers.some(fl=>Math.hypot(S.I(b.body.position.x)-fl.x,S.I(b.body.position.z)-fl.z)<5)) continue; b.body.position.set(S.M(60),S.M(0.5)+i*0.0001,S.M(-66+(i%20)*0.5)); b.body.velocity.set(0,0,0); } });
/* מול הפרח, החזית צמודה (כמו שהמעלית דורשת) */
const faceFlower=(k)=>E(k=>{ const S=__sim, fl=S.flowers[k]; const ax=Math.abs(fl.x)>Math.abs(fl.z);
  const off=ax?{x:-Math.sign(fl.x)*(S.P.botL/2+3.5),z:0}:{x:0,z:-Math.sign(fl.z)*(S.P.botL/2+3.5)};
  S.setPose(fl.x+off.x,fl.z+off.z,Math.atan2(-off.x,-off.z)*180/Math.PI); return {x:fl.x,z:fl.z}; },k);
let r;

// ── 4. מעלית באוטונומי של מאץ׳ אמיתי ──
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'lift'); S.matchStart(); S.advance((S.MATCH.cd||0)+0.3,1/60); if(S.RUN.on) S.runStop();
  for(const b of S.BOTS){ b.on=false; b.body.collisionResponse=false; b.body.position.set(9,0,9); }
  return {phase:S.MATCH.phase, on:S.MATCH.on, locked:S.driverLocked()}; });
await faceFlower(0);
r=Object.assign(r,await E(()=>{ const S=__sim, fl=S.flowers[0]; S.setClip(['pollen','pollen']); S.advance(0.2,1/60);
  const n0=S.bldFlowerInfo(fl).n, hum=S.bldLiftGo();              /* הנהג נעול באוטונומי — גם בלי תוכנית */
  S.runStart([{k:'lift'}],'match'); let t=0; while(S.RUN.on&&t<6){ S.advance(0.1,1/60); t+=0.1; }
  S.advance(1.0,1/60); const inFl=S.balls.filter(b=>b.lifted&&Math.hypot(S.I(b.body.position.x)-fl.x,S.I(b.body.position.z)-fl.z)<2&&S.I(b.body.position.y)>2).length;
  return {hum, left:S.clip.length, dn:S.bldFlowerInfo(fl).n-n0, inFl, phase2:S.MATCH.phase}; }));
ok(r.phase==='AUTO'&&r.locked&&r.hum===false&&r.left<4&&r.inFl>=2&&r.phase2==='AUTO','מעלית באוטונומי של מאץ׳: הכדורים בפרח (לחיצה של הנהג עדיין נעולה) '+JSON.stringify(r));
await E(()=>__sim.matchStop());

// ── 5. טנק / 6 גלגלים: נסיעה אוטומטית (goto, חניה, סיוע) ──
const drive=async(id)=>{ await clean(); return E(id=>{ const S=__sim; S.bldSet(-1,id); S.setPose(0,-30,0);
  S.runStart([{k:"goto",x:30,z:-30}],'t'); let t=0; while(S.RUN.on&&t<12){ S.advance(0.25,1/60); t+=0.25; }
  const g={t, done:!!(S.RUN.res&&S.RUN.res.done), x:S.I(S.botBody.position.x), z:S.I(S.botBody.position.z)};
  S.setPose(0,0,90); S.runStart([{k:"park"}],'t'); t=0; while(S.RUN.on&&t<15){ S.advance(0.25,1/60); t+=0.25; }
  const p={t, inLZ:S.myInLZ(), on:S.RUN.on}; if(S.RUN.on) S.runStop();
  S.setPose(0,-30,0); S.assistPark(); t=0; while(S.ASSIST.job&&t<16){ S.advance(0.25,1/60); t+=0.25; }
  const a={t, note:S.ASSIST.note, x:S.I(S.botBody.position.x), z:S.I(S.botBody.position.z)}; S.assistStop();
  return {g,p,a}; },id); };
for(const id of ['starter','double']){
  r=await drive(id);
  ok(r.g.done&&r.g.t<7&&Math.hypot(r.g.x-30,r.g.z+30)<4,id+': נסיעה 30″ הצידה מגיעה ('+r.g.t+' ש׳, '+r.g.x.toFixed(1)+','+r.g.z.toFixed(1)+')');
  ok(r.p.inLZ&&r.p.t<15,id+': חניה באזור הטעינה ('+r.p.t+' ש׳)');
  ok(r.a.note==='הגיע'&&r.a.t<16,id+': ״חניה״ בסיוע מגיעה ('+r.a.note+', '+r.a.t+' ש׳)');
}
r=await E(()=>{ const S=__sim; S.bldSet(-1,'starter'); S.setPose(0,0,0); const c=S.bldTankVec(1,0,1,30,0.5), c2=S.bldTankVec(0,1,1,30,0.5), c3=S.bldTankVec(0,-1,1,30,0.5);
  return {side:c, fwd:c2, back:c3}; });
ok(r.side.r===0&&r.side.f===0&&Math.abs(r.side.turn)>0.9&&r.fwd.f>0.3&&r.back.f<-0.3&&Math.abs(r.back.turn)<0.01,'טנק: יעד בצד — מסתובבים במקום; קדימה/אחורה — נוסעים לאורך הגוף '+JSON.stringify(r));

// ── 6. החלפת בנייה באמצע מאץ׳ לא מקפיצה ──
await clean();
r=await E(()=>{ const S=__sim; S.matchStart(); S.advance((S.MATCH.cd||0)+0.2,1/60); if(S.RUN.on) S.runStop();
  S.setPose(10,10,0); const ok1=S.bldSet(-1,'starter'); const me=S.bldMe().id, p1={x:S.I(S.botBody.position.x),z:S.I(S.botBody.position.z)};
  const b=S.BOTS[0]; b.on=true; b.group.visible=true; b.body.position.set(S.M(0),b.body.position.y,S.M(-20)); S.bldSet(0,'double'); const q1={x:S.I(b.body.position.x),z:S.I(b.body.position.z)}, bid=S.bldBot(b).id;
  const pend=JSON.stringify(S.BLD.pend);
  S.matchStop(); S.setPose(5,5,0); b.body.position.set(S.M(30),b.body.position.y,S.M(-30)); S.advance(0.1,1/60);
  return {ok1, me, p1, q1, bid, pend, after:{me:S.bldMe().id, bot:S.bldBot(b).id, x:S.I(S.botBody.position.x), z:S.I(S.botBody.position.z), bx:S.I(b.body.position.x), bz:S.I(b.body.position.z)}}; });
ok(r.ok1&&r.me==='classic'&&Math.hypot(r.p1.x-10,r.p1.z-10)<0.5&&r.bid==='classic'&&Math.hypot(r.q1.x,r.q1.z+20)<0.5,'באמצע מאץ׳: הבנייה נשמרת לסוף המאץ׳, בלי קפיצה '+JSON.stringify(r).slice(0,200));
ok(r.after.me==='starter'&&r.after.bot==='double'&&Math.hypot(r.after.x-5,r.after.z-5)<1&&Math.hypot(r.after.bx-30,r.after.bz+30)<3,'בסוף המאץ׳ הבנייה מוחלפת — הרובוטים נשארים במקום '+JSON.stringify(r.after));
// אורח: לא מקפיץ באמצע מאץ׳, מוגבל בקצב, ובלי דליפה
await clean();
r=await E(()=>{ const S=__sim, b=S.BOTS[2]; S.humSeat(b,'net','g'); b.hum.id='g1'; b.on=true;
  S.matchStart(); S.advance((S.MATCH.cd||0)+0.2,1/60); b.body.position.set(S.M(5),b.body.position.y,S.M(5));
  S.bldFromGuest('g1',{drive:'tank4',intake:'compliant',sides:1,shoot:'diff',n2:1,turret:0,lift:false});
  const mid={x:S.I(b.body.position.x),z:S.I(b.body.position.z),id:S.bldBot(b).drive};
  S.matchStop(); S.advance(0.05,1/60); const end={drive:S.bldBot(b).drive,x:S.I(b.body.position.x),z:S.I(b.body.position.z)};
  return {mid,end}; });
ok(r.mid.x===5&&r.mid.z===5&&r.mid.id==='mecanum'&&r.end.drive==='tank4'&&Math.hypot(r.end.x-5,r.end.z-5)<4,'אורח שמחליף בנייה באמצע מאץ׳: בלי קפיצה, מוחל בסוף '+JSON.stringify(r));
r=await E(()=>{ const S=__sim, b=S.BOTS[2], cam=new THREE.PerspectiveCamera(); b.group.visible=true; S.renderer.render(S.scene,cam);
  const g0=S.renderer.info.memory.geometries;
  for(let i=0;i<30;i++){ S.buildAIBot(b); b.group.visible=true; S.renderer.render(S.scene,cam); }
  const g2=S.renderer.info.memory.geometries; S.humFree(b); S.BLD.net={}; S.BLD.pendNet=null; return {g0,g2}; });
ok(r.g2-r.g0<=3,'30 בניות מחדש של בוט: בלי דליפת גאומטריות ('+r.g0+'→'+r.g2+')');
await clean();
r=await E(async()=>{ const S=__sim, b=S.BOTS[2]; S.humSeat(b,'net','g'); b.hum.id='g1'; b.on=true; const gs=new Set();
  for(let i=0;i<30;i++){ S.bldFromGuest('g1',{drive:i%2?'tank6':'mecanum',intake:'compliant',sides:1,shoot:'diff',n2:1,turret:0,lift:false,n:'x'+i}); gs.add(b.group); }
  const n1=gs.size; await new Promise(r=>setTimeout(r,1100)); S.advance(0.05,1/60);
  const last=S.bldBot(b).n; S.humFree(b); S.BLD.net={}; return {rebuilds:n1, last}; });
ok(r.rebuilds<=2&&r.last==='x29','אורח ששולח 30 הודעות בנייה: נבנה פעם אחת, והאחרונה מוחלת אחרי שנייה ('+JSON.stringify(r)+')');

// ── 7. חוקיות במצב תחרות ──
await clean();
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.bldOpen('classic'); const B=S.bldDup(); S.bldSet(-1,B.id);
  for(const [k,v] of [['lift','true'],['turret','360'],['sides','2'],['intake','mecanum'],['n2','2']]) S.bldEditSet(k,v);
  const r={me:S.bldMe().id, legal:S.bldCheck(S.bldMe()).ok}; S.BLD.edit=B.id; S.bldDel(); S.bldClose(); return r; });
ok(r.me==='classic'&&r.legal,'תחרות: עריכה שהופכת את הבנייה שלי ללא חוקית — חוזרים לקלאסי '+JSON.stringify(r));
r=await E(()=>{ const S=__sim; S.setRealm('open'); S.bldOpen('classic'); const B=S.bldDup(); for(const [k,v] of [['lift','true'],['turret','360'],['sides','2'],['n2','2']]) S.bldEditSet(k,v);
  S.bldSet(-1,B.id); S.bldSet(1,B.id); const before=S.bldMe().id===B.id; S.setRealm('comp');
  const r={before, me:S.bldMe().id, bot:S.bldBot(S.BOTS[1]).id}; S.setRealm('open'); S.BLD.edit=B.id; S.bldDel(); S.bldClose(); return r; });
ok(r.before&&r.me==='classic'&&r.bot==='classic','מעבר מ״פתוח״ ל״תחרות״ עם רובוט לא חוקי — הרובוט שלי והבוט חוזרים לקלאסי '+JSON.stringify(r));
r=await E(()=>{ const S=__sim, b=S.BOTS[2]; S.setRealm('comp'); S.humSeat(b,'net','g'); b.hum.id='g2';
  S.BLD.netT={}; S.bldFromGuest('g2',{drive:'mecanum',intake:'mecanum',sides:2,shoot:'diff',n2:2,turret:360,lift:true});
  const B=S.bldBot(b), r={legal:S.bldCheck(B).ok, mot:S.bldCheck(B).mot}; S.humFree(b); S.BLD.net={}; S.setRealm('open'); return r; });
ok(r.legal&&r.mot<=8,'תחרות: אורח ששולח בנייה לא חוקית נוהג בקלאסי '+JSON.stringify(r));

// ── 8. צריח 360° — הדרך הקצרה ──
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'turret'); S.setPose(0,0,0);
  const f=S.mouthFrame(S.aimHive()), ang=Math.atan2(f.c.x-S.botBody.position.x,f.c.z-S.botBody.position.z);
  S.setPose(0,0,(ang-(Math.PI-0.05))*180/Math.PI); S.BLD.tur.yaw=0; S.advance(2.5,1/60); const y1=S.BLD.tur.yaw;
  S.setPose(0,0,(ang-(-Math.PI+0.05))*180/Math.PI); let t=0, mx=0; for(let i=0;i<180;i++){ S.advance(1/60,1/60); t+=1/60; mx=Math.max(mx,Math.abs(S.BLD.tur.err)); if(Math.abs(S.BLD.tur.err)<0.02&&i>2) break; }
  return {y1, y2:S.BLD.tur.yaw, t:+t.toFixed(2), mx:+mx.toFixed(2)}; });
ok(r.t<0.3&&r.mx<0.3&&Math.abs(r.y2-r.y1)<0.5,'צריח: הכוורת עוברת מאחור — ממשיך בדרך הקצרה, בלי סיבוב שלם '+JSON.stringify(r));

// ── 27. צריח מכוון מהציר; צריח של בוט יורה מהלוע המסובב ──
r=await E(()=>{ const S=__sim, out=[]; S.bldSet(-1,'turret');
  for(const rel of [Math.PI/2, Math.PI*0.9]){ const f=S.mouthFrame(S.aimHive()), nl=Math.hypot(f.n.x,f.n.z)||1;
    const px=S.I(f.c.x)+f.n.x/nl*S.P.standoff, pz=S.I(f.c.z)+f.n.z/nl*S.P.standoff; S.setPose(px,pz,0);
    const ang=Math.atan2(f.c.x-S.botBody.position.x,f.c.z-S.botBody.position.z); S.setPose(px,pz,(ang-rel)*180/Math.PI); S.advance(2,1/60);
    S.bot.group.updateMatrixWorld(true); const mm=S.bot.muzzleMark.getWorldPosition(new S.bot.group.position.constructor()), d=S.shotFwd();
    let e=Math.atan2(f.c.x-mm.x,f.c.z-mm.z)-Math.atan2(d.x,d.z); e=Math.atan2(Math.sin(e),Math.cos(e)); out.push(+(e*180/Math.PI).toFixed(2)); }
  return out; });
ok(r.every(e=>Math.abs(e)<0.5),'צריח: הקרן מהלוע עוברת במרכז הכוורת (שגיאה אמיתית '+r.join('°, ')+'°)');
r=await E(()=>{ const S=__sim; S.bldSet(0,'turret'); const b=S.BOTS[0]; b.on=true; b.body.collisionResponse=true; b.group.visible=true; const res=[];
  for(const rel of [0,Math.PI*0.5,Math.PI*0.97]){ const fr=S.mouthFrame(S.aiHive(b)), nl=Math.hypot(fr.n.x,fr.n.z)||1;
    b.body.position.set(fr.c.x+fr.n.x/nl*S.M(S.P.standoff+4),b.body.position.y,fr.c.z+fr.n.z/nl*S.M(S.P.standoff+4));
    const ang=Math.atan2(fr.c.x-b.body.position.x,fr.c.z-b.body.position.z); b.yaw=ang-rel; b.clip.length=0; b.clip.push('pollen');
    S.aiFire(b); const rec=S.balls[S.balls.length-1]; const dx=rec.body.position.x-b.body.position.x, dz=rec.body.position.z-b.body.position.z;
    let e=Math.atan2(dx,dz)-ang; e=Math.atan2(Math.sin(e),Math.cos(e)); res.push(+Math.abs(e).toFixed(2)); }
  b.on=false; return res; });
ok(r.every(e=>e<0.1),'בוט צריח: הכדור יוצא מהלוע בצד של הכוורת גם כשהצריח מאחור (סטייה '+r.join(', ')+' רד׳)');

// ── 9. נהג אנושי בבוט: בלי יורה לא יורה; טנק לא זז הצידה ──
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(2,'lift'); const b=S.BOTS[2]; b.on=true; b.body.collisionResponse=true; S.humSeat(b,'pad','P2');
  b.body.position.set(S.M(-10),b.body.position.y,0); b.clip.length=0; b.clip.push('pollen','pollen'); const s0=b.shots;
  for(let i=0;i<30;i++){ S.humFeed(b,{x:0,y:0,t:0,fire:i%2===0}); S.advance(1/60,1/60); }
  const r={shots:b.shots-s0, clip:b.clip.length, raw:S.humFireRaw(b)}; S.humFree(b); return r; });
ok(r.shots===0&&r.clip===2&&r.raw===false,'נהג אנושי בבוט בלי יורה — לא יורה '+JSON.stringify(r));
r=await E(()=>{ const S=__sim; S.bldSet(2,'starter'); const b=S.BOTS[2]; b.on=true; S.humSeat(b,'pad','P2');
  b.body.position.set(0,b.body.position.y,0); b.yaw=0; b.vx=b.vz=0; b.body.velocity.set(0,0,0);
  let lat=0; for(let i=0;i<60;i++){ S.humFeed(b,{x:1,y:0,t:0,fc:false}); S.advance(1/60,1/60); }
  const rc={dx:S.I(b.body.position.x), dz:S.I(b.body.position.z)};
  for(let i=0;i<90;i++){ S.humFeed(b,{x:1,y:0,t:0,fc:true}); S.advance(1/60,1/60);
    const fx=Math.sin(b.yaw), fz=Math.cos(b.yaw); lat=Math.max(lat,Math.abs(-fz*b.body.velocity.x+fx*b.body.velocity.z)); }
  const r={rc, lat:+lat.toFixed(3), moved:+Math.hypot(S.I(b.body.position.x)-rc.dx,S.I(b.body.position.z)-rc.dz).toFixed(1)}; S.humFree(b); b.on=false; return r; });
ok(Math.hypot(r.rc.dx,r.rc.dz)<1&&r.lat<0.02&&r.moved>10,'נהג אנושי בבוט טנק: סטיק הצידה לא מזיז הצידה; ביחס לזירה — מסתובב ונוסע קדימה '+JSON.stringify(r));

// ── 10. פרח מלא ──
await clean();
r=await E(()=>{ const S=__sim, fl=S.flowers[2]; let n=0; while(!S.bldFlowerFull(fl)&&n<12){ S.bldDeposit(fl,'test','pollen'); S.advance(1.0,1/120); n++; }
  return {n, full:S.bldFlowerFull(fl), info:S.bldFlowerInfo(fl)}; });
ok(r.full&&r.n>=2&&r.n<12,'פרח מתמלא אחרי '+r.n+' כדורים ('+JSON.stringify(r.info)+')');
await faceFlower(2);
r=await E(()=>{ const S=__sim, fl=S.flowers[2]; S.bldSet(-1,'lift'); S.setClip(['pollen','pollen']); S.advance(0.3,1/60);
  const go=S.bldLiftGo(); S.advance(3,1/60); const flung=S.balls.filter(b=>S.I(b.body.position.y)>2&&Math.hypot(S.I(b.body.position.x)-fl.x,S.I(b.body.position.z)-fl.z)>4&&Math.hypot(S.I(b.body.position.x)-fl.x,S.I(b.body.position.z)-fl.z)<40).length;
  const b=S.BOTS[1]; S.bldSet(1,'lift'); b.clip.length=0; b.clip.push('pollen'); b.skip=[]; b.liftSrc=null;
  const t=S.bldLiftTarget(b); return {go, left:S.clip.length, flung, botAvoids:t!==fl}; });
ok(r.go===false&&r.left===2&&r.botAvoids,'פרח מלא: המעלית שלי לא מפקידה, ובוט מעלית לא בוחר אותו '+JSON.stringify(r));
await clean();
await faceFlower(3);
r=await E(()=>{ const S=__sim, fl=S.flowers[3]; for(let i=0;i<4;i++){ S.bldDeposit(fl,'test','pollen'); S.advance(0.8,1/120); }
  S.bldSet(-1,'lift'); S.setClip(['pollen','pollen','pollen','pollen']); S.advance(0.3,1/60); const go=S.bldLiftGo(); S.advance(8,1/60);
  let out=0; for(const b of S.balls){ const d=Math.hypot(S.I(b.body.position.x)-fl.x,S.I(b.body.position.z)-fl.z); if(d>3&&d<30&&S.I(b.body.position.y)<3&&b.lifted) out++; }
  return {go, left:S.clip.length, out, full:S.bldFlowerFull(fl), on:S.BLD.lift.on}; });
ok(r.go&&r.out===0&&r.left>0&&!r.on,'מעלית עוצרת כשהפרח מתמלא — אף כדור לא עף ('+JSON.stringify(r)+')');

// ── 25. ״פרח הבית״ מתעדכן אחרי החלפת צד ──
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(1,'lift'); const b=S.BOTS[1]; const h1=S.bldHomeFlowerTest(b);
  const cur=S.myAlly(), btn=document.querySelector('[data-ally="'+(cur==='red'?'blue':'red')+'"]'); btn&&btn.click();
  S.matchStart(); S.advance((S.MATCH.cd||0)+0.2,1/60); const h2=S.bldHomeFlowerTest(b);
  let best=null,bd=1e9; for(const fl of S.flowers){ const d=Math.hypot(fl.x-b.home.x,fl.z-b.home.z); if(d<bd){bd=d;best=fl;} }
  const r={btn:!!btn, changed:h1!==h2, nearest:h2===best}; S.matchStop(); const back=document.querySelector('[data-ally="'+cur+'"]'); back&&back.click(); return r; });
ok(r.btn&&r.changed&&r.nearest,'פרח הבית של בוט מעלית מחושב מחדש אחרי החלפת צד '+JSON.stringify(r));

// ── 28. בוט מעלית: לא מחזיר לפרח שממנו לקח, ומכבד את רשימת הדילוג ──
await clean();
r=await E(()=>{ const S=__sim, b=S.BOTS[1]; S.bldSet(1,'lift'); b.clip.length=0; b.clip.push('pollen'); b.skip=[]; b.liftSrc=null;
  const t0=S.bldLiftTarget(b); b.liftSrc=t0; const t1=S.bldLiftTarget(b); b.skip=[{o:t1,until:S.simT()+10}]; const t2=S.bldLiftTarget(b);
  b.liftSrc=null; b.skip=[]; b.clip.length=0; const src=S.bldLiftSeek(b);
  return {a:t0!==t1, b:t2!==t1&&t2!==t0, src:!src||src.loose||b.liftSrc===src}; });
ok(r.a&&r.b&&r.src,'בוט מעלית: לא לפרח שממנו לקח, ולא לפרח שבדילוג '+JSON.stringify(r));

// ── 29. צעד ״ירי״ בלי יורה; שכפול 17 לא מוחק בנייה בשימוש ──
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'lift'); S.setClip(['pollen','pollen']); S.runStart([{k:'shoot'},{k:'wait',sec:0.1}],'t'); let t=0;
  while(S.RUN.on&&t<8){ S.advance(0.05,1/60); t+=0.05; } return {t:+t.toFixed(2)}; });
ok(r.t<0.6,'צעד ״ירי״ בבנייה בלי יורה מסתיים מיד ('+r.t+' ש׳)');
r=await E(()=>{ const S=__sim; S.bldOpen('classic'); const first=S.bldDup(); const second=S.bldDup(); S.bldSet(-1,first.id); S.bldSet(0,second.id);
  for(let i=0;i<16;i++){ S.BLD.edit='classic'; S.bldDup(); }
  const ids=S.BLD.custom.map(x=>x.id), r={n:ids.length, me:ids.indexOf(first.id)>=0&&S.bldMe().id===first.id, bot:ids.indexOf(second.id)>=0&&S.bldBot(S.BOTS[0]).id===second.id};
  S.bldSet(-1,'classic'); S.bldSet(0,'classic'); for(const id of ids){ S.BLD.edit=id; S.bldDel(); } S.bldClose(); return r; });
ok(r.n===16&&r.me&&r.bot,'שכפול מעל 16: הבניות שבשימוש לא נמחקות '+JSON.stringify(r));

// ── 30. מעלית אנושית: לא זוכרת התקדמות, אותם תנאים; מצב המעלית מתאפס בין מאצ׳ים ──
await clean();
const humLift=(seq,clip)=>E(([seq,clip])=>{ const S=__sim, b=S.BOTS[2]; S.bldSet(2,'lift'); b.on=true; b.body.collisionResponse=true; S.humSeat(b,'pad','P2');
  const fl=S.flowers[0], ax=Math.abs(fl.x)>Math.abs(fl.z), off=ax?{x:-Math.sign(fl.x)*(17/2+2.5),z:0}:{x:0,z:-Math.sign(fl.z)*(17/2+2.5)};
  b.body.position.set(S.M(fl.x+off.x),b.body.position.y,S.M(fl.z+off.z)); b.yaw=Math.atan2(-off.x,-off.z); b.vx=b.vz=0; b.body.velocity.set(0,0,0);
  b.clip.length=0; b.clip.push(...clip); const n0=S.bldFlowerInfo(fl).n;
  for(const [aim,sec,y] of seq){ for(let t=0;t<sec;t+=1/60){ S.humFeed(b,{x:0,y:y||0,t:0,aim,fc:false}); S.advance(1/60,1/60); } }
  const r={left:b.clip.length, n:S.bldFlowerInfo(fl).n-n0, liftT:b.hum.liftT}; S.humFree(b); b.on=false; return r; },[seq,clip]);
r=await humLift([[true,1.2],[false,0.5],[true,1.2]],['pollen','pollen']);
ok(r.left===2&&r.liftT<1.3,'מעלית אנושית: שתי לחיצות קצרות לא מצטברות להפקדה '+JSON.stringify(r));
r=await humLift([[true,2.6]],['pollen']);
ok(r.left===0,'מעלית אנושית: לחיצה ארוכה מפקידה '+JSON.stringify(r));
r=await E(()=>{ const S=__sim; return S.BOTS[2].ally; });
const opp=r==='red'?'blue':'red';
r=await humLift([[true,2.6]],[opp]);
ok(r.left===1,'מעלית אנושית: נקטר של היריב לא נכנס לפרח '+JSON.stringify(r));
r=await humLift([[true,2.6,1]],['pollen']);
ok(r.left===1,'מעלית אנושית: בתנועה — לא מפקידים '+JSON.stringify(r));
r=await E(()=>{ const S=__sim; const b=S.BOTS[1]; S.bldSet(1,'lift'); b.liftK=2; b.liftT=1.1; b.lifted=5; b.liftFl=S.flowers[0]; S.BLD.lift.k=2; S.BLD.lift.n=3;
  S.matchStart(); S.advance(0.1,1/60); const r={liftK:b.liftK, liftT:b.liftT, lifted:b.lifted, fl:b.liftFl, k:S.BLD.lift.k, n:S.BLD.lift.n}; S.matchStop(); return r; });
ok(!r.liftK&&!r.liftT&&!r.lifted&&!r.fl&&!r.k&&!r.n,'מצב המעלית מתאפס בתחילת מאץ׳ '+JSON.stringify(r));
// המעלית שלי נעצרת בהפסקה בין השלבים
await clean();
await faceFlower(0);
r=await E(()=>{ const S=__sim, fl=S.flowers[0]; S.bldSet(-1,'lift'); S.setClip(['pollen','pollen','pollen']); S.advance(0.3,1/60); const n0=S.bldFlowerInfo(fl).n;
  const go=S.bldLiftGo(); S.MATCH.locked=true; S.advance(3,1/60); const r={go, on:S.BLD.lift.on, left:S.clip.length, dn:S.bldFlowerInfo(fl).n-n0}; S.MATCH.locked=false; return r; });
ok(r.go&&!r.on&&r.left===3,'המעלית שלי לא מפקידה בהפסקה בין השלבים (MATCH.locked) '+JSON.stringify(r));

// ── 26. כיוונון המעבדה נשמר; שמירה פגומה → קלאסי עם ערכי המעבדה ──
await clean();
r=await E(()=>{ const S=__sim; S.setP('intakeGap',3.5); S.bldSet(-1,'starter'); const a=S.P.intakeGap; S.bldSet(-1,'classic'); return {starter:a, back:S.P.intakeGap}; });
ok(r.starter===3&&r.back===3.5,'כיוונון מהמעבדה חוזר כשחוזרים לקלאסי ('+JSON.stringify(r)+')');
await E(()=>{ const S=__sim; S.setP('intakeGap',3.8); S.bldSet(-1,'classic'); S.bldSet(-1,'starter');
  const o=JSON.parse(localStorage.getItem('biobuzz_params_v1')||'{}'); o.ratio=2.2; localStorage.setItem('biobuzz_params_v1',JSON.stringify(o)); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&__sim.botBody&&__sim.BOTS.length&&__sim.BLD);
r=await E(()=>({me:__sim.bldMe().id, ratio:__sim.P.ratio, gap:__sim.P.intakeGap}));
ok(r.me==='starter'&&r.ratio===2.2&&r.gap===3,'אחרי טעינה: כיוונון במעבדה על StarterBot לא נדרס '+JSON.stringify(r));
await E(()=>localStorage.setItem('bbBuild1','{corrupt'));
await page.reload(); await page.waitForFunction(()=>window.__sim&&__sim.botBody&&__sim.BOTS.length&&__sim.BLD);
r=await E(()=>({me:__sim.bldMe().id, ratio:__sim.P.ratio, gap:__sim.P.intakeGap, w:__sim.P.botW}));
ok(r.me==='classic'&&r.gap===3.8&&r.ratio===3&&r.w===16,'שמירה פגומה: קלאסי עם ערכי המעבדה, בלי שאריות של StarterBot '+JSON.stringify(r));
// בטעינה במצב תחרות — בנייה לא חוקית לא נשארת
await E(()=>{ localStorage.setItem('bbRealm9662','comp'); localStorage.setItem('bbBuild1',JSON.stringify({sel:{me:'cx',bots:['cx','classic','classic']},custom:[{id:'cx',n:'x',drive:'mecanum',intake:'mecanum',sides:2,shoot:'diff',n2:2,turret:360,lift:true,custom:true}]})); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&__sim.botBody&&__sim.BOTS.length&&__sim.BLD);
r=await E(()=>({realm:__sim.REALM, me:__sim.bldMe().id, bot:__sim.bldBot(__sim.BOTS[0]).id}));
ok(r.realm==='comp'&&r.me==='classic'&&r.bot==='classic','טעינה במצב תחרות: בנייה לא חוקית חוזרת לקלאסי '+JSON.stringify(r));
await E(()=>{ __sim.setRealm('open'); });

// ── שורות קלות: הוד, חוקים, צריח בלי יורה, רשת ──
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'starter'); S.setPose(-20,0,0); const h=S.aimHive(), f=S.mouthFrame(h);
  S.setPose(-20,0,Math.atan2(f.c.x-S.botBody.position.x,f.c.z-S.botBody.position.z)*180/Math.PI); S.setClip(['pollen']); S.advance(0.2,1/60); S.refreshAim();
  const vd0=S.P.vDiff; document.getElementById('bSolveDiff').click(); const vd1=S.P.vDiff;
  S.fire(); const e=S.shotLog[S.shotLog.length-1];
  return {vd0,vd1, diff:e.diff, want:+S.bldDiffNow().toFixed(2), spin:document.getElementById('tSpin').textContent}; });
ok(r.vd0===r.vd1&&r.diff===r.want&&r.diff<0&&!/^0 /.test(r.spin),'הוד: ״הסיבוב הטוב״ לא משנה הפרש, היומן והתצוגה מראים סיבוב אחורי '+JSON.stringify(r));
r=await E(()=>{ const S=__sim, spins={}; const b=S.BOTS[0]; b.on=true; b.body.collisionResponse=true;
  for(const id of ['classic','starterMec']){ S.bldSet(0,id); const fr=S.mouthFrame(S.aiHive(b)), nl=Math.hypot(fr.n.x,fr.n.z)||1;
    b.body.position.set(fr.c.x+fr.n.x/nl*S.M(S.P.standoff),b.body.position.y,fr.c.z+fr.n.z/nl*S.M(S.P.standoff)); b.yaw=Math.atan2(fr.c.x-b.body.position.x,fr.c.z-b.body.position.z);
    b.clip.length=0; b.clip.push('pollen'); const n0=S.balls.length; S.aiFire(b); const rec=S.balls[S.balls.length-1];
    spins[id]=S.balls.length>n0?+Math.hypot(rec.body.angularVelocity.x,rec.body.angularVelocity.y,rec.body.angularVelocity.z).toFixed(1):null; }
  const cap={c:S.bldBotCap(b)}; S.bldSet(0,'classic'); cap.cl=S.bldBotCap(b); b.on=false; return {spins,cap}; });
ok(r.spins.classic===0&&r.spins.starterMec>0&&Math.abs(r.cap.c*2*1.5/3-r.cap.cl)<1e-6,'בוט הוד: סיבוב אחורי ותקרת גלגל של חצי '+JSON.stringify(r));
r=await E(()=>{ const S=__sim, B=Object.assign({},S.bldById('classic'),{shoot:'none',turret:360}), B0=Object.assign({},B,{turret:0});
  const c=S.bldCheck(B), c0=S.bldCheck(B0);
  return {rows:c.rows.map(x=>x.r), info:(c.info||[]).map(x=>x.r), mot:c.mot, mot0:c0.mot}; });
ok(r.rows.indexOf('R105')<0&&r.rows.indexOf('G407')<0&&r.info.join()==='R105,G407'&&r.mot===r.mot0,'בדיקת חוקים: R105/G407 מידע ולא ״✓״ קבוע; צריח בלי יורה לא נספר '+JSON.stringify(r));
r=await E(()=>{ const S=__sim; S.bldOpen('classic'); const B=S.bldDup(); S.bldEditSet('shoot','none'); S.bldEditSet('turret','360'); const t=S.BLD.custom.find(x=>x.id===B.id).turret; S.bldDel(); S.bldClose(); return t; });
ok(r===0,'עריכה: צריח בלי יורה לא נשמר ('+r+')');
// רשת: שורה של אורח מראה את הבנייה שלו; אצל אורח — ״הרובוט שלי״ נבחר, ובלי כפתורי ״לבוטים״
r=await E(()=>{ const S=__sim, b=S.BOTS[2]; S.humSeat(b,'net','g'); b.hum.id='g3'; b.hum.label='חבר'; S.BLD.netT={};
  S.bldFromGuest('g3',{drive:'tank4',intake:'compliant',sides:1,shoot:'diff',n2:1,turret:0,lift:false,n:'של חבר'}); S.bldOpen();
  const sel=document.querySelector('[data-bsel="2"]'); const r={val:sel.value, txt:sel.options[sel.selectedIndex].textContent}; S.humFree(b); S.BLD.net={}; S.bldClose(); return r; });
ok(r.val==='net2'&&r.txt==='של חבר','מארח: שורת הבוט של האורח מראה את הבנייה שלו '+JSON.stringify(r));
r=await E(()=>{ const S=__sim; S.bldSet(-1,'starter'); const bots=S.BLD.sel.bots.slice(); const m0=S.NET.mode; S.NET.mode='guest';
  S.BLD.remote={me:S.bldById('turret'),bots:[S.bldById('classic'),S.bldById('classic'),S.bldById('classic')]}; S.bldOpen();
  const sel=document.querySelector('[data-bsel="-1"]'), btn=document.querySelector('#bldBox [data-bact="allme"],#bldBox [data-bact="randbots"]');
  const r={val:sel.value, btn:!!btn}; S.BLD.remote=null; S.NET.mode=m0; S.bldClose(); r.same=JSON.stringify(S.BLD.sel.bots)===JSON.stringify(bots); S.bldSet(-1,'classic'); return r; });
ok(r.val==='starter'&&!r.btn&&r.same,'אורח: ״הרובוט שאני נוהג בו״ מראה את הבחירה שלו, ואין כפתורים שדורסים את הבוטים '+JSON.stringify(r));

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();

// ── תרגום: חלון הבונה באנגלית — בלי עברית ──
({browser,page,errs}=await open({noraf:true,play:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&__sim.botBody&&__sim.BOTS.length&&__sim.BLD);
r=await page.evaluate(async()=>{ const S=__sim, out=new Set(); const scan=()=>{ const t=document.getElementById('bldBox').innerText; (t.match(/[֐-׿][֐-׿׳״ \-־–—,.:;!?()/%]*/g)||[]).forEach(x=>out.add(x.trim())); };
  for(const id of ['classic','starter','lift','all']){ S.bldOpen(id); await new Promise(r=>setTimeout(r,30)); scan(); }
  S.bldOpen('starter'); const B=S.bldDup(); await new Promise(r=>setTimeout(r,30)); scan(); S.bldDel(); S.bldClose();
  return [...out]; });
ok(r.length===0,'חלון הבונה באנגלית — בלי עברית ('+r.join(' | ')+')');
await browser.close();
done('v63_bld');
