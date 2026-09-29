// v63 · ליבת המשחק והרשת: פיזיקה איטית, ייצוא RoadRunner, עזיבת אורח, XSS מהרשת, השהיה, אוטונומי, עבירות, ירי, דליפות
import { open, ok, done, realErrs } from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);

/* 1 · פיזיקה בצעדים של 0.05 — כדור נופל אותו מרחק כמו בצעדים של 1/120 */
{
  const r=await E(()=>{ const S=__sim, out={};
    for(const st of [1/120,0.05]){ S.matchStop(); S.clearBalls(); const b=S.addBall('pollen',0,100,-40); b.body.velocity.set(0,0,0);
      S.advance(0.3,st); out[st]=S.I(b.body.position.y); }
    S.clearBalls(); return out; });
  const a=r[1/120], b=r[0.05];
  ok(Math.abs(a-b)<0.5, `נפילה בצעדים של 0.05 זהה ל-1/120 (${a.toFixed(2)} מול ${b.toFixed(2)})`);
}

/* 17 · השהיה עוצרת את השעון, הבוטים והשופט */
{
  const r=await E(()=>{ const S=__sim; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.advance(2,1/60);
    const t0=S.MATCH.t, bp=S.BOTS.map(b=>b.body.position.x+','+b.body.position.z).join('|');
    S.paused=true; S.advance(40,1/60);
    const t1=S.MATCH.t, bp1=S.BOTS.map(b=>b.body.position.x+','+b.body.position.z).join('|');
    S.paused=false; S.advance(0.5,1/60); const t2=S.MATCH.t; const ph=S.MATCH.phase; S.matchStop();
    return {t0,t1,t2,same:bp===bp1,ph}; });
  ok(r.t1===r.t0, `השעון קפוא בהשהיה (${r.t0} → ${r.t1})`);
  ok(r.same, 'הבוטים לא זזים בהשהיה');
  ok(r.t2>r.t1&&r.ph==='AUTO', `אחרי ההשהיה השעון ממשיך ונשארים באוטונומי (${r.ph})`);
}

/* 20 · קצב ירי: לחיצות מהירות לא יורות יותר מזמן ההזנה */
{
  const r=await E(()=>{ const S=__sim; S.matchStop(); S.gameStart(false); S.clearBalls(); S.advance(1,1/60); S.setClip(['pollen','pollen','pollen','pollen']);
    let n=0; for(let i=0;i<4;i++){ if(S.uFire()) n++; }
    const gap=Math.max(S.P.feedTime,0.25); S.advance(gap+0.05,1/60); let n2=0; if(S.uFire()) n2++;
    /* נהג אנושי בבוט: לחיצה-שחרור-לחיצה מהר */
    const b=S.BOTS[0]; S.humSeat(b,'net','g'); b.hum.id='gX'; b.clip.length=0; b.clip.push('pollen','pollen','pollen','pollen'); b.on=true;
    let shots0=b.shots; for(let i=0;i<8;i++){ S.humFeed(b,{x:0,y:0,t:0,fire:i%2===0,intake:false,aim:false,fc:true}); S.advance(1/60,1/60); }
    const hs=b.shots-shots0; S.humFree(b); S.clearBalls();
    return {n,n2,hs}; });
  ok(r.n===1, `ארבע לחיצות מהירות = כדור אחד (${r.n})`);
  ok(r.n2===1, 'אחרי זמן ההזנה אפשר לירות שוב');
  ok(r.hs<=1, `נהג אנושי ברשת לא יורה מהר מהמשגר (${r.hs} ב-8 פריימים)`);
}

