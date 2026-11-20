// Renderer: sRGB + ACES, warm key light, sky dome, fog.
import * as THREE from "three";

const STOPS = [
  { h: 0, zen: 0x0b1e3a, hor: 0x27395e, sun: 0x8fb4ff, sunI: 0.3, hemiI: 0.3, ambI: 0.24, near: 45, far: 170, cloud: 0.22, glow: 0.15 },
  { h: 6, zen: 0x7ec8e3, hor: 0xffc98a, sun: 0xffd9a8, sunI: 1.4, hemiI: 0.6, ambI: 0.24, near: 60, far: 210, cloud: 0.6, glow: 0.5 },
  { h: 12, zen: 0x3fa7e0, hor: 0xcfeef5, sun: 0xfff3d6, sunI: 2.6, hemiI: 0.9, ambI: 0.28, near: 75, far: 240, cloud: 0.8, glow: 0.35 },
  { h: 17.5, zen: 0x5aa8e6, hor: 0xffc98a, sun: 0xffd9a0, sunI: 2.3, hemiI: 0.85, ambI: 0.26, near: 65, far: 220, cloud: 0.75, glow: 0.62 },
  { h: 19, zen: 0x4a5fa8, hor: 0xff9e5e, sun: 0xff8a4d, sunI: 1.25, hemiI: 0.42, ambI: 0.24, near: 55, far: 200, cloud: 0.55, glow: 0.9 },
  { h: 21, zen: 0x16264d, hor: 0x3a3a6e, sun: 0x8fb4ff, sunI: 0.35, hemiI: 0.32, ambI: 0.24, near: 48, far: 175, cloud: 0.25, glow: 0.15 },
  { h: 24, zen: 0x0b1e3a, hor: 0x27395e, sun: 0x8fb4ff, sunI: 0.3, hemiI: 0.3, ambI: 0.24, near: 45, far: 170, cloud: 0.22, glow: 0.15 },
];

