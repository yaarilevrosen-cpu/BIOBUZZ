// v74 training — T1–T8 מסקירת האימון, ו-U6 (ספריית שידורים חוזרים) ו-U10 (גרף ניקוד בתחקיר)
import {open,ok,done,realErrs} from './h.mjs';
const PORT=process.env.PORT||process.env.BB_PORT||'8904';
let {browser,page,errs}=await open({noraf:true,url:'http://127.0.0.1:'+PORT+'/sim.html?nocad=1'});
const E=(f,a)=>page.evaluate(f,a);
const toEnd=async()=>{ for(let k=0;k<80;k++){ const on=await E(()=>{ const S=__sim; for(let i=0;i<10&&(S.MATCH.on||S.MATCH.cd>0);i++) S.advance(0.5,1/30); return S.MATCH.on||S.MATCH.cd>0; }); if(!on) break; } };
const clean=()=>E(()=>{ const S=__sim; ['biobuzz_debrief_best_v1','biobuzz_debrief_v1','biobuzz_records_v1','bbSeason1','bbAch1','biobuzz_ghost_v2','bbDrill1','bbDrillH1','bbDrillTried1','bbDaily1'].forEach(k=>localStorage.removeItem(k));
  S.DRILL.best={}; S.DRILL.hist={}; S.ACH.st=null; S.achLoad(); S.ghostStoreReset(); S.debriefReset(); S.DRILL.lastK=null; S.v72training.V72T.card=null; S.DAILY.st=null; });
const mySetup=()=>E(()=>{ const S=__sim; S.matchStop(); Object.assign(S.SETUP,{autoOn:true,auto:30,trans:8,tele:120,partner:true,blue1:true,blue2:true,cd:3,ghost:true,ally:'red'}); S.setupSave&&S.setupSave(); });
await clean();

// ── T1: ״מאץ׳ מהיר״ באמצע תרגיל עם שעון ──
await mySetup();
let r=await E(()=>{ const S=__sim, X=S.v74training; S.drillStart('cycle'); S.advance(2,1/30); const on0=S.DRILL.on;
  X.quick(); return {on0, on:S.DRILL.on, tele:S.MT.tele, bots:S.BOTS.filter(b=>b.on).length}; });
ok(r.on0==='cycle'&&r.on===null&&r.tele===120&&r.bots===3,'T1: ״מאץ׳ מהיר״ באמצע תרגיל — התרגיל נעצר, מאץ׳ מלא ('+r.tele+' שנ׳, '+r.bots+' בוטים; קודם DRILL.on נשאר cycle)');
await toEnd();
r=await E(()=>{ const S=__sim; return {best:S.DRILL.best.cycle, kinds:S.seasonAll().map(m=>m.kind), gh:Object.keys(S.ghostStore().best)}; });
ok(r.best==null&&r.kinds.length===1&&r.kinds[0]!=='drill'&&r.gh.indexOf('cycle')<0,'T1: המאץ׳ לא נרשם כשיא תרגיל, בעונה הוא ״'+r.kinds[0]+'״, ואין רוח של ״מחזורים״ (קודם: שיא 110)');
await E(()=>__sim.matchStop());
r=await E(()=>{ const S=__sim, X=S.v74training; const ok0=S.dailyStart(); const d0=S.DAILY.on; S.advance(1,1/30); X.setupApply();
  return {ok0, d0, d:S.DAILY.on, on:S.DRILL.on, ally:S.SETUP.ally}; });
ok(r.ok0&&r.d0&&r.d===null&&r.on===null&&r.ally==='red','T1: התחלת מאץ׳ מהחלון באמצע אתגר יומי — האתגר נעצר בלי לרשום, הברית חזרה');
await toEnd();
r=await E(()=>{ const S=__sim; const st=S.dailyLoad(); return {days:Object.keys(st.days||{}).length, hits:st.hits|0}; });
ok(r.days===0&&r.hits===0,'T1: אין ניסיון ״עבר״ באתגר היומי (קודם: hit מול יעד 45)');
await E(()=>__sim.matchStop());
r=await E(()=>{ const S=__sim; S.drillStart('cycle'); S.advance(1,1/30); S.matchStart(); return {on:S.DRILL.on, tele:S.MT.tele}; });
ok(r.on===null&&r.tele===120,'T1: גם matchStart ישיר (מקש ״מאץ׳״) באמצע תרגיל — התרגיל נעצר');
await E(()=>__sim.matchStop());

