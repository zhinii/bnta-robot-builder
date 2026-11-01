import {COPY} from './i18n.mjs';
import {starter,clone,validateRobot,usedSlots,setBase,addJoint,removeJoint,changeJoint,observe,drive,readProject,SLOT_LIMIT} from './model.mjs';
import {createScene} from './scene.mjs';
const $=id=>document.getElementById(id),STORAGE='robot-builder.project.v1',LANGUAGE='robot-builder.language';
let language='en',robot=starter(),notes={prediction:'',choice:'',observation:'',revision:''},evidence=[],selected=0,mode='build',history=[],poseBefore=null,saved=false;
try {language=localStorage.getItem(LANGUAGE)==='zh'?'zh':'en';const raw=localStorage.getItem(STORAGE);if(raw){({robot,notes,evidence}=readProject(JSON.parse(raw)));saved=true;}}catch{}
const t=key=>COPY[key]?.[language]??key;
const project=()=>({kind:'robot-builder',version:1,robot:clone(robot),notes:{...notes},evidence:clone(evidence)});
const scene=createScene($('scene'),i=>selectJoint(i));$('no3d').hidden=scene.supported;
function persist() {try {localStorage.setItem(STORAGE,JSON.stringify(project()));saved=true;}catch{saved=false;}$('save-status').textContent=t(saved?'saved':'notSaved');}
let messageTimer;
function notify(key){clearTimeout(messageTimer);$('message').textContent=t(key);$('message').hidden=false;messageTimer=setTimeout(()=>$('message').hidden=true,5500);}
function remember(previous) {if(JSON.stringify(previous)!==JSON.stringify(robot)){history.push(previous);if(history.length>60)history.shift();}$('undo').disabled=history.length===0;}
function finishPoseEdit(){if(poseBefore){remember(poseBefore);poseBefore=null;persist();}}
function edit(next) {finishPoseEdit();const previous=clone(robot);robot=validateRobot(next);remember(previous);selected=Math.min(selected,robot.joints.length-1);persist();render();}
function attempt(fn){try{fn();}catch{notify('invalid');render();}}
function selectJoint(index){finishPoseEdit();selected=index;render();}
function setMode(next){finishPoseEdit();mode=next;render();}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function render(){
  document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=`Robot Lab · ${t('title')}`;
  document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=t(el.dataset.copy));$('language').value=language;
  for(const name of ['build','test','think']){$(`${name}-panel`).hidden=mode!==name;$(`${name}-mode`).setAttribute('aria-pressed',String(mode===name));}
  $('slot-count').textContent=`${usedSlots(robot)} / ${SLOT_LIMIT}`;
  const slots=robot.joints.map((_,i)=>({label:`J${i+1}`,mobile:false}));if(robot.base==='rover')slots.unshift({label:t('rover'),mobile:true});
  $('slots').replaceChildren(...Array.from({length:SLOT_LIMIT},(_,i)=>{const entry=slots[i],span=node('span',entry?.label??'·',entry?`used${entry.mobile?' mobile':''}`:'');span.title=entry?.label??t('emptySlot');return span;}));
  $('robot-name').value=robot.name;$('fixed-base').setAttribute('aria-pressed',String(robot.base==='fixed'));$('rover-base').setAttribute('aria-pressed',String(robot.base==='rover'));
  $('rover-base').disabled=robot.base==='fixed'&&robot.joints.length===SLOT_LIMIT;$('rover-base').title=$('rover-base').disabled?t('roverFull'):'';
  $('base-help').textContent=t($('rover-base').disabled?'roverFull':robot.base==='fixed'?'fixedHelp':'roverHelp');
  $('add-joint').disabled=usedSlots(robot)>=SLOT_LIMIT;$('remove-joint').disabled=robot.joints.length<=1;
  $('joint-list').replaceChildren(...robot.joints.map((_,i)=>{const button=node('button',`J${i+1}`);button.setAttribute('aria-pressed',String(i===selected));button.setAttribute('aria-label',`${t('joint')} ${i+1}`);button.onclick=()=>selectJoint(i);return button;}));
  const j=robot.joints[selected];$('joint-title').textContent=`J${selected+1} · ${t('joint')}`;
  document.querySelectorAll('[data-axis]').forEach(b=>b.setAttribute('aria-pressed',String(j.axis===b.dataset.axis)));
  $('link-length').value=j.length;$('link-direction').value=j.direction;$('limit-min').value=j.min;$('limit-max').value=j.max;
  for(const id of ['joint-angle','joint-angle-number']){$(id).min=j.min;$(id).max=j.max;$(id).value=robot.pose[selected];}
  $('joint-angle').setAttribute('aria-label',`${t('joint')} ${selected+1} ${t('pose')}`);
  renderTest();for(const key of Object.keys(notes))$(`note-${key}`).value=notes[key];renderEvidence();
  $('save-status').textContent=t(saved?'saved':'notSaved');$('undo').disabled=!history.length;readouts();
}
function renderTest(){
  $('joint-controls').replaceChildren(...robot.joints.map((j,i)=>{
    const wrap=node('div',undefined,`joint-control${i===selected?' active':''}`);wrap.dataset.joint=i;
    const header=node('div'),button=node('button',`J${i+1} · ${j.axis.toUpperCase()}`);button.onclick=()=>selectJoint(i);header.append(button,node('span',`${j.min}° → ${j.max}°`));
    const row=node('div',undefined,'slider-row'),slider=node('input'),number=node('input');slider.type='range';number.type='number';
    for(const input of [slider,number]){input.min=j.min;input.max=j.max;input.step=1;input.value=robot.pose[i];input.setAttribute('aria-label',`${t('joint')} ${i+1} ${t('pose')}`);}
    slider.id=`test-angle-${i}`;number.id=`test-number-${i}`;
    slider.oninput=()=>previewAngle(i,Number(slider.value));slider.onchange=finishPoseEdit;
    number.onchange=()=>commitAngle(i,number.value);row.append(slider,number);wrap.append(header,row);return wrap;
  }));
  $('rover-controls').hidden=robot.base!=='rover';
}
function previewAngle(index,value){
  if(!poseBefore)poseBefore=clone(robot);robot.pose[index]=value;selected=index;
  syncAngles();readouts();
}
function commitAngle(index,value){
  if(value.trim()==='' || !Number.isFinite(Number(value)) || Number(value)<robot.joints[index].min || Number(value)>robot.joints[index].max){notify('invalid');render();return;}
  const next=clone(robot);next.pose[index]=Number(value);selected=index;edit(next);
}
function syncAngles(){
  const j=robot.joints[selected];$('joint-angle').min=j.min;$('joint-angle').max=j.max;$('joint-angle').value=robot.pose[selected];$('joint-angle-number').value=robot.pose[selected];
  robot.pose.forEach((q,i)=>{if($(`test-angle-${i}`)){$(`test-angle-${i}`).value=q;$(`test-number-${i}`).value=q;}});
  document.querySelectorAll('.joint-control').forEach(el=>el.classList.toggle('active',Number(el.dataset.joint)===selected));
}
function readouts(){
  const data=observe(robot);$('tip-position').textContent=data.tip.map((v,i)=>`${'XYZ'[i]} ${Math.round(v)}`).join('  ')+' mm';
  $('axis-readout').textContent=`J${selected+1} · ${robot.joints[selected].axis.toUpperCase()} · ${Math.round(robot.pose[selected])}°`;
  const warning=data.floor?'floor':data.beds?'beds':null;$('geometry-warning').hidden=!warning;if(warning)$('geometry-warning').textContent=t(warning);
  $('rover-position').textContent=`X ${Math.round(robot.rover.x)} · Y ${Math.round(robot.rover.y)} · ${Math.round(robot.rover.yaw)}°`;
  $('target-readings').replaceChildren(...data.targets.map(target=>{
    const row=node('div',undefined,`target-row${target.aligned?' ready':''}`);row.dataset.target=target.id;row.dataset.aligned=target.aligned;
    row.append(node('strong',target.id),node('b',t(target.aligned?'ready':'adjust')),node('small',`${Math.round(target.distance)} mm ${t('distance')} · ${Math.round(target.angle)}° ${t('direction')}`));return row;
  }));scene.update(robot,selected);
}
function renderEvidence(){
  $('evidence-list').replaceChildren();
  if(!evidence.length){$('evidence-list').append(node('p',t('emptyEvidence'),'help'));return;}
  evidence.forEach((entry,index)=>{
    const card=node('article',undefined,'evidence-card'),header=node('header'),o=observe(entry.robot);
    header.append(node('strong',`${t('design')} ${index+1}`),node('span',`${usedSlots(entry.robot)}/6 · ${t(entry.robot.base==='rover'?'rover':'fixed')}`));card.append(header);
    card.append(node('p',o.targets.map(target=>`${target.id}: ${Math.round(target.distance)} mm / ${Math.round(target.angle)}°`).join(' · ')));
    if(entry.note)card.append(node('p',entry.note));
    const actions=node('div',undefined,'evidence-actions'),restore=node('button',t('restore')),remove=node('button',t('delete'));
    restore.onclick=()=>{edit(entry.robot);notify('restored');};remove.onclick=()=>{evidence.splice(index,1);persist();renderEvidence();};actions.append(restore,remove);card.append(actions);$('evidence-list').append(card);
  });
}
$('build-mode').onclick=()=>setMode('build');$('test-mode').onclick=()=>setMode('test');$('think-mode').onclick=()=>setMode('think');
$('language').onchange=()=>{finishPoseEdit();language=$('language').value;try{localStorage.setItem(LANGUAGE,language);}catch{}render();};
$('fixed-base').onclick=()=>edit(setBase(robot,'fixed'));
$('rover-base').onclick=()=>attempt(()=>edit(setBase(robot,'rover')));
$('add-joint').onclick=()=>attempt(()=>{const next=addJoint(robot);selected=next.joints.length-1;edit(next);});
$('remove-joint').onclick=()=>attempt(()=>edit(removeJoint(robot,selected)));
$('robot-name').onchange=()=>{const next=clone(robot);next.name=$('robot-name').value;edit(next);};
document.querySelectorAll('[data-axis]').forEach(button=>button.onclick=()=>attempt(()=>edit(changeJoint(robot,selected,{axis:button.dataset.axis}))));
$('link-length').onchange=()=>attempt(()=>edit(changeJoint(robot,selected,{length:Number($('link-length').value)})));
$('link-direction').onchange=()=>attempt(()=>edit(changeJoint(robot,selected,{direction:$('link-direction').value})));
for(const [id,key]of [['limit-min','min'],['limit-max','max']])$(id).onchange=()=>attempt(()=>{if($(id).value.trim()==='')throw Error('number');edit(changeJoint(robot,selected,{[key]:Number($(id).value)}));});
$('joint-angle').oninput=()=>previewAngle(selected,Number($('joint-angle').value));$('joint-angle').onchange=finishPoseEdit;
$('joint-angle-number').onchange=()=>commitAngle(selected,$('joint-angle-number').value);
$('reset-pose').onclick=()=>{const next=clone(robot);next.pose=robot.joints.map(j=>j.home);next.rover={x:0,y:0,yaw:0};edit(next);};
for(const [id,amount,turn]of [['forward',100,0],['backward',-100,0],['left',0,15],['right',0,-15]])$(id).onclick=()=>{const result=drive(robot,amount,turn);if(result.ok)edit(result.robot);else notify('blocked');};
$('undo').onclick=()=>{finishPoseEdit();if(history.length){robot=history.pop();selected=Math.min(selected,robot.joints.length-1);persist();render();}};
for(const key of Object.keys(notes))$(`note-${key}`).oninput=()=>{notes[key]=$(`note-${key}`).value;persist();};
$('record').onclick=()=>{finishPoseEdit();if(evidence.length>=6){notify('fullEvidence');return;}evidence.push({robot:clone(robot),note:notes.observation});persist();renderEvidence();notify('recorded');};
$('brief-toggle').onclick=()=>{$('brief').hidden=!$('brief').hidden;$('brief-toggle').setAttribute('aria-expanded',String(!$('brief').hidden));};
$('view-home').onclick=()=>scene.home();$('view-top').onclick=()=>scene.top();
$('labels').onclick=()=>{const active=$('labels').getAttribute('aria-pressed')!=='true';$('labels').setAttribute('aria-pressed',String(active));scene.setLabels(active);};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{
  const file=$('file').files?.[0];if(!file)return;
  try{if(file.size>100000)throw Error('size');const parsed=readProject(JSON.parse(await file.text()));finishPoseEdit();const previous=clone(robot);({robot,notes,evidence}=parsed);remember(previous);selected=0;persist();render();scene.home();notify('imported');}catch{notify('invalidFile');}finally{$('file').value='';}
};
$('export').onclick=()=>{
  finishPoseEdit();persist();const blob=new Blob([JSON.stringify(project(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=(robot.name.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,65)||'robot-design')+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('exported');
};
window.addEventListener('pagehide',()=>{finishPoseEdit();persist();});
render();scene.home();persist();
