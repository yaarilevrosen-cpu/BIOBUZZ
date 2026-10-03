// v70: לוח אסטרטגיה — חלון, גרירת רובוטים (עכבר ומגע), חץ ועט, ביטול וניקוי, שמירה וטעינה, רשת (בדיקת הודעות), ״העבר לעורך״
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({noraf:true});
page.setDefaultTimeout(0);
const E=(f,a)=>page.evaluate(f,a);
await E(()=>{ window.S=__sim; S.stageMatch(); S.SETUP.ally='red'; localStorage.removeItem('bbBoards1'); localStorage.removeItem('bbBoardCur1');
  S.BRD.tok=null; S.BRD.s=[]; S.BRD.hist=[];
  /* אינצ׳ים של הזירה ← פיקסלים על המסך */
  window.px=(x,z)=>{ const r=document.getElementById('brdCv').getBoundingClientRect(); return [r.left+(x+72)/144*r.width, r.top+(z+72)/144*r.height]; }; });
const drag=async(a,b,steps=8)=>{ const p=await E(([x,z])=>px(x,z),a), q=await E(([x,z])=>px(x,z),b);
  await page.mouse.move(p[0],p[1]); await page.mouse.down(); await page.mouse.move(q[0],q[1],{steps}); await page.mouse.up(); };

// 1. פתיחה מהכרטיס, מהחיפוש, ו-Esc סוגר
let r=await E(()=>{ document.getElementById('ppBoard').click(); const m=document.getElementById('brdBox'), cv=document.getElementById('brdCv');
  return {open:!m.hidden&&S.BRD.open, w:cv.getBoundingClientRect().width, cw:cv.width}; });
ok(r.open&&r.w>=200&&r.cw>=200,'הלוח נפתח מכרטיס ״לוח אסטרטגיה״ (קנבס '+Math.round(r.w)+' פיקסלים, '+r.cw+' בזיכרון)');
await page.waitForTimeout(120);
r=await E(()=>{ const a=document.activeElement; return !!(a&&document.getElementById('brdBox').contains(a)); });
ok(r,'המיקוד עבר לתוך החלון');
await page.keyboard.press('Escape');
r=await E(()=>({hidden:document.getElementById('brdBox').hidden, open:S.BRD.open}));
ok(r.hidden&&!r.open,'Esc סוגר את הלוח');
r=await E(()=>{ S.CMDK.list=S.cmdkIndex(); const L=S.cmdkSearch('אסטרטגיה'); const i=L.findIndex(c=>c.id==='board'); S.CMDK.res=L; S.cmdkRun(i);
  return {i, open:!document.getElementById('brdBox').hidden}; });
ok(r.i>=0&&r.open,'בחיפוש: ״לוח אסטרטגיה״ נמצא ופותח (מקום '+(r.i+1)+')');

// 2. רובוטים: ״אני״ בעמדת הפתיחה, גרירה בעכבר ובמגע
r=await E(()=>({tok:S.BRD.tok.map(q=>q.slice()), mine:S.brdMine(), lab:[0,1,2,3].map(S.brdLabel), st:S.autoStartPose()}));
ok(r.mine===0&&r.tok[0][0]===r.st.x&&r.tok[0][1]===r.st.z&&r.lab.join()==='אני,שותף,יריב 1,יריב 2','״אני״ בעמדת הפתיחה ('+r.tok[0].join(', ')+'), תוויות: '+r.lab.join(' / '));
const t0=r.tok[0];
r=await E(()=>S.BRD.tool); ok(r==='move','כלי ברירת המחדל: הזזה');
await drag(t0,[t0[0]+10,t0[1]-20]);
r=await E(()=>({t:S.BRD.tok[0].slice(), h:S.BRD.hist.length}));
ok(Math.abs(r.t[0]-(t0[0]+10))<1.2&&Math.abs(r.t[1]-(t0[1]-20))<1.2&&r.h===1,'גרירה בעכבר: ״אני״ זז ל-('+r.t.join(', ')+') — ציפינו ('+(t0[0]+10)+', '+(t0[1]-20)+')');
r=await E(()=>{ const cv=document.getElementById('brdCv'), q=S.BRD.tok[1].slice(); const a=px(q[0],q[1]), b=px(q[0]+12,q[1]+6);
  const ev=(type,x,y)=>cv.dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true,button:0,buttons:type==='pointerup'?0:1}));
  ev('pointerdown',a[0],a[1]); for(let k=1;k<=5;k++) ev('pointermove',a[0]+(b[0]-a[0])*k/5,a[1]+(b[1]-a[1])*k/5); ev('pointerup',b[0],b[1]);
  return {from:q, to:S.BRD.tok[1].slice()}; });
