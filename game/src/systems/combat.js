// Combat: data-driven weapons, hitscan + melee, ammo and reload, and
// the gang-member fights. On foot only; driving disables attacks.
import { Gang } from "../entities/gang.js";
import { Pickups } from "../entities/pickups.js";

export const WEAPONS = {
  fists: { name: "FISTS", damage: 12, rate: 0.45, range: 2.4, mag: Infinity, auto: false },
  pistol: { name: "PISTOL", damage: 18, rate: 0.32, range: 45, mag: 12, reserve: 48, auto: false },
  smg: { name: "SMG", damage: 9, rate: 0.09, range: 35, mag: 30, reserve: 90, auto: true },
};

const SWITCH_KEYS = { Digit1: "fists", Digit2: "pistol", Digit3: "smg" };

export class Combat {
  constructor(scene, state, input, player, hud, city, audio) {
    this.state = state;
    this.input = input;
    this.player = player;
    this.hud = hud;
    this.audio = audio;
    this.owned = ["fists", "pistol"];
    this.ensureLoadout();
    this.cool = 0;
    this.reloadT = 0;
    this.pickups = new Pickups(scene, city);
    this.gang = new Gang(scene, city, {
      onDeath: (m) => {
        state.addMoney(25);
        state.addXp(15);
        state.gainStat("shooting", 10);
        state.say("Gang member down! +$25");
        this.pickups.spawnAt(m.group.position, "ammo");
      },
      onAttack: (dmg, from) => this.hurtPlayer(dmg, from),
    });
  }

  ensureLoadout() {
    const s = this.state;
    if (!s.weapon) s.weapon = "fists";
    if (!s.ammo.pistol) s.ammo.pistol = { mag: 12, reserve: 48 };
    if (!s.ammo.smg) s.ammo.smg = { mag: 30, reserve: 90 };
  }

  giveWeapon(id) {
    if (this.owned.includes(id)) return;
    this.owned.push(id);
    this.state.weapon = id;
    this.state.say(`${WEAPONS[id].name} picked up!`);
  }

  hurtPlayer(dmg, from) {
    const s = this.state;
    s.damage(dmg);
    this.hud.damageFlash(0.5);
    this.hud.damageFrom(from, this.player.group.position, this.lastYaw || 0);
  }

  reload() {
    const s = this.state;
    const w = WEAPONS[s.weapon];
    if (!w || !Number.isFinite(w.mag) || this.reloadT > 0) return;
    const a = s.ammo[s.weapon];
    if (!a || a.mag >= w.mag || a.reserve <= 0) return;
    this.reloadT = 1.1;
  }

  finishReload() {
    const s = this.state;
    const w = WEAPONS[s.weapon];
    const a = s.ammo[s.weapon];
    if (!w || !a) return;
    const take = Math.min(w.mag - a.mag, a.reserve);
    a.mag += take;
    a.reserve -= take;
  }

  attack(camYaw) {
    const s = this.state;
    const w = WEAPONS[s.weapon];
    if (!w || this.cool > 0 || this.reloadT > 0) return;
    if (Number.isFinite(w.mag)) {
      const a = s.ammo[s.weapon];
      if (!a || a.mag <= 0) {
        s.say("Out of ammo — R to reload");
        this.cool = 0.3;
        return;
      }
      a.mag -= 1;
    }
    if (Number.isFinite(w.mag)) this.audio?.shot();
    this.cool = w.rate;
    const p = this.player.group.position;
    const dx = Math.sin(camYaw);
    const dz = Math.cos(camYaw);
    let best = null;
    let bestD = Infinity;
    for (const m of this.gang.members) {
      if (!m.alive) continue;
      const q = m.group.position;
      const tx = q.x - p.x;
      const tz = q.z - p.z;
      const d = Math.hypot(tx, tz);
      if (d > w.range || d >= bestD) continue;
      if (d > 2.5 && (tx * dx + tz * dz) / d < 0.94) continue;
      best = m;
      bestD = d;
    }
    if (best) this.gang.damage(best, w.damage * (1 + 0.05 * (s.stats.shooting - 1)));
  }

  update(step, inVehicle, camYaw) {
    this.lastYaw = camYaw;
    const s = this.state;
    this.ensureLoadout();
    this.gang.update(step, this.player, inVehicle);
    this.pickups.update(step, this.player.group.position, s, this);
    this.cool = Math.max(0, this.cool - step);
    if (this.reloadT > 0) {
      this.reloadT -= step;
      if (this.reloadT <= 0) this.finishReload();
    }
    if (inVehicle) return;
    for (const key of Object.keys(SWITCH_KEYS)) {
      if (this.input.wasPressed(key) && this.owned.includes(SWITCH_KEYS[key])) {
        s.weapon = SWITCH_KEYS[key];
        this.reloadT = 0;
      }
    }
    if (this.input.wasPressed("KeyR")) this.reload();
    const w = WEAPONS[s.weapon];
    if (!w) return;
    const trigger = w.auto
      ? this.input.isDown("Mouse0") || this.input.isDown("KeyF")
      : this.input.clicked || this.input.wasPressed("KeyF");
    if (trigger) this.attack(camYaw);
  }
}
