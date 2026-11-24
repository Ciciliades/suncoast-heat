// Suncoast Heat bootstrap: renderer, full city, player, vehicles,
// traffic, pedestrians, minimap, menus, and HUD wiring. ?shot=chase,
// drive, foot, or title stages a deterministic screenshot setup.
import { Vector3 } from "three";
import { TUNING } from "./config.js";
import { createWorldRenderer } from "./render/renderer.js";
import { createLoop } from "./core/loop.js";
import { Input } from "./core/input.js";
import { FollowCamera } from "./core/camera.js";
import { createState } from "./core/state.js";
import { buildCity, updateCity } from "./world/districts.js";
import { updateWorld } from "./world/city.js";
import { Hud } from "./ui/hud.js";
import { createMenus } from "./ui/menu-wiring.js";
import { Minimap } from "./ui/minimap.js";
import { Player } from "./entities/player.js";
import { spawnParked, nearestVehicle } from "./entities/vehicles.js";
import { Traffic } from "./entities/traffic.js";
import { Pedestrians } from "./entities/pedestrians.js";
import { Police } from "./entities/police.js";
import { WantedSystem } from "./systems/wanted.js";
import { Dust } from "./systems/dust.js";
import { Combat } from "./systems/combat.js";
import { Missions } from "./systems/missions.js";
import { AudioSys } from "./systems/audio.js";

const SHOT = new URLSearchParams(location.search).get("shot");
const SHOT_MODE = ["chase", "chase2", "drive", "foot", "title"].includes(SHOT);
const stage = document.getElementById("stage");

