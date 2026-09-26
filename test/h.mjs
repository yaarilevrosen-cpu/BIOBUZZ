// עוזר פתיחה: דפדפן + דף הסימולטור בלי CAD
import { chromium } from 'playwright';
export const URL0='http://127.0.0.1:8899/sim.html?nocad=1';
export async function open(opts={}){
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:opts.viewport||{width:1400,height:860}});
  if(opts.noraf) await page.addInitScript(()=>{ window.requestAnimationFrame=()=>0; });
  /* הבדיקות רצות במצב ״בדיקות״ (כל הלוחות), אלא אם ביקשו ״משחק״ */
  if(!opts.play) await page.addInitScript(()=>{ try{ if(!localStorage.getItem('bbUiMode1')) localStorage.setItem('bbUiMode1','lab'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e))); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await page.goto((opts.url||URL0)+(opts.q||''));
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  return {browser,page,errs};
}
let pass=0,fail=0; const fails=[];
export function ok(c,msg){ if(c){pass++;} else {fail++; fails.push(msg);} console.log((c?'  ✓ ':'  ✗ ')+msg); }
export function done(name){ console.log(`${name}: ${pass} עברו, ${fail} נכשלו`); if(fail){ console.log(fails.join('\n')); process.exit(1);} }
export const realErrs=errs=>errs.filter(e=>!/WebSocket|favicon|ERR_|Failed to load/.test(e));
