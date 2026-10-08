// v72 corner (1.13): פינת פתיחה לבחירה (U4), מתכנן עמיד (U7), בדיקת התאמה לשותף (ADD-A), כרטיס לבור (ADD-B)
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; window.X=__sim.v72corner; S.stageMatch(); S.SETUP.ally='red'; });

// ── U4: פינת פתיחה ──
// לפני: autoStartPose / placeAllAtStart תמיד red1/blue1. אחרי: SETUP.spot בוחר, השותף בפינה השנייה
let r=await E(()=>{ const o={}, sp=S.startSpots();
  o.s1=S.autoStartPose(); o.spot0=X.mySpot();
  o.sw=X.spotSet(2); o.s2=S.autoStartPose();
  S.matchStart(); o.me=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)]; o.mate=[S.I(S.BOTS[2].body.position.x),S.I(S.BOTS[2].body.position.z)]; S.matchStop();
  o.brd=S.brdMine();
  S.SETUP.ally='blue'; S.matchStart(); o.bme=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)]; o.bmate=[S.I(S.BOTS[2].body.position.x),S.I(S.BOTS[2].body.position.z)]; S.matchStop(); o.bbrd=S.brdMine();
  o.g304=S.g304Check?S.g304Check(o.bme[0],o.bme[1],-Math.PI/2,'blue'):[];
  S.SETUP.ally='red';
  o.sp=sp; return o; });
ok(r.spot0===1&&r.s1.z===58&&r.s1.x<0,'ברירת מחדל: פינה 1 = red1 (פינת הקהל), כמו קודם');
ok(r.sw&&r.s2.z===-58&&r.s2.x<0,'פינה 2: האוטונומי מתחיל ב-red2 ('+r.s2.x+', '+r.s2.z+')');
ok(Math.abs(r.me[1]+58)<0.5&&Math.abs(r.mate[1]-58)<0.5,'במאץ׳: אני בפינה 2 והשותף בפינה 1 (אני z='+r.me[1].toFixed(1)+' · שותף z='+r.mate[1].toFixed(1)+')');
ok(Math.abs(r.bme[1]-58)<0.5&&r.bme[0]>0&&Math.abs(r.bmate[1]+58)<0.5&&r.g304.length===0,'בכחול: פינה 2 = blue2 (z=58), השותף ב-blue1, וחוקי לפי G304');
ok(r.brd===1&&r.bbrd===3,'לוח האסטרטגיה: האסימון שלי הוא של הפינה שלי ('+r.brd+', '+r.bbrd+')');

// מסלול לכל פינה: שמירה עם הפינה, ״אחרון״ לכל פינה, וכותרת הייצוא
r=await E(()=>{ const o={};
  S.pathClear(); S.pathAdd(-30,-40); S.pathAdd(-20,-20); o.p0=S.PATH.pts[0]; S.pathSave('פינה שתיים');
  o.saved=S.pathLib()['פינה שתיים'].spot;
  o.java=S.pathJava().split('\n')[1];
  X.spotSet(1); o.after1=S.PATH.pts.length; o.cur1=S.PATH.cur; o.home1=S.I(S.botBody.position.z);
  S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,20); S.pathSave('פינה אחת');
  X.spotSet(2); o.back2=S.PATH.cur; o.pz=S.PATH.pts[0].z;
  o.lsKey2=localStorage.getItem('bb_path_cur2'); o.lsKey1=localStorage.getItem('bb_path_cur');
  /* טעינה של מסלול שנשמר לפינה האחרת — מסומן */
  S.pathLoad('פינה אחת'); o.warn=S.PATH.warn; S.pathLoad('פינה שתיים');
  o.exp=JSON.parse(S.pathExportText()).spot;
  return o; });
