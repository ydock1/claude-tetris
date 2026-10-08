'use strict';

const SCORE_STORAGE_KEY = 'tetris-scores';
const MAX_SCORE_ENTRIES = 5;
const MAX_PLAYER_NAME_LENGTH = 12;
const DEFAULT_PLAYER_NAME = 'JUGADOR';

function normalizePlayerName(rawName) {
  const trimmedName = String(rawName ?? '').trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  return trimmedName || DEFAULT_PLAYER_NAME;
}

function createScoreEntry({ name, score, lines, bestCombo }) {
  return { name: normalizePlayerName(name), score, lines, bestCombo };
}

function isValidScoreEntry(candidate) {
  return candidate !== null
    && typeof candidate === 'object'
    && typeof candidate.name === 'string'
    && Number.isFinite(candidate.score)
    && Number.isFinite(candidate.lines)
    && Number.isFinite(candidate.bestCombo);
}

function sortScoreEntries(entries) {
  return [...entries].sort((first, second) => second.score - first.score);
}

function insertScoreEntry(entries, newEntry) {
  return sortScoreEntries([...entries, newEntry]).slice(0, MAX_SCORE_ENTRIES);
}

function parseScoreEntries(rawText) {
  if (typeof rawText !== 'string') return [];
  let parsedValue;
  try {
    parsedValue = JSON.parse(rawText);
  } catch (error) {
    return [];
  }
  if (!Array.isArray(parsedValue)) return [];
  const validEntries = parsedValue.filter(isValidScoreEntry).map(entry => createScoreEntry(entry));
  return sortScoreEntries(validEntries).slice(0, MAX_SCORE_ENTRIES);
}

function loadScoreEntries() {
  try {
    return parseScoreEntries(localStorage.getItem(SCORE_STORAGE_KEY));
  } catch (error) {
    return [];
  }
}

function saveScoreEntries(entries) {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {}
}

function recordScoreEntry(newEntry) {
  const entries = insertScoreEntry(loadScoreEntries(), newEntry);
  saveScoreEntries(entries);
  return entries;
}

function resetScoreEntries() {
  try {
    localStorage.removeItem(SCORE_STORAGE_KEY);
  } catch (error) {}
}
