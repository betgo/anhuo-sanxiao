import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeBattleState, LEVELS, HERO_MAX } from "./rules";

const ROOT = join(__dirname, "../..");
const battleSrc = readFileSync(join(ROOT, "src/scenes/BattleScene.ts"), "utf8");

function method(name: string): string {
  const re = new RegExp(
    `private (?:async )?${name}\\([^)]*\\)(?:\\s*:\\s*[^{]+)?\\s*\\{[\\s\\S]*?\\n  \\}`,
  );
  const m = battleSrc.match(re);
  expect(m, `method ${name}`).toBeTruthy();
  return m![0];
}

describe("settlement — non-blocking banner", () => {
  it("finish shows advance banner; never ResultScene or full-screen modal rect", () => {
    const finish = method("finish");
    expect(finish).toMatch(/this\.showAdvanceBanner\(win,\s*isLast\)/);
    expect(battleSrc).not.toMatch(/this\.scene\.start\(\s*["']result["']/);
    expect(finish).not.toMatch(/busy\s*=\s*true/);
  });

  it("banner fades text, keeps top mini buttons, no pause overlay panel", () => {
    const banner = method("showAdvanceBanner");
    expect(banner).toMatch(/进入下一关/);
    expect(banner).toMatch(/重新挑战/);
    expect(banner).toMatch(/章节完成/);
    expect(banner).toMatch(/tweens\.add\([\s\S]*alpha:\s*1/);
    expect(banner).not.toMatch(/0x120c08,\s*0\.92/);
    expect(banner).toMatch(/"停止"/);
    expect(banner).toMatch(/"回选关"/);
  });
});

describe("settlement — 5s auto / stop", () => {
  it("non-last: 5s countdown auto restart next or retry", () => {
    const banner = method("showAdvanceBanner");
    expect(banner).toMatch(/this\.autoLeft\s*=\s*5/);
    expect(banner).toMatch(/if \(win\) this\.scene\.restart\(\{\s*levelIndex:\s*this\.levelIndex\s*\+\s*1\s*\}\)/);
    expect(banner).toMatch(/else this\.scene\.restart\(\{\s*levelIndex:\s*this\.levelIndex\s*\}\)/);
    expect(banner).toMatch(/delay:\s*1000/);
    expect(banner).toMatch(/repeat:\s*4/);
    expect(banner).toMatch(/autoStopped\s*=\s*true/);
  });

  it("last-level win: 章节完成, only 回选关", () => {
    const banner = method("showAdvanceBanner");
    expect(banner).toMatch(/if \(win && isLast\)/);
    const lastBlock = banner.match(/if \(win && isLast\) \{[\s\S]*?return;\s*\}/)?.[0] ?? "";
    expect(lastBlock).toMatch(/回选关/);
    expect(lastBlock).not.toMatch(/autoLeft|doAuto|下一关/);
  });
});

describe("settlement — restart keeps class/amulet", () => {
  it("create rebuilds from save + makeBattleState; auto is scene.restart", () => {
    const create = battleSrc.match(/create\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(create).toMatch(/makeBattleState\(lv,\s*save\.classId,\s*save\.amulet\)/);
    expect(create).toMatch(/this\.board\s*=\s*generateBoard\(\)/);
    const banner = method("showAdvanceBanner");
    expect(banner).toMatch(/scene\.restart/);
    expect(banner).not.toMatch(/scene\.start\(\s*["']prep["']/);
    expect(banner).not.toMatch(/scene\.start\(\s*["']result["']/);
  });

  it("makeBattleState resets resources", () => {
    const st = makeBattleState(LEVELS[0], "surv", true);
    expect(st.classId).toBe("surv");
    expect(st.amulet).toBe(true);
    expect(st.hero.hp).toBe(LEVELS[0].startHp);
    expect(st.hero.max).toBe(HERO_MAX);
    expect(st.shield).toBe(0);
    expect(st.blue).toBe(0);
    expect(st.yellow).toBe(0);
    expect(st.monsters.length).toBe(LEVELS[0].squad.length);
  });
});

describe("settlement — no scene pause / elite render hooks", () => {
  it("finish/banner never call scene.pause or physics pause", () => {
    expect(battleSrc).not.toMatch(/scene\.pause\(/);
    expect(battleSrc).not.toMatch(/physics\.pause/);
    const finish = method("finish");
    expect(finish).not.toMatch(/this\.busy\s*=\s*true/);
  });

  it("elite sprites larger + tint + 精英 tag beside bar", () => {
    expect(battleSrc).toMatch(/const big\s*=\s*!!m\.elite\s*\|\|\s*!!m\.isLord/);
    expect(battleSrc).toMatch(/setDisplaySize\(big\s*\?\s*58\s*:\s*48,\s*big\s*\?\s*66\s*:\s*54\)/);
    expect(battleSrc).toMatch(/if \(m\.elite\) spr\.setTint\(0xffe0a0\)/);
    expect(battleSrc).toMatch(/"精英"/);
  });
});


describe("settlement — death anim before win/wave", () => {
  it("last hit clears corpses then settles; no instant finish on allDead in attack", () => {
    expect(battleSrc).toMatch(/clearDeadActors/);
    expect(battleSrc).toMatch(/animateDeathOut/);
    expect(battleSrc).toMatch(/trySettleOrWave/);
    const heroAtk = method("doHeroAttack");
    expect(heroAtk).toMatch(/afterCombatHits/);
    expect(heroAtk).not.toMatch(/if \(allDead\(this\.battle\)\) this\.finish\(true\)/);
    expect(battleSrc).toMatch(/alpha:\s*0/);
    expect(battleSrc).toMatch(/mobSpr\.delete/);
  });
});

describe("settlement — death before win/wave (strict)", () => {
  it("afterCombatHits awaits clearDeadActors then trySettleOrWave", () => {
    const after = method("afterCombatHits");
    expect(after).toMatch(/await this\.clearDeadActors\(deadIds\)/);
    expect(after).toMatch(/this\.trySettleOrWave\(\)/);
    const awaitIdx = after.indexOf("await this.clearDeadActors");
    const settleIdx = after.indexOf("this.trySettleOrWave()");
    expect(awaitIdx).toBeGreaterThanOrEqual(0);
    expect(settleIdx).toBeGreaterThan(awaitIdx);
  });

  it("animateDeathOut plays down, fades out, destroys sprite and deletes mobSpr", () => {
    const anim = method("animateDeathOut");
    expect(anim).toMatch(/e\$\{m\.kind\}-down/);
    expect(anim).toMatch(/spr\.play\(key\)/);
    expect(anim).toMatch(/alpha:\s*0/);
    expect(anim).toMatch(/spr\.destroy\(\)/);
    expect(anim).toMatch(/this\.mobSpr\.delete\(id\)/);
    expect(anim).toMatch(/this\.mobBars\.delete\(id\)/);
  });

  it("trySettleOrWave blocks while clearingDeaths; win only after no corpses", () => {
    const settle = method("trySettleOrWave");
    expect(settle).toMatch(/if \(this\.over \|\| this\.clearingDeaths\) return/);
    expect(settle).toMatch(/tryAdvanceWave/);
    expect(settle).toMatch(/wave\.done && allDead/);
    expect(settle).toMatch(/m\.hp <= 0 && this\.mobSpr\.has/);
    expect(settle).toMatch(/clearDeadActors/);
    expect(settle).toMatch(/this\.finish\(true\)/);
    const finishIdx = settle.indexOf("this.finish(true)");
    const leftCheck = settle.indexOf("mobSpr.has");
    expect(leftCheck).toBeGreaterThanOrEqual(0);
    expect(finishIdx).toBeGreaterThan(leftCheck);
  });

  it("update clears corpses before settle/wave; skill path also uses afterCombatHits", () => {
    const update = battleSrc.match(/update\([^)]*\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(update).toMatch(/clearingDeaths/);
    expect(update).toMatch(/clearDeadActors\(corpseIds\)\.then\(\(\) => this\.trySettleOrWave\(\)\)/);
    const cast = method("onCast");
    expect(cast).toMatch(/afterCombatHits\(hits\)/);
    expect(cast).not.toMatch(/this\.finish\(true\)/);
  });

  it("clearDeadActors sets clearingDeaths and runs animateDeathOut for each id", () => {
    const clear = method("clearDeadActors");
    expect(clear).toMatch(/this\.clearingDeaths\s*=\s*true/);
    expect(clear).toMatch(/animateDeathOut\(id\)/);
    expect(clear).toMatch(/this\.clearingDeaths\s*=\s*false/);
  });
});