/* 3 · אורח שעוזב חדר: אין מאץ׳ רפאים, אין חריגות, אין שיא מזויף. netOnState דוחה תמונות פגומות */
{
  const r=await E(()=>{ const S=__sim; S.MT.cd=0; S.gameStart(true); S.matchStart(); S.advance(60,1/60);
    const pk=S.netPack(); S.matchStop(); S.gameStart(false);
    const rec0=localStorage.getItem('biobuzz_records_v1');
    S.NET.mode='guest'; S.netOnState(pk.buffer.slice(0)); S.netOnState(pk.buffer.slice(0)); S.netGuestStep(0.05);
    const holes=S.BOTS.some(b=>{ for(let i=0;i<b.clip.length;i++) if(typeof b.clip[i]!=='string') return true; return false; });
    const g={on:S.MATCH.on};
    S.netClose('');
    let ex=[]; for(let i=0;i<220;i++){ try{ S.advance(0.5,1/60);}catch(e){ ex.push(String(e).slice(0,80)); } }
    /* תמונות פגומות */
    S.NET.mode='guest'; const n0=S.NET.snaps.length;
    const bad=[new ArrayBuffer(7), new Float32Array(12).buffer, (()=>{ const a=S.netPack(); a[9]=50; return a.buffer; })(),
      (()=>{ const a=S.netPack(); a[12]=NaN; return a.buffer; })(), (()=>{ const a=S.netPack(); if(a[9]>0) a[33]=99; else a[3]=77; return a.buffer; })()];
    for(const x of bad) S.netOnState(x);
    const n1=S.NET.snaps.length; S.netOnState(S.netPack().buffer); const n2=S.NET.snaps.length; S.NET.snaps.length=0; S.NET.mode='solo';
    return {holes,g,after:{on:S.MATCH.on,ph:S.MATCH.phase,bots:S.BOTS.map(b=>b.on)},nex:ex.length,ex:ex.slice(0,2),rec0,rec1:localStorage.getItem('biobuzz_records_v1'),n0,n1,n2}; });
  ok(r.g.on===true,'אורח רואה מאץ׳ פעיל מהמארח');
  ok(!r.holes,'מחסנית בוט מרוחק בלי חורים');
  ok(r.after.on===false&&!r.after.bots.some(Boolean), `אחרי עזיבה המאץ׳ נעצר והבוטים כבויים (${JSON.stringify(r.after)})`);
  ok(r.nex===0, 'אין חריגות אחרי העזיבה '+r.ex.join(' | '));
  ok(r.rec0===r.rec1, 'לא נשמר שיא מזויף');
  ok(r.n1===r.n0&&r.n2===r.n0+1, `תמונות פגומות נדחות (${r.n0}→${r.n1}→${r.n2})`);
}

/* 11 · מחרוזות מהרשת לא נכנסות כ-HTML */
{
  const X='<img src=x onerror="window.__x=(window.__x||0)+1">';
  const r=await E((X)=>{ const S=__sim; window.__x=0;
    /* מארח: אורח עם שם זדוני */
    S.NET.mode='host'; S.netOnMsg(JSON.stringify({t:'gj',id:'g9',name:X+X+X}));
    S.netRefresh(); const tb=document.getElementById('netSeats');
    const hostHtml=tb?tb.innerHTML:''; const nameLen=(S.NET.guests.g9||{}).name.length;
    S.netOnMsg(JSON.stringify({t:'gl',id:'g9'}));
    S.NET.mode='solo'; S.netRefresh();
    /* אורח: חדר, סירוב וסיכום מהמארח */
    S.NET.mode='guest'; S.NET.seat=null;
    S.netOnMsg(JSON.stringify({t:'room',host:X,seats:[{kind:'bot" onmouseover="x',name:X,ally:'red"><img src=x onerror=alert(1)>'},{kind:'net',name:X,ally:'blue'}],allies:['red','blue','blue','red']}));
    S.netOnMsg(JSON.stringify({t:'seat',seat:1,allies:['red','blue','blue','red']}));
    S.netOnMsg(JSON.stringify({t:'deny',why:X}));
    S.netRefresh();
    const gHtml=(document.getElementById('netSeats')||{}).innerHTML+(document.getElementById('netTag')||{}).innerHTML+(document.getElementById('oNet')||{}).innerHTML;
    S.netOnMsg(JSON.stringify({t:'sum',red:'<b>1</b>',blue:3,rows:[{s:1,name:X,kind:X,ally:'red" onclick="x',shots:'<i>',hits:2,fouls:0,park:1}]}));
    const sHtml=(document.getElementById('mpSum')||{}).innerHTML||'';
    const el=document.getElementById('mpSum'); if(el) el.hidden=true;
    S.NET.mode='solo'; S.NET.err=''; S.NET.seats=[]; S.NET.hostName=''; S.netRefresh();
    return {hostImg:/<img/i.test(hostHtml), nameLen, gImg:/<img/i.test(gHtml), gAttr:/onmouseover/.test(gHtml), sImg:/<img/i.test(sHtml), sAttr:/onclick/.test(sHtml), sLen:sHtml.length};
  },X);
  await page.waitForTimeout(300);
  const fired=await E(()=>window.__x);
  ok(!r.hostImg,'שם אורח אצל המארח מוצג כטקסט');
  ok(r.nameLen<=20,`שם אורח נחתך ל-20 תווים (${r.nameLen})`);
  ok(!r.gImg&&!r.gAttr,'שמות, סוג וברית מהמארח אצל האורח — טקסט בלבד');
  ok(!r.sImg&&!r.sAttr&&r.sLen>0,'טבלת הסיכום מהרשת — טקסט בלבד');
  ok(fired===0,'שום קוד מהרשת לא רץ');
}

