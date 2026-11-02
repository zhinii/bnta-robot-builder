# BNTA Robot Builder

**A robot design challenge for Grade 7.** Choose a real-world job, build within a parts budget, try the task and explain one design decision.

**[Open Robot Builder](https://zhinii.github.io/bnta-robot-builder/)** · [Guided robot lesson](https://zhinii.github.io/bnta-robot-builder/beginner-3axis/teacher.html)

## Three useful jobs

| Scene | Student task | What the environment encourages |
| --- | --- | --- |
| Greenhouse | Water six marked plants, on both sides of a long aisle | Mobility: one affordable fixed arm cannot cover both ends. |
| Cafeteria | Move three trays from a conveyor onto a washer loading rack | A compact fixed arm can reach both machines. |
| Hospital | Bring a book from a cabinet to a table within a seated person's reach | Both a fixed arm and a shorter arm on a rover can work. |

The scenes include glazed greenhouse framing, pots and planted benches; a roller conveyor, trays, sink and stainless washer; and a hospital room with a bed, cabinet, table and seated person. Watering, carried objects, completed tasks and the washer feed are visible in the scene.

## A smaller set of choices

- **$1,200** of classroom money and **six joint spaces**, maximum.
- Two joint motions: **Turn** or **Bend**, with preset rotation limits.
- Three link sizes: **10, 20 or 40 cm**.
- At least two arm joints. A rover occupies one joint space, leaving at most five arm joints.
- Fixed arms use one of **three numbered installation spots** in each scene. Placement stays fixed throughout a trial.
- The scene's watering nozzle or gripper is included. Students do not configure tools, signed mounting directions, XYZ coordinates or custom joint limits.

| Part | Classroom price |
| --- | --- |
| Joint | $100 |
| Link | $50 per 10 cm |
| Fixed base | $100 |
| Rover base | $400, plus one joint space |

A rover with **3 joints and 1 metre of links**, **4 joints and 80 cm**, or **5 joints and 60 cm** costs $1,200. Removing or shortening parts refunds their full price. Link length is the sum of the links, not a guaranteed reach; the tool adds a fixed 65 mm forward offset. These prices are teaching values.

## Build → Try → Explain

The student selects parts and placement. **Try this step** asks a deterministic motion planner to operate that design without changing its parts. Students decide whether to move the rover to another marked stop or return to Build and revise the arm. A failed move does not award progress. Stop interrupts movement without completing the step.

The planner checks the arm and carried item at small increments. Rover moves turn toward their route before translating. Successful watering wets the soil; gripped trays and the book follow the robot's tool. The tray rack feeds released trays into the washer. Changing a design resets the trial and returns the robot to its starting pose. A separate notebook keeps predictions, decisions, observations and proposed revisions, with up to six saved comparisons.

English and 简体中文 are available through a persistent language selector. Each task retains its own design and notebook locally. Save/Open transfers JSON project files. Earlier files are adapted to the smaller kit; their full originals, including old comparison notes, are retained in downloadable archives. Earlier browser storage is left untouched.

## Run and test

Node.js 24 or later:

```sh
npm start
```

Open http://127.0.0.1:4242/robot-builder/. Three.js and the guided lesson are included locally. The app needs no account, API key or external CDN.

```sh
npm ci --ignore-scripts
npm test
```

Tests cover parts and budget constraints, all three complete tasks, carrying clearances, blocked paths, stop/reset behavior, bilingual controls, original-project preservation, per-task notes, scene graphs and local asset delivery. The scene-graph harness stubs WebGL; separate browser review checks actual rendering and interaction.

## Model limits

This is an educational 3D model, not a physical robot controller. Motion planning is a bounded numerical search with simplified geometry and sampled paths; failure to find a move is not proof that no possible move exists. It does not model flexible hoses, self-collision, forces, balance, dynamics or washing mechanics. It does not provide medical treatment or connect to hardware.

Built by Christopher Hansen as an independent companion to [Robot Lab](https://github.com/zhinii/bnta-robotics). The original simulator checkout is preserved. GitHub Pages publishes the root of this repository from `main`.

## License

Copyright © 2026 Christopher Hansen. [MIT License](LICENSE). Vendored Three.js retains its [MIT license](beginner-3axis/vendor/three/LICENSE).
