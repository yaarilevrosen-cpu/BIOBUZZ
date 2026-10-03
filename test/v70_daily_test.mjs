// v70: 🗓 אתגר יומי (זהה לכולם, נגזר מהתאריך) · 🏅 הישגים מהנתונים השמורים
import {open,ok,done,realErrs} from './h.mjs';
let {browser,page,errs}=await open({});
const E=(f,a)=>page.evaluate(f,a);
const allErrs=[];
await E(()=>{ for(const k of ['bbDaily1','bbAch1','bbSeason1','bbDrill1','bbDrillH1','bbPlan1','bbMissions1']) localStorage.removeItem(k); });

// 1. אותו תאריך → אותו אתגר; תאריכים שונים → שונים
let r=await E(()=>{ const S=__sim; const a=S.dailySig(S.dailyFor(20261003)), b=S.dailySig(S.dailyFor(20261003));
  const L=[]; let k=20261231; for(let i=0;i<90;i++){ L.push(S.dailyFor(k)); k=S.dailyPrev(k); }
  const sig=L.map(S.dailySig); let same=0; for(let i=1;i<L.length;i++) if(L[i].drill===L[i-1].drill) same++;
  const drills=[...new Set(L.map(c=>c.drill))].sort();
  return {a,b,distinct:new Set(sig).size, same, drills, autoT:[...new Set(L.filter(c=>c.drill==='auto').map(c=>c.target))].length,
    allowed:L.every(c=>S.DAILY.DRILLS.includes(c.drill)), prevYear:S.dailyPrev(20260101), prevMar:S.dailyPrev(20260301)}; });
ok(r.a===r.b,'אותו תאריך נותן אותו אתגר: '+r.a);
ok(r.distinct>=45&&r.same===0,'90 ימים: '+r.distinct+' אתגרים שונים, ימים רצופים עם אותו תרגיל: '+r.same);
ok(r.allowed&&r.drills.length===9,'רק תשעת התרגילים הקיימים, וכולם מופיעים: '+r.drills.join(','));
ok(r.prevYear===20251231&&r.prevMar===20260228,'״אתמול״ במעבר שנה/חודש: '+r.prevYear+' · '+r.prevMar);
const sig1=r.a;
await page.reload({timeout:120000}); await page.waitForFunction(()=>window.__sim&&window.__sim.dailyFor&&window.__sim.botBody,null,{timeout:90000});
r=await E(()=>__sim.dailySig(__sim.dailyFor(20261003)));
ok(r===sig1,'אחרי טעינה מחדש — אותו אתגר ל-3.10.2026 ('+r+')');

// 2. הכי טוב היום ורצף לאורך תאריכים מזויפים
r=await E(()=>{ const S=__sim; localStorage.removeItem('bbDaily1'); S.dailyLoad();
  const D=S.DAILY; const find=p=>{ let k=20261001; for(let i=0;i<60;i++){ if(p(S.dailyFor(k))) return k; k=S.dailyPrev(k); } return null; };
  const kHi=find(c=>!c.lower), kLo=find(c=>c.lower);
  const hi=S.dailyFor(kHi), lo=S.dailyFor(kLo);
  D.fake=kHi; S.dailyResult(kHi,hi.target-5,hi); S.dailyResult(kHi,hi.target+3,hi); S.dailyResult(kHi,hi.target,hi);
  const bHi=D.st.days[kHi].best, hitHi=D.st.days[kHi].hit, nHi=D.st.days[kHi].n;
  D.fake=kLo; S.dailyResult(kLo,lo.target+4,lo); S.dailyResult(kLo,lo.target-1,lo); S.dailyResult(kLo,lo.target+2,lo);
  const bLo=D.st.days[kLo].best;
  // רצף: 29.9 → 30.9 → 1.10 (מעבר חודש), 2.10 בלי ניסיון, 3.10 שוב
  localStorage.removeItem('bbDaily1'); S.dailyLoad(); const st=[];
  for(const k of [20260929,20260930,20261001]){ D.fake=k; S.dailyResult(k,null); st.push(S.dailyStreak(D.st.days,k)); }
  D.fake=20261002; const midday=S.dailyStreak(D.st.days,20261002);
  D.fake=20261003; const gap=S.dailyStreak(D.st.days,20261003); S.dailyResult(20261003,null); const after=S.dailyStreak(D.st.days,20261003);
  const card=S.dailyCardHTML();
  D.fake=null;
  return {kHi,kLo,hi:hi.target,lo:lo.target,bHi,hitHi,nHi,bLo,st,midday,gap,after,bestStreak:D.st.bestStreak,
    saved:JSON.parse(localStorage.getItem('bbDaily1')).bestStreak, cardStreak:/class="dlyStreak">1/.test(card)}; });
