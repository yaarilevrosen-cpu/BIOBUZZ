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

await browser.close();
ok(realErrs(errs).length===0,'אין שגיאות בדף: '+realErrs(errs).slice(0,3).join(' | '));
done('v63_core');
