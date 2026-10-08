'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#f48fb1', // tuerca - pink
  '#c6ff00', // + - lima
  '#536dfe', // U - índigo
  '#d500f9', // Y - magenta
  '#1de9b6', // 1x1 - menta
  '#9e9e9e', // comodín - gris
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // tuerca
  [[0,9,0],[9,9,9],[0,9,0]],                  // +
  [[10,0,10],[10,10,10]],                     // U
  [[0,11,0,0],[11,11,11,11]],                 // Y
  [[12]],                                     // 1x1
];

const TETROMINO_TYPES = [1, 2, 3, 4, 5, 6, 7, 8];
const PENTOMINO_TYPES = [9, 10, 11];
const SINGLE_TYPE = 12;
const PENTOMINO_CHANCE = 0.15;
const TETRIS_LINES = 4;
const LINE_SCORES = [0, 100, 300, 500, 800];
const POWERUP_CYCLE = 5;
const FREEZE_MS = 5000;
const WILDCARD_INDEX = 13;
const POWERUP_LABELS = { bomba: 'B', rayo: 'R', tinte: 'T', gravedad: 'G', congelar: 'C' };
const T_PIECE_TYPE = 3;
const TSPIN_SCORES = [400, 800, 1200, 1600];
const TSPIN_CORNER_OFFSETS = [[0, 0], [2, 0], [0, 2], [2, 2]];
const TSPIN_MIN_BLOCKED_CORNERS = 3;
const BACK_TO_BACK_MULTIPLIER = 1.5;
const PERFECT_CLEAR_SCORE = 1000;
const FLOATING_TEXT_MS = 1200;
const SOUND_BASE_HZ = 440;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const holdCanvas = document.getElementById('hold-canvas');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const pauseMenuEl = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const pauseControlsEl = document.getElementById('pause-controls');
const startLevelSelectEl = document.getElementById('pause-level-select');
const startLevelButtonsEl = document.getElementById('pause-level-buttons');

const START_LEVEL_COUNT = 10;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let selectedStartLevel = 1, runStartLevel = 1;
let piecesCreated, powerupPieceNumber, frozenUntil, isSingleRewardPending;
let comboCount, isBackToBackActive, floatingTexts = [], audioContext = null, pieceQueue = [];

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTypeFromList(types) {
  return types[randomInt(0, types.length - 1)];
}

function createPieceOfType(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0, isLastMoveRotation: false };
}

function randomPiece() {
  const isPentomino = Math.random() < PENTOMINO_CHANCE;
  const type = randomTypeFromList(isPentomino ? PENTOMINO_TYPES : TETROMINO_TYPES);
  return createPieceOfType(type);
}

function randomPowerupName() {
  const names = Object.keys(POWERUP_LABELS);
  return names[randomInt(0, names.length - 1)];
}

function generatePiece() {
  piecesCreated++;
  const piece = isSingleRewardPending ? createPieceOfType(SINGLE_TYPE) : randomPiece();
  isSingleRewardPending = false;
  piece.powerup = piecesCreated === powerupPieceNumber ? randomPowerupName() : null;
  if (piecesCreated % POWERUP_CYCLE === 0)
    powerupPieceNumber = piecesCreated + randomInt(1, POWERUP_CYCLE);
  return piece;
}

