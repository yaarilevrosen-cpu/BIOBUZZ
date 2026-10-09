// v73 legalfix — מה שהמסמכים מבטיחים, בצד האפליקציה (node, שרתים מדומים בלבד, אף פעם לא ה-Supabase האמיתי):
// דרישה 4 — גרסת מסמכים חדשה עוצרת את הסנכרון עד שמאשרים (וחשבון ישן עונה גם על הגיל) · דרישה 2 — ההורדה כוללת את פרטי החשבון ואת הדיווחים שלי
// דרישה 9 — חברי קבוצה דרך הפונקציות (שדות הסיכום בלבד) ונפילה לשאילתות הישנות · דרישה 8 — מחיקת נהג מוחקת את המאצ׳ים שלו בענן
// דרישה 10 — בלי שמות לגוגל (כינויים, ובחזרה בתשובה) · דרישה 11 — מחיקת הגיבויים · דרישה 5 — 13–17 בלי בינה מלאכותית (main.js)
import http from 'http'; import fs from 'fs'; import os from 'os'; import path from 'path'; import {createRequire} from 'module'; import {fileURLToPath} from 'url';
import {ok,done} from './h.mjs';
const require=createRequire(import.meta.url);
const HERE=path.dirname(fileURLToPath(import.meta.url)), APP=path.resolve(HERE,'../app');
const {Sync,TEAM_FIELDS}=require(APP+'/sync.js'); const {Store}=require(APP+'/store.js'); const {AI,Pseudo}=require(APP+'/ai.js');
const tmp=p=>fs.mkdtempSync(path.join(os.tmpdir(),p));
const VER=fs.readFileSync(path.resolve(HERE,'../legal/VERSION'),'utf8').trim();
const ME='aaaaaaaa-1111-2222-3333-444444444444', FR='cccccccc-1111-2222-3333-444444444444', TEAM='bbbbbbbb-1111-2222-3333-444444444444';

