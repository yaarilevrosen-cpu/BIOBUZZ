// v76 — התאמה ל-04: מבנה גרסה 1 (format, {value, confidence, n}, לוח זמנים כמפה, shooters/shooter_mount, flower_lift, null = לא ידוע),
// והשרשרת של הסנכרון החי: חי (ריל־טיים) → שאילה → תמונה שמורה → קובץ → קוד QR. שרת ענן מדומה מקומי; רק מספרים דמיוניים מ-90001.
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs'; import path from 'path'; import http from 'http'; import zlib from 'zlib';
import { fileURLToPath } from 'url'; import { createRequire } from 'module';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const require=createRequire(import.meta.url);
const WS=require(path.resolve(HERE,'../app/node_modules/ws'));
const MATCH=fs.readFileSync(path.join(HERE,'fixtures/scout04-match.json'),'utf8');
const EVENT=fs.readFileSync(path.join(HERE,'fixtures/scout04-event.json'),'utf8');
const EV=JSON.parse(EVENT);

// שרת ענן מדומה: התחברות, שתי הטבלאות, וזרם ריל־טיים (פרוטוקול פיניקס)
const S={meta:{data:{format:EV.format,version:1,generated_at:EV.generated_at,event:EV.event,event_code:'',units:EV.units,schedule:EV.schedule,teams:EV.robots.map(r=>r.team)},updated_at:new Date().toISOString()},
  prof:EV.robots.map(r=>({team:r.team,data:r,updated_at:new Date().toISOString()})), down:false, logins:0, gets:0, joins:0, wss:[], badPw:false};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey, authorization, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const srv=http.createServer((q,r)=>{
  const send=(c,o)=>{ r.writeHead(c,Object.assign({'Content-Type':'application/json'},cors)); r.end(JSON.stringify(o)); };
  if(q.method==='OPTIONS'){ r.writeHead(204,cors); return r.end(); }
  if(S.down){ q.socket.destroy(); return; }
  const u=new URL(q.url,'http://x');
  if(u.pathname==='/auth/v1/token'){ let b=''; q.on('data',d=>b+=d); q.on('end',()=>{ S.logins++; const j=JSON.parse(b||'{}');
    if(S.badPw||j.password!=='pw-sim'||q.headers.apikey!=='anon-test') return send(400,{error:'invalid_grant'}); send(200,{access_token:'tok-'+S.logins,expires_in:3600}); }); return; }
  const authed=/^Bearer tok-/.test(q.headers.authorization||'');
  if(!authed) return send(401,{message:'JWT'});
  if(u.pathname==='/rest/v1/sim_meta'){ S.gets++; return send(200,u.searchParams.get('event_code')==='eq.'?[S.meta]:[]); }
  if(u.pathname==='/rest/v1/sim_profiles') return send(200,u.searchParams.get('event_code')==='eq.'?S.prof:[]);
  send(404,{});
});
const wss=new WS.WebSocketServer({noServer:true});
srv.on('upgrade',(q,sock,head)=>{ if(S.down||!/^\/realtime\/v1\/websocket/.test(q.url)) return sock.destroy();
  wss.handleUpgrade(q,sock,head,ws=>{ S.wss.push(ws); ws.on('message',m=>{ const j=JSON.parse(String(m));
    if(j.event==='phx_join'){ S.joins++; ws.topic=j.topic; ws.send(JSON.stringify({topic:j.topic,event:'phx_reply',ref:j.ref,payload:{status:'ok',response:{}}})); } }); }); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const PORT=srv.address().port;
const push=()=>{ for(const ws of S.wss) if(ws.readyState===1&&ws.topic) ws.send(JSON.stringify({topic:ws.topic,event:'postgres_changes',payload:{data:{table:'sim_profiles'}}})); };

let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);

// 1. חבילת מאץ׳ של 04 (הדוגמה מהמאגר שלהם)
let r=await E(t=>{ const S=__sim; S.sctLoadText(t); const pk=S.SCT.pack, p=pk.robots[90001], q=pk.robots[90002];
  const by=n=>S.BOTS.find(b=>b.prof&&b.prof.team===n);
  return {err:S.SCT.err, n:pk.n, m:pk.matches.map(m=>m.n+':'+m.red+'|'+m.blue), src:S.SCTL.src,
    p:{sh:p.shooter, lift:p.lift, cap:p.cap, acc:p.acc, fa:p.fc.accuracy, zone:p.zone, range:p.range, spm:p.spm, park:p.park, def:p.def, start:p.start},
    q:{drive:q.drive, cap:q.cap, shooter:q.shooter, acc:q.acc, park:q.park}, bt:by(90002)?S.bldOf(S.BOTS.indexOf(by(90002))).turret:null}; },MATCH);
ok(!r.err&&r.n===4&&r.m.join()==='1:90001,90002|90003,90004'&&r.src==='file','חבילת מאץ׳ של 04: 4 רובוטים, הבריתות מ-alliances, מקור ״קובץ״ ('+JSON.stringify(r)+')');
ok(r.p.sh==='turret'&&r.p.lift&&r.p.cap===3&&r.p.acc===0.75&&r.p.fa===0.13&&r.p.zone==='far'&&r.p.range===108&&r.p.spm===4&&r.p.park===0&&r.p.def===0.75&&r.p.start==='B',
  'שדות של 04: shooters+shooter_mount → צריח, flower_lift, ערך נמדד עם ביטחון משלו ('+JSON.stringify(r.p)+')');
ok(r.q.drive===''&&r.q.cap===null&&r.q.shooter===''&&r.q.acc===null,'declared: null = לא ידוע — נשאר ברירת המחדל ('+JSON.stringify(r.q)+')');

// 2. הביטחון של כל ערך: דיוק 0.75 בביטחון 0.13 כמעט לא משנה; יריות למאץ׳ מאטות
/* v77 (docs/v77-brain.md): הדיוק ויריות למאץ׳ כבר לא משנים את tol ואת הזמן בין יריות — המוח של הבוט מקבל יעדים (b.sbS.accT, b.sbS.spmT),
   מעורבבים עם הבוט הרגיל לפי הביטחון של כל ערך */
r=await E(()=>{ const S=__sim, X=S.v77b; const b=S.BOTS.find(b=>b.prof&&b.prof.team===90001); const s1=S.skill(b); S.SCT.on=false; S.SCT.ver++; const s0=S.skill(b); S.SCT.on=true; S.SCT.ver++;
  const keep={a:b.autoLvl,np:b.noPark,on:b.on}; S.MATCH.cd=1; X.v77bMatchArm(); b.sbN=null; X.v77bRoll(b); S.MATCH.cd=0;
  const accT=b.sbS.accT, spmT=b.sbS.spmT; b.sbS=null; b.sbN=null; b.autoLvl=keep.a; b.noPark=keep.np; b.on=keep.on;
  return {tol0:s0.tol, tol1:s1.tol, c0:s0.cycle, c1:s1.cycle, pr:b.prefRange, accT, spmT}; });
ok(r.tol1===r.tol0&&r.c1===r.c0&&r.accT<0.92&&r.accT>0.88&&r.spmT<38*0.9&&r.pr===85,'ביטחון לכל ערך: דיוק עם ביטחון נמוך משנה מעט, 4 יריות למאץ׳ מאטות, אזור רחוק ('+JSON.stringify(r)+')');

// 3. חבילת אירוע: לוח זמנים כמפה; גרסה ופורמט לא מוכרים נדחים
r=await E(t=>{ const S=__sim; S.sctLoadText(t); const pk=S.SCT.pack; const out={n:pk.n, m:pk.matches.map(m=>m.n).join()};
  const rej=[]; for(const o of [Object.assign(JSON.parse(t),{version:2}),Object.assign(JSON.parse(t),{format:'other/thing'})]){ try{ S.sctPack(o); rej.push('ok'); }catch(e){ rej.push('נדחה'); } }
  out.rej=rej; return out; },EVENT);
ok(r.n===7&&r.m==='1,2'&&r.rej.join()==='נדחה,נדחה','חבילת אירוע: 7 קבוצות, לוח זמנים ״מספר → בריתות״; גרסה 2 ופורמט זר נדחים ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; const o=S.sctPack({robots:[{team:90009,is_us:true,declared:null,measured:null},{team:90010},{team:90011}],schedule:{"4":{red:[90009,90010],blue:[90011]}}}); return {us:o.us, m:o.matches[0].n}; });
ok(r.us===90009&&r.m===4,'is_us מסמן את הרובוט שלנו (לא נבנה כבוט) ('+JSON.stringify(r)+')');
await E(()=>__sim.sctClear());

// 4. חיבור חי לשרת מדומה: התחברות, שאילה, ריל־טיים, תמונה שמורה
r=await E(async port=>{ const S=__sim; S.sctlCfgSave({url:'http://127.0.0.1:'+port,key:'anon-test',email:'sim@example.test',pw:'pw-sim',event:''}); S.sctlStart();
  for(let i=0;i<60&&!(S.SCTL.live&&S.SCT.pack);i++) await new Promise(r=>setTimeout(r,100));
  let cache=null; try{ cache=JSON.parse(localStorage.getItem('a9662-sim-cache:')); }catch(e){}
  return {src:S.SCTL.src, live:S.SCTL.live, n:S.SCT.pack&&S.SCT.pack.n, on:S.SCT.on, cache:!!(cache&&cache.data&&cache.data.robots.length===7), stale:S.sctlStale()}; },PORT);
ok(r.live&&r.n===7&&r.on&&r.cache&&!r.stale&&(r.src==='live'||r.src==='poll'),'חי: התחברות בחשבון קריאה, 7 פרופילים, זרם מחובר, תמונה שמורה מקומית ('+JSON.stringify(r)+')');
// שינוי בענן → הודעה בזרם → נטען תוך שנייה
S.prof.find(p=>p.team===90002).data=Object.assign({},S.prof.find(p=>p.team===90002).data,{declared:{confidence:0.5,drive:'tank',capacity:2,shooters:0}});
const g0=S.gets; push();
r=await E(async()=>{ const S=__sim; for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,100)); const p=S.SCT.pack.robots[90002]; if(p&&p.drive==='tank') break; }
  const p=S.SCT.pack.robots[90002]; return {drive:p.drive, cap:p.cap, sh:p.shooter, src:S.SCTL.src}; });
