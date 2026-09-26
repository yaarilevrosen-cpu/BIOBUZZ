// v41: בחירת האוטונומי שלי בחלון המשחק (שגרות, דוגמאות, מסלולים שמורים) · כל אוטונומי מתחיל בעמדת הפתיחה
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; S.stageMatch(); });
const chunk=async(sec)=>{ for(let t=0;t<sec;t+=3) await E(()=>S.advance(3,1/60)); };

// 1. נקודת ההתחלה היא תמיד עמדת הפתיחה
let r=await E(()=>{ S.SETUP.ally='red'; S.pathClear(); S.botBody.position.x=S.M(10); S.botBody.position.z=S.M(-10);
  S.pathAdd(-30,40); S.pathAdd(-20,20); const st=S.autoStartPose(), p0=S.PATH.pts[0];
  return {st,p0:{x:p0.x,z:p0.z,h:p0.h,start:p0.start}, rob:[S.I(S.botBody.position.x),S.I(S.botBody.position.z)]}; });
ok(r.p0.start&&r.p0.x===r.st.x&&r.p0.z===r.st.z&&Math.abs(r.p0.h-r.st.h)<1e-6,'הנקודה הראשונה = עמדת הפתיחה ('+r.st.x+', '+r.st.z+'), גם כשהרובוט עומד במקום אחר');
ok(Math.hypot(r.rob[0]-r.st.x,r.rob[1]-r.st.z)<3,'הרובוט עבר לעמדת הפתיחה');
r=await E(()=>{ S.pathDragMove(0,-20,10); S.pathDragEnd(0); const a=S.PATH.pts[0]; const n=S.PATH.pts.length; S.pathDel(0);
  return {x:a.x,z:a.z,st:S.autoStartPose(),same:S.PATH.pts.length===n,warn:S.PATH.warn}; });
ok(r.x===r.st.x&&r.z===r.st.z,'גרירת נקודת ההתחלה חוזרת לעמדת הפתיחה');
ok(r.same&&/אי אפשר למחוק/.test(r.warn),'אי אפשר למחוק את נקודת ההתחלה');
r=await E(()=>{ S.botBody.position.x=S.M(0); S.botBody.position.z=S.M(0); S.teachStart(); const st=S.autoStartPose();
  const d=Math.hypot(S.I(S.botBody.position.x)-st.x,S.I(S.botBody.position.z)-st.z); S.advance(0.3,1/60); S.teachStop(); return d; });
ok(r<3,'הקלטה מתחילה בעמדת הפתיחה');
// מסלול ישן שמתחיל במקום אחר
r=await E(()=>{ const L=S.pathLib(); L['ישן']={pts:[{x:-40,z:0},{x:-20,z:20,a:'shoot'}],at:1,ally:'red'}; localStorage.setItem('bb_paths_v1',JSON.stringify(L));
  S.pathLoad('ישן'); const u=S.PATH.pts.filter(p=>!p.auto); const st=S.autoStartPose();
  return {n:u.length, p0:[u[0].x,u[0].z], st:[st.x,st.z], second:[u[1].x,u[1].z], warn:S.PATH.warn}; });
ok(r.p0[0]===r.st[0]&&r.p0[1]===r.st[1]&&r.second[0]===-40&&r.n===3,'מסלול שמור שמתחיל במקום אחר מקבל נקודת התחלה בעמדת הפתיחה');
r=await E(()=>{ S.SETUP.ally='blue'; S.pathLoad('ישן'); const u=S.PATH.pts.filter(p=>!p.auto); const st=S.autoStartPose(); S.SETUP.ally='red';
  return {p0:[u[0].x,u[0].z], st:[st.x,st.z], p1:[u[1].x,u[1].z], warn:S.PATH.warn}; });
ok(r.p0[0]===r.st[0]&&r.p0[1]===r.st[1]&&r.p1[0]===40&&/לברית השנייה/.test(r.warn),'מסלול של הברית השנייה עובר במראה');

// 2. דוגמאות: לכל ברית, כולן מעמדת הפתיחה
r=await E(()=>{ const o={}; for(const al of ['red','blue']){ S.SETUP.ally=al; const st=S.autoStartPose();
    o[al]=S.AUTO_EX.map(e=>{ const p=S.autoExample(e.k); return !!p&&p[0].x===st.x&&p[0].z===st.z&&p.length>=3; }); }
  S.SETUP.ally='red'; return o; });
