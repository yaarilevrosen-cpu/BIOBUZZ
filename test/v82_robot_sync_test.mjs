// v82: הרובוט האמיתי של הקבוצה בצד של האפליקציה (app/sync.js) — בלי רשת: השרת והאחסון מדומים.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { createRequire } from 'module';
import {fakeRobot,fakeGlb} from './v82_fixture.mjs';
const require=createRequire(import.meta.url);
const { Sync, robotCheck, glbOk } = require('../app/sync.js');
let pass=0, fail=0; const fails=[];
const ok=(c,m)=>{ if(c) pass++; else { fail++; fails.push(m); } console.log((c?'  ✓ ':'  ✗ ')+m); };

const D=fakeRobot(), J=JSON.stringify(D), G=fakeGlb(D);
const U='00000000-0000-0000-0000-0000000000c1', V='00000000-0000-0000-0000-0000000000c2', T='00000000-0000-0000-0000-00000000aa01';

// בדיקת הקבצים
ok(glbOk(G)&&!glbOk(Buffer.from('not a glb at all......')),'glb תקין מזוהה, אחר לא');
ok(robotCheck(J,G).ok&&robotCheck(J,G).ver===3,'הקבצים מ־02 עוברים (גרסה 3)');
ok(!robotCheck('{"format":"x"}',G).ok,'פורמט אחר נדחה');
ok(!robotCheck(JSON.stringify(Object.assign({},D,{version:0})),G).ok,'בלי גרסה נדחה');
ok(!robotCheck(J,Buffer.from('xx')).ok&&!robotCheck(J,null).ok,'בלי glb תקין נדחה');
ok(!robotCheck('{'+' '.repeat(600*1024)+'}',G).ok,'ג׳ייסון גדול מדי נדחה');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bb82-'));
const s=new Sync(null,dir,{});
s.sess={access_token:'x',refresh_token:'y',expires_at:Date.now()+3600e3,user:{id:U,email:'o at test'}};
s.team={id:T,team:{id:T,code:'TSTA01',name:'א',num:'90001',owner:U},members:[{uid:U,me:true}],profiles:{},matches:{}};
const calls=[]; let srv=null;
s.rpc=async(fn,a)=>{ calls.push(['rpc',fn,a]);
  if(fn==='bb_team_robot_set'){ srv={team:T,ver:a.p_ver,data:a.p_data,path:a.p_path,size:a.p_size,updated_at:'2026-01-01T00:00:00Z',mine:true}; return srv; }
  if(fn==='bb_team_robot_get') return srv||{team:T,mine:true};
  if(fn==='bb_team_robot_clear'){ srv=null; return null; } };
const store={}; s.robotUpload=async(p,b,m)=>{ calls.push(['up',m,p]); if(m==='DELETE') delete store[p]; else store[p]=b; return {}; };
s.robotDownload=async p=>{ calls.push(['down',p]); return store[p]; };

// העלאה — רק הבעלים
s.team.team.owner=V;
let r=await s.robotPush(J,G); ok(!r.ok&&/רק מי שפתח/.test(r.why)&&!calls.length,'מי שלא פתח את הקבוצה לא מעלה (ולא פונה לשרת)');
s.team.team.owner=U;
r=await s.robotPush('{"format":"x"}',G); ok(!r.ok&&!calls.length,'קובץ לא נכון לא עולה');
r=await s.robotPush(J,G);
ok(r.ok&&r.ver===3&&r.parts===D.parts.length,'הבעלים מעלה: גרסה 3, '+r.parts+' חלקים');
ok(calls[0][0]==='up'&&calls[0][2]===T+'/robot-v3.glb'&&calls[1][1]==='bb_team_robot_set'&&calls[1][2].p_path===T+'/robot-v3.glb'&&calls[1][2].p_size===G.length,
  'קודם המודל לנתיב של הקבוצה, ואז הנתונים עם אותו נתיב וגודל');
ok(fs.existsSync(path.join(dir,'team-robot','robot.glb'))&&fs.readFileSync(path.join(dir,'team-robot','robot.glb')).equals(G),'נשמר במטמון במחשב');
let st=s.status().robot; ok(st.has&&st.ver===3&&st.mine&&st.srv,'מצב: יש רובוט, גרסה 3, של הבעלים');
let g=s.robotGet(); ok(g.ok&&g.ver===3&&g.glb.equals(G)&&g.data.format==='apollo9662-robot/1','הדף מקבל את הנתונים והמודל');

