// moving shots with aim assist: drive through the shot pose for 0.6 s with assist on, then fire while still moving
import {open} from '../h.mjs';
const assist=process.argv[2]!=='0';
let {browser,page}=await open({noraf:true});
const r=await page.evaluate((assist)=>{ const S=__sim; S.setRealm('comp'); S.gameStart(false); S.stageMatch(); S.clearBalls(); const out={};
  S.aimAssist=assist; S.fieldCentric=true;
  for(const key of [null,'KeyA','KeyD','KeyW','KeyS']){ let h=0,n=0,sp=0;
   for(let t=0;t<6;t++){
    S.shotPose(); const yaw=S.bot.yaw; const fx=Math.sin(yaw), fz=Math.cos(yaw), rx=-fz, rz=fx;
    let dx=0,dz=0; if(key==='KeyW'){dx=-fx;dz=-fz} if(key==='KeyS'){dx=fx;dz=fz} if(key==='KeyD'){dx=-rx;dz=-rz} if(key==='KeyA'){dx=rx;dz=rz}
    S.botBody.position.x+=dx*0.9; S.botBody.position.z+=dz*0.9; S.advance(0.3,1/120);
    if(key){ S.key(key,true); S.advance(0.55,1/120); } else S.advance(0.55,1/120);
    sp=Math.hypot(S.botBody.velocity.x,S.botBody.velocity.z);
    S.bot.clip=['pollen','pollen','pollen','pollen']; S.refreshAim(); const rec=S.fire(); if(key) S.key(key,false);
    S.advance(1.6,1/120); n++; if(rec&&rec.logEntry.hit) h++; S.clearBalls(); }
   out[key||'still']={hits:h+'/'+n,robotSpeed:+sp.toFixed(2)}; }
  S.aimAssist=false; S.fieldCentric=false; return out; },assist);
console.log((assist?'assist ':'no-assist ')+JSON.stringify(r)); await browser.close();
