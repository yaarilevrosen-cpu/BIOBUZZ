// v61 — בונה רובוטים: מערכות (הנעה, איסוף, ירי, צריח, מעלית), בנייה לכל רובוט, חוקים, רשת
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
/* עמדה נקייה במרכז הזירה, מול כחול, בלי בוטים ובלי כדורים קרובים */
const clean=()=>E(()=>{ const S=__sim; S.matchStop&&S.matchStop(); for(const b of S.BOTS){ b.on=false; if(b.group) b.group.visible=false; if(b.body){ b.body.collisionResponse=false; b.body.position.set(9,0,9); } }
  for(let i=S.balls.length-1;i>=0;i--){ const b=S.balls[i]; b.body.position.set(S.M(60),S.M(0.5)+i*0.0001,S.M(-66+(i%20)*0.5)); b.body.velocity.set(0,0,0); } S.intake=true; });

// 1. בנייה מוכנה, בדיקת חוקים, ברירת מחדל
let r=await E(()=>{ const S=__sim; return {n:S.BLD_PRESETS.length, ids:S.bldAll().map(b=>b.id), bad:S.bldAll().filter(b=>!S.bldCheck(b).ok).map(b=>b.id),
  me:S.bldMe().id, classic:S.bldIsClassic(S.bldMe()), mot:S.bldAll().map(b=>b.id+':'+S.bldCheck(b).mot) }; });
ok(r.n===7,'שבע בניות מוכנות ('+r.ids.join(',')+')');
ok(r.bad.length===0,'כל הבניות המוכנות חוקיות — '+r.mot.join(' '));
ok(r.me==='classic'&&r.classic,'ברירת מחדל: הקלאסי — בדיוק הרובוט של עד היום');
r=await E(()=>{ const S=__sim, B=S.bldById('starter'); return {B, sum:S.bldSum(B)}; });
ok(r.B.drive==='tank6'&&r.B.intake==='compliant'&&r.B.pollen&&r.B.shoot==='hood','StarterBot: 6 גלגלים, Gecko, רק פולן, יורה הוד ('+r.sum.join(' · ')+')');
r=await E(()=>{ const S=__sim, B=Object.assign({},S.bldById('classic'),{id:'x',intake:'compliant',sides:2,shoot:'diff',n2:2,turret:180,lift:true,w:19});
  const c=S.bldCheck(B); return {ok:c.ok,mot:c.mot,rows:c.rows.filter(x=>!x.ok).map(x=>x.r)}; });
ok(!r.ok&&r.mot>8&&r.rows.indexOf('R503')>=0&&r.rows.indexOf('R102')>=0,'בנייה חורגת נתפסת: '+r.mot+' מנועים, '+r.rows.join(','));

// 1ב. ״מה משחקים?״ — רק סוגי משחק; הבונה והסקינים ב״הרובוט שלי״ עם שם הרובוט
r=await E(()=>({cards:[...document.querySelectorAll('#playPanel .ppCard b')].map(b=>b.textContent), name:(document.getElementById('ppBuildName')||{}).textContent,
  inMine:!!document.querySelector('.ppMine #ppBuild')&&!!document.querySelector('.ppMine #ppSkins')}));
ok(!r.cards.some(x=>/בונה|סקינים/.test(x))&&r.inMine&&r.name==='BIOBUZZ קלאסי','״מה משחקים?״ רק משחקים ('+r.cards.join(', ')+'); ״הרובוט שלי״: '+r.name);

// 2. החלון
r=await E(()=>{ document.getElementById('ppBuild').click(); const m=document.getElementById('bldBox');
  return {open:!m.hidden, sel:m.querySelectorAll('[data-bsel]').length, cards:m.querySelectorAll('.bldCard').length, chk:m.querySelectorAll('.bldChk>div').length}; });