ok(r.p0.z===-58&&r.saved===2,'מסלול שנשמר בפינה 2 מתחיל שם ונשמר עם spot=2');
ok(/פינה 2/.test(r.java)&&/השותף: פינה 1/.test(r.java),'הייצוא ל-RoadRunner נותן את הפינה בכותרת: '+r.java);
ok(r.after1===0&&r.cur1===''&&Math.abs(r.home1-58)<1,'מעבר לפינה 1: העורך של פינה 2 לא נגרר, הרובוט בעמדה של פינה 1');
ok(r.back2==='פינה שתיים'&&r.pz===-58&&r.lsKey2==='פינה שתיים'&&r.lsKey1==='פינה אחת','חזרה לפינה 2 מחזירה את המסלול שלה; ״אחרון״ נשמר לכל פינה בנפרד');
ok(/נשמר לפינה 1/.test(r.warn)&&r.exp===2,'טעינת מסלול של הפינה האחרת מסומנת · ״העתק כטקסט״ כולל את הפינה');

// האוטונומי במאץ׳ לכל פינה
r=await E(()=>{ const o={};
  S.SETUP.autoOn=true; S.SETUP.myAuto='lv:leave'; S.SETUP.myAuto2='ex:preload';
  X.setupMyAutoSet(S.SETUP[X.myAutoKey()]); S.setupApply(); o.l2=S.MYAUTO.lvl; o.c2=S.PATH.cur; o.p2=S.PATH.pts[0].z; S.matchStop();
  X.spotSet(1); o.a0=S.SETUP.autos[0]; S.setupApply(); o.l1=S.MYAUTO.lvl; S.matchStop();
  o.my1=S.SETUP.myAuto; o.my2=S.SETUP.myAuto2;
  S.setupOpen(); const b2=document.querySelector('#setup [data-spot="2"]'); b2.click(); o.dlgSpot=X.mySpot(); o.on=b2.classList.contains('on');
  o.note=document.getElementById('sSpotNote').textContent; o.sel=document.getElementById('sMyAuto').value;
  document.querySelector('#setup [data-spot="1"]').click(); S.setupClose();
  o.saved=JSON.parse(localStorage.getItem('biobuzz_setup_v1')).spot;
  return o; });
ok(r.l2==='path'&&r.c2==='ex:preload'&&r.p2===-58,'פינה 2: האוטונומי של פינה 2 (דוגמה) נטען מהפינה שלה');
ok(r.a0==='leave'&&r.l1==='leave','פינה 1: האוטונומי של פינה 1 (יציאה) — כל פינה שומרת את שלה');
ok(r.my1==='lv:leave'&&r.my2==='ex:preload','SETUP.myAuto / myAuto2 נשמרו בנפרד');
ok(r.dlgSpot===2&&r.on&&/פינה 1/.test(r.note)&&r.sel==='ex:preload','חלון המשחק: כפתורי פינה, הערה על השותף, והבחירה של פינה 2 בתפריט');
ok(r.saved===1,'הפינה נשמרת בהגדרות');

// מחולל/מתכנן לכל פינה
r=await E(async()=>{ const o={}; X.spotSet(2); await S.genRun({only:[0]}); o.n2=S.GEN.res.length; o.z2=S.GEN.res[0].pts[0].z; o.ui=document.getElementById('oGen').textContent;
  X.spotSet(1); o.n1=S.GEN.res.length; X.spotSet(2); o.n2b=S.GEN.res.length; X.spotSet(1); return o; });
ok(r.n2===1&&r.z2===-58&&/פינה 2/.test(r.ui),'המחולל בפינה 2 מתחיל מפינה 2 והלוח מציין את הפינה');
ok(r.n1===0&&r.n2b===1,'תוצאות המחולל שייכות לפינה: בפינה 1 ריק, חזרה לפינה 2 מחזירה אותן');

// ── U7: מתכנן עמיד ──
r=await E(()=>{ S.OPT.seed=5; const a=[0,1,2].map(k=>X.optPert(k)); const b=[0,1,2].map(k=>X.optPert(k)); S.OPT.seed=6; const c=X.optPert(0);
  const ev=X.optRobustScore({},[5000,4800,4600],[50,48,46],[6,4,2]);
  return {a,same:JSON.stringify(a)===JSON.stringify(b),diff:JSON.stringify(c)!==JSON.stringify(a[0]),ev}; });
