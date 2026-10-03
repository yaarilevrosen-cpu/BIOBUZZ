// v70: שידור — צופים בחדר רשת, שידור חוזר מיידי באמצע מאץ׳, במאי אוטומטי למסך השני
import {open,ok,done,realErrs} from './h.mjs';
import {spawn} from 'child_process';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);

// ── 1. צופים: המארח (שקע מדומה — רואים בדיוק מה נשלח לגשר) ──
let r=await E(()=>{ const S=__sim; window.S=S; const out=[]; window.__out=out;
  S.netClose(""); S.NET.mode="host"; S.NET.sock={readyState:1, send(x){ if(typeof x==="string") out.push(JSON.parse(x)); }, close(){}};
  const gj=(id,name)=>S.netOnMsg(JSON.stringify({t:"gj",id,name}));
  gj("g1","אבי"); gj("g2","בני"); gj("g3","גלי");
  const seated=S.BOTS.map(b=>b.hum&&b.hum.src==="net"?b.hum.id:null);
  gj("g4","דני");
  const room=out.filter(m=>m.t==="room").pop();
  return {seated, spec:!!S.NET.guests.g4.spec, specMsg:out.some(m=>m.to==="g4"&&m.t==="spec"), deny:out.some(m=>m.to==="g4"&&m.t==="deny"),
    g4bot:S.BOTS.some(b=>b.hum&&b.hum.id==="g4"), specs:room&&room.specs}; });
ok(r.seated.join(",")==="g1,g2,g3",'שלושה אורחים ממלאים את שלוש העמדות ('+r.seated.join(",")+')');
ok(r.spec&&r.specMsg&&!r.deny&&!r.g4bot,'אורח רביעי בחדר מלא נכנס כצופה, לא נדחה ('+(r.specMsg?'spec':'—')+(r.deny?' / deny':'')+')');
ok(Array.isArray(r.specs)&&r.specs.join()==="דני",'רשימת החדר שנשלחת לאורחים כוללת את הצופה ('+JSON.stringify(r.specs)+')');

r=await E(()=>{ const S=window.S; const g=id=>S.BOTS.find(b=>b.hum&&b.hum.id===id);
  const before=S.BOTS.map(b=>b.hum?JSON.stringify(b.hum.cmd):"-").join("|");
  S.netOnMsg(JSON.stringify({t:"g",id:"g4",m:{t:"in",x:1,y:1,r:1,f:1,i:1,a:1}}));
  S.netOnMsg(JSON.stringify({t:"g",id:"g4",m:{t:"want",seat:0}}));
  const after=S.BOTS.map(b=>b.hum?JSON.stringify(b.hum.cmd):"-").join("|");
  S.netOnMsg(JSON.stringify({t:"g",id:"g1",m:{t:"in",x:0,y:1,r:0,f:0,i:0,a:0}}));
  S.netRefresh(); const tx=document.getElementById("netSeats").textContent;
  return {same:before===after, g1y:g("g1").hum.cmd.y, row:/👁/.test(tx)&&/דני/.test(tx), spec:S.NET.guests.g4.spec}; });
ok(r.same&&r.spec,'קלט של הצופה (נסיעה, ירי, בקשה לעמדת המארח) לא משנה אף רובוט');
ok(r.g1y===1,'קלט של אורח שיושב עדיין עובר (y='+r.g1y+')');
ok(r.row,'אצל המארח הצופה מופיע ברשימת העמדות עם 👁');

