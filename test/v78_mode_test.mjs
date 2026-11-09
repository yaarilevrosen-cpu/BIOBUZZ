// v78 — מצב ״סקאוטינג״: רק למנהלים. בלי הרשאה אין כפתור ואין כניסות; עם הרשאה (stub של בדיקה) — הלוח, מאץ׳ מול הרובוטים,
// ניהול המנהלים (עם api מדומה), נפילה ל״משחק״ כשההרשאה נעלמת, ואנגלית בלי עברית.
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const EVENT=JSON.stringify(Object.assign(JSON.parse(fs.readFileSync(path.join(HERE,'fixtures/scout04-event.json'),'utf8')),{current_match:1, event:'Demo event 90001'}));   // שם התחרות הוא נתון, לא ממשק
let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
const vis=sel=>`(()=>{ const el=document.querySelector(${JSON.stringify(sel)}); return !!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&!!el.offsetParent; })()`;

// 1. ברירת מחדל (דפדפן, בלי אפליקציה וחשבון): אין מצב ואין כניסות
let r=await E(`({mode:__sim.UI.mode, tab:${vis('#uiMode [data-ui="scout"]')}, card:${vis('#ppScout')}, panel:${vis('#scmPanel')},
  cmdk:__sim.cmdkIndex().filter(c=>/^(scout|sct-live|sct-qr)$/.test(c.id)&&(!c.when||c.when())).map(c=>c.id),
  allowed:__sim.scmAllowed()})`);
ok(r.mode==='play'&&!r.tab&&!r.card&&!r.panel&&!r.allowed&&r.cmdk.length===0,'בלי הרשאה: אין ״📊 סקאוטינג״ במתג, אין כרטיס ״מאץ׳ מהסקאוטינג״, אין לוח ('+JSON.stringify(r)+')');
// החיפוש (Ctrl+K): בלי הכניסות של הסקאוטינג
r=await E(async()=>{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',code:'KeyK',ctrlKey:true,bubbles:true})); await new Promise(r=>setTimeout(r,200));
  const i=document.querySelector('#cmdkIn,#cmdk input'); if(!i) return {no:true}; i.value='סקאוטינג'; i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,150));
  const t=(document.querySelector('#cmdk,#cmdkBox')||{}).textContent||''; document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return {t:t.slice(0,400)}; });
ok(!r.no&&!/מאץ׳ מהסקאוטינג|חיבור חי לסקאוטינג|קוד QR מהסקאוטינג/.test(r.t),'בלי הרשאה: החיפוש לא מציע את הסקאוטינג ('+JSON.stringify(r).slice(0,160)+')');
// uiSetMode('scout') בלי הרשאה → ״משחק״; מצב ״סקאוטינג״ שמור מגרסה/חשבון אחר לא פותח כלום
r=await E(()=>{ __sim.uiSetMode('scout'); return {mode:__sim.UI.mode, body:document.body.classList.contains('scout')}; });
ok(r.mode==='play'&&!r.body,'בלי הרשאה: בקשה למצב סקאוטינג → ״משחק״ ('+JSON.stringify(r)+')');
// ה-stub לא עובד בלי דפדפן אוטומטי (navigator.webdriver) — בדיקה שהוא באמת מוגבל
r=await E(()=>{ const d=Object.getOwnPropertyDescriptor(Navigator.prototype,'webdriver'); Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true});
  const x=__sim.scoutAdminSet(true); delete navigator.webdriver; if(d) Object.defineProperty(Navigator.prototype,'webdriver',d); return {x, allowed:__sim.scmAllowed()}; });
ok(r.x===false&&r.allowed===false,'ה-stub של הבדיקות לא פועל מחוץ לדפדפן אוטומטי ('+JSON.stringify(r)+')');

