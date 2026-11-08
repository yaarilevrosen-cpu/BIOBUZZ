// v76 — ״🏁 הרץ את כל הלוח״: ארבעת הרובוטים נוסעים בזירה לפי החצים שלהם, שלב אחרי שלב, עם מגעים אמיתיים
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
/* מריץ את הפיזיקה בצעדים קבועים עד שההרצה מסתיימת */
const runToEnd=()=>E(()=>{ const S=__sim; let n=0; while(S.BRDRUN.on&&!S.BRDRUN.done&&n++<60*70) S.advance(1/60,1/60); return n; });

// 1. לוח עם חץ לכל רובוט חוץ מיריב 2. כולם מתחילים באסימונים שלהם
let r=await E(()=>{ window.S=__sim; S.SETUP.ally='red'; S.BRD.tok=null; S.BRD.s=[]; S.BRD.it=[]; S.BRD.b=[]; S.BRD.fr=null; S.BRD.cur=0; S.BRD.hist=[]; S.BRD.fut=[]; S.brdOpen();
  const T=S.BRD.tok, mine=S.brdMine(), A=(i,dx,dz,id)=>({o:'add',s:{id,k:'a',c:i<2?0:1,p:[T[i][0],T[i][1],T[i][0]+dx,T[i][1]+dz]}});
  const sg=x=>x<0?1:-1;   /* לכיוון המרכז */
  S.brdApply(A(mine,sg(T[mine][0])*30,0,'r-me')); S.brdApply(A(mine^1,sg(T[mine^1][0])*24,0,'r-pt')); S.brdApply(A(2,sg(T[2][0])*20,0,'r-o1'));
  const ok1=S.brdRunStart(); const B=S.BOTS.map(b=>({on:b.on, run:!!b.brdRun, x:+S.I(b.body.position.x).toFixed(1), z:+S.I(b.body.position.z).toFixed(1)}));
  return {ok1, open:S.BRD.open, bar:!document.getElementById('brdRunBar').hidden, me:[+S.I(S.botBody.position.x).toFixed(1),+S.I(S.botBody.position.z).toFixed(1)], T, mine, B, run:S.RUN.on, src:S.RUN.src}; });
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1.5;
ok(r.ok1&&!r.open&&r.bar&&r.run&&r.src==='board','הרצה התחילה: הלוח נסגר, פס ״הלוח רץ בזירה״, הרובוט שלי נוסע ('+JSON.stringify({ok1:r.ok1,run:r.run,src:r.src})+')');
ok(near(r.me,r.T[r.mine])&&r.B.every(b=>b.on&&b.run),'כולם מתחילים באסימונים שלהם, שלושת הבוטים פעילים ('+JSON.stringify(r.B)+')');
await runToEnd();
r=await E(()=>{ const S=__sim, R=S.BRDRUN, T=R.fr[0].tok, mine=S.brdMine();
  const pos=b=>[+S.I(b.position.x).toFixed(1),+S.I(b.position.z).toFixed(1)];
  return {done:R.done, res:R.res, me:pos(S.botBody), meT:T[mine], pt:pos(S.BOTS[2].body), ptT:T[mine^1], o2:pos(S.BOTS[1].body), o2T:T[3], txt:document.getElementById('brdRunBar').textContent}; });
const moved=(a,b,d)=>Math.abs(a[0]-b[0])>d;
ok(r.done&&moved(r.me,r.meT,20)&&moved(r.pt,r.ptT,15),'אני והשותף נסעו לאורך החצים ('+JSON.stringify({me:r.me,pt:r.pt})+')');
ok(Math.hypot(r.o2[0]-r.o2T[0],r.o2[1]-r.o2T[1])<3,'יריב 2 בלי חצים — עומד במקום ('+JSON.stringify(r.o2)+')');
ok(r.res&&r.res.length===1&&r.res[0].filter(q=>!q.idle).every(q=>q.t>0&&!q.late)&&/בלי מגעים|מגעים בין רובוטים/.test(r.txt),'בסוף: זמן לכל רובוט, ושורת מגעים ('+r.txt.slice(0,160)+')');

