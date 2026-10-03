// v70: מתכנן אוטונומי 2 — חיפוש מבני (הוספה/הוצאה/החלפה של אבני בניין) + ״הסבר את התוצאה״ עם עוזר מדומה
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; S.stageMatch(); S.SETUP.ally='red'; });

// 1. רצף סביר — בדיקת הכללים עצמם
let r=await E(()=>({a:S.optSeqOk([]), b:S.optSeqOk(['P']), c:S.optSeqOk(['S','S','P']), d:S.optSeqOk(['S','P','F1']), e:S.optSeqOk(['S','F1','F2','S','P']), f:S.optSeqOk(['S','F1','S','F1','S','F2','S','F1','P'])}));
ok(!r.a&&!r.b&&!r.c&&!r.d&&r.e&&!r.f,'רצף ריק, רק חניה, אותה אבן פעמיים ברצף, חניה באמצע ויותר מ-8 — נדחים; ״ירי, פרח, פרח, ירי, חניה״ מותר');

// 2. שינויי רצף: התחלה קבועה, חניה אחרונה, G402, seq תואם לנקודות, ואותו זרע = אותה תוצאה
r=await E(()=>{ const seqs=[['S','P'],['S','F1','S','P'],['S','F2','S','F1','S','P'],['S','F1','S','F2','S'],['L','P']];
  const out={n:0, valid:0, start:0, park:0, g402:0, match:0, det:0, changed:0, ops:{}, bad:[]};
  for(const sq of seqs){ const base=S.genPts(sq); const hasP=sq.includes('P');
    for(let i=0;i<40;i++){ S.OPT.op=null; const q=S.optMutateSeq(base,S.optRng(500+i)); const op=S.OPT.op; const q2=S.optMutateSeq(base,S.optRng(500+i));
      if(!q) continue; out.n++; out.ops[op]=(out.ops[op]||0)+1;
      if(JSON.stringify(q)===JSON.stringify(q2)) out.det++;
      const seq=S.optSeqOf(q); if(S.optSeqOk(seq)) out.valid++; else out.bad.push(seq.join(''));
      if(seq.join()!==sq.join()) out.changed++;
      if(q[0].x===base[0].x&&q[0].z===base[0].z&&q[0].h===base[0].h) out.start++;
      if(hasP?(q[q.length-1].act==='park'&&q.filter(p=>p.act==='park').length===1):!q.some(p=>p.act==='park')) out.park++;
      if(q.every((p,k)=>!(p.act==='shoot'||p.act==='shootspot')||(p.x<=-10&&Math.abs(p.x)<=62&&Math.abs(p.z)<=62))) out.g402++;
      const actOk={S:a=>a==='shoot'||a==='shootspot',F1:a=>a==='flower',F2:a=>a==='flower',P:a=>a==='park',L:a=>a==='wait'};
      if(q.slice(1).every((p,k)=>p.blk===seq[k]&&actOk[seq[k]]&&actOk[seq[k]](p.act))) out.match++; } }
  /* שיעור שינויי הרצף בצעד הרגיל של החיפוש */
  let st=0; const rr=S.optRng(42), b=S.genPts(['S','F1','S','P']); for(let i=0;i<300;i++){ S.optStep(b,10,rr); if(S.OPT.op!=='move') st++; }
  out.rate=st/300; return out; });
ok(r.n>=180,'כמעט כל ניסיון מחזיר שינוי רצף ('+r.n+'/200)');
ok(r.valid===r.n&&r.changed===r.n,'כל הרצפים סבירים ושונים מהמקור ('+r.valid+'/'+r.n+')'+(r.bad.length?' · '+r.bad.slice(0,3).join(','):''));
ok(r.start===r.n,'עמדת הפתיחה אף פעם לא זזה ולא נמחקת ('+r.start+'/'+r.n+')');
ok(r.park===r.n,'החניה תמיד אחרונה ויחידה, ולא נוספת לרצף בלי חניה ('+r.park+'/'+r.n+')');
ok(r.g402===r.n,'כל עמדות הירי בצד שלי, לפחות 10″ מהאמצע (G402) ובתוך הזירה ('+r.g402+'/'+r.n+')');
ok(r.match===r.n,'seq תואם לנקודות האמיתיות — אות ופעולה לכל נקודה ('+r.match+'/'+r.n+')');
ok(r.det===r.n,'אותו זרע — אותו רצף ('+r.det+'/'+r.n+')');
ok((r.ops.ins|0)>0&&(r.ops.del|0)>0&&(r.ops.swap|0)>0,'שלושת סוגי השינוי מופיעים: הוספה '+(r.ops.ins|0)+' · הוצאה '+(r.ops.del|0)+' · החלפה '+(r.ops.swap|0));
ok(r.rate>0.18&&r.rate<0.36,'בערך רבע מהצעדים משנים רצף: '+(100*r.rate).toFixed(0)+'%');

