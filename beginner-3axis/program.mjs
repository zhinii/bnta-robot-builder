import { CONFIG, distance, degreesToRadians as rad } from "./model.mjs";
import { clone, alignment, preflightProgram } from "./planner.mjs";
export const emptyProgram = () => ({
  kind: "bnta-3axis-program",
  version: 1,
  modelId: CONFIG.modelId,
  startScene: null,
  steps: [],
  revision: 0,
  expectedEndScene: null,
  validationStatus: "empty",
});
export function sceneDifference(a, b) {
  if (!a || !b) return "scene";
  if (a.modelId !== b.modelId) return "modelId";
  if (a.gripperState !== b.gripperState) return "gripperState";
  if (
    a.actualJoints.some((q, i) => Math.abs(q - b.actualJoints[i]) > rad(0.01))
  )
    return "joints";
  if (a.objects.length !== b.objects.length) return "objects";
  for (const o of a.objects) {
    const p = b.objects.find((p) => p.id === o.id);
    if (
      !p ||
      o.heldByGripper !== p.heldByGripper ||
      o.supportedByFixtureId !== p.supportedByFixtureId ||
      o.radiusMm !== p.radiusMm
    )
      return "object state";
    if (
      distance(o.worldPosition, p.worldPosition) > 0.1 ||
      alignment(o.worldForward, p.worldForward) > rad(0.01)
    )
      return "object pose";
    for (const key of ["relativePosition", "relativeForward"])
      if (
        Boolean(o[key]) !== Boolean(p[key]) ||
        (o[key] && distance(o[key], p[key]) > 1e-6)
      )
        return "attachment";
  }
  const sorted = (value) =>
    Array.isArray(value)
      ? value.map(sorted)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .filter((k) => k !== "sceneVersion")
              .map((k) => [k, sorted(value[k])]),
          )
        : value;
  for (const key of ["fixtures", "obstacles", "approachEvidence"])
    if (JSON.stringify(sorted(a[key])) !== JSON.stringify(sorted(b[key])))
      return key;
  return null;
}
export function revalidateProgram(program) {
  const p = clone(program);
  if (!p.steps.length) {
    p.validationStatus = "empty";
    p.expectedEndScene = null;
    p.startScene = null;
    return p;
  }
  const r = preflightProgram(p.startScene, p.steps);
  p.validationStatus = r.ok ? "valid" : "invalid";
  p.validationError = r.ok ? null : r.error;
  p.expectedEndScene = r.ok ? r.value.endScene : null;
  return p;
}
