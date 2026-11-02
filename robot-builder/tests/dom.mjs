// Software integration tests: real Three scene graph with a stub WebGL renderer.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks,createRequire} from 'node:module';
import {starter,makeJoint,clone,readProject,price,getScenario,SCENARIO_IDS} from '../model.mjs';
const require=createRequire(new URL('../../package.json',import.meta.url)),{JSDOM}=require('jsdom');
const dom=new JSDOM(await readFile(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost/robot-builder/',pretendToBeVisual:true}),w=dom.window;
for(const key of ['window','document','localStorage','HTMLElement','Event','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true});
w.HTMLCanvasElement.prototype.getContext=()=>null;
globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;globalThis.testResize=fn;}observe(){this.fn();}disconnect(){}};
const $=id=>document.getElementById(id),host=$('scene');Object.defineProperty(host,'clientWidth',{value:960,configurable:true});Object.defineProperty(host,'clientHeight',{value:820,configurable:true});
const vendor=new URL('../../beginner-3axis/vendor/three/build/three.module.js',import.meta.url).href;
const rendererModule=`export * from ${JSON.stringify(vendor)}; export class WebGLRenderer {constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};globalThis.testRenderer=this;}setPixelRatio(){}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}setAnimationLoop(fn){this.tick=fn;}render(scene,camera){this.scene=scene;this.camera=camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}dispose(){}}`;
const fakeURL='data:text/javascript,'+encodeURIComponent(rendererModule),hooks=registerHooks({resolve(s,c,next){return s==='three'?{url:fakeURL,shortCircuit:true}:next(s,c);}});
const pendingTimers=new Set(),nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,delay,...args)=>{const timer=nativeTimeout(fn,delay,...args);pendingTimers.add(timer);return timer;};
globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()+10000),0);
const migrating=process.argv.includes('--legacy-workspace');let oldWorkspace;
if(migrating){const drafts={};for(const [old,id]of[['greenhouse','greenhouse'],['workshop','cafeteria'],['hospital','hospital']]){const robot={...starter(id),version:2,scenario:old};robot.joints[1].length=350;drafts[old]={kind:'robot-builder',version:2,robot,notes:{choice:old+' writing'},evidence:[{robot:clone(robot),note:old+' evidence'}]};}oldWorkspace=JSON.stringify({kind:'robot-builder-workspace',version:2,activeScenario:'workshop',drafts});localStorage.setItem('robot-builder.workspace.v2',oldWorkspace);}
await import('../app.mjs');const THREE=await import(vendor);
const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
const workspace=()=>JSON.parse(localStorage.getItem('robot-builder.workspace.v3')),saved=()=>readProject(workspace().drafts[workspace().activeScenario]),click=id=>$(id).click();
const choose=id=>{if(!$('scenario-picker').hasAttribute('open'))click('scenario-switch');document.querySelector(`[data-scenario="${id}"]`).click();testRenderer.tick();assert.equal(saved().robot.scenario,id);assert.equal(testRenderer.scene.userData.scenario,id);const fixtures=[];testRenderer.scene.traverse(o=>{if(o.userData.fixture)fixtures.push(o.userData.fixture);});assert.equal(fixtures.length,getScenario(id).obstacles.length);};
const select=i=>document.querySelectorAll('#joint-list button')[i].click();
const length=n=>document.querySelector(`[data-length="${n}"]`).click();
const importText=async value=>{Object.defineProperty($('file'),'files',{value:[{size:value.length,text:async()=>value}],configurable:true});await $('file').onchange();};
if(migrating){assert.equal($('scenario-picker').hasAttribute('open'),false);assert.equal(saved().robot.scenario,'cafeteria');assert.equal(localStorage.getItem('robot-builder.workspace.v2'),oldWorkspace);for(const [id,old]of[['greenhouse','greenhouse'],['cafeteria','workshop'],['hospital','hospital']]){choose(id);assert.equal(saved().notes.choice,old+' writing');assert.equal(saved().archive.evidence[0].note,old+' evidence');assert.equal(saved().archive.robot.joints[1].length,350);}console.log('Migration PASS: original storage and complete older projects preserved; all task notebooks kept.');}
else{
 assert.equal($('scenario-picker').hasAttribute('open'),true);assert.equal(document.querySelectorAll('.scenario-card').length,3);assert.equal($('no3d').hidden,true);
 choose('greenhouse');assert.equal(document.querySelectorAll('[data-axis]').length,2);assert.equal(document.querySelectorAll('[data-length]').length,3);assert.equal(document.querySelectorAll('[data-pad]').length,3);
 document.querySelector('[data-pad="middle"]').click();assert.equal(saved().robot.mount.y,0);click('test-mode');assert.equal($('build-panel').hidden,true);click('build-mode');
 click('rover-base');length(400);assert.equal(price(saved().robot).total,1200);assert.equal($('add-joint').disabled,true);assert.equal($('slot-count').textContent,'4 / 6');
 click('test-mode');await document.querySelector('[data-station="A"]').onclick();await $('try-step').onclick();assert.equal($('task-progress').textContent,'1 / 6');assert.match($('trial-count').textContent,/1\/6/);
 click('think-mode');$('note-observation').value='A moving base reaches the next plants.';$('note-observation').dispatchEvent(new w.Event('input'));click('record');assert.equal(saved().evidence[0].completed,1);
 choose('hospital');assert.equal(saved().evidence.length,0);choose('greenhouse');assert.equal(saved().evidence.length,1);assert.match(saved().notes.observation,/moving base/);
 choose('cafeteria');const cafe=starter('cafeteria');cafe.joints=[{...makeJoint(0),length:400},{...makeJoint(1),length:400,home:0}];cafe.pose=[0,0];await importText(JSON.stringify({kind:'robot-builder',version:3,robot:cafe,notes:{},evidence:[]}));click('test-mode');
 const pending=$('try-step').onclick();click('stop');await pending;assert.equal($('task-progress').textContent,'0 / 6','stopping cannot complete a pickup');
 for(let i=0;i<6;i++)await $('try-step').onclick();assert.equal($('task-progress').textContent,'6 / 6');assert.equal($('try-step').hidden,true);assert.match($('trial-count').textContent,/3\/3/);click('think-mode');click('record');assert.equal(saved().evidence[0].completed,6);
 click('build-mode');select(0);length(200);assert.equal($('task-progress').textContent,'0 / 6','changing the robot resets results');click('undo');assert.equal(saved().robot.joints[0].length,400);
 const before=JSON.stringify(workspace());await importText(JSON.stringify({kind:'robot-builder',version:3,robot:{...starter(),scenario:'invalid'}}));assert.equal(JSON.stringify(workspace()),before);
 change('language','zh');assert.match($('scenario-title').textContent,/清洗机/);click('scenario-switch');assert.match($('scenario-cards').textContent,/伸手/);click('picker-close');change('language','en');
 let exported;globalThis.URL.createObjectURL=blob=>{exported=blob;return'blob:test';};globalThis.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};click('export');assert.equal(readProject(JSON.parse(await exported.text())).robot.scenario,'cafeteria');
 const old={...starter(),version:2,scenario:'workshop'};old.joints[1].length=350;await importText(JSON.stringify({kind:'robot-builder',version:2,robot:old,notes:{prediction:'Earlier thinking'},evidence:[]}));assert.equal($('legacy-notice').hidden,false);click('download-old');assert.equal(JSON.parse(await exported.text()).robot.joints[1].length,350);
 const expensive=starter('hospital');expensive.joints=[0,1,2,3,4].map(i=>({...makeJoint(i),length:400}));expensive.pose=expensive.joints.map(j=>j.home);await importText(JSON.stringify({kind:'robot-builder',version:3,robot:expensive,notes:{},evidence:[]}));click('test-mode');assert.equal($('try-step').disabled,true);assert.match($('geometry-warning').textContent,/budget/);
 for(const id of SCENARIO_IDS){choose(id);for(const [width,height]of[[960,820],[360,420]]){Object.defineProperty(host,'clientWidth',{value:width,configurable:true});Object.defineProperty(host,'clientHeight',{value:height,configurable:true});click('view-all');testResize();testRenderer.tick();const s=getScenario(id);for(const x of[-s.room.width/2,s.room.width/2])for(const y of[-s.room.depth/2,s.room.depth/2]){const p=new THREE.Vector3(x,y,0).project(testRenderer.camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`Overview clips ${id}`);}}}
 for(const el of document.querySelectorAll('[data-copy]'))assert.ok(el.textContent&&el.textContent!==el.dataset.copy,`Missing text ${el.dataset.copy}`);
 console.log('Builder DOM PASS: constrained parts and pads, money, task animations, stop, reset on edits, comparisons, bilingual UI, import/export, archives, 3 scene graphs and overview projection.');
}
for(const timer of pendingTimers)clearTimeout(timer);globalThis.setTimeout=nativeTimeout;hooks.deregister();dom.window.close();
