const p=(en,zh)=>({en,zh});
const fixture=(id,kind,min,max)=>({id,kind,min,max});
const target=(id,position,direction,label)=>({id,position,direction,label});
const pad=(id,x,y,en,zh)=>({id,x,y,yaw:0,label:p(en,zh)});
export const SCENARIOS={
 greenhouse:{id:'greenhouse',title:p('Water the greenhouse','给温室植物浇水'),tag:p('Six thirsty plants. One long aisle.','六株缺水植物，一条长通道。'),
 mission:p('Water the six marked plants on both sides of the aisle. Bring the watering nozzle above each pot. The beds stay where they are. Can your robot reach them all without spending more than $1,200?','给通道两侧的六株标记植物浇水。把浇水喷头送到每个花盆上方。种植床的位置固定。你的机器人能在$1,200预算内够到全部植物吗？'),
 prompt:p('Would you buy longer links, more joints, or a moving base? Predict before you try.','你会购买更长的连杆、更多关节，还是移动底盘？先预测，再尝试。'),
 tool:'water',room:{width:3000,depth:6400,height:3200},anchor:[0,-2400],start:{x:0,y:-2400,yaw:90},floor:0xc6c3ae,
 pads:[pad('start',0,-2400,'Near the door','靠近门口'),pad('middle',0,0,'Middle of the aisle','通道中间'),pad('end',0,2400,'Far end','通道末端')],
 obstacles:[fixture('left-bed','bed',[-1450,-2800,0],[-600,2800,540]),fixture('right-bed','bed',[600,-2800,0],[1450,2800,540])],
 targets:[],stations:[],steps:[],
 },
 cafeteria:{id:'cafeteria',title:p('Load the tray washer','把餐盘放入清洗机'),tag:p('A conveyor, three trays and a washer.','传送带、三个餐盘和一台清洗机。'),
 mission:p('Take one tray at a time from the end of the conveyor and place it on the washer’s loading rack. Load all three trays. Keep the tray clear of the equipment as your arm moves.','从传送带末端一次取一个餐盘，放到清洗机的装载架上。装入全部三个餐盘。机械臂移动时，要让餐盘避开设备。'),
 prompt:p('Which installation spot lets you reach both the conveyor and the washer?','哪个安装位置能同时够到传送带和清洗机？'),
 tool:'tray',room:{width:3600,depth:3000,height:2500},anchor:[0,0],start:{x:-200,y:0,yaw:90},floor:0xcbd1cc,
 pads:[pad('middle',0,0,'Between the machines','两台设备之间'),pad('source',-450,-650,'Near the conveyor','靠近传送带'),pad('washer',-450,650,'Near the washer','靠近清洗机')],
 obstacles:[fixture('conveyor','conveyor',[150,-680,0],[1500,-250,620]),fixture('rack','rack',[150,250,0],[750,680,620]),fixture('washer','washer',[750,250,0],[1500,850,1450]),fixture('sink','sink',[-1650,650,0],[-1050,1350,850])],
 targets:[target('A',[232.5,-402.7,700],[.5,-Math.sqrt(3)/2,0],p('Pick up a tray','取餐盘')),target('B',[232.5,402.7,700],[.5,Math.sqrt(3)/2,0],p('Load the washer','放入清洗机'))],
 stations:[{id:'work',x:-200,y:0,yaw:90,label:p('Work position','工作位置')}],steps:[],
 },
 hospital:{id:'hospital',title:p('Bring a book within reach','把书送到伸手可及处'),tag:p('Help a seated person with an everyday task.','帮助坐着的人完成日常小事。'),
 mission:p('A person is seated in a hospital room. Their book is on the side cabinet, beyond their reach. Pick it up and place it on the nearby table. Keep the robot and book clear of the person and furniture.','一位坐在医院房间里的人够不到边柜上的书。请取起书，放到身旁的桌子上。机器人和书都要避开人和家具。'),
 prompt:p('Where could you install the arm? Would moving the base let you use a shorter arm?','机械臂可以安装在哪里？移动底盘能让你使用更短的机械臂吗？'),
 tool:'book',room:{width:3800,depth:3600,height:2600},anchor:[0,0],start:{x:0,y:-500,yaw:90},floor:0xd8d8ca,
 pads:[pad('middle',0,0,'Between cabinet and table','边柜与桌子之间'),pad('cabinet',-350,-700,'Near the book','靠近书'),pad('person',0,950,'Near the person','靠近人')],
 obstacles:[fixture('cabinet','cabinet',[450,-750,0],[1000,-250,770]),fixture('table','table',[450,280,0],[950,760,770]),fixture('person','person',[1000,200,0],[1650,1100,1550]),fixture('bed','bedframe',[-1700,550,0],[-750,1600,750])],
 targets:[target('A',[600,-500,855],[1,0,0],p('Pick up the book','取书')),target('B',[600,500,855],[1,0,0],p('Place it within reach','放到伸手可及处'))],
 stations:[{id:'cabinet',x:85,y:-500,yaw:90,label:p('Near the book','靠近书')},{id:'person',x:85,y:500,yaw:90,label:p('Near the person','靠近人')}],steps:[],
 },
};
for(const [row,y]of [-2000,0,2000].entries())for(const [side,x]of [-785,785].entries()){
 const id='ABCDEF'[row*2+side],sign=Math.sign(x);
 SCENARIOS.greenhouse.targets.push(target(id,[x,y,900],[sign,0,0],p('Water plant '+id,'给植物'+id+'浇水')));
 SCENARIOS.greenhouse.stations.push({id,x:sign*200,y,yaw:90,label:p('Plant '+id,'植物'+id)});
 SCENARIOS.greenhouse.steps.push({target:id,action:'water',label:p('Water plant '+id,'给植物'+id+'浇水')});
 SCENARIOS.greenhouse.obstacles.push(fixture('pot-'+id,'pot',[x-110,y-110,540],[x+110,y+110,765]));
}
for(let i=0;i<3;i++)SCENARIOS.cafeteria.steps.push({target:'A',action:'pick',label:p('Pick up tray '+(i+1),'取第'+(i+1)+'个餐盘')},{target:'B',action:'place',label:p('Load tray '+(i+1),'装入第'+(i+1)+'个餐盘')});
SCENARIOS.hospital.steps=[{target:'A',action:'pick',label:p('Pick up the book','取书')},{target:'B',action:'place',label:p('Place the book within reach','把书放到伸手可及处')}];
export const SCENARIO_IDS=Object.keys(SCENARIOS);
export const canonicalScenario=id=>id==='rescue'?'greenhouse':id==='museum'?'hospital':id==='workshop'?'cafeteria':id;
export const getScenario=id=>{if(!Object.hasOwn(SCENARIOS,id))throw Error('scenario');return SCENARIOS[id];};