/* ── Supabase מדומה ── */
const S={reqs:[], meta:{name:'Maya'}, profiles:[], matches:[], team:false, rpc:true, bugs:[{id:7,created_at:'2026-10-01T00:00:00Z',what:'crash',contact:'',shot:null}]};
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const u=new URL(q.url,'http://x'), p=u.pathname, sp=u.searchParams, body=b?JSON.parse(b):null;
  S.reqs.push({m:q.method,u:q.url,p,body});
  const J=(o,st=200)=>{ r.writeHead(st,{'content-type':'application/json'}); r.end(o===undefined?'':JSON.stringify(o)); };
  const user=()=>({id:ME,email:'maya@example.com',created_at:'2026-01-01T00:00:00Z',last_sign_in_at:'2026-10-09T08:00:00Z',user_metadata:S.meta});
  if(p.startsWith('/auth/v1/token')) return J({access_token:'tok',refresh_token:'ref',expires_in:3600,user:user()});
  if(p==='/auth/v1/user'&&q.method==='GET') return J(user());
  if(p==='/auth/v1/user'&&q.method==='PUT'){ S.meta=Object.assign({},S.meta,body.data||{}); return J(user()); }
  const nofn=()=>J({code:'PGRST202',message:'Could not find the function in the schema cache'},404);
  if(p==='/rest/v1/rpc/bb_my_bugs') return S.rpc?J(S.bugs):nofn();
  if(p==='/rest/v1/rpc/bb_team_profiles') return S.rpc?J(S.profiles.filter(x=>x.owner===FR).map(x=>({owner:x.owner,id:x.id,name:x.name,emoji:x.emoji,color:x.color,deleted:!!x.deleted}))):nofn();
  if(p==='/rest/v1/rpc/bb_team_matches'){ if(!S.rpc) return nofn();
    let rows=S.matches.filter(m=>m.owner===body.p_owner&&body.p_owner!==ME); if(body.p_since) rows=rows.filter(m=>m.created_at>=body.p_since);
    rows=rows.slice(0,body.p_limit||500);
    return J(rows.map(m=>{ const o={owner:m.owner,profile_id:m.profile_id,at:m.at,created_at:m.created_at}; for(const f of TEAM_FIELDS) o[f]=m.data[f]===undefined?null:m.data[f]; return o; })); }
  if(p==='/rest/v1/bb_team_members') return J(S.team?[{team_id:TEAM,uid:ME,label:'Maya',joined_at:'2026-02-01T00:00:00Z'},{team_id:TEAM,uid:FR,label:'Noa',joined_at:'2026-02-02T00:00:00Z'}]:[]);
  if(p==='/rest/v1/bb_teams') return J([{id:TEAM,code:'ABCD2345',name:'Apollo',num:'9662',owner:ME}]);
  if(p==='/rest/v1/bb_profiles'&&q.method==='GET'){ const own=sp.get('owner')||''; let rows=S.profiles.filter(x=>own==='eq.'+x.owner||own.startsWith('in.(')&&own.includes(x.owner));
    const id=sp.get('id'); if(id) rows=rows.filter(x=>'eq.'+x.id===id); return J(rows); }
  if(p==='/rest/v1/bb_profiles'&&q.method==='POST'){ for(const x of body){ const i=S.profiles.findIndex(y=>y.id===x.id&&y.owner===ME); const row=Object.assign({owner:ME,kv:{},kv_at:0},i>=0?S.profiles[i]:{},x); if(i>=0) S.profiles[i]=row; else S.profiles.push(row); } return J(null,201); }
  if(p==='/rest/v1/bb_matches'&&q.method==='GET'){ const own=(sp.get('owner')||'').replace(/^eq\./,''); let rows=S.matches.filter(m=>m.owner===own);
    const pid=sp.get('profile_id'); if(pid) rows=rows.filter(m=>'eq.'+m.profile_id===pid);
    const ats=sp.get('at'); if(ats){ const set=new Set(ats.replace(/^in\.\(|\)$/g,'').split(',').map(Number)); rows=rows.filter(m=>set.has(m.at)); }
    const sel=(sp.get('select')||'').split(','); const rg=q.headers.range; if(rg){ const [a,z]=rg.split('-').map(Number); rows=rows.slice(a,z+1); }
    return J(rows.map(m=>{ if(sel[0]==='*') return m; const o={}; for(const f of sel){ const mm=f.match(/^(\w+):data->(\w+)$/); if(mm) o[mm[1]]=m.data[mm[2]]===undefined?null:m.data[mm[2]]; else o[f]=m[f]; } return o; })); }
  if(p==='/rest/v1/bb_matches'&&q.method==='POST'){ for(const x of body) if(!S.matches.some(m=>m.owner===ME&&m.profile_id===x.profile_id&&m.at===x.at)) S.matches.push({owner:ME,profile_id:x.profile_id,at:x.at,data:x.data,created_at:new Date().toISOString()}); return J(null,201); }
  if(p==='/rest/v1/bb_matches'&&q.method==='DELETE'){ const own=(sp.get('owner')||'').replace(/^eq\./,''), pid=(sp.get('profile_id')||'').replace(/^eq\./,'');
    if(own!==ME) return J({message:'rls'},403); S.matches=S.matches.filter(m=>!(m.owner===own&&m.profile_id===pid)); return J(null,204); }
  J({message:'no route '+p},404);
}); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
const mk=opt=>{ const D=tmp('bb73fix-'); const st=new Store(D); return {D,st,sy:new Sync(st,D,Object.assign({cloud:{url:BASE,key:'anon-test'}},opt||{}))}; };
const dirs=[];

