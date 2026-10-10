import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COLS, ROWS } from "./rules";
import { W, H } from "../config";

const ROOT = join(__dirname, "../..");
const framesDir = join(ROOT, "public/art/frames");
const artDir = join(ROOT, "public/art");
const boot = readFileSync(join(ROOT, "src/scenes/BootScene.ts"), "utf8");
const battle = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");
const main = readFileSync(join(ROOT, "src/main.ts"), "utf8");

function pngSize(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  expect(buf.toString("ascii", 1, 4)).toBe("PNG");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Count unique opaque RGB colors and soft (partial) alpha pixels. */
function pngPaletteSoft(path: string): { colors: number; soft: number } {
  const zlib = require("node:zlib") as typeof import("node:zlib");
  const buf = readFileSync(path);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const { w, h } = pngSize(path);
  const idats: Buffer[] = [];
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IDAT") idats.push(Buffer.from(data));
    if (type === "IEND") break;
    off += 12 + len;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idats));
  expect(bitDepth).toBe(8);
  expect(colorType).toBe(6); // RGBA
  const stride = w * 4;
  const colors = new Set<string>();
  let soft = 0;
  let p = 0;
  let prev = Buffer.alloc(stride);
  const paeth = (a: number, b: number, c: number) => {
    const p0 = a + b - c;
    const pa = Math.abs(p0 - a);
    const pb = Math.abs(p0 - b);
    const pc = Math.abs(p0 - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < h; y++) {
    const filter = inflated[p++];
    const raw = inflated.subarray(p, p + stride);
    p += stride;
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? row[i - 4] : 0;
      const up = prev[i];
      const upLeft = i >= 4 ? prev[i - 4] : 0;
      let val = raw[i];
      if (filter === 1) val = (val + left) & 255;
      else if (filter === 2) val = (val + up) & 255;
      else if (filter === 3) val = (val + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) val = (val + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`bad filter ${filter} in ${path}`);
      row[i] = val;
    }
    for (let x = 0; x < w; x++) {
      const o = x * 4;
      const a = row[o + 3];
      if (a === 0) continue;
      if (a > 0 && a < 255) soft++;
      colors.add(`${row[o]},${row[o + 1]},${row[o + 2]}`);
    }
    prev = row;
  }
  return { colors: colors.size, soft };
}

const POSES = {
  idle: 2,
  walk: 4,
  attack: 3,
  down: 2,
} as const;

const CLASSES = ["out", "surv", "ctrl"] as const;

describe("art v2 — criterion 1 layout canvas", () => {
  it("canvas 420×780; stage≈42% board≈58%; 7×6 four colors", () => {
    expect(W).toBe(420);
    expect(H).toBe(780);
    expect(main).toMatch(/width:\s*W/);
    expect(main).toMatch(/height:\s*H/);
    expect(battle).toMatch(/STAGE_ZONE_H\s*=\s*Math\.round\(H \* 0\.42\)/);
    expect(battle).toMatch(/BOARD_ZONE_Y\s*=\s*STAGE_ZONE_H/);
    const stage = Math.round(H * 0.42);
    expect(stage / H).toBeGreaterThanOrEqual(0.39);
    expect(stage / H).toBeLessThanOrEqual(0.45);
    expect((H - stage) / H).toBeGreaterThanOrEqual(0.55);
    expect((H - stage) / H).toBeLessThanOrEqual(0.61);
    expect(COLS).toBe(7);
    expect(ROWS).toBe(6);
    for (const c of ["r", "b", "g", "y"]) {
      expect(existsSync(join(artDir, `bead-${c}.png`))).toBe(true);
    }
  });
});

