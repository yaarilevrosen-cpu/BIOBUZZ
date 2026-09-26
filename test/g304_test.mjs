// G304 — עמדות הפתיחה מול המדריך
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
const E=(f,a)=>page.evaluate(f,a);
let r=await E(()=>{ const S=__sim, sp=S.startSpots(); const o={};
  for(const k in sp){ const s=sp[k]; o[k]=S.g304Check(s.x,s.z,s.yaw*Math.PI/180,s.ally).map(v=>v.r+':'+v.t); } return o; });
for(const k in r) ok(r[k].length===0,'עמדת '+k+' חוקית לפי G304 '+(r[k].join(' ')||''));
// מקרים לא חוקיים — הבודק תופס
r=await E(()=>{ const S=__sim, rest=S.HALF-Math.hypot(8,8)-0.25;
  const c=(x,z,y,a)=>S.g304Check(x,z,y,a).map(v=>v.r).join('');
  return {mid:c(-rest,0,Math.PI/2,'red'), lz:c(-rest,-35,Math.PI/2,'red'), flower:c(-rest,23,Math.PI/2,'red'),
    center:c(-30,0,0,'red'), wrongSide:c(rest,58,-Math.PI/2,'red'), audience:c(-40,rest,Math.PI,'red'),
    backFlower:c(-23.4,-rest,0,'red'), big:S.g304Check(-rest,58,Math.PI/2,'red',19,16).map(v=>v.r).join('')}; });
ok(r.mid==='','אמצע הקיר האדום חוקי (המדריך מאפשר, הסימולטור לא הציע)');
ok(r.audience==='','קיר הקהל בחצי האדום חוקי');
ok(/E/.test(r.lz),'באזור הטעינה — E');
ok(/D/.test(r.flower),'על הפרח של הקיר האדום — D');
ok(/C/.test(r.center),'באמצע הזירה — C (לא נוגע בקיר)');
ok(/A/.test(r.wrongSide),'בצד הכחול — A');
ok(/D/.test(r.backFlower),'על הפרח של הקיר האחורי — D');
ok(/F/.test(r.big),'19 אינץ׳ — F');
// טעינה מוקדמת: בדיוק 4 POLLEN גם אם בלוח בחרו NECTAR
r=await E(()=>{ const S=__sim; S.setKind('red'); S.MT.cd=0; S.gameStart(true); S.matchStart();
  const mine=S.bot.clip.slice(); const bots=S.BOTS.filter(b=>b.on).map(b=>b.clip.join(',')); S.matchStop(); S.setKind('pollen'); return {mine,bots}; });
ok(r.mine.length===4&&r.mine.every(k=>k==='pollen'),'אני מתחיל עם 4 POLLEN ('+r.mine.join(',')+')');
ok(r.bots.every(c=>c==='pollen,pollen,pollen,pollen'),'כל הבוטים מתחילים עם 4 POLLEN');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('g304_test');
