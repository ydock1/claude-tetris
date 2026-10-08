'use strict';

const NEUTRAL_BLOCK_INDEX = 13;

const CHALLENGE_LEVELS = [
  {
    title: 'Limpia 40 líneas en 2 minutos',
    startLevel: 1,
    objective: { targetLines: 40, timeLimitMs: 120000 },
  },
  {
    title: 'Sobrevive con basura cada 10 s',
    startLevel: 1,
    garbageIntervalMs: 10000,
    objective: { survivalMs: 60000 },
  },
  {
    title: 'Tablero con bloques fijos',
    startLevel: 1,
    presetRows: ['XXXX..XXXX', 'XX..XXXXXX'],
    objective: { targetLines: 10 },
  },
  {
    title: 'Piezas invisibles tras tocar suelo',
    startLevel: 1,
    isPieceHiddenOnLanding: true,
    objective: { targetLines: 20 },
  },
  {
    title: 'Rotación inversa en niveles altos',
    startLevel: 5,
    isRotationReversed: true,
    objective: { targetLines: 30 },
  },
];

const levelMenuEl = document.getElementById('level-menu');
const menuBtn = document.getElementById('menu-btn');

let challengeLevelIndex = null;
let challengeOutcome = null;
let challengeElapsedMs = 0;
let garbageElapsedMs = 0;
let highestUnlockedLevelIndex = 0;
let isMenuOpen = false;

menuBtn.addEventListener('click', openLevelMenu);

function activeChallengeLevel() {
  return challengeLevelIndex === null ? null : CHALLENGE_LEVELS[challengeLevelIndex];
}

function startingLevelNumber() {
  const level = activeChallengeLevel();
  return level ? level.startLevel : selectedStartLevel;
}

function createStartingBoard() {
  const startingBoard = createBoard();
  const level = activeChallengeLevel();
  const presetRows = level && level.presetRows ? level.presetRows : [];
  presetRows.forEach((presetPattern, presetIndex) => {
    startingBoard[ROWS - presetRows.length + presetIndex] = [...presetPattern].map(char =>
      char === 'X' ? NEUTRAL_BLOCK_INDEX : 0);
  });
  return startingBoard;
}

function rotatePieceShape(shape) {
  const level = activeChallengeLevel();
  return level && level.isRotationReversed ? rotateCounterClockwise(shape) : rotateCW(shape);
}

function isPieceHiddenNow() {
  const level = activeChallengeLevel();
  return Boolean(level && level.isPieceHiddenOnLanding && collide(current.shape, current.x, current.y + 1));
}

function startRun(levelIndex) {
  challengeLevelIndex = levelIndex;
  challengeOutcome = null;
  challengeElapsedMs = 0;
  garbageElapsedMs = 0;
  isMenuOpen = false;
  init();
}

function startFreeGame() {
  startRun(null);
}

function startChallengeLevel(levelIndex) {
  startRun(levelIndex);
}

function updateChallenge(elapsedMs) {
  const level = activeChallengeLevel();
  if (!level || gameOver) return;
  challengeElapsedMs += elapsedMs;
  if (level.garbageIntervalMs) {
    garbageElapsedMs += elapsedMs;
    while (garbageElapsedMs >= level.garbageIntervalMs && !gameOver) {
      garbageElapsedMs -= level.garbageIntervalMs;
      addGarbageRow();
    }
  }
  const outcome = evaluateChallengeOutcome(level);
  if (outcome && !gameOver) finishChallengeLevel(outcome);
}

function evaluateChallengeOutcome(level) {
  const { targetLines, survivalMs, timeLimitMs } = level.objective;
  if (targetLines !== undefined && lines >= targetLines) return 'won';
  if (survivalMs !== undefined && challengeElapsedMs >= survivalMs) return 'won';
  if (timeLimitMs !== undefined && challengeElapsedMs >= timeLimitMs) return 'lost';
  return null;
}

function addGarbageRow() {
  if (board[0].some(cell => cell !== 0)) {
    endGame();
    return;
  }
  board.shift();
  const holeColumn = randomInt(0, COLS - 1);
  board.push(Array.from({ length: COLS }, (_, column) =>
    column === holeColumn ? 0 : NEUTRAL_BLOCK_INDEX));
  if (collide(current.shape, current.x, current.y)) endGame();
}

function finishChallengeLevel(outcome) {
  const level = activeChallengeLevel();
  const hasNextLevel = challengeLevelIndex + 1 < CHALLENGE_LEVELS.length;
  challengeOutcome = outcome;
  if (outcome === 'won') {
    highestUnlockedLevelIndex = Math.max(
      highestUnlockedLevelIndex,
      Math.min(challengeLevelIndex + 1, CHALLENGE_LEVELS.length - 1),
    );
  }
  gameOver = true;
  cancelAnimationFrame(animId);
  const detail = `${level.title} · Puntuación: ${score.toLocaleString()}`;
  if (outcome === 'lost') showOverlay('FALLASTE', detail, 'Reintentar');
  else showOverlay('NIVEL SUPERADO', detail, hasNextLevel ? 'Siguiente nivel' : 'Menú de niveles');
}

function handleRestartClick() {
  if (challengeLevelIndex === null) {
    startFreeGame();
    return;
  }
  if (challengeOutcome !== 'won') {
    startChallengeLevel(challengeLevelIndex);
    return;
  }
  if (challengeLevelIndex + 1 < CHALLENGE_LEVELS.length) startChallengeLevel(challengeLevelIndex + 1);
  else openLevelMenu();
}

function openLevelMenu() {
  isMenuOpen = true;
  cancelAnimationFrame(animId);
  showOverlay('DESAFÍO', '', null);
  renderLevelMenu();
  levelMenuEl.classList.remove('hidden');
  showScoreBoard();
}

function renderLevelMenu() {
  levelMenuEl.replaceChildren();
  levelMenuEl.appendChild(createMenuButton('Juego libre', startFreeGame));
  for (const [levelIndex, level] of CHALLENGE_LEVELS.entries()) {
    const levelButton = createMenuButton(`${levelIndex + 1}. ${level.title}`, () => startChallengeLevel(levelIndex));
    levelButton.disabled = levelIndex > highestUnlockedLevelIndex;
    levelMenuEl.appendChild(levelButton);
  }
}

function createMenuButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'level-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}