// 2. עם הרשאה: הכפתור, הכרטיס, החיפוש; הלוח במקום ״מה משחקים״
const ADM=[{uid:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'owner@example.test',at:'2026-11-01T10:00:00Z',me:true}];
await E(a=>{ window.__fake={list:a.slice(), calls:[],
  scoutAdmins:async function(){ this.calls.push('list'); return {ok:true,list:this.list.slice()}; },
  scoutAdminAdd:async function(em){ this.calls.push('add:'+em); if(!/example\.test$/.test(em)) return {ok:false,why:'אין חשבון עם המייל הזה — קודם פותחים חשבון באפליקציה, ואז מוסיפים'};
    this.list.push({uid:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email:em,at:'2026-11-09T08:00:00Z',me:false}); return {ok:true,list:this.list.slice()}; },
  scoutAdminRemove:async function(u){ this.calls.push('rm:'+u); if(this.list.length<2) return {ok:false,why:'אי אפשר להסיר את המנהל האחרון — קודם מוסיפים מנהל אחר',admin:true};
    const me=this.list.find(x=>x.uid===u&&x.me); this.list=this.list.filter(x=>x.uid!==u); return {ok:true,list:me?null:this.list.slice(),admin:!me}; } };
  __sim.scoutAdminSet(true,window.__fake); },ADM);
r=await E(`({tab:${vis('#uiMode [data-ui="scout"]')}, card:${vis('#ppScout')}, cmdk:__sim.cmdkIndex().filter(c=>/^(scout|sct-live|sct-qr)$/.test(c.id)&&(!c.when||c.when())).length})`);
ok(r.tab&&r.card&&r.cmdk===3,'עם הרשאה: ״📊 סקאוטינג״ במתג, הכרטיס, ושלוש הכניסות בחיפוש ('+JSON.stringify(r)+')');
// הכרטיס ״מאץ׳ מהסקאוטינג״ → המצב (לא החלון)
r=await E(async()=>{ document.getElementById('ppScout').click(); await new Promise(r=>setTimeout(r,50));
  return {mode:__sim.UI.mode, modal:!document.getElementById('sctBox').hidden, on:document.querySelector('#uiMode [data-ui="scout"]').classList.contains('on')}; });
ok(r.mode==='scout'&&!r.modal&&r.on,'הכרטיס פותח את מצב הסקאוטינג, לא חלון ('+JSON.stringify(r)+')');
r=await E(`({panel:${vis('#scmPanel')}, play:${vis('#playPanel')}, body:!!document.querySelector('#scmHost #sctBody'), lab:${vis('#toolbar')},
  src:(document.getElementById('scmSrcD')||{}).open, txt:document.getElementById('scmPanel').innerText})`);
ok(r.panel&&!r.play&&r.body&&!r.lab,'הלוח של הסקאוטינג במקום ״מה משחקים״, בלי כלי המעבדה ('+JSON.stringify({panel:r.panel,play:r.play,body:r.body,lab:r.lab})+')');
ok(r.src===true&&/עוד אין נתונים/.test(r.txt),'בלי נתונים: ״מקור הנתונים״ פתוח והסבר קצר');
// טוענים חבילה (תחרות, המספר שלנו 90001) — מאץ׳ הבא ⏭, שלושה רובוטים עם ״איך ישחק״, הפעולות
r=await E(t=>{ const S=__sim; S.SCT.ours='90001'; S.sctLoadText(t); const P=document.getElementById('scmPanel');
  const rows=[...P.querySelectorAll('.sctRow')]; const order=[...P.querySelectorAll('#sctLiveW,#sctOurs,#sctMatch,.sctRows,[data-sct="play"],#scmSrcD,#scmAdm')].map(x=>x.id||(x.dataset.sct?'play':x.className));
  return {rows:rows.length, prof:rows.filter(x=>x.querySelector('.sctT')).length, sb:P.querySelectorAll('.sctSb span').length, gar:P.querySelectorAll('[data-sctgar]').length, drv:P.querySelectorAll('[data-sctdrive]').length,
    next:[...P.querySelectorAll('#sctMatch option')].some(o=>/^⏭/.test(o.textContent)), play:(P.querySelector('[data-sct="play"]')||{}).textContent,
    src:(document.getElementById('scmSrcD')||{}).open, order}; },EVENT);