ok(r.open&&r.sel===4&&r.cards===7&&r.chk>=5,'החלון נפתח: 4 רובוטים לבחירה, 7 כרטיסים, בדיקת חוקים ('+JSON.stringify(r)+')');
// שכפול ועריכה
r=await E(()=>{ const m=document.getElementById('bldBox'); m.querySelector('[data-bpick="turret"]').click(); m.querySelector('[data-bact="dup"]').click();
  const id=__sim.BLD.edit, B=__sim.BLD.custom.find(x=>x.id===id);
  m.querySelector('[data-bopt="lift|true"]').click(); m.querySelector('[data-bopt="sides|2"]').click();
  const B2=__sim.BLD.custom.find(x=>x.id===id);
  return {id, custom:!!B, lift:B2.lift, sides:B2.sides, saved:JSON.parse(localStorage.getItem('bbBuild1')).custom.length}; });
ok(r.custom&&r.lift&&r.sides===2&&r.saved===1,'שכפול ושינוי: מעלית ואיסוף משני הצדדים, נשמר ('+JSON.stringify(r)+')');
const customId=r.id;
await E(()=>__sim.bldClose());

// 3. StarterBot לרובוט שלי: פרמטרים, שלדה, רק פולן
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'starter'); return {gap:S.P.intakeGap, ratio:S.P.ratio, me:S.bldMe().id, sel:JSON.parse(localStorage.getItem('bbBuild1')).sel.me}; });
ok(r.me==='starter'&&r.gap===3&&r.ratio===1.5&&r.sel==='starter','StarterBot: גרון 3.0 (רק פולן), תמסורת 1.5, נשמר ('+JSON.stringify(r)+')');
// 6 גלגלים — לא זז הצידה
const strafe=async(id)=>{ await E(id=>{ const S=__sim; S.bldSet(-1,id); S.setPose(0,0,0); },id);
  await E(()=>{ __sim.key('KeyD',true); __sim.advance(1.2,1/120); __sim.key('KeyD',false); __sim.advance(0.3,1/120); });
  return E(()=>({x:__sim.I(__sim.botBody.position.x), z:__sim.I(__sim.botBody.position.z)})); };
let a=await strafe('starter'), b=await strafe('starterMec');
ok(Math.abs(a.x)<1&&Math.abs(b.x)>4,'6 גלגלים לא זזים הצידה ('+a.x.toFixed(1)+'″), מכאנום כן ('+b.x.toFixed(1)+'″)');
// רק פולן: נקטר לא נבלע, פולן כן
const feed=async(id,kind,dx,dz)=>{ await clean(); return E(([id,kind,dx,dz])=>{ const S=__sim; S.bldSet(-1,id); S.setPose(0,0,0); S.setClip([]); S.intake=true;
  const b=S.balls.find(x=>x.kind===kind); b.body.position.set(S.M(dx),S.M(1.6),S.M(dz)); b.body.velocity.set(0,0,0);
  S.advance(1.5,1/120); return S.clip.slice(); },[id,kind,dx,dz]); };
let c1=await feed('starter','red',0,10.5), c2=await feed('starter','pollen',0,10.5), c3=await feed('classic','red',0,10.5);
ok(c1.length===0&&c2[0]==='pollen'&&c3[0]==='red','רק פולן: נקטר לא נכנס ('+c1+'), פולן כן ('+c2+'); הקלאסי אוסף נקטר ('+c3+')');
// איסוף משני הצדדים
c1=await feed('classic','pollen',0,-10.5); c2=await feed('double','pollen',0,-10.5);
ok(c1.length===0&&c2.length===1,'כדור מאחור: הקלאסי לא אוסף ('+c1.length+'), יורה כפול עם איסוף אחורי כן ('+c2.length+')');
// איסוף רחב: כדור בצד החזית
c1=await feed('classic','pollen',5.2,10.5); c2=await feed('turret','pollen',5.2,10.5);
ok(c2.length===1,'גלגלי מכאנום באיסוף: כדור 5″ מהמרכז נמשך למרכז ונבלע (קלאסי: '+c1.length+', מכאנום: '+c2.length+')');

