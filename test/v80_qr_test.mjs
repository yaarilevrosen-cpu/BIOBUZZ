// v80 — מצלמת QR בלי BarcodeDetector (חלונות, לינוקס): jsQR המקומי מפענח את החבילה של 04
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const MATCH=JSON.parse(fs.readFileSync(path.join(HERE,'fixtures/scout04-match.json'),'utf8'));
const {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
const code=(o,id)=>{ const b=zlib.deflateRawSync(Buffer.from(JSON.stringify(o))).toString('base64url'); const h=Math.ceil(b.length/2); return ['A9662:1/2:'+id+':'+b.slice(0,h),'A9662:2/2:'+id+':'+b.slice(h)]; };
/* מצלמה מדומה: קנבס שמצייר קוד QR (מ־qrSvg של הסימולטור), ומשודר כזרם וידאו */
await E(()=>{
  window.__fakeCam=async texts=>{
    const cv=document.createElement('canvas'); cv.width=cv.height=640; const cx=cv.getContext('2d');
    const imgs=await Promise.all(texts.map(t=>new Promise(r=>{ const im=new Image(); im.onload=()=>r(im); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(__sim.qrSvg(t,600)); })));
    let i=0; const draw=()=>{ cx.fillStyle='#fff'; cx.fillRect(0,0,640,640); cx.drawImage(imgs[i%imgs.length],20,20,600,600); };
    draw(); const st=cv.captureStream(10); const iv=setInterval(()=>{ i++; draw(); },700); st.getTracks()[0].addEventListener('ended',()=>clearInterval(iv));
    return st; };
  window.BarcodeDetector=undefined; try{ delete window.BarcodeDetector; }catch(e){}
});

// 1. הספרייה נטענה, ובלי BarcodeDetector יש מפענח
let r=await E(async()=>({js:typeof jsQR, bd:typeof BarcodeDetector, dec:typeof await __sim.sctlDecoder()}));
ok(r.js==='function'&&r.bd==='undefined'&&r.dec==='function','Q1 jsQR נטען, ובלי BarcodeDetector יש מפענח ('+JSON.stringify(r)+')');

// 2. מפענח קוד מתוך וידאו
r=await E(async()=>{ const st=await __fakeCam(['A9662:hello-qr']); const v=document.createElement('video'); v.srcObject=st; v.muted=true; await v.play();
  await new Promise(r=>setTimeout(r,400)); const dec=await __sim.sctlDecoder(); let out=[]; for(let k=0;k<10&&!out.length;k++){ out=await dec(v); if(!out.length) await new Promise(r=>setTimeout(r,200)); }
  st.getTracks().forEach(t=>t.stop()); return out; });
ok(r.length===1&&r[0]==='A9662:hello-qr','Q2 jsQR מפענח קוד מהווידאו ('+JSON.stringify(r)+')');

// 3. כל הדרך: כפתור המצלמה ← שני חלקי החבילה ← נטענת, והמצלמה נסגרת לבד
const c=code(Object.assign({},MATCH,{generated_at:'2026-11-10T10:00:00Z'}),'cam1');
r=await E(async c=>{ const S=__sim; S.sctClear(); S.SCT.err=""; navigator.mediaDevices.getUserMedia=async()=>__fakeCam(c);
  await S.sctlCam(true); const t0=Date.now(); while(Date.now()-t0<15000&&S.SCTL.cam) await new Promise(r=>setTimeout(r,200));
  return {cam:!!S.SCTL.cam, src:S.SCTL.src, n:S.SCT.pack&&S.SCT.pack.n, err:S.SCT.err||""}; },c);
ok(!r.cam&&r.src==='qr'&&r.n>0&&!r.err,'Q3 המצלמה קוראת את שני החלקים, החבילה נטענת והמצלמה נסגרת ('+JSON.stringify(r)+')');

// 4. בלי מצלמה בכלל — הודעה ברורה, בלי קריסה
r=await E(async()=>{ const S=__sim; const g=navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia=undefined; S.SCT.err=""; await S.sctlCam(true); const e=S.SCT.err; navigator.mediaDevices.getUserMedia=g; return {e,cam:!!S.SCTL.cam}; });
ok(/המצלמה לא זמינה/.test(r.e)&&!r.cam,'Q4 בלי מצלמה — הודעה ("'+r.e+'")');

// 5. סירוב גישה — הודעה, המצלמה לא נשארת פתוחה
r=await E(async()=>{ const S=__sim; navigator.mediaDevices.getUserMedia=async()=>{ throw new DOMException('denied','NotAllowedError'); }; S.SCT.err=""; await S.sctlCam(true); return {e:S.SCT.err,cam:!!S.SCTL.cam}; });
ok(r.e==='אין גישה למצלמה'&&!r.cam,'Q5 סירוב גישה — "אין גישה למצלמה"');

// 7. BarcodeDetector קיים אבל בלי QR (קורה בחלונות) — עוברים ל־jsQR ומפענחים
r=await E(async()=>{ window.BarcodeDetector=class{ static async getSupportedFormats(){ return []; } async detect(){ throw new Error('no backend'); } };
  const st=await __fakeCam(['A9662:fallback']); const v=document.createElement('video'); v.srcObject=st; v.muted=true; await v.play(); await new Promise(r=>setTimeout(r,400));
  const dec=await __sim.sctlDecoder(); let out=[]; for(let k=0;k<10&&!out.length;k++){ out=await dec(v); if(!out.length) await new Promise(r=>setTimeout(r,200)); }
  st.getTracks().forEach(t=>t.stop()); delete window.BarcodeDetector; return out; });
ok(r[0]==='A9662:fallback','Q7 BarcodeDetector בלי QR — עוברים ל־jsQR ('+JSON.stringify(r)+')');

// 8. מצלמה תפוסה / אין מצלמה — הודעה מתאימה
r=await E(async()=>{ const S=__sim, o={}; for(const n of ['NotReadableError','NotFoundError']){ navigator.mediaDevices.getUserMedia=async()=>{ throw new DOMException('x',n); }; S.SCT.err=""; await S.sctlCam(true); o[n]=S.SCT.err; } return o; });
ok(r.NotReadableError==='המצלמה תפוסה בתוכנה אחרת'&&r.NotFoundError==='לא נמצאה מצלמה','Q8 הודעה לפי סוג התקלה ('+JSON.stringify(r)+')');

// 9. בזמן שחלון הרשות פתוח: עוצרים / סוגרים — אחרי האישור המצלמה לא נשארת דולקת
r=await E(async()=>{ const S=__sim; const live=[]; let rel;
  navigator.mediaDevices.getUserMedia=()=>new Promise(res=>{ rel=async()=>{ const st=await __fakeCam(['A9662:x']); live.push(st); res(st); }; });
  const p1=S.sctlCam(true); await new Promise(r=>setTimeout(r,50)); const wait=!!S.SCTL.camWait;
  const p2=S.sctlCam(false); await rel(); await p1; await p2; await new Promise(r=>setTimeout(r,200));
  const on=live.flatMap(s=>s.getTracks()).filter(t=>t.readyState==='live').length;
  return {wait, cam:!!S.SCTL.cam, camWait:!!S.SCTL.camWait, on, err:S.SCT.err||""}; });
ok(r.wait&&!r.cam&&!r.camWait&&r.on===0,'Q9 עצירה בזמן בקשת הרשות — אין מצלמה דולקת ואין לולאה ('+JSON.stringify(r)+')');

// 11. המחשב כבר לא של מנהל — פרטי החיבור לסקאוטינג נמחקים לבד (התמונה השמורה נשארת)
r=await E(async()=>{ const S=__sim; S.scoutAdminSet(true); await new Promise(r=>setTimeout(r,100));
  localStorage.setItem('a9662-sim-cfg',JSON.stringify({url:'https://x.supabase.co',key:'k',email:'r@example.com',pw:'p',event:''})); localStorage.setItem('a9662-sim-cache:TEST','{}');
  S.scoutAdminSet(false); await new Promise(r=>setTimeout(r,100));
  const o={cfg:localStorage.getItem('a9662-sim-cfg'), cache:localStorage.getItem('a9662-sim-cache:TEST')}; localStorage.removeItem('a9662-sim-cache:TEST'); S.scoutAdminSet(null); return o; });
ok(r.cfg===null&&r.cache==='{}','Q11 מנהל שהוסר / התנתק — פרטי החיבור נמחקים, התמונה נשארת ('+JSON.stringify(r)+')');

const re=realErrs(errs); ok(re.length===0,'Q10 בלי שגיאות בדף'+(re.length?': '+re.slice(0,3).join(' | '):''));
await browser.close(); done('v80_qr');
