// Third-person camera: follow, chase, and orbit modes.
import * as THREE from "three";

const desired = new THREE.Vector3();
const head = new THREE.Vector3();
const rayDir = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = "orbit";
    this.yaw = 0.7;
    this.pitch = 0.32;
    this.distance = 9;
    this.target = null;
    this.center = new THREE.Vector3(0, 3, 0);
    this.orbitAngle = 0.7;
    this.orbitRadius = 24;
    this.orbitHeight = 11;
    this.trauma = 0;
    this.fov = 55;
    this.fovFixed = null;
    this.sensitivity = 0.0026;
  }

  setTarget(object, height = 1.7) {
    this.target = object;
    this.targetHeight = height;
  }

  addTrauma(n) {
    this.trauma = Math.min(1, this.trauma + n);
  }

  snap() {
    if (!this.target) return;
    head.copy(this.target.position);
    head.y += this.targetHeight || 1.7;
    this.camera.position.copy(head).add(this.offsetVector());
    this.camera.lookAt(head);
  }

  offsetVector() {
    const d = this.mode === "chase" ? this.distance + 3 : this.distance;
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      Math.sin(this.pitch) * d + (this.mode === "chase" ? 0.4 : 0.8),
      -Math.cos(this.yaw) * Math.cos(this.pitch) * d,
    );
  }

  update(dt, input, speed, occluders, fixedAngle) {
    if (this.mode === "orbit") {
      const angle = fixedAngle ?? this.orbitAngle;
      if (fixedAngle === undefined) this.orbitAngle += dt * 0.05;
      this.camera.position.set(
        this.center.x + Math.sin(angle) * this.orbitRadius,
        this.orbitHeight,
        this.center.z + Math.cos(angle) * this.orbitRadius,
      );
      this.camera.lookAt(this.center);
      return;
    }
    if (!this.target) return;
    const look = input ? input.lookDelta() : { dx: 0, dy: 0 };
    const sens = this.sensitivity * (this.sensScale || 1);
    this.yaw -= look.dx * sens;
    this.pitch = Math.max(0.05, Math.min(1.1, this.pitch + look.dy * sens));
    head.copy(this.target.position);
    head.y += this.targetHeight || 1.7;
    desired.copy(head).add(this.offsetVector());
    let dist = desired.distanceTo(head);
    if (occluders && occluders.length) {
      rayDir.copy(desired).sub(head).normalize();
      raycaster.set(head, rayDir);
      raycaster.far = dist;
      const hit = raycaster.intersectObjects(occluders, false)[0];
      if (hit) {
        dist = Math.max(1.6, hit.distance * 0.88);
        desired.copy(head).addScaledVector(rayDir, dist);
      }
    }
    const k = 1 - Math.exp(-dt * (this.mode === "chase" ? 6 : 10));
    this.camera.position.lerp(desired, k);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const shake = this.trauma * this.trauma * 0.35;
    const t = performance.now() / 90;
    this.camera.position.x += Math.sin(t * 1.3) * shake;
    this.camera.position.y += Math.sin(t * 1.7 + 2) * shake;
    this.camera.lookAt(head);
    const baseFov = this.mode === "chase" ? 62 : 55;
    const wantFov = this.fovFixed ?? (baseFov + Math.min(10, Math.abs(speed || 0) * 0.22));
    this.fov += (wantFov - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(this.camera.fov - this.fov) > 0.05) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