// ── T7 + T2: אחרי ״אוטונומי בלבד״ השעון חוזר; המחולל לא נכנס לשיאים ──
await clean(); await mySetup();
await E(()=>__sim.drillStart('auto')); await toEnd();
r=await E(()=>({tele:__sim.MT.tele, ph:__sim.v74training.PH[2][1], auto:__sim.MT.auto}));
ok(r.tele===120&&r.ph===120&&r.auto===30,'T7: אחרי תרגיל ״אוטונומי בלבד״ MT.tele='+r.tele+', PH[2][1]='+r.ph+' (קודם 0)');
r=await E(async()=>{ const S=__sim; S.matchStop(); S.MT.tele=0; S.v74training.PH[2][1]=0;   /* הגדרה עם טלאופ 0 — המקרה של T2 */
  await S.genRun({only:[0,1]}); const o={rec:localStorage.getItem('biobuzz_records_v1'), db:localStorage.getItem('biobuzz_debrief_best_v1'), dl:localStorage.getItem('biobuzz_debrief_v1')};
  S.MT.tele=120; S.v74training.PH[2][1]=120; return o; });
ok(!r.rec&&!r.db&&!r.dl,'T2: מחולל עם טלאופ 0 — לא נכתבו שיאים ו״קודם״ בתחקיר (קודם: [43,37])');
r=await E(()=>{ const S=__sim; S.drillStart('auto'); S.advance(1,1/30); S.v72training.drillAbort(); return {tele:S.MT.tele, on:S.DRILL.on}; });
ok(r.tele===120&&r.on===null,'T7: גם עצירת תרגיל באמצע מחזירה את השעון');
await E(()=>__sim.matchStop());

// ── T3: רוח של תרגיל זמן — ריצה בלי מדד לא הופכת לשיא ──
r=await E(()=>{ const S=__sim; S.ghostStoreReset(); localStorage.removeItem('biobuzz_ghost_v2'); S.ghostStoreReset();
  const G=S.v72training.GHOST, run=(tot,met)=>{ G.armed=true; G.daily=false; G.mode='speed'; G.rec.length=0; for(let i=0;i<40;i++) G.rec.push([i,0,0,0,tot]); S.DRILL.last=null; S.ghostCommit(tot,met); };
  run(20,9); const a=S.ghostStore().best.speed.metric;
  run(30); const b=S.ghostStore().best.speed, lastNo=S.ghostStore().last.speed.metric;
  run(10,7); const c=S.ghostStore().best.speed.metric;
  G.mode='match'; return {a, bm:b.metric, bs:b.score, lastNo, c}; });
ok(r.a===9&&r.bm===9&&r.bs===20&&r.lastNo===undefined,'T3: ריצה שלא הושלמה (30 נק׳, בלי זמן) נשמרת רק כ״קודמת״ — השיא נשאר 9 שנ׳');
ok(r.c===7,'T3: ריצה של 7 שנ׳ אחריה כן נכנסת כשיא (קודם: לא, כי ההשוואה עברה לנקודות)');

// ── T4: הרוח לא מקליטה את הספירה לאחור ──
r=await E(()=>{ const S=__sim; S.SETUP.cd=5; S.MT.cd=5; S.matchStop(); S.matchStart(); let g=0; while(!S.MATCH.on&&g++<400) S.advance(1/20,1/60);
  const G=S.v72training.GHOST; const o={n:G.rec.length, t:G.t}; S.matchStop(); S.SETUP.cd=3; S.MT.cd=3; return o; });
