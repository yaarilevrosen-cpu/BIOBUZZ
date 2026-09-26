// משחק משותף v34: שופט שמתריע לנהג אנושי, סיכום מאץ׳, השהיה והתראות ברשת
import {open,ok,done,realErrs} from './h.mjs';
import {spawn} from 'child_process';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);

// 1. נהג אנושי מצמיד — מקבל התראה לפני העבירה
let r=await E(()=>{ const S=__sim; window.S=S; S.refSetUser(true);
  S.MT.cd=0; S.MT.auto=1; S.MT.trans=1; S.MT.tele=40; S.GAME.randAuto=false;
  S.gameStart(true); const B1=S.BOTS[0]; S.BOTS[1].on=false; S.BOTS[2].on=false;
  S.humSeat(B1,'pad','שלט 2'); B1.hum.padIdx=9; S.MYAUTO.lvl='none'; B1.autoLvl='none';
  S.matchStart(); B1.autoLvl='none'; S.MYAUTO.lvl='none';
  S.advance(2.3,1/60);
  S.setPose(-57,0,90); B1.body.position.set(S.M(-38),0,S.M(0)); B1.yaw=-Math.PI/2; B1.vx=B1.vz=0;
  S.HUM.log=[]; return S.MATCH.phase; });
for(let i=0;i<10;i++) await E(()=>{ const B1=S.BOTS[0]; S.humFeed(B1,{x:0,y:1,t:0,fc:false}); S.advance(0.3,1/60); });
r=await E(()=>({log:(S.HUM.log||[]).map(e=>e.txt), pins:Object.keys(S.REF.pins), fouls:S.REF.log.filter(e=>e.rule==='G421').length,
  toast:document.getElementById('refToast').className}));
ok(r.pins.some(k=>/^כחול 1>me/.test(k)),'השופט רואה הצמדה של הנהג האנושי ('+r.pins.join(',')+')');
ok(r.log.some(t=>/שחרר/.test(t)),'הנהג מקבל התראה: '+(r.log[0]||'—'));
ok(r.log.length===1,'התראה אחת להצמדה, לא הצפה ('+r.log.length+')');
ok(/coach/.test(r.toast),'ההתראה מוצגת בכתום ('+r.toast+')');

// 2. בוט לא מקבל התראה (הוא משחרר לבד)
r=await E(()=>{ const B1=S.BOTS[0]; S.humFree(B1); return S.humOf('כחול 1'); });
ok(r===null,'בוט בלי נהג — אין למי להתריע');

// 3. סיכום מאץ׳ משותף
r=await E(()=>{ const B1=S.BOTS[0]; S.humSeat(B1,'pad','שלט 2'); B1.hum.padIdx=9; B1.shots=5; B1.hits=4;
  S.advance(40,1/60);
  const el=document.getElementById('mpSum');
  return {phase:S.MATCH.phase, hidden:el.hidden, rows:el.querySelectorAll('tr').length-1, txt:el.textContent.slice(0,200),
    last:S.MP.last&&S.MP.last.rows.map(x=>x.name+':'+x.kind)}; });
ok(r.phase==='סיום','המאץ׳ נגמר');
ok(!r.hidden&&r.rows===2,'חלון הסיכום נפתח עם שורה לכל רובוט בזירה ('+r.rows+')');
ok(r.last&&r.last.some(x=>/^שלט \d+:שלט$/.test(x)),'הנהג בשלט מופיע בשמו ('+(r.last||[]).join(' ')+')');
await page.evaluate(()=>{ window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16); });
await page.waitForTimeout(300);
try{ await page.screenshot({path:'mp-sum.png',timeout:60000}); }catch(e){ console.log('  (צילום מסך דולג)'); }
r=await E(()=>{ S.matchStart(); return document.getElementById('mpSum').hidden; });
ok(r,'מאץ׳ חדש סוגר את הסיכום');
r=await E(()=>{ S.matchStop(); for(const b of S.BOTS) S.humFree(b); S.gameStart(false); S.MATCH.phase='idle'; return S.mpActive(); });
ok(r===false,'משחק לבד — אין סיכום משותף');
await browser.close();

