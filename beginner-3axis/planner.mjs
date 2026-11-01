import {
  CONFIG,
  fk,
  solveIk,
  validateJointPose,
  degreesToRadians as rad,
  add,
  sub,
  scale,
  dot,
  cross,
  distance,
  length,
  mix,
  finiteVec,
  success,
  failure,
} from "./model.mjs";
import { collisionReport } from "./geometry.mjs";
export const clone = (x) => structuredClone(x);
export const alignment = (a, b) => Math.atan2(length(cross(a, b)), dot(a, b));
export function fixture(id, yaw) {
  const p = fk([yaw, 45, -90].map(rad));
  return {
    id,
    targetPosition: p.C,
    targetForward: p.e,
    toleranceMm: 2,
    alignmentDeg: 10,
  };
}
export function initialScene({
  obstacle = false,
  destination = "destinationA",
} = {}) {
  const fixtures = [
      fixture("source", -30),
      fixture("destinationA", 30),
      fixture("destinationB", 45),
    ],
    source = fixtures[0];
  return {
    modelId: CONFIG.modelId,
    actualJoints: [...CONFIG.home],
    gripperState: "open",
    objects: [
      {
        id: "part",
        radiusMm: 6,
        worldPosition: { ...source.targetPosition },
        worldForward: { ...source.targetForward },
        supportedByFixtureId: "source",
        heldByGripper: false,
      },
    ],
    fixtures,
    obstacles: obstacle
      ? [
          {
            id: "lesson-obstacle",
            min: { x: 130, y: -12, z: 65 },
            max: { x: 160, y: 12, z: 100 },
          },
        ]
      : [],
    sceneVersion: 0,
    approachEvidence: null,
    destination,
  };
}
export const localVector = (v, p) => ({
  x: dot(v, p.e),
  y: dot(v, p.u),
  z: dot(v, p.n),
});
export const worldVector = (v, p) =>
  add(add(scale(p.e, v.x), scale(p.u, v.y)), scale(p.n, v.z));
