'use strict';

const FREE_GAME_START_LEVEL_MAX = 10;

const pauseMenuEl = document.getElementById('pause-menu');
const pauseMainEl = document.getElementById('pause-main');
const pauseControlsEl = document.getElementById('pause-controls');
const startLevelOptionsEl = document.getElementById('start-level-options');

function onButtonPress(button, action) {
  button.addEventListener('click', () => {
    action();
    button.blur(); // evita que Space/Enter reactiven el botón durante el juego
  });
}

function togglePause() {
  if (gameOver || isMenuOpen) return;
  if (paused) resumeGame();
  else openPauseMenu();
}

function openPauseMenu() {
  paused = true;
  cancelAnimationFrame(animId);
  showControlsView(false);
  pauseMenuEl.classList.remove('hidden');
}

function resumeGame() {
  paused = false;
  pauseMenuEl.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function restartCurrentRun() {
  if (activeChallengeLevel()) startChallengeLevel(challengeLevelIndex);
  else startFreeGame();
}

function showControlsView(isVisible) {
  pauseMainEl.classList.toggle('hidden', isVisible);
  pauseControlsEl.classList.toggle('hidden', !isVisible);
}

function selectFreeGameStartLevel(levelNumber) {
  freeGameStartLevel = levelNumber;
  renderStartLevelOptions();
}

function renderStartLevelOptions() {
  startLevelOptionsEl.replaceChildren();
  for (let levelNumber = 1; levelNumber <= FREE_GAME_START_LEVEL_MAX; levelNumber++) {
    const levelButton = document.createElement('button');
    levelButton.type = 'button';
    levelButton.className = 'start-level-button';
    levelButton.textContent = levelNumber;
    levelButton.setAttribute('aria-pressed', String(levelNumber === freeGameStartLevel));
    levelButton.addEventListener('click', () => selectFreeGameStartLevel(levelNumber));
    startLevelOptionsEl.appendChild(levelButton);
  }
}

onButtonPress(document.getElementById('resume-btn'), resumeGame);
onButtonPress(document.getElementById('pause-restart-btn'), restartCurrentRun);
onButtonPress(document.getElementById('show-controls-btn'), () => showControlsView(true));
onButtonPress(document.getElementById('hide-controls-btn'), () => showControlsView(false));

renderStartLevelOptions();
