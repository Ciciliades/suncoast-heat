import { Vehicle } from "./vehicles.js";
import { CAR_PAINTS } from "../config.js";

const TRAFFIC_TYPES = ["sedan", "taxi", "pickup", "sedan", "muscle", "sedan", "taxi", "pickup"];

function segPoint(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export class Traffic {
  constructor(scene, loops, perLoop = 4, onCrash = null) {
    this.cars = [];
    this.onCrash = onCrash;
    this.crashCd = 0;
    loops.forEach((loop, li) => {
      let total = 0;
      const lens = [];
      for (let i = 0; i < loop.length; i += 1) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        lens.push(len);
        total += len;
      }
      for (let i = 0; i < perLoop; i += 1) {
        const dist = (total / perLoop) * i + li * 7;
        const type = TRAFFIC_TYPES[(li * 3 + i) % TRAFFIC_TYPES.length];
        const color = type === "taxi" ? 0xffc857 : CAR_PAINTS[(li * 2 + i * 3) % CAR_PAINTS.length];
        const car = new Vehicle(scene, type, 0, 0, 0, color);
        car.parked = false;
        car.driver = "traffic";
        this.cars.push({ car, loop, lens, total, dist, speed: 9 + ((li + i) % 3) * 1.5 });
      }
    });
    for (const c of this.cars) this.place(c);
  }

  place(c) {
    let d = ((c.dist % c.total) + c.total) % c.total;
    let i = 0;
    while (d > c.lens[i]) {
      d -= c.lens[i];
      i += 1;
    }
    const a = c.loop[i];
    const b = c.loop[(i + 1) % c.loop.length];
    const t = d / c.lens[i];
    const [x, z] = segPoint(a, b, t);
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const rx = (dz / len) * 2.6;
    const rz = (-dx / len) * 2.6;
    c.car.group.position.set(x + rx, 0, z + rz);
    c.car.heading = Math.atan2(dx, dz);
    c.car.group.rotation.y = c.car.heading;
    c.seg = i;
    c.segT = t;
  }

  update(dt, colliders, blocked, walkable, animT, playerCar, wanted = 0) {
    this.crashCd = Math.max(0, this.crashCd - dt);
    for (const c of this.cars) {
      const a = c.loop[c.seg];
      const b = c.loop[(c.seg + 1) % c.loop.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      const ahead = segPoint(a, b, Math.min(1, c.segT + 12 / len));
      const rx = (dz / len) * 2.6;
      const rz = (-dx / len) * 2.6;
      const tx = ahead[0] + rx;
      const tz = ahead[1] + rz;
      const p = c.car.group.position;
      const want = Math.atan2(tx - p.x, tz - p.z);
      let diff = want - c.car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      let target = c.speed;
      for (const o of this.cars) {
        if (o === c) continue;
        const op = o.car.group.position;
        const odx = op.x - p.x;
        const odz = op.z - p.z;
        const od = Math.hypot(odx, odz);
        if (od < 7 && (odx * Math.sin(c.car.heading) + odz * Math.cos(c.car.heading)) > 0) {
          target = Math.min(target, od < 3.5 ? 0 : o.car.speed * 0.8);
        }
      }
      if (playerCar) {
        const pp = playerCar.group.position;
        const pdx = pp.x - p.x;
        const pdz = pp.z - p.z;
        const pd = Math.hypot(pdx, pdz);
        if (pd < 7 && (pdx * Math.sin(c.car.heading) + pdz * Math.cos(c.car.heading)) > 0) target = Math.min(target, pd < 3.5 ? 0 : 2);
        if (wanted >= 2 && pd < 12) target = Math.max(target, 16);
        if (pd < 3 && Math.abs(playerCar.speed) > 6 && this.crashCd <= 0) {
          this.crashCd = 6; this.onCrash?.(); c.car.damage = Math.min(100, c.car.damage + 25);
          playerCar.speed *= 0.7; playerCar.vx *= 0.7; playerCar.vz *= 0.7;
        }
      }
      const throttle = c.car.speed < target ? 1 : 0;
      const brake = c.car.speed > target + 1 ? 1 : 0;
      c.car.update(dt, { throttle, brake, steer: Math.max(-1, Math.min(1, diff * 1.6)) }, colliders, blocked, walkable, animT);
      c.dist += c.car.speed * dt;
      this.placeAhead(c);
    }
  }

  placeAhead(c) {
    let d = ((c.dist % c.total) + c.total) % c.total;
    let i = 0;
    while (d > c.lens[i]) {
      d -= c.lens[i];
      i += 1;
    }
    c.seg = i;
    c.segT = d / c.lens[i];
  }
}
