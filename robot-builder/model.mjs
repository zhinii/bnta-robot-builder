import {getScenario,SCENARIO_IDS} from './scenarios.mjs';
export {getScenario,SCENARIO_IDS};
export const SLOT_LIMIT=6, LENGTHS=[100,200,300,400,500];
export const PRICES=Object.freeze({budget:1200,joint:100,perMillimetre:.5,fixed:100,rover:400});
export const AXES={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
export const DIRECTIONS={'+x':[1,0,0],'-x':[-1,0,0],'+y':[0,1,0],'-y':[0,-1,0],'+z':[0,0,1],'-z':[0,0,-1]};
const RAD=Math.PI/180;
export const clone=value=>JSON.parse(JSON.stringify(value));
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export const transform=(m,v)=>[0,1,2].map(r=>m[r*3]*v[0]+m[r*3+1]*v[1]+m[r*3+2]*v[2]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
export function multiply(a,b){return Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[c+3]+a[r*3+2]*b[c+6];});}
export function rotation(axis,degrees){const[x,y,z]=axis,c=Math.cos(degrees*RAD),s=Math.sin(degrees*RAD),t=1-c;return[t*x*x+c,t*x*y-s*z,t*x*z+s*y,t*x*y+s*z,t*y*y+c,t*y*z-s*x,t*x*z-s*y,t*y*z+s*x,t*z*z+c];}
export const usedSlots=robot=>robot.joints.length+(robot.base==='rover'?1:0);
export function price(robot){const linkLength=robot.joints.reduce((s,j)=>s+j.length,0),base=PRICES[robot.base],joints=robot.joints.length*PRICES.joint,links=linkLength*PRICES.perMillimetre,total=base+joints+links;return{base,joints,links,total,linkLength,remaining:PRICES.budget-total,affordable:total<=PRICES.budget};}
export const makeJoint=(i=0)=>({axis:i===0?'z':'y',length:i===0?200:300,direction:i===0?'+z':'+x',min:-135,max:135,home:i===1?-60:i===2?30:0});
export function baseStart(scenario,base){return base==='rover'?{...getScenario(scenario).start}:{x:0,y:0,yaw:0};}
export function starter(scenario='workshop'){getScenario(scenario);const joints=[0,1,2].map(makeJoint);return{version:2,scenario,name:'My robot',base:'fixed',joints,pose:joints.map(j=>j.home),rover:baseStart(scenario,'fixed')};}
export function validateRobot(raw){
  if(!raw||![1,2].includes(raw.version)||typeof raw.name!=='string'||raw.name.length>70||!['fixed','rover'].includes(raw.base)||!Array.isArray(raw.joints)||raw.joints.length<1||usedSlots(raw)>SLOT_LIMIT)throw Error('robot');
  const legacy=raw.version===1,scenario=legacy?'museum':raw.scenario;getScenario(scenario);
  const joints=raw.joints.map(j=>{if(!j||!Object.hasOwn(AXES,j.axis)||!Object.hasOwn(DIRECTIONS,j.direction)||![...LENGTHS,350].includes(j.length)||![j.min,j.max,j.home].every(Number.isFinite)||j.min< -180||j.max>180||j.min>=j.max||j.home<j.min||j.home>j.max)throw Error('joint');return{axis:j.axis,length:j.length,direction:j.direction,min:j.min,max:j.max,home:j.home};});
  if(!Array.isArray(raw.pose)||raw.pose.length!==joints.length||raw.pose.some((q,i)=>!Number.isFinite(q)||q<joints[i].min||q>joints[i].max))throw Error('pose');
  if(!raw.rover||![raw.rover.x,raw.rover.y,raw.rover.yaw].every(Number.isFinite)||Math.abs(raw.rover.yaw)>180)throw Error('rover');
  if(raw.base==='fixed'&&(raw.rover.x!==0||raw.rover.y!==0||raw.rover.yaw!==0))throw Error('fixed');
  const rover=legacy?baseStart(scenario,raw.base):{x:raw.rover.x,y:raw.rover.y,yaw:raw.rover.yaw};
  if(raw.base==='rover'&&!roverFits(rover,scenario))throw Error('rover');
  return{version:2,scenario,name:raw.name,base:raw.base,joints,pose:[...raw.pose],rover};
}
export function forward(robot,pose=robot.pose,rover=robot.rover){
  const mobile=robot.base==='rover',anchor=getScenario(robot.scenario).anchor;
  let p=[mobile?rover.x:anchor[0],mobile?rover.y:anchor[1],mobile?260:300],frame=rotation(AXES.z,mobile?rover.yaw:0);
  const origins=[],ends=[],axes=[],frames=[];
  robot.joints.forEach((j,i)=>{origins.push([...p]);axes.push(transform(frame,AXES[j.axis]));frame=multiply(frame,rotation(AXES[j.axis],pose[i]));frames.push([...frame]);p=add(p,transform(frame,DIRECTIONS[j.direction].map(v=>v*j.length)));ends.push([...p]);});
  return{origins,ends,axes,frames,flange:p,tip:add(p,transform(frame,[65,0,0])),rotation:frame,direction:transform(frame,[1,0,0])};
}
export function purchase(previous,next){const validated=validateRobot(next);if(price(validated).total>PRICES.budget&&price(validated).total>price(previous).total)throw Error('funds');return validated;}
export function setBase(robot,base){const next=clone(robot);next.base=base;next.rover=baseStart(next.scenario,base);return purchase(robot,next);}
export function addJoint(robot){if(usedSlots(robot)>=SLOT_LIMIT)throw Error('slots');const next=clone(robot),joint=makeJoint(next.joints.length);joint.length=100;joint.home=0;next.joints.push(joint);next.pose.push(0);return purchase(robot,next);}
export function removeJoint(robot,index){if(robot.joints.length<=1||!Number.isInteger(index)||index<0||index>=robot.joints.length)throw Error('joint');const next=clone(robot);next.joints.splice(index,1);next.pose.splice(index,1);return validateRobot(next);}
export function changeJoint(robot,index,patch){const next=clone(robot),j=next.joints[index];Object.assign(j,patch);j.home=clamp(j.home,j.min,j.max);next.pose[index]=clamp(next.pose[index],j.min,j.max);return purchase(robot,next);}
export const ROVER_RADIUS=260;
export function roverFits(rover,scenarioId){const{room,obstacles}=getScenario(scenarioId);if(![rover.x,rover.y].every(Number.isFinite)||Math.abs(rover.x)>room.width/2-ROVER_RADIUS||Math.abs(rover.y)>room.depth/2-ROVER_RADIUS)return false;return!obstacles.some(b=>rover.x>b.min[0]-ROVER_RADIUS&&rover.x<b.max[0]+ROVER_RADIUS&&rover.y>b.min[1]-ROVER_RADIUS&&rover.y<b.max[1]+ROVER_RADIUS);}
export function drive(robot,amount=0,turn=0){
  if(robot.base!=='rover'||!price(robot).affordable||![amount,turn].every(Number.isFinite)||Math.abs(amount)>10000||Math.abs(turn)>360)return{ok:false,robot};
  const next=clone(robot),start=robot.rover,steps=Math.max(1,Math.ceil(Math.abs(amount)/20));
  for(let k=1;k<=steps;k++){const candidate={x:start.x+Math.cos(start.yaw*RAD)*amount*k/steps,y:start.y+Math.sin(start.yaw*RAD)*amount*k/steps,yaw:((start.yaw+turn+540)%360)-180};if(!roverFits(candidate,robot.scenario))return{ok:false,robot};next.rover=candidate;}
  return{ok:true,robot:validateRobot(next)};
}
function segmentBox(a,b,box,padding=25){let low=0,high=1;for(let i=0;i<3;i++){const delta=b[i]-a[i],min=box.min[i]-padding,max=box.max[i]+padding;if(Math.abs(delta)<1e-10){if(a[i]<min||a[i]>max)return false;continue;}const p=(min-a[i])/delta,q=(max-a[i])/delta;low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>high)return false;}return true;}
export function observe(robot){
  const f=forward(robot),scenario=getScenario(robot.scenario),segments=f.origins.map((p,i)=>[p,f.ends[i]]);segments.push([f.flange,f.tip]);
  const floor=segments.some(s=>s.some(p=>p[2]<25)),blocked=segments.some(s=>scenario.obstacles.some(b=>segmentBox(...s,b))),affordable=price(robot).affordable;
  const targets=scenario.targets.map(t=>{const separation=distance(f.tip,t.position),angle=Math.acos(clamp(f.direction.reduce((s,v,i)=>s+v*t.direction[i],0),-1,1))/RAD;return{id:t.id,distance:separation,angle,aligned:separation<=120&&angle<=20&&!floor&&!blocked&&affordable};});
  return{tip:f.tip,targets,floor,blocked,affordable};
}
export function readProject(raw){
  if(raw?.kind!=='robot-builder'||![1,2].includes(raw.version))throw Error('file');
  const robot=validateRobot(raw.robot),notes={};
  for(const key of ['prediction','choice','observation','revision']){if(raw.notes?.[key]!==undefined&&(typeof raw.notes[key]!=='string'||raw.notes[key].length>3000))throw Error('notes');notes[key]=raw.notes?.[key]||'';}
  const evidence=raw.evidence??[];if(!Array.isArray(evidence)||evidence.length>6)throw Error('evidence');
  const entries=evidence.map(e=>{const saved=validateRobot(e.robot);if(saved.scenario!==robot.scenario||typeof e.note!=='string'||e.note.length>3000)throw Error('evidence');return{robot:saved,note:e.note,...((raw.version===1||e.legacy===true)?{legacy:true}:{})};});
  return{kind:'robot-builder',version:2,robot,notes,evidence:entries,...((raw.version===1||raw.legacy===true)?{legacy:true}:{})};
}
