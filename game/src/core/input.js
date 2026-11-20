// Keyboard + mouse input: held keys, per-frame pressed edges, and
// pointer-lock look deltas. Arrow keys turn the camera as a fallback.
export class Input {
  constructor(host) {
    this.host = host;
    this.keys = new Set();
    this.pressed = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onMouseMove = (e) => {
      if (document.pointerLockElement === this.host) {
        this.lookX += e.movementX || 0;
        this.lookY += e.movementY || 0;
      }
    };
    this.onBlur = () => {
      this.keys.clear();
      this.pressed.clear();
    };
    this.clicked = false;
    this.onMouseDown = (e) => {
      if (e.button !== 0) return;
      this.keys.add("Mouse0");
      this.pressed.add("Mouse0");
      this.clicked = true;
    };
    this.onMouseUp = (e) => {
      if (e.button === 0) this.keys.delete("Mouse0");
    };
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("blur", this.onBlur);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  lookDelta() {
    const dx = this.lookX + (this.isDown("ArrowLeft") ? -4 : 0) + (this.isDown("ArrowRight") ? 4 : 0);
    const dy = this.lookY + (this.isDown("ArrowUp") ? -3 : 0) + (this.isDown("ArrowDown") ? 3 : 0);
    this.lookX = 0;
    this.lookY = 0;
    return { dx, dy };
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }

  lockPointer() {
    if (document.pointerLockElement !== this.host) {
      try {
        const p = this.host.requestPointerLock?.();
        if (p && p.catch) p.catch(() => {});
      } catch { /* no gesture yet: the next canvas click locks */ }
    }
  }
}
