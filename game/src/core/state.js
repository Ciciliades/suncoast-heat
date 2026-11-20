// Run state: one object every system reads and writes. Modes drive
// menus, HUD, and the loop; toJSON/fromJSON feed the save system (M5).
export const MODES = ["title", "play", "pause", "settings", "results", "dialogue", "dead", "busted"];

const XP_STEPS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

export function createState() {
  const state = {
    mode: "title",
    health: 100,
    maxHealth: 100,
    armor: 0,
    maxArmor: 100,
    money: 120,
    wanted: 0,
    xp: 0,
    level: 1,
    stats: { health: 1, stamina: 1, driving: 1, shooting: 1, charisma: 1 },
    statXp: { health: 0, stamina: 0, driving: 0, shooting: 0, charisma: 0 },
    weapon: null,
    ammo: {},
    objective: { text: "Welcome to Suncoast", x: 0, z: 0, hasTarget: false },
    timeOfDay: 17.4,
    flags: {},
    counters: { missions: 0, deliveries: 0, arrests: 0 },
    settings: { volume: 0.7, quality: "high", sensitivity: 1 },
    inVehicle: false,
    speed: 0,
    prompt: "",
    notify: "",
    notifyUntil: 0,
  };

  state.setMode = (mode) => {
    if (!MODES.includes(mode)) return;
    state.mode = mode;
  };
  state.reset = () => {
    const fresh = createState();
    // Keep the original methods: fresh's close over the fresh object,
    // so copying them would make setMode/setObjective/etc. write to a
    // discarded object instead of this state.
    const keep = {};
    for (const k of ["setMode", "reset", "addMoney", "addXp", "gainStat", "damage", "heal", "setWanted", "setObjective", "say", "toJSON", "fromJSON"]) keep[k] = state[k];
    Object.assign(state, fresh, keep, { settings: state.settings, mode: "play" });
  };
  state.addMoney = (n) => {
    state.money = Math.max(0, state.money + n);
  };
  state.addXp = (n) => {
    state.xp += n;
    while (state.level < XP_STEPS.length && state.xp >= XP_STEPS[state.level]) {
      state.level += 1;
      state.maxHealth += 10;
      state.health = Math.min(state.maxHealth, state.health + 25);
      state.say(`Level up! Level ${state.level}`);
    }
  };
  state.gainStat = (name, n) => {
    state.statXp[name] += n;
    while (state.statXp[name] >= 100) {
      state.statXp[name] -= 100;
      state.stats[name] += 1;
      if (name === "health") state.maxHealth += 5;
      state.say(`${name[0].toUpperCase() + name.slice(1)} level ${state.stats[name]}!`);
    }
  };
  state.damage = (n) => {
    const absorbed = Math.min(state.armor, n * 0.6);
    state.armor -= absorbed;
    state.health = Math.max(0, state.health - (n - absorbed));
    if (state.health <= 0) state.setMode("dead");
  };
  state.heal = (n) => {
    state.health = Math.min(state.maxHealth, state.health + n);
  };
  state.setWanted = (n) => {
    state.wanted = Math.max(0, Math.min(5, Math.round(n)));
  };
  state.setObjective = (text, x = 0, z = 0, hasTarget = false) => {
    state.objective = { text, x, z, hasTarget };
  };
  state.say = (text) => {
    state.notify = text;
    state.notifyUntil = performance.now() + 3600;
  };
  state.toJSON = () => ({
    health: state.health,
    maxHealth: state.maxHealth,
    armor: state.armor,
    money: state.money,
    xp: state.xp,
    level: state.level,
    stats: state.stats,
    statXp: state.statXp,
    weapon: state.weapon,
    ammo: state.ammo,
    timeOfDay: state.timeOfDay,
    flags: state.flags,
    counters: state.counters,
    objective: state.objective,
  });
  state.fromJSON = (data) => {
    Object.assign(state, data, { mode: "play", wanted: 0, inVehicle: false, speed: 0 });
  };
  return state;
}
