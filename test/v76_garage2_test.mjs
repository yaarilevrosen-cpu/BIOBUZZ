// v76 — מוסך 2: כוונון (גלגלים, מנוע הנעה, חומר, מהירות איסוף, גלגל תנופה, יחס, זווית), תצוגה תלת־ממדית חיה, וסקאוטינג 2 (כמה כדורים בכמה שניות)
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);

// 1. טבלאות הכוונון: לכל אחת ״כמו במעבדה״ ועוד אפשרויות
let r=await E(()=>{ const S=__sim; return S.BLD_TUNE2.map(([k,T])=>k+':'+('lab' in T)+':'+Object.keys(T).length); });
ok(r.length===8&&r.every(x=>/:true:\d+$/.test(x)&&+x.split(':')[2]>=3),'8 שורות כוונון, בכל אחת ״כמו במעבדה״ ועוד 2 לפחות ('+r.join(' ')+')');

// 2. כוונון משנה את הפרמטרים של הרובוט, וחזרה לקלאסי מחזירה הכול
r=await E(()=>{ const S=__sim, P=S.P; const k0={driveWD:P.driveWD,driveRpm:P.driveRpm,driveNm:P.driveNm,botMass:P.botMass,wheelD:P.wheelD,flyMass:P.flyMass,ratio:P.ratio,angle:P.angle,intakeF:P.intakeF};
  S.bldOpen('classic'); const B=S.bldDup();
  for(const [k,v] of [['wheel','w140'],['dmot','m435'],['mat','steel'],['fw','f120'],['fm','heavy'],['sr','r3'],['ang','a68'],['isp','fast']]) S.bldEditSet(k,v);
  S.bldSet(-1,B.id); const k1={driveWD:P.driveWD,driveRpm:P.driveRpm,driveNm:P.driveNm,botMass:P.botMass,wheelD:P.wheelD,flyMass:P.flyMass,ratio:P.ratio,angle:P.angle,intakeF:P.intakeF};
  const sum=S.bldSum(S.bldMe()).join(' · '), ok1=S.bldCheck(S.bldMe()).ok, sig=S.bldSigOf(S.bldMe());
  S.bldSet(-1,'classic'); const k2={driveWD:P.driveWD,driveRpm:P.driveRpm,driveNm:P.driveNm,botMass:P.botMass,wheelD:P.wheelD,flyMass:P.flyMass,ratio:P.ratio,angle:P.angle,intakeF:P.intakeF};
  S.bldDel(); S.bldClose(); return {k0,k1,k2,sum,ok1,sig}; });
const k=r.k1, k0=r.k0;
ok(k.driveWD===140&&k.driveRpm===435&&Math.abs(k.driveNm-k0.driveNm*k0.driveRpm/435)<0.01,'גלגל 140 מ״מ ומנוע 435 סל״ד: קוטר, סל״ד, ומומנט שיורד ביחס ('+JSON.stringify([k0.driveNm,k.driveNm])+')');
ok(Math.abs(k.botMass-k0.botMass*1.3)<0.01&&k.wheelD===120&&k.flyMass===0.8&&k.ratio===3&&k.angle===68,'פלדה ×1.3 משקל; גלגל תנופה 120 מ״מ, כבד 0.8 ק״ג, יחס 3, זווית 68 ('+JSON.stringify(k)+')');
ok(Math.abs(k.intakeF-k0.intakeF*1.3)<0.01&&r.ok1&&/כוונונים/.test(r.sum)&&r.sig.length>0,'איסוף מהיר ×1.3; הבנייה חוקית והסיכום מראה ״כוונונים״ ('+r.sum+')');
ok(JSON.stringify(r.k2)===JSON.stringify(k0),'חזרה לקלאסי מחזירה את כל ערכי המעבדה ('+JSON.stringify(r.k2)+')');

// 3. בוט עם גלגל קטן ומנוע איטי — איטי יותר; קלאסי בלי כוונון — חתימה ריקה מכוונון
r=await E(()=>{ const S=__sim; const b=S.BOTS[0]; S.bldSet(0,'classic'); const v0=S.skill(b).v;
  S.bldOpen('classic'); const B=S.bldDup(); S.bldEditSet('wheel','w72'); S.bldEditSet('dmot','m117'); S.bldSet(0,B.id); const v1=S.skill(b).v;
  S.bldSet(0,'classic'); S.bldDel(); S.bldClose(); return {v0,v1,cl:S.bldIsClassic(S.bldById('classic')),norm:S.bldNorm({wheel:'zz',dmot:'__proto__'})}; });
