'use strict';

const SKIN_STORAGE_KEY = 'tetris-skin';
const RETRO_HIGHLIGHT_HEIGHT = 4;
const NEON_GLOW_BLUR_PX = 12;
const PASTEL_CORNER_RATIO = 0.22;
const PIXEL_GRID_DIVISIONS = 4;
const PIXEL_SHADE_COLOR = 'rgba(0, 0, 0, 0.22)';

const NEON_PALETTE = [null, '#00f0ff', '#fff200', '#d400ff', '#39ff14', '#ff2a6d', '#2d7dff',
  '#ff9f1c', '#ff4fd8', '#c6ff00', '#5b5bff', '#ff00aa', '#00ffa3', '#8a8a9a'];
const PASTEL_PALETTE = [null, '#a8e6f0', '#fff1a8', '#d8b8ee', '#b9e8c0', '#f6b8b8', '#bcd9f7',
  '#ffd6a5', '#f9c4da', '#e4f7b0', '#b8c4f7', '#eab8f7', '#b6f2e0', '#d0d0d8'];
const PIXEL_PALETTE = [null, '#2ec4b6', '#f4d35e', '#9b5de5', '#70c14b', '#e63946', '#457b9d',
  '#f77f00', '#e56b9f', '#b5e61d', '#3a5ba0', '#c77dff', '#17c3b2', '#8d99ae'];

function fillSquare({ context, left, top, side, color }) {
  context.fillStyle = color;
  context.fillRect(left, top, side, side);
}

function drawRetroBlock({ context, left, top, side, color, highlightColor }) {
  fillSquare({ context, left, top, side, color });
  context.fillStyle = highlightColor;
  context.fillRect(left, top, side, RETRO_HIGHLIGHT_HEIGHT);
}

function drawNeonBlock({ context, left, top, side, color }) {
  context.shadowColor = color;
  context.shadowBlur = NEON_GLOW_BLUR_PX;
  fillSquare({ context, left, top, side, color });
}

function drawPastelBlock({ context, left, top, side, color }) {
  const radius = side * PASTEL_CORNER_RATIO;
  context.beginPath();
  context.moveTo(left + radius, top);
  context.arcTo(left + side, top, left + side, top + side, radius);
  context.arcTo(left + side, top + side, left, top + side, radius);
  context.arcTo(left, top + side, left, top, radius);
  context.arcTo(left, top, left + side, top, radius);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function drawPixelBlock({ context, left, top, side, color }) {
  fillSquare({ context, left, top, side, color });
  const cellSide = side / PIXEL_GRID_DIVISIONS;
  context.fillStyle = PIXEL_SHADE_COLOR;
  for (let row = 0; row < PIXEL_GRID_DIVISIONS; row++)
    for (let column = 0; column < PIXEL_GRID_DIVISIONS; column++)
      if ((row + column) % 2 === 1)
        context.fillRect(left + column * cellSide, top + row * cellSide, cellSide, cellSide);
}

const SKIN_REGISTRY = [
  { name: 'retro', label: 'Retro', palette: null, drawBlockStyle: drawRetroBlock },
  { name: 'neon', label: 'Neón', palette: NEON_PALETTE, drawBlockStyle: drawNeonBlock },
  { name: 'pastel', label: 'Pastel', palette: PASTEL_PALETTE, drawBlockStyle: drawPastelBlock },
  { name: 'pixel', label: 'Pixel', palette: PIXEL_PALETTE, drawBlockStyle: drawPixelBlock },
];

const DEFAULT_SKIN = SKIN_REGISTRY[0];

function findSkinByName(skinName) {
  return SKIN_REGISTRY.find(skin => skin.name === skinName) ?? DEFAULT_SKIN;
}

function readStoredSkinName() {
  try {
    return localStorage.getItem(SKIN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function storeSkinName(skinName) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skinName);
  } catch (error) {}
}
