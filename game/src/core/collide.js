// Circle-vs-AABB collision shared by player and vehicles.
// (pier deck, bridge deck).
function inside(x, z, r) {
  return x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2;
}

export function collideCircle(pos, radius, colliders, blocked, walkable) {
  for (const r of colliders) {
    const cx = Math.max(r.x1, Math.min(pos.x, r.x2));
    const cz = Math.max(r.z1, Math.min(pos.z, r.z2));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * radius;
      pos.z = cz + (dz / d) * radius;
    } else {
      const pushLeft = pos.x - r.x1 + radius;
      const pushRight = r.x2 - pos.x + radius;
      const pushUp = pos.z - r.z1 + radius;
      const pushDown = r.z2 - pos.z + radius;
      const m = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (m === pushLeft) pos.x = r.x1 - radius;
      else if (m === pushRight) pos.x = r.x2 + radius;
      else if (m === pushUp) pos.z = r.z1 - radius;
      else pos.z = r.z2 + radius;
    }
  }
  for (const r of blocked) {
    if (walkable.some((w) => inside(pos.x, pos.z, w))) continue;
    if (pos.x < r.x1 - radius || pos.x > r.x2 + radius || pos.z < r.z1 - radius || pos.z > r.z2 + radius) continue;
    const pushLeft = pos.x - (r.x1 - radius);
    const pushRight = (r.x2 + radius) - pos.x;
    const pushUp = pos.z - (r.z1 - radius);
    const pushDown = (r.z2 + radius) - pos.z;
    const m = Math.min(pushLeft, pushRight, pushUp, pushDown);
    if (m === pushLeft) pos.x = r.x1 - radius;
    else if (m === pushRight) pos.x = r.x2 + radius;
    else if (m === pushUp) pos.z = r.z1 - radius;
    else pos.z = r.z2 + radius;
  }
}

export function groundHeightAt(x, z, walkable) {
  let h = 0;
  for (const w of walkable) {
    if (inside(x, z, w)) h = Math.max(h, w.h || 0);
  }
  return h;
}
