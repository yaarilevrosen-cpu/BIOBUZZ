// v81 — ההודעה של 04 מ-14.11.2026 18:35: קוד חיבור אחד (A9662C:1:), וארבעת הממצאים (סיכוי תקלה, חתימה בלי generated_at,
// חבילה בלי format ובלי version, intake_side).
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const EVENT=JSON.parse(fs.readFileSync(path.join(HERE,'fixtures/scout04-event.json'),'utf8'));
const {browser,page,errs}=await open({play:true});
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.__mk=async o=>{ const cs=new CompressionStream('deflate-raw'), w=cs.writable.getWriter(); w.write(new TextEncoder().encode(typeof o==='string'?o:JSON.stringify(o))); w.close();
  const u=new Uint8Array(await new Response(cs.readable).arrayBuffer()); let b=''; for(const x of u) b+=String.fromCharCode(x);
  return 'A9662C:1:'+btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }; });
const GOOD={url:'https://example-scouting.supabase.co',key:'anon-key',email:'reader@example.test',pw:'secret-pw',event:'DEMO90001'};
// 1. קוד חיבור
let r=await E(async G=>{ const S=__sim, c=await __mk(G); const o=await S.sctlConn('  '+c+'\n');
  const bad=[]; for(const [n,x] of [['http',{...G,url:'http://evil.example.test'}],['userinfo',{...G,url:'https://user:pw@evil.example.test'}],['path',{...G,url:'https://a.example.test/x?y'}],['no key',{...G,key:''}],['no pw',{...G,pw:''}],['bad mail',{...G,email:'x'}],['array',[1]],['text','"x"']])
    if(await S.sctlConn(await __mk(x))) bad.push(n);
  return {o,len:c.length,bad,junk:await S.sctlConn('A9662C:1:!!!'),v2:await S.sctlConn(c.replace(':1:',':2:')),long:await S.sctlConn(c+'A'.repeat(4000)),
    local:!!(await S.sctlConn(await __mk({...G,url:'http://localhost:54321'}))),caps:await S.sctlConn(c.replace(/[A-Za-z]/g,ch=>ch===ch.toLowerCase()?ch.toUpperCase():ch.toLowerCase()).replace(/^a9662c/,'A9662C'))}; },GOOD);
ok(r.o&&r.o.url===GOOD.url&&r.o.key===GOOD.key&&r.o.email===GOOD.email&&r.o.pw===GOOD.pw&&r.o.event===GOOD.event,'קוד חיבור תקין (עם רווחים ו-Enter בקצוות) מחזיר את חמשת השדות');
ok(r.bad.length===0,'נדחים: כתובת http, שם משתמש בכתובת, נתיב בכתובת, בלי מפתח, בלי סיסמה, מייל לא תקין, לא אובייקט'+(r.bad.length?' — עברו: '+r.bad:''));
ok(!r.junk&&!r.v2&&!r.long,'נדחים: קוד פגום, גרסה 2, ויותר מ-4000 תווים'); ok(r.local,'localhost מותר (לבדיקות)'); ok(r.caps&&r.caps.pw===GOOD.pw,'Caps Lock בסורק — מתוקן');
// בלי הרשאת מנהל — לא מתחבר
r=await E(async G=>{ const S=__sim; const ok=await S.sctlConnUse(await __mk(G)); return {ok,err:S.SCT.err,cfg:localStorage.getItem('a9662-sim-cfg')}; },GOOD);
ok(!r.ok&&/רק למנהל/.test(r.err)&&!r.cfg,'בלי הרשאת מנהל סקאוטינג קוד החיבור לא נשמר ולא מתחבר');
// עם הרשאה: דרך שדה ה-QR (סריקה) — הפרטים נשמרים והחיבור מתחיל
r=await E(async G=>{ const S=__sim; S.scoutAdminSet(true); window.__f=[]; const of=window.fetch, ow=window.WebSocket; window.WebSocket=function(){ throw new Error('no ws in the test'); }; window.fetch=async(u,o)=>{ __f.push(String(u)); throw new Error('offline'); };
  const code=await __mk(G); const q=await S.sctlQR(code); await new Promise(r=>setTimeout(r,300));
  const cfg=JSON.parse(localStorage.getItem('a9662-sim-cfg')||'null'); const st=S.SCTL.st, has=!!S.SCTL.cfg; S.sctlForget(); window.fetch=of; window.WebSocket=ow;
  return {q,cfg,st,has,f:__f.slice(0,2),left:localStorage.getItem('a9662-sim-cfg')}; },GOOD);
