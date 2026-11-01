import {
  add,
  sub,
  scale,
  dot,
  length,
  distance,
  fk,
  success,
  failure,
  CONFIG,
} from "./model.mjs";
export const capsule = (id, a, b, radius) => ({ id, a, b, radius });
export const sphere = (id, center, radius) =>
  capsule(id, center, center, radius);
export function segmentDistance(p1, q1, p2, q2) {
  const d1 = sub(q1, p1),
    d2 = sub(q2, p2),
    r = sub(p1, p2),
    a = dot(d1, d1),
    e = dot(d2, d2),
    f = dot(d2, r);
  let s = 0,
    t = 0;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  if (a <= 1e-15 && e <= 1e-15) return distance(p1, p2);
  if (a <= 1e-15) t = clamp(f / e);
  else {
    const c = dot(d1, r);
    if (e <= 1e-15) s = clamp(-c / a);
    else {
      const b = dot(d1, d2),
        den = a * e - b * b;
      s = den ? clamp((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a);
      }
    }
  }
  return distance(add(p1, scale(d1, s)), add(p2, scale(d2, t)));
}
/** Conservative expanded-box slab test. Rounded box corners may over-reject. */
export function capsuleAabb(p, box, extra = 0) {
  let low = 0,
    high = 1;
  const r = p.radius + extra;
  for (const k of ["x", "y", "z"]) {
    const d = p.b[k] - p.a[k],
      min = box.min[k] - r,
      max = box.max[k] + r;
    if (Math.abs(d) < 1e-14) {
      if (p.a[k] < min || p.a[k] > max) return false;
    } else {
      let a = (min - p.a[k]) / d,
        b = (max - p.a[k]) / d;
      if (a > b) [a, b] = [b, a];
      low = Math.max(low, a);
      high = Math.min(high, b);
      if (low > high) return false;
    }
  }
  return true;
}
export const sphereAabb = capsuleAabb;
export function proxies(joints, gripper = "open", c = CONFIG) {
  const p = fk(joints, c),
    offset =
      typeof gripper === "number" ? gripper : gripper === "open" ? 11 : 8,
    points = [
      capsule("upper", p.S, p.E, 5),
      capsule("forearm", p.E, p.F, 4),
      capsule("palm", p.F, add(p.C, scale(p.e, -14)), 5),
      // The fixed slide housing joins the wrist mount to BOTH moving fingers.
      // Include it in swept collision checks, not only in the illustration.
      capsule(
        "jawBridge",
        add(add(p.C, scale(p.e, -14)), scale(p.u, -11)),
        add(add(p.C, scale(p.e, -14)), scale(p.u, 11)),
        3,
      ),
    ];
  for (const sign of [-1, 1])
    points.push(
      capsule(
        `finger${sign}`,
        add(add(p.C, scale(p.e, -12)), scale(p.u, sign * offset)),
        add(add(p.C, scale(p.e, 4)), scale(p.u, sign * offset)),
        2,
      ),
    );
  return points;
}
export const BASE = {
  id: "base",
  min: { x: -18, y: -18, z: 0 },
  max: { x: 18, y: 18, z: 65 },
};
const trim = (p, atStart, amount) => {
  const d = sub(p.b, p.a),
    l = length(d);
  return atStart
    ? { ...p, a: add(p.a, scale(d, Math.min(amount / l, 1))) }
    : { ...p, b: add(p.b, scale(d, -Math.min(amount / l, 1))) };
};
export function collisionReport(pose, objectState, scene, marginMm = 0.5) {
  const p = proxies(pose, scene.jawOffset ?? scene.gripperState),
    objects = objectState || scene.objects || [],
    held = objects
      .filter((o) => o.heldByGripper)
      .map((o) => sphere(o.id, o.worldPosition, o.radiusMm)),
    moving = [...p, ...held];
  for (const a of moving) {
    if (Math.min(a.a.z, a.b.z) - a.radius - marginMm < 0)
      return failure("FLOOR_COLLISION", { proxy: a.id });
    for (const box of [BASE, ...(scene.obstacles || [])])
      if (capsuleAabb(a, box, marginMm))
        return failure("PATH_BLOCKED", { proxy: a.id, obstacle: box.id });
  }
  const upper = trim(p[0], false, 12),
    fore = trim(p[1], true, 12);
  for (const [a, b] of [
    [upper, fore],
    ...p.slice(2).map((b) => [p[0], b]),
    ...held.map((b) => [p[0], b]),
  ])
    if (
      segmentDistance(a.a, a.b, b.a, b.b) <=
      a.radius + b.radius + 2 * marginMm
    )
      return failure("SELF_COLLISION", { proxies: [a.id, b.id] });
  for (const object of objects) {
    const o = sphere(object.id, object.worldPosition, object.radiusMm);
    for (const a of p) {
      if (a.id.startsWith("finger") && object.heldByGripper) continue; // Open jaw corridor and identified held-part contacts; closed unrelated contacts remain checked.
      if (segmentDistance(a.a, a.b, o.a, o.b) <= a.radius + o.radius + marginMm)
        return failure("PATH_BLOCKED", { proxy: a.id, object: object.id });
    }
  }
  return success({ checked: true });
}
