import { DELTA_GEOMETRY as G } from "./robot-type-motion.mjs";
import { Vector3 } from "./vendor/three/build/three.module.js";
const up = new Vector3(0, 1, 0),
  direction = new Vector3();

/** An unbranded, three-axis Delta teaching model. Every moving attachment
 * comes from the same constrained pose, including both rods of each pair. */
export function drawDelta(f, { mesh, box, rod, ball }) {
  const H = G.mountHeight;
  // Rigid rear portal and cantilever: the robot is mounted to a structure,
  // not propped up by thin rods intersecting its moving linkage.
  for (const x of [-104, 104]) {
    box(`delta-foot${x}`, [x, 4, -86], [34, 8, 32], "dark");
    box(`delta-post${x}`, [x, (H + 50) / 2, -86], [11, H + 34, 11], "silver");
    box(
      `delta-post-inlay${x}`,
      [x, (H + 50) / 2, -79.9],
      [3, H + 25, 1],
      "dark",
    );
    for (const dx of [-11, 11])
      for (const dz of [-10, 10])
        rod(
          `foot-bolt${x}:${dx}:${dz}`,
          [x + dx, 8, -86 + dz],
          [x + dx, 10, -86 + dz],
          1.7,
          "dark",
        );
  }
  box("delta-crossbeam", [0, H + 40, -86], [220, 14, 14], "dark");
  for (const x of [-25, 25]) {
    box(`delta-cantilever${x}`, [x, H + 40, -42], [10, 12, 98], "silver");
    rod(`delta-brace${x}`, [x, H + 32, -86], [x, H + 14, -28], 4, "dark");
  }
  rod("delta-mount-flange", [0, H + 26, 0], [0, H + 40, 0], 27, "dark");
  // Heavy drives stay overhead; only the links and small platform travel.
  mesh("delta-head", "housing", "white", [0, H + 16, 0], [68, 26, 68]);
  rod("delta-head-lower-rim", [0, H, 0], [0, H + 6, 0], 51, "dark");
  rod("delta-head-top", [0, H + 28, 0], [0, H + 32, 0], 43, "blue");
  for (let i = 0; i < 3; i++) {
    const { a, b, e, tangent, rods } = f.chains[i];
    const add = (p, k) => p.map((v, j) => v + k * tangent[j]);
    rod(
      `delta-motor-mount${i}`,
      [a[0] * 0.5, a[1] + 3, a[2] * 0.5],
      a,
      7,
      "dark",
    );
    // Drive casing, output bearing and positive mechanical attachment.
    rod(`delta-drive${i}`, add(a, -15), add(a, 15), 12, "silver");
    rod(`delta-drive-cap${i}`, add(a, 15), add(a, 19), 10, "blue");
    rod(`delta-output-bearing${i}`, add(a, -17), add(a, -14), 10, "dark");
    for (const k of [-11, 11])
      ball(`delta-drive-bolt${i}:${k}`, add(a, k), 2, "dark");
    const av = a.map((v, j) => v + (b[j] - v) * 0.14),
      bv = b.map((v, j) => v + (a[j] - v) * 0.1);
    const link = mesh(
      `delta-upper${i}`,
      "taper",
      "silver",
      av.map((v, j) => (v + bv[j]) / 2),
      [7, Math.hypot(...av.map((v, j) => bv[j] - v)), 7],
    );
    // mesh() resets orientation each frame. A cylinder's long axis is local Y.
    link.quaternion.setFromUnitVectors(
      up,
      direction.set(...bv.map((v, j) => v - av[j])).normalize(),
    );
    rod(`delta-upper-root${i}`, a, av, 7, "silver");
    rod(`delta-upper-end${i}`, bv, b, 4.2, "silver");
    rod(`delta-elbow-crossbar${i}`, add(b, -11), add(b, 11), 3.4, "silver");
    for (const [j, r] of rods.entries()) {
      ball(`delta-upper-ball${i}:${j}`, r.from, 3.8, "dark");
      ball(`delta-lower-ball${i}:${j}`, r.to, 3.8, "dark");
      rod(`delta-parallel${i}:${j}`, r.from, r.to, 1.8, "carbon");
      // Metal rod ends make the ball-joint connections legible at phone scale.
      const near = r.from.map((v, k) => v + (r.to[k] - v) * 0.045),
        far = r.to.map((v, k) => v + (r.from[k] - v) * 0.045);
      rod(`delta-rod-end-a${i}:${j}`, r.from, near, 2.5, "silver");
      rod(`delta-rod-end-b${i}:${j}`, far, r.to, 2.5, "silver");
    }
    rod(`delta-platform-crossbar${i}`, add(e, -10), add(e, 10), 3, "silver");
  }
  const [x, y, z] = f.tip,
    py = y + G.platformOffset;
  mesh("delta-platform", "housing", "blue", [x, py - 2, z], [26, 5, 26]);
  rod("delta-platform-insert", [x, py - 7, z], [x, py - 4, z], 12, "dark");
  rod("delta-vacuum-stem", [x, y + 11, z], [x, py - 7, z], 3.5, "silver");
  mesh("delta-vacuum-cup", "cup", "dark", [x, y + 8.5, z], [7, 5, 7]);
  for (const h of [10, 12]) {
    const ring = mesh(
      `delta-bellows${h}`,
      "ring",
      "dark",
      [x, y + h, z],
      [3.5, 3.5, 3.5],
    );
    ring.rotation.x = Math.PI / 2;
  }
  ball(
    "delta-tool-indicator",
    [x + 10, py + 2, z + 9],
    2.5,
    f.vacuumOn ? "green" : "blue",
  );
  // Flexible vacuum supply descends inside the linkage, clear of the rods.
  // Its curve is illustrative; this is not a pneumatic or cable simulation.
  const hosePoint = (t) => [
    x * t + 12 * Math.sin(Math.PI * t),
    (H - 6) * (1 - t) + (py + 4) * t,
    z * t - 6 * Math.sin(Math.PI * t),
  ];
  for (let i = 0; i < 20; i++)
    rod(
      `delta-vacuum-hose${i}`,
      hosePoint(i / 20),
      hosePoint((i + 1) / 20),
      1.1,
      "blue",
    );
  rod("delta-hose-fitting", [x, py + 1, z], [x, py + 7, z], 2.7, "silver");

  // A stopped infeed conveyor and a receiving tray give the cycle a clear job.
  const sx = f.source[0],
    sz = f.source[2],
    dx = f.destination[0],
    dz = f.destination[2];
  box("delta-belt-chassis", [sx, 22, sz - 16], [34, 10, 102], "silver");
  box("delta-belt", [sx, 27, sz - 16], [27, 2, 98], "carbon");
  for (const side of [-1, 1]) {
    box(
      `delta-belt-rail${side}`,
      [sx + side * 17, 26, sz - 16],
      [3, 6, 102],
      "silver",
    );
    for (const end of [-1, 1])
      box(
        `delta-belt-leg${side}:${end}`,
        [sx + side * 12, 10, sz - 16 + end * 38],
        [4, 20, 4],
        "dark",
      );
  }
  for (const end of [-1, 1])
    rod(
      `delta-roller${end}`,
      [sx - 14, 24, sz - 16 + end * 47],
      [sx + 14, 24, sz - 16 + end * 47],
      4,
      "dark",
    );
  rod(
    "delta-belt-motor",
    [sx + 18, 22, sz + 30],
    [sx + 29, 22, sz + 30],
    6,
    "blue",
  );
  box("delta-tray-table", [dx, 24, dz], [48, 8, 62], "silver");
  box("delta-tray-base", [dx, 27.5, dz], [42, 1, 54], "green");
  for (const side of [-1, 1]) {
    box(
      `delta-tray-edge-x${side}`,
      [dx + side * 22, 32, dz],
      [2, 8, 58],
      "green",
    );
    box(
      `delta-tray-edge-z${side}`,
      [dx, 32, dz + side * 28],
      [46, 8, 2],
      "green",
    );
    for (const end of [-1, 1])
      box(
        `delta-tray-leg${side}:${end}`,
        [dx + side * 17, 11, dz + end * 22],
        [4, 22, 4],
        "dark",
      );
  }
  const packet = (id, p) => {
    mesh(id, "packet", "orange", p, [18, 12, 14]);
    box(`${id}-wrapper`, [p[0], p[1] + 5.9, p[2]], [7, 0.2, 11], "white");
  };
  packet("delta-packet", f.object);
  packet("delta-waiting-packet", [sx, 34, sz - 32]);
}
