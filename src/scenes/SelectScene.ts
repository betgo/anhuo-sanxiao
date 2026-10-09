import Phaser from "phaser";
import { LEVELS } from "../logic/rules";
import { loadSave, persist } from "../save";
import { W } from "../config";

const HINTS = [
  "红珠抬攻击", "裂击解锁", "绿珠回血", "黄珠职业增效",
  "点怪锁定", "疾行鬼很快", "锈剑 +2 攻击", "职业技解锁",
  "力量很高", "领主入场后强化",
];

export class SelectScene extends Phaser.Scene {
  constructor() { super("select"); }

  create() {
    const save = loadSave();
    this.add.rectangle(0, 0, W, 2000, 0x1a120c).setOrigin(0);
    this.add.text(16, 16, "第一章 · 地牢初燃", { fontSize: "22px", color: "#e6d3b0" });
    this.add.text(W - 16, 22, `已通关 ${save.cleared.filter(Boolean).length} / 10`, { fontSize: "12px", color: "#8a7355" }).setOrigin(1, 0);

    let y = 60;
    LEVELS.forEach((lv: any, i: number) => {
      const unlocked = save.unlockAll || i === 0 || save.cleared[i - 1];
      const row = this.add.container(16, y);
      const bg = this.add.rectangle(0, 0, W - 32, 56, unlocked ? 0x2a1c14 : 0x15100c)
        .setOrigin(0).setStrokeStyle(1, unlocked ? 0x5a3b28 : 0x333).setInteractive({ useHandCursor: unlocked });
      const img = this.add.image(28, 28, `enemy-${String(i + 1).padStart(2, "0")}`).setDisplaySize(40, 45);
      const title = this.add.text(58, 10, `第 ${i + 1} 关 · ${lv.name}`, { fontSize: "14px", color: unlocked ? "#e6d3b0" : "#555" });
      const hint = this.add.text(58, 30, unlocked ? HINTS[i] : "未解锁", { fontSize: "11px", color: "#8a7355" });
      row.add([bg, img, title, hint]);
      if (unlocked) {
        bg.on("pointerdown", () => this.scene.start("prep", { levelIndex: i }));
      }
      y += 64;
    });

    const tog = this.add.text(16, y + 12, save.unlockAll ? "☑ 全部解锁" : "☐ 全部解锁", { fontSize: "14px", color: "#cbb892" })
      .setInteractive({ useHandCursor: true });
    tog.on("pointerdown", () => {
      save.unlockAll = !save.unlockAll;
      persist(save);
      this.scene.restart();
    });

    const back = this.add.text(16, y + 48, "← 标题", { fontSize: "14px", color: "#a89070" }).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("title"));
  }
}
