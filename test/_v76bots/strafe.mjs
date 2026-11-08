// v76: ירי בסטרייף עם סיוע כיוון — לפי הרובוט מול לפי המגרש (מבוסס על reviews/game/feel.mjs)
import {open,realErrs} from '../h.mjs';
const {browser,page,errs}=await open({noraf:true,url:'http://127.0.0.1:'+(process.env.BB_PORT||8921)+'/'+(process.env.SIMFILE||'sim.html')+'?nocad=1'});
const r=await page.evaluate(()=>{ const S=__sim, out={}; const dt=1/120;
  S.setRealm('comp'); S.gameStart(false); S.stageMatch(); S.clearBalls(); for(const b of S.BOTS) b.on=false;
  const shoot=(key,assist,fc)=>{ let h=0; S.aimAssist=assist; S.fieldCentric=fc;
    for(let k=0;k<6;k++){ S.clearBalls(); S.shotPose(); const yaw=S.bot.yaw, fx=Math.sin(yaw), fz=Math.cos(yaw);
      const dir={KeyA:[fz,-fx],KeyD:[-fz,fx],KeyW:[-fx,-fz],KeyS:[fx,fz]}[key]; S.botBody.position.x+=dir[0]*0.6; S.botBody.position.z+=dir[1]*0.6;
      S.advance(0.3,dt); S.key(key,true); S.advance(0.5,dt); S.bot.clip=['pollen','pollen','pollen','pollen']; S.refreshAim(); const rec=S.fire(); S.key(key,false);
      S.advance(1.6,dt); if(rec&&rec.logEntry&&rec.logEntry.hit) h++; }
    S.aimAssist=false; S.fieldCentric=false; S.clearBalls(); return h; };
  for(const k of ['KeyA','KeyD']){ out[k+'_assistFC']=shoot(k,true,true); out[k+'_assistRC']=shoot(k,true,false); }
  return out; });
console.log(JSON.stringify(r)); console.log('errs',realErrs(errs).slice(0,3)); await browser.close();
