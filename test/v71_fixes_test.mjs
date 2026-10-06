// 1.12.4 — סגירת הפתוחים מדוח העמידות (redteam-v70): מסה, קיר, העדפות פגומות, גיבוי כשמלא, מסלול ארוך,
// מחולל בלי אוטונומי, אורך שידור חוזר/רוח, מחסנית דיאלוגים, מתכנן (n=1 + זמן שנותר)
import {open,ok,done} from './h.mjs';
let {browser,page,errs}=await open();
const E=(f,a)=>page.evaluate(f,a);

// 1. botMass משפיע על הגוף
let r=await E(()=>{ const S=window.__sim, X=S.v71; const out={};
  S.P.botMass=12.5; S.refreshChassis(); out.m0=S.botBody.mass;
  S.P.botMass=6; S.refreshChassis(); out.m1=S.botBody.mass; out.inv=S.botBody.invMass;
  S.P.botMass=0; out.k0=X.botMassKg(); S.P.botMass=NaN; out.kN=X.botMassKg();
  S.P.botMass=9; S.rebuildRobot(); out.m2=S.botBody.mass;
  S.P.botMass=12.5; S.rebuildRobot(); S.refreshChassis();
  return out; });
ok(r.m0===12.5&&r.m1===6&&Math.abs(r.inv-1/6)<1e-9&&r.m2===9,'מסת הגוף = botMass (12.5 → 6 → 9 אחרי בנייה מחדש)');
ok(r.k0===0.5&&r.kN===12.5,'מסה 0 / NaN לא שוברת את הפיזיקה');

// 2. כדור מהיר לא עובר דרך קיר ההיקף
r=await E(()=>{ const S=window.__sim, X=S.v71; const res=[];
  for(const v of [8,10,14,20,30]) for(const ax of ['x','z']) for(const sg of [1,-1]){
    const p={x:0,z:0}; p[ax]=sg*62; const vel={x:0,y:0,z:0}; vel[ax]=sg*v;
    const b=S.addBallTest('pollen',p.x,3,p.z,vel);
    let hi=0; for(let i=0;i<40;i++){ X.stepSim(1/60); hi=Math.max(hi,b.body.position.y/0.0254); }
    const q=b.body.position; res.push({v,ax,sg,out:Math.abs(q[ax])/0.0254>72.5&&hi<12});
  }
  return {esc:res.filter(x=>x.out).map(x=>x.v+x.ax+x.sg), n:res.length, guard:X.wallGuardN()}; });
ok(r.esc.length===0,'0 מתוך '+r.n+' כדורים מהירים (8–30 מ׳/ש׳) עברו דרך הקיר (מתחת לגובהו) '+(r.esc.join(' ')||'')+' · התערבויות: '+r.guard);

// 3. אחסון: bbPrefs1=42 / bbDrill1 זבל — כל מה שאחרי נטען
await page.evaluate(()=>{ localStorage.setItem('bbPrefs1','42'); localStorage.setItem('bbDrill1','"x"'); localStorage.setItem('bbDrillH1','[1]'); });
await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.botBody,null,{timeout:60000});
r=await E(()=>{ const S=window.__sim; return {drill:typeof S.drillStart==='function', daily:typeof S.dailyStart==='function', ach:typeof S.achCheck==='function', v71:!!S.v71,
  best:typeof S.DRILL.best==='object'&&!Array.isArray(S.DRILL.best)}; });
ok(r.drill&&r.daily&&r.ach&&r.v71&&r.best,'bbPrefs1=42 — תרגילים, יומי, הישגים והווים נטענו');
ok(!errs.some(e=>/assist|in 42|Cannot use 'in'/.test(e)),'אין חריגה מההעדפות הפגומות');
await page.evaluate(()=>{ localStorage.removeItem('bbPrefs1'); localStorage.removeItem('bbDrill1'); localStorage.removeItem('bbDrillH1'); });