function radialTexture(size, stops, blobs) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.floor(size / 2);
  const ctx = canvas.getContext("2d");
  for (const [cx, cy, r, a] of blobs) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const [pos, col] of stops) g.addColorStop(pos, col.replace("A", String(a)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lerpStops(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < STOPS.length - 2 && h >= STOPS[i + 1].h) i += 1;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = (h - a.h) / (b.h - a.h);
  const out = { t };
  for (const key of ["sunI", "hemiI", "ambI", "near", "far", "cloud", "glow"]) {
    out[key] = a[key] + (b[key] - a[key]) * t;
  }
  out.zen = new THREE.Color(a.zen).lerp(new THREE.Color(b.zen), t);
  out.hor = new THREE.Color(a.hor).lerp(new THREE.Color(b.hor), t);
  out.sun = new THREE.Color(a.sun).lerp(new THREE.Color(b.sun), t);
  return out;
}

export function createWorldRenderer(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 520);
  scene.fog = new THREE.Fog(0xffd9a0, 65, 220);

  const domeGeo = new THREE.SphereGeometry(235, 24, 12);
  const domePos = domeGeo.attributes.position;
  const domeColors = new Float32Array(domePos.count * 3);
  domeGeo.setAttribute("color", new THREE.BufferAttribute(domeColors, 3));
  const dome = new THREE.Mesh(
    domeGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.frustumCulled = false;
  scene.add(dome);

  const glowTex = radialTexture(128, [[0, "rgba(255,240,200,A)"], [0.25, "rgba(255,210,140,A)"], [1, "rgba(255,180,90,0)"]], [[64, 32, 30, 0.9]]);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.set(170, 85, 1);
  scene.add(glow);

  const cloudTex = radialTexture(256, [[0, "rgba(255,255,255,A)"], [0.6, "rgba(255,255,255,A)"], [1, "rgba(255,255,255,0)"]], [[70, 34, 46, 0.9], [128, 30, 58, 0.9], [186, 36, 44, 0.9], [100, 44, 52, 0.8], [160, 46, 50, 0.8]]);
  const clouds = [];
  const cloudSeeds = [[-150, 62, 52, 0.5, -140], [-60, 74, 64, 0.35, -60], [30, 58, 46, 0.6, -170], [110, 70, 58, 0.42, -40], [180, 64, 50, 0.55, -120], [-110, 80, 44, 0.3, 30], [70, 84, 40, 0.38, -90], [-20, 68, 56, 0.45, 50]];
  for (const [x, y, s, speed, z] of cloudSeeds) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.75 }));
    sprite.scale.set(s, s * 0.45, 1);
    sprite.position.set(x, y, z);
    sprite.userData = { x, speed, z };
    clouds.push(sprite);
    scene.add(sprite);
  }

  const sun = new THREE.DirectionalLight(0xffd9a0, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0x6fb3e8, 0xe8a080, 0.85);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xfff1d6, 0.26);
  scene.add(ambient);

  const sunDir = new THREE.Vector3(0.6, 0.7, 0.35);
  const tmpColor = new THREE.Color();
  let daylight = 1;
  let currentHour = 17.4;

  function paintDome(zen, hor) {
    for (let i = 0; i < domePos.count; i += 1) {
      const ny = domePos.getY(i) / 235;
      const t = Math.max(0, Math.min(1, (ny - 0.02) / 0.38));
      tmpColor.copy(hor).lerp(zen, t * t * (3 - 2 * t));
      domeColors[i * 3] = tmpColor.r;
      domeColors[i * 3 + 1] = tmpColor.g;
      domeColors[i * 3 + 2] = tmpColor.b;
    }
    domeGeo.attributes.color.needsUpdate = true;
  }

  function setTimeOfDay(hour) {
    currentHour = ((hour % 24) + 24) % 24;
    const s = lerpStops(currentHour);
    paintDome(s.zen, s.hor);
    scene.fog.color.copy(s.hor);
    scene.fog.near = s.near;
    scene.fog.far = s.far;
    sun.color.copy(s.sun);
    sun.intensity = s.sunI;
    hemi.color.copy(s.zen);
    hemi.intensity = s.hemiI;
    ambient.intensity = s.ambI;
    glow.material.opacity = s.glow;
    glow.material.color.copy(s.sun);
    for (const c of clouds) c.material.opacity = s.cloud;
    daylight = Math.max(0, Math.min(1, s.sunI / 2.4));
    const arc = ((currentHour - 6) / 12) * Math.PI;
    const el = Math.sin(arc);
    if (el > 0.08) {
      sunDir.set(Math.cos(arc) * 0.85, el, 0.4).normalize();
    } else {
      sunDir.set(0.55, 0.34, 0.3).normalize();
    }
  }

  setTimeOfDay(currentHour);

  return {
    renderer,
    scene,
    camera,
    get daylight() {
      return daylight;
    },
    get hour() {
      return currentHour;
    },
    setTimeOfDay,
    setQuality(quality) {
      const ratio = quality === "low" ? 1.15 : quality === "medium" ? 1.5 : Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(ratio);
      const size = quality === "low" ? 1024 : 2048;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        if (sun.shadow.map) {
          sun.shadow.map.dispose();
          sun.shadow.map = null;
        }
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    update(animT, focus) {
      sun.position.copy(focus).addScaledVector(sunDir, 95);
      sun.target.position.copy(focus);
      sun.target.updateMatrixWorld();
      glow.position.copy(focus).addScaledVector(sunDir, 190);
      glow.position.y = Math.max(glow.position.y, 14);
      for (const c of clouds) {
        const x = ((c.userData.x + animT * c.userData.speed * 2 + 200) % 400) - 200;
        c.position.x = focus.x + x * 0.6;
        c.position.z = focus.z + c.userData.z;
      }
    },
    render() {
      renderer.render(scene, camera);
    },
  };
}
