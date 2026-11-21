export const WANTED_LEVELS = {
  1: { cruisers: 1, speed: 26, sight: 40, evade: 6, search: 10, tick: 5, blocks: 0 },
  2: { cruisers: 2, speed: 29, sight: 48, evade: 7, search: 12, tick: 5, blocks: 0 },
  3: { cruisers: 2, speed: 31, sight: 55, evade: 8, search: 14, tick: 6, blocks: 1 },
  4: { cruisers: 3, speed: 33, sight: 62, evade: 9, search: 16, tick: 6, blocks: 2 },
  5: { cruisers: 4, speed: 35, sight: 70, evade: 10, search: 18, tick: 7, blocks: 2 },
};

export class WantedSystem {
  constructor(state, police) {
    this.state = state;
    this.police = police;
    this.phase = "calm";
    this.level = 0;
    this.unseen = 0;
    this.searchT = 0;
    this.coolT = 0;
    this.bustT = 0;
    this.grace = 0;
    this.crimeCd = 0;
    this.lastSeen = { x: 0, z: 0 };
  }

  commitCrime(n) {
    if (this.crimeCd > 0) return;
    this.crimeCd = 6;
    this.state.setWanted(this.state.wanted + n);
  }

  bust() {
    const fine = Math.min(50, this.state.money);
    this.state.addMoney(-fine);
    this.state.counters.arrests += 1;
    this.state.setWanted(0);
    this.level = 0;
    this.phase = "calm";
    this.bustT = 0;
    this.police.standDown();
    this.state.say(`Busted! You paid a $${fine} fine.`);
  }

  update(dt, target) {
    this.crimeCd = Math.max(0, this.crimeCd - dt);
    this.grace = Math.max(0, this.grace - dt);
    const level = this.state.wanted;
    if (level === 0) {
      if (this.phase !== "calm") {
        this.phase = "calm";
        this.level = 0;
        this.police.standDown();
      }
      return;
    }
    const L = WANTED_LEVELS[level];
    if (level !== this.level) {
      if (level > this.level) {
        this.level = level;
        this.phase = "pursued";
        this.unseen = 0;
        this.grace = 4;
        this.police.engage(target, L);
        this.state.say(level >= 3 ? `Roadblocks up — ${level} stars!` : "The Bay Police are after you!");
      } else {
        this.level = level;
        this.police.syncCount(L);
      }
    }
    const pos = target.group.position;
    const near = this.police.nearestDist(pos);
    const seen = this.grace > 0 || near < L.sight;
    if (seen) {
      if (this.phase !== "pursued") {
        this.phase = "pursued";
        this.police.engage(target, L);
        this.state.say("Spotted again!");
      }
      this.unseen = 0;
      this.lastSeen.x = pos.x;
      this.lastSeen.z = pos.z;
      if (near < 4.5 && Math.abs(this.state.speed) < 3) {
        this.bustT += dt;
        if (this.bustT > 3) this.bust();
      } else {
        this.bustT = 0;
      }
      return;
    }
    this.bustT = 0;
    this.unseen += dt;
    if (this.phase === "pursued" && this.unseen > L.evade) {
      this.phase = "searching";
      this.searchT = 0;
      this.police.search(this.lastSeen);
      this.state.say("You lost them — stay out of sight!");
    } else if (this.phase === "searching") {
      this.searchT += dt;
      if (this.searchT > L.search) {
        this.phase = "cooldown";
        this.coolT = 0;
        this.police.standDown();
        this.state.say("The heat is cooling off...");
      }
    } else if (this.phase === "cooldown") {
      this.coolT += dt;
      if (this.coolT > L.tick) {
        this.coolT = 0;
        this.state.setWanted(level - 1);
        if (this.state.wanted === 0) this.state.say("You escaped!");
      }
    }
  }
}