r=await E(()=>{ const S=window.S, out=window.__out; out.length=0;
  S.netOnMsg(JSON.stringify({t:"gl",id:"g2"}));                       // עמדה 2 מתפנה
  const free=S.netFreeSeat();
  S.netOnMsg(JSON.stringify({t:"gj",id:"g5",name:"👁נועה"}));         // ביקשה לצפות — לא תופסת את העמדה הפנויה
  const g5=S.NET.guests.g5, free2=S.netFreeSeat();
  S.netOnMsg(JSON.stringify({t:"g",id:"g4",m:{t:"want",seat:free}}));  // הצופה עובר לעמדה שהתפנתה
  const g4bot=S.BOTS.findIndex(b=>b.hum&&b.hum.id==="g4")+1;
  S.netOnMsg(JSON.stringify({t:"g",id:"g4",m:{t:"in",x:0,y:-1,r:0,f:0,i:0,a:0}}));
  const y=S.BOTS[g4bot-1].hum.cmd.y;
  S.netOnMsg(JSON.stringify({t:"g",id:"g1",m:{t:"want",seat:-1}}));    // אורח שיושב בוחר ״👁 צפייה״
  return {free, g5spec:g5.spec, g5name:g5.name, free2, g4bot, g4spec:S.NET.guests.g4.spec, seatMsg:out.some(m=>m.to==="g4"&&m.t==="seat"&&m.seat===free), y,
    g1spec:S.NET.guests.g1.spec, g1bot:S.BOTS.some(b=>b.hum&&b.hum.id==="g1"), specs:S.netSpecNames()}; });
ok(r.g5spec&&r.g5name==="נועה"&&r.free2===r.free,'אורח שבחר ״👁 צפייה״ נכנס כצופה גם כשיש עמדה פנויה (שם: '+r.g5name+', עמדה '+r.free+' נשארה פנויה)');
ok(r.g4bot===r.free&&!r.g4spec&&r.seatMsg&&r.y===-1,'הצופה עבר לעמדה שהתפנתה ('+r.g4bot+') ועכשיו נוהג (y='+r.y+')');
ok(r.g1spec&&!r.g1bot,'אורח שיושב יכול לעבור לצפייה — העמדה שלו חוזרת לבוט ('+r.specs.join(",")+')');

r=await E(()=>{ const S=window.S, out=window.__out; out.length=0;
  for(let i=6;i<=9;i++) S.netOnMsg(JSON.stringify({t:"gj",id:"g"+i,name:"👁צופה"+i}));
  const n=S.netSpecIds().length;
  S.netOnMsg(JSON.stringify({t:"gj",id:"g10",name:"👁עוד אחד"}));
  return {n, max:S.NET_SPEC_MAX, deny:out.some(m=>m.to==="g10"&&m.t==="deny"), spec10:!!S.NET.guests.g10.spec, n2:S.netSpecIds().length}; });
ok(r.n===r.max&&r.deny&&!r.spec10&&r.n2===r.max,'מכסת צופים '+r.max+': השביעי נדחה ('+r.n+' צופים, נדחה: '+r.deny+')');
await E(()=>{ const S=window.S; S.netClose(""); });

// ── 1ב. צופים: האורח ──
r=await E(()=>{ const S=window.S; const sent=[];
  S.NET.sock={readyState:1, send(x){ sent.push(JSON.parse(x)); }, close(){}}; S.NET.mode="guest"; S.netGuestEnter();
  S.netOnMsg(JSON.stringify({t:"spec",n:1,max:6}));
  S.netOnMsg(JSON.stringify({t:"room",seats:[{kind:"host",name:"מארח",ally:"red"},{kind:"net",name:"א",ally:"blue"},{kind:"bot",name:"",ally:"blue"},{kind:"net",name:"ב",ally:"red"}],
    host:"מארח",allies:["red","blue","blue","red"],specs:["אורח","זרה"]}));
  S.NET.inT=1; S.NET.pingAt=0; S.netGuestInput(0.1);
  S.NET.score=[7,3]; S.netRefresh();
  const tb=document.getElementById("netSeats");
  const o={spec:S.NET.spec, bc:S.BC.on, cam:S.camView, cls:document.body.classList.contains("netspec"), sentIn:sent.some(m=>m.t==="in"), ping:sent.some(m=>m.t==="ping"),
    want:!!tb.querySelector('button[data-want="2"]'), specRows:tb.querySelectorAll(".nspec").length, red:S.bcScoreOf("red"), blue:S.bcScoreOf("blue"),
    tag:document.getElementById("netTag").textContent};
  S.netOnMsg(JSON.stringify({t:"seat",seat:2,ally:"blue",allies:["red","blue","blue","red"]}));
  o.after={spec:S.NET.spec, bc:S.BC.on, seat:S.NET.seat};
  S.netClose(""); return o; });
