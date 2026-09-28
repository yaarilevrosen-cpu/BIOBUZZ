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
    const t0=S.MATCH.t, s0=S.simT, bp=S.BOTS.map(b=>b.body.position.x+','+b.body.position.z).join('|');
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

await browser.close();
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,3).join(' | '));
done('v63_core');
