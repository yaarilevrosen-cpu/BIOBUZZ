// v77 ux — תיקוני סקירת 1.17: אותיות גדולות באנגלית, מוסך נצמד, תפריט הלוח באנגלית, מוכנות שאומרת אמת, פס התוצאה (אדום משמאל),
// החיפוש מכיר את 1.17, בלי ״עצור״/״שידור חוזר״ כפולים, תג הגרסה, הלוח בתלת־ממד בטלפון, כרטיס הסיום, שורת סוף משחק, צבעי מערכות
import {chromium} from 'playwright';
import {ok,done,realErrs,URL0} from './h.mjs';

const RECT=`s=>{ const e=typeof s==='string'?document.querySelector(s):s; if(!e||!e.getClientRects().length||getComputedStyle(e).display==='none') return null; const r=e.getBoundingClientRect(); return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}; }`;
const ovl=(a,b)=>a&&b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1;
const B=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
/* דף במחשב או בטלפון, בעברית או באנגלית, במצב ״משחק״ */
async function view({lang='he',phone=false,noraf=true}={}){
  const ctx=await B.newContext(phone?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1400,height:860}});
  const page=await ctx.newPage(); const errs=[];
  page.on('pageerror',e=>errs.push(String(e))); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await page.addInitScript(([l,nr])=>{ try{ localStorage.setItem('bbLang1',l); if(!localStorage.getItem('bbUiMode1')) localStorage.setItem('bbUiMode1','play');
    if(!localStorage.getItem('bbWizard1')) localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); }catch(e){}
    if(nr){ window.__raf0=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=()=>0; } },[lang,noraf]);
  await page.goto(URL0,{timeout:120000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:120000});
  return {ctx,page,errs,E:(f,a)=>page.evaluate(f,a)};
}

