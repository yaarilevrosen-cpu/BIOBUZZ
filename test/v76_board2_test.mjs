// v76 — לוח אסטרטגיה, שלב 2: שלבים וניגון, חץ מעוקל, אזור, טקסט, כדורים, בחירה, תבניות, קוד לשיתוף, הדפסה,
// רשת (frm/frs, קצב אורח, תאימות לגרסה ישנה), ״המר לתלת־ממד״, ״מוכנות לתחרות״, מקלדת
import {open,ok,done,realErrs} from './h.mjs';
import {execSync} from 'child_process';
/* תאימות אמיתית: הבדיקה של גרסה 1.16.0 (v75) נלקחת מגיט ורצה כאן מול ההודעות החדשות */
let OLD=null;
try{ const src=execSync('git show 9659920:biobuzz-sim.html',{cwd:new URL('..',import.meta.url).pathname,maxBuffer:64<<20}).toString();
  const a=src.indexOf('function brdThOk'), b=src.indexOf('/* ── מצב: מחילים פעולה');
  OLD=new Function('HALF','netStr','BRD_MAXS','BRD_PTS',src.slice(a,b)+';return {brdOpOk,brdUnpack};')(72,(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,n||20),40,60);
}catch(e){ console.log('  (בלי גיט — מדלגים על בדיקת הגרסה הישנה) '+e.message); }
/* חלק א׳ בלי לולאת ציור (המכונה עמוסה — טיימרים מדויקים), חלק ב׳ (תלת־ממד) במצב משחק */
let {browser,page,errs}=await open({noraf:true});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);
const allErrs=[];
await E(()=>{ window.S=__sim; localStorage.removeItem('bbBoards1'); localStorage.removeItem('bbBoardCur1'); S.SETUP.ally='red';
  S.BRD.tok=null; S.BRD.s=[]; S.BRD.it=[]; S.BRD.b=[]; S.BRD.fr=null; S.BRD.cur=0; S.BRD.hist=[]; S.BRD.fut=[]; S.brdOpen();
  window.px=(x,z)=>{ const r=document.getElementById('brdCv').getBoundingClientRect(); return [r.left+(x+72)/144*r.width, r.top+(z+72)/144*r.height]; }; });
const drag=async(a,b,steps=8)=>{ const p=await E(([x,z])=>px(x,z),a), q=await E(([x,z])=>px(x,z),b);
  await page.mouse.move(p[0],p[1]); await page.mouse.down(); await page.mouse.move(q[0],q[1],{steps}); await page.mouse.up(); };
const click=async a=>{ const p=await E(([x,z])=>px(x,z),a); await page.mouse.click(p[0],p[1]); };

// 1. ממשק קל: כלים בשורה אחת, השאר תחת ״⋯״
let r=await E(()=>{ const m=document.getElementById('brdBox'); return {tools:[...m.querySelectorAll('[data-brdt]')].map(b=>b.dataset.brdt), menu:document.getElementById('brdMenu').hidden,
  items:document.querySelectorAll('#brdMenu button').length, strip:document.getElementById('brdFr').hidden}; });
ok(r.tools.join()==='move,arrow,pen,zone,text,ball,erase'&&r.menu&&r.items<=10&&r.strip,'כלים בשורה אחת ('+r.tools.length+'), ״⋯״ סגור עם '+r.items+' פעולות, רצועת השלבים מוסתרת בשלב אחד');
await E(()=>document.querySelector('[data-brd="more"]').click());
r=await E(()=>({open:!document.getElementById('brdMenu').hidden}));
await page.keyboard.press('Escape');
r.after=await E(()=>({menu:document.getElementById('brdMenu').hidden, box:!document.getElementById('brdBox').hidden}));
ok(r.open&&r.after.menu&&r.after.box,'״⋯״ נפתח, ו-Esc סוגר רק את התפריט — הלוח נשאר פתוח');

