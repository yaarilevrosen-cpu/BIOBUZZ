// v63 — ממשק: מקלדת אחרי לחיצה על פקד, כפתורי העתקה, Enter בחיפוש ריק, Esc אחד לחלון העליון,
// מיקוד בחלונות, טלפון 390, ציר השידור החוזר באנגלית, ובלי עברית שנשארה במצב אנגלית (גם במסכי האפליקציה)
import {chromium} from 'playwright';
import {URL0,ok,done,realErrs,errText} from './h.mjs';

const MOCK=`(function(){
 const prof={id:'p1',name:'Maya',emoji:'🚀',color:'#f5b921',active:true,local:true};
 const status={has:true,ok:true,tail:'abcd',checkedAt:Date.now()-120000,saved:true,models:[{id:'m1',name:'Gemini Flash',ok:true,ms:400},{id:'m2',name:'Gemini Pro',ok:true,ms:1200},{id:'m3',name:'Lite',ok:false,why:'quota'}],pick:{fast:'m1',strong:'m2'}};
 const matches=[]; for(let i=0;i<12;i++) matches.push({at:Date.now()-i*3600e3,ally:'red',my:40+i,opp:30,win:1,shots:10,hits:6,fouls:0,leave:true,park:true,autoPts:10,avgCycle:9,kind:'match',skill:1,sh:[],bl:[],pts:{tip:0,cell:30,flower:5,garden:0,leave:3,park:5}});
 window.bbApp={
  version:'9.9.9', dataDir:'/tmp/x', firstRun:false, test:true, profile:prof, profilesAtBoot:[prof], backupsAtBoot:[],
  kvSet(){}, kvRemove(){}, kvClear(){}, flush(){}, ready(){},
  profiles:async()=>[prof], profileAdd:async()=>({ok:true}), profileUpdate:async()=>({ok:true}), profileRemove:async()=>({ok:true}), profileSwitch:async()=>({ok:true}), firstRunDone:async()=>({}),
  matchAdd:async()=>({ok:true}), matches:async()=>matches, team:async()=>[{name:'Maya',sum:{n:12,W:8,L:4,avg:45,best:60,acc:0.6,cyc:9,fouls:0.1,park:0.8,auto:10,l10:46,p10:40}},{name:'Noa',sum:{n:5,W:2,L:3,avg:35,best:50,acc:0.5}}],
  openData:async()=>({}), backupNow:async()=>({ok:true}), teamExport:async()=>({canceled:true}), teamImport:async()=>({canceled:true}), importBackup:async()=>({ok:false}),
  bridgeStatus:async()=>({on:false}), saveVideo:async()=>({}), showFile:async()=>({}), openVideos:async()=>({}), adbPull:async()=>({ok:false,why:'x'}),
  acctStatus:async()=>({loggedIn:true,email:'maya@example.com',name:'Maya',team:{name:'Robo',num:'123',code:'ABCD12',members:3},synced:Date.now()-300000}),
  acctSignIn:async()=>({ok:false}), acctSignUp:async()=>({ok:false}), acctRecover:async()=>({ok:false}), acctSignOut:async()=>({ok:true}), teamCall:async()=>({ok:false,why:'x'}), syncNow:async()=>({ok:true}), acctName:async()=>({ok:true,name:'Maya'}),
  aiStatus:async()=>status, aiSetKey:async()=>({ok:true,status}), aiClear:async()=>({has:false}), aiCheck:async()=>({ok:true,status}), aiDrills:async()=>null,
  aiAsk:async(kind,o)=>{ window.__aiAsk=(window.__aiAsk||[]).concat([{kind,o}]); return {ok:true,text:window.__aiText||'Hello'}; },
  onSync(){}, updCheck:async()=>({}), updInstall:async()=>({}), updState:async()=>({state:'idle'}), onUpd(){}, openUrl:async()=>({})
 };
})();`;

