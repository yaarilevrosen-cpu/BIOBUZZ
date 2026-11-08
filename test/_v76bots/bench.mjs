// סקירת משחק: N מאצ׳ים מלאים, זרע קבוע, מדדים מורחבים לחניה עם כדורים, תקיעה, עבירות
// usage: BB_PORT=8912 node bench.mjs N seed0 [mode]   mode: idle (אני עומד) | auto (אני מריץ אוטונומי בלבד)
import {chromium} from 'playwright';
const N=+process.argv[2]||4, seed0=+process.argv[3]||7;
const PORT=process.env.BB_PORT||8921;
const builds=['classic','starter','double','lift','turret','starterMec'];
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errs=[]; const agg=[];
for(let m=0;m<N;m++){
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  page.on('pageerror',e=>errs.push(String(e)));
  await page.addInitScript((seed)=>{ window.requestAnimationFrame=()=>0; let s=seed>>>0||1; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
    localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); },seed0*1000+m);
  await page.goto(`http://127.0.0.1:${PORT}/${process.env.SIMFILE||"sim.html"}?nocad=1`,{timeout:90000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
  const ally=m%2?'blue':'red', bid=builds[Math.floor(m/2)%builds.length];
  const t0=Date.now();
  const r=await page.evaluate(([ally,bid])=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally=ally; S.MT.cd=0; S.GAME.skill=2; S.REF.carry={}; S.REF.cards={};
    S.gameStart(true); for(let i=0;i<3;i++) S.bldSet(i,bid,true); S.matchStart();
    const I=S.I||(v=>v/0.0254);
    const st={}; for(const b of S.BOTS) st[b.name]={stuck:0,stuckRun:0,stuckMaxRun:0,px:b.body.position.x,pz:b.body.position.z,park:null,arrive:null,idle:0,ph:{},phPrev:null,shotsLate:0};
    let k=0; const step=1/60; const tEnd=S.tEnd();
    while(S.MATCH.phase!=='סיום'&&k<20000){ const prev={}; for(const b of S.BOTS) prev[b.name]=b.ph;
      S.advance(step,step); k++;
      for(const b of S.BOTS){ const s=st[b.name]; const d=Math.hypot(b.body.position.x-s.px,b.body.position.z-s.pz)/step; s.px=b.body.position.x; s.pz=b.body.position.z;
        const iv=Math.hypot(b.ivx||0,b.ivz||0);
        if(S.MATCH.on&&S.MATCH.phase!=='מעבר'&&iv>0.3&&d<0.05){ s.stuck+=step; s.stuckRun+=step; s.stuckMaxRun=Math.max(s.stuckMaxRun,s.stuckRun); } else s.stuckRun=0;
        if(S.MATCH.on&&S.MATCH.phase!=='מעבר'&&S.MATCH.phase!=='AUTO'&&d<0.03&&!b.parkGo) s.idle+=step;
        s.ph[b.ph]=(s.ph[b.ph]||0)+step;
        if(!s.park&&b.parkGo&&S.MATCH.phase!=='AUTO'){
          let dSpot=null; if(b.spot) dSpot=Math.hypot(b.spot.x-I(b.body.position.x),b.spot.z-I(b.body.position.z));
          s.park={clip:b.clip.length,phPrev:prev[b.name],tLeft:+(tEnd-S.MATCH.t).toFixed(1),trav:+(b.parkTrav||0).toFixed(1),dSpot:dSpot==null?null:+dSpot.toFixed(0),role:b.role}; }
        if(s.park&&s.arrive==null&&S.botInLZ(b)) s.arrive=+(tEnd-S.MATCH.t).toFixed(1);
      } }
    const lg=S.REF.log;
    const fouls={}; for(const e of lg){ const key=(e.team==='me'?'me':'bot')+':'+e.rule; fouls[key]=(fouls[key]||0)+1; }
    const out={ally,bid,final:S.MATCH.final,fouls,bots:[],secs:+(k*step).toFixed(0),
      ballsInClipsEnd:S.BOTS.reduce((a,b)=>a+b.clip.length,0)};
    for(const b of S.BOTS){ const s=st[b.name]; out.bots.push({n:b.name,ally:b.ally,partner:b.ally===ally,role:b.role,sh:b.shots,hit:b.hits,lz:S.botInLZ(b),
      stuck:+s.stuck.toFixed(1),stuckRun:+s.stuckMaxRun.toFixed(1),idle:+s.idle.toFixed(1),park:s.park,arriveLeft:s.arrive,clipEnd:b.clip.length,finishN:b.finishN||0,lvN:b.lvN||0,lvSkip:b.lvSkip||0,
      ph:Object.fromEntries(Object.entries(s.ph).map(([a,v])=>[a,+v.toFixed(0)]))}); }
    return out; },[ally,bid]);
  r.wall=((Date.now()-t0)/1000).toFixed(0);
  agg.push(r); console.log(JSON.stringify(r));
  await page.close();
}
await browser.close();
const bots=agg.flatMap(m=>m.bots);
const mean=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2):0;
const pk=bots.filter(b=>b.park);
const sum={matches:agg.length, bots:bots.length,
  stuckMean:mean(bots.map(b=>b.stuck)), stuckOver20:bots.filter(b=>b.stuck>20).length, stuckRunMax:Math.max(...bots.map(b=>b.stuckRun)), stuckRunOver5:bots.filter(b=>b.stuckRun>5).length,
  idleMean:mean(bots.map(b=>b.idle)),
  park:bots.filter(b=>b.lz).length+'/'+bots.length,
  parkedWithBalls:pk.filter(b=>b.park.clip>0).length+'/'+pk.length,
  ballsLostAtPark:pk.reduce((a,b)=>a+b.park.clip,0), clipEndTotal:bots.reduce((a,b)=>a+b.clipEnd,0),
  pwbPhase:pk.filter(b=>b.park.clip>0).reduce((o,b)=>(o[b.park.phPrev]=(o[b.park.phPrev]||0)+1,o),{}),
  pwbDSpot:pk.filter(b=>b.park.clip>0).map(b=>b.park.dSpot),
  parkLeftMean:mean(pk.map(b=>b.park.tLeft)), arriveLeftMean:mean(pk.filter(b=>b.arriveLeft!=null).map(b=>b.arriveLeft)),
  partnerAllyScore:mean(agg.map(m=>m.final[m.ally])), oppAllyScore:mean(agg.map(m=>m.final[m.ally==='red'?'blue':'red'])),
  accuracy:+(bots.reduce((a,b)=>a+b.hit,0)/Math.max(1,bots.reduce((a,b)=>a+b.sh,0))).toFixed(3), shotsPerBot:mean(bots.map(b=>b.sh)),
  defShots:mean(bots.filter(b=>b.role==='defend').map(b=>b.sh)),
  fouls:agg.reduce((o,m)=>{ for(const [k,v] of Object.entries(m.fouls)) o[k]=(o[k]||0)+v; return o; },{}),
  byBuild:Object.fromEntries(builds.map(bd=>[bd,{stuck:mean(agg.filter(m=>m.bid===bd).flatMap(m=>m.bots).map(b=>b.stuck)),sh:mean(agg.filter(m=>m.bid===bd).flatMap(m=>m.bots).map(b=>b.sh))}])),
  lvN:bots.reduce((a,b)=>a+(b.lvN||0),0), lvSkip:bots.reduce((a,b)=>a+(b.lvSkip||0),0), pwbRole:pk.filter(b=>b.park.clip>0).reduce((o,b)=>(o[b.role]=(o[b.role]||0)+1,o),{}),
  errs:errs.slice(0,3)};
console.log('SUMMARY',JSON.stringify(sum));
