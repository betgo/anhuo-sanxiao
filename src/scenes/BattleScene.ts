import Phaser from "phaser";
import {
  LEVELS, COLS, ROWS, COLORS, CLASS_NAMES, HERO_STATS,
  makeBattleState, makeCtxFrom, generateBoard, findMatches, hasMove,
  reshuffleData, swapCells, isAdjacent, resolveGroup, canCast, castSkill,
  dealDamage, strikeHero, allDead, getLock, inRange, unitAttack, unitInterval,
  moveToward, clearExpired, maybeEnrageLord, applySlow, Color,
} from "../logic/rules";
import { loadSave, persist } from "../save";
import { W } from "../config";

const CELL = 36;
const BEAD = 36;
const BEAD_DRAW = 32;
const STAGE_TOP = 70;
const BOARD_TOP = 340;
const BOARD_W = COLS * BEAD + 8;
const LEFT = Math.floor((W - BOARD_W) / 2);
const STAGE_W = BOARD_W;

export class BattleScene extends Phaser.Scene {
  private levelIndex = 0;
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
  private t0 = 0;
  private hpText!: Phaser.GameObjects.Text;
  private shieldText!: Phaser.GameObjects.Text;
  private resText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private teachText!: Phaser.GameObjects.Text;
  private slashBtn!: Phaser.GameObjects.Container;
  private ultBtn!: Phaser.GameObjects.Container;
  private logs: string[] = [];
  private bannerRoot?: Phaser.GameObjects.Container;
  private autoTimer?: Phaser.Time.TimerEvent;
  private autoLeft = 0;
  private autoStopped = false;

  constructor() { super("battle"); }

  init(data: { levelIndex: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
  }

  create() {
    const save = loadSave();
    const lv = LEVELS[this.levelIndex] as any;
    this.battle = makeBattleState(lv, save.classId, save.amulet);
    this.t0 = this.time.now;
    this.busy = false;
    this.over = false;
    this.sel = null;
    this.logs = [];
    this.mobSpr.clear();

    this.add.rectangle(0, 0, W, 2000, 0x1a120c).setOrigin(0);
    this.add.text(LEFT, 10, `第 ${this.levelIndex + 1} / 10 关 · ${lv.name}`, { fontSize: "12px", color: "#8a7355" });
    this.teachText = this.add.text(LEFT, 28, lv.teach, { fontSize: "12px", color: "#cbb892", wordWrap: { width: BOARD_W } });

    // stage
    this.add.rectangle(LEFT, STAGE_TOP, STAGE_W, 130, 0x140e0a).setOrigin(0).setStrokeStyle(2, 0x5a3b28);
    this.add.rectangle(LEFT, STAGE_TOP + 120, STAGE_W, 10, 0x3a2618).setOrigin(0);

    this.heroSpr = this.add.sprite(0, 0, "hero-idle-0").setDisplaySize(48, 54);
    this.heroSpr.play("hero-idle");
    this.heroBarBg = this.add.rectangle(0, 0, 44, 5, 0x4a1010).setOrigin(0.5, 1);
    this.heroBarFill = this.add.rectangle(0, 0, 44, 5, 0x3ecf6a).setOrigin(0, 1);
    this.redGlow = this.add.rectangle(0, 0, 56, 62, 0xff3030, 0.35).setVisible(false);
    this.selRing = this.add.rectangle(0, 0, BEAD_DRAW + 6, BEAD_DRAW + 6).setStrokeStyle(2, 0xf3e6c0).setVisible(false);

    for (const m of this.battle.monsters) {
      m.x = 11 + m.enter * 0.35;
      const big = !!m.elite || !!m.isLord;
      const spr = this.add.sprite(0, 0, `e${m.kind}-idle-0`)
        .setDisplaySize(big ? 58 : 48, big ? 66 : 54)
        .setInteractive({ useHandCursor: true });
      if (m.elite) spr.setTint(0xffe0a0);
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

    // hero card
    this.add.image(LEFT + 24, 220, `hero-${save.classId}`).setDisplaySize(40, 45);
    this.hpText = this.add.text(LEFT + 52, 200, "", { fontSize: "13px", color: "#e6d3b0" });
    this.shieldText = this.add.text(LEFT + 52, 220, "", { fontSize: "12px", color: "#8a7355" });
    this.resText = this.add.text(LEFT, 250, "", { fontSize: "12px", color: "#cbb892" });

    // board bg
    this.add.rectangle(LEFT, BOARD_TOP - 4, BOARD_W, ROWS * BEAD + 8, 0x140e0a)
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

    const legend = ["r|红·加攻", "b|蓝·技能", "g|绿·治疗", "y|黄·职业"];
    legend.forEach((s, i) => {
      const [c, lab] = s.split("|");
      const x = LEFT + 20 + i * 70;
      this.add.image(x, BOARD_TOP + ROWS * BEAD + 24, `bead-${c}`).setDisplaySize(16, 16);
      this.add.text(x + 12, BOARD_TOP + ROWS * BEAD + 24, lab, { fontSize: "11px", color: "#a89070" }).setOrigin(0, 0.5);
    });

    this.logText = this.add.text(LEFT, BOARD_TOP + ROWS * BEAD + 48, "", { fontSize: "11px", color: "#8a7355", wordWrap: { width: BOARD_W } });

    this.slashBtn = this.makeSkillBtn(LEFT + BOARD_W / 2 - 80, 700, "裂击", () => this.onCast("slash"));
    this.ultBtn = this.makeSkillBtn(LEFT + BOARD_W / 2 + 80, 700, "职业技", () => this.onCast("ult"));

    this.events.once("shutdown", () => this.clearAuto());
    this.pushLog(`第 ${this.levelIndex + 1} 关 · ${lv.name}`);
    this.refreshHud();
    this.placeActors();
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
  private py(y: number) { return STAGE_TOP + 100 - y * 16; }

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
        if (spr.anims.currentAnim?.key !== `e${m.kind}-down`) spr.play(`e${m.kind}-down`);
        spr.setAlpha(0.45).setAngle(70);
        bar?.bg.setVisible(false);
        bar?.fill.setVisible(false);
      } else if (bar) {
        const ratio = Math.max(0, m.hp / m.max);
        const barY = my - (m.elite || m.isLord ? 36 : 30);
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
    this.logs.unshift(line);
    this.logs = this.logs.slice(0, 4);
    this.logText.setText(this.logs.join("\n"));
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
    if (h.redUntil > now) buffs.push("红攻");
    if (h.yellowAtkUntil > now) buffs.push("黄攻");
    if (h.tempIntUntil > now) buffs.push("智+");
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
        if (this.heroSpr.anims.currentAnim?.key === "hero-walk") this.heroSpr.play("hero-idle");
        if (now >= hero.nextAt) this.doHeroAttack(now);
      } else {
        if (this.heroSpr.anims.currentAnim?.key !== "hero-walk") this.heroSpr.play("hero-walk");
        moveToward(hero, target, dt);
      }
    }
    if (this.over) return;

    for (const m of this.battle.monsters) {
      if (this.over) break;
      if (m.hp <= 0) continue;
      const spr = this.mobSpr.get(m.id)!;
      if (inRange(m, hero)) {
        if (spr.anims.currentAnim?.key === `e${m.kind}-walk`) spr.play(`e${m.kind}-idle`);
        if (now >= m.nextAt) this.doMobAttack(m, now);
      } else {
        if (spr.anims.currentAnim?.key !== `e${m.kind}-walk`) spr.play(`e${m.kind}-walk`);
        moveToward(m, hero, dt);
      }
    }
    if (this.over) return;
    this.placeActors();
    this.refreshHud();
  }

