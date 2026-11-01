import * as THREE from "./vendor/three/build/three.module.js";
// Illustrative mechanism geometry, independent of the learner's robot and evidence.
const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
const smooth = (t) => t * t * (3 - 2 * t);
export const DELTA_GEOMETRY = Object.freeze({
  baseRadius: 60,
  mountHeight: 280,
  upperLength: 65,
  lowerLength: 190,
  platformRadius: 20,
  platformOffset: 26,
  rodHalfSpacing: 8,
});
export const distance3 = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
function elbow2(a, b, l1, l2, side = 1) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = Math.hypot(dx, dy);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  return [
    a[0] + (along * dx) / d - (side * h * dy) / d,
    a[1] + (along * dy) / d + (side * h * dx) / d,
  ];
}
export function robotTypePose(type, progress) {
  const t = Math.max(0, Math.min(1, progress)),
    phase = Math.min(3, Math.floor(t * 4));
  const u = t === 1 ? 1 : smooth((t * 4) % 1);

  if (type === "sixaxis") {
    // Forward kinematics: six real revolute transforms, wrist axes independent.
    const q = [0.25, -0.5, 0.8, 0, -0.4, 0];
    const active = Math.min(5, Math.floor(t * 6));
    q[active] += 0.5 * Math.sin((t * 6 - active) * Math.PI * 2);
    const axes = [
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, 1],
      [1, 0, 0],
      [0, 0, 1],
      [1, 0, 0],
    ];
    const offsets = [
      [0, 55, 0],
      [0, 80, 0],
      [65, 0, 0],
      [28, 0, 0],
      [18, 0, 0],
      [22, 0, 0],
    ];
    const matrix = new THREE.Matrix4(),
      points = [[0, 0, 0]],
      worldAxes = [];
    for (let i = 0; i < 6; i++) {
      const axis = new THREE.Vector3(...axes[i]).transformDirection(matrix);
      worldAxes.push(axis.toArray());
      matrix.multiply(
        new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(...axes[i]),
          q[i],
        ),
      );
      matrix.multiply(new THREE.Matrix4().makeTranslation(...offsets[i]));
      points.push(new THREE.Vector3().setFromMatrixPosition(matrix).toArray());
    }
    const tip = points.at(-1),
      dir = new THREE.Vector3(1, 0, 0).transformDirection(matrix).toArray();
    return {
      type,
      t,
      phase,
      base: points[1],
      joint: points[2],
      tip,
      points,
      axes: worldAxes,
      dir,
      side: new THREE.Vector3(0, 0, 1).transformDirection(matrix).toArray(),
      active,
      source: [100, 10, 55],
      destination: [95, 10, -65],
    };
  }
  if (type === "mobile") {
    const tip =
      phase === 0
        ? mix([-85, 0, 65], [70, 0, 65], u)
        : phase === 1
          ? [70, 0, 65]
          : phase === 2
            ? mix([70, 0, 65], [70, 0, -65], u)
            : [70, 0, -65];
    const heading =
      phase === 0
        ? 0
        : phase === 1
          ? (u * Math.PI) / 2
          : phase === 2
            ? Math.PI / 2
            : ((1 - u) * Math.PI) / 2;
    return {
      type,
      t,
      phase,
      tip,
      heading,
      source: [-85, 0, 65],
      destination: [70, 0, -65],
    };
  }
  if (type === "cartesian") {
    const corners = [
      [-65, 10, 45],
      [65, 10, 45],
      [65, 10, -45],
      [-65, 10, -45],
      [-65, 10, 45],
    ];
    return {
      type,
      t,
      phase,
      tip: mix(corners[phase], corners[phase + 1], u),
      corners,
    };
  }
  const source =
    type === "delta"
      ? [-36, 34, 22]
      : type === "scara"
        ? [75, 18, 55]
        : [110, 18, 55];
  const destination =
    type === "delta"
      ? [36, 34, -22]
      : type === "scara"
        ? [105, 18, -55]
        : [95, 18, -65];
  let tip;
  if (phase === 0) {
    tip = [...source];
    tip[1] += 20 * (1 - Math.min(1, u / 0.65));
  } else if (phase === 1) {
    tip = mix(source, destination, u);
    tip[1] += 40 * Math.sin(Math.PI * u);
  } else if (phase === 2) tip = [...destination];
  else {
    tip = mix(destination, source, u);
    tip[1] += 40 * Math.sin(Math.PI * u) + 20 * u;
  }
  const gap =
    phase === 0
      ? 17 - 7 * Math.max(0, (u - 0.65) / 0.35)
      : phase === 1
        ? 10
        : phase === 2
          ? 10 + 7 * u
          : 17;
  // SCARA travels above the fixture, then inserts vertically. No diagonal
  // descent through the receiving socket or sideways withdrawal of the jaws.
  if (type === "scara") {
    const aboveSource = [source[0], 62, source[2]],
      aboveDestination = [destination[0], 62, destination[2]];
    if (phase === 0) tip = mix(aboveSource, source, Math.min(1, u / 0.65));
    else if (phase === 1)
      tip =
        u < 0.28
          ? mix(source, aboveSource, smooth(u / 0.28))
          : mix(aboveSource, aboveDestination, smooth((u - 0.28) / 0.72));
    else if (phase === 2)
      tip = mix(aboveDestination, destination, Math.min(1, u / 0.6));
    else
      tip =
        u < 0.35
          ? mix(destination, aboveDestination, smooth(u / 0.35))
          : mix(aboveDestination, aboveSource, smooth((u - 0.35) / 0.65));
  }
  const pose = {
    type,
    t,
    phase,
    tip,
    source,
    destination,
    gap,
    held: phase === 1,
    object: phase < 1 ? source : phase === 1 ? tip : destination,
  };
  if (type === "scara") {
    pose.gap =
      phase === 0
        ? 17 - 8 * Math.max(0, (u - 0.65) / 0.35)
        : phase === 1
          ? 9
          : phase === 2
            ? 9 + 8 * Math.max(0, (u - 0.6) / 0.4)
            : 17;
    pose.held = phase === 1 || (phase === 2 && u < 0.6);
    pose.object = pose.held ? tip : phase === 0 ? source : destination;
  }
  if (type === "delta") {
    const from = [source[0], 70, source[2]],
      to = [destination[0], 70, destination[2]];
    const ease = (v) => {
      const n = Math.max(0, Math.min(1, v));
      return n * n * n * (10 + n * (-15 + 6 * n));
    };
    const local = t === 1 ? 1 : (t * 4) % 1;
    if (phase === 0) pose.tip = mix(from, source, ease(local / 0.72));
    else if (phase === 1)
      pose.tip =
        local < 0.35
          ? mix(source, from, ease(local / 0.35))
          : mix(from, to, ease((local - 0.35) / 0.65));
    else if (phase === 2) pose.tip = mix(to, destination, ease(local / 0.68));
    else
      pose.tip =
        local < 0.35
          ? mix(destination, to, ease(local / 0.35))
          : mix(to, from, ease((local - 0.35) / 0.65));
    tip = pose.tip;
    pose.held =
      (phase === 0 && local >= 0.82) ||
      phase === 1 ||
      (phase === 2 && local < 0.82);
    pose.object = pose.held
      ? [...tip]
      : phase === 0
        ? [...source]
        : [...destination];
    pose.vacuumOn = pose.held;
    pose.motionStage =
      phase === 0
        ? local < 0.72
          ? "approach"
          : "pickup"
        : phase === 1
          ? local < 0.35
            ? "lift"
            : "transfer"
          : phase === 2
            ? local < 0.68
              ? "lower"
              : local < 0.82
                ? "place"
                : "release"
            : local < 0.35
              ? "withdraw"
              : "return";
  }
  if (type === "articulated") {
    const yaw = Math.atan2(tip[2], tip[0]),
      r = Math.hypot(tip[0], tip[2]);
    const joint = elbow2([0, 60], [r, tip[1]], 80, 70);
    pose.base = [0, 60, 0];
    pose.joint = [joint[0] * Math.cos(yaw), joint[1], joint[0] * Math.sin(yaw)];
    pose.yaw = yaw;
  } else if (type === "scara") {
    const j = elbow2([-40, 0], [tip[0], tip[2]], 95, 80);
    pose.base = [-40, 100, 0];
    pose.joint = [j[0], 100, j[1]];
  } else {
    // Three driven upper links rotate in radial/vertical planes. Paired lower
    // rods connect them to one level platform; this is a kinematic illustration.
    pose.chains = [0, 1, 2].map((i) => {
      const angle = (i * Math.PI * 2) / 3,
        c = Math.cos(angle),
        s = Math.sin(angle);
      const g = DELTA_GEOMETRY;
      const a = [g.baseRadius * c, g.mountHeight, g.baseRadius * s],
        e = [
          tip[0] + g.platformRadius * c,
          tip[1] + g.platformOffset,
          tip[2] + g.platformRadius * s,
        ];
      const tangent = -e[0] * s + e[2] * c;
      const joint = elbow2(
        [g.baseRadius, g.mountHeight],
        [e[0] * c + e[2] * s, e[1]],
        g.upperLength,
        Math.sqrt(g.lowerLength ** 2 - tangent ** 2),
      );
      const b = [joint[0] * c, joint[1], joint[0] * s];
      const direction = [-s, 0, c];
      return {
        a,
        b,
        e,
        tangent: direction,
        upperAngle: Math.atan2(
          g.mountHeight - b[1],
          Math.hypot(b[0], b[2]) - g.baseRadius,
        ),
        rods: [-1, 1].map((sign) => ({
          from: b.map((v, j) => v + sign * g.rodHalfSpacing * direction[j]),
          to: e.map((v, j) => v + sign * g.rodHalfSpacing * direction[j]),
        })),
      };
    });
  }
  return pose;
}
