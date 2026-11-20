// Audio: WebAudio synth SFX only — engine, horn, siren, gunshot, click.
export class AudioSys {
  constructor() {
    this.AC = window.AudioContext || window.webkitAudioContext || null;
    this.ctx = null;
  }

  unlock() {
    if (!this.AC || this.ctx) return;
    try {
      const c = (this.ctx = new this.AC());
      if (c.state === "suspended") c.resume();
      const mk = (type, freq) => {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        const g = c.createGain();
        g.gain.value = 0;
        o.connect(g);
        g.connect(c.destination);
        o.start();
        return { o, g };
      };
      this.eng = mk("sawtooth", 50);
      this.sir = mk("sine", 720);
    } catch {
      this.ctx = null;
    }
  }

  blip(f0, f1, dur, type, vol) {
    if (!this.ctx) return;
    try {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {}
  }

  horn(freq) { this.blip(freq || 440, 0, 0.25, "square", 0.12); }
  shot() { this.blip(900, 90, 0.12, "square", 0.2); }
  click() { this.blip(1200, 0, 0.05, "sine", 0.08); }

  update(vehicle, chasing, t) {
    if (!this.ctx) return;
    const v = vehicle ? Math.abs(vehicle.speed) : 0;
    this.eng.o.frequency.value = 50 + v * 3.2;
    this.eng.g.gain.value = vehicle ? 0.045 : 0;
    this.sir.g.gain.value = chasing ? 0.035 : 0;
    if (chasing) this.sir.o.frequency.value = 720 + 160 * Math.sin(t * 5);
  }
}
