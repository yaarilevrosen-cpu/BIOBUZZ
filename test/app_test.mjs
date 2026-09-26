// v53 — האפליקציה עצמה (Electron): נהגים, שמירה בדיסק, ארכיון, טבלת קבוצה, ייבוא, גיבוי
import { _electron as electron } from 'playwright';
import fs from 'fs'; import path from 'path'; import os from 'os'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
import {ok,done} from './h.mjs';
const APPDIR=path.resolve(HERE,'../app');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'bbapp-'));
const launch=async()=>{
  const app=await electron.launch({executablePath:APPDIR+'/node_modules/electron/dist/electron',
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',APPDIR],
    env:{...process.env,BIOBUZZ_DATA:DATA,BIOBUZZ_TEST:'1',BIOBUZZ_NOADB:'1'}, timeout:90000});
  const win=await app.firstWindow();
  const errs=[]; win.on('pageerror',e=>errs.push(String(e)));
  await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000});
  return {app,win,errs};
};
const waitReload=async win=>{ await win.waitForEvent('load',{timeout:60000}); await win.waitForFunction(()=>window.__sim&&window.__sim.BOTS&&window.__sim.BOTS.length,null,{timeout:120000}); };
const J=f=>JSON.parse(fs.readFileSync(path.join(DATA,f),'utf8'));
let {app,win,errs}=await launch();
ok(await win.evaluate(()=>!!window.bbApp&&document.documentElement.classList.contains('app')),'האפליקציה עלתה, bbApp קיים');
ok(await win.evaluate(()=>!document.getElementById('welcome').hidden),'פתיחה ראשונה: ״ברוכים הבאים״');
await win.fill('#wcName','מאיה');
await win.evaluate(()=>document.querySelector('#wcEmo [data-wce="🚀"]').click());
await win.evaluate(()=>document.querySelector('#wcGo').click());
await win.waitForTimeout(600);
ok(await win.evaluate(()=>document.getElementById('welcome').hidden&&/מאיה/.test(document.getElementById('profChip').textContent)&&/🚀/.test(document.getElementById('profChip').textContent)),'השם והסמל בכותרת: 🚀 מאיה');
ok(J('profiles.json').list[0].name==='מאיה','profiles.json: מאיה');
// שינויים נשמרים לדיסק
await win.evaluate(()=>{ __sim.bk._set('wheelD',120); localStorage.setItem('bb_paths_v1',JSON.stringify([{name:'שלי',pts:[]}])); });
await win.waitForTimeout(1500);
const pid=J('profiles.json').active;
let st=J('profiles/'+pid+'/store.json');
ok(st.biobuzz_params_v1&&JSON.parse(st.biobuzz_params_v1).wheelD===120&&!!st.bb_paths_v1,'הפרמטרים והמסלול נכתבו לדיסק של הנהג');
await app.close();
// הפעלה מחדש
({app,win,errs}=await launch());
ok(await win.evaluate(()=>document.getElementById('welcome').hidden),'פתיחה שנייה: בלי ״ברוכים הבאים״');
ok(await win.evaluate(()=>__sim.bk._diff().some(d=>d[0]==='wheelD'&&d[2]===120)),'אחרי סגירה ופתיחה: קוטר הגלגל 120 נשאר');
// נהג חדש והחלפה
await win.evaluate(()=>document.querySelector('#profChip').click());
await win.waitForTimeout(400);
await win.fill('#pfName','שחר'); await win.evaluate(()=>document.querySelector('#pfAddB').click());
await win.waitForTimeout(600);

