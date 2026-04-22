// ====== Ludo Game ======
// Board layout: 15x15 grid. Standard Ludo path of 52 cells around the perimeter,
// plus a 6-cell home column for each color leading to the center.
// Player order: 0=Red, 1=Green, 2=Yellow, 3=Blue.

const COLORS = ["red", "green", "yellow", "blue"];
const COLOR_NAMES = ["Red", "Green", "Yellow", "Blue"];

// The 52 cells of the main loop, in [row, col] pairs.
// Order starts at Red's first step out of the yard and proceeds clockwise.
const MAIN_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],          // 0..4  (Red leaves at 0)
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],    // 5..10
  [0,7],                                  // 11
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],    // 12..17 (Green leaves at 13)
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14], // 18..23
  [7,14],                                 // 24
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9], // 25..30 (Yellow leaves at 26)
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 31..36
  [14,7],                                 // 37
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6], // 38..43 (Blue leaves at 39)
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],    // 44..49
  [7,0],                                  // 50
  [6,0],                                  // 51
];

// Each player's start index on the main path.
const START_INDEX = [0, 13, 26, 39];

// Safe cells (stars + colored start cells).
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Each player's home column (6 cells) leading from the entry into the center.
// They appear AFTER the player's "entry" point on the main path (one step before their start - 1).
// Home columns:
const HOME_COLUMNS = {
  0: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],   // Red:    row 7, cols 1..6
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],   // Green:  col 7, rows 1..6
  2: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // Yellow: row 7, cols 13..8
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]], // Blue:   col 7, rows 13..8
};

// "Entry point" — the index on the main path that, when passed, the token enters its home column.
// A token enters home column when it would step PAST this index.
// For each color, this is (START_INDEX - 1 + 52) % 52.
const HOME_ENTRY = START_INDEX.map(s => (s - 1 + 52) % 52);

// ====== State ======
let state = null;

function initialState() {
  return {
    current: 0,
    dice: null,
    rolled: false,
    consecutiveSixes: 0,
    // tokens[player] = array of 4 tokens.
    // Each token: { pos: 'yard' | number 0..51 (main path) | 'h0'..'h5' | 'done' }
    tokens: COLORS.map(() => [
      { pos: "yard" }, { pos: "yard" }, { pos: "yard" }, { pos: "yard" }
    ]),
    finished: [0,0,0,0],
    winner: null,
    rolling: false,
  };
}

// ====== Board rendering ======
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
        boardEl.appendChild(filler);
        continue;
      }
      const cell = document.createElement("div");
      cell.className = "cell path";
      cell.style.gridRow = `${r+1}`;
      cell.style.gridColumn = `${c+1}`;
      cell.dataset.r = r;
      cell.dataset.c = c;
      boardEl.appendChild(cell);
    }
  }

  // Color the main path safe cells & start cells.
  MAIN_PATH.forEach((rc, idx) => {
    const cell = cellAt(rc[0], rc[1]);
    if (!cell) return;
    if (SAFE_INDICES.has(idx)) cell.classList.add("safe");
    if (idx === START_INDEX[0]) cell.classList.add("start-r");
    if (idx === START_INDEX[1]) cell.classList.add("start-g");
    if (idx === START_INDEX[2]) cell.classList.add("start-y");
    if (idx === START_INDEX[3]) cell.classList.add("start-b");
  });

  // Color the home columns.
  Object.entries(HOME_COLUMNS).forEach(([p, cells]) => {
    const cls = ["path-r","path-g","path-y","path-b"][+p];
    cells.forEach(([r,c]) => {
      const cell = cellAt(r,c);
      if (cell) {
        cell.classList.remove("path");
        cell.classList.add(cls);
      }
    });
  });

  // Quadrants (yards).
  const yards = [
    { cls: "q-red", color: "red", player: 0 },
    { cls: "q-green", color: "green", player: 1 },
    { cls: "q-yellow", color: "yellow", player: 2 },
    { cls: "q-blue", color: "blue", player: 3 },
  ];
  yards.forEach(y => {
    const q = document.createElement("div");
    q.className = `quadrant ${y.cls}`;
    const yard = document.createElement("div");
    yard.className = "yard";
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.player = y.player;
      slot.dataset.tokenIdx = i;
      yard.appendChild(slot);
    }
    q.appendChild(yard);
    boardEl.appendChild(q);
  });

  // Center triangles.
  const center = document.createElement("div");
  center.className = "center";
  ["y","g","r","b"].forEach(c => {
    const t = document.createElement("div");
    t.className = `tri ${c}`;
    center.appendChild(t);
  });
  boardEl.appendChild(center);
}

