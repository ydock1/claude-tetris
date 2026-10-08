'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE_FILE_NAMES = ['hold.js', 'skills.js', 'challenge.js', 'skins.js', 'game.js'];
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
  const listenersByType = new Map();
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
      listenersByType.set(eventType, [...(listenersByType.get(eventType) ?? []), handler]);
    },
    dispatchEvent(event) {
      for (const handler of listenersByType.get(event.type) ?? []) handler(event);
    },
    click() {
      for (const handler of listenersByType.get('click') ?? []) handler({});
    },
    blur() {},
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
    pressKey: (code, { repeat = false } = {}) => {
      for (const handler of keyDownHandlers) handler({ code, repeat, preventDefault() {} });
    },
  };
}

function createFakeStorage(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));
  return {
    getItem: key => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
  };
}

function loadGame({ storage = createFakeStorage() } = {}) {
  let fakeNowMs = 0;
  const fakeDocument = createFakeDocument();
  const context = vm.createContext({
    document: fakeDocument,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    localStorage: storage,
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

module.exports = { loadGame, createFakeStorage, rowCells, fillCells, lockPieceWith };
