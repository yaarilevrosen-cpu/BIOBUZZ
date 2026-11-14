// v81 — לוח מנהל: לשוניות לפי דרגה, דיווחי באגים (פרטים, צילום, ״טופל״, הערה, מחיקה), חשבונות (חיפוש, חסימה עם סיבה, מחיקה באישור),
// הודעה לכולם (באישור) והפס בראש המסך, סטטיסטיקה, יומן. מול api מדומה — את השרת בודק v81_admin_sql_test.sh.
import {open,ok,done,realErrs} from './h.mjs';
const {browser,page,errs}=await open({play:true});
const E=(f,a)=>page.evaluate(f,a);
const wait=ms=>page.waitForTimeout(ms);
const SETUP=()=>{ document.documentElement.classList.add('app');
  const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const W=window.__W={calls:[], owner:true,
    bugs:[{id:3,at:'2026-11-14T10:00:00Z',ver:'v80 / 1.20.0',lang:'he',platform:'Win32 · app',what:'הניקוד יורד ל-0 בסוף המשחק',steps:'שיחקתי מאץ׳ מלא',contact:'נהג 90001',shot:true,errors:2,signedIn:true,email:'driver@example.test',done:false,doneAt:'',note:''},
          {id:2,at:'2026-11-13T09:00:00Z',ver:'v79',lang:'en',platform:'MacIntel · app',what:'<img src=x onerror=window.__xss=1> הרובוט נתקע',steps:'',contact:'',shot:false,errors:0,signedIn:false,email:'',done:false,doneAt:'',note:''},
          {id:1,at:'2026-11-01T09:00:00Z',ver:'v77',lang:'he',platform:'Linux',what:'באג ישן',steps:'',contact:'',shot:false,errors:0,signedIn:false,email:'',done:true,doneAt:'2026-11-02T09:00:00Z',note:'תוקן'}],
    users:[{uid:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'owner@example.test',at:'2026-09-01T10:00:00Z',seen:new Date().toISOString(),team:'בדיקה',num:'90001',profiles:2,matches:40,lastMatch:new Date().toISOString(),bugs:0,blocked:false,reason:'',role:'owner',me:true},
           {uid:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email:'driver@example.test',at:'2026-10-01T10:00:00Z',seen:'2026-11-13T10:00:00Z',team:'בדיקה',num:'90001',profiles:1,matches:12,lastMatch:'2026-11-13T10:00:00Z',bugs:1,blocked:false,reason:'',role:'',me:false},
           {uid:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',email:'other@example.test',at:'2026-11-10T10:00:00Z',seen:'',team:'',num:'',profiles:0,matches:0,lastMatch:'',bugs:0,blocked:false,reason:'',role:'',me:false}],
    notices:[], log:[] };
  const need=o=>o&&!W.owner?{ok:false,why:'רק הבעלים יכולים לעשות את זה'}:null;
  W.api={ admin:async(op,a)=>{ W.calls.push(op+':'+JSON.stringify(a)); let n;
    if(op==='bugs'){ let L=W.bugs.filter(b=>a.state==='open'?!b.done:a.state==='done'?b.done:true); if(a.before) L=L.filter(b=>b.id<a.before);
      return {ok:true,list:L.map(b=>Object.assign({},b,W.owner?{}:{email:''}))}; }
    if(op==='bug'){ const b=W.bugs.find(x=>x.id===a.id); return b?{ok:true,bug:Object.assign({},b,{shot:b.shot?PNG:'',errors:b.errors?'TypeError: x is undefined @ sim.html:10':'',sys:b.id===3?'{\n "gpu": "test"\n}':''})}:{ok:false,why:'לא נמצא — אולי כבר נמחק'}; }
    if(op==='bugSet'){ const b=W.bugs.find(x=>x.id===a.id); if(a.done!=null) b.done=a.done; if(typeof a.note==='string') b.note=a.note; return {ok:true}; }
    if(op==='bugDelete'){ if((n=need(1))) return n; W.bugs=W.bugs.filter(x=>x.id!==a.id); W.log.unshift({id:W.log.length+1,at:new Date().toISOString(),by:'owner@example.test',action:'bug_delete',target:String(a.id),detail:''}); return {ok:true}; }
    if(op==='users'){ if((n=need(1))) return n; const L=W.users.filter(u=>!a.q||u.email.includes(a.q)||u.num.includes(a.q)); return {ok:true,total:L.length,list:L.slice(a.offset,a.offset+a.limit)}; }
    if(op==='block'){ if((n=need(1))) return n; const u=W.users.find(x=>x.uid===a.uid); u.blocked=a.block; u.reason=a.block?a.reason:''; W.log.unshift({id:W.log.length+1,at:new Date().toISOString(),by:'owner@example.test',action:a.block?'block':'unblock',target:a.uid,detail:a.reason||''}); return {ok:true}; }
    if(op==='deleteUser'){ if((n=need(1))) return n; W.users=W.users.filter(x=>x.uid!==a.uid); return {ok:true}; }
    if(op==='notices'){ if((n=need(1))) return n; return {ok:true,list:W.notices}; }
    if(op==='noticeAdd'){ if((n=need(1))) return n; W.notices.unshift({id:W.notices.length+1,at:new Date().toISOString(),he:a.he,en:a.en,until:new Date(Date.now()+a.days*864e5).toISOString(),live:true}); return {ok:true}; }
    if(op==='noticeOff'){ W.notices.find(x=>x.id===a.id).live=false; return {ok:true}; }
    if(op==='stats') return {ok:true,stats:{users:3,users_7d:1,users_30d:2,active_1d:1,active_7d:2,active_30d:3,blocked:W.users.filter(u=>u.blocked).length,teams:1,profiles:3,matches:52,matches_7d:9,bugs:3,bugs_open:W.bugs.filter(b=>!b.done).length,bugs_7d:2,
      days:Array.from({length:30},(_,i)=>({d:'2026-11-'+String(i%28+1).padStart(2,'0'),matches:i%7,players:i%3,users:i%5===0?1:0,bugs:0})),vers:[{ver:'v80 / 1.20.0',n:2},{ver:'v79',n:1}]}};
    if(op==='log'){ if((n=need(1))) return n; return {ok:true,list:W.log}; }
    return {ok:false,why:'?'}; } };
  __sim.NOTICE.stub=async()=>W.notices.filter(n=>n.live).map(n=>({id:n.id,he:n.he,en:n.en}));
};
await E(SETUP);
const txt=sel=>E(s=>{ const el=document.querySelector(s); return el?el.textContent:''; },sel);
const click=async sel=>{ await E(s=>document.querySelector(s).click(),sel); await wait(120); };

// 1. בלי הרשאה — אין כפתור, והדף סגור
let r=await E(()=>{ __sim.admNav(); __sim.admOpen(); return {nav:!!document.querySelector('#appNav [data-nav="admin"]'),t:document.getElementById('apInner').textContent,cmd:__sim.cmdkIndex().some(c=>c.id==='admin')}; });
ok(!r.nav&&/רק למנהלים/.test(r.t)&&!r.cmd,'בלי הרשאה: אין ״ניהול״ בסרגל ובחיפוש, והדף אומר שהוא רק למנהלים');
// 2. מנהל רגיל — רק באגים וסטטיסטיקה, בלי מיילים
r=await E(async()=>{ __W.owner=false; const on=__sim.admStub({owner:false},__W.api); __sim.admOpen(); await new Promise(r=>setTimeout(r,200));
  return {on,tabs:[...document.querySelectorAll('[data-admtab]')].map(b=>b.dataset.admtab),rows:document.querySelectorAll('.admBug').length,html:document.getElementById('admBody').textContent,cmd:__sim.cmdkIndex().some(c=>c.id==='admin')}; });
ok(r.on&&r.tabs.join()==='bugs,stats'&&r.cmd,'מנהל רגיל: רק ״דיווחי באגים״ ו״סטטיסטיקה״ ('+r.tabs+'), והחיפוש מציע את הדף');
ok(r.rows===2&&!/example\.test/.test(r.html),'מנהל רגיל רואה שני דיווחים פתוחים, בלי מיילים');
// 3. בעלים — כל הלשוניות
r=await E(async()=>{ __W.owner=true; __sim.admStub({owner:true},__W.api); __sim.admOpen(); await new Promise(r=>setTimeout(r,200));
  return {tabs:[...document.querySelectorAll('[data-admtab]')].map(b=>b.dataset.admtab),rows:document.querySelectorAll('.admBug').length,xss:window.__xss||0,img:document.querySelectorAll('#admBody img').length}; });
ok(r.tabs.join()==='bugs,users,notice,stats,log','בעלים: חמש לשוניות ('+r.tabs+')');
ok(r.rows===2&&!r.xss&&r.img===0,'טקסט של דיווח מוצג כטקסט ולא כ-HTML');
// פרטים של דיווח
await click('[data-admbug="3"]'); await wait(150);
r=await E(()=>({body:document.querySelector('.admBugBody').textContent,img:(document.querySelector('.admShot')||{}).src||'',pre:document.querySelectorAll('.admPre').length}));
ok(/driver@example\.test/.test(r.body)&&/שיחקתי מאץ׳ מלא/.test(r.body)&&/^data:image\/png/.test(r.img)&&r.pre===2,'פרטי דיווח: מייל (לבעלים), שחזור, צילום מסך, שגיאות ופרטי מערכת');
await page.screenshot({path:'/tmp/adm_bugs.png'});
// הערה + טופל
await E(()=>{ document.getElementById('admNote').value='תוקן ב-1.21'; }); await click('[data-adm="bugdone"]'); await wait(100);
r=await E(()=>({rows:document.querySelectorAll('.admBug').length,msg:document.getElementById('admMsg').textContent,b:__W.bugs.find(b=>b.id===3)}));
ok(r.rows===1&&/סומן שטופל/.test(r.msg)&&r.b.done&&r.b.note==='תוקן ב-1.21','״✓ סמן שטופל״ עם הערה: הדיווח יוצא מהפתוחים');
await click('[data-admbs="done"]'); await wait(150);
r=await E(()=>document.querySelectorAll('.admBug').length); ok(r===2,'הסינון ״טופלו״ מראה שניים');
// מחיקה באישור
await click('[data-admbug="1"]'); await wait(120); await click('[data-adm="bugdel"]');
r=await E(()=>({n:__W.bugs.length,t:document.querySelector('[data-adm="bugdel"]').textContent})); ok(r.n===3&&/בטוח/.test(r.t),'מחיקת דיווח: לחיצה ראשונה רק מבקשת אישור');
await click('[data-adm="bugdel"]'); r=await E(()=>__W.bugs.length); ok(r===2,'לחיצה שנייה מוחקת');
// 4. חשבונות
await click('[data-admtab="users"]'); await wait(200);
r=await E(()=>({rows:document.querySelectorAll('.admTbl tr').length-1,me:document.querySelector('.admTbl tr:nth-child(2) td.act').children.length,t:document.getElementById('admBody').textContent}));
ok(r.rows===3&&/3 חשבונות/.test(r.t.replace(/\s+/g,' ')),'חשבונות: שלושה ברשימה'); ok(r.me===0,'על החשבון של עצמי (ועל מנהלים) אין כפתורי חסימה ומחיקה');
await E(()=>{ document.getElementById('admQ').value='driver'; }); await click('[data-adm="usearch"]'); await wait(200);
r=await E(()=>document.querySelectorAll('.admTbl tr').length-1); ok(r===1,'חיפוש לפי מייל');
await click('[data-adm="block"]'); r=await E(()=>({inp:!!document.getElementById('admReason'),blk:__W.users[1].blocked})); ok(r.inp&&!r.blk,'חסימה: קודם שדה לסיבה');
await E(()=>{ document.getElementById('admReason').value='שימוש לרעה'; }); await click('[data-adm="block"]'); await wait(200);
r=await E(()=>({u:__W.users[1],t:document.getElementById('admBody').textContent,un:!!document.querySelector('[data-adm="unblock"]')}));
ok(r.u.blocked&&r.u.reason==='שימוש לרעה'&&/חסום/.test(r.t)&&r.un,'החשבון נחסם עם הסיבה, ומופיע ״שחרר חסימה״');
await page.screenshot({path:'/tmp/adm_users.png'});
await click('[data-adm="unblock"]'); await wait(200); r=await E(()=>__W.users[1].blocked); ok(!r,'שחרור חסימה');
await click('[data-adm="udel"]'); r=await E(()=>__W.users.length); ok(r===3,'מחיקת חשבון: לחיצה ראשונה רק מבקשת אישור');
await click('[data-adm="udel"]'); await wait(200); r=await E(()=>__W.users.length); ok(r===2,'לחיצה שנייה מוחקת את החשבון');
// 5. הודעה לכולם
await click('[data-admtab="notice"]'); await wait(150);
await click('[data-adm="nsend"]'); r=await txt('#admMsg'); ok(/צריך לכתוב/.test(r),'הודעה ריקה לא נשלחת');
await E(()=>{ document.getElementById('admNHe').value='יצאה גרסה חדשה'; document.getElementById('admNEn').value='A new version is out'; });
await click('[data-adm="nsend"]'); r=await E(()=>__W.notices.length); ok(r===0,'שליחה לכולם: לחיצה ראשונה רק מבקשת אישור');
await click('[data-adm="nsend"]'); await wait(300);
r=await E(()=>({n:__W.notices.length,strip:(document.getElementById('bbNotice')||{}).textContent||'',hid:(document.getElementById('bbNotice')||{hidden:true}).hidden,list:document.querySelectorAll('.admNote.live').length}));
ok(r.n===1&&r.list===1,'ההודעה נשלחה ומופיעה ברשימה כ״מוצגת״'); ok(!r.hid&&/יצאה גרסה חדשה/.test(r.strip),'הפס בראש המסך מציג את ההודעה');
await page.screenshot({path:'/tmp/adm_notice.png'});
r=await E(async()=>{ const S=__sim, el=document.getElementById('bbNotice'); S.MT.cd=0; S.matchStart(); await new Promise(r=>setTimeout(r,1800)); const inMatch=el.hidden; S.matchStop(); await new Promise(r=>setTimeout(r,1800)); return {inMatch,after:el.hidden}; });
ok(r.inMatch&&!r.after,'בזמן מאץ׳ הפס מוסתר (לא מכסה את לוח התוצאה), וחוזר כשהמאץ׳ נעצר');
await E(()=>document.querySelector('#bbNotice button').click());
r=await E(()=>({hid:document.getElementById('bbNotice').hidden,seen:localStorage.getItem('bbNoticeSeen1')})); ok(r.hid&&r.seen==='[1]','✕ סוגר את ההודעה ונשמר במחשב');
await E(()=>__sim.noticeLoad(true)); await wait(100); r=await E(()=>document.getElementById('bbNotice').hidden); ok(r,'הודעה שנסגרה לא חוזרת');
await click('[data-adm="noff"]'); await wait(200); r=await E(()=>document.querySelectorAll('.admNote.live').length); ok(r===0,'״כבה״ מכבה את ההודעה');
// 6. סטטיסטיקה ויומן
await click('[data-admtab="stats"]'); await wait(200);
r=await E(()=>({tiles:document.querySelectorAll('#admBody .hmT').length,bars:document.querySelectorAll('.admBars i').length,t:document.getElementById('admBody').textContent}));
ok(r.tiles===14&&r.bars===90&&/52/.test(r.t),'סטטיסטיקה: 14 מספרים ושלושה גרפים של 30 ימים');
await page.screenshot({path:'/tmp/adm_stats.png',fullPage:false});
await click('[data-admtab="log"]'); await wait(200);
r=await txt('#admBody'); ok(/חסימת חשבון/.test(r)&&/שחרור חסימה/.test(r)&&/מחיקת דיווח/.test(r),'היומן מציג את הפעולות בעברית');
// 7. סנכרון באמצע הקלדה לא מוחק את הטקסט; איבוד הרשאה סוגר את הדף
await click('[data-admtab="notice"]'); await wait(150);
r=await E(async()=>{ document.getElementById('admNHe').value='באמצע הקלדה'; __sim.admRefresh(); await new Promise(r=>setTimeout(r,50)); return document.getElementById('admNHe').value; });
ok(r==='באמצע הקלדה','רענון של הדף (סנכרון) לא מוחק טקסט שמקלידים');
r=await E(async()=>{ __sim.admStub(false,null); await new Promise(r=>setTimeout(r,100)); return {nav:!!document.querySelector('#appNav [data-nav="admin"]'),t:document.getElementById('apInner').textContent.slice(0,80)}; });
ok(!r.nav&&!/הודעה חדשה/.test(r.t),'איבוד ההרשאה: הכפתור נעלם והדף נסגר');
// 8. אנגלית בלי עברית
await E(()=>localStorage.setItem('bbLang1','en')); await page.reload(); await page.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000}); await wait(800); await E(SETUP);
r=await E(async()=>{ __sim.admStub({owner:true},__W.api); const bad=[];
  for(const t of ['bugs','users','notice','stats','log']){ __sim.ADM.tab=t; __sim.admOpen(); __sim.admRender(); await new Promise(r=>setTimeout(r,350));
    if(t==='bugs'){ const b=document.querySelector('[data-admbug]'); if(b){ b.click(); await new Promise(r=>setTimeout(r,250)); } }
    const w=document.createTreeWalker(document.getElementById('apInner'),NodeFilter.SHOW_TEXT); let n;
    while((n=w.nextNode())){ const p=n.parentElement; if(p.closest('[translate=no],textarea,pre,.admBugHead b,.admF>div,.admNote b,.admTbl td')) continue; if(/[֐-׿]/.test(n.nodeValue)) bad.push(t+': '+n.nodeValue.trim().slice(0,50)); }
    for(const el of document.querySelectorAll('#apInner [placeholder],#apInner [title],#apInner [aria-label]')) for(const a of ['placeholder','title','aria-label']){ const v=el.getAttribute(a); if(v&&/[֐-׿]/.test(v)&&!el.closest('.admTags,.admTbl td')) bad.push(t+' @'+a+': '+v.slice(0,50)); } }
  return bad; });
ok(r.length===0,'אנגלית: אין עברית בלוח המנהל'+(r.length?' — '+r.slice(0,12).join(' | '):''));
await page.screenshot({path:'/tmp/adm_en.png'});
ok(realErrs(errs).length===0,'אין שגיאות: '+realErrs(errs).slice(0,3).join(' | '));
await browser.close(); done('v81_admin_ui');