ok(r.bHi===r.hi+3&&r.hitHi&&r.nHi===3,'יותר=טוב יותר ('+r.kHi+'): יעד '+r.hi+', ניסיונות '+(r.hi-5)+','+(r.hi+3)+','+r.hi+' → הכי טוב '+r.bHi+', עמד ביעד, '+r.nHi+' ניסיונות');
ok(r.bLo===r.lo-1,'פחות=טוב יותר ('+r.kLo+'): יעד '+r.lo+' → הכי טוב '+r.bLo);
ok(r.st.join(',')==='1,2,3','רצף עולה גם במעבר חודש: '+r.st.join(','));
ok(r.midday===3&&r.gap===0&&r.after===1,'יום בלי ניסיון עדיין לא שובר עד שנגמר ('+r.midday+'), יום שדולג שובר ('+r.gap+'), ומתחילים מחדש ('+r.after+')');
ok(r.bestStreak===3&&r.saved===3&&r.cardStreak,'הרצף הכי ארוך נשמר: '+r.bestStreak+' · הכרטיס מציג רצף 1');

// 3. אתגר אמיתי: מאץ׳ ״מחזורים״ עם צד ותקלות מהאתגר, עד סוף המאץ׳ — נכנס לעונה כ-daily, לא לשיא הרגיל
r=await E(async()=>{ const S=__sim, D=S.DAILY; localStorage.removeItem('bbDaily1'); S.dailyLoad();
  let k=20261001; for(let i=0;i<60&&S.dailyFor(k).drill!=='cycle';i++) k=S.dailyPrev(k);
  D.fake=k; const c=S.dailyFor(k); S.dailyUI();
  const btn=document.querySelector('#ppDaily [data-daily-go]'); btn.click();
  const st={on:D.on, drill:S.DRILL.on, ally:S.myAlly(), want:c.ally, faults:S.dailyFaultOn(), wantF:c.faults, tele:S.MATCH.on||S.MATCH.cd>0};
  const n0=S.seasonAll().length, best0=S.DRILL.best.cycle;
  let g=0; while(!S.MATCH.on&&g++<600) S.advance(1/60,1/60);
  S.setMatchT(Math.max(S.MATCH.t,S.tEndNow()-0.2));
  g=0; while(S.MATCH.on&&g++<600) S.advance(1/60,1/60);
  const a=S.seasonAll(), m=a[a.length-1], d=D.st.days[k];
  const card=document.getElementById('ppDaily').textContent;
  const out={k,c:S.dailySig(c),st,added:a.length-n0,kind:m&&m.kind,my:m&&m.my,d,on:D.on,best0,best1:S.DRILL.best.cycle,card};
  // תרגיל רגיל אחרי זה לא נחשב לאתגר
  S.dailyStart(); const was=D.on; S.drillStart('acc'); out.afterNormal=D.on; out.wasDaily=was; S.matchStop();
  D.fake=null; return out; });
ok(r.st.on===r.k&&r.st.drill==='cycle'&&r.st.tele,'כפתור ״התחל את האתגר״ מתחיל את תרגיל המחזורים ('+r.c+')');
ok(r.st.ally===r.st.want&&r.st.faults===!!r.st.wantF,'הצד והתקלות מהאתגר: '+r.st.ally+'/'+r.st.want+' · תקלות '+r.st.faults+'/'+r.st.wantF);
ok(r.added===1&&r.kind==='daily','סוף המאץ׳: רשומה אחת בעונה מסוג '+r.kind+' ('+r.my+' נק׳)');
ok(r.d&&r.d.n===1&&r.d.best===r.my&&r.on===null,'התוצאה נשמרה לאתגר של היום: '+(r.d&&r.d.best)+' · ניסיונות '+(r.d&&r.d.n));
ok(r.best0===r.best1,'השיא הרגיל של התרגיל לא השתנה ('+r.best0+' → '+r.best1+')');
ok(/הכי טוב היום/.test(r.card)&&r.card.includes(String(r.my)),'הכרטיס בלוח המשחק מציג את התוצאה של היום');
ok(r.wasDaily===r.k&&r.afterNormal===null,'תרגיל רגיל אחרי האתגר מבטל את סימון האתגר');

