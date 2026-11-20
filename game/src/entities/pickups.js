// Pickups: health, armor, ammo, and the SMG itself. Fixed spots respawn
// after 20 s; drops from fallen gang members are one-time.
import * as THREE from "three";

const TYPES = {
  health: { color: 0x7ed957, label: "Health +30" },
  armor: { color: 0x6fb3e8, label: "Armor +50" },
  ammo: { color: 0xffc857, label: "Ammo restocked" },
  smg: { color: 0xff5a4e, label: "SMG picked up!" },
};

class Item {
  constructor(scene, type, x, z, respawn) {
    this.type = type;
    this.respawn = respawn;
    this.taken = false;
    this.respawnT = 0;
    this.offset = (x * 7 + z * 13) % 6;
    const mat = new THREE.MeshStandardMaterial({
      color: TYPES[type].color, roughness: 0.4, emissive: TYPES[type].color, emissiveIntensity: 0.35,
    });
    this.group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat);
    box.castShadow = true;
    this.group.add(box);
    this.group.position.set(x, 0.7, z);
    scene.add(this.group);
  }
}

export class Pickups {
  constructor(scene, city) {
    this.scene = scene;
    this.t = 0;
    const s = city.shopPos;
    this.items = [
      new Item(scene, "health", s.x - 4, s.z + 6, true),
      new Item(scene, "armor", 100, 48, true),
      new Item(scene, "ammo", -25, 88, true),
      new Item(scene, "smg", 80, -70, true),
    ];
  }

  spawnAt(pos, type) {
    const item = new Item(this.scene, type, pos.x, pos.z, false);
    this.items.push(item);
    const drops = this.items.filter((i) => !i.respawn);
    if (drops.length > 6) {
      const old = drops[0];
      this.scene.remove(old.group);
      this.items.splice(this.items.indexOf(old), 1);
    }
  }

  apply(type, state, combat) {
    if (type === "health") {
      state.heal(30);
      state.gainStat("health", 10);
    } else if (type === "armor") state.armor = Math.min(state.maxArmor, state.armor + 50);
    else if (type === "ammo") {
      if (state.ammo.pistol) state.ammo.pistol.reserve += 24;
      if (state.ammo.smg) state.ammo.smg.reserve += 60;
    } else if (type === "smg") combat.giveWeapon("smg");
    state.say(TYPES[type].label);
  }

  update(step, playerPos, state, combat) {
    this.t += step;
    for (const item of this.items) {
      if (item.taken) {
        if (item.respawn) {
          item.respawnT -= step;
          if (item.respawnT <= 0) {
            item.taken = false;
            item.group.visible = true;
          }
        }
        continue;
      }
      item.group.position.y = 0.7 + Math.sin(this.t * 2 + item.offset) * 0.15;
      item.group.rotation.y += step * 1.5;
      const dx = item.group.position.x - playerPos.x;
      const dz = item.group.position.z - playerPos.z;
      if (dx * dx + dz * dz < 4) {
        item.taken = true;
        item.group.visible = false;
        item.respawnT = 20;
        this.apply(item.type, state, combat);
      }
    }
  }
}
