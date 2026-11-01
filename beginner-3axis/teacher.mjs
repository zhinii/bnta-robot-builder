import { TeacherSession, FAILURE_DEMOS } from './teacher-session.mjs';
import { createTeacherScene } from './teacher-scene.mjs';
import { createRobotTypeScene } from './robot-type-scene.mjs';
import { PARTS, SLIDES, TYPE_IDS, OPTIONAL_TYPE_IDS, DEMO_DETAILS, COPY, P } from './teacher-content.mjs';
import { t } from './i18n.mjs';
const $=id=>document.getElementById(id);
let language='en';try{language=localStorage.getItem('bnta:teacher-language')==='zh'?'zh':'en';}catch{}
const text=p=>p?.[language]||'',write=(id,p)=>$(id).textContent=text(p);
let selected=null,showLabels=true,typeScene=null,last=0,frame,session,scene;
session=new TeacherSession(()=>{if(scene)render();});
scene=createTeacherScene($('arm-view'),id=>{selected=id;render();});
$('no3d').hidden=scene.supported;
function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;return b;}
function selectSlide(index){selected=null;$('demo-details').open=false;session.load(index);$('outline').hidden=true;$('outline-toggle').setAttribute('aria-expanded','false');document.querySelector('.lesson-scroll').scrollTop=0;}
// Slides are teacher-paced. Neither a completed demonstration nor a failure advances them.
function render(){
  document.documentElement.lang=language;$('language').value=language;
  document.querySelectorAll('[data-copy]').forEach(e=>e.textContent=text(COPY[e.dataset.copy]));
  write('fullscreen',document.fullscreenElement?COPY.exitFullscreen:COPY.fullscreen);
  const s=session.slide,isType=s.id==='types',failure=FAILURE_DEMOS.includes(s.id);
  $('world').dataset.model=String(session.model);$('world').dataset.phase=session.phase;
  $('counter').textContent=String(session.index+1).padStart(2,'0')+' / '+SLIDES.length;write('slide-title',s.title);write('slide-text',s.text);write('question',s.question);write('phase',COPY.phase[session.phase]);
  $('lesson-progress').textContent=(session.index+1)+' / '+SLIDES.length;
  write('scene-title',isType?P('Robot body types','机器人结构类型'):session.model===3?COPY.three:COPY.six);
  write('mode-note',session.fixedModel?COPY.sample:COPY.scale);
  $('model3').setAttribute('aria-pressed',String(!isType&&session.model===3));$('model6').setAttribute('aria-pressed',String(!isType&&session.model===6));
  $('model6').disabled=session.fixedModel; $('model6').title=session.fixedModel?text(COPY.sample):'';
  $('arm-view').hidden=isType;$('type-view').hidden=!isType;$('readout').hidden=isType;$('orbit-hint').hidden=isType;
  $('labels').disabled=isType;$('home').disabled=isType;$('labels').setAttribute('aria-pressed',String(showLabels));
  $('type-options').hidden=!isType;$('type-description').hidden=!isType;$('parts').hidden=isType;
  $('optional-types').hidden=!isType;
  $('demo-details').hidden=!DEMO_DETAILS[s.id];write('demo-detail-text',DEMO_DETAILS[s.id]);
  $('review-evidence').hidden=s.id!=='review';
  $('evidence-options').replaceChildren(...SLIDES.filter(s=>['grip','orientation','reach','limits','path'].includes(s.id)).map(s=>button(text(s.title),()=>selectSlide(SLIDES.indexOf(s)))));
  if(isType){
    typeScene??=createRobotTypeScene($('type-view'));
    const typeButton=id=>{const b=button(t(language,'bodyPlans.'+id+'.title'),()=>{selected=null;session.chooseType(id);});b.dataset.robotType=id;b.setAttribute('aria-pressed',String(id===session.type));return b;};
    $('type-options').replaceChildren(...TYPE_IDS.map(typeButton));
    $('optional-type-options').replaceChildren(...OPTIONAL_TYPE_IDS.map(typeButton));
    $('type-description').textContent=t(language,'bodyPlans.'+session.type+'.description')+' '+t(language,'bodyPlans.'+session.type+'.job');
    if(!typeScene.available)$('no3d').hidden=false;
  }
  $('part-options').replaceChildren(...Object.entries(PARTS).filter(([id])=>!(session.model===3&&/^j[456]$/.test(id))).map(([id,p])=>{const b=button(text(p[0]),()=>{selected=id;render();});b.dataset.part=id;b.setAttribute('aria-pressed',String(id===selected));return b;}));
  $('outline').replaceChildren(...SLIDES.map((s,i)=>{const b=button((i+1)+'. '+text(s.title),()=>{selectSlide(i);render();});b.dataset.slide=String(i);b.setAttribute('aria-current',i===session.index?'step':'false');return b;}));
  $('result').hidden=!session.result;write('result',session.result);$('result').dataset.failure=String(session.phase==='observe'&&failure&&(s.id!=='orientation'||session.model===3));
  $('discussion').hidden=!['discuss','done'].includes(session.phase);write('discussion',s.discussion);
  $('demo').hidden=!s.demo||session.phase!=='predict';$('demo').disabled=!scene.supported;
  $('discuss').hidden=!((!s.demo&&session.phase==='predict')||session.phase==='observe');
  const canSolve=failure&&session.phase==='discuss'&&(s.id!=='orientation'||session.model===3);
  $('solution').hidden=!canSolve;write('solution',({orientation:COPY.compare,path:COPY.lift,grip:COPY.approach,reach:COPY.closer,limits:COPY.allowed})[s.id]||COPY.solve);
  $('reset-demo').hidden=session.phase==='predict';$('stop').disabled=!session.active;
  $('previous').disabled=session.index===0;$('next').disabled=session.index===SLIDES.length-1;
  updateLive();
}
function updateLive(){
  const isType=session.slide.id==='types', id=selected||session.highlight, part=PARTS[id];
  $('part-card').hidden=isType||!part;
  if(part){write('part-kicker',P('Selected component','所选部件'));write('part-title',part[0]);write('part-description',part[1]);}
  const held=session.model===3&&session.controller.state.scene.objects.some(o=>o.heldByGripper),p=session.tcp;
  const q=session.q.map((v,i)=>'J'+(i+1)+' '+v.toFixed(1)+'°').join(' · ');
  $('readout').textContent='TCP  X '+p[0].toFixed(1)+'  Y '+p[1].toFixed(1)+'  Z '+p[2].toFixed(1)+' mm\n'+q+(['path','grip'].includes(session.slide.id)?' · '+text(COPY.holding)+': '+text(held?COPY.yes:COPY.no):'');
  if(isType&&typeScene?.available)typeScene.draw(session.type,session.typeTime/12000,t(language,'bodyPlans.'+session.type+'.title'));
  else if(!isType)scene.update(session,language,selected,showLabels);
}
$('language').onchange=()=>{language=$('language').value;try{localStorage.setItem('bnta:teacher-language',language);}catch{}render();};
$('model3').onclick=()=>{selected=null;session.chooseModel(3);};$('model6').onclick=()=>{selected=null;session.chooseModel(6);};
$('demo').onclick=()=>{selected=null;session.run();};$('solution').onclick=()=>{selected=null;session.run(true);};
$('discuss').onclick=()=>{if(!session.slide.demo){session.phase='discuss';render();}else session.discuss();};
$('stop').onclick=()=>session.stop();$('reset-demo').onclick=()=>{selected=null;session.load(session.index);};
$('next').onclick=()=>selectSlide(session.index+1);$('previous').onclick=()=>selectSlide(session.index-1);
$('labels').onclick=()=>{showLabels=!showLabels;render();};$('home').onclick=()=>scene.home();
$('outline-toggle').onclick=()=>{$('outline').hidden=!$('outline').hidden;$('outline-toggle').setAttribute('aria-expanded',String(!$('outline').hidden));};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
document.addEventListener('fullscreenchange',render);
document.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;if(e.key==='ArrowRight'){e.preventDefault();selectSlide(session.index+1);}if(e.key==='ArrowLeft'){e.preventDefault();selectSlide(session.index-1);}if(e.key==='Escape')session.stop();});
function tick(now){const dt=Math.min(100,now-(last||now));last=now;session.tick(dt);updateLive();frame=requestAnimationFrame(tick);}
render();frame=requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);session.controller.dispose();scene.dispose();typeScene?.dispose();});
