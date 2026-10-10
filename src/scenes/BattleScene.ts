import Phaser from "phaser";
import {
  LEVELS, COLS, ROWS, COLORS, CLASS_NAMES, HERO_STATS,
  makeBattleState, makeCtxFrom, generateBoard, findMatches, hasMove,
  reshuffleData, swapCells, isAdjacent, resolveGroup, canCast, castSkill,
  dealDamage, strikeHero, allDead, getLock, inRange, unitAttack, unitInterval,
  moveToward, clearExpired, maybeEnrageLord, applySlow, tryAdvanceWave, Color,
} from "../logic/rules";
import { loadSave, persist } from "../save";
import { W, H } from "../config";
import { addMuteButton, unlockAudio, playBgm, playSfx, stopBgm, AUDIO_KEYS } from "../audio";

const CELL = 36;
const BEAD = 36;
const BEAD_DRAW = 32;
/** Upper battle zone ≈42% of 780 */
const STAGE_ZONE_H = Math.round(H * 0.42);
const BOARD_ZONE_Y = STAGE_ZONE_H;
const HEADER_H = 28;
const STAGE_TOP = HEADER_H;
const STAGE_H = STAGE_ZONE_H - HEADER_H - 44;
const BOARD_TOP = BOARD_ZONE_Y + 10;
const BOARD_W = COLS * BEAD + 8;
const LEFT = Math.floor((W - BOARD_W) / 2);
const STAGE_W = BOARD_W;
const LOG_MAX = 50;
const LOG_VIEW_H = 220;
const LOG_PAD = 8;
const LOG_PANEL_W = BOARD_W;
const LOG_PANEL_H = LOG_VIEW_H + 40;
const SKILL_Y = H - 36;

export class BattleScene extends Phaser.Scene {
  private levelIndex = 0;
  private classId: "out" | "surv" | "ctrl" = "out";
  private battle: any;
  private board: (Color | null)[][] = [];
  private beads: (Phaser.GameObjects.Image | null)[][] = [];
  private heroSpr!: Phaser.GameObjects.Sprite;
  private mobSpr = new Map<number, Phaser.GameObjects.Sprite>();
  private selRing!: Phaser.GameObjects.Rectangle;
  private heroBarBg!: Phaser.GameObjects.Rectangle;
  private heroBarFill!: Phaser.GameObjects.Rectangle;
  private mobBars = new Map<number, { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; tag?: Phaser.GameObjects.Text }>();
  private redGlow!: Phaser.GameObjects.Rectangle;
  private sel: { r: number; c: number } | null = null;
  private busy = false;
  private over = false;
  private clearingDeaths = false;
  private t0 = 0;
  private hpText!: Phaser.GameObjects.Text;
  private shieldText!: Phaser.GameObjects.Text;
  private resText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private logHit!: Phaser.GameObjects.Zone;
  private logContainer!: Phaser.GameObjects.Container;
  private slashBtn!: Phaser.GameObjects.Container;
  private logOpen = false;
  private logPanel?: Phaser.GameObjects.Container;
  private logDim?: Phaser.GameObjects.Rectangle;
  private logBtnBg!: Phaser.GameObjects.GameObject;
  private logBtnTx!: Phaser.GameObjects.Text;
  private ultBtn!: Phaser.GameObjects.Container;
  private logs: string[] = [];
  private logScrollY = 0;
  private logDragging = false;
  private logDragLastY = 0;
  private onLogPointerMove?: (p: Phaser.Input.Pointer) => void;
  private onLogPointerUp?: () => void;
  private bannerRoot?: Phaser.GameObjects.Container;
  private autoTimer?: Phaser.Time.TimerEvent;
  private autoLeft = 0;
  private autoStopped = false;

  constructor() { super("battle"); }