ok(r.n<=2&&r.t<0.1,'T4: כשהשעון מתחיל ברוח יש '+r.n+' פריימים, GHOST.t='+r.t.toFixed(2)+' (קודם: 120 פריימים, 6.0)');
r=await E(()=>{ const S=__sim; const rows=[]; for(let i=0;i<100;i++) rows.push([-50,10,1.5,4,0]); for(let i=0;i<50;i++) rows.push([-50+i,10,1.5,4,i]);
  const old=S.ghostClean({score:40,when:1,mode:'match',rows}), nu=S.ghostClean({score:40,when:1,mode:'match',rows,t0:1});
  const txt=S.ghostExportText(nu,'x'), back=S.ghostParse(txt).g;
  return {old:old.rows.length, f0:old.rows[1][0], nu:nu.rows.length, t0:JSON.parse(txt).t0, back:back.rows.length}; });
ok(r.old===50&&r.f0===-49,'T4: רוח ישנה (בלי t0) — 100 פריימי הספירה הקפואים נחתכים ('+r.old+' נשארו)');
ok(r.nu===150&&r.t0===1&&r.back===150,'T4: רוח חדשה מסומנת t0 — לא נחתכת, וגם בייצוא/ייבוא');

// ── T5: כפתורי הקסם חסומים בתרגיל ──
r=await E(()=>{ const S=__sim, X=S.v74training; S.drillStart('acc'); X.assistBest(); const a={job:X.ASSIST.job, note:X.ASSIST.note}; X.assistAutoFire(); const b={job:X.ASSIST.job, af:X.ASSIST.autofire};
  S.v72training.drillAbort(); X.assistBest(); const c=X.ASSIST.job; X.ASSIST.job=null; return {a,b,c}; });
ok(r.a.job===null&&/קסם/.test(r.a.note)&&r.b.job===null&&!r.b.af,'T5: בתרגיל הדיוק ״לעמדה הטובה״ ו״ירי אוטומטי״ חסומים — ״'+r.a.note+'״');
ok(r.c==='best','T5: בלי תרגיל הכפתורים עובדים כרגיל');

// ── T6: החניה שלי ברשומה, בהישגים, במשימות ובמאמן ──
await clean(); await mySetup();
await E(()=>{ const S=__sim; S.SETUP.partner=true; S.SETUP.blue1=false; S.SETUP.blue2=false; S.SETUP.autoOn=false; S.SETUP.tele=20; S.setupSave&&S.setupSave(); S.v74training.setupApply(); });
await toEnd();
r=await E(()=>{ const S=__sim; const m=S.seasonAll().slice(-1)[0]||{}; return {my:m.myPark, all:m.pts&&m.pts.park}; });
ok(r.my===0&&r.my!==undefined,'T6: ברשומת העונה myPark='+r.my+' (הברית: '+r.all+')');
r=await E(()=>{ const S=__sim; const mk=i=>({at:1e12+i,kind:'match',my:30,opp:20,win:1,pts:{park:10},myPark:0});
  const D=S.achData({all:Array.from({length:12},(_,i)=>mk(i))}); const D0=S.achData({all:Array.from({length:12},(_,i)=>({at:1e12+i,kind:'match',pts:{park:10}}))});
  localStorage.setItem('bbSeason1',JSON.stringify(Array.from({length:6},(_,i)=>Object.assign(mk(i),{shots:4,hits:2,avgCycle:9,cycles:3,fouls:0,autoPts:5,bins:{drive:1,aim:1,load:1,blocked:0,idle:1,auto:1}}))));
  const cs=S.v74training.coachSummary(), ms=S.v74training.missionsBuild();
  return {run:D.parkRun, run0:D0.parkRun, cs:cs&&cs.endParkPointsAvg, ms:JSON.stringify(ms||{})}; });
