// Menu wiring: start / continue / pause / quit callbacks, kept in one
// module so the bootstrap stays under the line cap.
import { SAVE_KEY } from "../config.js";
import { Menus } from "./menus.js";

export function createMenus(state, ctx) {
  const menus = new Menus(state, {
    onStart: () => {
      state.reset();
      menus.hideAll();
      ctx.playSetup();
      ctx.missions?.startNext();
      ctx.input.endFrame();
      if (state.mode === "play") ctx.input.lockPointer();
    },
    onContinue: () => {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
        if (saved) state.fromJSON(saved);
        menus.hideAll();
        ctx.playSetup();
        ctx.missions?.startNext();
        ctx.input.endFrame();
        if (state.mode === "play") ctx.input.lockPointer();
      } catch {
        state.say("Save could not be read.");
      }
    },
    onResume: () => {
      state.setMode("play");
      menus.hideAll();
      ctx.input.endFrame();
      ctx.input.lockPointer();
    },
    onQuit: () => {
      ctx.missions?.save();
      ctx.exitVehicle();
      ctx.police.standDown();
      state.setMode("title");
      menus.show("title");
      ctx.orbitVista();
    },
    onQuality: (q) => ctx.world.setQuality(q),
    onResultsClose: () => {
      if (ctx.missions?.hasNext()) {
        state.setMode("play");
        menus.hideAll();
        ctx.missions.startNext();
        ctx.input.endFrame();
        if (state.mode === "play") ctx.input.lockPointer();
        return;
      }
      state.setMode("title");
      menus.show("title");
      ctx.orbitVista();
    },
  });
  return menus;
}
