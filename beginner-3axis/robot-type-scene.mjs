import { createClassroom, LAB_FAR_PLANE } from "./classroom.mjs";
import * as THREE from "./vendor/three/build/three.module.js";
import { robotTypePose, DELTA_GEOMETRY } from "./robot-type-motion.mjs";
import { drawDelta } from "./delta-model.mjs";

/** One reusable WebGL scene for the entire presentation; never learner state. */
export function createRobotTypeScene(host) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  host.append(canvas);
  let gl;
  try {
    gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
  } catch {}
  if (!gl) {
    canvas.remove();
    return { available: false, draw() {}, dispose() {} };
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: true,
  });
  const compact =
    window.innerWidth < 700 ||
    (window.navigator?.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75),
  );
  renderer.shadowMap.enabled = !compact;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#aabdc7");
  const classroom = createClassroom({ yUp: true });
  scene.add(classroom);
  const camera = new THREE.PerspectiveCamera(36, 1, 1, LAB_FAR_PLANE);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x788699, 2.8));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(150, 300, 160);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {
    left: -240,
    right: 240,
    top: 240,
    bottom: -240,
    near: 1,
    far: 700,
  });
  light.shadow.bias = -0.001;
  scene.add(light);
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    ball: new THREE.SphereGeometry(1, 20, 12),
    rod: new THREE.CylinderGeometry(1, 1, 1, 20),
    ring: new THREE.TorusGeometry(1, 0.22, 10, 28),
    housing: roundedTriangle(),
    taper: new THREE.CylinderGeometry(0.65, 1, 1, 12),
    cup: new THREE.CylinderGeometry(0.48, 1, 1, 24),
    packet: new THREE.BoxGeometry(1, 1, 1),
  };
  function roundedTriangle() {
    // A gently rounded triangular casting, with its three lobes aligned to
    // the three motor planes and the moving platform's attachment points.
    const vertices = [0, 1, 2].map(
      (i) =>
        new THREE.Vector2(
          Math.cos((i * 2 * Math.PI) / 3),
          Math.sin((i * 2 * Math.PI) / 3),
        ),
    );
    const shape = new THREE.Shape();
    for (let i = 0; i < 3; i++) {
      const v = vertices[i],
        before = v.clone().lerp(vertices[(i + 2) % 3], 0.08),
        after = v.clone().lerp(vertices[(i + 1) % 3], 0.08);
      if (!i) shape.moveTo(before.x, before.y);
      else shape.lineTo(before.x, before.y);
      shape.quadraticCurveTo(v.x, v.y, after.x, after.y);
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.94,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.03,
      curveSegments: 6,
    });
    geometry.translate(0, 0, -0.47);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }
  const colors = {
    silver: 0xe78b39,
    dark: 0x26364b,
    blue: 0x27aabd,
    orange: 0xf59e0b,
    green: 0x7dc7b2,
    white: 0xffffff,
    carbon: 0x222a32,
  };
  const materials = Object.fromEntries(
    Object.entries(colors).map(([k, color]) => [
      k,
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.25,
        roughness: 0.48,
      }),
    ]),
  );
  const parts = new Map();
  const up = new THREE.Vector3(0, 1, 0);
  const grid = new THREE.GridHelper(400, 20, 0xb9c5d6, 0xd8e0eb);
  grid.position.y = 0.1;
  scene.add(grid);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 420),
    new THREE.MeshStandardMaterial({ color: 0xe8edf4, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  let last = null;
  const framing = new Map();
  function fitCamera(type, aspect) {
    const key = `${type}:${aspect}`;
    if (framing.has(key)) return framing.get(key);
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const p = robotTypePose(type, i / 48);
      if (p.points)
        for (const v of p.points) points.push(new THREE.Vector3(...v));
      for (const v of [p.base, p.joint, p.tip, p.source, p.destination])
        if (v) points.push(new THREE.Vector3(...v));
      if (type === "scara")
        points.push(new THREE.Vector3(p.tip[0], p.tip[1] + 124, p.tip[2]));
      if (type === "delta")
        for (const { a, b, e } of p.chains)
          points.push(
            new THREE.Vector3(...a),
            new THREE.Vector3(...b),
            new THREE.Vector3(...e),
          );
      if (type === "mobile")
        for (const x of [-30, 30])
          for (const z of [-28, 28])
            points.push(new THREE.Vector3(p.tip[0] + x, 60, p.tip[2] + z));
    }
    if (type === "delta") {
      for (const x of [-121, 121])
        for (const y of [0, DELTA_GEOMETRY.mountHeight + 47])
          points.push(new THREE.Vector3(x, y, -102));
      for (const x of [-65, 65]) points.push(new THREE.Vector3(x, 0, 60));
    }
    if (type === "cartesian")
      for (const x of [-105, 105])
        for (const z of [-90, 90])
          for (const y of [0, 140]) points.push(new THREE.Vector3(x, y, z));
    if (type === "articulated" || type === "scara")
      points.push(
        new THREE.Vector3(type === "scara" ? -65 : -30, 0, -25),
        new THREE.Vector3(30, 0, 25),
      );
    const center = new THREE.Box3()
      .setFromPoints(points)
      .getCenter(new THREE.Vector3());
    const direction = (
        type === "delta"
          ? new THREE.Vector3(0.75, 0.44, 1.6)
          : new THREE.Vector3(1, 0.42, 1.35)
      ).normalize(),
      right = new THREE.Vector3().crossVectors(up, direction).normalize(),
      vertical = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tan = Math.tan(THREE.MathUtils.degToRad(36) / 2);
    let distance = 0;
    for (const point of points) {
      const relative = point.clone().sub(center);
      distance = Math.max(
        distance,
        relative.dot(direction) +
          Math.max(
            (Math.abs(relative.dot(right)) + 18) / (tan * aspect),
            (Math.abs(relative.dot(vertical)) + 18) / tan,
          ),
      );
    }
    const result = {
      center,
      position: center.clone().addScaledVector(direction, distance * 1.06),
    };
    framing.set(key, result);
    return result;
  }
  function mesh(name, shape, color, pos, scale) {
    let m = parts.get(name);
    if (!m) {
      m = new THREE.Mesh(geometries[shape], materials[color]);
      m.castShadow = true;
      m.receiveShadow = true;
      parts.set(name, m);
      scene.add(m);
    }
    m.material = materials[color];
    m.geometry = geometries[shape];
    m.visible = true;
    m.position.fromArray(pos);
    m.scale.fromArray(scale);
    m.quaternion.identity();
    return m;
  }
  const box = (name, p, size, color = "silver") =>
    mesh(name, "box", color, p, size);
  const ball = (name, p, r = 9, color = "blue") =>
    mesh(name, "ball", color, p, [r, r, r]);
  function rod(name, a, b, r = 7, color = "silver") {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      delta = bv.clone().sub(av);
    const m = mesh(
      name,
      "rod",
      color,
      av.add(bv).multiplyScalar(0.5).toArray(),
      [r, delta.length(), r],
    );
    m.quaternion.setFromUnitVectors(up, delta.normalize());
    return m;
  }
  function grip(tip, direction, gap, fingerExtension = 6, toolSide = null) {
    const forward = new THREE.Vector3(...direction).normalize();
    let side = toolSide
      ? new THREE.Vector3(...toolSide)
      : new THREE.Vector3().crossVectors(forward, up);
    if (side.length() < 0.01) side.set(1, 0, 0);
    side.normalize();
    const p = new THREE.Vector3(...tip),
      palm = p.clone().addScaledVector(forward, -16);
    rod(
      "tool-mount",
      p.clone().addScaledVector(forward, -24).toArray(),
      palm.toArray(),
      7,
      "dark",
    );
    rod(
      "palm",
      palm.clone().addScaledVector(side, -gap).toArray(),
      palm.clone().addScaledVector(side, gap).toArray(),
      4,
      "dark",
    );
    for (const sign of [-1, 1])
      rod(
        `finger${sign}`,
        palm
          .clone()
          .addScaledVector(side, sign * gap)
          .toArray(),
        p
          .clone()
          .addScaledVector(side, sign * gap)
          .addScaledVector(forward, fingerExtension)
          .toArray(),
        3,
        "dark",
      );
  }
  function joint(name, p, axis, r = 12) {
    rod(
      name,
      p.map((n, i) => n - axis[i] * 9),
      p.map((n, i) => n + axis[i] * 9),
      r,
      "dark",
    );
    for (const sign of [-1, 1])
      rod(
        `${name}-cap${sign}`,
        p.map((n, i) => n + axis[i] * sign * 9),
        p.map((n, i) => n + axis[i] * sign * 11),
        r * 0.73,
        "blue",
      );
  }
  function draw(type, t, label) {
    last = [type, t, label];
    canvas.setAttribute("aria-label", label);
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    if (
      canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())
    )
      renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the complete motion envelope, not the decorative floor; framing is stable during playback.
    const frame = fitCamera(type, camera.aspect);
    camera.position.copy(frame.position);
    camera.lookAt(frame.center);
    camera.updateProjectionMatrix();
    for (const m of parts.values()) m.visible = false;
    const f = robotTypePose(type, t);
    if (type === "sixaxis") {
      rod("foot", [0, 0, 0], [0, 8, 0], 27, "dark");
      for (let i = 0; i < 6; i++) {
        rod(
          `six-link-${i}`,
          f.points[i],
          f.points[i + 1],
          i < 3 ? 10 : 6,
          "silver",
        );
        joint(`six-joint-${i}`, f.points[i], f.axes[i], i < 3 ? 13 : 8);
      }
      grip(f.tip, f.dir, 12, 6, f.side);
      box("test-object", [115, 12, -50], [20, 24, 20], "green");
    } else if (type === "mobile") {
      const groupPoint = (x, y, z) => [
        f.tip[0] + x * Math.cos(f.heading) + z * Math.sin(f.heading),
        y,
        f.tip[2] - x * Math.sin(f.heading) + z * Math.cos(f.heading),
      ];
      box("rover-body", groupPoint(0, 18, 0), [52, 20, 40], "dark").rotation.y =
        f.heading;
      box("parcel", groupPoint(0, 39, 0), [24, 22, 24], "orange").rotation.y =
        f.heading;
      for (const z of [-23, 23])
        for (const x of [-16, 16])
          rod(
            `wheel${x}${z}`,
            groupPoint(x, 10, z - 3),
            groupPoint(x, 10, z + 3),
            10,
            "dark",
          );
      for (const z of [-12, 12])
        ball(`lamp${z}`, groupPoint(27, 20, z), 3, "blue");
      box("destination", [70, 1, -65], [65, 2, 60], "green");
    } else if (type === "cartesian") {
      for (const x of [-100, 100])
        for (const z of [-80, 80])
          box(`post${x}${z}`, [x, 60, z], [12, 120, 12], "dark");
      for (const x of [-100, 100])
        rod(`rail${x}`, [x, 120, -80], [x, 120, 80], 5);
      rod("bridge", [-100, 120, f.tip[2]], [100, 120, f.tip[2]], 7);
      box("carriage", [f.tip[0], 120, f.tip[2]], [22, 22, 22], "blue");
      rod("plunger", [f.tip[0], 120, f.tip[2]], [f.tip[0], 25, f.tip[2]], 4);
      rod("nozzle", [f.tip[0], 25, f.tip[2]], f.tip, 6, "dark");
      box("print-bed", [0, 3, 0], [170, 6, 130], "dark");
      for (let i = 0; i <= f.phase; i++)
        rod(
          `print${i}`,
          [f.corners[i][0], 8, f.corners[i][2]],
          i === f.phase
            ? [f.tip[0], 8, f.tip[2]]
            : [f.corners[i + 1][0], 8, f.corners[i + 1][2]],
          3,
          "orange",
        );
    } else if (type === "delta") {
      drawDelta(f, { mesh, box, rod, ball });
    } else {
      for (const [key, p] of [
        ["source", f.source],
        ["destination", f.destination],
      ])
        box(
          key,
          [p[0], p[1] - 11, p[2]],
          [44, 8, 42],
          key === "source" ? "silver" : "green",
        );
      if (type === "articulated") {
        rod("foot", [0, 0, 0], [0, 8, 0], 28, "dark");
        rod("base", [0, 8, 0], [0, 50, 0], 19);
        rod("neck", [0, 45, 0], f.base, 12, "dark");
        rod("upper", f.base, f.joint, 10);
        const axis = [-Math.sin(f.yaw), 0, Math.cos(f.yaw)];
        joint("shoulder", f.base, axis, 14);
        joint("elbow", f.joint, axis, 12);
        const dir = new THREE.Vector3(...f.tip)
          .sub(new THREE.Vector3(...f.joint))
          .normalize();
        rod(
          "forearm",
          f.joint,
          new THREE.Vector3(...f.tip).addScaledVector(dir, -23).toArray(),
          8,
        );
        grip(f.tip, dir.toArray(), f.gap);
      } else if (type === "scara") {
        box("foot", [-40, 6, 0], [48, 12, 48], "dark");
        rod("base", [-40, 8, 0], f.base, 15);
        rod("upper", f.base, f.joint, 11);
        joint("shoulder", f.base, [0, 1, 0], 14);
        joint("elbow", f.joint, [0, 1, 0], 12);
        const elbowTop = [f.joint[0], 112, f.joint[2]];
        rod("elbow-riser", f.joint, elbowTop, 10, "dark");
        rod("forearm", elbowTop, [f.tip[0], 112, f.tip[2]], 8);
        box("wrist-guide", [f.tip[0], 112, f.tip[2]], [20, 26, 20], "blue");
        rod(
          "plunger",
          [f.tip[0], f.tip[1] + 124, f.tip[2]],
          [f.tip[0], f.tip[1] + 24, f.tip[2]],
          4,
        );
        grip(f.tip, [0, -1, 0], f.gap, -2);
        const socket = mesh(
          "socket",
          "ring",
          "dark",
          [f.destination[0], 14, f.destination[2]],
          [9, 9, 9],
        );
        socket.rotation.x = Math.PI / 2;
        for (const sign of [-1, 1])
          rod(
            `socket-support${sign}`,
            [f.destination[0] + sign * 13, 10, f.destination[2]],
            [f.destination[0] + sign * 8, 14, f.destination[2]],
            2,
            "dark",
          );
      }
      if (type === "scara")
        rod(
          "part",
          [f.object[0], f.object[1] - 6, f.object[2]],
          [f.object[0], f.object[1] + 6, f.object[2]],
          6,
          "orange",
        );
      else ball("part", f.object, 7, "orange");
    }
    renderer.render(scene, camera);
  }
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          if (last) draw(...last);
        });
  observer?.observe(host);
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    Object.values(geometries).forEach((g) => g.dispose());
    Object.values(materials).forEach((m) => m.dispose());
    grid.geometry.dispose();
    grid.material.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    classroom.traverse((n) => {
      n.geometry?.dispose();
      if (n.material) n.material.dispose();
    });
    renderer.dispose();
  }
  window.addEventListener("pagehide", dispose, { once: true });
  return { available: true, draw, dispose };
}
