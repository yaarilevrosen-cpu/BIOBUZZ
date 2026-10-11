// v74 net — רשת, גשרים ושלטים: N1–N8 (+P6), חיבור חוזר, U5 (עקומת שלט אחת), U8 (נהג + מפעיל)
// PORT (ברירת מחדל 8905) — שרת הבדיקות; BB_BRIDGE_PORT (ברירת מחדל 9675) — הגשרים
import {open,ok,done,realErrs} from './h.mjs';
import { chromium } from 'playwright';
import {spawn} from 'child_process';
import net from 'net'; import crypto from 'crypto';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const require=createRequire(import.meta.url);
const HP=process.env.PORT||process.env.BB_PORT||'8905', U0='http://127.0.0.1:'+HP+'/sim.html?nocad=1';
const BP=+(process.env.BB_BRIDGE_PORT||9675);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ══ חלק א: דף אחד ══ */
{
const {browser,page,errs}=await open({noraf:true,url:U0});
const E=(f,a)=>page.evaluate(f,a);
// N3 — המארח קובע את עמדת הנהג; האורח מציית; מארח ישן — כמו קודם
let r=await E(()=>{ const S=__sim, X=S.v74net; S.gameStart(true);
  const s=[1,2,3].find(i=>S.BOTS[i-1].ally===S.myAlly());
  S.setDriver('red2'); const st=X.netStations(); const hostK=S.humStation(S.BOTS[s-1]).k;
  S.setCamView('free');
  S.NET.mode='guest'; S.NET.seat=s; S.NET.stationK=null; S.NET.st=null; X.netStOk(st); X.netGuestCam(); const gk=S.driverAt().k;
  S.NET.st=null; X.netStOk(['red1','zzz','blue1','red2']); const bad=S.NET.st;
  S.NET.stationK=null; X.netGuestCam(); const old=S.driverAt().k, oldWant=S.netStationOf(s).k;
  S.NET.mode='solo'; S.NET.seat=null; S.setCamView('free');
  return {s,st,hostK,gk,bad,old,oldWant}; });
ok(r.st.length===4&&r.st[r.s]===r.hostK&&r.gk===r.hostK,'N3 האורח בעמדה '+r.s+' מסתכל מהעמדה שהמארח נוהג לפיה ('+r.gk+' = '+r.hostK+')');
ok(r.bad===null&&r.old===r.oldWant,'N3 st לא תקין / מארח ישן — לפי סדר העמדות כמו קודם ('+r.old+')');
// N4 — מסך מפוצל ושלט בעמדה לא לוקחים את הטלפון
r=await E(()=>{ const S=__sim, X=S.v74net; S.gameStart(true);
  S.phoneSetSeat(2); S.splitSet(true,{seat:2}); S.advance(0.2,1/60);
  const o={ph:S.BOTS[2].hum&&S.BOTS[2].hum.src, phSeat:S.PHN.seat, splitSeat:S.SPLITS.seat, splitOn:S.SPLITS.on, split:S.BOTS[S.SPLITS.seat].hum&&S.BOTS[S.SPLITS.seat].hum.src};
  S.splitSet(false); o.after=S.BOTS[2].hum&&S.BOTS[2].hum.src;
  X.netPadSeat(3,0); o.padSteal=S.BOTS[2].hum&&S.BOTS[2].hum.src; o.toast=document.getElementById('refToast').textContent;
  S.NET.mode='host'; X.netRefresh(); o.sel=!!document.querySelector('#netSeats select[data-padseat="3"]'); o.sel2=!!document.querySelector('#netSeats select[data-padseat="2"]'); S.NET.mode='solo';
  // מישהו לקח בכל זאת (קוד ישן) — הטלפון חוזר לרובוט שלי עם הודעה
  S.humSeat(S.BOTS[2],"split","x"); S.v74net.netLocalPads(); o.back=S.PHN.seat; o.toast2=document.getElementById('refToast').textContent;
  S.humFree(S.BOTS[2]); return o; });
ok(r.ph==='phone'&&r.phSeat===2&&r.splitOn&&r.splitSeat!==2&&r.split==='split','N4 מסך מפוצל בוחר עמדה פנויה — הטלפון נשאר ברובוט שלו (מפוצל בעמדה '+(r.splitSeat+2)+')');
ok(r.after==='phone','N4 אחרי סגירת המסך המפוצל הטלפון עדיין נוהג');
ok(r.padSteal==='phone'&&/מישהו אחר נוהג/.test(r.toast),'N4 שלט בעמדה לא דורס את הטלפון (הודעה: '+r.toast+')');
ok(!r.sel&&r.sel2,'N4 בלוח המארח אין בחירת שלט על העמדה של הטלפון (ויש על עמדה פנויה)');
ok(r.back===-1&&/הטלפון חזר/.test(r.toast2),'N4 הרובוט נלקח מהטלפון → ״הטלפון חזר לרובוט שלי״');
// N5 — אורח לא מפעיל מסך מפוצל
r=await E(()=>{ const S=__sim; S.NET.mode='guest'; document.body.classList.add('netguest');
  S.splitSet(true); const o={on:S.SPLITS.on, toast:document.getElementById('refToast').textContent,
    vis:getComputedStyle(document.getElementById('ppSplit')).display, seg:getComputedStyle(document.getElementById('splitSeg')).display};
  document.body.classList.remove('netguest'); S.NET.mode='solo';
  S.splitSet(true); o.solo=S.SPLITS.on; S.splitSet(false); return o; });
ok(r.on===false&&/מסך מפוצל לא זמין/.test(r.toast),'N5 אורח: splitSet(true) נדחה עם הודעה');
ok(r.vis==='none'&&r.seg==='none','N5 אורח: הכפתורים של המסך המפוצל מוסתרים');
ok(r.solo===true,'N5 לבד — מסך מפוצל עובד כמו קודם');
// N7 — השהיות אצל המארח
r=await E(()=>{ const S=__sim; S.gameStart(true); S.NET.mode='host'; S.NET.guests={gA:{name:'a',spec:false,seat:2}};
  const b=S.BOTS[1]; S.humSeat(b,'net','a'); b.hum.id='gA'; const sent=[]; const s0=S.NET.sock; S.NET.sock={readyState:1,send:x=>sent.push(x)};
  const ids=S.SKINS.map(s=>s.id); let resets=0; const g0=S.gameStart;
  const t0=performance.now(); let n=0; while(performance.now()-t0<300){ S.netFromGuest('gA',{t:'skin',s:ids[n%ids.length]}); n++; }
  const skinsNow=sent.filter(x=>/"t":"skins"/.test(x)).length;
  const t1=performance.now(); let m=0, seats=0; const before=sent.length;
  while(performance.now()-t1<1000){ S.netFromGuest('gA',{t:'want',seat:m%2?2:3}); m++; }
  seats=sent.slice(before).filter(x=>/"t":"seat"/.test(x)).length;
  const t2=performance.now(); let k=0; const b2=sent.length; while(performance.now()-t2<1000){ S.netFromGuest('gA',{t:'ping',c:1}); k++; }
  const pongs=sent.slice(b2).filter(x=>/"t":"pong"/.test(x)).length;
  return new Promise(res=>setTimeout(()=>{ const skinsLater=sent.filter(x=>/"t":"skins"/.test(x)).length;
    S.NET.sock=s0; S.NET.mode='solo'; S.NET.guests={}; for(const q of S.BOTS) S.humFree(q); clearTimeout(S.NET.skinT); S.NET.skinT=0;
    res({n,skinsNow,skinsLater,m,seats,k,pongs}); },700)); });
ok(r.n>1000&&r.skinsNow<=2&&r.skinsLater<=4,'N7 '+r.n+' הודעות skin ב-0.3 שנ׳ → '+r.skinsLater+' שידורים (לפני: אחד לכל הודעה)');
ok(r.m>1000&&r.seats<=3,'N7 '+r.m+' בקשות want בשנייה → '+r.seats+' החלפות עמדה (לכל היותר פעם בחצי שנייה)');
ok(r.k>1000&&r.pongs<=4,'N7 '+r.k+' פינגים בשנייה → '+r.pongs+' תשובות');
// N8 — אורח שותק: 5 שניות בלימה, ורק אז בוט, עם סימון בטבלה
r=await E(()=>{ const S=__sim, X=S.v74net; S.setRealm('open'); S.gameStart(true); S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=120; S.matchStart();
  S.NET.mode='host'; S.NET.guests={gA:{name:'a',spec:false,seat:3}}; const s0=S.NET.sock; S.NET.sock={readyState:1,send:()=>{}};
  const b=S.BOTS[2]; S.humSeat(b,'net','a'); b.hum.id='gA'; S.humFeed(b,{x:0,y:0,t:0,fire:false,intake:false,aim:false,fc:true});
  S.advance(1,1/60);
  const p0={x:b.body.position.x,z:b.body.position.z}, sh0=b.shots; const out=[];
  for(let i=0;i<4;i++){ b.hum.at=performance.now()-2000-i*500; S.advance(1,1/60);
    out.push(Math.round(S.I(Math.hypot(b.body.position.x-p0.x,b.body.position.z-p0.z)))); }
  const shotsGrace=b.shots-sh0, idle0=S.netSeatInfo(3).idle; X.netRefresh(); const mark0=!!document.querySelector('#netSeats .v74idle');
  b.hum.at=performance.now()-6000; const drives=X.humDrives(b); const idle1=S.netSeatInfo(3).idle;
  S.NET.mode='host'; X.netRefresh(); const mark1=(document.querySelector('#netSeats .v74idle')||{}).textContent||'';
  S.advance(3,1/60); const moved=Math.round(S.I(Math.hypot(b.body.position.x-p0.x,b.body.position.z-p0.z)));
  S.matchStop(); S.NET.sock=s0; S.NET.mode='solo'; S.NET.guests={}; S.humFree(b); S.MATCH.phase='idle';
  return {out,shotsGrace,idle0,mark0,drives,idle1,mark1,moved}; });
ok(r.out.every(d=>d<=2)&&r.shotsGrace===0,'N8 שתיקה של 2–3.5 שנ׳: הרובוט בבלימה ('+r.out.join(',')+'″), בלי יריות (לפני: 42″ ושתי יריות)');
ok(r.idle0===false&&!r.mark0,'N8 בזמן החסד — אין סימון ״בוט״ בטבלה');
ok(r.drives===false&&r.idle1===true&&/בוט/.test(r.mark1),'N8 אחרי 5 שנ׳ — הבוט לוקח, והטבלה מסמנת ״'+r.mark1.trim()+'״');
// חיבור חוזר — צד המארח: העמדה נשמרת 15 שנ׳ לאותו שם, ואז משתחררת
r=await E(()=>{ const S=__sim, X=S.v74net; S.gameStart(true); S.NET.mode='host'; const s0=S.NET.sock; const sent=[]; S.NET.sock={readyState:1,send:x=>sent.push(x)};
  S.NET.guests={g1:{name:'noa',spec:false}}; X.netSeatGuest('g1',2); const seat=S.NET.guests.g1.seat;
  X.netOnMsg(JSON.stringify({t:'gl',id:'g1'})); const held=S.netSeatInfo(seat); const fr=[1,2,3].filter(s=>S.netSeatInfo(s).kind==='bot');
  X.netOnMsg(JSON.stringify({t:'gj',id:'g2',name:'other'})); const otherSeat=S.NET.guests.g2&&S.NET.guests.g2.seat;
  X.netOnMsg(JSON.stringify({t:'gj',id:'g3',name:'noa'})); const back=S.NET.guests.g3&&S.NET.guests.g3.seat;
  // תוקף
  X.netOnMsg(JSON.stringify({t:'gl',id:'g3'})); const b=S.v72netapp?S.BOTS[seat-1]:null; b.hum.gone=performance.now()-X.NET_HOLD_MS-10; X.v74HoldTick(); const freed=S.netSeatInfo(seat).kind;
  S.NET.sock=s0; S.NET.mode='solo'; S.NET.guests={}; for(const q of S.BOTS) S.humFree(q);
  return {seat,held:held.kind,gone:held.gone,otherSeat,back,freed}; });
ok(r.held==='net'&&r.gone,'חיבור חוזר: אורח שיצא — העמדה שלו נשמרת ומסומנת');
ok(r.otherSeat!==r.seat&&r.back===r.seat,'חיבור חוזר: אורח חדש לא מקבל אותה; אותו שם שחזר — מקבל אותה (עמדה '+r.back+')');
ok(r.freed==='bot','חיבור חוזר: אחרי 15 שנ׳ העמדה חוזרת לבוט');
// U5 — עקומה אחת
r=await E(()=>{ const S=__sim, X=S.v74net, P=X.PSH(); const o={};
  o.d0=X.padShape(0.1); o.lin=+X.padShape(0.56).toFixed(3);
  P.expo=1; o.cub=+X.padShape(0.56).toFixed(3); P.max=50; o.max=+X.padShape(1).toFixed(3); P.slow=0.5; o.fine=X.padFine(1);
  const g={buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,-1,0,0]};
  o.cmd=+X.padToCmd(g,{}).y.toFixed(3);
  P.expo=0; P.max=100; P.slow=0.28;
  return o; });
