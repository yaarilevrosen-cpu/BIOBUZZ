// v75 — לוח אסטרטגיה, שלב 1: רובוטים בקנה מידה ועם כיוון, ״חזור״, בדיקת היתכנות, ״נסה בסימולטור״, תאימות לאחור
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({play:true});
const E=(f,a)=>page.evaluate(f,a);
let r=await E(()=>{ const S=__sim; S.brdOpen(); return {th:S.BRD.th.slice(), feas:document.getElementById('brdFeas').textContent.length>0}; });
ok(r.th.join()==='90,90,-90,-90'&&r.feas,'כיוון ברירת המחדל לפי עמדות הפתיחה, ושורת היתכנות מוצגת ('+r.th.join()+')');
// סיבוב, ביטול וחזרה
r=await E(()=>{ const S=__sim, i=S.brdMine(); const a=S.BRD.th[i]; S.brdRotate(i,15); const b=S.BRD.th[i]; S.brdUndo(); const c=S.BRD.th[i]; S.brdRedo(); const d=S.BRD.th[i]; return [a,b,c,d]; });
ok(r[1]===r[0]+15&&r[2]===r[0]&&r[3]===r[1],'סיבוב 15°, ״בטל״ מחזיר, ״חזור״ מחזיר שוב ('+r.join()+')');
r=await E(()=>{ const S=__sim, i=S.brdMine(); const q=S.BRD.tok[i].slice(); S.brdDo({o:'tok',i,x:q[0]+10,z:q[1]},[{o:'tok',i,x:q[0],z:q[1]}]); S.brdUndo(); const u=S.BRD.tok[i][0]; S.brdRedo(); const v=S.BRD.tok[i][0];
  S.brdUndo(); S.brdRotate(i,30); const fut=S.BRD.fut.length; return {u,v,x0:q[0],fut}; });
ok(r.u===r.x0&&r.v===+(r.x0+10).toFixed(1)&&r.fut===0,'הזזה: בטל/חזור עובדים, ופעולה חדשה מוחקת את ״חזור״ ('+JSON.stringify(r)+')');
// היתכנות: חץ קצר בצד שלנו מול חץ שחוצה את האמצע
r=await E(()=>{ const S=__sim; S.brdClear(); S.brdResetTok(); const i=S.brdMine(), q=S.BRD.tok[i], sg=Math.sign(q[0]);
  S.brdAddStroke('a',0,[q[0],q[1],q[0]-sg*20,q[1]-10]); const f1=S.brdFeas();
  S.brdAddStroke('a',0,[q[0]-sg*20,q[1]-10,q[0]-sg*130,q[1]-10]); const f2=S.brdFeas(); return {f1,f2,txt:document.getElementById('brdFeas').textContent}; });
ok(r.f1.n===1&&!r.f1.cross&&r.f1.t>0&&r.f1.t<5,'חץ קצר בצד שלנו: לא חוצה, זמן קצר ('+JSON.stringify(r.f1)+')');
ok(r.f2.cross===1&&/קו האמצע/.test(r.txt),'חץ שחוצה את האמצע מסומן ('+r.txt+')');
// שמירה וטעינה שומרות את הכיוון; לוח ישן בלי כיוון נטען
r=await E(()=>{ const S=__sim, i=S.brdMine(); S.brdRotate(i,45); const h=S.BRD.th[i]; S.brdSave('v75'); S.brdRotate(i,-90); S.brdLoad('v75'); const h2=S.BRD.th[i];
  const old=S.brdUnpack({tok:[[0,0],[1,1],[2,2],[3,3]],s:[]}); const bad=S.brdThOk([1,2,3]); S.brdDel('v75'); return {h,h2,oldTh:old&&old.th||null,bad}; });
ok(r.h===r.h2&&r.oldTh===null&&r.bad===null,'שמירה וטעינה שומרות כיוון; לוח ישן בלי כיוון נטען; כיוון פגום נדחה ('+JSON.stringify(r)+')');
// רשת: הודעת ״all״ ישנה (בלי th) ומארח חדש (עם th); ״th״ מאורח
r=await E(()=>{ const S=__sim; const sent=[]; S.setNetMode('guest',{readyState:1,send:m=>sent.push(m)});
  const a=S.brdNetIn({o:'all',tok:[[-60,58],[-60,-58],[60,-58],[60,58]],s:[]}); const th1=S.BRD.th.slice();
  const b=S.brdNetIn({o:'all',tok:[[-60,58],[-60,-58],[60,-58],[60,58]],s:[],th:[10,20,30,40]}); const th2=S.BRD.th.slice();
  const hist=S.BRD.hist.length+S.BRD.fut.length;
  S.setNetMode('host',{readyState:1,send:m=>sent.push(m)});
  const c=S.brdNetIn({o:'th',i:1,h:200},'g1'), d=S.brdNetIn({o:'th',i:7,h:5},'g1'), e2=S.brdNetIn({o:'th',i:1,h:'x'},'g1');
  S.setNetMode('off',null); return {a:!!a,b:!!b,th1,th2,hist,c:!!c,d:!!d,e:!!e2,th3:S.BRD.th[1],fw:sent.some(m=>/"o":"th"/.test(m))}; });
ok(r.a&&r.b&&r.th2.join()==='10,20,30,40'&&r.hist===0,'רשת: ״all״ ישן ותקין מתקבל, ״all״ עם כיוונים מעדכן, וההיסטוריה מתאפסת ('+JSON.stringify(r)+')');
ok(r.c&&!r.d&&!r.e&&r.th3===-160&&r.fw,'״th״ מאורח מוחל ומועבר לחדר; אינדקס או כיוון פגום נדחים');
await page.screenshot({path:'v75_board.png',timeout:90000});
// נסה בסימולטור
r=await E(async()=>{ const S=__sim; S.brdOpen(); S.brdClear(); S.brdResetTok(); const i=S.brdMine(), q=S.BRD.tok[i], sg=Math.sign(q[0]);
  S.brdAddStroke('a',0,[q[0],q[1],q[0]-sg*30,q[1]-20]); document.querySelector('[data-brd="try"]').click();
  await new Promise(res=>setTimeout(res,600)); return {run:!!(S.RUN&&S.RUN.on), open:!document.getElementById('brdBox').hidden}; });
ok(r.run&&!r.open,'״נסה בסימולטור״: הלוח נסגר והרובוט נוסע במסלול ('+JSON.stringify(r)+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close(); done('v75_board');
