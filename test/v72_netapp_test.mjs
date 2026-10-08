// v72 netapp (1.12.5) — רשת: שעון האורח, טלפון אחד בכל רגע, מפתח לשלט בקוד ה-QR, עמדה של אורח, שמות בשידור,
// תוצאה סופית אצל אורח, לוח לצופה, מארח שיצא, נעילת עמדות בתחרות, bldNorm עם ״constructor״
import {open,ok,done} from './h.mjs';
import { chromium } from 'playwright';
import {spawn} from 'child_process';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ── חלק א: דף אחד (ווים) ──
{
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
// N9
let r=await E(()=>{ const X=__sim.v72netapp; const B=X.bldNorm({drive:'constructor',intake:'__proto__',shoot:'toString'});
  return {d:B.drive,i:B.intake,s:B.shoot,has:X.bldHas({a:1},'constructor')}; });
ok(r.d==='tank6'||typeof r.d==='string'&&r.d!=='constructor','N9 drive ״constructor״ → בנייה רגילה ('+r.d+')');
ok(r.i!=='__proto__'&&r.s!=='toString'&&r.has===false,'N9 intake/shoot מפתחות של Object → ברירת מחדל');
r=await E(()=>{ const S=__sim; const B=S.v72netapp.bldNorm({drive:'constructor',intake:'constructor',shoot:'constructor'});
  let n=null; try{ n=S.bldSum?S.bldSum(B):null; }catch(e){ n='throw'; } return JSON.stringify(n); });
ok(!/NaN|null|throw/.test(r),'N9 סכום המנועים מספר תקין: '+r.slice(0,80));
// N3
r=await E(()=>{ const S=__sim; S.gameStart(true); const b=S.BOTS[2]; S.humSeat(b,'net','x'); b.hum.id='gX';
  const res=S.phoneSetSeat(2); const still=b.hum&&b.hum.src;
  S.humFree(b); const res2=S.phoneSetSeat(2); const now=b.hum&&b.hum.src; S.phoneSetSeat(-1);
  return {res,still,res2,now,opt:!!document.querySelector('#qrSeat option[value="2"]')}; });
ok(r.res===false&&r.still==='net','N3 טלפון לא לוקח רובוט שאורח ברשת נוהג בו');
ok(r.now==='phone','N3 רובוט פנוי — הטלפון כן לוקח');
// N6
r=await E(()=>{ const S=__sim; S.brdDo({o:'tok',i:0,x:11,z:-7},[{o:'tok',i:0,x:0,z:0}]); const t0=JSON.stringify(S.BRD.tok);
  S.NET.mode='guest'; S.NET.spec=true;
  const a=S.brdResetTok(), b=S.brdUndo(); const t1=JSON.stringify(S.BRD.tok);
  S.brdOpen(); const hid=['undo','clear','reset'].map(k=>{ const e=document.querySelector('#brdBox [data-brd="'+k+'"]'); return e?e.hidden:true; });
  S.brdClose(); S.NET.mode='solo'; S.NET.spec=false; S.brdOpen(); const vis=document.querySelector('#brdBox [data-brd="undo"]'); const v=vis?!vis.hidden:true; S.brdClose();
  return {a,b,same:t0===t1,hid,v}; });
ok(r.a===0&&r.b===false&&r.same,'N6 צופה: איפוס רובוטים ו-Ctrl+Z לא משנים את הלוח');
ok(r.hid.every(Boolean)&&r.v,'N6 צופה: כפתורי ביטול/ניקוי/איפוס מוסתרים (וחוזרים כשלא צופים)');
// N1 + N4 (הודעת room)
r=await E(()=>{ const S=__sim, X=S.v72netapp; S.MT.auto=30; S.MT.trans=8; S.MT.tele=120;
  S.NET.mode='guest'; X.netRoomExtra({mt:[0,0,120],bc:{red:'HOSTTEAM',blue:'VISIT'},lk:1});
  const o={ta:S.tAuto(),te:S.tEnd(),bc:S.v72netapp.bcNames(),lk:S.NET.seatLock};
  S.MATCH.on=true; S.MATCH.t=5; S.refreshClock(); o.ph=document.getElementById('clkPhase').textContent;
  X.netRoomExtra({}); o.old=[S.tAuto(),S.tEnd()];
  S.MATCH.on=false; S.NET.mode='solo'; X.netRoomExtra({}); S.refreshClock(); return o; });
ok(r.ta===0&&r.te===120&&/טלאופ|TeleOp/i.test(r.ph),'N1 אורח: אורכי השלבים של המארח (0/0/120) → '+r.ph);
ok(r.old[0]===30&&r.old[1]===158,'N1 מארח ישן (בלי mt) — כמו קודם');
ok(r.bc.red==='HOSTTEAM'&&r.bc.blue==='VISIT'&&r.lk===true,'N4 שמות השידור של המארח אצל האורח');
// N8
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.NET.mode='host'; S.NET.guests={gA:{name:'a',spec:false,seat:3}};
  S.gameStart(true); const b=S.BOTS[2]; S.humSeat(b,'net','a'); b.hum.id='gA';
  const sent=[]; const s0=S.NET.sock; S.NET.sock={readyState:1,send:x=>sent.push(x)};
  S.MATCH.on=true; S.MATCH.cd=0; const tgt=[1,2,3].find(s=>S.netSeatInfo(s).kind==='bot');
  S.netFromGuest('gA',{t:'want',seat:tgt}); const mid=S.netSeatInfo(3).kind;
  S.setRealm('open'); S.netFromGuest('gA',{t:'want',seat:tgt}); const op=S.netSeatInfo(tgt).kind;
  S.MATCH.on=false; S.setRealm('comp'); S.NET.sock=s0; S.v72netapp.netUnseat('gA',true); S.NET.mode='solo'; S.NET.guests={};
  return {mid,op,nowant:sent.some(x=>/"t":"nowant"/.test(x))}; });
