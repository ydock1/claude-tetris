'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const GAME_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
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

function createFakeElement() {
  return {
    textContent: '',
    width: 300,
    height: 600,
    dataset: {},
    classList: { add() {}, remove() {} },
    setAttribute() {},
    addEventListener() {},
    blur() {},
    getContext: () => createFakeContext(),
  };
}

function createFakeDocument() {
  const elementsById = new Map();
  return {
    documentElement: createFakeElement(),
    getElementById: id => {
      if (!elementsById.has(id)) elementsById.set(id, createFakeElement());
      return elementsById.get(id);
    },
    addEventListener() {},
  };
}

function loadGame() {
  let fakeNowMs = 0;
  const context = vm.createContext({
    document: createFakeDocument(),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    localStorage: { getItem: () => null, setItem() {} },
    performance: { now: () => fakeNowMs },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
  });
  vm.runInContext(GAME_SOURCE, context);

  return {
    run: source => vm.runInContext(source, context),
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
