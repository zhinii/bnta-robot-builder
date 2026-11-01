# Robot Builder

A bilingual design activity extending Robot Lab's guided lessons. Students explore a fictional school greenhouse, choose a fixed or mobile base, and construct a serial arm. The total budget is **six slots: one for each arm joint, plus one for an optional rover**. This classroom accounting rule does not describe the rover's physical degrees of freedom. A fixed base supports at most six arm joints; a rover supports at most five.

Run `npm start` from this repository's root, then open http://127.0.0.1:4242/robot-builder/. The tool uses the locally vendored Three.js modules in `beginner-3axis/vendor/three/`; it requires no API, account, network CDN or dependency installation to run. Preserve those modules and their license when copying the tool. The original simulator checkout is not modified.

## Learning through design

The fictional task is to bring an inspection camera close to three greenhouse plants at different heights and on opposite sides of an aisle. The suggested observation tolerances are 120 mm position and 20 degrees direction. Students can build, test and explain in any order. Nothing is locked behind a reflection or a score. The greenhouse is a starting scenario, not a user-confirmed curriculum requirement.

| Existing lesson | Builder opportunity | Reasoning to discuss |
| --- | --- | --- |
| Robot types | Fixed arm or rover-mounted arm | Does moving the base justify losing one arm joint? |
| Links, joints and axes | Select each link's length, local rotation axis and mounting direction | What independent movement does this joint add? |
| One joint, what else moves? | Move one joint and watch the downstream chain | Which parts move even if their joint angles stay unchanged? |
| XYZ versus degrees | Compare joint sliders with the camera's measured world coordinates | How does a rotation change position? |
| Position versus orientation | Compare distance and camera-direction error separately | Does reaching the point also point the camera correctly? |
| Reach and joint limits | Three discrete lengths and adjustable bounded rotation ranges | Is the restriction length, axis arrangement or permitted rotation? |
| Reachable endpoint versus blocked path | Solid beds, current-pose overlap feedback and bounded rover movement | What extra evidence would establish a clear route? |

The notebook asks students to predict, justify a choice, cite observations and propose one revision. Up to six design-and-observation snapshots support comparisons. They are not automatic grades or proof of learning. The gripper/holding-feedback lesson is not exercised by this camera-only first scenario.

## Behavior and limits

- One to six rotary arm joints, reduced to five with a rover. Each joint drives one rigid link. Lengths are 200, 350 or 500 mm; rotation is around local X, Y or Z; link directions are the six signed local axes. Rotation limits stay within -180 to +180 degrees. The camera is a fixed end effector and does not consume a positioning slot.
- Forward kinematics composes every joint frame and the rover translation/yaw. Joints are edited directly; there is no automatic inverse-kinematics solution or generated task program.
- Rover buttons move 100 mm or turn 15 degrees. Translation is sampled in 20 mm steps against a conservative circular footprint and rectangular bed bounds. Turning uses the same footprint. Fixed bases stay at the aisle centre.
- Current arm poses are checked against the floor and padded bed boxes. These overlap indicators do not validate full swept routes or prevent exploratory arm movement. No self-collision, dynamics, motor loads, stability, image capture, crop health inference or physical robot control is implemented.
- EN/中文 is explicit and persistent. Project JSON contains robot geometry, pose, four reflection fields and comparison snapshots. A browser-local draft is saved; Save project is the portable copy. Data is not uploaded.
- Geometry edits and poses have Undo. Notes and saved comparisons are retained separately; Undo does not restore deleted comparison entries.

## Validation

Run `node --test robot-builder/tests/model.test.mjs` from the repository root. Tests cover kinematics, local-axis inheritance, rover transformations, the exact six-slot boundary, malformed project rejection, joint ranges, obstacle travel and pose evidence.

After `npm ci --ignore-scripts`, `npm test` runs the full suite. The DOM check uses jsdom to exercise controls, the real Three.js scene graph with a stub renderer, rover travel, Undo, reflections, immutable comparison snapshots, EN/中文 and project import/export. It is not a browser rendering test. A temporary local server checks the builder and linked lesson dependency graphs over HTTP and verifies that server/config files are excluded.

Initial prototype verification: 10 model tests, the DOM/scene-graph journey, and HTTP checks of 27 builder/lesson assets passed. Visual WebGL and responsive-layout QA remain unverified because local browser control was disabled during the initial review. No files in the original simulator checkout were changed when preparing this independent repository.

Robot Lab · Christopher Hansen. The surrounding repository's MIT license and the vendored Three.js license apply.
