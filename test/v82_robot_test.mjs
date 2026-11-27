// v82: הרובוט האמיתי של הקבוצה בסימולטור — גזירה מהקובץ, הבנייה במוסך, המודל, רמות הגרפיקה, ומה לא יוצא מהמחשב.
// רובוט דמיוני בלבד (v82_fixture.mjs).
import {open,ok,done,realErrs} from './h.mjs';
import {fakeRobot,fakeGlb} from './v82_fixture.mjs';
const {browser,page,errs}=await open();
await page.waitForTimeout(600);
const D=fakeRobot(), G=fakeGlb(D).toString('base64');
const near=(a,b,e)=>Math.abs(a-b)<=(e||0.02);

// 1. קובץ לא נכון לא נטען
const bad=await page.evaluate(()=>({a:__sim.realOk({format:"other",part_types:{},parts:[{}]}),b:__sim.realOk(null),c:__sim.realOk({format:"apollo9662-robot/1",part_types:{},parts:[]})}));
ok(!bad.a&&!bad.b&&!bad.c,'פורמט אחר, ריק או בלי חלקים — לא נטען');
const before=await page.evaluate(()=>({n:__sim.bldAll().length,has:__sim.bldAll().some(B=>B.id==="real"),angle:__sim.P.angle,muzzle:__sim.P.muzzle,camPitch:__sim.P.camPitch}));
ok(!before.has,'לפני הטעינה אין ״הרובוט האמיתי״ במוסך');

// 2. טעינה
const r=await page.evaluate(async([d,g])=>{ const b=Uint8Array.from(atob(g),c=>c.charCodeAt(0)).buffer;
  const loaded=await __sim.realLoadTest(d,b); const R=__sim.REAL, B=__sim.bldById("real");
  return {loaded,B,over:R.over,mass:R.mass,shift:R.shift,glb:!!R.glb,prim:!!R.prim,spin:R.spin.map(s=>s.k+":"+s.ax),n:__sim.bldAll().length,
    legal:__sim.bldCheck(B).ok}; },[D,G]);
ok(r.loaded&&r.glb&&r.prim,'נטען: המודל והחלקים הפשוטים');
ok(r.n===before.n+1&&r.B&&r.B.id==="real"&&r.B.real===true,'״הרובוט האמיתי״ נוסף למוסך אחרי הבנייות המוכנות');
ok(r.B.drive==="mecanum"&&r.B.intake==="mecanum"&&r.B.shoot==="hood"&&r.B.xfer==="belt"&&r.B.pollen===true&&r.B.cap===3&&r.B.sides===1,
  'הבנייה מהקובץ: מכאנום, איסוף מכאנום, הוד, רצועה, רק פולן, 3 כדורים ('+JSON.stringify([r.B.drive,r.B.intake,r.B.shoot,r.B.xfer,r.B.pollen,r.B.cap])+')');
ok(near(r.B.l,16.54)&&near(r.B.w,14.96),'המידות בלי רמפת סוף המשחק: '+r.B.w+'×'+r.B.l+' (מצופה 14.96×16.54)');
ok(near(r.shift[0],-20,0.5)&&near(r.shift[1],0,0.5),'המודל מוזז למרכז התיבה ('+r.shift.map(v=>v.toFixed(1))+')');
ok(r.legal,'הבנייה חוקית (מנועים, סרוו, גודל)');
ok(r.over.wheelD===100,'גלגל הירי — הגליל הכי גדול שמסתובב בירי, בלי הגלגלת ('+r.over.wheelD+')');
ok(r.over.camPitch===50&&near(r.over.camH,10,0.01)&&near(r.over.camFwd,2.83,0.01)&&near(r.over.camSide,-1.18,0.01),
  'המצלמה מהחלק במערכת המצלמה (בלי העריסה): 50° מעלה, גובה, קדימה וצד ('+[r.over.camPitch,r.over.camH,r.over.camFwd,r.over.camSide]+')');