ok(r.rows===3&&r.prof===3&&r.sb>0&&r.gar===3&&r.drv===3,'שלושה רובוטים, לכל אחד ״איך ישחק״, ״🛠 במוסך״ ו-״🎮 לנהוג בו״ ('+JSON.stringify(r)+')');
ok(r.next&&r.play==='▶ מאץ׳ מול הרובוטים האלה'&&r.src===false,'המאץ׳ הבא שלנו מסומן ⏭; הכפתור הראשי ״▶ מאץ׳ מול הרובוטים האלה״; ״מקור הנתונים״ מקופל');
ok(r.order.join('|')==='sctLiveW|sctOurs|sctMatch|sctRows|play|scmSrcD|scmAdm','הסדר: מצב ← המספר שלנו ← מאץ׳ ← רובוטים ← פעולה ← מקור (מקופל) ← מנהלים ('+r.order.join(' › ')+')');
// בחירת מאץ׳ מהלוח עובדת (אותו מאזין כמו בחלון)
r=await E(()=>{ const s=document.getElementById('sctMatch'); const o=[...s.options].map(x=>+x.value); const want=o.find(v=>v!==__sim.SCT.mi); s.value=String(want); s.dispatchEvent(new Event('change',{bubbles:true}));
  return {mi:__sim.SCT.mi, want, picked:__sim.SCT.pickedM}; });
ok(r.mi===r.want&&r.picked===true,'בחירת מאץ׳ אחר בלוח ('+JSON.stringify(r)+')');
r=await E(()=>{ const s=document.getElementById('sctMatch'); const nx=[...s.options].find(o=>/^⏭/.test(o.textContent)); s.value=nx.value; s.dispatchEvent(new Event('change',{bubbles:true})); return __sim.SCT.mi===+nx.value; });
ok(r,'חזרה למאץ׳ הבא ⏭');
// ▶ מאץ׳ מול הרובוטים האלה — מאץ׳ מתחיל עם הבוטים מהסקאוטינג; ״עצור משחק״ מופיע בלוח
r=await E(async()=>{ document.querySelector('#scmPanel [data-sct="play"]').click(); await new Promise(r=>setTimeout(r,120));
  const S=__sim; return {on:S.MATCH.on||S.MATCH.cd>0, prof:S.BOTS.filter(b=>b.prof&&b.on).map(b=>b.prof.team), mode:S.UI.mode, stop:!document.getElementById('scmNow').hidden}; });
await page.waitForTimeout(900);
const st=await E(()=>!document.getElementById('scmNow').hidden);
ok(r.on&&r.prof.length===3&&r.mode==='scout'&&st,'״▶ מאץ׳ מול הרובוטים האלה״: מאץ׳ עם 3 הרובוטים, נשארים במצב, ״■ עצור משחק״ גלוי ('+JSON.stringify(r)+')');
r=await E(async()=>{ const b=document.getElementById('scmStop'); b.click(); const armed=__sim.MATCH.on||__sim.MATCH.cd>0; b.click(); await new Promise(r=>setTimeout(r,900)); return {armed, on:__sim.MATCH.on||__sim.MATCH.cd>0, stop:!document.getElementById('scmNow').hidden}; });
ok(r.armed&&!r.on&&!r.stop,'״■ עצור משחק״ — לחיצה שנייה עוצרת (כמו בכל מקום), והשורה נעלמת ('+JSON.stringify(r)+')');
// 🎮 לנהוג בו
r=await E(()=>{ const b=document.querySelector('#scmPanel [data-sctdrive]'); b.click(); return {mode:__sim.UI.mode}; });
ok(r.mode==='scout','״🎮 לנהוג בו״ מהלוח — נשארים במצב');

// 3. 👥 מנהלים (api מדומה)
r=await E(async()=>{ const d=document.getElementById('scmAdm'); d.open=true; await new Promise(r=>setTimeout(r,120));
  return {rows:document.querySelectorAll('#scmAdmBody .scmAdmRow').length, txt:document.getElementById('scmAdmBody').innerText, calls:window.__fake.calls.slice()}; });
ok(r.rows===1&&/owner@example\.test/.test(r.txt)&&/אני/.test(r.txt)&&/מאז 01\.11\.2026/.test(r.txt)&&r.calls.includes('list'),'״👥 מנהלים״ נפתח: הרשימה (מייל, אני, מאז) ('+JSON.stringify(r).slice(0,200)+')');
r=await E(async()=>{ const b=document.querySelector('#scmAdmBody [data-scmrm]'); b.click(); const t1=b.textContent; b.click(); await new Promise(r=>setTimeout(r,80));
  return {t1, msg:document.getElementById('scmAdmMsg').textContent, rows:document.querySelectorAll('#scmAdmBody .scmAdmRow').length, mode:__sim.UI.mode}; });
