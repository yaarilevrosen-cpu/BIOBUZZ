// v63 — אשף הגדרה אישית: פתיחה ראשונה, שבב ״חדש״ למשתמש קיים, שמירה לכל מפתח, החלפת שפה, מדידת גרפיקה, Esc, טלפון, אנגלית, פתיחה מחדש
import {open, ok, done, realErrs} from './h.mjs';
import fs from 'fs';
const SHOTS='/tmp/claude-0/wiz-shots'; fs.mkdirSync(SHOTS,{recursive:true});
const HEB=/[֐-׿]/;
const ready=async page=>page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000,polling:100});
/* ציור פריים אחד (הבדיקות רצות בלי לולאת ציור) — כדי שהצילום יראה את הזירה */
const kick=async page=>{ await page.evaluate(()=>{ const r=window.requestAnimationFrame; window.requestAnimationFrame=window.__raf0; try{ __sim.kickFrame(); }finally{ window.requestAnimationFrame=r; } }); await page.waitForTimeout(250); };
const step=page=>page.evaluate(()=>__sim.WZ.on?__sim.WZ.steps[__sim.WZ.i]:null);
const LS=(page,k)=>page.evaluate(k=>localStorage.getItem(k),k);
const LSJ=async(page,k)=>JSON.parse(await LS(page,k)||'null');
/* כל הטקסט באשף, כולל תוויות נגישות */
const wzText=page=>page.evaluate(()=>{ const w=document.getElementById('wizard'); let t=w.innerText;
  w.querySelectorAll('[aria-label],[title],[placeholder]').forEach(e=>{ t+=' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('title')||'')+' '+(e.getAttribute('placeholder')||''); });
  return t; });
async function shootAll(page,tag){
  const n=await page.evaluate(()=>__sim.WZ.steps.length);
  for(let i=0;i<n;i++){
    await page.evaluate(i=>__sim.wzGo(i),i);
    const st=await step(page);
    if(st==='gfx') await page.waitForFunction(()=>!__sim.WZ.meas,null,{timeout:8000,polling:100});
    await page.waitForTimeout(150); await kick(page);
    await page.screenshot({path:`${SHOTS}/${tag}_${i+1}_${st}.png`});
  }
}

/* ── 1. משתמש חדש בדפדפן: נפתח לבד, הסיור מחכה לסוף האשף; כל צעד נשמר למפתח הנכון ── */
{
  const {browser,page,errs}=await open({noraf:true,play:true,wizard:true,viewport:{width:1280,height:800}});
  await page.waitForFunction(()=>__sim.WZ.on,null,{timeout:5000,polling:100}).catch(()=>{});
  ok(await page.evaluate(()=>__sim.WZ.on&&!document.getElementById('wizard').hidden),'משתמש חדש — האשף נפתח לבד');
  ok(JSON.stringify(await page.evaluate(()=>__sim.WZ.steps))==='["lang","gfx","you","ctl","exp","done"]','שישה צעדים: שפה, גרפיקה, אתה, שליטה, חוויה, סיום');
  ok(await page.evaluate(()=>document.querySelectorAll('#wzDots i').length)===6,'שש נקודות התקדמות');
  await page.waitForTimeout(1800);
  ok(await page.evaluate(()=>!__sim.TOUR.on),'הסיור לא קופץ מעל האשף');
  ok(await page.evaluate(()=>getComputedStyle(document.getElementById('wzBack')).visibility==='hidden'),'בצעד הראשון אין ״הקודם״');
  /* מקשים לא מזיזים את הרובוט כשהאשף פתוח */
  const p0=await page.evaluate(()=>{ const b=__sim.botBody.position; return [b.x,b.z]; });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(80); await page.keyboard.up('KeyW');
  ok(await page.evaluate(()=>__sim.WZ.on),'מקש W לא סוגר את האשף');
  await page.screenshot({path:`${SHOTS}/he_1_lang.png`});
  /* Tab נשאר בתוך החלון */
  let inside=true; for(let i=0;i<14;i++){ await page.keyboard.press('Tab'); if(!await page.evaluate(()=>!!document.activeElement.closest('#wizard'))) inside=false; }
  ok(inside,'Tab נשאר בתוך האשף');
  // גרפיקה
  await page.click('#wzNext'); ok(await step(page)==='gfx','הבא ← גרפיקה');
  ok(await page.evaluate(()=>document.getElementById('wizard').classList.contains('peek')),'בצעד הגרפיקה רואים את הזירה מאחור');
  await page.waitForFunction(()=>!__sim.WZ.meas&&__sim.WZ.rec,null,{timeout:8000,polling:100}).catch(()=>{});
  const g=await page.evaluate(()=>({fps:__sim.WZ.fps,rec:__sim.WZ.rec,q:localStorage.getItem('bbQual1'),mode:__sim.QUAL.mode,badge:!!document.querySelector('#wizard .wzOpt em')}));
  ok(g.rec&&(g.fps>0||g.rec==='auto'),'מדידת קצב רצה והמליצה ('+g.fps+' ← '+g.rec+')');
  ok(g.rec==='auto'||g.badge,'ההמלצה מסומנת ״מומלץ״');
  ok(g.rec==='auto'||(g.q===g.rec&&g.mode===g.rec),'משתמש חדש — ההמלצה הופעלה ונשמרה ב-bbQual1 ('+g.q+')');
  await kick(page); await page.screenshot({path:`${SHOTS}/he_2_gfx.png`});
  await page.click('#wizard [data-wz="q:mid"]');
  ok(await LS(page,'bbQual1')==='mid'&&await page.evaluate(()=>__sim.QUAL.mode==='mid'),'בחירת ״מאוזנת״ נשמרת ב-bbQual1 ומופעלת');
  // אתה
  await page.click('#wzNext'); ok(await step(page)==='you','הבא ← אתה');
  await page.fill('#wzName','נועה');
  await page.click('#wizard [data-wz="emo:🚀"]');
  await page.click('#wizard [data-wz="ally:blue"]');
  await page.click('#wizard [data-wz="skin:neon"]');
  ok((await LSJ(page,'biobuzz_setup_v1')||{}).ally==='blue','ברית כחולה — נשמרת ב-biobuzz_setup_v1');
  ok((await LSJ(page,'bbSkin1')||{}).me==='neon'&&await page.evaluate(()=>__sim.SKIN.me==='neon'),'סקין ניאון — נשמר ב-bbSkin1 ומופעל');
  await kick(page); await page.screenshot({path:`${SHOTS}/he_3_you.png`});
  await page.click('#wzNext'); ok(await step(page)==='ctl','הבא ← שליטה');
  ok(await LS(page,'bbNetName')==='נועה','השם נשמר (bbNetName)');
  ok((await LSJ(page,'bbMe1')||{}).emoji==='🚀','הסמל נשמר (bbMe1)');
  // שליטה
  ok(await page.evaluate(()=>/W/.test(document.querySelector('#wizard .wzKeys').textContent)),'מקלדת — מוצגת מפת המקשים');
  await kick(page); await page.screenshot({path:`${SHOTS}/he_4_ctl.png`});
  await page.click('#wizard [data-wz="ctl:pad"]');
  ok(await page.evaluate(()=>!!document.querySelector('#wizard [data-wz="go:pad"]')),'שלט — קישור לסטודיו השלט');
  await page.click('#wizard [data-wz="go:pad"]');
  ok(await page.evaluate(()=>!document.getElementById('padStudio').hidden&&document.getElementById('wizard').hidden),'הסטודיו נפתח והאשף מתחבא');
  await page.evaluate(()=>document.getElementById('psDone').click());
  await page.waitForFunction(()=>!document.getElementById('wizard').hidden,null,{timeout:3000,polling:100}).catch(()=>{});
  ok(await step(page)==='ctl','סוגרים את הסטודיו — חוזרים לאשף באותו צעד');
  // חוויה
  await page.click('#wzNext'); ok(await step(page)==='exp','הבא ← חוויה');
  await kick(page); await page.screenshot({path:`${SHOTS}/he_5_exp.png`});
  await page.click('#wizard [data-wz="ui:lab"]');
  await page.click('#wizard [data-wz="rm:open"]');
  await page.evaluate(()=>{ const r=document.getElementById('wzVol'); r.value='40'; r.dispatchEvent(new Event('input',{bubbles:true})); });
  ok((await LSJ(page,'biobuzz_snd_v2')||{}).vol===0.4,'עוצמה 40% — נשמרת ב-biobuzz_snd_v2');
  await page.click('#wzSndOn');
  ok((await LSJ(page,'biobuzz_snd_v2')||{}).on===false,'קולות כבויים — נשמר');
  await page.click('#wzTour');
  ok(await LS(page,'bbUiMode1')==='lab','מצב מעבדה — bbUiMode1');
  ok(await LS(page,'bbRealm9662')==='open'&&await page.evaluate(()=>__sim.P!==undefined),'חוקים פתוחים — bbRealm9662');
  // סיום
  await page.click('#wzNext'); ok(await step(page)==='done','הבא ← סיום');
  const sum=await page.evaluate(()=>document.querySelector('#wizard .wzSum').textContent);
  ok(/נועה/.test(sum)&&/מאוזנת/.test(sum)&&/כחול/.test(sum)&&/ניאון/.test(sum)&&/שלט/.test(sum)&&/מעבדה/.test(sum)&&/פתוח/.test(sum)&&/כבויים/.test(sum),'הסיכום מראה את כל הבחירות');
  await kick(page); await page.screenshot({path:`${SHOTS}/he_6_done.png`});
  await page.click('#wzNext');
  const w=await LSJ(page,WZK());
  ok(w&&w.done===true&&w.v===1&&w.at>0&&w.ctl==='pad','סיום — bbWizard1 = {done:true, v:1, at}');
  ok(await page.evaluate(()=>document.getElementById('wizard').hidden&&!__sim.WZ.on),'האשף נסגר');
  await page.waitForTimeout(500);
  ok(await page.evaluate(()=>!__sim.TOUR.on)&&await LS(page,'bbTour1')==='1','ביטלו ״סיור בסוף״ — אין סיור, והוא לא יקפוץ אחר כך');
  // נשאר אחרי רענון, והאשף לא חוזר
  await page.reload(); await ready(page); await page.waitForTimeout(1200);
  ok(await page.evaluate(()=>!__sim.WZ.on&&document.getElementById('wzChip').hidden),'אחרי רענון — לא אשף ולא שבב');
  ok(await page.evaluate(()=>__sim.QUAL.mode==='mid'&&__sim.SKIN.me==='neon'&&__sim.UI.mode==='lab'),'הבחירות נטענות מחדש');
  // פתיחה מחדש מההגדרות
  await page.evaluate(()=>{ document.getElementById('bSet').click(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(()=>{ const b=document.querySelector('#setBody [data-wiz]'); return !!b&&b.offsetParent!==null; }),'בהגדרות יש ״הגדרה אישית מחדש״');
  await page.click('#setBody [data-wiz]');
  ok(await page.evaluate(()=>__sim.WZ.on&&document.getElementById('playModal').hidden)&&await step(page)==='lang','״הגדרה אישית מחדש״ פותח את האשף מההתחלה (וחלון ההגדרות נסגר)');
  // הפעלה חוזרת לא דורסת גרפיקה בלי בחירה
  await page.click('#wzNext'); await page.waitForFunction(()=>!__sim.WZ.meas,null,{timeout:8000,polling:100}).catch(()=>{});
  ok(await LS(page,'bbQual1')==='mid','הפעלה חוזרת — ההמלצה לא דורסת בחירה קיימת');
  // Esc = דלג
  await page.keyboard.press('Escape');
  ok(await page.evaluate(()=>!__sim.WZ.on&&document.getElementById('wizard').hidden),'Esc סוגר את האשף');
  const w2=await LSJ(page,WZK());
  ok(w2&&w2.done===true&&w2.skipped==='gfx','Esc — נשמר ״דילג״, בלי למחוק כלום');
  ok(await LS(page,'bbQual1')==='mid'&&await LS(page,'bbNetName')==='נועה','Esc לא מוחק הגדרות');
  // Ctrl+K
  await page.keyboard.press('Control+KeyK'); await page.waitForTimeout(100);
  await page.keyboard.type('אשף'); await page.waitForTimeout(150);
  const first=await page.evaluate(()=>__sim.CMDK.res[0]&&__sim.CMDK.res[0].id);
  ok(first==='wizard','חיפוש ״אשף״ מוצא את ההגדרה האישית');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  ok(await page.evaluate(()=>__sim.WZ.on),'Enter בחיפוש פותח את האשף');
  await page.keyboard.press('Escape');
  ok(realErrs(errs).length===0,'בלי שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
  await browser.close();
}
function WZK(){ return 'bbWizard1'; }

/* ── 2. משתמש קיים: לא נפתח לבד — שבב ״חדש״ פעם אחת ── */
{
  const {browser,page,errs}=await open({noraf:true,wizard:true,viewport:{width:1280,height:800}});   /* bbUiMode1 כבר שמור = השתמש בעבר */
  await page.waitForTimeout(3200);
  ok(await page.evaluate(()=>!__sim.WZ.on&&document.getElementById('wizard').hidden),'משתמש קיים — האשף לא קופץ');
  ok(await page.evaluate(()=>!document.getElementById('wzChip').hidden),'משתמש קיים — שבב ״חדש: הגדרה אישית״');
  ok(((await LSJ(page,'bbWizard1'))||{}).chip===true,'השבב נרשם כהוצג');
  await kick(page); await page.screenshot({path:`${SHOTS}/he_0_chip.png`});
  await page.click('#wzChipGo');
  ok(await page.evaluate(()=>__sim.WZ.on&&document.getElementById('wzChip').hidden),'לחיצה על השבב פותחת את האשף');
  await page.keyboard.press('Escape');
  await page.reload(); await ready(page); await page.waitForTimeout(3200);
  ok(await page.evaluate(()=>document.getElementById('wzChip').hidden&&!__sim.WZ.on),'השבב לא חוזר אחרי רענון');
  ok(realErrs(errs).length===0,'בלי שגיאות (משתמש קיים)');
  await browser.close();
}

/* ── 3. החלפת שפה ממשיכה לצעד הבא; באנגלית אין עברית באשף ── */
{
  const {browser,page,errs}=await open({noraf:true,play:true,wizard:true,viewport:{width:1280,height:800}});
  await page.waitForFunction(()=>__sim.WZ.on,null,{timeout:5000,polling:100});
  await Promise.all([page.waitForNavigation({timeout:30000}), page.click('#wizard [data-wz="lang:en"]')]);
  await ready(page);
  await page.waitForFunction(()=>__sim.WZ.on,null,{timeout:5000,polling:100}).catch(()=>{});
  ok(await page.evaluate(()=>document.documentElement.classList.contains('en')),'השפה התחלפה לאנגלית');
  ok(await LS(page,'bbLang1')==='en','bbLang1 = en');
  ok(await step(page)==='gfx','אחרי הטעינה — האשף ממשיך מהצעד הבא (גרפיקה)');
  await page.waitForFunction(()=>!__sim.WZ.meas,null,{timeout:8000,polling:100});
  await page.waitForTimeout(300);
  const heb=[];
  for(let i=0;i<6;i++){ await page.evaluate(i=>__sim.wzGo(i),i); await page.waitForTimeout(120);
    if(i===3) for(const c of ['pad','phone','kb']){ await page.click(`#wizard [data-wz="ctl:${c}"]`); await page.waitForTimeout(80); const t=await wzText(page); if(HEB.test(t)) heb.push('ctl:'+c+': '+t.match(/[֐-׿][^\n]{0,40}/)[0]); }
    const t=await wzText(page); if(HEB.test(t)) heb.push(i+': '+t.match(/[֐-׿][^\n]{0,40}/)[0]); }
  ok(heb.length===0,'באנגלית — אין עברית באשף'+(heb.length?': '+heb.join(' | '):''));
  await shootAll(page,'en');
  await page.evaluate(()=>__sim.wzGo(0));
  ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.wzLangHe b'),'::after').content.includes('עברית')),'בבחירת השפה ״עברית״ כתובה בעברית (שם השפה בשפתה)');
  ok(await page.evaluate(()=>document.querySelector('#wizard [data-wz="lang:en"]').classList.contains('on')),'בצעד השפה — English מסומן');
  const chipTxt=await page.evaluate(()=>{ __sim.wzChipShow(); const t=document.getElementById('wzChip').innerText; document.getElementById('wzChip').hidden=true; return t; });
  ok(!HEB.test(chipTxt),'השבב באנגלית: '+chipTxt.replace(/\s+/g,' '));
  await page.keyboard.press('Escape');
  ok(!await page.evaluate(()=>__sim.WZ.on),'Esc סוגר (אנגלית)');
  ok(realErrs(errs).length===0,'בלי שגיאות (אנגלית)');
  await browser.close();
}

/* ── 4. טלפון 390×844: בלי גלילה לרוחב, הכול בתוך המסך ── */
{
  const {browser,page,errs}=await open({noraf:true,play:true,wizard:true,viewport:{width:390,height:844}});
  await page.waitForFunction(()=>__sim.WZ.on,null,{timeout:5000,polling:100});
  const bad=[];
  for(let i=0;i<6;i++){ await page.evaluate(i=>__sim.wzGo(i),i); await page.waitForTimeout(120);
    const r=await page.evaluate(()=>{ const c=document.querySelector('.wzCard').getBoundingClientRect(), b=document.getElementById('wzBody');
      const n=document.getElementById('wzNext').getBoundingClientRect();
      const over=[...document.querySelectorAll('#wizard *')].filter(e=>{ const q=e.getBoundingClientRect(); return q.width&&(q.right>innerWidth+1||q.left<-1); }).length;
      return {l:c.left,r:c.right,t:c.top,bt:c.bottom,sw:b.scrollWidth,cw:b.clientWidth,over,nb:n.bottom,H:innerHeight,W:innerWidth,doc:document.documentElement.scrollWidth}; });
    if(r.l<0||r.r>r.W||r.t<0||r.bt>r.H||r.sw>r.cw+1||r.over||r.nb>r.H||r.doc>r.W) bad.push(i+':'+JSON.stringify(r)); }
  ok(bad.length===0,'390px — כל הצעדים בתוך המסך, בלי גלילה לרוחב'+(bad.length?': '+bad.join(' '):''));
  await shootAll(page,'phone');
  ok(realErrs(errs).length===0,'בלי שגיאות (טלפון)');
  await browser.close();
}

/* ── 5. בבדיקות רגילות (h.mjs) האשף לא מפריע ── */
{
  const {browser,page}=await open({noraf:true});
  await page.waitForTimeout(1500);
  ok(await page.evaluate(()=>!__sim.WZ.on&&document.getElementById('wizard').hidden&&document.getElementById('wzChip').hidden),'בדיקות אחרות — בלי אשף ובלי שבב');
  await browser.close();
}
done('v63_wiz');
