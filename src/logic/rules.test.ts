import { describe, it, expect } from "vitest";
import {
  COLS,
  ROWS,
  COLORS,
  HERO_STATS,
  HERO_MAX,
  SHIELD_CAP,
  LEVELS,
  baseAtk,
  baseInterval,
  moveSpeed,
  skillMult,
  makeBattleState,
  makeCtxFrom,
  dealDamage,
  resolveGroup,
  group,
  castSkill,
  canCast,
  unitAttack,
  unitInterval,
  maybeEnrageLord,
  applySlow,
  getLock,
  strikeHero,
} from "./rules";

describe("board constants", () => {
  it("7x6 and four colors only", () => {
    expect(COLS).toBe(7);
    expect(ROWS).toBe(6);
    expect(COLORS).toEqual(["r", "b", "g", "y"]);
  });
});

describe("combat formulas — three classes", () => {
  it("TC-1.1 output 12/4/8", () => {
    const s = HERO_STATS.out;
    expect(s).toEqual({ str: 12, int: 4, agi: 8 });
    expect(baseAtk(s.str, false)).toBe(16);
    expect(baseInterval(s.agi)).toBeCloseTo(1.28);
    expect(moveSpeed(s.agi)).toBeCloseTo(1.6);
    expect(skillMult(s.int)).toBeCloseTo(1.2);
  });

  it("TC-1.2 surv 8/4/10", () => {
    const s = HERO_STATS.surv;
    expect(s).toEqual({ str: 8, int: 4, agi: 10 });
    expect(baseAtk(s.str, false)).toBe(12);
    expect(baseInterval(s.agi)).toBeCloseTo(1.2);
    expect(moveSpeed(s.agi)).toBeCloseTo(1.7);
    expect(skillMult(s.int)).toBeCloseTo(1.2);
  });

  it("TC-1.3 ctrl 4/12/6", () => {
    const s = HERO_STATS.ctrl;
    expect(s).toEqual({ str: 4, int: 12, agi: 6 });
    expect(baseAtk(s.str, false)).toBe(8);
    expect(baseInterval(s.agi)).toBeCloseTo(1.36);
    expect(moveSpeed(s.agi)).toBeCloseTo(1.5);
    expect(skillMult(s.int)).toBeCloseTo(1.6);
  });

  it("TC-1.4 rust sword +2 from level 7", () => {
    expect(baseAtk(12, true)).toBe(18);
    expect(baseAtk(8, true)).toBe(14);
    expect(baseAtk(4, true)).toBe(10);
  });

  it("interval floor 0.6", () => {
    expect(baseInterval(30)).toBe(0.6);
  });

  it("TC-1.5 hero hp/shield caps", () => {
    expect(HERO_MAX).toBe(34);
    expect(SHIELD_CAP).toBe(22);
    const st = makeBattleState(LEVELS[2], "out", false);
    expect(st.hero.hp).toBe(16);
    expect(st.hero.max).toBe(34);
  });
});

describe("ten levels — count, hp, melee/ranged", () => {
  const expectSquad = (
    idx: number,
    count: number,
    hp: number | number[],
    rangedFlags: boolean[]
  ) => {
    const lv = LEVELS[idx];
    expect(lv.squad).toHaveLength(count);
    const hps = Array.isArray(hp) ? hp : Array(count).fill(hp);
    lv.squad.forEach((m: any, i: number) => {
      expect(m.hp).toBe(hps[i]);
      expect(!!m.ranged).toBe(rangedFlags[i]);
    });
    const st = makeBattleState(lv, "out", false);
    expect(st.monsters).toHaveLength(count);
    st.monsters.forEach((m: any, i: number) => {
      expect(m.hp).toBe(hps[i]);
      expect(m.range).toBe(rangedFlags[i] ? 3 : 1);
    });
  };

  it("levels 1–10 squads", () => {
    expectSquad(0, 2, 24, [false, false]);
    expectSquad(1, 2, 30, [false, false]);
    expectSquad(2, 2, 24, [false, false]);
    expectSquad(3, 2, 35, [true, true]);
    expectSquad(4, 2, 33, [false, false]);
    expectSquad(5, 3, 28, [false, false, false]);
    expectSquad(6, 2, 50, [false, false]);
    expectSquad(7, 2, 60, [true, true]);
    expectSquad(8, 2, 50, [false, false]);
    expectSquad(9, 3, [24, 24, 120], [false, false, true]);
  });

  it("level 10 lord stats before enrage", () => {
    const lord = LEVELS[9].squad[2];
    expect(lord.name).toBe("地牢领主");
    expect(lord.str).toBe(14);
    expect(lord.int).toBe(8);
    expect(lord.agi).toBe(5);
    expect(baseAtk(lord.str, false)).toBe(18);
    expect(baseInterval(lord.agi)).toBeCloseTo(1.4);
  });
});