// 3. חיפוש קצר: התוצאה בראש הרשימה, השם והרצף תואמים לנקודות, והזירה חוזרת למצבה
r=await E(async()=>{ S.pathClear(); S.pathAdd(-30,40); S.pathAdd(-20,20); const before=JSON.stringify(S.PATH.pts.map(p=>[p.x,p.z]));
  /* כדי שהבדיקה תהיה קצרה: המחולל רק על שני רצפים, והמתכנן מתחיל מהם */
  const t=performance.now(); await S.genRun({only:[1,3]}); const g=await S.optRun({n:5, seed:11});
  const top=S.GEN.res[0], pts=top.pts.filter(p=>!p.auto);
  return {ms:Math.round(performance.now()-t), opt:!!top.opt, name:top.name, nameOk:top.name==='🔍 משופר: '+S.optName(top.seq), seqOk:S.optSeqOf(pts).join()===top.seq.join(),
    validSeq:S.optSeqOk(top.seq), parkLast:!top.seq.includes('P')||top.seq[top.seq.length-1]==='P', total:top.total, hits:top.hits, shots:top.shots,
    tries:S.OPT.tries, sTries:S.OPT.sTries, running:S.OPT.running||S.GEN.running, match:S.MATCH.on, after:JSON.stringify(S.PATH.pts.map(p=>[p.x,p.z])), before,
    x:S.OPT.x, out:document.getElementById('oOpt').textContent}; });
ok(r.opt&&r.nameOk&&r.seqOk,'בראש הרשימה: '+r.name+' — השם והרצף תואמים לנקודות');
ok(r.validSeq&&r.parkLast,'הרצף של התוצאה סביר והחניה אחרונה ('+r.total+' נק׳ · '+r.hits+'/'+r.shots+' פגיעות)');
ok(r.tries>=5&&!r.running&&!r.match&&r.after===r.before,'נבדקו '+r.tries+' ריצות ('+r.sTries+' שינויי רצף) ב-'+Math.round(r.ms/1000)+' שנ׳; בסוף לא רץ, אין מאץ׳, והעורך לא השתנה');
ok(r.x&&r.x.before&&r.x.after&&Array.isArray(r.x.shootSpots)&&/הסתיים/.test(r.out),'יש סיכום להסבר: לפני '+(r.x&&r.x.before.seq)+' ('+(r.x&&r.x.before.points)+') · אחרי '+(r.x&&r.x.after.seq)+' ('+(r.x&&r.x.after.points)+')');

// 4. ״הסבר את התוצאה״ — מוסתר בלי בינה מלאכותית
r=await E(()=>{ S.optUI(); const row=document.getElementById('optAiRow'); return {hidden:row.hidden, disp:getComputedStyle(row).display, ai:S.aiOn()}; });
ok(!r.ai&&r.hidden&&r.disp==='none','בלי מפתח — הכפתור מוסתר ('+r.disp+')');

// 5. עם עוזר מדומה: מופיע, שולח רק מספרים (בלי שמות), ומציג את התשובה
r=await E(async()=>{ S.APP.profile=Object.assign({},S.APP.profile,{name:'ישראל ישראלי'}); S.APP.on=true; S.AIST.st={ok:true};
  window.__calls=[]; window.bbApp=Object.assign(window.bbApp||{},{aiAsk:async(kind,o)=>{ window.__calls.push({kind,o:JSON.parse(JSON.stringify(o))}); return {ok:true,text:'**המסלול השתפר** כי עמדת הירי קרובה יותר לכוורת.\n- נסו אותה ברובוט האמיתי.'}; }});
  S.aiGate(); S.optUI(); const row=document.getElementById('optAiRow'); const vis=!row.hidden&&getComputedStyle(row).display!=='none';
  document.getElementById('bOptExplain').click(); await new Promise(res=>setTimeout(res,200));
  const out=document.getElementById('oOptAi'), c=window.__calls[0], payload=c?JSON.stringify(c.o):'';
  const res={vis, n:window.__calls.length, kind:c&&c.kind, lang:c&&c.o.lang, txt:out.textContent, outHidden:out.hidden||getComputedStyle(out).display==='none',
    heb:/[֐-׿]/.test(payload), name:/ישראל|Apollo|9662/.test(payload), hasNums:/points/.test(payload)&&/movedIn/.test(payload)&&/timeLeftSec/.test(payload), len:payload.length};
  /* חזרה למצב רגיל */
  S.APP.on=false; S.AIST.st=null; delete window.bbApp; S.aiGate(); S.optUI(); res.after=document.getElementById('optAiRow').hidden; return res; });
ok(r.vis,'עם מפתח עובד — הכפתור ״הסבר את התוצאה״ מופיע');
ok(r.n===1&&r.kind==='helper'&&r.lang==='he','נשלחה שאלה אחת לעוזר המהיר (helper), בשפה '+r.lang);
ok(!r.heb&&!r.name&&r.hasNums,'נשלחו רק מספרים ואותיות של אבני בניין — בלי עברית, בלי שם נהג או קבוצה ('+r.len+' תווים)');
ok(!r.outHidden&&/המסלול השתפר/.test(r.txt)&&!/\*\*/.test(r.txt)&&/• נסו/.test(r.txt),'התשובה מוצגת בעברית בתיבה קטנה, נקייה מסימני הדגשה: '+r.txt.slice(0,40));
ok(r.after,'אחרי שהמפתח יורד — הכפתור שוב מוסתר');

ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
await browser.close(); done('v70_plan_test');
