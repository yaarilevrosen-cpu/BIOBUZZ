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
  ok(Math.abs(a-b)<1.5, `נפילה בצעדים של 0.05 זהה ל-1/120 (${a.toFixed(2)} מול ${b.toFixed(2)})`);
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

await browser.close();
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,3).join(' | '));
done('v63_core');
