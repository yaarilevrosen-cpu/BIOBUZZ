// v73 legal — המסמכים המשפטיים באפליקציה: המציג (מכל נקודת כניסה, בעברית ובאנגלית), Markdown בטוח,
// הודעה בפעם הראשונה, הרשמה עם טווח גיל והסכמה, זכויות על הנתונים בחשבון, שער 18+ לבינה המלאכותית,
// ההודעה בדיווח באג, ו-tools/legal_embed.py --check (כולל זיהוי ״לא מעודכן״ ואידמפוטנטיות)
import {chromium} from 'playwright';
import {URL0,ok,done,realErrs,errText} from './h.mjs';
import fs from 'fs'; import os from 'os'; import path from 'path'; import {spawnSync} from 'child_process'; import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'..');
const HE=/[֐-׿]/;

/* ── 1. legal_embed.py --check ── */
{
  const r=spawnSync('python3',[path.join(ROOT,'tools/legal_embed.py'),'--check'],{encoding:'utf8'});
  ok(r.status===0,'legal_embed --check: הכול מעודכן ('+(r.stdout||r.stderr).trim()+')');
  /* עותק זמני: שינוי במסמך → --check נכשל; כתיבה → מעודכן; כתיבה שנייה לא משנה כלום */
  const T=fs.mkdtempSync(path.join(os.tmpdir(),'bb73legal-'));
  for(const d of ['tools','legal','site','app/build']) fs.cpSync(path.join(ROOT,d),path.join(T,d),{recursive:true});
  fs.copyFileSync(path.join(ROOT,'biobuzz-sim.html'),path.join(T,'biobuzz-sim.html'));
  fs.appendFileSync(path.join(T,'legal/privacy.en.md'),'\n- one more line\n');
  const run=a=>spawnSync('python3',[path.join(T,'tools/legal_embed.py')].concat(a||[]),{encoding:'utf8'});
  const c1=run(['--check']); ok(c1.status===1&&/biobuzz-sim\.html/.test(c1.stdout)&&/site\/privacy\.html/.test(c1.stdout),'מסמך שהשתנה בלי להטמיע — --check יוצא עם 1 ומונה את הקבצים');
  const w1=run(), c2=run(['--check']), w2=run();
  ok(w1.status===0&&c2.status===0&&/nothing/.test(w2.stdout),'כתיבה ← מעודכן, וכתיבה שנייה לא משנה כלום (אידמפוטנטי)');
  ok(fs.readFileSync(path.join(T,'biobuzz-sim.html'),'utf8').split('id="legalDocs"').length===2,'בלוק legalDocs אחד בלבד אחרי כמה הרצות');
  fs.writeFileSync(path.join(T,'legal/terms.en.md'),'# T\n\n<b>html</b> and [x](http://insecure.example)\n');
  const bad=run(['--check']); ok(bad.status===2&&/HTML is not allowed/.test(bad.stdout)&&/only https/.test(bad.stdout),'HTML וקישור שאינו https במסמך — נדחים (יציאה 2)');
  fs.rmSync(T,{recursive:true,force:true});
  const lic=fs.readFileSync(path.join(ROOT,'app/build/license.txt'),'utf8');
  ok(lic.charCodeAt(0)===0xfeff&&/\r\n/.test(lic)&&/Terms of Use/i.test(lic)&&HE.test(lic),'app/build/license.txt: UTF-8 עם BOM, CRLF, אנגלית ועברית');
  const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'app/package.json'),'utf8')).build;
  ok(pkg.nsis.license==='build/license.txt'&&pkg.nsis.installerLanguages.join()==='en_US'&&pkg.extraResources.some(x=>x.from==='../legal')&&pkg.extraResources.some(x=>/THIRD_PARTY_NOTICES/.test(x.from)),'electron-builder: nsis.license, שפת המתקין לא השתנתה, legal/ ו-THIRD_PARTY_NOTICES בחבילה');
  const idx=fs.readFileSync(path.join(ROOT,'site/index.html'),'utf8');
  ok(['privacy','terms','ai','security','accessibility','licenses'].every(d=>idx.includes('href="'+d+'.html"')&&fs.existsSync(path.join(ROOT,'site',d+'.html')))&&/not affiliated with, endorsed by or sponsored by/.test(idx),'האתר: 6 דפים, וכותרת תחתונה בדף הבית עם כל הקישורים והצהרת FIRST');
}

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
  acctTos:async v=>{ C('tos',v); st=Object.assign({},st,{tos:v}); return {ok:true,tos:v}; },
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
async function openPage({en=false,app=null,q='',init=null}={}){
  const ctx=await browser.newContext({viewport:{width:1400,height:860}});
  const page=await ctx.newPage();
  await page.addInitScript(()=>{ window.__raf0=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=()=>0; });
  await page.addInitScript(o=>{ try{ if(!localStorage.getItem('bbUiMode1')) localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbTour1','1');
    if(!localStorage.getItem('bbWizard1')) localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); if(o.en) localStorage.setItem('bbLang1','en'); if(o.init) for(const k in o.init) localStorage.setItem(k,o.init[k]); }catch(e){} },{en,init});
  if(app) await page.addInitScript(MOCK(app));
  page.on('pageerror',e=>allErrs.push('PAGEERR '+String(e))); page.on('console',m=>{ if(m.type()==='error') allErrs.push(errText(m)); });
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.goto(URL0+q);
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ if(document.body.classList.contains('setup')) window.__sim.setupClose(); });
  return {ctx,page,E:(f,a)=>page.evaluate(f,a)};
}
const legalState=E=>E(()=>{ const m=document.getElementById('legalBox'), r=m.getBoundingClientRect();
  const sel=[...document.querySelectorAll('#lgTabs [role=tab]')].filter(b=>b.getAttribute('aria-selected')==='true').map(b=>b.dataset.lgtab);
  const c=document.elementFromPoint(innerWidth/2,innerHeight/2);
  return {open:!m.hidden&&r.width>0, role:m.getAttribute('role'), modal:m.getAttribute('aria-modal'), name:document.getElementById(m.getAttribute('aria-labelledby')).textContent,
    tabs:document.querySelectorAll('#lgTabs [role=tab]').length, sel, onTop:!!(c&&m.contains(c)), txt:m.innerText, body:document.getElementById('lgBody').innerText, top:__sim.v71.ovlTop()}; });