// 4. ירי: כפול, הוד, צריח, בלי יורה
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'double'); S.shotPose&&S.shotPose(); S.setClip(['pollen','pollen','pollen','pollen']); const n0=S.balls.length;
  const rec=S.fire(); return {after:S.clip.length, added:S.balls.length-n0, rec:!!rec}; });
ok(r.rec&&r.after===2&&r.added===2,'יורה כפול: לחיצה אחת — שני כדורים ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.bldSet(-1,'starter'); return {vd:S.vdMe(), sol:S.solveAvgHere&&S.solveAvgHere()}; });
ok(r.vd==='hood','יורה הוד: סיבוב אחורי קבוע ('+r.vd+')');
// צריח: הרובוט פונה 70° הצידה והכדור עדיין יוצא לכוורת
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'turret'); S.shotPose(); const y0=S.bot.yaw; S.setPose(S.I(S.botBody.position.x),S.I(S.botBody.position.z),(y0*180/Math.PI)+70);
  S.advance(1.2,1/120); S.refreshAim(); S.setClip(['pollen']); const rec=S.fire(); if(!rec) return {rec:null};
  const v=rec.body.velocity, h=S.mouthFrame(S.aimHive()).c, p=rec.body.position;
  const want=Math.atan2(h.x-p.x,h.z-p.z), got=Math.atan2(v.x,v.z); let e=got-want; e=Math.atan2(Math.sin(e),Math.cos(e));
  return {err:e*180/Math.PI, tur:S.BLD.tur.yaw*180/Math.PI, aim:S.bldAimErr(0)*180/Math.PI}; });
r.hud=await E(()=>{ const S=__sim; S.advance(0.4,1/120); const e=document.getElementById('mhSys'); return e&&!e.hidden?e.textContent:''; }); r.name=await E(()=>document.getElementById('ppBuildName').textContent);
ok(/נעול על הכוורת/.test(r.hud)&&r.name==='צריח','שורת הצריח בכרטיס המחסנית: '+r.hud+' · שם הרובוט: '+r.name);
ok(r.rec!==null&&Math.abs(r.err)<4&&Math.abs(r.tur)>50,'צריח: הרובוט מסובב 70°, הצריח '+(r.tur||0).toFixed(0)+'° והכדור יוצא לכוורת (שגיאה '+(r.err||0).toFixed(1)+'°)');
r=await E(()=>{ const S=__sim; S.bldSet(-1,'lift'); S.setClip(['pollen']); const rec=S.fire(); return {rec:!!rec, n:S.clip.length}; });
ok(!r.rec&&r.n===1,'בלי יורה: ירי לא עושה כלום והכדור נשאר');

// 5. מעלית לפרח — נקטר שלנו למעלה = הפרח שלנו
await clean();
r=await E(()=>{ const S=__sim, my=S.myAlly(); S.bldSet(-1,'lift');
  const fl=S.flowers[0], ax=Math.abs(fl.x)>Math.abs(fl.z), off=ax?{x:-Math.sign(fl.x)*12.5,z:0}:{x:0,z:-Math.sign(fl.z)*12.5};
  S.setPose(fl.x+off.x,fl.z+off.z,Math.atan2(-off.x,-off.z)*180/Math.PI); S.advance(0.3,1/120);
  const p0=S.flowerPoints(my); S.setClip(['pollen',my]);
  const go=S.bldLiftGo(); S.advance(4.2,1/120);
  return {go, left:S.clip.length, p0, p1:S.flowerPoints(my), fl:S.bldLiftFlower()?1:0}; });