ok(r.drive==='tank'&&r.cap===2&&r.sh==='none'&&r.src==='live'&&S.gets>g0,'שינוי בענן מגיע בזרם החי תוך שנייה ('+JSON.stringify(r)+')');
// דופק ישן מ-5 דקות → ״המנהל לא מחובר״
S.meta.updated_at=new Date(Date.now()-11*60e3).toISOString(); S.prof.forEach(p=>p.updated_at=S.meta.updated_at); push();
r=await E(async()=>{ const S=__sim; for(let i=0;i<30&&!S.sctlStale();i++) await new Promise(r=>setTimeout(r,100)); S.sctOpen(); return {stale:S.sctlStale(), txt:document.getElementById('sctBody').textContent}; });
ok(r.stale&&/המנהל לא מחובר כבר 11 דק׳/.test(r.txt)&&/חי/.test(r.txt),'דופק ישן: ״המנהל לא מחובר כבר 11 דק׳ — הנתונים קפואים״ ('+r.stale+')');
S.meta.updated_at=new Date().toISOString();
// השרת נופל → נשארים עם הנתונים, ״אין חיבור לענן״
S.down=true; for(const ws of S.wss) try{ ws.terminate(); }catch(e){}
r=await E(async()=>{ const S=__sim; for(let i=0;i<40&&S.SCTL.live;i++) await new Promise(r=>setTimeout(r,100)); await S.sctlPull('poll'); S.sctUI();
  return {live:S.SCTL.live, st:S.SCTL.st, n:S.SCT.pack&&S.SCT.pack.n, txt:document.getElementById('sctLiveW').textContent}; });