async function escClose(page,E){ await page.keyboard.press('Escape'); await page.waitForTimeout(120); return E(()=>document.getElementById('legalBox').hidden); }

/* ── 2. Markdown בטוח + אותו פלט כמו בדפי האתר ── */
for(const en of [false,true]){
  const {ctx,page,E}=await openPage({en});
  const L=en?'en':'he';
  if(!en){
    const r=await E(()=>{ const md='# T <script>alert(1)</script>\n\nText [x](javascript:alert(1)) and [y](https://ok.example/a"onmouseover="z) **b** <img src=x onerror=alert(1)>\n\n- [d](data:text/html,hi) item\n- [ok](https://example.com/p?a=1&b=2)';
      const h=__sim.v73legal.md(md); const d=document.createElement('div'); d.innerHTML=h;
      return {h, scripts:d.querySelectorAll('script,img,iframe,object').length, hrefs:[...d.querySelectorAll('a')].map(a=>a.getAttribute('href')), on:[...d.querySelectorAll('*')].some(x=>[...x.attributes].some(a=>/^on/i.test(a.name))),
        rel:[...d.querySelectorAll('a')].every(a=>a.target==='_blank'&&/noopener/.test(a.rel)), strong:d.querySelectorAll('strong').length, li:d.querySelectorAll('li').length, h1:d.querySelector('h1').textContent}; });
    ok(r.scripts===0&&!r.on&&/&lt;script&gt;/.test(r.h),'Markdown: HTML עובר escape (אין script/img/on…) — '+r.h.slice(0,60));
    ok(r.hrefs.length===1&&r.hrefs[0]==='https://example.com/p?a=1&b=2','Markdown: רק קישורי https (javascript:/data: וכתובת עם מירכאות נשארים טקסט) — '+JSON.stringify(r.hrefs));
    ok(r.rel&&r.strong===1&&r.li===2&&r.h1==='T <script>alert(1)</script>','Markdown: קישורים נפתחים ב-_blank עם noopener; מודגש, רשימה וכותרת');
  }
  const same=await E(([L,site])=>{ const out={}; for(const d of Object.keys(site)){ out[d]=__sim.v73legal.md(__sim.v73legal.L().docs[L][d])===site[d]; } return out; },
    [L,Object.fromEntries(['privacy','terms','ai','security','accessibility','licenses'].map(d=>{ const s=fs.readFileSync(path.join(ROOT,'site',d+'.html'),'utf8');
      const m=s.match(new RegExp('<article lang="'+L+'"[^>]*><p class="ver">[^<]*</p>\\n([\\s\\S]*?)\\n</article>')); return [d,m?m[1]:'?']; }))]);
  ok(Object.values(same).every(Boolean),'['+L+'] המציג באפליקציה ודפי האתר מציגים בדיוק אותו HTML (JS ו-Python) — '+JSON.stringify(same));

  /* ── 3. נקודות כניסה בדפדפן: הגדרות, אודות, חיפוש, הודעת הבאג ── */
  const entries={
    settings:async()=>{ await E(()=>__sim.v71.settingsOpen()); await page.waitForTimeout(150); await page.click('#setBody .setGrp [data-legal="privacy"]'); },
    about:async()=>{ await E(()=>__sim.v71.settingsOpen('setAbout')); await page.waitForTimeout(150); await page.click('#aboutBox [data-legal="accessibility"]'); },
    cmdk:async()=>{ await E(()=>__sim.cmdkOpen()); await page.fill('#cmdkIn',en?'privacy':'פרטיות'); await page.waitForTimeout(100);
      const i=await E(()=>__sim.CMDK.res.findIndex(c=>c.id==='legal')); await page.click('#cmdkO'+i); },
    bug:async()=>{ await E(()=>__sim.bugOpen()); await page.waitForTimeout(250); await page.click('#bugNote [data-legal]'); }
  };
  for(const [k,go] of Object.entries(entries)){
    await go(); await page.waitForTimeout(150);
    const s=await legalState(E);
    ok(s.open&&s.role==='dialog'&&s.modal==='true'&&s.name&&s.tabs===6&&s.sel.length===1&&s.onTop&&s.top==='legalBox','['+L+'] נפתח מ-'+k+': dialog עם aria-modal ושם, 6 לשוניות, מעל הכול ('+s.sel+')');
    if(en) ok(!HE.test(s.txt),'[en] '+k+': אין עברית בחלון — '+(s.txt.match(/.{0,20}[֐-׿].{0,20}/)||[''])[0]);
    else ok(HE.test(s.body),'[he] '+k+': המסמך בעברית');
    ok(await escClose(page,E),'['+L+'] '+k+': Esc סוגר את חלון המסמכים');
    await E(()=>{ for(const id of ['bugModal','playModal','cmdk']){ const m=document.getElementById(id); if(m&&!m.hidden) try{ id==='playModal'?__sim.v71.PH&&0:0; }catch(e){} }
      if(!document.getElementById('bugModal').hidden) document.getElementById('bugClose').click(); if(!document.getElementById('cmdk').hidden) __sim.cmdkClose(); });
    await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  }
  /* לשוניות: חיצים, ואנגלית מלאה בכל לשונית */
  {
    await E(()=>__sim.v73legal.open('privacy')); await page.focus('#lgTab-privacy'); await page.keyboard.press(en?'ArrowRight':'ArrowLeft'); await page.waitForTimeout(80);
    const s=await legalState(E); ok(s.sel[0]==='terms','['+L+'] חץ קדימה עובר ללשונית הבאה ('+s.sel+')');
    const allTabs=await E(async()=>{ const o={}; for(const t of __sim.v73legal.L().TABS){ document.getElementById('lgTab-'+t).click(); await new Promise(r=>setTimeout(r,30)); o[t]=document.getElementById('legalBox').innerText; } return o; });
    if(en) ok(Object.values(allTabs).every(t=>!HE.test(t)),'[en] כל 6 הלשוניות בלי עברית');
    ok(/2\d{3}-\d\d-\d\d/.test(allTabs.licenses)&&/not affiliated with, endorsed by or sponsored by FIRST/.test(allTabs.licenses)&&/v70/.test(allTabs.licenses),'['+L+'] בתחתית: גרסת המסמכים, גרסת האפליקציה והצהרת FIRST');
    await E(()=>__sim.v73legal.close());
  }
  /* אודות */
  { const a=await E(()=>{ __sim.v73legal.aboutUI(); return document.getElementById('aboutBox').innerText; });
    ok(/v70/.test(a)&&/2\d{3}-\d\d-\d\d/.test(a)&&/not affiliated/.test(a)&&!/@/.test(a)&&(!en||!HE.test(a)),'['+L+'] אודות: גרסה, גרסת מסמכים, הצהרה, בלי מייל (CONTACT_EMAIL ריק)'+(en?' ובלי עברית':'')); }
  /* בינה מלאכותית בדפדפן — מסומן כ-18+ */
  { const t=await E(()=>document.getElementById('aiSet').innerText); ok(/18/.test(t)&&(!en||!HE.test(t)),'['+L+'] הגדרות הבינה המלאכותית בדפדפן: ״18 ומעלה בלבד״'); }
  /* דיווח באג: מה נשלח, 12 חודשים, וצילום מסך רק אם מסמנים */
  { const r=await E(async()=>{ await __sim.bugOpen(); await new Promise(r=>setTimeout(r,200)); document.getElementById('bugWhat').value='abc def';
      const p=__sim.bugPayload(); const n=document.getElementById('bugNote').innerText; const sh=document.getElementById('bugShot').checked;
      document.getElementById('bugShot').checked=true; const p2=__sim.bugPayload(); document.getElementById('bugClose').click(); return {shot:p.shot, sh, shot2:!!p2.shot, n}; });
    ok(!r.sh&&r.shot===null&&r.shot2,'דיווח באג: צילום מסך כבוי כברירת מחדל ולא נשלח; מסמנים — נשלח');
    ok(/12/.test(r.n)&&(en?/screenshot/i.test(r.n)&&!HE.test(r.n):/צילום מסך/.test(r.n)),'['+L+'] דיווח באג: הודעה על מה נשלח ו-12 חודשים — '+r.n.slice(0,70)); }
  await ctx.close();
}

