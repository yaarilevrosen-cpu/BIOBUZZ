// v78 — מצב ״סקאוטינג״ באפליקציה האמיתית (Electron), מול שרת ענן מדומה מקומי: התחברות → ״📊 סקאוטינג״ בסרגל,
// ניהול מנהלים דרך ה-IPC, הוסר בשרת → ״משחק״, הפעלה מחדש בלי רשת → עדיין מנהל (מטמון), התנתקות → נעלם.
// בלי רשת: לינוקס בלי מחזיק מפתחות לא שומר את ההתחברות בין הפעלות (v63), לכן ״בלי אינטרנט״ נבדק באותה הפעלה;
// מטמון אחרי הפעלה מחדש — ב-v78_admin_test.mjs. הרצה: (אחרי python build.py) xvfb-run -a node v78_mode_app_test.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import net from 'net';
import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'..'), APP=ROOT+'/app';
let pass=0, fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ✓ ':'  ✗ ')+m); };
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USERS={tA:{id:A,email:'owner@example.test',user_metadata:{name:'Owner',tos_v:'2026-10-01',age_bracket:'18+'}},
             tB:{id:B,email:'second@example.test',user_metadata:{name:'Second',tos_v:'2026-10-01',age_bracket:'18+'}}};
const own=()=>new Map([[A,{role:'owner',inv:true,by:null,at:'2026-11-01T10:00:00+00:00'}]]);
const S={admins:own(), down:false, calls:[]};
const byMail=em=>Object.values(USERS).find(u=>u.email===em);
const srv=http.createServer((q,r)=>{ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
  if(S.down){ q.socket.destroy(); return; }
  const u=new URL(q.url,'http://x'), p=u.pathname, tok=String(q.headers.authorization||'').replace(/^Bearer /,'');
  const send=(c,o)=>{ r.writeHead(c,{'Content-Type':'application/json'}); r.end(o===undefined?'':JSON.stringify(o)); };
  const me=USERS[tok]; let body={}; try{ body=b?JSON.parse(b):{}; }catch(e){}
  if(p==='/auth/v1/token'){ const t=u.searchParams.get('grant_type')==='refresh_token'?String(body.refresh_token||'').replace(/^r/,'t'):(byMail(body.email)===USERS.tB?'tB':'tA');
    return USERS[t]?send(200,{access_token:t,refresh_token:'r'+t.slice(1),expires_in:3600,user:USERS[t]}):send(400,{message:'bad'}); }
  if(p==='/auth/v1/logout') return send(204);
  if(p==='/auth/v1/user') return me?send(200,me):send(401,{message:'jwt'});
  if(p.startsWith('/rest/v1/rpc/')){ const fn=p.slice(13); S.calls.push(fn); if(!me) return send(401,{message:'JWT expired'});
    const m=S.admins.get(me.id), err=x=>send(400,{code:'P0001',message:x}), mail=id=>(Object.values(USERS).find(x=>x.id===id)||{}).email||null;
    if(fn==='bb_scout_is_admin') return send(200,!!m);
    if(/^bb_scout/.test(fn)&&!m) return err('not_admin');
    if(fn==='bb_scout_admins_list') return send(200,[...S.admins].map(([id,x])=>({user_id:id,email:mail(id),role:x.role,can_invite:x.inv,added_at:x.at,added_by:x.by,added_by_email:x.by?mail(x.by):null})));
    if(fn==='bb_scout_admin_add'){ if(m.role!=='owner'&&!m.inv) return err('not_allowed'); const t=byMail(String(body.p_email||'')); if(!t) return err('no_account');
      if(!S.admins.has(t.id)) S.admins.set(t.id,{role:'admin',inv:false,by:me.id,at:'2026-11-09T08:00:00+00:00'}); return send(204); }
    if(fn==='bb_scout_admin_remove'){ const t=S.admins.get(body.p_user); if(!t) return send(204); if(m.role!=='owner'&&(t.by!==me.id||!m.inv)) return err('not_allowed_remove');
      if(t.role==='owner'&&[...S.admins.values()].filter(x=>x.role==='owner').length<=1) return err('last_owner'); S.admins.delete(body.p_user); return send(204); }
    if(fn==='bb_scout_admin_set'){ if(m.role!=='owner') return err('not_owner'); const t=S.admins.get(body.p_user); if(!t) return err('not_found'); if(body.p_can_invite!=null) t.inv=body.p_can_invite; return send(204); }
    return send(200,null); }
  if(p==='/rest/v1/bb_team_members') return send(200,[]);
  if(p==='/rest/v1/bb_profiles'||p==='/rest/v1/bb_matches') return send(q.method==='GET'?200:201,q.method==='GET'?[]:undefined);
  send(404,{message:'no route '+p});
}); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bb78app-'));
const freePort=()=>new Promise(r=>{ const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{ const p=s.address().port; s.close(()=>r(p)); }); });
const SIMF=fs.existsSync(ROOT+'/dist/BIOBUZZ-lab-lite.html')?ROOT+'/dist/BIOBUZZ-lab-lite.html':APP+'/sim/index.html';
const {_electron:electron}=await import('playwright');
async function launch(){
  const app=await electron.launch({executablePath:APP+'/node_modules/electron/dist/electron',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APP],
    env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_BRIDGE:String(await freePort()),BIOBUZZ_SIM:SIMF,BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none',
      BIOBUZZ_CLOUD_URL:BASE,BIOBUZZ_CLOUD_KEY:'anon-test',BIOBUZZ_PLAIN_SESS:'1',BIOBUZZ_AI_PLAIN:'1',BIOBUZZ_LEGAL_V:''},timeout:90000});
  const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
  await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length&&window.__sim.SCM&&window.__sim.SCM.wired,null,{timeout:180000});
  await win.evaluate(()=>{ const w=document.getElementById('welcome'); if(w) w.hidden=true; });
  return {app,win,errs};
}
const navBtn='#appNav [data-nav="scout"]';
let {app,win,errs}=await launch();
let r=await win.evaluate(async()=>({nav:!!document.querySelector('#appNav [data-nav="scout"]'), n:document.querySelectorAll('#appNav [data-nav]').length, adm:await bbApp.scoutAdmin(), st:(await bbApp.acctStatus()).scoutAdmin}));
ok(!r.nav&&r.n===7&&r.adm.admin===false&&r.st===false,'לא מחוברים: אין ״סקאוטינג״ בסרגל (7 כפתורים), scoutAdmin=false ('+JSON.stringify(r)+')');
r=await win.evaluate(()=>({t:bbApp.test, x:__sim.scoutAdminSet(true)}));
ok(r.t===true&&r.x===true,'(האפליקציה במצב בדיקה — BIOBUZZ_TEST — ולכן ה-stub פועל; באפליקציה רגילה ובדפדפן רגיל לא) '+JSON.stringify(r));
await win.evaluate(()=>__sim.scoutAdminSet(null));
// התחברות כמנהל
await win.evaluate(()=>bbApp.acctSignIn('owner@example.test','pw123456'));
await win.waitForFunction(()=>!!document.querySelector('#appNav [data-nav="scout"]'),null,{timeout:20000}).catch(()=>{});
r=await win.evaluate(async()=>({nav:!!document.querySelector('#appNav [data-nav="scout"]'), st:(await bbApp.acctStatus()).scoutAdmin, file:null}));
ok(r.nav&&r.st===true&&S.calls.includes('bb_scout_is_admin'),'התחברות כמנהל: הבדיקה בשרת, ״סקאוטינג״ בסרגל ('+JSON.stringify(r)+')');
ok(fs.existsSync(path.join(DATA,'scout-admin.json')),'המטמון נשמר בתיקיית הנתונים');
r=await win.evaluate(async()=>{ document.querySelector('#appNav [data-nav="scout"]').click(); await new Promise(r=>setTimeout(r,200));
  return {mode:__sim.UI.mode, on:document.querySelector('#appNav [data-nav="scout"]').classList.contains('on'), panel:getComputedStyle(document.getElementById('scmPanel')).display}; });
