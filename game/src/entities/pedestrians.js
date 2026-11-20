// Pedestrians: nine archetypes from one builder, each with its own
// silhouette, colors, speed, and props. They walk sidewalk loops and
// pause to idle; they flee nearby danger.
import * as THREE from "three";
import { mulberry32, pick } from "../core/random.js";

const ARCHETYPES = [
  { id: "tourist", shirt: 0xffc857, pants: 0x4a6fd8, hat: "straw", speed: 1.4 },
  { id: "jogger", shirt: 0x7ed957, pants: 0x2b3446, hat: "none", speed: 3.2 },
  { id: "skater", shirt: 0x1fb6c9, pants: 0x2b3446, hat: "cap", speed: 2.6, board: true },
  { id: "cyclist", shirt: 0xff5a4e, pants: 0x1c2230, hat: "helmet", speed: 4.5, bike: true },
  { id: "vendor", shirt: 0xfff7e8, pants: 0x8a5a3b, hat: "straw", speed: 1.0, apron: true },
  { id: "office", shirt: 0xf2f2f2, pants: 0x2b3446, hat: "none", speed: 1.8, briefcase: true },
  { id: "gang", shirt: 0x2b2b4d, pants: 0x1c2230, hat: "cap", speed: 1.6 },
  { id: "patrol", shirt: 0x2e4a8a, pants: 0x1c2a4a, hat: "police", speed: 1.5 },
  { id: "traffic", shirt: 0xc8e83a, pants: 0x2b3446, hat: "police", speed: 1.5 },
];
const SKINS = [0xf2c49b, 0xd9a06b, 0x8a5a3b, 0xf7d7b5];

function limb(mat, w, h, d, y) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.y = -h / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  pivot.position.y = y;
  return pivot;
}

function buildPed(arch, skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: arch.shirt, roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: arch.pants, roughness: 0.95 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.6, 0.3), arch.apron ? new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 }) : shirtMat);
  torso.position.y = 1.08;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Group();
  head.position.y = 1.56;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.36), skinMat);
  head.add(face);
  if (arch.hat === "straw") {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xe8c878, roughness: 1 }));
    hat.position.y = 0.24;
    head.add(hat);
  } else if (arch.hat === "cap") {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.12, 10), shirtMat);
    hat.position.y = 0.22;
    head.add(hat);
  } else if (arch.hat === "helmet") {
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xfff7e8, roughness: 0.5 }));
    hat.position.y = 0.1;
    head.add(hat);
  } else if (arch.hat === "police") {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.8 }));
    hat.position.y = 0.24;
    head.add(hat);
  } else {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.38), new THREE.MeshStandardMaterial({ color: 0x4a2f28, roughness: 1 }));
    hair.position.y = 0.16;
    head.add(hair);
  }
  g.add(head);
  const parts = {
    armL: limb(shirtMat, 0.16, 0.52, 0.16, 1.32),
    armR: limb(shirtMat, 0.16, 0.52, 0.16, 1.32),
    legL: limb(pantsMat, 0.2, 0.78, 0.2, 0.8),
    legR: limb(pantsMat, 0.2, 0.78, 0.2, 0.8),
  };
  parts.armL.position.x = -0.37;
  parts.armR.position.x = 0.37;
  parts.legL.position.x = -0.14;
  parts.legR.position.x = 0.14;
  for (const p of Object.values(parts)) g.add(p);
  if (arch.board) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.9), new THREE.MeshStandardMaterial({ color: 0xff8f7d, roughness: 0.8 }));
    board.position.set(0, 0.05, 0.1);
    g.add(board);
  }
  if (arch.briefcase) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }));
    box.position.set(0.48, 0.75, 0);
    g.add(box);
  }
  let wheels = null;
  if (arch.bike) {
    wheels = [];
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2574c, roughness: 0.7 });
    for (const z of [0.55, -0.55]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 14), new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.8 }));
      wheel.position.set(0, 0.34, z);
      g.add(wheel);
      wheels.push(wheel);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), frameMat);
    frame.position.y = 0.62;
    g.add(frame);
    parts.legL.rotation.x = 0.6;
    parts.legR.rotation.x = -0.6;
  }
  g.userData.parts = parts;
  g.userData.wheels = wheels;
  return g;
}

