// v45: תיקונים מהסקירה של הבוט (חמישה כובעים)
import {open,ok,done,realErrs} from './h.mjs';
import { chromium } from 'playwright';
let {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; });
// 1. ערכים שבורים בדפדפן לא מפילים את הדף
await E(()=>{ localStorage.setItem('biobuzz_records_v1','null'); localStorage.setItem('bbSeason1','[null,{"auto":"x"},5]'); localStorage.setItem('bb_paths_v1','[null,1,"z"]'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:60000});
let r=await E(()=>{ const S=__sim; let err=null; try{ S.setupOpen(); S.setupClose(); S.MT.cd=0; S.matchStart(); S.advance(1,1/60); S.matchStop(); }catch(e){ err=String(e); }
  return {err, gen:document.getElementById('oGen').innerText.length>0, faults:!!document.getElementById('kFaults')}; });
ok(!r.err&&r.gen,'ערכים שבורים בזיכרון הדפדפן לא מפילים כלום ('+(r.err||'תקין')+')');
await E(()=>{ window.S=__sim; });
// 2. כחולה: 2 מול 2, בלי שני רובוטים באותה נקודה
r=await E(()=>{ S.SETUP.ally='blue'; S.SETUP.blue1=S.SETUP.blue2=S.SETUP.partner=true; S.MT.cd=0; S.setupApply();
  const bots=S.BOTS.map(b=>({a:b.ally,x:Math.round(S.I(b.body.position.x)),z:Math.round(S.I(b.body.position.z)),n:b.name}));
  S.matchStop(); S.SETUP.ally='red'; return bots; });
const blue=r.filter(b=>b.a==='blue').length, red=r.filter(b=>b.a==='red').length, spots=new Set(r.map(b=>b.x+','+b.z)).size;
ok(blue===1&&red===2&&spots===3,'בברית הכחולה: שותף כחול ושני יריבים אדומים, כל אחד במקום משלו ('+r.map(b=>b.n).join(', ')+')');
// 3. יציאה מהקיר גם מהפינה
r=await E(()=>{ S.MT.cd=0; S.MYAUTO.lvl='none'; S.matchStart(); S.setPose2?0:0; S.botBody.position.x=S.M(-35); S.advance(1,1/60); const l=S.MATCH.leave; S.matchStop(); return l; });
ok(r,'יציאה מהקיר נספרת גם כשהרובוט מתחיל בפינה');
// 4. שידור חוזר לא זורק משחק רץ; משחק לא מתחיל כשהמחולל רץ
r=await E(()=>{ S.MT.cd=0; S.matchStart(); S.advance(6,1/60); S.matchStop(); S.matchStart(); S.advance(1,1/60);
  const ok1=S.replayOpen({}); const still=S.MATCH.on; S.matchStop(); return {ok1,still}; });
ok(!r.ok1&&r.still,'שידור חוזר לא נפתח באמצע משחק ולא עוצר אותו');
// 5. ניקוד קפוא אחרי הצפירה, והודעת תוצאה
r=await E(()=>{ S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=4; S.MYAUTO.lvl='none'; S.matchStart(); S.advance(4.2,1/60);
  const a=[S.allianceScore('red'),S.allianceScore('blue')]; S.fire(); S.advance(3,1/60); const b=[S.allianceScore('red'),S.allianceScore('blue')];
  S.ppRefresh(); return {a,b, big:document.getElementById('bannerBig').textContent, st:document.getElementById('ppStatus').innerText, stop:document.getElementById('ppStop').textContent}; });
ok(r.a[0]===r.b[0]&&r.a[1]===r.b[1],'הניקוד קפוא אחרי הסוף ('+r.a.join(':')+')');
ok(/ניצחון|הפסד|תיקו/.test(r.big)&&/תוצאה/.test(r.st),'בסוף: ״'+r.big+'״, והתוצאה נשארת בלוח');
ok(/עוד משחק/.test(r.stop),'אחרי המשחק הכפתור הוא ״עוד משחק״');
// 6. עצירה בטעות — רק בלחיצה שנייה
r=await E(()=>{ S.MT.cd=0; S.MT.auto=30; S.MT.trans=8; S.MT.tele=120; S.matchStart(); S.advance(1,1/60);
  S.ACT?0:0; const b=document.getElementById('ppStop'); b.click(); const after1=S.MATCH.on; b.click(); const after2=S.MATCH.on; return {after1,after2}; });
ok(r.after1&&!r.after2,'״עצור משחק״ עוצר רק בלחיצה השנייה');
// 7. מאץ׳ מהיר מביא בוטים
r=await E(()=>{ S.SETUP.blue1=S.SETUP.blue2=S.SETUP.partner=true; document.getElementById('ppQuick').click(); const n=S.BOTS.filter(b=>b.on).length; S.matchStop(); return n; });
ok(r===3,'״משחק מהיר״ מתחיל עם הבוטים לפי ההגדרות ('+r+')');
// 8. חלון ההגדרות סגור = לא בפוקוס
r=await E(()=>({inert:document.getElementById('setup').inert, hid:document.getElementById('setup').getAttribute('aria-hidden')}));
ok(r.inert&&r.hid==='true','חלון ההגדרות הסגור לא תופס מקלדת');
// 9. Esc סוגר רק את החלון, לא את מצב השידור
await E(()=>{ S.bcSet(true); S.setupOpen(); });
await page.keyboard.press('Escape');
r=await E(()=>({bc:S.BC.on, setup:document.body.classList.contains('setup')}));
ok(r.bc&&!r.setup,'Esc סוגר את חלון ההגדרות ומשאיר את מצב השידור');
await E(()=>S.bcSet(false));
// 10. כללים ופרמטרים
r=await E(()=>({out:S.g304Check(-80,58,Math.PI/2,'red').map(q=>q.r), ok:S.g304Check(-60.4,58,Math.PI/2,'red').length}));
ok(r.out.includes('B')&&r.ok===0,'בדיקת עמדת פתיחה דוחה מחוץ לזירה');
r=await E(()=>{ S.SETUP.mag=2; S.MT.cd=0; S.setupApply(); const n=S.bot.clip.length; S.matchStop(); S.SETUP.mag=4; return n; });
ok(r===4,'במצב תחרות תמיד 4 כדורים בפתיחה');
// 11. עברית: אין AUTO/TELEOP/LEAVE/POLLEN בטקסט הגלוי
r=await E(()=>{ S.uiSetMode('lab'); const t=[]; for(const w of ['drive','match','robot','auto','adv']){ S.setWS(w); t.push(document.body.innerText); }
  S.MT.cd=0; S.matchStart(); S.advance(0.5,1/60); t.push(document.getElementById('clkPhase').textContent); S.matchStop();
  const all=t.join('\n'); return ['LEAVE','PARK','POLLEN','NECTAR','Wi-Fi','AprilTag','TELEOP'].filter(w=>all.includes(w)).concat(/\bAUTO\b/.test(t[t.length-1])?['AUTO']:[]); });
ok(r.length===0,'אין מילים באנגלית בטקסט הגלוי ('+(r.join(', ')||'נקי')+')');
// 12. ייצוא לג׳אווה: כיוון הגעה נכון בהלוך־חזור
r=await E(()=>{ S.pathLoad('ex:cycle'); const j=S.pathJava(); return j.split('\n').filter(l=>/splineToLinearHeading/.test(l)).map(l=>l.match(/Math.toRadians\((-?[\d.]+)\)\)?\s*$/)?1:0) && j; });
ok(!/Math\.toRadians\(0\.0\)\)\s*$/m.test(r),'אין כיוון הגעה 0 מזויף בנקודת הפרח');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('review_test');