/* ── דרישה 4: גרסת מסמכים חדשה — הסנכרון מושהה עד שמאשרים; חשבון ישן עונה גם על הגיל ── */
{
  S.meta={name:'Maya'}; S.reqs.length=0;
  const {D,st,sy}=mk({tosNeed:VER}); dirs.push(D);
  await sy.signIn('maya@example.com','pw123456');
  st.meta.list[0].owner=ME; st.saveMeta(); st.addMatch({at:Date.now()-5000,my:12},st.meta.list[0].id);
  ok(sy.status().tosWait===true&&sy.status().tosNeed===VER&&sy.status().age==='','חשבון בלי tos_v: status().tosWait=true (גרסה '+VER+'), בלי טווח גיל');
  S.reqs.length=0; let r=await sy.syncNow();
  ok(!r.ok&&r.needTos&&/מושהה/.test(r.why)&&/מושהה/.test(sy.status().lastError),'syncNow: ״מושהה עד שמאשרים״ (needTos) — '+r.why);
  ok(!S.reqs.some(x=>/bb_profiles|bb_matches/.test(x.p))&&!S.matches.length,'בזמן ההשהיה: שום נהג או מאץ׳ לא עלה ולא ירד ('+S.reqs.map(x=>x.m+' '+x.p).join(', ')+')');
  r=await sy.teamCall('join','ABCD2345'); ok(!r.ok&&r.needTos,'גם פעולות קבוצה מושהות');
  r=await sy.exportMine(); ok(r.ok,'הורדת הנתונים עובדת גם בזמן ההשהיה');
  r=await sy.tosAccept(VER); ok(!r.ok&&r.needAge&&!S.meta.tos_v,'חשבון בלי טווח גיל: אישור בלי גיל — נדחה (needAge), לא נשלח');
  r=await sy.tosAccept(VER,{age_bracket:'u13'}); ok(!r.ok&&r.u13&&/13/.test(r.why)&&!S.meta.tos_v,'מתחת ל-13 — אין אישור ('+r.why+')');
  r=await sy.tosAccept(VER,{age_bracket:'13-17'}); ok(!r.ok&&/הורה/.test(r.why),'13–17 בלי הסכמת הורה — נדחה');
  S.reqs.length=0; r=await sy.tosAccept(VER,{age_bracket:'13-17',guardian_ok:true});
  const put=S.reqs.find(x=>x.m==='PUT'); const d=put&&put.body.data||{};
  ok(r.ok&&Object.keys(d).sort().join()==='age_bracket,guardian_ok,tos_at,tos_v'&&d.tos_v===VER&&d.age_bracket==='13-17'&&d.guardian_ok===true,'אישור: PUT {tos_v, tos_at, age_bracket, guardian_ok} — '+JSON.stringify(d));
  ok(!sy.status().tosWait&&sy.status().age==='13-17','אחרי האישור: tosWait=false, age=13-17');
  r=await sy.syncNow(); ok(r.ok&&S.matches.length===1,'הסנכרון ממשיך מיד אחרי האישור (המאץ׳ עלה)');
  /* חשבון עם גיל — אישור בלי לשאול שוב; מחשב אחר מקבל את האישור מהשרת */
  const o=mk({tosNeed:VER}); dirs.push(o.D); await o.sy.signIn('maya@example.com','pw123456');
  ok(!o.sy.status().tosWait&&o.sy.status().age==='13-17','מחשב אחר: האישור והגיל מגיעים מהחשבון — לא מושהה');
  const v2='2099-01-01'; o.sy.tosNeed=v2; ok(o.sy.status().tosWait,'גרסה חדשה (2099-01-01) — שוב מושהה');
  S.reqs.length=0; r=await o.sy.tosAccept(v2); const d2=(S.reqs.find(x=>x.m==='PUT')||{body:{data:{}}}).body.data;
  ok(r.ok&&Object.keys(d2).sort().join()==='tos_at,tos_v'&&!o.sy.status().tosWait,'חשבון עם טווח גיל: האישור שולח רק {tos_v, tos_at}');
  const n=mk(); dirs.push(n.D); await n.sy.signIn('maya@example.com','pw123456'); n.sy.sess.user.tos_v='';
  ok(!n.sy.status().tosWait,'בלי tosNeed (למשל בדיקות) — אין השהיה');
}
/* ── דרישה 2: ההורדה — פרטי החשבון, ההסכמה והגיל, והדיווחים שלי ── */
{
  const {D,sy}=mk({tosNeed:VER}); dirs.push(D); await sy.signIn('maya@example.com','pw123456');
  S.rpc=true; let r=await sy.exportMine(); const a=r.data.account;
  ok(r.ok&&a.email==='maya@example.com'&&a.name==='Maya'&&a.created_at==='2026-01-01T00:00:00Z'&&a.age_bracket==='13-17'&&a.guardian_ok===true&&a.tos_v&&a.tos_at,'החשבון: מייל, שם, תאריך יצירה, טווח גיל, הסכמת הורה, גרסת התנאים ומועד האישור');
  ok(Array.isArray(r.data.bug_reports)&&r.data.bug_reports.length===1&&r.data.bug_reports[0].what==='crash'&&S.reqs.some(x=>x.p==='/rest/v1/rpc/bb_my_bugs'),'הדיווחים שלי — דרך rpc/bb_my_bugs');
  ok(Array.isArray(r.data.profiles)&&Array.isArray(r.data.matches)&&r.data.team,'נהגים, מאצ׳ים וקבוצה — כמו קודם');
  S.rpc=false; r=await sy.exportMine();
  ok(r.ok&&r.data.bug_reports===null&&/GitHub/.test(r.data.bug_reports_note),'בלי הפונקציה בשרת — הקובץ יורד, עם הערה במקום הדיווחים');
  S.rpc=true;
}
/* ── דרישה 9: חברי קבוצה — רק דרך הפונקציות (שם/סמל/צבע + שדות הסיכום) ── */
{
  S.team=true; S.profiles.push({owner:FR,id:'f1',name:'Noa',emoji:'🐝',color:'#00ff00',kv:{bbKeyBind1:'secret'},deleted:false});
  S.matches.push({owner:FR,profile_id:'f1',at:11,created_at:'2026-10-02T00:00:00Z',data:{my:30,win:true,kind:'full',avgCycle:7.1,sh:[[1,2]],bl:[1],secret:'x'}});
  const {D,sy}=mk({tosNeed:VER}); dirs.push(D); await sy.signIn('maya@example.com','pw123456');
  S.reqs.length=0; await sy.teamPull();
  const T=sy.team, m=(T.matches[FR+'/f1']||[])[0]||{};
  ok(T.profiles[FR+'/f1']&&T.profiles[FR+'/f1'].name==='Noa'&&m.my===30&&m.win===true&&m.kind==='full'&&m.avgCycle===7.1&&!('sh' in m)&&!('secret' in m),'הנהג של החבר והסיכום הגיעו דרך הפונקציות (בלי sh/bl/שדות אחרים)');
  ok(S.reqs.some(x=>x.p==='/rest/v1/rpc/bb_team_profiles')&&S.reqs.some(x=>x.p==='/rest/v1/rpc/bb_team_matches'&&x.body.p_owner===FR&&x.body.p_limit===500)
    &&!S.reqs.some(x=>x.m==='GET'&&/bb_profiles|bb_matches/.test(x.p)),'אין קריאה ישירה ל-bb_profiles/bb_matches של חבר');
  S.matches.push({owner:FR,profile_id:'f1',at:12,created_at:'2026-10-03T00:00:00Z',data:{my:40}});
  S.reqs.length=0; await sy.teamPull(); const call=S.reqs.find(x=>x.p==='/rest/v1/rpc/bb_team_matches');
  ok(call&&call.body.p_since==='2026-10-02T00:00:00Z'&&(sy.team.matches[FR+'/f1']||[]).length===2,'ממשיכים מאיפה שעצרנו (p_since) — '+(call&&call.body.p_since));
  /* שרת בלי הפונקציות (v73_privacy.sql לא הורץ) — השאילתות הישנות */
  S.rpc=false; const o=mk({tosNeed:VER}); dirs.push(o.D); await o.sy.signIn('maya@example.com','pw123456'); S.reqs.length=0; await o.sy.teamPull();
  ok((o.sy.team.matches[FR+'/f1']||[]).length===2&&S.reqs.some(x=>x.m==='GET'&&x.p==='/rest/v1/bb_profiles'&&/owner=in\./.test(x.u))&&S.reqs.some(x=>x.m==='GET'&&x.p==='/rest/v1/bb_matches'&&x.u.includes('owner=eq.'+FR)),'בלי הפונקציות — נופלים לשאילתות הישנות, והקבוצה עדיין עובדת');
  S.rpc=true; S.team=false;
  /* קוד: הפונקציה ב-SQL מחזירה בדיוק את TEAM_FIELDS */
  const sql=fs.readFileSync(path.resolve(HERE,'../supabase/v73_privacy.sql'),'utf8');
  ok(TEAM_FIELDS.every(f=>sql.includes("m.data->'"+f+"'"))&&/drop policy if exists bb_profiles_team_read/.test(sql)&&/drop policy if exists bb_matches_team_read/.test(sql),'v73_privacy.sql: bb_team_matches מחזירה את TEAM_FIELDS, וההרשאות הרחבות נמחקות');
  ok(!/create policy bb_(profiles|matches)_team_read/.test(fs.readFileSync(path.resolve(HERE,'../supabase/schema.sql'),'utf8')),'schema.sql לא יוצר אותן מחדש בהרצה חוזרת');
}
/* ── דרישה 8: מחיקת נהג — גם המאצ׳ים שלו נמחקים מהענן ── */
{
  S.profiles=S.profiles.filter(x=>x.owner!==ME); S.matches=S.matches.filter(x=>x.owner!==ME); S.meta.tos_v=VER;   /* למעלה אושרה גרסה 2099 */
  const {D,st,sy}=mk({tosNeed:VER}); dirs.push(D); await sy.signIn('maya@example.com','pw123456');
  const a=st.meta.list[0]; a.owner=ME; const b=st.addProfile('B',{owner:ME}); st.saveMeta();
  st.addMatch({at:1000,my:1},b.id); st.addMatch({at:2000,my:2},b.id); st.addMatch({at:3000,my:3},a.id);
  let r=await sy.syncNow(); ok(r.ok&&S.matches.filter(m=>m.owner===ME).length===3,'לפני: 3 מאצ׳ים בענן');
  st.removeProfile(b.id); S.reqs.length=0; r=await sy.syncNow();
  const tomb=S.profiles.find(x=>x.id===b.id), del=S.reqs.find(x=>x.m==='DELETE'&&x.p==='/rest/v1/bb_matches');
  ok(r.ok&&tomb&&tomb.deleted===true&&tomb.name===''&&del&&del.u.includes('owner=eq.'+ME)&&del.u.includes('profile_id=eq.'+b.id),'מחיקה: מצבה (deleted, בלי שם) + DELETE bb_matches של הנהג');
  ok(S.matches.filter(m=>m.owner===ME).length===1&&S.matches.every(m=>m.profile_id!==b.id)&&r.deletedMatches===2,'המאצ׳ים של הנהג שנמחק נמחקו; של הנהג השני נשארו');
  /* נהג שנמחק קודם (גרסה ישנה) ונשארו לו מאצ׳ים בענן — נמחקים בסנכרון הבא */
  S.profiles.push({owner:ME,id:'old1',name:'',deleted:true,kv:{},kv_at:0,meta_at:1}); S.matches.push({owner:ME,profile_id:'old1',at:5,data:{my:5},created_at:'2026-01-01T00:00:00Z'});
  r=await sy.syncNow(); ok(r.ok&&!S.matches.some(m=>m.profile_id==='old1'),'מצבה ישנה עם מאצ׳ים בענן — המאצ׳ים נמחקים');
  r=await sy.syncNow(); ok(r.ok&&r.deletedMatches===0,'סנכרון נוסף — אין מה למחוק');
}
/* ── דרישה 10: בלי שמות לגוגל ── */
{
  const G={bodies:[]}; const g=http.createServer((q,s)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{ s.writeHead(200,{'content-type':'application/json'});
    if(q.method==='GET') return s.end(JSON.stringify({models:[{name:'models/gemini-9-flash',displayName:'F',supportedGenerationMethods:['generateContent']}]}));
    const body=JSON.parse(b); G.bodies.push(body); const txt=JSON.stringify(body.contents);
    if(/Reply with the single word OK/.test(txt)) return s.end(JSON.stringify({candidates:[{content:{parts:[{text:'OK'}]},finishReason:'STOP'}]}));
    if(body.generationConfig&&body.generationConfig.responseMimeType==='application/json')
      return s.end(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({headline:'Team X is improving',drivers:[{name:'Driver 1',note:'Driver 1 beats Driver 2'},{name:'Driver 2',note:'faster cycles'}]})}]},finishReason:'STOP'}]}));
    s.end(JSON.stringify({candidates:[{content:{parts:[{text:'Driver 1 should practise with Member 1 for Team X; נהג 3 too.'}]},finishReason:'STOP'}]})); }); });
  await new Promise(r=>g.listen(0,'127.0.0.1',r)); process.env.BIOBUZZ_GEMINI_BASE='http://127.0.0.1:'+g.address().port;
  const AD=tmp('bb73fixai-'); dirs.push(AD); const A=new AI(AD,{canEnc:()=>false}); A.ack18(true); await A.setKey('AIza'+'k'.repeat(35));
  G.bodies.length=0;
  let r=await A.ask('coach',{summary:{scope:'team',team:'Apollo 9662',drivers:[{name:'Dana Levi',matches:5,winRate:0.6},{name:'Noa',matches:4,winRate:0.5}],byMatchType:[{name:'full',n:5}]}});
  let sent=JSON.stringify(G.bodies[0]||{});
  ok(r.ok&&!/Dana|Levi|Noa|Apollo/.test(sent)&&/Driver 1/.test(sent)&&/Driver 2/.test(sent)&&/Team X/.test(sent),'המאמן (קבוצה): לגוגל נשלחים רק כינויים — '+JSON.stringify(r.sent).slice(0,160));
  ok(r.sent.byMatchType[0].name==='full','שדות שאינם שמות (סוג המשחק) לא משתנים');
  ok(r.json.headline==='Apollo 9662 is improving'&&r.json.drivers[0].name==='Dana Levi'&&r.json.drivers[0].note==='Dana Levi beats Noa'&&r.json.drivers[1].name==='Noa','בתשובה הכינויים מוחלפים בחזרה בשמות האמיתיים');
  ok(!JSON.stringify(r.sent).includes('Dana')&&r.sent.team==='Team X','״מה נשלח לגוגל״ (sent) — עם הכינויים, כמו שנשלח באמת');
  ok(/placeholders/.test(sent),'ההוראות למודל מבקשות להשתמש בכינויים כמו שהם');
  G.bodies.length=0;
  r=await A.ask('coach',{summary:{scope:'driver',driver:'Dana Levi',matchesTotal:9}});
  sent=JSON.stringify(G.bodies[0]||{}); ok(r.ok&&!/Dana/.test(sent)&&r.sent.driver==='Driver 1','המאמן (נהג אחד): driver = Driver 1');
  G.bodies.length=0;
  r=await A.ask('helper',{messages:[{role:'user',text:'How can Dana Levi and dana levi beat Noa? ולנועה יש שאלה; Maya asks for Apollo 9662. Noah stays.'}],names:{drivers:['Dana Levi','Noa','נועה'],members:['Maya'],team:'Apollo 9662'}});
  sent=JSON.stringify(G.bodies[0].contents);
  ok(!/Dana|dana|Noa\b|נועה|Maya|Apollo/.test(sent)&&/How can Driver 1 and Driver 1 beat Driver 3\? ולDriver 2/.test(sent)&&/Member 1 asks for Team X/.test(sent)&&/Noah stays/.test(sent),'העוזר: שמות מוכרים בטקסט החופשי מוחלפים (גם עם אות שימוש), מילים אחרות לא — '+sent.slice(0,200));
  ok(r.ok&&r.text==='Dana Levi should practise with Maya for Apollo 9662; Noa too.','התשובה של העוזר — עם השמות האמיתיים');
  const P=new Pseudo(); ok(P.back('Driver 7 and Team X')==='Driver 7 and Team X','כינוי שלא נשלח — לא מוחלף');
  g.close(); delete process.env.BIOBUZZ_GEMINI_BASE;
}
/* ── דרישה 11: ״אפס הכול — כולל הגיבויים״ באפליקציה ── */
{
  const D=tmp('bb73fixbk-'); dirs.push(D); const st=new Store(D);
  st.dailyBackup(14); st.snapshot(); st.addProfile('X',{}); const x=st.meta.list.find(p=>p.name==='X'); st.removeProfile(x.id);
  ok(st.backupsList().length>=2&&fs.readdirSync(path.join(D,'trash')).length===1,'לפני: גיבוי יומי, עותק, ונהג בסל');
  const r=st.wipeBackups();
  ok(r.ok&&r.n>=3&&!fs.existsSync(path.join(D,'backups'))&&!fs.existsSync(path.join(D,'trash'))&&st.backupsList().length===0,'wipeBackups: תיקיית הגיבויים והסל נמחקו ('+r.n+')');
  ok(st.meta.list.length>=1&&fs.existsSync(st.dir(st.meta.active)),'הנהגים עצמם נשארו');
  ok(st.wipeBackups().ok&&st.dailyBackup(14),'שוב — בלי שגיאה, והגיבוי היומי הבא נוצר כרגיל');
}
/* ── main.js / preload: הערוצים ושער 13–17 ── */
{
  const m=fs.readFileSync(APP+'/main.js','utf8'), p=fs.readFileSync(APP+'/preload.js','utf8');
  ok(/handle\("bb:wipeBackups"/.test(m)&&p.includes('"bb:wipeBackups"'),'bb:wipeBackups — דרך handle() (בדיקת השולח) ונחשף ב-preload');
  ok(/tosNeed: legalVersion\(\)/.test(m)&&/process\.resourcesPath && path\.join\(process\.resourcesPath, "legal"\)/.test(m),'הגרסה הנדרשת מ-legal/VERSION (גם באפליקציה הארוזה)');
  ok(['bb:aiSetKey','bb:aiCheck','bb:aiAsk'].every(c=>new RegExp('handle\\("'+c+'"[^\\n]*aiMinor\\(\\)').test(m))&&/age === "13-17"/.test(m),'13–17: setKey/check/ask מסרבים בתהליך הראשי, לא רק בדף');
  ok(/acctTos: \(v, meta\)/.test(p)&&/age_bracket: String\(meta\.age_bracket/.test(p),'preload: acctTos מעביר רק טווח גיל והסכמת הורה');
}
srv.close(); for(const d of dirs) try{ fs.rmSync(d,{recursive:true,force:true}); }catch(e){}
done('v73_legalfix_app');