ok(r.mid==='net'&&r.nowant,'N8 תחרות, מאץ׳ רץ: בקשת עמדה נדחית (והאורח מקבל הודעה)');
ok(r.op==='net','N8 מצב פתוח: החלפת עמדה עובדת כמו קודם');
// N7
r=await E(()=>{ const S=__sim; S.NET.mode='guest'; S.MATCH.on=true; S.MATCH.netMirror=true; S.MATCH.t=40;
  S.v72netapp.netHostGone(); const o={on:S.MATCH.on,toast:document.getElementById('refToast').textContent};
  S.NET.err='הגשר פתוח אבל אין מארח שפתח חדר'; S.v72netapp.netRoomExtra({}); o.err=S.NET.err; S.NET.mode='solo'; return o; });
ok(r.on===false&&/המארח יצא|host left/i.test(r.toast),'N7 המארח יצא: הודעה על המסך והמאץ׳ המשוקף נעצר');
ok(r.err==='','N7 הודעת room מהמארח שחזר מנקה את ההערה');
// N5 — אורח: אין שידור חוזר → התוצאה חוזרת
r=await E(async()=>{ const S=__sim; S.NET.mode='guest'; S.bcSet(true); S.BC.ended=false; S.MATCH.on=false; S.MATCH.cd=0; S.MATCH.phase='סיום';
  S.bcTick(0.1); const a=document.getElementById('bcFinal').hidden; await new Promise(r=>setTimeout(r,5200));
  const b=document.getElementById('bcFinal').hidden; S.bcSet(false); S.NET.mode='solo'; S.MATCH.phase='idle'; return {a,b}; });
