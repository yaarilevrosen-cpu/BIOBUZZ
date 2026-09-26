// v57 — סידור הממשק, הגדרות במקום אחד, קסם, תרגילים, השהיה, העדפות, כרטיס סוף מאץ׳
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=f=>page.evaluate(f);
// הגדרות — ⚙
await E(()=>document.getElementById('bSet').click());
let r=await E(()=>({open:!document.getElementById('playModal').hidden, t:document.getElementById('pmTitle').textContent,
  parts:['tmName','kSndOn','qualSeg','dBk','bSetHud'].map(id=>!!document.querySelector('#pmBody #'+id))}));
ok(r.open&&r.t==='הגדרות'&&r.parts.every(Boolean),'⚙ פותח ״הגדרות״ עם קבוצה, קולות, איכות, גיבוי ו״מה מוצג״');
await E(()=>document.getElementById('pmX').click());
ok(await E(()=>document.getElementById('setBody').parentNode.id==='setBox'),'סגירה מחזירה את החלקים למקומם');
// לוח המשחק — שליטה
r=await E(()=>{ const b=document.querySelector('#ppCtl [data-ppt="assist"]'), t=document.querySelector('#toolbar [data-tog="assist"]'); const before=t.classList.contains('on'); b.click(); __sim.ppRefresh(); return {before, after:t.classList.contains('on'), on:b.classList.contains('on')}; });
ok(r.after===!r.before&&r.on===r.after,'״סיוע כיוון״ בלוח המשחק מחליף ומסומן');
r=await E(()=>{ document.getElementById('ppMagic').click(); const m=document.getElementById('magicMenu'); const vis=!m.hidden; m.querySelector('[data-act="cancel"]').click(); return {vis, closed:m.hidden, mode:__sim.UI.mode}; });
ok(r.vis&&r.closed&&r.mode==='play','✨ קסם נפתח במצב משחק, פועל ונסגר — בלי לעבור למעבדה');
// העדפות נשמרות
await E(()=>{ const b=document.querySelector('#ppCtl [data-ppt="fc"]'); if(!__sim.fieldCentric) b.click(); });
ok(await E(()=>JSON.parse(localStorage.getItem('bbPrefs1')||'{}').fc===true),'ציר המגרש נשמר ב-bbPrefs1');
// השהיה
await page.keyboard.press('KeyP');
r=await E(()=>({tag:!document.getElementById('pauseTag').hidden, tb:document.getElementById('tbPause').textContent}));
ok(r.tag&&r.tb==='המשך','P — השהיה עם שלט ״מושהה״ ('+JSON.stringify(r)+')');
await page.keyboard.press('KeyP'); ok(await E(()=>document.getElementById('pauseTag').hidden),'P שוב — ממשיכים');
// תרגיל דיוק
r=await E(()=>{ document.getElementById('ppDrillBtn').click(); const vis=!document.getElementById('ppDrills').hidden;
  document.querySelector('[data-drill="acc"]').click(); return {vis, on:__sim.DRILL.on}; });
ok(r.vis&&r.on==='acc','״תרגילים״ נפתח ו״דיוק״ מתחיל');
// תרגיל מחזורים — מאץ׳ 60 שנ׳ לבד, והשיא נשמר בסוף
r=await E(()=>{ __sim.drillStart('cycle'); return {on:__sim.DRILL.on, tele:__sim.MT?__sim.MT.tele:null, bots:__sim.BOTS.filter(b=>b.on).length, setupTele:JSON.parse(localStorage.getItem('biobuzz_setup_v1')||'{}').tele}; });
ok(r.on==='cycle'&&r.bots===0,'⏱ מחזורים — לבד בזירה ('+JSON.stringify(r)+')');
ok(r.setupTele!==60,'ההגדרות של ״מאץ׳ מול בוטים״ לא השתנו');
for(let i=0;i<20;i++) await E(()=>__sim.advance(4,1/30));
r=await E(()=>({on:__sim.DRILL.on, best:JSON.parse(localStorage.getItem('bbDrill1')||'{}'), ph:__sim.MATCH.phase}));
ok(r.on===null&&r.best.cycle!=null,'בסוף התרגיל נשמר שיא ('+JSON.stringify(r.best)+')');
// כרטיס סוף מאץ׳
r=await E(()=>{ __sim.ppRefresh(); return document.getElementById('ppStatus').innerText; });
ok(/תרגיל/.test(r)&&/נק׳/.test(r),'כרטיס סוף התרגיל בלוח המשחק ('+r.replace(/\s+/g,' ').slice(0,90)+')');
// מעבדה — כותרות קבוצה ו״הנדסה״
await E(()=>__sim.uiSetMode?__sim.uiSetMode('lab'):document.querySelector('#uiMode [data-ui="lab"]').click());
r=await E(()=>{ const out={}; for(const w of ['drive','match','robot','auto','adv']){ document.querySelector('#wsrail [data-go="'+w+'"]').click();
  out[w]=[...document.querySelectorAll('#rail>details')].filter(d=>getComputedStyle(d).display!=='none').length; }
  return {out, title:document.getElementById('wsTitle').textContent, tb:document.querySelectorAll('#toolbar button').length}; });
ok(Object.values(r.out).every(n=>n>=3&&n<=10),'בכל לשונית של המעבדה 3–10 לוחות ('+JSON.stringify(r.out)+')');
ok(r.title==='הנדסה','״מתקדם״ נקרא עכשיו ״הנדסה״');
ok(r.tb<=16,'סרגל הכלים קצר ('+r.tb+' כפתורים)');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).join(' | '));
await browser.close();
done('v57');