ok(r.red.every(Boolean)&&r.blue.every(Boolean),'חמש דוגמאות לכל ברית, כולן מתחילות בעמדת הפתיחה');
r=await E(()=>{ S.pathLoad('ex:cycle'); return {cur:S.PATH.cur, j:S.pathJava(), prog:S.progFromPath(S.PATH.pts).map(s=>s.k).join(',')}; });
ok(r.cur==='ex:cycle'&&/ShootAction/.test(r.j)&&/IntakeAction/.test(r.j),'דוגמה נטענת לעורך ומייצאת קוד');
ok(/^shootpos,shoot,goto,flower/.test(r.prog),'ירי מעמדת הירי מחושב בזמן הריצה ('+r.prog+')');
r=await E(()=>{ const s=document.getElementById('pathLibSel'); return [...s.querySelectorAll('optgroup')].map(g=>g.label+':'+g.children.length); });
ok(r.some(x=>/^דוגמאות:5$/.test(x)),'הדוגמאות ברשימת המסלולים בעורך ('+r.join(' · ')+')');

// 3. חלון המשחק: רשימה אחת עם שלוש קבוצות
r=await E(()=>{ S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-15,20); S.pathSave('שלי 1'); S.setupOpen();
  const sel=document.getElementById('sMyAuto'); const g=[...sel.querySelectorAll('optgroup')].map(x=>x.label+':'+[...x.children].map(o=>o.value).join('|'));
  return {g, note:document.getElementById('sMyAutoNote').textContent}; });
ok(r.g.length===3&&/^שגרות מוכנות:lv:none/.test(r.g[0])&&/ex:two/.test(r.g[1])&&/sv:שלי 1/.test(r.g[2]),'בחלון: שגרות מוכנות, דוגמאות והמסלולים שלי');
ok(/עמדת הפתיחה/.test(r.note),'הסבר: כל אוטונומי מתחיל בעמדת הפתיחה');
r=await E(()=>{ const sel=document.getElementById('sMyAuto'); sel.value='ex:preload'; sel.dispatchEvent(new Event('change'));
  return {my:S.SETUP.myAuto,a0:S.SETUP.autos[0]}; });
ok(r.my==='ex:preload'&&r.a0==='path','בחירה ברשימה נשמרת');
r=await E(()=>{ S.SETUP.blue1=S.SETUP.blue2=false; S.setupApply(); return {lvl:S.MYAUTO.lvl,cur:S.PATH.cur}; });
ok(r.lvl==='path'&&r.cur==='ex:preload','במשחק: הדוגמה נטענה ורצה כ״המסלול שלי״');
await chunk(37);
r=await E(()=>({leave:S.MATCH.leave, park:S.MATCH.autoPark, hits:S.state().hits, shots:S.state().shots, pos:[S.I(S.botBody.position.x).toFixed(0),S.I(S.botBody.position.z).toFixed(0)], why:S.RUN.why, res:S.RUN.res&&S.RUN.res.why, bots:S.BOTS.map(b=>b.on?S.I(b.body.position.x).toFixed(0)+','+S.I(b.body.position.z).toFixed(0):'-').join(' ')}));
ok(r.leave&&r.park&&r.shots>=3,'ירי מקדים וחניה: יציאה '+r.leave+', פגיעות '+r.hits+'/'+r.shots+', חניה '+r.park);
await E(()=>S.matchStop());
r=await E(()=>{ S.SETUP.myAuto='sv:שלי 1'; S.SETUP.autos[0]='path'; S.pathLoad('ex:two'); S.setupApply();
  const st=S.autoStartPose(), p0=S.PATH.pts[0]; return {lvl:S.MYAUTO.lvl, cur:S.PATH.cur, start:p0.x===st.x&&p0.z===st.z}; });
ok(r.lvl==='path'&&r.cur==='שלי 1'&&r.start,'מסלול שמור נבחר, נטען, ומתחיל בעמדת הפתיחה');
await E(()=>S.matchStop());
r=await E(()=>{ S.SETUP.myAuto='lv:preload'; S.SETUP.autos[0]='preload'; S.setupApply(); const l=S.MYAUTO.lvl; S.matchStop(); return l; });
ok(r==='preload','שגרה מוכנה עדיין עובדת');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('autosel_test');
