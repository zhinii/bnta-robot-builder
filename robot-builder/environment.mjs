import * as THREE from 'three';
const v=p=>new THREE.Vector3(...p);
export function buildEnvironment(s,{props,box,rod,mesh}){
 const {width,depth,height}=s.room, moving={water:[],items:[],wet:[],belt:[]};
 const group=()=>{const g=new THREE.Group();props.add(g);return g;};
 const metal=(p,size,color=0xc5d0d1,parent=props)=>box(p,size,color,parent,{metalness:.3,roughness:.38});
 const sphere=(p,r,color,scale=[1,1,1],parent=props)=>{const m=mesh(new THREE.SphereGeometry(r,16,10),color,parent);m.position.copy(v(p));m.scale.set(...scale);return m;};
 const cyl=(p,r,h,color,parent=props,extra={})=>{const m=mesh(new THREE.CylinderGeometry(r,r,h,24),color,parent,extra);m.rotation.x=Math.PI/2;m.position.copy(v(p));return m;};
 function textSign(text,p,w=450,h=95,color='#284b45',parent=props){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;let ctx;try{ctx=canvas.getContext('2d');}catch{}if(!ctx)return{rotation:{x:0}};
  ctx.fillStyle='#f7f5e9';ctx.fillRect(0,0,768,160);ctx.fillStyle=color;ctx.font='bold 52px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,80,720);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));m.position.copy(v(p));m.rotation.x=Math.PI/2;parent.add(m);return m;
 }
 box([0,0,-45],[width,depth,90],s.floor);
 const floorLines=[];for(let x=-width/2;x<=width/2;x+=400)floorLines.push(x,-depth/2,1,x,depth/2,1);for(let y=-depth/2;y<=depth/2;y+=400)floorLines.push(-width/2,y,1,width/2,y,1);
 props.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(floorLines,3)),new THREE.LineBasicMaterial({color:s.id==='greenhouse'?0xaaa68d:0xb6c0ba,transparent:true,opacity:.48})));
 if(s.id!=='greenhouse'){
  box([0,depth/2+45,height/2],[width+90,90,height],s.id==='hospital'?0xeae9df:0xdde4df);
  box([-width/2-45,0,height/2],[90,depth,height],0xe7eae0);
  box([0,depth/2-2,110],[width,14,170],0xa7b9b4);box([-width/2+2,0,110],[14,depth,170],0xa7b9b4);
  for(let y=-depth/2+100;y<depth/2;y+=400)box([-width/2+4,y,650],[5,3,1100],0xcbd5cf);
  for(let z=250;z<1300;z+=300)box([0,depth/2-4,z],[width,3,3],0xcbd5cf);
  // Recessed window and daylight, placed in the far wall of the cutaway room.
  box([-450,depth/2-7,1750],[1250,20,700],0x9cbbc4);box([-450,depth/2-23,1750],[20,25,700],0xf8f9ee);box([-450,depth/2-23,1750],[1250,25,20],0xf8f9ee);
  for(const x of [-1080,180])box([x,depth/2-25,1750],[24,32,740],0xf4f2e9);
  textSign(s.id==='hospital'?'PATIENT LOUNGE  ·  07':'TRAY RETURN  /  DISHWASH',[700,depth/2-60,2050],750,110).rotation.x=Math.PI/2;
 }else{
  // Glazed greenhouse with repeating aluminium ribs and a cutaway front.
  for(const y of [-3200,-1600,0,1600,3200]){
   for(const x of [-1500,1500])rod([x,y,0],[x,y,2450],22,0x769488);
   rod([-1500,y,2450],[0,y,3100],22,0x769488);rod([0,y,3100],[1500,y,2450],22,0x769488);
  }
  for(const x of [-1500,1500])for(const z of [900,1700,2450])rod([x,-3200,z],[x,3200,z],15,0x9aad9b);
  rod([0,-3200,3100],[0,3200,3100],20,0x769488);
  for(const x of [-1504,1504])box([x,0,1350],[5,6400,2200],0xc1ded5,props,{transparent:true,opacity:.10,depthWrite:false,roughness:.08});
  box([0,3205,1250],[3000,6,2500],0xc1ded5,props,{transparent:true,opacity:.12,depthWrite:false});
  for(const x of [-1350,1350]){rod([x,-2800,580],[x,2800,580],14,0x313d35);for(const y of [-2000,0,2000])rod([x,y,580],[Math.sign(x)*785,y,580],6,0x394c38);}
  textSign('SCHOOL GREENHOUSE',[0,3180,2300],1050,130).rotation.x=Math.PI/2;
 }
 function plant(x,y,z,large=false){
  const h=large?240:160;rod([x,y,z],[x,y,z+h],7,0x4a6d36);
  for(let i=0;i<6;i++){const a=i*2.4,leaf=sphere([x+Math.cos(a)*65,y+Math.sin(a)*65,z+45+i*h/7],55,i%2?0x548846:0x709b49,[1.4,.5,.35]);leaf.rotation.z=a;leaf.rotation.y=.35;}
  if(large)for(let i=0;i<3;i++)sphere([x+Math.cos(i*2)*48,y+Math.sin(i*2)*45,z+120+i*30],22,0xbf6241);
 }
 function tray(parent=props){const g=new THREE.Group();parent.add(g);box([0,0,0],[300,210,14],0x81a4aa,g,{metalness:.25,roughness:.38});for(const x of [-150,150])box([x,0,10],[12,220,24],0xa4bcc0,g);for(const y of [-105,105])box([0,y,10],[300,12,24],0xa4bcc0,g);box([40,0,10],[8,190,15],0xa4bcc0,g);box([95,0,10],[90,7,15],0xa4bcc0,g);return g;}
 function book(parent=props){const g=new THREE.Group();parent.add(g);box([0,0,0],[180,140,24],0xf1e9ce,g);box([0,0,14],[190,150,5],0xbf7752,g);box([0,0,-14],[190,150,5],0xbf7752,g);box([-93,0,0],[7,150,30],0x99513b,g);box([10,0,18],[90,20,2],0xf3deb6,g);return g;}
 for(const b of s.obstacles){
  const size=b.max.map((n,i)=>n-b.min[i]),mid=b.min.map((n,i)=>(n+b.max[i])/2),g=group();g.userData.fixture=b.id;
  if(b.kind==='bed'){
   box([mid[0],mid[1],500],[size[0],size[1],80],0x9b815f,g);box([mid[0],mid[1],542],[size[0]-28,size[1]-28,8],0x61513b,g);
   for(const x of [b.min[0]+35,b.max[0]-35])for(let y=-2650;y<2800;y+=900)box([x,y,250],[45,45,500],0x8e9b8a,g);
   for(let y=-2500;y<=2600;y+=500){const x=Math.sign(mid[0])*1200;cyl([x,y,610],80,130,0xb98765,g);plant(x,y,680);}
  }else if(b.kind==='pot'){
   const pot=mesh(new THREE.CylinderGeometry(105,78,205,24),0xb27c56,g);pot.rotation.x=Math.PI/2;pot.position.set(mid[0],mid[1],642);cyl([mid[0],mid[1],747],98,10,0x655038,g);cyl([mid[0],mid[1],735],112,24,0xc38d67,g);plant(mid[0]+30,mid[1]+30,750);
   const wet=cyl([mid[0],mid[1],753],90,3,0x3d6480,g,{transparent:true,opacity:.6});wet.visible=false;moving.wet.push(wet);
   const stream=rod([mid[0],mid[1],828],[mid[0],mid[1],758],5,0x7fcbe5,g);stream.visible=false;moving.water.push(stream);
  }else if(['conveyor','rack','table'].includes(b.kind)){
   const top=b.max[2];metal([mid[0],mid[1],top-22],[size[0],size[1],44],undefined,g);
   for(const x of [b.min[0]+40,b.max[0]-40])for(const y of [b.min[1]+35,b.max[1]-35])metal([x,y,top/2],[28,28,top-40],0xb4c2c1,g);
   if(b.kind==='conveyor'){
    box([mid[0],mid[1],top+1],[size[0]-40,size[1]-45,8],0x4b5e5b,g);
    for(let x=b.min[0]+20;x<b.max[0];x+=80){const roller=rod([x,b.min[1]+22,top+8],[x,b.max[1]-22,top+8],7,0x9aacab,g);moving.belt.push({mesh:roller,x,min:b.min[0]+20,max:b.max[0]-20});}
    box([b.max[0]-50,b.min[1]-16,top-70],[80,35,90],0x53736c,g);sphere([b.max[0]-50,b.min[1]-37,top-60],12,0xb34d3e,[1,.4,1],g);
   }else if(b.kind==='rack'){for(let x=b.min[0]+25;x<b.max[0];x+=55)rod([x,b.min[1]+20,top+5],[x,b.max[1]-20,top+5],6,0x98b3b4,g);}
   else box([mid[0],mid[1],top-5],[size[0],size[1],22],0xbca47d,g);
  }else if(b.kind==='washer'){
   metal(mid,size,0xadbdbd,g);box([b.min[0]-3,mid[1],850],[8,size[1]-80,350],0x263d3e,g);
   for(let y=b.min[1]+45;y<b.max[1]-40;y+=35)box([b.min[0]-9,y,900],[8,18,280],0x788e8c,g);
   box([mid[0],b.min[1]-5,870],[size[0]-110,12,470],0x667f80,g);box([mid[0],b.min[1]-13,880],[size[0]-160,8,360],0x9dbab9,g,{metalness:.15,roughness:.15});metal([mid[0],b.min[1]-35,1100],[size[0]-180,25,22],0xc5d0cb,g);for(let x=b.min[0]+100;x<b.max[0]-60;x+=48)box([x,b.min[1]-7,380],[22,10,150],0x778b86,g);
   box([mid[0],b.min[1]-6,1260],[300,10,140],0x385756,g);box([mid[0]-65,b.min[1]-14,1270],[110,8,55],0x92cfb4,g);
   for(const x of [mid[0]+40,mid[0]+90])sphere([x,b.min[1]-15,1270],15,x===mid[0]+40?0xa9d584:0xc79956,[1,.5,1],g);
   for(const x of [b.min[0]+45,b.max[0]-45])metal([x,mid[1],60],[50,size[1]-65,120],0x536b67,g);
  }else if(b.kind==='cabinet'){
   box([mid[0],mid[1],mid[2]-12],[size[0],size[1],size[2]-24],0xc3ab88,g);box([mid[0],mid[1],b.max[2]-12],[size[0],size[1],24],0xe6e2d4,g);
   for(let z=160;z<b.max[2]-60;z+=190){box([b.min[0]-2,mid[1],z],[5,size[1]-20,170],0xd5be9b,g);metal([b.min[0]-13,mid[1],z+45],[18,95,10],0x7a8984,g);}
  }else if(b.kind==='sink'){
   metal(mid,size,0xabbcbb,g);box([mid[0],mid[1],b.max[2]+3],[size[0]-90,size[1]-90,8],0x536b6d,g);rod([mid[0],b.max[1]-45,b.max[2]],[mid[0],b.max[1]-45,b.max[2]+230],14,0xc6d5d5,g);rod([mid[0],b.max[1]-45,b.max[2]+230],[mid[0],mid[1]+60,b.max[2]+230],14,0xc6d5d5,g);
  }else if(b.kind==='bedframe'){
   metal([mid[0],mid[1],350],[size[0]-70,size[1]-60,90],0xaabcb5,g);box([mid[0],mid[1],500],[size[0]-50,size[1]-60,210],0xf5f2e7,g);box([mid[0],mid[1]-140,620],[size[0]-60,size[1]-350,60],0x8eb0ac,g);box([mid[0],b.max[1]-200,650],[650,280,110],0xfffbee,g);for(const x of [b.min[0]+45,b.max[0]-45])rod([x,b.min[1]+100,700],[x,b.max[1]-100,700],18,0xc8d2cd,g);
  }else if(b.kind==='person'){
   const skin=0xc99777,shirt=0x7b9eaa,pants=0x575b69;
   box([1270,650,510],[450,510,95],0x596e70,g);box([1500,650,900],[90,500,800],0x708d8c,g);
   for(const y of [390,910]){rod([1050,y,700],[1480,y,700],24,0xadbdbc,g);const wheel=mesh(new THREE.TorusGeometry(230,25,12,40),0x394744,g);wheel.rotation.x=Math.PI/2;wheel.position.set(1370,y,280);for(let a=0;a<6;a++){const q=a*Math.PI/3;rod([1370,y,280],[1370+Math.cos(q)*205,y,280+Math.sin(q)*205],5,0xb4c2bf,g);}}
   sphere([1330,650,1010],190,shirt,[.8,1,1.3],g);sphere([1300,650,1340],125,skin,[.9,.85,1.1],g);sphere([1320,650,1410],115,0x777773,[.95,.93,.7],g);
   for(const y of [530,770]){rod([1280,y,650],[1010,y,600],70,pants,g);rod([1010,y,600],[970,y,190],56,pants,g);sphere([900,y,140],75,0x444b4b,[1.4,.7,.7],g);rod([1270,y+Math.sign(y-650)*45,1110],[1100,y+Math.sign(y-650)*55,870],48,shirt,g);rod([1100,y+Math.sign(y-650)*55,870],[960,y,840],37,skin,g);sphere([950,y,835],45,skin,[1,.7,.4],g);}
  }
 }
 const pads=s.pads.map((p,i)=>{const g=group();const ring=mesh(new THREE.TorusGeometry(190,8,8,48),0x8eaa97,g);ring.position.set(p.x,p.y,7);textSign(String(i+1),[p.x,p.y,9],120,120,'#466f5d',g).rotation.x=0;g.userData.pad=p.id;return g;});
 const targetMeshes=s.targets.map(t=>{const ring=mesh(new THREE.TorusGeometry(68,4,8,40),0xe2ad4f);ring.position.copy(v(t.position));const dot=sphere(t.position,8,0xe2ad4f);return{ring,dot};});
 if(s.id==='cafeteria'){for(let i=0;i<3;i++){const item=tray();item.position.set(i===0?232.5:700+(i-1)*380,-402.7,630);moving.items.push(item);}}
 if(s.id==='hospital'){const item=book();item.position.set(600,-500,785);moving.items.push(item);}
 const loadedTray=s.tool==='tray'?tray():null;if(loadedTray)loadedTray.visible=false;let previousDelivered=0,loadedAt=-10000;
 const carried=s.tool==='tray'?tray():s.tool==='book'?book():null;if(carried)carried.visible=false;
 function update(state,robot,frame,time=0){
  const watered=state?.watered??[];moving.wet.forEach((m,i)=>m.visible=watered.includes(s.targets[i].id));moving.water.forEach((m,i)=>m.visible=state?.watering===s.targets[i].id);
  const delivered=state?.delivered??0,holding=!!state?.holding;
  if(loadedTray){if(delivered>previousDelivered)loadedAt=time;const progress=(time-loadedAt)/1200;loadedTray.visible=delivered>0&&progress>=0&&progress<1;loadedTray.position.set(232.5+Math.max(0,Math.min(1,progress))*650,402.7,630);previousDelivered=delivered;}
  if(carried){carried.visible=holding;if(holding){carried.position.copy(v(frame.tip)).add(new THREE.Vector3(0,0,-70).applyMatrix3(new THREE.Matrix3().set(...frame.rotation)));const mat=new THREE.Matrix4().set(frame.rotation[0],frame.rotation[1],frame.rotation[2],0,frame.rotation[3],frame.rotation[4],frame.rotation[5],0,frame.rotation[6],frame.rotation[7],frame.rotation[8],0,0,0,0,1);carried.quaternion.setFromRotationMatrix(mat);}}
  if(s.id==='cafeteria')moving.items.forEach((m,i)=>{m.visible=i>=delivered+(holding?1:0);const n=i-delivered;m.position.set(n===0?232.5:700+(n-1)*380,-402.7,630);});
  if(s.id==='hospital'&&moving.items[0]){moving.items[0].visible=!holding;moving.items[0].position.set(600,delivered?500:-500,785);}
  for(const r of moving.belt)r.mesh.position.x=r.min+((r.x-r.min+time*.035)%(r.max-r.min));
  pads.forEach(g=>g.visible=!state?.testing&&robot.base==='fixed');
 }
 return{targets:targetMeshes,update};
}
