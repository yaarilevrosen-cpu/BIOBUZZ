// v75 — מוסך: חלקים חדשים שמשנים התנהגות (הנעה, תמסורת, איסוף, העברה, יורה, חיישן), החלון, ופרופילים מהסקאוטינג (04)
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
const clean=()=>E(()=>{ const S=__sim; S.matchStop&&S.matchStop(); for(const b of S.BOTS){ b.on=false; if(b.group) b.group.visible=false; if(b.body){ b.body.collisionResponse=false; b.body.position.set(9,0,9); } }
  for(let i=S.balls.length-1;i>=0;i--){ const b=S.balls[i]; b.body.position.set(S.M(60),S.M(0.5)+i*0.0001,S.M(-66+(i%20)*0.5)); b.body.velocity.set(0,0,0); } S.intake=true; });

// 1. בניות: 12 מוכנות, כולן חוקיות, הקלאסי עדיין קלאסי
let r=await E(()=>{ const S=__sim; const A=S.bldAll(); return {n:S.BLD_PRESETS.length, bad:A.filter(b=>!S.bldCheck(b).ok).map(b=>b.id), cl:S.bldIsClassic(S.bldById('classic')),
  parts:[Object.keys(S.BLD_DRIVE).length,Object.keys(S.BLD_GEAR).length,Object.keys(S.BLD_INTAKE).length,Object.keys(S.BLD_XFER).length,Object.keys(S.BLD_SHOOT).length]}; });
ok(r.n===12&&!r.bad.length&&r.cl,'12 בניות מוכנות, כולן חוקיות, הקלאסי לא השתנה ('+JSON.stringify(r)+')');
ok(r.parts.join()==='6,3,9,7,7','חלקים: 6 שלדות, 3 תמסורות, 9 איסופים, 7 העברות, 7 יורים ('+r.parts.join()+')');

// 2. החלון: לשוניות, כרטיסי חלקים, שרטוט וציונים
r=await E(()=>{ const S=__sim; S.bldOpen('classic'); const m=document.getElementById('bldBox');
  return {tabs:m.querySelectorAll('[data-gtab]').length, parts:m.querySelectorAll('.garPart').length, svg:!!m.querySelector('.garSvg'), stats:m.querySelectorAll('.garStat').length,
    shown:[...m.querySelectorAll('.garPane')].filter(p=>!p.hidden).map(p=>p.dataset.gpane)}; });
ok(r.tabs===6&&r.parts===32&&r.svg&&r.stats===8&&r.shown.join()==='drive','מוסך: 6 לשוניות, 32 כרטיסי חלקים, שרטוט ושמונה ציונים ('+JSON.stringify(r)+')');
r=await E(()=>{ const m=document.getElementById('bldBox'); m.querySelector('[data-gtab="xfer"]').click();
  return [...m.querySelectorAll('.garPane')].filter(p=>!p.hidden).map(p=>p.dataset.gpane).join(); });
ok(r==='xfer','לחיצה על לשונית מראה רק אותה ('+r+')');
// חלק בבנייה מוכנה → עותק שלך
r=await E(()=>{ const S=__sim, m=document.getElementById('bldBox'); const n0=S.BLD.custom.length; S.bldOpen('classic');
  m.querySelector('[data-bopt="xfer|spin"]').click(); const B=S.BLD.custom.find(x=>x.id===S.BLD.edit);
  return {n0, n1:S.BLD.custom.length, custom:!!B, xfer:B&&B.xfer, cap:B&&B.cap, classicXfer:S.bldById('classic').xfer}; });
