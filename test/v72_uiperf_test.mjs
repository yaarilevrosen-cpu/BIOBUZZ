// v72 uiperf — ממשק (UI1–UI11) וביצועים (PF1–PF7) מדוח הסקירה של v71
// כולל בדיקת תרגום רגרסיבית: כל מחרוזת עברית בקוד (גרשיים כפולים ובודדים, מפורקת ל־HTML) עוברת במתרגם — אסור שיישאר עברית
import {open,ok,done,URL0,realErrs} from './h.mjs';
import {chromium} from 'playwright';
import fs from 'fs';
const HE=/[֐-׿]/;

/* ── UI3: כל מחרוזת עברית שמוצגת למשתמש — יש לה אנגלית ── */
function hebrewSegments(){
  const src=fs.readFileSync(new URL('../biobuzz-sim.html',import.meta.url),'utf8');
  const scripts=[...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  const code=scripts.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:\\"'])\/\/[^\n]*/g,'$1');
  /* לא מוצג: מילות חיפוש (k:), אותיות לנרמול, ״ברוכים״ (סינון), ״עברית״ (שם השפה — נשאר בעברית בכוונה) */
  const SKIP=new Set(['ברוכים','עברית']);
  const out=new Set();
  for(const re of [/(\bk:)?"((?:[^"\\\n]|\\.)*)"/g, /(\bk:)?'((?:[^'\\\n]|\\.)*)'/g]){
    for(const m of code.matchAll(re)){ const s=m[2]; if(!HE.test(s)||m[1]==='k:'||[...s].length<=1) continue;
      let t=s.replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\'/g,"'"); const segs=[];
      for(const a of t.matchAll(/\b(?:title|placeholder|aria-label|alt|label)="([^"]*)"/g)) segs.push(a[1]);
      if(/[<>]/.test(t)){ const fg=t.indexOf('>'), lt=t.indexOf('<'); if(fg>=0&&(lt<0||fg<lt)) t=t.slice(fg+1);
        t=t.replace(/<[^>]*$/,''); for(const p of t.split(/<[^>]*>/)) segs.push(p); }
      else segs.push(t);
      for(const g of segs) if(HE.test(g)&&!SKIP.has(g.trim())) out.add(g); } }
  return {segs:[...out], src};
}
const {segs,src}=hebrewSegments();

