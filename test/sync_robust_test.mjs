// 1.12.4 — סנכרון מול שרת מדומה (לא נוגע בייצור): שורה שנדחתה לא תוקעת, חבר קבוצה לא מציף, store.json פגום משתחזר
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const ME='11111111-1111-1111-1111-111111111111', FR='22222222-2222-2222-2222-222222222222';
const DB={profiles:[],matches:[],rej:0,bigGets:0,bytesOut:0};
const MAXD=262144;
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const u=new URL(q.url,'http://x'), p=u.pathname, sp=u.searchParams;
  const send=(code,o)=>{ const t=JSON.stringify(o); DB.bytesOut+=t.length; r.writeHead(code,{'Content-Type':'application/json'}); r.end(t); };
  const body=b?JSON.parse(b):null;
  if(p==='/auth/v1/user') return send(200,{id:ME,user_metadata:{name:'A'}});
  if(p==='/rest/v1/bb_team_members') return send(200,DB.team?[{team_id:'t1',uid:ME,label:'A'},{team_id:'t1',uid:FR,label:'F'}]:[]);
  if(p==='/rest/v1/bb_teams') return send(200,[{id:'t1',code:'ABCDEF',name:'x',num:'1',owner:ME}]);
  if(p==='/rest/v1/bb_profiles'&&q.method==='GET'){
    const own=sp.get('owner')||''; const rows=DB.profiles.filter(x=>own==='eq.'+x.owner||own.startsWith('in.(')&&own.includes(x.owner));
    return send(200,rows); }
  if(p==='/rest/v1/bb_profiles'&&q.method==='POST'){
    for(const x of body){ if(x.emoji&&[...x.emoji].length>16||x.name&&x.name.length>60){ DB.rej++; return send(400,{message:'violates check constraint "bb_profiles_size_ok"'}); } }
    for(const x of body){ const i=DB.profiles.findIndex(y=>y.id===x.id&&y.owner===ME); const row=Object.assign({owner:ME},i>=0?DB.profiles[i]:{},x); if(i>=0) DB.profiles[i]=row; else DB.profiles.push(row); }
    return send(201,null); }
  if(p==='/rest/v1/bb_matches'&&q.method==='GET'){
    const own=(sp.get('owner')||'').replace(/^eq\./,''); const sel=sp.get('select')||'';
    let rows=DB.matches.filter(m=>m.owner===own);
    const ats=sp.get('at'); if(ats){ const set=new Set(ats.replace(/^in\.\(|\)$/g,'').split(',').map(Number)); rows=rows.filter(m=>set.has(m.at)); }
    const pid=sp.get('profile_id'); if(pid) rows=rows.filter(m=>'eq.'+m.profile_id===pid);
    const since=sp.get('created_at'); if(since) rows=rows.filter(m=>m.created_at>=since.replace(/^gte\./,''));
    if(sp.get('order')==='created_at.asc') rows=rows.slice().sort((a,b)=>a.created_at<b.created_at?-1:1);
    const lim=+sp.get('limit')||0; const rg=q.headers.range; if(rg){ const [a,z]=rg.split('-').map(Number); rows=rows.slice(a,z+1); } if(lim) rows=rows.slice(0,lim);
    if(own===FR&&/(^|,)data(,|$)/.test(sel)) DB.bigGets++;
    const fields=sel.split(',');
    return send(200,rows.map(m=>{ const o={}; for(const f of fields){ const mm=f.match(/^(\w+):data->(\w+)$/); if(mm){ o[mm[1]]=m.data[mm[2]]===undefined?null:m.data[mm[2]]; } else o[f]=m[f]; } return o; })); }
  if(p==='/rest/v1/bb_matches'&&q.method==='POST'){
    for(const x of body){ if(JSON.stringify(x.data).length>MAXD||x.data.evil||!(x.at<9.2e18)){ DB.rej++; return send(400,{message:'violates check constraint "bb_matches_size_ok"'}); } }
    for(const x of body) if(!DB.matches.some(m=>m.owner===ME&&m.profile_id===x.profile_id&&m.at===x.at)) DB.matches.push({owner:ME,profile_id:x.profile_id,at:x.at,data:x.data,created_at:new Date().toISOString()});
    return send(201,null); }
  send(404,{message:'no route '+p});
}); });
await new Promise(res=>srv.listen(0,'127.0.0.1',res));
process.env.BIOBUZZ_CLOUD_URL='http://127.0.0.1:'+srv.address().port; process.env.BIOBUZZ_CLOUD_KEY='k';
const { Store } = require(path.resolve(HERE,'../app/store.js'));
const { Sync } = require(path.resolve(HERE,'../app/sync.js'));
const mk=()=>{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbrob-')); const s=new Store(d); const y=new Sync(s,d);
  y.sess={access_token:'t',refresh_token:'r',expires_at:Date.now()+1e8,user:{id:ME,email:'a@b.c',name:'A'}}; s.setViewer&&s.setViewer(ME); return {d,s,y}; };

