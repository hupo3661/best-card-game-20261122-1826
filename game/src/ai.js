// Ember Court — the rival's mind. A readable heuristic, not a search: it
// takes the lethal card when it has one, patches itself up when it is
// hurting, then spends its ember on the best damage it can buy. Because it
// follows rules the player can see — it heals when low, it spends big when
// it can kill — its choices can be read and countered, which is the point.
//
// chooseAiPlay returns the hand index the rival should play next, or -1 when
// it is done: nothing affordable, or nothing worth playing. One card at a
// time, because every play shifts the hand.
import { cardById, elementBeats } from './cards.js';
import { ADVANTAGE_MULTIPLIER } from './config.js';

function scoreCard(state, card) {
  const rival = state.rival;
  const player = state.player;
  let score = card.attack;
  if (elementBeats(card.element, player.sigil)) score *= ADVANTAGE_MULTIPLIER;
  if (card.effect && card.effect.kind === 'pierce') score += 1;
  // Damage per ember is the currency; a card that also heals, draws or
  // shields is worth more than its attack alone.
  let value = score / Math.max(1, card.cost);
  if (card.effect) {
    if (card.effect.kind === 'shield') value += card.effect.value / 4;
    if (card.effect.kind === 'heal') value += rival.hp <= 12 ? card.effect.value / 2 : card.effect.value / 6;
    if (card.effect.kind === 'draw') value += 0.8;
    if (card.effect.kind === 'ember') value += 0.6;
  }
  return value;
}

export function chooseAiPlay(state) {
  const rival = state.rival;
  const player = state.player;
  let bestIndex = -1;
  let bestValue = 0;
  rival.hand.forEach((id, index) => {
    const card = cardById(id);
    if (card.cost > rival.ember) return;
    // Lethal first, whatever it costs.
    const raw = card.attack * (elementBeats(card.element, player.sigil) ? ADVANTAGE_MULTIPLIER : 1);
    const throughBlock = card.effect && card.effect.kind === 'pierce' ? raw : Math.max(0, raw - player.block);
    if (throughBlock >= player.hp) {
      bestIndex = index;
      bestValue = Infinity;
      return;
    }
    // Hurt and holding a heal: patch up before attacking.
    if (rival.hp <= 10 && card.effect && card.effect.kind === 'heal' && bestValue !== Infinity) {
      const value = 10 + card.effect.value;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
      return;
    }
    if (bestValue === Infinity) return;
    const value = scoreCard(state, card);
    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  });
  return bestIndex;
}