ok(r.same&&r.diff,'שגיאות לפי הזרע: אותו זרע — אותן שגיאות, זרע אחר — אחרות');
ok(r.a.every(q=>Math.abs(q.dz)<=1&&q.din>=0&&q.din<=1&&Math.abs(q.dyaw)<=2)&&r.a[0].spd===1&&r.a[1].spd===0.9&&r.a[2].spd===0.9&&r.a[2].intake===0.3&&r.a[1].intake===0,
  'שלוש ריצות: עמדה ±1″/±2°, מהירות 90% מהשנייה, איסוף +0.3 שנ׳ בשלישית');
ok(Math.abs(r.ev.score-(4800-0.5*Math.sqrt(80000/3)-60*1))<1e-6&&r.ev.worst===46&&r.ev.minSlack===2,'ציון = ממוצע − 0.5·סטיית תקן − קנס על זמן פנוי < 3 שנ׳ ('+r.ev.score.toFixed(1)+')');
r=await E(async()=>{ const sp=S.P.speed; S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,20);
  await S.genRun({only:[1]}); const t0=S.OPT.tries; const g=await S.optRun({n:1,seed:5,robust:true});
  return {g:{worst:g.worst,minSlack:g.minSlack,robust:g.robust,total:g.total}, tries:S.OPT.tries, sp, sp2:S.P.speed, pin:S.GEN.pertIn||0,
    ui:document.getElementById('oOpt').textContent, list:document.getElementById('genList').textContent, chk:!!document.getElementById('kOptRobust')}; });
ok(r.g.robust&&r.g.worst!=null&&r.g.minSlack!=null&&r.g.worst<=r.g.total,'תוצאה עמידה: הכי גרוע '+r.g.worst+' נק׳ (ממוצע '+r.g.total+') · זמן פנוי ≥ '+r.g.minSlack+' שנ׳');
ok(r.tries===6,'כל מועמד שלוש פעמים: 2 מועמדים × 3 = '+r.tries+' ריצות');
ok(r.sp===r.sp2&&r.pin===0,'המהירות וההשהיה חזרו לערכים שלהם אחרי הריצות');
ok(r.chk&&/הכי גרוע/.test(r.ui)&&/זמן פנוי ≥/.test(r.ui)&&/הכי גרוע/.test(r.list),'הלוח מציג ״הכי גרוע N נק׳ · זמן פנוי ≥ X שנ׳״');

// ── ADD-A: בדיקת התאמה לשותף ──
r=await E(async()=>{ const o={};
  X.spotSet(2); S.pathLoad('ex:cycle'); const txt=S.pathExportText(); X.spotSet(1); S.pathLoad('ex:cycle');
  o.imp=X.ptnImport(txt); o.p0=X.PTN.pts[0];
  const res=await X.ptnRun({waits:false});
  o.res={total:res.total,n:res.conf.length,first:res.first,kinds:[...new Set(res.conf.map(c=>c.k))],pt:res.pt,me:res.me};
  o.ring=!!X.PTN.grp&&X.PTN.grp.children.length>=2; o.ui=document.getElementById('oPtn').textContent; o.list=document.getElementById('ptnList').children.length;
  o.last=JSON.parse(localStorage.getItem('bbPtn1'))['red:1'];
  o.after={match:S.MATCH.on, gen:S.GEN.running, on:S.BOTS.map(b=>b.on), pprog:!!S.BOTS[2].pprog};
  return o; });