ok(r.spec&&r.bc&&r.cam!=="driver"&&r.cls,'אצל הצופה: לוח ניקוד גדול ומצלמה חופשית ('+r.cam+')');
ok(!r.sentIn&&r.ping,'הצופה לא שולח קלט (רק פינג)');
ok(r.want&&r.specRows===2&&/👁/.test(r.tag),'הצופה רואה את הצופים ('+r.specRows+') וכפתור ״לשבת כאן״ לעמדה הפנויה');
ok(r.red===7&&r.blue===3,'לוח השידור אצל האורח מראה את הניקוד של המארח ('+r.red+':'+r.blue+')');
ok(!r.after.spec&&!r.after.bc&&r.after.seat===2,'כשהצופה מתיישב — חוזר לתצוגת נהג (עמדה '+r.after.seat+')');

// ── 2. שידור חוזר מיידי ──
r=await E(()=>{ const S=window.S; S.MT.cd=0; S.MT.auto=30; S.MT.trans=8; S.MT.tele=120; S.GAME.randAuto=false;
  S.matchStart(); S.advance(14,1/60);
  return {on:S.MATCH.on, rec:S.REPLAY.rec?S.REPLAY.rec.length:0, old:S.replayOpen({}), split:(()=>{ S.SPLIT.on=true; const w=S.irWhy(); S.SPLIT.on=false; return w; })(),
    net:(()=>{ S.NET.mode="host"; const w=S.irWhy(); S.NET.mode="solo"; return w; })()}; });
ok(r.on&&r.rec>14*15*0.9,'מאץ׳ רץ ומוקלט ('+r.rec+' תמונות ב-14 שנ׳)');
ok(r.old===false,'השידור החוזר הרגיל עדיין חסום באמצע מאץ׳');
ok(!!r.split&&!!r.net,'השידור המיידי חסום במסך מפוצל וברשת');

const snap=`(()=>{ const S=window.S, I=S.I, P=b=>[+I(b.position.x).toFixed(4),+I(b.position.z).toFixed(4)], V=b=>[+b.velocity.x.toFixed(5),+b.velocity.z.toFixed(5)];
  return JSON.stringify({t:S.MATCH.t, sim:S.simT(), pose:P(S.botBody), v:V(S.botBody), yaw:+S.bot.yaw.toFixed(5), mag:S.bot.mag,
    red:S.allianceScore("red"), blue:S.allianceScore("blue"),
    bots:S.BOTS.map(b=>b.body?P(b.body).concat([+b.yaw.toFixed(5), b.clip.length]):null),
    balls:S.balls.length, bsum:+S.balls.reduce((s,b)=>s+b.body.position.x+b.body.position.y*3+b.body.position.z*7,0).toFixed(5)}); })()`;
r=await E(s=>{ const S=window.S; window.__A=eval(s); window.__prevF=S.REPLAY.frames; window.__btn=!document.getElementById("irBtn").hidden;
  S.irUi(); const btn=!document.getElementById("irBtn").hidden;
  const ok1=S.irOpen(); const A=JSON.parse(window.__A);
  window.requestAnimationFrame=window.__raf0; S.kickFrame();
  return {ok1, btn, on:S.REPLAY.on, n:S.REPLAY.frames.length, t0:S.REPLAY.cur&&S.REPLAY.cur.t, A}; },snap);
