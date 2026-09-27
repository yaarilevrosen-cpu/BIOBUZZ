// v60 — גרפיקה מלאה כברירת מחדל, חיפוש יכולות (Ctrl+K), תשעה תרגילים, סיכום למאמן, סקינים
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
// 1. גרפיקה
let r=await E(()=>({mode:__sim.QUAL?__sim.QUAL.mode:null, on:[...document.querySelectorAll('#qualSeg button.on')].map(b=>b.dataset.q)}));
ok(r.on.join()==='high','ברירת מחדל: גרפיקה מלאה ('+r.on+')');
// 2. חיפוש
r=await E(()=>{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',code:'KeyK',ctrlKey:true,bubbles:true}));
  return {open:!document.getElementById('cmdk').hidden, focus:document.activeElement&&document.activeElement.id}; });
ok(r.open,'Ctrl+K פותח את החיפוש');
const q=async s=>E(s=>{ const i=document.getElementById('cmdkIn'); i.value=s; i.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#cmdkList .cmdkIt b')].map(b=>b.textContent); },s);
let L=await q('מסך מפוצל'); ok(/מסך מפוצל/.test(L[0]||''),'״מסך מפוצל״ ← '+L[0]);
L=await q('מקשים'); ok(L.slice(0,3).some(x=>/מקשים|מקלדת/.test(x)),'״מקשים״ ← '+L.slice(0,3).join(' | '));
L=await q('רודראנר'); ok(/אוטונומי/.test(L[0]||''),'״רודראנר״ ← '+L[0]);
L=await q('split screen'); ok(/מסך מפוצל/.test(L[0]||''),'חיפוש באנגלית ← '+L[0]);
L=await q('בגיבוי'); ok(L.some(x=>/גיבוי/.test(x)),'תחילית ״ב״ מורדת ← '+L[0]);
L=await q('כיול'); ok(L.length>0,'לוחות מהמעבדה נמצאים (״כיול״ ← '+L[0]+')');
r=await E(()=>__sim.cmdkIndex().length); ok(r>80,'באינדקס '+r+' יכולות (ידני + כל הלוחות)');
L=await q('עוזר'); ok(!L.some(x=>/שאל את העוזר/.test(x)),'בלי מפתח (ובדפדפן) — אין ״שאל את העוזר״');
// הפעלה: Enter על ״מסך מפוצל״ פותח את המפוצל
r=await E(()=>{ const i=document.getElementById('cmdkIn'); i.value='מסך מפוצל'; i.dispatchEvent(new Event('input'));
  i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return {closed:document.getElementById('cmdk').hidden, split:__sim.SPLIT?__sim.SPLIT.on:document.body.classList.contains('split2')}; });
ok(r.closed&&r.split,'Enter מפעיל: המסך המפוצל נפתח');
await E(()=>{ const b=document.getElementById('ppSplit'); if(b) b.click(); });
// לוח במעבדה: נפתח ועובר לבדיקות
r=await E(()=>{ __sim.cmdkOpen(); const i=document.getElementById('cmdkIn'); i.value='מקלדת מה כל מקש'; i.dispatchEvent(new Event('input'));
  const res=__sim.CMDK.res.map(c=>c.n); __sim.cmdkRun(0);
  const d=[...document.querySelectorAll('#rail details>summary')].find(s=>/מקלדת — מה כל מקש/.test(s.textContent));
  return {res:res[0], mode:__sim.UI.mode, ws:document.body.dataset.ws, open:d&&d.parentElement.open}; });
ok(r.mode==='lab'&&r.ws==='drive'&&r.open,'לוח מהמעבדה: עובר לבדיקות, ללשונית, ופותח אותו ('+r.res+')');
await E(()=>__sim.uiSetMode('play'));
// 3. תרגילים
r=await E(()=>({n:document.querySelectorAll('#ppDrills [data-drill]').length, names:Object.keys(__sim.DRILL.N)}));
ok(r.n===9&&r.names.length===9,'תשעה תרגילים בלוח ('+r.names.join(',')+')');
r=await E(()=>{ __sim.drillStart('defense'); const on=__sim.BOTS.filter(b=>b.on); return {on:__sim.DRILL.on, n:on.length, roles:on.map(b=>b.role), ally:on.map(b=>b.ally), my:__sim.myAlly?__sim.myAlly():null}; });
ok(r.on==='defense'&&r.n===1&&r.roles[0]==='defend','מול בולם: רובוט יריב אחד בתפקיד בולם ('+JSON.stringify(r)+')');
r=await E(()=>{ __sim.matchStop(); __sim.drillStart('pressure'); const on=__sim.BOTS.filter(b=>b.on); return {n:on.length, t:__sim.MT?__sim.MT.tele:null}; });
ok(r.n===2,'לחץ: שני יריבים ('+r.n+')');
r=await E(()=>{ __sim.matchStop(); __sim.drillStart('auto'); return {on:__sim.DRILL.on, auto:__sim.MT.auto, tele:__sim.MT.tele, trans:__sim.MT.trans}; });
ok(r.on==='auto'&&r.auto===30&&r.tele===0&&r.trans===0,'אוטונומי בלבד: 30 שנ׳ ותו לא ('+JSON.stringify(r)+')');
r=await E(()=>{ const t0=performance.now(); while(performance.now()-t0<4000&&(__sim.MATCH.on||__sim.MATCH.cd>0)) __sim.advance(0.5,1/30);
  return {on:__sim.MATCH.on, ph:__sim.MATCH.phase, best:__sim.DRILL.best.auto, drill:__sim.DRILL.on}; });
if(r.on) r=await E(()=>{ const t0=performance.now(); while(performance.now()-t0<4000&&(__sim.MATCH.on||__sim.MATCH.cd>0)) __sim.advance(0.5,1/30); return {on:__sim.MATCH.on, ph:__sim.MATCH.phase, best:__sim.DRILL.best.auto, drill:__sim.DRILL.on}; });
if(r.on) r=await E(()=>{ const t0=performance.now(); while(performance.now()-t0<4000&&(__sim.MATCH.on||__sim.MATCH.cd>0)) __sim.advance(0.5,1/30); return {on:__sim.MATCH.on, ph:__sim.MATCH.phase, best:__sim.DRILL.best.auto, drill:__sim.DRILL.on}; });
ok(!r.on&&r.best!=null&&r.drill===null,'אוטונומי בלבד: נגמר אחרי האוטונומי ונרשם שיא ('+JSON.stringify(r)+')');
// 3 מחזורים על זמן: מתחילים ריקים, כל ריקון מחסנית = מחזור
r=await E(()=>{ __sim.drillStart('speed'); const clip0=__sim.clip.length; let g=0; while(!__sim.MATCH.on&&g++<200) __sim.advance(0.1,1/30);
  __sim.advance(2,1/30); for(let i=0;i<3;i++) __sim.drillFire({logEntry:{range:40}}); return {clip0, best:__sim.DRILL.best.speed, on:__sim.DRILL.on, m:__sim.MATCH.on}; });
ok(r.clip0===0&&r.best>0&&r.on===null&&!r.m,'3 מחזורים: מחסנית ריקה בהתחלה, שלושה ריקונים = זמן נרשם והמאץ׳ נעצר ('+JSON.stringify(r)+')');
// דיוק מרחוק: יריה קרובה לא נספרת, רחוקה כן
r=await E(()=>{ __sim.drillStart('far'); const D=__sim.DRILL;
  __sim.drillFire({logEntry:{range:30,hit:true}}); const a=D.far.length;
  for(let i=0;i<10;i++) __sim.drillFire({logEntry:{range:60,hit:i<7}}); return {a,b:D.far.length}; });
ok(r.a===0&&r.b===10,'דיוק מרחוק: קרוב מ-48″ לא נספר, רחוק כן ('+r.a+'→'+r.b+')');
r=await E(()=>{ const t0=performance.now(); while(performance.now()-t0<3000&&__sim.DRILL.on==='far') __sim.advance(0.5,1/30); return new Promise(res=>setTimeout(()=>res({on:__sim.DRILL.on,best:__sim.DRILL.best.far}),600)); });
ok(r.on===null&&r.best===7,'דיוק מרחוק: 7/10 נרשם ('+JSON.stringify(r)+')');
// חניה על זמן: מתחילים רחוק, השיא ״נמוך יותר = טוב יותר״
r=await E(()=>{ __sim.drillStart('park'); const x=__sim.I(__sim.botBody.position.x); return {on:__sim.DRILL.on, x, lz:__sim.myInLZ()}; });
ok(r.on==='park'&&!r.lz&&Math.abs(r.x)>40,'חניה על זמן: מתחילים רחוק מאזור הטעינה (x='+r.x.toFixed(0)+')');
r=await E(()=>{ const D=__sim.DRILL; D.best.park=20; __sim.drillStart('park'); D.t0=__sim.simT()-12.4; const s=__sim.myAlly()==='red'?-1:1; __sim.setPose(s*64,-35,0);
  return new Promise(res=>setTimeout(()=>res({best:D.best.park,on:D.on,lz:__sim.myInLZ()}),900)); });
ok(r.on===null&&r.best<20,'חניה: זמן קצר יותר = שיא חדש ('+JSON.stringify(r)+')');
// 4. סיכום למאמן (בלי רשת) — רק מספרים
r=await E(()=>{ const a=[]; for(let i=0;i<25;i++) a.push({at:1e12+i*1000,ally:'red',my:40+i,opp:30,win:1,shots:10,hits:6+(i%3),fouls:i%4?0:1,leave:true,park:i%2===0,autoPts:10,avgCycle:9-i*0.1,kind:'match',skill:1,sh:[],bl:[[0,0],[1,1]],pts:{tip:0,cell:30,flower:5,garden:0,leave:3,park:5}});
  localStorage.setItem('bbSeason1',JSON.stringify(a)); const s=__sim.coachSummary(); return s; });
ok(r&&r.scope==='driver'&&r.analyzed===25&&r.trend.prev10AvgPoints>0&&r.winRate===1&&r.trend.last10AvgPoints>r.trend.prev10AvgPoints,'סיכום נבנה: 25 משחקים, מגמה עולה ('+r.trend.prev10AvgPoints+'→'+r.trend.last10AvgPoints+')');
ok(r.accuracy>0.6&&r.accuracy<0.8&&r.avgCycleSec>7.5&&r.avgCycleSec<8.1&&r.autoAvgPoints===10&&r.foulsPerMatch>0,'המספרים בסיכום נכונים (דיוק '+r.accuracy+', מחזור '+r.avgCycleSec+')');
ok(!/[A-Za-z0-9_\-]{35,}/.test(JSON.stringify(r))&&!('email' in r),'בסיכום אין מזהים ארוכים או מייל');
r=await E(()=>({bar:document.getElementById('coachBar').hidden, html:document.getElementById('coachBar').innerHTML}));
ok(r.bar,'בדפדפן אין כפתור ״נתח אותי״');
// 5. סקינים
r=await E(()=>{ __sim.uiSetMode('play'); document.getElementById('ppSkins').click(); const m=document.getElementById('skinBox');
  return {open:!m.hidden, rows:m.querySelectorAll('.skRow').length, sw:m.querySelectorAll('.skRow')[0].querySelectorAll('button').length}; });
ok(r.open&&r.sw===11,'״🎨 סקינים״ מלוח המשחק: חלון עם 11 סקינים ('+r.rows+' שורות)');
r=await E(()=>{ const P0=JSON.stringify([__sim.P.botW,__sim.P.botL,__sim.botBody.mass]);
  document.querySelector('#skinRows [data-skin="-1|hive"]').click();
  const mats=new Set(); __sim.bot.group.traverse(o=>{ if(o.isMesh) mats.add(o.material.color&&o.material.color.getHexString()); });
  const band=__sim.bot.group.children.find(o=>o.userData&&o.userData.allyBand);
  return {me:__sim.SKIN.me, saved:JSON.parse(localStorage.getItem('bbSkin1')).me, hasYellow:mats.has('ffc21a'), band:!!band, bandCol:band&&band.children[0].material.color.getHexString(), same:P0===JSON.stringify([__sim.P.botW,__sim.P.botL,__sim.botBody.mass])}; });
ok(r.me==='hive'&&r.saved==='hive'&&r.hasYellow,'סקין לרובוט שלי: מוחל ונשמר לנהג');
ok(r.band&&r.bandCol==='ff3b30','פס הברית: אדום סביב הרובוט שלי ('+r.bandCol+')');
ok(r.same,'מראה בלבד — מידות ומסה לא השתנו');
r=await E(()=>{ __sim.rebuildRobot(); let y=false; __sim.bot.group.traverse(o=>{ if(o.isMesh&&o.material.color&&o.material.color.getHexString()==='ffc21a') y=true; }); return y; });
ok(r,'אחרי בנייה מחדש של הרובוט (שינוי פרמטר) — הסקין נשאר');
r=await E(()=>{ __sim.drillStart('pressure'); __sim.skinSet(0,'neon'); __sim.skinSet(1,'candy'); __sim.skinSet(2,'chrome');
  const B=__sim.BOTS; const band=b=>b.group.children.find(o=>o.userData&&o.userData.allyBand).children[0].material.color.getHexString();
  return {b0:B[0].matBody.color.getHexString(), b1:B[1].matBody.color.getHexString(), band0:band(B[0]), ring0:B[0].ring.material.color.getHexString(), saved:JSON.parse(localStorage.getItem('bbSkin1')).bots}; });
ok(r.b0==='14181c'&&r.b1==='ff8cc4','סקין לכל בוט בנפרד (ניאון, סוכרייה)');
ok(r.band0==='2d8cff'&&r.ring0!=='','בוט כחול בסקין — הפס נשאר כחול');
ok(r.saved.join()==='neon,candy,chrome','שלושת הבוטים נשמרים');
// ברית מתחלפת → הפס מתחלף
r=await E(()=>new Promise(res=>{ __sim.matchStop(); __sim.SETUP.ally='blue'; setTimeout(()=>{ const band=__sim.bot.group.children.find(o=>o.userData&&o.userData.allyBand); res({ally:__sim.myAlly(),col:band.children[0].material.color.getHexString()}); },900); }));
ok(r.ally==='blue'&&r.col==='2d8cff','החלפת ברית — הפס של הרובוט שלי מתחלף ('+JSON.stringify(r)+')');
await E(()=>{ __sim.SETUP.ally='red'; });
// ברשת: אורח שולח סקין, המארח מחיל ומשדר
r=await E(()=>{ const N=__sim.NET, cap=[]; const old={mode:N.mode,sock:N.sock}; N.mode='host'; N.sock={readyState:1,send:s=>cap.push(JSON.parse(s))};
  const b=__sim.BOTS[0]; const h0=b.hum; b.hum={src:'net',id:'g1',label:'שחר'};
  __sim.netFromGuest('g1',{t:'skin',s:'gold'});
  const msg=cap.filter(m=>m.t==='skins').pop(); const body=b.matBody.color.getHexString();
  b.hum=h0; N.mode=old.mode; N.sock=old.sock; __sim.SKIN.net={}; __sim.skinApplyAll();
  return {msg, body}; });
ok(r.msg&&r.msg.bots[0]==='gold'&&r.msg.me==='hive'&&r.body==='6b520f','מארח: אורח בחר ״זהב״ לרובוט שלו — מוחל ומשודר לכולם');
r=await E(()=>{ const N=__sim.NET; const m0=N.mode; N.mode='guest';
  __sim.netOnMsg(JSON.stringify({t:'skins',me:'snow',bots:['forest','classic','sunset']}));
  const res={me:__sim.skinOf(-1), b0:__sim.BOTS[0].matBody.color.getHexString(), saved:JSON.parse(localStorage.getItem('bbSkin1')).me};
  N.mode=m0; __sim.SKIN.remote=null; __sim.skinApplyAll(); return res; });
ok(r.me==='snow'&&r.b0==='24462a'&&r.saved==='hive','אורח: מקבל את הסקינים של המארח (בלי לדרוס את הבחירה השמורה שלו)');
await E(()=>__sim.skinClose());
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close(); done('v60');
