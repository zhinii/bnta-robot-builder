export const JOINTS=[
 {name:'base',axis:[0,0,1],length:0,limits:[-180,180],home:0},
 {name:'shoulder',axis:[0,-1,0],length:160,limits:[-20,150],home:55},
 {name:'elbow',axis:[0,-1,0],length:140,limits:[-150,150],home:-85},
 {name:'swivel',axis:[0,0,1],length:70,limits:[-150,150],home:0},
 {name:'wristPitch',axis:[0,-1,0],length:55,limits:[-120,120],home:30},
 {name:'toolRoll',axis:[1,0,0],length:35,limits:[-180,180],home:0}
];
export const ARM={base:70,upper:160,fore:140,limits:JOINTS.map(j=>j.limits),home:JOINTS.slice(0,3).map(j=>j.home)};
export const homeFor=n=>JOINTS.slice(0,n).map(j=>j.home);
export const reachFor=n=>JOINTS.slice(0,n).reduce((sum,j)=>sum+j.length,0);
const rad=Math.PI/180,I=[1,0,0,0,1,0,0,0,1];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const transpose=m=>[m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
export const transform=(m,v)=>[0,1,2].map(r=>m[r*3]*v[0]+m[r*3+1]*v[1]+m[r*3+2]*v[2]);
export function multiply(a,b){return Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[c+3]+a[r*3+2]*b[c+6];});}
function rotation([x,y,z],angle){const c=Math.cos(angle),s=Math.sin(angle),t=1-c;return [t*x*x+c,t*x*y-s*z,t*x*z+s*y,t*x*y+s*z,t*y*y+c,t*y*z-s*x,t*x*z-s*y,t*y*z+s*x,t*z*z+c];}
// Intrinsic roll/pitch/yaw representation: Rz(yaw) Ry(pitch) Rx(roll).
export function rotationFromEuler([roll,pitch,yaw]){return multiply(multiply(rotation([0,0,1],yaw*rad),rotation([0,1,0],pitch*rad)),rotation([1,0,0],roll*rad));}
export function orientationError(desired,actual){const m=multiply(desired,transpose(actual)),angle=Math.acos(Math.max(-1,Math.min(1,(m[0]+m[4]+m[8]-1)/2)));if(angle<1e-8)return [0,0,0];let axis=[m[7]-m[5],m[2]-m[6],m[3]-m[1]];if(Math.PI-angle<1e-5){const k=[m[0],m[4],m[8]].indexOf(Math.max(m[0],m[4],m[8]));axis=[0,0,0];axis[k]=Math.sqrt(Math.max(0,(m[k*3+k]+1)/2));for(let i=0;i<3;i++)if(i!==k)axis[i]=(m[k*3+i]+m[i*3+k])/(4*axis[k]);return axis.map(v=>v*angle);}return axis.map(v=>v*angle/(2*Math.sin(angle)));}
export function fk(q){let position=[0,0,ARM.base],frame=[...I];const points=[[...position]],origins=[],axes=[],frames=[];
 q.forEach((angle,i)=>{const joint=JOINTS[i];origins.push([...position]);axes.push(transform(frame,joint.axis));frame=multiply(frame,rotation(joint.axis,angle*rad));frames.push([...frame]);if(joint.length){position=add(position,transform(frame,[joint.length,0,0]));points.push([...position]);}});
 const pitch=Math.asin(Math.max(-1,Math.min(1,-frame[6]))),gimbal=Math.abs(Math.cos(pitch))<1e-7;
 const rpy=[gimbal?0:Math.atan2(frame[7],frame[8]),pitch,gimbal?Math.atan2(-frame[1],frame[4]):Math.atan2(frame[3],frame[0])].map(v=>v/rad);
 return {elbow:points[1],tip:position,points,origins,axes,frames,rotation:frame,rpy};
}
// All tools use an axial mount: flange +X is the tool approach direction.
// Tool-local -Z points out of the wrist; its working origin is 40 mm forward.
export const TOOL_LENGTH=40;
export const TOOL_MOUNT=[0,0,-1,0,1,0,1,0,0];
export function toolPose(q){const f=fk(q),offset=transform(f.rotation,[TOOL_LENGTH,0,0]),r=multiply(f.rotation,TOOL_MOUNT),pitch=Math.asin(Math.max(-1,Math.min(1,-r[6]))),gimbal=Math.abs(Math.cos(pitch))<1e-7;
 return {...f,flange:[...f.tip],tip:f.tip.map((v,i)=>v+offset[i]),rotation:r,rpy:[gimbal?0:Math.atan2(r[7],r[8]),pitch,gimbal?Math.atan2(-r[1],r[4]):Math.atan2(r[3],r[0])].map(v=>v/rad)};
}
export const toolReachFor=n=>reachFor(n)+TOOL_LENGTH;
export function valid(q){if(!Array.isArray(q)||q.length<3||q.length>6||q.some((v,i)=>!Number.isFinite(v)||v<JOINTS[i].limits[0]-1e-7||v>JOINTS[i].limits[1]+1e-7))return false;const {points}=fk(q);return points.slice(1).every((p,i)=>p[2]>=(i===points.length-2?12:18));}
export const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function pathSafe(a,b){if(a.length!==b.length||!valid(a)||!valid(b))return false;const n=Math.max(1,Math.ceil(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))/.5));for(let k=0;k<=n;k++)if(!valid(a.map((v,i)=>v+(b[i]-v)*k/n)))return false;return true;}
function analyticIK(p,current,branch,fore=ARM.fore){const [x,y,z]=p,r=Math.hypot(x,y),h=z-ARM.base,c=(r*r+h*h-ARM.upper**2-fore**2)/(2*ARM.upper*fore);if(c>1+1e-9||c< -1-1e-9)return {error:'reach'};const candidates=[];
 for(const sign of [1,-1])for(const es of [-1,1]){let base=r<1e-8?current[0]:Math.atan2(y,x)/rad+(sign===-1?180:0);while(base>180)base-=360;while(base< -180)base+=360;const e=es*Math.acos(Math.max(-1,Math.min(1,c))),s=Math.atan2(h,sign*r)-Math.atan2(fore*Math.sin(e),ARM.upper+fore*Math.cos(e));const q=[base,s/rad,e/rad];if(valid(q)&&(branch==='nearest'||(branch==='negative'?q[2]<=0:q[2]>=0)))candidates.push(q);}
 candidates.sort((a,b)=>distance(a,current)-distance(b,current));if(!candidates.length)return {error:'limits'};const q=candidates.find(q=>pathSafe(current,q));return q?{q}:{error:'path'};
}
function linearSolve(matrix,vector){const a=matrix.map((row,i)=>[...row,vector[i]]),n=a.length;for(let c=0;c<n;c++){let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;[a[c],a[pivot]]=[a[pivot],a[c]];if(Math.abs(a[c][c])<1e-12)return null;const d=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=d;for(let r=0;r<n;r++)if(r!==c){const f=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=f*a[c][j];}}return a.map(row=>row[n]);}
function numericalIK(p,current,desired,pose=fk,extraSeeds=[],accept=null,checkPath=true){const n=current.length,base=Math.atan2(p[1],p[0])/rad,seeds=[[...current],homeFor(n)];for(const s of [25,70,120])for(const e of [-110,-45,65]){const seed=homeFor(n);seed[0]=base;seed[1]=s;seed[2]=e;if(n>=4)seed[3]=s===120?70:-35;seeds.push(seed);}seeds.push(...extraSeeds);let blocked=false;
 for(const seed of seeds){let q=[...seed];for(let iteration=0;iteration<280;iteration++){const f=pose(q),pos=sub(p,f.tip),ori=desired?orientationError(desired,f.rotation):[],error=[...pos,...ori.map(v=>v*90)];if(Math.hypot(...pos)<.12&&(!desired||Math.hypot(...ori)<.004)){if(valid(q)){if((!checkPath||pathSafe(current,q))&&(!accept||accept(q)))return {q};blocked=true;}break;}
 const columns=f.axes.map((axis,i)=>[...cross(axis,sub(f.tip,f.origins[i])).map(v=>v*rad),...(desired?axis.map(v=>v*rad*90):[])]),rows=error.length;
 const matrix=Array.from({length:rows},(_,r)=>Array.from({length:rows},(_,c)=>columns.reduce((sum,j)=>sum+j[r]*j[c],0)+(r===c?.45:0)));
 const y=linearSolve(matrix,error);if(!y)break;let delta=columns.map(col=>col.reduce((sum,v,j)=>sum+v*y[j],0)),max=Math.max(...delta.map(Math.abs));if(max>9)delta=delta.map(v=>v*9/max);const next=q.map((v,i)=>Math.max(JOINTS[i].limits[0],Math.min(JOINTS[i].limits[1],v+delta[i])));if(distance(next,q)<1e-7)break;q=next;
 }}return {error:blocked?'path':'solve'};
}
export function ik(p,current=ARM.home,branch='nearest',orientation=null){if(!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v)))return {error:'numbers'};if(!valid(current))return {error:'limits'};if(orientation&&(current.length!==6||!Array.isArray(orientation)||orientation.length!==3||orientation.some(v=>!Number.isFinite(v)||Math.abs(v)>180)))return {error:'orientationInvalid'};if(distance(p,[0,0,ARM.base])>reachFor(current.length)+1e-7)return {error:'reach'};if(p[2]<12)return {error:'limits'};return current.length===3?analyticIK(p,current,branch):numericalIK(p,current,orientation?rotationFromEuler(orientation):null);}
// Endpoint-only solving is for planners that independently validate the full
// swept route. Ordinary Cartesian moves retain the direct-path requirement.
export function ikTool(p,current=ARM.home,branch='nearest',orientation=null,accept=null,checkPath=true){
 if(!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v)))return {error:'numbers'};
 if(!valid(current))return {error:'limits'};
 if(orientation&&(current.length!==6||!Array.isArray(orientation)||orientation.length!==3||orientation.some(v=>!Number.isFinite(v)||Math.abs(v)>180)))return {error:'orientationInvalid'};
 if(distance(p,[0,0,ARM.base])>toolReachFor(current.length)+1e-7)return {error:'reach'};
 if(p[2]<0)return {error:'limits'};
 // Downward poses near the bed edge need wrist-aligned seeds; retain all real-start path checks.
 const base=Math.atan2(p[1],p[0])/rad,down=current.length===6&&orientation&&Math.abs(orientation[0])<.01&&Math.abs(orientation[1])<.01;
 const wrist=down?((base-orientation[2]+540)%360)-180:0;
 const seeds=down?[[base,80,-90,0,-80,wrist],[base,90,-110,0,-70,wrist]]:[];
 if(orientation&&!down)for(const swivel of [-90,90])for(const roll of [-90,90])for(const shoulder of [50,100])seeds.push([base,shoulder,-100,swivel,-60,roll]);
 return current.length===3?analyticIK(p,current,branch,ARM.fore+TOOL_LENGTH):numericalIK(p,current,orientation?rotationFromEuler(orientation):null,toolPose,seeds,accept,checkPath);
}
export function readProgram(data){
 const n=data?.version===1?3:data?.jointCount;
 if(![1,2,3].includes(data?.version)||!Number.isInteger(n)||n<3||n>6||!Array.isArray(data.steps)||data.steps.length>200||(data.version===3&&!['gripper','vacuum','magnet'].includes(data.tool)))throw Error('Invalid program');
 const steps=data.steps.map(s=>{if(!s||typeof s.name!=='string'||s.name.length>60||!Number.isFinite(s.seconds))throw Error('Invalid step');
 const type=s.type||'move';if(type==='move'){if(!valid(s.q)||s.q.length!==n||s.seconds<.5||s.seconds>15)throw Error('Invalid move');return {...(s.type?{type}:{}),name:s.name,q:[...s.q],seconds:s.seconds};}
 if(data.version!==3||!['output','wait','delay'].includes(type)||s.seconds<.1||s.seconds>30||((type==='output'||type==='wait')&&typeof s.value!=='boolean'))throw Error('Invalid instruction');
 return {type,name:s.name,seconds:s.seconds,...(type!=='delay'?{value:s.value}:{})};
 });return {jointCount:n,steps,...(data.version===3?{tool:data.tool}:{})};
}
export const validateProgram=data=>readProgram(data).steps;
export const TARGETS=[[180,-120,100],[220,0,150],[150,150,110]];
