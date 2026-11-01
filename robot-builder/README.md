# Robot Builder: budgets and task environments

Run `npm start` from the repository root and open http://127.0.0.1:4242/robot-builder/. All application assets and the guided lesson are local; no API or external CDN is required.

## Parts and constraints

Every scenario has a **$1,200 classroom budget**. Each rotary joint costs $100. Links cost $0.50 per millimetre, with five new-design choices: 100, 200, 300, 400 and 500 mm. A fixed base costs $100; a rover costs $400. The camera is included.

Six slots remain the independent upper limit. Each arm joint consumes one, and the rover consumes one. Thus a rover can have at most five arm joints, subject to the money budget. It does not have to use all of them.

| Rover configuration | Joint cost | Link cost | Base | Total |
| --- | --- | --- | --- | --- |
| 3 joints; 1,000 mm total links | $300 | $500 | $400 | $1,200 |
| 4 joints; 800 mm total links | $400 | $400 | $400 | $1,200 |
| 5 joints; 600 mm total links | $500 | $300 | $400 | $1,200 |

The rover counts as one **design slot**, not one physical rotary joint. Link length is the sum of rigid arm segments, not a guaranteed Cartesian reach. The camera adds a fixed 65 mm offset. These are fictional teaching prices. Replacing or removing a component returns its full cost; an edit that would exceed the budget is rejected without changing the design.

## Tasks and learning

Students choose among three procedurally built scenes. The selected task supplies its room dimensions, fixtures, target positions/directions, fixed mount and rover starting position. Those same definitions drive the renderer and geometric checks.

- **Disaster-site inspection:** openings are spread along an 8.4 m corridor. One lies beyond the theoretical reach of any affordable fixed chain from its marked mount. A rover can traverse the clear corridor and inspect all three.
- **Workshop quality inspection:** components sit on one compact workbench, with different approach directions. A $600 fixed design is a verified example; base travel is not necessary. This example is in tests, not automatically given to students.
- **Museum collection inspection:** three display heights and approach positions admit both fixed and mobile solutions. Tests include a $1,100 fixed design and a $1,150 rover design. These establish feasibility, not optimality or physical validity.

The student choice cards describe the task conditions without labeling a winning base. Both bases remain selectable. The notebook asks students to predict, justify a choice, cite evidence and revise one idea. Comparison snapshots include parts cost, total link length, slot use and camera measurements. There is no timer, automatic grade or mandatory writing sequence.

| Guided-lesson concept | Builder evidence |
| --- | --- |
| Robot types | Decide whether whole-body travel is worth its cost. |
| Links, joints and axes | Choose lengths, local axes and signed mounting directions. |
| One joint, what else moves? | Watch the downstream chain follow an upstream rotation. |
| XYZ versus degrees | Compare world camera coordinates with joint-angle changes. |
| Position versus orientation | Inspect distance and direction error independently. |
| Reach and joint limits | Distinguish length, axis arrangement, angle limits and affordability. |
| A reachable endpoint versus a blocked route | Examine clearances and the limits of pose-only evidence. |

The camera-only tasks do not implement the earlier lesson's gripping or part-carrying activity.

## Saving and compatibility

Each task's draft, notes and up to six comparisons persist separately in browser storage. Changing tasks does not erase another task's work. Export saves the selected task as a version-2 JSON project; import restores its scene. Invalid imports preserve the workspace.

Version-1 greenhouse files migrate to the museum scene. Geometry, notes and comparison text are retained, including old 350 mm links; base placement is reset. A persistent notice explains the changed context, and old comparison notes are explicitly labeled as greenhouse records instead of being presented as new measurements. The old browser storage key is not overwritten. Above-budget imported designs remain editable, but Test movement and aligned-target feedback stay disabled until affordable. Their cost always comes from the current catalog, not values supplied in the file.

## Model boundaries

The model composes every joint's local rotation and translation with the fixed mounting point or rover position/yaw. There is no automatic solver or task program. Rover steps are 100 mm or 15 degrees; translation is sampled against a conservative 260 mm footprint, solid fixtures and room boundaries.

Inspection feedback checks a current camera pose within 120 mm and 20 degrees of a target, with no detected floor/fixture overlap and a valid budget. Arm overlap uses simplified segment/box bounds. Exploratory arm controls can pass through fixtures; full swept paths, self-collisions, motor loads, dynamics, stability and actual camera images are not simulated. These observations are evidence for discussion, not physical-robot approval or route-completion scores.

## Verification

After `npm ci --ignore-scripts`, run `npm test`. The suite covers money and slot constraints, legacy recovery, scene-specific kinematics and fixtures, feasible task examples, per-task drafts, bilingual UI, save/import/export, scene-graph replacement and overview camera projection. Asset checks start and stop a temporary local server.

Visual WebGL and responsive CSS review remain unverified because local browser control is disabled in the Work settings. The scene-graph harness uses a stub renderer and is not a pixel rendering test.

Robot Lab · Christopher Hansen. Repository and vendored Three.js MIT licenses apply.
