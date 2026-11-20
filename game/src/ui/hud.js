// HUD: health/armor bars, cash, wanted stars, objective, prompt,
// speedometer, ammo, notifications, and the damage vignette. DOM writes
// happen only when a value actually changes.
function el(id) {
  return document.getElementById(id) || { style: {}, textContent: "" };
}

export class Hud {
  constructor() {
    this.healthFill = el("healthfill");
    this.armorFill = el("armorfill");
    this.armorBar = el("armorbar");
    this.cash = el("cash");
    this.stars = el("stars");
    this.objective = el("objective");
    this.prompt = el("prompt");
    this.speed = el("speed");
    this.ammo = el("ammo");
    this.notify = el("notify");
    this.vignette = el("vignette");
    this.dmgdir = el("dmgdir");
    this.last = {};
    this.flash = 0;
    this.dmgT = 0;
  }

  set(key, value, apply) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    apply(value);
  }

  damageFlash(amount) {
    this.flash = Math.min(0.85, this.flash + amount);
  }

  damageFrom(from, pos, camYaw) {
    const rel = Math.atan2(from.x - pos.x, from.z - pos.z) - camYaw;
    this.dmgdir.textContent = "▲";
    this.dmgdir.style.transform = `rotate(${rel}rad)`;
    this.dmgdir.style.opacity = "1";
    this.dmgT = 0.7;
  }

  update(state, dt) {
    document.body.classList.toggle("title", state.mode === "title");
    const hp = Math.max(0, state.health / state.maxHealth);
    this.set("hp", hp.toFixed(3), () => {
      this.healthFill.style.width = `${hp * 100}%`;
      this.healthFill.style.background = hp < 0.3 ? "#ff5a4e" : hp < 0.6 ? "#ffc857" : "#7ed957";
    });
    const ar = Math.max(0, state.armor / state.maxArmor);
    this.set("ar", ar.toFixed(3), () => {
      this.armorFill.style.width = `${ar * 100}%`;
      this.armorBar.style.display = state.armor > 0 ? "block" : "none";
    });
    this.set("cash", state.money, () => {
      this.cash.textContent = `$${state.money.toLocaleString("en-US")}`;
    });
    this.set("stars", state.wanted, () => {
      this.stars.textContent = "★".repeat(state.wanted) + "☆".repeat(5 - state.wanted);
      this.stars.style.opacity = state.wanted > 0 ? "1" : "0.35";
    });
    this.set("obj", state.objective.text, () => {
      this.objective.textContent = state.objective.text;
    });
    const promptText = state.prompt || "";
    this.set("prompt", promptText, () => {
      this.prompt.textContent = promptText;
      this.prompt.classList.toggle("show", promptText.length > 0);
    });
    this.set("speed", state.inVehicle ? Math.round(state.speed) : -1, (v) => {
      this.speed.style.display = v >= 0 ? "block" : "none";
      if (v >= 0) this.speed.textContent = String(v);
      this.speed.style.color = v > 110 ? "#ff5a4e" : v > 80 ? "#ffc857" : "";
    });
    const w = state.weapon;
    const a = w && state.ammo[w];
    const ammoText = !w ? "" : a ? `${w.toUpperCase()} ${a.mag}/${a.reserve}` : `${w.toUpperCase()} —`;
    this.set("ammo", ammoText, () => {
      this.ammo.textContent = ammoText;
      this.ammo.style.display = ammoText ? "block" : "none";
    });
    const showNotify = state.notify && performance.now() < state.notifyUntil;
    this.set("notify", showNotify ? state.notify : "", (v) => {
      this.notify.textContent = v;
      this.notify.classList.toggle("show", v.length > 0);
    });
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 1.4);
      this.vignette.style.opacity = String(this.flash);
    }
    if (this.dmgT > 0) {
      this.dmgT -= dt;
      if (this.dmgT <= 0) this.dmgdir.style.opacity = "0";
    }
  }
}
