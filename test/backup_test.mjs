// v48 — גיבוי, שחזור ואיפוס הכול
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const reloaded=async()=>{ await page.waitForEvent('load',{timeout:30000}); await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000}); };
const ls=k=>page.evaluate(k=>localStorage.getItem(k),k);

ok(await page.evaluate(()=>__sim.bk.changed())===0,'בפתיחה נקייה: אפס פרמטרים שונים');
ok(await page.evaluate(()=>__sim.bk.all().length)===0,'בפתיחה נקייה אין גיבוי אוטומטי (אין מה לגבות)');
ok(await page.evaluate(()=>!!document.getElementById('tbBk')&&!!document.getElementById('dBk')),'כפתור ״גיבוי ואיפוס״ בסרגל ולוח בבדיקות');

// שינויים: פרמטר, מסלול, מקש, עונה
await page.evaluate(()=>{ __sim.bk._set('wheelD',120); __sim.bk._set('angle',60);
  localStorage.setItem('bb_paths_v1',JSON.stringify([{name:'שלי',pts:[]}]));
  localStorage.setItem('bbSeason1',JSON.stringify([{s:1},{s:2}])); });
await page.waitForTimeout(800);
ok(await page.evaluate(()=>__sim.bk.changed())===2,'אחרי שינוי: 2 פרמטרים שונים');
// במצב משחק רואים שהרובוט שונה
await page.evaluate(()=>{ document.querySelector('#uiMode [data-ui=play]').click(); });
ok(/מותאם — 2 שינויים/.test(await page.evaluate(()=>document.getElementById('ppStatus').textContent)),'במשחק: ״הרובוט: מותאם — 2 שינויים״');
await page.evaluate(()=>document.querySelector('#uiMode [data-ui=lab]').click());

// הפתיחה מהסרגל
await page.evaluate(()=>document.getElementById('tbBk').click());
ok(await page.evaluate(()=>document.body.dataset.ws==='adv'&&document.getElementById('dBk').open&&getComputedStyle(document.getElementById('dBk')).display!=='none'),'הכפתור פותח את לוח הגיבוי');

// איפוס הכול דרך הכפתור — לחיצה אחת לא מאפסת
await page.evaluate(()=>document.getElementById('bBkAll').click());
ok(await page.evaluate(()=>document.getElementById('bBkAll').textContent)==='בטוח? לחץ שוב','לחיצה ראשונה רק מבקשת אישור');
ok(await ls('bb_paths_v1')!==null,'…ולא מחקה כלום');
const rl=reloaded();
await page.evaluate(()=>document.getElementById('bBkAll').click());
await rl;
ok(await page.evaluate(()=>__sim.bk.changed())===0,'אחרי איפוס הכול: הרובוט מקורי');
ok(await ls('bb_paths_v1')===null&&await ls('bbSeason1')===null,'אחרי איפוס הכול: מסלולים ועונה נמחקו');
ok(await ls('bbUiMode1')==='lab','נשארים במצב בדיקות');
const all=await page.evaluate(()=>__sim.bk.all());
ok(all.length===1&&/לפני איפוס הכול/.test(all[0].why),'נשמר גיבוי ״לפני איפוס הכול״');
ok(await page.evaluate(()=>/2 פרמטרים שונו/.test(document.getElementById('bkList').textContent)&&/1 מסלולים/.test(document.getElementById('bkList').textContent)),'ברשימה: מה יש בגיבוי');

// שחזור
const rl2=reloaded();
await page.evaluate(()=>__sim.bk.restore(0));
await rl2;
ok(await page.evaluate(()=>__sim.bk.changed())===2,'אחרי שחזור: שני הפרמטרים חזרו');
ok(await page.evaluate(()=>Math.abs(__sim.bk._diff().find(d=>d[0]==='wheelD')[2]-120)<1e-9&&Math.abs(__sim.bk._diff().find(d=>d[0]==='angle')[2]-60)<1e-9),'הערכים עצמם חזרו (120, 60)');
ok(JSON.parse(await ls('bbSeason1')).length===2,'העונה חזרה');
ok(await page.evaluate(()=>__sim.bk.all().length)===2,'השחזור עצמו גובה קודם (אפשר לבטל שחזור)');

// איפוס רק הרובוט
const rl3=reloaded();
await page.evaluate(()=>__sim.bk.resetParams());
await rl3;
ok(await page.evaluate(()=>__sim.bk.changed())===0,'איפוס הרובוט: פרמטרים מקוריים');
ok(await ls('bb_paths_v1')!==null&&await ls('bbSeason1')!==null,'איפוס הרובוט: המסלולים והעונה נשארו');

// ייצוא ← ייבוא
const txt=await page.evaluate(()=>__sim.bk.text(__sim.bk.all()[0]));
ok(JSON.parse(txt).bb==='backup','קובץ גיבוי בפורמט bb:backup');
ok(await page.evaluate(()=>__sim.bk.importText('{"x":1}',{noReload:true}))===false,'קובץ זר נדחה בלי לשבור');
ok(await page.evaluate(()=>__sim.bk.importText('not json',{noReload:true}))===false,'טקסט שבור נדחה');
ok(await page.evaluate(()=>{ localStorage.setItem('bbBackups1','{{{'); return __sim.bk.all().length; })===0,'גיבויים פגומים בדפדפן לא מפילים');
const rl4=reloaded();
await page.evaluate(t=>__sim.bk.importText(t),txt);
await rl4;
ok(await page.evaluate(()=>__sim.bk.changed())===2,'ייבוא מקובץ מחזיר את הרובוט המותאם');
// מפתח זר בקובץ לא נכתב
const rl5=reloaded();
await page.evaluate(()=>__sim.bk.importText(JSON.stringify({bb:'backup',v:1,data:{evil:'x',biobuzz_params_v1:'{}'}})));
await rl5;
ok(await ls('evil')===null,'מפתח שלא של הסימולטור לא נכתב מייבוא');

// מקסימום 6
await page.evaluate(()=>{ for(let i=0;i<9;i++) __sim.bk.save('t'+i,{force:true}); });
ok(await page.evaluate(()=>__sim.bk.all().length)===6,'נשמרים עד 6 גיבויים');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('backup_test');