const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const allErrs=[];
async function openPage({en=true,mode='lab',app=false,viewport={width:1400,height:860},mobile=false}={}){
  const ctx=await browser.newContext({viewport,...(mobile?{isMobile:true,hasTouch:true,deviceScaleFactor:2}:{})});
  const page=await ctx.newPage();
  await page.addInitScript(()=>{ window.__raf0=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=()=>0; });
  await page.addInitScript(o=>{ try{ localStorage.setItem('bbUiMode1',o.mode); localStorage.setItem('bbTour1','1'); if(o.en) localStorage.setItem('bbLang1','en'); }catch(e){} },{en,mode});
  if(app) await page.addInitScript(MOCK);
  page.on('pageerror',e=>allErrs.push('PAGEERR '+String(e))); page.on('console',m=>{ if(m.type()==='error') allErrs.push(errText(m)); });
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.goto(URL0);
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  await page.waitForTimeout(400);
  await page.evaluate(()=>{ if(document.body.classList.contains('setup')) window.__sim.setupClose(); });
  return {ctx,page,E:(f,a)=>page.evaluate(f,a)};
}
/* עברית שנראית על המסך, בלי נתוני משתמש ושמות, ובלי כפתור השפה (״English / עברית״ בכוונה) */
const HEB=()=>{ const HE=/[֐-׿]/, out=[];
  const vis=e=>{ if(!e||!e.getBoundingClientRect) return false; const r=e.getBoundingClientRect(); if(!(r.width>0&&r.height>0)) return false; const s=getComputedStyle(e); return s.visibility!=='hidden'&&s.opacity!=='0'&&!e.closest('[hidden]'); };
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT); let n;
  while((n=w.nextNode())){
    if(n.nodeType===3){ const p=n.parentNode; if(!p||/SCRIPT|STYLE|TEXTAREA|OPTION/.test(p.nodeName)) continue; if(p.closest('#bldBox,#welcome')) continue; if(HE.test(n.data)&&vis(p)) out.push(n.data.trim().slice(0,80)); }
    else for(const a of ['title','placeholder','aria-label']){ const v=n.getAttribute(a); if(v&&HE.test(v)&&!/English \/ עברית/.test(v)&&!n.closest('#bldBox,#welcome')&&vis(n)) out.push('@'+a+':'+v.slice(0,80)); } }
  return out; };

// ── 1. מקלדת אחרי לחיצה על תיבת סימון / מחוון (41) ──
let {ctx,page,E}=await openPage();
await E(()=>{ document.querySelector('.wsb[data-go="drive"]').click(); document.querySelectorAll('#rail details').forEach(d=>d.open=true); });
await page.click('#kIntake',{force:true}); await page.waitForTimeout(80);
let r=await E(()=>({f:document.activeElement&&document.activeElement.id, c:document.getElementById('kIntake').checked}));
const c0=r.c;
await page.keyboard.down('KeyW'); await page.waitForTimeout(40);
ok(await E(()=>!!window.__sim.keys.KeyW),'אחרי לחיצה על תיבת סימון (מיקוד '+r.f+'): W עדיין נוהג');
await page.keyboard.up('KeyW');
await page.keyboard.press('Space'); await page.waitForTimeout(80);
ok(await E(()=>document.getElementById('kIntake').checked)===c0,'רווח לא מחליף את תיבת הסימון שבמיקוד');
// מחוון: חיצים לא מזיזים אותו כשהם מקשי נהיגה
const rid=await E(()=>{ for(const b of document.querySelectorAll('.wsb')){ b.click(); document.querySelectorAll('#rail details').forEach(d=>d.open=true);
  const s=[...document.querySelectorAll('#rail input[type=range]')].find(x=>x.getClientRects().length&&!x.disabled); if(s) return s.id; } return null; });
if(rid){ await page.click('#'+rid,{force:true}); const v0=await E(id=>document.getElementById(id).value,rid);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(40); const drv=await E(()=>!!window.__sim.keys.KeyD); await page.keyboard.up('KeyD');
  ok(drv,'אחרי לחיצה על מחוון (#'+rid+'): D עדיין נוהג');
  /* חיצים הם מקשי משחק של שחקן 2 במסך מפוצל — שם הם לא מזיזים את המחוון */
  const sp=await E(()=>{ const S=window.__sim.SPLIT; if(!S) return false; S.__was=S.on; S.on=true; return true; });
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(40);
  await E(()=>{ const S=window.__sim.SPLIT; if(S) S.on=S.__was; });
  ok(sp&&await E(id=>document.getElementById(id).value,rid)===v0,'מחוון במיקוד: כשהחיצים הם מקשי משחק הם לא מזיזים אותו'); }
else ok(false,'לא נמצא מחוון גלוי');
// שדה טקסט: הקלדה עדיין עובדת ולא נוהגת
await E(()=>{ const i=document.createElement('input'); i.id='__t'; i.style.cssText='position:fixed;top:0;left:0;z-index:99999'; document.body.appendChild(i); });
await page.focus('#__t'); await page.keyboard.type('wasd ');
r=await E(()=>({v:document.getElementById('__t').value, W:!!window.__sim.keys.KeyW})); ok(r.v==='wasd '&&!r.W,'בשדה טקסט מקלידים ולא נוהגים ('+JSON.stringify(r)+')');
await E(()=>{ document.getElementById('__t').remove(); document.activeElement&&document.activeElement.blur(); });

