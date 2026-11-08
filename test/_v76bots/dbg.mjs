// v76: מאץ׳ אחד מה-bench עם יומן החלטות חניה בכל חצי שנייה ב-25 השניות האחרונות
import {chromium} from 'playwright';
const m=+process.argv[2]||1, seed0=+process.argv[3]||7, PORT=process.env.BB_PORT||8921;
const builds=['classic','starter','double','lift','turret','starterMec'];
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1200,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.addInitScript((seed)=>{ window.requestAnimationFrame=()=>0; let s=seed>>>0||1; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
  localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); },seed0*1000+m);
await page.goto(`http://127.0.0.1:${PORT}/${process.env.SIMFILE||"sim.html"}?nocad=1`,{timeout:90000});
await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
const ally=m%2?'blue':'red', bid=builds[Math.floor(m/2)%builds.length];
const r=await page.evaluate(([ally,bid])=>{ const S=__sim; S.setRealm('comp'); S.SETUP.ally=ally; S.MT.cd=0; S.GAME.skill=2; S.REF.carry={}; S.REF.cards={};
  S.gameStart(true); for(let i=0;i<3;i++) S.bldSet(i,bid,true); S.matchStart(); const I=S.I, X=S.v76b;
  const out=[]; let k=0, nx=0; const tEnd=S.tEnd();
  while(S.MATCH.phase!=='סיום'&&k<20000){ S.advance(1/60,1/60); k++; const tl=tEnd-S.MATCH.t;
    if(tl<26&&S.MATCH.t>=nx){ nx=S.MATCH.t+0.5;
      out.push(tl.toFixed(1)+' '+S.BOTS.map(b=>b.name.slice(-1)+':'+b.role[0]+':'+b.ph+':c'+b.clip.length+':tr'+(b.parkTrav||0).toFixed(1)+(b.parkGo?':GO':'')+(b.lastVol?':LV':'')+(b.lvBlock?':BLK':'')+':st'+(b.stallT||0).toFixed(1)+':lz'+(S.botInLZ(b)?1:0)+'@'+I(b.body.position.x).toFixed(0)+','+I(b.body.position.z).toFixed(0)).join(' | ')); } }
  return {final:S.MATCH.final,out,lz:S.BOTS.map(b=>S.botInLZ(b))}; },[ally,bid]);
console.log(r.out.join('\n')); console.log(JSON.stringify(r.final),r.lz,errs.slice(0,2)); await browser.close();