let {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ localStorage.setItem('bbLang1','en'); }); await page.reload();
await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
{
  const bad=await E(a=>a.map(s=>[s,i18nText(s)]).filter(([s,t])=>/[֐-׿]/.test(t)),segs);
  ok(segs.length>1500&&bad.length===0,`UI3: ${segs.length} קטעים עבריים בקוד — כולם מתורגמים (${bad.length} לא)`+(bad.length?' · '+bad.slice(0,6).map(x=>JSON.stringify(x[0])).join(' | '):''));
  const r=await E(()=>{ const t=[
      'גם באחיזה מרבית הסימולטור איטי מהמדידה (2.10 שנ׳ מול 1.5) — המנוע מגביל: בדקו מומנט, תמסורת או סוללה',
      'הרובוט האמיתי (2.50) מהיר מהמנוע שמוגדר (1.90 מ׳/ש׳) — בדקו סל״ד, קוטר גלגל ותמסורת בלשונית השלדה',
      'חסום 12 שנ׳ במשחק','חניה בסוף רק 2.0 נק׳ בממוצע','1.5 עבירות במשחק','הרבה פספוסים — כדאי לתרגל גם מרחוק',
      'ניסיון 3 מתוך 40','🔍 משופר: ירי · חניה','כל העמדות תפוסות בשחקנים — אין מקום לשחקן 2','אזור הטעינה תפוס — השחקן האנושי מחכה שיתפנה',
      '120 נק׳ · חסרות 5 · מחזור 9.1 שנ׳ מול 8.0','⚠ '+T('לא נשלח')+' ('+T('שגיאה 500')+'). '+T('אפשר לפתוח דיווח בגיטהאב.'), '⚠ '+T('לא נשלח')+' ('+T('אין חיבור לאינטרנט')+'). '+T('אפשר לפתוח דיווח בגיטהאב.'),'לפני 3 שע׳','לפני 2 ימים',
      '// מיפוי צירים (סיבוב 90°): x→y  · אינץ׳ · sim: x לכיוון הכחול, z לכיוון הקהל, yaw נגד כיוון השעון'];
    return {out:t.map(x=>T(x)), bad:t.map(x=>T(x)).filter(x=>/[\u0590-\u05FF]/.test(x)), h:T('לפני 3 שע׳'), d:T('לפני 2 ימים'), bc:__sim.v72uiperf.bcNames()}; });
  ok(r.out.every(x=>!/[֐-׿]/.test(x)),'UI3: משפטים מורכבים (כיול, מאמן, מתכנן, שופט, באג, ייצוא) — בלי עברית: '+(r.bad.join(' | ')||r.out.slice(0,2).join(' | ')));
  ok(r.h==='3 h ago'&&r.d==='2 days ago',`UI3: ״לפני N שע׳/ימים״ → ${r.h} / ${r.d}`);
  /* UI6: שמות ברירת המחדל בשידור/בהקלטה — בשפה של עכשיו */
  ok(!HE.test(r.bc.red)&&!HE.test(r.bc.blue),`UI6: שמות הבריתות בשידור באנגלית (${r.bc.red} / ${r.bc.blue})`);
  const r2=await E(()=>{ __sim.pathLibUI&&__sim.pathLibUI(); const og=[...document.querySelectorAll('#pathLibSel optgroup')].map(o=>o.label);
    const b=document.getElementById('bcNameB'); return {og, ph:b&&b.placeholder, val:b&&b.value}; });
  ok(!r2.og.length||r2.og.every(l=>!HE.test(l)),'UI3: תוויות הקבוצות ברשימת המסלולים באנגלית ('+r2.og.join(', ')+')');
  ok(r2.val===''&&r2.ph&&!HE.test(r2.ph),`UI6: שדה ״היריבים״ ריק עם placeholder מתורגם (${r2.ph})`);
}
/* UI6: ערך ישן ״היריבים״ שנשמר — הופך לברירת מחדל */
await E(()=>{ localStorage.setItem('bbBcast1',JSON.stringify({red:'',blue:'היריבים'})); }); await page.reload();
await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
ok(await E(()=>!/[֐-׿]/.test(__sim.v72uiperf.bcNames().blue)),'UI6: ״היריבים״ שמור מגרסה קודמת — מוצג באנגלית');
/* UI7 */
const code0=src.replace(/<script type="application\/json"[^\n]*\n/g,'');
ok(!code0.includes('מהכפתור 🌐 למעלה')&&code0.includes('מכפתור השפה (EN) למעלה'),'UI7: האשף מפנה לכפתור EN שבכותרת (לא ל-🌐)');

