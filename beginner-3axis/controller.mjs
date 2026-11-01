import { CONFIG, fk, finiteVec, distance, success, failure } from "./model.mjs";
import {
  clone,
  initialScene,
  preflightAction,
  preflightProgram,
  sceneAtJoints,
} from "./planner.mjs";
import {
  emptyProgram,
  sceneDifference,
  revalidateProgram,
} from "./program.mjs";
const busyStatus = ["movingManual", "running", "paused"];
export class Controller {
  constructor({
    scene = initialScene(),
    onEvent = () => {},
    onChange = () => {},
  } = {}) {
    this.initialScene = clone(scene);
    this.onEvent = onEvent;
    this.onChange = onChange;
    this.sequence = 0;
    this.state = {
      modelId: CONFIG.modelId,
      schemaVersion: 1,
      language: "en",
      mode: "explore",
      scene: clone(scene),
      target: {
        parsed: fk(scene.actualJoints).C,
        draft: Object.fromEntries(
          Object.entries(fk(scene.actualJoints).C).map(([k, v]) => [
            k,
            String(v),
          ]),
        ),
        error: null,
      },
      execution: {
        status: "idle",
        operationId: 0,
        stepIndex: -1,
        elapsedMs: 0,
      },
      recording: { enabled: false, blockedReason: null },
      program: emptyProgram(),
      events: [],
    };
    this.operation = null;
  }
  get busy() {
    return busyStatus.includes(this.state.execution.status);
  }
  notify() {
    this.onChange(this.state);
  }
  emit(type, extra = {}) {
    const e = {
      id: `event-${++this.sequence}`,
      type,
      verified: true,
      operationId: this.state.execution.operationId,
      source: this.operation?.source || "manual",
      ...clone(extra),
    };
    this.state.events.push(e);
    this.onEvent(e);
    return e;
  }
  reject(result, action) {
    if (action?.type === "move")
      this.emit("MOVE_REJECTED", {
        before: this.state.scene,
        after: this.state.scene,
        error: result.error,
        targetMm: action.targetMm,
      });
    else
      this.emit("ACTION_REJECTED", {
        before: this.state.scene,
        after: this.state.scene,
        action,
        error: result.error,
      });
    this.state.target.error = result.error;
    this.notify();
    return result;
  }
  editTarget(axis, value) {
    if (this.busy) return failure("BUSY");
    delete this.state.target.jointTarget;
    this.state.target.draft[axis] = String(value);
    const draft = this.state.target.draft,
      parsed = {};
    for (const key of ["x", "y", "z"]) {
      if (draft[key].trim() === "" || !Number.isFinite(Number(draft[key]))) {
        this.state.target.parsed = null;
        this.state.target.error = failure("INVALID_INPUT").error;
        this.notify();
        return failure("INVALID_INPUT");
      }
      parsed[key] = Number(draft[key]);
    }
    this.state.target.parsed = parsed;
    this.state.target.error = null;
    this.emit("TARGET_EDITED", { targetMm: parsed });
    this.notify();
    return success(parsed);
  }
  syncTarget() {
    const p = fk(this.state.scene.actualJoints).C;
    this.state.target = {
      parsed: clone(p),
      draft: Object.fromEntries(
        Object.entries(p).map(([k, v]) => [k, String(v)]),
      ),
      error: null,
    };
  }
  setRecording(enabled) {
    if (this.busy) return failure("BUSY");
    if (enabled && this.state.recording.blockedReason === "interrupted")
      return failure("START_STATE_MISMATCH", { difference: "interrupted" });
    if (enabled && this.state.program.steps.length) {
      const difference = sceneDifference(
        this.state.scene,
        this.state.program.expectedEndScene,
      );
      if (difference) {
        this.state.recording.blockedReason = difference;
        this.notify();
        return failure("START_STATE_MISMATCH", { difference });
      }
    }
    this.state.recording = { enabled, blockedReason: null };
    this.emit("RECORDING_CHANGED", { enabled });
    this.notify();
    return success(enabled);
  }
  startAction(action) {
    if (this.busy) return failure("BUSY");
    if (this.state.recording.enabled && this.state.program.steps.length) {
      const difference = sceneDifference(
        this.state.scene,
        this.state.program.expectedEndScene,
      );
      if (difference)
        return this.reject(
          failure("START_STATE_MISMATCH", { difference }),
          action,
        );
    }
    const before = clone(this.state.scene),
      plan = preflightAction(before, action);
    if (!plan.ok) return this.reject(plan, action);
    if (plan.value.noop) return success({ noop: true });
    const token = ++this.state.execution.operationId;
    this.operation = {
      token,
      source: "manual",
      actions: [plan.value],
      commands: [clone(action)],
      index: 0,
      elapsed: 0,
      before,
      record:
        action.type === "jointDemo" ? false : this.state.recording.enabled,
      revision: this.state.program.revision,
      sceneVersion: before.sceneVersion,
    };
    this.state.execution = {
      ...this.state.execution,
      status: "movingManual",
      stepIndex: 0,
      elapsedMs: 0,
    };
    this.state.target.error = null;
    this.notify();
    if (plan.value.kind === "gripper") this.tick(0, token);
    return success({ token });
  }
  move() {
    if (!finiteVec(this.state.target.parsed))
      return this.reject(failure("INVALID_INPUT"), { type: "move" });
    return this.startAction({
      type: "move",
      targetMm: clone(this.state.target.parsed),
    });
  }
  moveJoint(jointIndex, angleRad) {
    if (this.busy) return failure("BUSY");
    if (
      !Number.isInteger(jointIndex) ||
      jointIndex < 0 ||
      jointIndex > 2 ||
      !Number.isFinite(angleRad)
    )
      return failure("INVALID_INPUT");
    const joints = [...this.state.scene.actualJoints];
    joints[jointIndex] = angleRad;
    const targetMm = fk(joints).C;
    for (const axis of ["x", "y", "z"]) this.editTarget(axis, targetMm[axis]);
    this.state.target.jointTarget = { jointIndex, angleRad };
    return this.startAction({
      type: "move",
      motion: "joint",
      jointIndex,
      angleRad,
      targetMm,
    });
  }
  jog(axis, increment) {
    if (this.busy) return failure("BUSY");
    if (
      !["x", "y", "z"].includes(axis) ||
      !Number.isFinite(increment) ||
      Math.abs(increment) > 10
    )
      return failure("INVALID_INPUT");
    // Jog starts from the actual TCP, never an unexecuted target draft.
    this.syncTarget();
    this.editTarget(axis, this.state.target.parsed[axis] + increment);
    return this.move();
  }
  grip(gripperState) {
    return this.startAction({ type: "gripper", gripperState });
  }
  run() {
    if (this.state.execution.status === "paused") return this.resume();
    if (this.busy) return failure("BUSY");
    const p = this.state.program;
    if (!p.steps.length) return this.reject(failure("INVALID_PROGRAM"));
    const difference = sceneDifference(this.state.scene, p.startScene);
    if (difference)
      return this.reject(failure("START_STATE_MISMATCH", { difference }));
    const plan = preflightProgram(clone(this.state.scene), p.steps);
    if (!plan.ok) return this.reject(plan);
    const token = ++this.state.execution.operationId;
    this.operation = {
      token,
      source: "replay",
      actions: plan.value.actions,
      commands: clone(p.steps),
      index: 0,
      elapsed: 0,
      before: clone(this.state.scene),
      runBefore: clone(this.state.scene),
      record: false,
      revision: p.revision,
      sceneVersion: this.state.scene.sceneVersion,
    };
    this.state.execution = {
      ...this.state.execution,
      status: "running",
      stepIndex: 0,
      elapsedMs: 0,
    };
    this.emit("RUN_STARTED", {
      before: this.state.scene,
      after: this.state.scene,
      program: p,
    });
    this.notify();
    return success({ token });
  }
  // Explicit simulator test action. Keep run() strict for the lesson contract;
  // the Explore button is labelled "Reset & test" whenever a restore is needed.
  testProgram() {
    if (this.state.execution.status === "paused") return this.resume();
    if (this.busy) return failure("BUSY");
    const p = this.state.program;
    if (!p.steps.length || !p.startScene)
      return this.reject(failure("INVALID_PROGRAM"));
    const plan = preflightProgram(clone(p.startScene), p.steps);
    if (!plan.ok) return this.reject(plan); // Never reset for an invalid program.
    this.setRecording(false);
    if (sceneDifference(this.state.scene, p.startScene)) this.reset();
    return this.run();
  }
  tick(deltaMs, token = this.state.execution.operationId) {
    const op = this.operation;
    if (
      !op ||
      op.token !== token ||
      token !== this.state.execution.operationId ||
      op.revision !== this.state.program.revision ||
      op.sceneVersion !== this.state.scene.sceneVersion ||
      !["running", "movingManual"].includes(this.state.execution.status)
    )
      return;
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return;
    let budget = deltaMs;
    while (this.operation === op && op.index < op.actions.length) {
      const plan = op.actions[op.index];
      if (plan.kind === "move" && !plan.noop) {
        const left = plan.durationMs - op.elapsed,
          used = Math.min(budget, left);
        op.elapsed += used;
        budget -= used;
        let time = op.elapsed,
          segment = 0;
        while (
          segment < plan.durations.length - 1 &&
          time >= plan.durations[segment]
        ) {
          time -= plan.durations[segment];
          segment++;
        }
        const ratio = plan.durations[segment]
            ? Math.min(1, time / plan.durations[segment])
            : 1,
          q = plan.samples[segment].map(
            (v, j) => v + (plan.samples[segment + 1][j] - v) * ratio,
          );
        this.state.scene = sceneAtJoints(op.before, q);
        this.state.scene.approachEvidence = null;
        this.state.execution.elapsedMs = op.elapsed;
        if (op.elapsed < plan.durationMs - 1e-8) break;
      }
      const before = op.before;
      this.state.scene = clone(plan.endScene);
      this.state.scene.sceneVersion = Math.max(
        before.sceneVersion + 1,
        this.state.scene.sceneVersion,
      );
      let event;
      if (plan.kind === "move" && !plan.noop)
        event = this.emit(
          plan.demo ? "JOINT_DEMO_COMPLETED" : "MOVE_COMPLETED",
          {
            before,
            after: this.state.scene,
            targetMm: plan.target,
            simulatedDurationMs: plan.durationMs,
            pathDistanceMm: plan.samples
              .slice(1)
              .reduce(
                (sum, q, i) => sum + distance(fk(plan.samples[i]).C, fk(q).C),
                0,
              ),
          },
        );
      else
        for (const e of plan.events || []) {
          const emitted = this.emit(e.type, {
            ...e,
            before,
            after: this.state.scene,
          });
          if (e.type === "GRIPPER_CHANGED") event = emitted;
        }
      if (op.record && !plan.noop) {
        const p = this.state.program;
        if (!p.steps.length) p.startScene = clone(before);
        p.steps.push({
          id: `step-${this.sequence}`,
          nameIsDefault: !op.commands[op.index].name,
          name:
            op.commands[op.index].name ||
            `${plan.kind === "move" ? "Move" : "Gripper"} ${p.steps.length + 1}`,
          ...clone(op.commands[op.index]),
          modelId: CONFIG.modelId,
          completionEvidenceId: event?.id,
        });
        p.revision++;
        op.revision = p.revision;
        p.expectedEndScene = clone(this.state.scene);
        p.validationStatus = "valid";
        this.emit("PROGRAM_EDITED", {
          program: p,
          before,
          after: this.state.scene,
        });
      }
      this.emit("STEP_COMPLETED", {
        before,
        after: this.state.scene,
        stepIndex: op.index,
      });
      op.index++;
      op.elapsed = 0;
      op.before = clone(this.state.scene);
      op.sceneVersion = this.state.scene.sceneVersion;
      this.state.execution.stepIndex = op.index;
      if (op.index === op.actions.length) {
        if (op.source === "replay")
          this.emit("RUN_COMPLETED", {
            before: op.runBefore,
            after: this.state.scene,
            program: this.state.program,
          });
        this.state.execution.status =
          op.source === "replay" ? "completed" : "idle";
        this.operation = null;
        break;
      }
      if (budget <= 0 && op.actions[op.index].kind === "move") break;
    }
    this.notify();
  }
  pause() {
    if (this.state.execution.status !== "running") return failure("BUSY");
    this.state.execution.status = "paused";
    this.emit("PAUSED", { before: this.state.scene, after: this.state.scene });
    this.notify();
    return success(true);
  }
  resume() {
    if (
      this.state.execution.status !== "paused" ||
      !this.operation ||
      this.operation.revision !== this.state.program.revision
    )
      return failure("BUSY");
    this.state.execution.status = "running";
    this.emit("RESUMED", { before: this.state.scene, after: this.state.scene });
    this.notify();
    return success(true);
  }
  stop(reason = "user") {
    const wasReplay = this.operation?.source === "replay";
    const wasManual = this.state.execution.status === "movingManual",
      before = clone(this.state.scene);
    ++this.state.execution.operationId;
    this.operation = null;
    this.state.execution.status = "stopped";
    if (wasManual && this.state.recording.enabled)
      this.state.recording = { enabled: false, blockedReason: "interrupted" };
    this.emit("STOPPED", { before, after: this.state.scene, wasReplay, reason });
    this.notify();
    return success(true);
  }
  reset() {
    this.stop("reset");
    const before = clone(this.state.scene),
      version = before.sceneVersion + 1;
    this.state.scene = clone(
      this.state.program.startScene || this.initialScene,
    );
    this.state.scene.sceneVersion = version;
    this.state.execution.status = "idle";
    this.state.execution.stepIndex = -1;
    this.state.recording.blockedReason = null;
    this.syncTarget();
    this.emit("SCENE_RESET", { before, after: this.state.scene });
    this.notify();
    return success(true);
  }
  clearProgram(confirmed = false) {
    if (this.busy) return failure("BUSY");
    if (!confirmed) return success({ cancelled: true });
    const revision = this.state.program.revision + 1;
    this.state.program = { ...emptyProgram(), revision };
    this.state.recording.blockedReason = null;
    this.emit("PROGRAM_CLEARED", {
      before: this.state.scene,
      after: this.state.scene,
      program: this.state.program,
    });
    this.notify();
    return success(true);
  }
  savePosition() {
    if (this.busy) return failure("BUSY");
    const p = clone(this.state.program),
      scene = this.state.scene;
    if (!p.steps.length) p.startScene = clone(scene);
    const step = {
      id: `pose-${this.sequence + 1}`,
      name: `Position ${p.steps.length + 1}`,
      nameIsDefault: true,
      type: "move",
      modelId: CONFIG.modelId,
      completionEvidenceId: `event-${this.sequence + 1}`,
      targetMm: clone(fk(scene.actualJoints).C),
    };
    p.steps.push(step);
    p.revision++;
    this.state.program = revalidateProgram(p);
    this.emit("POSE_SAVED", {
      step,
      program: this.state.program,
      before: scene,
      after: scene,
    });
    this.notify();
    return success(step);
  }
  editProgram(index, operation, value) {
    if (this.busy) return failure("BUSY");
    const p = clone(this.state.program);
    if (!p.steps[index]) return failure("INVALID_PROGRAM");
    if (operation === "rename") {
      p.steps[index].name = String(value).slice(0, 80);
      p.steps[index].nameIsDefault = false;
    } else if (operation === "delete") p.steps.splice(index, 1);
    else if (operation === "up" && index > 0)
      [p.steps[index - 1], p.steps[index]] = [
        p.steps[index],
        p.steps[index - 1],
      ];
    else if (operation === "down" && index < p.steps.length - 1)
      [p.steps[index + 1], p.steps[index]] = [
        p.steps[index],
        p.steps[index + 1],
      ];
    else return failure("INVALID_INPUT");
    p.revision++;
    this.state.program = revalidateProgram(p);
    this.emit("PROGRAM_EDITED", {
      program: this.state.program,
      before: this.state.scene,
      after: this.state.scene,
    });
    this.notify();
    return success(true);
  }
  changeScene(scene) {
    if (this.state.program.steps.length)
      return failure("START_STATE_MISMATCH", {
        difference: "clearProgramFirst",
      });
    this.stop();
    this.initialScene = clone(scene);
    this.state.scene = clone(scene);
    this.state.scene.sceneVersion++;
    this.state.recording.enabled = false;
    this.state.execution.status = "idle";
    this.syncTarget();
    this.notify();
    return success(true);
  }
  dispose() {
    ++this.state.execution.operationId;
    this.operation = null;
    this.onChange = () => {};
    this.onEvent = () => {};
  }
}