// ── 2. כפתורי העתקה (42) ──
for(const mode of ['reject','resolve']){
  const n0=allErrs.length;
  r=await E(async mode=>{ try{ Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>mode==='reject'?Promise.reject(new Error('denied')):Promise.resolve()}}); }catch(e){}
    const o={}; for(const id of ['bCopyP','bTeachCopy','bPathCopy','bRecCopy']){ const b=document.getElementById(id); b.click(); await new Promise(r=>setTimeout(r,60)); o[id]=b.textContent; }
    o.toast=document.getElementById('refToast').textContent; return o; },mode);
  ok(allErrs.length===n0,'העתקה ('+mode+'): בלי שגיאות '+(allErrs.slice(n0).join(' | ')));
  if(mode==='resolve') ok(['bCopyP','bTeachCopy','bPathCopy','bRecCopy'].every(k=>/Copied/.test(r[k])),'הצלחה: ״Copied״ על כל כפתור ('+JSON.stringify(r)+')');
  else ok(/Copy failed/.test(r.toast)&&/Not copied/.test(r.bCopyP),'כישלון: הודעה ברורה ולא ״Copied״ ('+r.toast+' / '+r.bCopyP+')');
  await page.waitForTimeout(1500);
}

// ── 3. Enter בחיפוש בלי תוצאות (43) ──
await page.keyboard.press('Control+k'); await page.waitForTimeout(100);
await E(()=>{ const i=document.getElementById('cmdkIn'); i.value='zzqqxxv'; i.dispatchEvent(new Event('input')); });
await page.keyboard.press('Enter'); await page.waitForTimeout(150);
r=await E(()=>({pm:!document.getElementById('playModal').hidden, cmdk:!document.getElementById('cmdk').hidden}));
ok(!r.pm&&r.cmdk,'Enter בלי תוצאות בדפדפן: לא נפתחות הגדרות ('+JSON.stringify(r)+')');
// חיפוש באנגלית
const q=s=>E(s=>__sim.cmdkSearch(s).map(c=>c.id),s);
for(const [s,re] of [['volume',/settings|sound/],['fullscreen',/fullscreen/],['shortcuts',/pad|keyboard/],['odometry',/log|odometry/],['magnus',/calibration/],['robot size',/dimensions|size/]]){
  const L=await q(s); ok(L.length&&re.test(L.slice(0,3).join(' ')),'חיפוש באנגלית ״'+s+'״ ← '+L.slice(0,3).join(', ')); }
await page.keyboard.press('Escape');

// ── 4. Esc סוגר את החלון העליון (44) ──
const OV=[
  ['hudMenu',()=>document.getElementById('tbHud').click()],
  ['magicMenu',()=>document.getElementById('tbMagic').click()],
  ['qrBox',()=>document.getElementById('bQr').click()],
  ['cmdk',()=>__sim.cmdkOpen()],
  ['bugModal',()=>__sim.bugOpen()],
  ['skinBox',()=>__sim.skinOpen()],
  ['bldBox',()=>__sim.bldOpen()],
  ['playModal',()=>document.getElementById('bSet').click()],
  ['padStudio',()=>document.getElementById('ppPadStudio').click()],
  ['setup',()=>__sim.setupOpen()],
  ['coachBox',()=>{ document.getElementById('coachBox').hidden=false; }],
  ['aiChat',()=>{ document.getElementById('aiChat').hidden=false; __sim.AICHAT.open=true; }],
  ['profMenu',()=>{ document.getElementById('profMenu').hidden=false; }],
  ['acctModal',()=>{ document.getElementById('acctModal').hidden=false; }],
];
const isOpen=id=>E(id=>id==='setup'?document.body.classList.contains('setup'):!document.getElementById(id).hidden,id);
for(const [id,fn] of OV){
  await E(fn); await page.waitForTimeout(120);
  const o=await isOpen(id);
  await page.mouse.move(5,300); await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  const after=await isOpen(id);
  /* גם מצב הקוד נסגר (לא רק ההסתרה): הסטודיו, החיפוש והעוזר */
  const st=await E(()=>!!(__sim.PSTUDIO.open||__sim.CMDK.open||__sim.AICHAT.open));
  ok(o&&!after&&!st,'Esc סוגר את '+id+' (נפתח '+o+', פתוח אחרי '+after+(st?', המצב נשאר פתוח':'')+')');
  await E(()=>{ for(const id of ['hudMenu','magicMenu','qrBox','cmdk','bugModal','skinBox','bldBox','padStudio','coachBox','aiChat','profMenu','acctModal']){ const m=document.getElementById(id); if(m) m.hidden=true; } if(!document.getElementById('playModal').hidden) document.getElementById('pmX').click(); if(document.body.classList.contains('setup')) __sim.setupClose(); });
}
// חלון על חלון: Esc סוגר רק את העליון
await E(()=>document.getElementById('bSet').click()); await E(()=>__sim.cmdkOpen()); await page.waitForTimeout(100);
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
r={cmdk:await isOpen('cmdk'), pm:await isOpen('playModal')};
ok(!r.cmdk&&r.pm,'Esc אחד: החיפוש (עליון) נסגר, ההגדרות שמתחתיו נשארות ('+JSON.stringify(r)+')');
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
ok(!(await isOpen('playModal')),'Esc שני סוגר את ההגדרות');