export function sceneAtJoints(scene, joints) {
  const result = clone(scene);
  result.actualJoints = [...joints];
  const p = fk(joints);
  for (const o of result.objects)
    if (o.heldByGripper) {
      o.worldPosition = add(p.C, worldVector(o.relativePosition, p));
      o.worldForward = worldVector(o.relativeForward, p);
    }
  return result;
}
function approachEvidence(scene, samples) {
  const end = fk(samples.at(-1)).C;
  for (const f of scene.fixtures) {
    if (distance(end, f.targetPosition) > 2) continue;
    const start = fk(samples[0]).C,
      relative = sub(start, f.targetPosition),
      along = dot(relative, f.targetForward);
    if (along > -20) continue;
    const corridor = samples.every((q) => {
      const d = sub(fk(q).C, f.targetPosition),
        a = dot(d, f.targetForward);
      return length(sub(d, scale(f.targetForward, a))) <= 2 + 1e-6 && a <= 2;
    });
    if (corridor)
      return {
        modelId: scene.modelId,
        fixtureId: f.id,
        objectId:
          scene.objects.find((o) => o.supportedByFixtureId === f.id)?.id ||
          null,
        fixturePosition: clone(f.targetPosition),
        fixtureForward: clone(f.targetForward),
        objectPose: clone(
          scene.objects.find((o) => o.supportedByFixtureId === f.id) || null,
        ),
        obstacles: clone(scene.obstacles),
        from: start,
        to: end,
        startJoints: clone(samples[0]),
        endJoints: clone(samples.at(-1)),
        samples: clone(samples),
        checked: true,
      };
  }
  return null;
}
export function validateInterval(scene, a, b) {
  const delta = a.map((v, i) => Math.abs(v - b[i])),
    sweep = 260 * delta.reduce((x, y) => x + y, 0),
    start = sceneAtJoints(scene, a),
    end = sceneAtJoints(scene, b);
  const valid = collisionReport(a, start.objects, start, sweep + 0.5);
  if (!valid.ok) return valid;
  return collisionReport(b, end.objects, end, 0.5);
}
export function planMove(scene, target, c = CONFIG) {
  const destination = solveIk(target, scene.actualJoints, c);
  if (!destination.ok) return destination;
  const start = fk(scene.actualJoints, c).C;
  if (distance(start, target) < 1e-9)
    return success({
      kind: "move",
      noop: true,
      samples: [clone(scene.actualJoints)],
      durations: [],
      durationMs: 0,
      endScene: clone(scene),
    });
  const initial = collisionReport(
    scene.actualJoints,
    scene.objects,
    scene,
    0.5,
  );
  if (!initial.ok) return initial;
  let samples = [clone(scene.actualJoints)],
    count = 0;
  function interval(a, b, pa, pb, depth = 0) {
    if (++count > 10000) return failure("PATH_COMPLEXITY");
    const maxDelta = Math.max(...a.map((x, i) => Math.abs(x - b[i]))),
      check = validateInterval(scene, a, b);
    if (distance(pa, pb) <= 1 && maxDelta <= rad(0.25) && check.ok) {
      samples.push(b);
      return success(null);
    }
    if (depth >= 18 || distance(pa, pb) < 0.0005) {
      return check.ok ? failure("PATH_COMPLEXITY") : check;
    }
    const mid = mix(pa, pb, 0.5),
      result = solveIk(mid, a, c);
    if (!result.ok) return result;
    const left = interval(a, result.value, pa, mid, depth + 1);
    if (!left.ok) return left;
    return interval(result.value, b, mid, pb, depth + 1);
  }
  const planned = interval(
    scene.actualJoints,
    destination.value,
    start,
    target,
  );
  if (!planned.ok) return planned;
  const durations = samples
    .slice(1)
    .map(
      (q, i) =>
        1000 *
        Math.max(
          distance(fk(samples[i]).C, fk(q).C) / 30,
          ...q.map((x, j) => Math.abs(x - samples[i][j]) / rad(30)),
        ),
    );
  const endScene = sceneAtJoints(scene, destination.value);
  endScene.sceneVersion++;
  endScene.approachEvidence = approachEvidence(scene, samples);
  return success({
    kind: "move",
    samples,
    durations,
    durationMs: durations.reduce((a, b) => a + b, 0),
    endScene,
    target: clone(target),
    checked: "simplifiedGeometry",
  });
}
export function preflightAction(scene, action, c = CONFIG) {
  if (action.type === "move") {
    if (action.motion === "joint") {
      const result = planJointDemo(
        scene,
        action.jointIndex,
        action.angleRad,
        c,
      );
      if (!result.ok) return result;
      if (
        !finiteVec(action.targetMm) ||
        distance(result.value.target, action.targetMm) > 0.01
      )
        return failure("INVALID_PROGRAM");
      result.value.demo = false;
      return result;
    }
    if (action.motion != null && action.motion !== "linear")
      return failure("INVALID_PROGRAM");
    return planMove(scene, action.targetMm, c);
  }
  if (action.type === "jointDemo")
    return planJointDemo(scene, action.jointIndex, action.angleRad, c);
  if (
    action.type !== "gripper" ||
    !["open", "closed"].includes(action.gripperState)
  )
    return failure("INVALID_PROGRAM");
  if (action.gripperState === scene.gripperState)
    return success({
      kind: "gripper",
      noop: true,
      endScene: clone(scene),
      events: [],
    });
  const end = clone(scene),
    p = fk(scene.actualJoints),
    held = end.objects.find((o) => o.heldByGripper);
  let events = [];
  if (action.gripperState === "closed") {
    const object = end.objects.find(
      (o) =>
        !o.heldByGripper &&
        distance(o.worldPosition, p.C) <= 2 &&
        alignment(o.worldForward, p.e) <= rad(10) &&
        o.radiusMm * 2 <= 18,
    );
    if (object) {
      // Grasp depends on the current contact geometry, not the path history.
      // Motion and the closing jaw sweep are independently collision checked.
      object.relativePosition = localVector(sub(object.worldPosition, p.C), p);
      object.relativeForward = localVector(object.worldForward, p);
      object.heldByGripper = true;
      object.supportedByFixtureId = null;
      end.approachEvidence = null;
      events.push({ type: "OBJECT_ATTACHED", objectId: object.id });
    }
  } else if (held) {
    const support = end.fixtures.find(
      (f) =>
        distance(held.worldPosition, f.targetPosition) <= 2 &&
        alignment(held.worldForward, f.targetForward) <= rad(10),
    );
    if (!support) return failure("UNSUPPORTED_RELEASE");
    held.heldByGripper = false;
    held.supportedByFixtureId = support.id;
    delete held.relativePosition;
    delete held.relativeForward;
    events.push({
      type: "OBJECT_RELEASED",
      objectId: held.id,
      fixtureId: support.id,
    });
  }
  end.gripperState = action.gripperState;
  const contactScene = clone(end);
  if (held) {
    const contactPart = contactScene.objects.find((o) => o.id === held.id);
    contactPart.heldByGripper = true;
  }
  const startGap = scene.gripperState === "open" ? 11 : 8,
    endGap = end.gripperState === "open" ? 11 : 8;
  for (let i = 0; i < 30; i++) {
    contactScene.jawOffset = startGap + ((endGap - startGap) * i) / 30;
    const sweepCheck = collisionReport(
      contactScene.actualJoints,
      contactScene.objects,
      contactScene,
      0.6,
    );
    if (!sweepCheck.ok) return sweepCheck;
  }
  const collisions = collisionReport(end.actualJoints, end.objects, end, 0.5);
  if (!collisions.ok) return collisions;
  end.sceneVersion++;
  events.unshift({ type: "GRIPPER_CHANGED", gripperState: end.gripperState });
  return success({ kind: "gripper", endScene: end, events, durationMs: 0 });
}
export function preflightProgram(scene, steps, c = CONFIG) {
  if (!Array.isArray(steps) || !steps.length) return failure("INVALID_PROGRAM");
  let current = clone(scene),
    actions = [];
  for (let i = 0; i < steps.length; i++) {
    const result = preflightAction(current, steps[i], c);
    if (!result.ok)
      return {
        ...result,
        error: {
          ...result.error,
          details: { ...result.error.details, stepIndex: i },
        },
      };
    actions.push(result.value);
    current = result.value.endScene;
  }
  return success({ actions, endScene: current });
}
export function teachingRoute(scene) {
  const source = scene.fixtures.find((f) => f.id === "source"),
    dest = scene.fixtures.find((f) => f.id === scene.destination),
    pre = (f) => add(f.targetPosition, scale(f.targetForward, -30)),
    up = (f) => add(f.targetPosition, { x: 0, y: 0, z: 50 }),
    move = (name, targetMm) => ({
      type: "move",
      name,
      targetMm,
      modelId: CONFIG.modelId,
    }),
    grip = (gripperState) => ({
      type: "gripper",
      name: gripperState === "closed" ? "Close gripper" : "Open gripper",
      gripperState,
      modelId: CONFIG.modelId,
    });
  return [
    move("Source approach", pre(source)),
    move("Pickup", source.targetPosition),
    grip("closed"),
    move("Lift to clearance", up(source)),
    move("Transfer above destination", up(dest)),
    move("Destination approach", pre(dest)),
    move("Place", dest.targetPosition),
    grip("open"),
    move("Retreat", pre(dest)),
  ];
}