ok(r.btn,'כפתור ״⏪ שידור חוזר״ מופיע באמצע מאץ׳ לבד');
ok(r.ok1&&r.on&&r.n>=140&&r.n<=152,'השידור המיידי נפתח על כ-10 השניות האחרונות ('+r.n+' תמונות, מתחיל ב-'+(r.t0||0).toFixed(1)+' שנ׳ מתוך '+r.A.t.toFixed(1)+')');
await page.waitForTimeout(4000);
r=await E(s=>{ const S=window.S; const B=eval(s); const cur=S.REPLAY.cur.t, frames=S.frames||0;
  const gx=S.I(S.bot.group.position.x), bx=S.I(S.botBody.position.x);
  S.replayClose(); const C=eval(s);
  return {A:window.__A, B, C, cur, restored:S.REPLAY.frames===window.__prevF, on:S.REPLAY.on, irOn:S.IR.on, mon:S.MATCH.on}; },snap);
const A=JSON.parse(r.A), C=JSON.parse(r.C);
ok(r.B===r.A,'בזמן השידור החוזר המאץ׳ קפוא — שעון, רובוט, בוטים, כדורים וניקוד לא זזו (שעון '+A.t.toFixed(3)+')');
ok(r.cur>A.t-10.5&&r.cur<A.t+0.01,'השידור החוזר התנגן מתוך 10 השניות האחרונות (עכשיו ב-'+r.cur.toFixed(2)+' שנ׳)');
ok(r.C===r.A,'אחרי הסגירה — אותו מצב בדיוק: שעון '+C.t.toFixed(3)+'='+A.t.toFixed(3)+', רובוט ('+C.pose+') = ('+A.pose+'), ניקוד '+C.red+':'+C.blue+', '+C.balls+' כדורים');
ok(r.restored&&!r.on&&!r.irOn&&r.mon,'הצופה חזר למאץ׳ הקודם והמאץ׳ עדיין רץ');
await page.waitForTimeout(2500);
r=await E(()=>{ const S=window.S; window.requestAnimationFrame=()=>0; return S.MATCH.t; });
ok(r>A.t+0.2,'המאץ׳ ממשיך מאותה נקודה ('+A.t.toFixed(2)+' → '+r.toFixed(2)+' שנ׳)');
await page.waitForTimeout(1500);
r=await E(()=>{ const S=window.S; const k=c=>document.body.dispatchEvent(new KeyboardEvent("keydown",{code:c,bubbles:true}));
  k("KeyJ"); const a=S.IR.on&&S.REPLAY.on; const t=S.MATCH.t;
  k("KeyW"); const w=!!S.keys&&!!S.keys["KeyW"];
  k("KeyJ"); const b=!S.IR.on&&!S.REPLAY.on;
  dispatchEvent(new KeyboardEvent("keyup",{code:"KeyW",bubbles:true}));
  S.matchStop(); return {a,b,w,same:t===S.MATCH.t}; });
ok(r.a&&r.b,'המקש J פותח וסוגר את השידור החוזר המיידי');
ok(!r.w,'בזמן השידור החוזר מקשי נהיגה לא מגיעים למאץ׳');

// ── 3. במאי אוטומטי ──
r=await E(()=>{ const S=window.S, P=S.castDirPick;
  const c=(cur,held,scoreAge,flight,moving)=>P({cur,held,scoreAge,flight,moving});
  return [c("wide",1,99,true,true), c("wide",3,99,true,true), c("follow",0.5,0.2,false,true), c("follow",1.3,0.2,false,true),
    c("hive",2,2,false,false), c("hive",4.5,4.5,false,false), c("follow",10,99,false,true), c("follow",3,99,false,false),
    c("wide",13,99,false,true), c("wide",5,99,false,true), c("hive",4.5,4.5,true,true)]; });
const want=["wide","follow","follow","hive","hive","wide","wide","wide","follow","wide","follow"];
ok(r.join()===want.join(),'הבחירה של הבמאי (יחידה): '+r.join(","));

