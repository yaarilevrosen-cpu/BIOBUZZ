// v73 legal — האפליקציה (node, שרתים מדומים בלבד, אף פעם לא ה-Supabase האמיתי):
// הרשמה עם הסכמה וטווח גיל (user_metadata), אישור תנאים מעודכנים, ייצוא הנתונים שלי, מחיקת חשבון (כולל ״הפונקציה עוד לא בשרת״),
// מחיקה מקומית של נהגי החשבון, ושער 18+ לבינה המלאכותית
import http from 'http'; import fs from 'fs'; import os from 'os'; import path from 'path'; import {createRequire} from 'module'; import {fileURLToPath} from 'url';
import {ok,done} from './h.mjs';
const require=createRequire(import.meta.url);
const HERE=path.dirname(fileURLToPath(import.meta.url)), APP=path.resolve(HERE,'../app');
const {Sync,signupMeta}=require(APP+'/sync.js'); const {Store}=require(APP+'/store.js'); const {AI}=require(APP+'/ai.js');
const tmp=p=>fs.mkdtempSync(path.join(os.tmpdir(),p));
const VER=fs.readFileSync(path.resolve(HERE,'../legal/VERSION'),'utf8').trim();
const UID='aaaaaaaa-1111-2222-3333-444444444444', TEAM='bbbbbbbb-1111-2222-3333-444444444444';

/* ── Supabase מדומה ── */
const S={reqs:[], meta:{name:'Maya'}, noRpc:false, deleted:false, confirm:false};
const srv=http.createServer((q,s)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const body=b?JSON.parse(b):null; S.reqs.push({m:q.method,u:q.url,body,auth:q.headers.authorization||''});
  const J=(o,st=200)=>{ s.writeHead(st,{'content-type':'application/json'}); s.end(o===undefined?'':JSON.stringify(o)); };
  const user=()=>({id:UID,email:'maya@example.com',created_at:'2026-01-01T00:00:00Z',user_metadata:S.meta});
  const sess=()=>({access_token:'tok',refresh_token:'ref',expires_in:3600,user:user()});
  const u=q.url;
  if(q.method==='POST'&&u.startsWith('/auth/v1/signup')){ S.meta=Object.assign({},body.data||{}); return S.confirm?J({id:UID,email:body.email,user_metadata:S.meta}):J(sess()); }
  if(q.method==='POST'&&u.startsWith('/auth/v1/token')) return J(sess());
  if(q.method==='GET'&&u==='/auth/v1/user') return J(user());
  if(q.method==='PUT'&&u==='/auth/v1/user'){ S.meta=Object.assign({},S.meta,body.data||{}); return J(user()); }
  if(u.startsWith('/auth/v1/logout')) return J({});
  if(u.startsWith('/rest/v1/rpc/bb_delete_me')){ if(S.noRpc) return J({code:'PGRST202',message:'Could not find the function public.bb_delete_me without parameters in the schema cache'},404); S.deleted=true; return J(null,200); }
  if(u.startsWith('/rest/v1/bb_profiles')) return J([{owner:UID,id:'d1',name:'Maya',emoji:'🚀',color:'#ffb020',kv:{bbKeyBind1:'{}'},kv_at:5,meta_at:5,deleted:false}]);
  if(u.startsWith('/rest/v1/bb_matches')) return J([{owner:UID,profile_id:'d1',at:1,data:{my:40}},{owner:UID,profile_id:'d1',at:2,data:{my:50}}]);
  if(u.startsWith('/rest/v1/bb_team_members')) return J([{team_id:TEAM,uid:UID,label:'Maya',joined_at:'2026-02-01T00:00:00Z'}]);
  if(u.startsWith('/rest/v1/bb_teams')) return J([{id:TEAM,code:'ABCD2345',name:'Apollo',num:'9662',owner:UID}]);
  J({message:'not found'},404);
}); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const URL='http://127.0.0.1:'+srv.address().port;
const mk=()=>{ const D=tmp('bb73sync-'); const st=new Store(D); return {D,st,sy:new Sync(st,D,{cloud:{url:URL,key:'anon-test'}})}; };

