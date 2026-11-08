// שחזור עבירות ״me״ במאצ׳ים ספציפיים מה-bench (זרע 7)
import {chromium} from 'playwright';
const PORT=process.env.BB_PORT||8921; const seed0=7;
const builds=process.env.BUILDS?process.env.BUILDS.split(','):['classic','starter','double','lift','turret','starterMec'];
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
for(const m of process.argv.slice(2).map(Number)){
  const page=await browser.newPage();
  await page.addInitScript((seed)=>{ window.requestAnimationFrame=()=>0; let s=seed>>>0||1; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
    localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); },seed0*1000+m);
  await page.goto(`http://127.0.0.1:${PORT}/${process.env.SIMFILE||"sim.html"}?nocad=1`,{timeout:90000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
  const ally=m%2?'blue':'red', bid=builds[Math.floor(m/2)%builds.length];
  const r=await page.evaluate(([ally,bid])=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally=ally; S.MT.cd=0; S.GAME.skill=2; S.REF.carry={}; S.REF.cards={};
    S.gameStart(true); for(let i=0;i<3;i++) S.bldSet(i,bid,true); S.matchStart(); if(false) S.v76b.V76B.noTank=true; let k=0; const ev=[]; let n0=0;
    while(S.MATCH.phase!=='סיום'&&k<20000){ S.advance(1/60,1/60); k++;
      if(S.REF.log.length>n0){ for(const e of S.REF.log.slice(n0)) if(e.team==='me'||e.rule==='G402'||e.rule==='G421') ev.push({t:+S.MATCH.t.toFixed(1),phase:S.MATCH.phase,rule:e.rule,what:e.what,sev:e.sev,card:e.card,
        me:[+S.I(S.botBody.position.x).toFixed(0),+S.I(S.botBody.position.z).toFixed(0)],mag:S.clip.length,auto:!!S.RUN.on,team:e.team,bots:S.BOTS.map(b=>[b.name,+S.I(b.body.position.x).toFixed(0),+S.I(b.body.position.z).toFixed(0),b.ph,b.autoLvl,b.role,b.v76Backs||0,!!b.v76Back,+(b.pinT||0).toFixed(1),b.foe])}); n0=S.REF.log.length; } }
    return {ally,bid,ev,final:S.MATCH.final}; },[ally,bid]);
  console.log(m,JSON.stringify(r));
  await page.close();
}
await browser.close();
