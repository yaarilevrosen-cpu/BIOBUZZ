// v42: שידור חוזר, מצב שידור, עונה, זיכרון בוטים, תקלות, יומן אודומטריה, מחולל, עורך רובוט, ברקוד
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; localStorage.removeItem('bbSeason1'); localStorage.removeItem('bbBotMem1'); S.MEM.shots=[]; S.MEM.matches=0; S.MEM.active=0; S.stageMatch(); });
const chunk=async(sec)=>{ for(let t=0;t<sec;t+=3) await E(()=>S.advance(3,1/60)); };

// ── מאץ׳ קצר מלא (אוטונומי 30 + טלאופ 15), עם תקלות ──
await E(()=>{ S.MT.cd=0; S.MT.auto=30; S.MT.trans=0; S.MT.tele=15; S.FAULT.on=true; S.MYAUTO.lvl='cycle'; S.matchStart(); });
await chunk(20);
let r=await E(()=>{ const f=S.faultStart('grip'); const mu=S.P.muWheel; return {n:f.n, mu, tag:!document.getElementById('faultTag').hidden}; });
ok(r.tag&&r.mu<0.6,'תקלה: הגלגלים מחליקים (אחיזה '+r.mu.toFixed(2)+') ומוצגת על המסך');
r=await E(()=>{ S.faultTick(7); return {mu:S.P.muWheel, cur:S.FAULT.cur}; });
ok(!r.cur&&Math.abs(r.mu-0.85)<0.01,'התקלה נגמרת והאחיזה חוזרת');
r=await E(()=>{ S.faultStart('radio'); const m0=S.bot.mag; const x=S.fire(); return {x:x===null, frozen:S.FAULT.freeze>0}; });
ok(r.x&&r.frozen,'מקלט מנותק: אין ירי ואין נסיעה');
await chunk(30);
r=await E(()=>({ph:S.MATCH.phase, fr:S.REPLAY.frames.length, ev:S.REPLAY.ev.map(e=>e.k), mu:S.P.muWheel, batt:S.P.battV}));
ok(r.ph==='סיום','המאץ׳ הסתיים');
ok(r.fr>40*15*0.9,'השידור החוזר הוקלט ('+r.fr+' תמונות)');
ok(r.ev.includes('phase')&&r.ev.includes('fault')&&r.ev.includes('hit'),'אירועים: '+[...new Set(r.ev)].join(', '));
ok(Math.abs(r.mu-0.85)<0.01&&Math.abs(r.batt-12.6)<0.01,'בסוף המאץ׳ הרובוט חוזר לתקין');

// ── שידור חוזר ──
r=await E(()=>{ const bx=S.I(S.botBody.position.x); const ok1=S.replayOpen({t:5,play:false}); S.replayStep(0.01);
  const gx=S.I(S.bot.group.position.x); const vis=S.balls.every(b=>!b.mesh.visible); const t=S.REPLAY.cur.t;
  S.REPLAY.play=true; S.REPLAY.speed=2; S.replayStep(1.0); const t2=S.REPLAY.cur.t;
  return {ok1, bx, gx, vis, t, t2, bar:!document.getElementById('rpBar').hidden, ticks:document.querySelectorAll('#rpTicks i').length}; });
ok(r.ok1&&r.bar&&Math.abs(r.t-5)<0.2,'שידור חוזר נפתח בשנייה 5 ('+r.t.toFixed(2)+')');
ok(Math.abs(r.t2-r.t-2)<0.2,'מהירות ×2: שנייה אמיתית = 2 שניות מאץ׳ ('+r.t.toFixed(2)+' → '+r.t2.toFixed(2)+')');
ok(r.vis&&Math.abs(r.gx-r.bx)>1,'הרובוט והכדורים מוצגים מההקלטה, לא מהפיזיקה');
ok(r.ticks>=3,'סימני אירועים על ציר הזמן ('+r.ticks+')');
r=await E(()=>{ const b=S.replayBest(); S.replayClose(); S.replayStep; const gx=S.I(S.bot.group.position.x), bx=S.I(S.botBody.position.x);
  return {b, same:Math.abs(gx-bx)<0.01, vis:S.balls.every(q=>q.mesh.visible)}; });
