'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, rowCells, fillCells, lockPieceWith } = require('./loadGame');

const SINGLE_CELL_TYPE = 12;
const T_TYPE = 3;
const I_TYPE = 1;
const T_SHAPE = [[0, 3, 0], [3, 3, 3], [0, 0, 0]];
const VERTICAL_I_SHAPE = [[1], [1], [1], [1]];

function lockSingleCellAt(game, column, row) {
  lockPieceWith(game, { type: SINGLE_CELL_TYPE, shape: [[12]], x: column, y: row });
}

const STRAY_CELL = [[0, 9]];

function fillRowExceptFirstColumn(game, row) {
  fillCells(game, rowCells(row, [0]));
}

function fillTetrisWell(game) {
  for (const row of [16, 17, 18, 19]) fillCells(game, rowCells(row, [0]));
}

function lockTetris(game) {
  fillCells(game, STRAY_CELL);
  fillTetrisWell(game);
  lockPieceWith(game, { type: I_TYPE, shape: VERTICAL_I_SHAPE, x: 0, y: 16 });
}

function lockSingleLine(game) {
  fillCells(game, STRAY_CELL);
  fillRowExceptFirstColumn(game, 19);
  lockSingleCellAt(game, 0, 19);
}

function fillTSpinPocket(game, { blockedCorners }) {
  fillCells(game, blockedCorners);
}

function lockTSpin(game, { isLastMoveRotation = true, blockedCorners, completesRow = false }) {
  fillTSpinPocket(game, { blockedCorners });
  if (completesRow) fillCells(game, rowCells(18, [3, 4, 5]));
  lockPieceWith(game, { type: T_TYPE, shape: T_SHAPE, x: 3, y: 17, isLastMoveRotation });
}

const THREE_CORNERS_BLOCKED = [[17, 3], [19, 3], [19, 5]];

test('una limpieza simple puntúa la base del nivel 1', () => {
  const game = loadGame();
  lockSingleLine(game);
  assert.equal(game.read('score'), 100);
  assert.equal(game.read('lines'), 1);
});

test('limpiar en turnos consecutivos multiplica por el combo', () => {
  const game = loadGame();
  lockSingleLine(game);
  lockSingleLine(game);
  assert.equal(game.read('score'), 300);
  assert.equal(game.read('comboCount'), 2);
});

test('un bloqueo sin limpiar reinicia el combo', () => {
  const game = loadGame();
  lockSingleLine(game);
  lockSingleCellAt(game, 5, 19);
  assert.equal(game.read('comboCount'), 0);
  lockSingleLine(game);
  assert.equal(game.read('score'), 200);
});

test('el nivel multiplica los puntos de la limpieza', () => {
  const game = loadGame();
  game.run('level = 2;');
  lockSingleLine(game);
  assert.equal(game.read('score'), 200);
});

test('T-spin sin líneas puntúa 400', () => {
  const game = loadGame();
  lockTSpin(game, { blockedCorners: THREE_CORNERS_BLOCKED });
  assert.equal(game.read('score'), 400);
});

test('T-spin con una línea puntúa 800', () => {
  const game = loadGame();
  lockTSpin(game, { blockedCorners: THREE_CORNERS_BLOCKED, completesRow: true });
  assert.equal(game.read('score'), 800);
  assert.equal(game.read('lines'), 1);
});

test('una pieza T sin rotación previa no cuenta como T-spin', () => {
  const game = loadGame();
  lockTSpin(game, { isLastMoveRotation: false, blockedCorners: THREE_CORNERS_BLOCKED });
  assert.equal(game.read('score'), 0);
});

test('un T-spin necesita al menos tres esquinas bloqueadas', () => {
  const game = loadGame();
  lockTSpin(game, { blockedCorners: [[19, 3], [19, 5]] });
  assert.equal(game.read('score'), 0);
});

test('un Tetris puntúa 800', () => {
  const game = loadGame();
  lockTetris(game);
  assert.equal(game.read('score'), 800);
  assert.equal(game.read('lines'), 4);
});

test('un segundo Tetris seguido activa el bonus B2B ×1.5 y el combo', () => {
  const game = loadGame();
  lockTetris(game);
  lockTetris(game);
  assert.equal(game.read('score'), 800 + 800 * 2 * 1.5);
});

test('una limpieza que no es Tetris corta el B2B', () => {
  const game = loadGame();
  lockTetris(game);
  lockSingleLine(game);
  lockTetris(game);
  assert.equal(game.read('score'), 800 + 100 * 2 + 800 * 3);
});

test('dejar el tablero vacío añade el bonus de Perfect Clear', () => {
  const game = loadGame();
  fillRowExceptFirstColumn(game, 19);
  lockSingleCellAt(game, 0, 19);
  assert.equal(game.read('score'), 100 + 1000);
});

test('la limpieza con tablero no vacío no añade Perfect Clear', () => {
  const game = loadGame();
  lockSingleLine(game);
  assert.equal(game.read('score'), 100);
});

test('los bonus muestran textos flotantes con su etiqueta', () => {
  const game = loadGame();
  lockTSpin(game, { blockedCorners: THREE_CORNERS_BLOCKED, completesRow: true });
  const labels = game.read('floatingTexts.map(text => text.label)');
  assert.ok(labels.includes('T-SPIN'));
});

test('el combo muestra su etiqueta desde la segunda limpieza', () => {
  const game = loadGame();
  lockSingleLine(game);
  lockSingleLine(game);
  const labels = game.read('floatingTexts.map(text => text.label)');
  assert.ok(labels.includes('COMBO x2'));
});
