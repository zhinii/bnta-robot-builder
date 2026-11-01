# BNTA Robot Builder

**Design a robot. Test an idea. Explain the evidence.**

A bilingual English/简体中文 robot design studio developed by Christopher Hansen, extending the [Robot Lab](https://github.com/zhinii/bnta-robotics) guided lessons. Students choose a task, buy joints and links within a classroom budget, test their robot in that environment, and explain the trade-offs behind their design.

**[Open Robot Builder](https://zhinii.github.io/bnta-robot-builder/)** · [Open the guided lesson](https://zhinii.github.io/bnta-robot-builder/beginner-3axis/teacher.html)

Each task has **$1,200 of classroom money** and **six design slots**:

- A fixed base permits up to **six arm joints**.
- A rover uses **one slot**, leaving up to **five arm joints**.
- Students do not need to use every slot. This classroom rule does not mean a rover is one physical rotary joint.

| Part | Classroom price |
| --- | --- |
| Rotary joint | $100 |
| Link | $50 per 100 mm; choices from 100 to 500 mm |
| Fixed base | $100 |
| Rover base | $400 and one design slot |
| Inspection camera | Included |

With a rover, **3 joints + 1,000 mm of links**, **4 + 800 mm**, and **5 + 600 mm** each use the same $1,200 budget. Shorter links can pay for another joint. Removing or replacing parts refunds their full cost. Total link length is not guaranteed reach; the camera has an additional fixed 65 mm offset. These are teaching prices, not real supplier quotations.

## Three task environments

| Scene | Task | Design trade-off |
| --- | --- | --- |
| Greenhouse plant inspection | Inspect plants along a long growing aisle | Distances favor a rover; raised beds constrain travel. |
| Workshop quality inspection | Inspect three components on a compact workbench | A simple fixed arm can do the job without paying for base travel. |
| Hospital supply inspection | Inspect supply labels and an equipment display at different heights | Both fixed and mobile solutions fit the budget. |

Choosing a task rebuilds the 3D environment, inspection targets, collision fixtures and starting position. Each task keeps its own design, notes and comparison snapshots. Both bases remain selectable; the environment and price trade-offs create the advantages. Student cards describe the task rather than announce a preferred answer. A fixed arm can be installed anywhere its full base fits on clear floor. Students choose its X/Y position and heading in Build by clicking the floor or entering coordinates. Placement stays locked in Test; returning to Build allows revision. Placement is free and saved with each design and comparison.

## Run locally

With Node.js 24 or later:

```sh
git clone https://github.com/zhinii/bnta-robot-builder.git
cd bnta-robot-builder
npm start
```

Open **http://127.0.0.1:4242/robot-builder/**.

The application needs no dependency installation to run. Three.js is included locally with its license. No account, API key, AI service or external CDN is required. The linked guided lesson is included in this repository.

## Student experience

- **Build:** choose a base and its fixed installation location, buy or remove joints, choose one of five link lengths, select local rotation axes and set rotation limits. Watch the parts bill and remaining budget update.
- **Test:** move each joint, drive and turn the rover, and compare camera position and direction against the selected scene’s three inspection points.
- **Explain:** predict, justify a choice, record observations and propose a revision. Keep up to six design snapshots for comparison.
- **Save:** export/import the selected task's robot, pose, reflections and comparisons. All three task drafts are kept separately in the browser; student work is not uploaded.

These are fictional exploratory inspection contexts. There is no timer, prescribed robot or automatic grade. Measurements support discussion; reaching a target is not proof of a clear route or a successful physical robot. Earlier files retain their geometry and writing with a visible migration notice: the original greenhouse returns to the expanded greenhouse, the disaster scene becomes the greenhouse, and the museum becomes the hospital. Fixed installations from earlier versions start at their original marked positions; original version-1 placement resets to the new greenhouse start. Designs above the new budget remain editable but cannot be tested until their cost is reduced.

See [the detailed builder guide](robot-builder/README.md) for lesson connections and model limits, or open [the guided lesson](beginner-3axis/teacher.html) through the local server.

## Test

Install the development-only test dependency, then run all checks:

```sh
npm ci --ignore-scripts
npm test
```

The suite checks kinematics, prices/refunds, the exact rover reach/articulation examples, slot limits, movement constraints, migration, per-task drafts, interface interactions, lesson behavior and HTTP dependencies. Scenario tests demonstrate a rover inspection route, an inexpensive fixed workshop design, and affordable alternatives for the hospital. The suite also checks rotated base footprints, changed reach, numeric and floor-click installation, Test locking, saved locations and undo. The DOM test checks scene graphs and overview projection at two canvas proportions with a stub renderer; it does not verify rendered pixels or responsive CSS layout.

Visual WebGL and responsive-layout review are still pending. The model does not simulate self-collision, full swept paths, dynamics, balance, motor loads or actual camera images. Current-pose floor/bench overlap feedback is simplified. There is no physical-robot connection.

## Project layout

| Path | Purpose |
| --- | --- |
| `robot-builder/` | Builder application, model, interface and tests |
| `beginner-3axis/` | Included guided lesson and its required supporting modules |
| `beginner-3axis/vendor/three/` | Locally vendored Three.js 0.180.0 and license/provenance |
| `six-axis-agent/kinematics.mjs` | Pure kinematics used by the guided lesson |
| `scripts/test.mjs` | Test runner with a temporary local asset-check server |

This repository is a clean, independent copy. It excludes the original simulator's server configuration, credentials, logs, sessions and repository history. The original simulator checkout is preserved. GitHub Pages publishes the repository root from `main`; future pushes update the public site automatically.

## License

Copyright © 2026 Christopher Hansen. Released under the [MIT License](LICENSE). Three.js retains its [own MIT license](beginner-3axis/vendor/three/LICENSE). Attribution and vendored provenance are preserved.
