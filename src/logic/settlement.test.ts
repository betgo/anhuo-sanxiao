import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeBattleState, LEVELS, HERO_MAX } from "./rules";

const ROOT = join(__dirname, "../..");
const battleSrc = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");

function method(name: string): string {
  const re = new RegExp(`private ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`);
  const m = battleSrc.match(re);
  expect(m, `method ${name}`).toBeTruthy();
  return m![0];
}

describe("settlement — stay on battle overlay", () => {
  it("finish shows overlay; never starts ResultScene", () => {
    const finish = method("finish");
    expect(finish).toMatch(/this\.showResultOverlay\(win,\s*detail,\s*isLast\)/);
    expect(battleSrc).not.toMatch(/this\.scene\.start\(\s*["']result["']/);
    expect(finish).not.toMatch(/scene\.start/);
  });

  it("showResultOverlay is a depth-2000 container on battle, not a scene switch", () => {
    const overlay = method("showResultOverlay");
    expect(overlay).toMatch(/setDepth\(2000\)/);
    expect(overlay).toMatch(/this\.add\.container/);
    expect(overlay).not.toMatch(/scene\.start\(\s*["']result["']/);
    expect(overlay).not.toMatch(/scene\.start\(\s*["']prep["']/);
  });
});

describe("settlement — win auto next / stop / last level", () => {
  it("non-last win: 5s countdown, auto restart levelIndex+1, 停止 + 回选关", () => {
    const overlay = method("showResultOverlay");
    expect(overlay).toMatch(/this\.autoLeft\s*=\s*5/);
    expect(overlay).toMatch(/actionLabel\s*=\s*win\s*\?\s*"下一关"\s*:\s*"重试"/);
    expect(overlay).toMatch(/if \(win\) this\.scene\.restart\(\{\s*levelIndex:\s*this\.levelIndex\s*\+\s*1\s*\}\)/);
    expect(overlay).toMatch(/delay:\s*1000/);
    expect(overlay).toMatch(/repeat:\s*4/);
    expect(overlay).toMatch(/"停止"/);
    expect(overlay).toMatch(/autoStopped\s*=\s*true/);
    expect(overlay).toMatch(/addBtn\([\s\S]*actionLabel,\s*doAuto\)/);
    expect(overlay).toMatch(/"回选关"/);
  });

  it("last-level win: 章节完成, only 回选关, no auto timer", () => {
    const finish = method("finish");
    expect(finish).toMatch(/isLast\s*=\s*this\.levelIndex\s*>=\s*LEVELS\.length\s*-\s*1/);
    expect(finish).toMatch(/章节完成/);
    const overlay = method("showResultOverlay");
    expect(overlay).toMatch(/if \(win && isLast\)/);
    expect(overlay).toMatch(/win\s*\?\s*\(isLast\s*\?\s*"章节完成"\s*:\s*"胜利"\)/);
    // early return before autoLeft = 5
    const lastBlock = overlay.match(/if \(win && isLast\) \{[\s\S]*?return;\s*\}/)?.[0] ?? "";
    expect(lastBlock).toMatch(/"回选关"/);
    expect(lastBlock).not.toMatch(/autoLeft|doAuto|下一关/);
  });
});

describe("settlement — lose auto retry / stop", () => {
  it("lose: 5s auto restart same levelIndex as 重试", () => {
    const overlay = method("showResultOverlay");
    expect(overlay).toMatch(/else this\.scene\.restart\(\{\s*levelIndex:\s*this\.levelIndex\s*\}\)/);
    expect(overlay).toMatch(/win\s*\?\s*"下一关"\s*:\s*"重试"/);
    expect(overlay).toMatch(/秒后自动\$\{actionLabel\}/);
  });
});

describe("settlement — restart keeps class/amulet, resets resources", () => {
  it("create rebuilds from save + makeBattleState + generateBoard; auto path is scene.restart only", () => {
    const create = battleSrc.match(/create\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(create).toMatch(/makeBattleState\(lv,\s*save\.classId,\s*save\.amulet\)/);
    expect(create).toMatch(/this\.board\s*=\s*generateBoard\(\)/);
    expect(create).not.toMatch(/scene\.start\(\s*["']prep["']/);
    expect(create).not.toMatch(/scene\.start\(\s*["']select["']/);

    const overlay = method("showResultOverlay");
    const doAuto = overlay.match(/const doAuto\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};/)?.[0] ?? "";
    expect(doAuto).toMatch(/scene\.restart/);
    expect(doAuto).not.toMatch(/prep|select|result/);
  });

  it("makeBattleState: full startHp, shield/blue/yellow 0, class+amulet kept, fresh monsters", () => {
    const lv0 = LEVELS[0];
    const st = makeBattleState(lv0, "surv", true);
    expect(st.classId).toBe("surv");
    expect(st.amulet).toBe(true);
    expect(st.hero.hp).toBe(lv0.startHp);
    expect(st.hero.max).toBe(HERO_MAX);
    expect(st.shield).toBe(0);
    expect(st.blue).toBe(0);
    expect(st.yellow).toBe(0);
    expect(st.monsters.length).toBe(lv0.squad.length);
    expect(st.monsters.every((m: { hp: number; max: number }) => m.hp === m.max && m.hp > 0)).toBe(true);

    const lv2 = LEVELS[2]; // 带着伤
    const wounded = makeBattleState(lv2, "out", false);
    expect(wounded.hero.hp).toBe(16);
    expect(wounded.amulet).toBe(false);
    expect(wounded.shield).toBe(0);
    expect(wounded.blue).toBe(0);
    expect(wounded.yellow).toBe(0);
  });
});
