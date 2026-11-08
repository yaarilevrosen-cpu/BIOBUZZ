// v76: למה בוטי טנק ״תקועים״ — פירוק זמן התקיעה לפי שלב, מגע ושגיאת כיוון
import {chromium} from 'playwright';
const N=+process.argv[2]||2, seed0=+process.argv[3]||11, PORT=process.env.BB_PORT||8921, bid=process.env.BID||'starter';
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const tot={};
for(let m=0;m<N;m++){
const page=await browser.newPage({viewport:{width:1200,height:800}});
await page.addInitScript((seed)=>{ window.requestAnimationFrame=()=>0; let s=seed>>>0||1; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
  localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); },seed0*1000+m);
await page.goto(`http://127.0.0.1:${PORT}/${process.env.SIMFILE||"sim.html"}?nocad=1`,{timeout:90000});
await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
const r=await page.evaluate(([ally,bid,NOTANK])=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally=ally; S.MT.cd=0; S.GAME.skill=2;
  if(NOTANK) S.v76b.V76B.noTank=true; S.gameStart(true); for(let i=0;i<3;i++) S.bldSet(i,bid,true); S.matchStart();
  const o={}, st=1/60, prev={}; for(const b of S.BOTS) prev[b.name]=[b.body.position.x,b.body.position.z];
  let k=0; while(S.MATCH.phase!=='סיום'&&k<20000){ S.advance(st,st); k++;
    for(const b of S.BOTS){ const p=prev[b.name], d=Math.hypot(b.body.position.x-p[0],b.body.position.z-p[1])/st; prev[b.name]=[b.body.position.x,b.body.position.z];
      const iv=Math.hypot(b.ivx||0,b.ivz||0); if(!(S.MATCH.on&&S.MATCH.phase!=='מעבר'&&iv>0.3&&d<0.05)) continue;
      const hd=Math.atan2(b.ivx,b.ivz), e=Math.abs(Math.atan2(Math.sin(hd-b.yaw),Math.cos(hd-b.yaw))), e2=Math.min(e,Math.PI-e);
      let c=0; for(const q of S.world.contacts){ const ob=q.bi===b.body?q.bj:(q.bj===b.body?q.bi:null); if(ob&&!S.balls.some(x=>x.body===ob)) c=1; }
      const key=(['lane','screen','shadow','guard','backoff'].includes(b.ph)?'def':b.ph)+'|'+(c?'contact':'free')+'|'+(e2>1.0?'turn':'aligned');
      o[key]=(o[key]||0)+st; } }
  return o; },[m%2?'blue':'red',bid,!!process.env.NOTANK]);
for(const [k,v] of Object.entries(r)) tot[k]=(tot[k]||0)+v;
await page.close(); }
await browser.close();
console.log(Object.entries(tot).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+(v/N).toFixed(1)).join('\n'));