// גרסה חדשה מחליפה ומוחקת את הישנה
calls.length=0;
r=await s.robotPush(JSON.stringify(Object.assign({},D,{version:4})),G);
ok(r.ok&&calls.some(c=>c[0]==='up'&&c[1]==='DELETE'&&c[2]===T+'/robot-v3.glb'),'גרסה 4 עולה, והקובץ של גרסה 3 נמחק מהאחסון');

// משיכה: אותה גרסה — בלי הורדה; גרסה חדשה בשרת — מורידים
calls.length=0; r=await s.robotPull(); ok(r.ok&&r.same&&!calls.some(c=>c[0]==='down'),'אותה גרסה — לא מורידים שוב');
srv=Object.assign({},srv,{ver:5,path:T+'/robot-v5.glb',updated_at:'2026-01-02T00:00:00Z'}); store[T+'/robot-v5.glb']=G;
calls.length=0; r=await s.robotPull(); ok(r.ok&&r.ver===5&&calls.some(c=>c[0]==='down'&&c[1]===T+'/robot-v5.glb')&&s.status().robot.ver===5,'גרסה חדשה בשרת — מורידים ושומרים');
srv=Object.assign({},srv,{ver:6,path:'other-team/robot-v6.glb',updated_at:'x'});
r=await s.robotPull(); ok(!r.ok&&s.status().robot.ver===5,'נתיב של קבוצה אחרת לא יורד');
store[T+'/robot-v7.glb']=Buffer.from('broken');
srv=Object.assign({},srv,{ver:7,path:T+'/robot-v7.glb',updated_at:'y'});
r=await s.robotPull(); ok(!r.ok&&/פגום/.test(r.why)&&s.status().robot.ver===5,'מודל פגום לא נשמר');

// חבר רגיל: רואה, לא מוחק
s.team.team.owner=V; st=s.status().robot; ok(st.has&&!st.mine,'חבר רגיל: רואה, לא שלו');
r=await s.robotClear(); ok(!r.ok,'חבר רגיל לא מוחק');
s.team.team.owner=U;

// קבוצה אחרת במטמון — הדף לא מקבל
const tid=s.team.id; s.team.id='00000000-0000-0000-0000-00000000aa02'; ok(!s.robotGet().ok,'החשבון בקבוצה אחרת — הדף לא מקבל את הרובוט מהמטמון'); s.team.id=tid;

// שרת בלי v82_team_robot.sql
const s2=new Sync(null,fs.mkdtempSync(path.join(os.tmpdir(),'bb82b-')),{}); s2.sess=s.sess; s2.team=JSON.parse(JSON.stringify(s.team));
s2.rpc=async()=>{ const e=new Error('Could not find the function public.bb_team_robot_get'); e.status=404; throw e; };
r=await s2.robotPull(); ok(r&&r.missing&&s2.status().robot.srv===false,'שרת בלי הקובץ: ״צריך להריץ את v82_team_robot.sql״');

// הרובוט נמחק בשרת — נמחק גם במחשב
srv=null; r=await s.robotPull(); ok(r.ok&&!r.has&&!fs.existsSync(path.join(dir,'team-robot')),'נמחק בשרת — נמחק גם מהמחשב');
// יציאה מהקבוצה / התנתקות — המטמון נמחק
await s.robotPush(J,G); ok(fs.existsSync(path.join(dir,'team-robot','robot.glb')),'(שוב במטמון)');
s.team=null; s.saveTeam(); ok(!fs.existsSync(path.join(dir,'team-robot'))&&!s.robotGet().ok,'בלי קבוצה (יציאה, התנתקות, חשבון אחר) — המטמון נמחק');
// אחרי הפעלה מחדש — המטמון נקרא
s.team={id:T,team:{id:T,owner:U}}; await s.robotPush(J,G);
const s3=new Sync(null,dir,{}); s3.sess=s.sess; s3.team=s.team; ok(s3.robotGet().ok&&s3.status().robot.has,'אחרי הפעלה מחדש: המטמון נטען');

fs.rmSync(dir,{recursive:true,force:true});
console.log(`v82_robot_sync: ${pass} עברו, ${fail} נכשלו`); if(fail){ console.log(fails.join('\n')); process.exit(1); }
