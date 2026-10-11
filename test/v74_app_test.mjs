// v74 app — תיקוני סקירת האפליקציה (node עם Supabase מדומה, ובסוף האפליקציה עצמה ב-Electron; אף פעם לא השרת האמיתי):
// P1 מחיקה מקומית אחרי מחיקת חשבון — גם מהגיבויים · P2 ״אפס הכול — כולל הגיבויים״ מרוקן גם את ארכיון המשחקים
// P3 ״לא, להשאיר״ — הנהגים הופכים למקומיים · P4 גרסת תנאים ״ישנה יותר״ ולא ״שונה״ · P5 נהג שנוצר בלי חיבור — synced
// P7 דיווח באג בלי נתיבים ושמות משתמש · P8 מחיקת נהג שנדחתה נשמרת ומנוסה שוב · P9 אישור 18+ שייך לחשבון
// P10 SQL (בדיקה סטטית; הבדיקה המלאה: test/v74_app_probe.sql) · P11 CSP והרשאות ב-Electron · P12 תוויות חברי הקבוצה בכינויים
import http from 'http'; import fs from 'fs'; import os from 'os'; import path from 'path'; import net from 'net';
import {createRequire} from 'module'; import {fileURLToPath} from 'url'; import {execFileSync} from 'child_process';
import {ok,done} from './h.mjs';
const require=createRequire(import.meta.url);
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'..'), APP=ROOT+'/app';
const {Store}=require(APP+'/store.js'); const {Sync}=require(APP+'/sync.js'); const {AI}=require(APP+'/ai.js');
const tmp=p=>fs.mkdtempSync(path.join(os.tmpdir(),p)); const dirs=[]; const T=p=>{ const d=tmp(p); dirs.push(d); return d; };
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ME='aaaaaaaa-1111-2222-3333-444444444444', OTHER='dddddddd-1111-2222-3333-444444444444';

/* ── Supabase מדומה ── */
const S={reqs:[], meta:{name:'Maya',age_bracket:'18+',tos_v:'2026-10-09'}, profiles:[], matches:[], tombRej:0, deleted:false};
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const u=new URL(q.url,'http://x'), p=u.pathname, sp=u.searchParams; let body=null; try{ body=b?JSON.parse(b):null; }catch(e){}
  S.reqs.push({m:q.method,p,u:q.url,body});
  const J=(o,st=200)=>{ r.writeHead(st,{'content-type':'application/json'}); r.end(o===undefined||o===null?'':JSON.stringify(o)); };
  const user=()=>({id:ME,email:'maya@example.com',user_metadata:S.meta});
  if(p.startsWith('/auth/v1/token')) return J({access_token:'tok',refresh_token:'ref',expires_in:3600,user:user()});
  if(p==='/auth/v1/user'&&q.method==='GET') return J(user());
  if(p==='/auth/v1/user'&&q.method==='PUT'){ S.meta=Object.assign({},S.meta,(body&&body.data)||{}); return J(user()); }
  if(p==='/auth/v1/logout') return J(null,204);
  if(p==='/rest/v1/rpc/bb_delete_me'){ S.deleted=true; S.profiles=S.profiles.filter(x=>x.owner!==ME); S.matches=S.matches.filter(x=>x.owner!==ME); return J(null,200); }
  if(p.startsWith('/rest/v1/rpc/')) return J([]);
  if(p==='/rest/v1/bb_team_members') return J([]);
  if(p==='/rest/v1/bb_profiles'&&q.method==='GET'){ let rows=S.profiles.filter(x=>x.owner===ME); const id=sp.get('id'); if(id) rows=rows.filter(x=>'eq.'+x.id===id); return J(rows); }
  if(p==='/rest/v1/bb_profiles'&&q.method==='POST'){ for(const x of body){ if(x.deleted&&S.tombRej>0){ S.tombRej--; return J({message:'simulated check violation'},400); }
      const i=S.profiles.findIndex(y=>y.id===x.id&&y.owner===ME); const row=Object.assign({owner:ME,kv:{},kv_at:0},i>=0?S.profiles[i]:{},x); if(i>=0) S.profiles[i]=row; else S.profiles.push(row); } return J(null,201); }
  if(p==='/rest/v1/bb_matches'&&q.method==='GET'){ let rows=S.matches.filter(m=>m.owner===ME); const pid=sp.get('profile_id'); if(pid) rows=rows.filter(m=>'eq.'+m.profile_id===pid);
    const ats=sp.get('at'); if(ats){ const set=new Set(ats.replace(/^in\.\(|\)$/g,'').split(',').map(Number)); rows=rows.filter(m=>set.has(m.at)); }
    const rg=q.headers.range; if(rg){ const [a,z]=rg.split('-').map(Number); rows=rows.slice(a,z+1); } return J(rows); }
  if(p==='/rest/v1/bb_matches'&&q.method==='POST'){ for(const x of body) if(!S.matches.some(m=>m.profile_id===x.profile_id&&m.at===x.at)) S.matches.push({owner:ME,profile_id:x.profile_id,at:x.at,data:x.data}); return J(null,201); }
  if(p==='/rest/v1/bb_matches'&&q.method==='DELETE'){ const pid=(sp.get('profile_id')||'').replace(/^eq\./,''); S.matches=S.matches.filter(m=>m.profile_id!==pid); return J(null,204); }
  J({message:'no route '+p},404);
}); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
const reset=()=>{ S.reqs.length=0; S.profiles=[]; S.matches=[]; S.tombRej=0; S.deleted=false; S.meta={name:'Maya',age_bracket:'18+',tos_v:'2026-10-09'}; };
const mkSync=(st,D,opt)=>new Sync(st,D,Object.assign({cloud:{url:BASE,key:'anon-test'}},opt||{}));
const filesUnder=d=>{ const out=[]; const walk=x=>{ let l=[]; try{ l=fs.readdirSync(x,{withFileTypes:true}); }catch(e){ return; } for(const e of l){ const f=path.join(x,e.name); if(e.isDirectory()) walk(f); else out.push(f); } }; walk(d); return out; };