r=await E(()=>{ const S=window.S, D=S.DIR, M=S.M;
  S.castDirSet(true); D.shot="wide"; D.held=0; D.t=0; D.scAt=-99; D.sc=null; D.log=[]; D.spd=0; S.CAST.pos=null; S.CAST.tgt=null;
  S.allKeysUp&&S.allKeysUp(); S.setPose(-40,-30,90); S.advance(0.5,1/60);
  const dt=1/15, line=[]; let jump=0, prev=null;
  const step=n=>{ for(let i=0;i<n;i++){ S.advance(dt,1/60); const o=S.castDirTick(dt); line.push(o.shot);
    if(prev) jump=Math.max(jump,o.pos.distanceTo(prev)); prev=o.pos.clone(); } };
  step(15);                                   // שנייה של שקט — רחב
  const w0=D.shot;
  S.bot.mag=4; S.bot.clip=['pollen','pollen','pollen','pollen']; const fr=S.fire(); step(45);                         // ירייה — אחרי האורך המינימלי עוברים למעקב
  const sawFollow=line.includes("follow")&&!!fr;
  D.sc={red:D.sc.red-2,blue:D.sc.blue}; const n0=line.length; step(30); // ניקוד של האדומה (נקלט בדגימה הבאה)
  const cutAt=line.indexOf("hive",n0);
  const hive=S.hiveRed.group.position, dist=Math.hypot(S.CAST.tgt.x-hive.x,S.CAST.tgt.z-hive.z);
  const shotHive=D.shot, ally=D.scAlly;
  step(90);
  /* אורך כל שוט — אף חיתוך לפני האורך המינימלי, חוץ מקלוז־אפ על ניקוד (אחרי minCut) */
  const bad=D.log.filter(e=>e.held<(e.to==="hive"?D.minCut:D.minLen)-1e-6);
  return {w0, sawFollow, cutAt:cutAt-n0, shotHive, ally, dist:S.I(dist), cuts:D.log.map(e=>e.from+">"+e.to+"@"+e.held).join(" "), bad:bad.length, jump:S.I(jump), end:D.shot}; });
ok(r.w0==="wide","בהתחלה — השוט הרחב (המצלמה הקודמת)");
ok(r.sawFollow,'ירייה — הבמאי עובר למעקב');
ok(r.shotHive==="hive"&&r.ally==="red"&&r.dist<12,'ניקוד — קלוז־אפ על הכוורת האדומה ('+r.dist.toFixed(1)+'″ מהכוורת)');
ok(r.bad===0,'אין חיתוך קצר מהמינימום: '+r.cuts);
ok(r.jump<30,'המעברים חלקים (גלישה, לא קפיצה של ~140″) — הצעד הגדול בפריים '+r.jump.toFixed(1)+'″');
ok(r.cutAt>=0&&r.cutAt<=20,'הקלוז־אפ מתחיל מיד אחרי הניקוד ('+(r.cutAt/15).toFixed(2)+' שנ׳)');

r=await E(()=>{ const S=window.S, D=S.DIR, M=S.M, CAST=S.CAST;
  S.castDirSet(false); CAST.pos=null; CAST.tgt=new THREE.Vector3(0,M(8),0); CAST.t=3.3;
  const o=S.castDirTick(1/15);
  /* החישוב הישן של castRender */
  const tg=new THREE.Vector3(0,M(8),0); let cx=0,cz=0,n=0; const add=g=>{ if(g){ cx+=g.position.x; cz+=g.position.z; n++; } };
  add(S.bot.group); for(const b of S.BOTS) if(b.on) add(b.group); if(n){cx/=n;cz/=n;} const lim=M(34);
  tg.lerp(new THREE.Vector3(Math.max(-lim,Math.min(lim,cx*0.7)),M(9),Math.max(-lim,Math.min(lim,cz*0.7))),Math.min(1,(1/15)*1.2));
  const th=Math.PI/2+0.22*Math.sin(3.3*0.06), ph=0.93, dist=M(190);
  const p=new THREE.Vector3(tg.x+dist*Math.sin(ph)*Math.cos(th),tg.y+dist*Math.cos(ph),tg.z+dist*Math.sin(ph)*Math.sin(th));
  const d=o.pos.distanceTo(p); S.castDirSet(true); return {d, shot:o.shot}; });