ok(r.d0===0&&Math.abs(r.lin-0.5)<0.01,'U5 אזור מת 0.12: ‏0.10→0, ‏0.56→'+r.lin);
ok(Math.abs(r.cub-0.125)<0.01&&r.max===0.5&&r.fine===0.5,'U5 עקומה שלישית ('+r.cub+'), מהירות מרבית 50% ('+r.max+'), מצב דיוק 50%');
ok(r.cmd===0.5,'U5 גם padToCmd (אורח ברשת / שלט בעמדה) עובר דרך אותה עקומה ('+r.cmd+')');
r=await E(()=>{ const S=__sim, X=S.v74net; S.gameStart(true); S.bot.yaw=1.0; X.padYawReset(); const o={fc:S.fieldCentric,on:X.PADYAW().on,yaw:X.PADYAW().yaw,act:!!S.PADACT.yawReset};
  const b=S.BOTS[0]; S.humSeat(b,'pad','x'); b.yaw=0.7; S.humFeed(b,{x:0,y:0,t:0,yr:1}); o.y0=b.hum.yaw0; S.humFree(b);
  X.setOri(false); o.off=X.PADYAW().on; return o; });
ok(r.act&&r.fc&&r.on&&Math.abs(r.yaw-1)<1e-6,'U5 ״איפוס כיוון״: ציר המגרש, ו״קדימה״ = לאן שהרובוט פונה');
ok(Math.abs(r.y0-0.7)<1e-6&&r.off===false,'U5 איפוס כיוון גם לרובוט של שלט נוסף / אורח (yr), ומעבר לציר הרובוט מבטל');
// U8 — נהג + מפעיל
await E(()=>{ const mk=i=>({index:i,id:'Xbox pad '+i,connected:true,buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]});
  window.__pads=[mk(0),mk(1)]; navigator.getGamepads=()=>window.__pads; });
