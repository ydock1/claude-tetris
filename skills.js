'use strict';

const ENERGY_MAX = 100;
const ENERGY_PER_CLEARED_LINE = 10;
const PREVIEW_PIECE_COUNT = 5;
const SLOW_DURATION_MS = 10000;
const SLOW_DROP_FACTOR = 2;
const SKILL_HINT_TEXT = '1 Ver 5 · 2 Cambiar · 3 Ralentizar · 4 Deshacer · 5 Reservar';
const UPCOMING_BLOCK_SIZE = 12;
const UPCOMING_SLOT_HEIGHT = 60;
const UPCOMING_GRID_SIZE = 4;

const energyFill = document.getElementById('energy-fill');
const skillHint = document.getElementById('skill-hint');
const upcomingCanvas = document.getElementById('upcoming-canvas');

let energy = 0;
let slowRemainingMs = 0;
let isUpcomingRevealed = false;
let undoSnapshot = null;

const SKILL_ACTIONS_BY_KEY = {
  Digit1: revealUpcomingPieces,
  Digit2: swapCurrentPiece,
  Digit3: slowDownTime,
  Digit4: undoLastPlacement,
  Digit5: reserveHoldForCurrentPiece,
};

function resetSkills() {
  energy = 0;
  slowRemainingMs = 0;
  isUpcomingRevealed = false;
  undoSnapshot = null;
}

function isEnergyFull() {
  return energy >= ENERGY_MAX;
}

function gainEnergy(clearedCount) {
  energy = Math.min(ENERGY_MAX, energy + clearedCount * ENERGY_PER_CLEARED_LINE);
}

function useSkillForKey(keyCode) {
  const skillAction = SKILL_ACTIONS_BY_KEY[keyCode];
  if (!skillAction || !isEnergyFull()) return;
  if (skillAction()) energy = 0;
}

function revealUpcomingPieces() {
  isUpcomingRevealed = true;
  while (pieceQueue.length < PREVIEW_PIECE_COUNT - 1) pieceQueue.push(generatePiece());
  return true;
}

function swapCurrentPiece() {
  const candidate = Object.assign(createPieceOfType(randomTypeFromList(TETROMINO_TYPES)), {
    x: current.x,
    y: current.y,
    powerup: current.powerup,
  });
  if (collide(candidate.shape, candidate.x, candidate.y)) return false;
  current = candidate;
  return true;
}

function slowDownTime() {
  slowRemainingMs = SLOW_DURATION_MS;
  return true;
}

function advanceSlowTimer(elapsedMs) {
  slowRemainingMs = Math.max(0, slowRemainingMs - elapsedMs);
}

function effectiveDropInterval() {
  return slowRemainingMs > 0 ? dropInterval * SLOW_DROP_FACTOR : dropInterval;
}

function saveUndoSnapshot() {
  undoSnapshot = JSON.parse(JSON.stringify({
    board, current, next, pieceQueue, score, lines, level, dropInterval,
    comboCount, isBackToBackActive, isSingleRewardPending, piecesCreated,
    powerupPieceNumber, heldPiece, isHoldUsedThisPiece,
  }));
}

function undoLastPlacement() {
  if (!undoSnapshot) return false;
  ({
    board, current, next, pieceQueue, score, lines, level, dropInterval,
    comboCount, isBackToBackActive, isSingleRewardPending, piecesCreated,
    powerupPieceNumber, heldPiece, isHoldUsedThisPiece,
  } = undoSnapshot);
  undoSnapshot = null;
  dropAccum = 0;
  drawHold();
  drawNext();
  updateHUD();
  return true;
}

function reserveHoldForCurrentPiece() {
  if (!isHoldUsedThisPiece) return false;
  isHoldUsedThisPiece = false;
  drawHold();
  return true;
}

function drawEnergy() {
  energyFill.style.width = `${(energy / ENERGY_MAX) * 100}%`;
  skillHint.textContent = isEnergyFull() ? SKILL_HINT_TEXT : '';
}

function drawUpcomingPieces() {
  const upcomingCtx = upcomingCanvas.getContext('2d');
  upcomingCtx.clearRect(0, 0, upcomingCanvas.width, upcomingCanvas.height);
  upcomingCanvas.classList.toggle('hidden', !isUpcomingRevealed);
  if (!isUpcomingRevealed) return;
  const previewPieces = [next, ...pieceQueue].slice(0, PREVIEW_PIECE_COUNT);
  for (const [slotIndex, piece] of previewPieces.entries()) drawPieceInSlot(upcomingCtx, piece, slotIndex);
}

function drawPieceInSlot(context, piece, slotIndex) {
  const offsetCol = Math.floor((UPCOMING_GRID_SIZE - piece.shape[0].length) / 2);
  const offsetRow = Math.floor((UPCOMING_GRID_SIZE - piece.shape.length) / 2);
  const originX = (upcomingCanvas.width - UPCOMING_GRID_SIZE * UPCOMING_BLOCK_SIZE) / 2;
  context.save();
  context.translate(originX, slotIndex * UPCOMING_SLOT_HEIGHT);
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      drawBlock(context, offsetCol + c, offsetRow + r, piece.shape[r][c], UPCOMING_BLOCK_SIZE);
  context.restore();
}
