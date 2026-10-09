// @ts-nocheck
export type Color = "r" | "b" | "g" | "y";
export type ClassId = "out" | "surv" | "ctrl";
export type Cell = { r: number; c: number };
export type MatchGroup = { color: Color; cells: Cell[]; tier: number };


let COLS = 7;
let ROWS = 6;
const COLORS: Color[] = ["r", "b", "g", "y"];
let HERO_MAX = 34;
let SHIELD_CAP = 22;
let BLUE_CAP = 99;
let YELLOW_CAP = 99;
let SLASH_COST = 4;
let SLASH_BASE = 22;
let SLASH_CD = 6;
let ULT_BLUE = 4;
let ULT_YEL = 2;
let ULT_BASE = 40;
let ULT_HEAL = 14;
let ULT_SHIELD = 10;
let ULT_CD = 12;
let GREEN_BASE = 2;
let HERO_STATS = {
  out: { str: 12, int: 4, agi: 8 },
  surv: { str: 8, int: 4, agi: 10 },
  ctrl: { str: 4, int: 12, agi: 6 }
};
let CLASS_NAMES = { out: "输出", surv: "生存", ctrl: "控制" };

function mon(kind, name, hp, str, intel, agi, ranged, elite) {
  return {
    kind: kind,
    name: name,
    hp: hp,
    str: str,
    int: intel,
    agi: agi,
    ranged: !!ranged,
    elite: !!elite,
    boss: kind === "10"
  };
}
function eliteOf(m) {
  return mon(
    m.kind,
    m.name,
    Math.round(m.hp * 1.5),
    Math.round(m.str * 1.15),
    m.int,
    m.agi,
    m.ranged,
    true
  );
}
function nOf(template, count) {
  var arr = [];
  for (var i = 0; i < count; i++) arr.push(Object.assign({}, template));
  return arr;
}
var BONE = mon("01", "游荡骨兵", 24, 6, 2, 4);
var FLAME = mon("02", "蓝焰鬼火", 30, 5, 6, 5);
var RAT = mon("03", "腐疫鼠", 24, 5, 3, 7);
var STATUE = mon("04", "试炼石像", 35, 7, 5, 3, true);
var SKULL = mon("05", "持盾骷髅", 33, 8, 3, 4);
var RUNNER = mon("06", "疾行鬼", 28, 6, 3, 10);
var GUARD = mon("07", "锈蚀守卫", 50, 10, 3, 4);
var GOLEM = mon("08", "咒印魔像", 60, 8, 9, 3, true);
var AXE = mon("09", "重斧魔", 50, 12, 3, 5);
var LORD = mon("10", "地牢领主", 120, 14, 8, 5, true);
let WAVES = [
  [nOf(BONE, 3)],
  [nOf(FLAME, 3)],
  [nOf(RAT, 4)],
  [nOf(STATUE, 3), [eliteOf(STATUE)]],
  [nOf(SKULL, 4), [eliteOf(SKULL)]],
  [nOf(RUNNER, 5), [eliteOf(RUNNER)]],
  [nOf(GUARD, 4), [eliteOf(GUARD)]],
  [nOf(GOLEM, 3), [eliteOf(GOLEM), eliteOf(GOLEM)]],
  [nOf(AXE, 4), [eliteOf(AXE), eliteOf(AXE)]],
  [nOf(BONE, 4), [eliteOf(BONE)], [LORD]]
];
function flatSquad(waves) {
  var out = [];
  for (var w = 0; w < waves.length; w++) out = out.concat(waves[w]);
  return out;
}
let SQUADS = WAVES.map(flatSquad);
function stackFor(n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out.push({
      x: 4.6 + i * 0.48,
      y: 0.08 + (i % 3) * 0.18
    });
  }
  return out;
}
let LEVELS = [
  { name: "游荡骨兵", blue: false, green: false, yellow: false, sword: false, slash: false, ult: false, startHp: 34, teach: "三消只增效。红珠短时抬攻击，本关怪会自己走进来打。" },
  { name: "蓝焰鬼火", blue: true, green: false, yellow: false, sword: false, slash: true, ult: false, startHp: 34, teach: "蓝珠攒技能并临时加智力。裂击已解锁，有冷却。" },
  { name: "腐疫鼠", blue: true, green: true, yellow: false, sword: false, slash: true, ult: false, startHp: 16, teach: "带着伤进来。绿珠当场回血，溢出成护盾。" },
  { name: "试炼石像", blue: true, green: true, yellow: true, sword: false, slash: true, ult: false, startHp: 34, teach: "黄珠按职业增效。石像是远程，站桩出手。" },
  { name: "持盾骷髅", blue: true, green: true, yellow: true, sword: false, slash: true, ult: false, startHp: 34, teach: "攻速由敏捷算。点怪改锁定，默认打最近的。" },
  { name: "疾行鬼", blue: true, green: true, yellow: true, sword: false, slash: true, ult: false, startHp: 34, teach: "疾行鬼敏捷高，走得快、打得勤。" },
  { name: "锈蚀守卫", blue: true, green: true, yellow: true, sword: true, slash: true, ult: false, startHp: 34, teach: "锈剑生效：攻击力额外 +2。" },
  { name: "咒印魔像", blue: true, green: true, yellow: true, sword: true, slash: true, ult: true, startHp: 34, teach: "职业技解锁。输出伤、生存盾、控制减速，都看智力倍率。" },
  { name: "重斧魔", blue: true, green: true, yellow: true, sword: true, slash: true, ult: true, startHp: 34, teach: "力量高，一下很疼。用护盾和控制拖住。" },
  { name: "地牢领主", blue: true, green: true, yellow: true, sword: true, slash: true, ult: true, startHp: 34, teach: "领主远程。入场后满 16 秒力量再 +4，只加一次。" }
];
for (var li = 0; li < LEVELS.length; li++) {
  LEVELS[li].squad = SQUADS[li];
  LEVELS[li].waves = WAVES[li];
}

