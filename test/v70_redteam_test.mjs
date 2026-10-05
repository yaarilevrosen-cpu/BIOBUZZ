// v70 (1.12.3): תיקונים מסקירת העמידות — ניקוד, פסילה, היפוך אוטומטי, פרמטרים, תרגילים
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; S.stageMatch(); });

// 1. פסילה: הברית שלי מסיימת ב-0 בכל מקום (באנר, עונה, לוח שידור)
let r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.gameStart(true); S.matchStart();
  S.advance(2,1/60); S.MATCH.dq=true; S.MATCH.t=S.MT.auto+S.MT.trans+S.MT.tele-0.1; S.advance(0.5,1/60);
  const f=S.MATCH.final; const my=f&&f[S.myAlly()]; const bc=S.bcScoreOf?S.bcScoreOf('red'):null; S.matchStop(); return {my,blue:f&&f.blue,bc}; });
ok(r.my===0&&r.bc===0,'פסילה: הברית שלי מסיימת ב-0 גם בתוצאה הסופית ובלוח השידור ('+r.my+' / כחול '+r.blue+')');

// 2. היפוך על הצפירה — הכדורים שנשפכים לא נספרים גם כ״בתא״
r=await E(()=>{ const S=__sim; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.advance(1,1/60);
  const h=S.hiveRed, g=h.group; g.updateMatrixWorld(true);
  /* מכניסים 6 כדורים לתא העליון (בקואורדינטות של הכוורת, בשני הסימנים — אחד מהם הוא התא שלמעלה) */
  const put=(sg)=>{ for(let i=0;i<6;i++){ const b=S.balls[i]; const v=new THREE.Vector3(0,S.M(S.P.mouthY),sg*S.M(S.P.armD-S.P.cellD/2)); g.localToWorld(v); b.body.position.set(v.x,v.y,v.z); b.body.velocity.set(0,0,0); b.body.position.y=Math.max(b.body.position.y,S.M(2)); } };
  put(1); let nIn=S.cellContents(h).n; if(nIn<3){ put(-1); nIn=S.cellContents(h).n; }
  S.tip(h); const afterTip=S.cellContents(h).n; S.matchStop(); return {nIn,afterTip}; });
ok(r.nIn>=3&&r.afterTip===0,'אחרי שהכוורת מתחילה להתהפך — הכדורים הנשפכים לא נספרים בתא ('+r.nIn+' לפני, '+r.afterTip+' אחרי)');

// 3. היפוך אוטומטי נעול בתחרות
r=await E(()=>{ const S=__sim; S.setRealm('comp'); S.GAME.full=true; const k=document.getElementById('kAutoTip'); k.checked=false; k.dispatchEvent(new Event('change'));
  return {checked:k.checked, autoTip:S.autoTip===undefined?null:S.autoTip, disabled:k.disabled}; });
ok(r.checked===true,'בתחרות אי אפשר לכבות את ההיפוך האוטומטי (נשאר מסומן)');

// 4. מידות הזירה חוזרות לערך הרשמי במעבר לתחרות, ולא נטענות מהאחסון
r=await E(()=>{ const S=__sim; S.setRealm('open'); const v0=S.P.cellW; S.setP('cellW',40); S.setRealm('comp'); const v1=S.P.cellW;
  localStorage.setItem('biobuzz_params_v1',JSON.stringify({cellW:200,speed:7.5,driveWD:0,botW:27,muWheel:0.5}));
  const sp=S.P.speed, wd=S.P.driveWD; S.loadParams&&S.loadParams(); return {v0,v1,cellW:S.P.cellW,speed:S.P.speed,sp,driveWD:S.P.driveWD,wd,botW:S.P.botW}; });
ok(r.v1===r.v0&&r.cellW===r.v0,'רוחב התא חוזר ל-'+r.v0+' בתחרות (היה 40), ו-200 מהאחסון לא נטען');
ok(r.speed===r.sp&&r.driveWD===r.wd&&r.botW<=18,'מהירות 7.5, קוטר גלגל 0 ורוחב 27 מהאחסון — נדחים (מהירות '+r.speed+', גלגל '+r.driveWD+', רוחב '+r.botW+')');
await E(()=>{ localStorage.removeItem('biobuzz_params_v1'); __sim.resetParams&&__sim.resetParams(); });

// 5. הקלדת 0 בקוטר גלגל — נצמד לטווח, הרובוט לא מת
r=await E(()=>{ const S=__sim; S.setRealm('open'); const ip=document.getElementById('in_driveWD'); if(!ip) return {skip:true};
  ip.value='0'; ip.dispatchEvent(new Event('input')); S.setPose(0,0,0); S.key('KeyW',true); S.advance(1,1/60); S.key('KeyW',false);
  const yaw=S.bot.yaw, x=S.I(S.botBody.position.x), z=S.I(S.botBody.position.z); return {wd:S.P.driveWD, ok:isFinite(yaw)&&isFinite(x)&&isFinite(z), ip:ip.value}; });
ok(r.skip||(r.wd>=40&&r.ok),'קוטר גלגל 0 בשדה → נצמד ל-'+r.wd+' מ״מ, הרובוט ממשיך לנסוע בלי NaN');
await E(()=>{ __sim.resetParams&&__sim.resetParams(); __sim.setRealm('comp'); });

// 6. עצירה בספירה לאחור מנקה את התרגיל; תרגיל חופשי לא ממשיך לתוך מאץ׳
r=await E(()=>{ const S=__sim; S.drillStart('decide'); const on0=S.DRILL.on, cd=S.MATCH.cd>0; S.matchStop(); S.matchStop();
  const on1=S.DRILL.on, marks=S.V70D&&S.V70D.g?S.V70D.g.children.length:0;
  S.drillStart('park'); const on2=S.DRILL.on; S.MT.cd=0; S.gameStart(true); S.matchStart(); const on3=S.DRILL.on; S.matchStop();
  return {on0,cd,on1,marks,on2,on3}; });
ok(r.on0==='decide'&&r.on1===null&&r.marks===0,'עצירה בספירה לאחור: התרגיל מתנקה, בלי סימונים ('+r.marks+')');
ok(r.on2==='park'&&r.on3===null,'תרגיל חופשי (חניה) לא ממשיך לתוך מאץ׳ רגיל');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v70_redteam_test');
