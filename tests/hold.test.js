'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, fillCells, lockPieceWith } = require('./loadGame');

const I_TYPE = 1;
const O_TYPE = 2;
const T_TYPE = 3;
const SINGLE_CELL_TYPE = 12;

function setCurrentAndNext(game, { currentType, nextType }) {
  game.run(`current = createPieceOfType(${currentType}); next = createPieceOfType(${nextType});`);
}

function lockSingleCell(game) {
  lockPieceWith(game, { type: SINGLE_CELL_TYPE, shape: [[12]], x: 0, y: 19 });
}

test('C envía la pieza actual al hold y entra la siguiente', () => {
  const game = loadGame();
  setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
  game.pressKey('KeyC');
  assert.equal(game.read('heldPiece.type'), I_TYPE);
  assert.equal(game.read('current.type'), T_TYPE);
});

test('Shift izquierdo y derecho también activan el hold', () => {
  for (const keyCode of ['ShiftLeft', 'ShiftRight']) {
    const game = loadGame();
    setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
    game.pressKey(keyCode);
    assert.equal(game.read('heldPiece.type'), I_TYPE, keyCode);
  }
});

test('con una pieza guardada, el hold intercambia y devuelve la guardada', () => {
  const game = loadGame();
  setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
  game.run('holdCurrentPiece();');
  game.run(`next = createPieceOfType(${O_TYPE});`);
  lockSingleCell(game);
  game.run('holdCurrentPiece();');
  assert.equal(game.read('current.type'), I_TYPE);
  assert.equal(game.read('heldPiece.type'), O_TYPE);
});

test('una segunda pulsación en la misma pieza no hace nada', () => {
  const game = loadGame();
  setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
  game.run('holdCurrentPiece();');
  game.run('holdCurrentPiece();');
  assert.equal(game.read('heldPiece.type'), I_TYPE);
  assert.equal(game.read('current.type'), T_TYPE);
});

test('el hold se desbloquea cuando la pieza se asienta', () => {
  const game = loadGame();
  setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
  game.run('holdCurrentPiece();');
  game.run(`next = createPieceOfType(${O_TYPE});`);
  lockSingleCell(game);
  assert.equal(game.read('isHoldUsedThisPiece'), false);
  game.run('holdCurrentPiece();');
  assert.equal(game.read('current.type'), I_TYPE);
  assert.equal(game.read('heldPiece.type'), O_TYPE);
});

test('la pieza devuelta vuelve a su posición de aparición', () => {
  const game = loadGame();
  game.run(`heldPiece = createPieceOfType(${I_TYPE});`);
  game.run(`current = createPieceOfType(${T_TYPE}); current.y = 10;`);
  game.run('holdCurrentPiece();');
  assert.equal(game.read('current.type'), I_TYPE);
  assert.equal(game.read('current.y'), 0);
});

test('el powerup viaja con la pieza al guardarla y al devolverla', () => {
  const game = loadGame();
  game.run(`current = createPieceOfType(${T_TYPE}); current.powerup = 'rayo';`);
  game.run(`next = createPieceOfType(${O_TYPE});`);
  game.run('holdCurrentPiece();');
  assert.equal(game.read('heldPiece.powerup'), 'rayo');
  lockSingleCell(game);
  game.run('holdCurrentPiece();');
  assert.equal(game.read('current.powerup'), 'rayo');
});

test('si la pieza devuelta no cabe al aparecer, la partida termina', () => {
  const game = loadGame();
  setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
  game.run(`heldPiece = createPieceOfType(${T_TYPE});`);
  fillCells(game, [[0, 5]]);
  game.run('holdCurrentPiece();');
  assert.equal(game.read('gameOver'), true);
});

test('el hold no actúa mientras el juego está en pausa', () => {
  const game = loadGame();
  setCurrentAndNext(game, { currentType: I_TYPE, nextType: T_TYPE });
  game.pressKey('KeyP');
  game.pressKey('KeyC');
  assert.equal(game.read('heldPiece'), null);
  assert.equal(game.read('current.type'), I_TYPE);
});