let FALLBACK = [
  ["r", "b", "r", "b", "g", "y", "g"],
  ["b", "r", "b", "g", "y", "g", "y"],
  ["g", "y", "g", "r", "b", "r", "b"],
  ["y", "g", "y", "b", "r", "b", "r"],
  ["r", "b", "r", "g", "y", "g", "y"],
  ["b", "g", "b", "y", "g", "r", "g"]
];

function blankBoard() {
  var bd = [];
  for (var r = 0; r < ROWS; r++) {
    bd[r] = [];
    for (var c = 0; c < COLS; c++) bd[r][c] = null;
  }
  return bd;
}
function copyBoard(bd) {
  return bd.map(function (row) { return row.slice(); });
}
function swapCells(bd, r1, c1, r2, c2) {
  var t = bd[r1][c1];
  bd[r1][c1] = bd[r2][c2];
  bd[r2][c2] = t;
}
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}
function findMatches(bd) {
  var runs = [];
  var r, c, c2, r2, color, len, cells, k, i;
  for (r = 0; r < ROWS; r++) {
    c = 0;
    while (c < COLS) {
      color = bd[r][c];
      if (!color) { c++; continue; }
      c2 = c + 1;
      while (c2 < COLS && bd[r][c2] === color) c2++;
      len = c2 - c;
      if (len >= 3) {
        cells = [];
        for (k = c; k < c2; k++) cells.push({ r: r, c: k });
        runs.push({ color: color, cells: cells, len: len });
      }
      c = c2;
    }
  }
  for (c = 0; c < COLS; c++) {
    r = 0;
    while (r < ROWS) {
      color = bd[r][c];
      if (!color) { r++; continue; }
      r2 = r + 1;
      while (r2 < ROWS && bd[r2][c] === color) r2++;
      len = r2 - r;
      if (len >= 3) {
        cells = [];
        for (k = r; k < r2; k++) cells.push({ r: k, c: c });
        runs.push({ color: color, cells: cells, len: len });
      }
      r = r2;
    }
  }
  if (!runs.length) return [];
  var parent = [];
  for (i = 0; i < runs.length; i++) parent[i] = i;
  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function unite(a, b) {
    var pa = find(a);
    var pb = find(b);
    if (pa !== pb) parent[pb] = pa;
  }
  var map = {};
  for (i = 0; i < runs.length; i++) {
    for (k = 0; k < runs[i].cells.length; k++) {
      var key = runs[i].cells[k].r + "," + runs[i].cells[k].c;
      if (map[key] !== undefined) unite(i, map[key]);
      else map[key] = i;
    }
  }
  var groups = {};
  for (i = 0; i < runs.length; i++) {
    var root = find(i);
    if (!groups[root]) groups[root] = { color: runs[i].color, cells: {}, tier: 0 };
    groups[root].tier = Math.max(groups[root].tier, runs[i].len);
    for (k = 0; k < runs[i].cells.length; k++) {
      groups[root].cells[runs[i].cells[k].r + "," + runs[i].cells[k].c] = runs[i].cells[k];
    }
  }
  var out = [];
  Object.keys(groups).forEach(function (id) {
    var g = groups[id];
    var list = [];
    Object.keys(g.cells).forEach(function (ck) { list.push(g.cells[ck]); });
    out.push({ color: g.color, cells: list, tier: g.tier });
  });
  return out;
}
function hasMove(bd) {
  var r, c, nr, nc, dirs = [[0, 1], [1, 0]];
  for (r = 0; r < ROWS; r++) {
    for (c = 0; c < COLS; c++) {
      for (var d = 0; d < dirs.length; d++) {
        nr = r + dirs[d][0];
        nc = c + dirs[d][1];
        if (nr >= ROWS || nc >= COLS) continue;
        swapCells(bd, r, c, nr, nc);
        var hit = findMatches(bd).length > 0;
        swapCells(bd, r, c, nr, nc);
        if (hit) return true;
      }
    }
  }
  return false;
}
function fillRandom(bd) {
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!bd[r][c]) bd[r][c] = COLORS[(Math.random() * 4) | 0];
    }
  }
}
function generateBoard() {
  for (var tries = 0; tries < 80; tries++) {
    var bd = blankBoard();
    fillRandom(bd);
    if (!findMatches(bd).length && hasMove(bd)) return bd;
  }
  return copyBoard(FALLBACK);
}
function reshuffleData(bd) {
  for (var tries = 0; tries < 80; tries++) {
    var flat = [];
    var r, c;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) flat.push(bd[r][c]);
    for (var i = flat.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = flat[i]; flat[i] = flat[j]; flat[j] = t;
    }
    var n = 0;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) bd[r][c] = flat[n++];
    if (!findMatches(bd).length && hasMove(bd)) return;
  }
  var fb = copyBoard(FALLBACK);
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) bd[r][c] = fb[r][c];
}
function collapseBoard(bd) {
  for (var c = 0; c < COLS; c++) {
    var stack = [];
    for (var r = ROWS - 1; r >= 0; r--) if (bd[r][c]) stack.push(bd[r][c]);
    for (r = ROWS - 1; r >= 0; r--) bd[r][c] = stack[ROWS - 1 - r] || null;
    for (r = 0; r < ROWS; r++) if (!bd[r][c]) bd[r][c] = COLORS[(Math.random() * 4) | 0];
  }
}
function group(color, n, tier) {
  var cells = [];
  for (var i = 0; i < n; i++) cells.push({ r: 0, c: i });
  return { color: color, cells: cells, tier: tier || n };
}

