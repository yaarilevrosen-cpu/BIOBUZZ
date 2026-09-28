import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open();
await page.waitForTimeout(1500);
const st=await page.evaluate(()=>__sim.state());
ok(st.balls>0,'הזירה עלתה עם כדורים ('+st.balls+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await page.screenshot({path:'smoke.png'});
await browser.close(); done('smoke');