r=await E(()=>{ const S=__sim, X=S.v74net; S.gameStart(false); S.splitSet(false);
  const o={}; S.splitSet(true); o.withSplit=X.oprSet(true); o.t1=document.getElementById('refToast').textContent; S.splitSet(false);
  S.gameStart(true); X.netPadSeat(2,1); o.withPad=X.oprSet(true); o.t2=document.getElementById('refToast').textContent; X.netPadSeat(2,null);
  o.ok=X.oprSet(true); o.idx=X.OPR().idx; o.claimed=X.padClaimed(1);
  S.splitSet(true); o.splitBlocked=!S.SPLITS.on; X.netPadSeat(3,1); o.padBlocked=!(S.BOTS[2].hum&&S.BOTS[2].hum.src==='pad');
  o.rows=document.querySelectorAll('#oprBinds .brow').length; o.edHidden=document.getElementById('oprBinds').hidden;
  return o; });
ok(r.withSplit===false&&/מסך מפוצל/.test(r.t1),'U8 לא יחד עם מסך מפוצל — הודעה ברורה');
ok(r.withPad===false&&/שלט שתופס עמדה/.test(r.t2),'U8 לא יחד עם שלט שתופס עמדה — הודעה ברורה');
ok(r.ok&&r.idx===1&&r.claimed,'U8 הופעל: שלט 2 הוא המפעיל ולא נוהג ברובוט שלי');
ok(r.splitBlocked&&r.padBlocked,'U8 כשהוא פועל — מסך מפוצל ושלט בעמדה נחסמים');
ok(r.rows===17&&!r.edHidden,'U8 עורך המיפוי של שלט 2 (אותו padBindsBuild) — 17 שורות');
const press=async(pi,bi,on)=>E(([pi,bi,on])=>{ const b=window.__pads[pi].buttons[bi]; b.pressed=on; b.value=on?1:0; __sim.advance(0.05,1/60); },[pi,bi,on]);
await E(()=>{ __sim.bot.mag=3; });
let st0=await E(()=>({in:__sim.intake,mag:__sim.bot.mag,as:__sim.PADACT.assist.get()}));
await press(1,5,true); await press(1,5,false);
let st1=await E(()=>({in:__sim.intake}));
await press(0,5,true); await press(0,5,false);
let st2=await E(()=>({in:__sim.intake}));
await press(1,4,true); await press(1,4,false);
await E(()=>{ __sim.advance(1,1/60); });
await press(1,7,true); await press(1,7,false); await E(()=>{ __sim.advance(0.5,1/60); });
let st3=await E(()=>({as:__sim.PADACT.assist.get(),mag:__sim.bot.mag}));
ok(st1.in!==st0.in,'U8 שלט 2: RB מחליף חרטום ('+st0.in+'→'+st1.in+')');
ok(st2.in===st1.in,'U8 שלט 1: אותו כפתור לא נוגע בחרטום כשיש מפעיל');
ok(st3.as!==st0.as&&st3.mag<st0.mag,'U8 שלט 2: LB סיוע ('+st3.as+'), RT ירי (מחסנית '+st0.mag+'→'+st3.mag+')');
r=await E(()=>{ const S=__sim, X=S.v74net; X.OPRB()[3]={a:'fire',m:'press'}; const sel=document.querySelector('#oprBinds select[data-act="3"]');
  sel.value='tip'; sel.dispatchEvent(new Event('change')); const saved=JSON.parse(localStorage.getItem('bbPadBind2'))[3].a;
  const opts=[...sel.options].map(o=>o.value); X.oprSet(false); const off=!X.OPR().on&&!X.padClaimed(1);
  X.oprBindReset(); return {saved,opts:opts.length,hasMatch:opts.includes('match'),off}; });
