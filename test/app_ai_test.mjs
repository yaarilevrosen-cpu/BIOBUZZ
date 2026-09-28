// v60 באפליקציה — מפתח גוגל (מוצפן, לא בדף), בדיקת מודלים מול שרת מדומה, העוזר, ״נתח אותי״. בלי מפתח אמיתי ובלי רשת.
import { _electron as electron } from 'playwright';
import http from 'http'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bb60ai-'));
const KEY='AIzaTEST'+'x'.repeat(31);
/* שרת מדומה של גוגל */
const REQ=[];
const MODELS=[
  {name:'models/gemini-9.9-flash',displayName:'Gemini 9.9 Flash',supportedGenerationMethods:['generateContent'],ms:40},
  {name:'models/gemini-9.9-pro',displayName:'Gemini 9.9 Pro',supportedGenerationMethods:['generateContent'],ms:300},
  {name:'models/gemini-9.9-flash-lite',displayName:'Gemini 9.9 Flash-Lite',supportedGenerationMethods:['generateContent'],quota:true},
  {name:'models/gemma-9-it',displayName:'Gemma 9',supportedGenerationMethods:['generateContent'],nosys:true},
  {name:'models/text-embedding-9',displayName:'Embedding 9',supportedGenerationMethods:['embedContent']},
  {name:'models/gemini-9.9-flash-image',displayName:'Gemini 9.9 Flash Image',supportedGenerationMethods:['generateContent']}];
const srv=http.createServer((q,s)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const J=(o,st=200)=>{ s.writeHead(st,{'content-type':'application/json'}); s.end(JSON.stringify(o)); };
  const body=b?JSON.parse(b):null; REQ.push({url:q.url,key:q.headers['x-goog-api-key'],body});
  if(q.headers['x-goog-api-key']!==KEY) return J({error:{code:400,message:'API key not valid. Please pass a valid API key.',status:'INVALID_ARGUMENT'}},400);
  if(q.method==='GET'&&q.url.startsWith('/v1beta/models')) return J({models:MODELS.map(({ms,quota,nosys,...m})=>m)});
  const m=MODELS.find(x=>q.url.startsWith('/v1beta/models/'+x.name.slice(7)+':generateContent'));
  if(!m) return J({error:{code:404,message:'not found'}},404);
  if(m.quota) return J({error:{code:429,message:'Resource has been exhausted (e.g. check quota).',status:'RESOURCE_EXHAUSTED'}},429);
  if(m.nosys&&body.systemInstruction) return J({error:{code:400,message:'Developer instruction is not enabled for models/gemma-9-it',status:'INVALID_ARGUMENT'}},400);
  const sys=((body.systemInstruction||{}).parts||[{}])[0].text||''; const user=body.contents[body.contents.length-1].parts[0].text;
  let text='OK';
  if(/driving coach/.test(sys)) text=JSON.stringify({headline:'כותרת בדיקה',good:['דיוק טוב'],improve:[{what:'חניה',why:'חניה 50%',how:'לנסוע מוקדם'}],drills:[{id:'park',why:'לחניה'},{id:'nonsense',why:'x'}],next_goal:'חניה בכל משחק'});
  else if(/in-app helper/.test(sys)) text='מסך מפוצל: **שני שחקנים** [[f:split]] [[f:madeup]]\n- נקודה';
  setTimeout(()=>J({candidates:[{content:{parts:[{text}]},finishReason:'STOP'}]}),m.ms||10);
}); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
const launch=()=>electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_SIM:path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html'),BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none',BIOBUZZ_GEMINI_BASE:BASE}});
let app=await launch(); let win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
const E=(f,a)=>win.evaluate(f,a);
const SH=async n=>{ if(process.env.BB_SHOTS) try{ await win.screenshot({path:process.env.BB_SHOTS+'/'+n,timeout:60000}); }catch(e){} };

await E(()=>{ const w=document.getElementById('welcome'); if(w&&!w.hidden){ document.getElementById('wcName').value='מאיה'; document.getElementById('wcGo').click(); } });
await win.waitForTimeout(500);
// 1. בלי מפתח
let r=await E(async()=>{ const s=await bbApp.aiStatus(); document.querySelector('#appNav [data-nav="settings"]').click(); await new Promise(r=>setTimeout(r,300));
  return {s, aion:document.documentElement.classList.contains('aion'), box:!!document.querySelector('#appPage #aiKeyIn'), txt:document.querySelector('#appPage #aiSet').innerText}; });
