// v76 ui — מסך משחק נקי, פס תוצאה, כרטיס סיום, שפת חלות דבש, סקינים, הגדרות, סטטיסטיקה ריקה, טלפון וחלון צר,
// מצלמה עוקבת שקופה, וביצועים (צל, תקציב פיקסלים, רשימת שלטים, מארח ברקע, השהיית אורח מסתגלת)
import {open,ok,done,realErrs,URL0} from './h.mjs';
import {chromium} from 'playwright';

const ovl=(a,b)=>a&&b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1;
const RECT=`s=>{ const e=typeof s==='string'?document.querySelector(s):s; if(!e||!e.getClientRects().length||getComputedStyle(e).display==='none') return null; const r=e.getBoundingClientRect(); return {l:r.left,r:r.right,t:r.top,b:r.bottom}; }`;

/* ── 1. מעבדה: שכבה אחת, ״מדדים״, מחסנית כפולה ── */
{
  const {browser,page,errs}=await open({noraf:true});
  const E=(f,a)=>page.evaluate(f,a);
  const vis=id=>E(id=>{ const e=document.getElementById(id); return !!e&&!!e.getClientRects().length&&getComputedStyle(e).display!=='none'; },id);
  ok(!(await vis('telem'))&&!(await vis('keys'))&&(await vis('v76Met')),'מעבדה: הטלמטריה והמקשים מקופלים, כפתור ״📊 מדדים״ גלוי');
  await E(()=>document.getElementById('v76Met').click());
  ok((await vis('telem'))&&(await vis('keys'))&&await E(()=>document.getElementById('v76Met').getAttribute('aria-pressed')==='true'),'״מדדים״ פותח את שתיהן יחד');
  let r=await E(`(${RECT})('#v76Met')`); const t=await E(`(${RECT})('#telem')`);
  ok(r&&t&&!ovl(r,t),'הכפתור לא מכסה את הטלמטריה');
  await E(()=>document.getElementById('v76Met').click());
  ok(!(await vis('telem'))&&await E(()=>JSON.parse(localStorage.getItem('bbHud1')).telem===true),'לחיצה שנייה מקפלת, והמצב נשמר כמו ב״תצוגה״');
  r=await E(()=>{ const c=document.querySelector('#hchips .chip.mag'); const a=getComputedStyle(c).display; __sim.HUD.off.mag=true; document.body.classList.add('hud-mag'); const b=getComputedStyle(c).display; document.body.classList.remove('hud-mag'); __sim.HUD.off.mag=false; return {a,b}; });
  ok(r.a==='none'&&r.b!=='none','המחסנית בכותרת מוסתרת כשלוח המחסנית גלוי, וחוזרת כשמסתירים אותו ('+r.a+'/'+r.b+')');
  /* ״אוטונומי״: הבורר ״הרובוט שלי״ לא חתוך */
  r=await E(()=>{ __sim.uiSetMode('lab'); document.querySelector('#wsrail [data-go=auto]')&&document.querySelector('#wsrail [data-go=auto]').click();
    const row=document.querySelector('#autoRows .autorow'); if(!row) return null; row.closest('details')&&(row.closest('details').open=true);
    return [...row.querySelectorAll('button')].map(b=>{ const q=b.getBoundingClientRect(), s=row.getBoundingClientRect(); return b.getClientRects().length?(q.left<s.left-1||q.right>s.right+1||b.scrollWidth>b.clientWidth+2):false; }); });
  ok(r&&r.length===5&&r.every(x=>!x),'בורר האוטונומי של ״הרובוט שלי״: חמש אפשרויות, אף אחת לא חתוכה');
  ok(realErrs(errs).length===0,'מעבדה בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await browser.close();
}

/* ── 2. מאץ׳ במצב ״משחק״: פס תוצאה, לוח רזה, תאורה, כרטיס סיום ── */
{
  const {browser,page,errs}=await open({noraf:true,play:true});
  const E=(f,a)=>page.evaluate(f,a);
  await E(()=>{ window.S=__sim; S.MT.cd=3; S.matchStart(); S.advance(0.6,1/60); });
  let r=await E(()=>({cls:document.getElementById('banner').className, big:document.getElementById('bannerBig').textContent, sb:document.getElementById('v76Score').className}));
  ok(/\bcd\b/.test(r.cls)&&/^\d$/.test(r.big)&&r.sb==='cd','ספירה: המספר בתוך משושה (class cd), והפס מראה ״לעמדות״ ('+r.big+')');
  await E(()=>S.advance(5,1/60));
  r=await E(()=>{ const sb=document.getElementById('v76Score'); const h=id=>getComputedStyle(document.getElementById(id)).display;
    return {shown:!sb.hidden&&getComputedStyle(sb).display!=='none', cls:sb.className, R:document.getElementById('v76R').textContent, B:document.getElementById('v76B').textContent,
      ar:S.allianceScore('red')|0, ab:S.allianceScore('blue')|0, clk:document.getElementById('v76Clk').textContent, hclk:document.getElementById('clkTime').textContent,
      hdr:[h('clkTime'),h('clkPhase'),h('cScore')], stop:h('clkStop')}; });
  ok(r.shown&&r.cls==='auto','באוטונומי: פס התוצאה גלוי וכחול ('+r.cls+')');
  ok(+r.R===r.ar&&+r.B===r.ab&&r.clk===r.hclk,'הפס מראה את הניקוד והשעון של המאץ׳ ('+r.R+':'+r.B+' · '+r.clk+')');
  ok(r.hdr.every(d=>d==='none')&&r.stop!=='none','בכותרת: בלי שעון וניקוד כפולים, ״עצור משחק״ נשאר');
  r=await E(()=>{ S.v76.lightTick(performance.now()); const a=S.v76.V76.lightK, c=S.v76.rim().color.getHexString(); return {a,c}; });
  ok(r.a==='auto'&&r.c!=='ffd9a0','תאורה לפי שלב: כחול קריר באוטונומי ('+r.c+')');
  /* הלוח בזמן מאץ׳ */
  await E(()=>S.ppRefresh&&S.ppRefresh());
  r=await E(()=>{ const sh=s=>{ const e=document.querySelector(s); return !!e&&!!e.getClientRects().length&&getComputedStyle(e).display!=='none'; };
    return {rows:[...document.querySelectorAll('#ppStatus>div')].filter(d=>d.getClientRects().length).map(d=>d.dataset.r),
      hidden:['#ppDaily','#ppStats','#ppCtl','#ppCam','#ppKeys','#ppMedia','.ppMine'].filter(sh), stop:sh('#ppStop'), rp:sh('#ppReplay'), more:sh('#v76More')}; });
  /* v77: ״עצור״ ו״שידור חוזר״ בזמן מאץ׳ רק בכותרת ועל הזירה — לא שוב בלוח הצד */
  ok(r.rows.join(',')==='ph,sc,bl'&&r.hidden.length===0&&!r.stop&&!r.rp&&r.more,'בזמן מאץ׳ הלוח רזה: שלב, ניקוד, כדורים — ״עצור״ ו״שידור חוזר״ לא כפולים ('+r.rows+' · גלויים בטעות: '+r.hidden+')');
  r=await E(()=>{ document.getElementById('v76More').click(); const a=[...document.querySelectorAll('#ppStatus>div')].filter(d=>d.getClientRects().length).length;
    const st=!!document.getElementById('ppStats').getClientRects().length; document.getElementById('v76More').click(); return {a,st}; });
  ok(r.a>3&&r.st,'״⋯ עוד אפשרויות״ מחזיר את כל השאר — שום יכולת לא נמחקה ('+r.a+' שורות)');
  await E(()=>S.advance(30,1/60));
  r=await E(()=>{ S.ppRefresh(); const b=document.getElementById('ppReplay'); return {dis:b.disabled, t:b.textContent, ir:!document.getElementById('irBtn').hidden}; });
  ok(!r.dis&&/⏪/.test(r.t),'במאץ׳ ״שידור חוזר״ בלוח פעיל — 10 השניות האחרונות ('+r.t+')');
  /* 30 השניות האחרונות */
  await E(()=>S.advance(S.tEnd()-S.MATCH.t-20,1/60));
  r=await E(()=>{ S.v76.sbTick(); S.v76.lightTick(performance.now()); return {cls:document.getElementById('v76Score').className, ph:document.getElementById('v76Ph').textContent, l:S.v76.V76.lightK, c:S.v76.rim().color.getHexString()}; });
  ok(r.cls==='end30'&&r.l==='end'&&r.c==='ffa52a','30 השניות האחרונות: שעון ענבר פועם ותאורה ענברית ('+r.ph+')');
  /* הודעות ניקוד והמונה לא על הפס */
  r=await page.evaluate(`(()=>{ const R=${RECT}; window.__sim.v76&&0; const sp=document.getElementById('scorePops'); const d=document.createElement('div'); d.className='spop red'; d.textContent='+5 test'; sp.appendChild(d);
    const o={sb:R('#v76Score'), pop:R(d), fps:R('#fpsChip')}; d.remove(); return o; })()`);
  ok(r.sb&&r.pop&&!ovl(r.sb,r.pop)&&(!r.fps||!ovl(r.sb,r.fps)),'הודעת ניקוד ומונה התמונות לא מכסים את פס התוצאה');
  /* זוהר התא */
  r=await E(()=>{ const h=S.hiveRed, c=new THREE.Vector3(0,1,0), n=new THREE.Vector3(1,0,0); S.v76.hit(h,c,n); const g=S.v76.V76.glow; const a=g.visible&&g.material.opacity===1;
    S.v76.frame(performance.now()+900); return {a, b:g.visible}; });
  ok(r.a&&!r.b,'כדור שנכנס: התא מאיר לרגע ודועך (רשת אחת)');
  /* סוף המאץ׳ */
  await E(()=>S.advance(25,1/60));
  r=await E(()=>{ const bn=document.getElementById('banner'), ve=document.getElementById('v76End');
    const rows=[...ve.querySelectorAll('.v76Brk>div')].map(d=>[...d.querySelectorAll('b')].map(b=>b.textContent));
    const d=S.v76.V76.end; return {ph:S.MATCH.phase, cls:bn.className, shown:!ve.hidden, rows, brk:d&&d.brk, fin:S.MATCH.final, star:ve.querySelector('.v76Star b')&&ve.querySelector('.v76Star b').textContent,
      btn:[...document.querySelectorAll('#bnAct [data-bn]')].map(b=>b.dataset.bn), bf:getComputedStyle(bn).backdropFilter, stat:(ve.querySelector('.v76Stat')||{}).textContent}; });
  ok(r.ph==='סיום'&&/\bend\b/.test(r.cls)&&r.shown&&r.rows.length===(r.brk&&(r.brk.red.pre||r.brk.blue.pre)?6:5),'סוף מאץ׳: כרטיס עם פירוק נקודות (בזירה מההתחלה, אוטונומי, טלאופ, סוף משחק, סה״כ)');   /* v77: שורת ״בזירה מההתחלה״ */
  ok(r.brk&&['red','blue'].every(a=>(r.brk[a].pre|0)+r.brk[a].auto+r.brk[a].tele+r.brk[a].end===r.brk[a].total&&r.brk[a].total===(r.fin[a]|0)),'הפירוק מסתכם בתוצאה הסופית ('+JSON.stringify(r.brk)+')');
  ok(!!r.star&&r.star.length>1,'⭐ כוכב המאץ׳: '+r.star);
  ok(r.btn.includes('again')&&r.btn.includes('debrief'),'הכפתורים הקיימים בכרטיס: '+r.btn.join(', '));
  ok(/blur/.test(r.bf||''),'רקע מטושטש מאחורי הכרטיס ('+r.bf+')');
  ok(!!r.stat,'נתון בולט אחד: '+r.stat);
  r=await E(()=>{ const h=S.v76.V76.light; S.v76.lightTick(performance.now()); return {k:S.v76.V76.lightK, c:S.v76.rim().color.getHexString(), sb:document.getElementById('v76Score').hidden}; });
  ok(r.k===''&&r.c==='ffd9a0'&&r.sb,'אחרי המאץ׳: התאורה חוזרת לרגילה ופס התוצאה נעלם');
  /* כוכב: מי שתרם הכי הרבה */
  r=await E(()=>{ const B=S.BOTS; const keep=B.map(b=>[b.hits,b.shots,b.on]); B[0].on=true; B[0].hits=40; B[0].shots=41; const s=S.v76.star(); B.forEach((b,i)=>{ b.hits=keep[i][0]; b.shots=keep[i][1]; b.on=keep[i][2]; }); return {s, n:B[0].name}; });
  ok(r.s&&r.s.name===r.n&&/40/.test(r.s.why),'הכוכב הוא מי שהכניס הכי הרבה ('+r.s.name+' · '+r.s.why+')');
  /* קונפטי */
  r=await E(async()=>{ window.__v76conf=1; const b=S.v76.confetti(); const n=b?b.children.length:0; await new Promise(r=>setTimeout(r,2100)); return {n, gone:!document.querySelector('.v76conf')}; });
  ok(r.n===28&&r.gone,'שיא אישי: קונפטי של משושים (28) — ונעלם לבד');
  ok(realErrs(errs).length===0,'מאץ׳ בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await browser.close();
}

/* ── 3. סקינים, הגדרות, סטטיסטיקה ריקה, גלילה, גרסה ── */
{
  const {browser,page,errs}=await open({noraf:true,play:true});
  const E=(f,a)=>page.evaluate(f,a);
  let r=await E(()=>{ __sim.skinOpen(); const m=document.getElementById('skinBox');
    return {tabs:m.querySelectorAll('#skinTabs [data-sktab]').length, rows:m.querySelectorAll('.skRow').length, sw:m.querySelectorAll('.skRow button').length, pv:!!m.querySelector('#skinPrev svg'), first:m.querySelector('.skRow [data-skin]').dataset.skin}; });
  ok(r.tabs===4&&r.rows===1&&r.sw===11&&r.pv&&/^-1\|/.test(r.first),'סקינים: 4 לשוניות, שורה אחת של 11 צבעים ותצוגה מקדימה ('+JSON.stringify(r)+')');
  r=await E(()=>{ document.querySelector('#skinTabs [data-sktab="0"]').click(); const a=document.querySelector('#skinRows [data-skin]').dataset.skin;
    document.querySelector('#skinRows [data-skin="0|neon"]').click(); return {a, b:__sim.SKIN.bots[0], pv:document.querySelector('#skinPrev').innerHTML.includes('#9dff3a'), on:document.querySelector('#skinTabs [data-sktab="0"]').classList.contains('on')}; });
  ok(/^0\|/.test(r.a)&&r.b==='neon'&&r.pv&&r.on,'לשונית של בוט: השורה מחליפה רובוט, והבחירה מתעדכנת בתצוגה המקדימה');
  await E(()=>{ __sim.skinReset(); __sim.skinClose(); });
  r=await E(()=>{ __sim.v71.settingsOpen(); const g=[...document.querySelectorAll('#pmBody .setGrp')].map(x=>x.id||x.querySelector('h4').textContent);
    const d=document.getElementById('setAboutD'); return {g, open:d.open}; });
  ok(r.g[0]==='setQual'&&r.g[r.g.length-1]==='setAbout'&&!r.open,'הגדרות: גרפיקה ותצוגה ראשונה, ״אודות ומשפטי״ אחרונה ומקופלת ('+r.g.join(' · ')+')');
  r=await E(()=>{ const b=document.getElementById('pmBody'); const sc=b.scrollHeight>b.clientHeight; b.scrollTop=900; const was=b.scrollTop;
    document.getElementById('pmX').click(); document.getElementById('ppStats').click(); return {was, now:document.getElementById('pmBody').scrollTop}; });
  ok(r.was>0&&r.now===0,'חלון קופץ חדש נפתח מלמעלה — לא באמצע הגלילה של הקודם ('+r.was+' → '+r.now+')');
  r=await E(()=>({next:document.querySelectorAll('#achBox .v76Next .achC').length, fold:!!document.querySelector('#achBox details.achAll:not([open])'), all:document.querySelectorAll('#achBox details.achAll .achC').length,
    first:!!document.querySelector('#stOut [data-v76first]')}));
  ok(r.next===3&&r.fold&&r.all===16&&r.first,'סטטיסטיקה ריקה: שלושת ההישגים הבאים, השאר מקופלים (16), וכפתור ״שחקו מאץ׳ ראשון״');
  r=await E(()=>{ document.querySelector('#stOut [data-v76first]').click(); return {pm:document.getElementById('playModal').hidden, setup:document.body.classList.contains('setup')}; });
  ok(r.pm&&r.setup,'״שחקו מאץ׳ ראשון״ סוגר את החלון ופותח את הגדרת המאץ׳');
  await E(()=>{ if(document.body.classList.contains('setup')) __sim.setupClose(); });
  r=await E(()=>{ __sim.v71.settingsOpen('setAbout'); return document.getElementById('setAboutD').open; });
  ok(r,'פתיחה ישירה של ״אודות״ (מהחיפוש) פותחת את המקופל');
  await E(()=>document.getElementById('pmX').click());
  r=await E(()=>({t:document.getElementById('verBadge').textContent, ti:document.getElementById('verBadge').title}));
  ok(/^v(7[6-9]|[89]\d)$/.test(r.t)&&/BIOBUZZ v(7[6-9]|[89]\d)/.test(r.ti),'תג הגרסה: '+r.t+' ('+r.ti+')');   /* v77: מתעדכן עם כל גרסה */
  ok(realErrs(errs).length===0,'בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await browser.close();
}

/* ── 4. מצלמה עוקבת, פתיחה, ביצועים, רשת ── */
{
  const {browser,page,errs}=await open({noraf:true,play:true});
  const E=(f,a)=>page.evaluate(f,a);
  /* מבנה בין המצלמה לרובוט נעשה שקוף */
  let r=await E(()=>{ const S=__sim; S.v76.setCamView('chase'); S.botBody.position.set(S.M(-30),S.botBody.position.y,0); S.botBody.velocity.set(0,0,0); S.bot.yaw=-Math.PI/2;
    S.advance(1,1/60); for(let i=0;i<60;i++) S.v76.applyCam(); S.v76.V76.occT=0; S.v76.occTick(performance.now()+1e4); let faded=0; S.fieldRoot.traverse(o=>{ if(o.userData.v76o) faded++; });
    const any=[]; S.fieldRoot.traverse(o=>{ if(o.userData.v76o) any.push(o.material.transparent&&o.material.opacity<0.5); });
    S.v76.setCamView('free'); S.v76.V76.occT=0; S.v76.occTick(performance.now()+2e4); let left=0; S.fieldRoot.traverse(o=>{ if(o.userData.v76o) left++; });
    return {faded, tr:any.every(Boolean), left, view:S.v76.camAt().view}; });
  ok(r.faded>0&&r.tr,'מצלמה עוקבת: מבנה שמסתיר את הרובוט שקוף למחצה ('+r.faded+' רשתות)');
  ok(r.left===0,'במצלמה אחרת הכול חוזר לאטום');
  /* פתיחה: גלישה קצרה, ומקש מדלג */
  r=await E(()=>{ const S=__sim; window.__v76glide=1; try{ sessionStorage.removeItem('bbGlide76'); }catch(e){} const c0=S.v76.camAt(); const st=S.v76.glideStart(); const g=!!S.v76.V76.glide;
    const mid=S.v76.camAt(); window.dispatchEvent(new KeyboardEvent('keydown',{key:'x'})); const c1=S.v76.camAt();
    const again=S.v76.glideStart(); return {st,g,moved:Math.abs(mid.d-c0.d)>0.01, back:Math.abs(c1.d-c0.d)<1e-6&&Math.abs(c1.th-c0.th)<1e-6, again, end:!S.v76.V76.glide}; });
  ok(r.st&&r.g&&r.moved,'פתיחה: המצלמה מתחילה רחוק ולמעלה');
  ok(r.back&&r.end&&!r.again,'מקש מדלג מיד לעמדה הרגילה, ופעם אחת בלבד בכל הפעלה');
  /* צל רק לגדולים ולחשובים */
  r=await E(()=>{ const S=__sim; S.v76.shadowTrim(); let all=0, cast=0, perim=0, small=0, ball=0, hive=0;
    S.scene.traverse(o=>{ if(!o.isMesh||!o.visible) return; all++; if(o.castShadow) cast++; });
    S.perimVis.traverse(o=>{ if(o.isMesh&&o.castShadow) perim++; });
    const v=new THREE.Vector3(); S.bot.group.updateMatrixWorld(true); S.bot.group.traverse(o=>{ if(!o.isMesh||!o.castShadow) return; if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.getWorldScale(v); if(o.geometry.boundingSphere.radius*Math.max(v.x,v.y,v.z)/S.M(1)<1.5) small++; });
    ball=S.balls.filter(b=>b.mesh.castShadow).length; S.hiveRed.group.traverse(o=>{ if(o.isMesh&&o.castShadow) hive++; });
    return {all,cast,perim,small,ball,balls:S.balls.length,hive}; });
  ok(r.cast<r.all*0.5&&r.perim===0&&r.small===0,'צל: '+r.cast+' מתוך '+r.all+' רשתות מטילות — בלי קירות ההיקף ובלי חלקים קטנים של הרובוט');
  ok(r.ball===r.balls&&r.hive>10,'כדורים והכוורת עדיין מטילים צל ('+r.ball+' כדורים, '+r.hive+' בכוורת)');
  r=await E(()=>{ const f=__sim.v76.dprWant; return [f(2,3840,2160), f(2,1200,800), f(1.5,2560,1440)]; });
  ok(r[0]===1&&Math.abs(r[1]-1.96)<0.01&&r[2]<=1.5&&2560*1440*r[2]*r[2]<=3.8e6,'תקציב פיקסלים ~3.7 מיליון: '+r.join(' · '));
  /* רשימת השלטים — פעם אחת בצעד */
  r=await E(()=>{ const S=__sim, g0=navigator.getGamepads; let n=0; const pad={id:'Xbox 360 Controller (XInput STANDARD GAMEPAD)',index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),mapping:'standard'};
    navigator.getGamepads=()=>{ n++; return [pad]; }; S.advance(1,1/60); const per=n/60; navigator.getGamepads=g0; return {per, pad:S.PAD?S.PAD.on:null}; });
  ok(r.per<=1.01,'getGamepads נקראת פעם אחת בצעד ('+r.per.toFixed(2)+' בצעד, קודם 2 ומעלה)');
  /* השהיית האורח מסתגלת */
  r=await E(()=>{ const N=__sim.v76.NET, f=__sim.v76.interpDelay, k=N.gapMs; const o=[]; for(const g of [10,40,66,300,0]){ N.gapMs=g; o.push(Math.round(f())); } N.gapMs=k; return o; });
  ok(r[0]===40&&r[1]===60&&r[2]===99&&r[3]===250&&r[4]===40,'השהיית האינטרפולציה של האורח: פי 1.5 מהפער, בין 40 ל-250 מ״ש ('+r.join(', ')+')');
  /* מארח ברקע: משהה, מודיע, וחוזר */
  r=await E(()=>{ const S=__sim, N=S.v76.NET, sent=[]; const keep={mode:N.mode,sock:N.sock};
    N.mode='host'; N.sock={readyState:1, send:s=>sent.push(s)}; let hid=true; Object.defineProperty(document,'hidden',{configurable:true,get:()=>hid});
    S.v76.vis(); const p1=document.getElementById('pauseTag').hidden===false;
    hid=false; S.v76.vis(); const p2=document.getElementById('pauseTag').hidden;
    N.mode=keep.mode; N.sock=keep.sock; delete document.hidden;
    const m=sent.map(x=>JSON.parse(x)).filter(x=>x.t==='ev'); return {p1,p2,bg:m.map(x=>x.bg), to:m.map(x=>x.to)}; });
  ok(r.p1&&r.p2&&r.bg.join()==='1,0'&&r.to.every(t=>t==='*'),'מארח ברקע: משהה ומודיע לאורחים, ובחזרה ממשיך ומודיע ('+r.bg+')');
  r=await E(()=>{ const S=__sim; S.MT.cd=0; S.matchStart(); S.advance(1,1/60); let hid=true; Object.defineProperty(document,'hidden',{configurable:true,get:()=>hid});
    S.v76.vis(); hid=false; S.v76.vis(); delete document.hidden; const p=!document.getElementById('pauseTag').hidden, t=document.getElementById('refToast').textContent;
    S.v71.stepSim&&0; return {p,t}; });
  ok(r.p&&/הושהה/.test(r.t),'לבד במאץ׳: חזרה ללשונית — המשחק מחכה מושהה ומסביר איך ממשיכים');
  r=await E(()=>{ const S=__sim; const a=S.v76.guestBg(true); const tg=document.getElementById('pauseTag'); const o={shown:!tg.hidden, txt:tg.textContent}; S.v76.guestBg(false); return o; });
  ok(r.shown&&/המארח/.test(r.txt),'אורח: תג קבוע ״המארח עבר ללשונית אחרת״ כל עוד הוא ברקע');
  ok(realErrs(errs).length===0,'בלי שגיאות: '+realErrs(errs).slice(0,2).join(' | '));
  await browser.close();
}

/* ── 5. טלפון וחלון צר ── */
{
  const B=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const view=async(vp,lang,mob)=>{ const ctx=await B.newContext({viewport:vp,...(mob?{isMobile:true,hasTouch:true,deviceScaleFactor:1}:{})}); const pg=await ctx.newPage();
    await pg.addInitScript(o=>{ window.requestAnimationFrame=()=>0; localStorage.setItem('bbUiMode1','play'); localStorage.setItem('bbTour1','1'); localStorage.setItem('bbWizard1','{"done":true,"v":1,"test":1}'); localStorage.setItem('bbLang1',o.lang); },{lang});
    await pg.goto(URL0,{timeout:90000}); await pg.waitForFunction(()=>window.__sim&&window.__sim.botBody&&window.__sim.BOTS.length,null,{timeout:60000});
    await pg.evaluate(()=>{ if(document.body.classList.contains('setup')) __sim.setupClose(); __sim.MT.cd=0; __sim.matchStart(); __sim.advance(40,1/30); __sim.v76.sbTick(); });
    return {ctx,pg}; };
  for(const [vp,mob,lang] of [[{width:390,height:844},true,'he'],[{width:390,height:844},true,'en'],[{width:640,height:800},false,'he'],[{width:760,height:800},false,'en'],[{width:390,height:800},false,'he']]){
    const {ctx,pg}=await view(vp,lang,mob);
    const r=await pg.evaluate(`(()=>{ const R=${RECT}; const hd=document.querySelector('#app>header'), iw=innerWidth;
      const out=[...hd.querySelectorAll('button,#clockWrap,.chip')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').filter(e=>{ const q=e.getBoundingClientRect(); return q.right>iw+1||q.left<-1; }).map(e=>e.id||e.className);
      const sb=R('#v76Score'), mb=R('#mbar'), fps=R('#fpsChip'), hud=R('#hud');
      return {ph:document.body.classList.contains('ph'), sw:document.documentElement.scrollWidth, iw, out, sb, sbIn:sb&&sb.l>=0&&sb.r<=iw, mb:sb&&mb?(${ovl})(sb,mb):false, fps:sb&&fps?(${ovl})(sb,fps):false, hud:!!hud, stop:R('#clkStop'), qp:R('#qPlay')}; })()`);
    const tag=vp.width+'px '+lang+(mob?' טלפון':' מחשב');
    ok(r.sw<=r.iw&&r.out.length===0,tag+': הכותרת לא חורגת מהמסך ('+r.sw+'/'+r.iw+(r.out.length?' · '+r.out.join(','):'')+')');
    ok(r.sb&&r.sbIn&&!r.mb&&!r.fps,tag+': פס התוצאה בתוך המסך, לא על פס הכפתורים ולא על מונה התמונות');
    /* v77: בטלפון ״⏹ עצור״ ברצועה העליונה — לא פעמיים */
    if(r.ph) ok(!r.stop&&!!r.qp&&r.qp.r<=r.iw&&r.qp.l>=0,tag+': ״עצור״ פעם אחת — ברצועה העליונה');
    else ok(!!r.stop&&r.stop.r<=r.iw&&r.stop.l>=0,tag+': ״עצור״ גלוי בכותרת');
    if(mob) ok(!r.hud,tag+': בלי שבבי טלמטריה במצב ״משחק״');
    if(lang==='en'){ const he=await pg.evaluate(()=>['v76Score','v76Met','v76More'].map(id=>document.getElementById(id)).filter(Boolean).map(e=>e.textContent).join(' '));
      ok(!/[֐-׿]/.test(he),tag+': הכול באנגלית ('+he.replace(/\s+/g,' ').slice(0,80)+')'); }
    await ctx.close();
  }
  await B.close();
}
done('v76_ui_test');