ok(r.n1===r.n0+1&&r.custom&&r.xfer==='spin'&&r.cap===3&&r.classicXfer==='direct','חלק בבנייה מוכנה יוצר עותק שלך ומשנה רק אותו ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; const out=[]; for(let i=0;i<12;i++){ const B=S.bldRandomBuild(); out.push(S.bldCheck(B).ok); S.bldDel(); } return out.every(Boolean); });
ok(r,'״תפתיע אותי״ — 12 בניות אקראיות, כולן חוקיות');
await E(()=>{ const S=__sim; S.bldDel(); S.bldClose(); });

// 3. העברה וקיבולת: קרוסלה = 3 כדורים, בהטענה, באיסוף ובמחסנית שעל המסך
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'sorter'); S.setPose(0,0,0); S.setClip([]); S.intake=true;
  const ps=S.balls.filter(x=>x.kind==='pollen').slice(0,4); ps.forEach((b,i)=>{ b.body.position.set(S.M(-3+i*2),S.M(1.6),S.M(10.5)); b.body.velocity.set(0,0,0); });
  S.advance(2.5,1/120); return {clip:S.clip.length, cap:S.bldCapMe(), hud:(document.getElementById('mhN')||{}).textContent, feed:S.P.feedTime}; });
ok(r.clip===3&&r.cap===3&&/\/ 3/.test(r.hud)&&r.feed===0.45,'קרוסלה: לכל היותר 3 כדורים, המחסנית מראה ״/ 3״, זמן הזנה 0.45 ('+JSON.stringify(r)+')');
// חיישן צבע: נקטר של היריב לא נלקח, פולן כן
await clean();
r=await E(()=>{ const S=__sim; S.bldSet(-1,'sorter'); S.setPose(0,0,0); S.setClip([]); S.intake=true; const opp=S.myAlly()==='red'?'blue':'red';
  const b=S.balls.find(x=>x.kind===opp); b.body.position.set(S.M(0),S.M(1.6),S.M(10.5)); b.body.velocity.set(0,0,0); S.advance(1.5,1/120); const a=S.clip.slice();
  const p=S.balls.find(x=>x.kind==='pollen'); p.body.position.set(S.M(0),S.M(1.6),S.M(10.5)); p.body.velocity.set(0,0,0); S.advance(1.5,1/120); return {a,b:S.clip.slice()}; });
ok(r.a.length===0&&r.b.join()==='pollen','חיישן צבע: נקטר של היריב לא נלקח, פולן כן ('+JSON.stringify(r)+')');

// 4. צבת: כדור אחד בכל פעם
await clean();
r=await E(()=>{ const S=__sim; S.bldOpen('classic'); const B=S.bldDup(); S.bldEditSet('intake','claw'); S.bldSet(-1,B.id); S.setPose(0,0,0); S.setClip([]); S.intake=true;
  const ps=S.balls.filter(x=>x.kind==='pollen').slice(0,2); ps.forEach((b,i)=>{ b.body.position.set(S.M(-0.6+i*1.2),S.M(1.6),S.M(9.6)); b.body.velocity.set(0,0,0); });
  S.advance(0.45,1/120); const n1=S.clip.length; S.advance(1.6,1/120); const n2=S.clip.length; S.bldSet(-1,'classic'); S.bldDel(); S.bldClose(); return {n1,n2}; });
ok(r.n1<=1&&r.n2===2,'צבת: לא יותר מכדור אחד בחצי שנייה, השני אחר כך ('+JSON.stringify(r)+')');

// 5. יורים: קטפולטה (תקרה קבועה, טעינה איטית), בועט (בלי סיבוב), שני גלגלים (בלי סיבוב, תקרה מלאה)
r=await E(()=>{ const S=__sim; const o={};
  S.bldSet(-1,'catapult'); o.cat={vd:S.vdMe(), spin:S.bldSpinW(S.vdMe(),5), feed:S.P.feedTime, cap:+S.bldShootCap(99,1,'cat').toFixed(2)};
  S.bldSet(-1,'tread'); o.punch={vd:S.vdMe(), spin:S.bldSpinW(S.vdMe(),5), feed:S.P.feedTime};
  S.bldSet(-1,'xspeed'); o.dual={vd:S.vdMe(), spin:S.bldSpinW(S.vdMe(),5), feed:S.P.feedTime, capK:S.bldShootCap(10,1,'dual')};
  S.bldSet(-1,'starter'); o.hood={spin:+S.bldSpinW(S.vdMe(),5).toFixed(3), cap:S.bldShootCap(10,1,'hood')};
  S.bldSet(-1,'classic'); o.cls={vd:S.vdMe(), feed:S.P.feedTime}; return o; });
