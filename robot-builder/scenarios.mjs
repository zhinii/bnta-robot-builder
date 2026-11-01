const p=(en,zh)=>({en,zh});
const target=(id,position,direction)=>({id,position,direction});
// Rendering, collision checks, briefs and measurements share these dimensions.
export const SCENARIOS={
  greenhouse:{
    id:'greenhouse',title:p('Greenhouse plant inspection','温室植物巡检'),tag:p('A long growing aisle. Three plant stations.','长种植通道，三个植物观察站。'),
    mission:p('Help a school check its greenhouse plants. Bring the camera to A, B and C, facing the leaves along the growing aisle. Raised beds limit the clear floor space. Choose where to install a fixed arm, or explore how a rover can travel between the plants.','帮助学校检查温室植物。将相机送到种植通道中的A、B、C，并朝向叶片。高架种植床限制了空地。选择固定机械臂的安装位置，或探索如何用移动底盘在植物之间行驶。'),
    prompt:p('Can one fixed location cover all three plants? What does travelling along the aisle change, and what does it cost?','一个固定位置能覆盖三株植物吗？沿通道移动改变了什么，又需要多少成本？'),
    room:{width:3000,depth:8400},anchor:[0,-3000],start:{x:0,y:-3000,yaw:90},floor:0xdde5d3,
    obstacles:[
      {id:'bed-a',kind:'planter',min:[-1450,-3300,0],max:[-700,-1700,1050]},
      {id:'bed-b',kind:'planter',min:[700,-650,0],max:[1450,650,1200]},
      {id:'bed-c',kind:'planter',min:[-1450,1800,0],max:[-700,3400,1150]},
      {id:'trellis-a',kind:'trellis',min:[1350,-3500,0],max:[1480,-1200,1450]},
      {id:'trellis-b',kind:'trellis',min:[-1480,-700,0],max:[-1350,800,1500]},
      {id:'trellis-c',kind:'trellis',min:[1350,1400,0],max:[1480,3500,1450]},
    ],
    targets:[target('A',[-520,-2300,850],[-1,0,0]),target('B',[520,0,850],[1,0,0]),target('C',[-520,2600,850],[-1,0,0])],
  },
  workshop:{
    id:'workshop',title:p('Workshop quality inspection','工坊质量检查'),tag:p('A compact bench. Different viewing directions.','紧凑的工作台，不同的观察方向。'),
    mission:p('Check three components before a school workshop uses them. Bring the camera to each marked inspection position and face the indicated surface. All components stay in their fixtures on one bench. Compare what extra spending actually improves.','在学校工坊使用零件前，检查三个零件。将相机送到各标记位置，并朝向指定表面。所有零件都固定在同一工作台的夹具上。比较额外花费究竟带来了什么改善。'),
    prompt:p('Where should you install the arm to inspect all three parts? Could a better location save money on links or joints?','机械臂安装在哪里才能检查全部三个零件？更好的位置能节省连杆或关节费用吗？'),
    room:{width:2800,depth:2400},anchor:[0,0],start:{x:-150,y:0,yaw:90},floor:0xe2e4dc,
    obstacles:[{id:'bench',kind:'bench',min:[150,-650,0],max:[850,650,430]}],
    targets:[-65,0,65].map((degrees,i)=>{const a=degrees*Math.PI/180;return target('ABC'[i],[365*Math.cos(a),365*Math.sin(a),600],[Math.cos(a),Math.sin(a),0]);}),
  },
  hospital:{
    id:'hospital',title:p('Hospital supply inspection','医院物资巡检'),tag:p('Supply labels and equipment. Different heights.','物资标签与设备，不同的观察高度。'),
    mission:p('Help hospital staff inspect a supply room. Bring the camera to the supply labels at A and C and the equipment display at B, without touching the cabinets. Choose a useful fixed installation or approach each station with a rover. Compare the cost and movements needed.','帮助医院工作人员检查物资间。将相机送到A、C的物资标签及B的设备显示屏前，避开柜体。选择合适的固定安装位置，或用移动底盘接近各观察站。比较成本和所需动作。'),
    prompt:p('Could both base types collect the same observations? Test how your installation location changes the reach and joints you need.','两种底座能获得相同的观察结果吗？测试安装位置如何改变所需长度与关节。'),
    room:{width:3400,depth:3600},anchor:[0,0],start:{x:0,y:0,yaw:90},floor:0xe1eceb,
    obstacles:[
      {id:'cabinet-a',kind:'cabinet',min:[790,-700,0],max:[1190,-260,600]},
      {id:'cabinet-b',kind:'cabinet',min:[900,-200,0],max:[1300,200,760]},
      {id:'cabinet-c',kind:'cabinet',min:[790,260,0],max:[1190,700,600]},
    ],
    targets:[target('A',[640,-480,840],[1,0,0]),target('B',[750,0,980],[1,0,0]),target('C',[640,480,840],[1,0,0])],
  },
};
for(const t of SCENARIOS.workshop.targets){const c=t.position.map((v,i)=>v+t.direction[i]*110);SCENARIOS.workshop.obstacles.push({id:'component-'+t.id,kind:'component',min:[c[0]-40,c[1]-40,430],max:[c[0]+40,c[1]+40,680]});}
for(const b of [...SCENARIOS.hospital.obstacles]){const x=(b.min[0]+b.max[0])/2,y=(b.min[1]+b.max[1])/2;SCENARIOS.hospital.obstacles.push({id:'supply-'+b.id,kind:b.id==='cabinet-b'?'monitor':'supplies',min:[x-70,y-60,b.max[2]],max:[x+70,y+60,b.max[2]+260]});}
export const SCENARIO_IDS=Object.keys(SCENARIOS);
export const canonicalScenario=id=>id==='rescue'?'greenhouse':id==='museum'?'hospital':id;
export const getScenario=id=>{if(!Object.hasOwn(SCENARIOS,id))throw Error('scenario');return SCENARIOS[id];};
