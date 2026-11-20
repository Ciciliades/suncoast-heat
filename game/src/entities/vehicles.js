// Vehicles: data table, builder, and arcade physics class.
import * as THREE from "three";
import { CAR_PAINTS } from "../config.js";
import { collideCircle, groundHeightAt } from "../core/collide.js";
import { signTexture } from "../world/city.js";

export const VEHICLE_TYPES = {
  sedan: { len: 4.4, w: 1.9, h: 1.45, accel: 9, top: 30, steer: 1.9, grip: 6, horn: 320 },
  taxi: { len: 4.4, w: 1.9, h: 1.45, accel: 9, top: 30, steer: 1.9, grip: 6, horn: 380 },
  sports: { len: 4.2, w: 2.0, h: 1.15, accel: 14, top: 42, steer: 2.3, grip: 8.5, horn: 440 },
  muscle: { len: 4.8, w: 2.0, h: 1.4, accel: 11, top: 34, steer: 1.7, grip: 5.5, horn: 260 },
  pickup: { len: 5.0, w: 2.0, h: 1.6, accel: 8, top: 28, steer: 1.7, grip: 5, horn: 300 },
  police: { len: 4.5, w: 1.95, h: 1.5, accel: 12, top: 38, steer: 2.1, grip: 7, horn: 520 },
  bike: { len: 2.2, w: 0.7, h: 1.1, accel: 13, top: 36, steer: 2.6, grip: 7.5, horn: 600 },
};

const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfeef5, roughness: 0.15, metalness: 0.35 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.8 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dee8, roughness: 0.35, metalness: 0.6 });

function radialTex(inner, outer) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
const glowTex = radialTex("rgba(255,246,216,0.9)", "rgba(255,246,216,0)");
const smokeTex = radialTex("rgba(120,120,120,0.55)", "rgba(120,120,120,0)");

function part(w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function makeWheel(radius, width) {
  const pivot = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), darkMat);
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  pivot.add(tyre);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 8), rimMat);
  rim.rotation.z = Math.PI / 2;
  pivot.add(rim);
  pivot.userData.spin = tyre;
  pivot.userData.rim = rim;
  return pivot;
}

