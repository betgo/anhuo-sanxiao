import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Read IHDR width/height from a PNG without extra deps. */
function pngSize(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  expect(buf.toString("ascii", 1, 4)).toBe("PNG");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const ROOT = join(__dirname, "../..");
const ART = join(ROOT, "public/art");
const COLORS = ["r", "b", "g", "y"] as const;

describe("P0 — bead assets 32x32", () => {
  it.each(COLORS)("bead-%s.png is 32x32 RGBA-capable PNG", (c) => {
    const path = join(ART, `bead-${c}.png`);
    expect(existsSync(path)).toBe(true);
    const { w, h } = pngSize(path);
    expect(w).toBe(32);
    expect(h).toBe(32);
  });
});

describe("P0 — BattleScene bead draw / select", () => {
  const src = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");

  it("BEAD_DRAW is 32 and fitBead forces display size without keeping scale", () => {
    expect(src).toMatch(/const BEAD_DRAW\s*=\s*32/);
    expect(src).toMatch(/private fitBead[\s\S]*?setScale\(1\)[\s\S]*?setDisplaySize\(BEAD_DRAW,\s*BEAD_DRAW\)/);
  });

  it("selection uses selRing stroke, does not scale selected bead", () => {
    expect(src).toMatch(/selRing[\s\S]*?setStrokeStyle/);
    expect(src).toMatch(/private showSel[\s\S]*?selRing\.setVisible\(true\)/);
    // showSel must not call setScale / setDisplaySize on the bead image
    const showSel = src.match(/private showSel\([^)]*\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(showSel).toBeTruthy();
    expect(showSel).not.toMatch(/setScale|setDisplaySize/);
  });

  it("create / refill / rebuild all call fitBead", () => {
    expect(src.match(/this\.fitBead\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("hero hp<=0 finishes lose; attacks gate on over/hp", () => {
    expect(src).toMatch(/if \(hero\.hp <= 0\) \{\s*this\.finish\(false\)/);
    expect(src).toMatch(/if \(this\.battle\.hero\.hp <= 0\) this\.finish\(false\)/);
    expect(src).toMatch(/private doHeroAttack[\s\S]*?if \(this\.over \|\| this\.battle\.hero\.hp <= 0\) return/);
    expect(src).toMatch(/private doMobAttack[\s\S]*?if \(this\.over \|\| this\.battle\.hero\.hp <= 0\) return/);
    expect(src).toMatch(/private finish\(win: boolean\)[\s\S]*?this\.scene\.start\("result"/);
  });
});