ok(r.b&&r.b.t>0,'מהלך המאץ׳: '+(r.b&&r.b.txt)+' ב-'+(r.b&&r.b.t.toFixed(1))+' שנ׳');
ok(r.same&&r.vis,'בסגירה הכול חוזר בדיוק למצב שהיה');

// ── עונה וזיכרון ──
r=await E(()=>{ const a=S.seasonAll(); const m=a[a.length-1]; return {n:a.length, m:m&&{my:m.my,auto:m.auto,sh:m.sh.length,faults:m.faults,autoPts:m.autoPts}, mem:S.MEM.matches, html:document.getElementById('oSeason').innerText}; });
ok(r.n===1&&r.m.sh>0&&r.m.faults>=2&&r.m.autoPts!=null,'העונה שמרה את המאץ׳: '+JSON.stringify(r.m));
ok(/מאצ׳ים/.test(r.html),'לוח העונה מציג נתונים');
ok(r.mem===1,'הבוטים זכרו את המאץ׳');
r=await E(()=>{ const L=[]; for(let k=0;k<3;k++) L.push({at:k,ally:'red',my:40+k*10,opp:30,win:1,auto:k?'דוגמה · שני פרחים':'מחזור מלא',autoPts:70+k*5,shots:10,hits:8,fouls:0,leave:true,park:true,faults:0,sh:[[-12,50,1],[-12,50,0],[-14,52,1]],bl:[[0,0]]});
  localStorage.setItem('bbSeason1',JSON.stringify(S.seasonAll().concat(L))); S.seasonUI(); const st=S.seasonStats(S.seasonAll());
  const cv=document.getElementById('seasonMap'); const px=cv.getContext('2d').getImageData(Math.round((-12+72)*2),Math.round((50+72)*2),1,1).data;
  return {n:st.n, top:st.autos[0].k, px:[...px]}; });
ok(r.n===4&&r.top==='דוגמה · שני פרחים','האוטונומי הטוב של העונה: '+r.top);
ok(r.px[1]>r.px[0],'מפת החום צבועה בירוק איפה שנכנס');
r=await E(()=>{ S.MEM.shots=[]; for(let i=0;i<10;i++) S.MEM.shots.push([-14+i*0.3,48,1]); S.MEM.active=8; S.MEM.on=true;
  S.MT.cd=0; S.matchStart(); const sh=(S.BRAIN.shots.me||[]).length; const act=S.BRAIN.act.me; const L=S.BRAIN.shots.me&&S.BRAIN.shots.me.length>=3;
  S.matchStop(); return {sh, act:!!act, L}; });
ok(r.sh>=3&&r.act,'במאץ׳ הבא הבוטים כבר יודעים איפה אתה יורה ('+r.sh+' יריות מהזיכרון)');

// ── מצב שידור ──
r=await E(()=>{ S.bcSet(true); S.bcTick(0.1); const vis=getComputedStyle(document.getElementById('bcBoard')).display!=='none';
  const hid=getComputedStyle(document.getElementById('rail')).display==='none'; const nm=document.getElementById('bcRedN').textContent;
  S.bcSet(false); return {vis,hid,nm}; });
ok(r.vis&&r.hid&&r.nm.length>0,'מצב שידור: לוח ניקוד גדול, הלוחות מוסתרים ('+r.nm+')');

// ── יומן אודומטריה ──
r=await E(()=>{ S.SETUP.ally='red'; S.pathLoad('ex:preload'); let txt='t,x,y,heading\n';
  for(let i=0;i<=40;i++){ const t=i*0.05, x=i*1.0, y=(i>20?(i-20)*0.3:0); txt+=t.toFixed(2)+','+x+','+y+',0\n'; }
  const st=S.odoLoad(txt,{align:true}); const st0=S.autoStartPose(); const p0=S.ODO.pts[0], p1=S.ODO.pts[40];
  return {st:st&&{n:st.n,max:st.max,planned:st.planned}, p0:[p0.x,p0.z], s:[st0.x,st0.z], p1:[+p1.x.toFixed(1),+p1.z.toFixed(1)], line:!!S.ODO.grp}; });
