import {open,ok,done} from './h.mjs';
const {browser,page,errs}=await open();
await page.waitForTimeout(1500);
const st=await page.evaluate(()=>__sim.state());
ok(st.balls>0,'הזירה עלתה עם כדורים ('+st.balls+')');
ok(errs.filter(e=>!/favicon|ERR_|Failed to load/.test(e)).length===0,'אין שגיאות: '+errs.slice(0,3).join(' | '));
await page.screenshot({path:'smoke.png'});
await browser.close(); done('smoke');
