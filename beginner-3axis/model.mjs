/** Pure, millimetre/radian educational 3R kinematics. No hidden wrist. */
export const CONFIG = Object.freeze({
  modelId: "bnta-educational-3r-v1",
  H: 80,
  A: 120,
  B: 100,
  T: 20,
  D: 120,
  limits: [
    [-150, 150],
    [-30, 120],
    [-150, -10],
  ].map((a) => a.map((x) => (x * Math.PI) / 180)),
  home: [0, 60, -90].map((x) => (x * Math.PI) / 180),
  minimumRadius: 40,
  epsilon: 1e-10,
});
export const degreesToRadians = (d) => (d * Math.PI) / 180;
export const radiansToDegrees = (r) => (r * 180) / Math.PI;
export const vec = (x, y, z) => ({ x, y, z });
export const add = (a, b) => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a, b) => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a, s) => vec(a.x * s, a.y * s, a.z * s);
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a, b) =>
  vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length = (a) => Math.hypot(a.x, a.y, a.z);
export const distance = (a, b) => length(sub(a, b));
export const mix = (a, b, t) => add(a, scale(sub(b, a), t));
export const finiteVec = (v) =>
  v &&
  ["x", "y", "z"].every(
    (k) => typeof v[k] === "number" && Number.isFinite(v[k]),
  );
export const success = (value) => ({ ok: true, value });
export const failure = (code, details = {}) => ({
  ok: false,
  error: { code, messageKey: `error.${code}`, details },
});
export function fk(joints, c = CONFIG) {
  if (
    !Array.isArray(joints) ||
    joints.length !== 3 ||
    !joints.every(Number.isFinite)
  )
    throw new TypeError("FK requires three finite radians");
  const [q1, q2, q3] = joints,
    phi = q2 + q3,
    cy = Math.cos(q1),
    sy = Math.sin(q1),
    e = vec(Math.cos(phi) * cy, Math.cos(phi) * sy, Math.sin(phi)),
    u = vec(-sy, cy, 0),
    n = cross(e, u),
    O = vec(0, 0, 0),
    S = vec(0, 0, c.H),
    E = vec(
      c.A * Math.cos(q2) * cy,
      c.A * Math.cos(q2) * sy,
      c.H + c.A * Math.sin(q2),
    ),
    F = add(E, scale(e, c.B)),
    C = add(E, scale(e, c.D));
  return {
    O,
    S,
    E,
    F,
    C,
    e,
    u,
    n,
    rho: c.A * Math.cos(q2) + c.D * Math.cos(phi),
    joints: [...joints],
    tool: { position: C, forward: e, closingAxis: u, normal: n },
  };
}
export function validateJointPose(joints, c = CONFIG) {
  if (
    !Array.isArray(joints) ||
    joints.length !== 3 ||
    !joints.every((v) => typeof v === "number" && Number.isFinite(v))
  )
    return failure("INVALID_INPUT");
  if (
    joints.some(
      (q, i) => q < c.limits[i][0] - 1e-12 || q > c.limits[i][1] + 1e-12,
    )
  )
    return failure("JOINT_LIMIT");
  if (Math.abs(Math.sin(joints[2])) < 1e-3) return failure("SINGULAR");
  if (fk(joints, c).rho < c.minimumRadius - 1e-9)
    return failure("WORKSPACE_LIMIT");
  return success([...joints]);
}
export function solveIk(target, previousJoints = null, c = CONFIG) {
  if (
    !finiteVec(target) ||
    (previousJoints !== null &&
      (!Array.isArray(previousJoints) ||
        previousJoints.length !== 3 ||
        !previousJoints.every(Number.isFinite)))
  )
    return failure("INVALID_INPUT");
  const r = Math.hypot(target.x, target.y),
    v = target.z - c.H;
  if (r < 1e-6) return failure("SINGULAR");
  if (r < c.minimumRadius) return failure("WORKSPACE_LIMIT");
  const cosine = (r * r + v * v - c.A * c.A - c.D * c.D) / (2 * c.A * c.D);
  if (cosine < -1 - c.epsilon || cosine > 1 + c.epsilon)
    return failure("UNREACHABLE");
  const q3 = -Math.acos(Math.max(-1, Math.min(1, cosine)));
  if (Math.abs(Math.sin(q3)) < 1e-3) return failure("SINGULAR");
  const q2 =
      Math.atan2(v, r) -
      Math.atan2(c.D * Math.sin(q3), c.A + c.D * Math.cos(q3)),
    q1 = Math.atan2(target.y, target.x),
    q = [q1, q2, q3],
    valid = validateJointPose(q, c);
  if (!valid.ok) return valid;
  if (previousJoints && Math.abs(q1 - previousJoints[0]) > Math.PI)
    return failure("JOINT_LIMIT", { reason: "forbiddenYawSeam" });
  if (distance(fk(q, c).C, target) > 1e-6) return failure("NUMERICAL_FAILURE");
  return success(q);
}
