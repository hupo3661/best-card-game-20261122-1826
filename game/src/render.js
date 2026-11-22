// Ember Court — the table. Everything the player sees is plain DOM: the
// renderer builds card faces, health bars, ember pips, sigils and the log
// from the state, and plays the visible part of each event (a card sliding
// to the middle, a damage number floating up, a shake on a heavy hit).
// It never touches the rules; main.js owns input and the turn flow.
import { MAX_HP } from './config.js';
import { ELEMENTS, cardById, elementBeats } from './cards.js';
import { SIDE_PLAYER, SIDE_RIVAL } from './world.js';
import { playCardSound, playClick, playDamageSound, playHealSound, playLoseSound, playTurnSound, playWinSound } from './sound.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const ICONS = {
  flame: '<svg viewBox="0 0 24 24"><path d="M12 2c1.2 3.2-2.2 4.6-2.2 7.4 0 1 .6 1.9 1.6 1.9-.9.4-2.4-.6-2.4-2.3C7.2 10.6 6 12.4 6 14.4a6 6 0 0 0 12 0c0-4.2-3.2-6.4-6-12.4z"/></svg>',
  tide: '<svg viewBox="0 0 24 24"><path d="M12 2S5 11 5 15a7 7 0 0 0 14 0C19 11 12 2 12 2z"/></svg>',
  thorn: '<svg viewBox="0 0 24 24"><path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z"/><path d="M4 20C8 14 12 10 18 6" fill="none" stroke="#fff" stroke-width="1.4"/></svg>',
  stone: '<svg viewBox="0 0 24 24"><path d="M2.5 20L10 5l4.2 7.4L17 8l4.5 12z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>',
};

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function elementIcon(element) {
  return `<span class="element-icon element-${element}">${ICONS[element]}</span>`;
}

function emberPips(current, max) {
  let pips = '';
  for (let index = 0; index < max; index += 1) {
    pips += `<span class="pip${index < current ? ' lit' : ''}"></span>`;
  }
  return `<span class="pips" title="Ember ${current} of ${max}">${pips}</span>`;
}

function hpBar(side, person) {
  const percent = Math.max(0, Math.round((person.hp / MAX_HP) * 100));
  const low = person.hp <= 8 ? ' low' : '';
  return `<div class="hp-wrap">
    <div class="hp-bar${low}"><div class="hp-fill" style="width:${percent}%"></div></div>
    <div class="hp-text">${person.hp} / ${MAX_HP}${person.block > 0 ? ` &nbsp;·&nbsp; <span class="block-badge">${ICONS.shield} Block ${person.block}</span>` : ''}</div>
  </div>`;
}

function cardFace(id, options = {}) {
  const card = cardById(id);
  const element = ELEMENTS[card.element];
  const playable = options.playable === true;
  const advantage = options.advantage === true;
  const classes = ['card', `element-${card.element}`];
  if (playable) classes.push('playable');
  if (advantage) classes.push('advantage');
  if (options.dimmed) classes.push('dimmed');
  const effect = card.effect ? `<div class="card-effect">${card.text}</div>` : `<div class="card-effect">${card.text}</div>`;
  return `<div class="${classes.join(' ')}" data-card="${id}" data-index="${options.index ?? ''}" role="button" tabindex="0" aria-label="${card.name}, ${element.name}, cost ${card.cost}, attack ${card.attack}">
    <div class="card-top"><span class="cost-gem" title="Ember cost">${card.cost}</span><span class="card-element-icon element-${card.element}" title="${element.name}">${ICONS[card.element]}</span></div>
    <div class="card-art" style="background:${element.soft};color:${element.color}">${ICONS[card.element]}</div>
    <div class="card-name">${card.name}</div>
    ${effect}
    <div class="card-attack"><span class="attack-num">${card.attack}</span><span class="attack-label">attack</span>${advantage ? '<span class="adv-tag">Advantage!</span>' : ''}</div>
  </div>`;
}

function cardBack() {
  return `<div class="card card-back"><div class="back-sigil">${ICONS.flame}</div><div class="back-word">EMBER<br>COURT</div></div>`;
}

