// v70 — רוחות לכל מצב (שיא / קודמת / מקובץ), שיתוף בקובץ, ומפת נסיעה בעונה ובתחקיר
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; });

/* ריצה מזויפת לרוח הישנה: 60 פריימים, ניקוד 33 */
const mkRows=(n,sc)=>Array.from({length:n},(_,i)=>[-50+i*0.5,-40,0.1*i,4,Math.min(sc,i)]);

// 1. העברת המפתח הישן לשיא של ״מאץ׳ מלא״
let r=await E((rows)=>{ localStorage.removeItem('biobuzz_ghost_v2');
  localStorage.setItem('biobuzz_ghost_v1',JSON.stringify({score:33,when:Date.now()-1000,rows}));
  S.ghostStoreReset(); const st=S.ghostStore();
  return {m:st.best.match&&st.best.match.score, n:st.best.match&&st.best.match.rows.length, mode:st.best.match&&st.best.match.mode,
    old:localStorage.getItem('biobuzz_ghost_v1'), v2:!!localStorage.getItem('biobuzz_ghost_v2'), load:S.ghostLoad()&&S.ghostLoad().score}; },mkRows(60,33));
ok(r.m===33&&r.n===60&&r.mode==='match'&&r.load===33,'המפתח הישן עבר לשיא של ״מאץ׳ מלא״: '+r.m+' נק׳, '+r.n+' פריימים');
ok(r.old===null&&r.v2,'המפתח הישן נמחק אחרי ההעברה, והחדש נשמר');

// 2. מאץ׳ קצר (מאץ׳ מלא) ואז תרגיל ״מחזורים״ — כל אחד נשמר לבד
const runMatch=(drill,tele,drive)=>E(([drill,tele,drive])=>{
  S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=tele; S.MYAUTO.lvl='none'; S.GAME.ghost=true;
  S.gameStart(false); if(drill) S.DRILL.on=drill; S.matchStart();
  const arm={mode:S.GHOST.mode, on:S.GHOST.on, play:S.GHOST.play?S.GHOST.play.mode+':'+S.GHOST.play.score:null};
  if(drive){ S.key('KeyW',true); S.advance(tele*0.45,1/60); S.key('KeyW',false); S.key('KeyD',true); S.advance(tele*0.6,1/60); S.key('KeyD',false); }
  else S.advance(tele+0.5,1/60);
  const o={arm, phase:S.MATCH.phase, rec:S.GHOST.rec.length};
  const b=document.getElementById('bannerX'); if(b) b.click();
  return o; },[drill,tele,drive]);
r=await runMatch(null,5,false);
let st=await E(()=>{ const st=S.ghostStore(); return {best:Object.fromEntries(Object.entries(st.best).map(([k,g])=>[k,[g.score,g.rows.length]])),
  last:Object.fromEntries(Object.entries(st.last).map(([k,g])=>[k,[g.score,g.rows.length]]))}; });
ok(r.arm.mode==='match'&&r.arm.on&&r.arm.play==='match:33','במאץ׳ מלא רצה הרוח של ״מאץ׳ מלא״ ('+r.arm.play+')');
ok(r.phase==='סיום'&&st.last.match&&st.last.match[1]>=90&&st.best.match[0]===33,
  'המאץ׳ נשמר כ״ריצה קודמת״ ('+(st.last.match||[])[1]+' פריימים), השיא 33 נשאר');
r=await runMatch('cycle',4,false);
st=await E(()=>{ const st=S.ghostStore(); return {best:Object.fromEntries(Object.entries(st.best).map(([k,g])=>[k,[g.score,g.rows.length,g.mode]]))}; });
ok(r.arm.mode==='cycle'&&!r.arm.on,'בתרגיל ״מחזורים״ אין עדיין רוח — לא רצה הרוח של המאץ׳ המלא (מצב '+r.arm.mode+')');
ok(st.best.cycle&&st.best.cycle[2]==='cycle'&&st.best.match[0]===33,'לתרגיל שיא משלו ('+(st.best.cycle||[])[1]+' פריימים), והשיא של המאץ׳ המלא לא נגע ('+st.best.match[0]+')');
r=await runMatch('cycle',2,false);
ok(r.arm.mode==='cycle'&&r.arm.on&&/^cycle:/.test(r.arm.play),'בתרגיל השני רצה הרוח של התרגיל ('+r.arm.play+')');

// 3. הבורר ״מתחרים מול״ מחליף מקור — גם באמצע מאץ׳
r=await E(()=>{ S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=6; S.gameStart(false); S.matchStart(); S.advance(0.5,1/60);
  const st=S.ghostStore(), o={};
  document.querySelector('[data-gsrc="last"]').click(); S.advance(0.3,1/60); S.refreshGhost();
  o.last={src:S.GHOST.playSrc, n:S.GHOST.play&&S.GHOST.play.rows.length, want:st.last.match.rows.length, txt:document.getElementById('oGhost').textContent,
    on:document.querySelector('[data-gsrc="last"]').classList.contains('on'), tag:document.getElementById('ghTag')&&!document.getElementById('ghTag').hidden?document.getElementById('ghTag').textContent:''};
  document.querySelector('[data-gsrc="best"]').click(); S.refreshGhost();
  o.best={src:S.GHOST.playSrc, sc:S.GHOST.play&&S.GHOST.play.score, txt:document.getElementById('oGhost').textContent, tag:document.getElementById('ghTag').textContent};
  document.querySelector('[data-gsrc="file"]').click(); S.refreshGhost();
  o.file={on:S.GHOST.on, txt:document.getElementById('oGhost').textContent};
  document.querySelector('[data-gsrc="best"]').click();
  o.delta=typeof S.GHOST.delta==='number';
  S.matchStop(); return o; });