ok(!r.s.has&&!r.aion&&r.box,'בלי מפתח: הכול כבוי, ויש תיבה בהגדרות');
// 2. מפתח לא בפורמט / מפתח שגוי
r=await E(()=>bbApp.aiSetKey('abc')); ok(!r.ok&&/לא נראה כמו מפתח/.test(r.why),'מפתח קצר מדי נדחה בלי לפנות לגוגל');
r=await E(k=>bbApp.aiSetKey(k),'AQ.WRONG'+'y'.repeat(40)); ok(!r.ok&&!/לא נראה כמו מפתח/.test(r.why),'מפתח בפורמט החדש (AQ. עם נקודה) עובר את בדיקת הפורמט ומגיע לגוגל ('+r.why+')');
r=await E(k=>bbApp.aiSetKey(k),'AIzaWRONG'+'y'.repeat(30)); ok(!r.ok&&/לא תקין/.test(r.why)&&!r.status.ok,'מפתח שגוי: ״המפתח לא תקין״ ('+r.why+')');
// 3. המפתח הנכון דרך התיבה
r=await E(async k=>{ const i=document.getElementById('aiKeyIn'); i.value=k; document.querySelector('[data-ai="save"]').click();
  for(let t=0;t<100;t++){ await new Promise(r=>setTimeout(r,100)); const s=window.__sim.AIST.st; if(s&&!s.busy&&s.checkedAt) break; }
  return {st:window.__sim.AIST.st, inVal:(document.getElementById('aiKeyIn')||{}).value, rows:document.querySelectorAll('.aiTbl tr').length-1, txt:document.getElementById('aiSet').textContent, aion:document.documentElement.classList.contains('aion')}; },KEY);
ok(r.st.ok&&r.aion,'מפתח נכון: נבדק ודולק');
ok(r.st.pick.fast==='gemini-9.9-flash'&&r.st.pick.strong==='gemini-9.9-pro','בחירה לבד: מהיר לעוזר (flash), חזק למאמן (pro) — '+JSON.stringify(r.st.pick));
ok(r.rows===4,'בטבלה 4 מודלים (בלי הטמעות ותמונות) — '+r.rows);
ok(/עברת את המכסה/.test(r.txt)&&/לא מקבל הוראות מערכת/.test(r.txt),'✗ עם סיבה: מכסה, ומודל שלא מקבל הוראת מערכת');
ok(r.inVal==='','התיבה מתרוקנת מיד אחרי השמירה');
await E(()=>{ const d=document.querySelector('.aiModels'); if(d) d.open=true; document.getElementById('setAI').scrollIntoView(); }); await SH('app-ai-key.png');
ok(REQ.filter(x=>x.url.includes(':generateContent')).every(x=>!JSON.stringify(x.body).includes(KEY))&&REQ.every(x=>!x.url.includes(KEY)),'המפתח נשלח רק בכותרת — לא בכתובת ולא בגוף');
// 4. המפתח לא בדף ולא בקבצים הפתוחים
r=await E(async k=>{ const ls=JSON.stringify(Object.assign({},localStorage)); const st=await bbApp.aiStatus();
  return {html:document.documentElement.outerHTML.includes(k), ls:ls.includes(k), st:JSON.stringify(st).includes(k), keys:Object.keys(st)}; },KEY);
ok(!r.html&&!r.ls&&!r.st,'המפתח לא בדף, לא באחסון של הדף ולא בסטטוס');
const grep=dir=>{ let hit=[]; for(const f of fs.readdirSync(dir,{recursive:true})){ const p=path.join(dir,String(f)); try{ if(fs.statSync(p).isFile()&&fs.readFileSync(p,'latin1').includes(KEY)) hit.push(String(f)); }catch(e){} } return hit; };
const hits=grep(DATA); ok(hits.length===0,'המפתח לא כתוב גלוי באף קובץ בתיקיית הנתונים ('+(hits.join(',')||'אף אחד')+')');
ok(!fs.existsSync(path.join(DATA,'profiles'))||grep(path.join(DATA,'profiles')).length===0,'לא בנהג (מה שמסתנכרן) ולא בגיבויים');
// 5. חיפוש ← העוזר
r=await E(async()=>{ __sim.cmdkOpen(); const i=document.getElementById('cmdkIn'); i.value='איך משחקים שניים על מחשב אחד'; i.dispatchEvent(new Event('input'));
  const ask=!!document.querySelector('#cmdkList .cmdkAsk');
  i.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
  for(let t=0;t<60;t++){ await new Promise(r=>setTimeout(r,100)); if(!__sim.AICHAT.busy&&__sim.AICHAT.msgs.length>=2) break; }
  const log=document.getElementById('aiChatLog');
  return {ask, open:!document.getElementById('aiChat').hidden, n:__sim.AICHAT.msgs.length, btn:[...log.querySelectorAll('.aiF')].map(b=>b.dataset.f), bold:!!log.querySelector('.aiM.bot b'), li:!!log.querySelector('.aiLi')}; });