ok(r.saved==='tip'&&!r.hasMatch&&r.opts<=10,'U8 מיפוי משלו (bbPadBind2), רק פעולות של מפעיל ('+r.opts+')');
ok(r.off,'U8 כיבוי — שלט 2 חוזר להיות חופשי');
// U5 בסטודיו
r=await E(()=>{ const S=__sim, X=S.v74net; X.padStudioOpen();
  const ids=['psDead','psExpo','psSlow','psMax'].map(i=>!!document.getElementById(i)); const e=document.getElementById('psExpo'); e.value='0.5'; e.dispatchEvent(new Event('input'));
  const saved=JSON.parse(localStorage.getItem('bbPadShape1')).expo; const opr=!!document.getElementById('psOpr');
  document.getElementById('psX').click(); X.PSH().expo=0; localStorage.removeItem('bbPadShape1'); return {ids,saved,opr}; });
ok(r.ids.every(Boolean)&&r.saved===0.5&&r.opr,'U5 בסטודיו השלט: אזור מת, עקומה, מצב דיוק, מהירות מרבית (נשמר) + מתג נהג ומפעיל');
await E(()=>{ delete navigator.getGamepads; window.__pads=[]; });
// אנגלית: ההודעות החדשות בלי עברית
r=await E(()=>{ const d=JSON.parse(document.getElementById('i18nX_v74net').textContent); return Object.values(d).filter(v=>/[֐-׿]/.test(v)).length; });
ok(r===0,'תרגומים לאנגלית בלי עברית');
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); }); await page.reload({timeout:120000});
await page.waitForFunction(()=>window.__sim&&window.__sim.v74net,null,{timeout:120000});
r=await E(()=>{ const S=__sim, X=S.v74net, out=[]; const t=()=>document.getElementById('refToast').textContent;
  S.NET.mode='guest'; S.splitSet(true); out.push(t()); S.NET.mode='solo';
  S.gameStart(true); S.phoneSetSeat(2); S.humSeat(S.BOTS[2],"split","x"); S.v74net.netLocalPads(); out.push(t()); S.humFree(S.BOTS[2]);
  S.splitSet(true); X.oprSet(true); out.push(t()); S.splitSet(false);
  X.padYawReset(); out.push(t()); X.setOri(false);
  S.NET.mode='host'; const b=S.BOTS[1]; S.humSeat(b,'net','a'); b.hum.id='gA'; b.hum.at=performance.now()-9000; X.netRefresh();
  out.push((document.querySelector('#netSeats .v74idle')||{}).textContent||'(none)'); S.humFree(b); S.NET.mode='solo';
  localStorage.removeItem('bbLang1'); return out; });
