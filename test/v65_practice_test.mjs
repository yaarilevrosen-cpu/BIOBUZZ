// v65 — תרגול מול בוטים (בלי שעון) ומהירות ירי אוטומטית לפי המרחק
import {open,ok,done,realErrs} from './h.mjs';
const HEB=/[֐-׿]/;
const {browser,page,errs}=await open({noraf:true,play:true});

/* ── 1. הכרטיס והחלון ── */
const a=await page.evaluate(()=>{ const S=__sim, out={};
  localStorage.removeItem('bbPractice1');
  const c=document.getElementById('ppPractice'); out.card=!!c; out.inPanel=!!(c&&c.closest('#playPanel'));
  out.next=!!(c&&c.previousElementSibling&&c.previousElementSibling.id==='ppFree');
  c.click();
  const m=document.getElementById('pracBox'); out.open=!m.hidden;
  out.rows=[...m.querySelectorAll('.pracRow')].map(r=>r.dataset.pi).join(',');
  const cfg=S.PRAC.cfg; out.def=JSON.stringify(cfg);
  out.lvlOn=[...m.querySelectorAll('[data-plvl].on')].map(x=>x.dataset.plvl).join(',');
  out.offDisabled=[...m.querySelectorAll('.pracRow.off [data-prole]')].every(x=>x.disabled);
  out.home=S.cmdkCurated?S.cmdkCurated().some(x=>x.id==='practice'):null;
  out.cmdkAuto=S.cmdkCurated?S.cmdkCurated().some(x=>x.id==='autov'&&/auto speed/.test(x.k)&&/distance/.test(x.k)):null;
  return out; });
ok(a.card&&a.inPanel&&a.next,'כרטיס ״תרגול מול בוטים״ בלוח ״מה משחקים?״, ליד נסיעה חופשית');
ok(a.open,'לחיצה על הכרטיס פותחת את החלון');
ok(a.rows==='2,0,1','שלוש שורות: שותף, יריב 1, יריב 2');
ok(a.def==='{"bots":[{"on":true,"role":"defend"},{"on":false,"role":"score"},{"on":false,"role":"score"}],"skill":1}','ברירת מחדל: יריב 1 בולם, השאר כבויים, רמה ממוצעת');
ok(a.lvlOn==='1','רמה ״ממוצעת״ מסומנת');
ok(a.offDisabled,'בורר התפקיד כבוי בבוט שלא בזירה');
if(a.home!==null) ok(a.home&&a.cmdkAuto,'בחיפוש (Ctrl+K): תרגול מול בוטים ומהירות ירי אוטומטית (auto speed / distance)');

/* Esc סוגר */
await page.waitForTimeout(80);
await page.keyboard.press('Escape');
ok(await page.evaluate(()=>document.getElementById('pracBox').hidden),'Esc סוגר את החלון');

/* ── 2. התחלה עם בוטים, תפקידים ורמה — בלי מאץ׳ ובלי שעון ── */
const keys=['bbSeason1','biobuzz_records_v1','bbBotMem1','bbDrill1','bbStats1'];
const b=await page.evaluate((keys)=>{ const S=__sim, I=S.I, out={};
  out.before=keys.map(k=>localStorage.getItem(k));
  document.getElementById('ppPractice').click();
  const m=document.getElementById('pracBox');
  m.querySelector('[data-pon="1"]').click();                      /* יריב 2 נכנס */
  m.querySelector('[data-prole="1|score"]').click();              /* ... כמנקד */
  m.querySelector('[data-plvl="2"]').click();                     /* אלופה */
  const rf=document.getElementById('pracRef'); if(rf.checked) rf.click();
  document.getElementById('pracGo').click();
  out.closed=m.hidden;
  out.ls=localStorage.getItem('bbPractice1');
  out.bots=S.BOTS.slice(0,3).map(b=>(b.on?'on':'off')+':'+b.role).join(' ');
  out.skill=S.GAME.skill; out.full=S.GAME.full; out.match=S.MATCH.on; out.cd=S.MATCH.cd;
  out.act=S.pracActive(); out.card=document.getElementById('ppPractice').classList.contains('on');
  out.free=document.getElementById('ppFree').classList.contains('on');
  out.clk=document.getElementById('clkPhase').textContent+' | '+document.getElementById('clkNote').textContent;
  out.clkBtn=getComputedStyle(document.getElementById('clkPrac')).display!=='none';
  out.nomatch=document.body.classList.contains('nomatch');
  const me=S.botBody.position, D=()=>Math.hypot(I(S.BOTS[0].body.position.x-me.x),I(S.BOTS[0].body.position.z-me.z));
  out.d0=D(); let dmin=out.d0;
  for(let i=0;i<300;i++){ S.advance(0.1,1/60); dmin=Math.min(dmin,D()); }
  out.dmin=dmin; out.shots=S.BOTS.map(b=>b.shots); out.t=S.MATCH.t; out.match2=S.MATCH.on; out.ph=S.MATCH.phase;
  out.after=keys.map(k=>localStorage.getItem(k));
  out.replay=S.REPLAY&&S.REPLAY.frames?S.REPLAY.frames.length:0;
  return out; },keys);
