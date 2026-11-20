// Street props: instanced palm fields (curved ringed trunks, bent
// fronds with varied length), instanced bollards, lamps, and benches.
// One InstancedMesh per part keeps hundreds of palms at a few draws.
import * as THREE from "three";
import { PALETTE } from "../config.js";

const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 1 });
const ringMat = new THREE.MeshStandardMaterial({ color: 0x6f452c, roughness: 1 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
const nutMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3446, roughness: 0.7, metalness: 0.4 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0xa9744f, roughness: 0.95 });
const steelMat = new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 0.5, metalness: 0.5 });

export const lampGlowMat = new THREE.MeshStandardMaterial({
  color: 0xfff6d8, emissive: 0xffd9a0, emissiveIntensity: 0.2, roughness: 0.4,
});

const trunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 1.6, 7);
const ringGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.16, 7);
const nutGeo = new THREE.SphereGeometry(0.22, 8, 6);

function frondGeometry() {
  const geo = new THREE.PlaneGeometry(1.0, 3.8, 1, 5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const t = (y + 1.9) / 3.8;
    pos.setX(i, pos.getX(i) * (1 - t * 0.55));
    pos.setZ(i, -(t * t) * 1.55);
  }
  geo.computeVertexNormals();
  return geo;
}
const frondGeo = frondGeometry();
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

function instanced(geo, mat, count, shadow = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  return mesh;
}

// placements: [{x, z, s, rot, lean, leanDir, fronds, tint}]
export function buildPalmField(placements) {
  const group = new THREE.Group();
  const segs = 5;
  const trunkCount = placements.length * segs;
  const ringCount = placements.length * (segs - 1);
  let frondCount = 0;
  for (const p of placements) frondCount += p.fronds;
  const trunks = instanced(trunkGeo, trunkMat, trunkCount);
  const rings = instanced(ringGeo, ringMat, ringCount);
  const fronds = instanced(frondGeo, leafMat, frondCount);
  const nuts = instanced(nutGeo, nutMat, placements.length * 2);
  let ti = 0;
  let ri = 0;
  let fi = 0;
  let ni = 0;
  for (const p of placements) {
    let topX = 0;
    let topZ = 0;
    for (let i = 0; i < segs; i += 1) {
      const bend = (i / segs) * p.lean;
      topX = Math.cos(p.leanDir) * bend * 1.6;
      topZ = Math.sin(p.leanDir) * bend * 1.6;
      dummy.position.set(p.x + topX * p.s, (0.8 + i * 1.5) * p.s, p.z + topZ * p.s);
      dummy.rotation.set(Math.sin(p.leanDir) * bend * 0.22, 0, -Math.cos(p.leanDir) * bend * 0.22);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(ti, dummy.matrix);
      ti += 1;
      if (i > 0 && i < segs) {
        dummy.position.y = (0.05 + i * 1.5) * p.s;
        dummy.updateMatrix();
        rings.setMatrixAt(ri, dummy.matrix);
        ri += 1;
      }
    }
    const crownY = (0.8 + (segs - 1) * 1.5 + 0.7) * p.s;
    tmpColor.setHSL(0.36 + p.tint * 0.04, 0.55, 0.36 + p.tint * 0.08);
    for (let i = 0; i < p.fronds; i += 1) {
      const angle = p.rot + (i / p.fronds) * Math.PI * 2;
      const len = 0.8 + ((i * 37 + Math.floor(p.x * 3)) % 10) / 22;
      dummy.position.set(p.x + topX * p.s, crownY, p.z + topZ * p.s);
      dummy.rotation.order = "YXZ";
      dummy.rotation.set(-Math.PI / 2 + 0.85 + (i % 3) * 0.12, angle, 0);
      dummy.scale.set(p.s, p.s * len, p.s);
      dummy.updateMatrix();
      fronds.setMatrixAt(fi, dummy.matrix);
      fronds.setColorAt(fi, tmpColor);
      fi += 1;
    }
    for (let i = 0; i < 2; i += 1) {
      dummy.position.set(p.x + topX * p.s + (i - 0.5) * 0.5, crownY - 0.25 * p.s, p.z + topZ * p.s);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      nuts.setMatrixAt(ni, dummy.matrix);
      ni += 1;
    }
  }
  group.add(trunks, rings, fronds, nuts);
  return group;
}

export function buildBollardField(positions) {
  const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.8, 8);
  const posts = instanced(postGeo, steelMat, positions.length);
  positions.forEach(([x, z], i) => {
    dummy.position.set(x, 0.4, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  });
  return posts;
}

export function makeLamp() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.2, 6), poleMat);
  pole.position.y = 2.6;
  pole.castShadow = true;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), poleMat);
  arm.position.set(0.4, 5.15, 0);
  group.add(arm);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampGlowMat);
  head.position.set(0.8, 5.05, 0);
  group.add(head);
  return group;
}

export function makeBench() {
  const group = new THREE.Group();
  for (const x of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.5), poleMat);
    leg.position.set(x, 0.25, 0);
    group.add(leg);
  }
  for (let i = 0; i < 3; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.16), woodMat);
    slat.position.set(0, 0.55, -0.2 + i * 0.2);
    slat.castShadow = true;
    group.add(slat);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.08), woodMat);
  back.position.set(0, 0.9, -0.28);
  back.rotation.x = -0.18;
  back.castShadow = true;
  group.add(back);
  return group;
}