ok(Math.abs(r.to[0]-(r.from[0]+12))<1.2&&Math.abs(r.to[1]-(r.from[1]+6))<1.2,'גרירה במגע: ״שותף״ מ-('+r.from.join(', ')+') ל-('+r.to.join(', ')+')');
await E(()=>{ S.brdUndo(); S.brdUndo(); });
r=await E(()=>S.BRD.tok[0].slice());
ok(r[0]===t0[0]&&r[1]===t0[1],'ביטול מחזיר את הרובוטים למקום');

// 3. חץ ועט
await E(()=>document.querySelector('[data-brdt="arrow"]').click());
await drag(t0,[-40,30]);
await E(()=>document.querySelector('[data-brdc="1"]').click());
await E(()=>document.querySelector('[data-brdt="pen"]').click());
{ const p=await E(()=>px(0,-40)); await page.mouse.move(p[0],p[1]); await page.mouse.down();
  for(let k=1;k<=200;k++){ const q=await E(([k])=>px(30*Math.cos(k/20)-0,-40+20*Math.sin(k/20)+k*0.1),[k]); await page.mouse.move(q[0],q[1]); }
  await page.mouse.up(); }
r=await E(()=>S.BRD.s.map(s=>({k:s.k,c:s.c,n:s.p.length/2,p:s.p.slice(0,4)})));
ok(r.length===2&&r[0].k==='a'&&r[0].c===0&&Math.abs(r[0].p[2]+40)<1.2&&Math.abs(r[0].p[3]-30)<1.2,'חץ אדום מ״אני״ אל (-40, 30): '+JSON.stringify(r[0]&&r[0].p));
ok(r[1]&&r[1].k==='p'&&r[1].c===1&&r[1].n>=10&&r[1].n<=60,'קו עט כחול: '+(r[1]&&r[1].n)+' נקודות (תקרה 60, 200 תנועות)');

// 4. מחק קו, ביטול, ניקוי
await E(()=>document.querySelector('[data-brdt="erase"]').click());
{ const s=await E(()=>S.BRD.s[1].p.slice(0,2)); await drag(s,[s[0]+0.5,s[1]],2); }
r=await E(()=>S.BRD.s.map(s=>s.k).join());
ok(r==='a','המחק מוחק קו שלם (נשאר: '+r+')');
await E(()=>document.querySelector('[data-brd="undo"]').click());
r=await E(()=>S.BRD.s.map(s=>s.k).join());
ok(r==='a,p','״בטל״ מחזיר את הקו שנמחק ('+r+')');
await E(()=>document.querySelector('[data-brd="clear"]').click());
r=await E(()=>S.BRD.s.length);
ok(r===0,'״נקה קווים״ — 0 קווים');
await page.keyboard.press('Control+z');
r=await E(()=>({n:S.BRD.s.length, open:S.BRD.open}));
ok(r.n===2&&r.open,'Ctrl+Z מחזיר את שני הקווים, והלוח נשאר פתוח');

// 5. שמירה וטעינה (עם תקרה)
r=await E(()=>{ document.getElementById('brdName').value='תוכנית א'; document.querySelector('[data-brd="save"]').click();
  const saved=JSON.parse(localStorage.getItem('bbBoards1'))['תוכנית א'];
  S.brdClear(); S.brdApply({o:'tok',i:3,x:0,z:0});
  const sel=document.getElementById('brdSel'); sel.value='תוכנית א'; document.querySelector('[data-brd="load"]').click();
  return {saved:saved&&saved.s.length, n:S.BRD.s.length, t3:S.BRD.tok[3].slice(), msg:document.getElementById('brdMsg').textContent,
    opts:[...sel.options].map(o=>o.value)}; });