// 2. חץ מעוקל: ציור, ידית אמצע בכלי הזזה, del+add עם מזהה חדש, ביטול; העורך מקבל את העיקול
await E(()=>{ S.brdClear(); S.brdResetTok(); document.querySelector('[data-brdt="arrow"]').click(); });
const me=await E(()=>S.BRD.tok[S.brdMine()].slice());
await drag(me,[me[0]+50,me[1]-40]);
await E(()=>document.querySelector('[data-brdt="move"]').click());
r=await E(()=>{ const s=S.BRD.s[0]; return {id:s.id, mid:[(s.p[0]+s.p[2])/2,(s.p[1]+s.p[3])/2]}; });
const id0=r.id;
await click(r.mid);   /* בוחר את החץ */
await drag(r.mid,[r.mid[0]+14,r.mid[1]+14]);
r=await E(()=>{ const s=S.BRD.s[0]; return {n:S.BRD.s.length, id:s.id, q:s.q||null, ch:S.brdChain().length, pick:S.BRD.pick}; });
ok(r.n===1&&r.id!==id0&&r.q&&r.ch>=3,'גרירת הידית האמצעית מעקמת את החץ (q='+JSON.stringify(r.q)+'), מזהה חדש (del+add), השרשרת נדגמת: '+r.ch+' נקודות');
r=await E(()=>{ S.brdUndo(); const a=S.BRD.s[0]; const u={id:a.id,q:a.q||null}; S.brdRedo(); const b=S.BRD.s[0]; return {u, rq:!!b.q}; });
ok(r.u.id===id0&&!r.u.q&&r.rq,'״בטל״ מחזיר את החץ הישר המקורי, ״חזור״ את העיקול');
r=await E(()=>{ const s=S.BRD.s[0], seg=S.brdCurvePts(s,12); const res=S.brdToEditor(); const u=res.pts;
  /* כל נקודה בעורך קרובה לעקומה */
  const far=u.slice(1).map(p=>Math.min(...S.brdCurvePts(s,1).map(q=>Math.hypot(q.x-p.x,q.z-p.z)))); S.brdOpen(); return {n:u.length, far:Math.max(...far), seg:seg.length}; });
ok(r.n>=4&&r.far<6,'״העבר לעורך״: '+r.n+' נקודות לאורך העיקול (הרחוקה '+r.far.toFixed(1)+'″ מהעקומה)');

// 3. אזור, טקסט, כדורים — ציור, בדיקה, תקרות
await E(()=>document.querySelector('[data-brdt="zone"]').click());
{ const p=await E(()=>px(20,-50)); await page.mouse.move(p[0],p[1]); await page.mouse.down();
  for(const [x,z] of [[40,-50],[40,-30],[20,-30],[21,-49]]){ const q=await E(([x,z])=>px(x,z),[x,z]); await page.mouse.move(q[0],q[1],{steps:5}); } await page.mouse.up(); }
r=await E(()=>{ const z=S.BRD.s.find(s=>s.f); return {z:!!z, n:z?z.p.length/2:0, inside:S.brdStrokeAt({x:30,z:-40})>=0&&S.BRD.s[S.brdStrokeAt({x:30,z:-40})].f===1}; });
ok(r.z&&r.n>=4&&r.inside,'אזור: קו סגור עם f:1 ('+r.n+' נקודות), לחיצה בתוכו מוצאת אותו');
await E(()=>document.querySelector('[data-brdt="text"]').click());
await click([-20,20]);
await page.waitForTimeout(80);
r=await E(()=>({vis:!document.getElementById('brdTxtIn').hidden, foc:document.activeElement&&document.activeElement.id}));
await page.keyboard.type('לחסום כאן');
await page.keyboard.press('Enter');
r.it=await E(()=>S.BRD.it.map(t=>({t:t.t,x:t.x,z:t.z})));
ok(r.vis&&r.foc==='brdTxtIn'&&r.it.length===1&&r.it[0].t==='לחסום כאן'&&Math.abs(r.it[0].x+20)<1.5,'טקסט: לחיצה פותחת שדה, Enter מוסיף תווית ״'+(r.it[0]&&r.it[0].t)+'״');
await click([-20,20]); await page.waitForTimeout(80); await page.keyboard.press('Escape');
r=await E(()=>({box:!document.getElementById('brdBox').hidden, inp:document.getElementById('brdTxtIn').hidden, n:S.BRD.it.length}));
ok(r.box&&r.inp&&r.n===1,'Esc בעריכת טקסט מבטל רק את העריכה — הלוח נשאר פתוח');
r=await E(()=>({ok1:!!S.brdTxtOk({id:'a-1',x:0,z:0,t:'x'.repeat(40)}), long:S.brdTxtOk({id:'a-1',x:0,z:0,t:'x'.repeat(41)}), ctl:S.brdTxtOk({id:'a-1',x:0,z:0,t:'a\u0007b'}), emp:S.brdTxtOk({id:'a-1',x:0,z:0,t:'  '}), num:S.brdTxtOk({id:'a-1',x:0,z:0,t:5})}));
ok(r.ok1&&!r.long&&!r.ctl&&!r.emp&&!r.num,'תווית: עד 40 תווים; ארוכה, תו בקרה, ריקה ומספר — נדחים');
await E(()=>document.querySelector('[data-brdt="ball"]').click());
await click([0,-60]); await click([5,-60]); await click([5,-60]);
r=await E(()=>{ const b=S.BRD.b.map(q=>q.slice()); let n=0; for(let i=0;i<30;i++) if(S.brdBallClick({x:-60+i*4,z:60})) n++; const cap=S.BRD.b.length; S.brdUndo(); return {b, cap, ok3:S.brdBallsOk([[0,0,3]]), ok4:S.brdBallsOk(new Array(25).fill([0,0,0]))}; });
ok(r.b.length===2&&r.b[1][2]===1&&r.cap===24&&r.ok3===null&&r.ok4===null,'כדורים: לחיצה מוסיפה, לחיצה על כדור מחליפה לנקטר ('+JSON.stringify(r.b)+'), תקרה 24, סוג 3 ו-25 כדורים נדחים');
r=await E(()=>{ S.brdApply({o:'bl',b:[]}); const n=S.brdSnapField(); return {n, b:S.BRD.b.length, sim:S.balls.length}; });
ok(r.n>0&&r.n<=24&&r.b===r.n,'״כדורים מהזירה״: '+r.n+' כדורים מהרצפה (בזירה '+r.sim+')');