describe("maybeEnrageLord", () => {
  it("str +4 once when now >= 16", () => {
    const st = makeBattleState(LEVELS[9], "out", false);
    const lord = st.monsters.find((m: any) => m.isLord)!;
    expect(maybeEnrageLord(st, 15.9)).toBe(false);
    expect(lord.str).toBe(14);
    expect(maybeEnrageLord(st, 16)).toBe(true);
    expect(lord.str).toBe(18);
    expect(baseAtk(lord.str, false)).toBe(22);
    expect(st.lordEnraged).toBe(true);
    expect(maybeEnrageLord(st, 20)).toBe(false);
    expect(lord.str).toBe(18);
  });
});

describe("match-3 buffs only", () => {
  it("red +40% and out yellow +30% add to x1.7", () => {
    const st = makeBattleState(LEVELS[6], "out", false);
    const ctx = makeCtxFrom(LEVELS[6], "out", false);
    resolveGroup(group("r", 3, 3), st, ctx, 0);
    resolveGroup(group("y", 3, 3), st, ctx, 0);
    // base 18 with sword → round(18 * 1.7) = 31
    expect(unitAttack(st.hero, 0.1, true)).toBe(31);
    const st2 = makeBattleState(LEVELS[3], "out", false);
    const ctx2 = makeCtxFrom(LEVELS[3], "out", false);
    resolveGroup(group("r", 3, 3), st2, ctx2, 0);
    resolveGroup(group("y", 3, 3), st2, ctx2, 0);
    expect(unitAttack(st2.hero, 0.1, false)).toBe(Math.round(16 * 1.7));
  });

  it("blue +1 per bead and temp int +4", () => {
    const st = makeBattleState(LEVELS[1], "out", false);
    const ctx = makeCtxFrom(LEVELS[1], "out", false);
    resolveGroup(group("b", 4, 4), st, ctx, 0);
    expect(st.blue).toBe(4);
    expect(st.hero.tempInt).toBe(4);
    expect(st.hero.tempIntUntil).toBe(4);
    resolveGroup(group("b", 3, 3), st, ctx, 1);
    expect(st.blue).toBe(7);
    expect(st.hero.tempInt).toBe(4);
    expect(st.hero.tempIntUntil).toBe(5);
  });

  it("green 2 / amulet 3 heal then shield", () => {
    const st = makeBattleState(LEVELS[2], "out", false);
    expect(st.hero.hp).toBe(16);
    const ctx = makeCtxFrom(LEVELS[2], "out", false);
    resolveGroup(group("g", 3, 3), st, ctx, 0);
    // 3 * 2 = 6 heal
    expect(st.hero.hp).toBe(22);
    expect(st.shield).toBe(0);

    const stA = makeBattleState(LEVELS[2], "out", true);
    const ctxA = makeCtxFrom(LEVELS[2], "out", true);
    resolveGroup(group("g", 3, 3), stA, ctxA, 0);
    // 3 * 3 = 9 → heal to 25
    expect(stA.hero.hp).toBe(25);

    const full = makeBattleState(LEVELS[0], "out", false);
    const ctxF = makeCtxFrom(LEVELS[3], "out", false);
    full.hero.hp = 34;
    resolveGroup(group("g", 5, 5), full, ctxF, 0);
    expect(full.hero.hp).toBe(34);
    expect(full.shield).toBe(10); // 5*2
  });

  it("ctrl yellow slows lock interval x1.5", () => {
    const st = makeBattleState(LEVELS[3], "ctrl", false);
    const ctx = makeCtxFrom(LEVELS[3], "ctrl", false);
    const lock = getLock(st)!;
    const base = baseInterval(lock.agi);
    resolveGroup(group("y", 3, 3), st, ctx, 0);
    expect(st.yellow).toBe(3);
    expect(lock.slowMul).toBe(1.5);
    expect(lock.slowUntil).toBe(3);
    expect(unitInterval(lock, 1)).toBeCloseTo(base * 1.5);
  });

  it("surv yellow adds shield 4 per bead", () => {
    const st = makeBattleState(LEVELS[3], "surv", false);
    const ctx = makeCtxFrom(LEVELS[3], "surv", false);
    resolveGroup(group("y", 3, 3), st, ctx, 0);
    expect(st.yellow).toBe(3);
    expect(st.shield).toBe(12);
  });
});