ok(r.saved===2&&r.n===2&&r.t3.join()!=='0,0'&&/נטען/.test(r.msg),'נשמר ונטען: '+r.n+' קווים, יריב 2 חזר ל-('+r.t3.join(', ')+') · ״'+r.msg+'״');
r=await E(()=>{ const res=[]; for(let i=0;i<13;i++) res.push(S.brdSave('ל'+i)); const n=Object.keys(S.brdLib()).length; const msg=document.getElementById('brdMsg').textContent;
  S.brdDel('ל0'); return {res, n, after:Object.keys(S.brdLib()).length, msg}; });
ok(r.res.filter(Boolean).length===11&&r.n===12&&r.after===11&&/עד 12/.test(r.msg),'תקרה: 12 לוחות שמורים ('+r.res.filter(Boolean).length+' חדשים נשמרו + 1), השלושה־עשר נדחה · מחיקה ← '+r.after);
r=await E(()=>{ for(let i=0;i<45;i++) S.brdAddStroke('a',0,[0,0,i,i]); return S.BRD.s.length; });
ok(r===40,'תקרה: עד 40 קווים בלוח ('+r+')');
r=await E(()=>{ localStorage.setItem('bbBoards1',JSON.stringify({bad:{tok:[[1e9,0]],s:[]}, bad2:'x', good:{tok:[[0,0],[1,1],[2,2],[3,3]],s:[{id:'a-1',k:'a',c:0,p:[0,0,'5',5]}]}}));
  const L=S.brdLib(); return {keys:Object.keys(L), s:L.good&&L.good.s.length}; });
ok(r.keys.join()==='good'&&r.s===0,'אחסון פגום נזרק (נשאר: '+r.keys.join()+', קווים לא תקינים: 0)');

// 6. רשת: מארח — הודעות טובות וזדוניות מאורח
r=await E(()=>{ const sent=[]; S.setNetMode('host',{readyState:1,send:s=>{ if(typeof s==='string') sent.push(JSON.parse(s)); }});
  S.brdApply({o:'all',tok:[[-60,58],[-60,-58],[60,-58],[60,58]],s:[]}); S.BRD.bad=0;
  const g=m=>S.netFromGuest('g1',Object.assign({t:'brd'},m));
  g({o:'tok',i:1,x:10,z:5});
  g({o:'add',s:{id:'q-1',k:'a',c:1,p:[0,0,20,20]}});
  S.netOnMsg(JSON.stringify({t:'g',id:'g1',m:{t:'brd',o:'add',s:{id:'q-2',k:'p',c:0,p:[1,1,2,2,3,3]}}}));
  const good={tok1:S.BRD.tok[1].slice(), n:S.BRD.s.length, relay:sent.filter(m=>m.t==='brd'&&m.to==='*').length};
  const before=JSON.stringify([S.BRD.tok,S.BRD.s]);
  const bad=[{o:'tok',i:1,x:'10',z:5},{o:'tok',i:5,x:1,z:1},{o:'tok',i:'1',x:1,z:1},{o:'tok',i:1,x:1e9,z:1},{o:'tok',i:1,x:null,z:1},
    {o:'add',s:{id:'<img onerror=x>',k:'a',c:0,p:[0,0,1,1]}},{o:'add',s:{id:'z-1',k:'x',c:0,p:[0,0,1,1]}},{o:'add',s:{id:'z-2',k:'a',c:2,p:[0,0,1,1]}},
    {o:'add',s:{id:'z-3',k:'p',c:0,p:new Array(1000).fill(1)}},{o:'add',s:{id:'z-4',k:'a',c:0,p:[0,0,1,'1']}},{o:'add',s:{id:'z-5',k:'a',c:0,p:[0,0,1]}},
    {o:'add',s:{id:'z-6',k:'a',c:0,p:{length:4}}},{o:'add',s:'x'},{o:'del',id:{toString:1}},{o:'del',id:'a'.repeat(40)},{o:'eval',x:1},
    {o:'all',tok:[[0,0],[0,0],[0,0],[0,0]],s:[]}, {o:'add',s:{id:'z-7\u0000',k:'a',c:0,p:[0,0,1,1]}}];
  for(const m of bad) g(m);
  S.netOnMsg(JSON.stringify({t:'g',id:'g1',m:null})); S.netFromGuest('g1',{t:'brd'}); S.netFromGuest('g1',{t:'brd',o:'tok',i:1,x:[1],z:1});
  const after=JSON.stringify([S.BRD.tok,S.BRD.s]);
  /* מאות הודעות בשנייה מאורח אחד — חלק נדחות */
  let acc=0; for(let k=0;k<300;k++) if(S.brdNetIn({t:'brd',o:'tok',i:2,x:k%60,z:1},'g2')) acc++;
  return {good, same:before===after, bad:S.BRD.bad, nBad:bad.length, acc}; });
