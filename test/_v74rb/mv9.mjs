import {open} from '../h.mjs';
let {browser,page}=await open({noraf:true});
const r=await page.evaluate(()=>{ const S=__sim, X=S.v74rb; S.setRealm('comp'); S.gameStart(false); S.aimAssist=true; S.fieldCentric=true; S.stageMatch(); S.clearBalls(); const out=[];
  S.shotPose(); const p0={x:S.botBody.position.x,z:S.botBody.position.z}; const yaw=S.bot.yaw; const fx=Math.sin(yaw), fz=Math.cos(yaw), rx=-fz, rz=fx;
  S.botBody.position.x+=-rx*0.6; S.botBody.position.z+=-rz*0.6; S.advance(0.3,1/120);
  S.key('KeyD',true);
  for(let i=0;i<60;i++){ S.advance(1/120,1/120); if(i%6==0){ const p=X.muzzleWorld(); const f=X.mouthFrame(X.aimHive()); const lp=X.myLeadPt(f,p);
    const want=Math.atan2(S.M(lp.x)-p.x,S.M(lp.z)-p.z), e=Math.atan2(Math.sin(want-S.bot.yaw),Math.cos(want-S.bot.yaw));
    out.push({i,e:+(e*57.3).toFixed(2),yr:+S.bot.yawRate.toFixed(2),v:[S.botBody.velocity.x,S.botBody.velocity.z].map(v=>+v.toFixed(2)),vAvg:+S.P.vAvg.toFixed(2)}); } }
  S.key('KeyD',false); S.aimAssist=false; S.fieldCentric=false; return out; });
for(const x of r) console.log(JSON.stringify(x)); await browser.close();