ok(r.cat.vd==='cat'&&r.cat.spin===-1&&r.cat.feed===1&&r.cat.cap===6.3,'קטפולטה: סיבוב אחורי קטן, טעינה 1.0 שנ׳, תקרה קבועה 6.3 מ׳/ש׳ ('+JSON.stringify(r.cat)+')');
ok(r.punch.spin===0&&r.punch.feed===0.8&&r.dual.spin===0&&r.dual.capK===10&&r.dual.feed===0.3,'בועט: בלי סיבוב וטעינה 0.8; שני גלגלים: בלי סיבוב ותקרה מלאה, הזנה 0.3 ('+JSON.stringify([r.punch,r.dual])+')');
ok(r.hood.spin===-3.5&&r.hood.cap===5&&r.cls.feed===0.35&&r.cls.vd===0,'הוד כמו קודם (סיבוב −0.7, חצי תקרה); חזרה לקלאסי מחזירה הזנה 0.35 ('+JSON.stringify([r.hood,r.cls])+')');
// ירייה של קטפולטה רחוק מדי — מוגבלת בתקרה
r=await E(()=>{ const S=__sim; S.bldSet(-1,'catapult'); const c=S.exitState(20,S.vdMe()); S.bldSet(-1,'classic'); return {v:+c.v.toFixed(2), capped:c.capped}; });
ok(r.capped&&r.v<6.4,'קטפולטה לא יורה מהר מהתקרה שלה ('+JSON.stringify(r)+')');

// 6. הנעה ותמסורת
r=await E(()=>{ const S=__sim; const o={};
  S.bldSet(-1,'xspeed'); o.x={mu:S.P.muWheel, se:S.P.strafeEff, gr:S.P.driveGR};
  S.bldSet(-1,'tread'); o.t={mu:S.P.muWheel, gr:S.P.driveGR};
  S.bldSet(-1,'classic'); o.c={mu:S.P.muWheel, se:S.P.strafeEff, gr:S.P.driveGR}; return o; });
ok(r.x.mu===0.72&&r.x.se===0.93&&r.x.gr===0.8&&r.t.mu===1.08&&r.t.gr===1.3&&r.c.mu===0.85&&r.c.se===0.78&&r.c.gr===1,'X־דרייב מהיר / זחלים חזקים משנים אחיזה, הצידה ותמסורת — והקלאסי חוזר לערכי המעבדה ('+JSON.stringify(r)+')');
const strafe=async(id)=>{ await clean(); await E(id=>{ const S=__sim; S.bldSet(-1,id); S.setPose(0,0,0); },id);
  await E(()=>{ __sim.key('KeyD',true); __sim.advance(1.0,1/120); __sim.key('KeyD',false); __sim.advance(0.3,1/120); });
  return E(()=>Math.abs(__sim.I(__sim.botBody.position.x))); };
const sx=await strafe('xspeed'), st=await strafe('tread'), sm=await strafe('classic');
ok(st<1&&sx>sm,'זחלים לא זזים הצידה ('+st.toFixed(1)+'″); X־דרייב הצידה יותר ממכאנום ('+sx.toFixed(1)+' מול '+sm.toFixed(1)+')');

