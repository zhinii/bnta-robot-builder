const p=(en,zh)=>({en,zh});
const target=(id,position,direction)=>({id,position,direction});
// Rendering, collision checks, briefs and measurements share these dimensions.
export const SCENARIOS={
  rescue:{
    id:'rescue',title:p('Disaster-site inspection','灾后现场巡检'),tag:p('A long corridor. Three separated locations.','长走廊，三个分散的观察位置。'),
    mission:p('Help a response team inspect a damaged building before entering. Bring the camera to A, B and C, facing into each opening. The marked base position is at one end of the corridor; concrete debris restricts the clear route.','帮助应急团队在进入前观察受损建筑。将相机送到A、B、C，并朝向各开口。底座标记位于走廊一端，混凝土碎块限制了可通行的路线。'),
    prompt:p('Can length alone reach every opening? What does moving the base change, and what does it cost?','只增加长度能到达所有开口吗？移动底盘改变了什么，又付出了什么代价？'),
    room:{width:3000,depth:8400},anchor:[0,-3000],start:{x:0,y:-3000,yaw:90},floor:0xd9dcd8,
    obstacles:[
      {id:'rubble-a',kind:'rubble',min:[-1450,-3300,0],max:[-700,-1700,1050]},
      {id:'rubble-b',kind:'rubble',min:[700,-650,0],max:[1450,650,1200]},
      {id:'rubble-c',kind:'rubble',min:[-1450,1800,0],max:[-700,3400,1150]},
      {id:'wall-a',kind:'wall',min:[1350,-3500,0],max:[1480,-1200,1450]},
      {id:'wall-b',kind:'wall',min:[-1480,-700,0],max:[-1350,800,1500]},
      {id:'wall-c',kind:'wall',min:[1350,1400,0],max:[1480,3500,1450]},
    ],
    targets:[target('A',[-520,-2300,850],[-1,0,0]),target('B',[520,0,850],[1,0,0]),target('C',[-520,2600,850],[-1,0,0])],
  },
  workshop:{
    id:'workshop',title:p('Workshop quality inspection','工坊质量检查'),tag:p('A compact bench. Different viewing directions.','紧凑的工作台，不同的观察方向。'),
    mission:p('Check three components before a school workshop uses them. Bring the camera to each marked inspection position and face the indicated surface. All components stay in their fixtures on one bench. Compare what extra spending actually improves.','在学校工坊使用零件前，检查三个零件。将相机送到各标记位置，并朝向指定表面。所有零件都固定在同一工作台的夹具上。比较额外花费究竟带来了什么改善。'),
    prompt:p('What is the simplest design that can inspect all three parts? Does spending more on a base help here?','能检查全部三个零件的最简单方案是什么？在这里，给底座增加花费有帮助吗？'),
    room:{width:2800,depth:2400},anchor:[0,0],start:{x:-150,y:0,yaw:90},floor:0xe2e4dc,
    obstacles:[{id:'bench',kind:'bench',min:[150,-650,0],max:[850,650,430]}],
    targets:[-65,0,65].map((degrees,i)=>{const a=degrees*Math.PI/180;return target('ABC'[i],[365*Math.cos(a),365*Math.sin(a),600],[Math.cos(a),Math.sin(a),0]);}),
  },
  museum:{
    id:'museum',title:p('Museum collection inspection','博物馆藏品巡检'),tag:p('Three displays. Several ways to approach.','三个展台，多种接近方式。'),
    mission:p('Help a museum document its collection without touching the displays. Inspect A, B and C at different heights. A fixed arm can invest in reach and articulation; a moving base can approach with a shorter arm. Use measurements and cost to defend your choice.','帮助博物馆在不触碰展品的情况下记录藏品。观察不同高度的A、B、C。固定机械臂可以增加长度与关节；移动底盘可以带着更短的机械臂接近展品。用测量数据和成本解释你的选择。'),
    prompt:p('Could a different base achieve the same observations? Compare cost, link length and the movements each design needs.','另一种底座能完成相同观察吗？比较成本、连杆总长，以及各方案需要的动作。'),
    room:{width:3400,depth:3600},anchor:[0,0],start:{x:0,y:0,yaw:90},floor:0xe8e4da,
    obstacles:[
      {id:'plinth-a',kind:'plinth',min:[790,-700,0],max:[1190,-260,600]},
      {id:'plinth-b',kind:'plinth',min:[900,-200,0],max:[1300,200,760]},
      {id:'plinth-c',kind:'plinth',min:[790,260,0],max:[1190,700,600]},
    ],
    targets:[target('A',[640,-480,840],[1,0,0]),target('B',[750,0,980],[1,0,0]),target('C',[640,480,840],[1,0,0])],
  },
};
for(const t of SCENARIOS.workshop.targets){const c=t.position.map((v,i)=>v+t.direction[i]*110);SCENARIOS.workshop.obstacles.push({id:'component-'+t.id,kind:'component',min:[c[0]-40,c[1]-40,430],max:[c[0]+40,c[1]+40,680]});}
for(const b of [...SCENARIOS.museum.obstacles]){const x=(b.min[0]+b.max[0])/2,y=(b.min[1]+b.max[1])/2;SCENARIOS.museum.obstacles.push({id:'art-'+b.id,kind:'artifact',min:[x-70,y-60,b.max[2]],max:[x+70,y+60,b.max[2]+260]});}
export const SCENARIO_IDS=Object.keys(SCENARIOS);
export const getScenario=id=>{if(!Object.hasOwn(SCENARIOS,id))throw Error('scenario');return SCENARIOS[id];};