/* ── 1. הרשמה ── */
{
  const {D,sy}=mk(); S.reqs.length=0;
  let r=await sy.signUp('kid@example.com','secret123'); ok(!r.ok&&S.reqs.length===0,'הרשמה בלי הסכמה — נדחית בלי לפנות לשרת ('+r.why+')');
  r=await sy.signUp('kid@example.com','secret123',{tos_v:VER,age_bracket:'u13'}); ok(!r.ok&&/13/.test(r.why)&&S.reqs.length===0,'מתחת ל-13 — אין חשבון ('+r.why+')');
  r=await sy.signUp('kid@example.com','secret123',{tos_v:VER,age_bracket:'13-17'}); ok(!r.ok&&/הורה/.test(r.why)&&S.reqs.length===0,'13–17 בלי הסכמת הורה — נדחה');
  r=await sy.signUp('kid@example.com','secret123',{tos_v:'yesterday',age_bracket:'18+'}); ok(!r.ok&&S.reqs.length===0,'גרסת תנאים לא תקינה — נדחה');
  r=await sy.signUp('kid@example.com','secret123',{tos_v:VER,age_bracket:'13-17',guardian_ok:true,birth:'2012-05-05',extra:'x'});
  const q=S.reqs.find(x=>x.u.startsWith('/auth/v1/signup')), d=q&&q.body.data||{};
  ok(r.ok&&q&&Object.keys(d).sort().join()==='age_bracket,guardian_ok,tos_at,tos_v'&&d.tos_v===VER&&d.age_bracket==='13-17'&&d.guardian_ok===true&&!isNaN(Date.parse(d.tos_at)),'הרשמה תקינה: signup data = {tos_v, tos_at, age_bracket, guardian_ok} בלבד — '+JSON.stringify(d));
  ok(!JSON.stringify(q.body).includes('2012-05-05'),'תאריך לידה לא נשלח אף פעם');
  ok(sy.status().loggedIn&&sy.status().tos===VER,'אחרי הרשמה: status().tos = '+sy.status().tos);
  ok(signupMeta({tos_v:VER,age_bracket:'18+',guardian_ok:true}).data.guardian_ok===null,'18+ — guardian_ok ריק (null)');
  fs.rmSync(D,{recursive:true,force:true});
}
/* ── 2. חשבון קיים בלי tos_v — אישור חד־פעמי, בלי לעצור סנכרון ── */
const {D,st,sy}=mk();
{
  S.meta={name:'Maya'}; S.reqs.length=0;
  let r=await sy.signIn('maya@example.com','pw123456'); ok(r.ok&&sy.status().tos==='','חשבון ישן בלי tos_v: status().tos ריק (הדף מבקש לאשר)');
  r=await sy.tosAccept('bad'); ok(!r.ok,'גרסה לא תקינה — לא נשלח');
  /* legalfix: חשבון בלי טווח גיל עונה גם על הגיל באישור (v73_legalfix_app_test בודק את כל המקרים) */
  r=await sy.tosAccept(VER); ok(!r.ok&&r.needAge,'חשבון ישן בלי טווח גיל — האישור מבקש גם גיל');
  r=await sy.tosAccept(VER,{age_bracket:'18+'}); const p=S.reqs.find(x=>x.m==='PUT'&&x.u==='/auth/v1/user');
  ok(r.ok&&p&&p.body.data.tos_v===VER&&Object.keys(p.body.data).sort().join()==='age_bracket,guardian_ok,tos_at,tos_v'&&p.body.data.age_bracket==='18+'&&/Bearer tok/.test(p.auth),'אישור: PUT /auth/v1/user עם data {tos_v, tos_at, age_bracket, guardian_ok} ועם האסימון');
  ok(sy.status().tos===VER&&S.meta.name==='Maya'&&S.meta.tos_v===VER,'השם בחשבון נשאר; tos_v נשמר');
  /* חיבור מחדש — namePull קורא tos_v מהשרת */
  sy.sess.user.tos_v=''; await sy.namePull(''); ok(sy.status().tos===VER,'namePull מעדכן את tos_v מהשרת');
}
/* ── 3. ייצוא הנתונים שלי ── */
{
  S.reqs.length=0;
  const r=await sy.exportMine(); const d=r.data||{};
  ok(r.ok&&d.app==='BIOBUZZ'&&d.account.email==='maya@example.com'&&d.account.user_metadata.tos_v===VER,'ייצוא: פרטי החשבון (כולל ההסכמה)');
  ok(d.profiles.length===1&&d.profiles[0].kv&&d.matches.length===2&&d.team.membership.length===1&&d.team.team.name==='Apollo','ייצוא: נהגים עם הגדרות, מאצ׳ים, חברות בקבוצה והקבוצה');
  ok(S.reqs.filter(x=>/bb_profiles|bb_matches/.test(x.u)).every(x=>x.u.includes('owner=eq.'+UID))&&S.reqs.some(x=>x.u.includes('bb_team_members?select=*&uid=eq.'+UID)),'ייצוא: רק השורות שלי (owner/uid = אני)');
  const out=await new Sync(new Store(tmp('bb73x-')),tmp('bb73x-'),{cloud:{url:URL,key:'k'}}).exportMine(); ok(!out.ok,'ייצוא בלי חשבון — ״לא מחוברים״');
}
/* ── 4. מחיקת החשבון ── */
{
  S.noRpc=true; S.reqs.length=0;
  let r=await sy.deleteMe();
  ok(!r.ok&&r.missing&&/גיטהאב/.test(r.why)&&/github\.com/.test(r.contact)&&sy.status().loggedIn,'הפונקציה bb_delete_me עוד לא בשרת — הודעה ברורה עם גיטהאב, ונשארים מחוברים');
  S.noRpc=false; sy.team={id:TEAM,team:{name:'Apollo'}}; sy.saveTeam();
  r=await sy.deleteMe();
  ok(r.ok&&r.uid===UID&&S.deleted&&S.reqs.some(x=>x.u==='/rest/v1/rpc/bb_delete_me'&&x.m==='POST'),'מחיקה: POST rpc/bb_delete_me');
  const acct=JSON.parse(fs.readFileSync(path.join(D,'account.json'),'utf8'));
  ok(!sy.status().loggedIn&&!acct.blob&&!fs.existsSync(path.join(D,'team-cache.json')),'אחרי מחיקה: מנותקים, האסימון והמטמון של הקבוצה נמחקו מהדיסק');
  r=await sy.deleteMe(); ok(!r.ok,'מחיקה בלי חשבון — ״לא מחוברים״');
}
/* ── 5. מחיקה מקומית של נהגי החשבון ── */
{
  const D2=tmp('bb73wipe-'); const s2=new Store(D2);
  const first=s2.meta.list[0]; s2.updateProfile(first.id,{local:true});
  const a=s2.addProfile('A',{owner:UID}), b=s2.addProfile('B',{owner:UID}), o=s2.addProfile('Other',{owner:'cccccccc-1111-2222-3333-444444444444'});
  s2.addMatch({at:1,my:3},a.id); s2.switchTo(a.id);
  fs.mkdirSync(path.join(D2,'trash','x-1'),{recursive:true}); fs.writeFileSync(path.join(D2,'trash','x-1','profile.json'),JSON.stringify({id:'x',owner:UID}));
  const r=s2.wipeOwner(UID);
  ok(r.ok&&r.n===2&&s2.meta.list.map(p=>p.name).sort().join()===[first.name,'Other'].sort().join(),'wipeOwner: נהגי החשבון נמחקו; מקומי ושל חשבון אחר נשארו');
  ok(!fs.existsSync(s2.dir(a.id))&&!fs.existsSync(path.join(D2,'trash','x-1'))&&s2.meta.list.some(p=>p.id===s2.meta.active),'התיקיות (הגדרות + מאצ׳ים) והסל נמחקו מהדיסק; הנהג הפעיל — אחד שנשאר');
  const D3=tmp('bb73wipe-'); const s3=new Store(D3); s3.meta.list[0].owner=UID; s3.saveMeta(); const r3=s3.wipeOwner(UID);
  ok(r3.n===1&&s3.meta.list.length===1&&!s3.meta.list[0].owner,'כל הנהגים היו של החשבון — נשאר נהג ריק חדש');
  ok(!s2.wipeOwner('').ok,'בלי uid — לא נוגע בכלום');
  [D2,D3].forEach(x=>fs.rmSync(x,{recursive:true,force:true}));
}
/* ── 6. בינה מלאכותית: 18+ ── */
{
  const G={n:0}; const g=http.createServer((q,s)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{ G.n++; s.writeHead(200,{'content-type':'application/json'});
    if(q.method==='GET') return s.end(JSON.stringify({models:[{name:'models/gemini-9-flash',displayName:'F',supportedGenerationMethods:['generateContent']}]}));
    s.end(JSON.stringify({candidates:[{content:{parts:[{text:'OK'}]},finishReason:'STOP'}]})); }); });
  await new Promise(r=>g.listen(0,'127.0.0.1',r)); process.env.BIOBUZZ_GEMINI_BASE='http://127.0.0.1:'+g.address().port;
  const AD=tmp('bb73ai-'); let A=new AI(AD,{canEnc:()=>false});
  ok(A.status().ack18===false&&!A.status().ok,'ברירת מחדל: בלי אישור 18+ (כבוי)');
  let r=await A.setKey('AIza'+'k'.repeat(35)); ok(!r.ok&&r.needAck&&/18/.test(r.why)&&G.n===0&&!A.status().has,'שמירת מפתח בלי אישור — נדחית, בלי פנייה לגוגל');
  r=await A.ask('helper',{messages:[{role:'user',text:'hi'}]}); ok(!r.ok&&r.needAck&&G.n===0,'שאלה בלי אישור — סירוב ברור ('+r.why+')');
  r=await A.check(); ok(!r.ok&&r.needAck&&G.n===0,'בדיקה בלי אישור — סירוב');
  A.ack18(true); ok(fs.existsSync(path.join(AD,'ai-ack.json'))&&new AI(AD,{canEnc:()=>false}).status().ack18===true,'האישור נשמר במחשב (ai-ack.json) ונשאר אחרי הפעלה מחדש');
  r=await A.setKey('AIza'+'k'.repeat(35)); ok(r.ok&&A.status().ok&&G.n>0,'עם אישור — המפתח נבדק ועובד');
  r=await A.ask('helper',{messages:[{role:'user',text:'hi'}]}); ok(r.ok,'עם אישור — שאלה עובדת');
  /* מפתח שכבר שמור (מגרסה קודמת) — הבינה כבויה עד שמאשרים */
  A.ack18(false); const n0=G.n; r=await A.ask('helper',{messages:[{role:'user',text:'hi'}]});
  ok(!A.status().ok&&A.status().has&&!r.ok&&r.needAck&&G.n===n0,'ביטול האישור: המפתח נשאר, אבל הכול כבוי ושום בקשה לא יוצאת');
  g.close(); delete process.env.BIOBUZZ_GEMINI_BASE; fs.rmSync(AD,{recursive:true,force:true});
}
/* ── 7. ערוצי IPC: הכול דרך handle() (בדיקת השולח), וה-preload חושף רק פונקציות ── */
{
  const m=fs.readFileSync(APP+'/main.js','utf8'), p=fs.readFileSync(APP+'/preload.js','utf8');
  const ch=['bb:legalAck','bb:acctTos','bb:acctExport','bb:acctDelete','bb:wipeLocal','bb:aiAck18'];
  ok(ch.every(c=>new RegExp('handle\\("'+c+'"').test(m)&&!new RegExp('ipcMain\\.(handle|on)\\("'+c+'"').test(m)),'main: כל הערוצים החדשים דרך handle() — עם okSender כמו הקיימים');
  ok(ch.every(c=>p.includes('"'+c+'"'))&&/acctSignUp: \(email, pw, meta\)/.test(p)&&/guardian_ok: meta\.guardian_ok === true/.test(p),'preload: הערוצים חשופים, ו-meta של ההרשמה מסונן (רק tos_v, age_bracket, guardian_ok)');
  ok(/wipeLocal", \(\) => \{ if \(!deletedUid\)/.test(m),'wipeLocal — רק אחרי מחיקת חשבון מוצלחת');
}
srv.close(); fs.rmSync(D,{recursive:true,force:true});
done('v73_legal_app');
