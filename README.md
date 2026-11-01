# BNTA Robot Builder

**Design a robot. Test an idea. Explain the evidence.**

A bilingual English/简体中文 robot design studio developed by Christopher Hansen, extending the [Robot Lab](https://github.com/zhinii/bnta-robotics) guided lessons. Students choose link lengths and rotation axes, test their robot in a fictional school greenhouse, and explain the trade-offs behind their design.

The design budget has **six slots**:

- A fixed base permits up to **six arm joints**.
- A rover uses **one slot**, leaving up to **five arm joints**.
- Students do not need to use every slot. This classroom rule does not mean a rover is one physical rotary joint.

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

- **Build:** add or remove joints, choose one of three link lengths, select local rotation axes and set rotation limits.
- **Test:** move each joint, drive and turn the rover, and compare camera position and direction against three plant inspection points.
- **Explain:** predict, justify a choice, record observations and propose a revision. Keep up to six design snapshots for comparison.
- **Save:** export/import a project containing the robot, its pose, reflections and comparisons. A browser-local draft is also saved; student work is not uploaded.

The greenhouse is an exploratory design context. There is no timer, prescribed robot or automatic grade. Measurements support discussion; reaching a target is not proof of a clear route or a successful physical robot.

See [the detailed builder guide](robot-builder/README.md) for lesson connections and model limits, or open [the guided lesson](beginner-3axis/teacher.html) through the local server.

## Test

Install the development-only test dependency, then run all checks:

```sh
npm ci --ignore-scripts
npm test
```

The suite checks configurable kinematics, the six-slot limit, rover constraints, saved projects, interface interactions, guided-lesson behavior and local HTTP dependencies. The DOM test uses a stub WebGL renderer and does not verify pixels or responsive layout.

Visual WebGL and responsive-layout review are still pending. The model does not simulate self-collision, full swept paths, dynamics, balance, motor loads or actual camera images. Current-pose floor/bench overlap feedback is simplified. There is no physical-robot connection.

## Project layout

| Path | Purpose |
| --- | --- |
| `robot-builder/` | Builder application, model, interface and tests |
| `beginner-3axis/` | Included guided lesson and its required supporting modules |
| `beginner-3axis/vendor/three/` | Locally vendored Three.js 0.180.0 and license/provenance |
| `six-axis-agent/kinematics.mjs` | Pure kinematics used by the guided lesson |
| `scripts/test.mjs` | Test runner with a temporary local asset-check server |

This repository is a clean, independent copy. It excludes the original simulator's server configuration, credentials, logs, sessions and repository history. The original simulator checkout is preserved. Static files are compatible with GitHub Pages; hosting must be enabled separately.

## License

Copyright © 2026 Christopher Hansen. Released under the [MIT License](LICENSE). Three.js retains its [own MIT license](beginner-3axis/vendor/three/LICENSE). Attribution and vendored provenance are preserved.
