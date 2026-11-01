# Teacher-led 3D lesson

Run `npm start` from the repository root and open `http://127.0.0.1:4242/beginner-3axis/teacher.html`. This is a separate presentation entry, with no programming, challenges, scoring, learner submission or AI dependency. It does not alter the builder's design or saved work.

## Use during a lesson

- Choose **3 axes / 6 axes** to inspect the corresponding mechanism. Click a physical part, its scene label, or its name under **Point to a part** to highlight it and read an explanation.
- Use **Previous / Next**, the **Lesson sequence**, or the left/right arrow keys to move through the presentation. No demonstration advances a slide automatically.
- Ask the displayed question before pressing **Show what happens**.
- A failed example stops at **Observe**. Press **Discuss before continuing** to reveal discussion prompts. A solution runs only when you explicitly press its separate button.
- **Stop** or Escape interrupts an active demonstration. Reset repeats the same example from its initial state.
- English/Chinese changes every authored teaching string. Full-screen mode is available on desktop.

## Sequence

1. **Robot types:** compare articulated arms, gantries and mobile rovers. Ask which can work over a bench and which can transport supplies across a room. SCARA and Delta sit inside an optional expansion.
2. **Components and axes:** click the base, links, joints and gripper. Distinguish a rigid link, a joint and an independently controlled axis. Compare the two mechanisms.
3. **One-joint motion:** predict every part that moves when J1 rotates, while other joint angles stay unchanged.
4. **Control and feedback:** follow instruction → controller → motor → joint motion → position feedback, now tied to a movement the class has seen.
5. **XYZ movement:** request a small tool-height change and observe coordinated joint changes. Distinguish millimetres from degrees.
6. **Grasp evidence:** close empty jaws and observe that no part is held. Discuss before explicitly approaching, grasping and lifting.
7. **Three versus six axes:** request a 90° tool roll with the TCP fixed. Discuss the three-axis limitation before explicitly demonstrating the six-axis J6 roll.
8. **Reach:** request the orange target beyond the three-axis arm’s reach. The real controller rejects it without motion. After discussion, explicitly relocate the task marker closer and move to it. Link lengths never change.
9. **Joint limits:** request J1 +170° outside this model’s −150° to +150° range. The arc shows the permitted range and the red line the requested direction. After discussion, explicitly try a revised +30° turn; the joint limits remain unchanged.
10. **Obstacle clearance:** request a direct carrying move through a barrier. Discuss the rejection before explicitly trying the raised route. Consider both the arm and the held part.
11. **Practical planning discussion:** pick up a rectangular part, turn it 90° to fit a slot, carry it past a tall barrier and place it. Ask students to choose a mechanism, locate the work within reach and joint limits, order the actions, and identify evidence of success. A possible plan remains hidden until the teacher selects discussion. Links revisit the five relevant demonstrations.

The final task is a discussion scenario, not an automatically executed assembly simulation. It combines the evidence from the earlier demonstrations without claiming that a complete six-axis pick-and-place task has been validated.

Numerical setup information sits under **Demonstration details**, so the main explanation focuses on the concept. All teaching text and controls have English/Chinese pairs. The reach, joint-limit, obstacle and grasp examples explicitly use the three-axis controller. Other mechanism lessons support both arms. The five body-type examples illustrate different mechanisms.

## Model boundaries

Three-axis poses come from the existing beginner controller and forward kinematics. Six-axis poses use `six-axis-agent/kinematics.mjs`. The models have different link lengths; the lesson compares motion capabilities, not maximum reach. An axial J6 rotation demonstrably preserves the six-axis TCP. This does not imply that every orientation is achievable at every position or that more axes automatically avoid obstacles.

The six-axis inverse solver has a 0.12 mm positional convergence tolerance; the readout reports actual model values, so a requested 10 mm move can display approximately 9.95 mm. The controller cabinet, joint motor and encoder marker explain their roles; electrical behaviour, motor force and physical sensor signals are not simulated.

## Verification

- `npm run test:lesson`: 9 tests for paired text, the sequence, optional types, controller rejection of reach/joint limits, blocked-route/grasp evidence, fixed-TCP wrist rotation, control-chain ordering, Stop, navigation, and the explicit discussion/solution boundary.
- `npm test`: also runs builder model/interface checks and verifies all required builder and lesson assets over HTTP using a temporary local server.

Visual WebGL, responsive layout and physical-device acceptance have not been reverified in this independent repository. The original simulator's optional Python/API server and browser-test infrastructure are not included.
