// Ember Court — boot and the one flow: title, play, over. Input is mouse and
// keyboard (1–7 plays a card, Space ends the turn, R restarts, M mutes).
// The rival's turn is animated event by event; input locks while it plays.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages
// that scene instead of running the game, paints it and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, WINS_KEY } from './config.js';
import { createGame, endTurn, playCard } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { isMuted, playClick, playLoseSound, playWinSound, setMuted } from './sound.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const renderer = createRenderer(document);
let state = createGame(seed);
let screen = SCREEN_TITLE;

function readBest() {
  try {
    const rounds = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '', 10);
    const wins = Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? '0', 10) || 0;
    if (!Number.isInteger(rounds)) return wins > 0 ? { rounds: 0, wins } : null;
    return { rounds, wins };
  } catch {
    return null;
  }
}

function saveWin() {
  try {
    const wins = (Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? '0', 10) || 0) + 1;
    window.localStorage.setItem(WINS_KEY, String(wins));
    const best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '', 10);
    if (!Number.isInteger(best) || state.stats.turns < best) {
      window.localStorage.setItem(BEST_KEY, String(state.stats.turns));
    }
    return readBest();
  } catch {
    return readBest();
  }
}

function showTitle() {
  screen = SCREEN_TITLE;
  renderer.renderAll(state, SCREEN_TITLE);
  renderer.showTitle(readBest());
  renderer.announce('Ember Court. Press Enter or click Take your seat to play.');
}

function startGame() {
  state = createGame(Math.floor(Math.random() * 4294967296));
  screen = SCREEN_PLAY;
  renderer.hideOverlay();
  renderer.renderAll(state, SCREEN_PLAY);
  renderer.setWins(readBest()?.wins ?? 0);
  renderer.announce(`Round 1. Your move — ${state.player.hand.length} cards in hand.`);
}

async function finishGame() {
  screen = SCREEN_OVER;
  let best = readBest();
  if (state.winner === 'player') {
    playWinSound();
    best = saveWin();
  } else {
    playLoseSound();
  }
  renderer.setWins(best?.wins ?? 0);
  renderer.showOver(state, best);
  renderer.announce(state.winner === 'player'
    ? `Victory in ${state.stats.turns} rounds.`
    : `Defeat in ${state.stats.turns} rounds.`);
}

async function onPlayCard(index) {
  if (screen !== SCREEN_PLAY || state.over || state.phase !== 'player') return;
  if (renderer.isAnimating()) return;
  const events = playCard(state, 'player', index);
  if (events.length === 0) return;
  await renderer.animateEvents(state, events);
  if (state.over) await finishGame();
}

async function onEndTurn() {
  if (screen !== SCREEN_PLAY || state.over || state.phase !== 'player') return;
  if (renderer.isAnimating()) return;
  playClick();
  const events = endTurn(state);
  await renderer.animateEvents(state, events);
  if (state.over) await finishGame();
}

function onRestart() {
  startGame();
}

function onToggleSound() {
  setMuted(!isMuted());
}

function soundLabel() {
  return isMuted() ? 'Sound: off' : 'Sound: on';
}

function onHelp() {
  if (screen !== SCREEN_PLAY) return;
  renderer.showTitle(readBest(), 'resume');
}

function runShot(name) {
  document.body.classList.add('shot-mode');
  const scene = stageShot(name, state, seed);
  screen = scene.screen;
  renderer.renderAll(state, screen);
  if (screen === SCREEN_TITLE) renderer.showTitle(readBest());
  else if (screen === SCREEN_OVER) renderer.showOver(state, readBest());
  let painted = 0;
  function paint() {
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  renderer.bind({
    onPlayCard, onEndTurn, onRestart, onToggleSound, onHelp, soundLabel,
    onStart: startGame,
  });
  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (screen === SCREEN_TITLE && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      startGame();
      return;
    }
    if (screen === SCREEN_OVER && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (event.key >= '1' && event.key <= '7') {
      void onPlayCard(Number.parseInt(event.key, 10) - 1);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      void onEndTurn();
    } else if (event.key === 'm' || event.key === 'M') {
      onToggleSound();
      document.querySelector('#sound-button').textContent = soundLabel();
    } else if (event.key === 'h' || event.key === 'H') {
      onHelp();
    }
  });
  renderer.setWins(readBest()?.wins ?? 0);
  showTitle();
}

if (shot) runShot(shot);
else runGame();