// 4. מקלדת: חצים מזיזים, R מסובב, Delete מוחק
await E(()=>{ document.querySelector('[data-brdt="move"]').click(); S.BRD.pick={k:'tok',i:S.brdMine()}; document.getElementById('brdCv').focus(); });
r=await E(()=>S.BRD.tok[S.brdMine()].slice());
await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowUp'); await page.keyboard.press('r');
r={a:r, b:await E(()=>({t:S.BRD.tok[S.brdMine()].slice(), h:S.BRD.th[S.brdMine()], msg:document.getElementById('brdMsg').textContent}))};
ok(Math.abs(r.b.t[0]-(r.a[0]+1))<0.05&&Math.abs(r.b.t[1]-(r.a[1]-6))<0.05&&/אני/.test(r.b.msg),'מקלדת: → זז 1″, Shift+↑ זז 6″, R מסובב ('+r.b.t.join(', ')+', '+r.b.h+'°) · מוקרא: ״'+r.b.msg+'״');
r=await E(()=>{ const z=S.BRD.s.find(s=>s.f); S.BRD.pick={k:'s',id:z.id}; return S.BRD.s.length; });
await page.keyboard.press('Delete');
r={a:r, b:await E(()=>({n:S.BRD.s.length, f:S.BRD.s.some(s=>s.f)}))};
ok(r.b.n===r.a-1&&!r.b.f,'Delete מוחק את האזור שנבחר');

// 5. שלבים: הוספה (הרובוטים ממשיכים מסוף החצים), צל, מעבר, שם, מחיקה, תקרה, שמירה
r=await E(()=>{ S.brdClear(); S.brdResetTok(); const i=S.brdMine(), q=S.BRD.tok[i];
  S.brdAddStroke('a',0,[q[0],q[1],q[0]+30,q[1]-20]); S.brdAddStroke('a',0,[q[0]+30,q[1]-20,q[0]+40,q[1]-50]);
  S.brdFrame('add'); const f=S.BRD.fr; return {n:f&&f.length, cur:S.BRD.cur, tok:S.BRD.tok[i].slice(), want:[q[0]+40,q[1]-50], s:S.BRD.s.length, strip:!document.getElementById('brdFr').hidden,
    btns:document.querySelectorAll('#brdFr [data-brdf="sel"]').length, th:S.BRD.th[i]}; });
ok(r.n===2&&r.cur===1&&r.tok.join()===r.want.join()&&r.s===0&&r.strip&&r.btns===2,'״＋ שלב״: שלב 2 נוצר, ״אני״ עומד בסוף החצים ('+r.tok.join(', ')+', '+r.th+'°), החצים נשארו בשלב 1, הרצועה מופיעה');
r=await E(()=>{ const i=S.brdMine(), q=S.BRD.tok[i]; S.brdAddStroke('a',1,[q[0],q[1],q[0]-10,q[1]+30]);
  S.brdFrame('name',1,'חזרה'); S.brdFrame('sel',0); const a={cur:S.BRD.cur, s:S.BRD.s.length}; S.brdFrame('sel',1); return {a, s:S.BRD.s.length, n:S.BRD.fr[1].n, hist:S.BRD.hist.length}; });
ok(r.a.cur===0&&r.a.s===2&&r.s===1&&r.n==='חזרה'&&r.hist===0,'מעבר בין שלבים שומר את התוכן של כל שלב ('+r.a.s+' / '+r.s+' חצים), שם לשלב, ההיסטוריה של שלב מתאפסת');
r=await E(()=>{ let n=0; for(let k=0;k<10;k++) if(S.brdFrame('add')) n++; const len=S.BRD.fr.length; const msg=document.getElementById('brdMsg').textContent; return {n,len,msg}; });
ok(r.len===8&&/8/.test(r.msg),'תקרה: עד 8 שלבים ('+r.len+')');
r=await E(()=>{ while(S.BRD.fr&&S.BRD.fr.length>2) S.brdFrame('del',S.BRD.fr.length-1); return {n:S.BRD.fr.length, cur:S.BRD.cur}; });
ok(r.n===2,'מחיקת שלבים חוזרת ל-2');
await E(async()=>{ for(let k=0;k<60;k++){ const v=localStorage.getItem('bbBoardCur1'); if(v&&JSON.parse(v).fr) return; await new Promise(res=>setTimeout(res,100)); } });
r=await E(()=>{ const raw=JSON.parse(localStorage.getItem('bbBoardCur1')); const u=S.brdUnpack(raw); S.brdSave('שלבים'); const L=S.brdLib()['שלבים'];
  return {raw:raw&&raw.fr&&raw.fr.length, u:u&&u.fr&&u.fr.length, cur:u&&u.cur, lib:L&&L.fr&&L.fr.length, root:raw&&raw.tok&&raw.s.length}; });