export function validateApproach(scene, object) {
  const a = scene.approachEvidence,
    f = scene.fixtures.find((f) => f.id === object.supportedByFixtureId);
  const validQ = (q) =>
    Array.isArray(q) && q.length === 3 && q.every(Number.isFinite);
  if (
    !a ||
    !validQ(a.startJoints) ||
    !validQ(a.endJoints) ||
    !Array.isArray(a.samples) ||
    a.samples.length < 2 ||
    a.samples.length > 10000 ||
    !a.samples.every(validQ) ||
    !finiteVec(a.to) ||
    !finiteVec(a.fixturePosition) ||
    !finiteVec(a.fixtureForward) ||
    !finiteVec(a.objectPose?.worldPosition) ||
    !finiteVec(a.objectPose?.worldForward) ||
    a.endJoints.some((q, i) => Math.abs(q - scene.actualJoints[i]) > 1e-8) ||
    a.startJoints.some((q, i) => Math.abs(q - a.samples[0][i]) > 1e-8) ||
    a.endJoints.some((q, i) => Math.abs(q - a.samples.at(-1)[i]) > 1e-8)
  )
    return failure("GRASP_APPROACH_REQUIRED");
  if (
    !a?.checked ||
    a.modelId !== scene.modelId ||
    a.fixtureId !== f?.id ||
    a.objectId !== object.id ||
    distance(a.to, fk(scene.actualJoints).C) > 0.1 ||
    distance(a.fixturePosition, f.targetPosition) > 1e-8 ||
    distance(a.fixtureForward, f.targetForward) > 1e-8 ||
    distance(a.objectPose.worldPosition, object.worldPosition) > 1e-8 ||
    distance(a.objectPose.worldForward, object.worldForward) > 1e-8 ||
    JSON.stringify(a.obstacles) !== JSON.stringify(scene.obstacles)
  )
    return failure("GRASP_APPROACH_REQUIRED");
  const recomputed = approachEvidence(scene, a.samples);
  if (!recomputed || recomputed.fixtureId !== f.id)
    return failure("GRASP_APPROACH_REQUIRED");
  for (let i = 1; i < a.samples.length; i++)
    if (!validateInterval(scene, a.samples[i - 1], a.samples[i]).ok)
      return failure("GRASP_APPROACH_REQUIRED");
  return success(true);
}

