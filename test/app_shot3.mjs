import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bbshot4-'));
const L=(id)=>path.join(DATA,'profiles',id);
const mk=(n,base,wr)=>{ const a=[]; const t0=Date.now()-n*3600e3; for(let i=0;i<n;i++){ const my=base+Math.round(10*Math.sin(i/3))+Math.round(i/3), opp=my+(((i*7)%10)<wr?-8:6); a.push(JSON.stringify({at:t0+i*3600e3,ally:i%2?'blue':'red',my,opp,win:my>opp?1:-1,shots:10,hits:5+(i%4),autoPts:10+(i%5),fouls:0,faults:0,leave:true,park:i%2==0,kind:['match','quick','split'][i%3],skill:i%3})); } return a.join('\n')+'\n'; };
const P=[['p1','מאיה','🚀','#FFB020',60,40,7,'team'],['p2','שחר','🦊','#35D6A4',42,36,5,'team'],['p3','נועה','🐝','#4C9AF5',25,44,6,'team'],['p4','מאיה בבית','🦅','#B07CFF',12,38,6,'personal']];
fs.mkdirSync(DATA,{recursive:true});
fs.writeFileSync(path.join(DATA,'profiles.json'),JSON.stringify({v:1,active:'p1',tombs:[],list:P.map(p=>({id:p[0],name:p[1],emoji:p[2],color:p[3],created:1,metaAt:1,kvAt:1,acct:p[7]}))}));
for(const p of P){ fs.mkdirSync(L(p[0]),{recursive:true}); fs.writeFileSync(path.join(L(p[0]),'matches.jsonl'),mk(p[4],p[5],p[6])); fs.writeFileSync(path.join(L(p[0]),'store.json'),JSON.stringify({})); }
const app=await electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1',BIOBUZZ_SIM:path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html'),BIOBUZZ_UPD_URL:'http://127.0.0.1:1/none'}});
const cap=async(file)=>{ const b64=await app.evaluate(async({BrowserWindow})=>{ const w=BrowserWindow.getAllWindows()[0]; const img=await w.webContents.capturePage(); return img.toPNG().toString('base64'); }); fs.writeFileSync(file,Buffer.from(b64,'base64')); };
const win=await app.firstWindow();
await app.evaluate(({BrowserWindow})=>{ const w=BrowserWindow.getAllWindows()[0]; w.unmaximize(); w.setContentSize(1440,900); });
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
await win.waitForTimeout(6000);
for(const pg of ['home','drivers','settings','stats','play']){
  await win.evaluate(p=>{ document.querySelector('#appNav [data-nav="'+p+'"]').click(); },pg);
  await win.waitForTimeout(pg==='play'?7000:5000);
  await cap(path.resolve(HERE,'../v55_'+pg+'.png'));
}
await app.close();
