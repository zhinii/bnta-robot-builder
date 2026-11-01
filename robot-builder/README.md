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

Students choose among three procedurally built scenes. The selected task supplies its room dimensions, fixtures, target positions/directions, initial fixed location and rover starting position. Those same definitions drive the renderer and geometric checks.

- **Greenhouse plant inspection:** plants are spread along an 8.4 m growing aisle with raised beds and trellises. The end stations are 4.9 m apart, beyond twice the maximum affordable fixed-arm reach (including camera offset and target tolerance). No choice of one fixed location can cover both. A rover can travel along the aisle and inspect all three.
- **Workshop quality inspection:** components sit on one compact workbench, with different approach directions. A $600 fixed design is a verified example; base travel is not necessary. This example is in tests, not automatically given to students.
- **Hospital supply inspection:** supply labels and an equipment display at different heights admit both fixed and mobile solutions. Tests include a $1,100 fixed design and a $1,150 rover design. These establish feasibility, not optimality or physical validity.

Students choose a fixed installation in Build by clicking the floor (snapped to 50 mm) or entering X/Y coordinates and a heading between −180° and 180°. The complete 300 mm square footprint must remain within the room and outside floor fixtures; rotated corners are checked. Placement changes cost nothing. The location is locked in Test and retained by pose reset, base changes, undo, project files and comparison snapshots. Return to Build to revise it. A valid base location does not guarantee that the arm clears fixtures.

The student choice cards describe the task conditions without labeling a winning base. Both bases remain selectable. The notebook asks students to predict, justify a choice, cite evidence and revise one idea. Comparison snapshots include parts cost, total link length, slot use and camera measurements. There is no timer, automatic grade or mandatory writing sequence.

| Guided-lesson concept | Builder evidence |
| --- | --- |
| Robot types | Decide whether whole-body travel is worth its cost. |
| Links, joints and axes | Choose lengths, local axes and signed mounting directions. |
| One joint, what else moves? | Watch the downstream chain follow an upstream rotation. |
| XYZ versus degrees | Compare world camera coordinates with joint-angle changes. |
| Position versus orientation | Inspect distance and direction error independently. |
| Reach and joint limits | Distinguish installation location, length, axis arrangement, angle limits and affordability. |
| A reachable endpoint versus a blocked route | Examine clearances and the limits of pose-only evidence. |

The camera-only tasks do not implement the earlier lesson's gripping or part-carrying activity.

## Saving and compatibility

Each task's draft, notes and up to six comparisons persist separately in browser storage. Changing tasks does not erase another task's work. Export saves the selected task as a version-2 JSON project; import restores its scene. Invalid imports preserve the workspace.

Version-1 greenhouse files migrate to the expanded greenhouse with geometry, notes, comparison text and old 350 mm links retained; placement resets to the new start. Version-2 disaster and museum files/drafts migrate to greenhouse and hospital respectively, retaining geometry, base positions and writing. Older files without an explicit fixed location use the prior scene’s marked location. A persistent notice labels earlier scene observations; they are not presented as current measurements. The original version-1 browser key is untouched; when possible, a backup of a renamed-scene workspace is kept before saving its migrated drafts. Above-budget imported designs remain editable, but Test movement and aligned-target feedback stay disabled until affordable. Their cost always comes from the current catalog, not values supplied in the file.

## Model boundaries

The model composes every joint's local rotation and translation with the fixed mounting point or rover position/yaw. There is no automatic solver or task program. Rover steps are 100 mm or 15 degrees; translation is sampled against a conservative 260 mm footprint, solid fixtures and room boundaries.

Inspection feedback checks a current camera pose within 120 mm and 20 degrees of a target, with no detected floor/fixture overlap and a valid budget. Arm overlap uses simplified segment/box bounds; greenhouse beds and foliage share conservative solid envelopes. Exploratory arm controls can pass through fixtures; full swept paths, self-collisions, motor loads, dynamics, stability and actual camera images are not simulated. These observations are evidence for discussion, not physical-robot approval or route-completion scores.

## Verification

After `npm ci --ignore-scripts`, run `npm test`. The suite covers money and slot constraints, legacy recovery, scene-specific kinematics and fixtures, rotated fixed footprints, placement effects on reach, feasible task examples, per-task drafts, bilingual UI, numeric and scene-pick placement, Test locking, saved installations, save/import/export, scene-graph replacement and overview camera projection. Asset checks start and stop a temporary local server.

Visual WebGL and responsive CSS review remain unverified because local browser control is disabled in the Work settings. The scene-graph harness uses a stub renderer and is not a pixel rendering test.

Robot Lab · Christopher Hansen. Repository and vendored Three.js MIT licenses apply.
