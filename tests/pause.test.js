'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./loadGame');

const I_TYPE = 1;
const FIRST_CHALLENGE_INDEX = 0;
const THIRD_CHALLENGE_INDEX = 2;

function isElementHidden(game, elementName) {
  return game.read(`${elementName}.classList.contains('hidden')`);
}

function clickElement(game, elementName) {
  game.run(`${elementName}.click();`);
}

test('P y Escape pausan el juego y muestran el menú de pausa', () => {
  for (const keyCode of ['KeyP', 'Escape']) {
    const game = loadGame();
    game.pressKey(keyCode);
    assert.equal(game.read('paused'), true, keyCode);
    assert.equal(isElementHidden(game, 'overlay'), false, keyCode);
    assert.equal(isElementHidden(game, 'pauseMenuEl'), false, keyCode);
  }
});

test('P y Escape reanudan y ocultan el overlay de pausa', () => {
  for (const keyCode of ['KeyP', 'Escape']) {
    const game = loadGame();
    game.pressKey(keyCode);
    game.pressKey(keyCode);
    assert.equal(game.read('paused'), false, keyCode);
    assert.equal(isElementHidden(game, 'overlay'), true, keyCode);
    assert.equal(isElementHidden(game, 'pauseMenuEl'), true, keyCode);
  }
});

test('las repeticiones automáticas de P o Escape no cambian la pausa', () => {
  const game = loadGame();
  game.pressKey('Escape');
  game.pressKey('Escape', { repeat: true });
  game.pressKey('KeyP', { repeat: true });
  assert.equal(game.read('paused'), true);
});

test('el botón Reanudar reanuda y oculta el overlay', () => {
  const game = loadGame();
  game.pressKey('Escape');
  clickElement(game, 'resumeBtn');
  assert.equal(game.read('paused'), false);
  assert.equal(isElementHidden(game, 'overlay'), true);
});

test('con el menú de pausa abierto las teclas de juego están bloqueadas', () => {
  const game = loadGame();
  game.run(`current = createPieceOfType(${I_TYPE});`);
  const initialX = game.read('current.x');
  game.pressKey('KeyP');
  game.pressKey('ArrowLeft');
  game.pressKey('ArrowDown');
  assert.equal(game.read('current.x'), initialX);
  assert.equal(game.read('current.y'), 0);
});

test('Ver controles alterna la lista de controles dentro del menú', () => {
  const game = loadGame();
  game.pressKey('KeyP');
  assert.equal(isElementHidden(game, 'pauseControlsEl'), true);
  clickElement(game, 'controlsToggleBtn');
  assert.equal(isElementHidden(game, 'pauseControlsEl'), false);
  clickElement(game, 'controlsToggleBtn');
  assert.equal(isElementHidden(game, 'pauseControlsEl'), true);
});

test('al reanudar se cierra también la lista de controles', () => {
  const game = loadGame();
  game.pressKey('KeyP');
  clickElement(game, 'controlsToggleBtn');
  game.pressKey('KeyP');
  assert.equal(isElementHidden(game, 'pauseControlsEl'), true);
});

test('Reiniciar en modo libre empieza una partida nueva', () => {
  const game = loadGame();
  game.run('score = 500;');
  game.pressKey('KeyP');
  clickElement(game, 'restartBtn');
  assert.equal(game.read('paused'), false);
  assert.equal(game.read('score'), 0);
  assert.equal(game.read('challengeLevelIndex'), null);
  assert.equal(isElementHidden(game, 'overlay'), true);
});

test('Reiniciar en un desafío reinicia ese mismo nivel', () => {
  const game = loadGame();
  game.run(`startChallengeLevel(${THIRD_CHALLENGE_INDEX});`);
  game.run('lines = 3;');
  game.pressKey('KeyP');
  clickElement(game, 'restartBtn');
  assert.equal(game.read('paused'), false);
  assert.equal(game.read('challengeLevelIndex'), THIRD_CHALLENGE_INDEX);
  assert.equal(game.read('lines'), 0);
});

test('Escape no pausa mientras el menú de niveles está abierto', () => {
  const game = loadGame();
  game.run('openLevelMenu();');
  game.pressKey('Escape');
  assert.equal(game.read('paused'), false);
});

test('Escape no pausa cuando el desafío ya no está en curso', () => {
  const game = loadGame();
  game.run(`startChallengeLevel(${FIRST_CHALLENGE_INDEX});`);
  game.run('gameOver = true;');
  game.pressKey('Escape');
  assert.equal(game.read('paused'), false);
  assert.equal(game.read('gameOver'), true);
});
