// DOM and real scene-graph checks, with a stub renderer; not visual WebGL QA.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks,createRequire} from 'node:module';
import {starter,clone,readProject,price,getScenario} from '../model.mjs';
const require=createRequire(new URL('../../package.json',import.meta.url)),{JSDOM}=require('jsdom');
const dom=new JSDOM(await readFile(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost/robot-builder/',pretendToBeVisual:true}),w=dom.window;
for(const key of ['window','document','localStorage','HTMLElement','Event','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true});
globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;globalThis.testResize=fn;}observe(){this.fn();}disconnect(){}};
const $=id=>document.getElementById(id),host=$('scene');Object.defineProperty(host,'clientWidth',{value:960,configurable:true});Object.defineProperty(host,'clientHeight',{value:820,configurable:true});
const vendor=new URL('../../beginner-3axis/vendor/three/build/three.module.js',import.meta.url).href;
const rendererModule=`export * from ${JSON.stringify(vendor)}; export class WebGLRenderer {constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};globalThis.testRenderer=this;}setPixelRatio(){}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}setAnimationLoop(fn){this.tick=fn;}render(scene,camera){this.scene=scene;this.camera=camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}dispose(){}}`;
const fakeURL='data:text/javascript,'+encodeURIComponent(rendererModule),hooks=registerHooks({resolve(s,c,next){return s==='three'?{url:fakeURL,shortCircuit:true}:next(s,c);}});
const pendingTimers=new Set(),nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,delay,...args)=>{const timer=nativeTimeout(fn,delay,...args);pendingTimers.add(timer);return timer;};
const migrating=process.argv.includes('--legacy-workspace');let oldWorkspace;
if(migrating){const drafts={};for(const [old,id]of [['rescue','greenhouse'],['workshop','workshop'],['museum','hospital']]){const robot=starter(id);robot.scenario=old;delete robot.mount;drafts[old]={kind:'robot-builder',version:2,robot,notes:{choice:old+' writing'},evidence:[{robot:clone(robot),note:old+' evidence'}]};}oldWorkspace=JSON.stringify({kind:'robot-builder-workspace',version:2,activeScenario:'rescue',drafts});localStorage.setItem('robot-builder.workspace.v2',oldWorkspace);}
await import('../app.mjs');const THREE=await import(vendor);
const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
const workspace=()=>JSON.parse(localStorage.getItem('robot-builder.workspace.v2'));
const saved=()=>readProject(workspace().drafts[workspace().activeScenario]);
const click=id=>$(id).click();
const choose=id=>{if(!$('scenario-picker').hasAttribute('open'))click('scenario-switch');document.querySelector(`[data-scenario="${id}"]`).click();testRenderer.tick();assert.equal(saved().robot.scenario,id);assert.equal(testRenderer.scene.userData.scenario,id);const fixtures=[];testRenderer.scene.traverse(o=>{if(o.userData.fixture)fixtures.push(o.userData.fixture);});assert.equal(fixtures.length,getScenario(id).obstacles.length);};
const select=i=>document.querySelectorAll('#joint-list button')[i].click();
if(migrating){
  assert.equal($('scenario-picker').hasAttribute('open'),false);assert.equal(saved().robot.scenario,'greenhouse');assert.equal($('legacy-notice').hidden,false);
  assert.equal(localStorage.getItem('robot-builder.workspace.v2.before-scenarios'),oldWorkspace);
  for(const [id,old]of [['greenhouse','rescue'],['workshop','workshop'],['hospital','museum']]){choose(id);assert.equal(saved().notes.choice,old+' writing');assert.equal(saved().evidence[0].note,old+' evidence');}
  for(const timer of pendingTimers)clearTimeout(timer);globalThis.setTimeout=nativeTimeout;hooks.deregister();dom.window.close();console.log('Saved-workspace migration PASS: all three drafts, notes and comparisons retained; original workspace backed up.');process.exit(0);
}
assert.equal($('scenario-picker').hasAttribute('open'),true);assert.equal(document.querySelectorAll('.scenario-card').length,3);assert.equal($('no3d').hidden,true);
choose('greenhouse');assert.match($('scenario-title').textContent,/Greenhouse/);assert.equal($('money-total').textContent,'$800 / $1,200');
click('rover-base');assert.equal(price(saved().robot).total,1100);select(0);change('link-length','400');assert.equal(price(saved().robot).total,1200);assert.equal(saved().robot.joints.length,3);assert.equal(price(saved().robot).linkLength,1000);assert.equal($('add-joint').disabled,true);
assert.equal([...$('link-length').options].find(o=>o.value==='500').disabled,true);change('link-length','500');assert.equal(price(saved().robot).total,1200,'programmatic input cannot overspend');
change('link-length','200');select(1);change('link-length','200');assert.equal(price(saved().robot).remaining,150);click('add-joint');assert.equal(saved().robot.joints.length,4);assert.equal(price(saved().robot).linkLength,800);assert.equal(price(saved().robot).total,1200);
click('undo');assert.equal(saved().robot.joints.length,3);assert.equal(price(saved().robot).remaining,150);click('add-joint');
// Budget refunds allow five short arm joints; a sixth remains forbidden by slots.
for(let i=0;i<4;i++){select(i);change('link-length','100');}click('add-joint');assert.equal(saved().robot.joints.length,5);assert.equal($('slot-count').textContent,'6 / 6');assert.equal($('add-joint').disabled,true);assert.equal(price(saved().robot).total,1150);
select(0);change('link-length','200');assert.equal(price(saved().robot).total,1200);assert.equal(price(saved().robot).linkLength,600);
click('test-mode');const y=saved().robot.rover.y;click('forward');assert.equal(saved().robot.rover.y,y+100);change('test-number-0','45');assert.equal(saved().robot.pose[0],45);
click('think-mode');$('note-observation').value='Three joints and 1 m cost the same as five and 600 mm.';$('note-observation').dispatchEvent(new w.Event('input'));click('record');const snapshot=JSON.stringify(saved().evidence[0]);
choose('workshop');assert.equal(saved().evidence.length,0);assert.equal($('note-observation').value,'');assert.equal($('money-total').textContent,'$800 / $1,200');$('robot-name').value='Workshop trial';$('robot-name').dispatchEvent(new w.Event('change'));
choose('hospital');assert.match($('scenario-title').textContent,/Hospital/);assert.equal(document.querySelectorAll('.plant-label').length,3);
// Numeric placement, scene picking and locked Test mode use the same saved mount.
const initialCost=price(saved().robot).total;
change('mount-x','-350');change('mount-y','250');change('mount-yaw','30');click('apply-mount');
assert.deepEqual(saved().robot.mount,{x:-350,y:250,yaw:30});assert.equal(price(saved().robot).total,initialCost);
testRenderer.tick();let base;testRenderer.scene.traverse(o=>{if(o.userData.base==='fixed')base=o;});assert.equal(base.position.x,-350);assert.ok(Math.abs(base.rotation.z-Math.PI/6)<1e-9);
click('undo');assert.deepEqual(saved().robot.mount,{x:0,y:0,yaw:0});
change('mount-x','1000');click('apply-mount');assert.deepEqual(saved().robot.mount,{x:0,y:0,yaw:0});assert.match($('message').textContent,/overlaps/);
click('place-base');testRenderer.tick();assert.equal($('placement-hint').hidden,false);
const canvas=testRenderer.domElement;canvas.getBoundingClientRect=()=>({left:0,top:0,width:host.clientWidth,height:host.clientHeight});
const pointEvent=(type,x,y)=>{const p=new THREE.Vector3(x,y,0).project(testRenderer.camera);canvas.dispatchEvent(new w.MouseEvent(type,{clientX:(p.x+1)*host.clientWidth/2,clientY:(1-p.y)*host.clientHeight/2,button:0}));};
const pick=(x,y)=>{pointEvent('pointermove',x,y);pointEvent('pointerdown',x,y);pointEvent('pointerup',x,y);testRenderer.tick();};
pick(1000,0);assert.equal($('placement-hint').hidden,false);assert.deepEqual(saved().robot.mount,{x:0,y:0,yaw:0});
pick(-400,350);assert.deepEqual(saved().robot.mount,{x:-400,y:350,yaw:0});assert.equal($('placement-hint').hidden,true);
click('place-base');document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal($('placement-hint').hidden,true);
click('test-mode');assert.equal($('apply-mount').disabled,true);assert.equal($('place-base').disabled,true);assert.match($('mount-locked').textContent,/X -400/);
change('mount-x','0');$('apply-mount').onclick();assert.equal(saved().robot.mount.x,-400,'Test cannot change installation');
click('reset-pose');assert.equal(saved().robot.mount.x,-400,'pose reset keeps installation');
click('think-mode');click('record');assert.match($('evidence-list').textContent,/X -400/);const installed=clone(saved().robot.mount);
click('build-mode');change('mount-x','-600');click('apply-mount');document.querySelector('#evidence-list .evidence-actions button').click();assert.deepEqual(saved().robot.mount,installed);
click('rover-base');assert.equal($('mount-controls').hidden,true);click('fixed-base');assert.deepEqual(saved().robot.mount,installed);
choose('workshop');choose('hospital');assert.deepEqual(saved().robot.mount,installed,'task switching keeps chosen location');
choose('greenhouse');assert.equal(JSON.stringify(saved().evidence[0]),snapshot);assert.equal(saved().robot.joints.length,5);assert.match($('note-observation').value,/same/);
choose('workshop');assert.equal($('robot-name').value,'Workshop trial');
change('language','zh');assert.equal(document.documentElement.lang,'zh-CN');assert.match($('scenario-title').textContent,/工坊/);click('scenario-switch');assert.match($('scenario-cards').textContent,/医院/);click('picker-close');change('language','en');
const importText=async value=>{Object.defineProperty($('file'),'files',{value:[{size:value.length,text:async()=>value}],configurable:true});await $('file').onchange();};
const before=JSON.stringify(workspace());await importText(JSON.stringify({kind:'robot-builder',version:2,robot:{...starter(),scenario:'invalid'}}));assert.equal(JSON.stringify(workspace()),before);
await importText(JSON.stringify({kind:'robot-builder',version:2,robot:{...starter(),mount:{x:500,y:0,yaw:0}}}));assert.equal(JSON.stringify(workspace()),before,'invalid mount import keeps workspace');
const old={...starter(),version:1};delete old.scenario;old.joints[0].length=350;await importText(JSON.stringify({kind:'robot-builder',version:1,robot:old,notes:{prediction:'Earlier greenhouse reasoning'},evidence:[{robot:clone(old),note:'Earlier observation'}]}));assert.equal(saved().robot.scenario,'greenhouse');assert.equal(saved().robot.joints[0].length,350);assert.equal($('legacy-notice').hidden,false);assert.equal($('note-prediction').value,'Earlier greenhouse reasoning');assert.match($('evidence-list').textContent,/Earlier scene/);
let exported;globalThis.URL.createObjectURL=blob=>{exported=blob;return'blob:test';};globalThis.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};click('export');assert.equal(readProject(JSON.parse(await exported.text())).robot.scenario,'greenhouse');assert.equal(readProject(JSON.parse(await exported.text())).notes.prediction,'Earlier greenhouse reasoning');
const expensive=starter('hospital');expensive.joints=Array.from({length:6},()=>({...expensive.joints[1],length:500}));expensive.pose=expensive.joints.map(j=>j.home);await importText(JSON.stringify({kind:'robot-builder',version:2,robot:expensive,notes:{},evidence:[]}));click('test-mode');assert.equal($('test-angle-0').disabled,true);assert.match($('geometry-warning').textContent,/exceeds/);click('build-mode');select(0);change('link-length','100');assert.ok(price(saved().robot).total<price(expensive).total);
// Check overview projection at desktop and phone canvas proportions (not CSS pixels).
for(const id of ['greenhouse','workshop','hospital']){choose(id);for(const [width,height]of[[960,820],[360,420]]){Object.defineProperty(host,'clientWidth',{value:width,configurable:true});Object.defineProperty(host,'clientHeight',{value:height,configurable:true});click('view-all');testResize();testRenderer.tick();const s=getScenario(id);for(const x of[-s.room.width/2,s.room.width/2])for(const y of[-s.room.depth/2,s.room.depth/2]){const p=new THREE.Vector3(x,y,0).project(testRenderer.camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`Overview clips ${id} at ${width}`);}}}
for(const el of document.querySelectorAll('[data-copy]'))assert.ok(el.textContent&&el.textContent!==el.dataset.copy,`Missing text: ${el.dataset.copy}`);
for(const timer of pendingTimers)clearTimeout(timer);globalThis.setTimeout=nativeTimeout;hooks.deregister();dom.window.close();
console.log('Builder DOM PASS: greenhouse/workshop/hospital scene graphs, numeric and floor-click placement, footprint rejection, Test lock, undo/reset/snapshots, per-task drafts, budget/refunds, rover travel, bilingual choices, migration, export and overview projection. Pixel rendering remains unverified.');