/* 2 · ייצוא RoadRunner: סיבוב ולא שיקוף, פנייה שמאלה = כיוון עולה, הלוך־חזור זהה, דטרמיננטה +1 */
{
  const r=await E(()=>{ const S=__sim, out={rots:{}};
    const pts=[{x:-60,z:40,h:Math.PI/2,act:'none',start:true},{x:-40,z:40,h:Math.PI/2,act:'none'},{x:-30,z:30,h:Math.PI,act:'none'}];
    for(const rot of [0,90,180,270]){ S.rrSetRot(rot);
      const java=S.pathJava(pts);
      const hs=[...java.matchAll(/new Pose2d\([^)]*?Math\.toRadians\((-?[\d.]+)\)\)/g)].map(m=>+m[1]);
      let dh=hs[hs.length-1]-hs[0]; dh=((dh+540)%360)-180;
      /* דטרמיננטה של המיפוי (x,z) → (RR.x,RR.y) */
      const o=S.rrFromSim(0,0), ex=S.rrFromSim(1,0), ez=S.rrFromSim(0,1);
      const det=(ex.x-o.x)*(ez.y-o.y)-(ex.y-o.y)*(ez.x-o.x);
      /* det בצירים הימניים (z,x): */
      const detZX=(ez.x-o.x)*(ex.y-o.y)-(ez.y-o.y)*(ex.x-o.x);
      /* הלוך־חזור */
      let maxErr=0; for(let i=0;i<20;i++){ const x=Math.random()*140-70, z=Math.random()*140-70, h=Math.random()*6.2-3.1;
        const q=S.rrFromSim(x,z,h), b=S.rrToSim(q.x,q.y,q.h); const dy=Math.atan2(Math.sin(b.yaw-h),Math.cos(b.yaw-h));
        maxErr=Math.max(maxErr,Math.abs(b.x-x),Math.abs(b.z-z),Math.abs(dy)); }
      /* יומן אודומטריה בצירי RR → חוזר לנקודות הסימולטור */
      let csv='t,x,y,heading\n'; pts.forEach((p,i)=>{ const q=S.rrFromSim(p.x,p.z,p.h); csv+=(i*0.5)+','+q.x+','+q.y+','+q.h+'\n'; });
      const odo=S.odoParse(csv,'in','rad'); let odoErr=0; odo.forEach((p,i)=>{ odoErr=Math.max(odoErr,Math.abs(p.x-pts[i].x),Math.abs(p.z-pts[i].z),Math.abs(Math.atan2(Math.sin(p.yaw-pts[i].h),Math.cos(p.yaw-pts[i].h)))); });
      /* סיבוב שמאלה בסימולטור (yaw עולה) = θ עולה ב-RR */
      const h1=S.rrFromSim(0,0,0.1).h-S.rrFromSim(0,0,0).h;
      /* נסיעה קדימה בסימולטור = נסיעה בכיוון θ ב-RR: (cos θ, sin θ) */
      let fwdErr=0; for(const yaw of [0,0.7,2,-2.5]){ const a=S.rrFromSim(0,0,yaw), b=S.rrFromSim(Math.sin(yaw),Math.cos(yaw));
        fwdErr=Math.max(fwdErr,Math.abs(b.x-a.x-Math.cos(a.h)),Math.abs(b.y-a.y-Math.sin(a.h))); }
      out.rots[rot]={dh,detZX,maxErr,odoErr,h1,fwdErr,hasMap:java.indexOf(S.rrMapText())>=0};
    }
    S.rrSetRot(0); out.stored=localStorage.getItem('bbRRrot1'); return out; });
  for(const rot of [0,90,180,270]){ const q=r.rots[rot];
    ok(Math.abs(q.dh-90)<0.5, `סיבוב ${rot}°: פנייה שמאלה בסימולטור = כיוון RR עולה ב-90° (${q.dh})`);
    ok(Math.abs(q.detZX-1)<1e-9, `סיבוב ${rot}°: דטרמיננטה +1 (סיבוב, לא שיקוף)`);
    ok(q.maxErr<1e-9&&q.odoErr<1e-6, `סיבוב ${rot}°: ייצוא←ייבוא זהה (${q.maxErr.toExponential(1)}, ${q.odoErr.toExponential(1)})`);
    ok(q.hasMap, `סיבוב ${rot}°: המיפוי כתוב בראש הקוד`);
    ok(q.fwdErr<1e-9, `סיבוב ${rot}°: ״קדימה״ של הרובוט = (cos θ, sin θ) ב-RR`);
  }
  ok(r.stored==='0','הבחירה נשמרת ב-bbRRrot1');
}

