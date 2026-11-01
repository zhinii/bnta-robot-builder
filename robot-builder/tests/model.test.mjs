import test from 'node:test';
import assert from 'node:assert/strict';
import {starter,clone,forward,usedSlots,setBase,addJoint,removeJoint,changeJoint,validateRobot,readProject,drive,observe,roverFits,price,baseStart,getScenario,SCENARIO_IDS,fixedFits,fixedMount,placeFixed,readWorkspace} from '../model.mjs';
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${a} != ${b}`));
const joint=(axis='z',direction='+x',length=200)=>({axis,direction,length,min:-180,max:180,home:0});
const arm=(joints,pose=joints.map(()=>0),scenario='workshop',base='fixed')=>({version:2,scenario,name:'Test',base,joints,pose,rover:baseStart(scenario,base)});
test('six slots remain a separate constraint, and a rover uses one',()=>{
  let robot=arm([joint('z','+x',100)]);while(usedSlots(robot)<6)robot=addJoint(robot);
  assert.equal(robot.joints.length,6);assert.throws(()=>addJoint(robot),/slots/);assert.throws(()=>setBase(robot,'rover'));
  robot=setBase(removeJoint(robot,5),'rover');assert.equal(robot.joints.length,5);assert.equal(usedSlots(robot),6);assert.equal(price(robot).total,1150);assert.throws(()=>addJoint(robot));
});
test('the requested rover trade-offs all cost exactly $1200',()=>{
  for(const lengths of [[300,300,400],[200,200,200,200],[200,100,100,100,100]]){
    const robot=arm(lengths.map(length=>joint('z','+x',length)),undefined,'hospital','rover'),bill=price(robot);
    assert.equal(bill.total,1200);assert.equal(bill.affordable,true);assert.equal(bill.linkLength,{3:1000,4:800,5:600}[lengths.length]);
  }
});
test('longer links and new joints spend money; removal and shortening refund it',()=>{
  let r=arm([joint('z','+z',300),joint('y','+x',300),joint('y','+x',400)],undefined,'hospital','rover');
  assert.throws(()=>addJoint(r),/funds/);assert.throws(()=>changeJoint(r,0,{length:400}),/funds/);
  r=changeJoint(r,0,{length:100});assert.equal(price(r).remaining,100);r=changeJoint(r,2,{length:300});assert.equal(price(r).remaining,150);r=addJoint(r);assert.equal(price(r).remaining,0);
  const cheaper=removeJoint(r,3);assert.equal(price(cheaper).remaining,150);assert.equal(price(setBase(cheaper,'fixed')).total,750);
});
test('local axes inherit the upstream frame and links stay rigid',()=>{
  const f=forward(arm([joint(),joint('x','+z')],[90,90]));near(f.axes[1],[0,1,0]);near(f.origins[1],[0,200,300]);near(f.tip,[200,265,300]);near(forward(arm([joint('x')],[90])).tip,[265,0,300]);
});
test('rover and fixed mounting positions use their selected scene',()=>{
  const r=arm([joint()],undefined,'greenhouse');near(forward(r).tip,[265,-3000,300]);const mobile=setBase(r,'rover');near(forward(mobile).tip,[0,-2735,260]);
  for(const id of SCENARIO_IDS)assert.ok(roverFits(baseStart(id,'rover'),id));
});
test('each scene begins with an affordable pose clear of its fixtures and floor',()=>{
  for(const id of SCENARIO_IDS)for(const base of ['fixed','rover']){const r=setBase(starter(id),base),o=observe(r);assert.equal(o.affordable,true);assert.equal(o.floor,false);assert.equal(o.blocked,false,`${id} ${base}`);}
});
test('joint limits clamp poses but reject inverted or unsupported geometry',()=>{
  const r=starter();r.pose[1]=-70;const next=changeJoint(r,1,{min:-20});assert.equal(next.pose[1],-20);assert.equal(next.joints[1].home,-20);assert.equal(r.pose[1],-70);
  for(const patch of [{min:150,max:100},{max:181},{length:700},{axis:'world-x'}])assert.throws(()=>changeJoint(r,1,patch));
});
test('invalid numbers, scenes, joint counts and fixed robots with mobile coordinates are rejected',()=>{
  for(const bad of [NaN,Infinity,181,null,'30']){const r=starter();r.pose[0]=bad;assert.throws(()=>validateRobot(r));}
  const r=starter();r.rover.x=50;assert.throws(()=>validateRobot(r));r.rover.x=0;r.scenario='unknown';assert.throws(()=>validateRobot(r));
  assert.throws(()=>validateRobot(arm(Array.from({length:6},()=>joint()),undefined,'hospital','rover')));
});
test('fixed installation translates and rotates the entire chain without spending money',()=>{
  const original=arm([joint()]),placed=placeFixed(original,{x:-500,y:700,yaw:90}),f=forward(placed);
  near(f.origins[0],[-500,700,300]);near(f.tip,[-500,965,300]);near(f.direction,[0,1,0]);
  assert.equal(price(placed).total,price(original).total);assert.equal(usedSlots(placed),usedSlots(original));assert.equal(original.mount,undefined);
  const mobile=setBase(placed,'rover'),returned=setBase(drive(mobile,100).robot,'fixed');assert.deepEqual(returned.mount,placed.mount);near(forward(returned).tip,f.tip);
});
test('fixed footprints respect room edges, fixture edges and rotated corners',()=>{
  assert.equal(fixedFits({x:0,y:0,yaw:0},'workshop'),true,'square touches bench edge');
  assert.equal(fixedFits({x:0,y:0,yaw:45},'workshop'),false,'rotated corner enters bench');
  assert.equal(fixedFits({x:-100,y:0,yaw:45},'workshop'),true);
  assert.equal(fixedFits({x:-1250,y:0,yaw:0},'workshop'),true);
  assert.equal(fixedFits({x:-1251,y:0,yaw:0},'workshop'),false);
  assert.equal(fixedFits({x:-1250,y:0,yaw:45},'workshop'),false);
  for(const id of SCENARIO_IDS){const b=getScenario(id).obstacles[0];assert.equal(fixedFits({x:(b.min[0]+b.max[0])/2,y:(b.min[1]+b.max[1])/2,yaw:0},id),false);}
  for(const mount of [null,{x:NaN,y:0,yaw:0},{x:0,y:0,yaw:181},{x:'0',y:0,yaw:0}])assert.throws(()=>placeFixed(starter(),mount),/placement/);
  assert.throws(()=>placeFixed(setBase(starter(),'rover'),{x:0,y:0,yaw:0}),/placement/);
});
test('location and heading change inspection results with the same parts and pose',()=>{
  const robot=arm([joint('z','+z',300),joint('y','+x',300)]);
  assert.ok(observe(robot).targets[1].aligned);
  assert.equal(observe(placeFixed(robot,{x:-700,y:0,yaw:0})).targets[1].aligned,false);
  const rotated=placeFixed(robot,{x:-100,y:0,yaw:90});assert.equal(observe(rotated).targets[1].aligned,false);
  rotated.pose[0]=-90;assert.ok(observe(rotated).targets[1].aligned);
});
test('save files keep independent mount positions in the draft and comparisons',()=>{
  const robot=placeFixed(starter('hospital'),{x:-350,y:250,yaw:30}),comparison=placeFixed(robot,{x:-500,y:-300,yaw:-60});
  const input={kind:'robot-builder',version:2,robot,notes:{choice:'Mount near the middle.'},evidence:[{robot:comparison,note:'Compare another position.'}]};
  const loaded=readProject(JSON.parse(JSON.stringify(input)));assert.deepEqual(loaded.robot.mount,robot.mount);assert.deepEqual(loaded.evidence[0].robot.mount,comparison.mount);
  loaded.robot.mount.x=0;assert.equal(loaded.evidence[0].robot.mount.x,-500);
  const bad=clone(input);bad.robot.mount.x=10000;assert.throws(()=>readProject(bad),/placement/);
  const old=clone(input);delete old.robot.mount;assert.deepEqual(readProject(old).robot.mount,{x:0,y:0,yaw:0});
});
test('older scenario drafts migrate together without losing writing or comparisons',()=>{
  const project=(id)=>{const robot=starter(id==='rescue'?'greenhouse':id==='museum'?'hospital':id);robot.scenario=id;delete robot.mount;return{kind:'robot-builder',version:2,robot,notes:{choice:id+' reasoning'},evidence:[{robot:clone(robot),note:id+' observation'}]};};
  const source={kind:'robot-builder-workspace',version:2,activeScenario:'rescue',drafts:{rescue:project('rescue'),workshop:project('workshop'),museum:project('museum')}};
  const migrated=readWorkspace(source);assert.deepEqual(Object.keys(migrated.drafts).sort(),[...SCENARIO_IDS].sort());assert.equal(migrated.activeScenario,'greenhouse');
  for(const [id,old]of [['greenhouse','rescue'],['hospital','museum']]){assert.equal(migrated.drafts[id].notes.choice,old+' reasoning');assert.equal(migrated.drafts[id].evidence[0].note,old+' observation');assert.ok(migrated.drafts[id].legacy);assert.ok(migrated.drafts[id].evidence[0].legacy);}
  assert.deepEqual(migrated.drafts.greenhouse.robot.mount,{x:0,y:-3000,yaw:0});assert.equal(migrated.drafts.workshop.legacy,undefined);
  assert.equal(source.drafts.rescue.robot.scenario,'rescue','source untouched');
});
test('rover travel samples the whole step against scenario-specific fixtures and boundaries',()=>{
  let r=setBase(starter('greenhouse'),'rover');assert.equal(drive(r,10000).ok,false);r=drive(r,700).robot;assert.equal(r.rover.y,-2300);r=drive(r,0,-90).robot;assert.equal(drive(r,-1200).ok,false);
  assert.equal(roverFits({x:600,y:0},'greenhouse'),false);assert.equal(roverFits({x:0,y:0},'workshop'),false);assert.equal(roverFits({x:0,y:0},'hospital'),true);
});
test('greenhouse scene favors mobility through distance, not a forbidden base option',()=>{
  let r=arm([joint('z','+z',500),joint('y','+x',400)],[90,0],'greenhouse','rover');
  for(const [i,advance,yaw]of [[0,700,90],[1,2300,-90],[2,2600,90]]){const result=drive(r,advance);assert.ok(result.ok);r=result.robot;r.pose[0]=yaw;assert.ok(observe(r).targets[i].aligned,JSON.stringify(observe(r)));}
  assert.equal(price(r).total,1050);
  // No fixed location can cover both end stations, even using the longest affordable chain.
  const maxLinks=Math.max(...[1,2,3,4,5,6].map(n=>Math.min(n*500,(1200-100-n*100)/.5)));
  const s=getScenario('greenhouse'),a=s.targets[0].position,c=s.targets[2].position;assert.ok(Math.hypot(...a.map((v,i)=>v-c[i]))>2*(maxLinks+65+120));
});
test('workshop admits a $600 fixed design that needs no base travel',()=>{
  const r=arm([joint('z','+z',300),joint('y','+x',300)]);
  [-65,0,65].forEach((q,i)=>{r.pose=[q,0];assert.ok(observe(r).targets[i].aligned,JSON.stringify(observe(r)));});assert.equal(price(r).total,600);
});
test('hospital has affordable fixed and mobile alternatives for the same targets',()=>{
  const fixed=arm([joint('z','+z',400),joint('y','+x',400),joint('y','+x',300),joint('z','+x',100)],undefined,'hospital');
  [[-45,-20,20,45],[0,-45,45,0],[45,-20,20,-45]].forEach((q,i)=>{fixed.pose=q;assert.ok(observe(fixed).targets[i].aligned,JSON.stringify(observe(fixed)));});assert.equal(price(fixed).total,1100);
  let mobile=arm([joint('z','+z',400),joint('y','+x',300),joint('y','+x',200)],undefined,'hospital','rover');
  const step=(amount,turn=0)=>{const moved=drive(mobile,amount,turn);assert.ok(moved.ok);mobile=moved.robot;};
  step(-500);step(0,-90);step(100);mobile.pose=[0,-37,37];assert.ok(observe(mobile).targets[0].aligned);
  step(0,90);step(500);step(0,-90);step(300);mobile.pose=[0,-90,90];assert.ok(observe(mobile).targets[1].aligned);
  step(-300);step(0,90);step(500);step(0,-90);mobile.pose=[0,-37,37];assert.ok(observe(mobile).targets[2].aligned);assert.equal(price(mobile).total,1150);
});
test('pose feedback detects direction error, floor and fixture overlap',()=>{
  const r=arm([joint('z','+z',300),joint('y','+x',300)]);assert.ok(observe(r).targets[1].aligned);
  r.joints.push(joint('z','-x',100));r.pose.push(180);const wrong=observe(r).targets[1];assert.equal(wrong.angle,180);assert.equal(wrong.aligned,false);
  assert.equal(observe(arm([joint('y','+x',500)],[90])).floor,true);assert.equal(observe(arm([joint('z','+x',500)])).blocked,true);
});
test('over-budget imports remain editable, but cannot drive or count as aligned',()=>{
  const expensive=arm(Array.from({length:5},()=>joint('z','+x',500)),undefined,'hospital','rover');validateRobot(expensive);assert.equal(price(expensive).affordable,false);assert.equal(drive(expensive,100).ok,false);assert.ok(observe(expensive).targets.every(t=>!t.aligned));
  const reduced=changeJoint(expensive,0,{length:100});assert.ok(price(reduced).total<price(expensive).total);assert.throws(()=>changeJoint(reduced,0,{length:200}),/funds/);
});
test('project files preserve scenario, notes and independent design comparisons',()=>{
  const r=starter('greenhouse'),input={kind:'robot-builder',version:2,robot:r,notes:{prediction:'C needs travel.',choice:'Keep the arm short.',observation:'100 mm.',revision:'Change one axis.'},evidence:[{robot:clone(r),note:'First attempt'}]};
  const loaded=readProject(JSON.parse(JSON.stringify(input)));assert.deepEqual(loaded,input);loaded.robot.pose[0]=90;assert.equal(loaded.evidence[0].robot.pose[0],0);
  assert.throws(()=>readProject({...input,notes:{prediction:'x'.repeat(3001)}}));assert.throws(()=>readProject({...input,evidence:[{robot:starter('hospital'),note:''}]}));
});
test('old greenhouse files preserve geometry and writing with explicit migration markers',()=>{
  const old={...starter(),version:1};delete old.scenario;old.joints[0].length=350;
  const p=readProject({kind:'robot-builder',version:1,robot:old,notes:{prediction:'Old prediction'},evidence:[{robot:clone(old),note:'Old observation'}]});
  assert.equal(p.robot.scenario,'greenhouse');assert.equal(p.robot.joints[0].length,350);assert.equal(p.notes.prediction,'Old prediction');assert.equal(p.legacy,true);assert.equal(p.evidence[0].legacy,true);
});
