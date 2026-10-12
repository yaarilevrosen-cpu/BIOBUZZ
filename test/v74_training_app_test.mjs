// v74 training — U6 באפליקציה: שידורים חוזרים בקובץ לכל נהג (app/store.js), מחוץ לסנכרון ולגיבויים,
// ערוצי IPC עם okSender, ובסוף באפליקציה עצמה (Electron): מאץ׳ → שידור בקובץ → טעינה אחרי רענון
// הרצה: xvfb-run -a node v74_training_app_test.mjs   (BB_NO_ELECTRON=1 — רק החלק של store)
import fs from 'fs'; import os from 'os'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)), require=createRequire(import.meta.url);
const APPDIR=path.resolve(HERE,'../app');
const { Store, NOSYNC } = require(APPDIR+'/store.js');
const tmp=p=>fs.mkdtempSync(path.join(os.tmpdir(),p));
const rec=(at,o)=>Object.assign({v:1,at,nf:100,nv:3000,z:1,ev:[{t:1,k:'foul',txt:'x',f:3,me:1}],hz:15,my:10,opp:5,ally:'red',kind:'match',star:0,names:[],d:'AAAA'},o||{});

/* ── 1. store ── */
{ const D=tmp('bb74s-'); const s=new Store(D), id=s.meta.active;
  ok(s.replayList(id).length===0,'נהג חדש — אין שידורים');
  ok(s.replayPut(id,rec(1000))&&s.replayList(id).length===1&&s.replayList(id)[0].d===undefined,'נשמר שידור; הרשימה בלי הנתונים עצמם');
  ok(s.replayGet(id,1000).d==='AAAA'&&s.replayGet(id,999)===null,'replayGet מחזיר את הנתונים לפי at');
  ok(fs.existsSync(path.join(D,'profiles',id,'replays.json')),'קובץ replays.json בתיקייה של הנהג');
  for(let i=1;i<=30;i++){ s.replayPut(id,rec(1000+i,{my:i===4?99:10})); if(i===2) s.replayStar(id,1002,true); }
  s.replayPut(id,rec(2000));
  const L=s.replayList(id).map(x=>x.at);
  ok(L.length===22&&L.includes(1004)&&L.includes(1002)&&!L.includes(1000)&&L.includes(2000),'נשמרים 20 האחרונים + השיא + המסומן ⭐ ('+L.length+')');
  const bad=[null,[],rec(0),rec(3000,{nf:99999}),rec(3001,{z:2}),rec(3002,{d:'<script>'}),rec(3003,{d:'A'.repeat(3e6+4)}),rec(3004,{ev:new Array(401).fill({})}),rec(3005,{nv:10})];
  ok(bad.every(b=>!s.replayPut(id,b)),'רשומה לא תקינה (at, מספר פריימים, דחיסה, base64, גודל, אירועים) — לא נשמרת');
  ok(!s.replayPut('../x',rec(4000))&&!s.replayPut('nope',rec(4000))&&s.replayList('../etc').length===0,'נהג לא קיים / מזהה זדוני — נדחה');
  const k=s.replayPut(id,Object.assign(rec(5000),{evil:1,__proto__x:2})); ok(k&&s.replayGet(id,5000).evil===undefined,'שדות זרים לא נשמרים');
  // גיבוי: בלי שידורים
  const tag=s.snapshot(); ok(!fs.existsSync(path.join(D,'backups',tag,'profiles',id,'replays.json'))&&fs.existsSync(path.join(D,'backups',tag,'profiles',id)),'גיבוי (עותק) לא כולל את replays.json');
  // סנכרון: לא בכלל — הקובץ לא נמצא ב-kv וב-store.json
  s.flushKv(); const sj=path.join(D,'profiles',id,'store.json');
  ok(!JSON.stringify(s.kv).includes('AAAA')&&!(fs.existsSync(sj)&&fs.readFileSync(sj,'utf8').includes('AAAA')),'השידורים לא במפתחות שעוברים לענן (kv / store.json)');
  // נהג אחר — מופרד
  const p2=s.addProfile('שני',{quiet:true}); ok(s.replayList(p2.id).length===0,'לכל נהג השידורים שלו');
  ok(s.replayStar(id,5000,true)&&s.replayList(id).find(x=>x.at===5000).star===1,'⭐ נשמר בקובץ');
  ok(s.replayClear(id)&&s.replayList(id).length===0,'מחיקה');
  fs.writeFileSync(path.join(D,'profiles',id,'replays.json'),'{garbage'); ok(s.replayList(id).length===0,'קובץ פגום — רשימה ריקה, בלי לקרוס');
  fs.rmSync(D,{recursive:true,force:true}); }