ok(r.t1==='בטוח?'&&/המנהל האחרון/.test(r.msg)&&r.rows===1&&r.mode==='scout','הסרה: קודם ״בטוח?״, והמנהל האחרון — התשובה של השרת מוצגת ('+JSON.stringify(r)+')');
r=await E(async()=>{ const i=document.getElementById('scmAdmIn'); i.value='bad'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,50)); const m1=document.getElementById('scmAdmMsg').textContent;
  const n=window.__fake.calls.length; document.getElementById('scmAdmIn').value='nobody@other.test'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,80)); const m2=document.getElementById('scmAdmMsg').textContent;
  document.getElementById('scmAdmIn').value='second@example.test'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,80));
  return {m1, n, n1:window.__fake.calls.length, m2, m3:document.getElementById('scmAdmMsg').textContent, rows:document.querySelectorAll('#scmAdmBody .scmAdmRow').length, inp:document.getElementById('scmAdmIn').value}; });
ok(/מייל תקין/.test(r.m1)&&/אין חשבון עם המייל הזה/.test(r.m2)&&/נוסף מנהל/.test(r.m3)&&r.rows===2&&r.inp==='','הוספה: מייל לא תקין נעצר, ״אין חשבון״ מהשרת, ואז נוסף — שני מנהלים ('+JSON.stringify(r)+')');
// מסירים את עצמי (יש עוד מנהל) → ההרשאה נעלמת → ״משחק״
r=await E(async()=>{ const b=[...document.querySelectorAll('#scmAdmBody .scmAdmRow')].find(x=>/אני/.test(x.textContent)).querySelector('[data-scmrm]'); b.click(); b.click(); await new Promise(r=>setTimeout(r,120));
  return {mode:__sim.UI.mode, allowed:__sim.scmAllowed(), body:document.body.classList.contains('scout'), back:!!document.querySelector('#sctBox .sctWin #sctBody')}; });
ok(r.mode==='play'&&!r.allowed&&!r.body&&r.back,'הסרתי את עצמי: חוזרים ל״משחק״, והתוכן חוזר לחלון ('+JSON.stringify(r)+')');
r=await E(`({tab:${vis('#uiMode [data-ui="scout"]')}, card:${vis('#ppScout')}, on:__sim.SCT.on, pack:!!__sim.SCT.pack, prof:__sim.BOTS.filter(b=>b.prof).length, live:__sim.SCTL.st})`);
ok(!r.tab&&!r.card&&!r.on&&!r.pack&&r.prof===0&&r.live==='off','אחרי איבוד הרשאה: אין כניסות, הבוטים חזרו לרגילים, החיבור החי כבוי ('+JSON.stringify(r)+')');