ok(r.every(t=>t&&t!=='(none)'&&!/[֐-׿]/.test(t)),'אנגלית: '+r.join(' | '));
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();
}

/* ══ חלק ב: הגשר בפייתון — N1, N2, N6, N7, טלפון מ-/sim, מארח + אורח + חיבור חוזר ══ */
const wsc=(port,q,o={})=>new Promise(res=>{ const s=net.connect({port,host:'127.0.0.1',localAddress:o.from});
  s.on('error',()=>res({status:0}));
  s.on('connect',()=>{ s.write('GET /ws?'+q+' HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: '+crypto.randomBytes(16).toString('base64')+
    '\r\nSec-WebSocket-Version: 13\r\n'+(o.origin!==undefined?'Origin: '+o.origin+'\r\n':'')+'\r\n'); });
  let buf=Buffer.alloc(0), head=true; s.frames=[];
  s.on('data',d=>{ buf=Buffer.concat([buf,d]);
    if(head){ const i=buf.indexOf('\r\n\r\n'); if(i<0) return; const st=+buf.slice(0,i).toString().split(' ')[1]; buf=buf.slice(i+4); head=false; s.status=st; res(s); if(st!==101){ s.destroy(); return; } }
    while(buf.length>=2){ let ln=buf[1]&127, o2=2; if(ln===126){ if(buf.length<4) return; ln=buf.readUInt16BE(2); o2=4; } else if(ln===127){ if(buf.length<10) return; ln=Number(buf.readBigUInt64BE(2)); o2=10; }
      if(buf.length<o2+ln) return; const op=buf[0]&15, p=buf.slice(o2,o2+ln); buf=buf.slice(o2+ln);
      if(op===9) wsSend(s,p,10); else s.frames.push({op,p,t:Date.now()}); } });
});
function wsSend(s,data,op){ const p=Buffer.isBuffer(data)?data:Buffer.from(String(data)); op=op||(Buffer.isBuffer(data)?2:1); const m=crypto.randomBytes(4);
  const h=p.length<126?Buffer.from([0x80|op,0x80|p.length]):p.length<65536?Buffer.concat([Buffer.from([0x80|op,0x80|126]),Buffer.from([p.length>>8,p.length&255])]):(()=>{ const b=Buffer.alloc(10); b[0]=0x80|op; b[1]=0x80|127; b.writeBigUInt64BE(BigInt(p.length),2); return b; })();
  const x=Buffer.alloc(p.length); for(let i=0;i<p.length;i++) x[i]=p[i]^m[i&3]; try{ s.write(Buffer.concat([h,m,x])); }catch(e){} }
