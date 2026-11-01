import * as THREE from 'three';
import {OrbitControls} from '../beginner-3axis/vendor/three/examples/jsm/controls/OrbitControls.js';
import {forward,observe,transform,getScenario,fixedMount,fixedFits} from './model.mjs';
import {buildEnvironment} from './environment.mjs';
const vec=p=>new THREE.Vector3(...p);
const colours={x:0xb2604c,y:0x448363,z:0x547eb8};
export function createScene(host,onSelect,onPlace=()=>{}) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9efe9');
  const camera=new THREE.PerspectiveCamera(36,1,5,40000);camera.up.set(0,0,1);
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}
  catch {return {supported:false,update(){},home(){},top(){},overview(){},setPlacement(){},setLabels(){},dispose(){}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive robot and task environment / 可交互机器人与任务环境');renderer.domElement.setAttribute('role','img');
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=350;controls.maxDistance=25000;controls.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight(0xffffff,0x6f8d73,2.4));
  const sun=new THREE.DirectionalLight(0xfff7df,3.2);sun.position.set(-1800,-1500,4300);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-2300,right:2300,top:2300,bottom:-2300,near:10,far:8000});sun.shadow.bias=-.0004;scene.add(sun);
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.08,...extra});
  const props=new THREE.Group(),robotGroup=new THREE.Group(),selection=new THREE.Group();scene.add(props,robotGroup,selection);
  robotGroup.userData.robot=true;
  function mesh(geometry,color,parent=props,extra={}) {const m=new THREE.Mesh(geometry,material(color,extra));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(position,size,color,parent=props,extra={}) {const m=mesh(new THREE.BoxGeometry(...size),color,parent,extra);m.position.copy(vec(position));return m;}
  function rod(a,b,r,color,parent=props) {const m=mesh(new THREE.CylinderGeometry(r,r,1,16),color,parent);placeRod(m,a,b);return m;}
  function placeRod(m,a,b) {const va=vec(a),vb=vec(b);m.position.copy(va).add(vb).multiplyScalar(.5);m.scale.y=va.distanceTo(vb);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());}
  function setFrame(obj,frame) {const m=new THREE.Matrix4().set(frame[0],frame[1],frame[2],0,frame[3],frame[4],frame[5],0,frame[6],frame[7],frame[8],0,0,0,0,1);obj.quaternion.setFromRotationMatrix(m);}
  const labelHost=document.createElement('div');labelHost.className='scene-labels';host.append(labelHost);
  let jointMeshes=[],jointLabels=[],baseGroup,tool,latest,selected=0,labels=true,dirty=true,scenarioId=null,targetMeshes=[],targetLabels=[],viewMode='overview',placing=false;
  const placementGhost=mesh(new THREE.BoxGeometry(300,300,12),0x499978,scene,{transparent:true,opacity:.55,depthTest:false});placementGhost.visible=false;placementGhost.renderOrder=10;placementGhost.userData.placement=true;
  function disposeGroup(group){while(group.children.length){const child=group.children[0];group.remove(child);child.traverse(n=>{n.geometry?.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());});}}
  function environment(id){
    disposeGroup(props);targetLabels.forEach(label=>label.remove());const s=getScenario(id);
    targetMeshes=buildEnvironment(s,{props,box,rod,mesh});targetLabels=s.targets.map(t=>{const label=document.createElement('span');label.className='plant-label';label.textContent=t.id;labelHost.append(label);return label;});
    scene.userData.scenario=id;props.userData.scenario=id;scenarioId=id;
    Object.assign(sun.shadow.camera,{left:-s.room.width/2-800,right:s.room.width/2+800,top:s.room.depth/2+800,bottom:-s.room.depth/2-800,far:20000});sun.shadow.camera.updateProjectionMatrix();
  }
  function rebuild(model) {
    disposeGroup(robotGroup);jointLabels.forEach(l=>l.remove());jointLabels=[];jointMeshes=[];
    baseGroup=new THREE.Group();robotGroup.add(baseGroup);
    baseGroup.userData.base=model.base;
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
    selected=index;const changed=scenarioId!==model.scenario;if(changed)environment(model.scenario);const key=`${model.base}:${model.joints.length}`;if(key!==topology){rebuild(model);topology=key;}
    latest={model,f:forward(model),observation:observe(model)};const {f,observation}=latest;
    const mount=fixedMount(model);baseGroup.position.set(model.base==='rover'?model.rover.x:mount.x,model.base==='rover'?model.rover.y:mount.y,0);baseGroup.rotation.z=(model.base==='rover'?model.rover.yaw:mount.yaw)*Math.PI/180;
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
      const yaw=(model.base==='rover'?model.rover.yaw:mount.yaw)*Math.PI/180;
      const before=selected?f.frames[selected-1]:[Math.cos(yaw),-Math.sin(yaw),0,Math.sin(yaw),Math.cos(yaw),0,0,0,1];
      for(const [name,basis]of Object.entries({x:[1,0,0],y:[0,1,0],z:[0,0,1]}))selection.add(new THREE.ArrowHelper(vec(transform(before,basis)),pos,135,colours[name],20,10));
    }
    observation.targets.forEach((o,i)=>{const color=o.aligned?0x3e9969:0xb49a54;targetMeshes[i].ring.material.color.setHex(color);targetMeshes[i].dot.material.color.setHex(color);targetLabels[i].classList.toggle('ready',o.aligned);});
    if(changed)overview();dirty=true;
  }
  function labelAt(element,position,offset=0) {
    const p=vec(position).project(camera);element.hidden=!labels||p.z<-1||p.z>1||Math.abs(p.x)>.96||Math.abs(p.y)>.96;
    element.style.left=`${(p.x+1)*host.clientWidth/2}px`;element.style.top=`${(-p.y+1)*host.clientHeight/2+offset}px`;
  }
  function home() {
    viewMode='robot';
    const f=latest?.f;
    const target=f?vec(f.tip).add(vec(f.origins[0])).multiplyScalar(.5):vec([0,0,700]);
    target.z=Math.max(650,target.z);controls.target.copy(target);
    const spread=f?Math.max(1100,...f.origins.map(p=>vec(p).distanceTo(target)),vec(f.tip).distanceTo(target)):1100;
    const d=Math.max(3400,spread*3);camera.position.copy(target).add(vec([d*.86,-d*.96,d*.76]));controls.update();dirty=true;
  }
  function overview(){viewMode='overview';const s=getScenario(scenarioId||'workshop'),direction=vec([.72,-.72,.8]).normalize();controls.target.set(0,0,450);let d=Math.max(s.room.width,s.room.depth);for(let k=0;k<12;k++){camera.position.copy(controls.target).addScaledVector(direction,d);controls.update();camera.updateMatrixWorld();let ratio=1;for(const x of[-s.room.width/2,s.room.width/2])for(const y of[-s.room.depth/2,s.room.depth/2])for(const z of[0,1500]){const p=vec([x,y,z]).project(camera);ratio=Math.max(ratio,Math.abs(p.x)/.88,Math.abs(p.y)/.78);}if(ratio<=1)break;d*=ratio*1.03;}dirty=true;}
  function top(){viewMode='plan';const s=getScenario(scenarioId||'workshop'),d=Math.max(s.room.depth,s.room.width/camera.aspect)/(2*Math.tan(camera.fov*Math.PI/360))*1.15;controls.target.set(0,0,400);camera.position.set(0,-.01,d+400);controls.update();dirty=true;}
  function setPlacement(value){const entering=value&&!placing;placing=value;controls.enabled=!value;renderer.domElement.style.cursor=value?'crosshair':'';placementGhost.visible=value;if(value&&latest){const mount=fixedMount(latest.model);placementGhost.position.set(mount.x,mount.y,8);placementGhost.rotation.z=mount.yaw*Math.PI/180;placementGhost.material.color.setHex(0x499978);}if(entering)top();dirty=true;}
  let down=null;const raycaster=new THREE.Raycaster(),floorPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  function aim(e){const rect=renderer.domElement.getBoundingClientRect();if(!rect.width||!rect.height)return false;camera.updateMatrixWorld();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);return true;}
  function floorPoint(e){if(!aim(e))return null;const point=raycaster.ray.intersectPlane(floorPlane,new THREE.Vector3());return point?{x:Math.round(point.x/50)*50,y:Math.round(point.y/50)*50}:null;}
  renderer.domElement.addEventListener('pointermove',e=>{if(!placing||!latest)return;const p=floorPoint(e);if(!p)return;const mount={...fixedMount(latest.model),...p};placementGhost.position.set(p.x,p.y,8);placementGhost.material.color.setHex(fixedFits(mount,latest.model.scenario)?0x499978:0xc26849);dirty=true;});
  renderer.domElement.addEventListener('pointerdown',e=>{down=e.button===0?[e.clientX,e.clientY]:null;});
  renderer.domElement.addEventListener('pointerup',e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;if(placing){const p=floorPoint(e);if(p)onPlace(p.x,p.y);return;}if(!aim(e))return;const hit=raycaster.intersectObjects(robotGroup.children,true).find(h=>Number.isInteger(h.object.userData.joint));if(hit)onSelect(hit.object.userData.joint);});
  renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
  const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();if(viewMode==='overview')overview();else if(viewMode==='plan')top();dirty=true;});resize.observe(host);
  controls.addEventListener('start',()=>{viewMode='free';});
  controls.addEventListener('change',()=>{dirty=true;});
  renderer.setAnimationLoop(()=>{controls.update();if(!dirty)return;dirty=false;if(latest){jointLabels.forEach((l,i)=>labelAt(l,latest.f.origins[i],-39));targetLabels.forEach((l,i)=>labelAt(l,getScenario(scenarioId).targets[i].position,-35));}renderer.render(scene,camera);});
  home();
  return {supported:true,update,home,top,overview,setPlacement,setLabels(value){labels=value;dirty=true;},dispose(){resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();scene.traverse(n=>{n.geometry?.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());});renderer.dispose();renderer.domElement.remove();labelHost.remove();}};
}
