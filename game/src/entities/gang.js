// Gang members: simple enemy AI. They idle at their turf, chase the
// player on foot when close, and swing when in range. One dies, drops
// ammo, and a replacement walks in after 45 s.
import * as THREE from "three";
import { collideCircle, groundHeightAt } from "../core/collide.js";

export const GANG = {
  health: 60, speed: 5.2, damage: 8, aggro: 22,
  attackRange: 2.2, attackCd: 1.2, respawn: 45,
};

const TINTS = [0x6e2a5a, 0x2a4a6e, 0x5a6e2a, 0x6e4a2a];
const SKIN = 0xc98d5f;
const PANTS = 0x2b3446;
const CAP = 0x1c2230;

function buildFigure(tint) {
  const g = new THREE.Group();
  const hoodie = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.95 });
  const cap = new THREE.MeshStandardMaterial({ color: CAP, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 0.36), hoodie);
  torso.position.y = 1.12;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.4), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.46), cap);
  hat.position.y = 1.86;
  g.add(hat);
  const parts = {};
  for (const [name, x, mat, w, h] of [
    ["armL", -0.42, hoodie, 0.18, 0.55], ["armR", 0.42, hoodie, 0.18, 0.55],
    ["legL", -0.16, pants, 0.22, 0.8], ["legR", 0.16, pants, 0.22, 0.8],
  ]) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), mat);
    mesh.position.y = -h / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.position.set(x, name.startsWith("arm") ? 1.36 : 0.82, 0);
    g.add(pivot);
    parts[name] = pivot;
  }
  g.userData.parts = parts;
  g.userData.torsoMat = hoodie;
  return g;
}

class Member {
  constructor(scene, spot, tint) {
    this.spot = spot;
    this.group = buildFigure(tint);
    this.group.position.set(spot.x, 0, spot.z);
    scene.add(this.group);
    this.health = GANG.health;
    this.alive = true;
    this.respawnT = 0;
    this.cd = 0;
    this.flash = 0;
    this.phase = (spot.x * 7 + spot.z * 13) % 6;
    this.heading = 0;
  }

  damage(n) {
    if (!this.alive) return false;
    this.health -= n;
    this.flash = 0.15;
    this.group.userData.torsoMat.emissive.setHex(0x881111);
    if (this.health <= 0) {
      this.alive = false;
      this.group.visible = false;
      this.respawnT = GANG.respawn;
      return true;
    }
    return false;
  }

  revive() {
    this.health = GANG.health;
    this.alive = true;
    this.group.visible = true;
    this.group.position.set(this.spot.x, 0, this.spot.z);
  }
}

export class Gang {
  constructor(scene, city, hooks) {
    this.city = city;
    this.hooks = hooks;
    const s = city.shopPos;
    const spots = [
      { x: s.x + 6, z: s.z + 4 },
      { x: 107, z: 52 },
      { x: -95, z: 10 },
      { x: -20, z: 88 },
    ];
    this.members = spots.map((spot, i) => new Member(scene, spot, TINTS[i % TINTS.length]));
  }

  damage(m, n) {
    if (m.damage(n)) this.hooks.onDeath(m);
  }

  update(step, player, inVehicle) {
    const p = player.group.position;
    for (const m of this.members) {
      if (!m.alive) {
        m.respawnT -= step;
        if (m.respawnT <= 0) m.revive();
        continue;
      }
      m.cd = Math.max(0, m.cd - step);
      if (m.flash > 0) {
        m.flash -= step;
        if (m.flash <= 0) m.group.userData.torsoMat.emissive.setHex(0x000000);
      }
      const q = m.group.position;
      const dx = p.x - q.x;
      const dz = p.z - q.z;
      const d = Math.hypot(dx, dz);
      let moving = false;
      if (!inVehicle && d < GANG.aggro) {
        if (d > GANG.attackRange * 0.8) {
          q.x += (dx / d) * GANG.speed * step;
          q.z += (dz / d) * GANG.speed * step;
          moving = true;
        }
        m.heading = Math.atan2(dx, dz);
        if (d < GANG.attackRange && m.cd <= 0) {
          m.cd = GANG.attackCd;
          this.hooks.onAttack(GANG.damage, q);
        }
      } else if (d > 2) {
        const bx = m.spot.x - q.x;
        const bz = m.spot.z - q.z;
        const bd = Math.hypot(bx, bz);
        if (bd > 0.5) {
          q.x += (bx / bd) * GANG.speed * 0.6 * step;
          q.z += (bz / bd) * GANG.speed * 0.6 * step;
          m.heading = Math.atan2(bx, bz);
          moving = true;
        }
      }
      q.y = groundHeightAt(q.x, q.z, this.city.walkable);
      collideCircle(q, 0.55, this.city.colliders, this.city.blocked, this.city.walkable);
      q.x = Math.max(-128, Math.min(128, q.x));
      q.z = Math.max(-108, Math.min(126, q.z));
      m.group.rotation.y = m.heading;
      m.phase += step * (moving ? 9 : 2);
      const parts = m.group.userData.parts;
      const swing = moving ? 0.5 : 0.05;
      const s = Math.sin(m.phase);
      parts.legL.rotation.x = s * swing;
      parts.legR.rotation.x = -s * swing;
      parts.armL.rotation.x = -s * swing * 0.8;
      parts.armR.rotation.x = s * swing * 0.8;
    }
  }
}
