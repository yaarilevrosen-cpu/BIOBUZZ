// bench: N full comp matches, seeded, both alliances, cycling builds and skill levels.
// usage: node bench.mjs <page.html> <N> [seed0]
import {chromium} from 'playwright';
const file=process.argv[2]||'sim.html', N=+process.argv[3]||6, seed0=+process.argv[4]||1;
const PORT=process.env.PORT||8902;
const builds=['classic','starter','double','lift','turret','starterMec'];
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errs=[];
const agg=[];
for(let m=0;m<N;m++){
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  page.on('pageerror',e=>errs.push(String(e)));
  await page.addInitScript((seed)=>{ window.requestAnimationFrame=()=>0; let s=seed>>>0||1; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
    localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); },seed0*1000+m);
  await page.goto(`http://127.0.0.1:${PORT}/${file}?nocad=1`,{timeout:90000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
  const ally=m%2?'blue':'red', bid=builds[Math.floor(m/2)%builds.length], skill=[2,1,0][Math.floor(m/2)%3];
  const r=await page.evaluate(([ally,bid,skill])=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally=ally; S.MT.cd=0; S.GAME.skill=skill; S.REF.carry={}; S.REF.cards={};
    S.gameStart(true); for(let i=0;i<3;i++) S.bldSet(i,bid,true); S.matchStart();
    const st={}; for(const b of S.BOTS) st[b.name]={stuck:0,px:b.body.position.x,pz:b.body.position.z,clipAtPark:null};
    let k=0; const step=1/60; let maxStep=0;
    while(S.MATCH.phase!=='סיום'&&k<20000){ const t0=performance.now(); S.advance(step,step); const dtw=performance.now()-t0; if(k<5) maxStep=Math.max(maxStep,dtw); k++;
      for(const b of S.BOTS){ const s=st[b.name]; const d=Math.hypot(b.body.position.x-s.px,b.body.position.z-s.pz)/step; s.px=b.body.position.x; s.pz=b.body.position.z;
        const iv=Math.hypot(b.ivx||0,b.ivz||0);
        if(S.MATCH.on&&S.MATCH.phase!=='מעבר'&&iv>0.3&&d<0.05) s.stuck+=step;
        if(s.clipAtPark==null&&b.ph==='park'&&S.MATCH.phase!=='AUTO') s.clipAtPark=b.clip.length; } }
    const lg=S.REF.log;
    const out={ally,bid,skill,final:S.MATCH.final,dq:!!S.MATCH.dq,firstStepMs:+maxStep.toFixed(1),bots:[],
      g417:lg.filter(e=>e.team!=='me'&&e.rule==='G417').length, g411:lg.filter(e=>e.team!=='me'&&e.rule==='G411').length,
      botCards:lg.filter(e=>e.team!=='me'&&e.card).length, meG408auto:lg.filter(e=>e.team==='me'&&e.rule==='G408').length,
      otherBot:lg.filter(e=>e.team!=='me'&&!/G417|G411/.test(e.rule)).map(e=>e.rule)};
    for(const b of S.BOTS) out.bots.push({n:b.name,ally:b.ally,partner:b.ally===ally,role:b.role,sh:b.shots,hit:b.hits,lz:S.botInLZ(b),stuck:+st[b.name].stuck.toFixed(1),clipAtPark:st[b.name].clipAtPark});
    return out; },[ally,bid,skill]);
  agg.push(r); console.log(JSON.stringify(r));
  await page.close();
}
await browser.close();
// summary
const bots=agg.flatMap(m=>m.bots);
const mean=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2):0;
const sum={matches:agg.length, stuckMean:mean(bots.map(b=>b.stuck)), stuckMax:Math.max(...bots.map(b=>b.stuck)), stuckOver20:bots.filter(b=>b.stuck>20).length,
  park:bots.filter(b=>b.lz).length+'/'+bots.length, g417:agg.reduce((a,m)=>a+m.g417,0), g411:agg.reduce((a,m)=>a+m.g411,0), botCards:agg.reduce((a,m)=>a+m.botCards,0),
  meG408:agg.reduce((a,m)=>a+m.meG408auto,0), dq:agg.filter(m=>m.dq).length,
  partnerAllyScore:mean(agg.map(m=>m.final[m.ally])), oppAllyScore:mean(agg.map(m=>m.final[m.ally==='red'?'blue':'red'])),
  accuracy:+(bots.reduce((a,b)=>a+b.hit,0)/Math.max(1,bots.reduce((a,b)=>a+b.sh,0))).toFixed(3), shotsPerBot:mean(bots.map(b=>b.sh)),
  parkedWithBalls:bots.filter(b=>b.clipAtPark>0).length, firstStepMax:Math.max(...agg.map(m=>m.firstStepMs)),
  bySkill:Object.fromEntries([0,1,2].map(s=>[s,{opp:mean(agg.filter(m=>m.skill===s).map(m=>m.final[m.ally==='red'?'blue':'red'])),own:mean(agg.filter(m=>m.skill===s).map(m=>m.final[m.ally]))}])),
  errs:errs.slice(0,3)};
console.log('SUMMARY',JSON.stringify(sum));