// 4. הישגים על עונה סינתטית
r=await E(()=>{ const S=__sim; const all=[];
  const M=(o)=>Object.assign({at:all.length+1,kind:'match',my:40,opp:30,win:1,fouls:0,pts:{park:5},autoPts:12,avgCycle:9,cycles:4},o);
  all.push(M({win:-1,my:20,opp:30}), M({my:45}), M({my:38,fouls:1}), M({}), M({}), M({}), M({kind:'drill',my:90,win:1,fouls:3,pts:{park:0}}), M({avgCycle:6.4,cycles:5,pts:{park:0}}), M({autoPts:31}));
  const D=S.achData({all, best:{acc:10,far:5,cycle:50}, hist:{speed:[[1,60],[2,55]]}, lower:{speed:1}, dailyHits:1, streak:2, planDone:3, planTotal:5, planner:false});
  const L=S.achEval(D), g=id=>L.find(a=>a.id===id);
  return {n:L.length, wins:D.wins, games:D.games.length, clean:D.cleanRun, park:D.parkRun, fast:D.fastCycle, auto:D.autoBest, beat:D.beat, tried:D.drillsTried,
    win1:g('win1'), win10:g('win10'), acc10:g('acc10'), far7:g('far7'), clean5:g('clean5'), park10:g('park10'), cycle7:g('cycle7'), auto30:g('auto30'), streak3:g('streak3'), plan:g('plan'), planner:g('planner'), daily1:g('daily1'), drills9:g('drills9')}; });
ok(r.n>=15,'מספר ההישגים: '+r.n);
ok(r.win1.ok&&r.win10.v===7&&!r.win10.ok&&r.wins===7&&r.games===8,'ניצחונות בלי תרגילים: '+r.wins+'/'+r.games+' משחקים → ״ניצחון ראשון״ נפתח, ״עשרה ניצחונות״ '+r.win10.v+'/'+r.win10.max);
ok(r.acc10.ok&&r.far7.v===5&&!r.far7.ok,'10/10 בדיוק נפתח; דיוק מרחוק '+r.far7.v+'/'+r.far7.max);
ok(r.clean5.ok&&r.clean===5,'5 משחקים ברצף בלי עבירות (התרגיל לא נספר): רצף '+r.clean);
ok(r.park10.v===r.park&&r.park===6&&!r.park10.ok,'חניה ברצף: '+r.park10.v+'/'+r.park10.max);
ok(r.cycle7.ok&&r.auto30.ok&&r.auto===31,'מחזור 6.4 שנ׳ ← ״מחזור מהיר״; אוטונומי '+r.auto+' ← ״אוטונומי חזק״');
ok(r.beat&&r.tried===4&&r.drills9.v===4,'שבירת שיא (45 > 40, ו-55 < 60 שנ׳); תרגילים שנוסו: '+r.drills9.v+'/9');
ok(r.daily1.ok&&r.streak3.v===2&&!r.streak3.ok&&r.plan.v===3&&r.plan.max===5&&!r.planner.ok,'אתגר ראשון נפתח · רצף '+r.streak3.v+'/3 · תוכנית '+r.plan.v+'/'+r.plan.max+' · מתכנן '+r.planner.v+'/1');

