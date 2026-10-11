import {open,realErrs} from '../h.mjs';
const {browser,page,errs}=await open({noraf:true});
const r=await page.evaluate(()=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally='red'; S.MT.cd=0; S.GAME.skill=1;
  S.gameStart(true); S.matchStart();
  const [B1,B2,RP]=S.BOTS; B2.on=false; RP.on=false; S.setAIRole(B1,'defend'); S.GAME.swap=false;
  S.setMatchT(40); S.advance(0.05,1/60);
  S.setPose(-30,-40,0); S.setClip(['pollen','pollen']);
  B1.body.position.set(S.M(30),0,S.M(40)); B1.yaw=0; B1.vx=B1.vz=0; B1.foe=null;
  S.advance(4,1/60);
  const mf=S.mouthFrame(S.hiveRed);
  const out={pos:[S.I(B1.body.position.x),S.I(B1.body.position.z)],goal:[B1.navGx,B1.navGz],path:B1.nav.path,mouth:[S.I(mf.c.x),S.I(mf.c.z)],navLen:B1.navLen,stall:B1.stallT,
    blockedAtPos:S.navBlocked(S.I(B1.body.position.x),S.I(B1.body.position.z),S.navClrBot()), goalBlocked:S.navBlocked(B1.navGx,B1.navGz,S.navClrBot())};
  // map print around
  const rows=[]; for(let z=-40;z<=20;z+=3){ let s=''; for(let x=-50;x<=10;x+=3) s+= (Math.abs(x-out.pos[0])<1.6&&Math.abs(z-out.pos[1])<1.6)?'B':(Math.abs(x-out.goal[0])<1.6&&Math.abs(z-out.goal[1])<1.6)?'G':S.navBlocked(x,z,S.navClrBot())?'#':'.'; rows.push(z.toString().padStart(4)+' '+s); }
  out.map=rows; return out; });
console.log(JSON.stringify({...r,map:undefined})); console.log(r.map.join('\n')); await browser.close();
