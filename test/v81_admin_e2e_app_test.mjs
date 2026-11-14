// v81 — לוח המנהל באפליקציה האמיתית (Electron), מול שרת ענן מדומה מקומי: התחברות כבעלים → ״ניהול״ בסרגל → דיווחים מהשרת דרך ה-IPC,
// ״טופל״ מגיע לשרת, הודעה לכולם מופיעה בפס; מנהל רגיל — בלי ״חשבונות״; משתמש רגיל — בלי ״ניהול״; חשבון חסום — הסנכרון נעצר עם הסיבה.
// הרצה: (אחרי python build.py) xvfb-run -a node v81_admin_e2e_app_test.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import net from 'net';
import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'..'), APP=ROOT+'/app';
let pass=0, fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ✓ ':'  ✗ ')+m); };
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const mk=(id,em)=>({id,email:em,user_metadata:{name:em.split('@')[0],tos_v:'2026-10-01',age_bracket:'18+'}});
const USERS={tO:mk(A,'owner@example.test'),tS:mk(B,'second@example.test'),tU:mk(C,'user@example.test')};
const S={role:{[A]:'owner',[B]:'admin'}, blocked:{}, calls:[], notices:[{id:3,created_at:'2026-11-14T10:00:00+00:00',text_he:'יצאה גרסה חדשה',text_en:'A new version is out',until:'2099-01-01T00:00:00+00:00'}],
  bugs:[{id:9,created_at:'2026-11-14T10:00:00+00:00',ver:'v81 / 1.21.0',lang:'he',platform:'Linux · app',what:'הניקוד יורד ל-0',steps:'מאץ׳ מלא',contact:'',has_shot:false,n_errors:0,signed_in:true,email:'user@example.test',done:false,done_at:null,note:null}]};
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  const u=new URL(q.url,'http://x'), p=u.pathname, tok=String(q.headers.authorization||'').replace(/^Bearer /,'');
  const send=(c,o)=>{ r.writeHead(c,{'Content-Type':'application/json'}); r.end(o===undefined?'':JSON.stringify(o)); };
  const me=USERS[tok]; let body={}; try{ body=b?JSON.parse(b):{}; }catch(e){}
  if(p==='/auth/v1/token'){ const t=u.searchParams.get('grant_type')==='refresh_token'?String(body.refresh_token||'').replace(/^r/,'t'):'t'+String(body.email||'')[0].toUpperCase();
    return USERS[t]?send(200,{access_token:t,refresh_token:'r'+t.slice(1),expires_in:3600,user:USERS[t]}):send(400,{message:'bad'}); }
  if(p==='/auth/v1/logout') return send(204);
  if(p==='/auth/v1/user') return me?send(200,me):send(401,{message:'jwt'});
  if(p.startsWith('/rest/v1/rpc/')){ const fn=p.slice(13); S.calls.push({fn,body,tok});
    if(fn==='bb_notices_active') return send(200,S.notices);
    if(!me) return send(401,{message:'JWT expired'});
    const role=S.role[me.id], err=x=>send(400,{code:'P0001',message:x});
    if(fn==='bb_scout_is_admin') return send(200,!!role);
    if(fn==='bb_my_block') return send(200,S.blocked[me.id]?{blocked:true,reason:S.blocked[me.id]}:null);
    if(fn==='bb_admin_me') return send(200,role?{role,owner:role==='owner'}:null);
    if(/^bb_admin_/.test(fn)&&!role) return err('not_admin');
    if(fn==='bb_admin_bugs') return send(200,S.bugs.filter(x=>body.p_state==='open'?!x.done:body.p_state==='done'?x.done:true).map(x=>Object.assign({},x,role==='owner'?{}:{email:null})));
    if(fn==='bb_admin_bug'){ const x=S.bugs.find(y=>y.id===body.p_id); return x?send(200,Object.assign({shot:null,sys:null,errors:null},x)):err('not_found'); }
    if(fn==='bb_admin_bug_set'){ const x=S.bugs.find(y=>y.id===body.p_id); if(!x) return err('not_found'); if(body.p_done!=null) x.done=body.p_done; if(body.p_note!=null) x.note=body.p_note; return send(204); }
    if(fn==='bb_admin_stats') return send(200,{users:3,matches:5,bugs:1,bugs_open:S.bugs.filter(x=>!x.done).length,days:[],bug_vers:[]});
    if(/^bb_admin_/.test(fn)&&role!=='owner') return err('not_owner');
    if(fn==='bb_admin_users') return send(200,[{user_id:C,email:'user@example.test',created_at:'2026-11-01T10:00:00+00:00',last_sign_in_at:null,team_name:null,team_num:null,n_profiles:1,n_matches:2,last_match:null,n_bugs:1,blocked:!!S.blocked[C],block_reason:S.blocked[C]||null,admin_role:null,total:1}]);
    if(fn==='bb_admin_block'){ if(body.p_block) S.blocked[body.p_user]=body.p_reason||''; else delete S.blocked[body.p_user]; return send(204); }
    if(/^bb_scout/.test(fn)) return send(200,[]);
    return send(200,null); }
  if(p==='/rest/v1/bb_team_members'||p==='/rest/v1/bb_scout_admins') return send(200,[]);
  if(p==='/rest/v1/bb_profiles'||p==='/rest/v1/bb_matches') return send(q.method==='GET'?200:201,q.method==='GET'?[]:undefined);
  send(404,{message:'no route '+p});
}); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bb81app-'));
const freePort=()=>new Promise(r=>{ const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{ const p=s.address().port; s.close(()=>r(p)); }); });
const SIMF=fs.existsSync(ROOT+'/dist/BIOBUZZ-lab-lite.html')?ROOT+'/dist/BIOBUZZ-lab-lite.html':APP+'/sim/index.html';
const {_electron:electron}=await import('playwright');
const app=await electron.launch({executablePath:APP+'/node_modules/electron/dist/electron',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APP],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_BRIDGE:String(await freePort()),BIOBUZZ_SIM:SIMF,BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none',
    BIOBUZZ_CLOUD_URL:BASE,BIOBUZZ_CLOUD_KEY:'anon-test',BIOBUZZ_PLAIN_SESS:'1',BIOBUZZ_AI_PLAIN:'1',BIOBUZZ_LEGAL_V:''},timeout:90000});
