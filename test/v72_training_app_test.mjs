// v72 (1.13) — סטטיסטיקות נקיות באפליקציה: store.summarize סופר רק משחקים (לא תרגיל/אתגר), שיאי תרגילים בנפרד,
// וסנכרון הקבוצה מושך גם kind / skill / drill / dv — מול שרת מדומה בלבד (לא נוגע בייצור)
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const ME='11111111-1111-1111-1111-111111111111', FR='22222222-2222-2222-2222-222222222222';
const DB={profiles:[],matches:[],sels:[]};
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const u=new URL(q.url,'http://x'), p=u.pathname, sp=u.searchParams;
  const send=(code,o)=>{ r.writeHead(code,{'Content-Type':'application/json'}); r.end(JSON.stringify(o)); };
  const body=b?JSON.parse(b):null;
  if(p==='/auth/v1/user') return send(200,{id:ME,user_metadata:{name:'A'}});
  if(p==='/rest/v1/bb_team_members') return send(200,[{team_id:'t1',uid:ME,label:'A'},{team_id:'t1',uid:FR,label:'F'}]);
  if(p==='/rest/v1/bb_teams') return send(200,[{id:'t1',code:'ABCDEF',name:'x',num:'1',owner:ME}]);
  if(p==='/rest/v1/bb_profiles'&&q.method==='GET'){ const own=sp.get('owner')||''; return send(200,DB.profiles.filter(x=>own==='eq.'+x.owner||own.startsWith('in.(')&&own.includes(x.owner))); }
  if(p==='/rest/v1/bb_profiles'&&q.method==='POST'){ for(const x of body){ const i=DB.profiles.findIndex(y=>y.id===x.id&&y.owner===ME); const row=Object.assign({owner:ME},i>=0?DB.profiles[i]:{},x); if(i>=0) DB.profiles[i]=row; else DB.profiles.push(row); } return send(201,null); }
  if(p==='/rest/v1/bb_matches'&&q.method==='GET'){
    const own=(sp.get('owner')||'').replace(/^eq\./,''); const sel=sp.get('select')||''; if(own===FR) DB.sels.push(sel);
    let rows=DB.matches.filter(m=>m.owner===own);
    const ats=sp.get('at'); if(ats){ const set=new Set(ats.replace(/^in\.\(|\)$/g,'').split(',').map(Number)); rows=rows.filter(m=>set.has(m.at)); }
    const pid=sp.get('profile_id'); if(pid) rows=rows.filter(m=>'eq.'+m.profile_id===pid);
    const lim=+sp.get('limit')||0; if(lim) rows=rows.slice(0,lim);
    const fields=sel.split(',');
    return send(200,rows.map(m=>{ const o={}; for(const f of fields){ const mm=f.match(/^(\w+):data->(\w+)$/); if(mm){ o[mm[1]]=m.data[mm[2]]===undefined?null:m.data[mm[2]]; } else o[f]=m[f]; } return o; })); }
  if(p==='/rest/v1/bb_matches'&&q.method==='POST'){ for(const x of body) if(!DB.matches.some(m=>m.owner===ME&&m.profile_id===x.profile_id&&m.at===x.at)) DB.matches.push({owner:ME,profile_id:x.profile_id,at:x.at,data:x.data,created_at:new Date().toISOString()}); return send(201,null); }
  send(404,{message:'no route '+p});
}); });
await new Promise(res=>srv.listen(0,'127.0.0.1',res));
process.env.BIOBUZZ_CLOUD_URL='http://127.0.0.1:'+srv.address().port; process.env.BIOBUZZ_CLOUD_KEY='k';
const { Store } = require(path.resolve(HERE,'../app/store.js'));
const { Sync } = require(path.resolve(HERE,'../app/sync.js'));

