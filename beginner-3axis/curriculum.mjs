/** Reusable machine-learning sequence: explain, demonstrate, operate, review.
 * Content is bilingual; demonstrations use a separate real model controller.
 * No example can write a learner's program or completion evidence.
 */
import { Controller } from "./controller.mjs";
import { initialScene, teachingRoute } from "./planner.mjs";
import { fk, degreesToRadians as rad } from "./model.mjs";

// Assessment has practical and reflection substages; the visible navigation has four stages.
export const PHASES = ["vocabulary", "understand", "watch", "try", "review"];
const pair = (en, zh) => ({ en, zh });
export const COURSE = {
  types: {
    goal: pair(
      "Choose a robot body that suits a job.",
      "根据工作选择合适的机器人结构。",
    ),
    concept: pair(
      "A robot follows instructions. Its body plan changes how it moves and which jobs it can do. For each type, read the concept, then watch its 3D demo before meeting the next robot.",
      "机器人按指令工作。结构类型决定它如何运动、适合什么任务。每种类型先学概念，再看它的3D演示，然后认识下一种机器人。",
    ),
    prediction: pair(
      "Which body plan would you choose to move books along straight library shelves? Why?",
      "沿笔直的图书架搬运书籍，你会选择哪种结构？为什么？",
    ),
    task: pair(
      "Think back to the five robot types and their 3D demos in this lesson. Choose a robot for each illustrated job, using the motion you saw it demonstrate. Use the replay buttons below if you need a reminder. These matches refer to this lesson’s examples; real robots can have other suitable jobs.",
      "回想本课五种机器人及其3D演示，根据演示中的运动，为每幅工作图选择机器人。需要回顾时，使用下方的重看按钮。这些配对依据本课示例，真实机器人还可以承担其他合适的工作。",
    ),
    reflect: pair(
      "Compare two robots from the demos. Describe one movement you observed in each, and explain how its body plan helps it do its job.",
      "比较演示中的两种机器人。分别描述你观察到的一种运动，并说明它的结构如何帮助它完成工作。",
    ),
    demo: pair(
      "Example: a small arm transfers a part between two stations. Its joints rotate; a gantry would use straight sliding axes. Neither body is best for every job.",
      "示例：小机械臂在两个工位间搬运零件。它的关节旋转，而龙门式机器人使用直线滑动轴。没有一种结构适合所有工作。",
    ),
  },
  anatomy: {
    goal: pair(
      "Connect a moving part to its name and purpose.",
      "把运动部件与名称和作用联系起来。",
    ),
    concept: pair(
      "The base supports the robot. Links are rigid arms. Joints let links rotate; motors drive them. The controller follows instructions. The gripper is the end effector. J1 turns the base, J2 raises the upper arm and J3 bends the elbow. These three axes cannot independently aim the tool: it tilts with the arm. Extra wrist axes let other robots control tool orientation.",
      "底座支撑机器人，连杆是刚性臂，关节允许连杆旋转，电机驱动关节，控制器执行指令。夹爪是末端执行器。J1转动底座，J2抬起上臂，J3弯曲肘部。三轴不能独立控制工具朝向，工具随臂倾斜；其他机器人的附加腕轴可以控制朝向。",
    ),
    prediction: pair(
      "If you turn only J1, which parts will move with it?",
      "只转动J1，哪些部件会跟着移动？",
    ),
    task: pair(
      "Predict what turns with J1 and save your prediction. Then use +10° or −10° to turn it yourself. Watch the robot before choosing Identify & explain.",
      "预测哪些部件随J1转动并保存预测，再按+10°或−10°亲自转动。观察机器人，然后选择“辨认与解释”。",
    ),
    reflect: pair(
      "How is a joint different from a link? Explain why the gripper is not a fourth positioning axis.",
      "关节与连杆有什么不同？为什么夹爪开合不是第四个定位轴？",
    ),
    demo: pair(
      "Watch J1, J2 and J3 move one at a time. The gripper then closes and opens without adding a positioning axis. Motor and controller drawings explain their role; electrical behaviour is not simulated.",
      "观察J1、J2、J3依次单独运动，然后夹爪开合，但并未增加定位轴。电机和控制器的图示用于说明作用，不模拟电路行为。",
    ),
  },
  coordinates: {
    goal: pair(
      "Move up 10 mm and explain the numbers.",
      "上移10毫米，并解释这些数字。",
    ),
    concept: pair(
      "X, Y and Z locate the tool centre point (TCP) from the robot base, in millimetres. Joint angles describe rotation, in degrees. Z is height. A straight upward move usually needs both shoulder and elbow to rotate. Entering a target previews it; Move executes it.",
      "X、Y、Z是相对底座的工具中心点（TCP）位置，单位毫米。关节角度表示旋转，单位度。Z表示高度。竖直上移通常需要肩部和肘部同时转动。输入目标只预览，按“移动”才执行。",
    ),
    prediction: pair(
      "If Z increases by 10 mm while X and Y stay unchanged, where will the tool go? Will just one joint move?",
      "X、Y不变，Z增加10毫米，工具会移到哪里？只需一个关节运动吗？",
    ),
    task: pair(
      "Keep X and Y unchanged. Increase Z by 10 mm, press Move, then Inspect joint changes. In Explain & check calculate displacement, distance and average speed from this actual move.",
      "保持X、Y不变，Z增加10毫米，按“移动”，再按“查看关节变化”。在“评估”中根据这次实际运动计算位移、路程和平均速度。",
    ),
    reflect: pair(
      "Use the before/after angles to explain why a straight tool path can require more than one joint.",
      "利用运动前后的角度，解释为什么工具走直线需要多个关节运动。",
    ),
    demo: pair(
      "Example: Z goes from 123.9 to 133.9 mm. Displacement = final − initial = +10 mm. Straight-path distance = 10 mm. Average speed = distance ÷ simulated time. Watch J2 and J3 change together.",
      "示例：Z从123.9到133.9毫米。位移＝终点－起点＝+10毫米；直线路程＝10毫米；平均速度＝路程÷模拟时间。观察J2和J3同时变化。",
    ),
  },
  grip: {
    goal: pair("Approach, grip and lift a part.", "接近、夹住并抬起零件。"),
    concept: pair(
      "Open jaws need room around the part. Approach along the tool direction before closing. The orange dot is the TCP between the fingers. A Close command does not prove a grasp: check “Object held”. Here parts sit in virtual supports; unsupported release is prevented. Gravity, friction, mass and bouncing are not modelled.",
      "张开的夹爪需要零件周围有空间。闭合前沿工具方向接近。橙点是两指之间的TCP。“闭合”不等于抓取成功，应查看“夹持物体”。本模型使用虚拟支撑，禁止无支撑释放；不模拟重力、摩擦、质量或弹跳。",
    ),
    prediction: pair(
      "Why should the jaws approach the part while open, rather than close before arriving?",
      "为什么应张开夹爪接近零件，而不是到达前先闭合？",
    ),
    task: pair(
      "Follow the four actions below. Target buttons only fill the numbers: you must press Move. Close at pickup, confirm Object held: Yes, then lift exactly 10 mm.",
      "完成下面四步。“使用目标”只填入数字，你仍需按“移动”。在抓取点闭合，确认“夹持物体：是”，然后准确抬高10毫米。",
    ),
    reflect: pair(
      "What evidence showed a real grasp? Which physical effects would you need to consider with a real robot?",
      "什么证据说明确实抓住了物体？真实机器人还需考虑哪些物理效应？",
    ),
    demo: pair(
      "Open → approach → pickup → close → lift 10 mm. Notice that the object follows the tool only after attachment is confirmed. This is a geometric grasp model, not a force simulation.",
      "张开→接近→抓取点→闭合→抬高10毫米。只有确认夹持后物体才跟随工具。这是几何抓取模型，不是力学仿真。",
    ),
  },
  program: {
    goal: pair(
      "Build and test a repeatable transfer program.",
      "建立并测试可重复的搬运程序。",
    ),
    concept: pair(
      "A program is an ordered list of actions. Record ON saves successful moves and gripper actions; OFF lets you explore freely. Reset restores the starting scene without deleting steps. Run repeats the list. Pause freezes playback; Stop ends it. Reset before running again.",
      "程序是有顺序的动作列表。录制开启时保存成功的移动和夹爪动作，关闭时可自由探索。重置恢复起始场景，不删除步骤。“运行”重复列表，“暂停”冻结播放，“停止”结束运行。再次运行前先重置。",
    ),
    prediction: pair(
      "Write the order of actions needed to carry the part from Source to Destination A. Why must the start state match?",
      "写出从起点搬运到目标A所需动作的顺序。为什么起始状态必须一致？",
    ),
    task: pair(
      "Save prediction → Reset → Record ON → perform the route → Record OFF → Reset → Run. Use Steps to review or reorder. Test Pause and Stop, then Reset and Run the complete program. Record a problem and your improvement in Assessment.",
      "保存预测→重置→开启录制→执行路线→关闭录制→重置→运行。在“步骤”中查看或调整顺序。测试暂停和停止，再重置并完整运行。在“评估”记录问题与改进。",
    ),
    reflect: pair(
      "What did your first test reveal? What did you change, and what happened in the next test? Explain why order matters.",
      "第一次测试发现什么？你改了什么，下一次测试结果如何？解释为什么顺序很重要。",
    ),
    demo: pair(
      "Example job: move a small part from a supply station to an assembly station. Watch the complete ordered route. This example does not write your program: you will record and test your own.",
      "示例任务：从供料工位把小零件搬到装配工位。观看完整有序路线。示例不会写入你的程序，你将自己录制和测试。",
    ),
  },
  obstacle: {
    goal: pair(
      "Test a blocked route, improve it, then adapt independently.",
      "测试受阻路线、改进，再独立适应新任务。",
    ),
    concept: pair(
      "A clear destination does not guarantee a clear path: links, fingers and the held part need space. This simulator checks motion before starting and rejects collisions. It does not simulate an impact. A detour is longer but can make the task possible.",
      "终点空闲不等于路径畅通，连杆、手指和物体都需要空间。本模拟器先检查运动，发生碰撞风险时拒绝执行，不模拟撞击。绕行虽更远，却能让任务完成。",
    ),
    prediction: pair(
      "The obstacle reaches Z = 100 mm. What will happen on a direct carrying move at Z = 80 mm? Suggest a safer route.",
      "障碍物高至Z=100毫米。带着物体在Z=80毫米直行会怎样？提出更合适的路线。",
    ),
    task: pair(
      "Pick up the part. Try moving directly to A: the robot should stay still and explain the blocked path. Then lift to Z = 130, cross above A, approach and place. After review, choose Changed task: record and replay a route to B without target buttons or hints.",
      "抓起零件，尝试直达A：机器人应保持不动，并解释受阻原因。然后抬高到Z=130，在A上方穿过，接近并放置。回顾后选择“变化任务”：不用目标按钮或提示，自己录制并运行到B的路线。",
    ),
    reflect: pair(
      "Why was the direct route rejected? Compare the detour with the direct route. Explain how you adapted your program for the changed destination.",
      "直线路线为什么被拒绝？比较绕行与直行的路程，并说明如何为新目标调整程序。",
    ),
    demo: pair(
      "The first direct carrying attempt is rejected before any motion. Watch a 50 mm lift and a crossing above the obstacle. The end position alone is not enough to check a movement.",
      "第一次直线搬运在开始前被拒绝。观察抬高50毫米并从障碍物上方通过。仅检查终点不足以确认一次运动可行。",
    ),
  },
  design: {
    goal: pair(
      "Use your evidence to propose a helpful machine.",
      "用学习证据提出有用的机器方案。",
    ),
    concept: pair(
      "Start with a person and a problem, not with a robot. Example: an assembly worker repeatedly transfers tiny parts. An arm could handle that repeatable movement; a person still chooses the goal, checks limits and supervises the system. Pick a problem you care about.",
      "先考虑人和问题，而不是先选机器人。例如，装配工人反复搬运小零件，机械臂可执行重复动作；人仍需决定目标、检查限制并监督系统。选择你关心的问题。",
    ),
    prediction: pair(
      "Who might benefit from a repeatable pick-and-place task, and what could go wrong?",
      "谁能从可重复的抓取搬运中受益？可能出现什么问题？",
    ),
    task: pair(
      "Watch the example. Choose an interest, a person’s task, a body plan, a benefit and a limitation in Assessment. Refer to your tested program or obstacle result. Save your project JSON and a scene image for a teacher to discuss with you.",
      "观看示例。在“评估”选择兴趣、人的任务、机器人结构、好处和限制，并引用测试程序或避障结果。保存项目JSON和场景图片，与老师讨论。",
    ),
    reflect: pair(
      "Which part interested you: building, coding, design, maths, science or helping people? What would you investigate next, and what evidence supports your proposal?",
      "你对搭建、编程、设计、数学、科学还是帮助他人最感兴趣？下一步想研究什么？什么证据支持你的方案？",
    ),
    demo: pair(
      "Worked proposal: move small parts from supply to assembly. Benefit: repeatable positioning. Limit: this arm cannot aim its gripper independently or handle every object. Watch the tested transfer; then propose your own useful application.",
      "方案示例：把小零件从供料处移到装配处。优点：重复定位。限制：该机械臂无法独立调整夹爪朝向，也不能处理所有物体。先看已测试的搬运，再提出你自己的用途。",
    ),
  },
};
export const copy = (id, field, language) =>
  COURSE[id]?.[field]?.[language] ?? "";

