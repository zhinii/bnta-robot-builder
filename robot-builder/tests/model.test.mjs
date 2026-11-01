import test from 'node:test';
import assert from 'node:assert/strict';
import {starter,clone,forward,usedSlots,setBase,addJoint,removeJoint,changeJoint,validateRobot,readProject,drive,observe,roverFits} from '../model.mjs';
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${a} != ${b}`));
const joint=(axis='z',direction='+x',length=200)=>({axis,direction,length,min:-180,max:180,home:0});
const arm=(joints,pose=joints.map(()=>0))=>({version:1,name:'Test',base:'fixed',joints,pose,rover:{x:0,y:0,yaw:0}});
test('fixed base may use six arm joints; rover consumes exactly one of the six slots',()=>{
  let robot=starter();while(usedSlots(robot)<6)robot=addJoint(robot);
  assert.equal(robot.joints.length,6);assert.throws(()=>addJoint(robot));assert.throws(()=>setBase(robot,'rover'));
  robot=setBase(removeJoint(robot,5),'rover');assert.equal(robot.joints.length,5);assert.equal(usedSlots(robot),6);assert.throws(()=>addJoint(robot));
  robot=setBase(robot,'fixed');assert.equal(usedSlots(addJoint(robot)),6);
});
test('rotating a joint moves its rigid link and camera without stretching',()=>{
  const robot=arm([joint()],[90]),f=forward(robot);near(f.origins[0],[0,0,300]);near(f.ends[0],[0,200,300]);near(f.tip,[0,265,300]);near(f.direction,[0,1,0]);
  near(forward(arm([joint('x')],[90])).tip,[265,0,300]);
});
test('local axes inherit earlier rotations; a later local-X joint is not world-X',()=>{
  const f=forward(arm([joint(),joint('x','+z')],[90,90]));near(f.axes[1],[0,1,0]);near(f.origins[1],[0,200,300]);near(f.tip,[200,265,300]);
});
test('rover translation and yaw move the full arm frame',()=>{
  const robot=setBase(arm([joint()]),'rover');robot.rover={x:0,y:100,yaw:90};const f=forward(robot);near(f.tip,[0,365,260]);near(f.direction,[0,1,0]);
});
test('limits clamp the current pose and home, but reject empty or inverted ranges',()=>{
  const robot=starter();robot.pose[1]=-70;const changed=changeJoint(robot,1,{min:-20});assert.equal(changed.pose[1],-20);assert.equal(changed.joints[1].home,-20);assert.equal(robot.pose[1],-70);
  assert.throws(()=>changeJoint(robot,1,{min:150,max:100}));assert.throws(()=>changeJoint(robot,1,{max:181}));assert.throws(()=>changeJoint(robot,1,{length:700}));assert.throws(()=>changeJoint(robot,1,{axis:'world-x'}));
});
test('project validation rejects overbudget, nonfinite poses and a displaced fixed base',()=>{
  const input=starter();input.base='rover';input.joints=Array.from({length:6},()=>joint());input.pose=input.joints.map(()=>0);assert.throws(()=>validateRobot(input));
  for(const bad of [NaN,Infinity,181,null,'30']){const r=starter();r.pose[0]=bad;assert.throws(()=>validateRobot(r));}
  const r=starter();r.rover.x=50;assert.throws(()=>validateRobot(r));
});
test('rover cannot cross a bed in a large step, and can turn and drive along the aisle',()=>{
  const robot=setBase(starter(),'rover');assert.equal(drive(robot,1200).ok,false);assert.equal(robot.rover.x,0);
  const turn=drive(robot,0,90);assert.equal(turn.ok,true);const advance=drive(turn.robot,1000);assert.equal(advance.ok,true);near([advance.robot.rover.x,advance.robot.rover.y],[0,1000]);
  assert.equal(drive(advance.robot,500).ok,false);assert.equal(roverFits({x:600,y:0}),false);assert.equal(roverFits({x:250,y:0}),false,'wheel footprint clears the bed, not just the chassis centre');
});
test('camera distance and orientation are separate evidence; matching a position is insufficient',()=>{
  const robot=arm([joint('z','+z',500),joint('z','+z',350),joint('z','+x',500)]);
  const o=observe(robot),b=o.targets.find(t=>t.id==='B');assert.equal(o.beds,false);assert.equal(o.floor,false);assert.equal(b.aligned,true);assert.equal(b.distance,85);assert.equal(b.angle,0);
  const turned=clone(robot);turned.joints.push(joint('z','-x',200));turned.pose.push(180);
  const wrong=observe(turned).targets.find(t=>t.id==='B');assert.equal(wrong.distance,15);assert.equal(wrong.angle,180);assert.equal(wrong.aligned,false);
});
test('floor and bench overlaps are reported from the same geometric model',()=>{
  const down=observe(arm([joint('y','+x',500)],[90]));assert.equal(down.floor,true);
  const bed=observe(arm([joint('z','+x',500)]));assert.equal(bed.beds,true);
});
test('project roundtrip preserves geometry, reasoning and independent comparisons',()=>{
  const input={kind:'robot-builder',version:1,robot:starter(),notes:{prediction:'The farther plant will need base travel.',choice:'Trade one arm joint for mobility.',observation:'B is 85 mm away.',revision:'Change one axis.'},evidence:[{robot:setBase(starter(),'rover'),note:'Try the rover.'}]};
  const loaded=readProject(JSON.parse(JSON.stringify(input)));assert.deepEqual(loaded,input);loaded.robot.pose[0]=90;assert.equal(input.robot.pose[0],0);assert.equal(loaded.evidence[0].robot.pose[0],0);
  assert.throws(()=>readProject({...input,notes:{prediction:'x'.repeat(3001)}}));assert.throws(()=>readProject({...input,evidence:Array.from({length:7},()=>input.evidence[0])}));assert.throws(()=>readProject({version:1,robot:starter()}));
});