// 1. סיכום מקומי: תרגיל, אתגר ורשומת שיא לא נספרים כמשחקים; שיאי תרגילים בנפרד
{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bb72-')); const s=new Store(d); const id=s.meta.active; const t0=Date.now()-1e6;
  s.addMatch({at:t0,kind:'match',my:40,opp:30,win:1,shots:10,hits:6,avgCycle:9,fouls:0,park:true},id);
  s.addMatch({at:t0+1,kind:'drill',my:10,opp:10,win:0,shots:5,hits:5,avgCycle:4},id);
  s.addMatch({at:t0+2,kind:'daily',my:30,opp:0,win:1,shots:4,hits:4},id);
  s.addMatch({at:t0+3,kind:'quick',my:20,opp:35,win:-1,shots:10,hits:4,avgCycle:8,fouls:1,park:false},id);
  s.addMatch({at:t0+4,kind:'drill',drill:'acc',dv:9},id); s.addMatch({at:t0+5,kind:'drill',drill:'acc',dv:10},id);
  s.addMatch({at:t0+6,kind:'drill',drill:'speed',dv:31.5},id); s.addMatch({at:t0+7,kind:'drill',drill:'speed',dv:28.2},id);
  const S=s.summary(id);
  ok(S.n===2&&S.W===1&&S.L===1&&S.T===0,'סיכום נהג: 2 משחקים (1-1), בלי התרגיל, האתגר ורשומות השיא — n='+S.n);
  ok(Math.abs(S.acc-0.5)<1e-9&&Math.abs(S.cyc-8.5)<1e-9&&S.park===0.5,'דיוק 50%, מחזור 8.5 שנ׳, חניה 50% — רק מהמשחקים');
  ok(S.drills&&S.drills.acc===10&&S.drills.speed===28.2,'שיאי תרגילים: דיוק 10 (גבוה), 3 מחזורים 28.2 שנ׳ (נמוך)');
  const e=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'bb72e-'))); const S0=e.summary(e.meta.active);
  ok(S0.n===0&&S0.drills&&!Object.keys(S0.drills).length,'נהג בלי משחקים: n=0');
}
// 2. סנכרון: שדות הסיכום של חבר כוללים kind/skill/drill/dv, והסיכום שלו נקי
{ DB.profiles.push({owner:FR,id:'fr1',name:'F',emoji:null,color:null,deleted:false});
  const t0=Date.now()-5e6, add=(i,data)=>DB.matches.push({owner:FR,profile_id:'fr1',at:t0+i,created_at:new Date(t0+i).toISOString(),data:Object.assign({at:t0+i},data)});
  add(1,{kind:'match',my:50,win:1,shots:10,hits:8,avgCycle:7,skill:2,sh:'x'.repeat(5000)});
  add(2,{kind:'drill',my:10,win:0,shots:10,hits:10,avgCycle:3,skill:1});
  add(3,{kind:'daily',my:5,win:1,shots:2,hits:2});
  add(4,{kind:'drill',drill:'load',dv:8.4});
  add(5,{kind:'<script>',my:1,win:1});   /* מחרוזת זבל — לא נשמרת */
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'bb72s-')); const s=new Store(d); const y=new Sync(s,d);
  y.sess={access_token:'t',refresh_token:'r',expires_at:Date.now()+1e8,user:{id:ME,email:'a@b.c',name:'A'}}; s.setViewer&&s.setViewer(ME); s.meta.list[0].owner=ME; s.saveMeta();
  const r=await y.syncNow();
  const l=y.team&&y.team.matches[FR+'/fr1']||[];
  ok(r.ok&&l.length===5,'סנכרון הצליח, 5 רשומות של החבר ('+l.length+')');
  ok(DB.sels.some(x=>/kind:data->kind/.test(x)&&/skill:data->skill/.test(x)&&/drill:data->drill/.test(x)&&/dv:data->dv/.test(x)),'מבקשים גם kind, skill, drill, dv');
  const by=at=>l.find(m=>m.at===t0+at)||{};
  ok(by(1).kind==='match'&&by(1).skill===2&&!by(1).sh&&by(4).drill==='load'&&by(4).dv===8.4&&by(5).kind===undefined,'במטמון: kind/skill/drill/dv; מחרוזת לא חוקית (״<script>״) לא נשמרת');
  const tm=s.team(y.team).find(x=>x.remote);
  ok(tm&&tm.sum.n===2&&tm.sum.W===2&&Math.abs(tm.sum.acc-0.8)<1e-9&&tm.sum.drills.load===8.4,'בטבלת הקבוצה: החבר עם 2 משחקים (לא 5), דיוק 80%, שיא טעינה 8.4 — n='+(tm&&tm.sum.n));
}
srv.close();
done('v72_training_app_test');
