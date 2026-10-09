import Phaser from "phaser";

const KINDS = ["01","02","03","04","05","06","07","08","09","10"];
const POSES = ["idle","walk","attack","down"] as const;

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
    for (const c of ["out", "surv", "ctrl"]) this.load.image(`hero-${c}`, `art/hero-${c}.png`);
    for (const c of ["r", "b", "g", "y"]) this.load.image(`bead-${c}`, `art/bead-${c}.png`);
    this.load.image("icon-sword", "art/icon-sword.png");
    this.load.image("icon-amulet", "art/icon-amulet.png");

    for (const k of KINDS) {
      this.load.image(`e${k}-idle-0`, `art/frames/enemy-${k}-idle-0.png`);
      this.load.image(`e${k}-idle-1`, `art/frames/enemy-${k}-idle-1.png`);
      this.load.image(`e${k}-walk-0`, `art/frames/enemy-${k}-walk-0.png`);
      this.load.image(`e${k}-walk-1`, `art/frames/enemy-${k}-walk-1.png`);
      this.load.image(`e${k}-walk-2`, `art/frames/enemy-${k}-walk-2.png`);
      this.load.image(`e${k}-walk-3`, `art/frames/enemy-${k}-walk-3.png`);
      this.load.image(`e${k}-attack-0`, `art/frames/enemy-${k}-attack-0.png`);
      this.load.image(`e${k}-attack-1`, `art/frames/enemy-${k}-attack-1.png`);
      this.load.image(`e${k}-attack-2`, `art/frames/enemy-${k}-attack-2.png`);
      this.load.image(`e${k}-down-0`, `art/frames/enemy-${k}-down-0.png`);
    }
    for (const p of ["idle-0","idle-1","walk-0","walk-1","walk-2","walk-3","attack-0","attack-1","attack-2"]) {
      this.load.image(`hero-${p}`, `art/frames/hero-${p}.png`);
    }
  }

  create() {
    for (const k of KINDS) {
      this.anims.create({ key: `e${k}-idle`, frames: [{ key: `e${k}-idle-0` }, { key: `e${k}-idle-1` }], frameRate: 4, repeat: -1 });
      this.anims.create({ key: `e${k}-walk`, frames: [0,1,2,3].map(i => ({ key: `e${k}-walk-${i}` })), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `e${k}-attack`, frames: [0,1,2].map(i => ({ key: `e${k}-attack-${i}` })), frameRate: 10, repeat: 0 });
      this.anims.create({ key: `e${k}-down`, frames: [{ key: `e${k}-down-0` }], frameRate: 1, repeat: 0 });
    }
    this.anims.create({ key: "hero-idle", frames: [{ key: "hero-idle-0" }, { key: "hero-idle-1" }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: "hero-walk", frames: [0,1,2,3].map(i => ({ key: `hero-walk-${i}` })), frameRate: 8, repeat: -1 });
    this.anims.create({ key: "hero-attack", frames: [0,1,2].map(i => ({ key: `hero-attack-${i}` })), frameRate: 10, repeat: 0 });
    this.scene.start("title");
  }
}
