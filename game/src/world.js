// Ember Court — the rules, with no DOM in them. A game is a plain state object
// plus these functions, so the same code drives the browser table, the
// screenshot scenes and the headless soak tests. Everything random draws from
// the game's seeded source, so one seed always replays the same game.
//
// A duel: each side has 30 life, a hand, a deck, block that absorbs damage,
// ember that pays for cards, and a sigil — the element of the last card they
// played. A card whose element beats the opposing sigil deals 50% more
// damage. A turn is: draw one, refill ember, play what you can afford, then
// the rival answers. First side to 0 life loses.
import { ADVANTAGE_MULTIPLIER, DECK_SIZE, MAX_HAND, MAX_HP, START_HAND, emberForTurn } from './config.js';
import { buildDeck, cardById, elementBeats } from './cards.js';
import { createRandom } from './random.js';
import { chooseAiPlay } from './ai.js';

export const SIDE_PLAYER = 'player';
export const SIDE_RIVAL = 'rival';

function newSide(random) {
  return {
    hp: MAX_HP,
    block: 0,
    ember: 0,
    sigil: 'stone',
    deck: buildDeck(random),
    hand: [],
    discard: [],
  };
}

export function createGame(seed) {
  const random = createRandom(seed);
  const state = {
    seed,
    turn: 1,
    phase: 'player',
    over: false,
    winner: null,
    player: newSide(random),
    rival: newSide(random),
    log: [],
    lastPlay: { player: null, rival: null },
    stats: { turns: 1, damageDealt: 0, damageTaken: 0, cardsPlayed: 0, healed: 0, blocked: 0 },
    // The shuffle hook lives on the state so drawCards never needs the random
    // source passed around.
    randomShuffle: (list) => random.shuffle(list),
  };
  drawCards(state, SIDE_PLAYER, START_HAND);
  drawCards(state, SIDE_RIVAL, START_HAND);
  state.player.ember = emberForTurn(1);
  state.rival.ember = emberForTurn(1);
  pushLog(state, 'The court is seated. Your move — play a card, then End Turn.');
  return state;
}

function other(side) {
  return side === SIDE_PLAYER ? SIDE_RIVAL : SIDE_PLAYER;
}

function pushLog(state, text) {
  state.log.push(text);
  if (state.log.length > 8) state.log.shift();
}

export function drawCards(state, side, count) {
  const person = state[side];
  const drawn = [];
  for (let index = 0; index < count; index += 1) {
    if (person.deck.length === 0) {
      if (person.discard.length === 0) break;
      // The discard pile is shuffled back in; the deck never truly runs out.
      person.deck = state.randomShuffle(person.discard);
      person.discard = [];
    }
    const id = person.deck.pop();
    if (person.hand.length >= MAX_HAND) {
      person.discard.push(id);
      drawn.push({ id, burned: true });
    } else {
      person.hand.push(id);
      drawn.push({ id, burned: false });
    }
  }
  return drawn;
}

export function playableIndexes(state, side) {
  const person = state[side];
  const indexes = [];
  person.hand.forEach((id, index) => {
    if (cardById(id).cost <= person.ember) indexes.push(index);
  });
  return indexes;
}

function dealDamage(state, attackerSide, defenderSide, raw, pierce) {
  const defender = state[defenderSide];
  let remaining = raw;
  let absorbed = 0;
  if (!pierce && defender.block > 0) {
    absorbed = Math.min(defender.block, remaining);
    defender.block -= absorbed;
    remaining -= absorbed;
  }
  defender.hp = Math.max(0, defender.hp - remaining);
  return { dealt: remaining, absorbed };
}