describe("overflow — only slash", () => {
  it("auto attack does not overflow", () => {
    const st = makeBattleState(LEVELS[0], "out", false);
    st.monsters[0].hp = 5;
    st.monsters[1].hp = 20;
    const hits = dealDamage(st, 1, 12, false);
    expect(hits).toHaveLength(1);
    expect(st.monsters[0].hp).toBe(0);
    expect(st.monsters[1].hp).toBe(20);
  });

  it("slash overflows to nearest other", () => {
    const st = makeBattleState(LEVELS[0], "out", false);
    st.monsters[0].hp = 5;
    st.monsters[1].hp = 20;
    expect(dealDamage(st, 1, 12, true)).toHaveLength(2);
    expect(st.monsters[1].hp).toBe(13);
  });

  it("out ult damage path does not overflow (dealDamage false)", () => {
    const st = makeBattleState(LEVELS[7], "out", false);
    st.monsters[0].hp = 5;
    st.monsters[1].hp = 50;
    st.blue = 10;
    st.yellow = 5;
    const ctx = makeCtxFrom(LEVELS[7], "out", false);
    const res = castSkill("ult", st, ctx, 0)!;
    expect(res.attack).toBe(Math.round(40 * skillMult(4)));
    const hits = dealDamage(st, 1, res.attack, false);
    expect(hits).toHaveLength(1);
    expect(st.monsters[1].hp).toBe(50);
  });
});