// 4. איבוד הרשאה בזמן שבמצב (למשל התנתקות) → ״משחק״; וחזרה
r=await E(()=>{ __sim.scoutAdminSet(true); __sim.uiSetMode('scout'); const a=__sim.UI.mode; __sim.scoutAdminSet(false); return {a, b:__sim.UI.mode, saved:localStorage.getItem('bbUiMode1')}; });
ok(r.a==='scout'&&r.b==='play'&&r.saved==='play','איבוד הרשאה במצב → ״משחק״ (ונשמר ״משחק״) ('+JSON.stringify(r)+')');
// מצב שמור ״scout״ + טעינה מחדש: עד שההרשאה ידועה — ״משחק״, בלי לדרוס; כשמתברר שמותר — חוזרים לסקאוטינג
r=await E(()=>{ __sim.scoutAdminSet(true); __sim.uiSetMode('scout'); return localStorage.getItem('bbUiMode1'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
r=await E(()=>({mode:__sim.UI.mode, saved:localStorage.getItem('bbUiMode1'), want:__sim.SCM.bootWant}));
ok(r.mode==='play'&&r.saved==='scout'&&r.want===true,'טעינה מחדש עם ״סקאוטינג״ שמור, לפני שההרשאה ידועה: ״משחק״, הבחירה נשמרת ('+JSON.stringify(r)+')');
r=await E(()=>{ __sim.scoutAdminSet(true); return __sim.UI.mode; });
ok(r==='scout','ההרשאה הגיעה — חוזרים לבד ל״סקאוטינג״');
// החיבור החי לא מתחבר לבד בלי הרשאה (פרטים שמורים במחשב)
r=await E(()=>{ __sim.scoutAdminSet(false); localStorage.setItem('a9662-sim-cfg',JSON.stringify({url:'http://127.0.0.1:59999',key:'k',event:''})); return true; });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000}); await page.waitForTimeout(1900);
r=await E(()=>({st:__sim.SCTL.st, wait:__sim.SCM.autoWait}));
ok(r.st==='off'&&r.wait===true,'פרטי חיבור חי שמורים, בלי הרשאה — לא מתחבר לבד ('+JSON.stringify(r)+')');
r=await E(async()=>{ __sim.scoutAdminSet(true); await new Promise(r=>setTimeout(r,100)); const st=__sim.SCTL.st; __sim.sctlStop(); __sim.sctlForget(); return {st}; });
ok(r.st!=='off','ההרשאה הגיעה — מתחבר (כמו קודם) ('+JSON.stringify(r)+')');
await E(()=>{ __sim.scoutAdminSet(null); localStorage.removeItem('bbUiMode1'); localStorage.removeItem('a9662-sim-cfg'); });
const e1=realErrs(errs); ok(!e1.length,'בלי שגיאות בדף ('+e1.slice(0,3).join(' | ')+')');
await browser.close();

// 5. אנגלית: אין עברית בלוח החדש
({browser,page,errs}=await open({noraf:true,play:true}));
await page.evaluate(()=>localStorage.setItem('bbLang1','en')); await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
r=await page.evaluate(async t=>{ const S=__sim; S.scoutAdminSet(true,{scoutAdmins:async()=>({ok:true,list:[{uid:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'owner@example.test',at:'2026-11-01T10:00:00Z',me:true}]}),
    scoutAdminAdd:async()=>({ok:false,why:'אין חשבון עם המייל הזה — קודם פותחים חשבון באפליקציה, ואז מוסיפים'}),scoutAdminRemove:async()=>({ok:false,why:'אי אפשר להסיר את המנהל האחרון — קודם מוסיפים מנהל אחר'})});
  const heb=[]; const H=/[֐-׿]/;
  const scan=root=>{ const walk=n=>{ if(!n) return; if(n.nodeType===3&&H.test(n.data)) heb.push(n.data.trim()); for(const c of n.childNodes||[]) walk(c); }; walk(root);
    for(const el of root.querySelectorAll('[placeholder],[aria-label],[title]')) for(const a of ['placeholder','aria-label','title']){ const v=el.getAttribute(a); if(v&&H.test(v)) heb.push(a+':'+v); } };
  S.uiSetMode('scout'); await new Promise(r=>setTimeout(r,80)); scan(document.getElementById('scmPanel'));
  S.SCT.ours='90001'; S.sctLoadText(t); await new Promise(r=>setTimeout(r,80)); scan(document.getElementById('scmPanel'));
  const d=document.getElementById('scmAdm'); d.open=true; await new Promise(r=>setTimeout(r,120)); scan(document.getElementById('scmAdmBody'));
  document.querySelector('#scmAdmBody [data-scmrm]').click(); await new Promise(r=>setTimeout(r,40)); scan(document.getElementById('scmAdmBody'));
  document.querySelector('#scmAdmBody [data-scmrm]').click(); await new Promise(r=>setTimeout(r,80)); scan(document.getElementById('scmAdmBody'));
  document.getElementById('scmAdmIn').value='x@example.test'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,80)); scan(document.getElementById('scmAdmBody'));
  document.getElementById('scmAdmIn').value='bad'; document.querySelector('#scmAdmBody [data-scm="add"]').click(); await new Promise(r=>setTimeout(r,40)); scan(document.getElementById('scmAdmBody'));
  scan(document.getElementById('uiMode'));
  return {heb:[...new Set(heb)], btn:document.querySelector('#uiMode [data-ui="scout"]').textContent, play:(document.querySelector('#scmPanel [data-sct="play"]')||{}).textContent,
    since:(document.querySelector('#scmAdmBody small')||{}).textContent}; },EVENT);
ok(!r.heb.length,'אנגלית: אין עברית בלוח הסקאוטינג, בחלונית המנהלים ובמתג ('+r.heb.slice(0,6).join(' | ')+')');
ok(r.btn==='📊 Scouting'&&/Match against these robots/.test(r.play),'אנגלית: ״📊 Scouting״, ״▶ Match against these robots״ ('+r.btn+' / '+r.play+')');
const e2=realErrs(errs); ok(!e2.length,'אנגלית: בלי שגיאות ('+e2.slice(0,3).join(' | ')+')');
await browser.close();
done('v78_mode');
