// v66 — אחרי הצפירה השלט מנותק עד שסוגרים את הודעת הסיום; שותף לא נתקע ליד עמדה תפוסה
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true,play:true});
const r=await page.evaluate(()=>{ const S=__sim, I=S.I; S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=5; S.MYAUTO.lvl='none'; S.gameStart(false); S.matchStart(); S.advance(5.5,1/60);
  const o={phase:S.MATCH.phase}; const p0=[I(S.botBody.position.x),I(S.botBody.position.z)];
  S.key('KeyW',true); S.advance(2,1/60); S.key('KeyW',false); o.locked=Math.hypot(I(S.botBody.position.x)-p0[0],I(S.botBody.position.z)-p0[1]);
  o.banner=/show/.test(document.getElementById('banner').className);
  document.getElementById('bannerX').click(); const p1=[I(S.botBody.position.x),I(S.botBody.position.z)];
  S.key('KeyW',true); S.advance(1,1/60); S.key('KeyW',false); o.free=Math.hypot(I(S.botBody.position.x)-p1[0],I(S.botBody.position.z)-p1[1]);
  S.matchStop(); return o; });
ok(r.phase==='סיום','המאץ׳ נגמר');
ok(r.locked<1,`אחרי הצפירה W לא מזיז את הרובוט (${r.locked.toFixed(1)}″)`);
ok(r.banner,'הודעת הסיום נשארת עד שסוגרים אותה');
ok(r.free>10,`אחרי סגירת ההודעה נוהגים שוב (${r.free.toFixed(1)}″)`);
ok(realErrs(errs).length===0,'בלי שגיאות בדף');

// v67 — תקלות גם לבוטים
const f=await page.evaluate(()=>{ const S=__sim; const o={};
  o.ui=!!document.getElementById('kFaultsBots')&&!!document.getElementById('sFaultsBots');
  S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=120; S.MYAUTO.lvl='none'; S.gameStart(true);
  const kb=document.getElementById('kFaultsBots'); kb.checked=true; kb.dispatchEvent(new Event('change'));
  S.matchStart(); const seen=new Set(); let radioStill=true;
  for(let i=0;i<90*4;i++){ S.advance(0.25,1/60); for(const b of S.BOTS){ if(b.flt&&b.flt.k){ seen.add(b.flt.k);
      if(b.flt.k==='radio'&&Math.hypot(b.body.velocity.x,b.body.velocity.z)>0.5&&b.flt.t<0.8) radioStill=false; } } }
  o.kinds=[...seen]; o.radioStill=radioStill; S.matchStop(); S.advance(0.1,1/60);
  o.cleared=S.BOTS.every(b=>!b.flt||!b.flt.k);
  kb.checked=false; kb.dispatchEvent(new Event('change')); o.off=S.BOTS.every(b=>!b.flt); return o; });
ok(f.ui,'מתג ״תקלות גם לבוטים״ בהגדרות המאץ׳ ובמעבדה');
ok(f.kinds.length>=2,'בוטים מקבלים תקלות במאץ׳ ('+f.kinds.join(',')+')');
ok(f.radioStill,'בוט עם מקלט מנותק עוצר');
ok(f.cleared&&f.off,'תקלות הבוטים נגמרות עם המאץ׳ ונמחקות כשמכבים');

// v67 — כדור שנוחת על הציר שבין שני התאים נופל
const g=await page.evaluate(()=>{ const S=__sim, I=S.I; const bs=[[12,4],[12,8],[-12,-6],[-12,3]].map(([x,z])=>S.addBall('pollen',x,72,z));
  for(let i=0;i<360;i++) S.advance(1/60,1/60); const hi=bs.filter(b=>I(b.body.position.y)>30&&Math.abs(I(b.body.position.y)-S.P.pivotY)<9).length; bs.forEach(b=>S.removeBall(b)); return hi; });
ok(g===0,'כדורים לא נתקעים על הציר שבין התאים ('+g+')');
await browser.close(); done('v66');