const txt=s=>s.frames.filter(f=>f.op===1).map(f=>f.p.toString());
{
const D=fs.mkdtempSync(path.join(os.tmpdir(),'bbv74net-'));
fs.copyFileSync(path.resolve(HERE,'../pad/padbridge.py'),path.join(D,'padbridge.py'));
let html=fs.readFileSync(path.resolve(HERE,'sim.html'),'utf8');
html=html.replace(/<script src="lib\/([A-Za-z_.]+\.js)"><\/script>/g,(m,n)=>'<script>'+fs.readFileSync(path.resolve(HERE,'lib',n),'utf8').replace(/<\/script/g,'<\\/script')+'</script>');
fs.writeFileSync(path.join(D,'simi.html'),html);
const br=spawn('python3',[path.join(D,'padbridge.py'),'--port',String(BP),'--no-adb','--key','123456','--sim',path.join(D,'simi.html')],{stdio:'ignore',cwd:D});
let browser=null; const errs=[];
try{
  for(let i=0;i<40;i++){ await wait(150); try{ if((await fetch('http://127.0.0.1:'+BP+'/health')).ok) break; }catch(e){} }
  const page0=await (await fetch('http://127.0.0.1:'+BP+'/sim')).text(); const TOK=(/BB_TOK="([^"]+)"/.exec(page0)||[])[1];
  const PK=fs.readFileSync(path.join(D,'.pad-key'),'utf8').trim();
  // N1 — /health
  let h=await (await fetch('http://127.0.0.1:'+BP+'/health',{headers:{Origin:'null'}})).json();
  ok(!('pk' in h)&&!('lan' in h),'N1 /health בלי אסימון (Origin: null, כמו iframe בארגז חול) — בלי מפתח השלט ובלי כתובות');
  h=await (await fetch('http://127.0.0.1:'+BP+'/health?t='+encodeURIComponent(TOK))).json();
  ok(h.pk===PK,'N1 /health עם האסימון של /sim — מחזיר את המפתח לקוד ה-QR');
  // N1 — WebSocket
  const sim=await wsc(BP,'role=sim&t='+encodeURIComponent(TOK),{origin:'http://127.0.0.1:'+BP});
  const phone=await wsc(BP,'role=pad',{origin:'http://127.0.0.1:'+BP}); await wait(200);
  const evil=await wsc(BP,'role=pad',{origin:'null'}), evilF=await wsc(BP,'role=pad',{origin:'file://'}), evilS=await wsc(BP,'role=sim',{origin:'null'});
  await wait(300);
  ok(phone.status===101&&evil.status===403&&evilF.status===403,'N1 שלט עם Origin: null / file:// — נדחה (403); דף השלט מהגשר — נכנס');
  ok(!txt(phone).some(m=>/kick/.test(m)),'N1 הטלפון האמיתי לא נבעט החוצה');
  ok(evilS.status===403,'N1 sim בלי אסימון עם Origin: null — נדחה (לא קורא את קלט הטלפון)');
  const native=await wsc(BP,'role=sim'); ok(native.status===101,'N1 sim בלי Origin בכלל (לקוח מקורי) — עדיין נכנס'); native.destroy();
  phone.destroy(); sim.destroy();
  // N6 — 80 ניסיונות שגויים מ-10 כתובות, ואז אורח נקי עם הקוד הנכון
  for(let ip=2;ip<12;ip++) for(let j=0;j<8;j++){ const w=await wsc(BP,'role=guest&k=999&n=x',{from:'127.0.0.'+ip}); try{ w.destroy(); }catch(e){} }
  const clean=await wsc(BP,'role=guest&k=123456&n=clean',{from:'127.0.0.50'});
  const dirty=await wsc(BP,'role=guest&k=123456&n=dirty',{from:'127.0.0.3'});
  ok(clean.status===101,'N6 אחרי 80 קודים שגויים — אורח מכתובת נקייה עם הקוד הנכון נכנס ('+clean.status+', לפני: 429)');
  ok(dirty.status===429,'N6 כתובת שטעתה — עדיין נעולה ('+dirty.status+')');
  clean.destroy();
  // N2 + N7 — מארח משדר, אורח אחד לא קורא, אחד תקין, ואחד מציף
  const host=await wsc(BP,'role=host&t='+encodeURIComponent(TOK),{origin:'http://127.0.0.1:'+BP});
  const good=await wsc(BP,'role=guest&k=123456&n=good',{from:'127.0.0.60'});
  const bad=await wsc(BP,'role=guest&k=123456&n=bad',{from:'127.0.0.61'}); bad.pause();
  const spam=await wsc(BP,'role=guest&k=123456&n=spam',{from:'127.0.0.62'});
  await wait(300);
  const big=Buffer.alloc(60000), t0=Date.now(); let sent=0;
  const tx=setInterval(()=>{ wsSend(host,big,2); sent++; },40);
  let spamClosed=false; spam.on('close',()=>{ spamClosed=true; });
  const n0=host.frames.length; let spamSent=0;
  const sx=setInterval(()=>{ for(let i=0;i<20;i++){ wsSend(spam,'{"t":"ping","c":1}'); spamSent++; } },20);
  await wait(3000);
  const relayed3=host.frames.slice(n0).filter(f=>f.op===1&&/"id": ?"g\d+"/.test(f.p.toString())&&/"c": ?1/.test(f.p.toString())).length, spamAt3=spamSent;
  await wait(9000); clearInterval(tx); clearInterval(sx);
  const got=good.frames.filter(f=>f.op===2), gaps=got.slice(1).map((f,i)=>f.t-got[i].t), maxGap=Math.max(0,...gaps)/1000;
  ok(got.length>=sent*0.9&&maxGap<2,'N2 אורח לא קורא — האורח התקין קיבל '+got.length+'/'+sent+' תמונות של 60 ק״ב, פער מרבי '+maxGap.toFixed(1)+' שנ׳');
  ok(relayed3>=120&&relayed3<=120+60*3+30,'N7 מציף: '+spamAt3+' הודעות ב-3 שנ׳ → '+relayed3+' הגיעו למארח (60/שנ׳ + 120 ברצף)');
  ok(spamClosed,'N7 מציף יותר מ-10 שנ׳ — נותק');
  for(const w of [host,good,bad,spam]) try{ w.destroy(); }catch(e){}
  await wait(300);
  // דפדפנים: מארח מ-/sim (טלפון עם QR) + אורח מ-/join + חיבור חוזר
  browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--proxy-server=direct://','--proxy-bypass-list=*']});
  const mk=async(url,tag)=>{ const ctx=await browser.newContext({viewport:{width:1100,height:700}}); const p=await ctx.newPage();
    await p.addInitScript(()=>{ try{ localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); }catch(e){} });
    p.on('pageerror',e=>errs.push(tag+': '+e)); await p.goto(url,{timeout:120000});
    await p.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:120000});
    await p.evaluate(()=>{ try{ __sim.renderer.render=()=>{}; }catch(e){} }); return p; };
  const until=(P,f,t,a)=>P.waitForFunction(f,a,{timeout:t||60000}).then(()=>true,()=>false);
  const H=await mk('http://127.0.0.1:'+BP+'/sim?nocad=1','H');
  const url=await H.evaluate(async()=>{ __sim.VPAD.port=+location.port; const f0=window.fetch; let seen=null, pk=null;
    window.fetch=async(u,o)=>{ seen=String(u); const r=await f0(u,o); const j=await r.json(); pk=j.pk||null; if(!j.lan||!j.lan.length) j.lan=['10.0.0.7']; return {json:async()=>j}; };
    const out=await __sim.v74net.phoneFindUrl(); window.fetch=f0; window.__qrSeen={seen,pk}; return out; });
  const qs=await H.evaluate(()=>window.__qrSeen);
  ok(/[?&]t=/.test(qs.seen)&&qs.pk===PK,'N1 הסימולטור מ-/sim שולח את האסימון ל-/health ומקבל את מפתח השלט');
  ok(/\/\?p=/.test(url)&&url.endsWith('/?p='+PK),'N1 קוד ה-QR מ-/sim עדיין כולל את מפתח השלט ('+url+')');
  if(url&&!/10\.0\.0\.7/.test(url)){ const ctx=await browser.newContext(); const P1=await ctx.newPage(); await P1.goto(url,{timeout:30000});
    await H.evaluate(()=>{ const V=__sim.VPAD; V.kick=true; V.tries=0; V.retry=0; });
    ok(await until(P1,()=>document.getElementById('led').classList.contains('ok'),20000),'N1 הטלפון מהקישור של ה-QR מתחבר ונוהג'); await ctx.close(); }
  await H.evaluate(()=>{ __sim.setRealm('open'); __sim.gameStart(true); __sim.setDriver('red2'); __sim.netHost(+location.port); });
  ok(await until(H,()=>__sim.NET.sock&&__sim.NET.sock.readyState===1&&__sim.NET.key),'מארח פתח חדר');
  const G=await mk('http://127.0.0.1:'+BP+'/join?k=123456&nocad=1','G');
  ok(await until(G,()=>__sim.NET.seat!=null&&__sim.NET.snaps.length>0,120000),'אורח ישב');
  await G.waitForTimeout(1200);
  const s1=await G.evaluate(()=>({seat:__sim.NET.seat,k:__sim.driverAt().k,st:__sim.NET.st}));
  const hs=await H.evaluate(()=>__sim.v74net.netStations());
  ok(s1.st&&s1.k===hs[s1.seat],'N3 ברשת אמיתית: האורח (עמדה '+(s1.seat+1)+') מסתכל מ-'+s1.k+' = עמדת הנהג אצל המארח');
  // חיבור חוזר: השקע של האורח נופל
  await G.evaluate(()=>{ __sim.NET.sock.close(); });
  ok(await until(G,()=>/מתחבר מחדש/.test(__sim.NET.err||''),5000),'חיבור חוזר: האורח מציג ״מתחבר מחדש…״ ולא חוזר ללבד');
  const hk=await H.evaluate(()=>{ const i=[1,2,3].map(s=>__sim.netSeatInfo(s)); return i.some(x=>x.gone); });
  ok(hk,'חיבור חוזר: המארח שומר את העמדה');
  ok(await until(G,s=>__sim.NET.mode==='guest'&&__sim.NET.seat===s&&__sim.NET.sock&&__sim.NET.sock.readyState===1,20000,s1.seat),'חיבור חוזר: האורח חזר לאותה עמדה ('+(s1.seat+1)+')');
  ok(await until(H,()=>[1,2,3].every(s=>!__sim.netSeatInfo(s).gone)&&Object.keys(__sim.NET.guests).length===1,10000),'חיבור חוזר: אצל המארח — אורח אחד, בלי עמדה תלויה');
  // N5 ברשת אמיתית
  const gs=await G.evaluate(()=>{ __sim.splitSet(true); return __sim.SPLITS.on; });
  ok(gs===false,'N5 אורח מחובר: מסך מפוצל לא נדלק');
  // חיבור חוזר נכשל (הגשר נסגר) — אחרי 3 ניסיונות חוזרים ללבד
  br.kill(); await wait(200);
  ok(await until(G,()=>__sim.NET.mode==='solo',15000),'חיבור חוזר: הגשר נעלם — אחרי 3 ניסיונות האורח חוזר ללבד');
}catch(e){ ok(false,'ERR '+(e&&e.stack||e)); }
finally{ try{ browser&&await browser.close(); }catch(e){} try{ br.kill(); }catch(e){} try{ fs.rmSync(D,{recursive:true,force:true}); }catch(e){} }
ok(errs.length===0,'אין שגיאות בדפים: '+errs.slice(0,3).join(' | '));
}