ok(r.raw===2&&r.u===2&&r.lib===2,'שמירה: הלוח הנוכחי והספרייה שומרים את שני השלבים (שורש = השלב הנוכחי: '+r.root+' חצים) '+JSON.stringify(r));
if(OLD){ r=await E(()=>({cur:JSON.parse(localStorage.getItem('bbBoardCur1')), lib:JSON.parse(localStorage.getItem('bbBoards1'))['שלבים']}));
  const u1=OLD.brdUnpack(r.cur), u2=OLD.brdUnpack(r.lib);
  ok(u1&&u2&&u1.s.length===r.cur.s.length&&u2.tok.length===4,'גרסה 1.16.0 קוראת את הלוח החדש (השלב הנוכחי: '+(u1&&u1.s.length)+' חצים)'); }
r=await E(()=>{ S.brdFrame('sel',0); S.brdDraw(); S.brdFrame('sel',1); S.brdDraw(); S.brdClear(); S.brdFrame('sel',0); S.brdLoad('שלבים'); return {n:S.BRD.fr&&S.BRD.fr.length, cur:S.BRD.cur, s1:S.BRD.fr[1].s.length}; });
ok(r.n===2&&r.s1===1,'טעינה מהספרייה מחזירה את כל השלבים ('+r.n+', בשלב 2: '+r.s1+' חץ)');

// 6. ניגון: לאורך שרשרת החצים, בזמן לפי המהירות
r=await E(()=>{ S.brdFrame('sel',0); const i=S.brdMine(), segs=S.brdPlayBuild(), p=segs[0].paths[i];
  const a0=S.brdPlayAt(0).pose[i], aMid=S.brdPlayAt(p.t*0.5,segs).pose[i], aEnd=S.brdPlayAt(segs[0].dur-0.01,segs).pose[i], f2=S.brdPlayAt(segs[0].dur+0.01,segs);
  const q=S.BRD.tok[i]; const e=p.pts[p.pts.length-1];
  /* נקודת האמצע — על השרשרת (מרחק לקטע הקרוב) */
  const dseg=(P,A,B)=>{ const dx=B.x-A.x,dz=B.z-A.z,L=dx*dx+dz*dz; let u=L?((P.x-A.x)*dx+(P.z-A.z)*dz)/L:0; u=Math.max(0,Math.min(1,u)); return Math.hypot(P.x-A.x-u*dx,P.z-A.z-u*dz); };
  const on=Math.min(...p.pts.slice(1).map((B,j)=>dseg(aMid,p.pts[j],B)));
  return {n:segs.length, L:p.L, t:p.t, start:[a0.x,a0.z], q, on, end:[aEnd.x,aEnd.z], e, k2:f2.k, other:segs[0].paths[i^1].t}; });
ok(r.n===2&&Math.hypot(r.start[0]-r.q[0],r.start[1]-r.q[1])<0.1&&r.on<0.5&&Math.hypot(r.end[0]-r.e.x,r.end[1]-r.e.z)<0.5&&r.k2===1,'ניגון: ״אני״ יוצא מהמקום שלו, עובר על השרשרת ('+r.on.toFixed(2)+'″ מהקו), מגיע לסוף אחרי '+r.t.toFixed(2)+' שנ׳ ל-'+r.L.toFixed(0)+'″, ואז שלב 2');
r=await E(()=>{ const sp=S.P.speed; S.P.speed=sp*2; const t2=S.brdPlayBuild()[0].paths[S.brdMine()].t; S.P.speed=sp; const t1=S.brdPlayBuild()[0].paths[S.brdMine()].t; return {t1,t2}; });
ok(r.t2<r.t1-0.05,'הזמן לפי המהירות של הרובוט: '+r.t1.toFixed(2)+' ← '+r.t2.toFixed(2)+' שנ׳ במהירות כפולה');
r=await E(()=>{ S.brdPlay(); const on=!!S.BRD.play, T=S.BRD.play&&S.BRD.play.T, lbl=document.querySelector('#brdFr [data-brdf="play"]').textContent; S.brdAddStroke('p',0,[0,0,5,5]); const off=!S.BRD.play; S.brdUndo(); return {on,T,off,lbl}; });
ok(r.on&&r.T>1&&r.off&&/עצור/.test(r.lbl),'״▶ נגן״ מתחיל ('+(r.T||0).toFixed(1)+' שנ׳ לכל הלוח, הכפתור ״'+r.lbl+'״), ועריכה עוצרת אותו');