ok(near(r.over.intakeH,3.54,0.01),'גובה האיסוף מהצירים שמסתובבים ('+r.over.intakeH+')');
ok(r.over.angle===66&&near(r.over.muzzle,12.01,0.01)&&r.over.ratio===1,'מהבלוק sim: זווית, גובה הלוע ותמסורת הירי');
ok(r.over.driveWD===104&&r.over.driveRpm===312&&r.mass===10.5,'הנעה ומסה מהקובץ');
ok(r.spin.filter(s=>/^drive/.test(s)).length===4&&r.spin.some(s=>/^intake/.test(s))&&r.spin.filter(s=>/^fly/.test(s)).length===2&&!r.spin.some(s=>/^undefined/.test(s)),
  'חלקים מסתובבים: 4 גלגלי הנעה, איסוף, 2 בירי; רמפת סוף המשחק לא ('+r.spin.join(",")+')');

// 3. בחירה — הפרמטרים של הרובוט שלי
const s=await page.evaluate(()=>{ __sim.bldSet(-1,"real"); const P=__sim.P, R=__sim.REAL, g=__sim.bot.group;
  const proc=g.children.find(c=>c.name==="procRobot"), hold=g.children.find(c=>c.name==="realRobot"), band=g.children.find(c=>c.userData&&c.userData.allyBand);
  return {P:{botW:P.botW,botL:P.botL,botMass:P.botMass,driveWD:P.driveWD,driveRpm:P.driveRpm,wheelD:P.wheelD,angle:P.angle,muzzle:P.muzzle,camPitch:P.camPitch,camH:P.camH,intakeH:P.intakeH,intakeGap:P.intakeGap,ratio:P.ratio},
    cap:__sim.bldCapMe(),on:R.on,proc:!!proc&&proc.visible===false,hold:!!hold&&hold.visible!==false,band:!!band&&band.visible!==false,
    name:__sim.bldMe().n}; });
ok(s.on&&s.hold&&s.proc,'בשימוש: המודל במקום הרובוט המצויר (המצויר מוסתר, הסמנים נשארים)');
ok(s.band,'פס הברית נשאר גלוי');
ok(near(s.P.botW,14.96)&&near(s.P.botL,16.54)&&near(s.P.botMass,10.5,0.01),'מידות ומסה בפרמטרים ('+[s.P.botW,s.P.botL,s.P.botMass]+')');
ok(s.P.driveWD===104&&s.P.driveRpm===312&&s.P.wheelD===100&&s.P.angle===66&&near(s.P.muzzle,12.01)&&s.P.camPitch===50&&near(s.P.intakeH,3.54)&&s.P.ratio===1,
  'הנעה, ירי, לוע, מצלמה ואיסוף בפרמטרים');
ok(s.P.intakeGap===3&&s.cap===3,'רק פולן (פער גרון צר) ו-3 כדורים במחסנית');

// 4. כיוון: האיסוף מקדימה של הרובוט, הירי מאחור
const dir=await page.evaluate(()=>{ const S=__sim, g=S.bot.group; g.updateMatrixWorld(true);
  const THREE=window.THREE, w=(nm)=>{ let o=null; S.REAL.glb.traverse(x=>{ if(x.name===nm) o=x; }); return o.getWorldPosition(new THREE.Vector3()); };
  const c=g.getWorldPosition(new THREE.Vector3()), f=new THREE.Vector3(Math.sin(S.bot.yaw),0,Math.cos(S.bot.yaw));
  const ri=w("roller#0").sub(c), sh=w("swheel#0").sub(c);
  return {intake:ri.dot(f), shoot:sh.dot(f)}; });
ok(dir.intake>0&&dir.shoot<0,'הכיוון: האיסוף קדימה, גלגל הירי מאחור ('+dir.intake.toFixed(3)+', '+dir.shoot.toFixed(3)+')');

// 5. רמות גרפיקה
const q=await page.evaluate(()=>{ const R=__sim.REAL, o={};
  __sim.qualSet("fast"); o.fast=[R.glb.visible,R.prim.visible]; __sim.qualSet("mid"); o.mid=[R.glb.visible,R.prim.visible];
  __sim.qualSet("high"); o.high=[R.glb.visible,R.prim.visible]; return o; });
ok(!q.fast[0]&&q.fast[1],'רמה מהירה: החלקים הפשוטים');
ok(q.mid[0]&&!q.mid[1]&&q.high[0]&&!q.high[1],'רמה מאוזנת ומלאה: המודל האמיתי');
const clr=await page.evaluate(()=>{ let n=0,t=0; __sim.REAL.prim.traverse(o=>{ if(o.isMesh){ t++; if(o.material.transparent) n++; } }); return {n,t}; });
ok(clr.n===1&&clr.t>=3,'פוליקרבונט שקוף, השאר אטום ('+clr.n+'/'+clr.t+')');

