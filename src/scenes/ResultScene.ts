import Phaser from "phaser";
import { LEVELS } from "../logic/rules";
import { W } from "../config";

export class ResultScene extends Phaser.Scene {
  constructor() { super("result"); }

  create(data: { win: boolean; levelIndex: number; detail: string }) {
    const win = !!data?.win;
    const levelIndex = data?.levelIndex ?? 0;
    this.add.rectangle(0, 0, W, 900, 0x1a120c).setOrigin(0);
    this.add.text(W / 2, 200, win ? "胜利" : "失败", { fontSize: "40px", color: win ? "#c9a227" : "#c06060" }).setOrigin(0.5);
    this.add.text(W / 2, 260, data?.detail || "", { fontSize: "14px", color: "#cbb892", align: "center", wordWrap: { width: W - 48 } }).setOrigin(0.5, 0);

    let y = 360;
    if (win && levelIndex < LEVELS.length - 1) {
      const next = this.add.rectangle(W / 2, y, 200, 44, 0x5a3b28).setStrokeStyle(2, 0xc9a227).setInteractive({ useHandCursor: true });
      this.add.text(W / 2, y, "下一关", { fontSize: "16px", color: "#f3e6c0" }).setOrigin(0.5);
      next.on("pointerdown", () => this.scene.start("prep", { levelIndex: levelIndex + 1 }));
      y += 60;
    }
    const retry = this.add.rectangle(W / 2, y, 200, 44, 0x3a2818).setStrokeStyle(2, 0x8a6240).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, y, win ? "再打一次" : "重试", { fontSize: "16px", color: "#e6d3b0" }).setOrigin(0.5);
    retry.on("pointerdown", () => this.scene.start("battle", { levelIndex }));
    y += 60;
    const back = this.add.text(W / 2, y, "返回选关", { fontSize: "14px", color: "#a89070" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("select"));
  }
}
