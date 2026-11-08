// פרופילים סינתטיים לכיול (מספרי קבוצה 90001+ בלבד — לא נתונים אמיתיים)
const mv=(v,c=1,n=6)=>v==null?null:{value:v,confidence:c,n};
function robot(t,o){
  return {team:t, matches_seen:o.seen||6, no_shows:o.noShow||0, is_us:!!o.us, confidence:o.conf==null?1:o.conf,
    declared:{confidence:o.dc==null?0.5:o.dc, drive:"mecanum", speed:null, capacity:o.cap||null, intake_from:o.from||null, intake_side:"front",
      shooters:1, shooter_mount:"fixed", shooter_wheels:null, max_range_in:null, shoot_zones:null, shoots_moving:o.mvs==null?null:o.mvs, auto_aim:o.aa==null?null:o.aa,
      auto_starts:null, auto_leave:null, auto_park:null, auto_balls:o.ab==null?null:o.ab, auto_tips:null, auto_programs:null, end_park:null,
      late_nectar:o.ln==null?null:o.ln, flower_lift:!!o.lift, preferred_role:null, full_size:null},
    measured:o.us?null:{cycle_s:mv(o.cyc), tips_per_match:mv(o.tips), auto_tips:mv(o.atips), accuracy:mv(o.acc), shots_per_match:mv(o.spm),
      auto_points:mv(o.ap), tele_points:mv(o.tp), end_points:mv(o.ep), total_points:mv(o.ap!=null&&o.tp!=null&&o.ep!=null?+(o.ap+o.tp+o.ep).toFixed(1):null),
      auto_start:o.start?{value:o.start,confidence:1,n:6}:null, main_shoot_zone:null, auto_leave:mv(o.leave), auto_park:mv(o.apark), end_park:mv(o.park),
      defense_share:mv(o.def), reliability:mv(o.rel==null?1:o.rel), fouls_points_per_match:mv(o.fouls), drive_rating:mv(o.drv)}};
}
export const PROFS={
  90001:{name:"ace",   def:0.0, drv:0.9, fouls:0,  acc:0.85,spm:28, tips:3,   park:0.9, leave:1,  apark:0.9, ab:4, atips:1,  ap:28, tp:60, ep:4.5, mvs:true, aa:true, from:["flower","floor"], start:"C"},
  90002:{name:"wall",  def:0.8, drv:0.6, fouls:10, acc:0.5, spm:6,  tips:0.3, park:0.5, leave:0.8,apark:0.3, ab:2, atips:0,  ap:6,  tp:10, ep:2.5, mvs:false,aa:false,from:["floor"], start:"A"},
  90003:{name:"rookie",def:0.1, drv:0.3, fouls:2,  acc:0.4, spm:12, tips:0.5, park:0.3, leave:0.5,apark:0,   ab:0, atips:0,  ap:2,  tp:15, ep:1.5, mvs:false,from:["flower"], start:"B", noShow:1, rel:0.86},
  90004:{name:"mid",   def:0.4, drv:0.75,fouls:5,  acc:0.7, spm:18, tips:1.5, park:0.7, leave:1,  apark:0.7, ab:3, atips:0.5,ap:15, tp:35, ep:3.5, start:"B"}
};
export function eventFile(order,nMatch){
  const ids=order||Object.keys(PROFS).map(Number), robots=ids.map(t=>robot(t,PROFS[t]));
  robots.push(robot(90099,{us:true}));
  const sched={};
  for(let m=0;m<nMatch;m++){ const r=ids.map((_,i)=>ids[(m+i)%ids.length]); sched[m+1]={red:[90099,r[0]], blue:[r[1],r[2]]}; }
  return {format:"apollo9662-scouting/event", version:1, generated_at:"2026-11-08T00:00:00Z", event:"כיול", event_code:"", units:{time:"s",distance:"in",share:"0-1"}, robots, schedule:sched};
}
