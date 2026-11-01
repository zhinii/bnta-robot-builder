// Robot Builder: a configurable serial chain. All distances are millimetres.
export const SLOT_LIMIT = 6;
export const LENGTHS = [200, 350, 500];
export const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
export const DIRECTIONS = { '+x': [1,0,0], '-x': [-1,0,0], '+y': [0,1,0], '-y': [0,-1,0], '+z': [0,0,1], '-z': [0,0,-1] };
const I = [1,0,0,0,1,0,0,0,1], RAD = Math.PI / 180;
export const clone = value => JSON.parse(JSON.stringify(value));
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const distance = (a,b) => Math.hypot(...a.map((v,i) => v-b[i]));
export const transform = (m,v) => [0,1,2].map(r => m[r*3]*v[0]+m[r*3+1]*v[1]+m[r*3+2]*v[2]);
const add = (a,b) => a.map((v,i)=>v+b[i]);
export function multiply(a,b) {
  return Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[c+3]+a[r*3+2]*b[c+6];});
}
export function rotation(axis, degrees) {
  const [x,y,z]=axis,c=Math.cos(degrees*RAD),s=Math.sin(degrees*RAD),t=1-c;
  return [t*x*x+c,t*x*y-s*z,t*x*z+s*y,t*x*y+s*z,t*y*y+c,t*y*z-s*x,t*x*z-s*y,t*y*z+s*x,t*z*z+c];
}
export const usedSlots = robot => robot.joints.length + (robot.base === 'rover' ? 1 : 0);
export const makeJoint = (i=0) => ({axis:i===0?'z':'y',length:350,direction:i===0?'+z':'+x',min:-135,max:135,home:i===1?-35:i===2?55:0});
export function starter() {
  const joints = [0,1,2].map(makeJoint);
  return {version:1,name:'My greenhouse robot',base:'fixed',joints,pose:joints.map(j=>j.home),rover:{x:0,y:0,yaw:0}};
}
export function validateRobot(raw) {
  if (!raw || raw.version!==1 || typeof raw.name!=='string' || raw.name.length>70 || !['fixed','rover'].includes(raw.base) || !Array.isArray(raw.joints) || raw.joints.length<1 || usedSlots(raw)>SLOT_LIMIT) throw Error('robot');
  const joints=raw.joints.map(j=>{
    if (!j || !Object.hasOwn(AXES,j.axis) || !Object.hasOwn(DIRECTIONS,j.direction) || !LENGTHS.includes(j.length) || ![j.min,j.max,j.home].every(Number.isFinite) || j.min < -180 || j.max > 180 || j.min >= j.max || j.home<j.min || j.home>j.max) throw Error('joint');
    return {axis:j.axis,length:j.length,direction:j.direction,min:j.min,max:j.max,home:j.home};
  });
  if (!Array.isArray(raw.pose) || raw.pose.length!==joints.length || raw.pose.some((q,i)=>!Number.isFinite(q)||q<joints[i].min||q>joints[i].max)) throw Error('pose');
  const rover=raw.rover;
  if (!rover || ![rover.x,rover.y,rover.yaw].every(Number.isFinite) || Math.abs(rover.x)>1800 || Math.abs(rover.y)>1500 || Math.abs(rover.yaw)>180) throw Error('rover');
  if(raw.base==='fixed' && (rover.x!==0 || rover.y!==0 || rover.yaw!==0)) throw Error('fixed');
  if(raw.base==='rover' && !roverFits(rover)) throw Error('rover');
  return {version:1,name:raw.name,base:raw.base,joints,pose:[...raw.pose],rover:{x:rover.x,y:rover.y,yaw:rover.yaw}};
}
export function forward(robot, pose=robot.pose, rover=robot.rover) {
  const mobile=robot.base==='rover';
  let p=[mobile?rover.x:0,mobile?rover.y:0,mobile?260:300],frame=rotation(AXES.z,mobile?rover.yaw:0);
  const origins=[],ends=[],axes=[],frames=[];
  robot.joints.forEach((j,i)=>{
    origins.push([...p]); axes.push(transform(frame,AXES[j.axis]));
    frame=multiply(frame,rotation(AXES[j.axis],pose[i])); frames.push([...frame]);
    p=add(p,transform(frame,DIRECTIONS[j.direction].map(v=>v*j.length)));ends.push([...p]);
  });
  const tip=add(p,transform(frame,[65,0,0]));
  return {origins,ends,axes,frames,flange:p,tip,rotation:frame,direction:transform(frame,[1,0,0])};
}
export function setBase(robot, base) {
  const next=clone(robot);next.base=base;next.rover={x:0,y:0,yaw:0};
  return validateRobot(next);
}
export function addJoint(robot) {
  if(usedSlots(robot)>=SLOT_LIMIT) throw Error('budget');
  const next=clone(robot),joint=makeJoint(next.joints.length);joint.length=200;joint.home=0;
  next.joints.push(joint);next.pose.push(0);return validateRobot(next);
}
export function removeJoint(robot, index) {
  if(robot.joints.length<=1 || !Number.isInteger(index) || index<0 || index>=robot.joints.length) throw Error('joint');
  const next=clone(robot);next.joints.splice(index,1);next.pose.splice(index,1);return validateRobot(next);
}
export function changeJoint(robot, index, patch) {
  const next=clone(robot),j=next.joints[index];Object.assign(j,patch);
  j.home=clamp(j.home,j.min,j.max);next.pose[index]=clamp(next.pose[index],j.min,j.max);
  return validateRobot(next);
}
// A fictional school greenhouse, with dimensions and fixtures shared by rendering and checks.
export const ROOM = {width:3600,depth:3000};
export const BEDS = [
  {id:'left',min:[-1450,-1150,0],max:[-500,1150,620]},
  {id:'right',min:[500,-1150,0],max:[1450,1150,620]},
];
export const TARGETS = [
  {id:'A',position:[-650,-700,900],direction:[-1,0,0]},
  {id:'B',position:[650,0,1150],direction:[1,0,0]},
  {id:'C',position:[-650,800,1000],direction:[-1,0,0]},
];
// Covers the visible chassis and wheels (outer corner is approximately 257 mm).
export const ROVER_RADIUS=260;
export function roverFits(rover) {
  if(Math.abs(rover.x)>ROOM.width/2-ROVER_RADIUS || Math.abs(rover.y)>ROOM.depth/2-ROVER_RADIUS) return false;
  return !BEDS.some(b=>rover.x>b.min[0]-ROVER_RADIUS && rover.x<b.max[0]+ROVER_RADIUS && rover.y>b.min[1]-ROVER_RADIUS && rover.y<b.max[1]+ROVER_RADIUS);
}
export function drive(robot, amount=0, turn=0) {
  if(robot.base!=='rover') return {ok:false,robot};
  const next=clone(robot),start=robot.rover,steps=Math.max(1,Math.ceil(Math.abs(amount)/20));
  for(let k=1;k<=steps;k++) {
    const candidate={x:start.x+Math.cos(start.yaw*RAD)*amount*k/steps,y:start.y+Math.sin(start.yaw*RAD)*amount*k/steps,yaw:((start.yaw+turn+540)%360)-180};
    if(!roverFits(candidate)) return {ok:false,robot};
    next.rover=candidate;
  }
  return {ok:true,robot:validateRobot(next)};
}
function segmentBox(a,b,box,padding=18) {
  let low=0,high=1;
  for(let i=0;i<3;i++) {
    const delta=b[i]-a[i],min=box.min[i]-padding,max=box.max[i]+padding;
    if(Math.abs(delta)<1e-10) {if(a[i]<min||a[i]>max) return false;continue;}
    const p=(min-a[i])/delta,q=(max-a[i])/delta;
    low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>high)return false;
  }
  return true;
}
export function observe(robot) {
  const f=forward(robot),segments=f.origins.map((p,i)=>[p,f.ends[i]]);segments.push([f.flange,f.tip]);
  const floor=segments.some(s=>s.some(p=>p[2]<18)),beds=segments.some(s=>BEDS.some(b=>segmentBox(...s,b)));
  const targets=TARGETS.map(target=>{
    const separation=distance(f.tip,target.position),angle=Math.acos(clamp(f.direction.reduce((sum,v,i)=>sum+v*target.direction[i],0),-1,1))/RAD;
    return {id:target.id,distance:separation,angle,aligned:separation<=120&&angle<=20&&!floor&&!beds};
  });
  return {tip:f.tip,targets,floor,beds};
}
export function readProject(raw) {
  if(raw?.kind!=='robot-builder' || raw.version!==1) throw Error('file');
  const robot=validateRobot(raw.robot),notes={};
  for(const key of ['prediction','choice','observation','revision']) {
    if(raw.notes?.[key]!==undefined && (typeof raw.notes[key]!=='string'||raw.notes[key].length>3000))throw Error('notes');
    notes[key]=raw.notes?.[key]||'';
  }
  const evidence=raw.evidence??[];
  if(!Array.isArray(evidence)||evidence.length>6)throw Error('evidence');
  return {kind:'robot-builder',version:1,robot,notes,evidence:evidence.map(e=>({robot:validateRobot(e.robot),note:typeof e.note==='string'&&e.note.length<=3000?e.note:''}))};
}