console.log('   ',JSON.stringify({bots:b.bots,shots:b.shots,d0:Math.round(b.d0),dmin:Math.round(b.dmin),clk:b.clk}));
ok(b.closed,'״התחל תרגול״ סוגר את החלון');
ok(b.bots==='on:defend on:score off:score','הבוטים שנבחרו בזירה, בתפקידים שנבחרו (יריב 1 בולם, יריב 2 מנקד, שותף כבוי)');
ok(b.skill===2,'רמת הבוטים — אלופה');
ok(!b.full&&!b.match&&!(b.cd>0),'אין מאץ׳: GAME.full כבוי, MATCH לא רץ, אין ספירה');
ok(b.act&&b.card&&!b.free,'הכרטיס ״תרגול מול בוטים״ מסומן כפעיל (ולא נסיעה חופשית)');
ok(/תרגול מול בוטים/.test(b.clk)&&/בלי שעון/.test(b.clk)&&b.nomatch,'בשעון: ״תרגול מול בוטים · בלי שעון״, בלי שעון רץ');
ok(b.clkBtn,'כפתור ״⚙ בוטים״ ליד השעון בזמן תרגול');
ok(b.shots[1]>=1,`אחרי 30 שנ׳ המנקד ירה (${b.shots[1]} יריות)`);
ok(b.dmin<b.d0-40,`הבולם נסע אליי (${Math.round(b.d0)}″ ← ${Math.round(b.dmin)}″)`);
ok(!b.match2&&b.ph!=="סיום",'גם אחרי 30 שנ׳ — אין מאץ׳ ואין ״סיום״');
ok(JSON.stringify(b.before)===JSON.stringify(b.after),'שום דבר לא נכתב לעונה, לשיאים, לזיכרון הבוטים או לתרגילים');
ok(b.replay===0,'לא נאסף שידור חוזר');
ok(b.ls==='{"bots":[{"on":true,"role":"defend"},{"on":true,"role":"score"},{"on":false,"role":"score"}],"skill":2}','הבחירות נשמרו ב-bbPractice1');

/* שותף מנקד לבד — גם הוא יורה בלי מאץ׳; בנסיעה חופשית הבוטים יורדים */
const c=await page.evaluate(()=>{ const S=__sim, out={};
  S.PRAC.cfg={bots:[{on:false,role:'defend'},{on:false,role:'score'},{on:true,role:'score'}],skill:1};
  out.ok=S.pracStart(); for(let i=0;i<300;i++) S.advance(0.1,1/60);
  out.bots=S.BOTS.slice(0,3).map(b=>b.on?1:0).join(''); out.shots=S.BOTS[2].shots; out.skill=S.GAME.skill;
  out.labSkill=[...document.querySelectorAll('[data-skill].on')].map(x=>x.dataset.skill).join(',');
  document.getElementById('ppFree').click();
  out.freeBots=S.BOTS.filter(b=>b.on).length; out.act=S.pracActive(); out.last=S.ppLast();
  out.clkBtn=getComputedStyle(document.getElementById('clkPrac')).display!=='none';
  return out; });
ok(c.ok&&c.bots==='001'&&c.shots>=1,`שותף מנקד לבד — ירה ${c.shots} יריות בלי מאץ׳`);
ok(c.skill===1&&c.labSkill==='1','הרמה חלה גם על בורר הרמה במעבדה');
ok(c.freeBots===0&&!c.act&&c.last==='free'&&!c.clkBtn,'״נסיעה חופשית״ עוצרת את התרגול ומורידה את הבוטים');

