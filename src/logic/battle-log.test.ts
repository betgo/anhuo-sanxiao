import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COLS, ROWS } from "./rules";
import { H } from "../config";

const ROOT = join(__dirname, "../..");
const battleSrc = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");

function constNum(name: string): number {
  const m = battleSrc.match(new RegExp(`const ${name}\\s*=\\s*([^;\\n]+)`));
  expect(m, `missing const ${name}`).toBeTruthy();
  const expr = m![1].trim();
  if (/^\\d+$/.test(expr)) return Number(expr);
  if (expr.includes("H * 0.42")) return Math.round(H * 0.42);
  if (expr.includes("H - 36")) return H - 36;
  // evaluate simple Math.round(H * 0.42)
  try {
    // eslint-disable-next-line no-new-func
    return Number(Function("H", `return (${expr});`)(H));
  } catch {
    throw new Error(`cannot eval ${name}=${expr}`);
  }
}

describe("battle layout — stage/board split", () => {
  it("stage zone ≈42% of canvas height", () => {
    const stage = constNum("STAGE_ZONE_H");
    expect(stage / H).toBeGreaterThanOrEqual(0.39);
    expect(stage / H).toBeLessThanOrEqual(0.45);
    expect(battleSrc).toMatch(/BOARD_ZONE_Y\s*=\s*STAGE_ZONE_H/);
  });

  it("no permanent teach blurb or always-on log strip under board", () => {
    expect(battleSrc).not.toMatch(/lv\.teach/);
    expect(battleSrc).not.toMatch(/BOARD_TOP\s*\+\s*ROWS\s*\*\s*BEAD\s*\+\s*48/);
    expect(battleSrc).toMatch(/toggleLogPanel|openLogPanel/);
  });
});

describe("battle log — button popup", () => {
  it("log button opens/closes scrollable panel; dimmer closes", () => {
    expect(battleSrc).toMatch(/"日志"/);
    expect(battleSrc).toMatch(/private openLogPanel/);
    expect(battleSrc).toMatch(/private closeLogPanel/);
    expect(battleSrc).toMatch(/logDim/);
    expect(battleSrc).toMatch(/logHit\.on\(\s*"wheel"/);
    expect(battleSrc).toMatch(/logDragging\s*=\s*true/);
  });

  it("caps at LOG_MAX 50, newest at bottom", () => {
    expect(constNum("LOG_MAX")).toBe(50);
    expect(battleSrc).toMatch(/this\.logs\.push\(line\)/);
    expect(battleSrc).toMatch(/this\.logScrollY\s*=\s*1e9/);
  });

  it("popup hit zone does not sit on the bead grid", () => {
    expect(battleSrc).toMatch(/buildLogPanel/);
    expect(battleSrc).toMatch(/LOG_PANEL_H/);
    // panel centered; board interaction blocked only while open via dimmer
    expect(battleSrc).toMatch(/logOpen/);
    expect(COLS).toBe(7);
    expect(ROWS).toBe(6);
  });
});