ok(r.a===false&&r.b===false,'N5 אורח: כרטיס התוצאה נשאר אחרי 5 שניות (אין שידור חוזר אצל אורח)');
// P9 — הקישור ב-QR כולל את מפתח השלט
r=await E(async()=>{ const S=__sim, X=S.v72netapp; const f0=window.fetch;
  window.fetch=async()=>({json:async()=>({lan:['10.0.0.7'],port:9662,pk:'AbCdEfGhIjKlMnOpQr_-12'})});
  await X.phoneFindUrl(); const u1=X.PHN().url;
  window.fetch=async()=>({json:async()=>({lan:['10.0.0.7'],port:9662})}); await X.phoneFindUrl(); const u2=X.PHN().url;
  window.fetch=f0; return {u1,u2}; });
ok(r.u1==='http://10.0.0.7:9662/?p=AbCdEfGhIjKlMnOpQr_-12','P9 קישור ה-QR עם המפתח: '+r.u1);
ok(r.u2==='http://10.0.0.7:9662/','P9 גשר ישן בלי מפתח — קישור כמו קודם');
// English: no Hebrew in the new strings
r=await E(()=>{ const d=JSON.parse(document.getElementById('i18nX_v72netapp').textContent); return Object.values(d).filter(v=>/[֐-׿]/.test(v)).length; });
ok(r===0,'תרגומים לאנגלית בלי עברית');
ok(errs.filter(e=>!/WebSocket|ERR_CONNECTION_REFUSED|favicon/.test(e)).length===0,'אין שגיאות בדף: '+errs.slice(0,2).join(' | '));
// אנגלית: ההודעות החדשות בלי עברית
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); }); await page.reload({timeout:120000});
await page.waitForFunction(()=>window.__sim&&window.__sim.v72netapp,null,{timeout:120000});
r=await E(()=>{ const S=__sim, X=S.v72netapp, out=[];
  S.gameStart(true); const b=S.BOTS[2]; S.humSeat(b,'net','x'); b.hum.id='gX'; S.phoneSetSeat(2); out.push(document.getElementById('refToast').textContent); S.humFree(b);
  S.NET.mode='guest'; X.netHostGone(); out.push(document.getElementById('refToast').textContent);
  S.NET.seatLock=true; S.NET.seats=[{kind:'host',name:'h',ally:'red'},{kind:'bot',name:'b',ally:'blue'},{kind:'bot',name:'b',ally:'blue'},{kind:'bot',name:'b',ally:'red'}]; S.NET.seat=3;
  S.netRefresh(); const lk=document.querySelector('#netSeats .v72lk'); out.push(lk?lk.textContent:'(none)');
  S.NET.mode='solo'; S.NET.seatLock=false; S.NET.seat=null; S.NET.seats=[]; localStorage.removeItem('bbLang1'); return out; });
ok(r.every(t=>t&&t!=='(none)'&&!/[\u0590-\u05FF]/.test(t)),'אנגלית: '+r.join(' | '));
await browser.close();
}

// ── חלק ב: הגשר האמיתי (פייתון) — שני טלפונים, מפתח שלט, מארח + אורח ──
{
const D=fs.mkdtempSync(path.join(os.tmpdir(),'bbv72na-'));
fs.copyFileSync(path.resolve(HERE,'../pad/padbridge.py'),path.join(D,'padbridge.py'));
/* הסימולטור מהגשר: הספריות בתוך הקובץ (הגשר לא מגיש lib/) */
let html=fs.readFileSync(path.resolve(HERE,'sim.html'),'utf8');
html=html.replace(/<script src="lib\/([A-Za-z_.]+\.js)"><\/script>/g,(m,n)=>'<script>'+fs.readFileSync(path.resolve(HERE,'lib',n),'utf8').replace(/<\/script/g,'<\\/script')+'</script>');
fs.writeFileSync(path.join(D,'simi.html'),html);
const BP=String(+(process.env.BB_PORT||8905)+900);   // 8905 → 9805
const br=spawn('python3',[path.join(D,'padbridge.py'),'--port',BP,'--no-adb','--key','1234','--sim',path.join(D,'simi.html')],{stdio:'ignore',cwd:D});
await wait(1500);
const PK=fs.readFileSync(path.join(D,'.pad-key'),'utf8').trim();
const LAN=JSON.parse(await (await fetch('http://127.0.0.1:'+BP+'/health')).text()).lan||[];
const ip=LAN[0]||'';
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--proxy-server=direct://','--proxy-bypass-list=*']});
const errs=[];
const until=(P,f,t,a)=>P.waitForFunction(f,a,{timeout:t||60000}).then(()=>true,()=>false);
async function mk(url,tag){
  const ctx=await browser.newContext({viewport:{width:1100,height:700}}); const page=await ctx.newPage();
  await page.addInitScript(()=>{ try{ localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); }catch(e){} });
  page.on('pageerror',e=>errs.push(tag+': '+e));
  await page.goto(url,{timeout:90000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:90000});
  await page.evaluate(()=>{ try{ __sim.renderer.render=()=>{}; }catch(e){} });
  return page; }