// 7. בוטים: הבנייה משנה את חמשת הערכים; קלאסי — בדיוק כמו הרמה
r=await E(()=>{ const S=__sim, b=S.BOTS[0], o={};
  S.bldSet(0,'classic'); o.cl=S.skill(b); o.base=S.SKILL[S.GAME.skill]||S.SKILL[1];
  S.bldSet(0,'tread'); o.tr=S.skill(b); S.bldSet(0,'catapult'); o.cat=S.skill(b); S.bldSet(0,'sorter'); o.sr={cap:S.aiCap(b)}; S.bldSet(0,'classic');
  return {clV:o.cl.v, clC:o.cl.cycle, trV:+o.tr.v.toFixed(3), catC:o.cat.cycle, sr:o.sr.cap}; });
ok(r.clV===1&&r.clC===0.95&&r.trV===0.757&&r.catC>=1.15&&r.sr===3,'בוט: קלאסי כמו הרמה; זחלים חזקים איטיים (0.757); קטפולטה יורה לאט; קרוסלה 3 כדורים ('+JSON.stringify(r)+')');

// 8. רשת: החלקים החדשים עוברים, ערכים זרים נדחים
r=await E(()=>{ const S=__sim; const B=S.bldFix({drive:'swerve',gear:'constructor',xfer:'__proto__',cap:9,color:'yes',shoot:'twin',intake:'belt'});
  const pk=S.bldFix(Object.assign({},S.bldById('sorter'))); return {d:B.drive,g:B.gear,x:B.xfer,c:B.cap,col:B.color,sh:B.shoot,pk:[pk.xfer,pk.cap,pk.color]}; });
ok(r.d==='swerve'&&r.g==='std'&&r.x==='direct'&&r.c===4&&r.col===true&&r.sh==='twin'&&r.pk.join()==='spin,3,true','בנייה מאורח: חלקים חדשים עוברים, ״constructor״/״__proto__״ נדחים, קיבולת עד 4 ('+JSON.stringify(r)+')');

// 9. סקאוטינג (04): רק מספרים דמיוניים מ-90001
const pack={version:1,event:"אירוע לבדיקה",schedule:[{match:3,red:[90001,90002],blue:[90003,90004]},{match:8,red:[90003,90001],blue:[90002,90004]}],robots:[
 {team:90001,matches_seen:5,confidence:"high",declared:{drive:"mecanum",speed:"fast",capacity:4},measured:{cycle_sec:10,accuracy:0.8,auto_points:18,defense_share:0}},
 {team:90002,matches_seen:1,confidence:"low",declared:{drive:"tank",speed:"slow",capacity:3,shooter:"turret"},measured:{cycle_sec:22,accuracy:0.5,auto_points:3,defense_share:0.1}},
 {team:90003,matches_seen:4,declared:{drive:"tread",speed:"mid",shooter:"none",lift:true},measured:{cycle_sec:16,accuracy:0.6,auto_points:0,defense_share:0.8}},
 {team:90004,matches_seen:6,confidence:0.9,declared:{drive:"swerve",speed:"fast",shooter:"double"},measured:{cycle_sec:9,accuracy:0.9,auto_points:30}},
 {team:"x"},{team:1.5},{nope:1}]};
r=await E(pk=>{ const S=__sim; S.SCT.ours='90001'; S.sctLoadText(JSON.stringify(pk));
  const by=t=>S.BOTS.find(b=>b.prof&&b.prof.team===t);
  return {on:S.SCT.on, n:S.SCT.pack.n, m:S.SCT.pack.matches.length, partner:(S.BOTS.find(b=>b.ally===S.myAlly()).prof||{}).team,
    opp:S.BOTS.filter(b=>b.ally!==S.myAlly()).map(b=>b.prof&&b.prof.team).sort(),
    b2:{v:+S.skill(by(90002)).v.toFixed(3), cap:S.aiCap(by(90002)), tur:S.bldOf(S.BOTS.indexOf(by(90002))).turret},
    b3:{lift:S.bldOf(S.BOTS.indexOf(by(90003))).lift, shoot:S.bldOf(S.BOTS.indexOf(by(90003))).shoot, role:S.sctRole(by(90003).prof)},
    b4:{v:S.skill(by(90004)).v, auto:S.sctAuto(by(90004).prof)}}; },pack);
