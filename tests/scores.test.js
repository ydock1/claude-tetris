'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./loadGame');

const STORAGE_KEY = 'tetris-scores';

function recordScores(game, scores) {
  for (const score of scores)
    game.run(`recordScoreEntry(createScoreEntry({ name: 'P${score}', score: ${score}, lines: 1, bestCombo: 0 }));`);
}

test('la tabla guarda como máximo cinco récords ordenados por puntos', () => {
  const game = loadGame();
  recordScores(game, [300, 100, 500, 200, 400, 50]);
  assert.deepEqual(game.read('loadScoreEntries().map(entry => entry.score)'), [500, 400, 300, 200, 100]);
});

test('una puntuación que no entra en el top 5 no aparece en la tabla', () => {
  const game = loadGame();
  recordScores(game, [500, 400, 300, 200, 100]);
  game.run(`recordedScoreEntry = createScoreEntry({ name: 'LOW', score: 90, lines: 0, bestCombo: 0 });`);
  assert.equal(game.read('insertScoreEntry(loadScoreEntries(), recordedScoreEntry).includes(recordedScoreEntry)'), false);
});

test('un empate con el quinto puesto no desplaza al récord existente', () => {
  const game = loadGame();
  recordScores(game, [500, 400, 300, 200, 100]);
  assert.equal(game.read(`insertScoreEntry(loadScoreEntries(), createScoreEntry({ name: 'TIE', score: 100, lines: 0, bestCombo: 0 })).map(entry => entry.name)`).at(-1), 'P100');
});

test('terminar una partida libre registra puntos, líneas y mejor combo y resalta el récord', () => {
  const game = loadGame();
  game.run('score = 1234; lines = 7; bestComboCount = 4; endGame();');
  assert.deepEqual(game.read('loadScoreEntries()[0]'), { name: 'JUGADOR', score: 1234, lines: 7, bestCombo: 4 });
  assert.equal(game.read('recordedScoreEntries.indexOf(recordedScoreEntry)'), 0);
});

test('el mejor combo se conserva aunque la racha se corte', () => {
  const game = loadGame();
  game.run('rewardClear(1, false); rewardClear(1, false); rewardClear(1, false); rewardClear(0, false);');
  assert.equal(game.read('comboCount'), 0);
  assert.equal(game.read('bestComboCount'), 3);
});

test('deshacer una colocación también revierte el mejor combo', () => {
  const game = loadGame();
  game.run('saveUndoSnapshot(); rewardClear(1, false);');
  assert.equal(game.read('bestComboCount'), 1);
  assert.equal(game.read('undoLastPlacement()'), true);
  assert.equal(game.read('bestComboCount'), 0);
});

test('resetear los récords borra la clave guardada', () => {
  const game = loadGame();
  recordScores(game, [300, 100]);
  assert.equal(game.storage.has(STORAGE_KEY), true);
  game.run('resetScoreEntries();');
  assert.equal(game.storage.has(STORAGE_KEY), false);
  assert.deepEqual(game.read('loadScoreEntries()'), []);
});

test('un almacenamiento corrupto se trata como tabla vacía', () => {
  const game = loadGame();
  game.storage.set(STORAGE_KEY, '{no es json');
  assert.deepEqual(game.read('loadScoreEntries()'), []);
  game.storage.set(STORAGE_KEY, '{"name":"X"}');
  assert.deepEqual(game.read('loadScoreEntries()'), []);
});

test('las entradas inválidas guardadas se descartan', () => {
  const game = loadGame();
  game.storage.set(STORAGE_KEY, JSON.stringify([
    { name: 'MAL', score: '10', lines: 1, bestCombo: 0 },
    null,
    { name: 'OK', score: 50, lines: 2, bestCombo: 1 },
  ]));
  assert.deepEqual(game.read('loadScoreEntries()'), [{ name: 'OK', score: 50, lines: 2, bestCombo: 1 }]);
});

test('el nombre vacío usa un valor por defecto y se recorta a 12 caracteres', () => {
  const game = loadGame();
  assert.equal(game.read(`normalizePlayerName('   ')`), 'JUGADOR');
  assert.equal(game.read(`normalizePlayerName('ABCDEFGHIJKLMNOP')`), 'ABCDEFGHIJKL');
});

test('las teclas escritas en el campo de nombre no actúan como teclas de juego', () => {
  const game = loadGame();
  game.pressKey('KeyP', { tagName: 'INPUT' });
  assert.equal(game.read('paused'), false);
  game.pressKey('KeyP', { tagName: 'BUTTON' });
  assert.equal(game.read('paused'), true);
});