// 4. איפוס/שחזור כשאין מקום לגיבוי — לא נמחק כלום
r=await E(()=>{ const S=window.__sim, X=S.v71;
  localStorage.setItem('bbSeason1','[{"at":1,"my":5}]'); localStorage.setItem('bbKeyBind1','{"x":1}');
  const orig=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){ if(k==='bbBackups1') throw new DOMException('full','QuotaExceededError'); return orig.call(this,k,v); };
  let n, rp, restored;
  try{ n=X.bkResetAll({noReload:true}); rp=S.bk.resetParams({noReload:true}); }
  finally{ Storage.prototype.setItem=orig; }
  const kept=localStorage.getItem('bbSeason1')&&localStorage.getItem('bbKeyBind1'); const msg=X.BK.msg;
  X.BK.exported=Date.now(); Storage.prototype.setItem=function(k,v){ if(k==='bbBackups1') throw new DOMException('full','QuotaExceededError'); return orig.call(this,k,v); };
  let n2; try{ n2=X.bkResetAll({noReload:true}); } finally{ Storage.prototype.setItem=orig; }
  X.BK.exported=0;
  return {n,rp,kept:!!kept,msg,n2,gone:!localStorage.getItem('bbSeason1')}; });
ok(r.n===-1&&r.rp===false&&r.kept,'גיבוי הביטחון נכשל → איפוס הכול ואיפוס הרובוט לא מחקו כלום');
ok(/לא נמחק כלום/.test(r.msg),'הודעה ברורה: '+r.msg);
ok(r.n2>0&&r.gone,'אחרי ייצוא לקובץ — אפשר לאפס גם בלי מקום לגיבוי ('+r.n2+' מפתחות)');

// 5. מסלול ארוך: נשמר ונטען; מעבר לתקרה — לא ״נשמר״
r=await E(()=>{ const S=window.__sim, X=S.v71; S.pathClear();
  const mk=k=>Array.from({length:k},(_,i)=>({x:-60+(i%40)*1.5, z:-50+Math.floor(i/40)*2, act:'none', h:null}));
  S.PATH.pts=mk(260); const n=S.PATH.pts.length; const saved=S.pathSave('ארוך'); S.pathClear(); const back=S.pathLoad('ארוך'); const n2=S.PATH.pts.length;
  S.pathAdd(NaN,3,{raw:true}); const nanOk=S.PATH.pts.length===n2;
  S.PATH.pts=mk(X.PATHMAX); S.pathAdd(10,10,{raw:true});
  const capped=S.PATH.pts.length; const w=S.PATH.warn;
  S.PATH.pts=mk(X.PATHMAX+5); const big=S.pathSave('ענק'); const bigIn=!!S.pathLib()['ענק'];
  S.pathLibDel&&S.pathLibDel('ארוך'); S.pathClear();
  return {n,saved,back,n2,nanOk,capped,max:X.PATHMAX,w,big,bigIn}; });
ok(r.saved&&r.back&&r.n2>=200,'מסלול של '+r.n+' נקודות נשמר ונטען ('+r.n2+')');
ok(r.capped===r.max&&/ארוך מדי/.test(r.w),'תקרה של '+r.max+' נקודות עם הודעה; NaN לא נכנס: '+r.nanOk);
ok(r.nanOk,'pathAdd(NaN) נדחה');
ok(r.big===false&&!r.bigIn,'מסלול מעל התקרה לא ״נשמר״ בשקט');

// 6. מחולל עם הגדרת מאץ׳ בלי אוטונומי
r=await E(()=>{ const S=window.__sim, X=S.v71; const was=[S.MT.auto,S.MT.trans,X.PH[0][1]];
  S.MT.auto=0; S.MT.trans=0; X.PH[0][1]=0; X.PH[1][1]=0;
  S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,20);
  const pts=S.PATH.pts.map(p=>Object.assign({},p));
  const t0=S.MATCH.t; const ev=S.genEvalSync(pts,true);
  const after=[S.MT.auto,S.MT.trans,X.PH[0][1]];
  S.MT.auto=was[0]; S.MT.trans=was[1]; X.PH[0][1]=was[2]; X.PH[1][1]=8; S.pathClear();
  return {ev,after}; });
ok(r.ev&&r.ev.leave&&r.ev.total>0,'ריצת מחולל בלי אוטונומי בהגדרות עדיין מודדת 30 שנ׳ ('+(r.ev&&r.ev.total)+' נק׳, יציאה '+(r.ev&&r.ev.leave)+')');
ok(r.after[0]===0&&r.after[1]===0&&r.after[2]===0,'ההגדרות של המשתמש חזרו אחרי הריצה');

// 7. שידור חוזר ורוח לפי אורך המאץ׳
r=await E(()=>{ const S=window.__sim, X=S.v71; const w=[S.MT.tele]; const a=X.replayCap(), g=X.ghostCap();
  S.MT.tele=400; const b=X.replayCap(), g2=X.ghostCap(); S.MT.tele=2000; const c=X.replayCap(), g3=X.ghostCap(); S.MT.tele=w[0];
  return {a,b,c,g,g2,g3,hz:S.REPLAY.hz}; });
