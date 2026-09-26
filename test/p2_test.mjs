// v54 — מסך שני (חלון שידור) והקלטת וידאו — בדפדפן
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true,play:true});
const E=f=>page.evaluate(f);
ok(await E(()=>!!document.getElementById('ppCast')&&!!document.getElementById('ppRec')),'בלוח המשחק: ״הקלט וידאו״ ו״מסך שני״');
const pop=page.waitForEvent('popup');
await E(()=>document.getElementById('ppCast').click());
const cw=await pop;
ok(!!cw,'חלון השידור נפתח');
ok(await E(()=>__sim.CAST.ren!=null&&document.getElementById('ppCast').classList.contains('on')),'הכפתור מסומן ״סגור מסך שני״');
await E(()=>{ const S=__sim; S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=30; S.matchStart(); S.advance(3,1/60); for(let i=0;i<4;i++) S.castRender(1/30); });
let r=await cw.evaluate(()=>({ph:document.getElementById('bcPhase').textContent, cl:document.getElementById('bcClock').textContent, rn:document.getElementById('bcRedN').textContent, w:document.getElementById('castCv').width}));
ok(/טלאופ/.test(r.ph)&&/0:2/.test(r.cl)&&r.rn.length>0,'לוח הניקוד בחלון השני: '+r.ph+' '+r.cl+' · '+r.rn);
ok(r.w>100,'הקנבס בחלון השני בגודל אמיתי ('+r.w+')');
// הזירה באמת מצויירת בחלון השני
r=await E(()=>{ __sim.castRender(1/30); __sim.castRender(1/30); const cv=__sim.CAST.win.document.getElementById('castCv'); const u=cv.toDataURL('image/png'); return u.length; });
ok(r>20000,'יש תמונה בחלון השני ('+r+' בתים)');
await E(()=>{ const S=__sim; S.advance(28,1/60); S.castRender(1/30); S.castRender(1/30); });
r=await cw.evaluate(()=>({f:!document.getElementById('bcFinal').hidden, t:document.getElementById('bcFinal').textContent}));
ok(r.f&&/תוצאה סופית/.test(r.t),'בסוף המאץ׳: ״תוצאה סופית״ בחלון השני');
ok(await E(()=>document.getElementById('bcFinal').hidden),'…ובמסך הראשי לא קופצת תוצאה (לא במצב שידור)');
await E(()=>__sim.castClose());
ok(await E(()=>__sim.CAST.win===null&&!document.getElementById('ppCast').classList.contains('on')),'סגירה — הכפתור חוזר');
// הקלטה
await E(()=>document.getElementById('ppRec').click());
ok(await E(()=>__sim.VREC.on&&!document.getElementById('recTag').hidden),'הקלטה התחילה — ״● מקליט״ על המסך');
await E(()=>{ window.requestAnimationFrame=window._raf||window.requestAnimationFrame; });
for(let i=0;i<25;i++){ await E(()=>{ __sim.vrecDraw(); }); await page.waitForTimeout(90); }
const dl=page.waitForEvent('download',{timeout:20000});
await E(()=>document.getElementById('ppRec').click());
const f=await dl; const pth=await f.path(); const fs=await import('fs');
const sz=fs.statSync(pth).size;
ok(/^BIOBUZZ-\d{8}-\d{6}\.(mp4|webm)$/.test(f.suggestedFilename())&&sz>1000,'נשמר סרטון: '+f.suggestedFilename()+' · '+Math.round(sz/1024)+' ק״ב');
ok(await E(()=>!__sim.VREC.on&&document.getElementById('recTag').hidden),'ההקלטה נעצרה');
// הקלטה אוטומטית
await E(()=>{ const k=document.getElementById('ppRecAuto'); k.checked=true; k.dispatchEvent(new Event('change')); const S=__sim; S.matchStart(); });
ok(await E(()=>__sim.VREC.on),'״להקליט כל מאץ׳ לבד״ — מאץ׳ התחיל והקלטה התחילה');
await E(()=>{ const S=__sim; S.matchStop(); });
await page.waitForTimeout(5600);
ok(await E(()=>!__sim.VREC.on),'…ונעצרה 5 שניות אחרי הסוף');
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('p2_test');
