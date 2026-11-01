import {COPY} from './i18n.mjs';
import {starter,clone,validateRobot,usedSlots,setBase,addJoint,removeJoint,changeJoint,observe,drive,readProject,SLOT_LIMIT,PRICES,LENGTHS,price,baseStart,getScenario,SCENARIO_IDS} from './model.mjs';
import {createScene} from './scene.mjs';
const $=id=>document.getElementById(id),STORAGE='robot-builder.workspace.v2',OLD_STORAGE='robot-builder.project.v1',LANGUAGE='robot-builder.language';
const emptyNotes=()=>({prediction:'',choice:'',observation:'',revision:''});
let language='en',robot=starter(),notes=emptyNotes(),evidence=[],selected=0,mode='build',history=[],poseBefore=null,saved=false,legacy=false,drafts={},hasDraft=false;
function load(p){robot=p.robot;notes=p.notes;evidence=p.evidence;legacy=p.legacy===true;}
try{
  language=localStorage.getItem(LANGUAGE)==='zh'?'zh':'en';
  const raw=localStorage.getItem(STORAGE);
  if(raw){const data=JSON.parse(raw);if(data.version!==2||data.kind!=='robot-builder-workspace')throw Error('workspace');for(const id of SCENARIO_IDS){if(data.drafts?.[id]){const p=readProject(data.drafts[id]);if(p.robot.scenario!==id)throw Error('scenario');drafts[id]=p;}}if(SCENARIO_IDS.includes(data.activeScenario)&&Object.hasOwn(drafts,data.activeScenario)){load(clone(drafts[data.activeScenario]));hasDraft=true;saved=true;}}
  else{const old=localStorage.getItem(OLD_STORAGE);if(old){load(readProject(JSON.parse(old)));hasDraft=true;}}
}catch{try{const backup=localStorage.getItem(STORAGE);if(backup)localStorage.setItem(STORAGE+'.recovery',backup);}catch{}}
const t=key=>COPY[key]?.[language]??key;
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const project=()=>({kind:'robot-builder',version:2,robot:clone(robot),notes:{...notes},evidence:clone(evidence),...(legacy?{legacy:true}:{})});
const scene=createScene($('scene'),i=>selectJoint(i));$('no3d').hidden=scene.supported;
function persist(){drafts[robot.scenario]=project();try{localStorage.setItem(STORAGE,JSON.stringify({kind:'robot-builder-workspace',version:2,activeScenario:robot.scenario,drafts}));saved=true;}catch{saved=false;}$('save-status').textContent=t(saved?'saved':'notSaved');}
let messageTimer;
function notify(key){clearTimeout(messageTimer);const message=$('message');message.textContent=t(key);message.hidden=false;messageTimer=setTimeout(()=>message.hidden=true,5500);}
function remember(previous){if(JSON.stringify(previous)!==JSON.stringify(robot)){history.push(previous);if(history.length>60)history.shift();}$('undo').disabled=history.length===0;}
function finishPoseEdit(){if(poseBefore){remember(poseBefore);poseBefore=null;persist();}}
function edit(next){finishPoseEdit();const previous=clone(robot);robot=validateRobot(next);remember(previous);selected=Math.min(selected,robot.joints.length-1);persist();render();}
function attempt(fn){try{fn();}catch(error){notify(error.message==='funds'?'funds':error.message==='slots'?'roverFull':'invalid');render();}}
function possible(fn){try{fn();return true;}catch{return false;}}
function selectJoint(index){finishPoseEdit();selected=index;render();}
function setMode(next){finishPoseEdit();mode=next;render();}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function openPicker(){renderPicker();const dialog=$('scenario-picker');if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
function closePicker(){const dialog=$('scenario-picker');if(dialog.close)dialog.close();else dialog.removeAttribute('open');}
function switchScenario(id){finishPoseEdit();persist();load(drafts[id]?readProject(clone(drafts[id])):{robot:starter(id),notes:emptyNotes(),evidence:[]});history=[];selected=0;mode='build';persist();render();scene.overview();closePicker();}
function renderPicker(){
  $('scenario-cards').replaceChildren(...SCENARIO_IDS.map((id,i)=>{const scenario=getScenario(id),button=node('button',undefined,`scenario-card scenario-${id}`);button.dataset.scenario=id;button.setAttribute('aria-pressed',String(id===robot.scenario));const art=node('span',undefined,'scenario-art');art.setAttribute('aria-hidden','true');for(let n=0;n<5;n++)art.append(node('i'));button.append(art,node('span',`0${i+1}`,'scenario-number'),node('strong',scenario.title[language]),node('span',scenario.tag[language],'scenario-description'),node('small',drafts[id]?t('resumeScene'):t('enterScene')));button.onclick=()=>switchScenario(id);return button;}));
}
function renderBudget(){
  const p=price(robot);$('money-total').textContent=`${money(p.total)} / ${money(PRICES.budget)}`;$('money-total').classList.toggle('over',!p.affordable);$('money-meter').value=Math.min(PRICES.budget,p.total);$('money-meter').classList.toggle('over',!p.affordable);
  $('money-remaining').textContent=p.affordable?`${money(p.remaining)} ${t('remaining')}`:`${money(-p.remaining)} ${t('overBudget')}`;$('total-length').textContent=`${p.linkLength} mm · ${t('linkTotal')}`;
  $('slot-count').textContent=`${usedSlots(robot)} / ${SLOT_LIMIT}`;
  const slots=robot.joints.map((_,i)=>({label:`J${i+1}`,mobile:false}));if(robot.base==='rover')slots.unshift({label:t('rover'),mobile:true});
  $('slots').replaceChildren(...Array.from({length:SLOT_LIMIT},(_,i)=>{const entry=slots[i],span=node('span',entry?.label??'·',entry?`used${entry.mobile?' mobile':''}`:'');span.title=entry?.label??t('emptySlot');return span;}));
  $('receipt').replaceChildren();for(const [label,value]of [[t(robot.base==='rover'?'rover':'fixed'),p.base],[`${robot.joints.length} × ${t('joint')} (${money(PRICES.joint)})`,p.joints],[`${p.linkLength} mm × $0.50`,p.links],[t('includedTool'),0]])$('receipt').append(node('dt',label),node('dd',money(value)));
}
function render(){
  document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=`Robot Lab · ${t('title')}`;document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=t(el.dataset.copy));$('language').value=language;
  const scenario=getScenario(robot.scenario);$('scenario-title').textContent=scenario.title[language];$('scenario-tag').textContent=scenario.tag[language];$('brief-title').textContent=scenario.title[language];$('brief-text').textContent=scenario.mission[language];$('scenario-question').textContent=scenario.prompt[language];$('legacy-notice').hidden=!legacy;
  for(const name of ['build','test','think']){$(`${name}-panel`).hidden=mode!==name;$(`${name}-mode`).setAttribute('aria-pressed',String(mode===name));}
  renderBudget();renderPicker();$('robot-name').value=robot.name;
  $('fixed-base').setAttribute('aria-pressed',String(robot.base==='fixed'));$('rover-base').setAttribute('aria-pressed',String(robot.base==='rover'));
  $('rover-base').disabled=robot.base!=='rover'&&!possible(()=>setBase(robot,'rover'));$('rover-base').title=$('rover-base').disabled?t(robot.joints.length>=6?'roverFull':'funds'):'';
  $('base-help').textContent=t($('rover-base').disabled?(robot.joints.length>=6?'roverFull':'funds'):robot.base==='fixed'?'fixedHelp':'roverHelp');
  $('add-joint').disabled=!possible(()=>addJoint(robot));$('add-joint').textContent=`${t('add')} · $150`;$('add-joint').title=t(usedSlots(robot)>=6?'roverFull':'addPrice');$('remove-joint').disabled=robot.joints.length<=1;
  $('joint-list').replaceChildren(...robot.joints.map((_,i)=>{const button=node('button',`J${i+1}`);button.setAttribute('aria-pressed',String(i===selected));button.setAttribute('aria-label',`${t('joint')} ${i+1}`);button.onclick=()=>selectJoint(i);return button;}));
  const j=robot.joints[selected];$('joint-title').textContent=`J${selected+1} · ${t('joint')}`;document.querySelectorAll('[data-axis]').forEach(b=>b.setAttribute('aria-pressed',String(j.axis===b.dataset.axis)));
  const lengths=[...LENGTHS];if(!lengths.includes(j.length))lengths.push(j.length);lengths.sort((a,b)=>a-b);
  $('link-length').replaceChildren(...lengths.map(length=>{const option=node('option',`${length} mm · ${money(length*PRICES.perMillimetre)}${!LENGTHS.includes(length)?' · '+t('legacyLength'):''}`);option.value=length;option.disabled=length!==j.length&&!possible(()=>changeJoint(robot,selected,{length}));return option;}));
  $('link-length').value=j.length;$('link-direction').value=j.direction;$('limit-min').value=j.min;$('limit-max').value=j.max;
  for(const id of ['joint-angle','joint-angle-number']){$(id).min=j.min;$(id).max=j.max;$(id).value=robot.pose[selected];}$('joint-angle').setAttribute('aria-label',`${t('joint')} ${selected+1} ${t('pose')}`);
  renderTest();for(const key of Object.keys(notes))$(`note-${key}`).value=notes[key];renderEvidence();$('save-status').textContent=t(saved?'saved':'notSaved');$('undo').disabled=!history.length;readouts();
}
function renderTest(){
  const affordable=price(robot).affordable;
  $('joint-controls').replaceChildren(...robot.joints.map((j,i)=>{const wrap=node('div',undefined,`joint-control${i===selected?' active':''}`);wrap.dataset.joint=i;const header=node('div'),button=node('button',`J${i+1} · ${j.axis.toUpperCase()}`);button.onclick=()=>selectJoint(i);header.append(button,node('span',`${j.min}° → ${j.max}°`));const row=node('div',undefined,'slider-row'),slider=node('input'),number=node('input');slider.type='range';number.type='number';for(const input of [slider,number]){input.min=j.min;input.max=j.max;input.step=1;input.value=robot.pose[i];input.disabled=!affordable;input.setAttribute('aria-label',`${t('joint')} ${i+1} ${t('pose')}`);}slider.id=`test-angle-${i}`;number.id=`test-number-${i}`;slider.oninput=()=>previewAngle(i,Number(slider.value));slider.onchange=finishPoseEdit;number.onchange=()=>commitAngle(i,number.value);row.append(slider,number);wrap.append(header,row);return wrap;}));
  $('rover-controls').hidden=robot.base!=='rover';for(const id of ['forward','backward','left','right'])$(id).disabled=!affordable;
}
function previewAngle(index,value){if(!poseBefore)poseBefore=clone(robot);robot.pose[index]=value;selected=index;syncAngles();readouts();}
function commitAngle(index,value){if(value.trim()===''||!Number.isFinite(Number(value))||Number(value)<robot.joints[index].min||Number(value)>robot.joints[index].max){notify('invalid');render();return;}const next=clone(robot);next.pose[index]=Number(value);selected=index;edit(next);}
function syncAngles(){const j=robot.joints[selected];for(const id of ['joint-angle','joint-angle-number']){$(id).min=j.min;$(id).max=j.max;$(id).value=robot.pose[selected];}robot.pose.forEach((q,i)=>{if($(`test-angle-${i}`)){$(`test-angle-${i}`).value=q;$(`test-number-${i}`).value=q;}});document.querySelectorAll('.joint-control').forEach(el=>el.classList.toggle('active',Number(el.dataset.joint)===selected));}
function readouts(){
  const data=observe(robot);$('tip-position').textContent=data.tip.map((v,i)=>`${'XYZ'[i]} ${Math.round(v)}`).join('  ')+' mm';$('axis-readout').textContent=`J${selected+1} · ${robot.joints[selected].axis.toUpperCase()} · ${Math.round(robot.pose[selected])}°`;
  const warning=!data.affordable?'repairBudget':data.floor?'floor':data.blocked?'obstacle':null;$('geometry-warning').hidden=!warning;if(warning)$('geometry-warning').textContent=t(warning);
  $('rover-position').textContent=`X ${Math.round(robot.rover.x)} · Y ${Math.round(robot.rover.y)} · ${Math.round(robot.rover.yaw)}°`;
  $('target-readings').replaceChildren(...data.targets.map(target=>{const row=node('div',undefined,`target-row${target.aligned?' ready':''}`);row.dataset.target=target.id;row.dataset.aligned=target.aligned;row.append(node('strong',target.id),node('b',t(target.aligned?'ready':'adjust')),node('small',`${Math.round(target.distance)} mm ${t('distance')} · ${Math.round(target.angle)}° ${t('direction')}`));return row;}));scene.update(robot,selected);
}
function renderEvidence(){
  $('evidence-list').replaceChildren();if(!evidence.length){$('evidence-list').append(node('p',t('emptyEvidence'),'help'));return;}
  evidence.forEach((entry,index)=>{const card=node('article',undefined,'evidence-card'),header=node('header'),p=price(entry.robot);header.append(node('strong',`${t('design')} ${index+1}`),node('span',`${money(p.total)} · ${t(entry.robot.base==='rover'?'rover':'fixed')}`));card.append(header,node('p',`${usedSlots(entry.robot)}/6 ${t('slots')} · ${p.linkLength} mm ${t('linkTotal')}`));card.append(node('p',entry.legacy?t('legacyEvidence'):observe(entry.robot).targets.map(target=>`${target.id}: ${Math.round(target.distance)} mm / ${Math.round(target.angle)}°`).join(' · ')));if(entry.note)card.append(node('p',entry.note));const actions=node('div',undefined,'evidence-actions'),restore=node('button',t('restore')),remove=node('button',t('delete'));restore.onclick=()=>{edit(entry.robot);notify('restored');};remove.onclick=()=>{evidence.splice(index,1);persist();renderEvidence();};actions.append(restore,remove);card.append(actions);$('evidence-list').append(card);});
}
$('scenario-switch').onclick=openPicker;$('picker-close').onclick=closePicker;
$('build-mode').onclick=()=>setMode('build');$('test-mode').onclick=()=>setMode('test');$('think-mode').onclick=()=>setMode('think');
$('language').onchange=()=>{finishPoseEdit();language=$('language').value;try{localStorage.setItem(LANGUAGE,language);}catch{}render();};
$('fixed-base').onclick=()=>attempt(()=>edit(setBase(robot,'fixed')));$('rover-base').onclick=()=>attempt(()=>edit(setBase(robot,'rover')));
$('add-joint').onclick=()=>attempt(()=>{const next=addJoint(robot);selected=next.joints.length-1;edit(next);});$('remove-joint').onclick=()=>attempt(()=>edit(removeJoint(robot,selected)));
$('robot-name').onchange=()=>{const next=clone(robot);next.name=$('robot-name').value;edit(next);};
document.querySelectorAll('[data-axis]').forEach(button=>button.onclick=()=>attempt(()=>edit(changeJoint(robot,selected,{axis:button.dataset.axis}))));
$('link-length').onchange=()=>attempt(()=>edit(changeJoint(robot,selected,{length:Number($('link-length').value)})));$('link-direction').onchange=()=>attempt(()=>edit(changeJoint(robot,selected,{direction:$('link-direction').value})));
for(const[id,key]of[['limit-min','min'],['limit-max','max']])$(id).onchange=()=>attempt(()=>{if($(id).value.trim()==='')throw Error('number');edit(changeJoint(robot,selected,{[key]:Number($(id).value)}));});
$('joint-angle').oninput=()=>previewAngle(selected,Number($('joint-angle').value));$('joint-angle').onchange=finishPoseEdit;$('joint-angle-number').onchange=()=>commitAngle(selected,$('joint-angle-number').value);
$('reset-pose').onclick=()=>{const next=clone(robot);next.pose=robot.joints.map(j=>j.home);next.rover=baseStart(robot.scenario,robot.base);edit(next);};
for(const[id,amount,turn]of[['forward',100,0],['backward',-100,0],['left',0,15],['right',0,-15]])$(id).onclick=()=>{const result=drive(robot,amount,turn);if(result.ok)edit(result.robot);else notify('blocked');};
$('undo').onclick=()=>{finishPoseEdit();if(history.length){robot=history.pop();selected=Math.min(selected,robot.joints.length-1);persist();render();}};
for(const key of Object.keys(notes))$(`note-${key}`).oninput=()=>{notes[key]=$(`note-${key}`).value;persist();};
$('record').onclick=()=>{finishPoseEdit();if(evidence.length>=6){notify('fullEvidence');return;}evidence.push({robot:clone(robot),note:notes.observation});persist();renderEvidence();notify('recorded');};
$('brief-toggle').onclick=()=>{$('brief').hidden=!$('brief').hidden;$('brief-toggle').setAttribute('aria-expanded',String(!$('brief').hidden));};
$('view-home').onclick=()=>scene.home();$('view-top').onclick=()=>scene.top();$('view-all').onclick=()=>scene.overview();$('labels').onclick=()=>{const active=$('labels').getAttribute('aria-pressed')!=='true';$('labels').setAttribute('aria-pressed',String(active));scene.setLabels(active);};
$('import').onclick=()=>$('file').click();$('file').onchange=async()=>{const file=$('file').files?.[0];if(!file)return;try{if(file.size>100000)throw Error('size');const parsed=readProject(JSON.parse(await file.text()));finishPoseEdit();persist();load(parsed);history=[];selected=0;persist();render();scene.overview();closePicker();notify(legacy?'legacyImported':'imported');}catch{notify('invalidFile');}finally{$('file').value='';}};
$('export').onclick=()=>{finishPoseEdit();persist();const blob=new Blob([JSON.stringify(project(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=(robot.name.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,65)||'robot-design')+'-'+robot.scenario+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('exported');};
window.addEventListener('pagehide',()=>{finishPoseEdit();persist();});
render();scene.overview();persist();if(!hasDraft)openPicker();
