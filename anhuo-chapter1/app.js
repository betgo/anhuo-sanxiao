(function () {
  "use strict";
  var A = window.Anhuo;
  var ART = "../anhuo-art/";
  var FRAMES = "../anhuo-art/frames/";
  var CELL = 36;
  var SWAP_MS = 140;
  var POP_MS = 120;
  var FALL_MS = 160;
  var SAVE_KEY = "anhuo-chapter1";
  var CLASSES = {
    out: { name: "输出", blurb: "力量高。黄珠再抬攻击 30%，4 秒。", ult: "伤害 40×技能倍率" },
    surv: { name: "生存", blurb: "力量+敏捷。黄珠加护盾。", ult: "治疗 14，护盾 +10" },
    ctrl: { name: "控制", blurb: "智力高。黄珠让目标攻速变慢。", ult: "目标攻速间隔 ×2，共 4 秒" }
  };
  var HINTS = [
    "红珠抬攻击", "裂击解锁", "绿珠回血", "黄珠职业增效",
    "点怪锁定", "疾行鬼很快", "锈剑 +2 攻击", "职业技解锁",
    "力量很高", "领主 16 秒强化"
  ];

  var save = loadSave();
  var levelIndex = 0;
  var battle = null;
  var board = null;
  var nodes = null;
  var phase = "idle";
  var busy = false;
  var sel = null;
  var fightTimer = 0;
  var fightGen = 0;
  var lastTick = 0;

  var titleProgress, clearCount, unlockEl, levelList;
  var prepKicker, prepTitle, prepMeta, prepTeach, prepClass, prepSword, prepRules, prepEnemy, amuletEl;
  var battleKicker, battleTeach, heroCard, heroPortrait, heroClass, heroHp, heroBar, shieldText, shieldBar;
  var resBlue, resYellow, resShield, resBuff, gearHud, lastLine, logEl, boardEl;
  var btnSlash, btnUlt, slashNote, ultNote, ultDesc, skillHintEl;
  var resultTitle, resultDetail, btnNext, btnRetry;

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.cleared) && o.cleared.length === 10) {
          return {
            cleared: o.cleared.map(Boolean),
            unlockAll: !!o.unlockAll,
            classId: CLASSES[o.classId] ? o.classId : "out",
            amulet: !!o.amulet
          };
        }
      }
    } catch (e) {}
    return {
      cleared: [false, false, false, false, false, false, false, false, false, false],
      unlockAll: false,
      classId: "out",
      amulet: false
    };
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("show"); }, 1400);
  }
  function pushLog(text) {
    if (lastLine) lastLine.textContent = text;
    if (!logEl) return;
    var row = document.createElement("div");
    row.textContent = text;
    logEl.insertBefore(row, logEl.firstChild);
    while (logEl.children.length > 6) logEl.removeChild(logEl.lastChild);
  }
  function setBar(el, cur, max) {
    var p = max <= 0 ? 0 : Math.max(0, Math.min(100, (cur / max) * 100));
    el.style.width = p + "%";
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }
  function enemySrc(i) { return ART + "enemy-" + String(i + 1).padStart(2, "0") + ".png"; }
  function heroSrc(id) { return ART + "hero-" + id + ".png"; }
  function px(x) { return Math.round(x * CELL); }
  function makeCtx() {
    return A.makeCtxFrom(A.LEVELS[levelIndex], save.classId, save.amulet);
  }
  function elapsed() {
    if (!battle || !battle.t0) return 0;
    return (performance.now() - battle.t0) / 1000;
  }
  function levelMeta(lv) {
    return lv.squad.map(function (m) {
      return m.name + " " + m.hp + " 力" + m.str + "智" + m.int + "敏" + m.agi + (m.ranged ? " 远程" : " 近战");
    }).join(" · ");
  }
  function gearText(lv) {
    var t = lv.sword ? "锈剑 攻击+2" : "锈剑（未生效）";
    if (save.amulet && lv.green) t += "  ·  护符 每颗 3 点";
    else if (save.amulet) t += "  ·  护符（本关绿珠不结算）";
    else t += "  ·  未带护符";
    return t;
  }
  function skillHintText(lv) {
    if (!lv.slash) return "裂击从第 2 关解锁。三消只增效，不打断普攻。";
    if (!lv.ult) return "职业技从第 8 关解锁。技能有冷却，不绑三消。";
    return "技能随时可放。普攻进距离就打，打完不退回。";
  }
  function showScreen(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.add("hidden");
    document.getElementById("screen-" + name).classList.remove("hidden");
    if (name === "title") {
      var n = save.cleared.filter(function (x) { return x; }).length;
      titleProgress.textContent = "第一章进度 " + n + " / 10";
    }
    if (name === "select") renderSelect();
    if (name === "prep") renderPrep();
  }
  function renderSelect() {
    clearCount.textContent = "已通关 " + save.cleared.filter(Boolean).length + " / 10";
    unlockEl.checked = !!save.unlockAll;
    levelList.innerHTML = "";
    for (var i = 0; i < A.LEVELS.length; i++) {
      var lv = A.LEVELS[i];
      var unlocked = save.unlockAll || i === 0 || save.cleared[i - 1];
      var card = document.createElement("button");
      card.type = "button";
      card.className = "level-card" + (save.cleared[i] ? " cleared" : "") + (unlocked ? "" : " locked");
      card.disabled = !unlocked;
      card.innerHTML = "<img src=\"" + enemySrc(i) + "\" alt=\"\"><div><b>第 " + (i + 1) + " 关 · " + lv.name + "</b><small>" + HINTS[i] + "</small></div>";
      (function (idx) {
        card.addEventListener("click", function () {
          if (!save.unlockAll && idx > 0 && !save.cleared[idx - 1]) return;
          levelIndex = idx;
          showScreen("prep");
        });
      })(i);
      levelList.appendChild(card);
    }
  }
  function renderPrep() {
    var lv = A.LEVELS[levelIndex];
    prepKicker.textContent = "第 " + (levelIndex + 1) + " 关";
    prepTitle.textContent = lv.name;
    prepMeta.textContent = levelMeta(lv);
    prepTeach.textContent = lv.teach;
    prepEnemy.src = enemySrc(levelIndex);
    prepEnemy.alt = lv.name;
    prepSword.textContent = lv.sword ? "本关生效：攻击力额外 +2。" : "已装备。第 7 关起攻击力 +2，本关还没生效。";
    amuletEl.checked = !!save.amulet;
    var buttons = document.querySelectorAll(".class-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle("on", buttons[i].dataset.class === save.classId);
    }
    var st = A.HERO_STATS[save.classId];
    prepClass.textContent = CLASSES[save.classId].blurb + " 力" + st.str + " 智" + st.int + " 敏" + st.agi + "。职业技（第8关）：" + CLASSES[save.classId].ult + "。";
    prepRules.textContent = "实时战斗：进距离就打，打完不退回。三消只增效。失败可重试，不掉装备。";
  }

  function frameSrc(kind, poseName, n) {
    if (kind === "hero") return FRAMES + "hero-" + poseName + "-" + n + ".png";
    return FRAMES + "enemy-" + kind + "-" + poseName + "-" + n + ".png";
  }
  function pose(el, kind, poseName) {
    if (!el) return;
    var img = el.querySelector("img");
    if (!img) return;
    if (el.dataset.pose === poseName && el.dataset.kind === kind) return;
    var count = poseName === "down" ? 1 : (poseName === "idle" ? 2 : (poseName === "attack" ? 3 : 4));
    var i = 0;
    el.dataset.pose = poseName;
    el.dataset.kind = kind;
    img.src = frameSrc(kind, poseName, 0);
    if (el._poseTimer) clearInterval(el._poseTimer);
    if (count < 2) return;
    el._poseTimer = setInterval(function () {
      if (el.dataset.pose !== poseName) {
        clearInterval(el._poseTimer);
        return;
      }
      i = (i + 1) % count;
      img.src = frameSrc(kind, poseName, i);
    }, poseName === "attack" ? 90 : 160);
  }
  function monsterEl(id) {
    return document.querySelector('#monsters .actor[data-id="' + id + '"]');
  }
  function floatDmg(id, text) {
    var el = id === 0 ? document.getElementById("hero-actor") : monsterEl(id);
    if (!el) return;
    var s = document.createElement("b");
    s.className = "floater";
    s.textContent = text;
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 700);
  }
  function placeActor(el, u) {
    if (!el) return;
    el.style.left = px(u.x) + "px";
    el.style.bottom = Math.round(8 + u.y * 18) + "px";
    el.style.zIndex = String(400 - Math.round(u.x * 10));
  }
  function refreshActors() {
    if (!battle) return;
    var now = elapsed();
    var hero = document.getElementById("hero-actor");
    placeActor(hero, battle.hero);
    for (var i = 0; i < battle.monsters.length; i++) {
      var m = battle.monsters[i];
      var el = monsterEl(m.id);
      if (!el) continue;
      placeActor(el, m);
      el.classList.toggle("lock", m.id === battle.lockId && m.hp > 0);
      el.classList.toggle("dead", m.hp <= 0);
      el.classList.toggle("frozen", m.hp > 0 && m.slowUntil > now);
      var hp = el.querySelector(".hpmini");
      if (hp) hp.textContent = Math.max(0, m.hp) + "/" + m.max;
      if (m.hp <= 0) {
        if (el.dataset.pose !== "down") pose(el, m.kind, "down");
      }
    }
  }
  function buildStage() {
    var row = document.getElementById("monsters");
    row.innerHTML = "";
    var hero = document.getElementById("hero-actor");
    pose(hero, "hero", "idle");
    placeActor(hero, battle.hero);
    battle.monsters.forEach(function (m) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "actor mob";
      d.dataset.id = String(m.id);
      d.innerHTML = "<img alt=\"\"><b class=\"nm\"></b><i class=\"hpmini\"></i>";
      d.querySelector("img").alt = m.name;
      d.querySelector(".nm").textContent = m.name;
      row.appendChild(d);
      m.x = 11 + m.enter * 0.4;
      placeActor(d, m);
      pose(d, m.kind, "walk");
      d.addEventListener("click", function () {
        if (phase === "over" || m.hp <= 0) return;
        battle.lockId = m.id;
        updateHUD();
      });
    });
  }
  function enterMonsters() {
    var order = battle.monsters.slice().sort(function (a, b) { return a.homeX - b.homeX; });
    var i = 0;
    function step() {
      if (phase === "over" || i >= order.length) return;
      var m = order[i++];
      m.x = m.homeX;
      m.y = m.homeY;
      var el = monsterEl(m.id);
      if (el) pose(el, m.kind, "idle");
      setTimeout(step, 160);
    }
    step();
  }

  function updateHUD() {
    if (!battle) return;
    var lv = A.LEVELS[levelIndex];
    var ctx = makeCtx();
    var now = elapsed();
    battleKicker.textContent = "第 " + (levelIndex + 1) + " / 10 关 · " + lv.name;
    battleTeach.textContent = lv.teach;
    if (heroPortrait) {
      heroPortrait.src = heroSrc(save.classId);
      heroPortrait.alt = CLASSES[save.classId].name;
    }
    refreshActors();
    var h = battle.hero;
    heroClass.textContent = "英雄 · " + CLASSES[save.classId].name + " · 力" + h.str + " 智" + A.effectiveInt(battle, now) + " 敏" + h.agi;
    heroHp.textContent = h.hp + " / " + h.max;
    setBar(heroBar, h.hp, h.max);
    shieldText.textContent = "护盾 " + battle.shield + " / " + battle.shieldCap;
    setBar(shieldBar, battle.shield, battle.shieldCap);
    resBlue.textContent = "蓝 " + battle.blue;
    resYellow.textContent = "黄 " + battle.yellow;
    resShield.textContent = "护盾 " + battle.shield;
    var buffs = [];
    if (h.redUntil > now) buffs.push("红攻+" + Math.ceil(h.redUntil - now) + "s");
    if (h.yellowAtkUntil > now) buffs.push("黄攻+" + Math.ceil(h.yellowAtkUntil - now) + "s");
    if (h.tempIntUntil > now) buffs.push("智+" + Math.ceil(h.tempIntUntil - now) + "s");
    resBuff.textContent = buffs.length ? buffs.join(" ") : "增效 —";
    gearHud.textContent = gearText(lv);
    var canAct = phase === "play" && !busy;
    btnSlash.disabled = !(canAct && A.canCast("slash", battle, ctx, now));
    btnUlt.disabled = !(canAct && A.canCast("ult", battle, ctx, now));
    var slashLeft = Math.max(0, Math.ceil(battle.slashReadyAt - now));
    var ultLeft = Math.max(0, Math.ceil(battle.ultReadyAt - now));
    slashNote.textContent = lv.slash ? ("蓝×4 · CD " + (slashLeft || 6) + "s") : "第2关解锁";
    ultNote.textContent = lv.ult ? ("蓝×4 黄×2 · CD " + (ultLeft || 12) + "s") : "第8关解锁";
    ultDesc.textContent = CLASSES[save.classId].ult;
    skillHintEl.textContent = skillHintText(lv);
  }

  function makeBead(color) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "bead " + color;
    el.dataset.color = color;
    var names = { r: "红", b: "蓝", g: "绿", y: "黄" };
    el.setAttribute("aria-label", names[color] || color);
    el.addEventListener("click", onBeadClick);
    return el;
  }
  function pos(r, c) {
    return "translate(" + (c * 44) + "px," + (r * 44) + "px)";
  }
  function buildNodes() {
    boardEl.innerHTML = "";
    nodes = [];
    for (var r = 0; r < A.ROWS; r++) {
      nodes[r] = [];
      for (var c = 0; c < A.COLS; c++) {
        var el = makeBead(board[r][c]);
        el.dataset.r = String(r);
        el.dataset.c = String(c);
        el.style.transform = pos(r, c);
        boardEl.appendChild(el);
        nodes[r][c] = el;
      }
    }
  }
  function syncBoardView() {
    for (var r = 0; r < A.ROWS; r++) {
      for (var c = 0; c < A.COLS; c++) {
        var el = nodes[r][c];
        el.className = "bead " + board[r][c];
        el.dataset.color = board[r][c];
        el.style.transform = pos(r, c);
        el.style.opacity = "1";
        el.classList.remove("sel", "adj");
      }
    }
  }
  function clearSel() {
    if (!sel) return;
    var el = nodes[sel.r][sel.c];
    if (el) el.classList.remove("sel", "adj");
    for (var r = 0; r < A.ROWS; r++) for (var c = 0; c < A.COLS; c++) nodes[r][c].classList.remove("adj");
    sel = null;
  }
  function markAdj(r, c) {
    var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (var i = 0; i < dirs.length; i++) {
      var nr = r + dirs[i][0];
      var nc = c + dirs[i][1];
      if (nr < 0 || nc < 0 || nr >= A.ROWS || nc >= A.COLS) continue;
      nodes[nr][nc].classList.add("adj");
    }
  }
  async function onBeadClick(ev) {
    if (phase !== "play" || busy) return;
    var el = ev.currentTarget;
    var r = +el.dataset.r;
    var c = +el.dataset.c;
    if (!sel) {
      sel = { r: r, c: c };
      el.classList.add("sel");
      markAdj(r, c);
      return;
    }
    if (sel.r === r && sel.c === c) {
      clearSel();
      return;
    }
    if (!A.isAdjacent(sel.r, sel.c, r, c)) {
      clearSel();
      sel = { r: r, c: c };
      el.classList.add("sel");
      markAdj(r, c);
      return;
    }
    var r1 = sel.r, c1 = sel.c, r2 = r, c2 = c;
    clearSel();
    await trySwap(r1, c1, r2, c2);
  }
  function boardHasMatchAt(r1, c1, r2, c2) {
    var groups = A.findMatches(board);
    for (var i = 0; i < groups.length; i++) {
      for (var k = 0; k < groups[i].cells.length; k++) {
        var cell = groups[i].cells[k];
        if ((cell.r === r1 && cell.c === c1) || (cell.r === r2 && cell.c === c2)) return true;
      }
    }
    return groups.length > 0;
  }
  async function trySwap(r1, c1, r2, c2) {
    busy = true;
    var a = nodes[r1][c1];
    var b = nodes[r2][c2];
    a.style.transition = "transform " + SWAP_MS + "ms linear";
    b.style.transition = "transform " + SWAP_MS + "ms linear";
    a.style.transform = pos(r2, c2);
    b.style.transform = pos(r1, c1);
    await sleep(SWAP_MS + 16);
    A.swapCells(board, r1, c1, r2, c2);
    nodes[r1][c1] = b;
    nodes[r2][c2] = a;
    b.dataset.r = String(r1);
    b.dataset.c = String(c1);
    a.dataset.r = String(r2);
    a.dataset.c = String(c2);
    if (!boardHasMatchAt(r1, c1, r2, c2)) {
      a.style.transform = pos(r1, c1);
      b.style.transform = pos(r2, c2);
      await sleep(SWAP_MS + 16);
      A.swapCells(board, r1, c1, r2, c2);
      nodes[r1][c1] = a;
      nodes[r2][c2] = b;
      a.dataset.r = String(r1);
      a.dataset.c = String(c1);
      b.dataset.r = String(r2);
      b.dataset.c = String(c2);
      toast("不能消除，已退回");
      pushLog("无效交换已退回");
      busy = false;
      updateHUD();
      return;
    }
    await resolveCascades();
    busy = false;
    updateHUD();
  }
  async function popGroups(groups) {
    var seen = {};
    for (var i = 0; i < groups.length; i++) {
      var cells = groups[i].cells;
      for (var k = 0; k < cells.length; k++) {
        var key = cells[k].r + "," + cells[k].c;
        if (seen[key]) continue;
        seen[key] = true;
        var el = nodes[cells[k].r][cells[k].c];
        if (el) {
          el.style.transition = "opacity " + POP_MS + "ms linear, transform " + POP_MS + "ms linear";
          el.style.opacity = "0";
          el.style.transform = pos(cells[k].r, cells[k].c) + " scale(0.4)";
        }
      }
    }
    await sleep(POP_MS + 20);
  }
  function removeMatched(groups) {
    for (var i = 0; i < groups.length; i++) {
      for (var k = 0; k < groups[i].cells.length; k++) {
        var cell = groups[i].cells[k];
        board[cell.r][cell.c] = null;
      }
    }
  }
  function planColumn(col) {
    var kept = [];
    var r;
    for (r = A.ROWS - 1; r >= 0; r--) if (board[r][col] !== null) kept.push({ color: board[r][col], from: r });
    var plan = [];
    for (r = A.ROWS - 1; r >= 0; r--) {
      if (kept.length) plan[r] = kept.shift();
      else plan[r] = { color: A.COLORS[(Math.random() * 4) | 0], from: r - A.ROWS };
    }
    return plan;
  }
  async function collapseRefill() {
    var next = [];
    var r, c;
    for (r = 0; r < A.ROWS; r++) next[r] = [];
    for (c = 0; c < A.COLS; c++) {
      var plan = planColumn(c);
      for (r = 0; r < A.ROWS; r++) {
        var item = plan[r];
        board[r][c] = item.color;
        if (item.from >= 0) next[r][c] = nodes[item.from][c];
        else {
          var el = makeBead(item.color);
          el.style.transition = "none";
          el.style.transform = pos(item.from, c);
          boardEl.appendChild(el);
          next[r][c] = el;
        }
      }
    }
    nodes = next;
    await nextFrame();
    await nextFrame();
    for (r = 0; r < A.ROWS; r++) {
      for (c = 0; c < A.COLS; c++) {
        var bead = nodes[r][c];
        bead.dataset.r = String(r);
        bead.dataset.c = String(c);
        bead.style.opacity = "1";
        bead.classList.remove("sel", "adj");
        bead.style.transition = "transform " + FALL_MS + "ms linear, opacity " + POP_MS + "ms linear";
        bead.style.transform = pos(r, c);
      }
    }
    await sleep(FALL_MS + 20);
  }
  async function resolveCascades() {
    var ctx = makeCtx();
    var steps = 0;
    while (steps < 40) {
      if (phase === "over") return;
      var groups = A.findMatches(board);
      if (!groups.length) break;
      steps++;
      var now = elapsed();
      var logs = [];
      for (var i = 0; i < groups.length; i++) {
        logs.push(A.resolveGroup(groups[i], battle, ctx, now));
      }
      pushLog((steps > 1 ? "连锁 " : "") + logs.join("；"));
      updateHUD();
      await popGroups(groups);
      removeMatched(groups);
      await collapseRefill();
    }
    if (phase === "over") return;
    if (!A.hasMove(board) || A.findMatches(board).length) {
      pushLog("没有可走的步，棋盘已重排");
      toast("棋盘已重排");
      A.reshuffleData(board);
      syncBoardView();
      await sleep(160);
    }
  }

  function doHeroAttack(now) {
    var target = A.getLock(battle);
    if (!target) return;
    var hero = battle.hero;
    var heroEl = document.getElementById("hero-actor");
    pose(heroEl, "hero", "attack");
    var dmg = A.unitAttack(hero, now, battle.sword);
    var hits = A.dealDamage(battle, target.id, dmg);
    var bits = [];
    for (var i = 0; i < hits.length; i++) {
      bits.push((hits[i].dead ? "击倒 " : "打中 ") + hits[i].name + " " + hits[i].dmg);
      floatDmg(hits[i].id, (hits[i].overflow ? "溢出 " : "-") + hits[i].dmg);
    }
    if (bits.length) pushLog("普攻 " + bits.join("，"));
    hero.nextAt = now + A.unitInterval(hero, now);
    setTimeout(function () {
      if (phase === "over") return;
      var el = document.getElementById("hero-actor");
      if (el && el.dataset.pose === "attack") pose(el, "hero", "idle");
    }, 280);
    if (A.allDead(battle)) finish(true, "敌人被击败");
  }
  function doMobAttack(m, now) {
    var el = monsterEl(m.id);
    pose(el, m.kind, "attack");
    var dmg = A.unitAttack(m, now, false);
    var hit = A.strikeHero(battle, dmg);
    var line = m.name + " 打中 " + dmg;
    if (hit.absorbed) line += "，护盾抵消 " + hit.absorbed;
    if (hit.hp) line += "，生命 -" + hit.hp;
    pushLog(line);
    floatDmg(0, "-" + dmg);
    flash(heroCard);
    m.nextAt = now + A.unitInterval(m, now);
    setTimeout(function () {
      if (phase === "over" || m.hp <= 0) return;
      var e = monsterEl(m.id);
      if (e && e.dataset.pose === "attack") pose(e, m.kind, "idle");
    }, 280);
    if (battle.hero.hp <= 0) finish(false, "你倒下了");
  }
  function tickCombat(dt) {
    if (!battle || phase === "over") return;
    var now = elapsed();
    A.clearExpired(battle, now);
    if (A.maybeEnrageLord(battle, now)) pushLog("地牢领主力量 +4");
    var hero = battle.hero;
    var heroEl = document.getElementById("hero-actor");
    var target = A.getLock(battle);
    if (target) {
      if (A.inRange(hero, target)) {
        if (heroEl && heroEl.dataset.pose === "walk") pose(heroEl, "hero", "idle");
        if (now >= hero.nextAt) doHeroAttack(now);
      } else {
        pose(heroEl, "hero", "walk");
        A.moveToward(hero, target, dt);
      }
    }
    for (var i = 0; i < battle.monsters.length; i++) {
      var m = battle.monsters[i];
      if (m.hp <= 0) continue;
      var el = monsterEl(m.id);
      if (A.inRange(m, hero)) {
        if (el && el.dataset.pose === "walk") pose(el, m.kind, "idle");
        if (now >= m.nextAt) doMobAttack(m, now);
      } else {
        pose(el, m.kind, "walk");
        A.moveToward(m, hero, dt);
      }
    }
    refreshActors();
    updateHUD();
  }
  function loop(ts) {
    if (phase === "over") return;
    if (!lastTick) lastTick = ts;
    var dt = Math.min(0.05, (ts - lastTick) / 1000);
    lastTick = ts;
    tickCombat(dt);
    fightTimer = requestAnimationFrame(loop);
  }
  function stopFight() {
    if (fightTimer) cancelAnimationFrame(fightTimer);
    fightTimer = 0;
    lastTick = 0;
  }
  function onCast(kind) {
    if (phase !== "play" || busy) return;
    var ctx = makeCtx();
    var now = elapsed();
    if (!A.canCast(kind, battle, ctx, now)) return;
    var result = A.castSkill(kind, battle, ctx, now);
    pushLog(result.text);
    if (result.slow) {
      var lock = A.getLock(battle);
      A.applySlow(lock, result.slow.mul, result.slow.sec, now);
    }
    if (result.attack) {
      var t = A.getLock(battle);
      if (t) {
        var hits = A.dealDamage(battle, t.id, result.attack, kind === "slash");
        for (var i = 0; i < hits.length; i++) floatDmg(hits[i].id, (hits[i].overflow ? "溢出 " : "-") + hits[i].dmg);
        if (A.allDead(battle)) {
          updateHUD();
          finish(true, "敌人被击败");
          return;
        }
      }
    } else flash(heroCard);
    updateHUD();
  }
  function livingCount() {
    var n = 0;
    if (!battle) return 0;
    for (var i = 0; i < battle.monsters.length; i++) if (battle.monsters[i].hp > 0) n++;
    return n;
  }
  function finish(win, reason) {
    if (phase === "over") return;
    phase = "over";
    busy = true;
    stopFight();
    var lv = A.LEVELS[levelIndex];
    if (win) {
      save.cleared[levelIndex] = true;
      persist();
    }
    resultTitle.textContent = win ? "胜利" : "失败";
    if (win) resultDetail.textContent = "全部击倒。剩余生命 " + Math.max(0, battle.hero.hp) + "。";
    else resultDetail.textContent = reason + "。还剩 " + livingCount() + " 只。装备还在。";
    btnNext.classList.toggle("hidden", !(win && levelIndex < A.LEVELS.length - 1));
    btnRetry.textContent = win ? "再打一次" : "重试";
    showScreen("result");
  }
  function startBattle() {
    fightGen += 1;
    stopFight();
    var lv = A.LEVELS[levelIndex];
    battle = A.makeBattleState(lv, save.classId, save.amulet);
    battle.t0 = performance.now();
    phase = "play";
    busy = false;
    sel = null;
    board = A.generateBoard();
    buildNodes();
    buildStage();
    logEl.innerHTML = "";
    pushLog("第 " + (levelIndex + 1) + " 关 · " + lv.name);
    updateHUD();
    showScreen("battle");
    enterMonsters();
    lastTick = 0;
    fightTimer = requestAnimationFrame(loop);
  }
  function cacheDom() {
    titleProgress = document.getElementById("title-progress");
    clearCount = document.getElementById("clear-count");
    unlockEl = document.getElementById("unlock-all");
    levelList = document.getElementById("level-list");
    prepKicker = document.getElementById("prep-kicker");
    prepTitle = document.getElementById("prep-title");
    prepMeta = document.getElementById("prep-meta");
    prepTeach = document.getElementById("prep-teach");
    prepClass = document.getElementById("prep-class");
    prepSword = document.getElementById("prep-sword");
    prepRules = document.getElementById("prep-rules");
    prepEnemy = document.getElementById("prep-enemy");
    amuletEl = document.getElementById("amulet");
    battleKicker = document.getElementById("battle-kicker");
    battleTeach = document.getElementById("teach");
    heroCard = document.getElementById("hero-card");
    heroPortrait = document.getElementById("hero-portrait");
    heroClass = document.getElementById("hero-class");
    heroHp = document.getElementById("hero-hp");
    heroBar = document.getElementById("hero-bar");
    shieldText = document.getElementById("shield-text");
    shieldBar = document.getElementById("shield-bar");
    resBlue = document.getElementById("res-blue");
    resYellow = document.getElementById("res-yellow");
    resShield = document.getElementById("res-shield");
    resBuff = document.getElementById("res-stun");
    gearHud = document.getElementById("gear-hud");
    lastLine = document.getElementById("last-line");
    logEl = document.getElementById("log");
    boardEl = document.getElementById("board");
    btnSlash = document.getElementById("btn-slash");
    btnUlt = document.getElementById("btn-ult");
    slashNote = document.getElementById("slash-note");
    ultNote = document.getElementById("ult-note");
    ultDesc = document.getElementById("ult-desc");
    skillHintEl = document.getElementById("skill-hint");
    resultTitle = document.getElementById("result-title");
    resultDetail = document.getElementById("result-detail");
    btnNext = document.getElementById("btn-next");
    btnRetry = document.getElementById("btn-retry");
  }
  function bind() {
    document.getElementById("btn-start").addEventListener("click", function () { showScreen("select"); });
    document.getElementById("btn-fight").addEventListener("click", startBattle);
    document.getElementById("btn-prep-back").addEventListener("click", function () { showScreen("select"); });
    document.getElementById("btn-result-back").addEventListener("click", function () { showScreen("select"); });
    btnRetry.addEventListener("click", startBattle);
    btnNext.addEventListener("click", function () {
      if (levelIndex < A.LEVELS.length - 1) {
        levelIndex += 1;
        showScreen("prep");
      }
    });
    unlockEl.addEventListener("change", function () {
      save.unlockAll = unlockEl.checked;
      persist();
      renderSelect();
    });
    amuletEl.addEventListener("change", function () {
      save.amulet = amuletEl.checked;
      persist();
    });
    var buttons = document.querySelectorAll(".class-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (ev) {
        save.classId = ev.currentTarget.dataset.class;
        persist();
        renderPrep();
      });
    }
    btnSlash.addEventListener("click", function () { onCast("slash"); });
    btnUlt.addEventListener("click", function () { onCast("ult"); });
  }
  function init() {
    cacheDom();
    bind();
    showScreen("title");
    document.body.dataset.ready = "1";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
