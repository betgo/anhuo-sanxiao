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
  mobAtk,
  unitInterval,
  maybeEnrageLord,
  tryAdvanceWave,
  matchTier,
  WAVES,
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
    const wave0 = (lv.waves || [lv.squad])[0];
    expect(st.monsters).toHaveLength(wave0.length);
    st.monsters.forEach((m: any, i: number) => {
      expect(m.hp).toBe(wave0[i].hp);
      expect(m.range).toBe(wave0[i].ranged ? 3 : 1);
    });
  };

  it("levels 1–10 squads", () => {
    expectSquad(0, 3, 24, [false, false, false]);
    expectSquad(1, 3, 30, [false, false, false]);
    expectSquad(2, 4, 24, [false, false, false, false]);
    expectSquad(3, 4, [35, 35, 35, 53], [true, true, true, true]);
    expectSquad(4, 5, [33, 33, 33, 33, 50], [false, false, false, false, false]);
    expectSquad(5, 6, [28, 28, 28, 28, 28, 42], [false, false, false, false, false, false]);
    expectSquad(6, 5, [50, 50, 50, 50, 75], [false, false, false, false, false]);
    expectSquad(7, 5, [60, 60, 60, 90, 90], [true, true, true, true, true]);
    expectSquad(8, 6, [50, 50, 50, 50, 75, 75], [false, false, false, false, false, false]);
    expectSquad(9, 6, [24, 24, 24, 24, 36, 120], [false, false, false, false, false, true]);
  });

  it("elites marked and scaled", () => {
    const e = LEVELS[3].squad[3];
    expect(e.elite).toBe(true);
    expect(e.hp).toBe(53);
    expect(e.str).toBe(8);
    expect(LEVELS[9].squad[4].elite).toBe(true);
    expect(LEVELS[9].squad[5].kind).toBe("10");
  });

  it("level 10 lord stats before enrage", () => {
    const lord = LEVELS[9].squad[5];
    expect(lord.name).toBe("地牢领主");
    expect(lord.str).toBe(14);
    expect(lord.int).toBe(8);
    expect(lord.agi).toBe(5);
    expect(baseAtk(lord.str, false)).toBe(18);
    expect(baseInterval(lord.agi)).toBeCloseTo(1.4);
  });
});

