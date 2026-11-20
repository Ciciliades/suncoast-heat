// City builders: procedural canvas textures (facades, asphalt, sand,
// sea, sidewalks, signs) and buildings with setbacks, parapets, roof
// units, awnings, balconies, and storefronts. Districts assemble the
// city from these pieces; see world/districts.js.
import * as THREE from "three";
import { PALETTE } from "../config.js";
import { mulberry32 } from "../core/random.js";
import { lampGlowMat } from "./props.js";

const texCache = new Map();
const facadeMats = [];

function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function facadeTexture(base, seed, glass, cols, rows) {
  return canvasTex(`facade:${base}:${seed}:${glass ? 1 : 0}:${cols}x${rows}`, 256, 256, (ctx) => {
    const rng = mulberry32(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    const cw = 256 / cols;
    const rh = 256 / rows;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lit = rng() < 0.26;
        ctx.fillStyle = glass ? (lit ? "#ffd9a0" : "#2e4a66") : lit ? "#ffd9a0" : "#7fa8c9";
        ctx.fillRect(c * cw + 6, r * rh + 6, cw - 12, rh - 13);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(c * cw + 6, r * rh + 6, cw - 12, 5);
      }
    }
  });
}

export function asphaltTexture() {
  return canvasTex("asphalt", 128, 128, (ctx) => {
    const rng = mulberry32(77);
    ctx.fillStyle = "#3a4356";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i += 1) {
      const v = 52 + Math.floor(rng() * 26);
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
      ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
    }
    ctx.fillStyle = "#ffc857";
    ctx.fillRect(60, 0, 3, 128);
    ctx.fillRect(65, 0, 3, 128);
    ctx.fillStyle = "#fff7e8";
    ctx.fillRect(20, 0, 3, 40);
    ctx.fillRect(105, 0, 3, 40);
  });
}

export function sandTexture() {
  return canvasTex("sand", 128, 128, (ctx) => {
    const rng = mulberry32(41);
    ctx.fillStyle = "#f6dc9f";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 420; i += 1) {
      ctx.fillStyle = rng() < 0.5 ? "rgba(210,170,110,0.35)" : "rgba(255,240,200,0.4)";
      ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
    }
  });
}

export function seaTexture() {
  return canvasTex("sea", 64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#5fe0ee");
    g.addColorStop(0.45, "#1fb6c9");
    g.addColorStop(1, "#0e7fa8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let y = 10; y < 256; y += 30) ctx.fillRect(0, y, 64, 3);
  });
}

export function sidewalkTexture() {
  return canvasTex("sidewalk", 128, 128, (ctx) => {
    ctx.fillStyle = "#ff9d8a";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 4; i += 1) ctx.fillRect(i * 32, 0, 16, 128);
    ctx.strokeStyle = "rgba(140,60,50,0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 32);
      ctx.lineTo(128, i * 32);
      ctx.stroke();
    }
  });
}

export function signTexture(text, bg, fg) {
  return canvasTex(`sign:${text}:${bg}`, 256, 64, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = fg;
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 34);
  });
}

export function box(w, h, d, mat, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function flat(w, d, mat, x, z, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function facadeMaterial(base, seed, glass, cols, rows) {
  const tex = facadeTexture(base, seed, glass, cols, rows);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffc98a, emissiveMap: tex, emissiveIntensity: 0, roughness: 0.85,
  });
  facadeMats.push(mat);
  return mat;
}

export function makeBuilding({ w, h, d, tint, style = "block", seed = 1, sign = "", signBg = "#12303f", signFg = "#ffd9a0" }) {
  const group = new THREE.Group();
  const glass = style === "tower";
  const wallMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });
  const main = box(w, h, d, wallMat, 0, h / 2, 0);
  main.userData.occluder = true;
  group.add(main);
  const cols = Math.max(3, Math.min(7, Math.round(w / 2.6)));
  const rows = Math.max(2, Math.min(9, Math.round(h / 3.4)));
  const face = facadeMaterial(`#${new THREE.Color(tint).getHexString()}`, seed, glass, cols, rows);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.9), face);
  front.position.set(0, h * 0.5, d / 2 + 0.06);
  group.add(front);
  const back = front.clone();
  back.position.z = -d / 2 - 0.06;
  back.rotation.y = Math.PI;
  group.add(back);
  const sideGeo = new THREE.PlaneGeometry(d * 0.9, h * 0.9);
  for (const s of [1, -1]) {
    const side = new THREE.Mesh(sideGeo, face);
    side.position.set((s * w) / 2 + s * 0.06, h * 0.5, 0);
    side.rotation.y = (s * Math.PI) / 2;
    group.add(side);
  }
  group.add(box(w + 0.3, 0.5, d + 0.3, wallMat, 0, h + 0.2, 0));
  const top = box(w * 0.62, Math.max(1.6, h * 0.14), d * 0.62, wallMat, 0, h + h * 0.07, 0);
  group.add(top);
  group.add(box(1.4, 0.9, 1.1, wallMat, -w * 0.28, h + 0.45, -d * 0.22));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 10), wallMat);
  tank.position.set(w * 0.26, h + 0.75, d * 0.2);
  tank.castShadow = true;
  group.add(tank);
  if (style === "shop" || style === "neon") {
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfeef5, roughness: 0.15, metalness: 0.35 });
    const store = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 3), glassMat);
    store.position.set(0, 1.7, d / 2 + 0.08);
    group.add(store);
    const awning = box(w * 0.84, 0.16, 1.6, new THREE.MeshStandardMaterial({ color: style === "neon" ? 0x2b2b4d : PALETTE.roof, roughness: 0.85 }), 0, 3.5, d / 2 + 0.7);
    awning.rotation.x = 0.28;
    group.add(awning);
    if (sign) {
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(w * 0.8, 9), 2),
        new THREE.MeshBasicMaterial({ map: signTexture(sign, signBg, signFg) }),
      );
      signMesh.position.set(0, h * 0.82, d / 2 + 0.1);
      group.add(signMesh);
    }
  }
  if (style === "home") {
    const floors = Math.max(1, Math.floor(h / 5));
    for (let f = 0; f < floors; f += 1) {
      for (const bx of [-w * 0.26, w * 0.26]) {
        group.add(box(2.4, 0.18, 1, wallMat, bx, 3.4 + f * 5, d / 2 + 0.5));
      }
    }
  }
  group.userData.seed = seed;
  return group;
}

export function updateWorld(daylight) {
  lampGlowMat.emissiveIntensity = 0.15 + (1 - daylight) * 1.7;
  const glow = (1 - daylight) * 0.75;
  for (const mat of facadeMats) mat.emissiveIntensity = glow;
}