describe("skills — cost, CD, gate, rounding", () => {
  it("slash locked before level 2", () => {
    const st = makeBattleState(LEVELS[0], "out", false);
    st.blue = 10;
    const ctx = makeCtxFrom(LEVELS[0], "out", false);
    expect(canCast("slash", st, ctx, 0)).toBe(false);
    expect(castSkill("slash", st, ctx, 0)).toBeNull();
  });

  it("slash costs 4 blue, CD 6, rounded damage", () => {
    const st = makeBattleState(LEVELS[1], "out", false);
    st.blue = 10;
    const ctx = makeCtxFrom(LEVELS[1], "out", false);
    const res = castSkill("slash", st, ctx, 1)!;
    expect(res.attack).toBe(Math.round(22 * skillMult(4))); // 26
    expect(st.blue).toBe(6);
    expect(st.slashReadyAt).toBe(7);
    expect(canCast("slash", st, ctx, 6.9)).toBe(false);
    expect(canCast("slash", st, ctx, 7)).toBe(true);
  });

  it("slash with temp int uses class+temp", () => {
    const st = makeBattleState(LEVELS[7], "out", false);
    st.blue = 10;
    st.hero.tempInt = 4;
    st.hero.tempIntUntil = 10;
    const ctx = makeCtxFrom(LEVELS[7], "out", false);
    expect(castSkill("slash", st, ctx, 0)!.attack).toBe(Math.round(22 * skillMult(8))); // 31
  });

  it("ctrl slash round(22*1.6)=35", () => {
    const st = makeBattleState(LEVELS[1], "ctrl", false);
    st.blue = 10;
    const ctx = makeCtxFrom(LEVELS[1], "ctrl", false);
    expect(castSkill("slash", st, ctx, 0)!.attack).toBe(35);
  });

  it("ult locked before level 8", () => {
    const st = makeBattleState(LEVELS[6], "out", false);
    st.blue = 10;
    st.yellow = 5;
    const ctx = makeCtxFrom(LEVELS[6], "out", false);
    expect(canCast("ult", st, ctx, 0)).toBe(false);
  });

  it("ult costs blue4 yellow2, CD 12, out round(40*mult)", () => {
    const st = makeBattleState(LEVELS[7], "out", false);
    st.blue = 10;
    st.yellow = 5;
    const ctx = makeCtxFrom(LEVELS[7], "out", false);
    const res = castSkill("ult", st, ctx, 2)!;
    expect(res.attack).toBe(Math.round(40 * skillMult(4))); // 48
    expect(st.blue).toBe(6);
    expect(st.yellow).toBe(3);
    expect(st.ultReadyAt).toBe(14);
  });

  it("surv ult heal 14 shield +10", () => {
    const st = makeBattleState(LEVELS[7], "surv", false);
    st.hero.hp = 10;
    st.blue = 10;
    st.yellow = 5;
    const ctx = makeCtxFrom(LEVELS[7], "surv", false);
    castSkill("ult", st, ctx, 0);
    expect(st.hero.hp).toBe(24);
    expect(st.shield).toBe(10);
  });

  it("ctrl ult slow x2 for 4s", () => {
    const st = makeBattleState(LEVELS[7], "ctrl", false);
    st.blue = 10;
    st.yellow = 5;
    const ctx = makeCtxFrom(LEVELS[7], "ctrl", false);
    const res = castSkill("ult", st, ctx, 0)!;
    expect(res.slow).toEqual({ mul: 2, sec: 4 });
    const lock = getLock(st)!;
    applySlow(lock, res.slow!.mul, res.slow!.sec, 0);
    expect(lock.slowMul).toBe(2);
    expect(lock.slowUntil).toBe(4);
  });

  it("cannot cast without resources", () => {
    const st = makeBattleState(LEVELS[7], "out", false);
    st.blue = 3;
    st.yellow = 5;
    const ctx = makeCtxFrom(LEVELS[7], "out", false);
    expect(castSkill("slash", st, ctx, 0)).toBeNull();
    st.blue = 10;
    st.yellow = 1;
    expect(castSkill("ult", st, ctx, 0)).toBeNull();
  });
});

describe("P0 — hero death via strikeHero", () => {
  it("lethal hit sets hero hp to 0", () => {
    const st = makeBattleState(LEVELS[0], "out", false);
    st.shield = 0;
    st.hero.hp = 10;
    const hit = strikeHero(st, 15);
    expect(hit.hp).toBe(10);
    expect(hit.absorbed).toBe(0);
    expect(st.hero.hp).toBe(0);
    expect(st.heroHp).toBe(0);
  });

  it("shield absorbs before hp; leftover can still kill", () => {
    const st = makeBattleState(LEVELS[0], "surv", false);
    st.shield = 5;
    st.hero.hp = 8;
    const hit = strikeHero(st, 20);
    expect(hit.absorbed).toBe(5);
    expect(hit.hp).toBe(8);
    expect(st.shield).toBe(0);
    expect(st.hero.hp).toBe(0);
  });

  it("exact lethal does not go negative", () => {
    const st = makeBattleState(LEVELS[0], "ctrl", false);
    st.shield = 0;
    st.hero.hp = 7;
    strikeHero(st, 7);
    expect(st.hero.hp).toBe(0);
  });
});
