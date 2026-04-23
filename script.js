
-21
+1
// ====== Ludo Game ======
// Board layout: 15x15 grid. Standard Ludo path of 52 cells around the perimeter,
// plus a 6-cell home column for each color leading to the center.
// Player order: 0=Red, 1=Green, 2=Yellow, 3=Blue.
// 15x15 board. 52-cell main loop + 6-cell home column per color.
// Players: 0=Red, 1=Green, 2=Yellow, 3=Blue.
const COLORS = ["red", "green", "yellow", "blue"];
const COLOR_NAMES = ["Red", "Green", "Yellow", "Blue"];
// The 52 cells of the main loop, in [row, col] pairs.
// Order starts at Red's first step out of the yard and proceeds clockwise.
// 52 cells of the main loop in [row, col] pairs, clockwise from Red's start.
const MAIN_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],          // 0..4  (Red leaves at 0)
  [6,1],[6,2],[6,3],[6,4],[6,5],          // 0..4   Red exits at 0
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],    // 5..10
  [0,7],                                  // 11
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],    // 12..17 (Green leaves at 13)
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],    // 12..17 Green exits at 13
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14], // 18..23
  [7,14],                                 // 24
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9], // 25..30 (Yellow leaves at 26)
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9], // 25..30 Yellow exits at 26
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 31..36
  [14,7],                                 // 37
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6], // 38..43 (Blue leaves at 39)
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6], // 38..43 Blue exits at 39
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],    // 44..49
  [7,0],                                  // 50
  [6,0],                                  // 51
];
// Each player's start index on the main path.
const START_INDEX = [0, 13, 26, 39];
// Safe cells (stars + colored start cells).
// Safe cells: 4 colored start squares + 4 star squares.
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
// Each player's home column (6 cells) leading from the entry into the center.
// They appear AFTER the player's "entry" point on the main path (one step before their start - 1).
// Home columns:
// Each player's 6-cell home column from entry → center.
const HOME_COLUMNS = {
  0: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],   // Red:    row 7, cols 1..6
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],   // Green:  col 7, rows 1..6
  2: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // Yellow: row 7, cols 13..8
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]], // Blue:   col 7, rows 13..8
  0: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],     // Red
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],     // Green
  2: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // Yellow
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]], // Blue
};
// "Entry point" — the index on the main path that, when passed, the token enters its home column.
// A token enters home column when it would step PAST this index.
// For each color, this is (START_INDEX - 1 + 52) % 52.
// Last main-path index before the home column (start - 1, mod 52).
const HOME_ENTRY = START_INDEX.map(s => (s - 1 + 52) % 52);
// ====== State ======
-12
+7
    dice: null,
    rolled: false,
    consecutiveSixes: 0,
    // tokens[player] = array of 4 tokens.
    // Each token: { pos: 'yard' | number 0..51 (main path) | 'h0'..'h5' | 'done' }
    tokens: COLORS.map(() => [
      { pos: "yard" }, { pos: "yard" }, { pos: "yard" }, { pos: "yard" }
    ]),
    finished: [0,0,0,0],
    finished: [0, 0, 0, 0],
    winner: null,
    rolling: false,
    moving: false,
  };
}
// ====== Board rendering ======
// ====== Board build (one-time) ======
const boardEl = document.getElementById("board");
function buildBoard() {
  boardEl.innerHTML = "";
  // Build 15x15 grid cells, but skip cells inside the 4 yard quadrants and center.
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      // Skip yard squares (handled by .quadrant overlays).
      const inYard =
        (r < 6 && c < 6) ||
        (r < 6 && c > 8) ||
        (r > 8 && c < 6) ||
        (r > 8 && c > 8);
      // Skip center area.
      const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
      if (inYard || inCenter) {
        const filler = document.createElement("div");
        filler.style.gridRow = `${r+1}`;
        filler.style.gridColumn = `${c+1}`;
        filler.style.gridRow = `${r + 1}`;
        filler.style.gridColumn = `${c + 1}`;
        boardEl.appendChild(filler);
        continue;
      }
      const cell = document.createElement("div");
      cell.className = "cell path";
      cell.style.gridRow = `${r+1}`;
      cell.style.gridColumn = `${c+1}`;
      cell.style.gridRow = `${r + 1}`;
      cell.style.gridColumn = `${c + 1}`;
      cell.dataset.r = r;
      cell.dataset.c = c;
      boardEl.appendChild(cell);
    }
  }
  // Color the main path safe cells & start cells.
  MAIN_PATH.forEach((rc, idx) => {
    const cell = cellAt(rc[0], rc[1]);
    if (!cell) return;
-4
+3
    if (idx === START_INDEX[3]) cell.classList.add("start-b");
  });
  // Color the home columns.
  Object.entries(HOME_COLUMNS).forEach(([p, cells]) => {
    const cls = ["path-r","path-g","path-y","path-b"][+p];
    cells.forEach(([r,c]) => {
      const cell = cellAt(r,c);
    const cls = ["path-r", "path-g", "path-y", "path-b"][+p];
    cells.forEach(([r, c]) => {
      const cell = cellAt(r, c);
      if (cell) {
        cell.classList.remove("path");
        cell.classList.add(cls);
-5
+4
    });
  });
  // Quadrants (yards).
  const yards = [
    { cls: "q-red", color: "red", player: 0 },
    { cls: "q-green", color: "green", player: 1 },
    { cls: "q-yellow", color: "yellow", player: 2 },
    { cls: "q-blue", color: "blue", player: 3 },
    { cls: "q-red", player: 0 },
    { cls: "q-green", player: 1 },
    { cls: "q-yellow", player: 2 },
    { cls: "q-blue", player: 3 },
  ];
  yards.forEach(y => {
    const q = document.createElement("div");
-2
+1
    boardEl.appendChild(q);
  });
  // Center triangles.
  const center = document.createElement("div");
  center.className = "center";
  ["y","g","r","b"].forEach(c => {
  ["y", "g", "r", "b"].forEach(c => {
    const t = document.createElement("div");
    t.className = `tri ${c}`;
    center.appendChild(t);
-5
+3
// ====== Token rendering ======
function renderTokens() {
  // Clear existing token layers.
  // Clear all token elements.
  boardEl.querySelectorAll(".token-layer").forEach(el => el.remove());
  boardEl.querySelectorAll(".yard .slot .token").forEach(el => el.remove());
  // Group tokens on main path by cell.
  const cellGroups = new Map(); // key "r,c" -> [{player, idx}]
  // Group on-board tokens by cell.
  const cellGroups = new Map();
  state.tokens.forEach((arr, player) => {
    arr.forEach((t, idx) => {
      const rc = tokenRC(player, t);
      if (!rc) {
        // In yard — render in slot.
        const slot = boardEl.querySelector(
          `.quadrant .yard .slot[data-player="${player}"][data-token-idx="${idx}"]`
        );
-2
+1
    });
  });
  // Render groups onto cells.
  cellGroups.forEach((group, key) => {
    const [r, c] = key.split(",").map(Number);
    const cell = cellAt(r, c);
    if (!cell) return;
    const layer = document.createElement("div");
    layer.className = "token-layer" + (group.length === 1 ? " single" : "");
    layer.className = "token-layer" + (group.length === 1 ? " single" : " stacked");
    group.forEach(({ player, idx }) => {
      const t = makeTokenEl(player, idx);
      if (group.length > 1) t.classList.add("stack");
-6
+5
    cell.appendChild(layer);
  });
  // Mark movable tokens.
  if (state.dice && !state.winner) {
  // Highlight movable tokens for current player.
  if (state.dice && !state.winner && !state.moving) {
    const movable = movableTokenIndices(state.current, state.dice);
    movable.forEach(idx => {
      const els = document.querySelectorAll(
        `.token[data-player="${state.current}"][data-idx="${idx}"]`
      );
      els.forEach(el => el.classList.add("movable"));
      document
        .querySelectorAll(`.token[data-player="${state.current}"][data-idx="${idx}"]`)
        .forEach(el => el.classList.add("movable"));
    });
  }
}
-5
+7
function makeTokenEl(player, idx) {
  const el = document.createElement("div");
  el.className = `token ${COLORS[player]}`;
  el.dataset.player = player;
  el.dataset.idx = idx;
  el.dataset.player = String(player);
  el.dataset.idx = String(idx);
  el.textContent = idx + 1;
  el.addEventListener("click", () => onTokenClick(player, idx));
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onTokenClick(player, idx);
  });
  return el;
}
function tokenRC(player, token) {
  if (token.pos === "yard") return null;
  if (token.pos === "done") {
    // Cluster done tokens in center area.
    const offsets = [[6,7],[7,6],[7,8],[8,7]];
    const offsets = [[6, 7], [7, 6], [7, 8], [8, 7]];
    return offsets[player];
  }
  if (typeof token.pos === "string" && token.pos.startsWith("h")) {
-1
+2
// ====== Game logic ======
function rollDice() {
  if (state.winner || state.rolling) return;
  if (state.winner || state.rolling || state.moving) return;
  if (state.rolled) return;
  state.rolling = true;
  const diceEl = document.getElementById("dice");
  diceEl.classList.add("rolling");
  let rolls = 0;
  const interval = setInterval(() => {
    diceEl.textContent = 1 + Math.floor(Math.random() * 6);
-0
+1
    if (rolls >= 8) {
      clearInterval(interval);
      diceEl.classList.remove("rolling");
      const value = 1 + Math.floor(Math.random() * 6);
      diceEl.textContent = value;
      state.dice = value;
-0
+2
          setTimeout(endTurn, 900);
          return;
        }
      } else {
        // any non-6 resets consecutive sixes (counted at end of turn)
      }
      const movable = movableTokenIndices(state.current, value);
-1
+10
        state.dice = null;
        if (value !== 6) state.consecutiveSixes = 0;
        setTimeout(endTurn, 900);
        render();
        return;
      }
      render();
      // Auto-move when only one legal option — fixes "stuck" feel.
      if (movable.length === 1) {
        setMessage(`Moving token ${movable[0] + 1}…`);
        setTimeout(() => onTokenClick(state.current, movable[0]), 350);
      } else {
        setMessage(`Pick a token to move ${value} step${value > 1 ? "s" : ""}.`);
      }
      render();
    }
  }, 60);
}
-17
+10
function canMove(player, token, dice) {
  if (token.pos === "done") return false;
  if (token.pos === "yard") return dice === 6;
  // On main path or home column.
  const target = computeTarget(player, token, dice);
  return target !== null;
}
// Returns new pos, or null if move illegal (overshoots home).
  return computeTarget(player, token, dice) !== null;
}
// Returns new pos value, or null if move illegal (overshoots home).
function computeTarget(player, token, dice) {
  if (token.pos === "yard") {
    if (dice !== 6) return null;
    return START_INDEX[player];
    return dice === 6 ? START_INDEX[player] : null;
  }
  if (typeof token.pos === "string" && token.pos.startsWith("h")) {
    const i = parseInt(token.pos.slice(1), 10);
    const ni = i + dice;
    if (ni === 6) return "done";
    if (ni < 6) return "h" + ni;
    return null; // overshoot
    return null;
  }
  // On main path.
  const cur = token.pos;
  const entry = HOME_ENTRY[player];
  // Distance from cur to entry (going forward).
  let stepsToEntry;
  if (cur === entry) stepsToEntry = 0;
  else stepsToEntry = (entry - cur + 52) % 52;
  const stepsToEntry = (entry - cur + 52) % 52;
  if (dice <= stepsToEntry) {
    return (cur + dice) % 52;
  }
  // Enter home column.
  const intoHome = dice - stepsToEntry - 1; // 0..5 indexes home col
  const intoHome = dice - stepsToEntry - 1;
  if (intoHome === 6) return "done";
  if (intoHome < 6) return "h" + intoHome;
  return null;
}
function onTokenClick(player, idx) {
  if (state.winner || state.rolling) return;
  if (state.winner || state.rolling || state.moving) return;
  if (player !=...
[truncated]
[truncated]
[truncated]
-1
+1
[truncated]
[truncated]
-1
+1
[truncated]
[truncated]
-1
+1
[truncated]
[truncated]
