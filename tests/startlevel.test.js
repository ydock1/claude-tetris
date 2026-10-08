'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./loadGame');

const CHALLENGE_REVERSED_ROTATION_INDEX = 4;
const CHALLENGE_REVERSED_ROTATION_START_LEVEL = 5;

test('el juego libre empieza en el nivel 1 por defecto', () => {
  const game = loadGame();
  assert.equal(game.read('level'), 1);
});

test('reiniciar tras elegir nivel inicial empieza en ese nivel', () => {
  const game = loadGame();
  game.run('togglePause(); selectStartLevel(4); handleRestartClick();');
  assert.equal(game.read('level'), 4);
  assert.equal(game.read('dropInterval'), 730);
});

test('cambiar el nivel inicial en pausa no altera la partida en curso', () => {
  const game = loadGame();
  game.run('togglePause(); selectStartLevel(7); togglePause(); recordClearedLines(1);');
  assert.equal(game.read('level'), 1);
});

test('el nivel inicial elegido se mantiene en el siguiente juego libre', () => {
  const game = loadGame();
  game.run('selectStartLevel(3); startFreeGame();');
  assert.equal(game.read('level'), 3);
  assert.equal(game.read('selectedStartLevel'), 3);
});

test('el nivel sube al limpiar líneas desde el nivel elegido', () => {
  const game = loadGame();
  game.run('selectStartLevel(6); startFreeGame(); recordClearedLines(10);');
  assert.equal(game.read('level'), 7);
});

test('un desafío ignora el nivel inicial elegido', () => {
  const game = loadGame();
  game.run(`selectStartLevel(9); startChallengeLevel(${CHALLENGE_REVERSED_ROTATION_INDEX});`);
  assert.equal(game.read('level'), CHALLENGE_REVERSED_ROTATION_START_LEVEL);
  assert.equal(game.read('startingLevelNumber()'), CHALLENGE_REVERSED_ROTATION_START_LEVEL);
});

test('volver al juego libre tras un desafío usa el nivel elegido', () => {
  const game = loadGame();
  game.run(`selectStartLevel(9); startChallengeLevel(${CHALLENGE_REVERSED_ROTATION_INDEX}); startFreeGame();`);
  assert.equal(game.read('level'), 9);
});
