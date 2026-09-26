// v54 — באפליקציה: גשר מובנה, מסך שני, הקלטת וידאו, משיכת יומן מהרובוט (adb מדומה)
import { _electron as electron } from 'playwright';
import fs from 'fs'; import path from 'path'; import os from 'os'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bbp2-')), VID=path.join(DATA,'videos');
// adb מדומה
const ADB=path.join(DATA,'fake-adb.sh');
fs.writeFileSync(ADB,`#!/bin/bash
case "$*" in
  "connect 10.1.2.3:5555") echo "connected to 10.1.2.3:5555";;
  devices) printf "List of devices attached\\n10.1.2.3:5555\\tdevice\\n";;
  *"shell ls -t /sdcard/FIRST/"*) echo "odolog.csv robot.xml";;
  *"pull /sdcard/FIRST/odolog.csv"*) out="\${@: -1}"; printf "t,x,y,heading_rad\\n0,0,0,0\\n0.5,6,0,0\\n1.0,12,1,0.1\\n1.5,18,3,0.2\\n" > "$out"; echo "1 file pulled";;
  *) echo "?";;
esac`); fs.chmodSync(ADB,0o755);
const app=await electron.launch({executablePath:path.resolve(APPDIR,'node_modules/electron/dist/electron'),
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
  env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_BRIDGE:'9681',BIOBUZZ_VIDEOS:VID,BIOBUZZ_ADB:ADB,BIOBUZZ_SIM:path.resolve(HERE,'../dist/BIOBUZZ-lab-lite.html')}, timeout:90000});
const win=await app.firstWindow(); const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
await win.evaluate(()=>{ document.getElementById('welcome').hidden=true; });
// גשר
let r=await win.evaluate(()=>bbApp.bridgeStatus());
ok(r.on&&r.port===9681,'הגשר המובנה עלה (בלי start.bat)');
r=await (await fetch('http://127.0.0.1:9681/health')).json(); ok(r.ok&&r.app,'/health מהאפליקציה');
ok((await fetch('http://127.0.0.1:9681/')).status===200,'דף השלט לטלפון מוגש מהאפליקציה');
// מסך שני
await win.evaluate(()=>document.getElementById('ppCast').click());
await win.waitForTimeout(2500);
ok(app.windows().length===2,'״מסך שני״ פתח חלון נוסף');
const cw=app.windows().find(w=>w!==win);
ok(/שידור/.test(await cw.title()),'כותרת החלון: '+await cw.title());
ok(await cw.evaluate(()=>!!document.getElementById('castCv')&&!window.bbApp),'בחלון השידור: קנבס, בלי גישה לנתונים');
await win.evaluate(()=>document.getElementById('ppCast').click()); await win.waitForTimeout(1500);
ok(app.windows().length===1,'סגירת המסך השני');
// וידאו
await win.evaluate(()=>document.getElementById('ppRec').click());
await win.waitForTimeout(3500);
await win.evaluate(()=>document.getElementById('ppRec').click());
await win.waitForTimeout(3000);
const vids=fs.existsSync(VID)?fs.readdirSync(VID):[];
ok(vids.length===1&&/^BIOBUZZ-\d{8}-\d{6}\.(mp4|webm)$/.test(vids[0])&&fs.statSync(path.join(VID,vids[0])).size>2000,'סרטון נשמר בתיקיית הסרטונים: '+vids.join(','));
// adb
await win.evaluate(()=>{ document.getElementById('liveIp').value='10.1.2.3'; document.getElementById('bOdoAdb').click(); });
await win.waitForTimeout(2000);
r=await win.evaluate(()=>({n:__sim.ODO.pts.length, ta:document.getElementById('odoText').value.slice(0,18)}));
ok(r.n===4&&/^t,x,y,heading_rad/.test(r.ta),'📥 משוך מהרובוט — odolog.csv נטען ליומן ('+r.n+' שורות)');
fs.writeFileSync(ADB,'#!/bin/bash\necho "List of devices attached"\n');
await win.evaluate(()=>{ document.getElementById('bOdoAdb').click(); }); await win.waitForTimeout(1500);
ok(/הרובוט לא נמצא/.test(await win.evaluate(()=>document.getElementById('oOdo').textContent)),'אין רובוט — הודעה ברורה');
ok(errs.length===0,'אין שגיאות '+errs.slice(0,2).join(' | '));
await app.close(); fs.rmSync(DATA,{recursive:true,force:true});
done('app_p2_test');
