// Mara Quinn on foot: readable low-poly humanoid with a coral jacket
// and white cap, walk/run/jump, smooth turning, procedural limb swing,
// and circle collision against the city.
import * as THREE from "three";
import { TUNING } from "../config.js";
import { collideCircle, groundHeightAt } from "../core/collide.js";

const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c49b, roughness: 0.85 });
const jacketMat = new THREE.MeshStandardMaterial({ color: 0xff5a4e, roughness: 0.85 });
const jeansMat = new THREE.MeshStandardMaterial({ color: 0x2e3a52, roughness: 0.95 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a2f28, roughness: 1 });
const capMat = new THREE.MeshStandardMaterial({ color: 0xfff7e8, roughness: 0.9 });
const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.9 });

function limb(mat, w, h, d, y) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.y = -h / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  pivot.position.y = y;
  return pivot;
}

export function buildMara() {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.34), jacketMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Group();
  head.position.y = 1.62;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.4), skinMat);
  face.castShadow = true;
  head.add(face);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.44), hairMat);
  hair.position.y = 0.16;
  head.add(hair);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 10), capMat);
  cap.position.y = 0.24;
  head.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.24), capMat);
  brim.position.set(0, 0.2, 0.3);
  head.add(brim);
  g.add(head);
  const parts = {
    armL: limb(jacketMat, 0.18, 0.55, 0.18, 1.36),
    armR: limb(jacketMat, 0.18, 0.55, 0.18, 1.36),
    legL: limb(jeansMat, 0.22, 0.8, 0.22, 0.82),
    legR: limb(jeansMat, 0.22, 0.8, 0.22, 0.82),
  };
  parts.armL.position.x = -0.41;
  parts.armR.position.x = 0.41;
  parts.legL.position.x = -0.16;
  parts.legR.position.x = 0.16;
  for (const leg of [parts.legL, parts.legR]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.36), shoeMat);
    shoe.position.set(0, -0.8, 0.05);
    leg.add(shoe);
  }
  for (const p of Object.values(parts)) g.add(p);
  g.userData.parts = parts;
  return g;
}

export class Player {
  constructor(scene, x, z) {
    this.group = buildMara();
    this.group.position.set(x, 0, z);
    scene.add(this.group);
    this.heading = 0;
    this.speed = 0;
    this.runMul = 1;
    this.vy = 0;
    this.grounded = true;
    this.phase = 0;
  }

  update(dt, input, camYaw, colliders, blocked, walkable) {
    const fwd = (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 1 : 0);
    const strafe = (input.isDown("KeyD") ? 1 : 0) - (input.isDown("KeyA") ? 1 : 0);
    const moving = fwd !== 0 || strafe !== 0;
    const target = moving ? (input.isDown("ShiftLeft") ? TUNING.run * this.runMul : TUNING.walk) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (moving) {
      const wish = camYaw - Math.atan2(strafe, fwd);
      let diff = wish - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);
    }
    const p = this.group.position;
    p.x += Math.sin(this.heading) * this.speed * dt;
    p.z += Math.cos(this.heading) * this.speed * dt;
    const gy = groundHeightAt(p.x, p.z, walkable);
    if (input.wasPressed("Space") && this.grounded) {
      this.vy = TUNING.jump;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.vy -= TUNING.gravity * dt;
      p.y += this.vy * dt;
      if (p.y <= gy) {
        p.y = gy;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      p.y += (gy - p.y) * Math.min(1, dt * 8);
    }
    collideCircle(p, 0.55, colliders, blocked, walkable);
    p.x = Math.max(-128, Math.min(128, p.x));
    p.z = Math.max(-108, Math.min(126, p.z));
    this.group.rotation.y = this.heading;
    this.phase += this.speed * dt * 1.7;
    const parts = this.group.userData.parts;
    const swing = Math.min(1, this.speed / TUNING.walk) * 0.6;
    const s = Math.sin(this.phase);
    parts.legL.rotation.x = s * swing;
    parts.legR.rotation.x = -s * swing;
    parts.armL.rotation.x = -s * swing * 0.8;
    parts.armR.rotation.x = s * swing * 0.8;
    if (!this.grounded) {
      parts.legL.rotation.x = 0.5;
      parts.legR.rotation.x = -0.3;
      parts.armL.rotation.x = -0.6;
      parts.armR.rotation.x = -0.6;
    }
  }
}