ok(r.v1<r.v0*0.8&&r.cl,'בוט עם גלגל 72 מ״מ ומנוע 117 סל״ד איטי בהרבה ('+r.v0+' → '+(+r.v1).toFixed(3)+'); הקלאסי נשאר קלאסי');

// 4. תצוגה תלת־ממדית חיה במוסך + מעבר לשרטוט מלמעלה
r=await E(()=>{ const S=__sim; S.bldOpen('xspeed'); S.gpvShow(S.bldMe&&S.bldById('xspeed')); const pv=document.getElementById('garPv');
  const o={cv:!!(pv&&pv.querySelector('canvas')), kids:S.GPV.b&&S.GPV.b.group?S.GPV.b.group.children.length:0, inMain:S.GPV.b&&S.GPV.b.group?S.GPV.b.group.parent!==S.GPV.sc:true,
    noBody:!S.GPV.b||!S.GPV.b.body, views:document.querySelectorAll('#bldBox [data-gview]').length};
  const t=document.querySelector('#bldBox [data-gview="top"]'); if(t) t.click(); const q=()=>document.getElementById('garPv'); o.top=!!document.querySelector('#bldBox .garTop:not([hidden]) svg'); o.pvHidden=!q()||q().hidden;
  const d=document.querySelector('#bldBox [data-gview="3d"]'); if(d) d.click(); S.gpvShow(S.bldById('xspeed')); o.back=!!q()&&!q().hidden&&!!q().querySelector('canvas'); S.bldClose(); return o; });
ok(r.cv&&r.kids>3&&!r.inMain&&r.noBody,'תצוגה תלת־ממדית: קנבס, רובוט עם חלקים, לא בזירה ובלי גוף פיזיקלי ('+JSON.stringify(r)+')');
ok(r.views===2&&r.top&&r.pvHidden&&r.back,'מעבר בין תלת־ממד לשרטוט מלמעלה ובחזרה ('+JSON.stringify(r)+')');

// 5. ״תפתיע אותי״ עם כוונון — כולן חוקיות, וחלק עם כוונון
r=await E(()=>{ const S=__sim; let good=0,tuned=0; for(let i=0;i<20;i++){ const B=S.bldRandomBuild(); if(S.bldCheck(B).ok) good++; if(S.BLD_TUNE2.some(([k])=>B[k]&&B[k]!=='lab')) tuned++; S.bldDel(); } S.bldClose(); return {good,tuned}; });
ok(r.good===20&&r.tuned>0,'20 בניות אקראיות חוקיות, '+r.tuned+' מהן עם כוונון');

// 6. סקאוטינג 2: כמה כדורים בכמה שניות, חומרה מהפיט, חניה ואמינות (מספרים דמיוניים מ-90001)
const pack={version:1,schedule:[{match:1,red:[90001,90002],blue:[90003,90004]}],robots:[
 {team:90001,matches_seen:5,confidence:"high",declared:{drive:"mecanum"},measured:{cycle_sec:12}},
 {team:90002,matches_seen:6,confidence:0.9,declared:{drive:"mecanum",wheel_mm:102,drive_rpm:400,transfer:"spin",intake_type:"star",color_sensor:true,capacity:4},
   measured:{cycle_sec:12,balls_per_volley:3,volley_sec:1.2,park_end:0,reliability:0.5,main_shoot_zone:"far"}},
 {team:90003,matches_seen:6,confidence:0.9,declared:{drive:"tank"},measured:{cycle_sec:12,balls_per_cycle:3,shoot_sec:9,park_end:1,reliability:1}},
 {team:90004,matches_seen:2,declared:{drive:"swerve"},measured:{cycle_sec:12}}]};
r=await E(pk=>{ const S=__sim; S.SCT.ours='90001'; S.sctLoadText(JSON.stringify(pk)); const by=t=>S.BOTS.find(b=>b.prof&&b.prof.team===t);
  const b2=by(90002), b3=by(90003), B2=S.bldOf(S.BOTS.indexOf(b2));
  return {vb:b2.prof.vb, vs:b2.prof.vs, vb3:b3.prof.vb, vs3:b3.prof.vs, c2:+S.skill(b2).cycle.toFixed(3), c3:+S.skill(b3).cycle.toFixed(3),
    b:{x:B2.xfer,cap:B2.cap,it:B2.intake,col:B2.color,wh:B2.wheel,dm:B2.dmot}, pr:b2.prefRange, fmt:document.querySelector('#sctBox')?1:0}; },pack);