function buildBody(type, color) {
  const spec = VEHICLE_TYPES[type];
  const body = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.6, roughness: 0.4 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff6d8, emissiveIntensity: 1.4, roughness: 0.3 });
  const wheels = [];
  let lightbar = null;
  if (type === "bike") {
    body.add(part(0.5, 0.3, 1.5, paint, 0, 0.72, 0));
    body.add(part(0.42, 0.22, 0.6, darkMat, 0, 0.92, -0.35));
    body.add(part(0.5, 0.08, 0.08, darkMat, 0, 1.0, 0.75));
    body.add(part(0.14, 0.14, 0.5, rimMat, 0.22, 0.45, -0.7));
    for (const z of [0.78, -0.78]) {
      const wheel = makeWheel(0.35, 0.14);
      wheel.position.set(0, 0.35, z);
      body.add(wheel);
      wheels.push({ pivot: wheel, front: z > 0 });
    }
    body.add(part(0.2, 0.18, 0.1, headMat, 0, 0.85, 1.08));
    body.add(part(0.2, 0.12, 0.08, tailMat, 0, 0.8, -1.08));
  } else {
    const { len, w, h } = spec;
    body.add(part(w, h * 0.5, len * 0.6, paint, 0, h * 0.42, -len * 0.06));
    body.add(part(w * 0.94, h * 0.28, len * 0.3, paint, 0, h * 0.48, len * 0.3));
    if (type === "pickup") {
      body.add(part(w * 0.82, h * 0.55, len * 0.3, glassMat, 0, h * 0.85, len * 0.22));
      body.add(part(w, h * 0.5, len * 0.34, paint, 0, h * 0.55, -len * 0.28));
      body.add(part(w * 0.9, 0.06, len * 0.3, darkMat, 0, h * 0.78, -len * 0.28));
    } else {
      body.add(part(w * 0.8, h * 0.5, len * 0.42, glassMat, 0, h * 0.82, -len * 0.04));
      body.add(part(w * 0.82, 0.08, len * 0.44, paint, 0, h * 1.06, -len * 0.04));
    }
    body.add(part(w, 0.24, 0.3, darkMat, 0, h * 0.22, len / 2 - 0.1));
    body.add(part(w, 0.24, 0.3, darkMat, 0, h * 0.22, -len / 2 + 0.1));
    for (const s of [1, -1]) {
      body.add(part(0.42, 0.18, 0.1, headMat, s * w * 0.32, h * 0.5, len / 2 + 0.02));
      body.add(part(0.42, 0.18, 0.1, tailMat, s * w * 0.32, h * 0.5, -len / 2 - 0.02));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.55 }));
      glow.scale.set(0.9, 0.9, 1);
      glow.position.set(s * w * 0.32, h * 0.5, len / 2 + 0.25);
      body.add(glow);
    }
    const wr = type === "pickup" ? 0.42 : type === "sports" ? 0.33 : 0.36;
    for (const [x, z, front] of [[-w / 2, len * 0.32, true], [w / 2, len * 0.32, true], [-w / 2, -len * 0.32, false], [w / 2, -len * 0.32, false]]) {
      const wheel = makeWheel(wr, 0.3);
      wheel.position.set(x, wr, z);
      body.add(wheel);
      wheels.push({ pivot: wheel, front });
    }
    if (type === "sports") {
      body.add(part(0.12, 0.18, 0.12, darkMat, -w * 0.32, h * 0.72, -len / 2 + 0.25));
      body.add(part(0.12, 0.18, 0.12, darkMat, w * 0.32, h * 0.72, -len / 2 + 0.25));
      body.add(part(w * 0.9, 0.08, 0.4, darkMat, 0, h * 0.82, -len / 2 + 0.25));
    }
    if (type === "taxi") {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.3), new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0xffc857, emissiveIntensity: 0.5 }));
      sign.position.set(0, h * 1.14, -len * 0.04);
      body.add(sign);
    }
    if (type === "police") {
      lightbar = new THREE.Group();
      lightbar.add(part(1.0, 0.14, 0.34, darkMat, 0, 0, 0));
      const red = part(0.42, 0.18, 0.3, new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 2 }), -0.26, 0.14, 0);
      const blue = part(0.42, 0.18, 0.3, new THREE.MeshStandardMaterial({ color: 0x3b82ff, emissive: 0x3b82ff, emissiveIntensity: 2 }), 0.26, 0.14, 0);
      lightbar.add(red, blue);
      lightbar.position.set(0, h * 1.14, -len * 0.04);
      lightbar.userData = { red: red.material, blue: blue.material };
      body.add(lightbar);
      const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ map: signTexture("BAY POLICE", "#f2f2f2", "#1c2230") }));
      shield.position.set(0, h * 0.55, len * 0.3);
      shield.rotation.x = -0.35;
      body.add(shield);
    }
  }
  const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
  smoke.scale.set(1.4, 1.4, 1);
  smoke.position.set(0, 1.4, VEHICLE_TYPES[type].len * 0.3);
  body.add(smoke);
  return { body, wheels, tailMat, paint, smoke, lightbar };
}

export class Vehicle {
  constructor(scene, type, x, z, heading, color, owned = false) {
    this.type = type;
    this.spec = VEHICLE_TYPES[type];
    this.group = new THREE.Group();
    const built = buildBody(type, color);
    this.body = built.body;
    this.wheels = built.wheels;
    this.tailMat = built.tailMat;
    this.paint = built.paint;
    this.smoke = built.smoke;
    this.lightbar = built.lightbar;
    this.baseColor = new THREE.Color(color);
    this.group.add(this.body);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = heading;
    scene.add(this.group);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.damage = 0;
    this.parked = true;
    this.stolen = false;
    this.owned = owned;
    this.driver = null;
    this.honking = false;
    this.honkT = 0;
    this.wheelSpin = 0;
    this.vx = 0;
    this.vz = 0;
  }

  honk() {
    this.honking = true;
    this.honkT = 0.4;
  }