// Play the card at handIndex for side. Returns the events the renderer (or a
// test) reads: one entry per visible thing that happened. A play that cannot
// happen returns an empty list and changes nothing.
export function playCard(state, side, handIndex) {
  if (state.over || state.phase !== side) return [];
  const person = state[side];
  const foe = state[other(side)];
  const id = person.hand[handIndex];
  if (id === undefined) return [];
  const card = cardById(id);
  if (card.cost > person.ember) return [];
  person.hand.splice(handIndex, 1);
  person.ember -= card.cost;
  person.discard.push(id);
  state.lastPlay[side] = id;
  state.stats.cardsPlayed += 1;

  const events = [{ type: 'play', side, card: id }];
  const advantage = elementBeats(card.element, foe.sigil);
  let damage = card.attack;
  let hits = 1;
  if (card.effect && card.effect.kind === 'double') hits = 2;
  if (advantage) damage = Math.round(damage * ADVANTAGE_MULTIPLIER);
  person.sigil = card.element;

  for (let hit = 0; hit < hits; hit += 1) {
    if (card.attack > 0) {
      const result = dealDamage(state, side, other(side), damage, card.effect && card.effect.kind === 'pierce');
      if (side === SIDE_PLAYER) state.stats.damageDealt += result.dealt;
      else state.stats.damageTaken += result.dealt;
      state.stats.blocked += result.absorbed;
      events.push({
        type: 'damage', side, card: id, amount: result.dealt, absorbed: result.absorbed,
        advantage, pierce: Boolean(card.effect && card.effect.kind === 'pierce'), hit: hit + 1, of: hits,
      });
    }
  }
  if (card.effect) {
    if (card.effect.kind === 'shield') {
      person.block += card.effect.value;
      events.push({ type: 'block', side, card: id, amount: card.effect.value });
    } else if (card.effect.kind === 'heal') {
      const healed = Math.min(card.effect.value, MAX_HP - person.hp);
      person.hp += healed;
      state.stats.healed += side === SIDE_PLAYER ? healed : 0;
      events.push({ type: 'heal', side, card: id, amount: healed });
    } else if (card.effect.kind === 'draw') {
      const drawn = drawCards(state, side, card.effect.value);
      events.push({ type: 'draw', side, card: id, drawn });
    } else if (card.effect.kind === 'ember') {
      person.ember += card.effect.value;
      events.push({ type: 'ember', side, card: id, amount: card.effect.value });
    }
  }
  pushLog(state, describePlay(state, side, card, advantage, events));
  if (foe.hp <= 0) {
    state.over = true;
    state.winner = side;
    events.push({ type: 'over', winner: side });
    pushLog(state, side === SIDE_PLAYER ? 'The Magistrate falls. The court is yours!' : 'Your light goes out. The Magistrate keeps the court.');
  }
  return events;
}

function describePlay(state, side, card, advantage, events) {
  const who = side === SIDE_PLAYER ? 'You play' : 'The Magistrate plays';
  const damage = events.filter((event) => event.type === 'damage');
  const total = damage.reduce((sum, event) => sum + event.amount, 0);
  let line = `${who} ${card.name}`;
  if (total > 0) line += ` for ${total} damage${advantage ? ' — sigil advantage!' : ''}`;
  const block = events.find((event) => event.type === 'block');
  if (block) line += `, +${block.amount} block`;
  const heal = events.find((event) => event.type === 'heal');
  if (heal && heal.amount > 0) line += `, heal ${heal.amount}`;
  const draw = events.find((event) => event.type === 'draw');
  if (draw) line += `, draw ${draw.drawn.length}`;
  return `${line}.`;
}

// End the player's turn: the rival draws, refills and answers with its own
// plays, then the next round begins. Returns every event in order.
export function endTurn(state) {
  if (state.over || state.phase !== SIDE_PLAYER) return [];
  state.phase = SIDE_RIVAL;
  const events = [{ type: 'rival-turn' }];
  const rival = state.rival;
  rival.ember = emberForTurn(state.turn);
  const drawn = drawCards(state, SIDE_RIVAL, 1);
  if (drawn.length > 0) events.push({ type: 'draw', side: SIDE_RIVAL, drawn });
  // The rival answers one card at a time: each play shifts its hand, so the
  // choice is remade after every card. The guard caps the loop well above
  // any hand's size.
  for (let guard = 0; guard < 10; guard += 1) {
    if (state.over) break;
    const handIndex = chooseAiPlay(state);
    if (handIndex < 0) break;
    events.push(...playCard(state, SIDE_RIVAL, handIndex));
  }
  if (state.over) return events;
  state.turn += 1;
  state.stats.turns = state.turn;
  state.phase = SIDE_PLAYER;
  const player = state.player;
  player.ember = emberForTurn(state.turn);
  const playerDrawn = drawCards(state, SIDE_PLAYER, 1);
  events.push({ type: 'player-turn', turn: state.turn });
  if (playerDrawn.length > 0) events.push({ type: 'draw', side: SIDE_PLAYER, drawn: playerDrawn });
  pushLog(state, `Round ${state.turn}. You draw a card and refill to ${player.ember} ember.`);
  return events;
}

export function deckCount(state, side) {
  return state[side].deck.length;
}

export function isGameOver(state) {
  return state.over;
}