ok(await win.evaluate(()=>document.querySelectorAll('#pfList .pfRow').length)===2,'נוסף נהג: שחר');
const other=await win.evaluate(()=>[...document.querySelectorAll('#pfList [data-pfgo]')].find(b=>!b.disabled).dataset.pfgo);
let rl=waitReload(win); await win.evaluate(id=>document.querySelector('#pfList [data-pfgo="'+id+'"]').click(),other); await rl;
ok(await win.evaluate(()=>/שחר/.test(document.getElementById('profChip').textContent)),'החלפה: שחר נוהג');
ok(await win.evaluate(()=>__sim.bk.changed())===0,'לשחר רובוט מקורי משלו');
ok(await win.evaluate(()=>localStorage.getItem('bb_paths_v1'))===null,'המסלולים של מאיה לא אצל שחר');
// מאץ׳ אמיתי נכנס לארכיון
await win.evaluate(()=>{ const S=__sim; S.MT.cd=0; S.MT.auto=0; S.MT.trans=0; S.MT.tele=4; S.matchStart(); for(let i=0;i<3;i++) S.advance(2.5,1/60); });
await win.waitForTimeout(800);
const lines=fs.readFileSync(path.join(DATA,'profiles',other,'matches.jsonl'),'utf8').trim().split('\n').filter(Boolean);
ok(lines.length===1,'המאץ׳ של שחר נשמר בארכיון ('+lines.length+')');
await win.evaluate(()=>{ __sim.statUI(); });
let txt=await win.evaluate(()=>document.getElementById('stOut').textContent);
ok(/הקבוצה — כל הנהגים/.test(txt)&&/מאיה/.test(txt)&&/שחר/.test(txt),'טבלת הקבוצה בסטטיסטיקות: מאיה ושחר');
// חזרה למאיה
rl=waitReload(win); await win.evaluate(id=>window.bbApp.profileSwitch(id),pid); await rl;
ok(await win.evaluate(()=>__sim.bk._diff().some(d=>d[0]==='wheelD'&&d[2]===120)),'חזרה למאיה: הרובוט שלו חזר');
// ארכיון בלי תקרה: 220 משחקים
await app.close();
{ const a=[]; const t0=Date.now()-300*3600e3; for(let i=0;i<220;i++) a.push(JSON.stringify({at:t0+i*3600e3,ally:'red',my:20+i%40,opp:25,win:(20+i%40)>25?1:-1,shots:10,hits:6,autoPts:10,fouls:0,faults:0,kind:'match',skill:1}));
  fs.writeFileSync(path.join(DATA,'profiles',pid,'matches.jsonl'),a.join('\n')+'\n'); }
({app,win,errs}=await launch());
await win.waitForTimeout(1000);
let r=await win.evaluate(()=>__sim.statCalc());
ok(r&&r.n===220,'סטטיסטיקות מכל 220 המשחקים (בדפדפן: עד 150) — '+(r&&r.n));
// מחיקת נהג (לא הפעיל) — לסל. (לחיצות ב-DOM: בתוכנה בלי כרטיס מסך Playwright מחכה לציור יציב יותר מ-3 שניות)
await win.evaluate(()=>document.querySelector('#profChip').click()); await win.waitForTimeout(300);
await win.evaluate(id=>document.querySelector('[data-pfdel="'+id+'"]').click(),other);
ok(await win.evaluate(id=>/בטוח/.test(document.querySelector('[data-pfdel="'+id+'"]').textContent),other),'מחיקה: לחיצה ראשונה מבקשת אישור');
await win.evaluate(id=>document.querySelector('[data-pfdel="'+id+'"]').click(),other); await win.waitForTimeout(800);
ok(J('profiles.json').list.length===1&&fs.readdirSync(path.join(DATA,'trash')).some(n=>n.startsWith(other)),'שחר עבר לסל (לא נמחק לתמיד)');
// ייבוא קבוצה
const team=JSON.stringify({bb:'team',v:1,profiles:[{name:'נועה',emoji:'🦊',store:{biobuzz_params_v1:JSON.stringify({wheelD:90}),evil:'x'},matches:[{at:1,my:50,opp:10,win:1,shots:4,hits:4}]}]});
r=await win.evaluate(t=>window.bbApp.teamImport(t),team);
ok(r.ok&&r.added[0]==='נועה','ייבוא קבוצה: נועה נוספה');
const noa=J('profiles.json').list.find(p=>p.name==='נועה');
ok(noa&&!('evil' in J('profiles/'+noa.id+'/store.json')),'מפתח זר בקובץ לא נכתב');
// ייבוא גיבוי מהדפדפן לנהג הפעיל
const bk=JSON.stringify({bb:'backup',v:1,at:Date.now(),data:{biobuzz_params_v1:JSON.stringify({wheelD:140}),bbSeason1:JSON.stringify([{at:5,my:30,opp:20,win:1,shots:5,hits:3}])}});
rl=waitReload(win); r=await win.evaluate(t=>window.bbApp.importBackup(t),bk); await rl;
ok(r.ok&&r.matches===1,'ייבוא גיבוי מהדפדפן: '+JSON.stringify(r));
ok(await win.evaluate(()=>__sim.bk._diff().some(d=>d[0]==='wheelD'&&d[2]===140)),'הגיבוי נטען — קוטר 140');
// גיבוי יומי
ok(fs.readdirSync(path.join(DATA,'backups')).some(n=>/^\d{4}-\d\d-\d\d$/.test(n)),'גיבוי יומי נוצר');
ok(await win.evaluate(()=>/BIOBUZZ \d+\.\d+\.\d+/.test(document.getElementById('appInfo').textContent)),'לוח ״האפליקציה״ מציג גרסה ותיקייה');
ok(errs.length===0,'אין שגיאות '+errs.slice(0,2).join(' | '));
await app.close();
fs.rmSync(DATA,{recursive:true,force:true});
done('app_test');
process.exit(0);
