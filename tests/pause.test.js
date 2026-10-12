'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./loadGame');

const LEVEL_INDEX = { timedLines: 0, presetBlocks: 2 };
const SELECTED_START_LEVEL = 7;

test('Escape abre el menú de pausa', () => {
  const game = loadGame();
  game.pressKey('Escape');
  assert.equal(game.read('paused'), true);
});

test('P abre el menú de pausa', () => {
  const game = loadGame();
  game.pressKey('KeyP');
  assert.equal(game.read('paused'), true);
});

test('Escape o P reanudan la partida', () => {
  const game = loadGame();
  game.pressKey('KeyP');
  game.pressKey('Escape');
  assert.equal(game.read('paused'), false);
});

test('mientras está pausado las teclas de juego no mueven la pieza', () => {
  const game = loadGame();
  game.pressKey('KeyP');
  const pieceColumnBefore = game.read('current.x');
  game.pressKey('ArrowLeft');
  game.pressKey('ArrowRight');
  game.pressKey('Space');
  assert.equal(game.read('current.x'), pieceColumnBefore);
  assert.equal(game.read('gameOver'), false);
});

test('reiniciar en juego libre empieza una partida nueva sin pausa', () => {
  const game = loadGame();
  game.run('score = 500; lines = 3;');
  game.pressKey('KeyP');
  game.run('restartCurrentRun();');
  assert.equal(game.read('score'), 0);
  assert.equal(game.read('lines'), 0);
  assert.equal(game.read('paused'), false);
});

test('reiniciar durante un desafío repite el mismo nivel', () => {
  const game = loadGame();
  game.run(`startChallengeLevel(${LEVEL_INDEX.presetBlocks});`);
  game.pressKey('KeyP');
  game.run('restartCurrentRun();');
  assert.equal(game.read('challengeLevelIndex'), LEVEL_INDEX.presetBlocks);
  assert.equal(game.read('paused'), false);
});

test('el nivel inicial elegido se aplica a la próxima partida libre', () => {
  const game = loadGame();
  game.run(`selectFreeGameStartLevel(${SELECTED_START_LEVEL}); restartCurrentRun();`);
  assert.equal(game.read('level'), SELECTED_START_LEVEL);
  assert.equal(game.read('freeGameStartLevel'), SELECTED_START_LEVEL);
});

test('el nivel inicial no cambia los desafíos', () => {
  const game = loadGame();
  game.run(`selectFreeGameStartLevel(${SELECTED_START_LEVEL}); startChallengeLevel(${LEVEL_INDEX.timedLines});`);
  assert.equal(game.read('level'), 1);
});

test('el menú de pausa no se abre desde el menú de niveles', () => {
  const game = loadGame();
  game.run('openLevelMenu();');
  game.pressKey('KeyP');
  assert.equal(game.read('paused'), false);
});
