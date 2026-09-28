// v54 — הרובוט האמיתי חי (FTC Dashboard מדומה)
import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {open,ok,done,realErrs} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)); const require=createRequire(import.meta.url);
const { WebSocketServer } = require(path.resolve(HERE,'../app/node_modules/ws'));
// דשבורד מדומה: שולח x/y/heading, ובמצב 2 — רק ציור של RoadRunner
let mode=1, t=0;
const wss=new WebSocketServer({port:8765});
wss.on('connection',ws=>{
  ws.on('message',m=>{ const j=JSON.parse(m.toString()); if(j.type==='GET_ROBOT_STATUS') ws.send(JSON.stringify({type:'RECEIVE_ROBOT_STATUS',status:{activeOpMode:'LocalizationTest',activeOpModeStatus:'RUNNING'}})); });
  const iv=setInterval(()=>{ t+=0.05; const x=10+t*20, y=-30, hd=90;
    const pkt=mode===1?{timestamp:Date.now(),data:{'x':x.toFixed(2),'y':String(y),'heading (deg)':String(hd)},log:[],fieldOverlay:{ops:[]}}
      :{timestamp:Date.now(),data:{},log:[],fieldOverlay:{ops:[{type:'stroke',color:'#3F51B5'},{type:'circle',x:24,y:12,radius:9,stroke:true},{type:'polyline',xPoints:[24,24],yPoints:[16.5,21]}]}};
    try{ ws.send(JSON.stringify({type:'RECEIVE_TELEMETRY',telemetry:[pkt]})); }catch(e){} },50);
  ws.on('close',()=>clearInterval(iv));
});
const {browser,page,errs}=await open({noraf:true});
const E=f=>page.evaluate(f);
await E(()=>{ document.getElementById('livePort').value='8765'; document.getElementById('liveIp').value='127.0.0.1'; document.getElementById('bLiveConn').click(); });
await page.waitForFunction(()=>__sim.LIVE.st==='on'&&__sim.LIVE.n>5&&__sim.LIVE.op,null,{timeout:20000}).catch(()=>{}); // נבדק מיד למטה
let r=await E(()=>({st:__sim.LIVE.st, n:__sim.LIVE.n, rr:__sim.LIVE.rr, p:__sim.LIVE.pose, vis:__sim.LIVE.ghost&&__sim.LIVE.ghost.visible, op:__sim.LIVE.op, txt:document.getElementById('oLive').textContent}));
ok(r.st==='on'&&r.n>5,'מחובר לדשבורד ומקבל מיקומים ('+r.n+')');
ok(r.op==='LocalizationTest'&&/LocalizationTest/.test(r.txt),'רואים את האופמוד שרץ');
ok(Math.abs(r.rr.h-Math.PI/2)<1e-3&&r.rr.y===-30,'heading (deg) הומר לרדיאנים');
ok(Math.abs(r.p.x-r.rr.y)<1e-6&&Math.abs(r.p.z-r.rr.x)<1e-6&&Math.abs(r.p.yaw-Math.PI/2)<1e-6,'המרה לצירי הסימולטור (v63, סיבוב): x=y, z=x, yaw=θ');
ok(r.vis,'הרובוט האמיתי מופיע על הזירה');
// הקלטה → יומן אודומטריה
/* מקליטים עד שיש 12 מיקומים (הדשבורד המדומה שולח כל 50 מ״ש) — לפי מספר הנקודות, לא לפי זמן */
await E(()=>document.getElementById('bLiveRec').click());
await page.waitForFunction(()=>__sim.LIVE.rec&&__sim.LIVE.rec.length>=12,null,{timeout:20000}).catch(()=>{});
await E(()=>document.getElementById('bLiveRec').click());
r=await E(()=>({n:__sim.ODO.pts.length, st:__sim.ODO.stats, ta:document.getElementById('odoText').value.slice(0,20)}));
ok(r.n>=10&&r.st&&r.st.n===r.n&&/^t,x,y,heading_rad/.test(r.ta),'הקלטת ריצה עברה ליומן האודומטריה ('+r.n+' נקודות)');
// ציור RoadRunner בלי מפתחות
mode=2; await page.waitForFunction(()=>__sim.LIVE.rr&&__sim.LIVE.rr.x===24,null,{timeout:20000}).catch(()=>{});
r=await E(()=>__sim.LIVE.rr);
ok(r&&r.x===24&&r.y===12&&Math.abs(r.h-Math.PI/2)<1e-3&&/ציור/.test(r.src),'בלי מפתחות — המיקום נקרא מציור הרובוט של RoadRunner');
await E(()=>document.getElementById('bLiveConn').click());
ok(await E(()=>__sim.LIVE.st==='off'&&!__sim.LIVE.ghost.visible),'ניתוק — הרובוט האמיתי נעלם');
// כתובת שאין בה רובוט
await E(()=>{ document.getElementById('livePort').value='8799'; document.getElementById('bLiveConn').click(); });
await page.waitForFunction(()=>__sim.LIVE.st==='err',null,{timeout:20000}).catch(()=>{});
r=await E(()=>({st:__sim.LIVE.st, txt:document.getElementById('oLive').textContent}));
ok(r.st==='err'&&/לא מצאתי את הרובוט/.test(r.txt),'אין רובוט — הודעה ברורה');
ok(realErrs(errs).length===0,'אין שגיאות '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); wss.close(); done('p3_test');