ok(r.on&&r.n===4&&r.m===2&&r.partner===90002&&r.opp.join()==='90003,90004','נטענו 4 רובוטים תקינים (3 פגומים נזרקו) ו-2 מאצ׳ים; השותף מהברית שלנו, היריבים מהשנייה ('+JSON.stringify(r)+')');
ok(r.b2.v<1&&r.b2.v>0.75&&r.b2.cap===3&&r.b2.tur===360,'ביטחון נמוך מתערבב: איטי אבל לא עד הסוף ('+r.b2.v+'), 3 כדורים, צריח');
ok(r.b3.lift&&r.b3.shoot==='none'&&r.b3.role==='defend'&&r.b4.v===1&&r.b4.auto==='cycle','מעלית בלי יורה ובולם; מהיר לא עובר את התקרה (1), 30 נק׳ באוטונומי = מחזור מלא ('+JSON.stringify([r.b3,r.b4])+')');
r=await E(()=>{ const S=__sim; const out=[]; for(const t of ['{','[]','{"robots":[]}','{"version":9,"robots":[{"team":90001}]}','{"robots":[{"team":"x"}]}','x'.repeat(2*1024*1024+5)]){ try{ S.sctParse(t); out.push('ok'); }catch(e){ out.push('נדחה'); } } return out; });
ok(r.every(x=>x==='נדחה'),'קבצים פגומים נדחים (6/6)');
r=await E(()=>{ const S=__sim; S.sctPlay(); return {on:S.BOTS.map(b=>b.on), roles:S.BOTS.filter(b=>b.prof).map(b=>b.prof.team+':'+b.role).sort()}; });
ok(r.on.every(Boolean)&&r.roles.join().includes('90003:defend'),'מאץ׳ מלא עם הרובוטים: כולם בזירה, התפקיד מהפרופיל ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.matchStop&&S.matchStop(); const keys=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/9000[234]/.test(localStorage.getItem(k)||'')) keys.push(k); } return keys; });
ok(r.length===0,'פרטיות: אף מפתח באחסון לא מכיל את הקבוצות מהקובץ ('+r.join()+')');
r=await E(()=>{ const S=__sim; S.sctClear(); return {on:S.SCT.on, profs:S.BOTS.filter(b=>b.prof).length, v:S.skill(S.BOTS[0]).v, b:S.bldOf(0).id}; });
ok(!r.on&&r.profs===0&&r.v===1&&r.b!=='sct0','״נקה״ מחזיר בוטים רגילים ('+JSON.stringify(r)+')');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();

// 10. אנגלית: המוסך והסקאוטינג בלי עברית
({browser,page,errs}=await open({noraf:true,play:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
const walkJS=sel=>{ const heb=[]; const walk=n=>{ if(n.nodeType===3&&/[\u0590-\u05FF]/.test(n.data)) heb.push(n.data.trim()); for(const c of n.childNodes||[]) walk(c); }; for(const s of sel) walk(document.querySelector(s)); return heb; };
await page.evaluate(()=>{ __sim.bldOpen('sorter'); });
r=[];
for(const t of ['drive','intake','xfer','shoot','lift','body']){ await page.evaluate(t=>document.querySelector('[data-gtab="'+t+'"]').click(),t); await page.waitForTimeout(150);
  r.push(...await page.evaluate(walkJS,['#bldEdit','#bldList'])); }
await page.evaluate(()=>{ __sim.bldClose(); __sim.sctOpen(); }); await page.waitForTimeout(200);
r.push(...await page.evaluate(walkJS,['#sctBox'])); r=[...new Set(r)].slice(0,12);
await page.evaluate(()=>__sim.sctClose());
ok(r.length===0,'המוסך והסקאוטינג באנגלית — בלי עברית ('+r.join(' | ')+')');
await page.evaluate(()=>localStorage.removeItem('bbLang1'));
await browser.close();
done('v75_garage');