/* UI8–UI10: ניגודיות ונגישות (שולחני, אנגלית) */
{
  const r=await E(()=>{ const cs=getComputedStyle(document.documentElement), dim=cs.getPropertyValue('--dim').trim();
    const tgl=document.querySelector('#toolbar .tgl'); const toRGB=c=>{ const d=document.createElement('i'); d.style.color=c; document.body.append(d); const v=getComputedStyle(d).color; d.remove(); return v; };
    const on=[...document.querySelectorAll('button.on')].filter(x=>x.getClientRects().length&&!/^(option|tab|menuitem)/.test(x.getAttribute('role')||''));
    const dlg=['cmdk','skinBox','bldBox','coachBox','qrBox'].map(id=>{ const m=document.getElementById(id); return {id, role:m.getAttribute('role'), modal:m.getAttribute('aria-modal'), name:m.getAttribute('aria-label')||m.getAttribute('aria-labelledby')}; });
    const live=['refToast','banner','verdict'].map(id=>{ const m=document.getElementById(id); return m.getAttribute('role')==='status'||!!m.getAttribute('aria-live'); });
    return {tgl:tgl?getComputedStyle(tgl).color:null, dim:toRGB(dim), on:on.length, pressed:on.filter(x=>x.getAttribute('aria-pressed')==='true').length, dlg, live,
      coachName:(document.getElementById(document.getElementById('coachBox').getAttribute('aria-labelledby'))||{}).textContent||''}; });
  ok(r.tgl===r.dim,`UI8: כותרות הקבוצות בסרגל בצבע --dim (${r.tgl})`);
  ok(r.on>5&&r.pressed===r.on,`UI9: ${r.pressed}/${r.on} כפתורי מצב (.on) מודיעים aria-pressed`);
  ok(r.dlg.every(d=>d.role==='dialog'&&d.modal==='true'&&d.name),'UI10: חיפוש/סקינים/בונה/מאמן/QR — role=dialog, aria-modal ושם');
  ok(r.live.every(Boolean),'UI10: הודעת השופט, הבאנר והחיווי — role=status / aria-live');
  /* aria-pressed עוקב אחרי המחלקה */
  const t=await E(async()=>{ const b=[...document.querySelectorAll('.seg button')].find(x=>x.getClientRects().length&&!x.classList.contains('on'));
    if(!b) return null; b.classList.add('on'); await new Promise(r=>setTimeout(r,0)); const a=b.getAttribute('aria-pressed');
    b.classList.remove('on'); await new Promise(r=>setTimeout(r,0)); return [a,b.getAttribute('aria-pressed')]; });
  ok(t&&t[0]==='true'&&t[1]==='false','UI9: הוספה/הסרה של .on מעדכנת aria-pressed ('+t+')');
  /* רשימת החיפוש: listbox/option + aria-activedescendant שזז עם החצים */
  await E(()=>__sim.cmdkOpen()); await page.waitForTimeout(80);
  const c0=await E(()=>{ const i=document.getElementById('cmdkIn'), l=document.getElementById('cmdkList');
    return {role:i.getAttribute('role'), lb:l.getAttribute('role'), opts:l.querySelectorAll('[role=option]').length, ad:i.getAttribute('aria-activedescendant'),
      sel:(l.querySelector('[aria-selected=true]')||{}).id}; });
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(30);
  const c1=await E(()=>{ const i=document.getElementById('cmdkIn'); return {ad:i.getAttribute('aria-activedescendant'), cls:(document.getElementById(i.getAttribute('aria-activedescendant'))||{}).className}; });
  ok(c0.role==='combobox'&&c0.lb==='listbox'&&c0.opts>3&&c0.ad===c0.sel&&c0.ad==='cmdkO0','UI9: חיפוש — combobox/listbox, '+c0.opts+' אפשרויות, המסומן '+c0.ad);
  ok(c1.ad==='cmdkO1'&&/\bon\b/.test(c1.cls),'UI9: חץ למטה מזיז את aria-activedescendant ('+c1.ad+')');
  await page.keyboard.press('Escape');
}