ok(r.good.tok1.join()==='10,5'&&r.good.n===2&&r.good.relay===3,'מארח: הודעות טובות מאורח הוחלו (שותף ב-'+r.good.tok1.join(', ')+', '+r.good.n+' קווים) והועברו לכולם ('+r.good.relay+')');
ok(r.same&&r.bad>=r.nBad,'מארח: '+r.nBad+' הודעות זדוניות/פגומות נדחו ('+r.bad+' נספרו), הלוח לא השתנה');
ok(r.acc>=90&&r.acc<=140,'מארח: הגבלת קצב לאורח — '+r.acc+' מתוך 300 הודעות רצופות התקבלו');
r=await E(()=>{ const sent=[]; S.setNetMode('host',{readyState:1,send:s=>{ if(typeof s==='string') sent.push(JSON.parse(s)); }});
  S.netOnMsg(JSON.stringify({t:'gj',id:'g9',name:'דני'}));
  const all=sent.find(m=>m.t==='brd'&&m.o==='all'); S.netOnMsg(JSON.stringify({t:'gl',id:'g9'}));
  S.brdAddStroke('a',0,[-10,-10,-20,-20]); const add=sent.find(m=>m.t==='brd'&&m.o==='add');
  return {all:all&&all.to, n:all&&all.s.length, seat:sent.some(m=>m.t==='seat'), add:add&&add.to, len:add?JSON.stringify(add).length:0}; });
ok(r.all==='g9'&&r.n===2&&r.seat,'אורח חדש מקבל את כל הלוח (2 קווים) — וגם את העמדה שלו כרגיל');
ok(r.add==='*'&&r.len<300,'קו חדש אצל המארח נשלח לכולם ('+r.len+' בתים)');

// 7. רשת: אורח — מקבל מהמארח בלבד, ושולח פעולות קטנות
r=await E(()=>{ const sent=[]; S.setNetMode('guest',{readyState:1,send:s=>{ if(typeof s==='string') sent.push(JSON.parse(s)); }}); S.BRD.bad=0;
  const all={t:'brd',o:'all',tok:[[-50,50],[-50,-50],[50,-50],[50,50]],s:[{id:'h-1',k:'a',c:1,p:[0,0,10,10]}]};
  S.netOnMsg(JSON.stringify(all)); const got={n:S.BRD.s.length, t0:S.BRD.tok[0].join()};
  const big={t:'brd',o:'all',tok:all.tok,s:Array.from({length:41},(_,i)=>({id:'h-'+i,k:'a',c:0,p:[0,0,1,1]}))};
  S.netOnMsg(JSON.stringify(big)); S.netOnMsg(JSON.stringify({t:'brd',o:'all',tok:[[0,0]],s:[]})); S.netOnMsg('{"t":"brd","o":"tok","i":0,"x":1e400,"z":0}');
  const kept=S.BRD.s.length===1&&S.BRD.tok[0].join()==='-50,50';
  S.netOnMsg(JSON.stringify({t:'pong',c:performance.now()-20})); const rtt=S.NET.rtt;
  S.brdAddStroke('p',1,[0,0,5,5,10,0]); S.brdLoad('good');
  const kinds=sent.filter(m=>m.t==='brd').map(m=>m.o); const maxLen=Math.max(...sent.map(m=>JSON.stringify(m).length));
  return {got, kept, bad:S.BRD.bad, rtt, kinds, maxLen, noTo:sent.every(m=>!('to' in m))}; });
ok(r.got.n===1&&r.got.t0==='-50,50','אורח: הלוח מהמארח התקבל ('+r.got.n+' קו, אני ב-'+r.got.t0+')');
ok(r.kept&&r.bad>=3,'אורח: לוח עם 41 קווים, רובוטים חסרים ומספר אינסופי — נדחו ('+r.bad+')');
ok(r.rtt>0,'אורח: הודעות אחרות (pong) עדיין עובדות — RTT '+Math.round(r.rtt)+' מ״ש');
ok(r.noTo&&r.kinds[0]==='add'&&r.kinds.includes('clr')&&r.kinds.filter(k=>k==='tok').length===4&&r.maxLen<2000,'אורח: קו נשלח כ״add״, טעינת לוח כרצף clr + 4 tok + add (הכי ארוכה '+r.maxLen+' בתים, גבול הגשר 2000)');
await E(()=>S.setNetMode('solo',null));