/* ── P1: מחיקה מקומית אחרי מחיקת חשבון — גם מהגיבויים ── */
{
  const D=T('bb74p1-'); const st=new Store(D); st.setViewer(ME);
  const keep=st.addProfile('Local',{local:true}); const dana=st.addProfile('Dana',{owner:ME}); const a=st.meta.list[0]; a.owner=ME;
  const oth=st.addProfile('Other',{owner:OTHER}); st.meta.tombs.push({id:'pOldTomb',at:1,acct:'team',owner:ME}); st.saveMeta();
  st.addMatch({at:Date.now()-9000,my:7},dana.id); st.switchTo(dana.id); st.kvSet('bbKeyBind1','{"x":1}'); st.flushKv();
  st.dailyBackup(14); await wait(1100); st.snapshot();
  const before=filesUnder(path.join(D,'backups')).filter(f=>f.includes(dana.id)).length;
  const pjBefore=st.backupsList().map(t=>fs.readFileSync(path.join(D,'backups',t,'profiles.json'),'utf8')).join('');
  ok(before>=4&&/Dana/.test(pjBefore)&&st.backupsList().length===2,'לפני: '+before+' קבצים של הנהג בשני גיבויים, והשם בתוך profiles.json של הגיבוי');
  const r=st.wipeOwner(ME);
  const left=filesUnder(path.join(D,'backups')).filter(f=>f.includes(dana.id)||f.includes(a.id));
  const pj=st.backupsList().map(t=>JSON.parse(fs.readFileSync(path.join(D,'backups',t,'profiles.json'),'utf8')));
  ok(r.ok&&r.n===2&&r.backups===2,'wipeOwner: 2 נהגים, 2 גיבויים עודכנו — '+JSON.stringify(r));
  ok(left.length===0,'אחרי: אף קובץ של נהגי החשבון בגיבויים (היו '+before+', נשארו '+left.length+')');
  ok(pj.every(m=>!JSON.stringify(m).includes('Dana')&&!m.list.some(p=>p.owner===ME)&&!(m.tombs||[]).some(t=>t.owner===ME)),'profiles.json של כל גיבוי: בלי שם, בלי owner ובלי tombs של החשבון');
  ok(pj.every(m=>m.list.some(p=>p.id===keep.id)&&m.list.some(p=>p.id===oth.id)&&m.list.some(p=>p.id===m.active)),'נהג מקומי ונהג של חשבון אחר נשארים בגיבוי (והפעיל תקין)');
  ok(fs.existsSync(path.join(D,'backups',st.backupsList()[0],'profiles',keep.id)),'התיקייה של הנהג המקומי בגיבוי נשארה');
  ok(Store.metaOk(pj[0]),'גיבוי שעבר ניקוי עדיין שמיש לשחזור (metaOk)');
}
/* ── P2: Store.wipeMatches ── */
{
  const D=T('bb74p2-'); const st=new Store(D); const id=st.meta.active;
  st.addMatch({at:1000,my:1},id); st.addMatch({at:2000,my:2},id);
  ok(st.matches(id).length===2&&st.summary(id).n===2,'לפני: 2 משחקים בארכיון');
  const r=st.wipeMatches(id);
  ok(r.ok&&r.n===2&&st.matches(id).length===0&&st.summary(id).n===0&&fs.readFileSync(st.mfile(id),'utf8')==='','wipeMatches: matches.jsonl ריק, הסיכום 0');
  st.loadKv(); ok(st.matches(id).length===0,'seedArchive לא מחזיר את מה שנמחק (הקובץ קיים וריק)');
  ok(!st.wipeMatches('../x').ok&&!st.wipeMatches('pNope').ok,'מזהה לא תקין / לא קיים — נדחה');
}
/* ── P3: orphanOwner — ״לא, להשאיר״ ── */
{
  const D=T('bb74p3-'); const st=new Store(D); st.setViewer(ME);
  st.meta.list[0].owner=ME; const p2=st.addProfile('Second',{owner:ME}); st.addMatch({at:Date.now(),my:50},p2.id);
  st.meta.tombs.push({id:'pT',at:1,acct:'team',owner:ME}); st.saveMeta();
  st.setViewer(null);
  const r=st.orphanOwner(ME);
  ok(r.ok&&r.n===2&&st.meta.list.every(p=>!p.owner&&p.local===true)&&!st.meta.tombs.some(t=>t.owner===ME),'orphanOwner: שני הנהגים בלי owner ו-local=true, ה-tombs של החשבון נמחקו');
  st.setViewer(OTHER);
  ok(st.vis().length===2&&st.parked()===0,'חשבון אחר מתחבר אחר כך — שני הנהגים עדיין נראים (לא ״חונים״), parked=0');
  const s2=new Store(D); s2.setViewer('eeeeeeee-0000-0000-0000-000000000000'); ok(s2.vis().map(p=>p.name).sort().join()===[st.meta.list[0].name,'Second'].sort().join(),'גם אחרי הפעלה מחדש וחשבון חדש');
  ok(!st.orphanOwner('').ok,'בלי uid — לא עושה כלום');
}
/* ── P4: גרסת תנאים — ״ישנה יותר״ ── */
{
  reset(); S.meta.tos_v='2026-12-01';
  const D=T('bb74p4-'); const st=new Store(D); const sy=mkSync(st,D,{tosNeed:'2026-10-09'});
  await sy.signIn('maya@example.com','pw123456');
  ok(sy.status().tos==='2026-12-01'&&sy.status().tosWait===false,'אפליקציה ישנה (צריכה 2026-10-09), החשבון אישר 2026-12-01 — לא מושהה');
  S.reqs.length=0; let r=await sy.tosAccept('2026-10-09');
  ok(r.ok&&r.kept&&!S.reqs.some(x=>x.m==='PUT')&&S.meta.tos_v==='2026-12-01','tosAccept לגרסה ישנה — לא נשלח, ההסכמה לא יורדת');
  r=await sy.syncNow(); ok(r.ok,'הסנכרון רץ באפליקציה הישנה');
  sy.tosNeed='2027-01-01'; ok(sy.status().tosWait===true,'גרסה חדשה מהאישור — כן מושהה');
  r=await sy.tosAccept('2027-01-01'); ok(r.ok&&S.meta.tos_v==='2027-01-01'&&!sy.status().tosWait,'אישור לגרסה חדשה — נשמר');
}
/* ── P5: נהג שנוצר בלי חיבור ── */
{
  reset();
  const D=T('bb74p5-'); let st=new Store(D); let sy=mkSync(st,D);
  await sy.signIn('maya@example.com','pw123456'); await sy.syncNow(); await sy.signOut();
  const x=st.addProfile('Offline'); st.addMatch({at:Date.now(),my:9},x.id);
  st=new Store(D); sy=mkSync(st,D); await sy.signIn('maya@example.com','pw123456'); const r=await sy.syncNow();
  const lp=st.meta.list.find(p=>p.id===x.id);
  const synced=p=>!!sy.uid()&&!p.local&&p.owner===sy.uid();
  ok(r.ok&&!lp.owner&&!lp.local&&!S.profiles.some(p=>p.id===x.id)&&!synced(lp),'נהג שנוצר בלי חיבור לא נלקח לחשבון בשקט — synced=false (הממשק יציג ״מקומי״ וכפתור ״הוסף מייל״)');
  st.updateProfile(x.id,{local:false}); await sy.syncNow();
  ok(lp.owner===ME&&S.profiles.some(p=>p.id===x.id)&&S.matches.some(m=>m.profile_id===x.id)&&synced(lp),'״✉ הוסף מייל״ (updateProfile local:false) — owner נקבע, הנהג והמשחק עלו, synced=true');
}
/* ── P8: מחיקה שנדחתה נשמרת ומנוסה שוב ── */
{
  reset();
  const D=T('bb74p8-'); const st=new Store(D); const sy=mkSync(st,D); await sy.signIn('maya@example.com','pw123456');
  st.meta.list[0].owner=ME; const dana=st.addProfile('Dana',{owner:ME}); st.addMatch({at:Date.now(),my:5},dana.id); st.saveMeta();
  await sy.syncNow(); ok(S.profiles.some(p=>p.id===dana.id),'הנהג עלה');
  st.removeProfile(dana.id); S.tombRej=2;
  let r=await sy.syncNow(); const t=st.meta.tombs.find(x=>x.id===dana.id);
  ok(r.ok&&t&&t.fails===1&&!st.meta.list.some(p=>p.id===dana.id),'השרת דחה — הרשומה נשארה (fails=1), והנהג לא חזר מהענן');
  r=await sy.syncNow(); ok(st.meta.tombs.find(x=>x.id===dana.id).fails===2&&!st.vis().some(p=>p.name==='Dana'),'דחייה שנייה — fails=2, עדיין לא חזר');
  r=await sy.syncNow();
  ok(r.ok&&!st.meta.tombs.some(x=>x.id===dana.id)&&S.profiles.find(p=>p.id===dana.id).deleted===true&&!S.matches.some(m=>m.profile_id===dana.id)&&!st.vis().some(p=>p.name==='Dana'),'בניסיון השלישי השרת קיבל — מצבה בענן, המשחקים נמחקו, הרשומה ירדה');
  const e=st.addProfile('Eve',{owner:ME}); st.saveMeta(); await sy.syncNow(); st.removeProfile(e.id); S.tombRej=99;
  for(let i=0;i<5;i++) await sy.syncNow();
  ok(!st.meta.tombs.some(x=>x.id===e.id)&&S.tombRej===94,'אחרי 5 דחיות — מוותרים (לא מנסים לנצח); '+(99-S.tombRej)+' ניסיונות');
}
/* ── P9: אישור 18+ שייך לחשבון ── */
{
  const D=T('bb74p9-'); const A=new AI(D,{canEnc:()=>false});
  A.setUid(ME); A.ack18(true);
  ok(A.status().ack18&&JSON.parse(fs.readFileSync(path.join(D,'ai-ack.json'),'utf8')).uid===ME,'אישור בזמן שמחוברים — נשמר עם ה-uid');
  A.setUid(''); ok(!A.status().ack18,'התנתקות — האישור לא תקף (הבינה המלאכותית כבויה)');
  A.setUid(OTHER); ok(!A.status().ack18,'חשבון אחר — לא תקף');
  A.setUid(ME); ok(A.status().ack18,'אותו חשבון חוזר — תקף שוב');
  const B=new AI(D,{canEnc:()=>false}); ok(!B.status().ack18,'הפעלה מחדש בלי חשבון — לא תקף'); B.setUid(ME); ok(B.status().ack18,'…ועם החשבון — תקף');
  B.setUid(''); B.ack18(true); ok(B.status().ack18&&JSON.parse(fs.readFileSync(path.join(D,'ai-ack.json'),'utf8')).uid==='','אישור בלי חשבון — תקף רק בלי חשבון'); B.setUid(ME); ok(!B.status().ack18,'…ולא כשמתחברים');
  fs.writeFileSync(path.join(D,'ai-ack.json'),JSON.stringify({at:Date.now()})); const L=new AI(D,{canEnc:()=>false});
  ok(L.status().ack18&&(L.setUid(ME),!L.status().ack18),'קובץ ישן (בלי uid) — שייך ל״בלי חשבון״');
  const m=fs.readFileSync(APP+'/main.js','utf8');
  ok(/st\.age === "13-17" && ai\.ackRec\) ai\.ack18\(false\)/.test(m)&&/afterLogin = r => \{ if \(r\.ok\) \{ aiBind\(\)/.test(m),'main.js: התחברות של חשבון 13–17 מוחקת את האישור (aiBind)');
}
/* ── P10: SQL ── */
{
  const sql=fs.readFileSync(ROOT+'/supabase/v74_bugs.sql','utf8');
  ok(/uid is null[\s\S]{0,200}n >= 150/.test(sql)&&/n >= 300/.test(sql)&&/cf-connecting-ip/.test(sql)&&/split_part\(xff, ',', n\)/.test(sql),'v74_bugs.sql: תקרה נפרדת לאנונימיים (150), הכללית (300) נשארת, הכתובת מ-cf-connecting-ip או מהאיבר האחרון');
  ok(!/split_part\([^)]*'x-forwarded-for'[^)]*, 1\)/.test(sql)&&/create or replace function public\.bb_bugs_guard/.test(sql)&&/drop trigger if exists bb_bugs_guard/.test(sql),'בלי האיבר הראשון; create or replace / drop if exists — אפשר להריץ שוב');
  ok(fs.existsSync(HERE+'/v74_app_probe.sql'),'בדיקת SQL מלאה: test/v74_app_probe.sql');
}
/* ── מסמכים משפטיים ── */
{
  let c=0; try{ execFileSync('python3',[ROOT+'/tools/legal_embed.py','--check'],{stdio:'pipe'}); }catch(e){ c=e.status||1; }
  const en=fs.readFileSync(ROOT+'/legal/privacy.en.md','utf8'), he=fs.readFileSync(ROOT+'/legal/privacy.he.md','utf8'), ai=fs.readFileSync(ROOT+'/legal/ai.en.md','utf8'), aih=fs.readFileSync(ROOT+'/legal/ai.he.md','utf8');
  ok(c===0&&/removes file paths/.test(en)&&/נתיבי קבצים/.test(he)&&/match archive/.test(en)&&/ארכיון המשחקים/.test(he)&&/belongs to the account/.test(ai)&&/שייך לחשבון/.test(aih),'legal/ (he+en) מעודכן ו-legal_embed.py --check עובר');
}

