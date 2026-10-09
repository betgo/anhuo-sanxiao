import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const battleSrc = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");
const mainSrc = readFileSync(join(ROOT, "src/main.ts"), "utf8");
const htmlSrc = readFileSync(join(ROOT, "index.html"), "utf8");

describe("UI P0 — layout centered column", () => {
  it("LEFT centers board/stage by (W - BOARD_W) / 2", () => {
    expect(battleSrc).toMatch(/const LEFT\s*=\s*Math\.floor\(\(W\s*-\s*BOARD_W\)\s*\/\s*2\)/);
    expect(battleSrc).toMatch(/STAGE_TOP/);
    expect(battleSrc).toMatch(/BOARD_TOP/);
    expect(battleSrc).toMatch(/makeSkillBtn\(LEFT\s*\+\s*BOARD_W\s*\/\s*2/);
  });

  it("CSS and Phaser scale center the canvas", () => {
    expect(htmlSrc).toMatch(/#game[\s\S]*?justify-content:\s*center/);
    expect(htmlSrc).toMatch(/#game[\s\S]*?align-items:\s*center/);
    expect(mainSrc).toMatch(/Phaser\.Scale\.CENTER_BOTH/);
    expect(mainSrc).toMatch(/Phaser\.Scale\.FIT/);
  });
});

describe("UI P0 — no monster lock yellow ring", () => {
  it("selRing is bead-only; lock click does not draw yellow stroke on mob", () => {
    expect(battleSrc).toMatch(/this\.battle\.lockId\s*=\s*m\.id/);
    // selRing stroke must only be cream bead selection, never yellow on mob
    expect(battleSrc).toMatch(/selRing\s*=\s*this\.add\.rectangle[\s\S]*?setStrokeStyle\(2,\s*0xf3e6c0\)/);
    const placeActors = battleSrc.match(/private placeActors\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(placeActors).toBeTruthy();
    expect(placeActors).not.toMatch(/0xffff00|0xffd700|0xffcc00|黄框|lockRing|selRing/);
    // no yellow stroke attached to mob sprites in create loop
    const createMob = battleSrc.match(/for \(const m of this\.battle\.monsters\) \{[\s\S]*?\n    \}/)?.[0] ?? "";
    expect(createMob).not.toMatch(/setStrokeStyle\(.*0xff/);
  });
});

describe("UI P0 — overhead HP bars", () => {
  it("hero and each living mob have head bars; dead mob bars hidden", () => {
    expect(battleSrc).toMatch(/heroBarBg[\s\S]*?heroBarFill/);
    expect(battleSrc).toMatch(/mobBars\.set\(m\.id/);
    expect(battleSrc).toMatch(/heroBarBg\.setPosition\(hx,\s*hy\s*-\s*30\)\.setVisible\(h\.hp\s*>\s*0\)/);
    expect(battleSrc).toMatch(/if \(m\.hp\s*<=\s*0\)[\s\S]*?bar\?\.bg\.setVisible\(false\)[\s\S]*?bar\?\.fill\.setVisible\(false\)/);
    expect(battleSrc).toMatch(/bar\.bg\.setVisible\(true\)\.setPosition\(mx,\s*my\s*-\s*30\)/);
  });
});

describe("UI P0 — VFX wiring", () => {
  it("flashHit + floatNum on basic / slash / ult; redGlow on red buff", () => {
    expect(battleSrc).toMatch(/private flashHit\(/);
    expect(battleSrc).toMatch(/private floatNum\(/);
    expect(battleSrc).toMatch(/private doHeroAttack[\s\S]*?flashHit[\s\S]*?floatNum/);
    expect(battleSrc).toMatch(/private onCast[\s\S]*?flashHit[\s\S]*?floatNum/);
    expect(battleSrc).toMatch(/redGlow\s*=\s*this\.add\.rectangle[\s\S]*?0xff3030/);
    expect(battleSrc).toMatch(/redGlow\.setVisible\(h\.redUntil\s*>\s*now\s*&&\s*h\.hp\s*>\s*0\)/);
  });
});

describe("UI P0 — ult unlock copy", () => {
  it("locked ult note says 第8关解锁 (not 第6关)", () => {
    expect(battleSrc).toMatch(/ultNote\.setText\([\s\S]*?"第8关解锁"/);
    expect(battleSrc).not.toMatch(/"第6关解锁"/);
  });
});
