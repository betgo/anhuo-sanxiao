import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COLS, ROWS } from "./rules";

const ROOT = join(__dirname, "../..");
const battleSrc = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");

function constNum(name: string): number {
  const m = battleSrc.match(new RegExp(`const ${name}\\s*=\\s*(\\d+)`));
  expect(m, `missing const ${name}`).toBeTruthy();
  return Number(m![1]);
}

describe("battle log — scrollable fixed viewport", () => {
  it("LOG_VIEW_H shows about 4–5 lines at 11px + lineSpacing 2", () => {
    const LOG_VIEW_H = constNum("LOG_VIEW_H");
    const LOG_PAD = constNum("LOG_PAD");
    expect(battleSrc).toMatch(/fontSize:\s*"11px"[\s\S]*?lineSpacing:\s*2/);
    const lineH = 11 + 2; // fontSize + lineSpacing
    const viewInner = LOG_VIEW_H - LOG_PAD * 2;
    const visibleLines = viewInner / lineH;
    expect(visibleLines).toBeGreaterThanOrEqual(4);
    expect(visibleLines).toBeLessThanOrEqual(5.5);
  });

  it("supports wheel and drag scroll on logHit zone", () => {
    expect(battleSrc).toMatch(/logHit\.on\(\s*"wheel"/);
    expect(battleSrc).toMatch(/logHit\.on\(\s*"pointerdown"/);
    expect(battleSrc).toMatch(/logDragging\s*=\s*true/);
    expect(battleSrc).toMatch(/private applyLogScroll\(/);
    expect(battleSrc).toMatch(/logText\.setY\(\s*-this\.logScrollY\s*\)/);
  });
});

describe("battle log — max 50, newest at bottom", () => {
  it("caps at LOG_MAX 50 and appends then sticks scroll to bottom", () => {
    expect(constNum("LOG_MAX")).toBe(50);
    expect(battleSrc).toMatch(/this\.logs\.push\(line\)/);
    expect(battleSrc).toMatch(
      /if\s*\(\s*this\.logs\.length\s*>\s*LOG_MAX\s*\)\s*this\.logs\s*=\s*this\.logs\.slice\(\s*this\.logs\.length\s*-\s*LOG_MAX\s*\)/,
    );
    expect(battleSrc).toMatch(/this\.logText\.setText\(\s*this\.logs\.join\(\s*"\\n"\s*\)\s*\)/);
    expect(battleSrc).toMatch(/this\.logScrollY\s*=\s*1e9/);
  });
});

describe("battle log — hit area does not cover board", () => {
  it("logY is below board bottom; hit zone sized to LOG_VIEW_H only", () => {
    const BOARD_TOP = constNum("BOARD_TOP");
    const BEAD = constNum("BEAD");
    const LOG_VIEW_H = constNum("LOG_VIEW_H");
    const boardBottom = BOARD_TOP + ROWS * BEAD;
    // source: logY = BOARD_TOP + ROWS * BEAD + 48
    expect(battleSrc).toMatch(
      /const logY\s*=\s*BOARD_TOP\s*\+\s*ROWS\s*\*\s*BEAD\s*\+\s*48/,
    );
    const logY = boardBottom + 48;
    expect(logY).toBeGreaterThan(boardBottom);
    expect(battleSrc).toMatch(
      /logHit\s*=\s*this\.add\.zone\(\s*LEFT\s*,\s*logY\s*,\s*BOARD_W\s*,\s*LOG_VIEW_H\s*\)/,
    );
    // zone must not overlap board rect (ends ~ boardBottom+4)
    expect(logY).toBeGreaterThanOrEqual(boardBottom + 8);
    expect(LOG_VIEW_H).toBeLessThan(120);
    // board width uses COLS for sanity
    expect(COLS).toBeGreaterThan(0);
  });
});
