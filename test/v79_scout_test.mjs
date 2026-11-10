// v79 — ממצאים של 04 (08.11.2026 23:24): QR מסורק (רווחים, מקלדת בעברית, Caps Lock), חבילה ישנה לא דורסת חדשה, שורת ״אנחנו״
import {open,ok,done,realErrs} from './h.mjs';
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const MATCH=JSON.parse(fs.readFileSync(path.join(HERE,'fixtures/scout04-match.json'),'utf8'));
const {browser,page,errs}=await open({noraf:true,play:true});
const E=(f,a)=>page.evaluate(f,a);
const code=(o,id)=>{ const b=zlib.deflateRawSync(Buffer.from(JSON.stringify(o))).toString('base64url'); const h=Math.ceil(b.length/2); return ['A9662:1/2:'+id+':'+b.slice(0,h),'A9662:2/2:'+id+':'+b.slice(h)]; };
/* מה שסורק מקליד כשהמקלדת בעברית: אותיות קטנות → עבריות, ״/״ → ״.״, q → ״/״, w → ״'״ */
const HEB={e:'ק',r:'ר',t:'א',y:'ט',u:'ו',i:'ן',o:'ם',p:'פ',a:'ש',s:'ד',d:'ג',f:'כ',g:'ע',h:'י',j:'ח',k:'ל',l:'ך',z:'ז',x:'ס',c:'ב',v:'ה',b:'נ',n:'מ',m:'צ',q:'/',w:"'"};
const heb=t=>t.replace(/\//g,'.').replace(/[a-z]/g,c=>HEB[c]||c);
const caps=t=>t.replace(/[A-Za-z]/g,c=>c===c.toLowerCase()?c.toUpperCase():c.toLowerCase());

// 1. רווחים ו-Enter בקצוות
let c=code(Object.assign({},MATCH,{generated_at:'2026-11-08T10:00:00Z'}),'sp1');
let r=await E(async c=>{ const S=__sim; S.sctClear(); const a=await S.sctlQR('  '+c[0]+'\r\n'); const b=await S.sctlQR('\t'+c[1]+' \n'); return {a,b,src:S.SCTL.src}; },c);
ok(r.a===1&&r.b===0&&r.src==='qr','QR עם רווחים ו-Enter בקצוות נקלט ('+JSON.stringify(r)+')');
// 2. מקלדת בעברית
c=code(Object.assign({},MATCH,{generated_at:'2026-11-08T11:00:00Z'}),'hb2');
r=await E(async c=>{ const S=__sim; S.sctClear(); const a=await S.sctlQR(c[0]); const b=await S.sctlQR(c[1]); return {a,b,src:S.SCTL.src,n:S.SCT.pack&&S.SCT.pack.n}; },c.map(heb));
ok(r.a===1&&r.b===0&&r.n===4,'QR שהוקלד במקלדת עברית נקלט ('+JSON.stringify(r)+')');
// 3. Caps Lock
c=code(Object.assign({},MATCH,{generated_at:'2026-11-08T12:00:00Z'}),'cp3');
r=await E(async c=>{ const S=__sim; S.sctClear(); const a=await S.sctlQR(c[0]); const b=await S.sctlQR(c[1]); return {a,b,n:S.SCT.pack&&S.SCT.pack.n}; },c.map(caps));
ok(r.a===1&&r.b===0&&r.n===4,'QR עם Caps Lock נקלט ('+JSON.stringify(r)+')');
// 4. חבילה ישנה לא דורסת חדשה (QR), קובץ ישן — נטען עם אזהרה
c=code(Object.assign({},MATCH,{generated_at:'2026-11-08T09:00:00Z'}),'old4');
r=await E(async a=>{ const S=__sim; const at0=S.SCT.pack.at; const x=await S.sctlQR(a.c[0]); const y=await S.sctlQR(a.c[1]); const at1=S.SCT.pack.at, err=S.SCT.err;
  S.sctLoadText(JSON.stringify(Object.assign({},a.m,{generated_at:'2026-11-08T08:00:00Z'}))); return {y,same:at0===at1,err,fileAt:S.SCT.pack.at,warn:S.SCT.warnOld}; },{c,m:MATCH});
ok(r.y===-1&&r.same&&/ישן/.test(r.err)&&r.fileAt==='2026-11-08T08:00:00Z'&&r.warn,'QR ישן לא דורס חבילה חדשה; קובץ ישן שנבחר ביד — נטען עם אזהרה ('+JSON.stringify(r)+')');
// 5. שורת ״אנחנו״ ו״🎮 לנהוג לפי הפרופיל שלנו״
r=await E(t=>{ const S=__sim; S.sctClear(); S.SCT.ours='90001'; S.sctLoadText(t); S.scoutAdminSet&&S.scoutAdminSet(true); S.sctOpen();
  const row=document.querySelector('.sctUs'); const btn=row&&row.querySelector('[data-sctdrive="us"]'); if(btn) btn.click(); const me=S.bldMe();
  return {row:!!row, txt:row&&row.textContent.slice(0,60), name:me&&me.n, lift:me&&me.lift}; },JSON.stringify(MATCH));
ok(r.row&&/#90001/.test(r.txt)&&/פרופיל סקאוטינג/.test(r.name||''),'שורת ״אנחנו״, והרובוט שלי נבנה מהפרופיל שלנו עם סימון ('+JSON.stringify(r)+')');
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close();
done('v79_scout');
