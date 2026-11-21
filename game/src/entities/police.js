import * as THREE from "three";
import { Vehicle } from "./vehicles.js";
import { WANTED_LEVELS } from "../systems/wanted.js";

const MAX_UNITS = 4;
const SIDES = [2.5, -2.5, 5, -5];

function barrierMesh() {
  const g = new THREE.Group();
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.18), boardMat);
  board.position.y = 0.75; board.castShadow = true; g.add(board);
  for (const x of [-0.6, 0.6]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.2), whiteMat); s.position.set(x, 0.75, 0); g.add(s); }
  for (const x of [-1.0, 1.0]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.3), darkMat); l.position.set(x, 0.37, 0); g.add(l); }
  return g;
}

function coneMesh() {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 }));
  cone.position.y = 0.35; cone.castShadow = true; return cone;
}

export class Police {
  constructor(scene, state, camera) {
    this.scene = scene;
    this.state = state;
    this.camera = camera;
    this.units = [];
    for (let i = 0; i < MAX_UNITS; i += 1) {
      const car = new Vehicle(scene, "police", 0, -200, 0, 0xf2f2f2);
      car.parked = false;
      car.driver = "police";
      car.group.visible = false;
      this.units.push({ car, mode: "off", side: SIDES[i], hitCd: 0, leaveT: 0, patrolDir: 1, searchA: 0 });
    }
    this.blocks = [];
    for (let i = 0; i < 2; i += 1) {
      const group = new THREE.Group();
      const barriers = [];
      for (let b = 0; b < 3; b += 1) {
        const m = barrierMesh();
        m.position.x = (b - 1) * 2.6;
        group.add(m);
        barriers.push(m);
      }
      for (const x of [-3.6, 3.6]) {
        const cone = coneMesh();
        cone.position.x = x;
        group.add(cone);
      }
      group.visible = false;
      scene.add(group);
      this.blocks.push({ group, barriers, active: false, smashed: 0, heading: 0 });
    }
    this.blockCd = 0;
    this.patrolCd = 0;
    this.searchTarget = null;
  }

  activeUnits() {
    return this.units.filter((u) => u.mode !== "off");
  }

  chasingUnits() {
    return this.units.filter((u) => u.mode === "pursuit" || u.mode === "search");
  }

  nearestDist(pos) {
    let best = Infinity;
    for (const u of this.chasingUnits()) {
      const d = Math.hypot(u.car.group.position.x - pos.x, u.car.group.position.z - pos.z);
      if (d < best) best = d;
    }
    return best;
  }

  placeUnit(u, x, z, heading, speed) {
    u.car.group.position.set(x, 0, z);
    u.car.group.rotation.y = heading;
    u.car.heading = heading;
    u.car.speed = speed;
    u.car.vx = Math.sin(heading) * speed;
    u.car.vz = Math.cos(heading) * speed;
    u.car.group.visible = true;
  }

  engage(target, L) {
    let have = this.chasingUnits().length;
    for (const u of this.units) {
      if (have >= L.cruisers) break;
      if (u.mode === "patrol") {
        u.mode = "pursuit";
        u.car.lights = true;
        have += 1;
      }
    }
    const pos = target.group.position;
    const h = target.heading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    let i = 0;
    for (const u of this.units) {
      if (have >= L.cruisers) break;
      if (u.mode !== "off") continue;
      const along = (i % 2 === 0 ? -1 : 1) * 50;
      const x = pos.x + fx * along + fz * u.side;
      const z = pos.z + fz * along - fx * u.side;
      this.placeUnit(u, x, z, Math.atan2(pos.x - x, pos.z - z), 16);
      u.mode = "pursuit";
      u.car.lights = true;
      have += 1;
      i += 1;
    }
  }

  engageStaged(vehicle) {
    const pos = vehicle.group.position;
    const h = vehicle.heading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const spots = [[-12, 2.5], [-20, -2.5]];
    let s = 0;
    for (const u of this.units) {
      if (s >= spots.length) break;
      if (u.mode !== "off" && u.mode !== "patrol") continue;
      const [along, side] = spots[s];
      this.placeUnit(u, pos.x + fx * along + fz * side, pos.z + fz * along - fx * side, h, vehicle.speed);
      u.mode = "pursuit";
      u.car.lights = true;
      s += 1;
    }
  }

  syncCount(L) {
    const ch = this.chasingUnits();
    for (let i = L.cruisers; i < ch.length; i += 1) {
      ch[i].mode = "leave";
      ch[i].leaveT = 0;
    }
  }

  search(lastSeen) {
    this.searchTarget = { x: lastSeen.x, z: lastSeen.z };
    for (const u of this.chasingUnits()) {
      u.mode = "search";
      u.searchA = 0;
    }
  }

  standDown() {
    for (const u of this.activeUnits()) {
      u.mode = "leave";
      u.leaveT = 0;
    }
  }

