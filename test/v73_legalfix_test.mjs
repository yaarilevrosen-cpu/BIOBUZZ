// v73 legalfix — הדף: בקשה לאשר מסמכים מעודכנים (הסנכרון מושהה, חשבון ישן עונה על הגיל), 13–17 בלי בינה מלאכותית,
// הודעה בעוזר לא לכתוב פרטים אישיים והשמות שמוחלפים בכינויים, ו״אפס הכול — כולל הגיבויים״. בעברית ובאנגלית.
import {chromium} from 'playwright';
import {URL0,ok,done,realErrs,errText} from './h.mjs';
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'..');
const HE=/[֐-׿]/;
const VER=fs.readFileSync(path.join(ROOT,'legal/VERSION'),'utf8').trim();
const MOCK=cfg=>`(function(){
 const cfg=${JSON.stringify(cfg)}; window.__calls=[]; const C=(n,a)=>{ window.__calls.push([n,a]); };
 const prof={id:'p1',name:'Maya',emoji:'🚀',color:'#f5b921',active:true,local:true};
 let st=Object.assign({loggedIn:false},cfg.acct||{});
 let ai=Object.assign({has:true,ok:false,ack18:false,tail:'abcd',checkedAt:0,saved:true,models:[],pick:{fast:'',strong:''}},cfg.ai||{});
 window.bbApp={ version:'9.9.9', dataDir:'/tmp/x', firstRun:false, test:true, profile:prof, profilesAtBoot:[prof], backupsAtBoot:[], legal:cfg.legal||null,
  kvSet(){}, kvRemove(){}, kvClear(){}, flush(){}, ready(){},
  profiles:async()=>[prof], profileAdd:async()=>({ok:true}), profileUpdate:async()=>({ok:true}), profileRemove:async()=>({ok:true}), profileSwitch:async()=>({ok:true}), firstRunDone:async()=>({}),
  matchAdd:async()=>({ok:true}), matches:async()=>[], team:async()=>[], openData:async()=>({}), backupNow:async()=>({tag:'x',list:[]}), teamExport:async()=>({canceled:true}), teamImport:async()=>({canceled:true}), importBackup:async()=>({ok:false}),
  bridgeStatus:async()=>({on:false}), saveVideo:async()=>({}), showFile:async()=>({}), openVideos:async()=>({}), adbPull:async()=>({ok:false,why:'x'}),
  acctStatus:async()=>st, acctSignIn:async()=>({ok:false,why:'x'}),
  acctSignUp:async(e,p,m)=>{ C('signUp',{e,m}); return {ok:true,confirm:true}; },
  acctRecover:async()=>({ok:false}), acctSignOut:async()=>({ok:true}), teamCall:async()=>({ok:false,why:'x'}), syncNow:async()=>({ok:true}), acctName:async()=>({ok:true,name:'Maya'}),
  acctTos:async (v,m)=>{ C('tos',[v,m]); st=Object.assign({},st,{tos:v,tosWait:false},m&&m.age_bracket?{age:m.age_bracket}:{}); return {ok:true,tos:v}; },
  wipeBackups:async()=>{ C('wipeBackups'); return {ok:true,n:3,list:[]}; },
  acctExport:async()=>{ C('export'); return {ok:true,file:'/tmp/x.json'}; },
  acctDelete:async()=>{ C('delete'); if(cfg.delMissing) return {ok:false,missing:true,why:'מחיקה אוטומטית עוד לא זמינה בשרת — כתבו לנו בגיטהאב ונמחק את החשבון ידנית'}; st={loggedIn:false}; return {ok:true,uid:'u'}; },
  wipeLocal:async()=>{ C('wipe'); return {ok:true,n:1}; },
  legalAck:async v=>{ C('legalAck',v); return {ok:true}; },
  aiStatus:async()=>ai, aiSetKey:async k=>{ C('setKey'); return {ok:false,why:'x',status:ai}; }, aiClear:async()=>ai, aiCheck:async()=>({ok:true,status:ai}), aiDrills:async()=>null,
  aiAck18:async on=>{ C('ack18',on); ai=Object.assign({},ai,{ack18:!!on,ok:!!on}); return {status:ai}; },
  aiAsk:async()=>({ok:false,why:'x'}), onSync(){}, updCheck:async()=>({}), updInstall:async()=>({}), updState:async()=>({state:'idle'}), onUpd(){}, openUrl:async()=>({})
 };
})();`;
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const allErrs=[];
async function openPage({en=false,app=null,init=null}={}){
  const ctx=await browser.newContext({viewport:{width:1400,height:860}});
  const page=await ctx.newPage();
  await page.addInitScript(()=>{ window.__raf0=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=()=>0; });
  await page.addInitScript(o=>{ try{ if(!localStorage.getItem('bbUiMode1')) localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbTour1','1');
    if(!localStorage.getItem('bbWizard1')) localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); if(o.en) localStorage.setItem('bbLang1','en'); if(o.init) for(const k in o.init) localStorage.setItem(k,o.init[k]); }catch(e){} },{en,init});
  if(app) await page.addInitScript(MOCK(app));
  page.on('pageerror',e=>allErrs.push('PAGEERR '+String(e))); page.on('console',m=>{ if(m.type()==='error') allErrs.push(errText(m)); });
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.goto(URL0);
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ if(document.body.classList.contains('setup')) window.__sim.setupClose(); });
  return {ctx,page,E:(f,a)=>page.evaluate(f,a)};
}
const heb=t=>(String(t).match(/.{0,20}[֐-׿].{0,20}/)||[''])[0];