ok(r.q===-9&&r.cfg&&r.cfg.pw===GOOD.pw&&r.has,'קוד חיבור דרך הסריקה: הפרטים נשמרו והחיבור התחיל');
ok(r.f.length>0&&r.f.every(u=>u.indexOf(GOOD.url)===0),'הפנייה הראשונה היא רק לכתובת שבקוד ('+(r.f[0]||'').slice(0,60)+')'); ok(!r.left,'״שכח את הפרטים״ מוחק אותם');
// שדה הקוד בחלון
r=await E(async G=>{ const S=__sim; S.sctOpen(); await new Promise(r=>setTimeout(r,150)); const i=document.getElementById('sctlConnIn'), b=document.querySelector('[data-sctl="conn"]');
  const man=document.querySelector('details.sctManual'); return {i:!!i,type:i&&i.type,b:!!b,man:!!man&&!man.open,fields:['sctlUrl','sctlKey','sctlMail','sctlPw','sctlEv'].every(x=>document.getElementById(x))}; },GOOD);
ok(r.i&&r.type==='password'&&r.b&&r.man&&r.fields,'בחלון: שדה ״קוד חיבור״ (מוסתר כמו סיסמה) ראשון, וחמשת השדות מקופלים תחת ״להקליד ביד״');
// 2. ארבעת הממצאים
r=await E(()=>{ const P=__sim.v81StuckP; return [P(0.7,0.2),P(0.7,0),P(1,0),P(0.5,0.5),P(0.2,0.95),P(0.9,undefined)]; });
ok(Math.abs(r[0]-0.125)<1e-9&&Math.abs(r[1]-0.3)<1e-9&&r[2]===0&&r[3]===0&&r[4]>=0&&r[4]<=1&&Math.abs(r[5]-0.1)<1e-9,'סיכוי תקלה: (1 − אמינות − היעדרויות) חלקי (1 − היעדרויות) — '+r.map(x=>x.toFixed(3)).join(', '));
r=await E(EV=>{ const S=__sim; S.sctClear(true); S.SCTL.lastSig=''; let n=0; const u0=S.sctUse;
  const a=JSON.parse(JSON.stringify(EV)), b=JSON.parse(JSON.stringify(EV)); b.generated_at=new Date(Date.parse(a.generated_at)+60000).toISOString();
  S.sctlEmit('poll',a,Date.now()); const s1=S.SCTL.lastSig, at1=S.SCT.pack.at; S.SCT.pack.__mark=1;
  S.sctlEmit('poll',b,Date.now()); const same=S.SCTL.lastSig===s1&&S.SCT.pack.__mark===1, at2=S.SCT.pack.at;
  const c=JSON.parse(JSON.stringify(b)); c.robots[0].measured=Object.assign({},c.robots[0].measured,{accuracy:0.11}); c.generated_at=new Date(Date.parse(b.generated_at)+60000).toISOString();
  S.sctlEmit('poll',c,Date.now()); const changed=S.SCTL.lastSig!==s1&&!S.SCT.pack.__mark;
  return {same,at1,at2,changed}; },EVENT);
ok(r.same&&r.at1!==r.at2,'חבילה שרק generated_at השתנה בה לא נבנית מחדש (רק השעה מתעדכנת)'); ok(r.changed,'שינוי אמיתי בנתונים — נבנית מחדש');
r=await E(EV=>{ const S=__sim, t=o=>{ try{ S.sctPack(o); return ''; }catch(e){ return String(e.message); } };
  const none=JSON.parse(JSON.stringify(EV)); delete none.format; delete none.version; const vOnly=JSON.parse(JSON.stringify(EV)); delete vOnly.format;
  const v2=JSON.parse(JSON.stringify(EV)); v2.version=2; return {none:t(none),vOnly:t(vOnly),full:t(EV),v2:t(v2)}; },EVENT);
ok(/format/.test(r.none),'חבילה בלי format ובלי version נדחית'); ok(r.vOnly===''&&r.full==='','חבילה מלאה, וקובץ במבנה הישן (version בלבד), נטענים'); ok(/גרסת קובץ/.test(r.v2),'גרסה 2 נדחית');
r=await E(()=>{ const S=__sim, p=x=>S.sctProf({team:90001,declared:{intake_side:x}}); const f=p('front'),b=p('back'),s=p('side'),two=p('both'),arr=p(['front','back']),no=p(undefined);
  return {f:[f.side,f.inAt],b:[b.side,b.inAt],s:[s.side,s.inAt],two:two.side,arr:arr.side,no:[no.side,no.inAt]}; });
ok(r.f.join()==='1,front'&&r.b.join()==='1,back'&&r.s.join()==='1,side'&&r.two===2&&r.arr===2&&r.no.join()==='1,','intake_side: front / back / side נשמרים (צד אחד), both או רשימה — שני צדדים ('+JSON.stringify(r)+')');
ok(realErrs(errs).filter(e=>!/offline/.test(e)).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v81_scout04');
