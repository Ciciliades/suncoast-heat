// Missions, linear dialogue, the courier side job, autosave (M5).
// Progress lives in state.flags.mission, so Continue resumes the
// next mission. Dialogue reuses the #notify pill: E or click advances.
// Inactive until Start / Continue / results-close, so ?shot= staging
// never trips a mission.
import { SAVE_KEY } from "../config.js";

const MISSIONS = [
  { title: "Homecoming", objective: "Meet Theo at Coral Scoops",
    x: null, z: null, radius: 4, needVehicle: false, intro: null,
    arrive: [
      "Theo: Mara! You came home. The crew missed you.",
      "Theo: Vince runs the Marina now. He has a job.",
      "Theo: Take his call. Drive like you mean it.",
    ],
    reward: 150, xp: 100, stat: ["charisma", 20] },
  { title: "The Kroll Job", objective: "Bring a sports car to the Marina",
    x: 95, z: 20, radius: 7, needVehicle: true,
    intro: [
      "Vince: Quinn. I need a sports car at the Marina.",
      "Vince: Borrow one. The police will notice. Fun, no?",
      "Vince: Point Loma Light. Do not scratch it. Much.",
    ],
    arrive: [
      "Vince: Clean. You are hired, Quinn.",
      "Vince: One more job. Dana Cole asks about you.",
    ],
    reward: 300, xp: 150, stat: ["driving", 20] },
  { title: "Heat on the Boulevard", objective: "Reach Suncoast Pier and lose the heat",
    x: 0, z: 78, radius: 6, needVehicle: false, wanted: 2,
    intro: [
      "Dana Cole: Mara Quinn. Two stars. Come quietly?",
      "Mara: Not tonight, officer. The pier is waiting.",
      "Dana Cole: Then run. I will be right behind you.",
    ],
    arrive: [
      "Mara: The heat lost me in the crowd. Suncoast is mine.",
      "Mara: Home, at last. This city never stood a chance.",
    ],
    reward: 400, xp: 200, stat: ["stamina", 20] },
];

const DELIVERY = { x: -95, z: 10, name: "Plaza del Sol", time: 90, reward: 80 };

export class Missions {
  constructor(state, city, menus) {
    this.state = state;
    this.city = city;
    this.menus = menus;
    this.active = false;
    this.lines = null;
    this.i = 0;
    this.after = null;
    this.delivery = { stage: "idle", t: 0, shown: -1 };
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state.toJSON()));
    } catch { /* private mode: the run works, it just will not persist */ }
  }

  get done() {
    return this.state.flags.mission || 0;
  }

  get mission() {
    return MISSIONS[this.done] || null;
  }

  hasNext() {
    return this.done < MISSIONS.length;
  }

  target(m) {
    return { x: m.x ?? this.city.shopPos.x, z: m.z ?? this.city.shopPos.z };
  }

  startNext() {
    this.active = true;
    const m = this.mission;
    if (!m) {
      this.state.setObjective("Suncoast is yours — explore, earn, outrun.", 0, 0, false);
      return;
    }
    const t = this.target(m);
    this.state.setObjective(m.objective, t.x, t.z, true);
    if (m.wanted) this.state.setWanted(m.wanted);
    if (m.intro) this.playLines(m.intro, "intro");
  }

  playLines(lines, after) {
    this.lines = lines;
    this.i = 0;
    this.after = after;
    this.showLine();
  }

  showLine() {
    const s = this.state;
    document.exitPointerLock?.();
    s.notify = this.lines[this.i];
    s.notifyUntil = performance.now() + 60000;
    s.setMode("dialogue");
  }

  advance() {
    this.i += 1;
    if (this.i < this.lines.length) {
      this.showLine();
      return;
    }
    const after = this.after;
    this.lines = null;
    this.after = null;
    this.state.notify = "";
    this.state.setMode("play");
    if (after === "arrive") this.complete();
  }

  complete() {
    const s = this.state;
    const m = this.mission;
    const reward = Math.round(m.reward * (1 + 0.05 * (s.stats.charisma - 1)));
    s.addMoney(reward);
    s.addXp(m.xp);
    s.gainStat(m.stat[0], m.stat[1]);
    s.counters.missions += 1;
    s.flags.mission = this.done + 1;
    this.save();
    const story = this.done >= MISSIONS.length;
    this.menus.showResults(story ? "Story complete — Suncoast Heat" : `Mission complete — ${m.title}`, [
      ["Reward", `$${reward}`],
      ["XP", `+${m.xp}`],
      ["Level", String(s.level)],
      ["Stats", `H${s.stats.health} S${s.stats.stamina} D${s.stats.driving} Sh${s.stats.shooting} C${s.stats.charisma}`],
      ["Cash", `$${s.money}`],
    ]);
    s.setMode("results");
  }

  restoreObjective() {
    const s = this.state;
    const m = this.mission;
    if (m) {
      const t = this.target(m);
      s.setObjective(m.objective, t.x, t.z, true);
    } else {
      s.setObjective("Suncoast is yours — explore, earn, outrun.", 0, 0, false);
    }
  }

  update(step, pos, inVehicle) {
    if (!this.active) return;
    const s = this.state;
    const m = this.mission;
    if (m && !this.lines) {
      const t = this.target(m);
      if (Math.hypot(pos.x - t.x, pos.z - t.z) < m.radius && (!m.needVehicle || inVehicle)) {
        this.playLines(m.arrive, "arrive");
      }
    }
    this.updateDelivery(step, pos);
  }

  updateDelivery(step, pos) {
    const s = this.state;
    const d = this.delivery;
    if (s.flags.deliveryDone || this.done < 2) return;
    const shop = this.city.shopPos;
    if (d.stage === "idle") {
      if (Math.hypot(pos.x - shop.x, pos.z - shop.z) < 4) {
        d.stage = "carry";
        d.t = DELIVERY.time;
        d.shown = -1;
        s.setObjective(`Deliver the parcel to ${DELIVERY.name} — ${DELIVERY.time}s`, DELIVERY.x, DELIVERY.z, true);
        s.say("Parcel picked up! 90 seconds — go!");
      }
      return;
    }
    d.t -= step;
    const left = Math.ceil(d.t);
    if (left !== d.shown) {
      d.shown = left;
      s.setObjective(`Deliver the parcel to ${DELIVERY.name} — ${left}s`, DELIVERY.x, DELIVERY.z, true);
    }
    if (d.t <= 0) {
      d.stage = "idle";
      s.say("Delivery late — back to Coral Scoops to try again.");
      this.restoreObjective();
      return;
    }
    if (Math.hypot(pos.x - DELIVERY.x, pos.z - DELIVERY.z) < 5) {
      d.stage = "idle";
      const reward = Math.round(DELIVERY.reward * (1 + 0.05 * (s.stats.charisma - 1)));
      s.addMoney(reward);
      s.addXp(60);
      s.gainStat("driving", 20);
      s.counters.deliveries += 1;
      s.flags.deliveryDone = true;
      this.save();
      s.say(`Delivered! +$${reward}`);
      this.restoreObjective();
    }
  }
}
