import Phaser from "phaser";
import { LEVELS, HERO_STATS, CLASS_NAMES } from "../logic/rules";
import { loadSave, persist, ClassId } from "../save";
import { W } from "../config";
import { addMuteButton, unlockAudio, playBgm, AUDIO_KEYS } from "../audio";

const BLURB: Record<ClassId, string> = {
  out: "力量高。黄珠再抬攻击 30%，4 秒。",
  surv: "力量+敏捷。黄珠加护盾。",
  ctrl: "智力高。黄珠让目标攻速变慢。",
};
const ULT: Record<ClassId, string> = {
  out: "伤害 40×技能倍率",
  surv: "治疗 14，护盾 +10",
  ctrl: "目标攻速间隔 ×2，共 4 秒",
};

export class PrepScene extends Phaser.Scene {
  private levelIndex = 0;
  constructor() { super("prep"); }

  init(data: { levelIndex: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
  }

  create() {
    addMuteButton(this, () => playBgm(this, AUDIO_KEYS.bgmMenu));
    playBgm(this, AUDIO_KEYS.bgmMenu);
    const save = loadSave();
    const lv = LEVELS[this.levelIndex] as any;
    this.add.rectangle(0, 0, W, 2000, 0x1a120c).setOrigin(0);
    this.add.text(16, 16, `第 ${this.levelIndex + 1} 关`, { fontSize: "12px", color: "#8a7355" });
    this.add.text(16, 36, lv.name, { fontSize: "26px", color: "#e6d3b0" });
    this.add.image(W - 48, 56, `enemy-${String(this.levelIndex + 1).padStart(2, "0")}`).setDisplaySize(56, 63);
    const meta = lv.squad.map((m: any) => `${m.name} ${m.hp} 力${m.str}智${m.int}敏${m.agi}${m.ranged ? " 远程" : " 近战"}`).join("\n");
    this.add.text(16, 70, meta, { fontSize: "11px", color: "#a89070", wordWrap: { width: W - 100 } });
    this.add.text(16, 130, lv.teach, { fontSize: "13px", color: "#cbb892", wordWrap: { width: W - 32 } });

    this.add.text(16, 190, "选择职业（战斗中不能换）", { fontSize: "12px", color: "#8a7355" });
    (["out", "surv", "ctrl"] as ClassId[]).forEach((id, i) => {
      const x = 16 + i * 130;
      const on = save.classId === id;
      const bg = this.add.rectangle(x, 210, 120, 90, on ? 0x3a2818 : 0x24180f).setOrigin(0)
        .setStrokeStyle(2, on ? 0xc9a227 : 0x5a3b28).setInteractive({ useHandCursor: true });
      this.add.image(x + 60, 245, `hero-${id}`).setDisplaySize(40, 45);
      this.add.text(x + 60, 280, CLASS_NAMES[id], { fontSize: "13px", color: "#e6d3b0" }).setOrigin(0.5);
      bg.on("pointerdown", () => { save.classId = id; persist(save); this.scene.restart({ levelIndex: this.levelIndex }); });
    });
    const st = HERO_STATS[save.classId];
    this.add.text(16, 310, `${BLURB[save.classId]} 力${st.str} 智${st.int} 敏${st.agi}。职业技：${ULT[save.classId]}`, {
      fontSize: "12px", color: "#a89070", wordWrap: { width: W - 32 },
    });

    this.add.image(32, 380, "icon-sword").setDisplaySize(28, 28);
    this.add.text(56, 368, "锈剑", { fontSize: "14px", color: "#e6d3b0" });
    this.add.text(56, 388, lv.sword ? "本关生效：攻击力额外 +2。" : "第 7 关起攻击力 +2，本关未生效。", { fontSize: "11px", color: "#8a7355", wordWrap: { width: 300 } });

    const am = this.add.text(16, 430, save.amulet ? "☑ 护符（绿珠每颗 3 点）" : "☐ 护符（勾上绿珠每颗 3 点）", {
      fontSize: "14px", color: "#cbb892",
    }).setInteractive({ useHandCursor: true });
    am.on("pointerdown", () => { save.amulet = !save.amulet; persist(save); this.scene.restart({ levelIndex: this.levelIndex }); });

    this.add.text(16, 470, "实时战斗：进距离就打，打完不退回。三消只增效。", { fontSize: "12px", color: "#8a7355", wordWrap: { width: W - 32 } });

    const fight = this.add.rectangle(W / 2, 530, 220, 48, 0x5a3b28).setStrokeStyle(2, 0xc9a227).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 530, "开始战斗", { fontSize: "18px", color: "#f3e6c0" }).setOrigin(0.5);
    fight.on("pointerdown", () => { unlockAudio(this); this.scene.start("battle", { levelIndex: this.levelIndex }); });

    const back = this.add.text(W / 2, 580, "返回选关", { fontSize: "14px", color: "#a89070" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("select"));
  }
}