export function practiceRoute(id, scene) {
  const route = teachingRoute(scene);
  if (id === "grip")
    return [
      ...route.slice(0, 3),
      {
        ...route[3],
        name: "Lift 10 mm",
        targetMm: { ...route[1].targetMm, z: route[1].targetMm.z + 10 },
      },
    ];
  if (id === "obstacle")
    return [
      ...route.slice(0, 3),
      { ...route[6], name: "Test direct route", expectedError: "PATH_BLOCKED" },
      ...route.slice(3),
    ];
  return route;
}

/** A deterministic example with its own world; no learner controller references. */
export class LessonDemo {
  constructor(id, segment = "full") {
    this.controller = new Controller({
      scene: initialScene({ obstacle: id === "obstacle" }),
    });
    const q = this.controller.state.scene.actualJoints;
    this.commands =
      id === "anatomy"
        ? [0, 1, 2]
            .flatMap((i) => [
              {
                type: "jointDemo",
                jointIndex: i,
                angleRad: q[i] + rad(i === 2 ? 15 : 10),
                name: `J${i + 1}`,
              },
              {
                type: "jointDemo",
                jointIndex: i,
                angleRad: q[i],
                name: `J${i + 1}`,
              },
            ])
            .concat([
              { type: "gripper", gripperState: "closed", name: "Close" },
              { type: "gripper", gripperState: "open", name: "Open" },
            ])
        : id === "coordinates"
          ? [
              {
                type: "move",
                targetMm: { ...fk(q).C, z: fk(q).C.z + 10 },
                name: "+10 mm Z",
              },
            ]
          : practiceRoute(id, this.controller.state.scene);
    if (id === "anatomy" && segment !== "full") {
      this.commands =
        segment === "base"
          ? this.commands.slice(0, 2)
          : segment === "links"
            ? this.commands.slice(2, 6)
            : this.commands.slice(6);
    }
    if (id === "coordinates" && segment === "joint")
      this.commands = [
        {
          type: "jointDemo",
          jointIndex: 1,
          angleRad: q[1] + rad(10),
          name: "J2 +10°",
        },
        { type: "jointDemo", jointIndex: 1, angleRad: q[1], name: "J2 return" },
      ];
    if (id === "grip" && segment === "approach")
      this.commands = this.commands.slice(0, 2);
    if (id === "obstacle" && segment === "blocked")
      this.commands = this.commands.slice(0, 4);
    // The demo operates an isolated controller through the same sequence as practice.
    this.commands = this.commands.flatMap((command) =>
      command.type === "move"
        ? [
            { type: "target", targetMm: command.targetMm, name: "Enter XYZ" },
            command,
          ]
        : [command],
    );
    if (id === "program")
      this.commands = [
        { type: "reset", name: "Reset" },
        { type: "record", enabled: true, name: "Record ON" },
        ...this.commands,
        { type: "record", enabled: false, name: "Record OFF" },
        { type: "reset", name: "Reset" },
        { type: "run", name: "Run" },
      ];
    this.index = -1;
    this.wait = 0;
    this.done = false;
    this.error = null;
  }
  tick(ms) {
    if (this.done) return;
    if (this.controller.busy) {
      this.controller.tick(ms);
      return;
    }
    this.wait -= ms;
    if (this.wait > 0) return;
    this.index++;
    if (this.index >= this.commands.length) {
      this.done = true;
      return;
    }
    const command = this.commands[this.index];
    let result;
    if (command.type === "target") {
      for (const axis of ["x", "y", "z"])
        result = this.controller.editTarget(axis, command.targetMm[axis]);
    } else if (command.type === "reset") result = this.controller.reset();
    else if (command.type === "record")
      result = this.controller.setRecording(command.enabled);
    else if (command.type === "run") result = this.controller.run();
    else result = this.controller.startAction(command);
    this.error = result.ok ? null : result.error;
    this.wait = command.expectedError
      ? 1600
      : ["target", "record", "reset"].includes(command.type)
        ? 1100
        : 700;
    if (!result.ok && result.error.code !== command.expectedError)
      this.done = true;
  }
  dispose() {
    this.controller.dispose();
    this.done = true;
  }
}

/** Measurements are from a committed controller event, never target inputs. */
export function moveMeasurement(event) {
  if (
    event?.type !== "MOVE_COMPLETED" ||
    !event.verified ||
    !(event.simulatedDurationMs > 0)
  )
    return null;
  const a = fk(event.before.actualJoints).C,
    b = fk(event.after.actualJoints).C;
  const seconds = event.simulatedDurationMs / 1000;
  return {
    eventId: event.id,
    from: a,
    to: b,
    displacementZ: b.z - a.z,
    distanceMm: event.pathDistanceMm,
    seconds,
    speedMmS: event.pathDistanceMm / seconds,
  };
}
export function checkCalculation(measurement, answers) {
  if (!measurement || !answers) return false;
  return [
    ["displacement", measurement.displacementZ],
    ["distance", measurement.distanceMm],
    ["speed", measurement.speedMmS],
  ].every(
    ([k, expected]) =>
      String(answers[k] ?? "").trim() !== "" &&
      Number.isFinite(Number(answers[k])) &&
      Math.abs(Number(answers[k]) - expected) <= 0.15,
  );
}