const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length&&window.__sim.ADM,null,{timeout:180000});
await win.evaluate(()=>{ const w=document.getElementById('welcome'); if(w) w.hidden=true; });
const NAV='#appNav [data-nav="admin"]', sleep=ms=>new Promise(r=>setTimeout(r,ms));
const has=sel=>win.evaluate(s=>!!document.querySelector(s),sel);
// 1. לא מחוברים: אין ״ניהול״; ההודעה לכולם מופיעה גם בלי חשבון (מפתח ציבורי)
await win.waitForFunction(()=>{ const n=document.getElementById('bbNotice'); return n&&!n.hidden; },null,{timeout:20000}).catch(()=>{});
let r=await win.evaluate(()=>({nav:!!document.querySelector('#appNav [data-nav="admin"]'),strip:(document.getElementById('bbNotice')||{}).textContent||'',api:typeof bbApp.admin+'/'+typeof bbApp.notices}));
ok(!r.nav&&r.api==='function/function','לא מחוברים: אין ״ניהול״ בסרגל; bbApp.admin ו-bbApp.notices קיימים');
ok(/יצאה גרסה חדשה/.test(r.strip)&&S.calls.some(c=>c.fn==='bb_notices_active'&&c.tok==='anon-test'),'הודעה לכולם מהשרת מופיעה בפס גם בלי חשבון, עם המפתח הציבורי ('+r.strip.slice(0,40)+')');
r=await win.evaluate(()=>bbApp.admin('bugs',{})); ok(!r.ok&&/להתחבר/.test(r.why),'לא מחוברים: ה-IPC של לוח המנהל מבקש להתחבר');
// 2. בעלים
await win.evaluate(()=>bbApp.acctSignIn('owner@example.test','pw123456'));
await win.waitForFunction(s=>!!document.querySelector(s),NAV,{timeout:25000}).catch(()=>{});
r=await win.evaluate(async()=>({nav:!!document.querySelector('#appNav [data-nav="admin"]'),st:(await bbApp.acctStatus()).admin}));
ok(r.nav&&r.st&&r.st.owner===true,'התחברות כבעלים: ״ניהול״ מופיע בסרגל, הסטטוס admin.owner ('+JSON.stringify(r)+')');
r=await win.evaluate(async()=>{ document.querySelector('#appNav [data-nav="admin"]').click(); for(let i=0;i<50&&!document.querySelector('.admBug');i++) await new Promise(r=>setTimeout(r,100));
  return {tabs:[...document.querySelectorAll('[data-admtab]')].map(b=>b.dataset.admtab).join(),rows:document.querySelectorAll('.admBug').length,t:(document.querySelector('.admBugHead')||{}).textContent||'',on:document.querySelector('#appNav [data-nav="admin"]').classList.contains('on')}; });