ok(r.last.src==='last'&&r.last.n===r.last.want&&r.last.on&&/הריצה הקודמת/.test(r.last.txt),'״הריצה הקודמת״: רצה הריצה הקודמת ('+r.last.n+' פריימים)');
ok(/הריצה הקודמת/.test(r.last.tag)&&/נק׳/.test(r.last.tag),'התווית על המסך מראה מקור, ניקוד ופער: '+r.last.tag);
ok(r.best.src==='best'&&r.best.sc===33&&/השיא שלי/.test(r.best.txt)&&/33 נק׳/.test(r.best.tag),'״השיא שלי״: חזר לשיא (33) — '+r.best.tag);
ok(!r.file.on&&/עוד לא נטען קובץ/.test(r.file.txt)&&r.delta,'״רוח מקובץ״ בלי קובץ: אין רוח, ויש הסבר');

// 4. ייצוא ← ייבוא: אותה ריצה בדיוק
const dlP=page.waitForEvent('download',{timeout:10000});
await E(()=>{ const n=document.getElementById('ghName'); n.value='דני'; n.dispatchEvent(new Event('input')); S.ghostExport('match'); });
const dl=await dlP; const fp=await dl.path(); const txt=fs.readFileSync(fp,'utf8'); const fo=JSON.parse(txt);
ok(fo.bb==='ghost'&&fo.v===1&&fo.mode==='match'&&fo.name==='דני'&&fo.score===33&&fo.frames.length===60&&isFinite(fo.date),
  'הקובץ שהורד: גרסה '+fo.v+', מצב '+fo.mode+', נהג '+fo.name+', '+fo.score+' נק׳, '+fo.frames.length+' פריימים, '+txt.length+' בתים ('+dl.suggestedFilename()+')');
await page.setInputFiles('#ghFile',{name:'g.json',mimeType:'application/json',buffer:Buffer.from(txt)});
await page.waitForFunction(()=>S.ghostStore().file,null,{timeout:5000});
r=await E(()=>{ const st=S.ghostStore(), a=st.file, b=st.best.match;
  return {eq:JSON.stringify(a.rows)===JSON.stringify(b.rows), sc:a.score, name:a.name, mode:a.mode, src:S.GHOST.src}; });
ok(r.eq&&r.sc===33&&r.name==='דני'&&r.mode==='match','ייבוא מקובץ: אותם פריימים, אותו ניקוד ('+r.sc+') ואותו שם');
ok(r.src==='file','אחרי ייבוא הבורר עובר ל״רוח מקובץ״');
r=await E(()=>{ S.MT.tele=3; S.gameStart(false); S.matchStart(); S.advance(0.4,1/60); S.refreshGhost();
  const o={on:S.GHOST.on, src:S.GHOST.playSrc, tag:document.getElementById('ghTag').textContent, txt:document.getElementById('oGhost').textContent}; S.matchStop(); return o; });
ok(r.on&&r.src==='file'&&/דני/.test(r.tag)&&/דני/.test(r.txt),'במאץ׳ רצה הרוח של החבר, עם השם שלו: '+r.tag);

// 5. קבצים פגומים נדחים
r=await E((good)=>{ const G=JSON.parse(good), T=o=>!!S.ghostParse(typeof o==='string'?o:JSON.stringify(o)).g;
  const c=f=>{ const o=JSON.parse(good); f(o); return o; };
  return {
    good:T(good),
    big:T(' '.repeat(400001)),
    notJson:T('{nope'),
    wrongKind:T(c(o=>o.bb='backup')),
    wrongVer:T(c(o=>o.v=2)),
    strNum:T(c(o=>o.frames[3][0]='5')),
    nullNum:T(c(o=>o.frames[3][1]=null)),
    obj:T(c(o=>o.frames[2]={x:1})),
    short:T(c(o=>o.frames[1]=[1,2,3,4])),
    outField:T(c(o=>o.frames[5][0]=500)),
    tooMany:T(c(o=>{ const f=o.frames[0]; o.frames=Array.from({length:12001},()=>f.slice()); })),
    noScore:T(c(o=>delete o.score)),
    exactCap:T(c(o=>{ const f=o.frames[0]; o.frames=Array.from({length:12000},()=>f.slice()); })),
    file0:S.ghostStore().file.name };
  },txt);