export function planJointDemo(scene, jointIndex, angleRad, c = CONFIG) {
  if (
    !Number.isInteger(jointIndex) ||
    jointIndex < 0 ||
    jointIndex > 2 ||
    !Number.isFinite(angleRad)
  )
    return failure("INVALID_INPUT");
  const q = [...scene.actualJoints];
  q[jointIndex] = angleRad;
  const valid = validateJointPose(q, c);
  if (!valid.ok) return valid;
  if (Math.abs(angleRad - scene.actualJoints[jointIndex]) < 1e-9)
    return success({
      kind: "move",
      noop: true,
      demo: true,
      samples: [clone(q)],
      durations: [],
      durationMs: 0,
      endScene: clone(scene),
      target: fk(q).C,
    });
  const samples = [[...scene.actualJoints]];
  let count = 0;
  function split(a, b, depth = 0) {
    if (++count > 10000) return failure("PATH_COMPLEXITY");
    const v = validateJointPose(b, c);
    if (!v.ok) return v;
    const check = validateInterval(scene, a, b),
      delta = Math.max(...a.map((x, i) => Math.abs(x - b[i])));
    if (delta <= rad(0.25) && check.ok) {
      samples.push(b);
      return success(true);
    }
    if (depth >= 18 || delta < 1e-7)
      return check.ok ? failure("PATH_COMPLEXITY") : check;
    const mid = a.map((x, i) => (x + b[i]) / 2),
      left = split(a, mid, depth + 1);
    return left.ok ? split(mid, b, depth + 1) : left;
  }
  const r = split(scene.actualJoints, q);
  if (!r.ok) return r;
  const durations = samples
    .slice(1)
    .map(
      (b, i) =>
        1000 *
        Math.max(
          distance(fk(samples[i]).C, fk(b).C) / 30,
          ...b.map((x, j) => Math.abs(x - samples[i][j]) / rad(30)),
        ),
    );
  const endScene = sceneAtJoints(scene, q);
  endScene.approachEvidence = null;
  endScene.sceneVersion++;
  return success({
    kind: "move",
    demo: true,
    samples,
    durations,
    durationMs: durations.reduce((a, b) => a + b, 0),
    endScene,
    target: fk(q).C,
  });
}
