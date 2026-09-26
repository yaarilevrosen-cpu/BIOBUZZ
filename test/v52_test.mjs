// v52 — הגדרות לכל חצי במסך מפוצל, מחסנית לשחקן 2, סטטיסטיקות
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=f=>page.evaluate(f);
await E(()=>{ document.getElementById('ppFriends').hidden=false; document.getElementById('ppSplit').click(); __sim.advance(0.5,1/60); });
ok(await E(()=>__sim.SPLITS.on&&getComputedStyle(document.querySelector('.ppScr')).display!=='none'),'מסך מפוצל: בלוח המשחק מופיע ״חצי 1 · חצי 2״');
ok(await E(()=>!document.getElementById('scrMark').hidden),'מסגרת מסמנת את החצי שנבחר');
ok(await E(()=>document.querySelector('.ppScr [data-scr="1"]').classList.contains('on')),'ברירת מחדל: חצי 1');
// חצי 2 → מצלמה עוקבת רק לשחקן 2
const cam1=await E(()=>__sim.camView);
await E(()=>{ document.querySelector('.ppScr [data-scr="2"]').click(); document.querySelector('#ppCam [data-ppcam="chase"]').click(); __sim.advance(0.3,1/60); });
let r=await E(()=>({v2:__sim.CAM2.view, v1:__sim.camView, hl:document.querySelector('#ppCam .on')?.dataset.ppcam, mark:document.querySelector('#scrMark span').textContent}));
ok(r.v2==='chase'&&r.v1===cam1,'חצי 2 → ״עוקבת״ משנה רק את המצלמה של שחקן 2 ('+r.v1+' / '+r.v2+')');
ok(r.hl==='chase','כפתור המצלמה מראה את המצב של חצי 2');
ok(/חצי 2/.test(r.mark),'המסגרת כתובה ״חצי 2״');
await E(()=>document.querySelector('#ppCam [data-ppcam="top"]').click());
r=await E(()=>__sim.cam2Pos());
ok(r[1]>4.5,'חצי 2 ״מלמעלה״ — המצלמה גבוהה ('+r[1].toFixed(2)+' מ׳)');
await E(()=>document.querySelector('#ppCam [data-ppcam="driver"]').click());
r=await E(()=>__sim.cam2Pos());
ok(r[1]<2,'חצי 2 ״נהג״ — בגובה עיניים ('+r[1].toFixed(2)+' מ׳)');
// חזרה לחצי 1
await E(()=>{ document.querySelector('.ppScr [data-scr="1"]').click(); document.querySelector('#ppCam [data-ppcam="top"]').click(); });
r=await E(()=>({v1:__sim.camView,v2:__sim.CAM2.view}));
ok(r.v1==='top'&&r.v2==='driver','חצי 1 → ״מלמעלה״ משנה רק אותי ('+r.v1+' / '+r.v2+')');
// גלגלת וגרירה בחצי של שחקן 2 (שמאל)
const cv=await E(()=>{ const b=document.querySelector('#stage>canvas').getBoundingClientRect(); return [b.left,b.top,b.width,b.height]; });
await page.mouse.move(cv[0]+cv[2]*0.25,cv[1]+cv[3]*0.5);
await page.mouse.wheel(0,300); await page.waitForTimeout(100);
r=await E(()=>({v:__sim.CAM2.view,d:__sim.CAM2.o.dist,e:__sim.SPLITS.edit}));
ok(r.v==='free'&&r.d>0,'גלגלת בחצי 2 — המצלמה שלו חופשית וזזה');
await page.mouse.click(cv[0]+cv[2]*0.25,cv[1]+cv[3]*0.5);
ok(await E(()=>__sim.SPLITS.edit)===2,'לחיצה על החצי השמאלי בוחרת חצי 2');
await page.mouse.click(cv[0]+cv[2]*0.75,cv[1]+cv[3]*0.5);
ok(await E(()=>__sim.SPLITS.edit)===1,'לחיצה על החצי הימני בוחרת חצי 1');
// מחסנית לשחקן 2
r=await E(()=>{ const b=__sim.BOTS.find(x=>x.hum&&x.hum.src==='split'); b.clip.length=0; b.clip.push('pollen','red'); document.getElementById('magHud2')&&0; __sim.setClip(['pollen']); __sim.advance(0.3,1/60);
  const e=document.getElementById('magHud2'); return {vis:!e.hidden&&getComputedStyle(e).display!=='none', n:e.querySelector('.mhN').textContent, left:e.getBoundingClientRect().left<document.getElementById('magHud').getBoundingClientRect().left}; });