  init(data: { levelIndex: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
  }

  create() {
    unlockAudio(this);
    addMuteButton(this, () => playBgm(this, AUDIO_KEYS.bgmBattle));
    playBgm(this, AUDIO_KEYS.bgmBattle);
    const save = loadSave();
    this.classId = save.classId;
    const lv = LEVELS[this.levelIndex] as any;
    this.battle = makeBattleState(lv, save.classId, save.amulet);
    this.t0 = this.time.now;
    this.busy = false;
    this.over = false;
    this.sel = null;
    this.logs = [];
    this.mobSpr.clear();

    this.add.rectangle(0, 0, W, H, 0x1a120c).setOrigin(0);
    // stage zone — v2 bg (420×328)
    this.add.image(0, 0, "bg-battle").setOrigin(0).setDisplaySize(W, STAGE_ZONE_H);
    this.add.rectangle(LEFT, STAGE_TOP, STAGE_W, STAGE_H, 0x000000, 0).setOrigin(0).setStrokeStyle(1, 0x5a3b28);

    this.add.text(LEFT, 8, `第 ${this.levelIndex + 1}/10 · ${lv.name}`, {
      fontSize: "12px", color: "#8a7355",
    });

    // log button (left of mute at W-44)
    this.logBtnBg = this.add.image(W - 118, 22, "ui-log-btn")
      .setDisplaySize(48, 48).setInteractive({ useHandCursor: true }).setDepth(3000) as any;
    this.logBtnTx = this.add.text(W - 118, 22, "日志", {
      fontSize: "11px", color: "#e6d3b0", fontStyle: "bold",
      stroke: "#1a120c", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3001);
    this.logBtnBg.on("pointerdown", () => this.toggleLogPanel());

    this.heroSpr = this.add.sprite(0, 0, `hero-${this.classId}-idle-0`).setDisplaySize(48, 48);
    this.heroSpr.play(`hero-${this.classId}-idle`);
    this.heroBarBg = this.add.rectangle(0, 0, 44, 5, 0x4a1010).setOrigin(0.5, 1);
    this.heroBarFill = this.add.rectangle(0, 0, 44, 5, 0x3ecf6a).setOrigin(0, 1);
    this.redGlow = this.add.rectangle(0, 0, 52, 52, 0xff3030, 0.35).setVisible(false);
    this.selRing = this.add.rectangle(0, 0, BEAD_DRAW + 6, BEAD_DRAW + 6).setStrokeStyle(2, 0xf3e6c0).setVisible(false);

    for (const m of this.battle.monsters) {
      m.x = 11 + m.enter * 0.35;
      const big = !!m.elite || !!m.isLord;
      const spr = this.add.sprite(0, 0, `e${m.kind}-idle-0`)
        .setDisplaySize(big ? 48 : 48, big ? 48 : 48)
        .setInteractive({ useHandCursor: true });
      if (m.elite) spr.setTint(0xffe0a0);
      if (m.isLord) spr.setDisplaySize(96, 96);
      spr.play(`e${m.kind}-idle`);
      spr.on("pointerdown", () => {
        if (this.over || m.hp <= 0) return;
        this.battle.lockId = m.id;
        this.refreshHud();
      });
      this.mobSpr.set(m.id, spr);
      const bg = this.add.rectangle(0, 0, 44, 5, 0x4a1010).setOrigin(0.5, 1);
      const fill = this.add.rectangle(0, 0, 44, 5, 0xe25555).setOrigin(0, 1);
      const tag = m.elite
        ? this.add.text(0, 0, "精英", { fontSize: "10px", color: "#ffd36a" }).setOrigin(0, 1)
        : undefined;
      this.mobBars.set(m.id, { bg, fill, tag });
      this.time.delayedCall(180 * m.enter, () => {
        m.x = m.homeX;
        m.y = m.homeY;
      });
    }

    // compact HUD at bottom of stage zone (corner, not a third pane)
    this.hpText = this.add.text(LEFT + 6, STAGE_ZONE_H - 40, "", { fontSize: "12px", color: "#e6d3b0" });
    this.shieldText = this.add.text(LEFT + 6, STAGE_ZONE_H - 24, "", { fontSize: "11px", color: "#8a7355" });
    this.resText = this.add.text(LEFT + 120, STAGE_ZONE_H - 32, "", { fontSize: "11px", color: "#cbb892" });

    // board zone — v2 panel
    this.add.image(0, BOARD_ZONE_Y, "board-panel").setOrigin(0).setDisplaySize(W, H - BOARD_ZONE_Y);
    this.add.rectangle(LEFT, BOARD_TOP - 4, BOARD_W, ROWS * BEAD + 8, 0x140e0a, 0.35)
      .setOrigin(0).setStrokeStyle(2, 0x5a3b28);

    this.board = generateBoard();
    this.beads = [];
    for (let r = 0; r < ROWS; r++) {
      this.beads[r] = [];
      for (let c = 0; c < COLS; c++) {
        const color = this.board[r][c] as Color;
        const img = this.add.image(this.beadX(c), this.beadY(r), `bead-${color}`)
          .setInteractive({ useHandCursor: true });
        this.fitBead(img);
        img.setData("r", r);
        img.setData("c", c);
        img.on("pointerdown", () => this.onBead(r, c));
        this.beads[r][c] = img;
      }
    }

    this.buildLogPanel();

    this.slashBtn = this.makeSkillBtn(LEFT + BOARD_W / 2 - 80, SKILL_Y, "裂击", () => this.onCast("slash"));
    this.ultBtn = this.makeSkillBtn(LEFT + BOARD_W / 2 + 80, SKILL_Y, "职业技", () => this.onCast("ult"));

    this.events.once("shutdown", () => {
      this.clearAuto();
      if (this.onLogPointerMove) this.input.off("pointermove", this.onLogPointerMove);
      if (this.onLogPointerUp) {
        this.input.off("pointerup", this.onLogPointerUp);
        this.input.off("pointerupoutside", this.onLogPointerUp);
      }
    });
    this.pushLog(`第 ${this.levelIndex + 1} 关 · ${lv.name}`);
    this.refreshHud();
    this.placeActors();
  }

  private buildLogPanel() {
    const panelX = LEFT;
    const panelY = Math.floor((H - LOG_PANEL_H) / 2);
    this.logDim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55)
      .setDepth(2400).setInteractive().setVisible(false);
    this.logDim.on("pointerdown", () => this.closeLogPanel());

    this.logPanel = this.add.container(panelX, panelY).setDepth(2500).setVisible(false);
    const bg = this.add.image(LOG_PANEL_W / 2, LOG_PANEL_H / 2, "ui-log-panel")
      .setDisplaySize(LOG_PANEL_W, LOG_PANEL_H);
    const bgStroke = this.add.rectangle(LOG_PANEL_W / 2, LOG_PANEL_H / 2, LOG_PANEL_W, LOG_PANEL_H, 0x000000, 0)
      .setStrokeStyle(2, 0x8a6240);
    const title = this.add.text(LOG_PAD, 8, "战斗日志", { fontSize: "14px", color: "#e6d3b0" });
    const closeTx = this.add.text(LOG_PANEL_W - LOG_PAD, 10, "关闭", {
      fontSize: "12px", color: "#cbb892",
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeTx.on("pointerdown", () => this.closeLogPanel());

    const viewY = 32;
    this.logContainer = this.add.container(LOG_PAD, viewY);
    this.logText = this.add.text(0, 0, "", {
      fontSize: "11px", color: "#8a7355",
      wordWrap: { width: LOG_PANEL_W - LOG_PAD * 2 },
      lineSpacing: 2,
    });
    this.logContainer.add(this.logText);
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(panelX + LOG_PAD, panelY + viewY, LOG_PANEL_W - LOG_PAD * 2, LOG_VIEW_H);
    this.logContainer.setMask(maskShape.createGeometryMask());

    this.logHit = this.add.zone(LOG_PAD, viewY, LOG_PANEL_W - LOG_PAD * 2, LOG_VIEW_H)
      .setOrigin(0).setInteractive();
    this.logHit.on("wheel", (_p: any, _dx: number, dy: number) => {
      if (!this.logOpen) return;
      this.logScrollY += dy * 0.35;
      this.applyLogScroll();
    });
    this.logHit.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.logOpen) return;
      this.logDragging = true;
      this.logDragLastY = p.y;
    });
    this.onLogPointerMove = (p: Phaser.Input.Pointer) => {
      if (!this.logDragging || !this.logOpen) return;
      this.logScrollY -= (p.y - this.logDragLastY);
      this.logDragLastY = p.y;
      this.applyLogScroll();
    };
    this.onLogPointerUp = () => { this.logDragging = false; };
    this.input.on("pointermove", this.onLogPointerMove);
    this.input.on("pointerup", this.onLogPointerUp);
    this.input.on("pointerupoutside", this.onLogPointerUp);

    this.logPanel.add([bg, bgStroke, title, closeTx, this.logContainer, this.logHit]);
  }

