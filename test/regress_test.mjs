// רגרסיה בסיסית: טעינה, נהיגה, ירי, מאץ׳ מלא עם בוטים, מסך מפוצל, קוד חדר
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
let r=await E(()=>document.getElementById('verBadge').textContent);
ok(/^v(39|[4-9][0-9])/.test(r),'תג הגרסה '+r);
// נהיגה
r=await E(()=>{ const S=__sim; S.homeRobot(); const z0=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)];
  S.key('KeyW',true); S.advance(1.0,1/120); S.key('KeyW',false); S.advance(0.5,1/120);
  const z1=[S.I(S.botBody.position.x),S.I(S.botBody.position.z)]; return Math.hypot(z1[0]-z0[0],z1[1]-z0[1]); });
ok(r>10,'הרובוט נוסע ('+r.toFixed(1)+'″ בשנייה)');
// ירי מהעמדה
r=await E(()=>{ const S=__sim; S.stageMatch(); S.clearBalls(); S.resetCounters(); let n=0;
  for(let i=0;i<3;i++){ S.shotPose(); S.refreshAim(); S.bot.mag=4; S.bot.clip=['pollen','pollen','pollen','pollen']; S.fire(); S.advance(1.6,1/120); n++; }
  return S.state(); });
ok(r.shots===3&&r.hits>=2,'ירי מעמדת הירי: '+r.hits+'/'+r.shots);
// קוד חדר
r=await E(()=>{ const S=__sim; const c=S.netCodeMake('192.168.1.37',9663,4321); const d=S.netCodeRead(c); return {c,d}; });
ok(r.d&&r.d.host==='192.168.1.37'&&r.d.port===9663&&r.d.key===4321,'קוד חדר הלוך־חזור '+r.c);
r=await E(()=>[__sim.netIsLan('10.0.0.5'),__sim.netIsLan('8.8.8.8'),__sim.netIsLan('172.20.1.1'),__sim.netIsLan('172.40.1.1')]);
ok(r.join()==='true,false,true,false','רשת ביתית בלבד '+r.join());
// מסך מפוצל
r=await E(()=>{ const S=__sim; S.splitSet(true); const b=S.BOTS[S.SPLIT.seat]; const a={on:S.SPLIT.on, src:b.hum&&b.hum.src};
  S.splitSet(false); a.after=!!(b.hum&&b.hum.src==='split'); return a; });
ok(r.on&&r.src==='split'&&!r.after,'מסך מפוצל נכנס ויוצא');
// מאץ׳ מלא — בוטים, שופט, ניקוד (מקוצר)
r=await E(()=>{ const S=__sim; S.MT.cd=3; S.MT.auto=30; S.MT.trans=8; S.MT.tele=60; S.gameStart(true); S.matchStart(); return S.MATCH.phase; });
for(let i=0;i<24;i++) await E(()=>__sim.advance(4.5,1/60));
r=await E(()=>{ const S=__sim; return {ph:S.MATCH.phase, red:S.allianceScore('red'), blue:S.allianceScore('blue'),
  shots:S.BOTS.reduce((a,b)=>a+b.shots,0), hits:S.BOTS.reduce((a,b)=>a+b.hits,0)}; });
ok(r.ph==='סיום','מאץ׳ מלא הגיע לסיום');
ok(r.red+r.blue>40,'נקודות לשתי הבריתות (אדום '+r.red+', כחול '+r.blue+')');
ok(r.shots>15&&r.hits/r.shots>0.7,'הבוטים יורים ופוגעים ('+r.hits+'/'+r.shots+')');
// בלי המוח — עדיין עובד
r=await E(()=>{ const S=__sim; S.BRAIN.on=false; S.gameStart(true); S.matchStart(); S.advance(20,1/60); const ok2=S.BOTS.every(b=>isFinite(b.body.position.x)); S.BRAIN.on=true; S.matchStop(); return ok2; });
ok(r,'מצב בלי מוח ממשיך לעבוד');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('regress_test');
