'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, createFakeStorage } = require('./loadGame');

const SKIN_NAMES = ['retro', 'neon', 'pastel', 'pixel'];
const STORAGE_KEY = 'tetris-skin';

function switchSkinWithSelect(game, skinName) {
  game.run(`skinSelect.value = '${skinName}'; skinSelect.dispatchEvent({ type: 'change' });`);
}

test('el registro ofrece los cuatro estilos con retro como primero', () => {
  const game = loadGame();
  assert.deepEqual(game.read('SKIN_REGISTRY.map(skin => skin.name)'), SKIN_NAMES);
});

test('buscar un estilo por nombre devuelve su etiqueta', () => {
  const game = loadGame();
  assert.equal(game.read("findSkinByName('neon').label"), 'Neón');
});

test('un nombre desconocido cae en retro', () => {
  const game = loadGame();
  assert.equal(game.read("findSkinByName('inexistente').name"), 'retro');
});

test('sin estilo guardado arranca en retro', () => {
  const game = loadGame();
  assert.equal(game.read('activeSkin.name'), 'retro');
  assert.equal(game.read('document.documentElement.dataset.skin'), 'retro');
  assert.equal(game.read('skinSelect.value'), 'retro');
});

test('arranca con el estilo guardado en localStorage', () => {
  const game = loadGame({ storage: createFakeStorage({ [STORAGE_KEY]: 'pixel' }) });
  assert.equal(game.read('activeSkin.name'), 'pixel');
  assert.equal(game.read('skinSelect.value'), 'pixel');
});

test('un valor guardado corrupto vuelve a retro', () => {
  const game = loadGame({ storage: createFakeStorage({ [STORAGE_KEY]: '{"no":"valido"}' }) });
  assert.equal(game.read('activeSkin.name'), 'retro');
  assert.equal(game.read('skinSelect.value'), 'retro');
});

test('si localStorage falla al leer se usa retro sin lanzar error', () => {
  const failingStorage = {
    getItem() { throw new Error('acceso denegado'); },
    setItem() { throw new Error('acceso denegado'); },
  };
  const game = loadGame({ storage: failingStorage });
  assert.equal(game.read('activeSkin.name'), 'retro');
});

test('cambiar el selector aplica el estilo sin recargar y lo guarda', () => {
  const game = loadGame({ storage: createFakeStorage() });
  switchSkinWithSelect(game, 'neon');
  assert.equal(game.read('activeSkin.name'), 'neon');
  assert.equal(game.read('document.documentElement.dataset.skin'), 'neon');
  assert.equal(game.read('activeSkin.palette[1]'), '#00f0ff');
  assert.equal(game.read(`localStorage.getItem('${STORAGE_KEY}')`), 'neon');
});

test('el estilo elegido se recuerda en la siguiente carga', () => {
  const storage = createFakeStorage();
  switchSkinWithSelect(loadGame({ storage }), 'pastel');
  const reloadedGame = loadGame({ storage });
  assert.equal(reloadedGame.read('activeSkin.name'), 'pastel');
});

test('volver a retro restaura la paleta de tema', () => {
  const game = loadGame();
  switchSkinWithSelect(game, 'pixel');
  switchSkinWithSelect(game, 'retro');
  assert.equal(game.read('activeSkin.palette'), null);
});

test('cambiar a cada estilo redibuja sin errores', () => {
  const game = loadGame();
  for (const skinName of SKIN_NAMES) switchSkinWithSelect(game, skinName);
  assert.equal(game.read('activeSkin.name'), SKIN_NAMES.at(-1));
});

test('el estilo cambia aunque no se pueda guardar', () => {
  const storage = { getItem: () => null, setItem() { throw new Error('cuota llena'); } };
  const game = loadGame({ storage });
  switchSkinWithSelect(game, 'neon');
  assert.equal(game.read('activeSkin.name'), 'neon');
});
