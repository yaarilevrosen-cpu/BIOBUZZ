import {open} from './h.mjs';
const {browser,page}=await open({noraf:true}); await page.setViewportSize({width:1400,height:860});
await page.evaluate(()=>{ window.__raf0&&(window.requestAnimationFrame=window.__raf0); const S=__sim; S.brdOpen(); });
await page.waitForTimeout(800); await page.screenshot({path:'/tmp/claude-0/board.png'});
await page.evaluate(()=>{ __sim.brdClose(); });
const el=await page.evaluate(()=>{ const S=__sim; try{ S.statUI(); }catch(e){} const a=document.getElementById('achBox'); if(!a) return false;
  const w=document.createElement('div'); w.id='shotA'; w.style.cssText='position:fixed;left:10px;top:10px;width:720px;z-index:99999;background:#10151b;padding:10px'; w.innerHTML=a.innerHTML; document.body.appendChild(w); return true; });
if(el) await (await page.$('#shotA')).screenshot({path:'/tmp/claude-0/ach.png'});
await browser.close();
