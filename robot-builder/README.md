# Grade 7 builder implementation

See the [project guide](../README.md) for student tasks, prices and usage.

## Modules

- `scenarios.mjs`: task briefs, room dimensions, fixture envelopes, six greenhouse targets, cafeteria pickup/drop targets, hospital pickup/drop targets, fixed pads and rover stops.
- `model.mjs`: serial-chain forward kinematics, catalog prices, two-motion kit validation, fixed-placement checks and project migration.
- `challenges.mjs`: deterministic numerical target search, small-step arm and payload clearance checks, turn-then-drive rover routes, task sequencing and completion.
- `environment.mjs`: procedural room architecture, furniture, plants, person, trays/book and task effects.
- `scene.mjs`: Three.js rendering, tool models, camera views and labels.
- `app.mjs`: bilingual Build/Try/Explain interface, cancellable animation, separate task notebooks and downloads.

## Constraints and evidence

New version-3 projects use two or more joints, local Z rotation (Turn) or local Y rotation (Bend), and 100/200/400 mm links. The first link mounts along +Z; subsequent links mount along +X. Turns allow ±180° and bends ±100°. Six slots and the $1,200 budget are separate constraints. The model validates these restrictions rather than relying on hidden interface controls.

Fixed placement is one of three explicit pads at yaw 0. A conservative rotated 300 mm square footprint check remains available in the model. Rover routes use a 260 mm conservative footprint and check every 20 mm or 2° against fixtures and room bounds. Arm paths are sampled at no more than 2° per joint. Carried-item bounds include tool rotation; holding a tray or book constrains its tilt. Collision checks use simplified boxes and link segments, and omit arm self-collision and dynamics.

The solver tries deterministic seeds and a damped numerical update. It does not alter links, axes, parts count or the selected fixed pad. Task actions require a clear pose, a target distance below 18 mm, the scene's direction tolerance and the correct pickup/place order. A plan is checked before animation. Stopping cancels its completion, preserving the current valid pose and existing held-item state.

Verified examples establish feasibility, not optimality: greenhouse rover with 400/400/200 mm links ($1,200); cafeteria fixed arm with 400/400 mm ($700); hospital fixed arm with 200/400/400/200 mm ($1,100), or rover with 400/400/100 mm ($1,150). These are test fixtures, not automatically supplied as student solutions.

The notebook connects to the guided lesson through predicting reach, identifying what follows a joint, choosing a base, observing a blocked motion and revising one idea. There is no timer, automatic grade or required writing order.

## Persistence

The app writes `robot-builder.workspace.v3`. Version-2 and original version-1 browser storage remain unchanged. Old workshop drafts become cafeteria drafts; rescue becomes greenhouse and museum becomes hospital. Earlier projects are adapted to allowed link lengths and axes, reset to new scene starts, and retain writing. Their complete original JSON is included as an archive, available through Download original project. Old comparisons remain in that original instead of being presented as valid results in a changed task.

New comparisons contain the robot, observation text and the number of completed steps. A fresh trial starts on load/import; transient animations and held objects are not resumed. Invalid imports preserve the current workspace. An over-budget imported design can be repaired but cannot operate the task.

## Verification

Run `npm test` at the repository root. Unit tests exercise full task completion and infeasible/blocked cases. DOM integration tests run the real scene graph with a stub renderer and accelerated animation callbacks, covering stop, progression, edit resets, budget enforcement, archives and bilingual UI. The HTTP check starts and terminates a temporary local server. The included guided lesson has its own regression tests.

Actual browser review is separate: inspect all scenes, exercise watering and tray/book pickup and placement, check Chinese controls and a narrow viewport, and inspect console errors. Do not substitute DOM geometry assertions for rendered visual review.