/* ══ האפליקציה עצמה (Electron) ══ */
if(!process.env.BB_NO_ELECTRON){
  reset();
  const {_electron:electron}=await import('playwright');
  const freePort=()=>new Promise(r=>{ const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{ const p=s.address().port; s.close(()=>r(p)); }); });
  const DATA=T('bb74e-'); const bport=String(process.env.BB_BRIDGE_PORT||await freePort());
  const SIMF=fs.existsSync(ROOT+'/dist/BIOBUZZ-lab-lite.html')?ROOT+'/dist/BIOBUZZ-lab-lite.html':APP+'/sim/index.html';
  const app=await electron.launch({executablePath:APP+'/node_modules/electron/dist/electron',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APP],
    env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_BRIDGE:bport,BIOBUZZ_SIM:SIMF,BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none',
      BIOBUZZ_CLOUD_URL:BASE,BIOBUZZ_CLOUD_KEY:'anon-test',BIOBUZZ_PLAIN_SESS:'1',BIOBUZZ_AI_PLAIN:'1',BIOBUZZ_LEGAL_V:''},timeout:90000});
  const win=await app.firstWindow(); const errs=[], csp=[];
  win.on('pageerror',e=>errs.push(String(e)));
  win.on('console',m=>{ const t=m.text(); if(/Content Security Policy/.test(t)) csp.push(t); });
  const ready=()=>win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length&&window.__sim.v74app,null,{timeout:180000});
  await ready(); await win.evaluate(()=>{ const w=document.getElementById('welcome'); if(w) w.hidden=true; });
  const acc=()=>win.evaluate(async()=>{ const A=__sim.v73legal.acc(); A.st=await bbApp.acctStatus(); return A.st; });

  /* P11: CSP + הרשאות */
  /* בדיקות ה-CSP רצות דרך webContents.executeJavaScript (כמו קוד של הדף; evaluate של playwright עוקף CSP) */
  const inPage=src=>app.evaluate(async({BrowserWindow},src)=>{ const w=BrowserWindow.getAllWindows().find(x=>/^file:/.test(x.webContents.getURL())); return await w.webContents.executeJavaScript(src); },src);
  const cs=await inPage(`(async()=>{ const bp=${JSON.stringify(bport)}; const o={}; let viol=[]; document.addEventListener('securitypolicyviolation',e=>viol.push(e.violatedDirective));
    try{ eval("1"); o.eval="allowed"; }catch(e){ o.eval="blocked"; } try{ new Function("return 1")(); o.fn="allowed"; }catch(e){ o.fn="blocked"; }
    const s=document.createElement('script'); s.textContent='window.__inl74=1'; document.head.appendChild(s); o.inline=window.__inl74===1;
    try{ o.health=(await fetch('http://127.0.0.1:'+bp+'/health',{cache:'no-store'})).status; }catch(e){ o.health='err'; }
    const pause=()=>new Promise(r=>setTimeout(r,400));
    viol=[]; try{ await fetch('https://example.com/x'); o.ext='allowed'; }catch(e){ await pause(); o.ext=viol.includes('connect-src')?'blocked':'neterr'; }
    viol=[]; try{ await fetch('https://abc.supabase.co/rest/v1/x',{signal:AbortSignal.timeout(2500)}); o.supa='allowed'; }catch(e){ await pause(); o.supa=viol.includes('connect-src')?'blocked':'allowed'; }
    o.ws=await new Promise(res=>{ let w; try{ w=new WebSocket('ws://127.0.0.1:'+bp+'/ws?role=sim&t='+encodeURIComponent(bbApp.bridgeTok)); }catch(e){ return res('throw'); } w.onopen=()=>{ w.close(); res('open'); }; w.onerror=()=>res('error'); setTimeout(()=>res('timeout'),8000); });
    o.blob=await new Promise(res=>{ const i=new Image(); i.onload=()=>res('ok'); i.onerror=()=>res('err'); const c=document.createElement('canvas'); c.width=c.height=2; c.toBlob(b=>{ i.src=URL.createObjectURL(b); }); });
    o.data=await new Promise(res=>{ const i=new Image(); i.onload=()=>res('ok'); i.onerror=()=>res('err'); i.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; });
    viol=[]; const ob=document.createElement('object'); ob.data='data:text/html,x'; document.body.appendChild(ob); await new Promise(r=>setTimeout(r,600)); o.obj=viol.includes('object-src')?'blocked':'?'; ob.remove();
    try{ o.geo=(await navigator.permissions.query({name:'geolocation'})).state; }catch(e){ o.geo='err'; }
    try{ o.cam=(await navigator.permissions.query({name:'camera'})).state; }catch(e){ o.cam='err'; }
    try{ o.mic=(await navigator.permissions.query({name:'microphone'})).state; }catch(e){ o.mic='err'; }
    try{ o.notif=await Notification.requestPermission(); }catch(e){ o.notif='err'; }
    o.webgl=!!(window.__sim&&__sim.BOTS.length); o.fonts=document.fonts.status;
    return o; })()`);
  ok(cs.eval==='blocked'&&cs.fn==='blocked'&&cs.inline,'CSP: eval / new Function חסומים, סקריפט מוטמע עובד — '+JSON.stringify({eval:cs.eval,fn:cs.fn}));
  ok(cs.health===200&&cs.ws==='open','CSP: הגשר המקומי עובד (http /health, ws עם אסימון) — '+cs.health+' / '+cs.ws);
  ok(cs.ext==='blocked'&&cs.supa==='allowed','CSP: אתר זר חסום, Supabase מותר — ext='+cs.ext+', supa='+cs.supa);
  ok(cs.blob==='ok'&&cs.data==='ok'&&cs.obj==='blocked','CSP: תמונות blob:/data: עובדות, <object> חסום');
  ok(cs.geo==='denied'&&cs.cam==='denied'&&cs.mic==='denied'&&cs.notif==='granted','הרשאות: מיקום, מצלמה ומיקרופון — נדחות, התראות — מותרות ('+[cs.geo,cs.cam,cs.mic,cs.notif].join(', ')+')');
  ok(cs.webgl&&cs.fonts==='loaded','הסימולטור (WebGL) והגופנים נטענו תחת ה-CSP');

  /* P12: תוויות חברי הקבוצה */
  const nm=await win.evaluate(()=>{ __sim.v72training.setAppTeam([{id:'x',name:'Remote Driver',remote:true,who:'Noa Label'},{id:'y',name:'Me',who:''}]); return __sim.v73legalfix.aiNames(); });
  ok(nm.members.includes('Noa Label')&&nm.drivers.includes('Remote Driver')&&!nm.members.includes(''),'aiNames().members כולל את תוויות חברי הקבוצה ('+JSON.stringify(nm.members)+')');

  /* P7: דיווח באג בלי נתיבים ושם משתמש */
  const bp=await win.evaluate(()=>{ window.__bbErr.push({t:Date.now(),m:"TypeError: boom\n    at f (file:///C:/Users/Dana%20Cohen/AppData/Local/Programs/BIOBUZZ/resources/app.asar/sim/index.html:12:3)\n    at g (file:///home/dana/BIOBUZZ/app/sim/index.html:9:1)"});
    window.__bbErr.push({t:Date.now(),m:"ENOENT: open 'C:\\Users\\Dana Cohen\\AppData\\Roaming\\BIOBUZZ\\data\\x.json'"});
    document.getElementById('bugSys').checked=true; document.getElementById('bugWhat').value='steps at /Users/dana/Desktop'; return __sim.v74app.bugPayload(); });
  const bs=JSON.stringify(bp);
  ok(!/Dana|dana|file:\/\/|Users[\\/]/.test(bs)&&/index\.html:12:3/.test(bs)&&/~\\\\AppData/.test(bs),'דיווח באג: בלי file://, בלי C:\\Users\\<שם> ו-/home/<שם> (גם בטקסט החופשי), שורת הקוד נשארת — '+JSON.stringify(bp.errors.slice(-2)).slice(0,200));

  /* P5 + P9: התחברות, נהג שנוצר בלי חיבור, אישור 18+ */
  let st=await win.evaluate(()=>bbApp.acctSignIn('maya@example.com','pw123456')); await wait(800);
  let A=await acc(); ok(A.loggedIn,'התחברות לשרת המדומה');
  let pr=await win.evaluate(()=>bbApp.profiles());
  ok(pr.length&&pr.every(p=>p.synced===true),'נהגים של החשבון: synced=true');
  let ai=await win.evaluate(async()=>(await bbApp.aiAck18(true)).status);
  ok(ai.ack18===true,'מבוגר מחובר מאשר 18+');
  await win.evaluate(()=>bbApp.acctSignOut()); await acc();
  ai=await win.evaluate(()=>bbApp.aiStatus()); ok(ai.ack18===false,'P9: אחרי התנתקות — האישור לא תקף (הבינה המלאכותית כבויה)');
  const off=await win.evaluate(()=>bbApp.profileAdd('Offline74',undefined,undefined,false));
  await win.evaluate(()=>bbApp.acctSignIn('maya@example.com','pw123456')); await wait(1500); await acc();
  ai=await win.evaluate(()=>bbApp.aiStatus()); ok(ai.ack18===true,'אותו חשבון חוזר — האישור תקף שוב');
  pr=await win.evaluate(()=>bbApp.profiles()); let po=pr.find(p=>p.id===off.id);
  const ui=await win.evaluate(p=>({where:__sim.v74app.appWhere(p), mail:__sim.v74app.appMailBtn(p)}),po);
  ok(po&&po.synced===false&&!/☁/.test(ui.where)&&/data-pfmail/.test(ui.mail),'P5: נהג שנוצר בלי חיבור — synced=false, מוצג ״מקומי״ עם כפתור ״✉ הוסף מייל״');
  await win.evaluate(id=>bbApp.profileUpdate(id,{local:false}),off.id); await win.evaluate(()=>bbApp.syncNow());
  pr=await win.evaluate(()=>bbApp.profiles()); po=pr.find(p=>p.id===off.id);
  const ui2=await win.evaluate(p=>({where:__sim.v74app.appWhere(p), mail:__sim.v74app.appMailBtn(p)}),po);
  ok(po.synced===true&&/☁/.test(ui2.where)&&ui2.mail===''&&S.profiles.some(p=>p.id===off.id),'אחרי ״הוסף מייל״ — synced=true, ☁ בחשבון, והנהג בענן');
  /* 13–17 מתחבר — האישור נמחק */
  await win.evaluate(()=>bbApp.acctSignOut()); S.meta.age_bracket='13-17'; S.meta.guardian_ok=true;
  await win.evaluate(()=>bbApp.aiAck18(true));
  ok(fs.existsSync(path.join(DATA,'ai-ack.json')),'(אישור בלי חשבון נשמר)');
  await win.evaluate(()=>bbApp.acctSignIn('maya@example.com','pw123456')); await wait(800); await acc();
  ai=await win.evaluate(()=>bbApp.aiStatus());
  ok(!fs.existsSync(path.join(DATA,'ai-ack.json'))&&ai.minor===true&&ai.ack18===false,'P9: חשבון 13–17 מתחבר — ai-ack.json נמחק');
  await win.evaluate(()=>bbApp.acctSignOut());
  ai=await win.evaluate(()=>bbApp.aiStatus()); ok(ai.ack18===false,'…וגם אחרי התנתקות אין אישור (צריך מבוגר שיאשר שוב)');
  S.meta.age_bracket='18+'; delete S.meta.guardian_ok;

  /* P2: ״אפס הכול — כולל הגיבויים״ — גם ארכיון המשחקים */
  await win.evaluate(()=>bbApp.acctSignIn('maya@example.com','pw123456')); await wait(800); await acc();
  const pid=await win.evaluate(()=>bbApp.profile.id);
  await win.evaluate(()=>Promise.all([bbApp.matchAdd({at:Date.now()-2000,my:11}),bbApp.matchAdd({at:Date.now()-1000,my:12})]));
  let ms=await win.evaluate(id=>bbApp.matches(id),pid); ok(ms.length===2,'לפני האיפוס: 2 משחקים בארכיון');
  const note=await win.evaluate(()=>{ __sim.v74app.fullNote(true); return {app:!document.getElementById('bkFullApp74').hidden, cloud:!document.getElementById('bkFullCloud74').hidden}; });
  ok(note.app&&note.cloud,'ההסבר באיפוס המלא: גם ארכיון המשחקים, ומחוברים — מה שבענן נשאר שם');
  const den=await app.evaluate(async({BrowserWindow})=>{ const w=new BrowserWindow({show:false,webPreferences:{nodeIntegration:true,contextIsolation:false,sandbox:false}});
    await w.loadURL('data:text/html,<p>x</p>'); const r=await w.webContents.executeJavaScript('require("electron").ipcRenderer.invoke("bb:wipeMatches","x").then(()=>"allowed",e=>"denied")'); w.destroy(); return r; });
  ok(den==='denied','bb:wipeMatches מדף אחר — נדחה (okSender)');
  const wr=await win.evaluate(()=>__sim.v73legalfix.resetAllFull({noReload:true}));
  ms=await win.evaluate(id=>bbApp.matches(id),pid);
  ok(wr.matches&&wr.matches.ok&&wr.matches.n===2&&ms.length===0&&fs.readFileSync(path.join(DATA,'profiles',pid,'matches.jsonl'),'utf8')===''&&wr.app&&wr.app.ok,'אחרי האיפוס המלא: matches.jsonl ריק, דף הסטטיסטיקה ריק, והגיבויים נמחקו');

  /* P3: מחיקת חשבון ו״לא, להשאיר״ */
  const before=JSON.parse(fs.readFileSync(path.join(DATA,'profiles.json'),'utf8')).list.filter(p=>p.owner===ME).length;
  const dr=await win.evaluate(async()=>{ const r=await bbApp.acctDelete(); const A=__sim.v73legal.acc(); A.st=await bbApp.acctStatus(); return r; });
  ok(dr.ok&&S.deleted,'מחיקת החשבון (bb_delete_me מדומה)');
  await win.evaluate(()=>__sim.v73legalfix.accLegalAct('wipeNo'));
  const meta=JSON.parse(fs.readFileSync(path.join(DATA,'profiles.json'),'utf8'));
  ok(before>=2&&!meta.list.some(p=>p.owner===ME)&&meta.list.filter(p=>p.local).length>=before,'P3: ״לא, להשאיר״ — '+before+' נהגים של החשבון שנמחק הפכו למקומיים (בלי owner)');
  const again=await win.evaluate(()=>bbApp.keepLocal()); ok(again.ok===false,'bb:keepLocal רק פעם אחת, ורק אחרי מחיקת חשבון');
  S.meta={name:'New',age_bracket:'18+'};
  await win.evaluate(()=>bbApp.acctSignIn('maya@example.com','pw123456')); await wait(800); const A2=await acc();
  pr=await win.evaluate(()=>bbApp.profiles());
  ok(A2.parked===0&&pr.length>=before,'חשבון מתחבר אחר כך — הנהגים נראים, parked=0 (היה: הכול ״חונה״ לתמיד)');

  ok(errs.length===0,'בלי שגיאות בדף '+errs.slice(0,2).join(' | '));
  ok(!csp.some(t=>!/example\.com|eval|Function|object-src|data:text\/html/.test(t)),'אין הפרות CSP לא צפויות '+csp.filter(t=>!/example\.com|eval|Function|object-src|data:text\/html/.test(t)).slice(0,2).join(' | '));
  await app.close();
}
srv.close(); for(const d of dirs) try{ fs.rmSync(d,{recursive:true,force:true}); }catch(e){}
done('v74_app');