// 7. תבניות
r=await E(()=>{ const out={}; for(const t of S.BRD_TPL){ S.brdTpl(t.k); out[t.k]={fr:S.BRD.fr?S.BRD.fr.length:1, s:S.BRD.s.length, ch:S.brdChain().length, it:S.BRD.it.length,
    valid:S.brdFrames().every(f=>!!S.brdFrameOk(f)), cross:S.brdFeas().cross}; } return out; });
ok(Object.values(r).every(o=>o.valid&&o.ch>=1&&o.s>=2),'4 תבניות תקינות, ובכל אחת חץ שיוצא מ״אני״: '+JSON.stringify(r));
ok(r.leave.fr===2&&r.cycle.cross===0&&r.flowers.it===2,'יציאה וחניה = 2 שלבים, מחזור לא חוצה את האמצע, חלוקת פרחים עם 2 תוויות');
r=await E(()=>{ S.SETUP.ally='blue'; S.brdTpl('cycle'); const i=S.brdMine(), c=S.brdChain(), x=c.map(q=>q.x); const f=S.brdFeas(); S.SETUP.ally='red'; return {i, minx:Math.min(...x), cross:f.cross}; });
ok(r.i===2&&r.minx>0&&r.cross===0,'בכחולה התבנית משתקפת (כל הנקודות ב-x חיובי, בלי חציית אמצע)');

// 8. קוד לשיתוף + ברקוד, הדבקה בשורת השם, קוד פגום
r=await E(()=>{ S.brdTpl('leave'); S.brdAddStroke('p',1,[0,0,5,5,10,0],{f:1}); S.BRD.b=[[1,2,0],[3,4,2]]; const before=JSON.stringify(S.brdFrames().map(f=>[f.tok,f.th,f.s.map(s=>[s.k,s.c,s.p,s.q||0,s.f||0]),f.it.map(t=>[t.x,t.z,t.t,t.c]),f.b,f.n]));
  const code=S.brdShareOpen(); const qr=!!document.querySelector('#brdQr svg'); const len=code.length;
  S.brdClear(); S.BRD.b=[]; S.brdFrame('one');
  const nm=document.getElementById('brdName'); nm.value=code; nm.dispatchEvent(new Event('input'));
  const after=JSON.stringify(S.brdFrames().map(f=>[f.tok,f.th,f.s.map(s=>[s.k,s.c,s.p,s.q||0,s.f||0]),f.it.map(t=>[t.x,t.z,t.t,t.c]),f.b,f.n]));
  const bad=[code.slice(0,-6)+'AAAAAA', 'BB1.'+btoa('{"v":2,"f":[{"t":[1e9,0,0,0,0,0,0,0],"h":[0,0,0,0],"s":[]}]}'), 'BB1.<script>', 'XX1.abc', code.replace('BB1.','BB1.!')];
  return {len, qr, same:before===after, nm:nm.value, fr:S.BRD.fr&&S.BRD.fr.length, bad:bad.map(c=>S.brdDecode(c)===null)}; });
ok(r.same&&r.fr===2&&r.nm==='','קוד לשיתוף ('+r.len+' תווים): הדבקה בשורת השם מחזירה בדיוק את הלוח — 2 שלבים, אזור, כדורים ותוויות');
ok(r.qr&&r.len<=1500,'ברקוד דו־ממדי מוצג לקוד קצר');
ok(r.bad.every(Boolean),'קודים פגומים (קטוע, מספר ענק, תווים זרים, קידומת אחרת) נדחים: '+r.bad.join());
await E(()=>{ const sh=document.getElementById('brdShare'); sh.hidden=true; });

