// ספסל כיול v77 מוח: N מאצ׳ים מלאים עם פרופילים סינתטיים, מודד כל בוט מול b.sb.targets
// usage: BB_PORT=8931 node bench.mjs N seed0   env: MODE=scout|plain  OFF=1 (בלי המוח של v77)  SIMFILE=sim.html
import {chromium} from 'playwright';
import {eventFile,PROFS} from './profiles.mjs';
const N=+process.argv[2]||4, seed0=+process.argv[3]||7, PORT=process.env.BB_PORT||8931, MODE=process.env.MODE||'scout';
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errs=[], agg=[];
import fs from 'fs';
const EV=process.env.FILE?fs.readFileSync(process.env.FILE,'utf8'):JSON.stringify(eventFile(null,Math.max(N,4)));
const OURS=process.env.FILE?(process.env.OURS||''):'90099';
for(let m=0;m<N;m++){
  const page=await browser.newPage({viewport:{width:1000,height:700}});
  page.on('pageerror',e=>errs.push(String(e)));
  await page.addInitScript((seed)=>{ window.requestAnimationFrame=()=>0; let s=seed>>>0||1; Math.random=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
    localStorage.setItem('bbUiMode1','lab'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); },seed0*1000+m);
  await page.goto(`http://127.0.0.1:${PORT}/${process.env.SIMFILE||"sim.html"}?nocad=1`,{timeout:90000});
  await page.waitForFunction(()=>window.__sim&&window.__sim.BOTS.length,null,{timeout:60000});
  const t0=Date.now();
  const r=await page.evaluate(([EV,m,MODE,OFF,seed,OURS,FOULS])=>{ const S=__sim; S.setRealm('comp'); S.SETUP.cd=0; S.SETUP.ally='red'; S.GAME.skill=2; S.REF.carry={}; S.REF.cards={};
    if(S.v77b){ S.v77b.V77B.off=!!OFF; S.v77b.V77B.seed=seed; }
    if(MODE==='scout'){ S.sctLoadText(EV); S.SCT.ours=OURS; S.SCT.mi=Math.min(m,S.SCT.pack.matches.length-1); S.sctApply(); S.sctPlay(); if(FOULS){ const pt=S.BOTS.find(b=>b.ally===S.myAlly()); if(pt) pt.on=false; } }
    else { S.setupApply(); }
    const I=v=>v/0.0254, st={}; for(const b of S.BOTS) st[b.name]={def:0,tele:0,aSh:0,aHit:0};
    let k=0, aSnap=null; const step=1/60;
    while(S.MATCH.phase!=='סיום'&&k<20000){ S.advance(step,step); k++;
      const ph=S.MATCH.on?(S.MATCH.t<S.tAuto()?0:S.MATCH.t<S.tAuto()+8?1:2):-1;
      if(ph>=1&&!aSnap){ aSnap={tips:{red:S.TIPS.red,blue:S.TIPS.blue}}; for(const b of S.BOTS){ st[b.name].aSh=b.shots; st[b.name].aHit=b.hits||0; } }
      if(ph===2) for(const b of S.BOTS){ if(!b.on) continue; st[b.name].tele+=step; if(b.role==='defend'||b.lvBlock) st[b.name].def+=step; } }
    const tipsEnd={red:S.TIPS.red,blue:S.TIPS.blue};
    const out={m,final:S.MATCH.final,secs:+(k*step).toFixed(0),bots:[]};
    for(const A of ['red','blue']){
      const mates=S.BOTS.filter(b=>b.ally===A);
      const hA=mates.reduce((a,b)=>a+(st[b.name].aHit),0)+0, hT=mates.reduce((a,b)=>a+((b.hits||0)-st[b.name].aHit),0);
      for(const b of mates){ const s=st[b.name], aH=s.aHit, tH=(b.hits||0)-aH;
        const aTips=aSnap?aSnap.tips[A]:0, tTips=tipsEnd[A]-aTips;
        const tipsA=hA?aTips*aH/hA:0, tipsT=hT?tTips*tH/hT:0;
        const fouls=S.REF.log.filter(e=>e.team===b.name).reduce((a,e)=>a+(e.pts||0),0);
        const leave=b.leaveDone?1:0, apark=b.autoPark?1:0, park=b.on&&S.botInLZ(b)?1:0;
        const autoPts=3*leave+5*apark+20*tipsA+2*aH, telePts=20*tipsT+2*tH, endPts=5*park;
        out.bots.push({n:b.name, ally:A, team:b.prof?b.prof.team:null, on:b.on, noShow:!!(b.sbS&&b.sbS.noShow), sh:b.shots, hit:b.hits||0, aSh:s.aSh, aHit:aH,
          tips:+(tipsA+tipsT).toFixed(2), def:s.tele?+(s.def/s.tele).toFixed(3):0, park, leave, apark, fouls, autoPts:+autoPts.toFixed(1), telePts:+telePts.toFixed(1), endPts,
          total:+(autoPts+telePts+endPts).toFixed(1), auto:b.autoLvl, start:b.sbS?b.sbS.start:null, hes:b.sbS?b.sbS.st.hes:0, push:b.sbS?b.sbS.st.push:0, fb:b.sbS?b.sbS.fb:null, noPark:b.noPark, parkGo:!!b.parkGo, lvB:!!b.lvBlock, ph:b.ph, miss:b.sbS?b.sbS.st.miss||0:0, T:b.prof?{spm:b.prof.spm,acc:b.prof.acc,tips:b.prof.tips,def:b.prof.def,park:b.prof.park,fouls:b.prof.fouls,ap:b.prof.ap,tp:b.prof.tele,ep:b.prof.endP,total:b.prof.total,leave:b.prof.mLeave,apark:b.prof.mAPark}:null}); } }
    out.fl=S.REF.log.filter(e=>e.pts).map(e=>e.rule+':'+e.team);
    out.hits=S.v77b?S.v77b.V77B.hits:null;
    return out; },[EV,m,MODE,!!process.env.OFF,seed0*7919+m,OURS,!!process.env.FOULS]);
  r.wall=((Date.now()-t0)/1000).toFixed(0);
  agg.push(r); console.log(JSON.stringify(r));
  await page.close();
}
await browser.close();
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN, f=(v,d=2)=>isFinite(v)?+v.toFixed(d):null;
const bots=agg.flatMap(m=>m.bots);
const rep={matches:agg.length, errs:errs.slice(0,3), all:{shots:f(mean(bots.filter(b=>b.on).map(b=>b.sh))), acc:f(bots.reduce((a,b)=>a+b.hit,0)/Math.max(1,bots.reduce((a,b)=>a+b.sh,0)),3), def:f(mean(bots.filter(b=>b.on).map(b=>b.def))), park:f(mean(bots.filter(b=>b.on).map(b=>b.park))), fouls:f(mean(bots.map(b=>b.fouls))), red:f(mean(agg.map(m=>m.final.red))), blue:f(mean(agg.map(m=>m.final.blue)))}, prof:{}};
if(MODE==='scout') for(const t of [...new Set(bots.filter(b=>b.team).map(b=>b.team))]){ const B=bots.filter(b=>b.team==+t&&(b.on||b.noShow)), P=B[0].T, on=B.filter(b=>b.on);
  const acc=on.reduce((a,b)=>a+b.hit,0)/Math.max(1,on.reduce((a,b)=>a+b.sh,0)), g=k=>P[k]==null?null:P[k];
  rep.prof[t]={name:(PROFS[t]||{}).name||'', n:B.length, noShow:B.filter(b=>b.noShow).length, miss:f(mean(on.map(b=>b.miss)),1),
    spm:[g('spm'),f(mean(on.map(b=>b.sh)),1)], acc:[g('acc'),f(acc,2)], tips:[g('tips'),f(mean(on.map(b=>b.tips)),2)], def:[g('def'),f(mean(on.map(b=>b.def)),2)],
    park:[g('park'),f(mean(on.map(b=>b.park)),2)], fouls:[g('fouls'),f(mean(on.map(b=>b.fouls)),1)], autoPts:[g('ap'),f(mean(on.map(b=>b.autoPts)),1)],
    telePts:[g('tp'),f(mean(on.map(b=>b.telePts)),1)], total:[g('total'),f(mean(on.map(b=>b.total)),1)], leave:[g('leave'),f(mean(on.map(b=>b.leave)),2)], apark:[g('apark'),f(mean(on.map(b=>b.apark)),2)]}; }
console.log('SUMMARY',JSON.stringify(rep));