/* ── 4. הודעה בפעם הראשונה ── */
{
  let {ctx,page,E}=await openPage({q:'&legal=1'});
  await page.waitForTimeout(1700);
  let r=await E(()=>{ const n=document.getElementById('legalNote'), b=n.getBoundingClientRect(), a=document.activeElement, c=document.elementFromPoint(innerWidth/2,innerHeight/2);
    return {vis:!n.hidden&&b.width>0, focus:!!(a&&n.contains(a)), center:!!(c&&n.contains(c)), dlg:n.getAttribute('role'), inOvl:__sim.v71.ovlTop(), txt:n.innerText, area:b.width*b.height}; });
  ok(r.vis&&!r.focus&&!r.center&&r.dlg!=='dialog'&&!r.inOvl&&r.area<innerAreaMax(),'הודעה בפעם הראשונה: מופיעה, לא לוקחת מיקוד, לא חוסמת את הזירה ולא חלון (role='+r.dlg+')');
  ok(/תנאי השימוש/.test(r.txt)&&/מדיניות הפרטיות/.test(r.txt),'ההודעה: הסכמה לתנאים + קישור לפרטיות');
  /* אפשר לשחק: מקש נסיעה מגיע לרובוט כשההודעה פתוחה */
  await page.mouse.click(700,300); await page.keyboard.down('KeyW'); await page.waitForTimeout(60);
  const drive=await E(()=>{ const k=__sim.keys||null; return k?!!(k.KeyW||k.w||k.W||Object.values(k).some(Boolean)):null; }); await page.keyboard.up('KeyW');
  ok(drive!==false,'ההודעה לא בולעת את המקלדת (W מגיע לנהיגה)'+(drive===null?' — לא נמדד':''));
  await page.click('#legalNote [data-legal="terms"]'); await page.waitForTimeout(100);
  r=await legalState(E); ok(r.open&&r.sel[0]==='terms','קישור ״תנאי השימוש״ בהודעה פותח את המסמך'); await escClose(page,E);
  await page.click('#lnOk'); await page.waitForTimeout(80);
  r=await E(()=>({hid:document.getElementById('legalNote').hidden, rec:JSON.parse(localStorage.getItem('bbLegal1')||'null'), v:__sim.v73legal.ver()}));
  ok(r.hid&&r.rec&&r.rec.v===r.v&&r.rec.at>Date.now()-60000,'״מסכים/ה״ — נסגר ונשמר bbLegal1 {v, at}');
  await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length); await page.waitForTimeout(1700);
  ok(await E(()=>document.getElementById('legalNote').hidden),'אחרי אישור — לא חוזרת');
  await E(()=>localStorage.setItem('bbLegal1',JSON.stringify({v:'2000-01-01',at:1}))); await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length); await page.waitForTimeout(1700);
  r=await E(()=>({vis:!document.getElementById('legalNote').hidden, t:document.getElementById('lnTxt').textContent}));
  ok(r.vis&&/עדכנו/.test(r.t),'גרסת המסמכים השתנתה — ההודעה חוזרת (״עדכנו…״)');
  await ctx.close();
  ({ctx,page,E}=await openPage({})); await page.waitForTimeout(1700);
  ok(await E(()=>document.getElementById('legalNote').hidden&&!__sim.v73legal.accepted()),'בבדיקות אוטומטיות (בלי ?legal=1) — לא מופיעה, כמו האשף');
  await ctx.close();
  ({ctx,page,E}=await openPage({en:true,q:'&legal=1'})); await page.waitForTimeout(1700);
  r=await E(()=>document.getElementById('legalNote').innerText); ok(/Terms/.test(r)&&!HE.test(r),'[en] ההודעה באנגלית — '+r.slice(0,60));
  await ctx.close();
  /* באפליקציה: הסכמה ששמורה במחשב (bbApp.legal) מספיקה גם לנהג אחר */
  ({ctx,page,E}=await openPage({app:{legal:{v:fs.readFileSync(path.join(ROOT,'legal/VERSION'),'utf8').trim(),at:1}},q:'&legal=1'})); await page.waitForTimeout(1700);
  ok(await E(()=>document.getElementById('legalNote').hidden&&__sim.v73legal.accepted()),'באפליקציה: ההסכמה השמורה במחשב (legal.json) — בלי הודעה גם לנהג חדש');
  await E(()=>__sim.v73legal.accept()); ok(await E(()=>window.__calls.some(c=>c[0]==='legalAck')),'אישור באפליקציה נשמר גם בתהליך הראשי (legalAck)');
  await ctx.close();
}
function innerAreaMax(){ return 1400*860*0.15; }