ok(r.st&&r.st.n===41&&r.line,'יומן נטען: '+r.st.n+' שורות, קו על הזירה');
ok(Math.abs(r.p0[0]-r.s[0])<0.01&&Math.abs(r.p0[1]-r.s[1])<0.01,'היומן מיושר לעמדת הפתיחה');
ok(Math.abs(r.p1[0]-(r.s[0]+40))<0.5,'צירי RoadRunner → הסימולטור: x קדימה מהקיר ('+r.p1+')');
ok(r.st.planned&&r.st.max>1,'סטייה מהמסלול המתוכנן נמדדה ('+r.st.max.toFixed(1)+'″)');
r=await E(()=>{ const a=S.odoParse('Pose2d(position=Vector2d(x=10.0, y=5.0), heading=Rotation2d(real=0.0, imag=1.0))\nPose2d(position=Vector2d(x=11.0, y=5.0), heading=Rotation2d(real=0.0, imag=1.0))','in');
  const b=S.odoParse('t,x,y,h\n0,0,0,90\n500,1,0,90\n1000,2,0,90','in'); return {a:a&&a[0], b:b&&b[2]}; });
ok(r.a&&Math.abs(r.a.yaw+Math.PI/2)<1e-6&&r.a.x===-5,'קורא גם Pose2d.toString של RoadRunner');
ok(r.b&&Math.abs(r.b.t-1)<1e-6&&Math.abs(r.b.yaw+Math.PI/2)<1e-6,'מזהה מילישניות ומעלות');
await E(()=>S.odoClear());

// ── מחולל ──
r=await E(()=>{ const a=S.genEvalSync(S.genPts(['S','P']),true); const b=S.genEvalSync(S.genPts(['L','P']),true);
  return {a,b, cur:S.PATH.cur, lvl:S.MYAUTO.lvl, on:S.MATCH.on, rec:S.REPLAY.frames.length}; });
ok(r.a.total>r.b.total&&r.a.hits>=3,'מחולל: ירי וחניה ('+r.a.total+') עדיף על יציאה וחניה ('+r.b.total+')');
ok(!r.on&&r.cur==='ex:preload','אחרי המחולל העורך והמאץ׳ חוזרים למה שהיה');
ok(r.rec>500,'המחולל לא דורס את השידור החוזר של המאץ׳ האמיתי');
r=await E(()=>S.seasonAll().length);
ok(r===4,'המחולל לא נרשם בעונה');

// ── עורך רובוט ──
r=await E(()=>{ const q0=S.redMeasureQuick(); S.redApply(S.RED_PARTS.chassis[0].v); const q1=S.redMeasureQuick(); S.redApply(S.RED_PARTS.size[0].v);
  const w=S.P.botW; S.redApply(S.RED_PARTS.chassis[1].v); S.redApply(S.RED_PARTS.size[1].v); return {q0,q1,w}; });
ok(r.q1.vMax>r.q0.vMax&&r.q0.acc!=null,'שלדה מהירה: '+r.q0.vMax+' → '+r.q1.vMax+' רגל/שנ׳ · דיוק '+r.q0.acc+'%');
ok(r.w===18,'הרכבת חלק משנה את הרובוט (18×18)');

// ── ברקוד ──
r=await E(()=>{ const svg=S.qrSvg('http://192.168.1.20:9662/',200); S.phoneSetSeat(2); const h=S.BOTS[2].hum; const on=S.BOTS[2].on; S.phoneSetSeat(-1);
  return {svg:svg.length, rects:(svg.match(/h[\d.]+v/g)||[]).length, src:h&&h.src, on, after:S.BOTS[2].hum}; });
ok(r.svg>2000&&r.rects>200,'ברקוד נוצר ('+r.rects+' ריבועים)');
ok(r.src==='phone'&&r.on&&!r.after,'הטלפון יכול לנהוג ברובוט אחר בזירה, וחוזר');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v42_test');