ok(r.mode==='scout'&&r.on&&r.panel==='flex','לחיצה בסרגל: מצב הסקאוטינג, הכפתור מסומן, הלוח בצד ('+JSON.stringify(r)+')');
// מנהלים דרך ה-IPC
r=await win.evaluate(async()=>{ document.getElementById('scmAdm').open=true; for(let i=0;i<40&&!document.querySelector('#scmAdmBody .scmAdmRow');i++) await new Promise(r=>setTimeout(r,100));
  const rows1=document.querySelectorAll('#scmAdmBody .scmAdmRow').length;
  document.getElementById('scmAdmIn').value='nobody@example.test'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,600)); const m1=document.getElementById('scmAdmMsg').textContent;
  document.getElementById('scmAdmIn').value='second@example.test'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,800));
  return {rows1, m1, rows2:document.querySelectorAll('#scmAdmBody .scmAdmRow').length, me:document.querySelector('#scmAdmBody em')&&document.querySelector('#scmAdmBody em').textContent}; });
ok(r.rows1===1&&/אין חשבון עם המייל הזה/.test(r.m1)&&r.rows2===2&&r.me==='אני','מנהלים דרך האפליקציה: רשימה, ״אין חשבון״, הוספה ('+JSON.stringify(r)+')');
r=await win.evaluate(async B=>{ const c=document.querySelector('#scmAdmBody [data-scminv="'+B+'"]'); if(!c) return {no:true}; c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true}));
  for(let i=0;i<30&&!/עודכנה/.test(document.getElementById('scmAdmMsg').textContent);i++) await new Promise(r=>setTimeout(r,100)); return {msg:document.getElementById('scmAdmMsg').textContent}; },B);