function baseAtk(str, sword) {
  return 4 + str + (sword ? 2 : 0);
}
function baseInterval(agi) {
  return Math.max(0.6, 1.6 - agi * 0.04);
}
function moveSpeed(agi) {
  return 1.2 + agi * 0.05;
}
function skillMult(intel) {
  return 1 + intel * 0.05;
}
function matchTier(n) {
  if (n >= 5) return 5;
  if (n >= 4) return 4;
  return 3;
}
function heroAtkMult(hero, now) {
  var bonus = 0;
  if (hero.redUntil > now) bonus += (hero.redBonus || 0);
  if (hero.yellowAtkUntil > now) bonus += (hero.yellowAtkBonus || 0);
  return 1 + bonus;
}
function unitInterval(u, now) {
  var base = baseInterval(u.agi);
  if (u.slowUntil > now && u.slowMul > 1) return base * u.slowMul;
  return base;
}
function mobAtk(str) {
  return Math.round(1 + str * 0.4);
}
function unitAttack(u, now, sword) {
  if (u.side !== "hero") return mobAtk(u.str);
  var atk = baseAtk(u.str, !!sword);
  return Math.round(atk * heroAtkMult(u, now));
}

function spawnFromTemplates(templates, idStart, enterOffset) {
  var stack = stackFor(templates.length);
  return templates.map(function (src, i) {
    return {
      id: idStart + i,
      side: "mob",
      kind: src.kind,
      name: src.name,
      hp: src.hp,
      max: src.hp,
      str: src.str,
      int: src.int,
      agi: src.agi,
      range: src.ranged ? 3 : 1,
      elite: !!src.elite,
      x: stack[i].x,
      y: stack[i].y,
      homeX: stack[i].x,
      homeY: stack[i].y,
      enter: enterOffset + i,
      nextAt: 0.4 + i * 0.2,
      slowUntil: 0,
      slowMul: 1,
      lordBoosted: false,
      isLord: src.kind === "10" || !!src.boss
    };
  });
}
function makeBattleState(lv, classId, amulet) {
  var st = HERO_STATS[classId] || HERO_STATS.out;
  var waves = lv.waves || [lv.squad];
  var monsters = spawnFromTemplates(waves[0], 1, 0);
  var hero = {
    id: 0,
    side: "hero",
    kind: "hero",
    name: "英雄",
    hp: lv.startHp,
    max: HERO_MAX,
    str: st.str,
    int: st.int,
    agi: st.agi,
    range: 1,
    x: 2,
    y: 0.2,
    nextAt: 0.3,
    redUntil: 0,
    redBonus: 0,
    yellowAtkUntil: 0,
    yellowAtkBonus: 0,
    tempInt: 0,
    tempIntUntil: 0,
    slowUntil: 0,
    slowMul: 1
  };
  var lock = monsters[0];
  for (var i = 1; i < monsters.length; i++) if (monsters[i].x < lock.x) lock = monsters[i];
  return {
    hero: hero,
    heroMax: HERO_MAX,
    heroHp: lv.startHp,
    shield: 0,
    shieldCap: SHIELD_CAP,
    blue: 0,
    yellow: 0,
    monsters: monsters,
    lockId: lock.id,
    classId: classId,
    amulet: !!amulet,
    sword: !!lv.sword,
    slashReadyAt: 0,
    ultReadyAt: 0,
    lordEnraged: false,
    waves: waves,
    waveIndex: 0,
    nextMonsterId: monsters.length + 1,
    lordEnteredAt: null
  };
}