  private toggleLogPanel() {
    if (this.logOpen) this.closeLogPanel();
    else this.openLogPanel();
  }

  private openLogPanel() {
    this.logOpen = true;
    this.logDim?.setVisible(true);
    this.logPanel?.setVisible(true);
    this.logScrollY = 1e9;
    this.applyLogScroll();
  }

  private closeLogPanel() {
    this.logOpen = false;
    this.logDragging = false;
    this.logDim?.setVisible(false);
    this.logPanel?.setVisible(false);
  }

  private makeSkillBtn(x: number, y: number, label: string, fn: () => void) {
    const bg = this.add.rectangle(x, y, 150, 44, 0x2a1c14).setStrokeStyle(2, 0x5a3b28).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y - 6, label, { fontSize: "14px", color: "#e6d3b0" }).setOrigin(0.5);
    const note = this.add.text(x, y + 12, "", { fontSize: "10px", color: "#8a7355" }).setOrigin(0.5);
    bg.on("pointerdown", fn);
    return this.add.container(0, 0, [bg, t, note]).setData("note", note).setData("bg", bg);
  }

  private elapsed() {
    return (this.time.now - this.t0) / 1000;
  }


  private fitBead(img: Phaser.GameObjects.Image) {
    img.setScale(1);
    img.setDisplaySize(BEAD_DRAW, BEAD_DRAW);
  }

  private showSel(r: number, c: number) {
    this.selRing.setVisible(true).setPosition(this.beadX(c), this.beadY(r)).setDepth(50);
  }

  private hideSel() {
    this.selRing.setVisible(false);
  }

  private beadX(c: number) { return LEFT + 4 + c * BEAD + BEAD / 2; }
  private beadY(r: number) { return BOARD_TOP + r * BEAD + BEAD / 2; }

  private px(x: number) { return LEFT + 8 + x * CELL; }
  private py(y: number) { return STAGE_TOP + STAGE_H - 24 - y * 18; }

  private placeActors() {
    const h = this.battle.hero;
    const hx = this.px(h.x);
    const hy = this.py(h.y);
    this.heroSpr.setPosition(hx, hy);
    this.redGlow.setPosition(hx, hy);
    this.heroBarBg.setPosition(hx, hy - 30).setVisible(h.hp > 0);
    const hRatio = Math.max(0, h.hp / h.max);
    this.heroBarFill.setPosition(hx - 22, hy - 30).setDisplaySize(44 * hRatio, 5).setVisible(h.hp > 0);
    this.heroBarFill.setFillStyle(hRatio > 0.3 ? 0x3ecf6a : 0xe25555);
    const now = this.elapsed();
    this.redGlow.setVisible(h.redUntil > now && h.hp > 0);

    for (const m of this.battle.monsters) {
      const spr = this.mobSpr.get(m.id);
      if (!spr) continue;
      const mx = this.px(m.x);
      const my = this.py(m.y);
      spr.setPosition(mx, my);
      spr.setDepth(400 - Math.round(m.x * 10));
      const bar = this.mobBars.get(m.id);
      if (m.hp <= 0) {
        bar?.bg.setVisible(false);
        bar?.fill.setVisible(false);
      } else if (bar) {
        const ratio = Math.max(0, m.hp / m.max);
        const barY = my - (m.isLord ? 52 : (m.elite ? 30 : 28));
        bar.bg.setVisible(true).setPosition(mx, barY);
        bar.fill.setVisible(true).setPosition(mx - 22, barY).setDisplaySize(44 * ratio, 5);
        if (bar.tag) bar.tag.setVisible(true).setPosition(mx + 24, barY);
      }
      if (bar?.tag && m.hp <= 0) bar.tag.setVisible(false);
    }
  }

  private flashHit(x: number, y: number) {
    const flash = this.add.rectangle(x, y, 48, 54, 0xffffff, 0.85).setDepth(900);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 160,
      onComplete: () => flash.destroy(),
    });
  }

  private floatNum(x: number, y: number, text: string, color = "#ffd36a") {
    const t = this.add.text(x, y - 20, text, { fontSize: "14px", color, fontStyle: "bold" }).setOrigin(0.5).setDepth(950);
    this.tweens.add({
      targets: t, y: y - 46, alpha: 0, duration: 650,
      onComplete: () => t.destroy(),
    });
  }

  private pushLog(line: string) {
    this.logs.push(line);
    if (this.logs.length > LOG_MAX) this.logs = this.logs.slice(this.logs.length - LOG_MAX);
    this.logText.setText(this.logs.join("\n"));
    // stick to bottom so newest stays visible
    this.logScrollY = 1e9;
    this.applyLogScroll();
  }

  private applyLogScroll() {
    const viewInner = LOG_VIEW_H - LOG_PAD * 2;
    const contentH = Math.max(this.logText.height, viewInner);
    const maxScroll = Math.max(0, contentH - viewInner);
    this.logScrollY = Math.max(0, Math.min(this.logScrollY, maxScroll));
    this.logText.setY(-this.logScrollY);
  }

  private refreshHud() {
    const save = loadSave();
    const lv = LEVELS[this.levelIndex] as any;
    const ctx = makeCtxFrom(lv, save.classId, save.amulet);
    const now = this.elapsed();
    const h = this.battle.hero;
    this.hpText.setText(`英雄 · ${CLASS_NAMES[save.classId]} · 力${h.str} 智${h.int} 敏${h.agi}\n${h.hp} / ${h.max}`);
    this.shieldText.setText(`护盾 ${this.battle.shield} / ${this.battle.shieldCap}`);
    const buffs: string[] = [];
    if (h.redUntil > now) buffs.push(`红攻+${Math.round((h.redBonus || 0) * 100)}%`);
    if (h.yellowAtkUntil > now) buffs.push(`黄攻+${Math.round((h.yellowAtkBonus || 0) * 100)}%`);
    if (h.tempIntUntil > now) buffs.push(`智+${h.tempInt || 0}`);
    this.resText.setText(`蓝 ${this.battle.blue}  黄 ${this.battle.yellow}  护盾 ${this.battle.shield}  增效 ${buffs.join(" ") || "—"}`);

    const slashNote = this.slashBtn.getData("note") as Phaser.GameObjects.Text;
    const ultNote = this.ultBtn.getData("note") as Phaser.GameObjects.Text;
    const slashBg = this.slashBtn.getData("bg") as Phaser.GameObjects.Rectangle;
    const ultBg = this.ultBtn.getData("bg") as Phaser.GameObjects.Rectangle;
    slashNote.setText(lv.slash ? `蓝×4 · CD ${Math.max(0, Math.ceil(this.battle.slashReadyAt - now)) || 6}s` : "第2关解锁");
    ultNote.setText(lv.ult ? `蓝×4 黄×2 · CD ${Math.max(0, Math.ceil(this.battle.ultReadyAt - now)) || 12}s` : "第8关解锁");
    const can = !this.busy && !this.over;
    slashBg.setAlpha(can && canCast("slash", this.battle, ctx, now) ? 1 : 0.45);
    ultBg.setAlpha(can && canCast("ult", this.battle, ctx, now) ? 1 : 0.45);
  }

  update(_: number, dtMs: number) {
    if (this.over) return;
    const dt = Math.min(0.05, dtMs / 1000);
    const now = this.elapsed();
    clearExpired(this.battle, now);
    if (maybeEnrageLord(this.battle, now)) this.pushLog("地牢领主力量 +4");

    const hero = this.battle.hero;
    if (hero.hp <= 0) {
      this.finish(false);
      return;
    }
    const target = getLock(this.battle);
    if (target) {
      if (inRange(hero, target)) {
        if (this.heroSpr.anims.currentAnim?.key === `hero-${this.classId}-walk`) this.heroSpr.play(`hero-${this.classId}-idle`);
        if (now >= hero.nextAt) this.doHeroAttack(now);
      } else {
        if (this.heroSpr.anims.currentAnim?.key !== `hero-${this.classId}-walk`) this.heroSpr.play(`hero-${this.classId}-walk`);
        moveToward(hero, target, dt);
      }
    }
    if (this.over) return;

    for (const m of this.battle.monsters) {
      if (this.over) break;
      if (m.hp <= 0) continue;
      const spr = this.mobSpr.get(m.id);
      if (!spr) continue;
      if (inRange(m, hero)) {
        if (spr.anims.currentAnim?.key === `e${m.kind}-walk`) spr.play(`e${m.kind}-idle`);
        if (now >= m.nextAt) this.doMobAttack(m, now);
      } else {
        if (spr.anims.currentAnim?.key !== `e${m.kind}-walk`) spr.play(`e${m.kind}-walk`);
        moveToward(m, hero, dt);
      }
    }
    if (this.over) return;
    if (!this.clearingDeaths) {
      const corpseIds = this.battle.monsters
        .filter((m: any) => m.hp <= 0 && this.mobSpr.has(m.id))
        .map((m: any) => m.id);
      if (corpseIds.length) {
        void this.clearDeadActors(corpseIds).then(() => this.trySettleOrWave());
      } else {
        this.trySettleOrWave();
      }
    }
    this.placeActors();
    this.refreshHud();
  }

  private trySettleOrWave() {
    if (this.over || this.clearingDeaths) return;
    const now = this.elapsed();
    const wave = tryAdvanceWave(this.battle, now);
    if (wave.advanced) {
      this.spawnWaveActors(wave.spawned || []);
      this.showWaveBanner(wave.waveIndex + 1);
      this.pushLog(`第 ${wave.waveIndex + 1} 波来袭`);
      return;
    }
    if (wave.done && allDead(this.battle)) {
      // ensure no leftover corpses before banner
      const left = this.battle.monsters.filter((m: any) => m.hp <= 0 && this.mobSpr.has(m.id));
      if (left.length) {
        void this.clearDeadActors(left.map((m: any) => m.id)).then(() => this.trySettleOrWave());
        return;
      }
      this.finish(true);
    }
  }

  private clearDeadActors(ids: number[]): Promise<void> {
    const uniq = Array.from(new Set(ids)).filter((id) => this.mobSpr.has(id));
    if (!uniq.length) return Promise.resolve();
    this.clearingDeaths = true;
    return Promise.all(uniq.map((id) => this.animateDeathOut(id))).then(() => {
      this.clearingDeaths = false;
    });
  }

  private animateDeathOut(id: number): Promise<void> {
    return new Promise((resolve) => {
      const m = this.battle.monsters.find((x: any) => x.id === id);
      const spr = this.mobSpr.get(id);
      const bar = this.mobBars.get(id);
      if (!spr) {
        resolve();
        return;
      }
      bar?.bg.setVisible(false);
      bar?.fill.setVisible(false);
      if (bar?.tag) bar.tag.setVisible(false);
      const done = () => {
        this.tweens.add({
          targets: spr,
          alpha: 0,
          duration: 280,
          onComplete: () => {
            spr.destroy();
            this.mobSpr.delete(id);
            if (bar) {
              bar.bg.destroy();
              bar.fill.destroy();
              bar.tag?.destroy();
              this.mobBars.delete(id);
            }
            resolve();
          },
        });
      };
      const key = m ? `e${m.kind}-down` : "";
      if (m && spr.anims && this.anims.exists(key)) {
        spr.play(key);
        let finished = false;
        const finishOnce = () => {
          if (finished) return;
          finished = true;
          done();
        };
        spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finishOnce);
        this.time.delayedCall(500, finishOnce);
      } else {
        done();
      }
    });
  }

  private flashTier(tier: number) {
    const label = tier >= 5 ? "五连" : "四连";
    const tx = this.add.text(W / 2, BOARD_TOP - 18, label, {
      fontSize: tier >= 5 ? "22px" : "18px",
      color: tier >= 5 ? "#ffe08a" : "#a8d8ff",
      fontStyle: "bold",
      stroke: "#1a120c",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1600).setAlpha(0);
    this.tweens.add({
      targets: tx, alpha: 1, y: BOARD_TOP - 36, duration: 280, yoyo: true, hold: 200,
      onComplete: () => tx.destroy(),
    });
  }

  private showWaveBanner(n: number) {
    const tx = this.add.text(W / 2, STAGE_TOP + Math.floor(STAGE_H / 2), `第 ${n} 波`, {
      fontSize: "20px", color: "#e6d3b0", fontStyle: "bold",
      stroke: "#1a120c", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1600).setAlpha(0);
    this.tweens.add({
      targets: tx, alpha: 1, duration: 300, hold: 700, yoyo: true,
      onComplete: () => tx.destroy(),
    });
  }

  private spawnWaveActors(spawned: any[]) {
    for (const m of spawned) {
      m.x = 11 + m.enter * 0.2;
      const spr = this.add.sprite(0, 0, `e${m.kind}-idle-0`)
        .setDisplaySize(m.isLord ? 96 : 48, m.isLord ? 96 : 48)
        .setInteractive({ useHandCursor: true });
      if (m.elite) spr.setTint(0xffe0a0);
      spr.play(`e${m.kind}-walk`);
      spr.on("pointerdown", () => {
        if (this.over || m.hp <= 0) return;
        this.battle.lockId = m.id;
        this.refreshHud();
      });
      this.mobSpr.set(m.id, spr);
      const bg = this.add.rectangle(0, 0, 44, 5, 0x4a1010).setOrigin(0.5, 1);
      const fill = this.add.rectangle(0, 0, 44, 5, 0xe25555).setOrigin(0, 1);
      const tag = m.elite
        ? this.add.text(0, 0, "精英", { fontSize: "10px", color: "#ffd36a" }).setOrigin(0, 1)
        : undefined;
      this.mobBars.set(m.id, { bg, fill, tag });
      this.time.delayedCall(120, () => {
        m.x = m.homeX;
        m.y = m.homeY;
        if (m.hp > 0) spr.play(`e${m.kind}-idle`);
      });
    }
  }

  private doHeroAttack(now: number) {
    if (this.over || this.battle.hero.hp <= 0) return;
    const target = getLock(this.battle);
    if (!target) return;
    this.heroSpr.play(`hero-${this.classId}-attack`);
    const dmg = unitAttack(this.battle.hero, now, !!LEVELS[this.levelIndex].sword);
    // damage on swing frame (attack-1 @ 10fps ≈ 100ms)
    this.battle.hero.nextAt = now + unitInterval(this.battle.hero, now);
    this.time.delayedCall(100, () => {
      if (this.over || this.battle.hero.hp <= 0) return;
      const tgt = getLock(this.battle) || target;
      if (!tgt || tgt.hp <= 0) return;
      const hits = dealDamage(this.battle, tgt.id, dmg, false);
      if (hits.length) playSfx(this, AUDIO_KEYS.hit);
      for (const h of hits) {
        const spr = this.mobSpr.get(h.id);
        if (spr) {
          this.flashHit(spr.x, spr.y);
          this.floatNum(spr.x, spr.y, `-${h.dmg}`);
        }
      }
      this.pushLog("普攻 " + hits.map((h: any) => `${h.dead ? "击倒" : "打中"} ${h.name} ${h.dmg}`).join("，"));
      void this.afterCombatHits(hits);
    });
    this.heroSpr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.over) this.heroSpr.play(`hero-${this.classId}-idle`);
    });
  }

  private async afterCombatHits(hits: any[]) {
    const deadIds = hits.filter((h: any) => h.dead).map((h: any) => h.id);
    if (deadIds.length) await this.clearDeadActors(deadIds);
    this.trySettleOrWave();
  }

  private doMobAttack(m: any, now: number) {
    if (this.over || this.battle.hero.hp <= 0) return;
    const spr = this.mobSpr.get(m.id);
    spr?.play(`e${m.kind}-attack`);
    const dmg = unitAttack(m, now, false);
    m.nextAt = now + unitInterval(m, now);
    this.time.delayedCall(100, () => {
      if (this.over || m.hp <= 0 || this.battle.hero.hp <= 0) return;
      const hit = strikeHero(this.battle, dmg);
      playSfx(this, AUDIO_KEYS.hurt);
      this.flashHit(this.heroSpr.x, this.heroSpr.y);
      this.floatNum(this.heroSpr.x, this.heroSpr.y, `-${dmg}`, "#ff8a8a");
      this.refreshHud();
      let line = `${m.name} 打中 ${dmg}`;
      if (hit.absorbed) line += `，护盾抵消 ${hit.absorbed}`;
      if (hit.hp) line += `，生命 -${hit.hp}`;
      this.pushLog(line);
      if (this.battle.hero.hp <= 0) this.finish(false);
    });
    spr?.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.over && m.hp > 0) spr.play(`e${m.kind}-idle`);
    });
  }

  private async onBead(r: number, c: number) {
    if (this.busy || this.over) return;
    if (!this.sel) {
      this.sel = { r, c };
      this.showSel(r, c);
      return;
    }
    if (this.sel.r === r && this.sel.c === c) {
      this.hideSel();
      this.sel = null;
      return;
    }
    if (!isAdjacent(this.sel.r, this.sel.c, r, c)) {
      this.sel = { r, c };
      this.showSel(r, c);
      return;
    }
    const a = this.sel;
    this.hideSel();
    this.sel = null;
    await this.trySwap(a.r, a.c, r, c);
  }

  private async trySwap(r1: number, c1: number, r2: number, c2: number) {
    this.busy = true;
    playSfx(this, AUDIO_KEYS.swap);
    const b1 = this.beads[r1][c1]!;
    const b2 = this.beads[r2][c2]!;
    await this.tweenMove(b1, this.beadX(c2), this.beadY(r2));
    await this.tweenMove(b2, this.beadX(c1), this.beadY(r1));
    swapCells(this.board, r1, c1, r2, c2);
    this.beads[r1][c1] = b2;
    this.beads[r2][c2] = b1;
    b2.setData("r", r1); b2.setData("c", c1);
    b1.setData("r", r2); b1.setData("c", c2);

    if (!findMatches(this.board).length) {
      await this.tweenMove(b1, this.beadX(c1), this.beadY(r1));
      await this.tweenMove(b2, this.beadX(c2), this.beadY(r2));
      swapCells(this.board, r1, c1, r2, c2);
      this.beads[r1][c1] = b1;
      this.beads[r2][c2] = b2;
      b1.setData("r", r1); b1.setData("c", c1);
      b2.setData("r", r2); b2.setData("c", c2);
      this.pushLog("无效交换已退回");
      this.busy = false;
      return;
    }
    await this.resolveCascades();
    this.busy = false;
  }

  private tweenMove(img: Phaser.GameObjects.Image, x: number, y: number) {
    return new Promise<void>((resolve) => {
      this.tweens.add({ targets: img, x, y, duration: 120, onComplete: () => resolve() });
    });
  }

  private async resolveCascades() {
    const save = loadSave();
    const lv = LEVELS[this.levelIndex] as any;
    const ctx = makeCtxFrom(lv, save.classId, save.amulet);
    let steps = 0;
    while (steps < 40 && !this.over) {
      const groups = findMatches(this.board);
      if (!groups.length) break;
      steps++;
      const now = this.elapsed();
      const results = groups.map((g: any) => resolveGroup(g, this.battle, ctx, now));
      this.pushLog((steps > 1 ? "连锁 " : "") + results.map((r: any) => r.text).join("；"));
      let bestTier = 3;
      for (const r of results) {
        if (r.tier > bestTier) bestTier = r.tier;
        if (r.tier >= 4) this.flashTier(r.tier);
        if (r.tier >= 5 && (r.color === "r" || (r.color === "y" && save.classId === "out"))) {
          this.redGlow.setVisible(true);
        }
      }
      if (bestTier >= 5) playSfx(this, AUDIO_KEYS.match5);
      else if (bestTier >= 4) playSfx(this, AUDIO_KEYS.match4);
      else playSfx(this, AUDIO_KEYS.match);
      // pop
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const tier = results[gi].tier;
        for (const cell of g.cells) {
          const img = this.beads[cell.r][cell.c];
          if (img) {
            if (tier >= 4) {
              const ring = this.add.rectangle(img.x, img.y, BEAD_DRAW + 8, BEAD_DRAW + 8)
                .setStrokeStyle(tier >= 5 ? 3 : 2, tier >= 5 ? 0xffe080 : 0xc0e0ff).setDepth(800);
              this.tweens.add({ targets: ring, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
            }
            await new Promise<void>((res) => {
              this.tweens.add({ targets: img, alpha: 0, duration: 100, onComplete: () => { img.destroy(); res(); } });
            });
            this.beads[cell.r][cell.c] = null;
            this.board[cell.r][cell.c] = null;
          }
        }
      }
      await this.collapseRefill();
    }
    if (!hasMove(this.board) || findMatches(this.board).length) {
      reshuffleData(this.board);
      this.rebuildBeads();
      this.pushLog("棋盘已重排");
    }
  }

  private async collapseRefill() {
    for (let c = 0; c < COLS; c++) {
      const stack: { color: Color; img: Phaser.GameObjects.Image | null; from: number }[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r][c]) stack.push({ color: this.board[r][c] as Color, img: this.beads[r][c], from: r });
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        if (stack.length) {
          const item = stack.shift()!;
          this.board[r][c] = item.color;
          this.beads[r][c] = item.img;
        } else {
          const color = COLORS[(Math.random() * 4) | 0] as Color;
          this.board[r][c] = color;
          const img = this.add.image(this.beadX(c), this.beadY(r) - ROWS * BEAD, `bead-${color}`)
            .setInteractive({ useHandCursor: true });
          this.fitBead(img);
          const rr = r, cc = c;
          img.on("pointerdown", () => this.onBead(rr, cc));
          this.beads[r][c] = img;
        }
      }
    }
    const moves: Promise<void>[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const img = this.beads[r][c]!;
        img.setData("r", r); img.setData("c", c); img.setAlpha(1);
        this.fitBead(img);
        img.removeAllListeners("pointerdown");
        const rr = r, cc = c;
        img.on("pointerdown", () => this.onBead(rr, cc));
        moves.push(this.tweenMove(img, this.beadX(c), this.beadY(r)));
      }
    }
    await Promise.all(moves);
  }

  private rebuildBeads() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.beads[r][c]?.destroy();
        const color = this.board[r][c] as Color;
        const img = this.add.image(this.beadX(c), this.beadY(r), `bead-${color}`)
          .setInteractive({ useHandCursor: true });
        this.fitBead(img);
        const rr = r, cc = c;
        img.on("pointerdown", () => this.onBead(rr, cc));
        this.beads[r][c] = img;
      }
    }
  }

  private onCast(kind: "slash" | "ult") {
    if (this.busy || this.over) return;
    const save = loadSave();
    const lv = LEVELS[this.levelIndex] as any;
    const ctx = makeCtxFrom(lv, save.classId, save.amulet);
    const now = this.elapsed();
    if (!canCast(kind, this.battle, ctx, now)) return;
    const result = castSkill(kind, this.battle, ctx, now);
    if (!result) return;
    playSfx(this, AUDIO_KEYS.skill);
    this.pushLog(result.text);
    if (result.slow) {
      const lock = getLock(this.battle);
      applySlow(lock, result.slow.mul, result.slow.sec, now);
    }
    if (result.attack) {
      const tgt = getLock(this.battle);
      if (tgt) {
        const hits = dealDamage(this.battle, tgt.id, result.attack, kind === "slash");
        if (hits.length) playSfx(this, AUDIO_KEYS.hit);
        for (const h of hits) {
          const spr = this.mobSpr.get(h.id);
          if (spr) {
            this.flashHit(spr.x, spr.y);
            this.floatNum(spr.x, spr.y, `-${h.dmg}`, "#fff0a0");
          }
        }
        void this.afterCombatHits(hits);
        return;
      }
    }
    this.refreshHud();
  }

  private finish(win: boolean) {
    if (this.over) return;
    this.over = true;
    this.autoStopped = false;
    this.hideSel();
    this.refreshHud();
    playSfx(this, win ? AUDIO_KEYS.win : AUDIO_KEYS.lose);
    const save = loadSave();
    if (win) {
      save.cleared[this.levelIndex] = true;
      persist(save);
    }
    const isLast = this.levelIndex >= LEVELS.length - 1;
    this.showAdvanceBanner(win, isLast);
  }

  private clearAuto() {
    if (this.autoTimer) {
      this.autoTimer.remove(false);
      this.autoTimer = undefined;
    }
  }

  private showAdvanceBanner(win: boolean, isLast: boolean) {
    this.clearAuto();
    this.bannerRoot?.destroy(true);

    const root = this.add.container(0, 0).setDepth(1500);
    this.bannerRoot = root;

    const main = win
      ? (isLast ? "章节完成" : "进入下一关")
      : "重新挑战";
    const banner = this.add.text(W / 2, STAGE_TOP + Math.floor(STAGE_H / 2) - 20, main, {
      fontSize: "22px",
      color: win ? "#ffe08a" : "#ffb0b0",
      fontStyle: "bold",
      stroke: "#1a120c",
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    root.add(banner);
    this.tweens.add({ targets: banner, alpha: 1, duration: 400 });

    const cd = this.add.text(W / 2, STAGE_TOP + Math.floor(STAGE_H / 2) + 12, "", {
      fontSize: "13px", color: "#cbb892", stroke: "#1a120c", strokeThickness: 3,
    }).setOrigin(0.5);
    root.add(cd);

    const mkMini = (x: number, label: string, fn: () => void) => {
      const r = this.add.rectangle(x, 22, 72, 24, 0x2a1c14, 0.85).setStrokeStyle(1, 0x8a6240)
        .setInteractive({ useHandCursor: true });
      const tx = this.add.text(x, 22, label, { fontSize: "12px", color: "#e6d3b0" }).setOrigin(0.5);
      r.on("pointerdown", fn);
      root.add([r, tx]);
    };

    const goSelect = () => {
      this.clearAuto();
      this.scene.start("select");
    };

    if (win && isLast) {
      cd.setText("可回选关");
      mkMini(W - 48, "回选关", goSelect);
      return;
    }

    this.autoLeft = 5;
    const doAuto = () => {
      this.clearAuto();
      if (win) this.scene.restart({ levelIndex: this.levelIndex + 1 });
      else this.scene.restart({ levelIndex: this.levelIndex });
    };
    const refreshCd = () => {
      cd.setText(this.autoStopped
        ? "已停止自动"
        : `${this.autoLeft} 秒后自动${win ? "进入下一关" : "重试"}`);
    };
    refreshCd();
    this.autoTimer = this.time.addEvent({
      delay: 1000,
      repeat: 4,
      callback: () => {
        if (this.autoStopped) return;
        this.autoLeft -= 1;
        refreshCd();
        if (this.autoLeft <= 0) doAuto();
      },
    });

    mkMini(W - 120, "停止", () => {
      if (this.autoStopped) return;
      this.autoStopped = true;
      this.clearAuto();
      refreshCd();
      mkMini(W - 120, win ? "下一关" : "重试", doAuto);
    });
    mkMini(W - 48, "回选关", goSelect);
  }

}