/* ── ביצועים ── */
/* PF1: כדורים על הרצפה נרדמים */
{
  const r=await E(()=>{ const S=__sim, w=S.world;
    S.MT.cd=0; S.GAME.randAuto=false; S.gameStart(true); S.matchStart(); S.advance(30,1/60);
    S.matchStop(); S.gameStart(false); S.advance(8,1/60);
    const is=w.internalStep.bind(w); let T=0,c=0; w.internalStep=h=>{ const t=performance.now(); is(h); T+=performance.now()-t; c++; };
    S.advance(10,1/60); w.internalStep=is;
    const fl=S.balls.filter(b=>S.I(b.body.position.y)<3);
    return {fl:fl.length, asleep:fl.filter(b=>b.body.sleepState===2).length, ms:+(T/c).toFixed(3),
      spin:Math.max(...fl.filter(b=>b.body.sleepState!==2).map(b=>b.body.angularVelocity.length()),0)}; });
  ok(r.fl>10&&r.asleep>=0.8*r.fl,`PF1: ${r.asleep}/${r.fl} כדורים על הרצפה ישנים אחרי 18 שנ׳ שקטות (קודם ~7/34) · ${r.ms} מ״ש לתת־צעד`);
  /* כדור מתגלגל לא נעצר מוקדם: הדעיכה רק מתחת לס״מ לשנייה */
  const g=await E(()=>{ const S=__sim; S.gameStart(false); const b=S.addBallTest('pollen',0,0.6,-30,{x:0.5,y:0,z:0});
    b.body.angularVelocity.set(0,0,-0.5/(b.r)); S.advance(0.5,1/60); return Math.hypot(b.body.velocity.x,b.body.velocity.z); });
  ok(g>0.2,`PF1: כדור מתגלגל ב-0.5 מ׳/ש׳ ממשיך להתגלגל (${g.toFixed(2)} מ׳/ש׳ אחרי חצי שנייה)`);
}
/* PF2: ארבעה קירות — ארבעה גופים סטטיים; כדור עדיין נעצר בקיר */
{
  const r=await E(()=>{ const S=__sim, X=S.v72uiperf, W=X.perimWalls();
    const b=S.addBallTest('pollen',62,3,0,{x:8,y:0,z:0}); let mx=0; for(let i=0;i<60;i++){ S.advance(1/60,1/60); mx=Math.max(mx,S.I(b.body.position.x)); }
    return {n:W.length, shapes:W.map(w=>w.shapes.length), mass:W.every(w=>w.mass===0), inWorld:W.every(w=>S.world.bodies.includes(w)), x:mx}; });
  ok(r.n===4&&r.shapes.every(s=>s===1)&&r.mass&&r.inWorld,'PF2: קיר ההיקף = 4 גופים סטטיים, צורה אחת לכל אחד');
  ok(r.x<72,`PF2: כדור שנזרק לקיר ב-8 מ׳/ש׳ נשאר בזירה (x מרבי ${r.x.toFixed(1)}″)`);
  const c=await E(()=>{ const S=__sim, w=S.world, T=CANNON.Shape.types, np=w.narrowphase, key=T.SPHERE|T.BOX, orig=np[key];
    const W=new Set(S.v72uiperf.perimWalls().map(b=>b.id)); let all=0, wall=0, sub=0;
    np[key]=function(si,sj,xi,xj,qi,qj,bi,bj){ all++; if(W.has(bi.id)||W.has(bj.id)) wall++; return orig.apply(this,arguments); };
    const is=w.internalStep.bind(w); w.internalStep=h=>{ sub++; is(h); };
    S.MT.cd=0; S.GAME.randAuto=false; S.gameStart(true); S.matchStart(); S.advance(20,1/60); np[key]=orig; w.internalStep=is; S.matchStop();
    return {all:all/sub, wall:wall/sub}; });
  ok(c.wall<c.all*0.3,`PF2: בדיקות כדור־קיר ${c.wall.toFixed(1)} מתוך ${c.all.toFixed(1)} לתת־צעד (קודם ~40 מתוך ~120)`);
}
/* PF3: 40 תזוזות של מחוון רוחב הרובוט — בלי דליפת גאומטריות */
{
  const r=await E(()=>{ const S=__sim, R=S.renderer, sl=document.getElementById('sl_botW'); R.render(S.scene,S.camera); const g0=R.info.memory.geometries;
    const v0=sl.value; for(let i=0;i<40;i++){ sl.value=String(8+i*0.25); sl.dispatchEvent(new Event('input')); R.render(S.scene,S.camera); }
    const g1=R.info.memory.geometries; sl.value=v0; sl.dispatchEvent(new Event('input')); R.render(S.scene,S.camera);
    return {g0, g1, g2:R.info.memory.geometries, kids:S.bot.group.children.length}; });
  ok(r.g1<=r.g0+30&&r.g2<=r.g0+5,`PF3: גאומטריות ${r.g0} → ${r.g1} אחרי 40 תזוזות → ${r.g2} בחזרה (קודם 137 → 1021)`);
  ok(r.kids>10,'PF3: הרובוט נבנה מחדש ('+r.kids+' חלקים)');
}
/* PF4: חישובי פריסה כפויים במאץ׳ של 30 שנ׳ */
{
  const cdp=await page.context().newCDPSession(page); await cdp.send('Performance.enable');
  const met=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  await E(()=>{ const S=__sim; S.MT.cd=0; S.GAME.randAuto=false; S.gameStart(true); S.matchStart(); S.advance(2,1/60); });
  const a=await met(); await E(()=>__sim.advance(30,1/60)); const b=await met();
  const n=b.LayoutCount-a.LayoutCount;
  ok(n<=20,`PF4: ${n} חישובי פריסה ב-30 שנ׳ של מאץ׳ (קודם 255)`);
  /* לוח שהוסתר — לא נכתב, ולוח גלוי עדיין מתעדכן */
  const r=await E(async()=>{ const S=__sim, el=document.getElementById('oRules');
    for(let d=el.closest('details');d;d=d.parentElement&&d.parentElement.closest('details')) d.open=true;
    for(let p=el;p;p=p.parentElement) if(getComputedStyle(p).display==='none') p.style.display='block';
    el.scrollIntoView(); await new Promise(r=>requestAnimationFrame?setTimeout(r,300):setTimeout(r,300));
    el.innerHTML=''; S.advance(1,1/60); const shown=el.innerHTML.length;
    return {shown, vis:S.v72uiperf.onScreen72(el)}; });
  ok(r.shown>0&&r.vis,`PF4: לוח החוקים הגלוי עדיין מתעדכן (${r.shown} תווים)`);
}
/* PF5: קו הירי לחסימה — זהה ל-mouthFrame/muzzleWorld */
{
  const r=await E(()=>{ const X=__sim.v72uiperf, L=X.aiBlockLine(), f=X.mouthFrame(X.aimHive()), p=X.muzzleWorld();
    return Math.max(Math.abs(L.c.x-f.c.x),Math.abs(L.c.z-f.c.z),Math.abs(L.p.x-p.x),Math.abs(L.p.z-p.z)); });
  ok(r<1e-9,'PF5: קו הירי מהמטמון זהה לחישוב המלא (הפרש '+r+')');
}
/* PF6: ספירת הכדורים לאגירה רק לרובוט עומד (ולי) */
{
  const r=await E(()=>{ const S=__sim, X=S.v72uiperf; S.MT.cd=0; S.GAME.randAuto=false; S.gameStart(true); S.matchStart(); S.advance(3,1/60);
    const n0=X.hoardCalls(); let steps=0; for(let i=0;i<300;i++){ S.advance(1/60,1/60); steps++; } const n=X.hoardCalls()-n0;
    const robots=S.BOTS.filter(b=>b.on).length+1; S.matchStop();
    return {n, max:steps*robots, near:X.RULE.near}; });
  ok(r.n<r.max*0.6,`PF6: ${r.n} ספירות כדורים ב-300 צעדים (בלי התיקון ${r.max})`);
}
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close();