ok(r.a>=r.hz*260&&r.b>=r.hz*(30+8+400)&&r.c===r.hz*900,'שידור חוזר: '+r.a/r.hz+' / '+r.b/r.hz+' / '+r.c/r.hz+' שנ׳ (תקרה 15 דק׳)');
ok(r.g===3600&&r.g2>=20*438&&r.g3===12000,'רוח: '+r.g/20+' / '+r.g2/20+' / '+r.g3/20+' שנ׳');

// 8. מחסנית דיאלוגים: האחרון שנפתח הוא העליון
r=await E(async()=>{ const S=window.__sim, X=S.v71; const out={};
  S.pracOpen(); await new Promise(r=>setTimeout(r,60));
  document.getElementById('qrBox').hidden=false; await new Promise(r=>setTimeout(r,60));
  out.top1=X.ovlTop(); out.zq=getComputedStyle(document.getElementById('qrBox')).zIndex; out.zp=getComputedStyle(document.getElementById('pracBox')).zIndex;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  out.qrHidden=document.getElementById('qrBox').hidden; out.pracOpen=!document.getElementById('pracBox').hidden; out.top2=X.ovlTop();
  out.zp2=getComputedStyle(document.getElementById('pracBox')).zIndex;
  S.pracClose(); await new Promise(r=>setTimeout(r,60)); out.top3=X.ovlTop();
  return out; });
ok(r.top1==='qrBox'&&+r.zq>+r.zp,'QR מעל התרגול: העליון '+r.top1+' (z '+r.zq+' מול '+r.zp+')');
ok(r.qrHidden&&r.pracOpen&&r.top2==='pracBox','Esc סגר את ה-QR בלבד, התרגול נשאר ועכשיו הוא העליון');
ok(r.top3===null,'הכול סגור — אין עליון');
r=await E(async()=>{ const S=window.__sim, X=S.v71;
  X.settingsOpen(); await new Promise(r=>setTimeout(r,80)); const set0=X.ovlTop();
  S.wzOpen(); await new Promise(r=>setTimeout(r,80)); const t=X.ovlTop();
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await new Promise(r=>setTimeout(r,80));
  const out={set0,t,wz:S.WZ.on,setStill:X.ovlTop()};
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await new Promise(r=>setTimeout(r,80));
  out.end=X.ovlTop(); try{ localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); }catch(e){}
  return out; });
ok(r.t==='wizard'&&!r.wz&&r.setStill===r.set0&&r.set0,'Esc באשף סוגר את האשף, ההגדרות ('+r.set0+') נשארות');
ok(r.end===null,'Esc שני סוגר את ההגדרות');

// 9. מתכנן: n=1 מותר, וזמן שנותר בהודעה
r=await E(async()=>{ const S=window.__sim, X=S.v71; S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,20);
  S.GEN.res=[{seq:['L','S'],name:'בדיקה',pts:S.PATH.pts.map(p=>Object.assign({},p)),total:0}];
  const t=performance.now(); await S.optRun({n:1,seed:5}); const ms=performance.now()-t;
  const out={n:S.OPT.n,tries:S.OPT.tries,ms:Math.round(ms),running:S.OPT.running};
  Object.assign(S.OPT,{it:2,n:10,tL:performance.now()-4000}); out.eta=X.optEta(); S.pathClear(); return out; });
ok(r.n===1&&r.tries<=3&&!r.running,'n=1 מכובד: '+r.tries+' ריצות, '+r.ms+' מ״ש');
ok(/עוד בערך \d+ שנ׳/.test(r.eta),'זמן שנותר: '+r.eta);
await page.evaluate(()=>{ localStorage.setItem('bbLang1','en'); }); await page.reload();
await page.waitForFunction(()=>window.__sim&&window.__sim.v71,null,{timeout:60000});
r=await E(()=>{ const S=window.__sim, X=S.v71; Object.assign(S.OPT,{it:2,n:10,tL:performance.now()-4000}); return X.optEta(); });
ok(r&&!/[\u0590-\u05FF]/.test(r),'באנגלית: '+r);
await page.evaluate(()=>{ localStorage.setItem('bbLang1','he'); });

ok(errs.filter(e=>!/favicon|ERR_|Failed to load/.test(e)).length===0,'אין שגיאות: '+errs.slice(0,3).join(' | '));
await browser.close();
done('v71_fixes_test');