export function createRenderer(root) {
  const app = root.querySelector('#app');
  const rivalHandEl = root.querySelector('#rival-hand');
  const playerHandEl = root.querySelector('#player-hand');
  const rivalPanelEl = root.querySelector('#rival-panel');
  const playerPanelEl = root.querySelector('#player-panel');
  const logEl = root.querySelector('#log');
  const stageEl = root.querySelector('#stage');
  const overlayEl = root.querySelector('#overlay');
  const statusEl = root.querySelector('#status');
  const fxEl = root.querySelector('#fx');
  const roundEl = root.querySelector('#round-badge');
  const winsEl = root.querySelector('#wins-badge');
  let callbacks = {};
  let animating = false;

  function announce(message) {
    statusEl.textContent = message;
  }

  function floater(target, text, kind) {
    const rect = target.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const node = document.createElement('div');
    node.className = `floater ${kind}`;
    node.textContent = text;
    node.style.left = `${rect.left - appRect.left + rect.width / 2}px`;
    node.style.top = `${rect.top - appRect.top}px`;
    fxEl.appendChild(node);
    window.setTimeout(() => node.remove(), 1100);
  }

  function shake() {
    app.classList.remove('shake');
    void app.offsetWidth;
    app.classList.add('shake');
    window.setTimeout(() => app.classList.remove('shake'), 450);
  }

  function renderPanels(state) {
    const rival = state.rival;
    const player = state.player;
    rivalPanelEl.innerHTML = `
      <div class="portrait rival-portrait">${ICONS.flame}</div>
      <div class="panel-info">
        <div class="panel-name">Ashen Magistrate <span class="sigil-chip">Sigil ${elementIcon(rival.sigil)} ${ELEMENTS[rival.sigil].name}</span></div>
        ${hpBar(SIDE_RIVAL, rival)}
        <div class="ember-row"><span class="ember-label">Ember</span>${emberPips(rival.ember, Math.max(1, rival.ember))}</div>
      </div>`;
    playerPanelEl.innerHTML = `
      <div class="portrait player-portrait">${ICONS.thorn}</div>
      <div class="panel-info">
        <div class="panel-name">You — Ember Warden <span class="sigil-chip">Sigil ${elementIcon(player.sigil)} ${ELEMENTS[player.sigil].name}</span></div>
        ${hpBar(SIDE_PLAYER, player)}
        <div class="ember-row"><span class="ember-label">Ember</span>${emberPips(player.ember, Math.max(1, player.ember))}</div>
      </div>`;
    roundEl.textContent = `Round ${state.turn}`;
    logEl.innerHTML = state.log.map((line) => `<div class="log-line">${line}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderHands(state, screen) {
    rivalHandEl.innerHTML = '';
    for (let index = 0; index < state.rival.hand.length; index += 1) {
      const wrap = document.createElement('div');
      wrap.className = 'mini-back';
      wrap.innerHTML = cardBack();
      rivalHandEl.appendChild(wrap);
    }
    playerHandEl.innerHTML = '';
    const inPlay = screen === SCREEN_PLAY && state.phase === SIDE_PLAYER && !state.over && !animating;
    state.player.hand.forEach((id, index) => {
      const card = cardById(id);
      const playable = inPlay && card.cost <= state.player.ember;
      const advantage = elementBeats(card.element, state.rival.sigil);
      const wrap = document.createElement('div');
      wrap.className = 'hand-card';
      wrap.style.setProperty('--tilt', `${(index - (state.player.hand.length - 1) / 2) * 4}deg`);
      wrap.innerHTML = cardFace(id, { index, playable, advantage, dimmed: inPlay && !playable });
      const node = wrap.firstChild;
      node.addEventListener('click', () => callbacks.onPlayCard && callbacks.onPlayCard(index));
      node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          callbacks.onPlayCard && callbacks.onPlayCard(index);
        }
      });
      playerHandEl.appendChild(wrap);
    });
    const counts = root.querySelector('#deck-counts');
    counts.innerHTML = `<span>Your deck: ${state.player.deck.length} · discard: ${state.player.discard.length}</span>
      <span>Rival deck: ${state.rival.deck.length} · discard: ${state.rival.discard.length}</span>`;
  }

  function renderStage(state) {
    const playerSigil = ELEMENTS[state.player.sigil];
    const rivalSigil = ELEMENTS[state.rival.sigil];
    const beats = elementBeats(state.player.sigil, state.rival.sigil)
      ? 'Your sigil beats the Magistrate’s — your matching cards hit 50% harder.'
      : elementBeats(state.rival.sigil, state.player.sigil)
        ? 'The Magistrate’s sigil beats yours — watch for their matching cards.'
        : 'Sigils are even. Play a card to set yours.';
    const played = (side, label) => {
      const id = state.lastPlay[side];
      return `<div class="played-slot"><div class="played-label">${label}</div>
        ${id ? `<div class="mini-played">${cardFace(id, {})}</div>` : '<div class="played-empty">No card yet</div>'}</div>`;
    };
    stageEl.innerHTML = `
      <div class="played-row">${played('player', 'You played')}<div class="sigil-vs">VS</div>${played('rival', 'Magistrate played')}</div>
      <div class="sigil-duel">
        <div class="sigil-side"><span class="sigil-big">${ICONS[state.player.sigil]}</span><span>You: ${playerSigil.name}</span></div>
        <div class="sigil-vs">VS</div>
        <div class="sigil-side"><span class="sigil-big">${ICONS[state.rival.sigil]}</span><span>Rival: ${rivalSigil.name}</span></div>
      </div>
      <div class="sigil-note">${beats}</div>
      <div class="cycle-note">Flame &gt; Thorn &gt; Tide &gt; Flame · Stone stands apart</div>`;
  }

  function renderAll(state, screen) {
    renderPanels(state);
    renderHands(state, screen);
    renderStage(state);
  }

  function showTitle(best, mode = 'start') {
    overlayEl.classList.remove('hidden');
    overlayEl.innerHTML = `
      <div class="overlay-card title-card">
        <div class="title-flame">${ICONS.flame}</div>
        <h1>EMBER COURT</h1>
        <p class="tagline">A duel of cards, sigils and nerve. Outplay the Ashen Magistrate — first to 0 life loses.</p>
        <div class="how-to">
          <div><b>Play a card</b> — click it (or press 1–7). It costs ember; ember refills every round.</div>
          <div><b>Sigils</b> — the last card you played sets your sigil. A card that beats the rival sigil hits 50% harder.</div>
          <div><b>Block</b> absorbs damage. <b>Heal</b> mends life. <b>Draw</b> finds answers. <b>Pierce</b> ignores block.</div>
          <div><b>End Turn</b> (Space) — the Magistrate answers, then you draw and refill.</div>
        </div>
        <button class="big-button" id="start-button">${mode === 'resume' ? 'Back to the table' : 'Take your seat'}</button>
        ${best ? `<p class="best-line">Best win: ${best.rounds} rounds · Wins so far: ${best.wins}</p>` : ''}
        <p class="fine-print">30 life each · 30-card decks · first to 0 loses</p>
      </div>`;
    root.querySelector('#start-button').addEventListener('click', () => {
      playClick();
      if (mode === 'resume') hideOverlay();
      else callbacks.onStart && callbacks.onStart();
    });
  }

  function showOver(state, best) {
    const won = state.winner === SIDE_PLAYER;
    overlayEl.classList.remove('hidden');
    overlayEl.innerHTML = `
      <div class="overlay-card ${won ? 'win-card' : 'lose-card'}">
        <div class="title-flame">${won ? ICONS.flame : ICONS.stone}</div>
        <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
        <p class="tagline">${won ? 'The Ashen Magistrate falls. The Ember Court is yours.' : 'Your light goes out. The Magistrate keeps the court — for now.'}</p>
        <div class="stats-grid">
          <div><span class="stat-num">${state.stats.turns}</span><span class="stat-label">rounds</span></div>
          <div><span class="stat-num">${state.stats.damageDealt}</span><span class="stat-label">damage dealt</span></div>
          <div><span class="stat-num">${state.stats.cardsPlayed}</span><span class="stat-label">cards played</span></div>
          <div><span class="stat-num">${state.player.hp} / ${MAX_HP}</span><span class="stat-label">your life left</span></div>
        </div>
        <button class="big-button" id="again-button">Play again (R)</button>
        ${best ? `<p class="best-line">Best win: ${best.rounds} rounds · Wins so far: ${best.wins}</p>` : ''}
      </div>`;
    root.querySelector('#again-button').addEventListener('click', () => {
      playClick();
      callbacks.onRestart && callbacks.onRestart();
    });
  }

  function hideOverlay() {
    overlayEl.classList.add('hidden');
    overlayEl.innerHTML = '';
  }

  // Play a batch of events with visible pacing. The state is already updated
  // by the rules; this only shows what happened, in order, then re-renders.
  async function animateEvents(state, events) {
    animating = true;
    for (const event of events) {
      if (event.type === 'play') {
        playCardSound();
        stageEl.classList.add('flash');
        window.setTimeout(() => stageEl.classList.remove('flash'), 320);
        renderAll(state, SCREEN_PLAY);
        await sleep(320);
      } else if (event.type === 'damage') {
        const target = event.side === SIDE_PLAYER ? rivalPanelEl : playerPanelEl;
        const amount = event.amount + (event.absorbed ? ` (${event.absorbed} blocked)` : '');
        floater(target, `-${amount}`, 'damage');
        if (event.amount >= 5) shake();
        playDamageSound(event.amount >= 5);
        renderAll(state, SCREEN_PLAY);
        await sleep(340);
      } else if (event.type === 'block') {
        const target = event.side === SIDE_PLAYER ? playerPanelEl : rivalPanelEl;
        floater(target, `+${event.amount} block`, 'block');
        renderAll(state, SCREEN_PLAY);
        await sleep(220);
      } else if (event.type === 'heal') {
        if (event.amount > 0) {
          const target = event.side === SIDE_PLAYER ? playerPanelEl : rivalPanelEl;
          floater(target, `+${event.amount} life`, 'heal');
          playHealSound();
        }
        renderAll(state, SCREEN_PLAY);
        await sleep(220);
      } else if (event.type === 'draw' || event.type === 'ember') {
        renderAll(state, SCREEN_PLAY);
        await sleep(140);
      } else if (event.type === 'rival-turn') {
        announce('The Magistrate takes their turn.');
        await sleep(420);
      } else if (event.type === 'player-turn') {
        playTurnSound();
        announce(`Round ${event.turn}. Your move.`);
        renderAll(state, SCREEN_PLAY);
        await sleep(200);
      } else if (event.type === 'over') {
        renderAll(state, SCREEN_OVER);
        await sleep(500);
      }
    }
    animating = false;
    renderAll(state, state.over ? SCREEN_OVER : SCREEN_PLAY);
  }

  function bind(nextCallbacks) {
    callbacks = nextCallbacks;
    root.querySelector('#end-turn').addEventListener('click', () => callbacks.onEndTurn && callbacks.onEndTurn());
    root.querySelector('#restart-button').addEventListener('click', () => callbacks.onRestart && callbacks.onRestart());
    root.querySelector('#sound-button').addEventListener('click', (event) => {
      callbacks.onToggleSound && callbacks.onToggleSound();
      event.currentTarget.textContent = callbacks.soundLabel ? callbacks.soundLabel() : event.currentTarget.textContent;
    });
    root.querySelector('#help-button').addEventListener('click', () => callbacks.onHelp && callbacks.onHelp());
  }

  function setWins(count) {
    winsEl.style.display = count > 0 ? '' : 'none';
    winsEl.textContent = count > 0 ? `Wins ${count}` : '';
  }

  return {
    renderAll, renderPanels, renderHands, renderStage,
    showTitle, showOver, hideOverlay, animateEvents, bind, announce,
    setWins, isAnimating: () => animating,
  };
}