ok(!r.live&&r.st==='offline'&&r.n===7&&/אין חיבור לענן/.test(r.txt),'השרת נפל: הנתונים נשארים, ״⚠ אין חיבור לענן״ ('+JSON.stringify(r)+')');
// טעינה מחדש בלי שרת → ״תמונה שמורה״
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
// v78: החיבור החי מתחבר לבד רק למנהל סקאוטינג — בבדיקה: stub של ההרשאה
await page.evaluate(()=>__sim.scoutAdminSet(true));
r=await E(async()=>{ const S=__sim; for(let i=0;i<60&&!S.SCT.pack;i++) await new Promise(r=>setTimeout(r,100)); S.sctOpen();
  return {src:S.SCTL.src, n:S.SCT.pack&&S.SCT.pack.n, txt:document.getElementById('sctLiveW').textContent}; });
ok(r.src==='cache'&&r.n===7&&/תמונה שמורה/.test(r.txt),'בלי רשת: התמונה האחרונה מהמחשב, עם ״💾 תמונה שמורה״ ('+JSON.stringify(r)+')');
// חבילה של תחרות אחרת נדחית גם מקובץ
r=await E(t=>{ const S=__sim; S.sctLoadText(JSON.stringify(Object.assign(JSON.parse(t),{event_code:'OTHER1'}))); return {err:S.SCT.err, src:S.SCTL.src}; },MATCH);
ok(/תחרות אחרת/.test(r.err)&&r.src==='cache','חבילה של תחרות אחרת נדחית גם מקובץ ('+JSON.stringify(r)+')');
S.down=false;