  update(dt, target, driving, wantedSys, city, animT) {
    const tp = target.group.position;
    const tvx = driving ? target.vx : Math.sin(target.heading) * target.speed;
    const tvz = driving ? target.vz : Math.cos(target.heading) * target.speed;
    const level = wantedSys.level;
    const L = level > 0 ? WANTED_LEVELS[level] : null;
    this.blockCd = Math.max(0, this.blockCd - dt);
    this.patrolCd = Math.max(0, this.patrolCd - dt);
    if (level === 0 && this.activeUnits().length === 0 && this.patrolCd <= 0) {
      const u = this.units[0];
      this.placeUnit(u, tp.x - 40, 68, Math.PI / 2, 10);
      u.mode = "patrol";
      u.car.lights = false;
      u.patrolDir = 1;
    }
    for (const u of this.units) {
      if (u.mode === "off") continue;
      u.hitCd = Math.max(0, u.hitCd - dt);
      const p = u.car.group.position;
      let aimX;
      let aimZ;
      let wantSpeed;
      if (u.mode === "pursuit") {
        const rx = Math.cos(target.heading);
        const rz = -Math.sin(target.heading);
        aimX = tp.x + tvx * 0.45 + rx * u.side;
        aimZ = tp.z + tvz * 0.45 + rz * u.side;
        const d = Math.hypot(tp.x - p.x, tp.z - p.z);
        wantSpeed = Math.min(L.speed, d < 7 ? Math.abs(this.state.speed) + 5 : L.speed);
      } else if (u.mode === "search") {
        u.searchA += dt * 0.5;
        const t = this.searchTarget || { x: tp.x, z: tp.z };
        aimX = t.x + Math.sin(u.searchA + u.side) * 10;
        aimZ = t.z + Math.cos(u.searchA + u.side) * 10;
        wantSpeed = 12;
      } else if (u.mode === "leave") {
        u.leaveT += dt;
        const dx = p.x - tp.x;
        const dz = p.z - tp.z;
        const d = Math.hypot(dx, dz) || 1;
        aimX = p.x + (dx / d) * 40;
        aimZ = p.z + (dz / d) * 40;
        wantSpeed = 20;
        if (d > 70 || u.leaveT > 7) {
          u.mode = "off";
          u.car.group.visible = false;
          u.car.speed = 0;
          u.car.vx = 0;
          u.car.vz = 0;
          if (this.activeUnits().length === 0) this.patrolCd = 8;
          continue;
        }
      } else {
        aimX = p.x + u.patrolDir * 30;
        aimZ = 68;
        wantSpeed = 10;
        if (p.x > 110) u.patrolDir = -1;
        if (p.x < -110) u.patrolDir = 1;
      }
      const want = Math.atan2(aimX - p.x, aimZ - p.z);
      let diff = want - u.car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const throttle = u.car.speed < wantSpeed ? 1 : 0;
      const brake = u.car.speed > wantSpeed + 2 ? 1 : 0;
      u.car.update(dt, { throttle, brake, steer: Math.max(-1, Math.min(1, diff * 1.8)) }, city.colliders, city.blocked, city.walkable, animT);
      if (u.mode === "pursuit" || u.mode === "search") {
        const d = Math.hypot(tp.x - p.x, tp.z - p.z);
        if (d < 3.4 && u.hitCd <= 0) {
          u.hitCd = 1.2;
          if (this.state.health > 10) this.state.damage(4);
          if (driving) {
            target.speed *= 0.6;
            target.vx *= 0.6;
            target.vz *= 0.6;
          }
          u.car.speed *= 0.5;
          this.camera.addTrauma(0.35);
          wantedSys.commitCrime(1);
        }
      }
    }
    if (level >= 3 && L) {
      const active = this.blocks.filter((b) => b.active).length;
      if (active < L.blocks && this.blockCd <= 0) {
        const b = this.blocks.find((x) => !x.active);
        if (b) {
          const fx = Math.sin(target.heading);
          const fz = Math.cos(target.heading);
          b.group.position.set(tp.x + fx * 55, 0, tp.z + fz * 55);
          b.group.rotation.y = target.heading;
          b.heading = target.heading;
          for (const m of b.barriers) m.visible = true;
          b.group.visible = true;
          b.active = true;
          b.smashed = 0;
          this.blockCd = 14;
          this.state.say("Roadblock ahead!");
        }
      }
    } else {
      for (const b of this.blocks) {
        b.active = false;
        b.group.visible = false;
      }
    }
    if (driving) {
      for (const b of this.blocks) {
        if (!b.active) continue;
        for (const m of b.barriers) {
          if (!m.visible) continue;
          const lx = m.position.x;
          const wx = b.group.position.x + lx * Math.cos(b.heading);
          const wz = b.group.position.z - lx * Math.sin(b.heading);
          if (Math.hypot(tp.x - wx, tp.z - wz) < 2.2 && Math.abs(target.speed) > 4) {
            m.visible = false;
            b.smashed += 1;
            target.speed *= 0.45;
            target.vx *= 0.45;
            target.vz *= 0.45;
            if (this.state.health > 10) this.state.damage(6);
            this.camera.addTrauma(0.4);
            wantedSys.commitCrime(1);
            this.blockCd = 10;
            if (b.smashed >= 3) {
              b.active = false;
              b.group.visible = false;
            }
          }
        }
      }
    }
  }
}
