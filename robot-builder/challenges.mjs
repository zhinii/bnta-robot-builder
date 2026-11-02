import {clone,forward,observe,price,getScenario,clamp,distance,transform,roverFits} from './model.mjs';
export const freshRun=()=>({step:0,delivered:0,holding:false,watered:[],watering:null});
export const currentStep=(robot,run)=>getScenario(robot.scenario).steps[run.step]??null;
const targetFor=(robot,step)=>getScenario(robot.scenario).targets.find(t=>t.id===step.target);
function solveLinear(a,b){a=a.map((r,i)=>[...r,b[i]]);for(let k=0;k<b.length;k++){let p=k;for(let i=k+1;i<b.length;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;[a[k],a[p]]=[a[p],a[k]];if(Math.abs(a[k][k])<1e-12)return null;const d=a[k][k];for(let j=k;j<=b.length;j++)a[k][j]/=d;for(let i=0;i<b.length;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=b.length;j++)a[i][j]-=f*a[k][j];}}return a.map(r=>r[b.length]);}
const features=f=>[...f.tip.map(x=>x/100),...f.direction.map(x=>x*.55),f.rotation[8]*.25];
export function solveTarget(robot,target){
 const n=robot.joints.length,goal=[...target.position.map(x=>x/100),...target.direction.map(x=>x*.55),.25],seeds=[robot.pose,robot.joints.map(j=>j.home)];
 for(const turn of [-150,-90,-45,0,45,90,150])for(const bend of [-60,30])seeds.push(robot.joints.map((j,i)=>clamp(i===0?turn:i===1?bend:i===2?-bend:0,j.min,j.max)));
 const answers=[];let nearest=Infinity;
 for(const seed of seeds){let q=[...seed];for(let iteration=0;iteration<85;iteration++){
   const f=forward(robot,q),y=features(f),e=goal.map((g,i)=>g-y[i]);nearest=Math.min(nearest,distance(f.tip,target.position));
   const columns=q.map((_,i)=>{const next=[...q];next[i]+=.25;return features(forward(robot,next)).map((v,k)=>(v-y[k])/.25);});
   const a=columns.map((c,i)=>columns.map((d,j)=>c.reduce((v,x,k)=>v+x*d[k],0)+(i===j?.00015:0))),b=columns.map(c=>c.reduce((v,x,k)=>v+x*e[k],0)),dq=solveLinear(a,b);if(!dq)break;
   q=q.map((x,i)=>clamp(x+clamp(dq[i],-16,16),robot.joints[i].min,robot.joints[i].max));
   if(dq.every(x=>Math.abs(x)<.015))break;
  }
  const candidate={...robot,pose:q},obs=observe(candidate),f=forward(candidate),reading=obs.targets.find(t=>t.id===target.id),angle=Math.acos(clamp(f.direction.reduce((v,x,i)=>v+x*target.direction[i],0),-1,1))*180/Math.PI;
  if(distance(f.tip,target.position)<18&&angle<(robot.scenario==='hospital'?65:35)&&f.rotation[8]>.84&&!obs.blocked&&!obs.floor){answers.push(candidate);if(answers.length>=5)break;}
 }
 answers.sort((a,b)=>a.pose.reduce((v,q,i)=>v+Math.abs(q-robot.pose[i]),0)-b.pose.reduce((v,q,i)=>v+Math.abs(q-robot.pose[i]),0));return{answers,nearest};
}
export function payloadClear(robot,holding){
 if(!holding)return true;const f=forward(robot),tray=getScenario(robot.scenario).tool==='tray';if(f.rotation[8]<.82)return false;
 const points=[];for(const x of tray?[-156,156]:[-95,95])for(const y of tray?[-111,111]:[-75,75])for(const z of tray?[-77,-46]:[-86,-54])points.push(transform(f.rotation,[x,y,z]).map((v,i)=>v+f.tip[i]));
 const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))),s=getScenario(robot.scenario);
 if(min[2]<0||min[0]<-s.room.width/2||max[0]>s.room.width/2||min[1]<-s.room.depth/2||max[1]>s.room.depth/2)return false;
 return !s.obstacles.some(b=>[0,1,2].every(i=>max[i]>b.min[i]+2&&min[i]<b.max[i]-2));
}
export function clearPose(robot,holding=false){const o=observe(robot);return !o.floor&&!o.blocked&&o.affordable&&payloadClear(robot,holding);}
export function posePath(from,to,holding=false){
 const frames=[],count=Math.max(1,Math.ceil(Math.max(...to.pose.map((q,i)=>Math.abs(q-from.pose[i])))/2));
 for(let i=0;i<=count;i++){const r=clone(from);r.pose=from.pose.map((q,j)=>q+(to.pose[j]-q)*i/count);if(!clearPose(r,holding))return null;frames.push(r);}return frames;
}
export function planStep(robot,run){
 if(!price(robot).affordable)return{ok:false,reason:'budget'};const step=currentStep(robot,run);if(!step)return{ok:false,reason:'finished'};
 if((step.action==='pick'&&run.holding)||(step.action==='place'&&!run.holding))return{ok:false,reason:'order'};
 const t=targetFor(robot,step),solution=solveTarget(robot,t);
 for(const end of solution.answers){if(step.action==='pick'&&!payloadClear(end,true))continue;const direct=posePath(robot,end,run.holding);if(direct)return{ok:true,frames:direct,end,step};
  const rest={...clone(robot),pose:robot.joints.map(j=>j.home)},first=posePath(robot,rest,run.holding),last=posePath(rest,end,run.holding);if(first&&last)return{ok:true,frames:[...first,...last],end,step};
 }
 return{ok:false,reason:solution.answers.length?'blocked':'reach',nearest:solution.nearest};
}
export function completeStep(robot,run){
 const step=currentStep(robot,run);if(!step)return run;const target=targetFor(robot,step),f=forward(robot),o=observe(robot).targets.find(t=>t.id===target.id);
 if((step.action==='pick'&&!payloadClear(robot,true))||!o?.aligned||distance(f.tip,target.position)>18||!clearPose(robot,run.holding)||(step.action==='pick'&&run.holding)||(step.action==='place'&&!run.holding))throw Error('task');
 const next=clone(run);next.step++;next.watering=null;if(step.action==='water')next.watered.push(target.id);if(step.action==='pick')next.holding=true;if(step.action==='place'){next.holding=false;next.delivered++;}return next;
}
export function planStation(robot,run,station){
 if(robot.base!=='rover'||!price(robot).affordable)return{ok:false,reason:'budget'};
 const rest={...clone(robot),pose:robot.joints.map(j=>j.home)},frames=posePath(robot,rest,run.holding);if(!frames)return{ok:false,reason:'blocked'};
 let previous=rest;
 // Travel via the open centre aisle. Every chassis and arm pose is checked.
 function segment(goal){const start=clone(previous),turn=((goal.yaw-start.rover.yaw+540)%360)-180,count=Math.max(1,Math.ceil(distance([start.rover.x,start.rover.y],[goal.x,goal.y])/20),Math.ceil(Math.abs(turn)/2));for(let i=1;i<=count;i++){const next=clone(start);next.rover={x:start.rover.x+(goal.x-start.rover.x)*i/count,y:start.rover.y+(goal.y-start.rover.y)*i/count,yaw:((start.rover.yaw+turn*i/count+540)%360)-180};if(!roverFits(next.rover,robot.scenario)||!clearPose(next,run.holding))return false;frames.push(next);previous=next;}return true;}
 for(const goal of [{x:0,y:rest.rover.y},{x:0,y:station.y},station]){
  const dx=goal.x-previous.rover.x,dy=goal.y-previous.rover.y;if(Math.hypot(dx,dy)<.1)continue;
  const yaw=Math.atan2(dy,dx)*180/Math.PI;
  if(!segment({...previous.rover,yaw})||!segment({...goal,yaw}))return{ok:false,reason:'blocked'};
 }
 if(!segment({...previous.rover,yaw:station.yaw}))return{ok:false,reason:'blocked'};

 return{ok:true,frames,end:previous};
}