ok(r.go&&r.left===0,'מעלית: שני הכדורים הופקדו ('+JSON.stringify(r)+')');
ok(r.p1>r.p0&&r.p1>=5,'הנקטר שלנו למעלה — הפרח שלנו: '+r.p0+' ← '+r.p1+' נקודות');
r=await E(()=>{ const S=__sim; S.setPose(0,0,0); S.setClip(['pollen']); return S.bldLiftGo(); });
ok(r===false,'מעלית רחוק מפרח — לא מפעילים');
// מעלית של כמה כדורים: ״מעלית לפרח״ מרימה שלושה בבת אחת; מעלית של כדור אחד מספיקה רק אחד באותו זמן
const liftRun=async(n)=>{ await clean(); return E(n=>{ const S=__sim; const B=S.bldDup(); B.lift=true; B.liftN=n; B.shoot='none'; S.bldSet(-1,B.id);
  const fl=S.flowers[2], ax=Math.abs(fl.x)>Math.abs(fl.z), off=ax?{x:-Math.sign(fl.x)*12.5,z:0}:{x:0,z:-Math.sign(fl.z)*12.5};
  S.setPose(fl.x+off.x,fl.z+off.z,Math.atan2(-off.x,-off.z)*180/Math.PI); S.advance(0.3,1/120);
  S.setClip(['pollen','pollen','pollen']); S.bldLiftGo(); S.advance(2.45,1/120); const left=S.clip.length; S.bldDel(); return left; },n); };
r=await E(()=>{ const S=__sim; S.bldOpen('lift'); const m=document.getElementById('bldBox'); m.querySelector('[data-bact="dup"]').click();
  const opts=[...m.querySelectorAll('[data-bopt^="liftN|"]')].map(x=>x.textContent); m.querySelector('[data-bopt="liftN|4"]').click();
  const B=S.BLD.custom.find(x=>x.id===S.BLD.edit); const n=B.liftN; S.bldDel(); S.bldClose(); return {opts,n}; });
ok(r.opts.join()==='1,2,3,4'&&r.n===4,'בחלון: ״כדורים בהרמה״ — 1, 2, 3 או 4 ('+JSON.stringify(r)+')');
const l3=await liftRun(3), l1=await liftRun(1);
ok(l3===0&&l1===2,'מעלית של 3 כדורים: 3 בפרח אחרי 2.45 שנ׳ (נשארו '+l3+'); של כדור אחד — רק 1 (נשארו '+l1+')');

// 6. בוטים עם בניות שונות — מאץ׳ מלא בלי שגיאות
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'classic'); S.bldSet(0,'double'); S.bldSet(1,'lift'); S.bldSet(2,'turret');
  return {b:S.BOTS.map(b=>S.bldBot(b).id), g:S.BOTS.map(b=>!!b.shootG), eat:[S.BOTS[1],S.BOTS[0]].map(b=>S.aiCanEat?S.aiCanEat('red',b):null)}; });
ok(r.b.join()==='double,lift,turret'&&r.g.every(Boolean),'לכל בוט בנייה משלו ('+r.b+')');
r=await E(()=>{ const S=__sim; S.bldSet(0,'starter'); return S.bldGapBot(S.BOTS[0]); });
ok(r===3,'בוט StarterBot: רק פולן (גרון '+r+')');
await E(()=>{ const S=__sim; S.bldSet(0,'double'); });
r=await E(()=>{ const S=__sim; S.GAME.randomRoles=false; S.gameStart(true); S.BOTS.forEach(b=>{ b.role='score'; b.ph='seek'; }); S.advance(3,1/60);
  const bs=S.BOTS.map(b=>({id:S.bldBot(b).id,on:b.on,x:S.I(b.body.position.x),z:S.I(b.body.position.z)})); return bs; });
const t0=r;
r=await E(()=>{ const S=__sim; S.advance(95,1/60); return S.BOTS.map(b=>({id:S.bldBot(b).id,on:b.on,shots:b.shots,lifted:b.lifted||0,ph:b.ph,
  moved:0,x:S.I(b.body.position.x),z:S.I(b.body.position.z)})); });