ok(r.vis&&r.n==='2 / 4','מחסנית גדולה לשחקן 2 ('+r.n+')');
ok(r.left,'המחסנית של שחקן 2 בחצי שלו (שמאל)');
// בבדיקות: הסרגל
await E(()=>document.querySelector('#uiMode [data-ui=lab]').click());
ok(await E(()=>getComputedStyle(document.querySelector('#toolbar .scrPick')).display!=='none'),'בבדיקות: ״הגדרות עבור חצי 1 / חצי 2״ בסרגל');
r=await E(()=>{ const f0=__sim.fieldCentric, s0=__sim.SPLITS.fc; document.querySelector('#toolbar [data-scr="2"]').click(); document.getElementById('tbFC').click();
  return {f:__sim.fieldCentric===f0, s:__sim.SPLITS.fc!==s0, txt:document.getElementById('tbFC').textContent}; });
ok(r.f&&r.s,'חצי 2: ״ציר״ משנה את שחקן 2 בלבד ('+r.txt+')');
await E(()=>{ document.querySelector('#uiMode [data-ui=play]').click(); document.getElementById('ppSplit').click(); __sim.advance(0.3,1/60); });
r=await E(()=>({h:document.getElementById('magHud2').hidden, m:document.getElementById('scrMark').hidden, sc:getComputedStyle(document.querySelector('.ppScr')).display}));
ok(r.h&&r.m&&r.sc==='none','סגירת המפוצל — הבורר, המסגרת ומחסנית 2 נעלמים');
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();

// ── סטטיסטיקות ──
({browser,page,errs}=await open({noraf:true,play:true}));
ok(await E(()=>/עוד אין משחקים/.test((__sim.statUI(),document.getElementById('stOut').textContent))),'בלי משחקים — הודעה ברורה');
await E(()=>{ const a=[], t0=Date.now()-40*3600e3;
  for(let i=0;i<25;i++){ const my=20+i*2, opp=i%3===0?my+5:my-8; a.push({at:t0+i*3600e3*1.5, ally:i%2?'blue':'red', my, opp, win:my>opp?1:my<opp?-1:0, auto:'מחזור מלא', autoPts:10+(i%4), shots:10, hits:6+(i%3), fouls:i%5===0?1:0, leave:true, park:i%2===0, faults:0, sh:[], bl:[], kind:i<10?'match':'quick', skill:i%3}); }
  localStorage.setItem('bbSeason1',JSON.stringify(a)); __sim.statUI(); });
r=await E(()=>__sim.statCalc());
ok(r.n===25&&r.W+r.L+r.T===25,'25 משחקים: '+r.W+'-'+r.L+'-'+r.T);
ok(r.best.my===68,'שיא 68');
ok(Math.abs(r.acc-0.7)<0.02,'דיוק '+Math.round(100*r.acc)+'%');
ok(r.last>r.prev,'מגמה: 10 האחרונים טובים מ-10 הקודמים');
await E(()=>document.getElementById('ppStats').click());
r=await E(()=>({open:!document.getElementById('playModal').hidden, mode:document.body.classList.contains('play'), bars:document.querySelectorAll('#stChart .hit').length, txt:document.getElementById('pmBody').textContent}));
ok(r.open&&r.mode,'״📊 הסטטיסטיקות שלי״ נפתח בחלון — נשארים במשחק');
ok(r.bars===25,'גרף: 25 עמודות');
ok(/לפי סוג משחק/.test(r.txt)&&/מאץ׳ מהיר/.test(r.txt)&&/לפי רמת הבוטים/.test(r.txt)&&/אלופה/.test(r.txt),'פירוט לפי סוג משחק ורמת בוטים');
await E(()=>document.querySelector('#pmBody [data-stf="20"]').click());
ok(await E(()=>document.querySelectorAll('#stChart .hit').length)===20,'סינון ״20 אחרונים״');
// ריחוף על עמודה
const hb=await E(()=>{ const b=document.querySelector('#stChart .hit').getBoundingClientRect(); return [b.left+b.width/2,b.top+b.height/2]; });
await page.mouse.move(hb[0],hb[1]);
ok(await E(()=>!document.getElementById('stTip').hidden&&/:/.test(document.getElementById('stTip').textContent)),'ריחוף על עמודה מציג פרטים');
await E(()=>document.getElementById('pmX').click());
// מאץ׳ אמיתי נרשם עם הסוג
r=await E(()=>{ const S=__sim; S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=4; document.getElementById('ppFriends').hidden=false; document.getElementById('ppSplit').click(); S.matchStart(); for(let i=0;i<3;i++) S.advance(2.5,1/60);
  const a=S.seasonAll(); return a[a.length-1]; });
ok(r&&r.kind==='split'&&r.skill!=null,'מאץ׳ במסך מפוצל נרשם כ״מסך מפוצל״ ('+(r&&r.kind)+')');
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v52_test');