function createNextPiece() {
  return pieceQueue.length > 0 ? pieceQueue.shift() : generatePiece();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCounterClockwise(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function tryRotate() {
  const rotated = rotatePieceShape(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      current.isLastMoveRotation = true;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function applyPowerup(piece) {
  const centerCol = piece.x + Math.floor(piece.shape[0].length / 2);
  const centerRow = piece.y + Math.floor(piece.shape.length / 2);
  switch (piece.powerup) {
    case 'bomba':
      explodeBomb(centerCol, centerRow);
      break;
    case 'rayo':
      clearRow(centerRow);
      break;
    case 'tinte':
      turnColorIntoWildcards(piece.type);
      break;
    case 'gravedad':
      compactColumns();
      break;
    case 'congelar':
      freezeFall();
      break;
  }
}

function explodeBomb(centerCol, centerRow) {
  for (let row = centerRow - 1; row <= centerRow + 1; row++)
    for (let col = centerCol - 1; col <= centerCol + 1; col++)
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) board[row][col] = 0;
}

function clearRow(row) {
  board[row].fill(0);
}

function turnColorIntoWildcards(colorIndex) {
  for (const row of board)
    for (let col = 0; col < COLS; col++)
      if (row[col] === colorIndex) row[col] = WILDCARD_INDEX;
}

function compactColumns() {
  for (let col = 0; col < COLS; col++) {
    const stack = [];
    for (let row = ROWS - 1; row >= 0; row--)
      if (board[row][col]) stack.push(board[row][col]);
    for (let row = ROWS - 1; row >= 0; row--)
      board[row][col] = stack[ROWS - 1 - row] ?? 0;
  }
}

function freezeFall() {
  frozenUntil = performance.now() + FREEZE_MS;
}

function isFrozen() {
  return performance.now() < frozenUntil;
}

function removeFullRows() {
  let removedCount = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      removedCount++;
      r++;
    }
  }
  return removedCount;
}

function isBoardEmpty() {
  return board.every(row => row.every(cell => cell === 0));
}

function recordClearedLines(clearedCount) {
  if (clearedCount === TETRIS_LINES) isSingleRewardPending = true;
  lines += clearedCount;
  level = runStartLevel + Math.floor(lines / 10);
  dropInterval = dropIntervalForLevel(level);
}

function dropIntervalForLevel(levelNumber) {
  return Math.max(100, 1000 - (levelNumber - 1) * 90);
}

function isCellBlocked(col, row) {
  if (col < 0 || col >= COLS || row >= ROWS) return true;
  return row >= 0 && board[row][col] !== 0;
}

function isTSpin() {
  if (current.type !== T_PIECE_TYPE || !current.isLastMoveRotation) return false;
  const blockedCorners = TSPIN_CORNER_OFFSETS.filter(([offsetCol, offsetRow]) =>
    isCellBlocked(current.x + offsetCol, current.y + offsetRow));
  return blockedCorners.length >= TSPIN_MIN_BLOCKED_CORNERS;
}

function rewardClear(clearedCount, isTSpinLock) {
  const isTetris = clearedCount === TETRIS_LINES;
  const isBackToBackBonus = isTetris && isBackToBackActive;
  comboCount = clearedCount > 0 ? comboCount + 1 : 0;
  if (isTetris) isBackToBackActive = true;
  else if (clearedCount > 0) isBackToBackActive = false;

  const basePoints = isTSpinLock ? TSPIN_SCORES[clearedCount] : LINE_SCORES[clearedCount];
  let points = basePoints * level * Math.max(comboCount, 1);
  if (isBackToBackBonus) points *= BACK_TO_BACK_MULTIPLIER;
  const isPerfectClear = clearedCount > 0 && isBoardEmpty();
  if (isPerfectClear) points += PERFECT_CLEAR_SCORE * level;
  score += Math.floor(points);

  celebrateLock({ clearedCount, isTSpinLock, isBackToBackBonus, isPerfectClear });
}

function celebrateLock({ clearedCount, isTSpinLock, isBackToBackBonus, isPerfectClear }) {
  const labels = [];
  if (isTSpinLock) labels.push('T-SPIN');
  if (isBackToBackBonus) labels.push('B2B');
  if (comboCount >= 2) labels.push(`COMBO x${comboCount}`);
  if (isPerfectClear) labels.push('PERFECT CLEAR');
  for (const label of labels) showFloatingText(label);

  if (clearedCount === 0) return;
  const pitchHz = SOUND_BASE_HZ * 2 ** (comboCount / 12);
  playTone(pitchHz);
  if (isTSpinLock || clearedCount === TETRIS_LINES || isPerfectClear) playTone(pitchHz * 1.5);
}

function showFloatingText(label) {
  floatingTexts.push({ label, startedAt: performance.now() });
}

function playTone(frequencyHz) {
  try {
    audioContext ??= new AudioContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequencyHz;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch (error) {}
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  const dropDistance = gy - current.y;
  score += dropDistance * 2;
  if (dropDistance > 0) current.isLastMoveRotation = false;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    current.isLastMoveRotation = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  const isTSpinLock = isTSpin();
  saveUndoSnapshot();
  merge();
  if (current.powerup) applyPowerup(current);
  const clearedCount = removeFullRows();
  rewardClear(clearedCount, isTSpinLock);
  recordClearedLines(clearedCount);
  gainEnergy(clearedCount);
  updateHUD();
  isHoldUsedThisPiece = false;
  isUpcomingRevealed = false;
  spawn();
}

function spawn() {
  current = next;
  next = createNextPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  drawEnergy();
  drawUpcomingPieces();
}

function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = themeColor(`--piece-${colorIndex}`) || COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = themeColor('--block-highlight');
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = themeColor('--grid');
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function drawPowerupLabel(context, piece, originCol, originRow, size) {
  if (!piece.powerup) return;
  const centerX = (originCol + Math.floor(piece.shape[0].length / 2) + 0.5) * size;
  const centerY = (originRow + Math.floor(piece.shape.length / 2) + 0.5) * size;
  context.globalAlpha = 1;
  context.fillStyle = '#fff';
  context.font = `bold ${size * 0.5}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(POWERUP_LABELS[piece.powerup], centerX, centerY);
}

function drawFloatingTexts() {
  const now = performance.now();
  floatingTexts = floatingTexts.filter(text => now - text.startedAt < FLOATING_TEXT_MS);
  for (const [index, text] of floatingTexts.entries()) {
    const progress = (now - text.startedAt) / FLOATING_TEXT_MS;
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = themeColor('--accent');
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.label, canvas.width / 2, canvas.height / 3 - index * 24 - progress * 40);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (!isPieceHiddenNow()) {
    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    drawPowerupLabel(ctx, current, current.x, current.y, BLOCK);
  }
  drawFloatingTexts();
}

function drawPiecePreview(previewCanvas, piece) {
  const PREVIEW_BLOCK = 30;
  const previewCtx = previewCanvas.getContext('2d');
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!piece) return;
  const shape = piece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(previewCtx, offX + c, offY + r, shape[r][c], PREVIEW_BLOCK);
  drawPowerupLabel(previewCtx, piece, offX, offY, PREVIEW_BLOCK);
}

function drawNext() {
  drawPiecePreview(nextCanvas, next);
}

function showOverlay(title, detail, restartLabel) {
  overlayTitle.textContent = title;
  overlayScore.textContent = detail;
  restartBtn.textContent = restartLabel ?? '';
  restartBtn.classList.toggle('hidden', restartLabel === null);
  levelMenuEl.classList.add('hidden');
  pauseMenuEl.classList.add('hidden');
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
  pauseMenuEl.classList.add('hidden');
  pauseControlsEl.classList.add('hidden');
}

function endGame() {
  if (activeChallengeLevel()) {
    finishChallengeLevel('lost');
    return;
  }
  gameOver = true;
  cancelAnimationFrame(animId);
  showOverlay('GAME OVER', `Puntuación: ${score.toLocaleString()}`, 'Reiniciar');
}

function togglePause() {
  if (gameOver || isMenuOpen) return;
  paused = !paused;
  if (!paused) {
    hideOverlay();
    renderStartLevelSelector(false);
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showPauseOverlay();
  }
}

function showPauseOverlay() {
  showOverlay('PAUSA', '', 'Reiniciar');
  pauseMenuEl.classList.remove('hidden');
  renderStartLevelSelector(true);
}

function renderStartLevelSelector(isVisible) {
  const isSelectorShown = isVisible && challengeLevelIndex === null;
  startLevelSelectEl.classList.toggle('hidden', !isSelectorShown);
  startLevelButtonsEl.replaceChildren();
  if (!isSelectorShown) return;
  for (let levelNumber = 1; levelNumber <= START_LEVEL_COUNT; levelNumber++) {
    const levelButton = createMenuButton(String(levelNumber), () => selectStartLevel(levelNumber));
    levelButton.classList.toggle('selected', levelNumber === selectedStartLevel);
    startLevelButtonsEl.appendChild(levelButton);
  }
}

function selectStartLevel(levelNumber) {
  selectedStartLevel = levelNumber;
  renderStartLevelSelector(true);
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  advanceSlowTimer(dt);
  if (isFrozen()) dropAccum = 0;
  else dropAccum += dt;
  if (dropAccum >= effectiveDropInterval()) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      current.isLastMoveRotation = false;
    } else {
      lockPiece();
    }
  }
  updateChallenge(dt);
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createStartingBoard();
  score = 0;
  lines = 0;
  runStartLevel = startingLevelNumber();
  level = runStartLevel;
  paused = false;
  gameOver = false;
  renderStartLevelSelector(false);
  dropInterval = dropIntervalForLevel(level);
  dropAccum = 0;
  frozenUntil = 0;
  piecesCreated = 0;
  isSingleRewardPending = false;
  comboCount = 0;
  isBackToBackActive = false;
  floatingTexts = [];
  pieceQueue = [];
  heldPiece = null;
  isHoldUsedThisPiece = false;
  resetSkills();
  powerupPieceNumber = randomInt(1, POWERUP_CYCLE);
  lastTime = performance.now();
  next = createNextPiece();
  spawn();
  drawHold();
  updateHUD();
  hideOverlay();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code.startsWith('Arrow')) e.preventDefault();
  if (isMenuOpen) return;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (!e.repeat) togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        current.isLastMoveRotation = false;
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        current.isLastMoveRotation = false;
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdCurrentPiece();
      break;
    default:
      useSkillForKey(e.code);
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  handleRestartClick();
  restartBtn.blur(); // no robar el teclado al juego
});

resumeBtn.addEventListener('click', () => {
  togglePause();
  resumeBtn.blur();
});

controlsToggleBtn.addEventListener('click', () => {
  pauseControlsEl.classList.toggle('hidden');
  controlsToggleBtn.blur();
});

const themeToggle = document.getElementById('theme-toggle');
const THEME_KEY = 'tetris-theme';

function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(light));
  themeToggle.setAttribute('aria-label', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  themeToggle.textContent = light ? '☾ Oscuro' : '☀ Claro';
  // el bucle no redibuja en pausa o game over
  draw();
  drawNext();
  drawHold();
  drawUpcomingPieces();
}

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  applyTheme(theme);
  themeToggle.blur(); // no robar el teclado al juego
});

init();
openLevelMenu();

let savedTheme = 'dark';
try { savedTheme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch (e) {}
applyTheme(savedTheme);