// ── 5. מיקוד בחלונות: פתיחה, Tab נשאר בפנים, חזרה בסגירה ──
for(const [id,opener] of [['playModal','#bSet'],['bugModal','#bBug']]){
  await page.focus(opener); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  r=await E(id=>{ const a=document.activeElement; return {open:!document.getElementById(id).hidden, inside:!!(a&&document.getElementById(id).contains(a))}; },id);
  ok(r.open&&r.inside,id+': בפתיחה המיקוד בתוך החלון ('+JSON.stringify(r)+')');
  const out=[]; for(let i=0;i<45;i++){ await page.keyboard.press(i%9===8?'Shift+Tab':'Tab'); out.push(await E(id=>{ const a=document.activeElement; return !!(a&&document.getElementById(id).contains(a)); },id)); }
  ok(out.every(Boolean),id+': Tab ו-Shift+Tab נשארים בתוך החלון');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  r=await E(()=>document.activeElement&&document.activeElement.id);
  ok(r===opener.slice(1),id+': בסגירה המיקוד חוזר ל-'+opener+' ('+r+')');
  await E(()=>document.activeElement&&document.activeElement.blur());
}
// אחרי פתיחה בעכבר וסגירה ב-Esc — רווח יורה ולא פותח שוב
await page.click('#bSet'); await page.waitForTimeout(150); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
await page.keyboard.press('Space'); await page.waitForTimeout(150);
ok(!(await isOpen('playModal')),'פתיחה בעכבר, סגירה ב-Esc: רווח לא פותח שוב את ההגדרות');

// ── 6. שידור חוזר משמאל לימין באנגלית (45) ──
await E(()=>{ const s=window.__sim; s.uiSetMode('play'); s.matchStart(); for(let i=0;i<60;i++) s.advance(3,1/30); });
r=await E(()=>{ const s=window.__sim; s.replayOpen({}); s.REPLAY.play=false; s.REPLAY.pos=Math.floor(s.REPLAY.frames.length/2);
  const t=document.querySelector('#rpTicks i'); return {on:s.REPLAY.on, pos:s.REPLAY.pos, dir:getComputedStyle(document.getElementById('rpPos')).direction, tick:t?t.getAttribute('style'):''}; });
ok(r.on&&r.dir==='ltr','ציר השידור החוזר באנגלית: ltr ('+r.dir+')');
ok(!r.tick||/left:/.test(r.tick),'סימני האירועים נמדדים משמאל ('+r.tick.slice(0,40)+')');
await page.mouse.click(700,300); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
const p1=await E(()=>window.__sim.REPLAY.pos);
ok(p1>r.pos,'חץ ימינה מתקדם באנגלית ('+r.pos+' → '+p1+')');
await E(()=>window.__sim.replayClose());
await ctx.close();

// ── 7. טלפון 390: בלי גלילה לרוחב ──
({ctx,page,E}=await openPage({mode:'play',viewport:{width:390,height:844},mobile:true}));
r=await E(()=>({sw:document.documentElement.scrollWidth, iw:innerWidth}));
ok(r.sw<=390&&r.iw<=390,'טלפון 390: הדף לא רחב מהמסך ('+r.sw+' / '+r.iw+')');
await ctx.close();