ok(r.run===0&&r.run0===12,'T6: ״חונה קבוע״ סופר רק את החניה שלי (0, ולא 12 של השותף); רשומות ישנות בלי myPark — כמו קודם');
ok(r.cs===0&&/park|חניה/.test(r.ms),'T6: המאמן (endParkPointsAvg='+r.cs+') והמשימות (חולשת חניה) לפי החניה שלי');

// ── T8: ״+N מעבר לפתיחה״ ו״ניסית תרגיל״ רק עם תזוזה ──
await clean(); await mySetup();
await E(()=>__sim.drillStart('cycle')); await toEnd();
r=await E(()=>{ const S=__sim, c=S.v72training.V72T.card; return {v:c&&c.v, gain:c&&c.gain, sub:document.getElementById('bannerSub').textContent, tried:S.v74training.v74TriedGet().cycle, dt:S.v74training.achLive().drillsTried}; });
ok(r.gain===0&&/\+0/.test(r.sub)&&/פתיחה/.test(r.sub),'T8: בכרטיס ״'+r.sub+'״ (המדד '+r.v+' נשאר כמו שהוא)');
ok(!r.tried&&r.dt===0,'T8: תרגיל בלי לזוז — ״ניסית תרגיל״ לא מתקדם (drillsTried='+r.dt+')');
await E(()=>{ __sim.matchStop(); __sim.drillStart('cycle'); });
await E(()=>{ const S=__sim; let g=0; while(!S.MATCH.on&&g++<400) S.advance(0.05,1/60); S.botBody.position.x+=0.3; S.advance(0.1,1/60); });   /* הרובוט זז 12 אינץ׳ (כמו נסיעה) */
await toEnd();
r=await E(()=>({tried:__sim.v74training.v74TriedGet().cycle, dt:__sim.v74training.achLive().drillsTried}));
ok(r.tried===1&&r.dt===1,'T8: אחרי נסיעה בתרגיל — נספר (drillsTried='+r.dt+')');
await E(()=>__sim.matchStop());

// ── U6: ספריית שידורים ──
await clean();
r=await E(async()=>{ const S=__sim, X=S.v74training; await X.RPBE_IDB.clear(); await X.rpRefresh(); return X.RPL.idx.size; });
ok(r===0,'U6: ספרייה ריקה בהתחלה');
await mySetup(); await E(()=>__sim.v74training.setupApply()); await toEnd();
await page.waitForTimeout(800);
r=await E(async()=>{ const S=__sim, X=S.v74training; await X.rpRefresh(); const m=S.seasonAll().slice(-1)[0]; const at=m.at, L=X.RPL.idx.get(at);
  const F0=X.REPLAY.frames, r0=await X.RPBE_IDB.get(at); const F=await (async()=>{ const raw=await X.rpUnzip(r0.u,r0.m.nv*2); return X.rpDecode(raw,r0.m.nv,r0.m.nf); })();
  let err=0; for(let i=0;i<F0.length;i+=7){ for(const j of [2,5,6,10,11,12]){ let d=F0[i][j]-F[i][j]; if(j===12) d=Math.atan2(Math.sin(d),Math.cos(d)); err=Math.max(err,Math.abs(d)); } }
  return {at, has:!!L, size:X.RPL.lastSize, nf:F0.length, nf2:F.length, err, my:L&&L.my, deb:X.DEB.report&&X.DEB.report.at}; });