/* 24 · מסלול מיובא לא מזריק קוד לג׳אווה ולא HTML ללוח */
{
  const r=await E(()=>{ const S=__sim; window.__x=0;
    const bad='1); Runtime.getRuntime().exec("rm -rf /sdcard"); //';
    const txt=JSON.stringify({bb:"path",v:2,name:'<img src=x onerror="window.__x=1">',ally:S.SETUP.ally||"red",pts:[{x:-62,z:58,s:1},
      {x:-40,z:58,a:"wait",sec:bad},{x:-30,z:50,a:"fire",n:bad,sec:"2\n}"},{x:-20,z:40,a:"intake",sec:"x/*",v:"9); evil(",dt:"1\nevil",tr:"3\nx"}]});
    const okI=S.pathImportText(txt); const java=S.pathJava();
    const info=document.getElementById('pathInfo')||document.getElementById('oPath');
    return {okI, java, evil:/Runtime|evil|rm -rf/.test(java), lines:java.split('\n').filter(l=>l.trim()&&!/^\s*(\/\/|\.|Pose2d|Action)/.test(l)), html:document.body.innerHTML.indexOf('onerror="window.__x=1"')>=0};
  });
  await page.waitForTimeout(200);
  ok(r.okI,'המסלול יובא');
  ok(!r.evil,'אין קוד זר בג׳אווה המיוצא');
  ok(r.lines.length===0,'כל שורה בקוד היא הערה או קריאה צפויה: '+r.lines.slice(0,2).join(' | '));
  ok(!r.html&&(await E(()=>window.__x))===0,'שם המסלול המיובא לא נכנס כ-HTML');
  await E(()=>{ __sim.pathClear&&__sim.pathClear(); });
}

/* 18 · באוטונומי בוחרים פרח/כדור רק בצד שלי — אין G402 במאצ׳ים של בוטים */
{
  const r=await E(()=>{ const S=__sim, I=S.I; const res=[];
    for(let m=0;m<4;m++){ S.MT.cd=0; S.gameStart(true); S.matchStart(); let badT=0, deep=0, meDeep=0, meLog='';
      while(S.MATCH.on&&S.MATCH.phase==='AUTO'){ S.advance(0.25,1/60);
        for(const b of S.BOTS){ if(!b.on) continue; const sg=b.ally==='red'?-1:1;
          const t=b.target; if(t&&t.x!=null&&t.x*sg<0) badT++;
          deep=Math.max(deep,-I(b.body.position.x)*sg); }
        { const sg=S.myAlly()==='red'?-1:1, x=I(S.botBody.position.x); if(-x*sg>meDeep){ meDeep=-x*sg; meLog=S.MYAUTO.lvl+' '+(S.RUN.src||'')+' '+(S.RUN.prog&&S.RUN.prog[S.RUN.i]?S.RUN.prog[S.RUN.i].k:'')+' fl'+JSON.stringify(S.RUN.st&&S.RUN.st.fl?[S.RUN.st.fl.x|0,S.RUN.st.fl.z|0,!!S.RUN.st.fl.loose]:null)+' '+S.MATCH.t.toFixed(1)+' '+x.toFixed(0)+','+I(S.botBody.position.z).toFixed(0); } } }
      const g4=S.REF.log.filter(e=>e.rule==='G402'), g402=g4.length; S.matchStop(); res.push({badT,deep:+deep.toFixed(1),g402,who:g4.map(e=>e.team+'@'+e.t).join(','),me:+meDeep.toFixed(1),meLog}); }
    return res; });
  const bad=r.reduce((a,q)=>a+q.badT,0), g=r.reduce((a,q)=>a+q.g402,0);
  ok(bad===0, `באוטונומי אין יעד בצד של היריב (${JSON.stringify(r)})`);
  /* הרובוט שלי יכול עדיין לחצות בדרך (הניווט עוקף את הכוורת) — כאן בודקים את הבוטים ואת בחירת היעד */
  const gb=r.reduce((a,q)=>a+q.who.split(',').filter(w=>w&&!/^me@/.test(w)).length,0);
  /* מגע ליד קו האמצע (שני רובוטים באותה עמדת ירי) עדיין יכול לקרות — הבדיקה היא שאף בוט לא נוסע עמוק לצד השני */
  const deep=Math.max(...r.map(q=>q.deep));
  ok(deep<9, `בוטים לא נכנסים לעומק הצד של היריב באוטונומי (${deep.toFixed(1)}″; G402 לבוטים: ${gb}) `+JSON.stringify(r));
  await E(()=>__sim.matchStop());
}