// 5. הודעה כשהישג נפתח — פעם אחת בלבד
r=await E(async()=>{ const S=__sim; localStorage.removeItem('bbAch1'); S.achLoad(); S.ACH.log.length=0;
  localStorage.setItem('bbSeason1',JSON.stringify([{at:Date.now()-5000,kind:'match',my:50,opp:20,win:1,fouls:0,shots:10,hits:8,pts:{park:5}}]));
  const f1=S.achCheck(); const f2=S.achCheck(); const f3=S.achCheck();
  await new Promise(res=>setTimeout(res,400));
  const el=document.getElementById('achToast');
  return {f1,f2,f3,log:S.ACH.log.slice(),show:!!el&&el.classList.contains('show'),txt:el?el.textContent:'',at:JSON.parse(localStorage.getItem('bbAch1')).un.win1}; });
ok(r.f1.includes('win1')&&r.f2.length===0&&r.f3.length===0,'״ניצחון ראשון״ נפתח בבדיקה הראשונה בלבד ('+r.f1.join(',')+' · אחר כך '+r.f2.length+','+r.f3.length+')');
ok(r.log.filter(x=>x==='win1').length===1&&r.show&&/ניצחון ראשון/.test(r.txt),'הודעה אחת על המסך: '+r.txt);
ok(r.at>0,'נשמר עם תאריך: '+new Date(r.at).toISOString().slice(0,10));
r=await E(async()=>{ const S=__sim; S.achFlag('planner'); const a=S.ACH.log.filter(x=>x==='planner').length; S.achFlag('planner'); return {a,b:S.ACH.log.filter(x=>x==='planner').length}; });
ok(r.a===1&&r.b===1,'המתכנן הרץ — ״מתכנן״ נפתח פעם אחת ('+r.b+')');

// 6. הגלריה בסטטיסטיקות
r=await E(()=>{ const S=__sim; const d=document.getElementById('statsBox'); if(d) d.open=true; try{ S.statUI&&S.statUI(); }catch(e){} S.achUI();
  const b=document.getElementById('achBox'); return {cards:b.querySelectorAll('.achC').length, on:b.querySelectorAll('.achC.on').length, un:Object.keys(JSON.parse(localStorage.getItem('bbAch1')).un).length,
    head:b.querySelector('.stH').textContent, prog:[...b.querySelectorAll('.achC:not(.on) small')].map(x=>x.textContent).slice(0,3), date:(b.querySelector('.achC.on small')||{}).textContent}; });
ok(r.cards>=15&&r.on===r.un&&r.on>=2,'הגלריה: '+r.cards+' הישגים, '+r.on+' פתוחים ('+r.head.trim()+')');
ok(r.prog.every(p=>/^\d+\/\d+$/.test(p))&&/✓ \d+\.\d+\.\d{4}/.test(r.date),'התקדמות לנעולים ('+r.prog.join(' · ')+') ותאריך לפתוחים ('+r.date+')');

// 7. אנגלית — בלי עברית בכרטיס ובגלריה
allErrs.push(...errs);
await E(()=>localStorage.setItem('bbLang1','en'));
await page.reload({timeout:120000}); await page.waitForFunction(()=>window.__sim&&window.__sim.dailyFor&&window.__sim.botBody,null,{timeout:90000});
await page.waitForTimeout(400);
r=await E(()=>{ const S=__sim; S.dailyUI(); S.achUI(); S.DAILY.fake=null;
  const k=20261001; let html=''; for(let i=0;i<9;i++){ const kk=20261001+i; S.DAILY.fake=kk; S.dailyUI(); html+=document.getElementById('ppDaily').textContent+' | '; }
  S.DAILY.fake=null; S.dailyUI();
  return {card:html, ach:document.getElementById('achBox').textContent}; });
await new Promise(res=>setTimeout(res,300));
const heb=s=>(s.match(/[֐-׿]+/g)||[]);
ok(heb(r.card).length===0,'אנגלית: כרטיס האתגר בלי עברית (9 ימים) — '+(heb(r.card).slice(0,6).join(' ')||r.card.slice(0,90)));
ok(heb(r.ach).length===0,'אנגלית: גלריית ההישגים בלי עברית — '+(heb(r.ach).slice(0,6).join(' ')||r.ach.slice(0,90)));
await E(()=>localStorage.setItem('bbLang1','he'));

allErrs.push(...errs);
const re=realErrs([...new Set(allErrs)]);
ok(re.length===0,'אין שגיאות בקונסול'+(re.length?': '+re.slice(0,3).join(' | '):''));
await browser.close();
done('v70_daily_test');
