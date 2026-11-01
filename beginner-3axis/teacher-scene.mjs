import * as THREE from 'three';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { fk as fk3 } from './model.mjs';
import { fk as fk6, toolPose } from '../six-axis-agent/kinematics.mjs';
import { PARTS } from './teacher-content.mjs';
const v=p=>Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const midpoint=(a,b)=>v(a).add(v(b)).multiplyScalar(.5);
export function createTeacherScene(host,onSelect){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9edf1');
  const camera=new THREE.PerspectiveCamera(35,1,1,3000);camera.up.set(0,0,1);
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{return {supported:false,update(){},home(){},dispose(){}};}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setSize(host.clientWidth,host.clientHeight);host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive robot model / 可交互机器人模型');renderer.domElement.setAttribute('role','img');
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=180;controls.maxDistance=1500;controls.maxPolarAngle=Math.PI*.48;
  scene.add(new THREE.HemisphereLight(0xffffff,0x8b99aa,2.8));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-120,-220,600);scene.add(light);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:'#dce3e9',roughness:.95}));floor.position.z=-1;scene.add(floor);
  const grid=new THREE.GridHelper(1000,40,'#aebdcc','#ced8e2');grid.rotation.x=Math.PI/2;grid.position.z=0;scene.add(grid);
  const robot=new THREE.Group(), props=new THREE.Group();scene.add(robot,props);
  const meshes=new Map(),labels=new Map();let selected=null,lastModel=null,current=null,lastLabels=false;
  const labelHost=document.createElement('div');labelHost.className='model-labels';host.append(labelHost);
  const mat=(color)=>new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.38});
  function mesh(key,geometry,color,part=key,parent=robot){
    if(!meshes.has(key)){const m=new THREE.Mesh(geometry(),mat(color));m.name=key;m.userData.part=part;parent.add(m);meshes.set(key,m);}
    const m=meshes.get(key);m.visible=true;return m;
  }
  function rod(key,a,b,r,color,part){const m=mesh(key,()=>new THREE.CylinderGeometry(r,r,1,24),color,part);m.position.copy(midpoint(a,b));m.scale.y=v(a).distanceTo(v(b));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v(b).sub(v(a)).normalize());return m;}
  function box(key,pos,size,color,part,parent=robot){const m=mesh(key,()=>new THREE.BoxGeometry(1,1,1),color,part,parent);m.position.copy(v(pos));m.scale.set(...size);return m;}
  function ball(key,pos,r,color,part){const m=mesh(key,()=>new THREE.SphereGeometry(r,24,16),color,part);m.position.copy(v(pos));return m;}
  function label(id,position,language,short=false){
    if(!labels.has(id)){const b=document.createElement('button');b.className='part-label';b.type='button';b.dataset.part=id;b.onclick=()=>onSelect(id);labelHost.append(b);labels.set(id,b);}
    const b=labels.get(id), p=v(position).project(camera), visible=lastLabels&&p.z>-1&&p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.94;
    b.hidden=!visible;b.textContent=short?id.toUpperCase():PARTS[id][0][language];b.setAttribute('aria-label',PARTS[id][0][language]);b.setAttribute('aria-pressed',String(id===selected));
    const edge=Math.min(host.clientWidth/2,b.offsetWidth/2+5);
    b.style.left=Math.max(edge,Math.min(host.clientWidth-edge,(p.x+1)*host.clientWidth/2))+'px';b.style.top=((-p.y+1)*host.clientHeight/2)+'px';
  }
  function home(model=current?.model||3){const scale=model===6?1.5:1;controls.target.set(75*scale,0,95*scale);camera.position.set(430*scale,-520*scale,370*scale);controls.update();}
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;down=null;
    const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObjects([...meshes.values()].filter(m=>m.visible&&PARTS[m.userData.part]),false)[0];if(hit)onSelect(hit.object.userData.part);
  });
  let line=null,ghostModel=null,ghostWasVisible=false;const ghost=new THREE.Group();scene.add(ghost);
  for(const y of [-20,20]){const m=new THREE.Mesh(new THREE.BoxGeometry(24,3,3),new THREE.MeshBasicMaterial({color:'#bf6500',transparent:true,opacity:.7}));m.position.set(-7,y,0);ghost.add(m);}
  const centre=new THREE.Mesh(new THREE.SphereGeometry(3,16,12),new THREE.MeshBasicMaterial({color:'#e88a18'}));ghost.add(centre);
  const limitGuide=new THREE.Group();scene.add(limitGuide);
  const guideLine=(points,color)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(v)),new THREE.LineBasicMaterial({color,depthTest:false}));l.renderOrder=4;limitGuide.add(l);return l;};
  guideLine(Array.from({length:61},(_,i)=>{const a=(-150+i*5)*Math.PI/180;return [82*Math.cos(a),82*Math.sin(a),10];}),'#245d77');
  for(const angle of [-150,150]){const a=angle*Math.PI/180;guideLine([[65*Math.cos(a),65*Math.sin(a),10],[95*Math.cos(a),95*Math.sin(a),10]],'#245d77');}
  const requestDirection=guideLine([[0,0,11],[110,0,11]],'#bd443b');
  let pathSignature='';
  function update(s,language,part,showLabels){
    current=s;selected=part||s.highlight;lastLabels=showLabels;
    if(lastModel!==s.model){lastModel=s.model;home(s.model);}
    const aspect=host.clientWidth/Math.max(1,host.clientHeight);
    if(camera.aspect!==aspect||renderer.domElement.clientWidth!==host.clientWidth||renderer.domElement.clientHeight!==host.clientHeight){camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);}
    meshes.forEach(m=>m.visible=false);labels.forEach(b=>b.hidden=true);
    const p3=s.model===3?fk3(s.controller.state.scene.actualJoints):null, f6=s.model===6?fk6(s.q6):null, p6=s.model===6?toolPose(s.q6):null;
    const points=p3?[p3.S,p3.E,p3.F]:f6.points, tcp=p3?p3.C:p6.tip, forward=p3?v(p3.e):new THREE.Vector3(-p6.rotation[2],-p6.rotation[5],-p6.rotation[8]);
    const jaw=p3?v(p3.u):new THREE.Vector3(p6.rotation[0],p6.rotation[3],p6.rotation[6]), normal=new THREE.Vector3().crossVectors(forward,jaw);
    const basis=new THREE.Matrix4().makeBasis(forward,jaw,normal), toolQ=new THREE.Quaternion().setFromRotationMatrix(basis), shoulder=points[0];
    box('base',[0,0,8],[72,66,16],'#263c51','base');rod('pedestal',[0,0,16],shoulder,17,'#435e74','base');
    for(let i=1;i<points.length;i++)rod('link'+i,points[i-1],points[i],s.model===3?11:13,'#e3a346','links');
    const origins=p3?[[0,0,29],p3.S,p3.E]:f6.origins.map((p,i)=>i?p:[0,0,28]);
    origins.forEach((p,i)=>{ball('j'+(i+1),p,i<3?15:12,'#304b62','j'+(i+1));label('j'+(i+1),v(p).add(new THREE.Vector3(0,0,20)),language,true);});
    const flange=p3?p3.F:p6.flange;rod('mount',flange,v(tcp).addScaledVector(forward,-10),8,'#70899e','gripper');
    const housing=box('housing',v(tcp).addScaledVector(forward,-15),[12,48,14],'#324b61','gripper');housing.quaternion.copy(toolQ);
    const gap=s.model===3?(s.controller.state.scene.gripperState==='open'?17:10):17;
    for(const sign of [-1,1]){const jawMesh=box('jaw'+sign,v(tcp).addScaledVector(forward,-3).addScaledVector(jaw,sign*gap),[22,5,10],'#8194a5','gripper');jawMesh.quaternion.copy(toolQ);}
    ball('tcp',tcp,3.5,'#e97b20','tcp');
    const cabinet=box('controller',[-85,-68,33],[43,34,66],'#476d80','controller');cabinet.quaternion.identity();
    const motorPos=v(shoulder).add(new THREE.Vector3(0,-18,0));ball('motor',motorPos,10,'#6d7b91','motor');ball('sensor',v(shoulder).add(new THREE.Vector3(9,-25,5)),5,'#76a89b','sensor');
    label('controller',[-85,-68,74],language);label('gripper',v(tcp).add(new THREE.Vector3(5,0,30)),language);
    ghost.visible=s.ghost;
    if(s.ghost&&(!ghostWasVisible||ghostModel!==s.model)){ghost.position.copy(v(tcp));ghost.quaternion.copy(toolQ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));ghostModel=s.model;}
    ghostWasVisible=s.ghost;
    if(s.targetPoint){const target=ball('reach-target',s.targetPoint,9,'#e88a18',null);target.material.transparent=true;target.material.opacity=.65;}
    limitGuide.visible=s.slide.id==='limits';
    const corrected=['solution','done'].includes(s.phase);
    requestDirection.rotation.z=(corrected?30:170)*Math.PI/180;
    requestDirection.material.color.set(corrected?'#208b6a':'#bd443b');
    if(['path','grip'].includes(s.slide.id)){
      const state=s.controller.state.scene;
      state.obstacles.forEach((o,i)=>{const a=v(o.min),b=v(o.max);const m=box('obstacle'+i,midpoint(a,b),b.sub(a).toArray(),'#c96d63',null,props);m.material.transparent=true;m.material.opacity=.7;});
      state.fixtures.forEach((f,i)=>{const p=f.targetPosition;box('support'+i,[p.x,p.y,(p.z-7)/2],[24,24,p.z-7],'#9aaebe',null,props);});
      state.objects.forEach((o,i)=>ball('part'+i,o.worldPosition,o.radiusMm,'#d68d22',null));
    }
    const key=s.path.length+':'+s.pathColour+':'+s.index;
    if(key!==pathSignature){pathSignature=key;if(line){scene.remove(line);line.geometry.dispose();line.material.dispose();line=null;}if(s.path.length>1){line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(s.path.map(v)),new THREE.LineBasicMaterial({color:s.pathColour==='red'?'#bd443b':'#208b6a',depthTest:false}));line.renderOrder=5;scene.add(line);}}
    meshes.forEach(m=>{const match=!!selected&&m.userData.part===selected;m.material.emissive.set(match?'#d07800':'#000000');m.material.emissiveIntensity=match?.75:0;});
    controls.update();renderer.render(scene,camera);
  }
  function dispose(){controls.dispose();scene.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();});renderer.dispose();renderer.domElement.remove();labelHost.remove();}
  home();return {supported:true,update,home,dispose};
}