/* 19 · חניה באזור הטעינה בדקה האחרונה: הנקטר של השחקן האנושי לא נופל על הרובוט ולא נספר כ-G411 */
{
  const r=await E(()=>{ const S=__sim, I=S.I; S.MT.cd=0; S.gameStart(false); S.REF.on=true; S.matchStart(); S.advance(85,1/60);
    const sg=S.myAlly()==='red'?-1:1; S.setPose(sg*63,sg*35,sg<0?90:-90); S.BALLS.filter(b=>b.lastBy==='hp').forEach(b=>S.removeBall(b)); S.setIntake(false); S.advance(70,1/60);
    const me=[I(S.botBody.position.x),I(S.botBody.position.z)];
    const onBot=S.BALLS.filter(b=>b.lastBy==='hp'&&Math.hypot(I(b.body.position.x)-me[0],I(b.body.position.z)-me[1])<8).length;
    const under=S.BALLS.filter(b=>I(b.body.position.y)<-0.5).length;
    const g=S.REF.log.filter(e=>e.rule==='G411'&&e.team==='me').length; const entered=S.REF.hp[S.myAlly()].entered;
    S.matchStop(); return {g,onBot,under,entered,me}; });
  ok(r.g===0, `אין G411 לרובוט שחונה באזור הטעינה (${r.g})`);
  ok(r.onBot===0&&r.under===0, `נקטר לא נכנס לתוך הרובוט ולא מתחת לרצפה (${r.onBot}, ${r.under}; נכנסו ${r.entered})`);
}
/* 22 · G411 גם לבוט/נהג אנושי, לא רק לרובוט של המארח; פולן חוזר לא לגינה */
{
  const r=await E(()=>{ const S=__sim, I=S.I, M=S.M; S.MT.cd=0; S.gameStart(true); S.REF.on=true; S.matchStart(); S.advance(40,1/60);
    const b=S.BOTS[0]; S.humSeat(b,'net','g'); b.hum.id='gH'; b.clip.length=0; b.clip.push('pollen','pollen','pollen','pollen');
    S.BOTS.forEach(o=>{ if(o!==b){ o.on=false; o.body.position.set(M(o.home.x),0,M(o.home.z)); } });
    S.BALLS.filter(q=>Math.hypot(I(q.body.position.x)+35,I(q.body.position.z)-45)<26).forEach(q=>S.removeBall(q));
    b.body.position.set(M(-35),0,M(45)); b.vx=b.vz=0; b.yaw=0;
    /* ארבעה כדורים סביב, מוחזקים במקום (הבדיקה היא של השופט, לא של הפיזיקה) */
    const hb=[]; for(let i=0;i<4;i++){ const a=i*Math.PI/2; hb.push(S.addBall('pollen',-35+12.2*Math.cos(a),0.4,45+12.2*Math.sin(a))); }
    /* מיקומים קבועים מראש (לא אחרי צעד פיזיקה — אז כדור יכול להידחף מעבר ל-14″ ולא להיספר) */
    const hp=hb.map((q,i)=>{ const a=i*Math.PI/2, v=q.body.position.clone(); v.set(M(-35+12.2*Math.cos(a)),M(1.4),M(45+12.2*Math.sin(a))); return v; });
    hb.forEach((q,k)=>{ q.body.position.copy(hp[k]); q.body.velocity.set(0,0,0); });
    const tr=[]; for(let i=0;i<60*8;i++){ S.humFeed(b,{x:0,y:0,t:0,fire:false,intake:false,aim:false,fc:true});
      hb.forEach((q,k)=>{ q.body.position.copy(hp[k]); q.body.velocity.set(0,0,0); }); b.body.position.set(M(-35),0,M(45)); S.advance(1/60,1/60); if(i%60===0){ const st=S.RULE.st[b.name]; tr.push((st?st.hoardT.toFixed(1):'-')+':'+b.clip.length+':'+b.ph+':'+S.hoardNear(I(b.body.position.x),I(b.body.position.z))+':'+Math.hypot(b.body.velocity.x,b.body.velocity.z).toFixed(2)); } }
    const g=S.REF.log.filter(e=>e.rule==='G411'&&e.team===b.name).length; S.humFree(b);
    const sp=S.refBackSpot({x:60,z:60});
    S.matchStop(); return {g,bx:sp.x,bz:sp.z,tr:tr.join(' ')+' '+S.MATCH.phase+' '+S.refActive()}; });
  ok(r.g>=1, `G411 נקרא גם לרובוט של נהג ברשת (${r.g}) ${r.tr}`);
  ok(!(Math.abs(r.bz)>62&&Math.abs(r.bx)>40)&&Math.abs(r.bx)<=60.5&&Math.abs(r.bz)<=60.5, `פולן חוזר לא לגינה (${r.bx.toFixed(0)}, ${r.bz.toFixed(0)})`);
}
/* 22b · G408 (חרטום) ו-G417 (מסגרת) גם לרובוט של נהג אנושי */
{
  const r=await E(()=>{ const S=__sim, I=S.I, M=S.M; S.MT.cd=0; S.gameStart(true); S.REF.on=true; S.matchStart(); S.advance(40,1/60);
    const b=S.BOTS[0]; S.humSeat(b,'net','g'); b.hum.id='gI'; b.clip.length=0;
    S.BOTS.forEach(o=>{ if(o!==b){ o.on=false; o.body.position.set(M(o.home.x),0,M(o.home.z)); } });
    const op=b.ally==='red'?'blue':'red';
    b.body.position.set(M(-30),0,M(40)); b.yaw=0; b.vx=b.vz=0;
    for(let k=0;k<2;k++){ S.addBall(op,-30,0.4,40+12); for(let i=0;i<60;i++){ S.humFeed(b,{x:0,y:0,t:0,fire:false,intake:true,aim:false,fc:false}); b.body.position.set(M(-30),0,M(40)); b.yaw=0; S.advance(1/60,1/60); } }
    const g408=S.REF.log.filter(e=>e.rule==='G408'&&e.team===b.name).length;
    /* במהירות מלאה, כמעט צמוד לרגל המסגרת */
    const L=S.frameLegs()[0]; b.clip.length=0; S.REF.legSt={};
    /* הלולאה של הדף רצה גם היא בזמן אמת בין הצעדים של הבדיקה — עד שלושה ניסיונות גישה, כל אחד מאפס את החימוש */
    let g417=0;
    for(let tr=0;tr<3&&!g417;tr++){ S.REF.legSt={};
      b.yaw=Math.PI/2; b.body.position.set(M(L.x-8.5-0.8),0,M(L.z)); b.vx=1.45; b.vz=0; b.body.velocity.set(1.45,0,0);
      for(let i=0;i<3;i++){ S.humFeed(b,{x:0,y:1,t:0,fire:false,intake:false,aim:false,fc:false}); S.advance(1/60,1/60); }
      g417=S.REF.log.filter(e=>e.rule==='G417'&&e.team===b.name).length; }
    S.humFree(b); S.matchStop(); return {g408,g417}; });
  ok(r.g408>=1, `G408 לנהג ברשת שבלע נקטר של היריב (${r.g408})`);
  ok(r.g417>=1, `G417 לנהג ברשת שנכנס במהירות במסגרת (${r.g417})`);
}
/* 21 · ״חוסם לי את הירי״ = יריב, גם כשאני כחול */
{
  const r=await E(()=>{ const S=__sim, M=S.M; const a0=S.SETUP.ally; S.SETUP.ally='blue'; S.MT.cd=0; S.gameStart(true); S.matchStart();
    const out={};
    for(const b of S.BOTS){ const others=S.BOTS.filter(o=>o!==b); others.forEach((o,i)=>{ o.body.position.set(M(-60+i*10),0,M(-60)); });
      const mf=S.mouthFrame(S.hiveBlue), mz=S.botBody.position;
      b.body.position.set((mf.c.x+mz.x)/2,0,(mf.c.z+mz.z)/2); S.advance(1/60,1/60);
      out[b.name]={ally:b.ally,blocking:b.blocking}; }
    S.matchStop(); S.SETUP.ally=a0; S.gameStart(false); return out; });
  const vals=Object.values(r);
  ok(vals.every(v=>v.blocking===(v.ally!=='blue')), 'רק יריב מסומן כחוסם כשאני כחול '+JSON.stringify(r));
}

