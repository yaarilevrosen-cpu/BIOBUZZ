// v63 — אף כפתור באפליקציה לא יושב בתוך ״ידית גרירה״ של החלון (-webkit-app-region:drag)
// ב-Windows לחיצה בתוך אזור גרירה נבלעת כ״גרירת חלון״ — הכפתור נראה אבל מת.
// הבדיקה: בכמה גדלי חלון ובכמה מצבים (דפים ותפריטים פתוחים) — כל רכיב לחיץ שגלוי ושהעכבר מגיע אליו
// לא נמצא עם המרכז שלו בתוך מלבן drag, אלא אם הוא גם בתוך מלבן no-drag.
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bbdrag-'));
const SIM=process.env.BIOBUZZ_SIM||path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html');
const app=await electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_SIM:SIM,BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none'}});
const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
const E=(f,a)=>win.evaluate(f,a);
await E(()=>{ const w=document.getElementById('welcome'); if(w) w.hidden=true;
  window.__nav=p=>document.querySelector('#appNav [data-nav="'+p+'"]:not(.navMe)').click(); });

// גדלי תוכן טיפוסיים של חלון מוגדל (בלי מסגרת, עם שורת משימות)
const sizes=[[1920,1013],[1536,801],[1366,705],[1280,657],[1024,700]];
const states={
  home:()=>__nav('home'), play:()=>__nav('play'), lab:()=>__nav('lab'),
  stats:()=>__nav('stats'), drivers:()=>__nav('drivers'), settings:()=>__nav('settings'),
  'lab+tbHud':()=>{ __nav('lab'); document.getElementById('tbHud').click(); },
  'lab+tbMagic':()=>{ __nav('lab'); document.getElementById('tbMagic').click(); },
  'play+profChip':()=>{ __nav('play'); document.getElementById('profChip').click(); },
};
// סוגר כל מה שפתוח לפני המצב הבא
const reset=()=>E(()=>{
  for(const id of ['playModal','profMenu','acctModal','skinBox','bldBox','cmdk','bugModal','hudMenu','magicMenu','coachBox','padStudio','qrBox']){ const m=document.getElementById(id); if(m) m.hidden=true; }
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); });
// הסריקה עצמה — רצה בתוך הדף
const scan=()=>E(()=>{
  const drags=[], nod=[];
  for(const el of document.querySelectorAll('*')){
    const cs=getComputedStyle(el), v=cs.webkitAppRegion; if(v!=='drag'&&v!=='no-drag') continue;
    const r=el.getBoundingClientRect(); if(!r.width||!r.height||cs.visibility!=='visible') continue;
    (v==='drag'?drags:nod).push(r); }
  const inR=(r,x,y)=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  const out=[]; let seen=0;
  for(const el of document.querySelectorAll('button,summary,label,select,input,a[href],[data-nav],[role=button]')){
    const r=el.getBoundingClientRect(); if(r.width<3||r.height<3) continue;
    const cs=getComputedStyle(el); if(cs.visibility!=='visible'||cs.pointerEvents==='none') continue;
    const x=r.left+r.width/2, y=r.top+r.height/2; if(x<0||y<0||x>innerWidth||y>innerHeight) continue;
    const top=document.elementFromPoint(x,y); if(!top||!(top===el||el.contains(top)||top.contains(el))) continue; // העכבר באמת מגיע אליו
    seen++;
    if(!drags.some(d=>inR(d,x,y))||nod.some(d=>inR(d,x,y))) continue;
    out.push((el.id?'#'+el.id:el.tagName.toLowerCase()+(el.dataset.nav?'[nav='+el.dataset.nav+']':''))+' "'+(el.textContent||el.value||'').trim().replace(/\s+/g,' ').slice(0,24)+'"');
  }
  return {out,seen,drags:drags.length}; });

const bad={}; let checked=0, minSeen=1e9, opened=0, dragSeen=0;
for(const [W,H] of sizes){
  await app.evaluate(({BrowserWindow},[W,H])=>{ const w=BrowserWindow.getAllWindows()[0]; w.unmaximize(); w.setContentBounds({x:0,y:0,width:W,height:H}); },[W,H]);
  await win.waitForTimeout(500);
  const got=await E(()=>[innerWidth,innerHeight]);
  ok(Math.abs(got[0]-W)<=2&&Math.abs(got[1]-H)<=2,'גודל חלון '+W+'x'+H+' ('+got.join('x')+')');
  for(const [name,fn] of Object.entries(states)){
    await reset(); await win.waitForTimeout(150);
    let err=null; try{ await win.evaluate(fn); }catch(e){ err=String(e).slice(0,100); }
    if(err){ ok(false,'פתיחת המצב '+name+' נכשלה: '+err); continue; }
    opened++;
    await win.waitForTimeout(450);
    const r=await scan(); checked++; minSeen=Math.min(minSeen,r.seen); dragSeen=Math.max(dragSeen,r.drags);
    for(const t of r.out) (bad[t]=bad[t]||[]).push(W+'x'+H+':'+name);
  }
}
ok(opened===sizes.length*Object.keys(states).length,'כל המצבים נפתחו ('+opened+')');
ok(dragSeen>0,'יש בכלל אזור גרירה (שורת הכותרת) — הסריקה לא ריקה');
ok(minSeen>=5,'בכל מצב נמצאו רכיבים לחיצים לבדיקה (מינימום '+minSeen+')');
const ents=Object.entries(bad).sort((a,b)=>b[1].length-a[1].length);
for(const [k,v] of ents.slice(0,15)) console.log('    מת: '+k+' ×'+v.length+'  למשל '+v.slice(0,3).join(', '));
ok(ents.length===0,'אף כפתור גלוי לא נמצא בתוך אזור גרירה ('+checked+' סריקות, '+ents.length+' כפתורים מתים)');
ok(errs.length===0,'בלי שגיאות בדף'+(errs.length?': '+errs[0]:''));
await app.close(); fs.rmSync(DATA,{recursive:true,force:true});
done('app_drag_test');
