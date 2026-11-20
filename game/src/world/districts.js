// Suncoast city assembly: ground, roads, districts, props, loops.
import * as THREE from "three";
import { BUILDING_TINTS, SHOP_SIGNS } from "../config.js";
import { mulberry32, pick } from "../core/random.js";
import { makeBuilding, flat, box, asphaltTexture, sandTexture, seaTexture, sidewalkTexture, signTexture } from "./city.js";
import { buildPalmField, buildBollardField, makeLamp, makeBench } from "./props.js";
import { buildLandmarks, updateLandmarks } from "./landmarks.js";

const ROADS_H = [-80, -40, 0, 40];
const ROADS_V = [-80, -40, 0, 40, 80];
const X_BANDS = [[-110, -85], [-75, -45], [-35, -5], [5, 35], [45, 75], [85, 94]];
const Z_BANDS = [[-105, -85], [-75, -45], [-35, -5], [5, 35], [45, 58]];
const TOWER_TINTS = [0x3a4a63, 0x2e3a52, 0x4a5a75, 0x546a8a];
const NEON_TINTS = [0x3a3a55, 0x2e2e45, 0x453a5e];

let animated = null;
let foam1 = null;
let foam2 = null;

function dashStrip(len) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff7e8";
  ctx.fillRect(0, 0, 40, 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(len / 6, 1);
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

function styleFor(cx, cz) {
  if (cz < -45 && cx > 45) return "neon";
  if (cz < -45 && cx >= -35 && cx <= 5) return "tower";
  if (cx < -75) return "oldtown";
  if (cz < -75) return "home";
  if (cx > 75) return "marina";
  return "beach";
}

export function buildCity(scene) {
  const rng = mulberry32(20261118);
  const colliders = [];
  const occluders = [];
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x6fbf5a, roughness: 1 });
  scene.add(flat(260, 195, grassMat, 0, -15, 0));
  const sandTex = sandTexture();
  sandTex.wrapS = THREE.RepeatWrapping;
  sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(20, 2);
  scene.add(flat(260, 26, new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }), 0, 91, 0.02));
  scene.add(flat(260, 4, new THREE.MeshStandardMaterial({ color: 0xd9b47e, roughness: 0.6 }), 0, 102, 0.03));
  const seaMat = new THREE.MeshStandardMaterial({ map: seaTexture(), roughness: 0.25, metalness: 0.08 });
  scene.add(flat(260, 160, seaMat, 0, 184, 0.04));
  scene.add(flat(22, 76, seaMat, 107, 66, 0.04));
  foam1 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
  foam2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  scene.add(flat(260, 1.8, foam1, 0, 103.5, 0.06));
  scene.add(flat(260, 1.2, foam2, 0, 112, 0.06));
  const walkTex = sidewalkTexture();
  walkTex.wrapS = THREE.RepeatWrapping;
  walkTex.wrapT = THREE.RepeatWrapping;
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.95 });
  const promTex = walkTex.clone();
  promTex.needsUpdate = true;
  promTex.repeat.set(30, 1);
  scene.add(flat(260, 4, walkMat, 0, 60, 0.08));
  scene.add(flat(260, 8, new THREE.MeshStandardMaterial({ map: promTex, roughness: 0.95 }), 0, 78, 0.08));

  const roadTex = asphaltTexture();
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffc857 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.9 });
  const roadSegments = [];
  function road(cx, cz, w, d, horizontal) {
    scene.add(flat(w, d, roadMat, cx, cz, 0.06));
    if (horizontal) {
      scene.add(flat(w, 0.28, yellowMat, cx, cz - 0.3, 0.09));
      scene.add(flat(w, 0.28, yellowMat, cx, cz + 0.3, 0.09));
      scene.add(flat(w, 0.3, dashStrip(w), cx, cz - d / 4, 0.09));
      scene.add(flat(w, 0.3, dashStrip(w), cx, cz + d / 4, 0.09));
      scene.add(box(w, 0.25, 0.3, curbMat, cx, 0.12, cz - d / 2 - 0.15, false));
      scene.add(box(w, 0.25, 0.3, curbMat, cx, 0.12, cz + d / 2 + 0.15, false));
      roadSegments.push({ x1: cx - w / 2, z1: cz, x2: cx + w / 2, z2: cz });
    } else {
      scene.add(flat(0.28, d, yellowMat, cx - 0.3, cz, 0.09));
      scene.add(flat(0.28, d, yellowMat, cx + 0.3, cz, 0.09));
      scene.add(flat(0.3, d, dashStrip(d), cx - d / 4, cz, 0.09));
      scene.add(flat(0.3, d, dashStrip(d), cx + d / 4, cz, 0.09));
      scene.add(box(0.3, 0.25, d, curbMat, cx - d / 2 - 0.15, 0.12, cz, false));
      scene.add(box(0.3, 0.25, d, curbMat, cx + d / 2 + 0.15, 0.12, cz, false));
      roadSegments.push({ x1: cx, z1: cz - d / 2, x2: cx, z2: cz + d / 2 });
    }
  }
  for (const z of ROADS_H) road(0, z, 260, 10, true);
  for (const x of ROADS_V) road(x, -15, 10, 190, false);
  road(0, 68, 260, 12, true);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xfff7e8 });
  for (const [cx, cz, horiz] of [[-40, 68, true], [0, 68, true], [40, 68, true], [-40, 0, false], [0, -40, false], [40, 40, false]]) {
    for (let i = 0; i < 6; i += 1) {
      if (horiz) scene.add(flat(0.7, 10, dashMat, cx - 4 + i * 1.6, cz, 0.09));
      else scene.add(flat(10, 0.7, dashMat, cx, cz - 4 + i * 1.6, 0.09));
    }
  }

  let shopPos = null;
  let signIdx = 0;
  for (const [x1, x2] of X_BANDS) {
    for (const [z1, z2] of Z_BANDS) {
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      if (cx > 45 && cz < -45 && cx < 75 && cz > -75) continue;
      if (cx < -85 && cz > 5 && cz < 35) continue;
      const slabTex = walkTex.clone();
      slabTex.needsUpdate = true;
      slabTex.repeat.set((x2 - x1) / 4, (z2 - z1) / 4);
      scene.add(flat(x2 - x1, z2 - z1, new THREE.MeshStandardMaterial({ map: slabTex, roughness: 0.95 }), cx, cz, 0.07));
      const style = styleFor(cx, cz);
      const lots = [[x1 + 6, z1 + 6], [x2 - 6, z1 + 6], [x1 + 6, z2 - 6], [x2 - 6, z2 - 6]];
      for (const [lx, lz] of lots) {
        if (rng() < 0.15) continue;
        const isShopLot = style === "beach" && shopPos === null && Math.abs(lx + 15) < 14 && Math.abs(lz - 50) < 6;
        const w = 9 + rng() * 3;
        const d = 9 + rng() * 3;
        let h = 7 + rng() * 5;
        let bstyle = "block";
        let tint = pick(rng, BUILDING_TINTS);
        if (style === "tower") { h = 24 + rng() * 18; bstyle = "tower"; tint = pick(rng, TOWER_TINTS); }
        if (style === "neon") { h = 10 + rng() * 9; bstyle = "neon"; tint = pick(rng, NEON_TINTS); }
        if (style === "home") { h = 5 + rng() * 4; bstyle = "home"; }
        if (style === "oldtown" || style === "marina" || style === "beach") { bstyle = rng() < 0.55 ? "shop" : "block"; }
        if (isShopLot) bstyle = "shop";
        const sign = (bstyle === "shop" || bstyle === "neon") ? SHOP_SIGNS[signIdx++ % SHOP_SIGNS.length] : "";
        const b = makeBuilding({ w, h, d, tint, style: bstyle, seed: Math.floor(rng() * 9999), sign, signBg: bstyle === "neon" ? "#1a0a2e" : "#12303f", signFg: bstyle === "neon" ? "#ff8fd8" : "#ffd9a0" });
        if (isShopLot) {
          b.children.forEach((c) => { if (c.material && c.material.map && c.geometry && c.geometry.parameters && c.geometry.parameters.height === 2) c.material.map = signTexture("Coral Scoops", "#12303f", "#ffd9a0"); });
          shopPos = { x: lx, z: lz + d / 2 + 2 };
        }
        b.position.set(lx, 0.07, lz);
        scene.add(b);
        occluders.push(b.children[0]);
        colliders.push({ x1: lx - w / 2, x2: lx + w / 2, z1: lz - d / 2, z2: lz + d / 2 });
      }
    }
  }
  if (!shopPos) shopPos = { x: -15, z: 52 };

  const woodMat = new THREE.MeshStandardMaterial({ color: 0xa9744f, roughness: 0.95 });
  const lm = buildLandmarks(scene, rng, roadSegments);
  colliders.push(...lm.colliders);
  occluders.push(...lm.occluders);
  animated = lm.animated;

  const palmSpots = [];
  for (let x = -124; x <= 124; x += 9) {
    palmSpots.push({ x, z: 60.6, s: 0.9 + rng() * 0.35, rot: rng() * 6.28, lean: 0.1 + rng() * 0.4, leanDir: rng() * 6.28, fronds: 6 + Math.floor(rng() * 3), tint: rng() });
    palmSpots.push({ x: x + 4.5, z: 77.2, s: 0.9 + rng() * 0.35, rot: rng() * 6.28, lean: 0.1 + rng() * 0.4, leanDir: rng() * 6.28, fronds: 6 + Math.floor(rng() * 3), tint: rng() });
  }
  for (let x = -118; x <= 118; x += 15) {
    if (Math.abs(x + 30) < 8) continue;
    palmSpots.push({ x, z: 88 + rng() * 4, s: 0.95 + rng() * 0.4, rot: rng() * 6.28, lean: 0.15 + rng() * 0.4, leanDir: rng() * 6.28, fronds: 6 + Math.floor(rng() * 3), tint: rng() });
  }
  for (let i = 0; i < 22; i += 1) {
    palmSpots.push({ x: -100 + rng() * 190, z: -100 + rng() * 150, s: 0.85 + rng() * 0.35, rot: rng() * 6.28, lean: 0.1 + rng() * 0.35, leanDir: rng() * 6.28, fronds: 6 + Math.floor(rng() * 3), tint: rng() });
  }
  scene.add(buildPalmField(palmSpots));
  for (const p of palmSpots) colliders.push({ x1: p.x - 0.5, x2: p.x + 0.5, z1: p.z - 0.5, z2: p.z + 0.5 });

  for (let x = -120; x <= 120; x += 18) {
    const lamp = makeLamp();
    lamp.position.set(x, 0, 61.4);
    scene.add(lamp);
    const lamp2 = makeLamp();
    lamp2.position.set(x + 9, 0, 79.6);
    lamp2.rotation.y = Math.PI;
    scene.add(lamp2);
  }
  for (let x = -112; x <= 112; x += 16) {
    const bench = makeBench();
    bench.position.set(x, 0.08, 80.4);
    scene.add(bench);
    colliders.push({ x1: x - 1, x2: x + 1, z1: 79.9, z2: 80.9 });
  }
  const bollards = [];
  for (const [cx, cz] of [[-40, 62], [0, 62], [40, 62], [-40, 74], [0, 74], [40, 74]]) {
    bollards.push([cx - 5, cz], [cx + 5, cz]);
  }
  bollards.push([-33.5, 82], [-26.5, 82]);
  scene.add(buildBollardField(bollards));
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2fae5f, roughness: 1 });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.95 });
  for (let x = -104; x <= 104; x += 20) {
    scene.add(box(1.7, 0.7, 1.7, planterMat, x, 0.42, 75.6));
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), bushMat);
    bush.position.set(x, 1.25, 75.6);
    bush.castShadow = true;
    scene.add(bush);
  }
  const umbrellaCols = [0xff5a4e, 0xffc857, 0x1fb6c9, 0xff8fd8];
  for (let i = 0; i < 10; i += 1) {
    const x = -108 + i * 24 + rng() * 6;
    const z = 86 + rng() * 6;
    if (Math.abs(x + 30) < 7) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), woodMat);
    pole.position.set(x, 1.2, z);
    scene.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.8, 10), new THREE.MeshStandardMaterial({ color: umbrellaCols[i % 4], roughness: 0.9 }));
    shade.position.set(x, 2.5, z);
    shade.castShadow = true;
    scene.add(shade);
    scene.add(box(1.9, 0.18, 0.7, new THREE.MeshStandardMaterial({ color: 0xfff7e8, roughness: 0.9 }), x + 1.8, 0.25, z + 0.6));
  }
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xfff7e8, roughness: 0.7 });
  for (const [bx, bz, rot] of [[101, 40, 0.2], [113, 58, -0.3], [100, 80, 0.1], [122, 116, 0.6], [60, 122, 0.3]]) {
    const boat = new THREE.Group();
    boat.add(box(2.2, 0.9, 5, hullMat, 0, 0.5, 0));
    boat.add(box(1.6, 0.9, 2, new THREE.MeshStandardMaterial({ color: 0x1fb6c9, roughness: 0.7 }), 0, 1.3, -0.5));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), woodMat);
    mast.position.set(0, 2.6, 0.8);
    boat.add(mast);
    boat.position.set(bx, 0, bz);
    boat.rotation.y = rot;
    scene.add(boat);
  }
  for (let z = 36; z <= 96; z += 15) {
    scene.add(box(4, 0.3, 8, woodMat, 94, 0.35, z, false));
  }
  const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0x2b3446, roughness: 0.7 });
  for (const [tx, tz] of [[-40, 0], [0, -40], [40, 40], [-80, -40]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.6, 6), lightPoleMat);
    pole.position.set(tx + 5.6, 2.8, tz + 5.6);
    pole.castShadow = true;
    scene.add(pole);
    const head = box(0.7, 1.6, 0.5, lightPoleMat, tx + 5.6, 5.9, tz + 5.6);
    scene.add(head);
    const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff5a4e, emissive: 0xff5a4e, emissiveIntensity: 0.9 }));
    lampR.position.set(tx + 5.6, 6.3, tz + 5.85);
    scene.add(lampR);
    const lampG = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7ed957, emissive: 0x7ed957, emissiveIntensity: 0.9 }));
    lampG.position.set(tx + 5.6, 5.5, tz + 5.85);
    scene.add(lampG);
  }
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff7a2e, roughness: 0.9 });
  for (const [cx, cz] of [[88, 49], [90, 55], [126, 49], [126, 55], [-24, 64], [-20, 64]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), coneMat);
    cone.position.set(cx, 0.4, cz);
    scene.add(cone);
  }

  const parkSpots = [];
  for (let x = -96; x <= 96; x += 16) parkSpots.push({ x, z: 60.6, heading: 0 });
  for (const [x, z, h] of [[-46, 6, Math.PI / 2], [46, -34, Math.PI / 2], [-6, 46, 0], [86, 6, Math.PI / 2]]) parkSpots.push({ x, z, heading: h });

  return {
    colliders,
    occluders,
    roadSegments,
    shopPos,
    parkSpots,
    blocked: [
      { x1: -130, x2: 130, z1: 104, z2: 264 },
      { x1: 96, x2: 118, z1: 30, z2: 104 },
    ],
    walkable: [
      { x1: -33, x2: -27, z1: 80, z2: 127, h: 1.35 },
      { x1: 94, x2: 120, z1: 47, z2: 57, h: 2.12 },
    ],
    trafficLoops: [
      [[-80, 68], [80, 68], [80, 40], [-80, 40]],
      [[-40, -40], [40, -40], [40, 0], [-40, 0]],
      [[40, 66], [92, 66], [92, 71], [40, 71]],
    ],
    pedLoops: [
      [[-120, 79], [120, 79], [120, 81], [-120, 81]],
      [[-120, 58.8], [120, 58.8], [120, 59.4], [-120, 59.4]],
      [[-35, -42], [35, -42], [35, -38], [-35, -38]],
      [[-105, 20], [-97, 12], [-89, 20], [-97, 28]],
    ],
  };
}

export function updateCity(animT) {
  updateLandmarks(animT, animated);
  if (foam1) foam1.opacity = 0.32 + 0.18 * Math.sin(animT * 0.9);
  if (foam2) foam2.opacity = 0.16 + 0.1 * Math.sin(animT * 0.9 + 1.6);
}
