// v77 — סקאוטינג: השותף לא הופך ליריב אחרי שינוי ברית, ״איפוס הכול״ מוחק את a9662, חוזה ההתנהגות (b.sb)
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const MATCH=fs.readFileSync(path.join(HERE,'fixtures/scout04-match.json'),'utf8');
const EVENT=fs.readFileSync(path.join(HERE,'fixtures/scout04-event.json'),'utf8');
const {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);

// 1. ברית כחולה בלוח המשחק, ואנחנו 90001 באדום בקובץ — השותף עדיין 90002 (נמצא בסקירה: הפך ליריב)
let r=await E(t=>{ const S=__sim; S.SETUP.ally='blue'; S.SCT.ours='90001'; S.sctLoadText(t);
  return {pt:S.BOTS[2].prof&&S.BOTS[2].prof.team, o:[S.BOTS[0].prof&&S.BOTS[0].prof.team,S.BOTS[1].prof&&S.BOTS[1].prof.team].sort()}; },MATCH);
ok(r.pt===90002&&r.o.join()==='90003,90004','אחרי בחירת ברית אחרת בלוח המשחק — השותף נשאר השותף ('+JSON.stringify(r)+')');
// 2. ״הברית שלנו בקובץ״ שגויה — המספר שלנו לא נבנה כבוט יריב
r=await E(t=>{ const S=__sim; S.SCT.ours='90001'; S.SCT.side='blue'; S.sctApply(); const T=S.BOTS.map(b=>b.prof&&b.prof.team); S.SCT.side=''; S.sctUI&&S.sctUI(); return {T, warn:S.SCT.warn}; },MATCH);
ok(r.T.indexOf(90001)<0,'הברית שלנו נבחרה הפוך — המספר שלנו לא הופך לבוט יריב ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.SCT.ours='90099'; S.sctApply(); const w=S.SCT.warn; S.sctOpen(); const t=document.getElementById('sctBody').textContent; S.sctClose(); S.SCT.ours='90003'; S.sctApply(); return {warn:w, shown:/לא במאץ׳ הזה/.test(t)}; });
ok(r.warn&&r.shown,'המספר שלנו לא במאץ׳ — אזהרה בחלון ('+JSON.stringify(r)+')');
// 3. חוזה ההתנהגות: 90003 בולם 75% (ביטחון 0.4), אוטונומי B, 2 כדורים
r=await E(()=>{ const S=__sim; const b=S.BOTS.find(x=>x.prof&&x.prof.team===90001); return b&&b.sb&&{def:b.sb.def, k:b.sb.k.def, start:b.sb.auto.start, balls:b.sb.auto.balls, abc:[S.sctStartABC('E'),S.sctStartABC('a'),S.sctStartABC('Z')]}; });
ok(r&&r.def===0.75&&r.k===0.4&&r.start==='B'&&r.balls===2&&r.abc.join()==='B,A,','b.sb (90001 כיריב): בולם 75% בביטחון 0.4, עמדה B, 2 כדורים; E→B ו-a→A ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.sctClear(); return S.BOTS.every(b=>b.sb==null); });
ok(r,'״נקה״ מאפס את b.sb');
// 4. ״איפוס הכול״ מוחק גם את פרטי החיבור והתמונות השמורות
r=await E(()=>{ const S=__sim; localStorage.setItem('a9662-sim-cfg','{"url":"https://x.supabase.co","key":"k"}'); localStorage.setItem('a9662-sim-cache:E1','{}');
  S.bk.resetAll({noReload:true}); const k=[]; for(let i=0;i<localStorage.length;i++) k.push(localStorage.key(i)); return k.filter(x=>/^a9662/.test(x)); });
ok(r.length===0,'״איפוס הכול״ מוחק גם את a9662 ('+r.join()+')');
// 5. המאץ׳ הבא שלנו לבד (current_match), ורשימה של המאצ׳ים שלנו בלבד
r=await E(t=>{ const S=__sim; S.sctClear(); S.SCT.ours='90002'; const o=JSON.parse(t); o.schedule['3']={red:[90003,90005],blue:[90006,90007]};
  o.current_match=1; S.sctLoadText(JSON.stringify(o)); const a=S.SCT.pack.matches[S.SCT.mi].n;
  S.sctOpen(); const opts=[...document.querySelectorAll('#sctMatch option')].map(x=>x.textContent);
  /* 90002 רק במאץ׳ 1 — אז ״כל המאצ׳ים״ */
  S.SCT.ours='90001'; o.current_match=2; S.sctLoadText(JSON.stringify(o)); const b=S.SCT.pack.matches[S.SCT.mi].n; S.sctUI(); const opts2=[...document.querySelectorAll('#sctMatch option')].map(x=>x.textContent);
  document.querySelector('#sctBox [data-sct="allm"]').click(); const opts3=document.querySelectorAll('#sctMatch option').length; S.sctClose();
  return {a,b,n1:opts.length,opts2,opts3,noApply:!document.querySelector('#sctBox [data-sct="apply"]')}; },EVENT);
ok(r.a===1&&r.b===2&&r.opts2.length===2&&/^⏭ מאץ׳ 2/.test(r.opts2[1])&&r.opts3===3&&r.noApply,'current_match: נבחר לבד המאץ׳ הבא שלנו (⏭), הרשימה רק שלנו, ״כל המאצ׳ים״ מראה הכול ('+JSON.stringify(r)+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();
done('v77_scout');