function cellAt(r, c) {
  return boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

// ====== Token rendering ======
function renderTokens() {
  // Clear existing token layers.
  boardEl.querySelectorAll(".token-layer").forEach(el => el.remove());
  boardEl.querySelectorAll(".yard .slot .token").forEach(el => el.remove());

  // Group tokens on main path by cell.
  const cellGroups = new Map(); // key "r,c" -> [{player, idx}]

  state.tokens.forEach((arr, player) => {
    arr.forEach((t, idx) => {
      const rc = tokenRC(player, t);
      if (!rc) {
        // In yard — render in slot.
        const slot = boardEl.querySelector(
          `.quadrant .yard .slot[data-player="${player}"][data-token-idx="${idx}"]`
        );
        if (slot) slot.appendChild(makeTokenEl(player, idx));
        return;
      }
      const key = `${rc[0]},${rc[1]}`;
      if (!cellGroups.has(key)) cellGroups.set(key, []);
      cellGroups.get(key).push({ player, idx });
    });
  });

  // Render groups onto cells.
  cellGroups.forEach((group, key) => {
    const [r, c] = key.split(",").map(Number);
    const cell = cellAt(r, c);
    if (!cell) return;
    const layer = document.createElement("div");
    layer.className = "token-layer" + (group.length === 1 ? " single" : "");
    group.forEach(({ player, idx }) => {
      const t = makeTokenEl(player, idx);
      if (group.length > 1) t.classList.add("stack");
      layer.appendChild(t);
    });
    cell.appendChild(layer);
  });

  // Mark movable tokens.
  if (state.dice && !state.winner) {
    const movable = movableTokenIndices(state.current, state.dice);
    movable.forEach(idx => {
      const els = document.querySelectorAll(
        `.token[data-player="${state.current}"][data-idx="${idx}"]`
      );
      els.forEach(el => el.classList.add("movable"));
    });
  }
}

function makeTokenEl(player, idx) {
  const el = document.createElement("div");
  el.className = `token ${COLORS[player]}`;
  el.dataset.player = player;
  el.dataset.idx = idx;
  el.textContent = idx + 1;
  el.addEventListener("click", () => onTokenClick(player, idx));
  return el;
}

function tokenRC(player, token) {
  if (token.pos === "yard") return null;
  if (token.pos === "done") {
    // Cluster done tokens in center area.
    const offsets = [[6,7],[7,6],[7,8],[8,7]];
    return offsets[player];
  }
  if (typeof token.pos === "string" && token.pos.startsWith("h")) {
    const i = parseInt(token.pos.slice(1), 10);
    return HOME_COLUMNS[player][i];
  }
  return MAIN_PATH[token.pos];
}

// ====== Game logic ======
function rollDice() {
  if (state.winner || state.rolling) return;
  if (state.rolled) return;
  state.rolling = true;
  const diceEl = document.getElementById("dice");
  diceEl.classList.add("rolling");
  let rolls = 0;
  const interval = setInterval(() => {
    diceEl.textContent = 1 + Math.floor(Math.random() * 6);
    rolls++;
    if (rolls >= 8) {
      clearInterval(interval);
      diceEl.classList.remove("rolling");
      const value = 1 + Math.floor(Math.random() * 6);
      diceEl.textContent = value;
      state.dice = value;
      state.rolled = true;
      state.rolling = false;

      if (value === 6) {
        state.consecutiveSixes++;
        if (state.consecutiveSixes === 3) {
          setMessage("Three sixes in a row — turn forfeited.");
          state.dice = null;
          state.consecutiveSixes = 0;
          setTimeout(endTurn, 900);
          return;
        }
      }

      const movable = movableTokenIndices(state.current, value);
      if (movable.length === 0) {
        setMessage(`No legal moves with a ${value}.`);
        state.dice = null;
        if (value !== 6) state.consecutiveSixes = 0;
        setTimeout(endTurn, 900);
      } else {
        setMessage(`Pick a token to move ${value} step${value > 1 ? "s" : ""}.`);
      }
      render();
    }
  }, 60);
}

function movableTokenIndices(player, dice) {
  const result = [];
  state.tokens[player].forEach((t, idx) => {
    if (canMove(player, t, dice)) result.push(idx);
  });
  return result;
}

function canMove(player, token, dice) {
  if (token.pos === "done") return false;
  if (token.pos === "yard") return dice === 6;
  // On main path or home column.
  const target = computeTarget(player, token, dice);
  return target !== null;
}

// Returns new pos, or null if move illegal (overshoots home).
function computeTarget(player, token, dice) {
  if (token.pos === "yard") {
    if (dice !== 6) return null;
    return START_INDEX[player];
  }
  if (typeof token.pos === "string" && token.pos.startsWith("h")) {
    const i = parseInt(token.pos.slice(1), 10);
    const ni = i + dice;
    if (ni === 6) return "done";
    if (ni < 6) return "h" + ni;
    return null; // overshoot
  }
  // On main path.
  const cur = token.pos;
  const entry = HOME_ENTRY[player];
  // Distance from cur to entry (going forward).
  let stepsToEntry;
  if (cur === entry) stepsToEntry = 0;
  else stepsToEntry = (entry - cur + 52) % 52;

  if (dice <= stepsToEntry) {
    return (cur + dice) % 52;
  }
  // Enter home column.
  const intoHome = dice - stepsToEntry - 1; // 0..5 indexes home col
  if (intoHome === 6) return "done";
  if (intoHome < 6) return "h" + intoHome;
  return null;
}

function onTokenClick(player, idx) {
  if (state.winner || state.rolling) return;
  if (player !== state.current) return;
  if (!state.rolled || state.dice == null) return;
  const token = state.tokens[player][idx];
  const target = computeTarget(player, token, state.dice);
  if (target === null) return;

  // Apply move.
  let captured = false;
  token.pos = target;

  if (target === "done") {
    state.finished[player]++;
    if (state.finished[player] === 4) {
      state.winner = player;
    }
  } else if (typeof target === "number") {
    // Capture: any opponent token alone on this cell (and not on a safe square).
    if (!SAFE_INDICES.has(target)) {
      COLORS.forEach((_, op) => {
        if (op === player) return;
        // Only capture if exactly one opponent token is here (singletons only).
        const occupants = state.tokens[op].filter(t => t.pos === target);
        if (occupants.length === 1) {
          occupants[0].pos = "yard";
          captured = true;
        }
      });
    }
  }

  const wasSix = state.dice === 6;
  state.dice = null;
  state.rolled = false;

  if (state.winner !== null) {
    render();
    showWinner();
    return;
  }

  // Bonus turn on a 6, on capture, or on completing a token.
  const bonus = wasSix || captured || target === "done";
  if (bonus) {
    if (!wasSix) state.consecutiveSixes = 0;
    setMessage(captured ? "Capture! Roll again." : (target === "done" ? "Token home — roll again." : "Six! Roll again."));
    render();
  } else {
    state.consecutiveSixes = 0;
    endTurn();
  }
}

function endTurn() {
  state.dice = null;
  state.rolled = false;
  state.consecutiveSixes = 0;
  state.current = (state.current + 1) % 4;
  setMessage("");
  render();
}

// ====== UI updates ======
function setMessage(msg) {
  document.getElementById("message").textContent = msg;
}

function render() {
  document.getElementById("currentPlayer").textContent = COLOR_NAMES[state.current];
  document.getElementById("currentPlayer").style.color = `var(--${COLORS[state.current]})`;
  document.getElementById("dice").textContent = state.dice ?? "-";
  document.getElementById("rollBtn").disabled = state.rolled || state.winner !== null;

  for (let p = 0; p < 4; p++) {
    const homeCount = state.tokens[p].filter(t => t.pos === "yard").length;
    document.getElementById(`home-${p}`).textContent = `${homeCount} home`;
    document.getElementById(`score-${p}`).textContent = `${state.finished[p]} / 4`;
  }
  document.querySelectorAll(".player").forEach((el, i) => {
    el.classList.toggle("active", i === state.current);
  });

  renderTokens();
}

function showWinner() {
  const banner = document.createElement("div");
  banner.className = "winner-banner";
  banner.innerHTML = `
    <div class="card">
      <h2 style="color: var(--${COLORS[state.winner]})">${COLOR_NAMES[state.winner]} wins!</h2>
      <p>All 4 tokens reached home.</p>
      <button class="btn primary" id="playAgain">Play Again</button>
    </div>
  `;
  document.body.appendChild(banner);
  document.getElementById("playAgain").addEventListener("click", () => {
    banner.remove();
    resetGame();
  });
}

function resetGame() {
  state = initialState();
  document.querySelectorAll(".winner-banner").forEach(b => b.remove());
  render();
  setMessage("");
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", () => {
  buildBoard();
  state = initialState();
  document.getElementById("rollBtn").addEventListener("click", rollDice);
  document.getElementById("resetBtn").addEventListener("click", resetGame);
  render();
});