// 9. הדפסה: תמונה לכל שלב
r=await E(()=>{ const h=S.brdPrintHTML(); return {img:(h.match(/<img src="data:image\/png/g)||[]).length, n:S.brdFrames().length, sec:(h.match(/class="pg"/g)||[]).length}; });
ok(r.img===r.n&&r.sec===r.n,'דף הדפסה: '+r.img+' תמונות ל-'+r.n+' שלבים');

// 10. רשת: מארח — שלב חדש שולח frs ואחריו all; בקשת frm מאורח; הודעות פגומות; אורח ישן
r=await E(()=>{ const sent=[]; S.setNetMode('host',{readyState:1,send:m=>{ if(typeof m==='string') sent.push(JSON.parse(m)); }});
  S.brdFrame('add'); const a=sent.map(m=>m.o).join();
  sent.length=0; const ok1=S.brdNetIn({o:'frm',a:'sel',i:0},'g1'); const b=sent.map(m=>m.o+(m.to||'')).join(); const cur=S.BRD.cur;
  sent.length=0; S.brdTxtEdit(null,{x:5,z:5}); document.getElementById('brdTxtIn').value='שלום'; S.brdTxtCommit(true); const tx=sent.find(m=>m.o==='tx');
  const bad=[{o:'frm',a:'sel',i:9},{o:'frm',a:'sel',i:'1'},{o:'frm',a:'eval'},{o:'frm',a:'name',i:0,n:'x'.repeat(30)},{o:'frs',cur:0,fr:[]},{o:'tx',id:'q-1',x:0,z:0,w:'a\u0000'},{o:'tx',id:'q-1',x:0,z:0,w:'x'.repeat(41)},
    {o:'bl',b:[[0,0,7]]},{o:'bl',b:'x'},{o:'all',tok:[[0,0],[0,0],[0,0],[0,0]],s:[]},{o:'add',s:{id:'q-2',k:'a',c:0,p:[0,0,1,1],q:[1]}},{o:'add',s:{id:'q-3',k:'a',c:0,p:[0,0,1,1],f:1}},{o:'add',s:{id:'q-4',k:'p',c:0,p:[0,0,1,1,2,2],f:2}}];
  const before=JSON.stringify(S.brdPack()); S.BRD.bad=0; for(const m of bad) S.brdNetIn(m,'g1'); const same=JSON.stringify(S.brdPack())===before;
  const nb=S.BRD.bad; S.setNetMode('solo',null); return {a, ok1, b, cur, tx, same, nb, nbad:bad.length}; });
ok(r.a==='frs,all','מארח: ״＋ שלב״ שולח לכולם frs ואחריו all ('+r.a+')');
ok(r.ok1&&r.cur===0&&r.b==='frs*,all*','מארח: בקשת שלב מאורח מוחלת ונשלחת לכולם כ-frs + all (לא כ-frm)');
ok(r.tx&&r.tx.w==='שלום'&&r.tx.t==='brd','טקסט ברשת: ״tx״ עם הטקסט בשדה w (t נשאר ״brd״)');
ok(r.same&&r.nb>=r.nbad,'מארח: '+r.nbad+' הודעות חדשות פגומות נדחו ('+r.nb+'), הלוח לא השתנה');
if(OLD){ r=await E(()=>{ const sent=[]; S.setNetMode('host',{readyState:1,send:m=>{ if(typeof m==='string') sent.push(JSON.parse(m)); }});
    S.brdTpl('leave'); S.brdAddStroke('a',0,[0,0,10,10],{q:[8,0]}); S.brdAddStroke('p',1,[0,0,5,5,10,0],{f:1}); S.BRD.b=[[1,1,1]];
    S.netOnMsg(JSON.stringify({t:'gj',id:'g7',name:'דני'})); const j=sent.filter(m=>m.t==='brd'&&m.to==='g7'); S.netOnMsg(JSON.stringify({t:'gl',id:'g7'})); S.setNetMode('solo',null); return j; });
  const all=r.find(m=>m.o==='all'), frs=r.find(m=>m.o==='frs'), oa=OLD.brdOpOk(all,false), of=OLD.brdOpOk(frs,false), ot=OLD.brdOpOk({o:'tx',id:'a-1',x:0,z:0,w:'x'},false);
  ok(oa&&oa.s.length===all.s.length&&of===null&&ot===null,'גרסה 1.16.0 מקבלת את ה-all החדש ('+(oa&&oa.s.length)+' קווים, כולל עיקול ואזור) ומתעלמת מ-frs/tx');
  ok(!!frs&&frs.fr.length===2,'אורח חדש בחדר מקבל all ואחריו frs עם 2 השלבים'); }

// 11. רשת: אורח — frs מהמארח; בקשת שלב בלי תשובה; טעינת לוח רב־שלבי בקצב
r=await E(async()=>{ const sent=[]; S.setNetMode('guest',{readyState:1,send:m=>{ if(typeof m==='string') sent.push({m:JSON.parse(m),t:performance.now()}); }});
  const F=S.brdFrames(); const dbg={mode:S.NET&&S.NET.mode, nF:F.length, bad0:S.BRD.bad}; const ok1=S.brdNetIn({o:'frs',cur:1,fr:F}); dbg.bad1=S.BRD.bad; dbg.mode1=S.NET&&S.NET.mode; const st={n:S.BRD.fr&&S.BRD.fr.length, cur:S.BRD.cur};
  S.brdFrame('add'); const req=sent.map(x=>x.m.o).join(); const stillN=S.BRD.fr.length;
  await new Promise(res=>setTimeout(res,2700)); const msg=document.getElementById('brdMsg').textContent;
  /* לוח של 8 שלבים × 6 חצים */
  const fr=[]; for(let k=0;k<8;k++) fr.push({tok:F[0].tok,th:F[0].th,s:Array.from({length:6},(_,j)=>({id:'g-'+k+'-'+j,k:'a',c:0,p:[j,k,j+10,k+10]})),it:[],b:[],n:'s'+k});
  sent.length=0; const t0=performance.now(); S.brdSetAll({tok:fr[0].tok,th:fr[0].th,s:fr[0].s,it:[],b:[],fr,cur:0});
  const first=sent.filter(x=>x.m.t==='brd').length; for(let k=0;k<300&&S.BRD.q.length;k++) await new Promise(res=>setTimeout(res,100));
  for(let i=sent.length-1;i>=0;i--) if(sent[i].m.t!=='brd') sent.splice(i,1);
  /* חלון של חצי שנייה עם הכי הרבה הודעות */
  let mx=0; for(const a of sent){ const n=sent.filter(b=>b.t>=a.t&&b.t<a.t+500).length; if(n>mx) mx=n; }
  const kinds=sent.map(x=>x.m.o), maxLen=Math.max(...sent.map(x=>JSON.stringify(x.m).length));
  S.setNetMode('solo',null); return {dbg, ok1:!!ok1, st, req, stillN, msg, first, total:sent.length, mx, frm:kinds.filter(k=>k==='frm').length, maxLen, noTo:sent.every(x=>!('to' in x.m))}; });
ok(r.ok1&&r.st.n===r.dbg.nF&&r.dbg.nF>=2&&r.st.cur===1,'אורח: frs מהמארח קובע את כל השלבים ('+JSON.stringify({ok1:r.ok1,st:r.st,dbg:r.dbg})+')');
ok(r.req==='frm'&&r.stillN===r.dbg.nF&&/גרסה ישנה/.test(r.msg),'אורח: ״＋ שלב״ שולח בקשה למארח בלבד; בלי תשובה — הודעה שהמארח ישן ('+JSON.stringify({req:r.req,stillN:r.stillN,msg:r.msg})+')');
ok(r.first===20&&r.mx<=20&&r.total===17+8*17&&r.frm===1+7+8+1&&r.noTo&&r.maxLen<2000,'אורח שטוען 8 שלבים: '+r.total+' הודעות, לכל היותר '+r.mx+' בחצי שנייה (בהתחלה '+r.first+'), הכי ארוכה '+r.maxLen+' בתים');

/* ── חלק ב׳: תלת־ממד במצב משחק (עם ציור) ── */
allErrs.push(...errs); await browser.close();
({browser,page,errs}=await open({play:true})); page.setDefaultTimeout(0);
await E(()=>{ window.S=__sim; S.SETUP.ally='red'; S.brdOpen(); });
// 12. ״המר לתלת־ממד״: רפאים, סרטים, אזורים, טקסט, כדורים; ניגון; חזרה בלי דליפה ובלי השפעה על הפיזיקה
await E(()=>{ S.brdTpl('flowers'); S.brdAddStroke('a',0,[-20,-20,10,-40],{q:[0,-10]}); S.BRD.b=[[0,10,0],[4,10,1]]; S.brdFrame('add'); S.brdFrame('sel',0); });
await page.waitForTimeout(300);
const mem0=await E(()=>Object.assign({},S.rendererInfo()));
r=await E(async()=>{ const nb=S.world?S.world.bodies.length:-1;
  document.querySelector('.skAct [data-brd="3d"]').click(); const nb2=S.world?S.world.bodies.length:-1; await new Promise(res=>setTimeout(res,600));
  const R=S.BRD3.root, cnt={mesh:0,sprite:0,tube:0,shape:0,sphere:0};
  R.traverse(o=>{ if(o.isMesh) cnt.mesh++; if(o.isSprite) cnt.sprite++; if(o.geometry&&o.geometry.type==='TubeGeometry') cnt.tube++; if(o.geometry&&o.geometry.type==='ShapeGeometry') cnt.shape++; if(o.geometry&&o.geometry.type==='SphereGeometry') cnt.sphere++; });
  const bar=!document.getElementById('brd3Bar').hidden, box=document.getElementById('brdBox').hidden;
  const g0=S.BRD3.bots.children[S.brdMine()].position.clone();
  S.brd3Play(); const at=S.brd3PlayAt(0.8); const g1=S.BRD3.bots.children[S.brdMine()].position.clone();
  await new Promise(res=>setTimeout(res,500));
  return {cnt, bar, box, bots:S.BRD3.bots.children.length, moved:g0.distanceTo(g1), k:at&&at.k, nb2, nb, inScene:!!S.BRD3.root.parent, mem:Object.assign({},S.rendererInfo())}; });
ok(r.bar&&r.box&&r.bots===4&&r.inScene,'״🧊 תלת־ממד״: הלוח נסגר, סרגל בתחתית, 4 רובוטי רפאים בזירה');
ok(r.cnt.tube>=8&&r.cnt.shape>=2+4&&r.cnt.sprite>=4+2&&r.cnt.sphere===2,'חצים כסרטים ('+r.cnt.tube+' צינורות), אזורים ('+r.cnt.shape+' משטחים כולל משולשי החזית), תוויות ('+r.cnt.sprite+'), כדורים ('+r.cnt.sphere+')');
ok(r.moved>0.05&&r.nb2===r.nb,'ניגון בתלת־ממד: ״אני״ זז '+(r.moved*39.37).toFixed(0)+'″; גופים בפיזיקה: '+r.nb+' ← '+r.nb2+' (בלי שינוי)');
r=await E(async()=>{ S.brd3Close(); await new Promise(res=>setTimeout(res,500)); let left=0; S.scene.traverse(o=>{ if(o.name==='brd3'||o.name==='brd3Bots'||o.name==='brd3Layer') left++; });
  return {left, open:!document.getElementById('brdBox').hidden, bar:document.getElementById('brd3Bar').hidden, mem:Object.assign({},S.rendererInfo()), on:S.BRD3.on}; });
ok(r.left===0&&r.open&&r.bar&&!r.on,'״↩ חזרה ללוח״: הקבוצה יצאה מהסצנה והלוח נפתח שוב');
ok(r.mem.geometries<=mem0.geometries+1&&r.mem.textures<=mem0.textures+1,'בלי דליפה: גאומטריות '+mem0.geometries+' ← '+r.mem.geometries+', תמונות '+mem0.textures+' ← '+r.mem.textures);
r=await E(async()=>{ const a=[]; for(let k=0;k<3;k++){ S.brd3Open(); await new Promise(res=>setTimeout(res,250)); S.brd3Close(); await new Promise(res=>setTimeout(res,250)); a.push(S.rendererInfo().geometries); } return a; });
ok(r[2]<=r[0]+1,'שלוש פתיחות וסגירות — מספר הגאומטריות יציב ('+r.join(' → ')+')');
await page.screenshot({path:'v76_board.png',timeout:90000});
r=await E(async()=>{ S.brd3Open(); await new Promise(res=>setTimeout(res,300)); return 1; });
await page.screenshot({path:'v76_board3d.png',timeout:90000});
await page.keyboard.press('Escape');
r=await E(()=>({on:S.BRD3.on, open:!document.getElementById('brdBox').hidden}));
ok(!r.on&&r.open,'Esc בתלת־ממד חוזר ללוח');

// 13. מוכנות לתחרות: כפתור ליד כרטיס לבור, חיפוש, שורות, ייצוא מעודכן
r=await E(()=>{ S.brdClose(); const b=document.getElementById('bReady'); const near=b&&b.parentElement.contains(document.getElementById('bPitCard'));
  S.CMDK.list=S.cmdkIndex(); const L=S.cmdkSearch('מוכנות'); const i=L.findIndex(c=>c.id==='ready'); S.CMDK.res=L; S.cmdkRun(i);
  const box=document.getElementById('rdyBox'); const rows=[...box.querySelectorAll('[data-rdy]')].map(x=>x.dataset.rdy);
  return {near, i, open:!box.hidden, rows}; });
ok(r.near&&r.i>=0&&r.open,'״✅ מוכנות לתחרות״ ליד כרטיס לבור, ובחיפוש (מקום '+(r.i+1)+')');
ok(['path1','path2','ptn1','ptn2','fouls'].every(k=>r.rows.includes(k))&&r.rows.length<=14,'הבדיקה: '+r.rows.join(', '));
r=await E(()=>{ const sp=S.v72corner.mySpot; S.SETUP.autoOn=true; S.v72corner.setupMyAutoSet('path'); S.pathClear(); S.pathStartHere(); S.pathAdd(-30,30,{raw:true}); S.pathAdd(-40,10,{raw:true});
  const a=S.rdyCheck().rows; S.rdyExpMark([sp()]); const b=S.rdyCheck().rows; S.pathAdd(-30,-10,{raw:true}); const c=S.rdyCheck().rows;
  const g=(L,k)=>L.find(x=>x.k===k+sp()); return {a:g(a,'exp'), b:g(b,'exp'), c:g(c,'exp'), rr:g(b,'rr')}; });
ok(r.a&&r.a.ok===false&&r.b.ok===true&&r.c.ok===false&&r.rr&&r.rr.ok===true,'ייצוא: ״עוד לא יוצא״ ← ״מעודכן״ ← שינוי במסלול ״לייצא שוב״; RoadRunner '+(r.rr&&r.rr.t));
await page.keyboard.press('Escape');
r=await E(()=>document.getElementById('rdyBox').hidden); ok(r,'Esc סוגר את חלון המוכנות');

allErrs.push(...errs);
ok(realErrs(allErrs).length===0,'אין שגיאות: '+realErrs(allErrs).slice(0,3).join(' | '));
await browser.close(); done('v76_board2');
