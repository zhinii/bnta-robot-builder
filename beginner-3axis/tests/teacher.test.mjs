import test from 'node:test';
import assert from 'node:assert/strict';
import {TeacherSession} from '../teacher-session.mjs';
import {SLIDES,PARTS,COPY,DEMO_DETAILS,TYPE_IDS,OPTIONAL_TYPE_IDS} from '../teacher-content.mjs';
const at=id=>{const s=new TeacherSession();s.load(SLIDES.findIndex(x=>x.id===id));return s;};
const advance=(s,ms=30000)=>{for(let t=0;t<ms;t+=50)s.tick(50);};
test('all authored lesson and component text has English and Chinese pairs',()=>{
 const visit=o=>{if(!o||typeof o!=='object')return;if('en'in o||'zh'in o){assert.ok(o.en?.trim());assert.ok(o.zh?.trim());}else Object.values(o).forEach(visit);};visit({SLIDES,PARTS,COPY,DEMO_DETAILS,TYPE_IDS,OPTIONAL_TYPE_IDS});assert.deepEqual(SLIDES.map(s=>s.id),['types','parts','joint','control','xyz','grip','orientation','reach','limits','path','review']);assert.deepEqual(TYPE_IDS,['articulated','cartesian','mobile']);assert.deepEqual(OPTIONAL_TYPE_IDS,['scara','delta']);
});
test('three-axis twist failure waits indefinitely for discussion and explicit solution',()=>{
 const s=at('orientation'),start=[...s.q];s.run(true);assert.equal(s.phase,'predict');s.run();advance(s);
 assert.equal(s.phase,'observe');assert.equal(s.model,3);assert.deepEqual(s.q,start);s.run(true);assert.equal(s.phase,'observe');
 advance(s,120000);assert.equal(s.phase,'observe');s.discuss();advance(s);assert.equal(s.phase,'discuss');assert.equal(s.model,3);
 s.run(true);advance(s);assert.equal(s.model,6);assert.equal(s.phase,'done');assert.equal(s.q[5],90);
 assert.ok(Math.hypot(...s.tcp.map((v,i)=>v-s.before.tcp[i]))<1e-8);assert.match(s.result.en,/0.000 mm/);
});
test('blocked route stays atomic; only the teacher-selected solution delivers the part',()=>{
 const s=at('path'),start=structuredClone(s.controller.state.scene);assert.ok(start.objects.some(o=>o.heldByGripper));s.run();advance(s);
 assert.equal(s.rejected,'PATH_BLOCKED');assert.equal(s.phase,'observe');assert.deepEqual(s.controller.state.scene.actualJoints,start.actualJoints);
 assert.ok(s.controller.state.events.some(e=>e.type==='MOVE_REJECTED'&&e.error.code==='PATH_BLOCKED'));
 s.discuss();advance(s);assert.equal(s.phase,'discuss');s.run(true);advance(s);assert.equal(s.phase,'done');
 assert.ok(s.controller.state.scene.objects.some(o=>o.supportedByFixtureId==='destinationA'&&!o.heldByGripper));
});
test('closing empty jaws is not marked as holding; approach solution really attaches and lifts',()=>{
 const s=at('grip');s.run();advance(s);assert.equal(s.phase,'observe');assert.ok(!s.controller.state.scene.objects.some(o=>o.heldByGripper));
 s.discuss();s.run(true);advance(s);assert.equal(s.phase,'done');assert.ok(s.controller.state.scene.objects.some(o=>o.heldByGripper));
 const attached=s.controller.state.events.find(e=>e.type==='OBJECT_ATTACHED');assert.ok(attached);assert.match(s.result.en,/10 mm/);
});
test('joint and XYZ demonstrations use both actual models and do not advance the slide',()=>{
 for(const model of [3,6])for(const id of ['joint','xyz']){
  const s=at(id);s.chooseModel(model);const before=[...s.q],p=[...s.tcp],index=s.index;s.run();advance(s);
  assert.equal(s.phase,'observe',s.result?.en);assert.equal(s.index,index);
  if(id==='joint'){assert.ok(Math.abs(s.q[0]-before[0]-30)<1e-6);assert.deepEqual(s.q.slice(1),before.slice(1));}
  else assert.ok(Math.abs(s.tcp[2]-p[2]-10)<.15);
 }
});
test('Stop and navigation cancel movement and never run a solution',()=>{
 const s=at('orientation');s.chooseModel(6);s.run();advance(s,500);s.stop();const q=[...s.q];advance(s);assert.deepEqual(s.q,q);assert.equal(s.phase,'stopped');
 s.load(3);assert.equal(s.phase,'predict');s.run();s.load(1);const p=[...s.tcp];advance(s);assert.deepEqual(s.tcp,p);assert.equal(s.index,1);
});
test('control chain shows the controller before any joint movement',()=>{
 for(const model of [3,6]){const s=at('control');s.chooseModel(model);const q=[...s.q];s.run();advance(s,1500);assert.deepEqual(s.q,q);advance(s);assert.equal(s.phase,'observe');assert.ok(Math.abs(s.q[0]-q[0]-30)<1e-6);}
});

test('reach and joint-limit failures use controller rejection and wait for an explicit solution',()=>{
 for(const [id,code] of [['reach','UNREACHABLE'],['limits','JOINT_LIMIT']]){
  const s=at(id);s.chooseModel(6);assert.equal(s.model,3);const before=[...s.q];
  s.run(true);assert.equal(s.phase,'predict');s.run();advance(s);
  assert.equal(s.phase,'observe');assert.equal(s.rejected,code);assert.deepEqual(s.q,before);
  assert.ok(s.controller.state.events.some(e=>e.type==='MOVE_REJECTED'&&e.error.code===code));
  s.run(true);advance(s,120000);assert.equal(s.phase,'observe');assert.deepEqual(s.q,before);
  s.discuss();advance(s);assert.equal(s.phase,'discuss');assert.deepEqual(s.q,before);
  s.run(true);advance(s);assert.equal(s.phase,'done',s.result?.en);
  if(id==='reach')assert.ok(Math.hypot(...s.tcp.map((v,i)=>v-[200,0,80][i]))<1e-6);
  else {assert.ok(Math.abs(s.q[0]-30)<1e-6);assert.deepEqual(s.q.slice(1),before.slice(1));}
  s.load(s.index);assert.equal(s.phase,'predict');assert.equal(s.rejected,null);assert.deepEqual(s.q,before);
 }
});
test('new demonstrations support Stop and navigation without resuming queued motion',()=>{
 for(const id of ['reach','limits']){
  const s=at(id);s.run();advance(s);s.discuss();s.run(true);advance(s,100);s.stop();
  const q=[...s.q];advance(s);assert.equal(s.phase,'stopped');assert.deepEqual(s.q,q);
  s.load(SLIDES.findIndex(x=>x.id==='review'));const home=[...s.q];advance(s);assert.deepEqual(s.q,home);assert.equal(s.phase,'predict');
 }
});