/* מסך מפוצל — הכרטיס כבוי, ולחיצה מסבירה ולא פותחת */
const d=await page.evaluate(()=>{ const S=__sim, out={};
  S.splitSet(true); S.ppRefresh&&S.ppRefresh();
  const pc=document.getElementById('ppPractice');
  out.dis=pc.classList.contains('dis')&&pc.getAttribute('aria-disabled')==='true'&&!!pc.title;
  out.open=S.pracOpen(); out.hidden=document.getElementById('pracBox').hidden;
  out.toast=(document.getElementById('refToast')||{}).textContent||'';
  S.splitSet(false); return out; });
ok(d.dis&&!d.open&&d.hidden&&/מסך מפוצל/.test(d.toast),'במסך מפוצל הכרטיס כבוי עם הסבר, והחלון לא נפתח');

/* ── 3. מהירות ירי אוטומטית לפי המרחק ── */
const e=await page.evaluate(()=>{ const S=__sim, out={};
  const at=(x,z)=>{ S.setPose2(x,z,0); S.refreshAim(); S.AUTOV.t=9; S.shotHud(0); };
  const pp=document.getElementById('ppAutoV'), kl=document.getElementById('kLock'), st=document.getElementById('setAutoV');
  out.exists=!!pp&&!!st&&!!pp.closest('#playPanel')&&!!st.closest('#setBody');
  out.def=S.autoVOn()&&pp.checked&&kl.checked&&st.checked;
  /* שני מקומות מול הפתח (הכוורת האדומה ב-(−13, 15), הפתח פונה לקהל), ואחד מאחוריה */
  at(-40,40); const v1=S.P.vAvg, s1=S.solveAvgHere();
  at(60,60); const v2=S.P.vAvg, s2=S.solveAvgHere();
  out.v1=v1; out.v2=v2; out.s1=s1; out.s2=s2;
  out.line1=document.getElementById('mhShot').textContent;
  /* יורה הוד (StarterBot) — אותו פתרון, עם הסיבוב הקבוע של ההוד */
  S.bldSet(-1,'starter',true); at(60,60); out.hood=S.vdMe()==='hood'&&Math.abs(S.P.vAvg-S.solveAvgHere())<0.02&&Math.abs(S.P.vAvg-v2)>0.05; S.bldSet(-1,'classic',true); at(60,60);
  /* כיבוי מהלוח — מסונכרן, נשמר, והמהירות נשארת */
  pp.click();
  out.sync=!S.autoVOn()&&!kl.checked&&!st.checked&&localStorage.getItem('bbAutoV1')==='0';
  out.manVis=!document.getElementById('ppManV').hidden;
  const keep=S.P.vAvg; at(-40,40); out.kept=S.P.vAvg===keep;
  out.line2=document.getElementById('mhShot').textContent;
  /* המחוון הידני משנה את המהירות */
  const sl=document.getElementById('ppManVs'); sl.value='7.5'; sl.dispatchEvent(new Event('input',{bubbles:true}));
  out.man=Math.abs(S.P.vAvg-7.5)<1e-6&&S.autoVOn()===false;
  S.AUTOV.t=9; S.shotHud(0); out.line3=document.getElementById('mhShot').textContent;
  /* הדלקה מההגדרות — חוזר לפתור */
  st.click(); at(60,60);
  out.back=S.autoVOn()&&pp.checked&&kl.checked&&localStorage.getItem('bbAutoV1')==='1'&&Math.abs(S.P.vAvg-S.solveAvgHere())<0.02&&document.getElementById('ppManV').hidden;
  /* רחוק מדי */
  at(-40,-60); out.far=document.getElementById('mhShot').textContent; out.farSol=S.solveAvgHere(); out.cap=S.wheelCap();
  /* המעבדה מכבה — גם הלוח */
  kl.click(); out.labOff=!pp.checked&&!st.checked&&!S.autoVOn(); kl.click();
  return out; });
