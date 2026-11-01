import * as THREE from 'three';
const v=p=>new THREE.Vector3(...p);
export function buildEnvironment(s,{props,box,rod,mesh}){
  const{width,depth}=s.room;
  box([0,0,-27],[width,depth,50],s.floor);
  const gridPoints=[];for(let x=-Math.floor(width/500)*250;x<=width/2;x+=250)gridPoints.push(x,-depth/2,1,x,depth/2,1);for(let y=-Math.floor(depth/500)*250;y<=depth/2;y+=250)gridPoints.push(-width/2,y,1,width/2,y,1);
  const grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3)),new THREE.LineBasicMaterial({color:0xbcc8b9,transparent:true,opacity:.6}));props.add(grid);
  const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-width/2,-depth/2,4],[width/2,-depth/2,4],[width/2,depth/2,4],[-width/2,depth/2,4]].map(v)),new THREE.LineBasicMaterial({color:0x7d9383}));props.add(border);
  if(s.id==='rescue'){
    box([0,0,2],[1100,depth-120,3],0xe5e2d4);
    for(let y=-depth/2+250;y<depth/2;y+=400)for(const x of [-540,540])box([x,y,5],[12,140,2],0xbba561);
  }
  for(const b of s.obstacles){
    const size=b.max.map((n,i)=>n-b.min[i]),mid=b.min.map((n,i)=>(n+b.max[i])/2);
    const palette={bench:0x5b7f78,plinth:0xe7e1d3,component:0x8c9e9b,artifact:0xab8966,rubble:0x8b9690,wall:0xaab2a7};
    const block=box(mid,size,palette[b.kind]);block.userData.fixture=b.id;
    if(b.kind==='bench'){
      box([mid[0],mid[1],b.max[2]-18],[size[0],size[1],36],0xba9c6f);
      for(const y of [-430,-145,145,430]){box([b.min[0]-.5,y,230],[2,220,145],0x42645f);box([b.min[0]-3,y,267],[4,85,9],0xaabbb0);}
    }else if(b.kind==='component'){
      box([mid[0],mid[1],b.min[2]+15],[size[0],size[1],30],0xb88443);
      const ring=mesh(new THREE.TorusGeometry(25,6,8,24),0xd4dad5);ring.position.set(mid[0],mid[1],b.max[2]-58);ring.rotation.y=Math.PI/2;
    }else if(b.kind==='plinth'){
      box([mid[0],mid[1],b.max[2]-7],[size[0],size[1],14],0xf6f1e6);
      box([b.min[0]-.5,mid[1],b.max[2]-65],[2,95,35],0xeee9da);
    }else if(b.kind==='artifact'){
      // Faceted display pieces remain inside the same collision envelope.
      for(let i=0;i<3;i++)box([mid[0],mid[1],b.min[2]+45+i*82],[size[0]-12*i,size[1]-10*i,54],i%2?0x98a38a:0xb89a77);
    }else{
      for(let i=1;i<4;i++)box([mid[0],b.min[1]-.5,b.min[2]+size[2]*i/4],[size[0],2,8],0x74817a);
      box([mid[0],mid[1],b.max[2]-14],[size[0],size[1],28],0xb3bab0);
      if(b.kind==='rubble')for(let i=0;i<3;i++){const x=b.min[0]+70+i*(size[0]-140)/2;rod([x,b.min[1]-2,b.max[2]*.2],[x+30,b.min[1]-2,b.max[2]*.8],3,0x596c63);}
    }
  }
  const mount=mesh(new THREE.TorusGeometry(185,5,8,64),0x6b8e73);mount.position.set(...s.anchor,5);mount.castShadow=false;
  for(const[i,color]of[[0,0xb2604c],[1,0x448363],[2,0x547eb8]]){const d=[0,0,0];d[i]=1;props.add(new THREE.ArrowHelper(v(d),v([s.anchor[0]-310,s.anchor[1]-290,20]),150,color,25,13));}
  return s.targets.map(t=>{
    const ring=mesh(new THREE.TorusGeometry(85,4,8,48),0xb49a54);ring.position.copy(v(t.position));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v(t.direction));ring.castShadow=false;
    const dot=mesh(new THREE.SphereGeometry(10,12,8),0xc3a356);dot.position.copy(v(t.position));dot.castShadow=false;
    const arrow=new THREE.ArrowHelper(v(t.direction),v(t.position).addScaledVector(v(t.direction),-100),170,0xb49a54,27,13);props.add(arrow);
    return{ring,dot,arrow};
  });
}