/* ── 5. הרשמה: טווח גיל + הסכמה (באפליקציה, עם bbApp מדומה) ── */
for(const en of [false,true]){
  const L=en?'en':'he';
  const {ctx,page,E}=await openPage({en,app:{acct:{loggedIn:false}}});
  await page.click('#appNav [data-nav="settings"]'); await page.waitForTimeout(300);
  ok(await E(()=>!!document.querySelector('#spAcct [data-legal]')),'['+L+'] לוח החשבון (לא מחובר): קישור למסמכים');
  await page.click('#spAcct [data-legal]'); await page.waitForTimeout(100);
  let s=await legalState(E); ok(s.open&&s.onTop,'['+L+'] נפתח מלוח החשבון'); await escClose(page,E);
  await page.click('#appPage [data-acc="open"]'); await page.waitForTimeout(150);
  await page.fill('#acEmail','kid@example.com'); await page.fill('#acPass','secret123');
  await page.click('#acUp'); await page.waitForTimeout(80);
  let r=await E(()=>({box:!document.getElementById('acSignup').hidden, calls:window.__calls.filter(c=>c[0]==='signUp').length, msg:document.getElementById('acMsg').textContent}));
  ok(r.box&&r.calls===0,'['+L+'] ״צור חשבון חדש״ קודם פותח טווח גיל והסכמה — עוד לא נרשם');
  await page.selectOption('#acAge','u13'); await page.waitForTimeout(50);
  r=await E(()=>({u13:!document.getElementById('acU13').hidden, dis:document.getElementById('acUp').disabled, g:!document.getElementById('acGuardRow').hidden, t:document.getElementById('acU13').innerText}));
  ok(r.u13&&r.dis&&!r.g&&(en?/13/.test(r.t)&&!HE.test(r.t):/13/.test(r.t)),'['+L+'] מתחת ל-13: הסבר (בלי חשבון, הכול מקומי) והכפתור כבוי');
  await page.selectOption('#acAge','13-17'); await page.check('#acTos'); await page.click('#acUp'); await page.waitForTimeout(80);
  r=await E(()=>({g:!document.getElementById('acGuardRow').hidden, calls:window.__calls.filter(c=>c[0]==='signUp').length, err:document.getElementById('acMsg').className}));
  ok(r.g&&r.calls===0&&/err/.test(r.err),'['+L+'] 13–17 בלי הסכמת הורה — לא נרשם');
  await page.check('#acGuard'); await page.uncheck('#acTos'); await page.click('#acUp'); await page.waitForTimeout(80);
  ok(await E(()=>window.__calls.filter(c=>c[0]==='signUp').length===0),'['+L+'] בלי הסכמה לתנאים — לא נרשם');
  if(en){ const t=await E(()=>document.getElementById('acctModal').innerText); ok(!HE.test(t),'[en] חלון החשבון עם טווח הגיל — בלי עברית: '+(t.match(/.{0,20}[֐-׿].{0,20}/)||[''])[0]); }
  await page.click('#acSignup [data-legal="terms"]'); await page.waitForTimeout(80);
  s=await legalState(E); ok(s.open&&s.onTop&&s.sel[0]==='terms','['+L+'] קישור לתנאים מתוך ההרשמה נפתח מעל חלון החשבון'); await escClose(page,E);
  ok(await E(()=>!document.getElementById('acctModal').hidden),'['+L+'] Esc סגר רק את המסמך — חלון החשבון נשאר');
  await page.check('#acTos'); await page.click('#acUp'); await page.waitForTimeout(150);
  r=await E(()=>window.__calls.filter(c=>c[0]==='signUp').map(c=>c[1]));
  const m=r[0]&&r[0].m||{};
  ok(r.length===1&&m.age_bracket==='13-17'&&m.guardian_ok===true&&/^\d{4}-\d\d-\d\d$/.test(m.tos_v)&&!Object.keys(m).some(k=>/birth|dob|date/i.test(k)),'['+L+'] נרשם עם tos_v, age_bracket, guardian_ok — בלי תאריך לידה: '+JSON.stringify(m));
  await ctx.close();
}

