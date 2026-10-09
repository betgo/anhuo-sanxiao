import Phaser from "phaser";
import { loadSave } from "../save";
import { W, H } from "../config";
import { addMuteButton, unlockAudio, playBgm, AUDIO_KEYS } from "../audio";

export class TitleScene extends Phaser.Scene {
  constructor() { super("title"); }

  create() {
    const save = loadSave();
    const n = save.cleared.filter(Boolean).length;
    this.add.rectangle(0, 0, W, H, 0x1a120c).setOrigin(0);
    this.add.image(W / 2, 160, "enemy-10").setDisplaySize(96, 108);
    this.add.text(W / 2, 250, "暗火三消", { fontFamily: "serif", fontSize: "36px", color: "#e6d3b0" }).setOrigin(0.5);
    this.add.text(W / 2, 300, "像素暗黑 · 实时 RPG · 三消增效", { fontSize: "14px", color: "#a89070" }).setOrigin(0.5);
    const beads = ["r", "b", "g", "y"];
    const labels = ["红·加攻", "蓝·技能", "绿·治疗", "黄·职业"];
    beads.forEach((c, i) => {
      const x = 70 + i * 90;
      this.add.image(x, 360, `bead-${c}`).setDisplaySize(32, 32);
      this.add.text(x, 390, labels[i], { fontSize: "11px", color: "#cbb892" }).setOrigin(0.5);
    });
    const btn = this.add.rectangle(W / 2, 460, 200, 48, 0x5a3b28).setStrokeStyle(2, 0xc9a227).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 460, "进入地牢", { fontSize: "18px", color: "#f3e6c0" }).setOrigin(0.5);
    btn.on("pointerdown", () => {
      unlockAudio(this);
      playBgm(this, AUDIO_KEYS.bgmMenu);
      this.scene.start("select");
    });
    this.add.text(W / 2, 520, `第一章进度 ${n} / 10`, { fontSize: "13px", color: "#8a7355" }).setOrigin(0.5);
    this.add.text(W / 2, 560, "Phaser 3 · Vite", { fontSize: "11px", color: "#6a5540" }).setOrigin(0.5);
    addMuteButton(this, () => playBgm(this, AUDIO_KEYS.bgmMenu));
    // try play if already unlocked / not muted
    playBgm(this, AUDIO_KEYS.bgmMenu);
  }
}
