// v56 — זהות קבוצה, שפה (עברית/אנגלית), סיור קצר, דיווח על באגים
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=f=>page.evaluate(f);
let r=await E(()=>({b:document.getElementById('verBadge').textContent, w:document.body.innerText}));
ok(r.b==='v56','תג הגרסה: v56 בלי שם קבוצה ('+r.b+')');
r=await E(()=>document.documentElement.outerHTML.replace(/<script type="application\/json"[\s\S]*?<\/script>/,''));
ok(!/\u05D9\u05E2\u05E8\u05D9|\u05D0\u05E4\u05D5\u05DC\u05D5|APOLLO|Apollo/.test(r),'אין בדף שם של משתמש או קבוצה קבועים');
await E(()=>__sim.teamSet('Robo Lions','12345'));
r=await E(()=>({b:document.getElementById('verBadge').textContent, l:__sim.teamLabel(), st:localStorage.getItem('bbTeam1')}));
ok(r.b==='v56 · Robo Lions 12345','תג הגרסה מציג את הקבוצה ('+r.b+')');
ok(/12345/.test(r.st),'הקבוצה נשמרת');
// הסיור
await E(()=>__sim.tourStart(true));
r=await E(()=>({vis:!document.getElementById('tour').hidden, n:__sim.TOUR.steps.length, t:document.getElementById('tourT').textContent}));
ok(r.vis&&r.n>=5,'הסיור נפתח ('+r.n+' תחנות)');
let seen=[r.t];
for(let i=1;i<r.n;i++){ await E(()=>document.getElementById('tourNext').click()); seen.push(await E(()=>document.getElementById('tourT').textContent)); }
ok(new Set(seen).size===r.n,'כל התחנות שונות: '+seen.join(' | '));
await page.waitForTimeout(450);
const hole=await E(()=>{ const h=document.getElementById('tourHole').getBoundingClientRect(), b=document.getElementById('bBug').getBoundingClientRect(); return h.left<=b.left&&h.right>=b.right&&h.top<=b.top&&h.bottom>=b.bottom; });
ok(hole,'התחנה האחרונה מסמנת את כפתור הבאג');
await E(()=>document.getElementById('tourNext').click());
ok(await E(()=>document.getElementById('tour').hidden&&localStorage.getItem('bbTour1')==='1'),'״סיום״ סוגר ונזכר');
ok(await E(()=>__sim.UI?__sim.UI.mode!=='lab':true),'הסיור לא מעביר למצב בדיקות');
// דיווח על באג
await E(()=>document.getElementById('bBug').click()); await page.waitForTimeout(300);
r=await E(()=>({vis:!document.getElementById('bugModal').hidden, shot:(__sim.BUG.shot||'').slice(0,23), len:(__sim.BUG.shot||'').length}));
ok(r.vis,'חלון הדיווח נפתח');
ok(r.shot.startsWith('data:image/jpeg')&&r.len>2000,'צילום מסך מצורף ('+Math.round(r.len/1024)+' ק״ב)');
await E(()=>{ window.__fetchLog=[]; const of=window.fetch; window.fetch=async(u,o)=>{ window.__fetchLog.push({u:String(u),b:JSON.parse(o.body)}); return new Response(null,{status:201}); }; });
await E(()=>document.getElementById('bugSend').click()); 
ok(/לפחות/.test(await E(()=>document.getElementById('bugMsg').textContent)),'בלי תיאור — לא שולח ומבקש לכתוב');
await E(()=>{ document.getElementById('bugWhat').value='בדיקה אוטומטית: הרובוט נתקע'; window.onerrorTest=1; window.__bbErr.push({t:1,m:'שגיאת בדיקה'}); document.getElementById('bugSend').click(); });
await page.waitForTimeout(300);
r=await E(()=>({log:window.__fetchLog, msg:document.getElementById('bugMsg').textContent}));
const b=r.log[0]&&r.log[0].b;
ok(r.log.length===1&&/bb_bugs/.test(r.log[0].u),'נשלח לטבלת bb_bugs');
ok(b&&b.what&&b.sys&&b.sys.build==='v56'&&b.errors.some(x=>x.m==='שגיאת בדיקה')&&b.shot,'הדיווח כולל תיאור, פרטי מערכת, שגיאות וצילום');
ok(/תודה/.test(r.msg),'הודעת תודה ('+r.msg+')');
// קישור גיטהאב
await E(()=>{ window.__open=[]; window.open=(u)=>{ window.__open.push(u); }; document.getElementById('bugWhat').value='x y z'; document.getElementById('bugGh').click(); });
r=await E(()=>window.__open[0]||'');
ok(/github\.com\/.*\/issues\/new\?labels=bug&title=/.test(r),'״פתח בגיטהאב״ פותח דיווח מוכן');
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).join(' | '));
await browser.close();

// אנגלית
({browser,page,errs}=await open({noraf:true,play:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:60000});
await page.waitForTimeout(400);
r=await page.evaluate(()=>{ const t=document.body.innerText; const heb=(t.match(/[֐-׿]+/g)||[]); return {dir:getComputedStyle(document.body).direction, lang:document.documentElement.lang, wait:document.documentElement.classList.contains('i18n-wait'), heb:heb.length, sample:heb.slice(0,12).join(' '), ttl:document.title}; });
ok(r.lang==='en'&&r.dir==='ltr'&&!r.wait,'אנגלית: שפה וכיוון ('+r.dir+')');
ok(r.heb<=3,'כמעט אין עברית על המסך ('+r.heb+': '+r.sample+')');
ok(!/[֐-׿]/.test(r.ttl),'כותרת החלון באנגלית ('+r.ttl+')');
await page.evaluate(()=>{ __sim.tourStart(true); });
r=await page.evaluate(()=>document.getElementById('tourT').textContent+' / '+document.getElementById('tourNext').textContent);
ok(/Welcome/.test(r)&&/Next/.test(r),'הסיור באנגלית ('+r+')');
await page.evaluate(()=>{ __sim.tourEnd(); document.getElementById('bBug').click(); });
await page.waitForTimeout(300);
r=await page.evaluate(()=>document.getElementById('bugT').textContent+' | '+document.getElementById('bugSend').textContent);
ok(/Report a bug/.test(r)&&/Send report/.test(r),'חלון הבאג באנגלית ('+r+')');
await page.screenshot({path:(process.env.BB_SHOTS||'/tmp')+'/web-en.png'});
await page.evaluate(()=>{ document.getElementById('bugModal').hidden=true; document.getElementById('bLang').click(); });
await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length&&document.documentElement.lang,null,{timeout:60000});
await page.waitForTimeout(300);
r=await page.evaluate(()=>({l:localStorage.getItem('bbLang1'),dir:getComputedStyle(document.body).direction}));
ok(r.l==='he'&&r.dir==='rtl','הכפתור מחזיר לעברית');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).join(' | '));
await browser.close();
done('v56');