/* ── 6. זכויות על הנתונים בחשבון + אישור תנאים מעודכנים ── */
for(const [en,delMissing] of [[false,true],[true,false]]){
  const L=en?'en':'he';
  const {ctx,page,E}=await openPage({en,app:{acct:{loggedIn:true,email:'maya@example.com',name:'Maya',tos:'',lastSync:Date.now()},delMissing}});
  await page.click('#appNav [data-nav="settings"]'); await page.waitForTimeout(300);
  let r=await E(()=>({ask:!!document.querySelector('#spAcct .tosAsk'), exp:!!document.querySelector('#spAcct [data-acc="export"]'), del:!!document.querySelector('#spAcct [data-acc="delete"]'), t:document.getElementById('spAcct').innerText}));
  ok(r.ask&&r.exp&&r.del,'['+L+'] מחובר בלי tos_v: בקשה לאשר תנאים מעודכנים, ⬇ הורדה ו-🗑 מחיקה');
  if(en) ok(!HE.test(r.t),'[en] לוח החשבון בלי עברית: '+(r.t.match(/.{0,20}[֐-׿].{0,20}/)||[''])[0]);
  await page.click('#spAcct [data-acc="tos"]'); await page.waitForTimeout(150);
  r=await E(()=>({calls:window.__calls.filter(c=>c[0]==='tos').map(c=>c[1]), ask:!!document.querySelector('#spAcct .tosAsk'), v:__sim.v73legal.ver()}));
  ok(r.calls.length===1&&r.calls[0]===r.v&&!r.ask,'['+L+'] אישור התנאים — נשלח עם הגרסה, והבקשה נעלמת');
  await page.click('#spAcct [data-acc="export"]'); await page.waitForTimeout(120);
  r=await E(()=>({n:window.__calls.filter(c=>c[0]==='export').length, m:document.getElementById('acDMsg').innerText}));
  ok(r.n===1&&/✓/.test(r.m),'['+L+'] ⬇ הורדת הנתונים — נקרא acctExport ומוצג אישור');
  await page.click('#spAcct [data-acc="delete"]'); await page.waitForTimeout(80);
  r=await E(()=>({conf:!!document.querySelector('#spAcct [data-acc="delYes"]'), n:window.__calls.filter(c=>c[0]==='delete').length}));
  ok(r.conf&&r.n===0,'['+L+'] 🗑 — קודם אישור ראשון (מה נמחק), לא מוחק עדיין');
  await page.click('#spAcct [data-acc="delYes"]'); await page.waitForTimeout(80);
  ok(await E(()=>window.__calls.filter(c=>c[0]==='delete').length===0),'['+L+'] ״כן, למחוק״ — עוד אישור (״בטוח? לחצו שוב״)');
  await page.click('#spAcct [data-acc="delYes"]'); await page.waitForTimeout(200);
  r=await E(()=>({n:window.__calls.filter(c=>c[0]==='delete').length, m:(document.getElementById('acDMsg')||{}).innerText||'', gh:!!document.querySelector('#acDMsg a[href*="github.com"]'), wipe:!!document.querySelector('#spAcct [data-acc="wipeYes"]')}));
  if(delMissing) ok(r.n===1&&r.gh&&!r.wipe&&(en?!HE.test(r.m):/גיטהאב/.test(r.m)),'['+L+'] הפונקציה עוד לא בשרת — הודעה ברורה עם קישור לגיטהאב: '+r.m);
  else {
    ok(r.n===1&&r.wipe&&/✓/.test(r.m),'['+L+'] נמחק — התנתק, ושואל אם למחוק גם מהמחשב הזה');
    await page.click('#spAcct [data-acc="wipeYes"]'); await page.waitForTimeout(120);
    ok(await E(()=>window.__calls.some(c=>c[0]==='wipe')),'['+L+'] ״כן, למחוק גם כאן״ — wipeLocal');
    if(en){ const t=await E(()=>document.getElementById('spAcct').innerText); ok(!HE.test(t),'[en] אחרי המחיקה — בלי עברית'); }
  }
  /* האודות בדף ההגדרות של האפליקציה (סרגל הניווט) */
  ok(await E(()=>!!document.querySelector('#appPage .apCard [data-legal]')),'['+L+'] דף ההגדרות באפליקציה: כרטיס אודות עם ⚖');
  await page.click('#appPage .apCard [data-legal]'); await page.waitForTimeout(100);
  const s=await legalState(E); ok(s.open&&s.onTop&&(!en||!HE.test(s.txt)),'['+L+'] נפתח מהאודות בדף ההגדרות (סרגל הניווט)'); await escClose(page,E);
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  await ctx.close();
}

