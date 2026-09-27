// v60 — שם החשבון: אחד לכל חשבון, שמור בשרת, זהה בכל מחשב (שרת מדומה — בלי רשת)
import fs from 'fs'; import os from 'os'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import {ok,done} from './h.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const { Store } = require(path.resolve(HERE,'../app/store.js'));
const { Sync } = require(path.resolve(HERE,'../app/sync.js'));
/* שרת מדומה: משתמש אחד, user_metadata, חברות בקבוצה */
const SRV={meta:{}, teamLabel:'', member:false, calls:[]};
globalThis.fetch=async(url,o={})=>{
  const u=new URL(url), m=o.method||'GET', body=o.body?JSON.parse(o.body):null; SRV.calls.push(m+' '+u.pathname);
  const J=(x,st=200)=>new Response(JSON.stringify(x),{status:st,headers:{'content-type':'application/json'}});
  const user={id:'u1',email:'noa@example.com',user_metadata:SRV.meta};
  if(u.pathname==='/auth/v1/token') return J({access_token:'t',refresh_token:'r',expires_in:3600,user});
  if(u.pathname==='/auth/v1/user'&&m==='GET') return J(user);
  if(u.pathname==='/auth/v1/user'&&m==='PUT'){ Object.assign(SRV.meta,body.data||{}); return J(user); }
  if(u.pathname==='/rest/v1/bb_team_members') return J(SRV.member?[{team_id:1,uid:'u1',label:SRV.teamLabel}]:[]);
  if(u.pathname==='/rest/v1/bb_teams') return J([{id:1,code:'ABCD',name:'x',num:'1',owner:'u1'}]);
  if(u.pathname==='/rest/v1/rpc/bb_team_label'){ SRV.teamLabel=body.p_label; return J(null); }
  if(u.pathname.startsWith('/rest/v1/')) return J([]);
  return J({},404);
};
const mk=()=>{ const d=fs.mkdtempSync(path.join(os.tmpdir(),'bbname-')); const s=new Store(d); return {d,s,y:new Sync(s,d,{cloud:{url:'http://mock.local',key:'k'}})}; };
// מחשב א׳: נהג פעיל ״מאיה״, חשבון בלי שם בשרת — השם נקבע פעם אחת
const A=mk(); A.s.updateProfile(A.s.meta.active,{name:'מאיה'});
await A.y.signIn('noa@example.com','x'); let r=await A.y.syncNow();
ok(r.ok,'סנכרון א׳ '+JSON.stringify(r).slice(0,80));
ok(SRV.meta.name==='מאיה','חשבון ישן בלי שם — קיבל פעם אחת את שם הנהג הפעיל ('+SRV.meta.name+')');
ok(A.y.label()==='מאיה'&&A.y.status().name==='מאיה','הסטטוס מחזיר את שם החשבון');
// באותו מחשב — נהג אחר פעיל: השם לא משתנה
const sh=A.s.addProfile('שחר',{}); A.s.switchTo(sh.id);
ok(A.y.label()==='מאיה','נהג אחר פעיל — שם החשבון לא זז (זה היה הבאג)');
// מחשב ב׳: נהג פעיל אחר לגמרי — אותו שם
const B=mk(); B.s.updateProfile(B.s.meta.active,{name:'נועה'});
await B.y.signIn('noa@example.com','x'); r=await B.y.syncNow();
ok(B.y.label()==='מאיה','מחשב ב׳ עם נהג ״נועה״ — אותו שם חשבון ״מאיה״');
ok(SRV.meta.name==='מאיה','השם בשרת לא נדרס מהמחשב השני');
// שינוי שם ב-ב׳ → א׳ מקבל בסנכרון הבא; ובקבוצה — גם התווית
SRV.member=true; SRV.teamLabel='ישן';
r=await B.y.nameSet('  נועה   כהן ');
ok(r.ok&&r.name==='נועה כהן'&&SRV.meta.name==='נועה כהן','שינוי שם נשמר בשרת (רווחים מנוקים)');
await A.y.syncNow();
ok(A.y.label()==='נועה כהן','מחשב א׳ קיבל את השם החדש בסנכרון');
ok(SRV.teamLabel==='נועה כהן','בטבלת הקבוצה — אותו שם');
ok(!(await B.y.nameSet('   ')).ok,'שם ריק נדחה');
// התחברות מחדש — השם מגיע כבר מהתחברות
const C=mk(); await C.y.signIn('noa@example.com','x');
ok(C.y.label()==='נועה כהן','התחברות במחשב חדש — השם מיד, עוד לפני סנכרון');
// חשבון עם תווית קבוצה ובלי שם (מעבר מ-v59): התווית שבקבוצה נשמרת
SRV.meta={}; SRV.teamLabel='שחר הקפטן';
const D=mk(); await D.y.signIn('noa@example.com','x'); await D.y.syncNow();
ok(SRV.meta.name==='שחר הקפטן'&&D.y.label()==='שחר הקפטן','מעבר: השם שכבר הופיע בקבוצה הוא השם של החשבון');
done('name_test');
