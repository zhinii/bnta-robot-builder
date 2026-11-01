import * as THREE from 'three';
import {OrbitControls} from '../beginner-3axis/vendor/three/examples/jsm/controls/OrbitControls.js';
import {forward,observe,BEDS,TARGETS,ROOM,transform} from './model.mjs';
const vec=p=>new THREE.Vector3(...p);
const colours={x:0xb2604c,y:0x448363,z:0x547eb8};
export function createScene(host,onSelect) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9efe9');
  const camera=new THREE.PerspectiveCamera(36,1,5,18000);camera.up.set(0,0,1);
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}
  catch {return {supported:false,update(){},home(){},top(){},setLabels(){},dispose(){}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive robot and greenhouse / 可交互机器人与温室');renderer.domElement.setAttribute('role','img');
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=350;controls.maxDistance=10000;controls.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight(0xffffff,0x6f8d73,2.4));
  const sun=new THREE.DirectionalLight(0xfff7df,3.2);sun.position.set(-1800,-1500,4300);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-2300,right:2300,top:2300,bottom:-2300,near:10,far:8000});sun.shadow.bias=-.0004;scene.add(sun);
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.08,...extra});
  const props=new THREE.Group(),robotGroup=new THREE.Group(),selection=new THREE.Group();scene.add(props,robotGroup,selection);
  function mesh(geometry,color,parent=props,extra={}) {const m=new THREE.Mesh(geometry,material(color,extra));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(position,size,color,parent=props,extra={}) {const m=mesh(new THREE.BoxGeometry(...size),color,parent,extra);m.position.copy(vec(position));return m;}
  function rod(a,b,r,color,parent=props) {const m=mesh(new THREE.CylinderGeometry(r,r,1,16),color,parent);placeRod(m,a,b);return m;}
  function placeRod(m,a,b) {const va=vec(a),vb=vec(b);m.position.copy(va).add(vb).multiplyScalar(.5);m.scale.y=va.distanceTo(vb);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());}
  function setFrame(obj,frame) {const m=new THREE.Matrix4().set(frame[0],frame[1],frame[2],0,frame[3],frame[4],frame[5],0,frame[6],frame[7],frame[8],0,0,0,0,1);obj.quaternion.setFromRotationMatrix(m);}
  box([0,0,-27],[ROOM.width,ROOM.depth,50],0xd9e1d5);
  const grid=new THREE.GridHelper(4000,16,0xa1b6a5,0xc3d0c0);grid.rotation.x=Math.PI/2;grid.position.z=.6;props.add(grid);
  // A distinct clear aisle keeps the mobile-base trade-off visible.
  box([0,0,1],[980,ROOM.depth,2],0xe7e5d9);
  for(const x of [-460,460])for(let y=-1300;y<=1300;y+=300)box([x,y,3],[7,120,2],0xb9bba1);
  for(const b of BEDS) {
    const size=b.max.map((v,i)=>v-b.min[i]),mid=b.min.map((v,i)=>(v+b.max[i])/2);
    box(mid,size,0xb1bdad);box([mid[0],mid[1],b.max[2]-45],[size[0]+12,size[1]+12,100],0x7d9580);
    box([mid[0],mid[1],b.max[2]+7],[size[0]-55,size[1]-55,18],0x665c42);
    for(const y of [-950,-470,0,470,950])plant([mid[0]+(y%2?75:-45),y,640],240+Math.abs(y%130),false);
  }
  function plant(position,height,large) {
    const [x,y,z]=position;
    const pot=mesh(new THREE.CylinderGeometry(large?68:48,large?49:36,75,12),0xb78c65);pot.rotation.x=Math.PI/2;pot.position.set(x,y,z+30);
    rod([x,y,z+50],[x,y,z+height],large?8:5,0x638251);
    for(let i=0;i<6;i++) {
      const angle=i*2.4,r=large?74:53,leaf=mesh(new THREE.SphereGeometry(1,12,8),i%2?0x6f9660:0x4d8055);
      leaf.position.set(x+Math.cos(angle)*r*.65,y+Math.sin(angle)*r*.65,z+90+i*(height-95)/6);leaf.scale.set(r,large?36:26,large?14:10);leaf.rotation.z=angle;leaf.rotation.y=i%2?.3:-.3;
    }
  }
  for(const t of TARGETS)plant([t.position[0]+t.direction[0]*175,t.position[1],640],t.position[2]-600,true);
  // Open greenhouse frame; the near side is intentionally omitted for visibility.
  const greenhouse=new THREE.Group();props.add(greenhouse);
  for(const x of [-1730,1730]) {
    for(const y of [-1430,1430])rod([x,y,0],[x,y,1950],12,0xb8c8bb,greenhouse);
    rod([x,-1430,1950],[x,1430,1950],10,0xb8c8bb,greenhouse);
  }
  for(const y of [-1430,1430]) {rod([-1730,y,1950],[0,y,2450],9,0xbdcdc0,greenhouse);rod([0,y,2450],[1730,y,1950],9,0xbdcdc0,greenhouse);}
  rod([0,-1430,2450],[0,1430,2450],8,0xbdcdc0,greenhouse);
  greenhouse.traverse(m=>{if(m.isMesh){m.castShadow=false;m.material.transparent=true;m.material.opacity=.38;}});
  // World frame stays fixed, while selected joint axes follow the arm.
  for(const [i,color]of [[0,colours.x],[1,colours.y],[2,colours.z]]) {const d=[0,0,0];d[i]=1;props.add(new THREE.ArrowHelper(vec(d),vec([-310,-1240,20]),180,color,30,16));}
  const targetMeshes=TARGETS.map(t=>{
    const ring=mesh(new THREE.TorusGeometry(90,4,8,48),0xb49a54);ring.position.copy(vec(t.position));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),vec(t.direction));ring.castShadow=false;
    const dot=mesh(new THREE.SphereGeometry(10,12,8),0xc3a356);dot.position.copy(vec(t.position));dot.castShadow=false;
    const arrow=new THREE.ArrowHelper(vec(t.direction),vec(t.position).addScaledVector(vec(t.direction),-100),180,0xb49a54,30,14);props.add(arrow);
    return {ring,dot,arrow};
  });
  const labelHost=document.createElement('div');labelHost.className='scene-labels';host.append(labelHost);
  let jointMeshes=[],jointLabels=[],baseGroup,tool,latest,selected=0,labels=true,dirty=true;
  const plantLabels=TARGETS.map(t=>{const label=document.createElement('span');label.className='plant-label';label.textContent=t.id;labelHost.append(label);return label;});
  function disposeGroup(group) {while(group.children.length){const child=group.children[0];group.remove(child);child.traverse(n=>{n.geometry?.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());});}}
  function rebuild(model) {
    disposeGroup(robotGroup);jointLabels.forEach(l=>l.remove());jointLabels=[];jointMeshes=[];
    baseGroup=new THREE.Group();robotGroup.add(baseGroup);
    if(model.base==='rover') {
      box([0,0,135],[320,290,145],0x436855,baseGroup);box([15,0,215],[235,220,30],0xe5e5d8,baseGroup);
      for(const x of [-105,105])for(const y of [-160,160]) {const wheel=mesh(new THREE.CylinderGeometry(78,78,42,20),0x344039,baseGroup);wheel.position.set(x,y,85);}
      const arrow=new THREE.ArrowHelper(vec([1,0,0]),vec([85,0,228]),125,0xc0a068,35,28);baseGroup.add(arrow);
      rod([0,0,225],[0,0,260],46,0x4b5a50,baseGroup);
    } else {
      box([0,0,25],[300,300,50],0x7f9181,baseGroup);rod([0,0,50],[0,0,300],55,0xd9ddd3,baseGroup);
      for(const x of [-115,115])for(const y of [-115,115])box([x,y,54],[18,18,8],0x59685e,baseGroup);
    }
    model.joints.forEach((j,i)=>{
      const joint=mesh(new THREE.SphereGeometry(43,24,16),0x4d6255,robotGroup,{metalness:.3,roughness:.4});joint.userData.joint=i;
      const axle=mesh(new THREE.CylinderGeometry(32,32,105,24),0x9daaa0,robotGroup,{metalness:.35});axle.userData.joint=i;
      const link=rod([0,0,0],[1,0,0],23,0xe4e6db,robotGroup);link.userData.joint=i;
      const cuff=mesh(new THREE.SphereGeometry(28,16,12),0xa6b7a4,robotGroup);cuff.userData.joint=i;
      jointMeshes.push({joint,axle,link,cuff});
      const label=document.createElement('button');label.type='button';label.className='joint-label';label.textContent=`J${i+1}`;label.setAttribute('aria-label',`Joint ${i+1} / 关节${i+1}`);label.onclick=()=>onSelect(i);labelHost.append(label);jointLabels.push(label);
    });
    tool=new THREE.Group();robotGroup.add(tool);box([25,0,0],[50,54,42],0x354d42,tool);const lens=mesh(new THREE.CylinderGeometry(19,19,20,20),0x233e42,tool,{metalness:.6,roughness:.16});lens.rotation.z=Math.PI/2;lens.position.x=60;
    const lensGlass=mesh(new THREE.SphereGeometry(15,16,12),0x72acb3,tool,{metalness:.6,roughness:.1});lensGlass.scale.set(.3,1,1);lensGlass.position.x=71;
  }
  let topology='';
  function update(model,index=selected) {
    selected=index;const key=`${model.base}:${model.joints.length}`;if(key!==topology){rebuild(model);topology=key;}
    latest={model,f:forward(model),observation:observe(model)};const {f,observation}=latest;
    baseGroup.position.set(model.rover.x,model.rover.y,0);baseGroup.rotation.z=model.rover.yaw*Math.PI/180;
    jointMeshes.forEach((m,i)=>{
      m.joint.position.copy(vec(f.origins[i]));m.axle.position.copy(vec(f.origins[i]));m.axle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec(f.axes[i]));
      placeRod(m.link,f.origins[i],f.ends[i]);m.cuff.position.copy(vec(f.ends[i]));
      m.joint.material.color.setHex(i===selected?0xb5763c:0x4d6255);m.link.material.color.setHex(i===selected?0xe4cda5:0xe4e6db);
      jointLabels[i].setAttribute('aria-pressed',String(i===selected));
    });
    tool.position.copy(vec(f.flange));setFrame(tool,f.rotation);
    disposeGroup(selection);
    if(f.origins[selected]) {
      const pos=vec(f.origins[selected]),axis=vec(f.axes[selected]),colour=colours[model.joints[selected].axis];
      const axisArrow=new THREE.ArrowHelper(axis,pos.clone().addScaledVector(axis,-105),250,colour,32,16);selection.add(axisArrow);
      const ring=mesh(new THREE.TorusGeometry(76,3,8,56,Math.PI*1.65),colour,selection);ring.position.copy(pos);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),axis);ring.castShadow=false;
      // Local X/Y/Z frame, computed before the selected joint's own rotation.
      const before=selected?f.frames[selected-1]:[Math.cos(model.rover.yaw*Math.PI/180),-Math.sin(model.rover.yaw*Math.PI/180),0,Math.sin(model.rover.yaw*Math.PI/180),Math.cos(model.rover.yaw*Math.PI/180),0,0,0,1];
      for(const [name,basis]of Object.entries({x:[1,0,0],y:[0,1,0],z:[0,0,1]}))selection.add(new THREE.ArrowHelper(vec(transform(before,basis)),pos,135,colours[name],20,10));
    }
    observation.targets.forEach((o,i)=>{const color=o.aligned?0x3e9969:0xb49a54;targetMeshes[i].ring.material.color.setHex(color);targetMeshes[i].dot.material.color.setHex(color);plantLabels[i].classList.toggle('ready',o.aligned);});
    dirty=true;
  }
  function labelAt(element,position,offset=0) {
    const p=vec(position).project(camera);element.hidden=!labels||p.z<-1||p.z>1||Math.abs(p.x)>.96||Math.abs(p.y)>.96;
    element.style.left=`${(p.x+1)*host.clientWidth/2}px`;element.style.top=`${(-p.y+1)*host.clientHeight/2+offset}px`;
  }
  function home() {
    const f=latest?.f;
    const target=f?vec(f.tip).add(vec(f.origins[0])).multiplyScalar(.5):vec([0,0,700]);
    target.z=Math.max(650,target.z);controls.target.copy(target);
    const spread=f?Math.max(1100,...f.origins.map(p=>vec(p).distanceTo(target)),vec(f.tip).distanceTo(target)):1100;
    const d=Math.max(3400,spread*3);camera.position.copy(target).add(vec([d*.86,-d*.96,d*.76]));controls.update();dirty=true;
  }
  function top() {controls.target.set(0,0,600);camera.position.set(0,-.01,6500);controls.update();dirty=true;}
  let down=null;const raycaster=new THREE.Raycaster();
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(robotGroup.children,true).find(h=>Number.isInteger(h.object.userData.joint));if(hit)onSelect(hit.object.userData.joint);});
  const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();dirty=true;});resize.observe(host);
  controls.addEventListener('change',()=>{dirty=true;});
  renderer.setAnimationLoop(()=>{controls.update();if(!dirty)return;dirty=false;if(latest){jointLabels.forEach((l,i)=>labelAt(l,latest.f.origins[i],-39));plantLabels.forEach((l,i)=>labelAt(l,TARGETS[i].position,-35));}renderer.render(scene,camera);});
  home();
  return {supported:true,update,home,top,setLabels(value){labels=value;dirty=true;},dispose(){resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();scene.traverse(n=>{n.geometry?.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());});renderer.dispose();renderer.domElement.remove();labelHost.remove();}};
}