  private doHeroAttack(now: number) {
    if (this.over || this.battle.hero.hp <= 0) return;
    const target = getLock(this.battle);
    if (!target) return;
    const save = loadSave();
    this.heroSpr.play("hero-attack");
    const dmg = unitAttack(this.battle.hero, now, !!LEVELS[this.levelIndex].sword);
    const hits = dealDamage(this.battle, target.id, dmg, false);
    for (const h of hits) {
      const spr = this.mobSpr.get(h.id);
      if (spr) {
        this.flashHit(spr.x, spr.y);
        this.floatNum(spr.x, spr.y, `-${h.dmg}`);
      }
    }
    this.pushLog("普攻 " + hits.map((h: any) => `${h.dead ? "击倒" : "打中"} ${h.name} ${h.dmg}`).join("，"));
    this.battle.hero.nextAt = now + unitInterval(this.battle.hero, now);
    this.heroSpr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.over) this.heroSpr.play("hero-idle");
    });
    if (allDead(this.battle)) this.finish(true);
  }

  private doMobAttack(m: any, now: number) {
    if (this.over || this.battle.hero.hp <= 0) return;
    const spr = this.mobSpr.get(m.id);
    spr?.play(`e${m.kind}-attack`);
    const dmg = unitAttack(m, now, false);
    const hit = strikeHero(this.battle, dmg);
    this.flashHit(this.heroSpr.x, this.heroSpr.y);
    this.floatNum(this.heroSpr.x, this.heroSpr.y, `-${dmg}`, "#ff8a8a");
    this.refreshHud();
    let line = `${m.name} 打中 ${dmg}`;
    if (hit.absorbed) line += `，护盾抵消 ${hit.absorbed}`;
    if (hit.hp) line += `，生命 -${hit.hp}`;
    this.pushLog(line);
    m.nextAt = now + unitInterval(m, now);
    spr?.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.over && m.hp > 0) spr.play(`e${m.kind}-idle`);
    });
    if (this.battle.hero.hp <= 0) this.finish(false);
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
      const logs = groups.map((g: any) => resolveGroup(g, this.battle, ctx, now));
      this.pushLog((steps > 1 ? "连锁 " : "") + logs.join("；"));
      // pop
      for (const g of groups) {
        for (const cell of g.cells) {
          const img = this.beads[cell.r][cell.c];
          if (img) {
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
    this.pushLog(result.text);
    if (result.slow) {
      const lock = getLock(this.battle);
      applySlow(lock, result.slow.mul, result.slow.sec, now);
    }
    if (result.attack) {
      const tgt = getLock(this.battle);
      if (tgt) {
        const hits = dealDamage(this.battle, tgt.id, result.attack, kind === "slash");
        for (const h of hits) {
          const spr = this.mobSpr.get(h.id);
          if (spr) {
            this.flashHit(spr.x, spr.y);
            this.floatNum(spr.x, spr.y, `-${h.dmg}`, "#fff0a0");
          }
        }
        if (allDead(this.battle)) {
          this.finish(true);
          return;
        }
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
    const banner = this.add.text(W / 2, STAGE_TOP + 48, main, {
      fontSize: "22px",
      color: win ? "#ffe08a" : "#ffb0b0",
      fontStyle: "bold",
      stroke: "#1a120c",
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    root.add(banner);
    this.tweens.add({ targets: banner, alpha: 1, duration: 400 });

    const cd = this.add.text(W / 2, STAGE_TOP + 78, "", {
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