ok(r.has&&r.my!=null,'U6: המאץ׳ נשמר בספרייה (IndexedDB) עם המפתח at של רשומת העונה');
ok(r.size<45000,'U6: גודל שידור של מאץ׳ מלא אחרי כיווץ ודחיסה: '+(r.size/1024).toFixed(1)+' KB ('+r.nf+' פריימים)');
ok(r.nf===r.nf2&&r.err<0.06,'U6: פענוח מחזיר את אותם פריימים (שגיאה מרבית '+r.err.toFixed(3)+')');
ok(r.deb===r.at,'U6: התחקיר יודע איזה שידור הוא שלו');
const AT=r.at;
r=await E(async at=>{ const S=__sim, X=S.v74training;
  X.REPLAY.ev.push({t:40,k:'foul',txt:'G417 · אנחנו · +5',f:600,me:1}); X.REPLAY.ev.push({t:50,k:'foul',txt:'G417 · כחול 1',f:750});
  X.renderDebrief(); const el=document.getElementById('oDebrief');
  const o={graph:!!el.querySelector('.v74Graph polyline'), lines:el.querySelectorAll('.v74Graph polyline').length, play:!!el.querySelector('[data-rpplay]'), fouls:el.querySelectorAll('[data-rpfoul]').length};
  await X.rpFoul(at,0); o.on=X.REPLAY.on; o.follow=X.REPLAY.follow; o.t=X.REPLAY.cur&&X.REPLAY.cur.t; S.replayClose&&S.replayClose(); if(X.REPLAY.on) document.getElementById('rpX').click(); return o; },AT);
ok(r.graph&&r.lines===2,'U10: בתחקיר גרף ניקוד של שתי הבריתות מתוך פריימי השידור');
ok(r.play&&r.fouls===1,'U6: בתחקיר ״▶ צפה במאץ׳״ ורשימת ״העבירות שלי״ (רק שלי — 1 מתוך 2)');
ok(r.on&&r.follow===0&&Math.abs(r.t-37)<0.5,'U6: עבירה — השידור נפתח 3 שנ׳ לפני (t='+(r.t||0).toFixed(1)+'), המצלמה עוקבת אחרי');
r=await E(async at=>{ const S=__sim, X=S.v74training; S.statUI&&S.statUI(); const row=!!document.querySelector('#stOut [data-rpplay="'+at+'"]');
  X.REPLAY.frames=[]; X.REPLAY.meta=null;   /* כמו אחרי רענון */
  const ok1=await X.rpPlay(at); const n=X.REPLAY.frames.length, on=X.REPLAY.on; document.getElementById('rpX').click(); return {row, ok1, n, on}; },AT);
ok(r.row,'U6: ▶ בשורה של המאץ׳ ב״המשחקים האחרונים״');
ok(r.ok1&&r.on&&r.n>1000,'U6: ▶ טוען את השידור מהספרייה גם אחרי שהזיכרון נוקה ('+r.n+' פריימים)');
// כלל השמירה
r=await E(()=>{ const X=__sim.v74training; const L=[]; for(let i=0;i<30;i++) L.push({at:1000+i,my:i===3?99:10,star:i===5?1:0}); const k=X.rpKeep(L,20); return {n:k.keep.size, best:k.best, has3:k.keep.has(1003), has5:k.keep.has(1005), has0:k.keep.has(1000)}; });
ok(r.n===22&&r.has3&&r.has5&&!r.has0&&r.best===1003,'U6: נשמרים 20 אחרונים + השיא + המסומן ⭐ ('+r.n+')');
r=await E(async at=>{ const X=__sim.v74training; await X.rpStar(at); const a=X.RPL.idx.get(at).star; await X.rpStar(at); return {a, b:X.RPL.idx.get(at).star}; },AT);
ok(r.a===1&&r.b===0,'U6: ⭐ מסמן ומבטל');
// ייצוא/ייבוא + בדיקה קפדנית
r=await E(async at=>{ const X=__sim.v74training; const txt=await X.rpExportText(at); const o=JSON.parse(txt);
  const P=async t=>{ const q=await X.rpParse(t); return q.err?'err':'ok'; }, c=f=>{ const x=JSON.parse(txt); f(x); return JSON.stringify(x); };
  const raw=X.rpUnB64(o.data);
  const res={len:txt.length, good:await P(txt),
    notJson:await P('{x'), wrongBb:await P(c(x=>x.bb='ghost')), ver:await P(c(x=>x.v=2)), nfBig:await P(c(x=>x.nf=99999)), nfLie:await P(c(x=>x.nf=x.nf+1)),
    nvLie:await P(c(x=>x.nv=x.nv-4)), b64:await P(c(x=>x.data='!!!')), evBad:await P(c(x=>x.ev=[{t:'x',k:'foul'}])), evKind:await P(c(x=>x.ev=[{t:1,k:'<img>',txt:'a'}])),
    evLate:await P(c(x=>x.ev=[{t:999,k:'foul',txt:'a'}])), zbomb:await P(c(x=>{ x.data=X.rpB64(new Uint8Array(200)); })), big:await P('x'.repeat(6e6+1)), dField:await P(c(x=>x.d='a')),
    flip:await P(c(x=>{ const u=X.rpUnB64(x.data); u[10]^=0xff; u[u.length-3]^=0xff; x.data=X.rpB64(u); })) };
  const ok2=await X.rpImportText(txt); res.imp=ok2&&X.REPLAY.on&&X.REPLAY.meta.file; document.getElementById('rpX').click(); res.lib=X.RPL.idx.size; return res; },AT);
