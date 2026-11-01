import { Controller } from './controller.mjs';
import { CONFIG, fk as fk3 } from './model.mjs';
import { initialScene } from './planner.mjs';
import { practiceRoute } from './curriculum.mjs';
import { homeFor, toolPose, ikTool, valid, pathSafe } from '../six-axis-agent/kinematics.mjs';
import { SLIDES, P } from './teacher-content.mjs';
export const FAILURE_DEMOS = ['orientation','path','grip','reach','limits'];
export class TeacherSession {
  constructor(onChange = () => {}) { this.onChange=onChange; this.model=3; this.index=0; this.type='articulated'; this.load(0); }
  get slide(){return SLIDES[this.index];}
  get active(){return ['running','solution'].includes(this.phase);}
  get fixedModel(){return ['path','grip','reach','limits'].includes(this.slide.id);}
  get q(){return this.model===3?this.controller.state.scene.actualJoints.map(v=>v*180/Math.PI):this.q6;}
  get tcp(){const p=this.model===3?fk3(this.controller.state.scene.actualJoints).C:null; return p?[p.x,p.y,p.z]:toolPose(this.q6).tip;}
  notify(){this.onChange(this);}
  load(index){
    this.controller?.dispose(); this.index=Math.max(0,Math.min(SLIDES.length-1,index));
    if(this.fixedModel)this.model=3;
    this.controller=new Controller({scene:initialScene({obstacle:this.slide.id==='path'})});
    this.q6=homeFor(6); this.phase='predict'; this.result=null; this.motion=null; this.queue=[]; this.elapsed=0; this.typeTime=0; this.highlight=null; this.ghost=false; this.path=[]; this.pathColour='blue';this.controlMoved=false;
    if(this.slide.id==='path')for(const action of practiceRoute('obstacle',this.controller.state.scene).slice(0,3))this.finishSetup(action);
    this.rejected=null;this.targetPoint=this.slide.id==='reach'?[280,0,CONFIG.H]:null;
    this.before={tcp:[...this.tcp],q:[...this.q]}; this.notify();
  }
  chooseModel(model){if(![3,6].includes(model)||this.fixedModel)return; this.model=model;this.load(this.slide.id==='types'?1:this.index);}
  chooseType(type){this.type=type;this.load(this.index);}
  action(a){
    if(a.type==='gripper')return this.controller.grip(a.gripperState);
    for(const axis of ['x','y','z'])this.controller.editTarget(axis,a.targetMm[axis]);
    return this.controller.move();
  }
  finishSetup(a){const r=this.action(a);if(!r.ok)throw Error('Invalid demonstration setup: '+r.error.code);for(let i=0;this.controller.busy&&i<1000;i++)this.controller.tick(100);if(this.controller.busy)throw Error('Setup did not finish');}
  run(solution=false){
    if(this.active || (solution && this.phase!=='discuss'))return;
    if(!solution&&this.phase!=='predict')return;
    this.phase=solution?'solution':'running';this.elapsed=0;this.result=null;this.highlight=null;this.before={tcp:[...this.tcp],q:[...this.q]};
    const id=this.slide.id;
    if(id==='orientation'){
      this.ghost=true;
      if(solution){this.model=6;this.q6=homeFor(6);this.before={tcp:[...this.tcp],q:[...this.q]};}
      if(this.model===6){const end=[...this.q6];end[5]+=90;this.animateSix(end,2000);this.highlight='j6';}
    }else if(id==='joint'){
      this.highlight='j1';
      if(this.model===3){const q=this.controller.state.scene.actualJoints;const r=this.controller.moveJoint(0,q[0]+Math.PI/6);if(!r.ok)this.failure(r.error.code);}
      else {const end=[...this.q6];end[0]+=30;this.animateSix(end,1800);}
    }else if(id==='control'){
      this.highlight='controller';
    }else if(id==='xyz'){
      if(this.model===3){const p=fk3(this.controller.state.scene.actualJoints).C;const r=this.action({type:'move',targetMm:{...p,z:p.z+10}});if(!r.ok)this.failure(r.error.code);}
      else {const p=[...this.tcp];p[2]+=10;const solved=ikTool(p,this.q6);if(solved.q)this.animateSix(solved.q,2200);else this.failure(solved.error);}
    }else if(id==='reach'){
      this.targetPoint=[solution?200:280,0,CONFIG.H];
      this.path=[[...this.tcp],[...this.targetPoint]];this.pathColour=solution?'green':'red';
      const [x,y,z]=this.targetPoint,r=this.action({type:'move',targetMm:{x,y,z}});
      this.rejected=r.ok?null:r.error.code;
      if(solution&&!r.ok)this.failure(r.error.code);
    }else if(id==='limits'){
      this.highlight='j1';
      const r=this.controller.moveJoint(0,(solution?30:170)*Math.PI/180);
      this.rejected=r.ok?null:r.error.code;
      if(solution&&!r.ok)this.failure(r.error.code);
    }else if(id==='path'){
      const route=practiceRoute('obstacle',this.controller.state.scene);
      if(solution){this.path=[];this.pathColour='green';this.queue=route.slice(4);}
      else {const p=route[3].targetMm;this.path=[[...this.tcp],[p.x,p.y,p.z]];this.pathColour='red';const r=this.action(route[3]);this.rejected=r.ok?null:r.error.code;}
    }else if(id==='grip'){
      if(solution)this.queue=[{type:'gripper',gripperState:'open'},...practiceRoute('grip',this.controller.state.scene)];
      else this.controller.grip('closed');
    }
    this.notify();
  }
  animateSix(end,duration){if(!valid(end)||!pathSafe(this.q6,end)){this.failure('path');return;}this.motion={from:[...this.q6],end,duration,start:this.elapsed};}
  failure(code){this.phase='stopped';this.motion=null;this.queue=[];this.result=P('The demonstration could not execute this pose ('+code+'). Reset to try again.','演示无法执行此位姿（'+code+'）。请重置后重试。');}
  discuss(){if(this.phase!=='observe')return;this.phase='discuss';this.notify();}
  stop(){if(!this.active)return;this.controller.stop();this.motion=null;this.queue=[];this.phase='stopped';this.result=P('Motion stopped. Discuss the current pose, or reset this demonstration.', '运动已停止。可以讨论当前位姿，或重置此演示。');this.notify();}
  tick(dt){
    if(!this.active)return;this.elapsed+=dt;this.controller.tick(dt);
    if(this.motion){const m=this.motion,t=Math.min(1,(this.elapsed-m.start)/m.duration),s=t*t*(3-2*t);this.q6=m.from.map((v,i)=>v+(m.end[i]-v)*s);if(t===1)this.motion=null;}
    const id=this.slide.id;
    if(id==='types'){this.typeTime=Math.min(12000,this.elapsed);if(this.elapsed<12000)return;}
    if(id==='control'){
      this.highlight=['controller','motor','j1','sensor'][Math.min(3,Math.floor(this.elapsed/1100))];
      if(this.elapsed>=2200&&!this.controlMoved){this.controlMoved=true;if(this.model===3)this.controller.moveJoint(0,Math.PI/6);else{const end=[...this.q6];end[0]+=30;this.animateSix(end,1000);}}
      if(this.elapsed<4400)return;
    }
    if(id==='path'&&this.phase==='solution')this.path.push([...this.tcp]);
    if(this.controller.busy||this.motion)return;
    if(this.queue.length){const r=this.action(this.queue.shift());if(!r.ok){this.failure(r.error.code);this.notify();}return;}
    if(this.elapsed<850)return;
    const solved=this.phase==='solution';
    this.phase=solved?'done':'observe';
    if(id==='orientation'){
      const shift=Math.hypot(...this.tcp.map((v,i)=>v-this.before.tcp[i]));
      this.result=this.model===3?P('Requested: tool twist +90°. Observed: no movement. Keep this result on screen and discuss what is missing.', '要求：工具自转90°。观察：没有运动。请保留此结果，讨论缺少了什么。'):
        P('J6 turned 90°. Tool-point displacement: '+shift.toFixed(3)+' mm. The jaws changed direction while the point stayed in place.', 'J6转动90°。工具点位移：'+shift.toFixed(3)+'毫米。夹爪改变了朝向，工具点保持不动。');
    }else if(id==='reach')this.result=solved?P('The task marker moved closer. The tool reached the revised location. The links kept the same lengths.', '任务标记已移近，工具到达了调整后的位置，连杆长度没有改变。'):
      this.rejected==='UNREACHABLE'?P('Target out of reach. The request was rejected before motion; the arm stayed still. What could change about the task location?', '目标超出可达范围。请求在运动前被拒绝，机械臂保持不动。任务位置可以怎样调整？'):P('Unexpected reach result. Reset before continuing.', '可达性结果与预期不符，请重置后继续。');
    else if(id==='limits')this.result=solved?P('J1 reached +30° within its allowed range. We changed the requested turn, not the joint limit.', 'J1在允许范围内转到+30°。我们改变的是请求的转角，而不是关节限位。'):
      this.rejected==='JOINT_LIMIT'?P('J1 +170° is outside this model’s −150° to +150° limit. The request was rejected; no joint moved.', 'J1的+170°超出本模型−150°至+150°的限位。请求被拒绝，所有关节都没有运动。'):P('Unexpected joint-limit result. Reset before continuing.', '关节限位结果与预期不符，请重置后继续。');
    else if(id==='path')this.result=solved?P('Raised route completed. The part is supported at A. Compare the route with the failed direct request.', '抬高后的路线已完成，零件支撑于A处。请与失败的直线路径比较。'):
      this.rejected==='PATH_BLOCKED'?P('Direct route rejected before motion. The arm and held part remain at the starting position.', '直线路径在运动前被拒绝。机械臂与夹持零件仍停留在起点。'):P('Unexpected route result. Reset before continuing.', '路径结果与预期不符，请重置后继续。');
    else if(id==='grip')this.result=solved?P('The part follows the tool through a 10 mm lift. Compare this evidence with merely closing empty jaws.', '零件随工具抬升10毫米。请将此证据与仅闭合空夹爪比较。'):P('The jaws closed. Holding a part: No. The part stayed on its support.', '夹爪已闭合。夹持零件：否。零件仍在支撑物上。');
    else if(id==='xyz')this.result=P('Measured tool-height change: '+(this.tcp[2]-this.before.tcp[2]).toFixed(2)+' mm. Compare the joint angles before and after.', '实测工具高度变化：'+(this.tcp[2]-this.before.tcp[2]).toFixed(2)+'毫米。请比较前后的关节角度。');
    else this.result=P('The demonstration has stopped here. What changed? What stayed the same?', '演示停在此处。什么发生了变化？什么保持不变？');
    this.notify();
  }
}
