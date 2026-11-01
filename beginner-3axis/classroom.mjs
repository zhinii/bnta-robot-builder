import * as THREE from "./vendor/three/build/three.module.js";

// Shared by the Z-up practice scene and Y-up robot demonstrations. Everything
// here is decorative: it must never enter robot collision or camera-fit bounds.
export const LAB_FAR_PLANE = 18000;
export function createClassroom({ yUp = false } = {}) {
  const room = new THREE.Group();
  room.name = "classroom";
  room.userData.decorative = true;
  const materials = new Map();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const mat = (color) => {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.78,
          metalness: 0.12,
        }),
      );
    return materials.get(color);
  };
  function mesh(name, geometry, color, position, scale, parent = room) {
    const m = new THREE.Mesh(geometry, mat(color));
    m.name = name;
    m.position.set(...position);
    m.scale.set(...scale);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(name, x, y, z, w, d, h, color, parent = room) {
    return mesh(name, cube, color, [x, y, z], [w, d, h], parent);
  }
  function rod(name, a, b, radius, color, parent = room) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const m = mesh(
      name,
      cylinder,
      color,
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      [radius, delta.length(), radius],
      parent,
    );
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return m;
  }
  const steel = 0x536b78,
    dark = 0x304753,
    pale = 0xb7c7cc;
  function bench(x, y, w = 560, d = 330) {
    box("research-worktop", x, y, -24, w, d, 28, 0x83969f);
    for (const dx of [-w / 2 + 30, w / 2 - 30])
      for (const dy of [-d / 2 + 30, d / 2 - 30])
        box("bench-frame", x + dx, y + dy, -145, 20, 20, 230, dark);
    box("bench-crossbar", x, y, -200, w - 50, 15, 16, steel);
  }
  // Preserve the verified learner work surface and its coordinate origin.
  box("workbench", 60, 0, -13, 630, 520, 25, 0x536574);
  for (const x of [-225, 345])
    for (const y of [-220, 220])
      box("bench-leg", x, y, -140, 18, 18, 240, 0x263747);
  box("lab-floor", 0, 0, -270, 11000, 11000, 20, 0x86969d);
  // An open atrium: architecture is well outside normal orbit/zoom distances.
  const wallColor = 0xc5cfd0;
  box("north-wall", 0, 4500, 1050, 10000, 35, 2640, wallColor);
  box("west-wall", -4500, 0, 1050, 35, 9000, 2640, wallColor);
  box("east-wall", 4500, 0, 1050, 35, 9000, 2640, wallColor);
  box("south-wall", 0, -4500, 1050, 10000, 35, 2640, wallColor);
  for (const x of [-3600, -1800, 0, 1800, 3600]) {
    box("daylight-frame", x, 4470, 1300, 1500, 30, 1500, dark);
    box("daylight-glazing", x, 4448, 1300, 1440, 12, 1430, 0xd5edf0);
    box("window-mullion", x, 4430, 1300, 20, 20, 1460, steel);
    box("architectural-column", x + 820, 4300, 1000, 95, 110, 2520, 0xa1b2bb);
  }
  for (const x of [-2600, 0, 2600]) {
    box("overhead-structure", x, 0, 2250, 75, 8500, 110, 0x9babaf);
    for (const y of [-2500, 0, 2500])
      box("suspended-light", x, y, 2100, 720, 90, 18, 0xe5f2ed);
  }
  // Floor seams and an open central aisle convey scale without competing
  // with the learner's grid or introducing apparent task obstacles.
  for (const a of [-3000, -2000, -1000, 1000, 2000, 3000]) {
    box("floor-seam", a, 0, -258, 2, 8500, 1, 0x74868f);
    box("floor-seam", 0, a, -258, 8500, 2, 1, 0x74868f);
  }
  function armStation(x, y, angle = 0) {
    bench(x, y);
    const arm = new THREE.Group();
    arm.name = "background-research-arm";
    arm.position.set(x - 70, y, 0);
    arm.rotation.z = angle;
    room.add(arm);
    rod("arm-plinth", [0, 0, -10], [0, 0, 45], 52, dark, arm);
    const points = [
      [0, 0, 45],
      [0, 0, 130],
      [40, 0, 330],
      [210, 0, 265],
      [245, 0, 180],
    ];
    for (let i = 1; i < points.length; i++) {
      rod(
        "arm-link",
        points[i - 1],
        points[i],
        i === 1 ? 32 : 22,
        0xa77e4e,
        arm,
      );
      rod(
        "arm-joint",
        [points[i][0], -27, points[i][2]],
        [points[i][0], 27, points[i][2]],
        32,
        dark,
        arm,
      );
      rod(
        "joint-cover",
        [points[i][0], -29, points[i][2]],
        [points[i][0], -32, points[i][2]],
        21,
        0x5f929e,
        arm,
      );
    }
    box("gripper-palm", 245, 0, 163, 65, 42, 18, dark, arm);
    for (const dx of [-25, 25])
      box("gripper-finger", 245 + dx, 0, 140, 9, 20, 36, dark, arm);
    box("specimen-tray", x + 170, y + 60, 6, 120, 100, 12, 0x628e96);
    box("research-specimen", x + 170, y + 60, 25, 46, 46, 26, pale);
  }
  function computer(x, y) {
    box("monitor-foot", x, y, 3, 90, 65, 8, dark);
    box("monitor-stand", x, y, 65, 14, 15, 120, steel);
    box("monitor-case", x, y, 140, 200, 22, 125, dark);
    box("monitor-screen", x, y - 13, 140, 182, 3, 106, 0x426b7d);
    // Abstract plots, not illegible fake text.
    for (let i = 0; i < 4; i++)
      box(
        "screen-plot",
        x - 60 + i * 38,
        y - 16,
        122 + i * 8,
        22,
        2,
        26 + i * 13,
        0x7caeb4,
      );
    box("keyboard", x, y - 75, 0, 140, 48, 8, steel);
  }
  armStation(-1050, 1000, 0.3);
  armStation(1100, 1500, -0.5);
  armStation(-1700, -800, 1.3);
  // Additive-manufacturing gantry, with a connected carriage and print head.
  bench(-1100, 2200, 680, 380);
  for (const x of [-1320, -880])
    box("printer-upright", x, 2200, 190, 30, 35, 390, steel);
  box("printer-crossbeam", -1100, 2200, 380, 470, 40, 35, dark);
  box("printer-carriage", -1040, 2190, 355, 65, 65, 60, 0x647f8a);
  rod("printer-nozzle", [-1040, 2190, 330], [-1040, 2190, 110], 10, dark);
  box("print-platform", -1100, 2170, 12, 350, 240, 22, dark);
  mesh("printed-prototype", sphere, 0x739da6, [-1040, 2190, 60], [50, 50, 48]);
  // Electronics / computer workstations face into the room.
  for (const x of [600, 1350, 2100]) {
    bench(x, 2800, 600, 330);
    computer(x - 90, 2800);
    box("electronics-module", x + 145, 2770, 32, 110, 100, 70, 0x657d8a);
  }
  bench(1750, 100, 700, 360);
  computer(1590, 100);
  for (const x of [1780, 1880])
    box("instrument", x, 100, 75, 80, 100, 160, 0x77949c);
  // A compact autonomous cart and equipment racks provide varied technology.
  box("mobile-cart", -1800, 600, -165, 220, 300, 110, 0x647f8b);
  for (const x of [-1905, -1695])
    for (const y of [500, 700])
      rod("cart-wheel", [x - 10, y, -220], [x + 10, y, -220], 38, dark);
  box("cart-sensor", -1800, 600, -95, 60, 60, 30, 0x73a6ad);
  for (const x of [2600, 3000]) {
    box("equipment-rack", x, 3400, 100, 280, 260, 720, dark);
    for (let z = -180; z < 430; z += 100) {
      box("rack-module", x, 3260, z, 235, 14, 75, steel);
      box("rack-indicator", x + 80, 3249, z, 12, 4, 12, 0x80b5b9);
    }
  }
  // Broad whiteboard with a schematic robot / chart, away from the work area.
  box("research-whiteboard", -2250, 3650, 450, 1100, 24, 550, steel);
  box("whiteboard-face", -2250, 3633, 450, 1060, 8, 510, 0xd6dfdd);
  for (let i = 0; i < 4; i++)
    box(
      "diagram-bar",
      -2600 + i * 140,
      3626,
      370 + i * 20,
      70,
      4,
      130 + i * 40,
      0x829ca2,
    );
  // Perimeter fabrication zone. The four walls stay at +/-4500; these static
  // machines face into the lab and remain outside the learner's work envelope.
  function station(name, x, y, angle = 0) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, 0);
    g.rotation.z = angle;
    room.add(g);
    return g;
  }
  const cnc = station("enclosed-cnc-machine", -3850, 1500, Math.PI / 2);
  box("cnc-plinth", 0, 0, -150, 1380, 850, 220, dark, cnc);
  box("cnc-back", 0, 390, 520, 1380, 60, 1140, pale, cnc);
  for (const x of [-630, 630])
    box("cnc-side-casting", x, 0, 520, 120, 850, 1140, 0xb5c6ca, cnc);
  box("cnc-roof", 0, 0, 1100, 1380, 850, 100, pale, cnc);
  box("cnc-work-bed", 0, 30, 100, 920, 530, 160, steel, cnc);
  for (const x of [-320, -160, 0, 160, 320])
    box("cnc-bed-slot", x, -10, 182, 12, 430, 5, dark, cnc);
  box("cnc-workpiece", 0, -20, 225, 250, 180, 80, 0x9ba6a7, cnc);
  box("cnc-spindle-head", 0, 170, 660, 300, 250, 430, steel, cnc);
  rod("cnc-spindle", [0, 90, 445], [0, 90, 320], 45, dark, cnc);
  rod("cnc-cutting-tool", [0, 90, 320], [0, 90, 280], 13, pale, cnc);
  const glazing = new THREE.MeshStandardMaterial({
    color: 0x6d9faa,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  for (const x of [-285, 285]) {
    box("cnc-door-bottom", x, -435, 140, 560, 42, 390, 0xa5bbc2, cnc);
    box("cnc-door-header", x, -435, 1020, 560, 42, 95, steel, cnc);
    for (const dx of [-270, 270])
      box("cnc-window-frame", x + dx, -435, 655, 22, 42, 640, steel, cnc);
    const window = box(
      "cnc-viewing-window",
      x,
      -435,
      655,
      515,
      12,
      630,
      0x6d9faa,
      cnc,
    );
    window.material = glazing;
  }
  for (const x of [-55, 55])
    rod("cnc-door-handle", [x, -480, 440], [x, -480, 700], 14, dark, cnc);
  box("cnc-control-arm", 790, -230, 650, 250, 55, 55, dark, cnc);
  box("cnc-control-console", 830, -365, 650, 280, 160, 500, steel, cnc);
  box("cnc-display", 830, -450, 730, 230, 8, 215, 0x345d70, cnc);
  for (let i = 0; i < 4; i++)
    box(
      "cnc-display-line",
      800,
      -456,
      680 + i * 31,
      130 + i * 12,
      3,
      8,
      0x7cb1ba,
      cnc,
    );
  for (const x of [765, 830, 895])
    for (const z of [480, 530])
      box("cnc-control-key", x, -450, z, 30, 9, 23, pale, cnc);
  rod("cnc-status-mast", [550, 220, 1150], [550, 220, 1330], 12, dark, cnc);
  rod(
    "cnc-status-light",
    [550, 220, 1330],
    [550, 220, 1390],
    27,
    0x759b87,
    cnc,
  );

  const laser = station("enclosed-laser-cutter", -3900, -750, Math.PI / 2);
  for (const x of [-490, 490])
    for (const y of [-290, 290])
      box("laser-leg", x, y, -60, 50, 50, 400, dark, laser);
  box("laser-cabinet", 0, 0, 170, 1120, 740, 230, 0xa8bec4, laser);
  box("laser-front-fascia", 0, -350, 365, 1120, 40, 180, steel, laser);
  box("laser-rear-hinge-housing", 0, 345, 330, 1120, 45, 110, steel, laser);
  for (const x of [-540, 540])
    box("laser-hood-side", x, 0, 350, 40, 690, 160, steel, laser);
  box("laser-cutting-bed", 0, 0, 298, 950, 620, 20, dark, laser);
  for (let x = -420; x <= 420; x += 60)
    box("laser-bed-slat", x, 0, 311, 7, 560, 8, steel, laser);
  box("laser-gantry", 0, 100, 345, 940, 35, 35, pale, laser);
  box("laser-head", 120, 90, 340, 45, 55, 80, steel, laser);
  const lid = new THREE.Group();
  lid.name = "laser-closed-lid";
  lid.position.z = 425;
  lid.rotation.x = -0.12;
  laser.add(lid);
  for (const x of [-540, 540])
    box("laser-lid-edge", x, 0, 0, 40, 730, 28, dark, lid);
  for (const y of [-345, 345])
    box("laser-lid-edge", 0, y, 0, 1080, 40, 28, dark, lid);
  const lidWindow = box(
    "laser-tinted-window",
    0,
    0,
    0,
    1040,
    650,
    12,
    0x6d9faa,
    lid,
  );
  lidWindow.material = glazing;
  box("laser-lid-handle", 0, -370, 0, 220, 28, 28, steel, lid);
  box("laser-console", 445, -385, 290, 160, 100, 70, dark, laser);
  box("laser-display", 445, -390, 327, 100, 60, 5, 0x78a2ac, laser);
  rod("laser-extraction-duct", [0, 350, 120], [0, 490, 120], 65, steel, laser);
  box("laser-extractor", 760, 140, -25, 260, 300, 450, steel, laser);
  rod(
    "laser-extraction-duct",
    [0, 490, 120],
    [760, 490, 120],
    65,
    steel,
    laser,
  );
  rod(
    "laser-extraction-duct",
    [760, 490, 120],
    [760, 280, 120],
    65,
    steel,
    laser,
  );

  function toolCart(x, y, angle = 0) {
    const cart = station("wall-tool-cart", x, y, angle);
    for (const dx of [-220, 220])
      for (const dy of [-130, 130]) {
        rod(
          "cart-caster-fork",
          [dx, dy, -170],
          [dx, dy, -215],
          10,
          steel,
          cart,
        );
        rod(
          "cart-caster",
          [dx - 13, dy, -225],
          [dx + 13, dy, -225],
          35,
          dark,
          cart,
        );
      }
    box("tool-cart-cabinet", 0, 0, 35, 530, 330, 410, 0x547b88, cart);
    box("tool-cart-top", 0, 0, 255, 560, 360, 30, dark, cart);
    for (let z = -120; z <= 180; z += 75) {
      box("tool-cart-drawer", 0, -171, z, 485, 12, 62, steel, cart);
      box("tool-cart-handle", 0, -185, z + 12, 330, 14, 9, pale, cart);
    }
    rod(
      "tool-cart-push-handle",
      [310, -120, 200],
      [310, 120, 200],
      12,
      dark,
      cart,
    );
    for (const dy of [-120, 120])
      rod(
        "tool-cart-handle-bracket",
        [260, dy, 200],
        [310, dy, 200],
        10,
        dark,
        cart,
      );
    box("tool-cart-organizer", -120, 30, 291, 180, 120, 42, 0xa38e70, cart);
    for (let i = 0; i < 3; i++)
      rod(
        "stored-tool",
        [50 + i * 40, -60, 278],
        [50 + i * 40, 75, 278],
        8,
        pale,
        cart,
      );
  }
  toolCart(-4120, -2300, Math.PI / 2);
  toolCart(-4120, 3100, Math.PI / 2);
  toolCart(1700, 4200);
  toolCart(3700, -4100, Math.PI);

  // East: electronics and measurement bays. South: project displays and
  // storage flanking the entrance. Local -Y always faces into the room.
  function researchBay(name, x, y, angle, tools = false) {
    const bay = station(name, x, y, angle);
    box("perimeter-counter", 0, 0, 200, 1250, 500, 45, steel, bay);
    for (const dx of [-450,450]) {
      box("storage-cabinet", dx, 0, -25, 320, 440, 450, 0x8ca3ad, bay);
      for (const z of [-130,0,130]) {
        box("storage-drawer", dx, -225, z, 290, 15, 110, pale, bay);
        box("storage-handle", dx, -240, z+20, 180, 15, 12, dark, bay);
      }
    }
    box("wall-board-frame", 0, 270, 730, 1300, 25, 750, steel, bay);
    box("wall-board", 0, 250, 730, 1250, 12, 700, tools ? 0x78929b : 0xd5dfdc, bay);
    if (tools) {
      for (let i=0;i<6;i++) {
        const tx=-460+i*180;
        rod("hanging-tool-shaft", [tx,230,580], [tx,230,880], 13, pale, bay);
        box("hanging-tool-grip",tx,230,600,32,22,110,dark,bay);
        // Forked spanner heads / hammer heads alternate along the rack.
        box("hanging-tool-head",tx,230,890,i%2?100:60,25,30,pale,bay);
        if (!(i%2)) for(const side of [-1,1]) box("spanner-jaw",tx+side*23,230,915,14,25,35,pale,bay);
      }
    } else {
      // Simple equipment schematics and graph marks, not pretend UI text.
      for(let i=0;i<4;i++) {
        box("research-chart",-430+i*260,235,680,160,4,170+i*45,0x779da6,bay);
        box("research-chart-caption",-430+i*260,235,535,160,4,12,steel,bay);
      }
    }
    box("bench-instrument",-290,-40,330,280,220,220,dark,bay);
    box("instrument-display",-290,-155,350,215,8,110,0x578b9d,bay);
    for(let i=0;i<4;i++) box("instrument-trace",-370+i*48,-161,335+i*9,26,3,8,0xa5d0c8,bay);
    box("prototype-plinth",250,-30,240,330,260,36,dark,bay);
    mesh("student-prototype",sphere,0x89a9b2,[250,-30,320],[95,75,65],bay);
    return bay;
  }
  researchBay("east-electronics-bay",4160,-2000,-Math.PI/2,true);
  researchBay("east-metrology-bay",4160,1800,-Math.PI/2);
  researchBay("south-project-bay",-2500,-4160,Math.PI);
  researchBay("south-tool-bay",2100,-4160,Math.PI,true);
  // North and west already hold the windows, racks, whiteboard and fabrication
  // machines. This wall rack fills the quieter west tool-cart area as well.
  const rack = station("west-wall-tool-rack",-4440,-2300,Math.PI/2);
  box("wall-rack-backing",0,0,660,1100,30,540,steel,rack);
  for(let i=0;i<5;i++) {
    const x=-400+i*200;
    rod("rack-tool",[x,-25,520],[x,-25,800],15,pale,rack);
    box("rack-tool-handle",x,-25,560,35,30,100,dark,rack);
  }

  // Closed entrance door: no change to the simulation's collision world.
  const door = station("south-entrance-door",0,-4445,Math.PI);
  box("door-reveal",0,0,590,980,55,1720,dark,door);
  box("door-leaf",0,-35,590,870,30,1660,0x78929e,door);
  for(const x of [-480,480]) box("door-jamb",x,-45,595,55,85,1710,pale,door);
  box("door-lintel",0,-45,1465,1015,85,65,pale,door);
  box("door-vision-frame",0,-55,1040,360,20,500,dark,door);
  box("door-vision-panel",0,-68,1040,315,8,455,0xb3d2d6,door);
  box("door-kickplate",0,-55,-100,800,12,220,steel,door);
  box("door-handle-plate",325,-58,540,55,18,140,dark,door);
  rod("door-lever",[325,-85,550],[205,-85,550],13,pale,door);
  box("door-threshold",0,-25,-250,960,120,20,steel,door);
  // Small neutral room marker with a pictogram; no unreadable tiny lettering.
  box("entrance-sign",680,-10,1120,250,25,220,steel,door);
  box("entrance-sign-arm",680,-26,1120,100,5,20,pale,door).rotation.y=-0.5;
  box("entrance-sign-base",640,-26,1065,65,5,18,pale,door);
  if (yUp) room.rotation.x = -Math.PI / 2;
  return room;
}