describe("maybeEnrageLord", () => {
  it("str +4 once when 16s after lord entry", () => {
    const st = makeBattleState(LEVELS[9], "out", false);
    st.monsters.forEach((m: any) => { m.hp = 0; });
    expect(tryAdvanceWave(st, 1).advanced).toBe(true); // elite wave
    st.monsters.forEach((m: any) => { m.hp = 0; });
    const adv = tryAdvanceWave(st, 5);
    expect(adv.advanced).toBe(true);
    const lord = st.monsters.find((m: any) => m.isLord)!;
    expect(st.lordEnteredAt).toBe(5);
    expect(maybeEnrageLord(st, 20.9)).toBe(false);
    expect(lord.str).toBe(14);
    expect(maybeEnrageLord(st, 21)).toBe(true);
    expect(lord.str).toBe(18);
    expect(st.lordEnraged).toBe(true);
    expect(maybeEnrageLord(st, 30)).toBe(false);
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

  it("blue +1 per bead and temp int +4 (triple)", () => {
    const st = makeBattleState(LEVELS[1], "out", false);
    const ctx = makeCtxFrom(LEVELS[1], "out", false);
    resolveGroup(group("b", 3, 3), st, ctx, 0);
    expect(st.blue).toBe(3);
    expect(st.hero.tempInt).toBe(4);
    expect(st.hero.tempIntUntil).toBe(4);
    resolveGroup(group("b", 3, 3), st, ctx, 1);
    expect(st.blue).toBe(6);
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
    resolveGroup(group("g", 3, 3), full, ctxF, 0);
    expect(full.hero.hp).toBe(34);
    expect(full.shield).toBe(6); // 3*2
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

describe("match tiers", () => {
  it("matchTier buckets", () => {
    expect(matchTier(3)).toBe(3);
    expect(matchTier(4)).toBe(4);
    expect(matchTier(5)).toBe(5);
    expect(matchTier(7)).toBe(5);
  });
  it("red/yellow out scale by tier", () => {
    const st = makeBattleState(LEVELS[6], "out", false);
    const ctx = makeCtxFrom(LEVELS[6], "out", false);
    expect(resolveGroup(group("r", 4, 4), st, ctx, 0).tier).toBe(4);
    expect(st.hero.redBonus).toBeCloseTo(0.6);
    expect(st.hero.redUntil).toBe(4);
    resolveGroup(group("r", 5, 5), st, ctx, 0);
    expect(st.hero.redBonus).toBeCloseTo(0.8);
    expect(st.hero.redUntil).toBe(5);
    resolveGroup(group("y", 4, 4), st, ctx, 0);
    expect(st.hero.yellowAtkBonus).toBeCloseTo(0.45);
    resolveGroup(group("y", 5, 5), st, ctx, 0);
    expect(st.hero.yellowAtkBonus).toBeCloseTo(0.6);
    expect(unitAttack(st.hero, 0.1, true)).toBe(Math.round(18 * 2.4));
  });
  it("blue/green/surv/ctrl scale by tier", () => {
    const stB = makeBattleState(LEVELS[1], "out", false);
    resolveGroup(group("b", 4, 4), stB, makeCtxFrom(LEVELS[1], "out", false), 0);
    expect(stB.hero.tempInt).toBe(6);
    resolveGroup(group("b", 5, 5), stB, makeCtxFrom(LEVELS[1], "out", false), 0);
    expect(stB.hero.tempInt).toBe(8);
    expect(stB.hero.tempIntUntil).toBe(5);
    const stG = makeBattleState(LEVELS[0], "out", false);
    stG.hero.hp = 34;
    resolveGroup(group("g", 4, 4), stG, makeCtxFrom(LEVELS[3], "out", false), 0);
    expect(stG.shield).toBe(12); // 4*3
    resolveGroup(group("g", 5, 5), stG, makeCtxFrom(LEVELS[3], "out", false), 0);
    expect(stG.shield).toBe(22); // 12+20 capped
    const stS = makeBattleState(LEVELS[3], "surv", false);
    resolveGroup(group("y", 4, 4), stS, makeCtxFrom(LEVELS[3], "surv", false), 0);
    expect(stS.shield).toBe(22); // capped, 6*4=24 -> 22
    const stS5 = makeBattleState(LEVELS[3], "surv", false);
    resolveGroup(group("y", 5, 5), stS5, makeCtxFrom(LEVELS[3], "surv", false), 0);
    expect(stS5.shield).toBe(22); // 8*5=40 -> cap 22
    expect(stS5.yellow).toBe(5);
    const stC = makeBattleState(LEVELS[3], "ctrl", false);
    const lock = getLock(stC)!;
    resolveGroup(group("y", 4, 4), stC, makeCtxFrom(LEVELS[3], "ctrl", false), 0);
    expect(lock.slowMul).toBe(1.75);
    expect(lock.slowUntil).toBe(3.5);
    resolveGroup(group("y", 5, 5), stC, makeCtxFrom(LEVELS[3], "ctrl", false), 0);
    expect(lock.slowMul).toBe(2);
    expect(lock.slowUntil).toBe(4); // capped
  });

  it("四色×三档 table matches req 1.4 (no direct damage)", () => {
    const cases: { color: "r"|"b"|"g"|"y"; n: number; classId?: "out"|"surv"|"ctrl"; check: (st: any, r: any) => void }[] = [
      { color: "r", n: 3, check: (st) => { expect(st.hero.redBonus).toBeCloseTo(0.4); expect(st.hero.redUntil).toBe(4); } },
      { color: "r", n: 4, check: (st) => { expect(st.hero.redBonus).toBeCloseTo(0.6); expect(st.hero.redUntil).toBe(4); } },
      { color: "r", n: 5, check: (st) => { expect(st.hero.redBonus).toBeCloseTo(0.8); expect(st.hero.redUntil).toBe(5); } },
      { color: "b", n: 3, check: (st) => { expect(st.blue).toBe(3); expect(st.hero.tempInt).toBe(4); expect(st.hero.tempIntUntil).toBe(4); } },
      { color: "b", n: 4, check: (st) => { expect(st.blue).toBe(4); expect(st.hero.tempInt).toBe(6); expect(st.hero.tempIntUntil).toBe(4); } },
      { color: "b", n: 5, check: (st) => { expect(st.blue).toBe(5); expect(st.hero.tempInt).toBe(8); expect(st.hero.tempIntUntil).toBe(5); } },
      { color: "g", n: 3, check: (st) => { expect(st.shield).toBe(6); } },
      { color: "g", n: 4, check: (st) => { expect(st.shield).toBe(12); } },
      { color: "g", n: 5, check: (st) => { expect(st.shield).toBe(20); } },
      { color: "y", n: 3, classId: "out", check: (st) => { expect(st.hero.yellowAtkBonus).toBeCloseTo(0.3); expect(st.hero.yellowAtkUntil).toBe(4); } },
      { color: "y", n: 4, classId: "out", check: (st) => { expect(st.hero.yellowAtkBonus).toBeCloseTo(0.45); expect(st.hero.yellowAtkUntil).toBe(4); } },
      { color: "y", n: 5, classId: "out", check: (st) => { expect(st.hero.yellowAtkBonus).toBeCloseTo(0.6); expect(st.hero.yellowAtkUntil).toBe(5); } },
      { color: "y", n: 3, classId: "surv", check: (st) => { expect(st.shield).toBe(12); } },
      { color: "y", n: 4, classId: "surv", check: (st) => { expect(st.shield).toBe(22); } }, // 24 capped
      { color: "y", n: 5, classId: "surv", check: (st) => { expect(st.shield).toBe(22); } },
      { color: "y", n: 3, classId: "ctrl", check: (st) => { const lock = getLock(st)!; expect(lock.slowMul).toBe(1.5); expect(lock.slowUntil).toBe(3); } },
      { color: "y", n: 4, classId: "ctrl", check: (st) => { const lock = getLock(st)!; expect(lock.slowMul).toBe(1.75); expect(lock.slowUntil).toBe(3.5); } },
      { color: "y", n: 5, classId: "ctrl", check: (st) => { const lock = getLock(st)!; expect(lock.slowMul).toBe(2); expect(lock.slowUntil).toBe(4); } },
    ];
    for (const c of cases) {
      const classId = c.classId || "out";
      const lv = LEVELS[3];
      const st = makeBattleState(lv, classId, false);
      st.hero.hp = 34;
      const hps = st.monsters.map((m: any) => m.hp);
      const r = resolveGroup(group(c.color, c.n, c.n), st, makeCtxFrom(lv, classId, false), 0);
      expect(r.tier).toBe(matchTier(c.n));
      c.check(st, r);
      expect(st.monsters.map((m: any) => m.hp)).toEqual(hps);
    }
  });
});

describe("waves", () => {
  it("1-3 single wave; 4-9 two; 10 three", () => {
    for (let i = 0; i < 3; i++) expect(WAVES[i]).toHaveLength(1);
    for (let i = 3; i < 9; i++) expect(WAVES[i]).toHaveLength(2);
    expect(WAVES[9]).toHaveLength(3);
  });

  it("wave split table matches req 2.3", () => {
    const expectWave = (lv: number, wi: number, normals: number, elites: number, lords = 0) => {
      const wave = WAVES[lv][wi] as any[];
      expect(wave.filter((m) => !m.elite && m.kind !== "10").length).toBe(normals);
      expect(wave.filter((m) => m.elite).length).toBe(elites);
      expect(wave.filter((m) => m.kind === "10" || m.boss).length).toBe(lords);
    };
    expectWave(3, 0, 3, 0); expectWave(3, 1, 0, 1);
    expectWave(4, 0, 4, 0); expectWave(4, 1, 0, 1);
    expectWave(5, 0, 5, 0); expectWave(5, 1, 0, 1);
    expectWave(6, 0, 4, 0); expectWave(6, 1, 0, 1);
    expectWave(7, 0, 3, 0); expectWave(7, 1, 0, 2);
    expectWave(8, 0, 4, 0); expectWave(8, 1, 0, 2);
    expectWave(9, 0, 4, 0); expectWave(9, 1, 0, 1); expectWave(9, 2, 0, 0, 1);
  });

  it("level 4 starts with 3 normals then elite", () => {
    const st = makeBattleState(LEVELS[3], "out", false);
    expect(st.monsters).toHaveLength(3);
    expect(st.monsters.every((m: any) => !m.elite)).toBe(true);
    st.monsters.forEach((m: any) => { m.hp = 0; });
    const adv = tryAdvanceWave(st, 2);
    expect(adv.advanced).toBe(true);
    expect(st.waveIndex).toBe(1);
    expect(st.monsters.filter((m: any) => m.hp > 0 && m.elite)).toHaveLength(1);
  });

  it("level 10 three waves: bone -> elite bone -> lord", () => {
    const st = makeBattleState(LEVELS[9], "out", false);
    expect(st.monsters).toHaveLength(4);
    expect(st.monsters.every((m: any) => !m.elite && !m.isLord)).toBe(true);
    st.monsters.forEach((m: any) => { m.hp = 0; });
    expect(tryAdvanceWave(st, 1).advanced).toBe(true);
    expect(st.monsters.filter((m: any) => m.hp > 0 && m.elite)).toHaveLength(1);
    st.monsters.forEach((m: any) => { m.hp = 0; });
    expect(tryAdvanceWave(st, 2).advanced).toBe(true);
    expect(st.monsters.filter((m: any) => m.hp > 0 && m.isLord)).toHaveLength(1);
    expect(st.lordEnteredAt).toBe(2);
  });

  it("wave advance keeps buffs and resources", () => {
    const st = makeBattleState(LEVELS[3], "out", false);
    st.blue = 7;
    st.yellow = 4;
    st.shield = 5;
    st.hero.hp = 20;
    st.hero.redBonus = 0.6;
    st.hero.redUntil = 99;
    st.hero.yellowAtkBonus = 0.45;
    st.hero.yellowAtkUntil = 99;
    st.monsters.forEach((m: any) => { m.hp = 0; });
    tryAdvanceWave(st, 3);
    expect(st.blue).toBe(7);
    expect(st.yellow).toBe(4);
    expect(st.shield).toBe(5);
    expect(st.hero.hp).toBe(20);
    expect(st.hero.redBonus).toBeCloseTo(0.6);
    expect(st.hero.yellowAtkBonus).toBeCloseTo(0.45);
  });

  it("no advance while living mobs remain", () => {
    const st = makeBattleState(LEVELS[3], "out", false);
    expect(tryAdvanceWave(st, 1).advanced).toBe(false);
    expect(st.waveIndex).toBe(0);
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

describe("monster attack", () => {
  it("mob atk formula 1 + str*0.4", () => {
    expect(mobAtk(6)).toBe(3);
    expect(mobAtk(5)).toBe(3);
    expect(mobAtk(14)).toBe(7);
    const st = makeBattleState(LEVELS[1], "out", false);
    expect(unitAttack(st.monsters[0], 0, false)).toBe(mobAtk(st.monsters[0].str));
    expect(unitAttack(st.hero, 0, false)).toBe(baseAtk(st.hero.str, false));
  });
});

describe("monster vs hero attack formulas (product P0)", () => {
  it("mobAtk = round(1 + str*0.4); examples 6→3, 5→3, 14→7", () => {
    expect(mobAtk(6)).toBe(3);
    expect(mobAtk(5)).toBe(3);
    expect(mobAtk(14)).toBe(7);
    expect(mobAtk(8)).toBe(4);
    expect(mobAtk(12)).toBe(6);
    expect(mobAtk(10)).toBe(5);
  });

  it("hero attack stays 4+str (+2 sword); not mob formula", () => {
    expect(baseAtk(12, false)).toBe(16);
    expect(baseAtk(8, false)).toBe(12);
    expect(baseAtk(4, false)).toBe(8);
    expect(baseAtk(10, true)).toBe(16);
    const st = makeBattleState(LEVELS[0], "out", false);
    expect(unitAttack(st.hero, 0, false)).toBe(4 + st.hero.str);
    expect(unitAttack(st.hero, 0, false)).not.toBe(mobAtk(st.hero.str));
  });

  it("unitAttack routes mobs through mobAtk for every chapter-1 str", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const st = makeBattleState(LEVELS[i], "out", false);
      for (const m of st.monsters) {
        expect(unitAttack(m, 0, false)).toBe(mobAtk(m.str));
      }
    }
  });
});

describe("chapter-1 squad counts + elite scaling (product)", () => {
  const BASE = [
    { name: "游荡骨兵", hp: 24, str: 6, kind: "01" },
    { name: "蓝焰鬼火", hp: 30, str: 5, kind: "02" },
    { name: "腐疫鼠", hp: 24, str: 5, kind: "03" },
    { name: "试炼石像", hp: 35, str: 7, kind: "04" },
    { name: "持盾骷髅", hp: 33, str: 8, kind: "05" },
    { name: "疾行鬼", hp: 28, str: 6, kind: "06" },
    { name: "锈蚀守卫", hp: 50, str: 10, kind: "07" },
    { name: "咒印魔像", hp: 60, str: 8, kind: "08" },
    { name: "重斧魔", hp: 50, str: 12, kind: "09" },
  ];

  const PLAN: { normals: number; elites: number; lord?: boolean; baseIdx: number }[] = [
    { normals: 3, elites: 0, baseIdx: 0 },
    { normals: 3, elites: 0, baseIdx: 1 },
    { normals: 4, elites: 0, baseIdx: 2 },
    { normals: 3, elites: 1, baseIdx: 3 },
    { normals: 4, elites: 1, baseIdx: 4 },
    { normals: 5, elites: 1, baseIdx: 5 },
    { normals: 4, elites: 1, baseIdx: 6 },
    { normals: 3, elites: 2, baseIdx: 7 },
    { normals: 4, elites: 2, baseIdx: 8 },
    { normals: 4, elites: 1, lord: true, baseIdx: 0 }, // 普骨4+精骨1+领主
  ];

  it("each level normal/elite/lord counts match product table", () => {
    PLAN.forEach((p, i) => {
      const squad = LEVELS[i].squad as any[];
      const normals = squad.filter((m) => !m.elite && m.kind !== "10");
      const elites = squad.filter((m) => m.elite);
      const lords = squad.filter((m) => m.kind === "10" || m.boss);
      expect(normals.length, `lv${i + 1} normals`).toBe(p.normals);
      expect(elites.length, `lv${i + 1} elites`).toBe(p.elites);
      expect(lords.length, `lv${i + 1} lords`).toBe(p.lord ? 1 : 0);
      expect(squad.length).toBe(p.normals + p.elites + (p.lord ? 1 : 0));
    });
  });

  it("normal single hp/str stay on base table; elite = round(hp*1.5), round(str*1.15)", () => {
    PLAN.forEach((p, i) => {
      const base = BASE[p.baseIdx];
      const squad = LEVELS[i].squad as any[];
      for (const m of squad) {
        if (m.kind === "10") {
          expect(m.hp).toBe(120);
          expect(m.str).toBe(14);
          expect(m.elite).toBeFalsy();
          expect(m.boss).toBe(true);
          continue;
        }
        expect(m.name).toBe(base.name);
        expect(m.kind).toBe(base.kind);
        if (m.elite) {
          expect(m.hp).toBe(Math.round(base.hp * 1.5));
          expect(m.str).toBe(Math.round(base.str * 1.15));
        } else {
          expect(m.hp).toBe(base.hp);
          expect(m.str).toBe(base.str);
        }
      }
    });
  });

  it("makeBattleState spawns wave 0 with elite/lord flags", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const st = makeBattleState(LEVELS[i], "out", false);
      const wave0 = LEVELS[i].waves[0];
      expect(st.monsters).toHaveLength(wave0.length);
      wave0.forEach((src: any, j: number) => {
        expect(st.monsters[j].elite).toBe(!!src.elite);
        expect(st.monsters[j].isLord).toBe(src.kind === "10" || !!src.boss);
        expect(st.monsters[j].hp).toBe(src.hp);
        expect(st.monsters[j].str).toBe(src.str);
      });
    }
  });
});