  update(dt, controls, colliders, blocked, walkable, animT, driveMul = 1) {
    const spec = this.spec;
    const throttle = controls ? controls.throttle : 0;
    const brake = controls ? controls.brake : 0;
    const steerIn = controls ? controls.steer : 0;
    this.steer += (steerIn - this.steer) * Math.min(1, dt * 8);
    const top = spec.top * driveMul * (1 - this.damage / 220);
    if (throttle > 0) this.speed += spec.accel * throttle * dt;
    if (brake > 0) this.speed -= (this.speed > 0.5 ? 22 : 6) * brake * dt;
    this.speed -= this.speed * 0.55 * dt;
    if (throttle < 0) this.speed = Math.max(this.speed + spec.accel * 0.5 * throttle * dt, -top * 0.35);
    this.speed = Math.max(-top * 0.35, Math.min(top, this.speed));
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    const dir = this.speed >= 0 ? 1 : -1;
    this.heading += this.steer * dir * spec.steer * Math.min(1, Math.abs(this.speed) / 8) * dt;
    const wishX = Math.sin(this.heading) * this.speed;
    const wishZ = Math.cos(this.heading) * this.speed;
    const k = Math.min(1, spec.grip * dt);
    this.vx += (wishX - this.vx) * k;
    this.vz += (wishZ - this.vz) * k;
    const p = this.group.position;
    const beforeX = p.x;
    const beforeZ = p.z;
    p.x += this.vx * dt;
    p.z += this.vz * dt;
    collideCircle(p, this.spec.len * 0.42, colliders, blocked, walkable);
    const pushed = Math.hypot(p.x - beforeX, p.z - beforeZ);
    const moved = Math.hypot(this.vx * dt, this.vz * dt);
    if (moved > 0.01 && pushed < moved * 0.55 && Math.abs(this.speed) > 3) {
      this.damage = Math.min(100, this.damage + Math.abs(this.speed) * 0.9);
      this.speed *= 0.45;
      this.vx *= 0.4;
      this.vz *= 0.4;
    }
    p.x = Math.max(-128, Math.min(128, p.x));
    p.z = Math.max(-108, Math.min(126, p.z));
    const gy = groundHeightAt(p.x, p.z, walkable);
    p.y += (gy - p.y) * Math.min(1, dt * 8);
    this.group.rotation.y = this.heading;
    this.body.rotation.z = -this.steer * Math.min(1, Math.abs(this.speed) / 20) * 0.04;
    this.body.rotation.x = throttle * 0.012;
    this.wheelSpin += (this.speed / 0.36) * dt;
    for (const w of this.wheels) {
      w.pivot.userData.spin.rotation.x = this.wheelSpin;
      w.pivot.userData.rim.rotation.x = this.wheelSpin;
      if (w.front) w.pivot.rotation.y = this.steer * 0.45;
    }
    this.tailMat.emissiveIntensity = brake > 0 ? 2.4 : 0.6;
    if (this.lightbar) {
      const phase = Math.sin(animT * 10) > 0;
      const on = this.lights !== false;
      this.lightbar.userData.red.emissiveIntensity = on && phase ? 2.5 : 0.3;
      this.lightbar.userData.blue.emissiveIntensity = on && !phase ? 2.5 : 0.3;
    }
    if (this.damage > 40) {
      this.smoke.material.opacity = Math.min(0.75, (this.damage - 40) / 70) * (0.7 + 0.3 * Math.sin(animT * 7));
      const s = 1.2 + (this.damage - 40) / 50;
      this.smoke.scale.set(s, s, 1);
      this.paint.color.copy(this.baseColor).lerp(new THREE.Color(0x555555), Math.min(0.5, this.damage / 180));
    } else {
      this.smoke.material.opacity = 0;
    }
    if (this.honkT > 0) {
      this.honkT -= dt;
      if (this.honkT <= 0) this.honking = false;
    }
  }
}

export function spawnParked(scene, spots) {
  const types = ["sedan", "taxi", "sports", "muscle", "pickup", "sedan", "sports", "police", "bike", "muscle", "taxi", "sedan", "pickup", "sports", "bike", "sedan"];
  const vehicles = [];
  spots.forEach((spot, i) => {
    const type = types[i % types.length];
    const color = type === "taxi" ? 0xffc857 : type === "police" ? 0xf2f2f2 : CAR_PAINTS[(i * 3 + 1) % CAR_PAINTS.length];
    const owned = i === 0;
    const v = new Vehicle(scene, type, spot.x, spot.z, spot.heading, owned ? 0xff5a4e : color, owned);
    vehicles.push(v);
  });
  return vehicles;
}

export function nearestVehicle(vehicles, x, z, maxD) {
  let best = null;
  let bestD = maxD;
  for (const v of vehicles) {
    const d = Math.hypot(v.group.position.x - x, v.group.position.z - z);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}
