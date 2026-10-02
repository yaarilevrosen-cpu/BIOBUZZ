// v69: מתכנן אוטונומי — חיפוש מעל המחולל (בלי בינה מלאכותית)
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; S.stageMatch(); S.SETUP.ally='red'; });

// 1. שינוי מסלול: רק עמדות ירי ונקודות פרח, תמיד חוקי, ואותו זרע = אותה תוצאה
let r=await E(()=>{ const base=S.autoExample('two'); const a=[],b=[]; let legal=true, startSame=true, parkSame=true;
  for(let i=0;i<40;i++){ const r1=S.optRng(100+i), q=S.optMutate(base,10,r1), q2=S.optMutate(base,10,S.optRng(100+i));
    a.push(JSON.stringify(q)); b.push(JSON.stringify(q2));
    if(q[0].x!==base[0].x||q[0].z!==base[0].z) startSame=false;
    const pk=q.find(p=>p.act==='park'), pk0=base.find(p=>p.act==='park'); if(pk&&(pk.x!==pk0.x||pk.z!==pk0.z)) parkSame=false;
    for(const p of q) if(p.act==='shoot'&&(p.x>-10||Math.abs(p.x)>62||Math.abs(p.z)>62)) legal=false; }
  return {same:a.join()===b.join(), legal, startSame, parkSame, changed:a.filter(x=>x!==JSON.stringify(base)).length}; });
ok(r.same,'אותו זרע — אותו שינוי (אפשר לשחזר חיפוש)');
ok(r.legal,'עמדות ירי תמיד בצד שלי, לפחות 10″ מהאמצע (G402), ובתוך הזירה');
ok(r.startSame&&r.parkSame,'עמדת הפתיחה ונקודת החניה לא זזות');
ok(r.changed>=36,'כמעט כל ניסיון באמת משנה משהו ('+r.changed+'/40)');

// 2. חיפוש קצר: מתחיל מהמחולל, התוצאה בראש הרשימה, והזירה חוזרת למצבה
r=await E(async()=>{ S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,20); const before=JSON.stringify(S.PATH.pts.map(p=>[p.x,p.z]));
  const t=performance.now(); const g=await S.optRun({n:4, seed:7});
  return {ms:Math.round(performance.now()-t), top:S.GEN.res[0], n:S.GEN.res.length, gen:S.GEN.res.filter(x=>!x.opt).map(x=>x.total), tries:S.OPT.tries,
    running:S.OPT.running||S.GEN.running, match:S.MATCH.on, after:JSON.stringify(S.PATH.pts.map(p=>[p.x,p.z])), before,
    out:document.getElementById('oOpt').textContent, list:document.getElementById('genList').textContent}; });
const genBest=Math.max(...r.gen);
ok(r.top&&r.top.opt&&/^🔍 משופר/.test(r.top.name),'התוצאה של המתכנן בראש רשימת המחולל: '+(r.top&&r.top.name));
ok(r.top.total>=genBest-1,'המתכנן לא גרוע מהמחולל: '+r.top.total+' נק׳ מול '+genBest+' (טוב ביותר במחולל) · '+r.top.hits+'/'+r.top.shots+' פגיעות · '+r.top.slack+' שנ׳ פנויות');
ok(r.tries>=6&&r.n===13,'נבדקו '+r.tries+' ריצות של 30 שנ׳ (12 של המחולל ברשימה + המשופר) · '+Math.round(r.ms/1000)+' שנ׳');
ok(!r.running&&!r.match&&r.after===r.before,'בסוף: לא רץ, אין מאץ׳, והמסלול שבעורך לא השתנה');
ok(/הסתיים/.test(r.out)&&/הכי טוב/.test(r.out)&&/זמן פנוי בסוף/.test(r.out)&&/מול המחולל/.test(r.list),'הלוח מציג סטטוס, הכי טוב וזמן פנוי; ברשימה ״מול המחולל״');

// 3. טעינה לעורך וייצוא לרודראנר
r=await E(()=>{ S.genLoad(0,false); const j=S.pathJava(); const pts=S.PATH.pts.filter(p=>!p.auto);
  return {n:pts.length, j:/ShootAction|shoot/i.test(j)&&/Pose2d|Vector2d/.test(j), warn:S.PATH.warn}; });
ok(r.n>=4&&r.j&&/נטען מהמחולל/.test(r.warn),'המסלול נטען לעורך ומייצא קוד רודראנר');

// 4. עצירה באמצע
r=await E(async()=>{ const p=S.optRun({n:30, seed:3}); await new Promise(res=>setTimeout(res,6000)); document.getElementById('bOptRun').click();
  const g=await p; return {out:document.getElementById('oOpt').textContent, running:S.OPT.running||S.GEN.running, match:S.MATCH.on, top:S.GEN.res[0]&&S.GEN.res[0].opt}; });
ok(!r.running&&!r.match&&/נעצר/.test(r.out),'״עצור״ באמצע — נעצר נקי, בלי מאץ׳ תלוי');

// 5. לא רץ באמצע מאץ׳
r=await E(async()=>{ S.SETUP.blue1=S.SETUP.blue2=false; S.setupApply(); S.advance(4,1/60); const g=await S.optRun({n:4}); const on=S.MATCH.on; S.matchStop(); return {g, on}; });
ok(r.g===false&&r.on,'באמצע מאץ׳ המתכנן לא מתחיל');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v69_test');