/* ── 7. בינה מלאכותית: 18+ ואישור התנאים של גוגל ── */
for(const en of [false,true]){
  const L=en?'en':'he';
  const {ctx,page,E}=await openPage({en,app:{acct:{loggedIn:false},ai:{has:true,ok:false,ack18:false}}});
  await page.click('#appNav [data-nav="settings"]'); await page.waitForTimeout(400);
  let r=await E(()=>({t:document.getElementById('aiSet').innerText, cb:!!document.getElementById('aiAck18'), chk:(document.getElementById('aiAck18')||{}).checked, aion:document.documentElement.classList.contains('aion'), on:__sim.aiOn()}));
  ok(r.cb&&!r.chk&&!r.aion&&!r.on&&/18/.test(r.t)&&/Gemini/.test(r.t),'['+L+'] מפתח שמור בלי אישור: כבוי, ותיבת ״18 ומעלה + התנאים של Gemini״ לא מסומנת');
  if(en) ok(!HE.test(r.t),'[en] הגדרות הבינה המלאכותית בלי עברית: '+(r.t.match(/.{0,20}[֐-׿].{0,20}/)||[''])[0]);
  await page.fill('#aiKeyIn','AIza'+'x'.repeat(35)); await page.click('[data-ai="save"]'); await page.waitForTimeout(100);
  r=await E(()=>({n:window.__calls.filter(c=>c[0]==='setKey').length, m:document.getElementById('aiMsg').innerText}));
  ok(r.n===0&&/18/.test(r.m),'['+L+'] ״שמור ובדוק״ בלי אישור — לא נשלח, הודעה ברורה: '+r.m);
  await page.click('#aiSet [data-legal="ai"]'); await page.waitForTimeout(80);
  let s=await legalState(E); ok(s.open&&s.sel[0]==='ai','['+L+'] ״פרטים״ פותח את מסמך הבינה המלאכותית'); await escClose(page,E);
  await page.check('#aiAck18'); await page.waitForTimeout(200);
  r=await E(()=>({ack:window.__calls.filter(c=>c[0]==='ack18').map(c=>c[1]), on:__sim.aiOn(), aion:document.documentElement.classList.contains('aion')}));
  ok(r.ack.length===1&&r.ack[0]===true&&r.on&&r.aion,'['+L+'] מסמנים — נשמר בתהליך הראשי (aiAck18) והבינה המלאכותית נדלקת');
  await ctx.close();
}

await browser.close();
const re=realErrs(allErrs); ok(re.length===0,'בלי שגיאות בדף'+(re.length?': '+re.slice(0,3).join(' | '):''));
done('v73_legal');