ok(r.vb===3&&r.vs===1.2&&r.vb3===3&&r.vs3===9,'נקראו ״כדורים במטח״ ו״שניות למטח״ (גם בשמות החלופיים) ('+JSON.stringify(r)+')');
ok(r.c2<0.6&&r.c3>2,'3 כדורים ב-1.2 שנ׳ = יריות צפופות ('+r.c2+'); 3 ב-9 שנ׳ = איטי ('+r.c3+')');
ok(r.b.x==='spin'&&r.b.cap===3&&r.b.it==='star'&&r.b.col===true&&r.b.wh==='w104'&&r.b.dm==='m435'&&r.pr===85,'חומרה מהפיט: קרוסלה (3 כדורים), איסוף כוכבים, חיישן צבע, גלגל ומנוע הקרובים ביותר, טווח רחוק ('+JSON.stringify(r.b)+')');

// 7. מאץ׳: חונה 0% → לא חונה; 100% → חונה. אמינות 50% → תקלה אחת לכל היותר
r=await E(()=>{ const S=__sim; S.FAULT&&(S.FAULT.bots=false); S.sctPlay(); const by=t=>S.BOTS.find(b=>b.prof&&b.prof.team===t);
  const b2=by(90002), b3=by(90003); const o={np2:b2.noPark, np3:b3.noPark}; if(S.MATCH) S.MATCH.on=true;
  let faults=0; b2.flt=null; for(let i=0;i<4000;i++){ S.botFaultTick(b2,0.1); if(b2.flt&&b2.flt.k&&!o.prev) faults++; o.prev=!!(b2.flt&&b2.flt.k); }
  o.faults=faults; o.once=!!(b2.flt&&b2.flt.once); b3.flt=null; for(let i=0;i<4000;i++) S.botFaultTick(b3,0.1); o.f3=!!(b3.flt&&b3.flt.k); delete o.prev; S.matchStop&&S.matchStop(); return o; });
ok(r.np2===true&&r.np3===false,'חניה לפי מה שנמדד: 0% לא חונה, 100% חונה ('+JSON.stringify(r)+')');
ok(r.faults<=1&&r.once&&!r.f3,'אמינות 50%: לכל היותר תקלה אחת במאץ׳; אמינות 100% — אף פעם ('+JSON.stringify(r)+')');

// 8. ״במוסך״ ו״לנהוג בו״ — עותק של המערכות בלבד, בלי מספר הקבוצה
r=await E(()=>{ const S=__sim; S.sctOpen(); const n0=S.BLD.custom.length; const i=S.BOTS.findIndex(b=>b.prof&&b.prof.team===90002);
  document.querySelector('#sctBox [data-sctdrive="'+i+'"]').click(); const me=S.bldMe(); const N=S.BLD.custom[S.BLD.custom.length-1];
  const raw=localStorage.getItem('bbBuilds1')||JSON.stringify(S.BLD.custom.map(S.bldPack));
  const o={n:S.BLD.custom.length-n0, same:me.id===N.id, x:me.xfer, team:/9000\d/.test(raw)||/9000\d/.test(JSON.stringify(S.bldPack(N))), name:N.n};
  S.bldSet(-1,'classic'); S.sctClose(); return o; });
ok(r.n===1&&r.same&&r.x==='spin'&&!r.team,'״לנהוג בו״: בנייה חדשה שלי כמו הרובוט, בלי מספר הקבוצה ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.sctClear(); return {on:S.SCT.on, np:S.BOTS.map(b=>b.noPark), pr:S.BOTS.map(b=>b.prefRange)}; });
ok(!r.on&&r.np.every(x=>x===undefined)&&r.pr.every(x=>x===undefined),'״נקה״ מאפס גם חניה וטווח מועדף');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();

// 9. אנגלית: שורות הכוונון בלי עברית
({browser,page,errs}=await open({noraf:true,play:true}));
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
const walkJS=sel=>{ const heb=[]; const walk=n=>{ if(!n) return; if(n.nodeType===3&&/[֐-׿]/.test(n.data)) heb.push(n.data.trim()); for(const c of n.childNodes||[]) walk(c); }; for(const s of sel) walk(document.querySelector(s)); return heb; };
await page.evaluate(()=>{ __sim.bldOpen('classic'); __sim.bldDup(); });
r=[];
for(const t of ['drive','intake','shoot','body']){ await page.evaluate(t=>document.querySelector('[data-gtab="'+t+'"]').click(),t); await page.waitForTimeout(150);
  r.push(...await page.evaluate(walkJS,['#bldEdit'])); }
r=[...new Set(r)].slice(0,12);
await page.evaluate(()=>{ __sim.bldDel(); __sim.bldClose(); localStorage.removeItem('bbLang1'); });
ok(r.length===0,'שורות הכוונון באנגלית — בלי עברית ('+r.join(' | ')+')');
await browser.close();
done('v76_garage2');
