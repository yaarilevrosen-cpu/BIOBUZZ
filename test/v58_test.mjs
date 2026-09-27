// v58 — סטודיו השלט, סימוני הקסם, כוורת באמצע היפוך, קוד חדר קצר, כדור בלי בצבוץ, שם קבוצה
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=f=>page.evaluate(f);
// 1. סטודיו השלט נפתח מלוח המשחק — בלי לעבור למעבדה
let r=await E(()=>{ document.getElementById('ppPadStudio').click(); const m=document.getElementById('padStudio');
  return {open:!m.hidden, mode:__sim.UI.mode, btn:m.querySelectorAll('#psSvg g.btn').length, call:m.querySelectorAll('#psSvg g.call').length, lead:m.querySelectorAll('#psSvg path.lead').length}; });
ok(r.open&&r.mode==='play','״🎮 שלט ומקשים״ פותח את הסטודיו במצב משחק');
ok(r.btn===17&&r.call===17&&r.lead===17,'17 כפתורים בציור, 17 תוויות ו-17 קווים ('+r.btn+'/'+r.call+'/'+r.lead+')');
r=await E(()=>{ document.querySelector('#psSvg g.call[data-psb="5"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  const sel=__sim.PSTUDIO.sel, off=document.getElementById('psPick').classList.contains('off');
  document.querySelector('[data-psact="best"]').click();
  const saved=JSON.parse(localStorage.getItem('bbPadBind1'))[5];
  const lab=document.querySelector('#psSvg [data-psa="5"]').textContent;
  return {sel,off,saved,lab}; });
ok(r.sel===5&&!r.off,'לחיצה על תווית בוחרת את הכפתור');
ok(r.saved.a==='best'&&r.saved.m==='press'&&/עמדת הירי/.test(r.lab),'בחירת פעולה נשמרת ומופיעה בתווית ('+r.lab+')');
r=await E(()=>{ document.querySelector('[data-psact="intake"]').click(); const segs=[...document.querySelectorAll('[data-psmode]')].map(b=>b.dataset.psmode);
  document.querySelector('[data-psmode="hold"]').click(); return {segs, saved:JSON.parse(localStorage.getItem('bbPadBind1'))[5]}; });
ok(r.segs.join()==='toggle,hold'&&r.saved.a==='intake'&&r.saved.m==='hold','פעולת מתג מקבלת ״מתג / החזקה״, והמצב נשמר');
// שלט אמיתי: לחיצה בוחרת במקום להפעיל
r=await E(()=>{ const pad={id:'Xbox Wireless Controller',connected:true,index:0,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===3,value:i===3?1:0})),vibrationActuator:null};
  const g0=navigator.getGamepads; navigator.getGamepads=()=>[pad]; const tips=__sim.TIPS?JSON.stringify(__sim.TIPS):'';
  __sim.padPoll(1/60); const sel=__sim.PSTUDIO.sel; navigator.getGamepads=g0; return {sel}; });
ok(r.sel===3,'כפתור שנלחץ בשלט האמיתי נבחר בסטודיו');
r=await E(()=>{ document.getElementById('psReset').click(); const b=__sim.PADB; return {five:b[5].a, three:b[3].a}; });
ok(r.five==='intake'&&r.three==='autofire','״איפוס״ מחזיר את ברירת המחדל');
await page.keyboard.press('Escape');
ok(await E(()=>document.getElementById('padStudio').hidden&&!__sim.PSTUDIO.open),'Esc סוגר את הסטודיו');
// מסך צר — רק השלט, בלי התוויות
await page.setViewportSize({width:420,height:860});
r=await E(()=>{ __sim.padStudioOpen(); const v=document.getElementById('psSvg').getAttribute('viewBox'); const c=getComputedStyle(document.querySelector('#psSvg g.call')).display; document.getElementById('psDone').click(); return {v,c}; });
ok(/^225 /.test(r.v)&&r.c==='none','בטלפון: הציור מתקרב לשלט, התוויות מוסתרות');
await page.setViewportSize({width:1400,height:860});
// 2. מתג אחד לכל סימוני הקסם
r=await E(()=>{ const S=__sim; S.TOG.magicviz.set(false); const off={best:S.markBest.visible, heat:S.heatMesh?S.heatMesh.visible:false, route:S.routeGrp.visible, pref:JSON.parse(localStorage.getItem('bbPrefs1')||'{}').magicviz};
  S.TOG.magicviz.set(true); return {off, on:S.markBest.visible, pref2:JSON.parse(localStorage.getItem('bbPrefs1')||'{}').magicviz}; });
ok(!r.off.best&&!r.off.heat&&!r.off.route&&r.off.pref===false,'״סימוני הקסם״ כבוי — טבעת, צבעים וקו מוסתרים, ונשמר');
ok(r.on&&r.pref2===true,'ומודלק שוב');
ok(await E(()=>!!document.querySelector('#hudMenu [data-hudtog="magicviz"]')),'המתג נמצא ב״מה מוצג על המסך״');
// 3. בוטים לא יורים לכוורת באמצע היפוך
r=await E(()=>{ const S=__sim, h=S.hiveRed; const a=S.aiHiveOk(h); S.tip(h); const b=S.aiHiveOk(h); S.advance(1.4,1/120); const c=S.aiHiveOk(h); return {a,b,c}; });
ok(r.a&&!r.b&&r.c,'כוורת באמצע היפוך — הבוט מחכה, אחרי שהתייצבה — יורה ('+JSON.stringify(r)+')');
// 4. קוד חדר קצר
r=await E(()=>{ const S=__sim; const c=S.netCodeMake('192.168.1.23',9662,1234), d=S.netCodeRead(c), L=S.netCodeMake('10.0.0.5',9662,1234), dl=S.netCodeRead(L); return {c,d,L,dl}; });
ok(r.c==='012-X6J'&&r.d.host==='192.168.1.23'&&r.d.key===1234,'192.168.x.y — קוד קצר '+r.c+' שנקרא חזרה');
ok(r.L.length===13&&r.dl.host==='10.0.0.5','רשת אחרת — הקוד הארוך נשאר ('+r.L+')');
ok(r.c==='012-X6J','זהה לגשר של האפליקציה ולגשר בפייתון');
// 5. הכדור המצויר קטן מעט מהפיזיקלי
r=await E(()=>{ const S=__sim; const b=S.addBall('pollen',0,20,0,{x:0,y:0,z:0}); const s=b.mesh.scale.x; S.removeBall(b); return s; });
ok(r<1&&r>0.95,'קליפת הכדור קטנה ב-'+((1-r)*100).toFixed(1)+'% — בלי בצבוץ מלוח דק');
// 6. שם ומספר קבוצה מהענן מגיעים לכולם
r=await E(()=>{ const S=__sim; S.ACC.st={loggedIn:true,team:{code:'ABCDEF',name:'Buzz',num:'1234',members:3}}; S.accRender(); const a=S.TEAM.name+'|'+S.TEAM.num;
  S.ACC.st={loggedIn:true,team:{code:'ABCDEF',name:'Buzz 2',num:'999',members:3}}; S.accRender(); const b=S.TEAM.name+'|'+S.TEAM.num; S.ACC.st={}; S.accRender(); return {a,b}; });
ok(r.a==='Buzz|1234'&&r.b==='Buzz 2|999','שם הקבוצה שהשתנה אצל חבר מתעדכן כאן ('+r.b+')');
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v58');