describe("art v2 — criterion 2 pixel hard-edge slots", () => {
  it("role frames 48×48, beads 32×32, palette≤16, no soft alpha", () => {
    const sample = [
      "hero-out-idle-0.png",
      "hero-surv-attack-1.png",
      "hero-ctrl-walk-2.png",
      "enemy-01-idle-0.png",
      "enemy-10-down-1.png",
      "enemy-05-attack-1.png",
    ];
    for (const name of sample) {
      const path = join(framesDir, name);
      expect(existsSync(path), name).toBe(true);
      const { w, h } = pngSize(path);
      expect(w).toBe(48);
      expect(h).toBe(48);
      const { colors, soft } = pngPaletteSoft(path);
      expect(colors, `${name} palette`).toBeLessThanOrEqual(16);
      expect(soft, `${name} soft`).toBe(0);
    }
    for (const c of ["r", "b", "g", "y"]) {
      const path = join(artDir, `bead-${c}.png`);
      const { w, h } = pngSize(path);
      expect(w).toBe(32);
      expect(h).toBe(32);
      const { colors, soft } = pngPaletteSoft(path);
      expect(colors).toBeLessThanOrEqual(16);
      expect(soft).toBe(0);
    }
  });

  it("all class/enemy frame PNGs are 48×48", () => {
    for (const c of CLASSES) {
      for (const [action, n] of Object.entries(POSES)) {
        for (let i = 0; i < n; i++) {
          const path = join(framesDir, `hero-${c}-${action}-${i}.png`);
          expect(existsSync(path), path).toBe(true);
          const { w, h } = pngSize(path);
          expect({ w, h }).toEqual({ w: 48, h: 48 });
        }
      }
    }
    for (let e = 1; e <= 10; e++) {
      const k = String(e).padStart(2, "0");
      for (const [action, n] of Object.entries(POSES)) {
        for (let i = 0; i < n; i++) {
          const path = join(framesDir, `enemy-${k}-${action}-${i}.png`);
          expect(existsSync(path), path).toBe(true);
          const { w, h } = pngSize(path);
          expect({ w, h }).toEqual({ w: 48, h: 48 });
        }
      }
    }
  });
});

describe("art v2 — criterion 3 frame sequence", () => {
  it("class hero and enemy frames include idle2/walk4/attack3/down2", () => {
    for (const c of CLASSES) {
      for (const [action, n] of Object.entries(POSES)) {
        for (let i = 0; i < n; i++) {
          expect(existsSync(join(framesDir, `hero-${c}-${action}-${i}.png`))).toBe(true);
        }
      }
    }
    for (let i = 1; i <= 10; i++) {
      const k = String(i).padStart(2, "0");
      for (const [action, n] of Object.entries(POSES)) {
        for (let j = 0; j < n; j++) {
          expect(existsSync(join(framesDir, `enemy-${k}-${action}-${j}.png`))).toBe(true);
        }
      }
    }
  });

  it("boot loads class frames, down×2, bg/board/log ui", () => {
    expect(boot).toMatch(/hero-\$\{c\}-/);
    expect(boot).toMatch(/down-1/);
    expect(boot).toMatch(/bg-battle/);
    expect(boot).toMatch(/board-panel/);
    expect(boot).toMatch(/ui-log-btn/);
    expect(boot).toMatch(/e\$\{k\}-down.*down-0.*down-1|frames: \[\{ key: `e\$\{k\}-down-0` \}, \{ key: `e\$\{k\}-down-1` \}\]/);
    expect(existsSync(join(artDir, "bg-battle.png"))).toBe(true);
    expect(existsSync(join(artDir, "board-panel.png"))).toBe(true);
    expect(existsSync(join(artDir, "ui-log-btn.png"))).toBe(true);
    expect(existsSync(join(artDir, "ui-log-panel.png"))).toBe(true);
  });
});

describe("art v2 — criterion 4 layout chrome", () => {
  it("stage+board only; HP above head; log popup; mute/skills on edge", () => {
    expect(battle).not.toMatch(/lv\.teach/);
    expect(battle).toMatch(/toggleLogPanel|openLogPanel/);
    expect(battle).toMatch(/"日志"/);
    expect(battle).toMatch(/closeLogPanel/);
    expect(battle).toMatch(/logHit\.on\(\s*"wheel"/);
    expect(battle).toMatch(/heroBarBg\.setPosition\(hx,\s*hy - 30\)/);
    expect(battle).toMatch(/barY = my - /);
    expect(battle).toMatch(/addMuteButton/);
    expect(battle).toMatch(/SKILL_Y\s*=\s*H - 36/);
    expect(battle).toMatch(/STAGE_ZONE_H - 32/); // resText near stage bottom edge
  });
});

describe("art v2 — criterion 5 playable wiring", () => {
  it("battle uses class anims, bg, hit-frame delay, integer scale, pixelArt", () => {
    expect(battle).toMatch(/bg-battle/);
    expect(battle).toMatch(/board-panel/);
    expect(battle).toMatch(/hero-\$\{this\.classId\}-attack/);
    expect(battle).toMatch(/delayedCall\(100/);
    expect(battle).toMatch(/setDisplaySize\(48, 48\)/);
    expect(battle).toMatch(/setDisplaySize\(m\.isLord\s*\?\s*96\s*:\s*48/);
    expect(battle).toMatch(/clearDeadActors/);
    expect(battle).toMatch(/animateDeathOut/);
    expect(main).toMatch(/pixelArt:\s*true/);
    expect(main).toMatch(/antialias:\s*false/);
  });
});
