import * as THREE from 'three';
const v=p=>new THREE.Vector3(...p);
export function buildEnvironment(s,{props,box,rod,mesh}){
  const{width,depth}=s.room;
  box([0,0,-27],[width,depth,50],s.floor);
  const gridPoints=[];for(let x=-Math.floor(width/500)*250;x<=width/2;x+=250)gridPoints.push(x,-depth/2,1,x,depth/2,1);for(let y=-Math.floor(depth/500)*250;y<=depth/2;y+=250)gridPoints.push(-width/2,y,1,width/2,y,1);
  const grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3)),new THREE.LineBasicMaterial({color:0xbcc8b9,transparent:true,opacity:.6}));props.add(grid);
  const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-width/2,-depth/2,4],[width/2,-depth/2,4],[width/2,depth/2,4],[-width/2,depth/2,4]].map(v)),new THREE.LineBasicMaterial({color:0x7d9383}));props.add(border);
  if(s.id==='greenhouse'){
    box([0,0,2],[1100,depth-120,3],0xd4d7c5);
    for(let y=-depth/2+250;y<depth/2;y+=400)for(const x of [-540,540])box([x,y,5],[12,140,2],0x90a77b);
  }else if(s.id==='hospital'){
    // Floor markings keep the supply-room context readable from above.
    box([-900,0,3],[540,140,3],0x91c2bc);box([-900,0,4],[140,540,3],0x91c2bc);
  }
  for(const b of s.obstacles){
    const size=b.max.map((n,i)=>n-b.min[i]),mid=b.min.map((n,i)=>(n+b.max[i])/2);
    const palette={bench:0x5b7f78,cabinet:0xe9f0ec,component:0x8c9e9b,supplies:0xe5d9ba,monitor:0x556f72,planter:0x9d8460,trellis:0xa1b894};
    const block=box(mid,size,palette[b.kind]);block.userData.fixture=b.id;
    if(b.kind==='bench'){
      box([mid[0],mid[1],b.max[2]-18],[size[0],size[1],36],0xba9c6f);
      for(const y of [-430,-145,145,430]){box([b.min[0]-.5,y,230],[2,220,145],0x42645f);box([b.min[0]-3,y,267],[4,85,9],0xaabbb0);}
    }else if(b.kind==='component'){
      box([mid[0],mid[1],b.min[2]+15],[size[0],size[1],30],0xb88443);
      const ring=mesh(new THREE.TorusGeometry(25,6,8,24),0xd4dad5);ring.position.set(mid[0],mid[1],b.max[2]-58);ring.rotation.y=Math.PI/2;
    }else if(b.kind==='cabinet'){
      box([mid[0],mid[1],b.max[2]-12],[size[0],size[1],24],0x78aaa3);
      for(let i=1;i<=3;i++){const z=b.min[2]+size[2]*i/4;box([b.min[0]-.5,mid[1],z],[2,size[1]-35,4],0x9cb7b4);box([b.min[0]-3,mid[1],z+35],[5,90,10],0x5d8784);}
    }else if(b.kind==='supplies'||b.kind==='monitor'){
      box([b.min[0]-.5,mid[1],mid[2]+35],[2,size[1]-24,90],b.kind==='monitor'?0x243f4c:0xfafaf1);
      for(let i=0;i<4;i++)box([b.min[0]-2,mid[1]-30+i*18,mid[2]+35],[2,7,i%2?45:60],b.kind==='monitor'?0x8cd2be:0x627d77);
    }else if(b.kind==='planter'){
      // Plant foliage and beds share one conservative collision envelope.
      block.scale.z=.55;block.position.z=b.min[2]+size[2]*.275;
      box([mid[0],mid[1],size[2]*.55],[size[0]-20,size[1]-20,22],0x5d5341);
      for(let y=b.min[1]+180;y<b.max[1]-100;y+=310)for(const x of [mid[0]-170,mid[0]+170]){
        const top=b.max[2]-160;rod([x,y,size[2]*.55],[x,y,top],10,0x688052);
        for(let i=0;i<3;i++){const leaf=mesh(new THREE.SphereGeometry(95,12,8),i%2?0x729c50:0x4d824b);leaf.scale.set(1.25,.8,.55);leaf.position.set(x+(i-1)*55,y+(i%2)*45,top-80+i*42);}
      }
    }else if(b.kind==='trellis'){
      for(let y=b.min[1]+40;y<b.max[1];y+=220)rod([mid[0],y,10],[mid[0],y,b.max[2]],7,0x6f8c6b);
      for(let z=200;z<b.max[2];z+=250)box([mid[0],mid[1],z],[size[0]+2,size[1],8],0xc2d1b8);
    }
  }
  for(const[i,color]of[[0,0xb2604c],[1,0x448363],[2,0x547eb8]]){const d=[0,0,0];d[i]=1;props.add(new THREE.ArrowHelper(v(d),v([0,0,10]),150,color,25,13));}
  return s.targets.map(t=>{
    const ring=mesh(new THREE.TorusGeometry(85,4,8,48),0xb49a54);ring.position.copy(v(t.position));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v(t.direction));ring.castShadow=false;
    const dot=mesh(new THREE.SphereGeometry(10,12,8),0xc3a356);dot.position.copy(v(t.position));dot.castShadow=false;
    const arrow=new THREE.ArrowHelper(v(t.direction),v(t.position).addScaledVector(v(t.direction),-100),170,0xb49a54,27,13);props.add(arrow);
    return{ring,dot,arrow};
  });
}
