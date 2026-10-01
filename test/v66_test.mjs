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
await browser.close(); done('v66');