// 2. מגע: שני רובוטים נוסעים זה לעבר זה — נרשם מגע ונקודה אדומה בזירה
r=await E(()=>{ const S=__sim; S.brdRunStop(false); S.BRD.s=[]; S.BRD.tok=null; S.brdOpen(); S.brdClose();
  const mine=S.brdMine(); const T=S.BRD.tok;
  S.brdApply({o:'add',s:{id:'c-1',k:'a',c:0,p:[T[mine][0],T[mine][1],0,T[mine][1]]}});
  const opp=T.findIndex((t,i)=>i!==mine&&(i<2)!==(mine<2)&&Math.abs(t[1]-T[mine][1])<4);   /* היריב באותו גובה */
  S.brdApply({o:'add',s:{id:'c-2',k:'a',c:1,p:[T[opp][0],T[opp][1],0,T[opp][1]]}});
  return S.brdRunStart(); });
await runToEnd();
r=await E(()=>{ const S=__sim, R=S.BRDRUN; return {hits:R.hits.map(h=>h.a+'↔'+h.b), marks:R.grp?R.grp.children.length:0, txt:document.getElementById('brdRunBar').textContent}; });
ok(r.hits.length>=1&&/^אני↔יריב [12]$/.test(r.hits[0])&&r.marks===r.hits.length&&/מגעים בין רובוטים/.test(r.txt),'שני רובוטים שנוסעים זה לעבר זה: מגע נרשם, ונקודה אדומה בזירה ('+JSON.stringify(r)+')');

// 3. שני שלבים: השלב השני מתחיל אחרי שכולם סיימו את הראשון
r=await E(()=>{ const S=__sim; S.brdRunStop(false); S.BRD.s=[]; S.BRD.tok=null; S.brdEnsure&&S.brdEnsure(); S.brdOpen();
  const T=S.BRD.tok, mine=S.brdMine(), sg=T[mine][0]<0?1:-1;
  S.brdApply({o:'add',s:{id:'f-1',k:'a',c:0,p:[T[mine][0],T[mine][1],T[mine][0]+sg*24,T[mine][1]]}});
  S.brdFrame('add');   /* ״＋ שלב״: אני עובר לסוף החץ */
  const T2=S.BRD.tok; S.brdApply({o:'add',s:{id:'f-2',k:'a',c:0,p:[T2[mine][0],T2[mine][1],T2[mine][0],T2[mine][1]+(T2[mine][1]<0?24:-24)]}});
  const z0=S.I(S.botBody.position.z); S.brdRunStart(); return {n:S.BRDRUN.fr.length}; });
await runToEnd();
r=await E(()=>{ const S=__sim, R=S.BRDRUN, f1=R.fr[1].tok[S.brdMine()];
  return {n:R.fr.length, res:R.res.length, me:[S.I(S.botBody.position.x),S.I(S.botBody.position.z)], f1, txt:document.getElementById('brdRunBar').textContent}; });
ok(r.n===2&&r.res===2&&Math.abs(r.me[1]-r.f1[1])>15&&/שלב 1:.*שלב 2:/.test(r.txt),'שני שלבים: אחרי השלב הראשון — השני, והרובוט נוסע גם בחץ של שלב 2 ('+JSON.stringify({res:r.res,me:r.me.map(v=>+v.toFixed(1)),f1:r.f1})+')');

// 4. ״חזרה ללוח״ מחזיר הכול: בוטים כמו קודם, בלי נקודות, הלוח פתוח; מאץ׳ באמצע — לא מתחיל
r=await E(()=>{ const S=__sim; const on0=S.BRDRUN.sv.on.slice(); document.querySelector('#brdRunBar [data-brr="back"]').click();
  const o={on:S.BRDRUN.on, open:S.BRD.open, bar:document.getElementById('brdRunBar').hidden, same:S.BOTS.map(b=>b.on).join()===on0.join(), flags:S.BOTS.some(b=>b.brdRun||b.prun), grp:S.BRDRUN.grp};
  S.brdClose(); return o; });
ok(!r.on&&r.open&&r.bar&&r.same&&!r.flags&&!r.grp,'״חזרה ללוח״: הבוטים חוזרים למצב הקודם, הנקודות נמחקות, הלוח נפתח ('+JSON.stringify(r)+')');
r=await E(()=>{ const S=__sim; S.brdRunStart(); const a=S.BRDRUN.on; S.matchStart(); const b=S.BRDRUN.on, fl=S.BOTS.some(x=>x.brdRun); S.matchStop(); S.brdOpen(); const c=S.brdRunStart(); const msg=document.getElementById('brdMsg').textContent; S.brdClose(); return {a,b,fl,c,msg}; });
ok(r.a&&!r.b&&!r.fl,'מאץ׳ שמתחיל מבטל את ההרצה ('+JSON.stringify(r)+')');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();
done('v76_runall');