function angDiff(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function start() {
  let world;
  try {
    world = createWorldRenderer(stage);
  } catch {
    document.getElementById("fallback").hidden = false;
    return;
  }
  const state = createState();
  const input = new Input(world.renderer.domElement);
  input.attach();
  const camera = new FollowCamera(world.camera);
  camera.distance = 8.5;
  const hud = new Hud();
  // HUD+ (display only): mission banner, clock, respect. Built here so the
  // only changed file stays main.js; reads state, writes no game logic.
  const PANEL = "position:fixed;z-index:8;pointer-events:none;background:rgba(10,18,32,.85);border:1px solid rgba(255,247,232,.28);border-radius:12px;color:#fff7e8;font-family:system-ui,sans-serif;";
  function hudBox(css) { const d = document.createElement("div"); d.style.cssText = PANEL + css; d.style.display = "none"; document.body.appendChild(d); return d; }
  function hudLine(parent, css) { const d = document.createElement("div"); d.style.cssText = css; parent.appendChild(d); return d; }
  const banner = hudBox("top:14px;left:50%;transform:translateX(-50%);padding:10px 20px;text-align:center;max-width:620px;");
  const bTitle = hudLine(banner, "font-weight:800;font-size:17px;letter-spacing:2px;color:#ffc857;");
  const bObj = hudLine(banner, "font-weight:600;font-size:15px;margin-top:3px;");
  const bSub = hudLine(banner, "font-size:12px;opacity:.85;margin-top:3px;letter-spacing:1px;");
  const clockEl = hudBox("top:48px;right:18px;padding:8px 12px;font-weight:800;font-size:15px;letter-spacing:1px;");
  const respectEl = hudBox("top:96px;right:18px;padding:8px 12px;");
  const rMain = hudLine(respectEl, "font-weight:800;font-size:14px;letter-spacing:1px;");
  const rSub = hudLine(respectEl, "font-size:12px;opacity:.85;margin-top:2px;");
  const RANKS = ["ROOKIE", "HUSTLER", "RUNNER", "ENFORCER", "BOSS", "KINGPIN"];
  const XP_NEXT = [100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  function missionInfo(text) {
    if (text.includes("Meet Theo")) return { n: 1, title: "HOMECOMING" };
    if (text.includes("sports car")) return { n: 2, title: "THE KROLL JOB" };
    if (text.includes("Suncoast Pier")) return { n: 3, title: "HEAT ON THE BOULEVARD" };
    if (text.includes("Marina")) return { n: 2, title: "THE KROLL JOB" };
    if (text.includes("Deliver the parcel")) return { n: 0, title: "COURIER JOB" };
    if (text.includes("Suncoast is yours") || text.includes("Welcome to Suncoast")) return null;
    return state.objective.hasTarget ? { n: 0, title: "MISSION" } : null;
  }
  const oldObjective = document.getElementById("objective");
  const hudCache = {};
  function setText(elm, key, value) { if (hudCache[key] !== value) { hudCache[key] = value; elm.textContent = value; } }
  function updateMissionHud() {
    const show = state.mode === "play" || state.mode === "dialogue";
    const info = show ? missionInfo(state.objective.text) : null;
    banner.style.display = info ? "block" : "none";
    if (oldObjective) oldObjective.style.display = info ? "none" : "";
    clockEl.style.display = show ? "block" : "none";
    respectEl.style.display = show ? "block" : "none";
    if (!show) return;
    const h = Math.floor(state.timeOfDay);
    let m = Math.round((state.timeOfDay - h) * 60);
    const hh = m === 60 ? h + 1 : h; if (m === 60) m = 0;
    setText(clockEl, "clock", `DAY 1  ·  ${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    const lv = state.level;
    const next = XP_NEXT[lv - 1] || XP_NEXT[XP_NEXT.length - 1];
    setText(rMain, "rMain", `RESPECT  ·  LV ${lv} ${RANKS[Math.min(lv - 1, RANKS.length - 1)]}`);
    setText(rSub, "rSub", `XP ${state.xp} / ${next}`);
    if (!info) return;
    setText(bTitle, "bTitle", info.n ? `MISSION ${info.n}/3  ·  ${info.title}` : info.title);
    setText(bObj, "bObj", state.objective.text);
    let sub = "";
    const tm = state.objective.text.match(/(\d+)s/);
    if (tm) sub = `TIME LEFT ${tm[1]}s  ·  PLAZA DEL SOL`;
    else if (state.objective.hasTarget) {
      const d = Math.round(Math.hypot(focus.x - state.objective.x, focus.z - state.objective.z));
      sub = `CHECKPOINT  ·  ${d}m AWAY`;
    }
    setText(bSub, "bSub", sub);
    bSub.style.display = sub ? "block" : "none";
  }
  const focus = new Vector3(0, 0, 70);
  const city = buildCity(world.scene);
  const minimap = new Minimap(document.getElementById("minimap"), city.roadSegments);
  const player = new Player(world.scene, 0, 76);
  const vehicles = spawnParked(world.scene, city.parkSpots);
  const traffic = new Traffic(world.scene, city.trafficLoops, 4, () => wantedSys.commitCrime(1));
  const peds = new Pedestrians(world.scene, city.pedLoops, 24);
  const police = new Police(world.scene, state, camera);
  const wantedSys = new WantedSystem(state, police);
  const dust = new Dust(world.scene);
  const audio = new AudioSys();
  window.addEventListener("pointerdown", () => audio.unlock());
  window.addEventListener("keydown", () => audio.unlock());
  window.addEventListener("click", (e) => { if (e.target.closest("button")) audio.click(); });
  const combat = new Combat(world.scene, state, input, player, hud, city, audio);
  let currentVehicle = null;
  let autopilot = null;
  let yawBias = 0;

  function orbitVista() {
    camera.mode = "orbit";
    camera.center.set(0, 3, 70);
    camera.orbitRadius = 45;
    camera.orbitHeight = 20;
    camera.orbitAngle = 0.3;
  }

  function enterVehicle(v) {
    if (!v.owned && !v.stolen) {
      v.stolen = true;
      state.setWanted(state.wanted + (v.type === "police" ? 2 : 1));
      state.say("Car stolen! The Bay Police noticed.");
    }
    v.parked = false;
    v.driver = "player";
    currentVehicle = v;
    state.inVehicle = true;
    state.prompt = "";
    player.group.visible = false;
    camera.mode = "chase";
    camera.yaw = v.heading;
    camera.setTarget(v.group, 1.7);
    camera.snap();
  }

  function exitVehicle() {
    const v = currentVehicle;
    if (!v) return;
    const p = v.group.position;
    player.group.position.set(p.x - Math.cos(v.heading) * 2.4, 0, p.z + Math.sin(v.heading) * 2.4);
    player.group.visible = true;
    player.heading = v.heading;
    player.speed = 0;
    v.driver = null;
    v.parked = true;
    v.speed = 0;
    v.vx = 0;
    v.vz = 0;
    currentVehicle = null;
    state.inVehicle = false;
    camera.mode = "follow";
    camera.yaw = player.heading;
    camera.setTarget(player.group, 1.7);
    camera.snap();
  }

  function playSetup() {
    camera.mode = "follow";
    camera.setTarget(player.group, 1.7);
    camera.yaw = player.heading;
    camera.snap();
    world.setTimeOfDay(state.timeOfDay);
  }

  const ctx = { city, world, police, playSetup, orbitVista, exitVehicle, input };
  const menus = createMenus(state, ctx);
  const missions = new Missions(state, city, menus);
  ctx.missions = missions;

  orbitVista();
  if (SHOT === "chase" || SHOT === "chase2" || SHOT === "drive") {
    const pick = SHOT === "drive" ? vehicles[0] : vehicles.find((v) => v.type === "sports");
    pick.group.position.set(SHOT === "drive" ? -30 : -20, 0, SHOT === "chase" ? 97 : 70);
    pick.heading = Math.PI / 2;
    pick.group.rotation.y = Math.PI / 2;
    state.setMode("play");
    menus.hideAll();
    enterVehicle(pick);
    pick.speed = SHOT === "drive" ? 12 : 18;
    world.setTimeOfDay(18.5);
    state.setWanted(SHOT === "drive" ? 3 : 2);
    state.setObjective("Lose the heat — reach the Marina", 107, 52, true);
    autopilot = { laneZ: SHOT === "chase" ? 97 : 70, target: SHOT === "drive" ? 18 : 26 };
    peds.stageChase(SHOT);
    police.engageStaged(pick);
    if (SHOT === "chase" || SHOT === "chase2") {
      camera.distance = SHOT === "chase2" ? 16 : 17;
      camera.pitch = SHOT === "chase2" ? 0.65 : 0.4; yawBias = SHOT === "chase2" ? -0.3 : -0.7; camera.fovFixed = SHOT === "chase2" ? 70 : 68;
      camera.snap();
    }
    if (SHOT === "drive") { state.weapon = "pistol"; camera.distance = 13; camera.pitch = 0.38; camera.fovFixed = 68; yawBias = -0.35; peds.stageChase("chase2"); for (const c of traffic.cars) if (c.loop === city.trafficLoops[0]) { c.dist += c.total / 4; traffic.place(c); } wantedSys.crimeCd = 10; }
  } else if (SHOT === "foot") {
    player.group.position.set(city.shopPos.x, 0, 56);
    player.heading = 0;
    state.setMode("play");
    menus.hideAll();
    state.setObjective("Meet Theo at Coral Scoops", city.shopPos.x, city.shopPos.z, true);
    world.setTimeOfDay(17.4);
    camera.distance = 16;
    camera.fovFixed = 70;
    camera.pitch = 0.35;
    playSetup();
    camera.yaw = 3.34;
    camera.snap();
    for (const [i, x] of [[1, -24], [5, -18], [9, 2]]) { const q = peds.peds[i]; q.group.position.set(x, 0, 58.8); q.seg = 1; q.dir = 1; q.heading = Math.PI / 2; q.pause = 0; }
  } else if (SHOT === "title") {
    player.group.position.set(20, 0, 79);
    player.heading = 1.57;
    state.setMode("play");
    menus.hideAll();
    state.setObjective("Reach Suncoast Pier", 0, 78, true);
    state.setWanted(1);
    state.weapon = "pistol";
    state.damage(38);
    combat.gang.members[0].group.position.set(22, 0, 79);
    world.setTimeOfDay(17.4);
    camera.distance = 7;
    camera.pitch = 0.22;
    playSetup();
    camera.yaw = Math.PI;
    camera.snap();
  } else {
    menus.show("title");
    world.setTimeOfDay(state.timeOfDay);
  }

  world.renderer.domElement.addEventListener("click", () => {
    if (state.mode === "play") input.lockPointer();
  });
  window.addEventListener("resize", () => world.resize());

  let lastHour = state.timeOfDay;
  let rendered = 0;
  const loop = createLoop({
    update: (step, elapsed) => {
      const animT = elapsed;
      if (state.mode === "play" && !SHOT_MODE) {
        state.timeOfDay = (state.timeOfDay + step * TUNING.timeRate) % 24;
        if (Math.abs(state.timeOfDay - lastHour) > 0.02) {
          lastHour = state.timeOfDay;
          world.setTimeOfDay(state.timeOfDay);
        }
      }
      if ((input.wasPressed("Escape") || input.wasPressed("KeyP")) && !SHOT_MODE) {
        if (state.mode === "play") {
          state.setMode("pause");
          menus.show("pause");
          document.exitPointerLock?.();
        } else if (state.mode === "pause") {
          state.setMode("play");
          menus.hideAll();
          input.lockPointer();
        }
      }
      if (state.mode === "dialogue" && (input.wasPressed("KeyE") || input.clicked)) {
        missions.advance();
        if (state.mode === "play") input.lockPointer();
        input.endFrame();
      }
      const simActive = state.mode === "play";
      const ambient = simActive || state.mode === "title";
      if (simActive) {
        if (currentVehicle) {
          const v = currentVehicle;
          let controls;
          if (autopilot) {
            const p = v.group.position;
            const want = Math.PI / 2 + Math.max(-0.4, Math.min(0.4, (autopilot.laneZ - p.z) * 0.08));
            controls = {
              throttle: v.speed < autopilot.target ? 1 : 0,
              brake: v.speed > autopilot.target + 2 ? 1 : 0,
              steer: Math.max(-1, Math.min(1, angDiff(want - v.heading) * 1.8)),
            };
          } else {
            const w = input.isDown("KeyW");
            const s = input.isDown("KeyS");
            controls = {
              throttle: w ? 1 : s && v.speed <= 0.5 ? -1 : 0,
              brake: input.isDown("Space") || (s && v.speed > 0.5) ? 1 : 0,
              steer: (input.isDown("KeyA") ? 1 : 0) - (input.isDown("KeyD") ? 1 : 0),
            };
            if (input.wasPressed("KeyH")) { v.honk(); audio.horn(v.spec.horn); }
          }
          if (input.wasPressed("KeyE")) exitVehicle();
          else {
            v.update(step, controls, city.colliders, city.blocked, city.walkable, animT, 1 + 0.02 * (state.stats.driving - 1));
            if (Math.abs(v.speed) * 3.6 > 80) state.gainStat("driving", step * 2);
            state.speed = Math.abs(v.speed) * 3.6;
            state.prompt = Math.abs(v.speed) < 2 && !autopilot ? "E — Get out" : "";
            focus.copy(v.group.position);
            if (Math.abs(v.speed) > 2) {
              camera.yaw += angDiff(v.heading + yawBias - camera.yaw) * Math.min(1, step * 2.5);
            }
          }
        } else {
          player.update(step, input, camera.yaw, city.colliders, city.blocked, city.walkable);
          player.runMul = 1 + 0.04 * (state.stats.stamina - 1);
          if (input.isDown("ShiftLeft") && player.speed > 1) state.gainStat("stamina", step * 2);
          state.speed = player.speed;
          focus.copy(player.group.position);
          const near = nearestVehicle(vehicles.filter((v) => v.parked), player.group.position.x, player.group.position.z, TUNING.interactRange);
          state.prompt = near ? (near.owned ? "E — Drive your car" : "E — Steal car") : "";
          if (near && input.wasPressed("KeyE")) enterVehicle(near);
        }
      } else if (state.mode === "title") {
        focus.set(0, 0, 70);
      }
      if (ambient) {
        traffic.update(step, city.colliders, city.blocked, city.walkable, animT, currentVehicle, state.wanted);
        peds.update(step, focus, state.wanted > 0 || state.speed > 12);
        updateCity(animT);
      }
      if (simActive) {
        wantedSys.update(step, currentVehicle || player);
        police.update(step, currentVehicle || player, !!currentVehicle, wantedSys, city, animT);
        audio.update(currentVehicle, police.units.some((u) => u.mode === "pursuit"), elapsed);
        dust.update(step, currentVehicle);
        combat.update(step, !!currentVehicle, camera.yaw);
        missions.update(step, focus, !!currentVehicle);
      }
      if (state.mode === "play" || state.mode === "title") {
        camera.sensScale = state.settings.sensitivity;
        const fixedAngle = SHOT === "title" ? 0.3 : undefined;
        camera.update(step, simActive ? input : null, state.speed, city.occluders, fixedAngle);
      }
      world.update(animT, focus);
      updateWorld(world.daylight);
      if (simActive) {
        const wp = state.objective.hasTarget ? { x: state.objective.x, z: state.objective.z } : null;
        const heading = currentVehicle ? currentVehicle.heading : player.heading;
        const marks = police.units.filter((u) => u.mode !== "off").map((u) => ({ x: u.car.group.position.x, z: u.car.group.position.z, color: u.mode === "pursuit" || u.mode === "search" ? "#ff3b30" : "#4a90d8", r: 5 }));
        minimap.draw(focus.x, focus.z, heading, wp, animT, marks);
      }
      hud.update(state, step);
      updateMissionHud();
      input.endFrame();
    },
    render: () => {
      world.render();
      rendered += 1;
      if (rendered === 3) {
        window.__suncoastReady = true;
        window.__suncoast = { state, version: "M6", player, vehicles, camera, police, wantedSys, loop, combat, missions, audio };
      }
    },
  });
  loop.start();
}

start();