ok(r.imp&&r.p0.z===-58&&r.p0.start,'מסלול השותף מיובא מהטקסט ומתחיל בפינה השנייה');
ok(r.res.n>0&&r.res.first&&r.res.kinds.includes('shoot'),'שני המסלולים לאותה עמדת ירי — התנגשויות: '+r.res.n+' ('+r.res.kinds.join(',')+') · ראשונה '+r.res.first.k+' ב-'+r.res.first.t+' שנ׳');
ok(r.res.pt.shots>0&&r.res.total>0,'השותף באמת מריץ את התוכנית (ירה '+r.res.pt.shots+') · נקודות יחד '+r.res.total);
ok(r.ring&&/התנגשויות/.test(r.ui)&&/הראשונה/.test(r.ui)&&r.list>0,'ההתנגשות הראשונה מסומנת על הזירה ובלוח');
ok(r.last&&r.last.n===r.res.n,'התוצאה נשמרת לפינה (לכרטיס לבור)');
ok(!r.after.match&&!r.after.gen&&!r.after.pprog,'בסוף: אין מאץ׳, לא רץ, והשותף חוזר לבינה הרגילה');
r=await E(async()=>{ S.pathLoad('ex:preload');
  const s=X.mateSpotPose(); X.ptnSetPts([{x:s.x,z:s.z,act:'none'},{x:s.x+14,z:s.z,act:'wait',sec:1}],'מחכה','test');
  const res=await X.ptnRun({waits:false}); return {n:res.conf.length,total:res.total,conf:res.conf,ui:document.getElementById('oPtn').textContent}; });
ok(r.n===0&&/אין ✓/.test(r.ui),'שותף שנשאר בפינה שלו — אין התנגשויות ('+r.total+' נק׳)'+(r.n?' '+JSON.stringify(r.conf[0]):''));
r=await E(()=>{ S.brdOpen(); S.brdResetTok&&S.brdResetTok(); const t=S.BRD.tok[S.brdMine()^1];
  S.brdAddStroke('a',1,[t[0],t[1],t[0]+20,t[1]+10]); const okB=X.ptnFromBoard(); const n=X.PTN.pts.length, src=X.PTN.src; S.brdClose(); return {okB,n,src}; });
ok(r.okB&&r.n>=2&&r.src==='board','מסלול השותף גם מהחצים שלו בלוח האסטרטגיה ('+r.n+' נקודות)');

// ── ADD-B: כרטיס לבור ──
r=await E(async()=>{ const o={};
  localStorage.setItem('bbSeason1',JSON.stringify([{at:1,my:50,opp:20,win:1,kind:'drill',auto:'DRILLX'},{at:2,my:61,opp:70,win:-1,kind:'match',auto:'AUTOM',autoPts:20,park:true},
    {at:3,my:10,opp:0,win:1,kind:'daily',auto:'DAILYX'},{at:4,my:44,opp:40,win:1,kind:'quick',auto:'<b>x</b>'}]));
  S.SETUP.myAuto='ex:preload'; S.SETUP.myAuto2='lv:leave';
  const h=await X.pitCardBuild(); o.h=h; o.pages=X.PIT.last.pages.map(p=>({n:p.n,name:p.info.name,ev:p.ev&&{t:p.ev.total,s:p.ev.slack}}));
  o.ms=X.pitMatches().map(m=>m.kind); o.spot=X.mySpot();
  o.cmd=S.cmdkIndex().some(c=>c.id==='pitcard'); o.btn=!!document.getElementById('bPitCard');
  /* הורדה: נתפסת דרך יצירת הקישור */
  const orig=HTMLAnchorElement.prototype.click; let got=null; HTMLAnchorElement.prototype.click=function(){ got=this.getAttribute('download'); };
  try{ o.exp=await X.pitCardExport(); } finally { HTMLAnchorElement.prototype.click=orig; } o.file=got;
  return o; });
