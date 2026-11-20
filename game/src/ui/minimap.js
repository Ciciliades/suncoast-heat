// Circular minimap: roads, sea and sand, the player blip, and a
// waypoint marker clamped to the edge when the target is off-view.
// Drawn in world space, centered on the player, north up.
export class Minimap {
  constructor(canvas, roadSegments) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.roads = roadSegments;
    this.scale = 148 / 170;
  }

  draw(px, pz, heading, waypoint, animT, marks) {
    const { ctx, canvas } = this;
    const s = this.scale;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 73, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#6fbf5a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-px, -pz);
    ctx.fillStyle = "#f6dc9f";
    ctx.fillRect(-130, 80, 260, 24);
    ctx.fillStyle = "#1fb6c9";
    ctx.fillRect(-130, 104, 260, 160);
    ctx.fillRect(96, 30, 22, 74);
    ctx.strokeStyle = "#3a4356";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    for (const r of this.roads) {
      ctx.beginPath();
      ctx.moveTo(r.x1, r.z1);
      ctx.lineTo(r.x2, r.z2);
      ctx.stroke();
    }
    ctx.fillStyle = "#ff9d8a";
    ctx.fillRect(-130, 74, 260, 8);
    if (waypoint) {
      let wx = waypoint.x;
      let wz = waypoint.z;
      const dx = wx - px;
      const dz = wz - pz;
      const d = Math.hypot(dx, dz);
      const maxD = 72 / s;
      if (d > maxD) {
        wx = px + (dx / d) * maxD;
        wz = pz + (dz / d) * maxD;
      }
      const pulse = 8 + Math.sin(animT * 4) * 1.5;
      ctx.fillStyle = "#ffc857";
      ctx.beginPath();
      ctx.moveTo(wx, wz - pulse);
      ctx.lineTo(wx + pulse * 0.7, wz);
      ctx.lineTo(wx, wz + pulse);
      ctx.lineTo(wx - pulse * 0.7, wz);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1c2230";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (marks) {
      for (const m of marks) {
        const dx = m.x - px;
        const dz = m.z - pz;
        if (dx * dx + dz * dz > 8100) continue;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(m.x, m.z, m.r || 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1c2230";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading);
    ctx.fillStyle = "#fff7e8";
    ctx.strokeStyle = "#ff5a4e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fff7e8";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", cx, 16);
  }
}