export class Pedestrians {
  constructor(scene, loops, count = 18) {
    const rng = mulberry32(777);
    this.peds = [];
    for (let i = 0; i < count; i += 1) {
      const arch = ARCHETYPES[i % ARCHETYPES.length];
      const loop = loops[i % loops.length];
      const seg = Math.floor(rng() * loop.length);
      const g = buildPed(arch, pick(rng, SKINS));
      const start = loop[seg];
      g.position.set(start[0] + (rng() - 0.5) * 2, 0, start[1] + (rng() - 0.5) * 2);
      scene.add(g);
      this.peds.push({ group: g, arch, loop, seg, dir: rng() < 0.5 ? 1 : -1, pause: 0, stops: 0, phase: rng() * 6, speed: arch.speed * (0.85 + rng() * 0.3), heading: rng() * 6.28 });
    }
  }

  stageChase(mode = "beach") {
    const beach = [
      [8, 30, 100, Math.PI, 1.45], [0, 38, 101, Math.PI, 1.45], [2, 46, 100, Math.PI, 1.45],
      [3, 34, 78.5, Math.PI, 1.2], [10, 44, 78.5, Math.PI, 1.2], [9, 54, 101, Math.PI, 1.2],
    ];
    const road = [
      [0, 33, 73.5, -Math.PI / 2, 1.45], [2, 40, 73.5, -Math.PI / 2, 1.45], [8, 47, 74.5, -Math.PI / 2, 1.45],
      [3, 35, 78.5, Math.PI, 1.2], [10, 44, 78.5, Math.PI, 1.2], [9, 54, 90, Math.PI, 1.2],
    ];
    const spots = mode === "chase2" ? road : beach;
    for (const [i, x, z, heading, s] of spots) {
      const p = this.peds[i];
      p.group.position.set(x, 0, z);
      p.group.scale.setScalar(s);
      p.group.rotation.y = heading;
      p.seg = 1;
      p.dir = 1;
      p.heading = heading;
      p.pause = 999;
    }
  }

  update(dt, threat, danger) {
    for (const p of this.peds) {
      if (p.pause > 0) {
        p.pause -= dt;
        this.animate(p, 0, dt);
        continue;
      }
      const target = p.loop[p.seg];
      const g = p.group.position;
      if (danger && Math.hypot(g.x - threat.x, g.z - threat.z) < 8) {
        p.heading = Math.atan2(g.x - threat.x, g.z - threat.z);
        g.x += Math.sin(p.heading) * p.speed * 2.2 * dt;
        g.z += Math.cos(p.heading) * p.speed * 2.2 * dt;
        p.group.rotation.y = p.heading;
        this.animate(p, p.speed * 2.2, dt);
        continue;
      }
      const dx = target[0] - g.x;
      const dz = target[1] - g.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.6) {
        p.seg = (p.seg + p.dir + p.loop.length) % p.loop.length;
        p.stops += 1;
        if (p.stops % 4 === 0) p.pause = 2;
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = want - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += diff * Math.min(1, dt * 6);
      g.x += Math.sin(p.heading) * p.speed * dt;
      g.z += Math.cos(p.heading) * p.speed * dt;
      p.group.rotation.y = p.heading;
      this.animate(p, p.speed, dt);
    }
  }

  animate(p, speed, dt) {
    const parts = p.group.userData.parts;
    p.phase += speed * dt * 1.9;
    const swing = Math.min(1, speed / 2) * 0.55;
    if (p.arch.bike) {
      const wheels = p.group.userData.wheels;
      for (const w of wheels) w.rotation.x -= (speed / 0.34) * dt;
      parts.legL.rotation.x = 0.6 + Math.sin(p.phase) * 0.25;
      parts.legR.rotation.x = -0.6 + Math.sin(p.phase) * 0.25;
      return;
    }
    const s = Math.sin(p.phase);
    parts.legL.rotation.x = s * swing;
    parts.legR.rotation.x = -s * swing;
    parts.armL.rotation.x = -s * swing * 0.8;
    parts.armR.rotation.x = s * swing * 0.8;
  }
}