/* PF7: המודל המוטמע לא נשאר על window */
{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage(); await p.addInitScript(()=>{ window.__CADEMB={static:null}; localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); });
  await p.goto(URL0,{timeout:90000}); await p.waitForFunction(()=>window.__sim&&window.__sim.botBody,null,{timeout:60000});
  await p.waitForTimeout(500);
  ok(await p.evaluate(()=>!('__CADEMB' in window)),'PF7: window.__CADEMB נמחק אחרי הטעינה');
  await b.close();
}

/* ── טלפון / טאבלט / 4K ── */
const B=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
async function view(vp,lang,mode,mob){
  const ctx=await B.newContext({viewport:vp,...(mob?{isMobile:true,hasTouch:true,deviceScaleFactor:1}:{})});
  const pg=await ctx.newPage();
  await pg.addInitScript(o=>{ window.requestAnimationFrame=()=>0; localStorage.setItem('bbUiMode1',o.mode); localStorage.setItem('bbTour1','1'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); localStorage.setItem('bbLang1',o.lang); },{lang,mode});
  await pg.goto(URL0,{timeout:90000}); await pg.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  await pg.evaluate(()=>{ if(document.body.classList.contains('setup')) __sim.setupClose(); __sim.MT.cd=0; __sim.matchStart(); __sim.advance(5,1/30); __sim.ppRefresh&&__sim.ppRefresh(); });
  await pg.waitForTimeout(150);
  return {ctx,pg};
}
const rect=s=>{ const e=document.querySelector(s); if(!e||!e.getClientRects().length) return null; const r=e.getBoundingClientRect(); return {l:r.left,r:r.right,t:r.top,b:r.bottom}; };
const HDR=()=>{ const hdr=document.querySelector('#app>header'); const els=[...hdr.querySelectorAll('button,#clockWrap,.chip,#clkTime')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  const ov=[]; for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ const a=els[i],b=els[j]; if(a.contains(b)||b.contains(a)) continue;
    const A=a.getBoundingClientRect(),B=b.getBoundingClientRect(); if(Math.min(A.right,B.right)-Math.max(A.left,B.left)>1&&Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top)>1) ov.push((a.id||a.className)+'×'+(b.id||b.className)); }
  return {ov, sw:document.documentElement.scrollWidth, iw:innerWidth, hr:hdr.getBoundingClientRect().right}; };
