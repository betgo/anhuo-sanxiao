import Phaser from "phaser";
import { loadAudio } from "../audio";

const KINDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
const CLASSES = ["out", "surv", "ctrl"] as const;
const HERO_POSES = [
  "idle-0", "idle-1",
  "walk-0", "walk-1", "walk-2", "walk-3",
  "attack-0", "attack-1", "attack-2",
  "down-0", "down-1",
] as const;

export class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload() {
    const bar = this.add.rectangle(210, 390, 200, 12, 0x3a2618).setOrigin(0.5);
    const fill = this.add.rectangle(110, 390, 0, 10, 0xc9a227).setOrigin(0, 0.5);
    this.load.on("progress", (p: number) => { fill.width = 200 * p; });

    for (let i = 1; i <= 10; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`enemy-${id}`, `art/enemy-${id}.png`);
    }
    for (const c of CLASSES) this.load.image(`hero-${c}`, `art/hero-${c}.png`);
    for (const c of ["r", "b", "g", "y"]) this.load.image(`bead-${c}`, `art/bead-${c}.png`);
    this.load.image("icon-sword", "art/icon-sword.png");
    this.load.image("icon-amulet", "art/icon-amulet.png");
    this.load.image("bg-battle", "art/bg-battle.png");
    this.load.image("board-panel", "art/board-panel.png");
    this.load.image("ui-log-btn", "art/ui-log-btn.png");
    this.load.image("ui-log-panel", "art/ui-log-panel.png");

    for (const k of KINDS) {
      for (const pose of [
        "idle-0", "idle-1",
        "walk-0", "walk-1", "walk-2", "walk-3",
        "attack-0", "attack-1", "attack-2",
        "down-0", "down-1",
      ]) {
        this.load.image(`e${k}-${pose}`, `art/frames/enemy-${k}-${pose}.png`);
      }
    }
    for (const c of CLASSES) {
      for (const pose of HERO_POSES) {
        this.load.image(`hero-${c}-${pose}`, `art/frames/hero-${c}-${pose}.png`);
      }
    }
    // legacy shared hero keys (fallback)
    for (const p of ["idle-0", "idle-1", "walk-0", "walk-1", "walk-2", "walk-3", "attack-0", "attack-1", "attack-2"]) {
      this.load.image(`hero-${p}`, `art/frames/hero-${p}.png`);
    }
    loadAudio(this);
  }

  create() {
    for (const k of KINDS) {
      this.anims.create({
        key: `e${k}-idle`,
        frames: [{ key: `e${k}-idle-0` }, { key: `e${k}-idle-1` }],
        frameRate: 4, repeat: -1,
      });
      this.anims.create({
        key: `e${k}-walk`,
        frames: [0, 1, 2, 3].map((i) => ({ key: `e${k}-walk-${i}` })),
        frameRate: 8, repeat: -1,
      });
      this.anims.create({
        key: `e${k}-attack`,
        frames: [0, 1, 2].map((i) => ({ key: `e${k}-attack-${i}` })),
        frameRate: 10, repeat: 0,
      });
      this.anims.create({
        key: `e${k}-down`,
        frames: [{ key: `e${k}-down-0` }, { key: `e${k}-down-1` }],
        frameRate: 6, repeat: 0,
      });
    }
    for (const c of CLASSES) {
      this.anims.create({
        key: `hero-${c}-idle`,
        frames: [{ key: `hero-${c}-idle-0` }, { key: `hero-${c}-idle-1` }],
        frameRate: 4, repeat: -1,
      });
      this.anims.create({
        key: `hero-${c}-walk`,
        frames: [0, 1, 2, 3].map((i) => ({ key: `hero-${c}-walk-${i}` })),
        frameRate: 8, repeat: -1,
      });
      this.anims.create({
        key: `hero-${c}-attack`,
        frames: [0, 1, 2].map((i) => ({ key: `hero-${c}-attack-${i}` })),
        frameRate: 10, repeat: 0,
      });
      this.anims.create({
        key: `hero-${c}-down`,
        frames: [{ key: `hero-${c}-down-0` }, { key: `hero-${c}-down-1` }],
        frameRate: 6, repeat: 0,
      });
    }
    // keep generic keys pointing at out for any leftover callers
    this.anims.create({
      key: "hero-idle",
      frames: [{ key: "hero-out-idle-0" }, { key: "hero-out-idle-1" }],
      frameRate: 4, repeat: -1,
    });
    this.anims.create({
      key: "hero-walk",
      frames: [0, 1, 2, 3].map((i) => ({ key: `hero-out-walk-${i}` })),
      frameRate: 8, repeat: -1,
    });
    this.anims.create({
      key: "hero-attack",
      frames: [0, 1, 2].map((i) => ({ key: `hero-out-attack-${i}` })),
      frameRate: 10, repeat: 0,
    });
    this.scene.start("title");
  }
}
