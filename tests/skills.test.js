'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, rowCells, fillCells, lockPieceWith } = require('./loadGame');

const BOTTOM_ROW = 19;
const ROW_COUNT = 20;
const I_TYPE = 1;
const T_TYPE = 3;
const SINGLE_CELL_TYPE = 12;
const TETROMINO_TYPE_RANGE = { first: 1, last: 8 };

function clearOneLine(game) {
  fillCells(game, rowCells(BOTTOM_ROW, [0]));
  lockPieceWith(game, { type: SINGLE_CELL_TYPE, shape: [[12]], x: 0, y: BOTTOM_ROW });
}

function clearTetris(game) {
  for (const row of [16, 17, 18, 19]) fillCells(game, rowCells(row, [0]));
  lockPieceWith(game, { type: I_TYPE, shape: [[1], [1], [1], [1]], x: 0, y: 16 });
}

function setEnergy(game, energyValue) {
  game.run(`energy = ${energyValue};`);
}

test('cada línea limpiada suma 10 de energía', () => {
  const game = loadGame();
  clearOneLine(game);
  assert.equal(game.read('energy'), 10);
});

test('un Tetris suma 40 de energía', () => {
  const game = loadGame();
  clearTetris(game);
  assert.equal(game.read('energy'), 40);
});

test('la energía no supera el máximo de 100', () => {
  const game = loadGame();
  setEnergy(game, 90);
  clearTetris(game);
  assert.equal(game.read('energy'), 100);
});

test('una tecla de habilidad no hace nada con la energía sin llenar', () => {
  const game = loadGame();
  setEnergy(game, 50);
  game.pressKey('Digit1');
  assert.equal(game.read('isUpcomingRevealed'), false);
  assert.equal(game.read('energy'), 50);
});

test('ver siguientes 5 muestra cinco piezas y gasta la energía', () => {
  const game = loadGame();
  setEnergy(game, 100);
  game.pressKey('Digit1');
  assert.equal(game.read('isUpcomingRevealed'), true);
  assert.equal(game.read('[next, ...pieceQueue].length'), 5);
  assert.equal(game.read('energy'), 0);
});

test('cambiar pieza conserva posición y powerup y elige del pool de tetrominós', () => {
  const game = loadGame();
  game.run(`current = Object.assign(createPieceOfType(${T_TYPE}), { x: 2, y: 5, powerup: 'rayo' });`);
  setEnergy(game, 100);
  game.pressKey('Digit2');
  assert.equal(game.read('current.x'), 2);
  assert.equal(game.read('current.y'), 5);
  assert.equal(game.read('current.powerup'), 'rayo');
  const swappedType = game.read('current.type');
  assert.ok(swappedType >= TETROMINO_TYPE_RANGE.first && swappedType <= TETROMINO_TYPE_RANGE.last);
  assert.equal(game.read('energy'), 0);
});

test('cambiar pieza se rechaza si la nueva no cabe y no gasta energía', () => {
  const game = loadGame();
  for (let row = 0; row < ROW_COUNT; row++) fillCells(game, rowCells(row));
  setEnergy(game, 100);
  game.pressKey('Digit2');
  assert.equal(game.read('energy'), 100);
});

test('ralentizar duplica el intervalo de caída y vuelve tras 10 s', () => {
  const game = loadGame();
  setEnergy(game, 100);
  game.pressKey('Digit3');
  assert.equal(game.read('effectiveDropInterval()'), game.read('dropInterval') * 2);
  game.run('advanceSlowTimer(10000);');
  assert.equal(game.read('effectiveDropInterval()'), game.read('dropInterval'));
});

test('deshacer restaura el tablero y la pieza de la última colocación', () => {
  const game = loadGame();
  clearOneLine(game);
  assert.equal(game.read('lines'), 1);
  setEnergy(game, 100);
  game.pressKey('Digit4');
  assert.equal(game.read('lines'), 0);
  assert.equal(game.read('score'), 0);
  assert.equal(game.read('board[19].filter(cell => cell !== 0).length'), 9);
  assert.equal(game.read('current.type'), SINGLE_CELL_TYPE);
  assert.equal(game.read('energy'), 0);
});

test('deshacer sin colocación previa se rechaza y no gasta energía', () => {
  const game = loadGame();
  setEnergy(game, 100);
  game.pressKey('Digit4');
  assert.equal(game.read('energy'), 100);
});

test('reservar habilita un hold extra en la pieza actual', () => {
  const game = loadGame();
  game.pressKey('KeyC');
  setEnergy(game, 100);
  game.pressKey('Digit5');
  assert.equal(game.read('isHoldUsedThisPiece'), false);
  assert.equal(game.read('energy'), 0);
});

test('reservar sin hold usado en la pieza se rechaza', () => {
  const game = loadGame();
  setEnergy(game, 100);
  game.pressKey('Digit5');
  assert.equal(game.read('energy'), 100);
});