// 5. פרטיות: פרטי החיבור והתמונה לא בגיבוי, לא בדיווח באג
r=await E(()=>{ const S=__sim; const snap=JSON.stringify(S.bk?S.bk._snap?S.bk._snap():null:null); const keys=[]; for(let i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
  const bug=JSON.stringify(S.bugPayload()); const bkAll=JSON.stringify(S.bk.all());
  return {ours:keys.filter(k=>/^a9662/.test(k)), inBk:/pw-sim|anon-test|9000[2-7]/.test(bkAll), inBug:/pw-sim|anon-test|9000[2-7]/.test(bug), bbHas:keys.filter(k=>/^(bb|biobuzz)/i.test(k)&&/pw-sim|9000[2-7]/.test(localStorage.getItem(k)||''))}; });
ok(r.ours.length===2&&!r.inBk&&!r.inBug&&!r.bbHas.length,'פרטיות: רק שני מפתחות a9662 (פרטים ותמונה), לא בגיבויים ולא בדיווח באג ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.sctlForget(); const keys=[]; for(let i=0;i<localStorage.length;i++) keys.push(localStorage.key(i)); return keys.filter(k=>/^a9662/.test(k)); });
ok(r.length===0,'״שכח את הפרטים״ מוחק גם את התמונה השמורה');

// 6. קוד QR בשני חלקים
const pkg=JSON.parse(MATCH); const b64=zlib.deflateRawSync(Buffer.from(JSON.stringify(pkg))).toString('base64url'); const h=Math.ceil(b64.length/2);
const codes=['A9662:1/2:ab12:'+b64.slice(0,h),'A9662:2/2:ab12:'+b64.slice(h)];
r=await E(async c=>{ const S=__sim; S.sctClear(); const a=await S.sctlQR(c[1]); const bad=await S.sctlQR('A9662:1/2:zz:@@'); const b=await S.sctlQR(c[0]);
  return {a,bad,b,src:S.SCTL.src,n:S.SCT.pack&&S.SCT.pack.n}; },codes);
ok(r.a===1&&r.bad===-1&&r.b===0&&r.src==='qr'&&r.n===4,'קוד QR: חלק 2 ואז 1 (״חסר 1״), קוד פגום נדחה, החבילה נקלטת ('+JSON.stringify(r)+')');
// דרך השדה בחלון (כמו סורק שמקליד ולוחץ Enter)
r=await E(async c=>{ const S=__sim; S.sctClear(); S.sctOpen(); for(const t of c){ const el=document.getElementById('sctlQrIn'); el.value=t; el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await new Promise(r=>setTimeout(r,300)); }
  return {src:S.SCTL.src, n:S.SCT.pack&&S.SCT.pack.n}; },codes);
ok(r.src==='qr'&&r.n===4,'שדה ה-QR בחלון: שני קודים + Enter ('+JSON.stringify(r)+')');

// 7. לא בונים מחדש בזמן הקלדה
r=await E(()=>{ const S=__sim; S.SCTL.open=true; S.sctUI(); const el=document.getElementById('sctlUrl'); el.focus(); el.value='https://abc'; S.sctUI(); const same=document.getElementById('sctlUrl')===el&&el.value==='https://abc'; el.blur(); return {same, dirty:S.SCT.dirty}; });
ok(r.same,'בזמן הקלדה החלון לא נבנה מחדש (הסנכרון לא מוחק את מה שמקלידים)');
ok(realErrs(errs).filter(x=>!/127\.0\.0\.1:\d+\/(rest|auth|realtime)/.test(x)&&!/ERR_CONNECTION|ERR_EMPTY_RESPONSE|net::/.test(x)).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();

// 8. אנגלית: החלון עם החיבור החי בלי עברית
({browser,page,errs}=await open({noraf:true,play:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
await page.evaluate(t=>{ const S=__sim; S.sctLoadText(t); S.SCTL.open=true; S.SCTL.cfg={url:'http://127.0.0.1:1',key:'k',event:''}; S.SCTL.st='offline'; S.SCTL.err='השרת לא ענה תוך 8 שניות'; S.SCTL.qrLeft=1; S.sctOpen(); },MATCH);
await page.waitForTimeout(400);
r=await page.evaluate(()=>{ const heb=[]; const walk=n=>{ if(!n) return; if(n.nodeType===3&&/[֐-׿]/.test(n.data)) heb.push(n.data.trim()); for(const c of n.childNodes||[]) walk(c); }; walk(document.getElementById('sctBox'));
  for(const el of document.querySelectorAll('#sctBox [placeholder],#sctBox [aria-label],#sctBox [title]')) for(const a of ['placeholder','aria-label','title']){ const v=el.getAttribute(a); if(v&&/[֐-׿]/.test(v)) heb.push(a+':'+v); }
  return [...new Set(heb)].slice(0,12); });
await page.evaluate(()=>{ __sim.SCTL.cfg=null; localStorage.removeItem('bbLang1'); });
ok(r.length===0,'חלון הסקאוטינג באנגלית — בלי עברית ('+r.join(' | ')+')');
await browser.close();
srv.close(); wss.close();
done('v76_scout04');