ok(r.good==='ok','U6: קובץ שיוצא נטען בחזרה ('+(r.len/1024).toFixed(1)+' KB)');
ok(['notJson','wrongBb','ver','nfBig','nfLie','nvLie','b64','evBad','evKind','evLate','zbomb','big','dField','flip'].every(k=>r[k]==='err'),'U6: קובץ פגום נדחה — JSON, סוג, גרסה, מספר פריימים, אורך, base64, אירועים, דחיסה מזויפת, גודל, שדה זר, בתים הפוכים: '+JSON.stringify(r));
ok(r.imp&&r.lib===1,'U6: קובץ של חבר מנוגן, ולא נכנס לספרייה שלי');
// שדרוג המסד: ה-CAD שנשמר בגרסה 1 נשאר
r=await E(async()=>{ const X=__sim.v74training;
  await new Promise(res=>{ const q=indexedDB.deleteDatabase('biobuzz_cad'); q.onsuccess=q.onerror=q.onblocked=()=>res(); });
  await new Promise((res,rej)=>{ const q=indexedDB.open('biobuzz_cad',1); q.onupgradeneeded=()=>q.result.createObjectStore('files');
    q.onsuccess=()=>{ const d=q.result, t=d.transaction('files','readwrite'); t.objectStore('files').put('STEPDATA','robot.step'); t.oncomplete=()=>{ d.close(); res(); }; }; q.onerror=rej; });
  const d=await X.idb(); const stores=[...d.objectStoreNames]; const v=d.version;
  const cad=await new Promise(res=>{ const q=d.transaction('files').objectStore('files').get('robot.step'); q.onsuccess=()=>res(q.result); }); d.close();
  await X.rpRefresh(); return {stores, v, cad, n:X.RPL.idx.size}; });
ok(r.v===2&&r.stores.includes('files')&&r.stores.includes('replays')&&r.cad==='STEPDATA','U6: שדרוג המסד מגרסה 1 ל-2 — קובץ ה-CAD נשאר, נוסף ״replays״');
// תרגיל לא נכנס לספרייה; ״אפס הכול״ מוחק
r=await E(async()=>{ const X=__sim.v74training; await X.rpRefresh(); return X.RPL.idx.size; });
const n0=r;
await E(()=>{ __sim.matchStop(); __sim.drillStart('end'); }); await toEnd(); await page.waitForTimeout(500);
r=await E(async()=>{ const X=__sim.v74training; await X.rpRefresh(); return X.RPL.idx.size; });
ok(r===n0,'U6: תרגיל לא נכנס לספרייה');
r=await E(()=>{ const s=document.getElementById('rpLib'); __sim.v74training.rpLibUI(); return {html:!!s, imp:!!document.getElementById('bRpImp')}; });
ok(r.html&&r.imp,'U6: ״שידורים שמורים״ ו״טען שידור מקובץ״ בלוח העונה');

const re=realErrs(errs); ok(re.length===0,'אין שגיאות בדף: '+re.slice(0,3).join(' | '));
await browser.close();
done('v74_training_test');
