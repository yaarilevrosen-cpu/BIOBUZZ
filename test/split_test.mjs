// v50 — אחרי מסך מפוצל, מאץ׳ רשמי חוזר למסך שלם (אלא אם בוחרים להשאיר)
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true,play:true});
const S=()=>page.evaluate(()=>({split:document.body.classList.contains('split2'), hum:__sim.BOTS.filter(b=>b.hum&&b.hum.src==='split').length, live:!document.body.classList.contains('nomatch'), setup:document.body.classList.contains('setup')}));
const splitOn=async()=>{ await page.evaluate(()=>{ document.getElementById('ppFriends').hidden=false; if(!document.body.classList.contains('split2')) document.getElementById('ppSplit').click(); __sim.advance(1,1/60); }); };
const stopAll=()=>page.evaluate(()=>{ const b=document.getElementById('clkStop'); if(!document.body.classList.contains('nomatch')){ b.click(); b.click(); } });

// 1. מאץ׳ מול בוטים מהכרטיס — ברירת מחדל: יוצא מהמפוצל
await splitOn();
let s=await S(); ok(s.split&&s.hum===1,'מסך מפוצל פעיל עם שחקן 2');
await stopAll();
await page.evaluate(()=>document.getElementById('ppMatch').click());
ok(await page.evaluate(()=>!document.getElementById('sSplitRow').hidden&&!document.getElementById('sKeepSplit').checked),'בחלון המשחק: שורת ״להשאיר את החבר״ מופיעה, לא מסומנת');
await page.evaluate(()=>document.getElementById('setupX').click());
s=await S(); ok(s.split,'סגירת החלון בלי להתחיל — המפוצל נשאר');
await page.evaluate(()=>document.getElementById('ppMatch').click());
await page.evaluate(()=>{ document.getElementById('setupGo').click(); __sim.advance(1,1/60); });
s=await S(); ok(!s.split&&s.hum===0&&s.live,'״התחל משחק״ — מסך שלם, בלי שחקן 2, והמאץ׳ רץ');
ok(await page.evaluate(()=>document.querySelector('.ppCard.on')?.id)==='ppMatch','הכרטיס ״מאץ׳ מול בוטים״ מסומן');

// 2. להשאיר את החבר
await stopAll(); await splitOn();
await stopAll();
await page.evaluate(()=>{ document.getElementById('ppMatch').click(); document.getElementById('sKeepSplit').checked=true; document.getElementById('setupGo').click(); __sim.advance(1,1/60); });
s=await S(); ok(s.split&&s.hum===1&&s.live,'עם הסימון — המאץ׳ מתחיל והחבר נשאר במפוצל');

// 3. מאץ׳ מהיר ונסיעה חופשית סוגרים את המפוצל
await stopAll();
await page.evaluate(()=>{ document.getElementById('ppQuick').click(); __sim.advance(1,1/60); });
s=await S(); ok(!s.split&&s.hum===0&&s.live,'מאץ׳ מהיר — מסך שלם');
await stopAll(); await splitOn(); await stopAll();
await page.evaluate(()=>{ document.getElementById('ppFree').click(); __sim.advance(0.5,1/60); });
s=await S(); ok(!s.split&&s.hum===0,'נסיעה חופשית — מסך שלם');
// 4. בלי מפוצל — השורה מוסתרת
await page.evaluate(()=>document.getElementById('ppMatch').click());
ok(await page.evaluate(()=>document.getElementById('sSplitRow').hidden),'בלי מסך מפוצל — השורה לא מופיעה');
await page.evaluate(()=>document.getElementById('setupX').click());
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('split_test');