// 1. נהג עם סמל ארוך מדי + מאץ׳ ענק + at לא הגיוני — השאר עולה
{ const {s,y}=mk();
  ok(y.cloud.url.startsWith('http://127.0.0.1'),'BIOBUZZ_CLOUD_URL מפנה לשרת המדומה');
  const a=s.meta.list[0]; a.owner=ME;
  const bad=s.addProfile('רע',{emoji:'x'}); bad.owner=ME; bad.emoji='😀'.repeat(30); s.saveMeta();   /* כמו גרסה ישנה / עריכה ידנית */
  const big={at:Date.now()-5000,my:10,sh:'x'.repeat(300000)}, huge={at:Date.now()-4000,my:11,junk:'y'.repeat(300000)};
  s.addMatch({at:Date.now()-9000,my:30,win:1},a.id); s.addMatch(big,a.id); s.addMatch(huge,a.id);
  fs.appendFileSync(path.join(s.dir(a.id),'matches.jsonl'),JSON.stringify({at:1e300,my:1})+'\n');
  s.addMatch({at:Date.now()-1000,my:40,win:1},a.id);
  const r=await y.syncNow();
  ok(r.ok,'הסנכרון הצליח למרות שורות רעות '+(r.why||''));
  ok(DB.profiles.some(p=>p.id===a.id)&&DB.profiles.some(p=>p.id===bad.id&&[...(p.emoji||'')].length<=16),'שני הנהגים עלו (הסמל קוצר) — '+DB.profiles.length);
  const mine=DB.matches.filter(m=>m.profile_id===a.id);
  ok(mine.length===3&&mine.some(m=>m.data.my===10&&!m.data.sh)&&!mine.some(m=>m.data.my===11),'3 מאצ׳ים עלו: רגיל, גדול בלי sh, האחרון; הענק וה-1e300 נשארו מקומיים ('+mine.length+')');
  ok(r.skipped.length>=2,'דווח מה דולג ('+r.skipped.length+')');
  // 2. שרת שדוחה שורה בכל זאת — מאץ׳ שאחריה עולה
  const rej0=DB.rej; s.addMatch({at:Date.now()+1,my:50,evil:1},a.id); s.addMatch({at:Date.now()+2,my:51},a.id);
  const r2=await y.syncNow();
  ok(r2.ok&&DB.matches.some(m=>m.data.my===51),'חבילה שנדחתה נשלחה אחד־אחד והמאץ׳ התקין עלה (דחיות: '+(DB.rej-rej0)+')');
  const r3=await y.syncNow(); ok(r3.ok,'סנכרון שלישי לא נתקע');
}
// 3. חבר קבוצה עם 3000 מאצ׳ים כבדים — מושכים רק שדות סיכום, עד 500 בכל פעם
{ DB.team=true; DB.profiles.push({owner:FR,id:'fr1',name:'F',emoji:null,color:null,deleted:false});
  const t0=Date.now();
  for(let i=0;i<3000;i++) DB.matches.push({owner:FR,profile_id:'fr1',at:t0-1e7+i,created_at:new Date(t0-1e7+i).toISOString(),data:{at:t0-1e7+i,my:i%50,win:i%3-1,shots:5,hits:3,sh:'q'.repeat(20000),bl:[1,2,3]}});
  const {s,y,d}=mk(); s.meta.list[0].owner=ME; s.saveMeta();
  DB.bigGets=0; DB.bytesOut=0;
  const r=await y.syncNow();
  const T=y.team, l=T&&T.matches[FR+'/fr1'];
  ok(r.ok&&l&&l.length===500,'סנכרון ראשון: 500 מאצ׳ים של החבר ('+(l&&l.length)+')');
  ok(DB.bigGets===0,'לא ביקשנו את data המלא של החבר');
  ok(l&&l.every(m=>!m.sh&&!m.bl&&Object.keys(m).length<=9),'במטמון רק שדות סיכום');
  ok(DB.bytesOut<2e6,'תעבורה סבירה: '+Math.round(DB.bytesOut/1024)+' ק״ב');
  const sz=fs.statSync(path.join(d,'team-cache.json')).size; ok(sz<200000,'team-cache.json קטן: '+Math.round(sz/1024)+' ק״ב');
  for(let i=0;i<6;i++) await y.syncNow();
  ok(y.team.matches[FR+'/fr1'].length===3000,'אחרי כמה סנכרונים כל ה-3000 ('+y.team.matches[FR+'/fr1'].length+')');
  const tm=s.team(y.team).find(x=>x.remote); ok(tm&&tm.sum.n===3000&&tm.sum.shots===15000,'הסיכום של החבר נכון (n='+(tm&&tm.sum.n)+')');
  // מטמון ישן עם מאצ׳ים מלאים מצטמצם
  y.team.matches[FR+'/fr1'][0].sh='w'.repeat(1000); await y.syncNow(); ok(!y.team.matches[FR+'/fr1'][0].sh,'מטמון ישן מצטמצם');
  DB.team=false;
}
// 4. store.json פגום → .bad- + שחזור מהגיבוי היומי
{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbst-')); let s=new Store(d); const id=s.meta.active;
  s.kvSet('bbSeason1','[1,2,3]'); s.flushKv(); s.dailyBackup();
  fs.writeFileSync(path.join(s.dir(id),'store.json'),'{"bbSeason1":"[1,2');
  s=new Store(d);
  const bad=fs.readdirSync(s.dir(id)).filter(f=>f.startsWith('store.json.bad-'));
  ok(bad.length===1,'הקובץ הפגום נשמר בצד ('+bad.join(',')+')');
  ok(s.kv.bbSeason1==='[1,2,3]'&&/^backup /.test(s.kvRecovered||''),'המפתחות חזרו מהגיבוי ('+s.kvRecovered+')');
  fs.writeFileSync(path.join(s.dir(id),'store.json'),'42'); fs.rmSync(path.join(d,'backups'),{recursive:true,force:true});
  s=new Store(d); ok(s.kvRecovered==='empty'&&fs.readdirSync(s.dir(id)).filter(f=>f.startsWith('store.json.bad-')).length===2,'בלי גיבוי — ריק, אבל הקובץ נשמר בצד');
}
srv.close();
done('sync_robust_test');