ok(r.ask&&r.open&&r.n===2,'Tab בחיפוש ← שאלה לעוזר, התשובה בחלון');
await SH('app-ai-helper.png');
ok(r.btn.join()==='split'&&r.bold&&r.li,'קישור ליכולת אמיתית הופך לכפתור, קישור מומצא נמחק ('+r.btn+')');
const hq=REQ.filter(x=>x.body&&/in-app helper/.test(JSON.stringify(x.body.systemInstruction||''))).pop();
ok(hq&&hq.url.includes('gemini-9.9-flash:')&&/split — /.test(hq.body.systemInstruction.parts[0].text)&&/Hebrew/.test(hq.body.systemInstruction.parts[0].text),'העוזר: המודל המהיר, עם רשימת היכולות והוראת עברית');
r=await E(async()=>{ document.querySelector('#aiChatLog .aiF').click(); await new Promise(r=>setTimeout(r,400)); return __sim.SPLIT.on; });
ok(r,'לחיצה על הכפתור בתשובה מפעילה את היכולת (מסך מפוצל)');
await E(()=>{ document.getElementById('ppSplit')&&__sim.SPLIT.on&&document.getElementById('ppSplit').click(); __sim.chatClose(); });
// 6. ״נתח אותי״
r=await E(async()=>{ for(let i=0;i<6;i++) await bbApp.matchAdd({at:Date.now()-1e6+i*1000,ally:'red',my:30+i,opp:25,win:1,shots:10,hits:6,fouls:0,leave:true,park:i%2===0,autoPts:8,avgCycle:9,kind:'match',skill:1,sh:[],bl:[]});
  window.APP=window.APP; await (async()=>{})(); return true; });
r=await E(async()=>{ await new Promise(r=>setTimeout(r,200)); const all=await bbApp.matches(); return all.length; });
ok(r>=6,'6 משחקים בארכיון');
r=await E(async()=>{ await __sim.appLoadMatches(); __sim.statUI&&__sim.statUI(); document.querySelector('#appNav [data-nav="stats"]').click(); await new Promise(r=>setTimeout(r,500));
  const bar=document.getElementById('coachBar'); return {bar:bar&&!bar.hidden, btn:!!(bar&&bar.querySelector('[data-coach="me"]:not([disabled])'))}; });
ok(r.bar&&r.btn,'בסטטיסטיקות: ״🧠 נתח אותי״ דולק');
r=await E(async()=>{ document.querySelector('#coachBar [data-coach="me"]').click();
  for(let t=0;t<80;t++){ await new Promise(r=>setTimeout(r,100)); if(!__sim.COACH.busy&&document.querySelector('#coachBody .coHead')) break; }
  const b=document.getElementById('coachBody'); return {open:!document.getElementById('coachBox').hidden, head:(b.querySelector('.coHead')||{}).textContent, drills:[...b.querySelectorAll('[data-drill-go]')].map(x=>x.dataset.drillGo), goal:!!b.querySelector('.coGoal'), sent:!!b.querySelector('.coSent pre')}; });
ok(r.open&&r.head==='כותרת בדיקה'&&r.goal&&r.sent,'הניתוח מוצג: כותרת, יעד, ו״מה נשלח לגוגל״');
await SH('app-ai-coach.png');
ok(r.drills.join()==='park','רק תרגילים אמיתיים הופכים לכפתור ('+r.drills+')');
const cq=REQ.filter(x=>x.body&&/driving coach/.test(JSON.stringify(x.body.systemInstruction||''))).pop();
const sent=cq&&cq.body.contents[0].parts[0].text;
ok(cq&&cq.url.includes('gemini-9.9-pro:')&&cq.body.generationConfig.responseMimeType==='application/json','המאמן: המודל החזק, תשובה כ-JSON');
ok(sent&&JSON.parse(sent).analyzed>=6&&!/@/.test(sent)&&!sent.includes(KEY),'נשלח רק סיכום מספרים (בלי מייל, בלי מפתח)');
ok(/park:/.test(cq.body.systemInstruction.parts[0].text)&&/speed:/.test(cq.body.systemInstruction.parts[0].text),'המאמן מקבל את 9 התרגילים מ-ai/drills.json');
r=await E(async()=>{ document.querySelector('#coachBody [data-drill-go="park"]').click(); await new Promise(r=>setTimeout(r,300)); return {on:__sim.DRILL.on, box:document.getElementById('coachBox').hidden}; });
ok(r.on==='park'&&r.box,'לחיצה על תרגיל מהניתוח — מתחיל אותו');
// 7. אחרי הפעלה מחדש — המפתח עדיין שם (אם יש הצפנה), ובלי בדיקה חוזרת
const enc=await app.evaluate(({safeStorage})=>safeStorage.isEncryptionAvailable());
await app.close(); const nReq=REQ.length;
app=await launch(); win=await app.firstWindow(); await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
r=await win.evaluate(()=>bbApp.aiStatus());
if(enc) ok(r.has&&r.ok&&r.saved&&REQ.length===nReq,'אחרי הפעלה מחדש: המפתח נשמר מוצפן, בלי לפנות שוב לגוגל');
else ok(!r.has,'אין הצפנה במחשב הזה: המפתח לא נשמר לדיסק (רק עד היציאה)');
// 8. מחיקה
r=await win.evaluate(()=>bbApp.aiClear()); ok(!r.has,'מחיקת מפתח');
ok(!fs.existsSync(path.join(DATA,'ai-key.bin')),'הקובץ המוצפן נמחק');
ok(errs.length===0,'בלי שגיאות בדף '+errs.slice(0,2).join(' | '));
await app.close(); srv.close(); fs.rmSync(DATA,{recursive:true,force:true});
done('app_ai_test');
