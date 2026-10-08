// v72 netapp (1.12.5) — האפליקציה והענן (שרת מדומה בלבד, לא ייצור) + הגשר המובנה:
// P1 ערך מהענן לא נדרס ע״י הדף הישן · P2 דף ישן לא כותב לנהג אחר · P5 ״גבה עכשיו״ ולפני ייבוא · P6 מחיקה שנדחתה / נהג שלא עלה
// P7 שינוי שם לקבוצה לא זורק את המטמון · P8 הנהג היחיד נמחק בענן · P4 תקרת אחסון · P10 fuse · N2/P9 בגשר של האפליקציה
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const ME='11111111-1111-1111-1111-111111111111', FR='22222222-2222-2222-2222-222222222222';
const DB={profiles:[],matches:[],cap:1e9,tombRej:false,quota:1e9,team:false,posts:0};
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const u=new URL(q.url,'http://x'), p=u.pathname, sp=u.searchParams;
  const send=(code,o)=>{ r.writeHead(code,{'Content-Type':'application/json'}); r.end(JSON.stringify(o)); };
  const body=b?JSON.parse(b):null;
  if(p==='/auth/v1/user') return send(200,{id:ME,user_metadata:{name:'A'}});
  if(p.startsWith('/rest/v1/rpc/')) return send(200,{id:'t1',code:'ABCDEF',name:'x',num:'1',owner:ME});
  if(p==='/rest/v1/bb_team_members') return send(200,DB.team?[{team_id:'t1',uid:ME,label:'A'},{team_id:'t1',uid:FR,label:'F'}]:[]);
  if(p==='/rest/v1/bb_teams') return send(200,[{id:'t1',code:'ABCDEF',name:'x',num:'1',owner:ME}]);
  if(p==='/rest/v1/bb_profiles'&&q.method==='GET'){
    const own=sp.get('owner')||''; let rows=DB.profiles.filter(x=>own==='eq.'+x.owner||own.startsWith('in.(')&&own.includes(x.owner));
    const id=sp.get('id'); if(id) rows=rows.filter(x=>'eq.'+x.id===id);
    return send(200,rows); }
  if(p==='/rest/v1/bb_profiles'&&q.method==='POST'){
    for(const x of body){
      if(x.deleted&&DB.tombRej) return send(400,{message:'too many drivers'});
      const i=DB.profiles.findIndex(y=>y.id===x.id&&y.owner===ME);
      if(i<0&&DB.profiles.length>=DB.cap) return send(400,{message:'too many drivers'});
      const row=Object.assign({owner:ME,kv:{},kv_at:0},i>=0?DB.profiles[i]:{},x); if(i>=0) DB.profiles[i]=row; else DB.profiles.push(row); }
    return send(201,null); }
  if(p==='/rest/v1/bb_matches'&&q.method==='GET'){
    const own=(sp.get('owner')||'').replace(/^eq\./,''); const sel=sp.get('select')||'';
    let rows=DB.matches.filter(m=>m.owner===own);
    const ats=sp.get('at'); if(ats){ const set=new Set(ats.replace(/^in\.\(|\)$/g,'').split(',').map(Number)); rows=rows.filter(m=>set.has(m.at)); }
    const pid=sp.get('profile_id'); if(pid) rows=rows.filter(m=>'eq.'+m.profile_id===pid);
    const since=sp.get('created_at'); if(since) rows=rows.filter(m=>m.created_at>=since.replace(/^gte\./,''));
    if(sp.get('order')==='created_at.asc') rows=rows.slice().sort((a,b)=>a.created_at<b.created_at?-1:1);
    const lim=+sp.get('limit')||0; const rg=q.headers.range; if(rg){ const [a,z]=rg.split('-').map(Number); rows=rows.slice(a,z+1); } if(lim) rows=rows.slice(0,lim);
    const fields=sel.split(',');
    return send(200,rows.map(m=>{ const o={}; for(const f of fields){ const mm=f.match(/^(\w+):data->(\w+)$/); if(mm){ o[mm[1]]=m.data[mm[2]]===undefined?null:m.data[mm[2]]; } else o[f]=m[f]; } return o; })); }
  if(p==='/rest/v1/bb_matches'&&q.method==='POST'){ DB.posts++;
    if(DB.matches.filter(m=>m.owner===ME).length+body.length>DB.quota) return send(400,{message:'bb quota: too many matches for this account'});
    for(const x of body) if(!DB.matches.some(m=>m.owner===ME&&m.profile_id===x.profile_id&&m.at===x.at)) DB.matches.push({owner:ME,profile_id:x.profile_id,at:x.at,data:x.data,created_at:new Date().toISOString()});
    return send(201,null); }
  send(404,{message:'no route '+p});
}); });
await new Promise(res=>srv.listen(0,'127.0.0.1',res));
process.env.BIOBUZZ_CLOUD_URL='http://127.0.0.1:'+srv.address().port; process.env.BIOBUZZ_CLOUD_KEY='k';
const { Store } = require(path.resolve(HERE,'../app/store.js'));
const { Sync } = require(path.resolve(HERE,'../app/sync.js'));
const tmp=[]; const mk=()=>{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbv72app-')); tmp.push(d); const s=new Store(d); const y=new Sync(s,d);
  y.sess={access_token:'t',refresh_token:'r',expires_at:Date.now()+1e8,user:{id:ME,email:'a@b.c',name:'A'}}; s.setViewer(ME); s.meta.list[0].owner=ME; s.saveMeta(); return {d,s,y}; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reset=()=>{ DB.profiles=[]; DB.matches=[]; DB.cap=1e9; DB.tombRej=false; DB.quota=1e9; DB.team=false; DB.posts=0; };

// P1 — הדף הישן (טעינה מחדש נדחית באמצע מאץ׳) לא דורס ערך שהגיע מהענן
{ reset();
  const A=mk(); A.s.pageBoot(); A.s.pageKvSet('bbPrefs1',JSON.stringify({cam:'top',assist:false}),A.s.meta.active); A.s.flushKv();
  await A.y.syncNow();
  const B=mk(); await B.y.syncNow(); B.s.pageBoot();
  ok(B.s.meta.active===A.s.meta.active,'P1 שני מחשבים, אותו נהג');
  await sleep(5); B.s.pageKvSet('bbPrefs1',JSON.stringify({cam:'top',assist:true}),B.s.meta.active); B.s.flushKv(); await B.y.syncNow();
  const ra=await A.y.syncNow();
  ok(ra.changedActive&&JSON.parse(A.s.kv.bbPrefs1).assist===true,'P1 הערך מהענן נכנס לנהג הפעיל');
  await sleep(5);
  const w=A.s.pageKvSet('bbPrefs1',JSON.stringify({cam:'driver',assist:false}),A.s.meta.active);   // הדף הישן שומר את כל האובייקט הישן
  A.s.pageKvSet('bbOther1','x',A.s.meta.active);
  A.s.flushKv(); await A.y.syncNow(); await B.y.syncNow();
  ok(w===false&&JSON.parse(B.s.kv.bbPrefs1).assist===true,'P1 כתיבה ישנה של הדף למפתח שהגיע מהענן — נזרקת (assist:true נשמר בשני המחשבים)');
  ok(A.s.kv.bbOther1==='x','P1 מפתחות אחרים מהדף ממשיכים להישמר');
  A.s.pageBoot(); ok(A.s.pageKvSet('bbPrefs1',JSON.stringify({cam:'driver',assist:true}),A.s.meta.active)===true,'P1 אחרי טעינה מחדש (bb:boot) — הדף כותב שוב');
}
// P2 — הנהג הפעיל נמחק במחשב אחר → כתיבות ומאצ׳ים של הדף הישן לא נוחתים על נהג אחר
{ reset();
  const A=mk(); const d1=A.s.meta.list[0]; const d2=A.s.addProfile('Omer');
  A.s.switchTo(d2.id); A.s.kvSet('bbSeason1','[{"at":2,"who":"omer"}]'); A.s.flushKv(); A.s.switchTo(d1.id);
  A.s.pageBoot(); const pid=A.s.meta.active;
  await A.y.syncNow();
  DB.profiles.find(x=>x.id===d1.id).deleted=true;
  const r=await A.y.syncNow();
  ok(r.changedActive&&A.s.meta.active===d2.id,'P2 הנהג הפעיל נמחק בענן → הפעיל התחלף');
  const m1=A.s.pageMatchAdd({at:Date.now(),my:99,who:'dana'},pid);
  A.s.pageKvSet('bbSeason1','[{"at":1,"who":"dana"},{"at":3,"who":"dana"}]',pid); A.s.flushKv();
  ok(!A.s.matches(d2.id).some(m=>m.who==='dana')&&m1===false,'P2 מאץ׳ של הדף הישן לא נכנס לנהג האחר');
  ok(A.s.kvOf(d2.id).bbSeason1==='[{"at":2,"who":"omer"}]','P2 ההגדרות של הנהג האחר לא נדרסו');
  // מאץ׳ של נהג קיים שאינו הפעיל — נשמר אצלו
  const d3=A.s.addProfile('Noa'); A.s.pageBoot(); A.s.pageId=d3.id;
  ok(A.s.pageMatchAdd({at:Date.now()+5,my:1,who:'noa'},d3.id)===true&&A.s.matches(d3.id).some(m=>m.who==='noa'),'P2 מאץ׳ של דף ישן לנהג שעדיין קיים — נשמר אצלו (לא אצל הפעיל)');
}
// P6 — מחיקה שהשרת דוחה לא תוקעת · נהג שלא עלה לענן לא שולח שורת מחיקה
{ reset();
  const A=mk(); await A.y.syncNow();
  DB.cap=DB.profiles.length;
  const t=A.s.addProfile('temp'); A.s.removeProfile(t.id);
  A.s.addMatch({at:Date.now(),my:5});
  const r=await A.y.syncNow();
  ok(r.ok&&DB.matches.length===1&&A.s.meta.tombs.length===0&&!DB.profiles.some(x=>x.id===t.id),'P6 נהג שנוצר ונמחק בין סנכרונים — בלי שורת מחיקה, הסנכרון ממשיך ('+(r.why||'ok')+')');
  DB.cap=1e9; const u=A.s.addProfile('up'); await A.y.syncNow(); A.s.removeProfile(u.id); DB.tombRej=true;
  const r2=await A.y.syncNow(); const r3=await A.y.syncNow();
  ok(r2.ok&&r3.ok&&A.s.meta.tombs.length===0&&r2.skipped.some(x=>/tomb/.test(x.why)),'P6 מחיקה שהשרת דחה — נרשמת ב-skipped והסנכרון לא נתקע');
}
// P8 — הנהג היחיד כאן נמחק בענן
{ reset();
  const A=mk(); const d1=A.s.meta.list[0]; await A.y.syncNow();
  DB.profiles.find(x=>x.id===d1.id).deleted=true;
  const r=await A.y.syncNow();
  A.s.kvSet('bbParams1','x'); A.s.addMatch({at:Date.now(),my:7}); A.s.flushKv(); await A.y.syncNow();
  const row=DB.profiles.find(x=>x.id===d1.id);
  ok(r.changedActive&&!A.s.meta.list.some(x=>x.id===d1.id)&&A.s.vis().length===1,'P8 הנהג נמחק גם כאן, ויש נהג חדש במקומו');
  ok(row.deleted===true&&!(row.kv&&row.kv.bbParams1)&&!DB.matches.some(m=>m.profile_id===d1.id),'P8 שום דבר לא עלה לנהג שנמחק');
}
// P4 — תקרת האחסון בשרת: לא מנסים אחד־אחד
{ reset();
  const A=mk(); for(let i=0;i<30;i++) A.s.addMatch({at:1700000000000+i,my:i});
  DB.quota=10; await A.y.syncNow(); const posts=DB.posts; DB.posts=0; const r=await A.y.syncNow();
  ok(posts<=2&&DB.posts<=2&&r.ok&&r.quota===true,'P4 ״bb quota״ מהשרת → עוצרים את העלאת המאצ׳ים בסנכרון הזה (בקשות: '+posts+', '+DB.posts+')');
}
// P7 — שינוי שם לקבוצה לא זורק את היסטוריית החברים
{ reset(); DB.team=true; DB.profiles.push({owner:FR,id:'fr1',name:'F',emoji:null,color:null,deleted:false});
  const t0=Date.now(); for(let i=0;i<1200;i++) DB.matches.push({owner:FR,profile_id:'fr1',at:t0-1e7+i,created_at:new Date(t0-1e7+i).toISOString(),data:{at:t0-1e7+i,my:i%50,win:1}});
  const A=mk(); for(let i=0;i<3;i++) await A.y.syncNow();
  const n=()=>{ const tm=A.s.team(A.y.team).find(x=>x.remote); return tm?tm.sum.n:0; };
  const n0=n(); const r=await A.y.teamCall('update','Apollo 2','9662'); const n1=n();
  ok(n0===1200&&r.ok&&n1===1200,'P7 שינוי שם: '+n0+' → '+n1+' מאצ׳ים של חבר בטבלה');
  await A.y.teamCall('rotate'); ok(n()===1200,'P7 קוד חדש: המטמון נשאר');
}
// P5 — ״גבה עכשיו״ עושה עותק חדש · לפני ייבוא — עותק
{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbv72bk-')); tmp.push(d);
  let s=new Store(d); s.kvSet('bbParams1','{"morning":1}'); s.flushKv(); s.dailyBackup(14);
  s.kvSet('bbParams1','{"afternoon":"tuned"}'); s.kvSet('bbPath1','[1,2,3]'); s.flushKv();
  const tag=s.snapshot(); const id=s.meta.active;
  const bk=JSON.parse(fs.readFileSync(path.join(d,'backups',tag,'profiles',id,'store.json'),'utf8'));
  ok(/_\d{6}$/.test(tag)&&bk.bbParams1==='{"afternoon":"tuned"}'&&bk.bbPath1==='[1,2,3]','P5 ״גבה עכשיו״ — עותק חדש עם המצב של עכשיו ('+tag+')');
  await sleep(1100);
  const r=s.importBrowserBackup(JSON.stringify({bb:'backup',data:{bbLang1:'he'}}));
  const sb=JSON.parse(fs.readFileSync(path.join(d,'backups',r.snap,'profiles',id,'store.json'),'utf8'));
  ok(r.ok&&r.snap&&r.snap!==tag&&sb.bbParams1==='{"afternoon":"tuned"}','P5 לפני ייבוא — עותק בטיחות ('+r.snap+')');
  ok(s.backupsList()[0]===r.snap&&s.backupsList().includes(tag)&&s.backupsList().some(t=>/^\d{4}-\d\d-\d\d$/.test(t)),'P5 רשימת הגיבויים: יומיים ועותקים, החדש ראשון');
  for(let i=0;i<12;i++){ fs.mkdirSync(path.join(d,'backups','2020-01-01_0000'+String(i).padStart(2,'0')),{recursive:true}); }
  s.snapshot(); ok(fs.readdirSync(path.join(d,'backups')).filter(n=>/_\d{6}$/.test(n)).length===10,'P5 נשמרים 10 עותקים עם שעה');
  // store.json פגום משתחזר גם מעותק עם שעה
  const main=fs.readFileSync(path.resolve(HERE,'../app/main.js'),'utf8');
  ok(/setInterval\(\(\) => \{ try \{ store\.dailyBackup\(14\); \} catch \(e\) \{\} runSync\("timer"\); \}, 120000\)/.test(main),'P5 גיבוי יומי גם על הטיימר של שתי הדקות (אפליקציה שפתוחה כמה ימים)');
  ok(/handle\("bb:backupNow".*store\.snapshot\(\)/.test(main),'P5 bb:backupNow → snapshot');
}
// P10
{ const pj=JSON.parse(fs.readFileSync(path.resolve(HERE,'../app/package.json'),'utf8'));
  ok(pj.build.electronFuses.enableNodeCliInspectArguments===false,'P10 fuse ‏--inspect כבוי באפליקציה הארוזה'); }
// P1/P2 — main.js ו-preload מעבירים את הנהג של הדף
{ const main=fs.readFileSync(path.resolve(HERE,'../app/main.js'),'utf8'), pre=fs.readFileSync(path.resolve(HERE,'../app/preload.js'),'utf8');
  ok(/store\.pageBoot\(\)/.test(main)&&/store\.pageKvSet\(String\(k\), v, pidOf\(pid\)\)/.test(main)&&/store\.pageMatchAdd\(m, pidOf\(pid\)\)/.test(main),'P1/P2 main.js: boot מאפס, כתיבות דרך pageKvSet/pageMatchAdd');
  ok(/"bb:kvSet", String\(k\), String\(v\), PID\)/.test(pre)&&/"bb:matchAdd", m, PID\)/.test(pre),'P1/P2 preload שולח את הנהג של הדף'); }