// 6. סיבוב
const sp=await page.evaluate(async()=>{ const R=__sim.REAL, a0=R.spin.map(s=>s.g.rotation[s.ax]);
  __sim.keys&&(__sim.keys["KeyW"]=true); await new Promise(r=>setTimeout(r,700)); __sim.keys&&(__sim.keys["KeyW"]=false);
  return R.spin.filter((s,i)=>s.k!=="intake"&&s.g.rotation[s.ax]!==a0[i]).length; });
ok(sp>=2,'גלגלי הירי וההנעה מסתובבים ('+sp+')');

// 7. מה לא יוצא מהמחשב: ברשת רק סיכום הבנייה, בלי השם וההסבר; באחסון של הדף — כלום מהקובץ
const leak=await page.evaluate(()=>{ let ls=""; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); ls+=k+"="+localStorage.getItem(k); }
  return {ls:/apollo9662-robot|part_types|swheel|sramp/.test(ls)}; });
ok(!leak.ls,'באחסון של הדף אין שום דבר מהקובץ');
const pk=await page.evaluate(()=>__sim.realPackTest());
ok(pk&&pk.n==="רובוט"&&pk.note===""&&!/part|glb|apollo/i.test(JSON.stringify(pk)),'ברשת: בלי השם ובלי ההסבר ('+JSON.stringify(pk&&{n:pk.n,note:pk.note})+')');

// 8. הרובוט נמחק (יצאנו מהקבוצה) — חוזרים לקלאסי והפרמטרים חוזרים
const gone=await page.evaluate(async()=>{ await __sim.realLoadTest(null); const P=__sim.P, g=__sim.bot.group;
  return {sel:__sim.BLD.sel.me, has:__sim.bldAll().some(B=>B.id==="real"), on:__sim.REAL.on, hold:g.children.some(c=>c.name==="realRobot"), angle:P.angle, muzzle:P.muzzle, camPitch:P.camPitch}; });
ok(gone.sel==="classic"&&!gone.has&&!gone.on&&!gone.hold,'אחרי מחיקה: קלאסי, בלי המודל, ולא במוסך');
ok(gone.angle===before.angle&&gone.muzzle===before.muzzle&&gone.camPitch===before.camPitch,'הפרמטרים חזרו לערכי המעבדה ('+[gone.angle,gone.muzzle,gone.camPitch]+')');

// 9. חלונית החשבון (בלי אפליקציה — מצב מדומה)
const html=await page.evaluate(async([d,g])=>{ const b=Uint8Array.from(atob(g),c=>c.charCodeAt(0)).buffer; await __sim.realLoadTest(d,b);
  const A=__sim.ACC, o={}, st=x=>{ A.st=Object.assign({loggedIn:true,team:{code:"X",members:2}},x); return __sim.realAccHTML(); };
  o.ownNo=st({robot:{srv:true,has:false,mine:true}}); o.memNo=st({robot:{srv:true,has:false,mine:false}});
  o.ownSql=st({robot:{srv:false,mine:true}}); o.memSql=st({robot:{srv:false,mine:false}});
  o.ownHas=st({robot:{srv:true,has:true,mine:true,ver:3}}); o.memHas=st({robot:{srv:true,has:true,mine:false,ver:3}});
  o.noTeam=st({team:null,robot:{has:true}}); A.st={}; return o; },[D,G]);
ok(/robotImp/.test(html.ownNo)&&!/robotImp/.test(html.memNo)&&/בעל הקבוצה מעלה/.test(html.memNo),'בלי רובוט: רק הבעלים רואה ״ייבוא״');
ok(/v82_team_robot\.sql/.test(html.ownSql)&&html.memSql==="",'השרת לא מוכן: רק הבעלים רואה שצריך להריץ את הקובץ');
ok(/robotImp/.test(html.ownHas)&&/robotDel/.test(html.ownHas)&&/גרסה 3/.test(html.ownHas),'יש רובוט, בעלים: החלף ומחק');
ok(!/robotImp|robotDel/.test(html.memHas)&&/robotUse|בשימוש/.test(html.memHas),'יש רובוט, חבר: רק ״השתמש בו״');
ok(html.noTeam==="",'בלי קבוצה: אין שורה');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close(); done('v82_robot');