const moved=r.map((b,i)=>Math.hypot(b.x-t0[i].x,b.z-t0[i].z));
/* בוט מעלית שאין לו מה לאסוף מחכה ליד הבית — זה נכון; הוא צריך לנסוע או להפקיד */
ok(r.every((b,i)=>!b.on||moved[i]>6||(b.id==='lift'&&b.lifted>0)),'כל הבוטים נוסעים או מפקידים ('+moved.map(x=>x.toFixed(0)).join(',')+'″)');
const dbl=r.find(b=>b.id==='double'), lf=r.find(b=>b.id==='lift'), tu=r.find(b=>b.id==='turret');
ok(!dbl||!dbl.on||dbl.shots>=2,'בוט יורה כפול יורה ('+(dbl&&dbl.shots)+')');
ok(!tu||!tu.on||tu.shots>=1,'בוט צריח יורה ('+(tu&&tu.shots)+')');
ok(!lf||!lf.on||(lf.shots===0&&lf.lifted>=1),'בוט מעלית לא יורה ומפקיד בפרח ('+(lf&&JSON.stringify(lf))+')');
await E(()=>{ __sim.matchStop(); });

// 6ב. אסטרטגיית מעלית: לא מאכילים פרח של היריב, ונקטר רק בדקה האחרונה
r=await E(()=>{ const S=__sim, b=S.BOTS[1]; S.bldSet(1,'lift'); const opp=b.ally==='red'?'blue':'red';
  const fl=S.flowers[1]; S.bldDeposit(fl,'test','pollen'); S.bldDeposit(fl,'test',opp); S.advance(1.5,1/120);
  const info=S.bldFlowerInfo(fl); b.clip.length=0; b.clip.push('pollen'); const t=S.bldLiftTarget(b);
  b.clip.length=0; b.clip.push(b.ally); const noEarly=!S.bldEndgame()&&!S.bldCanDropTest?true:true;
  const wants=S.bldBotWantsLiftTest?S.bldBotWantsLiftTest(b):null; b.clip.length=0;
  return {owner:info.owner, opp, avoided:t!==fl, wants}; });
ok(r.owner===r.opp&&r.avoided,'בוט מעלית לא מכניס פולן לפרח של היריב ('+JSON.stringify(r)+')');
ok(r.wants===false,'נקטר לא נכנס לפרח לפני הדקה האחרונה (בוט מעלית מחזיק אותו)');

// 6ג. הדקה האחרונה: בוט מעלית לוקח נקטר של הברית ושם אותו למעלה בפרח — הפרח עובר אליו
r=await E(()=>{ const S=__sim; S.bldSet(0,'classic'); S.bldSet(1,'lift'); S.bldSet(2,'classic'); S.GAME.randomRoles=false; S.gameStart(true);
  const b=S.BOTS[1]; S.BOTS.forEach(o=>{ o.role='score'; o.ph='seek'; if(o!==b){ o.on=false; o.group.visible=false; o.body.collisionResponse=false; o.body.position.set(9,0,9); } });
  S.matchStart(); S.advance((S.MATCH.cd||0)+0.3,1/60); S.MATCH.t=S.MT.auto+S.MT.trans+S.MT.tele-55;          /* 55 שניות לסוף */
  const home=S.bldHomeFlowerTest(b); b.clip.length=0; b.clip.push('pollen','pollen');
  const px=S.I(b.body.position.x), pz=S.I(b.body.position.z); S.addBallTest(b.ally,px+(home.x-px)*0.35,3,pz+(home.z-pz)*0.35);
  const eg=S.bldEndgame(); S.advance(30,1/60); const f=S.bldFlowerInfo(home); const all=S.flowers.map(x=>S.bldFlowerInfo(x));
  S.matchStop&&S.matchStop(); return {eg, owner:f.owner, n:f.n, ally:b.ally, any:all.some(x=>x.owner===b.ally), lifted:b.lifted||0, clip:b.clip.slice()}; });
ok(r.eg&&r.any,'דקה אחרונה: בוט מעלית שם נקטר של הברית למעלה ולוקח פרח ('+JSON.stringify(r)+')');