function livingMobs(st) {
  var live = [];
  for (var i = 0; i < st.monsters.length; i++) if (st.monsters[i].hp > 0) live.push(st.monsters[i]);
  return live;
}
function tryAdvanceWave(st, now) {
  if (livingMobs(st).length) return { advanced: false, done: false, waveIndex: st.waveIndex };
  if (st.waveIndex >= st.waves.length - 1) return { advanced: false, done: true, waveIndex: st.waveIndex };
  st.waveIndex += 1;
  var spawned = spawnFromTemplates(st.waves[st.waveIndex], st.nextMonsterId, st.nextMonsterId - 1);
  st.nextMonsterId += spawned.length;
  for (var i = 0; i < spawned.length; i++) {
    st.monsters.push(spawned[i]);
    if (spawned[i].isLord) st.lordEnteredAt = now;
  }
  var lock = closest(st);
  st.lockId = lock ? lock.id : null;
  return { advanced: true, done: false, waveIndex: st.waveIndex, spawned: spawned };
}

function closest(st) {
  var best = null;
  for (var i = 0; i < st.monsters.length; i++) {
    var m = st.monsters[i];
    if (m.hp <= 0) continue;
    if (!best || m.x < best.x) best = m;
  }
  return best;
}
function allDead(st) {
  for (var i = 0; i < st.monsters.length; i++) if (st.monsters[i].hp > 0) return false;
  if (st.waves && st.waveIndex < st.waves.length - 1) return false;
  return true;
}
function retarget(st) {
  var lock = null;
  for (var i = 0; i < st.monsters.length; i++) {
    if (st.monsters[i].id === st.lockId && st.monsters[i].hp > 0) lock = st.monsters[i];
  }
  if (!lock) {
    var front = closest(st);
    st.lockId = front ? front.id : null;
  }
}
function getLock(st) {
  retarget(st);
  for (var i = 0; i < st.monsters.length; i++) {
    if (st.monsters[i].id === st.lockId && st.monsters[i].hp > 0) return st.monsters[i];
  }
  return null;
}
function dist(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function inRange(attacker, target) {
  return dist(attacker, target) <= attacker.range + 0.05;
}
function nearestOther(st, from) {
  var best = null;
  var bestD = 0;
  for (var i = 0; i < st.monsters.length; i++) {
    var m = st.monsters[i];
    if (m.hp <= 0 || m.id === from.id) continue;
    var d = dist(m, from);
    if (!best || d < bestD || (d === bestD && m.enter < best.enter)) {
      best = m;
      bestD = d;
    }
  }
  return best;
}
function dealDamage(st, targetId, amount, allowOverflow) {
  var target = null;
  for (var i = 0; i < st.monsters.length; i++) {
    if (st.monsters[i].id === targetId && st.monsters[i].hp > 0) target = st.monsters[i];
  }
  if (!target) target = closest(st);
  if (!target || amount <= 0) return [];
  var left = amount;
  var hits = [];
  var guard = 0;
  while (target && left > 0 && guard < 8) {
    guard++;
    var dmg = Math.min(target.hp, left);
    target.hp -= dmg;
    left -= dmg;
    var spot = target;
    hits.push({ id: spot.id, name: spot.name, dmg: dmg, dead: spot.hp <= 0, overflow: hits.length > 0 });
    if (spot.hp > 0) break;
    if (!allowOverflow) break;
    target = nearestOther(st, spot);
  }
  retarget(st);
  return hits;
}
function strikeHero(st, amount) {
  var left = amount;
  var absorbed = Math.min(st.shield, left);
  st.shield -= absorbed;
  left -= absorbed;
  var hp = Math.min(st.hero.hp, left);
  st.hero.hp -= hp;
  st.heroHp = st.hero.hp;
  return { miss: false, absorbed: absorbed, hp: hp };
}
function applySlow(mon, mul, seconds, now) {
  if (!mon) return null;
  var until = now + seconds;
  var remain = Math.max(0, mon.slowUntil - now);
  var dur = Math.min(4, Math.max(remain, seconds));
  mon.slowUntil = now + dur;
  mon.slowMul = Math.max(mon.slowMul || 1, mul);
  if (mon.slowUntil <= now) mon.slowMul = 1;
  return mon;
}
function clearExpired(st, now) {
  var h = st.hero;
  if (h.tempIntUntil <= now) h.tempInt = 0;
  for (var i = 0; i < st.monsters.length; i++) {
    var m = st.monsters[i];
    if (m.slowUntil <= now) m.slowMul = 1;
  }
}
function maybeEnrageLord(st, now) {
  if (st.lordEnraged) return false;
  var entered = st.lordEnteredAt;
  if (entered == null) return false;
  if (now - entered < 16) return false;
  for (var i = 0; i < st.monsters.length; i++) {
    var m = st.monsters[i];
    if (m.isLord && m.hp > 0 && !m.lordBoosted) {
      m.str += 4;
      m.lordBoosted = true;
      st.lordEnraged = true;
      return true;
    }
  }
  return false;
}
function effectiveInt(st, now) {
  var h = st.hero;
  var extra = h.tempIntUntil > now ? h.tempInt : 0;
  return h.int + extra;
}
function makeCtxFrom(lv, classId, amulet) {
  return {
    sword: !!lv.sword,
    blue: !!lv.blue,
    green: !!lv.green,
    yellow: !!lv.yellow,
    slash: !!lv.slash,
    ult: !!lv.ult,
    amulet: !!amulet,
    classId: classId
  };
}
function applyGreen(st, n, amulet, perOverride) {
  var per = perOverride != null ? perOverride : (GREEN_BASE + (amulet ? 1 : 0));
  var points = per * n;
  var healed = 0;
  var need = Math.max(0, st.hero.max - st.hero.hp);
  healed = Math.min(need, points);
  st.hero.hp += healed;
  st.heroHp = st.hero.hp;
  points -= healed;
  var add = Math.max(0, Math.min(points, st.shieldCap - st.shield));
  st.shield += add;
  return { healed: healed, shield: add };
}
function resolveGroup(group, st, ctx, now) {
  var n = group.cells.length;
  var tier = matchTier(n);
  var tierLabel = tier >= 5 ? "五连" : (tier === 4 ? "四连" : "三连");
  if (group.color === "r") {
    var redBonus = tier >= 5 ? 0.8 : (tier === 4 ? 0.6 : 0.4);
    var redDur = tier >= 5 ? 5 : 4;
    st.hero.redBonus = redBonus;
    st.hero.redUntil = now + redDur;
    return { text: "红珠×" + n + " " + tierLabel + " 攻击 +" + Math.round(redBonus * 100) + "% " + redDur + "秒", tier: tier, color: "r" };
  }
  if (group.color === "b") {
    if (!ctx.blue) return { text: "蓝珠×" + n + "（本关不结算）", tier: tier, color: "b" };
    var tint = tier >= 5 ? 8 : (tier === 4 ? 6 : 4);
    var bDur = tier >= 5 ? 5 : 4;
    st.blue = Math.min(BLUE_CAP, st.blue + n);
    st.hero.tempInt = tint;
    st.hero.tempIntUntil = now + bDur;
    return { text: "蓝珠×" + n + " " + tierLabel + " 蓝+" + n + "，智力临时+" + tint, tier: tier, color: "b" };
  }
  if (group.color === "g") {
    if (!ctx.green) return { text: "绿珠×" + n + "（本关不结算）", tier: tier, color: "g" };
    var gPer = tier >= 5 ? (ctx.amulet ? 5 : 4) : (tier === 4 ? (ctx.amulet ? 4 : 3) : (ctx.amulet ? 3 : 2));
    var g = applyGreen(st, n, ctx.amulet, gPer);
    return { text: "绿珠×" + n + " " + tierLabel + " 治疗 " + g.healed + "，护盾 +" + g.shield, tier: tier, color: "g" };
  }
  if (group.color === "y") {
    if (!ctx.yellow) return { text: "黄珠×" + n + "（本关不结算）", tier: tier, color: "y" };
    st.yellow = Math.min(YELLOW_CAP, st.yellow + n);
    if (ctx.classId === "out") {
      var yBonus = tier >= 5 ? 0.6 : (tier === 4 ? 0.45 : 0.3);
      var yDur = tier >= 5 ? 5 : 4;
      st.hero.yellowAtkBonus = yBonus;
      st.hero.yellowAtkUntil = now + yDur;
      return { text: "黄珠×" + n + " " + tierLabel + " 黄+" + n + "，攻击再+" + Math.round(yBonus * 100) + "%", tier: tier, color: "y" };
    }
    if (ctx.classId === "surv") {
      var perSh = tier >= 5 ? 8 : (tier === 4 ? 6 : 4);
      var add = Math.max(0, Math.min(perSh * n, st.shieldCap - st.shield));
      st.shield += add;
      return { text: "黄珠×" + n + " " + tierLabel + " 黄+" + n + "，护盾 +" + add, tier: tier, color: "y" };
    }
    var slowMul = tier >= 5 ? 2 : (tier === 4 ? 1.75 : 1.5);
    var slowSec = tier >= 5 ? 4 : (tier === 4 ? 3.5 : 3);
    var lock = getLock(st);
    applySlow(lock, slowMul, slowSec, now);
    return { text: "黄珠×" + n + " " + tierLabel + " 黄+" + n + "，目标攻速变慢", tier: tier, color: "y" };
  }
  return { text: "", tier: tier, color: group.color };
}
function canCast(kind, st, ctx, now) {
  if (kind === "slash") {
    return !!ctx.slash && st.blue >= SLASH_COST && now >= st.slashReadyAt;
  }
  return !!ctx.ult && st.blue >= ULT_BLUE && st.yellow >= ULT_YEL && now >= st.ultReadyAt;
}
function castSkill(kind, st, ctx, now) {
  if (!canCast(kind, st, ctx, now)) return null;
  var mult = skillMult(effectiveInt(st, now));
  if (kind === "slash") {
    st.blue -= SLASH_COST;
    st.slashReadyAt = now + SLASH_CD;
    var dmg = Math.round(SLASH_BASE * mult);
    return { text: "裂击造成 " + dmg + " 伤害", attack: dmg, slow: null };
  }
  st.blue -= ULT_BLUE;
  st.yellow -= ULT_YEL;
  st.ultReadyAt = now + ULT_CD;
  if (ctx.classId === "out") {
    var ud = Math.round(ULT_BASE * mult);
    return { text: "职业技造成 " + ud + " 伤害", attack: ud, slow: null };
  }
  if (ctx.classId === "surv") {
    var healed = Math.min(ULT_HEAL, Math.max(0, st.hero.max - st.hero.hp));
    st.hero.hp += healed;
    st.heroHp = st.hero.hp;
    var sh = Math.max(0, Math.min(ULT_SHIELD, st.shieldCap - st.shield));
    st.shield += sh;
    return { text: "职业技治疗 " + healed + "，护盾 +" + sh, attack: 0, slow: null };
  }
  return { text: "职业技大幅减速 4 秒", attack: 0, slow: { mul: 2, sec: 4 } };
}
function moveToward(u, target, dt) {
  var dx = target.x - u.x;
  var dy = target.y - u.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) return false;
  var step = moveSpeed(u.agi) * dt;
  if (step >= d) {
    u.x = target.x;
    u.y = target.y;
    return true;
  }
  u.x += (dx / d) * step;
  u.y += (dy / d) * step;
  return false;
}


export {
  COLS,
  ROWS,
  COLORS,
  HERO_MAX,
  SHIELD_CAP,
  BLUE_CAP,
  YELLOW_CAP,
  HERO_STATS,
  CLASS_NAMES,
  LEVELS,
  blankBoard,
  copyBoard,
  swapCells,
  isAdjacent,
  findMatches,
  hasMove,
  generateBoard,
  reshuffleData,
  collapseBoard,
  group,
  makeBattleState,
  makeCtxFrom,
  resolveGroup,
  spawnFromTemplates,
  WAVES,
  livingMobs,
  tryAdvanceWave,
  matchTier,
  canCast,
  castSkill,
  dealDamage,
  strikeHero,
  allDead,
  closest,
  getLock,
  retarget,
  inRange,
  dist,
  unitAttack,
  mobAtk,
  unitInterval,
  moveSpeed,
  skillMult,
  effectiveInt,
  applySlow,
  clearExpired,
  maybeEnrageLord,
  moveToward,
  baseAtk,
  baseInterval
};
