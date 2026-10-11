import {open} from '../h.mjs';
let {browser,page}=await open({noraf:true});
const A=process.argv.includes('A'); const r=await page.evaluate((A)=>{ const S=__sim; S.setRealm('comp'); S.gameStart(false); S.aimAssist=A;  S.stageMatch(); S.clearBalls(); const out={};
  for(const key of [null,'KeyA','KeyD','KeyW','KeyS']){ let h=0, n=0, sp=0, off=[];
   for(let t=0;t<6;t++){
    S.shotPose(); const p0={x:S.botBody.position.x,z:S.botBody.position.z}; const yaw=S.bot.yaw;
    const fx=Math.sin(yaw), fz=Math.cos(yaw), rx=-fz, rz=fx;
    let dx=0,dz=0; if(key==='KeyW'){dx=-fx;dz=-fz} if(key==='KeyS'){dx=fx;dz=fz} if(key==='KeyD'){dx=-rx;dz=-rz} if(key==='KeyA'){dx=rx;dz=rz}
    S.botBody.position.x+=dx*0.6; S.botBody.position.z+=dz*0.6; S.advance(0.3,1/120);
    if(key){ S.key(key,true); let best=9; for(let i=0;i<300;i++){ S.advance(1/120,1/120); const dd=Math.hypot(S.botBody.position.x-p0.x,S.botBody.position.z-p0.z); if(dd>best+1e-4) break; best=dd; } }
    sp=Math.hypot(S.botBody.velocity.x,S.botBody.velocity.z);
    off.push(+Math.hypot(S.botBody.position.x-p0.x,S.botBody.position.z-p0.z).toFixed(3));
    S.bot.clip=['pollen','pollen','pollen','pollen']; S.refreshAim(); const rec=S.fire(); if(key) S.key(key,false);
    S.advance(1.6,1/120); n++; if(rec&&rec.logEntry.hit) h++; S.clearBalls(); }
   out[key||'still']={hits:h+'/'+n, robotSpeed:+sp.toFixed(2), off_m:Math.max(...off)}; }
  S.aimAssist=false; return out; },A);
console.log(JSON.stringify(r)); await browser.close();