ok(r.shot==="wide"&&r.d<1e-9,'במאי כבוי — המצלמה הישנה בדיוק (הפרש '+r.d.toExponential(1)+' מ׳)');

// המסך השני עצמו: כפתור הבמאי בחלון, וציור עם הבמאי
r=await E(()=>{ const S=window.S; if(!S.castOpen()) return {open:false};
  S.castRender(1/30); S.castRender(1/30); const d=S.CAST.win.document, b=d.getElementById("castDirB");
  const t1=b&&b.textContent; b&&b.click(); const t2=b&&b.textContent, off=!S.DIR.on; b&&b.click();
  const pos=S.CAST.pos&&S.CAST.pos.toArray().every(isFinite); S.castClose(); return {open:true, t1, t2, off, on:S.DIR.on, pos}; });
ok(r.open&&/פועל/.test(r.t1)&&/כבוי/.test(r.t2)&&r.off&&r.on&&r.pos,'בחלון השידור: כפתור ״🎬 במאי אוטומטי״ מדליק ומכבה ('+r.t1+' / '+r.t2+')');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();

// ── 4. ברשת אמיתית: הגשר בפייתון לא השתנה — ״👁 צפייה״ עובר דרכו בשם ──
const BP=String(+process.env.BB_BRIDGE_PORT||9662);
const br=spawn('python3',['../pad/padbridge.py','--port',BP,'--no-adb','--key','1234','--sim','../dist/BIOBUZZ-lab-lite.html'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1500));
try{
  const H=await open({url:'http://127.0.0.1:'+BP+'/sim?nocad=1'}), G=await open({url:'http://127.0.0.1:'+BP+'/join?k=1234&nocad=1'});
  await H.page.evaluate(()=>{ __sim.netHost(+location.port); });
  await H.page.waitForFunction(()=>__sim.NET.sock&&__sim.NET.sock.readyState===1&&__sim.NET.key,null,{timeout:90000});
  const key=await H.page.evaluate(()=>__sim.NET.key);
  await G.page.evaluate(k=>{ __sim.netClose(""); __sim.netJoin('127.0.0.1:'+location.port+'#'+k,'שירה',{spec:true}); },key);
  const until=(P,f,t)=>P.waitForFunction(f,null,{timeout:t}).then(()=>true,()=>false);
  const sp=await until(G.page,()=>__sim.NET.spec===true,90000);
  const hs=await H.page.evaluate(()=>({specs:__sim.netSpecNames(), seated:__sim.BOTS.filter(b=>b.hum&&b.hum.src==='net').length}));
  ok(sp&&hs.specs.join()==='שירה'&&hs.seated===0,'דרך הגשר האמיתי: האורח נכנס כצופה בשם ״'+hs.specs.join()+'״, אף עמדה לא נתפסה');
  const st=await until(G.page,()=>__sim.NET.snaps.length>0,60000);
  ok(st,'הצופה מקבל את זרם המצב מהמארח');
  await G.page.evaluate(()=>{ const b=document.querySelector('#netSeats button[data-want]'); if(b) b.click(); });
  const seated=await until(G.page,()=>__sim.NET.seat!==null&&!__sim.NET.spec,60000);
  ok(seated,'״לשבת כאן״ — הצופה עובר לעמדה פנויה (עמדה '+(await G.page.evaluate(()=>__sim.NET.seat))+')');
  ok(realErrs(H.errs).length===0&&realErrs(G.errs).length===0,'אין שגיאות במארח ובאורח: '+realErrs(H.errs).concat(realErrs(G.errs)).slice(0,2).join(' | '));
  await H.browser.close(); await G.browser.close();
}finally{ br.kill(); }
done('v70_cast_test');