srv.close();

// N2 + P9 — הגשר של האפליקציה
{ const { Bridge } = require(path.resolve(HERE,'../app/bridge.js'));
  const WebSocket = require(path.resolve(HERE,'../app/node_modules/ws'));
  const D=fs.mkdtempSync(path.join(os.tmpdir(),'bbv72br-')); tmp.push(D);
  const PORT=+(process.env.BB_PORT||8905)+910;   // 8905 → 9815
  let remote=false;   /* ״טלפון מהרשת״ — מדמים כתובת שאינה המחשב הזה */
  const b=new Bridge({port:PORT,dataDir:D,padPath:path.resolve(HERE,'../app/pad/pad.html'),isLocal:a=>!remote&&/^(127\.|::1$)/.test(String(a).replace(/^::ffff:/,''))});
  ok(await b.start(),'הגשר עלה');
  const pk=fs.readFileSync(path.join(D,'.pad-key'),'utf8').trim();
  ok(/^[A-Za-z0-9_-]{16,64}$/.test(pk)&&pk===b.padKey,'P9 מפתח השלט נוצר ונשמר');
  const b2=new Bridge({port:PORT+1,dataDir:D}); ok(b2.padKey===pk,'P9 אותו מפתח בהפעלה הבאה (קישור שמור ממשיך לעבוד)');
  const h=await (await fetch('http://127.0.0.1:'+PORT+'/health')).json(); ok(h.pk===pk&&b.status().pk===pk,'P9 /health מקומי + bridgeStatus מחזירים את המפתח');
  const wsOpen=q=>new Promise(res=>{ const w=new WebSocket('ws://127.0.0.1:'+PORT+'/ws?'+q); w.msgs=[]; w.on('message',d=>w.msgs.push(d.toString())); w.on('open',()=>res(w)); w.on('error',()=>res(null)); w.on('unexpected-response',()=>res(null)); });
  remote=true;
  const old=await fetch('http://127.0.0.1:'+PORT+'/'); const ot=await old.text();
  ok(old.status===403&&/סרקו שוב/.test(ot)&&/scan it again/.test(ot),'P9 קישור ישן מהרשת → הודעה ברורה');
  ok((await fetch('http://127.0.0.1:'+PORT+'/?p='+pk)).status===200,'P9 קישור עם המפתח → דף השלט');
  ok(await wsOpen('role=pad')===null,'P9 שלט מהרשת בלי מפתח — נחסם');
  const sim=await wsOpen('role=sim&t='+encodeURIComponent(b.token)); remote=true;
  const p1=await wsOpen('role=pad&p='+pk); await sleep(100);
  ok(!!p1,'P9 שלט מהרשת עם המפתח — מחובר');
  let closed=false; p1.on('close',()=>{ closed=true; });
  const p2=await wsOpen('role=pad&p='+pk); await sleep(200);
  ok(p1.msgs.some(m=>/"t":"kick"/.test(m))&&closed,'N2 טלפון שני → הראשון מקבל kick ונסגר');
  sim.msgs.length=0;
  p2.send(JSON.stringify({t:'s',a:[0,-1,0,0]})); await sleep(100);
  ok(sim.msgs.some(m=>/"a":\[0,-1/.test(m))&&b.status().pad===true&&!sim.msgs.some(m=>/"t":"pad","on":false/.test(m)),'N2 השני נוהג, והסימולטור לא קיבל ״אין טלפון״');
  remote=false; const loc=await wsOpen('role=pad'); ok(!!loc,'P9 טלפון בכבל USB / מהמחשב הזה — בלי מפתח (כמו קודם)');
  for(const w of [sim,p2,loc]) try{ w.close(); }catch(e){}
  b.stop();
}
for(const d of tmp) try{ fs.rmSync(d,{recursive:true,force:true}); }catch(e){}
done('v72_netapp_app_test');