/* ── 2. main.js / preload.js — אותו דפוס כמו שאר הערוצים ── */
{ const m=fs.readFileSync(APPDIR+'/main.js','utf8'), p=fs.readFileSync(APPDIR+'/preload.js','utf8');
  const ch=['bb:replayList','bb:replayGet','bb:replayPut','bb:replayStar','bb:replayClear'];
  ok(ch.every(c=>new RegExp('handle\\("'+c+'"').test(m)),'חמשת ערוצי השידורים רשומים דרך handle() — שבודק okSender');
  ok(ch.every(c=>p.includes('"'+c+'", PID')),'הדף שולח את הנהג שבשבילו נטען (PID)'); }

/* ── 3. האפליקציה עצמה ── */
if(!process.env.BB_NO_ELECTRON){
  const { _electron: electron } = await import('playwright');
  const EL=[APPDIR+'/node_modules/electron/dist/electron', path.resolve(HERE,'../../../BIOBUZZ/app/node_modules/electron/dist/electron')].find(f=>fs.existsSync(f));
  const SIMF=path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html');
  const DATA=tmp('bb74e-');
  const app=await electron.launch({executablePath:EL, args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
    env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_BRIDGE:'9674',BIOBUZZ_SIM:SIMF,BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none'}, timeout:90000});
  const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
  const ready=()=>win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length&&window.__sim.v74training,null,{timeout:180000});
  await ready(); await win.evaluate(()=>{ const w=document.getElementById('welcome'); if(w) w.hidden=true; });
  ok(await win.evaluate(()=>__sim.v74training.rpBe()!==__sim.v74training.RPBE_IDB&&typeof bbApp.replayList==='function'),'באפליקציה השידורים נשמרים דרך bbApp (לא IndexedDB)');
  const at=await win.evaluate(async()=>{ const S=__sim; Object.assign(S.SETUP,{autoOn:false,tele:15,cd:0,partner:false,blue1:true,blue2:false}); S.v74training.setupApply();
    for(let k=0;k<200&&(S.MATCH.on||S.MATCH.cd>0);k++) S.advance(0.5,1/30);
    for(let k=0;k<50&&!S.v74training.RPL.idx.size;k++) await new Promise(r=>setTimeout(r,100));
    return S.seasonAll().slice(-1)[0].at; });
  const pid=await win.evaluate(()=>bbApp.profile.id);
  const f=path.join(DATA,'profiles',pid,'replays.json');
  const L=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):[];
  ok(L.length===1&&L[0].at===at&&L[0].d.length>100,'המאץ׳ נשמר ב-profiles/<נהג>/replays.json ('+(L[0]?L[0].d.length:0)+' תווים)');
  const kv=fs.existsSync(path.join(DATA,'profiles',pid,'store.json'))?fs.readFileSync(path.join(DATA,'profiles',pid,'store.json'),'utf8'):'';
  ok(!kv.includes(L[0]&&L[0].d.slice(0,40)),'הנתונים לא נכנסו ל-store.json (שעולה לענן)');
  await win.evaluate(()=>{ bbApp.flush(); location.reload(); }); await win.waitForEvent('load',{timeout:120000}); await ready();
  const r=await win.evaluate(async at=>{ const X=__sim.v74training; for(let k=0;k<50&&!X.RPL.idx.size;k++) await new Promise(r=>setTimeout(r,100));
    const ok1=await X.rpPlay(at); const o={n:X.RPL.idx.size, ok1, on:X.REPLAY.on, nf:X.REPLAY.frames.length}; document.getElementById('rpX').click(); return o; },at);
  ok(r.n===1&&r.ok1&&r.on&&r.nf>200,'אחרי רענון: השידור בספרייה ונפתח מהקובץ ('+r.nf+' פריימים)');
  const r2=await win.evaluate(async at=>{ await __sim.v74training.rpStar(at); return (await bbApp.replayList())[0].star; },at);
  ok(r2===1,'⭐ עובר דרך IPC לקובץ');
  ok(!errs.length,'אין שגיאות בדף: '+errs.slice(0,2).join(' | '));
  await app.close(); fs.rmSync(DATA,{recursive:true,force:true});
}
done('v74_training_app_test');
