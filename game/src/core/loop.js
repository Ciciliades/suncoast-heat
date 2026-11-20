// Fixed-timestep loop: simulation advances in 1/60 s steps so movement,
// AI, and physics behave the same on fast and slow machines.
export function createLoop({ step = 1 / 60, update, render }) {
  let acc = 0;
  let last = 0;
  let running = false;
  let elapsed = 0;
  let frames = 0;
  let raf = 0;

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000 || 0, 0.1);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= step && n < 4) {
      update(step, elapsed);
      elapsed += step;
      acc -= step;
      n += 1;
    }
    if (n === 4) acc = 0;
    frames += 1;
    render(elapsed);
  }

  return {
    get elapsed() {
      return elapsed;
    },
    get frames() {
      return frames;
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    stepN(n) {
      for (let i = 0; i < n; i += 1) { update(step, elapsed); elapsed += step; }
    },
  };
}