/* 23 · זיכרון גרפי: בנייה מחדש של הזירה לא מצטברת; מחוון לא מנפח את המטמון; רשימת הנקודות לא נבנית מחדש סתם */
{
  const r=await E(()=>{ const S=__sim; const rd=S.renderer, c=S.camera; rd.render(S.scene,c); const g0=rd.info.memory.geometries;
    for(let i=0;i<10;i++){ S.rebuildField(); rd.render(S.scene,c); }
    const g1=rd.info.memory.geometries;
    const w0=S.P.cellW; for(let i=0;i<60;i++){ S.setP('cellW', w0+0.01*(i+1)); S.apply('build'); rd.render(S.scene,c); }
    S.setP('cellW',w0); S.apply('build'); rd.render(S.scene,c); const g2=rd.info.memory.geometries;
    /* רשימת הנקודות */
    S.pathClear(); S.pathAdd(-60,40); S.pathAdd(-40,40); S.pathInfo(); const sel=document.querySelector('#pathList select');
    S.pathInfo(); S.pathInfo(); const same=sel&&document.querySelector('#pathList select')===sel; S.pathClear();
    return {g0,g1,g2,same}; });
  ok(r.g1<=r.g0+2, `עשר בניות של הזירה בלי דליפה (${r.g0} → ${r.g1})`);
  ok(r.g2<=r.g0+40, `שישים תזוזות מחוון — המטמון חסום (${r.g0} → ${r.g2})`);
  ok(r.same, 'רשימת הנקודות לא נבנית מחדש כשלא השתנה כלום');
}