console.log('   ',JSON.stringify({v1:e.v1,v2:e.v2,line1:e.line1,line2:e.line2,far:e.far,farSol:e.farSol,cap:e.cap}));
ok(e.exists,'המתג ״מהירות ירי אוטומטית לפי המרחק״ בלוח ״משחק״ ובהגדרות');
ok(e.def,'ברירת מחדל: דלוק (וגם ״נעילה״ במעבדה)');
ok(Math.abs(e.v1-e.s1)<0.02&&Math.abs(e.v2-e.s2)<0.02&&Math.abs(e.v2-e.v1)>0.1,`דלוק: המהירות עוקבת אחרי המרחק (${e.v1.toFixed(2)} ← ${e.v2.toFixed(2)} מ׳/ש׳) = solveAvgHere`);
ok(e.hood,'יורה הוד: המהירות נפתרת גם לבנייה עם הוד (ושונה מהקלאסי)');
ok(/מרחק \d+\.\d רגל/.test(e.line1)&&/מהירות \d+\.\d מ׳\/ש׳/.test(e.line1)&&/אוטומטי/.test(e.line1),'בכרטיס המחסנית: מרחק ברגל, מהירות ו״אוטומטי״');
ok(e.sync,'כיבוי מהלוח — מסונכרן למעבדה ולהגדרות ונשמר (bbAutoV1=0)');
ok(e.manVis,'כבוי — מופיע מחוון מהירות ידנית');
ok(e.kept,'כבוי — המהירות לא משתנה כשזזים');
ok(/ידני/.test(e.line2)&&!/אוטומטי/.test(e.line2),'בכרטיס: ״ידני״');
ok(e.man&&/7\.5/.test(e.line3),'המחוון הידני קובע את המהירות, והכרטיס מראה אותה');
ok(e.back,'הדלקה מההגדרות — מסונכרן, נשמר, והמהירות חוזרת לפתרון');
ok(e.farSol==null&&/לא מגיע|רחוק מדי/.test(e.far)&&!/מהירות/.test(e.far),'בלי פתרון ירי — הכרטיס אומר שלא מגיע, בלי מהירות');
ok(e.labOff,'כיבוי ״נעילה״ במעבדה מכבה גם בלוח ובהגדרות');

/* נשמר בין פתיחות */
await page.evaluate(()=>__sim.autoVSet(false));
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
const f=await page.evaluate(()=>({on:__sim.autoVOn(),pp:document.getElementById('ppAutoV').checked,kl:document.getElementById('kLock').checked,
  prac:JSON.stringify(__sim.PRAC.cfg||__sim.pracOpen()&&__sim.PRAC.cfg)}));
ok(!f.on&&!f.pp&&!f.kl,'אחרי טעינה מחדש: כבוי נשאר כבוי');
ok(/"skill":1/.test(f.prac)&&/"on":true,"role":"score"}\]/.test(f.prac),'אחרי טעינה מחדש: בחירות התרגול חוזרות מ-bbPractice1');
await page.evaluate(()=>{ __sim.pracClose(); __sim.autoVSet(true); });

/* ── 4. אנגלית: בלי עברית בחלון ובשורת הכרטיס ── */
await page.evaluate(()=>localStorage.setItem('bbLang1','en'));
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
const g=await page.evaluate(()=>{ const S=__sim; document.getElementById('ppPractice').click();
  return new Promise(r=>setTimeout(()=>{ const m=document.getElementById('pracBox');
    const attrs=[...m.querySelectorAll('[aria-label],[title]')].map(x=>(x.getAttribute('aria-label')||'')+(x.getAttribute('title')||'')).join(' ');
    S.AUTOV.t=9; S.shotHud(0);
    r({open:!m.hidden, txt:m.innerText, attrs, card:document.getElementById('ppPractice').innerText, auto:document.querySelector('label[for=ppAutoV]').innerText,
       line:document.getElementById('mhShot').innerText, clkPrac:document.getElementById('clkPrac').textContent}); },150)); });
console.log('   ',JSON.stringify({card:g.card,line:g.line}));
ok(g.open&&!HEB.test(g.txt)&&!HEB.test(g.attrs),'באנגלית: אין עברית בחלון התרגול'+(HEB.test(g.txt+g.attrs)?' — '+(g.txt+g.attrs).match(/[֐-׿][^\n]*/)[0]:''));
ok(!HEB.test(g.card+g.auto+g.line+g.clkPrac),'באנגלית: הכרטיס, המתג ושורת המחסנית מתורגמים'+(HEB.test(g.card+g.auto+g.line+g.clkPrac)?' — '+(g.card+g.auto+g.line+g.clkPrac):''));
ok(/Distance/.test(g.line)&&/ft/.test(g.line),'באנגלית: Distance … ft');
await page.keyboard.press('Escape');
ok(await page.evaluate(()=>document.getElementById('pracBox').hidden),'Esc סוגר גם באנגלית');
await page.evaluate(()=>localStorage.setItem('bbLang1','he'));

ok(realErrs(errs).length===0,'בלי שגיאות בדף'+(realErrs(errs).length?' — '+realErrs(errs).join(' | '):''));
await browser.close(); done('v65_practice');