/* ── דרישה 4: מסמכים מעודכנים — הסנכרון מושהה עד שמאשרים; חשבון בלי טווח גיל עונה עליו ── */
for(const en of [false,true]){
  const L=en?'en':'he';
  const {ctx,page,E}=await openPage({en,app:{acct:{loggedIn:true,name:'Maya',email:'m@x.dev',tos:'',tosNeed:VER,tosWait:true,age:''}}});
  await page.click('#appNav [data-nav="settings"]'); await page.waitForTimeout(300);
  let s=await E(()=>{ const a=document.getElementById('acTosAsk'); return a?{txt:a.innerText, sel:!!document.getElementById('acTosAge'), role:a.getAttribute('role'), dis:a.querySelector('[data-acc="tos"]').disabled}:null; });
  ok(s&&s.sel&&s.role==='alert'&&!s.dis,'['+L+'] בקשה לאשר: מודגשת (role=alert), עם בחירת טווח גיל');
  ok(s&&(en?/paused/i.test(s.txt):/מושהה/.test(s.txt)),'['+L+'] כתוב שהסנכרון מושהה עד שמאשרים');
  if(en) ok(s&&!HE.test(s.txt),'[en] בלי עברית — '+heb(s&&s.txt));
  await page.selectOption('#acTosAge','u13'); await page.waitForTimeout(80);
  s=await E(()=>({dis:document.querySelector('#acTosAsk [data-acc="tos"]').disabled, val:document.getElementById('acTosAge').value, txt:document.getElementById('acTosAsk').innerText}));
  ok(s.dis&&s.val==='u13'&&(en?/start at age 13/.test(s.txt):/מגיל 13/.test(s.txt)),'['+L+'] מתחת ל-13: הכפתור כבוי, והסבר שאפשר למחוק את החשבון ולהמשיך בלי');
  await page.selectOption('#acTosAge','13-17'); await page.waitForTimeout(80);
  await page.click('#acTosAsk [data-acc="tos"]'); await page.waitForTimeout(120);
  s=await E(()=>({calls:window.__calls.filter(c=>c[0]==='tos').length, msg:document.getElementById('acDMsg').innerText, guard:!!document.getElementById('acTosGuard')}));
  ok(s.guard&&s.calls===0&&(en?/parent or guardian/.test(s.msg):/הורה/.test(s.msg)),'['+L+'] 13–17 בלי הסכמת הורה: לא נשלח, והודעה ('+s.msg+')');
  await page.check('#acTosGuard'); await E(()=>__sim.v73legalfix.accRender()); await page.waitForTimeout(50);
  ok(await E(()=>document.getElementById('acTosGuard').checked&&document.getElementById('acTosAge').value==='13-17'),'['+L+'] הבחירה נשמרת כשהחלונית מצוירת מחדש (עדכון סנכרון)');
  await page.click('#acTosAsk [data-acc="tos"]'); await page.waitForTimeout(150);
  s=await E(()=>({call:window.__calls.find(c=>c[0]==='tos'), ask:!!document.getElementById('acTosAsk')}));
  ok(s.call&&s.call[1][0]===VER&&JSON.stringify(s.call[1][1])==='{"age_bracket":"13-17","guardian_ok":true}'&&!s.ask,'['+L+'] אישור: acctTos('+VER+', {age_bracket, guardian_ok}), והבקשה נעלמת — '+JSON.stringify(s.call&&s.call[1]));
  await ctx.close();
}
/* ── דרישה 5: חשבון של 13–17 — הבינה המלאכותית מוסתרת לגמרי ── */
for(const en of [false,true]){
  const L=en?'en':'he';
  for(const age of ['13-17','18+']){
    const minor=age==='13-17';
    const {ctx,page,E}=await openPage({en,app:{acct:{loggedIn:true,name:'Maya',email:'m@x.dev',tos:VER,tosNeed:VER,tosWait:false,age},ai:{has:true,ok:!minor,ack18:true,minor,tail:'abcd',pick:{fast:'f',strong:'s'},models:[]}}});
    await E(async()=>{ const X=__sim.v73legalfix; X.acc().st=await bbApp.acctStatus(); X.AIST().st=await bbApp.aiStatus(); X.aiRender(); X.coachBarUI(); });
    const s=await E(()=>{ const g=document.getElementById('setAI'); __sim.cmdkOpen(); document.getElementById('cmdkIn').value='gemini key'; __sim.cmdkDraw&&__sim.cmdkDraw();
      const r={minor:__sim.v73legalfix.aiMinor(), on:__sim.v73legalfix.aiOn(), hidden:!!g.hidden||getComputedStyle(g).display==='none', set:document.getElementById('aiSet').innerText,
        bar:document.getElementById('coachBar').innerHTML, key:__sim.CMDK.list.filter(c=>!c.when||c.when()).some(c=>c.id==='ai-key')}; __sim.cmdkClose(); return r; });
    if(minor) ok(s.minor&&!s.on&&s.hidden&&!s.set&&!/data-coach="(key|me|team)"/.test(s.bar)&&!s.key,'['+L+'] 13–17: אין בינה מלאכותית — ההגדרות מוסתרות, אין ״נתח אותי״, אין הזמנה להוסיף מפתח, ולא בחיפוש');
    else ok(!s.minor&&s.on&&!s.hidden&&/data-coach="me"/.test(s.bar)&&s.key,'['+L+'] 18+: הבינה המלאכותית זמינה כרגיל');
    if(minor){ const c=await E(()=>{ __sim.v73legalfix.chatOpen('hi'); return document.getElementById('aiChat').hidden; }); ok(c,'['+L+'] 13–17: העוזר לא נפתח'); }
    await ctx.close();
  }
}
/* ── דרישה 10: העוזר — הודעה לא לכתוב פרטים אישיים; השמות שנמסרים להחלפה ── */
for(const en of [false,true]){
  const L=en?'en':'he';
  const {ctx,page,E}=await openPage({en,app:{acct:{loggedIn:true,name:'Maya Cohen',email:'maya@x.dev',tos:VER,team:{name:'Apollo',num:'9662',code:'ABCDEFGH',members:2}},ai:{has:true,ok:true,ack18:true,pick:{fast:'f',strong:'s'},models:[]}}});
  await E(async()=>{ const X=__sim.v73legalfix; X.acc().st=await bbApp.acctStatus(); X.AIST().st=await bbApp.aiStatus(); __sim.v73legalfix.chatOpen(); });
  const s=await E(()=>({note:document.getElementById('aiChatPriv').innerText, vis:document.getElementById('aiChatPriv').offsetParent!==null, names:__sim.v73legalfix.aiNames()}));
  ok(s.vis&&(en?/personal details/.test(s.note)&&/nicknames/.test(s.note):/פרטים אישיים/.test(s.note)&&/כינויים/.test(s.note)),'['+L+'] חלון העוזר: ״לא לכתוב פרטים אישיים… השמות מוחלפים בכינויים״');
  if(en) ok(!HE.test(s.note),'[en] ההודעה בלי עברית');
  ok(s.names.drivers.includes('Maya')&&s.names.members.includes('Maya Cohen')&&s.names.members.includes('maya@x.dev')&&s.names.team==='Apollo','['+L+'] aiNames: נהגים, שם החשבון והמייל, שם הקבוצה — '+JSON.stringify(s.names));
  const sent=await E(async()=>{ let got=null; bbApp.aiAsk=async(k,o)=>{ got=o; return {ok:true,text:'ok'}; }; document.getElementById('aiChatIn').value='hello'; await __sim.v73legalfix.chatSend(); return got; });
  ok(sent&&sent.names&&sent.names.team==='Apollo'&&sent.messages.length>=1,'['+L+'] השאלה נשלחת לתהליך הראשי יחד עם השמות להחלפה');
  await ctx.close();
}
/* ── דרישה 11: ״אפס הכול — כולל הגיבויים״ ── */
{
  const init={bbFoo1:'1', bbBackups1:JSON.stringify([{at:Date.now()-1000,why:'ידני',data:{bbKeyBind1:'{"a":1}',bbFoo1:'0'}}]), bbKeyBind1:'{"a":2}'};
  for(const en of [false,true]){
    const L=en?'en':'he';
    const {ctx,page,E}=await openPage({en,init});
    await E(()=>__sim.v71.settingsOpen('dBk')); await page.waitForTimeout(150);
    let s=await E(()=>({box:!!document.getElementById('bkInclBk'), note:document.getElementById('bkFullNote').hidden, lab:document.getElementById('bkInclBk').closest('label').innerText}));
    ok(s.box&&s.note&&(en?/Including backups/.test(s.lab):/כולל הגיבויים/.test(s.lab)),'['+L+'] תיבה ״כולל הגיבויים״ ליד ״אפס הכול״');
    if(en) ok(!HE.test(s.lab),'[en] בלי עברית');
    await page.check('#bkInclBk'); await page.click('#bBkAll'); await page.waitForTimeout(60);
    s=await E(()=>({note:document.getElementById('bkFullNote').innerText, nh:document.getElementById('bkFullNote').hidden, btn:document.getElementById('bBkAll').textContent, keep:localStorage.getItem('bbBackups1')!==null&&localStorage.getItem('bbFoo1')==='1'}));
    ok(!s.nh&&(en?/backups folder/.test(s.note):/תיקיית הגיבויים/.test(s.note))&&(en?/backups too/.test(s.btn):/גם הגיבויים/.test(s.btn))&&s.keep,'['+L+'] לחיצה ראשונה: אישור ברור (״גם הגיבויים״) והסבר — עוד לא נמחק כלום ('+s.btn+')');
    if(en) ok(!HE.test(s.note+s.btn),'[en] האישור בלי עברית — '+heb(s.note+s.btn));
    await ctx.close();
  }
  /* המצב אחרי: רגיל שומר גיבוי ביטחון; ״כולל הגיבויים״ מוחק הכול (גם bbBackups1), ובאפליקציה גם את התיקייה */
  {
    const {ctx,page,E}=await openPage({init});
    const r=await E(()=>{ const n=__sim.bk.resetAll({noReload:true}); const a=JSON.parse(localStorage.getItem('bbBackups1')||'[]'); return {n, bk:a.length, why:a[0]&&a[0].why, foo:localStorage.getItem('bbFoo1')}; });
    ok(r.n>0&&r.bk===2&&/לפני איפוס/.test(r.why)&&r.foo===null,'״אפס הכול״ רגיל: נשמר גיבוי ביטחון (עכשיו 2 גיבויים)');
    await E(()=>localStorage.setItem('bbFoo1','1'));
    const f=await E(async()=>{ const o=await __sim.v73legalfix.resetAllFull({noReload:true}); return {o, bk:localStorage.getItem('bbBackups1'), foo:localStorage.getItem('bbFoo1'), kb:localStorage.getItem('bbKeyBind1')}; });
    ok(f.o.n>0&&f.bk===null&&f.foo===null&&f.kb===null&&f.o.app===null,'״כולל הגיבויים״: הכול נמחק, גם bbBackups1, בלי גיבוי ביטחון');
    await ctx.close();
  }
  {
    const {ctx,page,E}=await openPage({app:{acct:{loggedIn:false}},init});
    const f=await E(async()=>{ const o=await __sim.v73legalfix.resetAllFull({noReload:true}); return {o, calls:window.__calls.filter(c=>c[0]==='wipeBackups').length}; });
    ok(f.calls===1&&f.o.app&&f.o.app.ok,'באפליקציה: ״כולל הגיבויים״ קורא ל-bbApp.wipeBackups (תיקיית הגיבויים והסל)');
    await ctx.close();
  }
}
const errs=realErrs(allErrs); ok(!errs.length,'אין שגיאות בדף: '+errs.slice(0,3).join(' | '));
await browser.close();
done('v73_legalfix');
