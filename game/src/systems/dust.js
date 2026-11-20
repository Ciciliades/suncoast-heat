// Tire dust: pooled soft sprites kicked up behind driven wheels on
// sand. Fills the lower frame in beach shots; costs nothing when the
// car is on asphalt or parked. Seeded, so replays stay identical.
import * as THREE from "three";

function dustTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(222,196,150,0.6)");
  g.addColorStop(1, "rgba(222,196,150,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export class Dust {
  constructor(scene) {
    const tex = dustTexture();
    this.pool = [];
    for (let i = 0; i < 36; i += 1) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      scene.add(sprite);
      this.pool.push({ sprite, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 1 });
    }
    this.next = 0;
    this.acc = 0;
    this.seed = 1234567;
  }

  rand() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  update(dt, vehicle) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      const s = p.sprite;
      s.position.x += p.vx * dt;
      s.position.y += p.vy * dt;
      s.position.z += p.vz * dt;
      p.vy += 0.7 * dt;
      const t = 1 - p.life / p.max;
      const sc = 0.9 + t * p.grow;
      s.scale.set(sc, sc, 1);
      s.material.opacity = 0.5 * (p.life / p.max);
    }
    if (!vehicle || Math.abs(vehicle.speed) < 8) return;
    const pos = vehicle.group.position;
    if (pos.z < 78 || pos.z > 104) return;
    this.acc += dt * (8 + Math.abs(vehicle.speed) * 0.9);
    while (this.acc >= 1) {
      this.acc -= 1;
      const p = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      const h = vehicle.heading;
      const fx = Math.sin(h);
      const fz = Math.cos(h);
      const side = this.rand() < 0.5 ? 1 : -1;
      const rx = Math.cos(h) * side;
      const rz = -Math.sin(h) * side;
      p.sprite.position.set(
        pos.x - fx * vehicle.spec.len * 0.32 + rx * vehicle.spec.w * 0.4,
        0.35,
        pos.z - fz * vehicle.spec.len * 0.32 + rz * vehicle.spec.w * 0.4,
      );
      p.vx = -fx * vehicle.speed * 0.12 + (this.rand() - 0.5) * 0.8;
      p.vy = 0.7 + this.rand() * 0.7;
      p.vz = -fz * vehicle.speed * 0.12 + (this.rand() - 0.5) * 0.8;
      p.max = 0.7 + this.rand() * 0.4;
      p.life = p.max;
      p.grow = 1.6 + this.rand();
      p.sprite.visible = true;
    }
  }
}
