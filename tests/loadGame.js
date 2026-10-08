'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE_FILE_NAMES = ['hold.js', 'skills.js', 'challenge.js', 'scores.js', 'game.js'];
const BOARD_COLUMN_COUNT = 10;

function createFakeContext() {
  const state = { globalAlpha: 1 };
  return new Proxy(state, {
    get: (target, property) => (property in target ? target[property] : () => ({ width: 0 })),
    set: (target, property, value) => {
      target[property] = value;
      return true;
    },
  });
}

function createFakeClassList() {
  const classNames = new Set();
  return {
    add: (...names) => names.forEach(name => classNames.add(name)),
    remove: (...names) => names.forEach(name => classNames.delete(name)),
    toggle: (name, force) => {
      const shouldHave = force ?? !classNames.has(name);
      if (shouldHave) classNames.add(name);
      else classNames.delete(name);
      return shouldHave;
    },
    contains: name => classNames.has(name),
  };
}

function createFakeElement() {
  const clickHandlers = [];
  return {
    textContent: '',
    width: 300,
    height: 600,
    dataset: {},
    classList: createFakeClassList(),
    style: {},
    replaceChildren() {},
    appendChild() {},
    setAttribute() {},
    addEventListener(eventType, handler) {
      if (eventType === 'click') clickHandlers.push(handler);
    },
    click() {
      for (const handler of clickHandlers) handler({});
    },
    blur() {},
    focus() {},
    value: '',
    getContext: () => createFakeContext(),
  };
}

function createFakeDocument() {
  const elementsById = new Map();
  const keyDownHandlers = [];
  return {
    documentElement: createFakeElement(),
    getElementById: id => {
      if (!elementsById.has(id)) elementsById.set(id, createFakeElement());
      return elementsById.get(id);
    },
    createElement: () => createFakeElement(),
    addEventListener(eventType, handler) {
      if (eventType === 'keydown') keyDownHandlers.push(handler);
    },
    pressKey: (code, { repeat = false, tagName } = {}) => {
      for (const handler of keyDownHandlers) handler({ code, repeat, target: { tagName }, preventDefault() {} });
    },
  };
}

function loadGame() {
  let fakeNowMs = 0;
  const fakeDocument = createFakeDocument();
  const storedTextByKey = new Map();
  const context = vm.createContext({
    document: fakeDocument,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    localStorage: {
      getItem: key => (storedTextByKey.has(key) ? storedTextByKey.get(key) : null),
      setItem: (key, value) => storedTextByKey.set(key, String(value)),
      removeItem: key => storedTextByKey.delete(key),
    },
    performance: { now: () => fakeNowMs },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
  });
  for (const fileName of SOURCE_FILE_NAMES) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8'), context);
  }
  vm.runInContext('startFreeGame();', context);

  return {
    run: source => vm.runInContext(source, context),
    pressKey: fakeDocument.pressKey,
    storage: storedTextByKey,
    read: expression => JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context)),
    setNowMs: milliseconds => {
      fakeNowMs = milliseconds;
    },
  };
}

function rowCells(row, openColumns = []) {
  return Array.from({ length: BOARD_COLUMN_COUNT }, (_, column) => column)
    .filter(column => !openColumns.includes(column))
    .map(column => [row, column]);
}

function fillCells(game, cells) {
  for (const [row, column] of cells) game.run(`board[${row}][${column}] = 1;`);
}

function lockPieceWith(game, { type, shape, x, y, isLastMoveRotation = false }) {
  game.run(`current = ${JSON.stringify({ type, shape, x, y, isLastMoveRotation })};`);
  game.run('lockPiece();');
}

module.exports = { loadGame, rowCells, fillCells, lockPieceWith };
