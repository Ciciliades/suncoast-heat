// Suncoast landmarks: the pier with its ferris wheel, the striped
// lighthouse with a rotating beam, Suncoast Arena, the marina bridge,
// and Plaza del Sol with its fountain.
import * as THREE from "three";
import { pick } from "../core/random.js";
import { flat, box, seaTexture, signTexture } from "./city.js";

export function buildLandmarks(scene, rng, roadSegments) {
  const colliders = [];
  const occluders = [];
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xa9744f, roughness: 0.95 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 1 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.9 });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffc857 });
  const seaMat = new THREE.MeshStandardMaterial({ map: seaTexture(), roughness: 0.25, metalness: 0.08 });

  const pier = new THREE.Group();
  pier.add(box(6, 0.5, 46, woodMat, 0, 1.1, 0, false));
  for (let z = -20; z <= 20; z += 6) {
    pier.add(box(0.5, 1.4, 0.5, woodMat, -2.6, 0.4, z, false));
    pier.add(box(0.5, 1.4, 0.5, woodMat, 2.6, 0.4, z, false));
  }
  pier.add(box(0.2, 0.9, 44, woodMat, -2.9, 1.8, 0, false));
  pier.add(box(0.2, 0.9, 44, woodMat, 2.9, 1.8, 0, false));
  pier.position.set(-30, 0, 104);
  scene.add(pier);
  const wheel = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xff8f7d, roughness: 0.7 });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(9, 0.25, 8, 28), wheelMat));
  for (let i = 0; i < 6; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.25, 18, 0.25), wheelMat);
    spoke.rotation.z = (i * Math.PI) / 6;
    wheel.add(spoke);
  }
  const cabins = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const cab = box(1.6, 1.6, 1.6, new THREE.MeshStandardMaterial({ color: pick(rng, [0xffc857, 0x1fb6c9, 0xff5a4e, 0x7ed957]), roughness: 0.8 }), Math.cos(a) * 9, Math.sin(a) * 9, 0);
    wheel.add(cab);
    cabins.push(cab);
  }
  const wheelFrame = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b3446, roughness: 0.7 });
  for (const s of [1, -1]) {
    const leg = box(0.6, 13, 0.6, legMat, 0, 6, s * 2.4);
    leg.rotation.x = s * 0.3;
    wheelFrame.add(leg);
  }
  wheel.position.set(0, 10.5, 0);
  wheelFrame.add(wheel);
  wheelFrame.position.set(-30, 1.3, 122);
  wheelFrame.rotation.y = Math.PI / 2;
  scene.add(wheelFrame);

  const light = new THREE.Group();
  light.add(new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 2, 10), rockMat));
  for (let i = 0; i < 5; i += 1) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.7 - i * 0.12, 1.9 - i * 0.12, 3, 12), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe2574c : 0xfff7e8, roughness: 0.85 }));
    band.position.y = 3.5 + i * 3;
    band.castShadow = true;
    light.add(band);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.6, 12), rockMat);
  gallery.position.y = 17.3;
  light.add(gallery);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2, 10), new THREE.MeshStandardMaterial({ color: 0xbfeef5, roughness: 0.2, emissive: 0xfff6d8, emissiveIntensity: 0.8 }));
  lampRoom.position.y = 18.6;
  light.add(lampRoom);
  const beam = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.z = Math.PI / 2;
  cone.position.set(13, 0, 0);
  beam.add(cone);
  beam.position.set(0, 18.6, 0);
  light.add(beam);
  light.position.set(112, 0, 98);
  scene.add(light);
  colliders.push({ x1: 107, x2: 117, z1: 93, z2: 103 });

  const arena = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 10, 22, 1, true), new THREE.MeshStandardMaterial({ color: 0xf7c9d4, roughness: 0.9, side: THREE.DoubleSide }));
  bowl.position.y = 5;
  bowl.castShadow = true;
  arena.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(18, 1, 8, 22), new THREE.MeshStandardMaterial({ color: 0xff8f7d, roughness: 0.85 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 10;
  arena.add(rim);
  const arenaSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshBasicMaterial({ map: signTexture("Suncoast Arena", "#1a0a2e", "#ffc857") }));
  arenaSign.position.set(0, 7, 19.2);
  arena.add(arenaSign);
  arena.position.set(60, 0, -60);
  scene.add(arena);
  occluders.push(bowl);
  colliders.push({ x1: 42, x2: 78, z1: -78, z2: -42 });

  const bridge = new THREE.Group();
  bridge.add(box(28, 1, 10, new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 0.9 }), 0, 1.6, 0, false));
  bridge.add(flat(28, 0.28, yellowMat, 0, 0, 2.12));
  for (const s of [1, -1]) bridge.add(box(28, 0.9, 0.3, curbMat, 0, 2.5, s * 4.8, false));
  for (const x of [-9, 9]) bridge.add(box(1.2, 2.4, 8, rockMat, x, 0.4, 0, false));
  bridge.position.set(107, 0, 52);
  scene.add(bridge);
  roadSegments.push({ x1: 94, z1: 52, x2: 120, z2: 52 });

  const plaza = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(12, 24), new THREE.MeshStandardMaterial({ color: 0xffd9a0, roughness: 0.95 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.09;
  disc.receiveShadow = true;
  plaza.add(disc);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 1, 16), rockMat);
  basin.position.y = 0.5;
  plaza.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.7, 16), seaMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.02;
  plaza.add(water);
  plaza.add(box(0.6, 2.2, 0.6, rockMat, 0, 1.6, 0));
  plaza.position.set(-97, 0, 20);
  scene.add(plaza);
  colliders.push({ x1: -100.5, x2: -93.5, z1: 16.5, z2: 23.5 });

  return { colliders, occluders, animated: { wheel, cabins, beam } };
}

export function updateLandmarks(animT, animated) {
  if (!animated) return;
  animated.wheel.rotation.z = animT * 0.15;
  for (const cab of animated.cabins) cab.rotation.z = -animT * 0.15;
  animated.beam.rotation.y = animT * 0.5;
}