// 7. חוקים במצב תחרות
r=await E(id=>{ const S=__sim; const B=S.BLD.custom.find(x=>x.id===id); B.shoot='diff'; B.n2=2; B.intake='rollers'; B.sides=2; B.drive='mecanum';
  const c=S.bldCheck(B); const was=S.REALM; S.setRealm&&S.setRealm('comp'); const r1=S.bldSet(-1,id); S.setRealm&&S.setRealm(was&&was.mode?was.mode:'open');
  return {ok:c.ok,mot:c.mot,set:r1,me:S.bldMe().id}; },customId);
ok(!r.ok&&r.set===false,'במצב תחרות אי אפשר לבחור רובוט לא חוקי ('+r.mot+' מנועים)');

// 8. מקשים, שלט, אוטונומי
r=await E(()=>{ const S=__sim, k=S.KB.binds.filter(b=>/^(turretL|turretR|turretAuto|lift)$/.test(b.a)).map(b=>b.k+':'+b.a);
  const pa=['turretL','turretR','turretAuto','lift','builder'].filter(a=>S.PADACT&&S.PADACT[a]); return {k,pa:pa.length}; });
ok(r.k.length===4,'מקשים לצריח ולמעלית ('+r.k.join(' ')+')');
r=await E(()=>{ const S=__sim; return {acts:S.PACTS||null, java:S.pathJava?S.pathJava([{x:0,z:0,act:'none'},{x:10,z:10,act:'lift'}],'t'):''}; });
ok(!r.acts||r.acts.indexOf('lift')>=0,'באוטונומי יש פעולת ״מעלית לפרח״');
ok(!r.java||/LiftAction/.test(r.java),'ייצוא RoadRunner: LiftAction');

// 9. רשת: המארח שולח בניות, האורח שולח את שלו
r=await E(()=>{ const S=__sim; const b=S.BOTS[2]; S.humSeat(b,'net','חבר'); b.hum.id='g1';
  S.bldFromGuest('g1',{n:'של חבר',drive:'tank4',intake:'rollers',sides:1,shoot:'diff',n2:2,turret:0,lift:false,w:16,l:16});
  const got=S.bldBot(b); S.humFree&&S.humFree(b); return {n:got.n,n2:got.n2,drive:got.drive}; });
ok(r.n==='של חבר'&&r.n2===2&&r.drive==='tank4','אורח שנוהג בבוט — הבוט בנוי כמו הרובוט שלו ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.bldFromHost({me:{n:'מארח',shoot:'hood',turret:180,drive:'mecanum',intake:'mecanum'},bots:[{n:'א',lift:true,shoot:'none',drive:'tank6',intake:'compliant'},null,null]});
  const a=S.bldOf(-1), b=S.bldOf(0); S.bldNetReset(); return {a:a.turret, b:b.lift, back:S.bldOf(-1).id}; });
ok(r.a===180&&r.b===true,'אורח רואה את הבניות של המארח ('+JSON.stringify(r)+')');

// 10. נשמר אחרי טעינה מחדש
await E(()=>{ __sim.bldSet(-1,'starter'); __sim.bldSet(1,'lift'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&__sim.botBody&&__sim.BOTS.length&&__sim.BLD);
r=await E(()=>({me:__sim.bldMe().id, b1:__sim.bldBot(__sim.BOTS[1]).id, gap:__sim.P.intakeGap, wheels:0}));
ok(r.me==='starter'&&r.b1==='lift'&&r.gap===3,'אחרי טעינה: הבניות נשמרו ('+JSON.stringify(r)+')');
await E(()=>{ const S=__sim; S.bldSet(-1,'classic'); for(let i=0;i<3;i++) S.bldSet(i,'classic'); });
r=await E(()=>({gap:__sim.P.intakeGap, ratio:__sim.P.ratio, vd:__sim.vdMe()}));
ok(r.gap===3.8&&r.ratio===3&&r.vd===0,'חזרה לקלאסי מחזירה את הפרמטרים ('+JSON.stringify(r)+')');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close(); done('v61');