try{
  ok(/^[A-Za-z0-9_-]{16,64}$/.test(PK),'P9 הגשר יצר מפתח שלט ושמר אותו');
  const hj=JSON.parse(await (await fetch('http://127.0.0.1:'+BP+'/health')).text());
  ok(hj.pk===PK,'P9 /health (רק מהמחשב הזה) מחזיר את המפתח לקוד ה-QR');
  if(ip){
    const r0=await fetch('http://'+ip+':'+BP+'/'); const t0=await r0.text();
    ok(r0.status===403&&/סרקו שוב/.test(t0)&&/scan it again/.test(t0),'P9 קישור ישן (בלי מפתח) מהרשת → הודעה ברורה ('+r0.status+')');
    ok((await fetch('http://'+ip+':'+BP+'/?p='+PK)).status===200,'P9 קישור עם המפתח → דף השלט');
    ok((await fetch('http://'+ip+':'+BP+'/?p=AAAAAAAAAAAAAAAAAAAAAA')).status===403,'P9 מפתח שגוי → נחסם');
  } else ok(true,'(אין כתובת רשת במכונה — בדיקות ״מהרשת״ דולגו)');
  // N2 — שני טלפונים
  const H=await mk('http://127.0.0.1:'+BP+'/sim?nocad=1','H');
  await H.evaluate(()=>{ const V=__sim.VPAD; V.port=+location.port; V.kick=true; V.tries=0; V.retry=0; });
  ok(await until(H,()=>__sim.VPAD.sock&&__sim.VPAD.sock.readyState===1,20000),'הסימולטור מחובר לגשר (שלט)');
  const ctx=await browser.newContext(); const base=ip?'http://'+ip+':'+BP+'/?p='+PK:'http://127.0.0.1:'+BP+'/';
  const P1=await ctx.newPage(); await P1.goto(base,{timeout:30000});
  ok(await until(P1,()=>document.getElementById('led').classList.contains('ok'),15000),'N2/P9 טלפון ראשון מחובר '+(ip?'(מהרשת, עם מפתח)':'(מקומי)'));
  const P2=await ctx.newPage(); await P2.goto(base,{timeout:30000});
  await P2.evaluate(()=>{ const ws=new WebSocket('ws://'+location.host+'/ws?role=pad'+location.search.replace('?','&')); ws.onopen=()=>setInterval(()=>ws.send(JSON.stringify({t:'s',a:[0,-1,0,0],b:0,lt:0,rt:0})),50); });
  ok(await until(P1,()=>document.getElementById('kick').classList.contains('on'),15000),'N2 טלפון שני התחבר → הראשון מקבל ״טלפון אחר לקח את השלט״');
  await P1.waitForTimeout(3000);
  const samples=[]; for(let i=0;i<20;i++){ samples.push(await H.evaluate(()=>{ const V=__sim.VPAD; return V&&V.pad?V.pad.axes[1]:'none'; })); await H.waitForTimeout(60); }
  ok(samples.filter(v=>v===-1).length===20,'N2 הסטיק לא קופץ לאפס: '+samples.filter(v=>v===-1).length+'/20 דגימות = ‎-1 '+samples.slice(0,4).join(',')+' '+await H.evaluate(()=>JSON.stringify({on:__sim.VPAD.on,st:__sim.VPAD.sock&&__sim.VPAD.sock.readyState,url:__sim.VPAD.url})));
  ok(await P1.evaluate(()=>!document.getElementById('led').classList.contains('ok')),'N2 הטלפון שהוחלף לא מתחבר שוב לבד');
  if(ip){ const ws=await P1.evaluate(()=>new Promise(res=>{ const w=new WebSocket('ws://'+location.host+'/ws?role=pad'); w.onopen=()=>res('open'); w.onclose=()=>res('closed'); }));
    ok(ws==='closed','P9 חיבור שלט מהרשת בלי מפתח — נדחה'); }
  await ctx.close();
  // N1/N4/N7/N8 — מארח + אורח דרך הגשר
  await H.evaluate(()=>{ __sim.BC.red='HOSTTEAM'; __sim.BC.blue='VISITORS'; __sim.setRealm('comp'); __sim.netHost(+location.port); });
  ok(await until(H,()=>__sim.NET.sock&&__sim.NET.sock.readyState===1&&__sim.NET.key),'מארח פתח חדר');
  const G=await mk('http://127.0.0.1:'+BP+'/join?k=1234&nocad=1','G');
  ok(await until(G,()=>__sim.NET.seat!=null&&__sim.NET.snaps.length>0,90000),'אורח ישב');
  await H.evaluate(()=>{ const S=__sim; S.MT.auto=0; S.MT.trans=0; S.MT.tele=120; S.MT.cd=0; S.matchStart(); });
  await until(G,()=>__sim.MATCH.on&&__sim.MATCH.t>3,60000); await G.waitForTimeout(800);
  const q=P=>P.evaluate(()=>({ph:document.getElementById('clkPhase').textContent,tm:document.getElementById('clkTime').textContent,bc:__sim.v72netapp.bcNames()}));
  const ch=await q(H), cg=await q(G);
  ok(ch.ph===cg.ph&&Math.abs(parseInt(ch.tm.split(':')[0])-parseInt(cg.tm.split(':')[0]))===0&&/טלאופ/.test(cg.ph),'N1 שעון האורח = שעון המארח (מארח '+ch.ph+' '+ch.tm+' · אורח '+cg.ph+' '+cg.tm+')');
  ok(cg.bc.red===ch.bc.red&&cg.bc.blue===ch.bc.blue,'N4 שמות השידור אצל האורח כמו אצל המארח ('+cg.bc.red+' / '+cg.bc.blue+')');
  const before=await G.evaluate(()=>__sim.NET.seat);
  const lockUi=await until(G,()=>__sim.NET.seatLock===true&&!document.querySelector('#netSeats button[data-want]'),10000);
  await G.evaluate(()=>{ const a=__sim.NET.seats; for(let s=1;s<4;s++) if(a[s]&&a[s].kind==='bot'){ __sim.v72netapp.netSend({t:'want',seat:s}); break; } });
  await G.waitForTimeout(1500);
  ok(lockUi&&await G.evaluate(b=>__sim.NET.seat===b,before),'N8 תחרות: האורח לא מחליף עמדה באמצע מאץ׳ (ואין כפתור ״לשבת כאן״)');
  await H.close(); await G.waitForTimeout(3000);
  const g2=await G.evaluate(()=>({on:__sim.MATCH.on,toast:document.getElementById('refToast').textContent,err:__sim.NET.err}));
  ok(g2.on===false&&/המארח יצא/.test(g2.toast),'N7 המארח יצא → הודעה על המסך והמאץ׳ אצל האורח נעצר');
}catch(e){ ok(false,'ERR '+e); }
finally{ await browser.close(); br.kill(); try{ fs.rmSync(D,{recursive:true,force:true}); }catch(e){} }
ok(errs.length===0,'אין שגיאות בדפים: '+errs.slice(0,3).join(' | '));
}
done('v72_netapp_test');
