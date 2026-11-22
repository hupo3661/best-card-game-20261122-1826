// Ember Court — the screenshot scenes. Each one plays the real rules forward
// from a fresh game for a fixed seed, steered by a simple autopilot (play the
// best damage per ember, take lethal when it is there), so the frame is what
// a real game looks like and the same seed always gives the same frame.
// The win scene searches seeds until the autopilot wins; the loss scene
// searches until it loses. The search is quick — a few dozen simulated games.
import { cardById, elementBeats } from './cards.js';
import { ADVANTAGE_MULTIPLIER } from './config.js';
import { createGame, endTurn, playCard, playableIndexes } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** The autopilot's turn: play the best affordable card until none is left, then end the turn. */
export function autopilotTurn(state) {
  for (let guard = 0; guard < 10; guard += 1) {
    if (state.over) return;
    const playable = playableIndexes(state, 'player');
    if (playable.length === 0) break;
    let bestIndex = playable[0];
    let bestValue = -Infinity;
    for (const index of playable) {
      const card = cardById(state.player.hand[index]);
      let value = (card.attack * (elementBeats(card.element, state.rival.sigil) ? ADVANTAGE_MULTIPLIER : 1)) / Math.max(1, card.cost);
      if (card.effect) {
        if (card.effect.kind === 'draw') value += 0.7;
        if (card.effect.kind === 'heal' && state.player.hp <= 12) value += 1.5;
        if (card.effect.kind === 'shield') value += 0.4;
      }
      // Lethal outranks everything.
      const raw = card.attack * (elementBeats(card.element, state.rival.sigil) ? ADVANTAGE_MULTIPLIER : 1);
      const through = card.effect && card.effect.kind === 'pierce' ? raw : Math.max(0, raw - state.rival.block);
      if (through >= state.rival.hp) value = 1000 + value;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    }
    playCard(state, 'player', bestIndex);
  }
  if (!state.over) endTurn(state);
}

/** Play whole rounds of autopilot until the game ends or the round cap hits. Returns the state. */
export function simulateGame(seed, maxRounds = 40) {
  const state = createGame(seed);
  for (let round = 0; round < maxRounds && !state.over; round += 1) {
    autopilotTurn(state);
  }
  return state;
}

function findSeed(wantWinner, startSeed = 1, tries = 400) {
  for (let seed = startSeed; seed < startSeed + tries; seed += 1) {
    const state = simulateGame(seed);
    if (state.over && state.winner === wantWinner) return seed;
  }
  return null;
}

/**
 * Set `state` (already created) to the named scene and return the screen to
 * draw over it. Scenes: start (title), play (mid-game), win, loss.
 * `seedHint` is where the win/loss search starts, so a screenshot URL can
 * pin the exact frame.
 */
export function stageShot(name, state, seedHint = 1) {
  if (name === 'play') {
    const staged = simulateGame(15, 6);
    copyState(state, staged);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    const seed = findSeed('player', seedHint);
    const staged = seed === null ? simulateGame(seedHint) : simulateGame(seed);
    copyState(state, staged);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY };
  }
  if (name === 'loss') {
    const seed = findSeed('rival', seedHint);
    const staged = seed === null ? simulateGame(seedHint) : simulateGame(seed);
    copyState(state, staged);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}

// Replace the live state's contents with a simulated one, keeping the same object.
function copyState(target, source) {
  for (const key of Object.keys(source)) {
    if (key === 'randomShuffle') continue;
    target[key] = source[key];
  }
}
