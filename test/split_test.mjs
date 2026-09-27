// v58 — משחק מלא עם חברים: החבר במפוצל נשאר כברירת מחדל; אפשר לבטל את הסימון ולשחק לבד
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
ok(await page.evaluate(()=>!document.getElementById('sSplitRow').hidden&&document.getElementById('sKeepSplit').checked),'בחלון המשחק: ״להשאיר את החבר״ מופיע ומסומן');
ok(await page.evaluate(()=>{ const i=[0,1,2].find(k=>__sim.BOTS[k].hum); const e=document.getElementById(['sBlue1','sBlue2','sPartner'][i]); return e.disabled&&e.checked&&/חבר/.test(e.parentNode.textContent); }),'העמדה של החבר נעולה ומסומנת ״חבר נוהג כאן״');
await page.evaluate(()=>document.getElementById('setupX').click());
s=await S(); ok(s.split,'סגירת החלון בלי להתחיל — המפוצל נשאר');
await page.evaluate(()=>document.getElementById('ppMatch').click());
await page.evaluate(()=>{ document.getElementById('sKeepSplit').checked=false; document.getElementById('setupGo').click(); __sim.advance(1,1/60); });
s=await S(); ok(!s.split&&s.hum===0&&s.live,'בלי הסימון — מסך שלם, בלי שחקן 2, והמאץ׳ רץ');
ok(await page.evaluate(()=>document.querySelector('.ppCard.on')?.id)==='ppMatch','הכרטיס ״מאץ׳ מול בוטים״ מסומן');

// 2. להשאיר את החבר
await stopAll(); await splitOn();
await stopAll();
await page.evaluate(()=>{ __sim.SETUP.partner=false; document.getElementById('ppMatch').click(); document.getElementById('setupGo').click(); __sim.advance(1,1/60); });
s=await S(); ok(s.split&&s.hum===1&&s.live,'ברירת המחדל — המאץ׳ מתחיל והחבר נשאר במפוצל');
ok(await page.evaluate(()=>__sim.BOTS.filter(b=>b.on).length===3&&__sim.BOTS.find(b=>b.hum).on),'גם כש״שותף״ כבוי — החבר בזירה, והבוטים רק בעמדות הפנויות');
ok(await page.evaluate(()=>!document.getElementById('ppFriendsMatch').hidden),'בלוח: ״🏆 משחק מלא עם החברים״ מופיע');

// 3. מאץ׳ מהיר שומר על החבר; נסיעה חופשית סוגרת את המפוצל
await stopAll();
await page.evaluate(()=>{ document.getElementById('ppQuick').click(); __sim.advance(1,1/60); });
s=await S(); ok(s.split&&s.hum===1&&s.live,'מאץ׳ מהיר עם חבר — החבר נשאר');
await stopAll(); await splitOn(); await stopAll();
await page.evaluate(()=>{ document.getElementById('ppFree').click(); __sim.advance(0.5,1/60); });
s=await S(); ok(!s.split&&s.hum===0,'נסיעה חופשית — מסך שלם');
// 4. בלי מפוצל — השורה מוסתרת
await page.evaluate(()=>document.getElementById('ppMatch').click());
ok(await page.evaluate(()=>document.getElementById('sSplitRow').hidden),'בלי מסך מפוצל — השורה לא מופיעה');
await page.evaluate(()=>document.getElementById('setupX').click());
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('split_test');