for(const lang of ['he','en']){
  const {ctx,pg}=await view({width:360,height:740},lang,'play',true);
  const h=await pg.evaluate(`(${HDR})()`);
  ok(h.ov.length===0&&h.sw<=h.iw,`UI1: 360px ${lang} — אין חפיפות בכותרת (${h.ov.slice(0,3).join(', ')||'0'}) ורוחב ${h.sw}/${h.iw}`);
  const r=await pg.evaluate(`({l:(${rect})('#tLeft'), r:(${rect})('#tRight'), ir:(${rect})('#irBtn'), stick:(${rect})('#stick'), fire:(${rect})('#tFire'), chips:[...document.querySelectorAll('#pads .chip, .hudChips .chip, #hudChips .chip')].filter(e=>e.getClientRects().length).map(e=>{const q=e.getBoundingClientRect(); return {l:q.left,r:q.right,t:q.top,b:q.bottom};})})`);
  ok(r.l&&r.r&&r.l.r<=r.r.l,`UI2: ${lang} — ⟲ משמאל ל-⟳ (${Math.round(r.l.l)} < ${Math.round(r.r.l)})`);
  const hit=(a,b)=>a&&b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1;
  ok(r.ir&&!hit(r.ir,r.stick)&&!hit(r.ir,r.fire)&&!hit(r.ir,r.l)&&!hit(r.ir,r.r)&&!r.chips.some(c=>hit(r.ir,c)),`UI4: ${lang} טלפון — ״שידור חוזר״ לא על הסטיק, הכפתורים או השבבים (top ${r.ir&&Math.round(r.ir.t)})`);
  await ctx.close();
}
{
  const {ctx,pg}=await view({width:360,height:740},'en','play',true);
  await pg.evaluate(()=>{ __sim.setupOpen(); }); await pg.waitForTimeout(200);
  const r=await pg.evaluate(()=>[...document.querySelectorAll('#setup .seg.wide button')].filter(b=>b.getClientRects().length).map(b=>{ const q=b.getBoundingClientRect(), s=b.closest('.seg').getBoundingClientRect(); return {t:b.textContent.trim(), clip:b.scrollWidth>b.clientWidth+1||q.right>s.right+1||q.left<s.left-1}; }));
  ok(r.length>=4&&r.every(x=>!x.clip),'UI5: סוג המאץ׳ ב-360 אנגלית — אף כפתור לא חתוך ('+r.map(x=>x.t).join(' / ')+')');
  await ctx.close();
}
{
  const {ctx,pg}=await view({width:1400,height:860},'en','lab',false);
  const r=await pg.evaluate(`({ir:(${rect})('#irBtn'), tel:(${rect})('#telem')})`);
  const hit=(a,b)=>a&&b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1;
  ok(r.ir&&r.tel&&!hit(r.ir,r.tel)&&r.ir.r-r.ir.l<300,`UI4: 1400 אנגלית מעבדה — ״שידור חוזר״ לא מכסה את הטלמטריה (רוחב ${r.ir&&Math.round(r.ir.r-r.ir.l)})`);
  await ctx.close();
}
{
  const {ctx,pg}=await view({width:3840,height:2160},'en','lab',false);
  const r=await pg.evaluate(()=>{ const c=document.querySelector('#app>header .chips'); return c?{sw:c.scrollWidth,cw:c.clientWidth}:null; });
  ok(r&&r.sw<=r.cw+1,`UI11: 4K — שבבי הכותרת לא נחתכים (${r&&r.sw}/${r&&r.cw})`);
  await ctx.close();
}
await B.close();
done('v72_uiperf');
