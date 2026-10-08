'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./loadGame');

const LEVEL_INDEX = {
  timedLines: 0,
  survival: 1,
  presetBlocks: 2,
  hiddenOnLanding: 3,
  reversedRotation: 4,
};
const T_SHAPE_JSON = '[[0,3,0],[3,3,3],[0,0,0]]';
const SINGLE_CELL_TYPE = 12;

function startLevel(game, levelIndex) {
  game.run(`startChallengeLevel(${levelIndex});`);
}

test('el juego libre no tiene nivel activo', () => {
  const game = loadGame();
  assert.equal(game.read('activeChallengeLevel()'), null);
});

test('el menú de niveles ignora las teclas de juego', () => {
  const game = loadGame();
  game.run('energy = 100; openLevelMenu();');
  game.pressKey('Digit1');
  assert.equal(game.read('isUpcomingRevealed'), false);
});

test('elegir un nivel cierra el menú', () => {
  const game = loadGame();
  game.run('openLevelMenu();');
  startLevel(game, LEVEL_INDEX.timedLines);
  assert.equal(game.read('isMenuOpen'), false);
});

test('el nivel 1 no se gana con 39 líneas', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  game.run('lines = 39; updateChallenge(16);');
  assert.equal(game.read('challengeOutcome'), null);
});

test('el nivel 1 se gana al llegar a 40 líneas', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  game.run('lines = 40; updateChallenge(16);');
  assert.equal(game.read('challengeOutcome'), 'won');
  assert.equal(game.read('gameOver'), true);
});

test('el nivel 1 se pierde cuando se agotan los 2 minutos', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  game.run('updateChallenge(120000);');
  assert.equal(game.read('challengeOutcome'), 'lost');
});

test('la basura sube una fila cada 10 s con un hueco', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.survival);
  game.run('updateChallenge(10000);');
  assert.equal(game.read('board[19].filter(cell => cell === 0).length'), 1);
  assert.equal(game.read('board[19].filter(cell => cell === 13).length'), 9);
});

test('sobrevivir 60 s gana el nivel 2', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.survival);
  game.run('updateChallenge(60000);');
  assert.equal(game.read('challengeOutcome'), 'won');
});

test('basura que empuja un bloque fuera del tablero termina el nivel 2', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.survival);
  game.run('board[0][0] = 1; updateChallenge(10000);');
  assert.equal(game.read('challengeOutcome'), 'lost');
});

test('el nivel 3 empieza con bloques fijos pre-colocados', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.presetBlocks);
  assert.deepEqual(game.read('board[19]'), [13, 13, 0, 0, 13, 13, 13, 13, 13, 13]);
  assert.deepEqual(game.read('board[18]'), [13, 13, 13, 13, 0, 0, 13, 13, 13, 13]);
});

test('el nivel 4 oculta la pieza cuando toca el suelo', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.hiddenOnLanding);
  game.run(`current = createPieceOfType(${SINGLE_CELL_TYPE});`);
  assert.equal(game.read('isPieceHiddenNow()'), false);
  game.run('current.y = 19;');
  assert.equal(game.read('isPieceHiddenNow()'), true);
});

test('el nivel 5 empieza en el nivel 5 con la velocidad correspondiente', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.reversedRotation);
  assert.equal(game.read('level'), 5);
  assert.equal(game.read('dropInterval'), 640);
});

test('el nivel 5 gira la pieza en sentido antihorario', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.reversedRotation);
  assert.deepEqual(
    game.read(`rotatePieceShape(${T_SHAPE_JSON})`),
    game.read(`rotateCounterClockwise(${T_SHAPE_JSON})`),
  );
});

test('en el nivel 1 la rotación es horaria', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  assert.deepEqual(
    game.read(`rotatePieceShape(${T_SHAPE_JSON})`),
    game.read(`rotateCW(${T_SHAPE_JSON})`),
  );
});

test('ganar un nivel desbloquea el siguiente', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  game.run('lines = 40; updateChallenge(16);');
  assert.equal(game.read('highestUnlockedLevelIndex'), 1);
});

test('reiniciar tras ganar pasa al siguiente nivel', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  game.run('lines = 40; updateChallenge(16);');
  game.run('handleRestartClick();');
  assert.equal(game.read('challengeLevelIndex'), LEVEL_INDEX.survival);
  assert.equal(game.read('gameOver'), false);
});

test('reiniciar tras perder repite el mismo nivel', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.timedLines);
  game.run('updateChallenge(120000); handleRestartClick();');
  assert.equal(game.read('challengeLevelIndex'), LEVEL_INDEX.timedLines);
  assert.equal(game.read('gameOver'), false);
});

test('reiniciar durante un nivel en curso repite el nivel', () => {
  const game = loadGame();
  startLevel(game, LEVEL_INDEX.presetBlocks);
  game.run('handleRestartClick();');
  assert.equal(game.read('challengeLevelIndex'), LEVEL_INDEX.presetBlocks);
});