const bad=['big','notJson','wrongKind','wrongVer','strNum','nullNum','obj','short','outField','tooMany','noScore'];
ok(r.good&&r.exactCap&&bad.every(k=>r[k]===false),'קבצים פגומים נדחים ('+bad.filter(k=>r[k]===false).length+'/'+bad.length+'), תקין ו-12000 פריימים בדיוק מתקבלים');
r=await E((good)=>{ const o=JSON.parse(good); o.name='<img src=x onerror="window.__xss=1">\u0007abcdefghijklmnopqrstuvwxyz';
  const okI=S.ghostImportText(JSON.stringify(o)); S.refreshGhost(); const bad0=S.ghostImportText('{"bb":"ghost","v":1,"frames":[["x"]]}');
  return {okI, bad0, name:S.ghostStore().file.name, img:document.querySelectorAll('#oGhost img').length, xss:!!window.__xss}; },txt);
ok(r.okI&&!r.bad0&&r.name.length<=24&&!/\u0007/.test(r.name)&&r.img===0&&!r.xss,'שם מקובץ מנוקה ומוצג כטקסט ('+r.name.length+' תווים, בלי תגיות), וקובץ פגום לא מחליף את הרוח');

// 6. מפת נסיעה ברשומת העונה
r=await E(()=>{ S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=16; S.gameStart(false); S.matchStart();
  S.key('KeyW',true); S.advance(7,1/60); S.key('KeyW',false); S.key('KeyA',true); S.advance(9.5,1/60); S.key('KeyA',false);
  const b=document.getElementById('bannerX'); if(b) b.click();
  const a=S.seasonAll(), m=a[a.length-1];
  return {n:m.pos&&m.pos.length, ints:m.pos.every(p=>Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1])),
    span:Math.max(...m.pos.map(p=>p[0]))-Math.min(...m.pos.map(p=>p[0]))+Math.max(...m.pos.map(p=>p[1]))-Math.min(...m.pos.map(p=>p[1])),
    bytes:JSON.stringify(m.pos).length, deb:(S.DEB.report.pos||[]).length}; });
ok(r.n>=17&&r.n<=22&&r.ints,'ברשומת העונה יש pos: '+r.n+' נקודות שלמות ב-16 שנ׳ ('+r.bytes+' בתים)');
ok(r.span>20,'הנקודות עוקבות אחרי הנסיעה (פריסה '+r.span+'″)');
r=await E(()=>{ S.MT.tele=999; S.gameStart(false); S.matchStart(); S.SEASON.cur.pos=[]; S.SEASON.posT=0; S.SEASON.posDt=S.POS_DT;
  for(let i=0;i<6000;i++) S.posTick(0.1);   /* עשר דקות של מאץ׳ */
  const n=S.SEASON.cur.pos.length, dtx=S.SEASON.posDt; S.matchStop(); return {n, dtx}; });
ok(r.n<=200&&r.n>=100&&Math.abs(r.dtx-3.2)<1e-9,'מאץ׳ של עשר דקות: עד 200 נקודות ('+r.n+'), והקצב גדל ל-'+r.dtx+' שנ׳');

// 7. תצוגת ״נסיעה״ במפת העונה מציירת
r=await E(()=>{ const box=document.getElementById('seasonBox'); box.open=true; const sb=document.getElementById('statsBox'); if(sb) sb.open=true;
  const cv=document.getElementById('seasonMap'), g=cv.getContext('2d');
  const count=()=>{ const d=g.getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=0;i<d.length;i+=4) if(d[i]>120&&d[i+2]>170&&d[i+1]<d[i+2]-25&&d[i]>d[i+1]) n++; return n; };
  document.querySelector('[data-sv="blocks"]').click(); const before=count();
  const b=document.querySelector('[data-sv="drive"]'); b.click();
  return {before, after:count(), on:b.classList.contains('on'), view:S.SEASON.view, label:b.textContent}; });
ok(r.view==='drive'&&r.on&&r.label==='נסיעה','כפתור ״נסיעה״ בחר את התצוגה');
ok(r.after>300&&r.after>r.before,'מפת הנסיעה צוירה: '+r.after+' פיקסלים סגולים (בחסימות: '+r.before+')');

// 8. תחקיר: ״איפה הייתי״
r=await E(()=>{ S.renderDebrief(); const cv=document.getElementById('dbPosMap'); return {has:!!cv, cells:S.debriefPosDraw(S.DEB.report), txt:document.getElementById('oDebrief').textContent}; });
ok(r.has&&r.cells>3&&/איפה הייתי/.test(r.txt),'בתחקיר מפה קטנה ״איפה הייתי״ ('+r.cells+' תאים)');

// 9. גיבוי כולל את הרוחות
r=await E(()=>{ const b=S.bk.save('בדיקה',{force:true}); return !!(b&&b.data&&b.data.biobuzz_ghost_v2); });
ok(r,'גיבוי ידני כולל את biobuzz_ghost_v2');

ok(realErrs(errs).length===0,'בלי שגיאות בדף'+(realErrs(errs).length?': '+realErrs(errs).slice(0,3).join(' | '):''));
await browser.close();
done('v70_ghost_test');