ok(/עודכנה/.test(r.msg)&&S.admins.get(B).inv===true&&S.calls.includes('bb_scout_admin_set'),'בעלים: ״יכול להוסיף מנהלים״ דרך ה-IPC → bb_scout_admin_set ('+JSON.stringify(r)+')');
// הוסר בשרת (מנהל אחר) → בדיקה → ״משחק״
S.admins.delete(A);
r=await win.evaluate(async()=>{ const x=await bbApp.scoutAdmin(true); for(let i=0;i<30&&__sim.UI.mode==='scout';i++) await new Promise(r=>setTimeout(r,100));
  return {x, mode:__sim.UI.mode, nav:!!document.querySelector('#appNav [data-nav="scout"]')}; });
ok(r.x.admin===false&&r.mode==='play'&&!r.nav,'הוסר בשרת: הבדיקה הבאה → ״משחק״, ״סקאוטינג״ נעלם מהסרגל ('+JSON.stringify(r)+')');
S.admins.set(A,{role:'owner',inv:true,by:null,at:'2026-11-01T10:00:00+00:00'});
r=await win.evaluate(async()=>{ await bbApp.scoutAdmin(true); for(let i=0;i<30&&!document.querySelector('#appNav [data-nav="scout"]');i++) await new Promise(r=>setTimeout(r,100)); return !!document.querySelector('#appNav [data-nav="scout"]'); });
ok(r,'הוחזר: ״סקאוטינג״ חוזר לסרגל');
await win.evaluate(()=>{ document.querySelector('#appNav [data-nav="scout"]').click(); });
const e1=errs.filter(e=>!/ERR_CONNECTION_REFUSED|127\.0\.0\.1:1\//.test(e)); ok(!e1.length,'בלי שגיאות בדף ('+e1.slice(0,2).join(' | ')+')');
// בלי אינטרנט (תחרות): הבדיקה בשרת נכשלת — התשובה מהמטמון, המצב נשאר
S.down=true;
r=await win.evaluate(async()=>{ const x=await bbApp.scoutAdmin(true); await new Promise(r=>setTimeout(r,300)); return {x, mode:__sim.UI.mode, nav:!!document.querySelector('#appNav [data-nav="scout"]')}; });
ok(r.x.admin===true&&r.x.offline===true&&r.mode==='scout'&&r.nav,'בלי אינטרנט: התשובה מהמטמון (offline), נשארים במצב ('+JSON.stringify(r)+')');
r=await win.evaluate(async()=>{ document.getElementById('scmAdm').open=false; document.getElementById('scmAdm').open=true; __sim.SCM.adm=null; await __sim.scmAdmLoad(); return document.getElementById('scmAdmMsg').textContent; });
ok(/אין חיבור לאינטרנט/.test(r),'ניהול המנהלים בלי רשת — ״אין חיבור לאינטרנט…״ ('+r+')');
S.down=false;
// התנתקות → נעלם, והמטמון נמחק
r=await win.evaluate(async()=>{ __sim.scmGo(); await bbApp.acctSignOut(); for(let i=0;i<30&&document.querySelector('#appNav [data-nav="scout"]');i++) await new Promise(r=>setTimeout(r,100));
  return {nav:!!document.querySelector('#appNav [data-nav="scout"]'), mode:__sim.UI.mode, st:(await bbApp.acctStatus()).scoutAdmin}; });
ok(!r.nav&&r.mode==='play'&&r.st===false&&!fs.existsSync(path.join(DATA,'scout-admin.json')),'התנתקות: ״סקאוטינג״ נעלם, ״משחק״, המטמון נמחק ('+JSON.stringify(r)+')');
// חשבון אחר (לא מנהל) — לא יורש
S.admins.delete(B); await win.evaluate(()=>bbApp.acctSignIn('second@example.test','pw123456')).catch(()=>{});
await win.waitForTimeout(2500);   /* חשבון אחר — הדף נטען מחדש (הנהגים של הקודם ״חונים״) */
await win.waitForFunction(()=>window.__sim&&window.__sim.SCM&&window.__sim.SCM.wired,null,{timeout:180000}); await win.waitForTimeout(1500);
r=await win.evaluate(async()=>({nav:!!document.querySelector('#appNav [data-nav="scout"]'), st:(await bbApp.acctStatus()).scoutAdmin}));
ok(!r.nav&&r.st===false,'חשבון אחר שלא מנהל: אין ״סקאוטינג״ ('+JSON.stringify(r)+')');
const e2=errs.filter(e=>!/ERR_CONNECTION_REFUSED|127\.0\.0\.1:1\//.test(e)); ok(!e2.length,'בלי שגיאות בדף ('+e2.slice(0,2).join(' | ')+')');
await app.close(); srv.close();
try{ fs.rmSync(DATA,{recursive:true,force:true}); }catch(e){}
console.log(`\nv78_mode_app: ${pass} עברו, ${fail} נכשלו`);
process.exit(fail?1:0);