/* ── 1. אנגלית במחשב: אותיות גדולות, פס התוצאה, ״⋯״ של הלוח, שורה תחתונה ── */
{
  const {ctx,page,errs,E}=await view({lang:'en'});
  let r=await E(()=>{ const T=__sim.v77ux.T76; return ['אדום','כחול','טלאופ','סוף משחק','סה״כ','אוטונומי','בזירה מההתחלה'].map(T); });
  ok(r.every(t=>/^[A-Z][^A-Z]/.test(t)||/^[A-Z][a-z]*[A-Z][a-z]/.test(t))&&!r.some(t=>/^[A-Z]{2}[a-z]/.test(t)),'ב1: אות גדולה רק בהתחלה ('+r.join(', ')+')');
  await E(()=>{ window.S=__sim; S.MT.cd=0; S.matchStart(); S.advance(20,1/60); S.v76.sbTick(); });
  r=await E(`(()=>({ph:document.getElementById('v76Ph').textContent, red:(${RECT})('#v76Score .sbT.red'), blue:(${RECT})('#v76Score .sbT.blue')}))()`);
  ok(!/^[A-Z]{2}[a-z]/.test(r.ph)&&r.red&&r.blue&&r.red.l<r.blue.l,'פס התוצאה באנגלית: ״'+r.ph+'״, אדום משמאל');
  await E(()=>{ S.matchStop&&S.matchStop(); });
  await E(()=>{ S.brdOpen(); S.brdTpl('flowers'); document.querySelector('#brdBox [data-brd=more]').click(); });
  r=await E(`(()=>{ const R=${RECT}; return {menu:R('#brdMenu'), win:R('#brdBox .brdWin'), act:R('#brdBox .brdAct'), bar:R('#brdBox .brdBar'), more:R('#brdBox [data-brd=more]'), undo:R('#brdBox [data-brd=undo]'), vh:innerHeight}; })()`);
  ok(r.menu&&r.win&&r.menu.l>=r.win.l-0.5&&r.menu.r<=r.win.r+0.5,'ב4: תפריט ״⋯״ באנגלית בתוך החלון (תפריט '+Math.round(r.menu.l)+'–'+Math.round(r.menu.r)+', חלון '+Math.round(r.win.l)+'–'+Math.round(r.win.r)+')');
  ok(r.more&&r.undo&&Math.abs(r.more.t-r.undo.t)<4,'ב4: סרגל הכלים באנגלית בשורה אחת');
  ok(r.act&&r.win&&r.act.b<=r.win.b+0.5&&r.win.b<=r.vh,'ב5: השורה התחתונה של הלוח בתוך החלון ובתוך המסך');
  r=await E(()=>{ const a=[...document.querySelectorAll('#brdBox .brdAct button')].filter(b=>b.getClientRects().length); const lib=document.getElementById('brdLib');
    const before=lib.hidden; document.querySelector('#brdBox [data-brd=lib]').click(); const after=lib.hidden; document.querySelector('#brdBox [data-brd=lib]').click();
    return {n:a.length, prim:a.filter(b=>b.classList.contains('primary')).map(b=>b.dataset.brd), close:!!document.querySelector('#brdBox .skAct [data-brd=close]'), before, after, menuRun:!!document.querySelector('#brdMenu [data-brd=runall]')}; });
  ok(r.n<=5&&r.prim.join()==='runall'&&!r.close&&!r.menuRun,'לוח: שורה תחתונה אחת ('+r.n+' כפתורים), ״🏁 הרץ בזירה״ הוא הראשי, בלי ״סגור״ כפול ובלי כפילות בתפריט');
  ok(r.before&&!r.after,'לוח: ״💾 שמור ▾״ פותח את שורת הספרייה');
  await E(()=>S.brdClose());
  ok(realErrs(errs).length===0,'אנגלית בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await ctx.close();
}

/* ── 2. עברית במחשב: מוסך נצמד, מוכנות, פס התוצאה, פקדים כפולים, שורת סוף משחק, כרטיס סיום, גרסה, חיפוש, חלון ממורכז ── */
{
  const {ctx,page,errs,E}=await view({lang:'he'});
  await E(()=>{ window.S=__sim; });
  /* גרסה */
  let r=await E(()=>({t:document.getElementById('verBadge').textContent, ti:document.getElementById('verBadge').title, v:S.v77ux.BUILD_VER}));
  ok(r.t==='v77'&&r.v==='v77'&&/v77/.test(r.ti),'ב15: תג הגרסה '+r.t+' ('+r.ti+')');
  r=await E(()=>{ const had='bbApp' in window; window.bbApp={version:'1.18.0'}; S.v77ux.teamBadge(); const t=document.getElementById('verBadge').textContent, ti=document.getElementById('verBadge').title;
    if(!had) delete window.bbApp; S.v77ux.teamBadge(); return {t,ti,back:document.getElementById('verBadge').textContent}; });
  ok(r.t==='1.18.0'&&/1\.18\.0 · v77/.test(r.ti)&&r.back==='v77','ב15: באפליקציה — גרסת האפליקציה ('+r.t+' · '+r.ti+')');
  /* מוסך: הכותרת מעל התצוגה הנצמדת */
  await E(()=>S.bldOpen('classic')); await page.waitForTimeout(300);
  /* בכל גובה גלילה הכותרת מצוירת מעל התצוגה הנצמדת — הנקודה שבאמצע הכותרת שייכת לכותרת */
  r=await E(`(()=>{ const R=${RECT}; const w=document.querySelector('#bldBox .skWin'), top=document.querySelector('#bldBox .coachTop'), L=document.querySelector('#bldBox .garL'), out=[];
    for(const st of [120,260,520,w.scrollHeight]){ w.scrollTop=st; const b=top.querySelector('b').getBoundingClientRect();
      const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); out.push({st:w.scrollTop, onTop:!!(hit&&hit.closest('.coachTop'))}); }
    return {out, zt:+getComputedStyle(top).zIndex||0, zl:+getComputedStyle(L).zIndex||0}; })()`);
  ok(r.out.every(o=>o.onTop)&&r.zt>r.zl,'ב2: מוסך בגלילה — הכותרת תמיד מעל התצוגה הנצמדת ('+r.out.map(o=>o.st).join(', ')+')');
  await E(()=>S.bldClose());
  /* מוכנות על פרופיל חדש */
  r=await E(()=>{ const c=S.rdyCheck(); S.rdyOpen(); const o=document.getElementById('rdyOut'), w=document.querySelector('#rdyBox .skWin').getBoundingClientRect();
    return {ok:c.ok, pend:c.pend, done:c.done, total:c.total, sum:o.querySelector('.rdySum').textContent, ring:!!o.querySelector('.rdyRing'), close:!!document.querySelector('#rdyBox .skAct [data-rdyact=close]'),
      mid:(w.top+w.bottom)/2, vh:innerHeight}; });
  ok(!r.ok&&r.pend>0&&!/מוכנים לתחרות ✓/.test(r.sum)&&/מתוך/.test(r.sum)&&r.ring,'ב8: מוכנות על פרופיל חדש לא אומרת ״מוכנים ✓״ ('+r.sum.trim()+')');
  ok(!r.close&&Math.abs(r.mid-r.vh/2)<40,'חלון אחד: ״מוכנות״ ממורכז ובלי ״סגור״ כפול (מרכז '+Math.round(r.mid)+' מתוך '+r.vh+')');
  await E(()=>S.rdyClose());
  /* מאץ׳: פס התוצאה, פקדים כפולים, שורת סוף משחק */
  await E(()=>{ S.MT.cd=3; S.matchStart(); S.advance(1,1/60); });
  const VIS=`id=>{ const e=document.getElementById(id); return !!e&&!e.hidden&&!!e.getClientRects().length&&getComputedStyle(e).display!=='none'; }`;
  r=await E(`(()=>{ const V=${VIS}; S.ppRefresh(); return {stop:['clkStop','ppStop'].filter(V), rp:['ppReplay','irBtn'].filter(V)}; })()`);
  ok(r.stop.length===1&&r.rp.length===0,'ב13: בספירה — ״עצור״ אחד ('+r.stop+'), ובלי ״שידור חוזר״ ('+r.rp+')');
  await E(()=>{ S.advance(40,1/60); S.v76.sbTick(); });
  r=await E(`(()=>{ const V=${VIS}, R=${RECT}; S.ppRefresh(); S.irUi(); return {stop:['clkStop','ppStop'].filter(V), rp:['ppReplay','irBtn'].filter(V), red:R('#v76Score .sbT.red'), blue:R('#v76Score .sbT.blue')}; })()`);
  ok(r.stop.join()==='clkStop'&&r.rp.join()==='irBtn','ב13: בטלאופ — ״עצור״ רק בכותרת ו״שידור חוזר״ רק על הזירה ('+r.stop+' · '+r.rp+')');
  ok(r.red&&r.blue&&r.red.l<r.blue.l,'ב9: פס התוצאה בעברית — אדום משמאל, כמו בזירה ובלוח');
  await E(()=>{ S.advance(S.tEnd()-S.MATCH.t-20,1/60); S.ppRefresh(); });
  r=await E(()=>document.querySelector('#ppStatus [data-r=ph] b').textContent);
  ok(/סוף משחק/.test(r),'ב10: שורת השלב בלוח הצד עוברת לסוף משחק ('+r+')');
  await E(()=>S.advance(30,1/60));
  r=await E(()=>{ const d=S.v76.V76.end; return {brk:d&&d.brk, fin:S.MATCH.final, rows:[...document.querySelectorAll('#v76End .v76Brk>div')].map(x=>x.className)}; });
  ok(r.brk&&['red','blue'].every(a=>r.brk[a].pre>0&&r.brk[a].pre+r.brk[a].auto+r.brk[a].tele+r.brk[a].end===r.brk[a].total&&r.brk[a].total===(r.fin[a]|0))&&r.rows.includes('pre'),
    'ב11: כרטיס הסיום — מה שבזירה מההתחלה בשורה משלו ('+JSON.stringify(r.brk)+')');
  /* חיפוש */
  const Q={'כוונון':/^gar-tune/,'הרץ את כל':/^brd-runall$/,'קוטר גלגל':/^gar-tune-wheel$/,'תלת':/^(brd-3d|gar-3d)$/,'קוד לשיתוף':/^brd-code$/,'תבנית':/^brd-tpl$/,'הדפסה':/^(brd-print|pitcard)$/,
    'חיבור חי':/^sct-live$/,'qr':/^(sct-qr|phone)$/,'מוכנות':/^(ready|ready-list)$/,'פס תוצאה':/^match-ui$/,'מנוע הנעה':/^gar-tune-dmot$/};
  r=await E(Q=>{ S.cmdkOpen(); const o={}; for(const q of Object.keys(Q)) o[q]=(S.cmdkSearch(q)||[]).slice(0,3).map(c=>c.id); S.cmdkClose(); return o; },Object.fromEntries(Object.keys(Q).map(k=>[k,1])));
  const miss=Object.keys(Q).filter(q=>!(r[q]||[]).some(id=>Q[q].test(id)));
  ok(miss.length===0,'ב12: החיפוש מוצא את מה שנוסף ב-1.17 ('+(miss.length?'חסר: '+miss.map(q=>q+'→'+r[q]).join(' | '):Object.keys(Q).length+' שאילתות')+')');
  ok(r['קוטר גלגל'][0]==='gar-tune-wheel','ב12: ״קוטר גלגל״ מוביל לכוונון במוסך ולא ל״משגר״ במעבדה ('+r['קוטר גלגל'][0]+')');
  r=await E(()=>{ S.v77ux.garGo('shoot','fw'); const o={open:!document.getElementById('bldBox').hidden, tab:S.BLD?S.BLD.tab:null}; S.bldClose(); return o; });
  ok(r.open&&r.tab==='shoot','ב12: תוצאת כוונון פותחת את המוסך בלשונית הנכונה ('+r.tab+')');
  /* צבעי מערכות על הרובוטים */
  r=await E(()=>{ const k=new Set(); let bots=0, me=0; S.BOTS.forEach(b=>b.group&&b.group.traverse(o=>{ if(o.userData.v77sys){ bots++; k.add(o.userData.v77sys); } }));
    S.bot.group.traverse(o=>{ if(o.userData.v77sys){ me++; k.add(o.userData.v77sys); } }); return {bots, me, k:[...k].sort()}; });
  ok(r.bots>=8&&r.me>=4&&['drive','intake','shoot'].every(x=>r.k.includes(x)),'צבע קבוע לכל מערכת על הרובוטים בזירה (בוטים '+r.bots+', שלי '+r.me+': '+r.k+')');
  /* עברית נקייה במוסך */
  r=await E(()=>{ S.bldOpen('starter'); const w=document.createTreeWalker(document.getElementById('bldBox'),NodeFilter.SHOW_TEXT), out=[]; let n;
    while(n=w.nextNode()){ const t=n.textContent.trim(), p=n.parentElement; if(!t||!p||!p.getClientRects().length||p.closest('[hidden]')) continue;
      if(/[A-Za-z]{3,}/.test(t)&&!/^(BIOBUZZ.*|R\d{3}|G\d{3}|FTC)$/.test(t)) out.push(t); } S.bldClose(); return out; });
  ok(r.length===0,'ב14: במוסך בעברית אין מילים באנגלית ('+r.slice(0,4).join(' | ')+')');
  ok(realErrs(errs).length===0,'עברית בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await ctx.close();
}

/* ── 3. טלפון: מוסך בלי טקסט על טקסט, ״עצור״ אחד, מונה התמונות, הלוח בתלת־ממד ── */
{
  const {ctx,page,errs,E}=await view({lang:'en',phone:true});
  await E(()=>{ window.S=__sim; });
  ok(await E(()=>document.body.classList.contains('ph')),'טלפון: מצב טלפון');
  await E(()=>S.bldOpen('classic')); await page.waitForTimeout(300);
  let r=await E(()=>{ const box=document.getElementById('bldBox'), w=box.querySelector('.skWin'); w.scrollTop=520;
    /* רק אזור העריכה (תצוגה, מדדים ושורות הכוונון) ורק מה שבתוך החלון — שורת הרובוטים נגללת לרוחב בכוונה */
    const W=w.getBoundingClientRect(), inW=r=>r.right>W.left+1&&r.left<W.right-1&&r.bottom>W.top+1&&r.top<W.bottom-1;
    const els=[...box.querySelectorAll('.gar button,.gar span,.gar b,.gar label,.gar small,.gar div')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getClientRects().length&&inW(e.getBoundingClientRect()));
    const R=els.map(e=>({e,r:e.getBoundingClientRect()})); let n=0; const ex=[];
    for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ const a=R[i].r,b=R[j].r; if(R[i].e.contains(R[j].e)||R[j].e.contains(R[i].e)) continue;
      const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left), oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(ox>4&&oy>4){ n++; if(ex.length<3) ex.push(R[i].e.textContent.trim().slice(0,16)+' ⟷ '+R[j].e.textContent.trim().slice(0,16)); } }
    return {n, ex, pos:getComputedStyle(box.querySelector('.garL')).position}; });
  ok(r.n===0&&r.pos==='static','ב3: מוסך בטלפון — בלי טקסט על טקסט ('+r.n+' זוגות'+(r.ex.length?': '+r.ex.join(' | '):'')+'), התצוגה לא נצמדת');
  await E(()=>S.bldClose());
  await E(()=>{ S.MT.cd=0; S.matchStart(); S.advance(30,1/60); try{ S.fpsSet(true); }catch(e){} const f=document.getElementById('fpsChip'); if(f){ f.hidden=false; f.textContent='4 FPS'; } S.refreshClock(); });
  await page.waitForTimeout(900);   /* הרצועה מתעדכנת כל 400 מ״ש */
  r=await E(`(()=>{ const R=${RECT}; const V=id=>{ const e=document.getElementById(id); return !!e&&!!e.getClientRects().length&&getComputedStyle(e).display!=='none'; };
    return {stop:['clkStop','qPlay'].filter(V), q:document.getElementById('qPlay').textContent, fps:R('#fpsChip'), qp:R('#qPlay')}; })()`);
  ok(r.stop.join()==='qPlay'&&/Stop/.test(r.q),'ב13: בטלפון ״Stop״ אחד — ברצועה העליונה ('+r.stop+' · '+r.q+')');
  ok(r.fps&&r.qp&&!ovl(r.fps,r.qp),'ב7: מונה התמונות לא מכסה את ״Stop״');
  await E(()=>{ S.matchStop(); S.brdOpen(); S.brdTpl('flowers'); S.brd3Open(); });
  r=await E(`(()=>{ const R=${RECT}; return {bar:R('#brd3Bar'), back:R('#brd3Bar [data-b3=back]'), pads:R('#pads'), mag:R('#magHud'), cls:document.body.classList.contains('v77brd'), k:S.v77ux.fitK(), vw:innerWidth, vh:innerHeight}; })()`);
  ok(r.bar&&r.back&&r.bar.l>=0&&r.bar.r<=r.vw&&r.back.r<=r.vw&&r.back.l>=0&&r.bar.b<=r.vh,'ב6: סרגל הלוח בתלת־ממד בתוך המסך, כולל ״Back to board״');
  ok(r.cls&&!r.pads&&!r.mag,'ב6: בלי ג׳ויסטיק, ירה ומחסנית בזמן הלוח בתלת־ממד');
  ok(r.k>1.5,'ב6: המצלמה מתרחקת במסך לאורך (פי '+r.k.toFixed(2)+')');
  r=await E(()=>{ S.brd3Close(false); return document.body.classList.contains('v77brd'); });
  ok(!r,'אחרי היציאה מהתלת־ממד — ממשק הנהיגה חוזר');
  ok(realErrs(errs).length===0,'טלפון בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await ctx.close();
}

/* ── 4. תרגומים: כל מחרוזת עברית חדשה ב-HTML — יש לה אנגלית ── */
{
  const {ctx,E}=await view({lang:'en'});
  const L=['▶ נסה רק את שלי','💾 שמור ▾','שמירה, טעינה ומחיקה של לוחות','🏁 הרץ בזירה','קולות המגרש — צופרים, ספירה וקריאת הפתיחה לנהגים','בזירה מההתחלה','לא נבדק',
    'בונה רובוטים — צריח, יורה כפול, מעלית, רובוט המתחילים, ולכל בוט רובוט משלו','סוף משחק — לחנות לפני הצופר','רובוט המתחילים','6 גלגלים — מרכז נמוך','גלגלי איסוף גמישים'];
  const bad=await E(L=>L.filter(s=>/[֐-׿]/.test(i18nText(s))),L);
  ok(bad.length===0,'תרגומים לאנגלית לכל המחרוזות החדשות ('+bad.join(' | ')+')');
  await ctx.close();
}
await B.close();
done('v77_ux');