// ── 8. אנגלית: בלי עברית גלויה במסכים הראשיים ──
({ctx,page,E}=await openPage());
const left=new Set();
const sweep=async tag=>{ for(const h of await E(HEB)) left.add(tag+' | '+h); };
await sweep('lab');
for(const ws of await E(()=>[...document.querySelectorAll('.wsb[data-go]')].map(b=>b.dataset.go))){ await E(w=>{ document.querySelector('.wsb[data-go="'+w+'"]').click(); document.querySelectorAll('#rail details').forEach(d=>d.open=true); },ws); await page.waitForTimeout(150); await sweep('ws:'+ws); }
await E(()=>document.getElementById('bSet').click()); await E(()=>document.querySelectorAll('#playModal details').forEach(d=>d.open=true)); await sweep('settings'); await page.keyboard.press('Escape');
await page.keyboard.press('Control+k'); for(const s of ['drill','robot','key']){ await E(s=>{ const i=document.getElementById('cmdkIn'); i.value=s; i.dispatchEvent(new Event('input')); },s); await page.waitForTimeout(80); await sweep('cmdk:'+s); } await page.keyboard.press('Escape');
await E(()=>__sim.uiSetMode('play')); await page.waitForTimeout(200); await E(()=>document.querySelectorAll('#rail details').forEach(d=>d.open=true)); await sweep('play');
await E(()=>__sim.bugOpen()); await page.waitForTimeout(300); await sweep('bug'); await page.keyboard.press('Escape');
ok(left.size===0,'אנגלית, מסכים ראשיים: בלי עברית גלויה'+(left.size?' — '+[...left].slice(0,8).join(' ; '):''));
// קוד ג׳אווה: ההערות באנגלית
r=await E(()=>{ const s=__sim; s.pathClear&&s.pathClear(); s.pathAdd?(s.pathAdd(0,0),s.pathAdd(20,10),s.pathAdd(30,-10)):0; document.getElementById('bPathJava').click(); return document.getElementById('pathOut').value; });
ok(r.length>20&&!/[֐-׿]/.test(r),'ייצוא ג׳אווה באנגלית: בלי עברית בהערות');
await ctx.close();

// ── 9. אנגלית באפליקציה (bbApp מדומה): עוזר, הגדרות בינה, חשבון, אודות ──
({ctx,page,E}=await openPage({app:true,viewport:{width:1280,height:800}}));
await page.waitForTimeout(800);
const left2=new Set(); const sweep2=async tag=>{ for(const h of await E(HEB)) left2.add(tag+' | '+h); };
for(const nav of ['home','play','lab','stats','drivers','settings']){ await E(n=>{ const b=document.querySelector('#appNav [data-nav="'+n+'"]'); b&&b.click(); },nav); await page.waitForTimeout(400);
  await E(()=>document.querySelectorAll('#appPage details').forEach(d=>d.open=true)); await sweep2('nav:'+nav); }
await E(()=>{ document.querySelector('#appNav [data-nav="play"]').click(); }); await page.waitForTimeout(200);
await E(()=>__sim.chatOpen()); await page.waitForTimeout(200); await sweep2('chat');
r=await E(()=>{ const c=document.getElementById('aiChat').getBoundingClientRect(), n=document.getElementById('appNav').getBoundingClientRect();
  const bn=document.getElementById('aiChatNew').getBoundingClientRect(), bx=document.getElementById('aiChatX').getBoundingClientRect();
  return {overlap:c.left<n.right&&c.right>n.left, newW:Math.round(bn.width), xW:Math.round(bx.width)}; });
ok(!r.overlap,'העוזר לא מכסה את סרגל הניווט');
ok(r.newW<90&&r.xW<60,'כפתורי ״New״ ו-״✕״ לא נמתחים ('+r.newW+', '+r.xW+')');
// קישורי יכולות בתשובה: מוסתרת — טקסט, לא קיימת — טקסט, קיימת — כפתור
await E(()=>{ window.__aiText='A [[f:split]] B [[f:ghost-feature]] C'; const i=document.getElementById('aiChatIn'); i.value='two players'; }); await E(()=>__sim.chatSend()); await page.waitForTimeout(300);
r=await E(()=>{ const m=[...document.querySelectorAll('#aiChatLog .aiM.bot')].pop(); return {txt:m.textContent, btn:[...m.querySelectorAll('.aiF')].map(b=>b.dataset.f), sent:(window.__aiAsk||[]).slice(-1)[0]}; });
ok(r.btn.join()==='split'&&/ghost feature/.test(r.txt),'קישורים: קיים ← כפתור, חסר ← טקסט ('+r.txt+')');
ok(r.sent&&r.sent.o.features.every(f=>!/[֐-׿]/.test(f.n)),'העוזר מקבל רשימת יכולות באנגלית בלבד');
await page.keyboard.press('Escape');
ok(left2.size===0,'אנגלית באפליקציה: בלי עברית גלויה'+(left2.size?' — '+[...left2].slice(0,8).join(' ; '):''));
await ctx.close();

await browser.close();
const re=realErrs(allErrs); ok(re.length===0,'בלי שגיאות בדף '+re.slice(0,3).join(' | '));
done('v63_ui');
