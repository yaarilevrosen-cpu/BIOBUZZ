// v82: רובוט דמיוני לבדיקות — ג׳ייסון במבנה של 02 (apollo9662-robot/1) ו-glb קטן שנבנה כאן. בלי שום נתון של רובוט אמיתי.
export function fakeRobot(over={}){
  const T={
    plate:{system:"שלדה והנעה",what:"פלטת שלדה",shape:{type:"box",size:[400,6,380]},color:"#b9bdc4",material:"אלומיניום"},
    dwheel:{system:"שלדה והנעה",what:"גלגל הנעה",shape:{type:"cylinder",diameter:100,length:40,axis_local:"z"},color:"#3a3d42",material:"קנוי",motion:{type:"rotation",range_deg:"רציף"}},
    roller:{system:"איסוף",what:"גלגל מכאנום קטן על ציר האיסוף",shape:{type:"cylinder",diameter:60,length:300,axis_local:"z"},color:"#3a3d42",material:"קנוי",motion:{type:"rotation",range_deg:"רציף"}},
    belt:{system:"טרנספר והזנה",what:"רצועה",shape:{type:"box",size:[200,4,15]},color:"#3a3d42",material:"גומי"},
    swheel:{system:"ירי",what:"גלגל",shape:{type:"cylinder",diameter:100,length:25,axis_local:"z"},color:"#3a3d42",material:"קנוי",motion:{type:"rotation",range_deg:"רציף"}},
    spul:{system:"ירי",what:"גלגלת 24 שיניים",shape:{type:"cylinder",diameter:140,length:10,axis_local:"z"},color:"#f2b705",material:"מודפס",motion:{type:"rotation",range_deg:"רציף"}},
    sramp:{system:"ירי",what:"רמפה – שני חצאים",shape:{type:"box",size:[80,90,110]},color:"#f2b705",material:"מודפס"},
    roof:{system:"מבנה הראש",what:"גג",shape:{type:"box",size:[300,3,300]},color:"#cfe8ff",material:"פוליקרבונט 3 ממ"},
    camfix:{system:"מצלמה",what:"עריסה מודפסת למצלמה",shape:{type:"box",size:[40,60,100]},color:"#f2b705",material:"מודפס"},
    cam:{system:"מצלמה",what:"מצלמה",shape:{type:"box",size:[70,16,50]},color:"#3a3d42",material:"קנוי"},
    flr:{system:"סוף משחק – רמפה",what:"רמפה קדמית",shape:{type:"box",size:[60,3,380]},color:"#cfe8ff",material:"פוליקרבונט",motion:{type:"rotation",range_deg:"לא נקבע"}}
  };
  /* המצלמה: הציר הדק (y) מסובב 40° קדימה־מעלה סביב z — כלומר מבט 50° מעל האופק */
  const a=-40*Math.PI/180, qc=[Math.cos(a/2),0,0,Math.sin(a/2)];
  const parts=[
    {type:"plate",pos:[10,40,0],quat_wxyz:[1,0,0,0]},
    {type:"dwheel",pos:[-140,50,-170],quat_wxyz:[1,0,0,0]},{type:"dwheel",pos:[-140,50,170],quat_wxyz:[1,0,0,0]},
    {type:"dwheel",pos:[160,50,-170],quat_wxyz:[1,0,0,0]},{type:"dwheel",pos:[160,50,170],quat_wxyz:[1,0,0,0]},
    {type:"roller",pos:[200,90,0],quat_wxyz:[1,0,0,0]},
    {type:"belt",pos:[60,150,0],quat_wxyz:[1,0,0,0]},
    {type:"swheel",pos:[-100,330,0],quat_wxyz:[1,0,0,0]},{type:"spul",pos:[-100,330,60],quat_wxyz:[1,0,0,0]},
    {type:"sramp",pos:[-60,280,0],quat_wxyz:[1,0,0,0]},
    {type:"roof",pos:[0,380,0],quat_wxyz:[1,0,0,0]},
    {type:"camfix",pos:[90,240,0],quat_wxyz:[1,0,0,0]},{type:"cam",pos:[92,254,30],quat_wxyz:qc},
    {type:"flr",pos:[330,20,0],quat_wxyz:[1,0,0,0]}
  ];
  return Object.assign({format:"apollo9662-robot/1",version:3,date:"2026-01-01 00:00",source:{project:"בדיקה"},
    frame:{origin:"מרכז",x:"קדימה",y:"למעלה",z:"לצד",units:"mm"},
    summary:{bbox_min:[-190,0,-190],bbox_max:[360,382,190],size_mm:[550,382,380],mass_kg_est:10.5,center_of_mass_est:[0,120,0],parts:parts.length},
    notes:[],part_types:T,parts,
    drive:{type:"mecanum",wheels:"מקנום",wheel_d_mm:104,motor_rpm:312,ratio:"1:1"},
    sim:{exit_mm:[-40,305,0],exit_deg:66,capacity:3,balls:"pollen",intake_side:"front",shooter_ratio:"1:1"}},over);
}
/* glb קטן: קובייה אחת (8 קודקודים, 12 משולשים), וצומת לכל חלק בשם type#i — כמו שהיצוא של 02 קורא להם */
export function fakeGlb(d){
  const pos=new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1].map(v=>v*10));
  const idx=new Uint16Array([0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 3,2,6,3,6,7, 0,3,7,0,7,4, 1,5,6,1,6,2]);
  const bin=Buffer.concat([Buffer.from(pos.buffer),Buffer.from(idx.buffer)]);
  const cnt={}, nodes=d.parts.map(p=>{ const i=cnt[p.type]=(cnt[p.type]||0)+1;
    return {name:p.type+"#"+(i-1),mesh:0,translation:p.pos,rotation:[p.quat_wxyz[1],p.quat_wxyz[2],p.quat_wxyz[3],p.quat_wxyz[0]]}; });
  const gltf={asset:{version:"2.0"},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
    materials:[{pbrMetallicRoughness:{baseColorFactor:[0.73,0.74,0.77,1]}}],
    buffers:[{byteLength:bin.length}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:pos.byteLength},{buffer:0,byteOffset:pos.byteLength,byteLength:idx.byteLength}],
    accessors:[{bufferView:0,componentType:5126,count:8,type:"VEC3",min:[-10,-10,-10],max:[10,10,10]},{bufferView:1,componentType:5123,count:36,type:"SCALAR"}]};
  let js=Buffer.from(JSON.stringify(gltf)); while(js.length%4) js=Buffer.concat([js,Buffer.from(" ")]);
  let bn=bin; while(bn.length%4) bn=Buffer.concat([bn,Buffer.alloc(1)]);
  const h=Buffer.alloc(12); h.writeUInt32LE(0x46546c67,0); h.writeUInt32LE(2,4); h.writeUInt32LE(12+8+js.length+8+bn.length,8);
  const c1=Buffer.alloc(8); c1.writeUInt32LE(js.length,0); c1.writeUInt32LE(0x4E4F534A,4);
  const c2=Buffer.alloc(8); c2.writeUInt32LE(bn.length,0); c2.writeUInt32LE(0x004E4942,4);
  return Buffer.concat([h,c1,js,c2,bn]);
}