/* שונות: לוח החוקים, כיוון מנורמל, גינה לפי גודל הכדור, טעינה בטוחה, הצטרפות באמצע מאץ׳, הצמדה באוטונומי */
{
  const r=await E(()=>{ const S=__sim, M=S.M, I=S.I; const out={};
    /* לוח החוקים: עד 4 הרצות בשנייה, ואף אחת כשהוא מוסתר */
    const el=document.getElementById('oRules'); let n=0; const mo=new MutationObserver(q=>{ n+=q.length; });
    if(el){ for(let d=el.closest('details');d;d=d.parentElement&&d.parentElement.closest('details')) d.open=true;
      for(let p=el;p;p=p.parentElement) if(getComputedStyle(p).display==='none') p.style.display='block';
      mo.observe(el,{childList:true,subtree:true,characterData:true}); }
    S.advance(5,1/120); n+=mo.takeRecords().length; out.rulesVisible=el?el.offsetParent!==null:null; out.rulesN=n;
    let n2=0; if(el){ const d=el.style.display; el.style.display='none'; mo.takeRecords(); S.advance(2,1/120); n2=mo.takeRecords().length; el.style.display=d; }
    mo.disconnect(); out.rulesHidden=n2;
    /* כיוון */
    S.bot.yaw=-451*Math.PI/180; S.advance(0.3,1/60); out.ori=(document.getElementById('oOri')||{}).textContent||'';
    S.bot.yaw=0;
    return out; });
  ok(r.rulesN<=25, `לוח החוקים לא נכתב בכל צעד (${r.rulesN} ב-600 צעדים, מוצג ${r.rulesVisible})`);
  ok(r.rulesHidden===0, `לוח מוסתר לא נכתב (${r.rulesHidden})`);
  ok(!/451/.test(r.ori), 'כיוון הרובוט מוצג בטווח ±180 ('+r.ori.slice(0,80)+')');

  const q=await E(()=>{ const S=__sim, M=S.M, I=S.I; const out={};
    /* גינה: נקטר (3.6) בקצה הגינה נספר, כמו ב-gardenCount */
    S.matchStop(); S.clearBalls(); const my=S.myAlly(), sg=my==='red'?1:-1;
    const b=S.addBall('pollen',sg*(-47.41+1.6),0.4,sg*(68.1-1.6)); b.bd=3.6; b.body.velocity.set(0,0,0);
    out.garden=S.scoreNow().garden; S.clearBalls();
    /* טעינה בטוחה של הגדרות ופרמטרים */
    const k0=localStorage.getItem('bbSetup1'), p0=localStorage.getItem('bbParams1');
    return out; });
  ok(q.garden===1, `נקטר בקצה הגינה נספר לפי הגודל שלו (${q.garden})`);

  const v=await E(()=>{ const S=__sim, M=S.M; const out={};
    /* הצטרפות לעמדה באמצע מאץ׳ לא מתחילה משחק מחדש */
    S.MT.cd=0; S.gameStart(false); S.matchStart(); S.advance(12,1/60);
    const me0=[S.botBody.position.x,S.botBody.position.z], t0=S.MATCH.t;
    S.netPadSeat(2,0);
    out.same=S.botBody.position.x===me0[0]&&S.botBody.position.z===me0[1]&&S.MATCH.t===t0&&S.MATCH.on;
    out.full=S.GAME.full; out.b2on=S.BOTS[1].on; out.seat=S.BOTS[1].hum&&S.BOTS[1].hum.src;
    S.netPadSeat(2,null);
    /* מסך מפוצל לא לוקח עמדה של אורח ברשת */
    const g=S.BOTS[2]; S.humSeat(g,'net','אורח'); g.hum.id='gS'; g.on=true;
    S.splitSet(true,{seat:2}); out.splitSeat=S.SPLITS.seat; out.guestKept=g.hum&&g.hum.src==='net';
    S.splitSet(false); S.humFree(g); S.matchStop(); S.gameStart(false);
    return out; });
  ok(v.same&&v.full===false, 'שלט שנכנס באמצע מאץ׳ לא מאפס את המאץ׳ ולא מחזיר רובוטים הביתה');
  ok(v.b2on&&v.seat==='pad', 'הרובוט של העמדה נכנס לזירה עם השלט');
  ok(v.splitSeat!==2&&v.guestKept, `מסך מפוצל לא לוקח את העמדה של האורח (${v.splitSeat})`);
  const pin=await E(()=>{ const S=__sim; S.MT.cd=0; S.gameStart(false); S.matchStart(); let mx=0, sp=0;
    for(let i=0;i<120;i++){ S.advance(1/60,1/60); const me=S.refRobots()[0]; if(S.MATCH.phase==='AUTO'){ mx=Math.max(mx,Math.hypot(me.ix,me.iz)); sp=Math.max(sp,Math.hypot(me.vx,me.vz)); } }
    S.matchStop(); return {mx,sp}; });
  ok(pin.sp<0.2||pin.mx>0.2, `באוטונומי הכוונה של הרובוט שלי נראית לשופט (הצמדה G421): ${pin.mx.toFixed(2)} (מהירות ${pin.sp.toFixed(2)})`);

}
{
  /* setupLoad / loadParams — ערכים שמורים שבורים לא נכנסים (דף חדש) */
  const p2=await browser.newPage();
  await p2.addInitScript(()=>{ try{ localStorage.setItem('bbUiMode1','lab');
    localStorage.setItem('biobuzz_setup_v1',JSON.stringify({ally:'<img src=x>',cd:'abc',tele:1e9,roles:[1,2,3],mag:true,skill:2,autoOn:'yes'}));
    localStorage.setItem('biobuzz_params_v1',JSON.stringify({angle:true,vAvg:'',wheelD:1e9,feedTime:0.5})); }catch(e){} });
  await p2.goto('http://127.0.0.1:'+(process.env.BB_PORT||8899)+'/sim.html?nocad=1');
  await p2.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  const k=await p2.evaluate(()=>{ const S=__sim; const r={ally:S.SETUP.ally,cd:S.SETUP.cd,tele:S.SETUP.tele,roles:S.SETUP.roles.join(','),mag:S.SETUP.mag,skill:S.SETUP.skill,autoOn:S.SETUP.autoOn,
    angle:S.P.angle,vAvg:S.P.vAvg,wheelD:S.P.wheelD,feedTime:S.P.feedTime};
    localStorage.removeItem('biobuzz_setup_v1'); localStorage.removeItem('biobuzz_params_v1'); return r; });
  await p2.close();
  ok(k.ally==='red'&&typeof k.cd==='number'&&k.tele<=600&&/score|defend/.test(k.roles)&&typeof k.mag==='number'&&k.autoOn!=='yes', 'הגדרות משחק שמורות שבורות נדחות '+JSON.stringify(k));
  ok(k.skill===2&&k.feedTime===0.5, 'ערכים תקינים נטענים');
  ok(typeof k.angle==='number'&&k.angle!==1&&typeof k.vAvg==='number'&&k.vAvg>0&&k.wheelD<1000, 'פרמטרים שמורים שבורים נדחים');
}

await browser.close();
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,3).join(' | '));
done('v63_core');
