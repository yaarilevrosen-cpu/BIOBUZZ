// עוזר פתיחה: דפדפן + דף הסימולטור בלי CAD
import { chromium } from 'playwright';
export const URL0='http://127.0.0.1:'+(process.env.BB_PORT||8899)+'/sim.html?nocad=1';
/* ״Failed to load resource״ לא אומר איזה משאב — מוסיפים את הכתובת כדי שהסינון יהיה מדויק */
export const errText=m=>{ const t=m.text(), u=m.location()&&m.location().url; return /^Failed to load resource/.test(t)&&u?t+' @ '+u:t; };
export async function open(opts={}){
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:opts.viewport||{width:1400,height:860}});
  if(opts.noraf) await page.addInitScript(()=>{ window.__raf0=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=()=>0; });
  /* הבדיקות רצות במצב ״בדיקות״ (כל הלוחות), אלא אם ביקשו ״משחק״ */
  if(!opts.play) await page.addInitScript(()=>{ try{ if(!localStorage.getItem('bbUiMode1')) localStorage.setItem('bbUiMode1','lab'); }catch(e){} });
  /* v63: אשף ההגדרה האישית לא נפתח בבדיקות, אלא אם ביקשו opts.wizard (אז גם ?wiz=1 — פתיחה לבד גם תחת webdriver) */
  if(!opts.wizard) await page.addInitScript(()=>{ try{ if(!localStorage.getItem('bbWizard1')) localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); }catch(e){} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e))); page.on('console',m=>{ if(m.type()==='error') errs.push(errText(m)); });
  await page.goto((opts.url||URL0)+(opts.q||'')+(opts.wizard?'&wiz=1':''),{timeout:90000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
  return {browser,page,errs};
}
let pass=0,fail=0; const fails=[];
export function ok(c,msg){ if(c){pass++;} else {fail++; fails.push(msg);} console.log((c?'  ✓ ':'  ✗ ')+msg); }
export function done(name){ console.log(`${name}: ${pass} עברו, ${fail} נכשלו`); if(fail){ console.log(fails.join('\n')); process.exit(1);} }
/* רעש צפוי בלבד: ניסיון חיבור לגשר/לרובוט שלא רץ (ws או http אל localhost או 127.0.0.1 — ״החיבור נדחה״), וסמל האתר.
   כל שגיאה אחרת — כולל TypeError בקוד הרשת — נספרת. */
export const NOISE=[/^WebSocket connection to 'ws:\/\/(localhost|127\.0\.0\.1):\d+\/[^']*' failed: (Error in connection establishment: net::ERR_CONNECTION_REFUSED|Connection closed before receiving a handshake response|Error during WebSocket handshake: Unexpected response code: \d+)?\s*$/,
  /^Failed to load resource: net::ERR_CONNECTION_REFUSED @ https?:\/\/(localhost|127\.0\.0\.1):\d+\//,
  /^Failed to load resource: .*favicon/, /favicon\.ico/];
export const realErrs=errs=>errs.filter(e=>!NOISE.some(re=>re.test(e)));
