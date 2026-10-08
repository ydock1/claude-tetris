'use strict';

let heldPiece = null;
let isHoldUsedThisPiece = false;

function createSpawnCopy(piece) {
  return Object.assign(createPieceOfType(piece.type), { powerup: piece.powerup });
}

function holdCurrentPiece() {
  if (isHoldUsedThisPiece) return;
  const previousHeldPiece = heldPiece;
  heldPiece = createSpawnCopy(current);
  isHoldUsedThisPiece = true;
  if (previousHeldPiece) {
    current = createSpawnCopy(previousHeldPiece);
    if (collide(current.shape, current.x, current.y)) endGame();
  } else {
    spawn();
  }
  drawHold();
}

function drawHold() {
  drawPiecePreview(holdCanvas, heldPiece);
  holdCanvas.classList.toggle('locked', isHoldUsedThisPiece);
}
