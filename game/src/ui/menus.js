// Menus: title (Start / Continue / Settings), pause, settings, and
// results overlays. Continue stays disabled until a save exists (M5).
import { SAVE_KEY } from "../config.js";

export class Menus {
  constructor(state, hooks) {
    this.state = state;
    this.hooks = hooks;
    this.returnTo = "title";
    this.panels = {
      title: document.getElementById("titleMenu"),
      pause: document.getElementById("pauseMenu"),
      settings: document.getElementById("settingsMenu"),
      results: document.getElementById("resultsMenu"),
    };
    this.bind("btnStart", () => hooks.onStart());
    this.bind("btnContinue", () => hooks.onContinue());
    this.bind("btnTitleSettings", () => this.show("settings", "title"));
    this.bind("btnResume", () => hooks.onResume());
    this.bind("btnPauseSettings", () => this.show("settings", "pause"));
    this.bind("btnQuitTitle", () => hooks.onQuit());
    this.bind("btnSettingsBack", () => this.show(this.returnTo, this.returnTo));
    this.bind("btnResultsClose", () => hooks.onResultsClose());
    const volume = document.getElementById("optVolume");
    if (volume) {
      volume.value = String(state.settings.volume);
      volume.addEventListener("input", () => {
        state.settings.volume = Number(volume.value);
      });
    }
    const quality = document.getElementById("optQuality");
    if (quality) {
      quality.value = state.settings.quality;
      quality.addEventListener("change", () => {
        state.settings.quality = quality.value;
        hooks.onQuality(quality.value);
      });
    }
    const sens = document.getElementById("optSens");
    if (sens) {
      sens.value = String(state.settings.sensitivity);
      sens.addEventListener("input", () => {
        state.settings.sensitivity = Number(sens.value);
      });
    }
  }

  bind(id, fn) {
    const button = document.getElementById(id);
    if (button) button.addEventListener("click", fn);
  }

  refresh() {
    const cont = document.getElementById("btnContinue");
    if (cont) {
      const hasSave = localStorage.getItem(SAVE_KEY) !== null;
      cont.disabled = !hasSave;
      cont.textContent = hasSave ? "Continue" : "Continue (no save yet)";
    }
  }

  show(name, from) {
    if (from) this.returnTo = from;
    document.exitPointerLock?.();
    for (const [key, panel] of Object.entries(this.panels)) {
      if (panel) panel.classList.toggle("show", key === name);
    }
    if (name === "title") this.refresh();
  }

  hideAll() {
    for (const panel of Object.values(this.panels)) {
      if (panel) panel.classList.remove("show");
    }
  }

  showResults(title, rows) {
    const heading = document.getElementById("resultsTitle");
    if (heading) heading.textContent = title;
    const list = document.getElementById("resultsRows");
    if (list) {
      list.innerHTML = "";
      for (const [label, value] of rows) {
        const row = document.createElement("div");
        row.className = "result-row";
        const a = document.createElement("span");
        a.textContent = label;
        const b = document.createElement("strong");
        b.textContent = value;
        row.append(a, b);
        list.appendChild(row);
      }
    }
    this.show("results");
  }
}