/* ══ חלק ג: הגשר של האפליקציה — P6 (N1), N2, N6, N7 ══ */
{
const { Bridge } = require(path.resolve(HERE,'../app/bridge.js'));
const WebSocket = require(path.resolve(HERE,'../app/node_modules/ws'));
const D=fs.mkdtempSync(path.join(os.tmpdir(),'bbv74ab-')); const PORT=BP+1;
const b=new Bridge({port:PORT,dataDir:D,padPath:path.resolve(HERE,'../app/pad/pad.html'),limits:{gOverMs:3000}});
try{
  ok(await b.start(),'הגשר של האפליקציה עלה ('+PORT+')');
  let h=await fetch('http://127.0.0.1:'+PORT+'/health',{headers:{Origin:'null'}}); let j=await h.json();
  ok(h.headers.get('access-control-allow-origin')==='null'&&!('pk' in j)&&!('lan' in j),'P6 /health עם Origin: null — בלי pk ובלי כתובות');
  j=await (await fetch('http://127.0.0.1:'+PORT+'/health?t='+encodeURIComponent(b.token))).json();
  ok(j.pk===b.padKey&&b.status().pk===b.padKey,'P6 עם האסימון / bridgeStatus — המפתח זמין');
  const wo=(q,opt)=>new Promise(res=>{ const w=new WebSocket('ws://127.0.0.1:'+PORT+'/ws?'+q,opt||{}); w.msgs=[]; w.on('message',(d,bin)=>w.msgs.push(bin?d:d.toString()));
    w.on('open',()=>res(w)); w.on('error',()=>res({refused:'error'})); w.on('unexpected-response',(q2,r)=>{ res({refused:r.statusCode}); try{ q2.destroy(); }catch(e){} }); });
  const sim=await wo('role=sim&t='+encodeURIComponent(b.token),{origin:'null'});
  const ph=await wo('role=pad',{origin:'http://127.0.0.1:'+PORT}); await wait(100);
  const ev=await wo('role=pad',{origin:'null'}), evf=await wo('role=pad',{origin:'file://'}); await wait(200);
  ok(ev.refused===403&&evf.refused===403&&ph.readyState===1&&!ph.msgs.some(m=>/kick/.test(m)),'P6 שלט מ-Origin: null / file:// — נדחה; הטלפון האמיתי נשאר');
  // N6
  for(let i=0;i<b.lim.failsGlobal;i++) b.fail('10.9.'+(i>>8)+'.'+(i&255));
  ok(b.gLock>Date.now()&&!b.locked('10.1.1.1')&&b.locked('10.9.0.3'),'N6 נעילה גלובלית — רק לכתובות שכבר טעו');
  b.gLock=0; b.fails.clear();
  // N2
  const host=await wo('role=host&t='+encodeURIComponent(b.token),{origin:'null'});
  const g1=await wo('role=guest&k='+b.key+'&n=a'), g2=await wo('role=guest&k='+b.key+'&n=b'); await wait(150);
  const gs=[...b.guests.values()]; const slow=gs[1]; Object.defineProperty(slow,'bufferedAmount',{get:()=>1e6});
  let n2=0; const sendOrig=slow.send.bind(slow); slow.send=(...a)=>{ n2++; return sendOrig(...a); };
  for(let i=0;i<10;i++) host.send(Buffer.alloc(1000),{binary:true}); await wait(300);
  ok(n2===0&&g1.msgs.filter(m=>Buffer.isBuffer(m)).length===10,'N2 אורח עם bufferedAmount גבוה — מדלגים על התמונות שלו, האחר מקבל 10/10');
  // N7
  host.msgs.length=0; for(let i=0;i<400;i++) g1.send('{"t":"ping"}'); await wait(400);
  const rel=host.msgs.filter(m=>/"t":"g"/.test(m)).length;
  ok(rel>=100&&rel<=140,'N7 400 הודעות ברצף מאורח → '+rel+' הגיעו למארח');
  let closed=false; g1.on('close',()=>{ closed=true; });
  const t0=Date.now(); while(Date.now()-t0<3800&&!closed){ for(let i=0;i<30;i++) g1.send('{"t":"ping"}'); await wait(20); }
  await wait(200); ok(closed,'N7 הצפה מתמשכת — האורח נותק');
  for(const w of [sim,ph,host,g2]) try{ w.close(); }catch(e){}
}catch(e){ ok(false,'ERR '+(e&&e.stack||e)); }
finally{ b.stop(); try{ fs.rmSync(D,{recursive:true,force:true}); }catch(e){} }
}
done('v74_net_test');