// 8. ״העבר לעורך״
r=await E(()=>{ S.brdApply({o:'all',tok:[[0,0],[-60,-58],[60,-58],[60,58]],s:[]}); S.BRD.hist=[]; S.brdResetTok();
  const me=S.BRD.tok[0], H=S.hiveRed.group.position, hx=+(S.I(H.x)).toFixed(1), hz=+(S.I(H.z)).toFixed(1);
  const free=[[-30,10],[-45,5],[-50,-15],[-35,22],[-25,25]].find(q=>!S.pathBlocked(q[0],q[1]));
  const ends=[[-40,40],free,[hx,hz]];
  S.brdAddStroke('a',0,[me[0]+2,me[1]-1,ends[0][0],ends[0][1]]);
  S.brdAddStroke('a',0,[ends[0][0]+1,ends[0][1],ends[1][0],ends[1][1]]);
  S.brdAddStroke('a',0,[ends[1][0],ends[1][1]+2,ends[2][0],ends[2][1]]);
  S.brdAddStroke('a',1,[50,50,30,30]);   /* לא מחובר לרובוט שלי */
  const blockedEnd=S.pathBlocked(hx,hz);
  const res=S.brdToEditor(); const st=S.autoStartPose();
  const user=S.PATH.pts.filter(p=>!p.auto);
  return {ends, blockedEnd, st, user:user.map(p=>[p.x,p.z]), all:S.PATH.pts.map(p=>[p.x,p.z]), legal:S.PATH.pts.slice(1).every(p=>!S.pathBlocked(p.x,p.z)),
    moved:res.moved, ws:document.body.dataset.ws, open:S.BRD.open, warn:S.PATH.warn}; });
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
ok(r.user.length===4&&r.user[0][0]===r.st.x&&r.user[0][1]===r.st.z,'המסלול מתחיל בעמדת הפתיחה ('+r.st.x+', '+r.st.z+') ויש 3 נקודות מהחצים: '+JSON.stringify(r.user));
ok(d(r.user[1],r.ends[0])<0.2&&d(r.user[2],r.ends[1])<0.2,'נקודות 1–2 = קצות החצים בשרשרת ('+r.user[1].join(', ')+' · '+r.user[2].join(', ')+')');
ok(r.blockedEnd&&r.moved===1&&d(r.user[3],r.ends[2])<16,'חץ שנגמר בתוך הכוורת — הנקודה הוזזה למקום פנוי קרוב ('+r.user[3].join(', ')+', '+d(r.user[3],r.ends[2]).toFixed(1)+'″)');
ok(r.legal,'כל נקודות המסלול ('+r.all.length+' כולל עקיפות) חוקיות לפי pathBlocked');
ok(r.ws==='auto'&&!r.open&&/הועבר מלוח האסטרטגיה/.test(r.warn),'הלוח נסגר ועוברים לעורך האוטונומי: ״'+r.warn+'״');
r=await E(()=>{ S.brdOpen(); S.brdClear(); const x=S.brdToEditor(); return {x, msg:document.getElementById('brdMsg').textContent, open:S.BRD.open}; });
ok(r.x===null&&/אין חץ/.test(r.msg)&&r.open,'בלי חץ מהרובוט שלי — הודעה, והלוח נשאר פתוח');
r=await E(()=>{ S.SETUP.ally='blue'; S.brdResetTok(); const m=S.brdMine(), st=S.autoStartPose(); const t=S.BRD.tok[m]; S.SETUP.ally='red'; return {m,t,st}; });
ok(r.m===2&&r.t[0]===r.st.x&&r.t[1]===r.st.z,'בברית הכחולה ״אני״ הוא כחול 1 — בעמדת הפתיחה ('+r.t.join(', ')+')');
await E(()=>S.brdClose());

ok(realErrs(errs).length===0,'אין שגיאות בקונסול'+(realErrs(errs).length?': '+realErrs(errs).slice(0,3).join(' | '):''));
await browser.close();
done('v70_board');