// 4. ברשת אמיתית: גשר + מארח + אורח
const br=spawn('python3',['../pad/padbridge.py','--port','9662','--no-adb','--key','1234'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1500));
try{
  const H=await open(), G=await open();
  await H.page.evaluate(()=>{ __sim.netHost(9662); });
  await H.page.waitForFunction(()=>__sim.NET.sock&&__sim.NET.sock.readyState===1&&__sim.NET.key,null,{timeout:20000});
  const key=await H.page.evaluate(()=>__sim.NET.key);
  await G.page.evaluate(k=>{ __sim.netJoin('127.0.0.1:9662#'+k,'דני'); },key);
  await G.page.waitForFunction(()=>__sim.NET.seat!==null&&__sim.NET.seat!==undefined,null,{timeout:30000});
  ok(true,'האורח התיישב');
  await G.page.waitForFunction(()=>__sim.NET.rtt>0,null,{timeout:30000}).catch(()=>{});
  const trace=[];
  for(let i=0;i<8;i++){ await G.page.waitForTimeout(2500); trace.push(Math.round(await G.page.evaluate(()=>__sim.NET.rtt||0))); }
  console.log('    השהיה לאורך זמן:',trace.join(' → '));
  const grtt=trace[trace.length-1];
  /* בסביבת הבדיקה כל פריים של דפדפן תוכנה לוקח שנייה-שתיים, וההודעה מחכה לסוף הפריים —
     לכן כאן בודקים שהמדידה קיימת ועקבית, לא שהיא קטנה. במחשב אמיתי זה מילישניות. */
  ok(grtt>0&&grtt<15000&&trace.every(v=>v>0),'האורח מודד השהיה ('+grtt.toFixed(0)+' מ״ש בסביבת הבדיקה)');
  await H.page.waitForFunction(()=>Object.values(__sim.NET.guests).some(g=>g.rtt>0),null,{timeout:30000}).catch(()=>{});
  const hr=await H.page.evaluate(()=>{ __sim.netRefresh(); return {g:Object.values(__sim.NET.guests).map(g=>g.rtt||0), html:document.getElementById('oNet').textContent}; });
  ok(hr.g.some(v=>v>0)&&/השהיה/.test(hr.html),'המארח רואה את ההשהיה של כל אורח ('+hr.g.map(v=>Math.round(v)).join(',')+')');
  await H.page.evaluate(()=>{ const b=__sim.BOTS.find(o=>o.hum&&o.hum.src==='net'); __sim.humWarn(b,'שחרר! בדיקה','coach'); });
  await G.page.waitForFunction(()=>(__sim.HUM.log||[]).some(e=>/בדיקה/.test(e.txt)),null,{timeout:20000}).catch(()=>{});
  const gl=await G.page.evaluate(()=>({log:(__sim.HUM.log||[]).map(e=>e.txt), toast:document.getElementById('refToast').textContent}));
  ok(gl.log.some(t=>/בדיקה/.test(t))&&/בדיקה/.test(gl.toast),'התראה של השופט מגיעה לאורח ומוצגת אצלו');
  await H.page.evaluate(()=>{ const b=__sim.BOTS.find(o=>o.hum&&o.hum.src==='net'); b.shots=3; b.hits=2; __sim.mpMatchEnd(); });
  await G.page.waitForFunction(()=>!document.getElementById('mpSum').hidden,null,{timeout:20000}).catch(()=>{});
  const gs=await G.page.evaluate(()=>({hid:document.getElementById('mpSum').hidden, t:document.getElementById('mpSum').textContent}));
  ok(!gs.hid&&/דני/.test(gs.t),'הסיכום מגיע לאורח עם השם שלו');
  try{ await G.page.screenshot({path:'mp-guest.png',timeout:60000}); }catch(e){}
  ok(realErrs(H.errs).length===0&&realErrs(G.errs).length===0,'אין שגיאות במארח ובאורח: '+realErrs(H.errs).concat(realErrs(G.errs)).slice(0,2).join(' | '));
  await H.browser.close(); await G.browser.close();
} finally { br.kill(); }
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,2).join(' | '));
done('mp2_test');