ok(r.tabs==='bugs,users,notice,stats,log'&&r.rows===1&&/הניקוד יורד/.test(r.t)&&r.on,'הדף: חמש לשוניות, והדיווח מהשרת מוצג ('+r.tabs+')');
r=await win.evaluate(async()=>{ document.querySelector('[data-admbug="9"]').click(); for(let i=0;i<40&&!document.querySelector('[data-adm="bugdone"]');i++) await new Promise(r=>setTimeout(r,100));
  const body=document.querySelector('.admBugBody').textContent; document.getElementById('admNote').value='תוקן'; document.querySelector('[data-adm="bugdone"]').click(); await new Promise(r=>setTimeout(r,800));
  return {mail:/user@example\.test/.test(body),rows:document.querySelectorAll('.admBug').length,msg:document.getElementById('admMsg').textContent}; });
ok(r.mail&&r.rows===0&&/טופל/.test(r.msg)&&S.bugs[0].done===true&&S.bugs[0].note==='תוקן','פרטים עם המייל (לבעלים); ״✓ סמן שטופל״ עם הערה הגיע לשרת');
r=await win.evaluate(async C=>{ document.querySelector('[data-admtab="users"]').click(); for(let i=0;i<40&&!document.querySelector('.admTbl');i++) await new Promise(r=>setTimeout(r,100));
  const n=document.querySelectorAll('.admTbl tr').length-1; document.querySelector('[data-adm="block"]').click(); await new Promise(r=>setTimeout(r,150));
  document.getElementById('admReason').value='בדיקה'; document.querySelector('[data-adm="block"]').click(); await new Promise(r=>setTimeout(r,900));
  return {n,un:!!document.querySelector('[data-adm="unblock"]')}; },C);
ok(r.n===1&&r.un&&S.blocked[C]==='בדיקה','חשבונות: הרשימה מהשרת, וחסימה עם סיבה הגיעה לשרת');
// 3. מנהל רגיל
await win.evaluate(()=>bbApp.acctSignOut()); await win.waitForFunction(s=>!document.querySelector(s),NAV,{timeout:15000}).catch(()=>{});
ok(!(await has(NAV)),'התנתקות: ״ניהול״ נעלם');
await win.evaluate(()=>bbApp.acctSignIn('second@example.test','pw123456'));
await win.waitForFunction(s=>!!document.querySelector(s),NAV,{timeout:25000}).catch(()=>{});
r=await win.evaluate(async()=>{ const b=document.querySelector('#appNav [data-nav="admin"]'); if(!b) return {no:1}; b.click(); for(let i=0;i<40&&!document.querySelector('[data-admtab]');i++) await new Promise(r=>setTimeout(r,100));
  await new Promise(r=>setTimeout(r,500)); document.querySelector('[data-admbs="all"]').click(); for(let i=0;i<40&&!document.querySelector('.admBug');i++) await new Promise(r=>setTimeout(r,100));
  return {tabs:[...document.querySelectorAll('[data-admtab]')].map(b=>b.dataset.admtab).join(),rows:document.querySelectorAll('.admBug').length,users:await bbApp.admin('users',{})}; });
ok(r.tabs==='bugs,stats'&&r.rows===1&&r.users&&!r.users.ok&&/רק הבעלים/.test(r.users.why),'מנהל רגיל: רק ״דיווחי באגים״ ו״סטטיסטיקה״; רשימת החשבונות נדחית בשרת ('+JSON.stringify(r).slice(0,120)+')');
// 4. משתמש רגיל שנחסם
await win.evaluate(()=>bbApp.acctSignOut()); await sleep(500);
await win.evaluate(()=>bbApp.acctSignIn('user@example.test','pw123456')); await sleep(2500);
r=await win.evaluate(async()=>{ const s=await bbApp.syncNow(); const st=await bbApp.acctStatus(); return {nav:!!document.querySelector('#appNav [data-nav="admin"]'),ok:s&&s.ok,why:s&&s.why,blocked:st.blocked,adm:st.admin,ipc:await bbApp.admin('stats',{})}; });
ok(!r.nav&&r.adm===null&&!r.ipc.ok&&/רק מנהל/.test(r.ipc.why),'משתמש רגיל: אין ״ניהול״, וה-IPC נדחה בשרת');
ok(r.ok===false&&/נחסם/.test(r.why||'')&&/בדיקה/.test(r.why||'')&&r.blocked&&r.blocked.reason==='בדיקה','חשבון חסום: הסנכרון נעצר עם ״החשבון נחסם על ידי מנהל — <הסיבה>״ ('+(r.why||'')+')');
const e2=errs.filter(e=>!/ERR_CONNECTION_REFUSED|127\.0\.0\.1:1\//.test(e)); ok(!e2.length,'בלי שגיאות בדף ('+e2.slice(0,2).join(' | ')+')');
await app.close(); srv.close();
try{ fs.rmSync(DATA,{recursive:true,force:true}); }catch(e){}
console.log(`\nv81_admin_e2e_app: ${pass} עברו, ${fail} נכשלו`);
process.exit(fail?1:0);