const h=r.h||'';
ok((h.match(/<section class="pg">/g)||[]).length===2&&/פינה 1/.test(h)&&/פינה 2/.test(h),'עמוד לכל פינת פתיחה');
ok(r.pages[0].ev&&r.pages[0].ev.t>0&&r.pages[1].ev&&/ירי מקדים/.test(r.pages[0].name),'האוטונומי של כל פינה נמדד: '+r.pages.map(p=>p.name+' '+(p.ev?p.ev.t:'-')+' נק׳ · '+(p.ev?p.ev.s:'-')+' שנ׳ פנויות').join(' | '));
ok(/נקודות צפויות/.test(h)&&/זמן פנוי/.test(h)&&/ריצה משוערת/.test(h)&&/Pose2d start/.test(h)&&/כיוון הזירה/.test(h),'בכרטיס: נקודות, זמן פנוי, ריצה משוערת, כיוון הזירה ותנוחת ההתחלה ל-RoadRunner');
ok(/התנגשויות|בלי התנגשויות/.test(h),'בכרטיס: תוצאת בדיקת השותף');
ok(r.ms.join()==='quick,match'&&/AUTOM/.test(h)&&!/DRILLX|DAILYX/.test(h)&&!/<b>x<\/b>/.test(h),'10 המאצ׳ים האחרונים — מאצ׳ים בלבד (בלי תרגיל/יומי), שמות מוברחים');
ok(/@media print/.test(h)&&/window\.print/.test(h),'מוכן להדפסה (CSS להדפסה + כפתור)');
ok(r.cmd&&r.btn&&r.exp&&/^biobuzz-pit-card-\d{8}\.html$/.test(r.file||''),'נפתח מהחיפוש ומלוח העונה, ויורד כקובץ ('+r.file+')');
ok(r.spot===1,'הפינה חזרה לזו שנבחרה אחרי הבנייה');
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();

// ── אנגלית: בלי עברית במסכים החדשים ──
({browser,page,errs}=await open({noraf:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:60000});
r=await page.evaluate(async()=>{ const S=__sim, X=S.v72corner, heb=t=>(String(t).match(/[֐-׿][֐-׿״׳ ]*/g)||[]);
  await new Promise(r=>setTimeout(r,300));
  const o={};
  X.spotSet(2); S.pathLoad('ex:cycle'); const txt=S.pathExportText(); X.spotSet(1); S.pathLoad('ex:cycle'); X.ptnImport(txt);
  X.PTN.res={total:40,conf:[{k:'hit',t:2,x:1,z:2},{k:'flower',t:3,x:1,z:2},{k:'shoot',t:4,x:1,z:2}],first:{k:'hit',t:2,x:1,z:2},me:{hits:1,shots:2,park:true},pt:{hits:1,shots:2,park:true},fix:{wait:2,total:30}}; X.ptnUI();
  S.OPT.best={ev:{total:40,hits:4,shots:5,park:true,slack:5,worst:38,minSlack:4}}; S.OPT.start={total:30,slack:3}; S.OPT.msg='הסתיים'; S.optUI(1);
  S.setupOpen(); await new Promise(r=>setTimeout(r,200));
  await new Promise(r=>setTimeout(r,200));
  const box=id=>{ const e=document.getElementById(id); return e?e.textContent:''; };
  o.corner=heb(box('autoCornerRow')+box('autoCornerNote')); o.ptn=heb(document.getElementById('ptnBox').textContent); o.opt=heb([...document.querySelectorAll('#oOpt>div')].filter(d=>/≥/.test(d.textContent)).map(d=>d.textContent).join(' ')+(document.querySelector('label[for=kOptRobust]')||{}).textContent); o.optRow=[...document.querySelectorAll('#oOpt>div')].some(d=>/≥/.test(d.textContent));
  o.spot=heb(box('sSpotRow')+box('sSpotNote')); S.setupClose();
  o.java=heb(X.javaEn(S.pathJava()).split('\n')[1]); o.javaL=X.javaEn(S.pathJava()).split('\n')[1];
  const h=await X.pitCardBuild({noEval:true}); o.pit=heb(h);
  return o; });
ok(!r.corner.length,'אנגלית: בחירת הפינה בלי עברית '+r.corner.join('|'));
ok(!r.ptn.length,'אנגלית: לוח בדיקת השותף בלי עברית '+r.ptn.join('|'));
ok(r.optRow&&!r.opt.length,'אנגלית: שורת המתכנן העמיד בלי עברית '+r.opt.join('|'));
ok(!r.spot.length,'אנגלית: עמדת הפתיחה בחלון המשחק בלי עברית '+r.spot.join('|'));
ok(!r.java.length,'אנגלית: כותרת הפינה בקוד: '+r.javaL);
ok(!r.pit.length,'אנגלית: כרטיס הבור בלי עברית '+r.pit.slice(0,8).join('|'));
ok(realErrs(errs).length===0,'אין שגיאות בדף (אנגלית): '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();
done('v72 corner');
