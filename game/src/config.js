// Ember Court — shared tuning numbers. One place for every rule constant so a
// balance change never has to hunt through the rules or the renderer.
export const MAX_HP = 30;
export const START_HAND = 4;
export const MAX_HAND = 7;
export const MAX_EMBER = 10;
export const DECK_SIZE = 30;
export const ADVANTAGE_MULTIPLIER = 1.5;
export const BEST_KEY = 'ember-court-best';
export const WINS_KEY = 'ember-court-wins';

// Ember refills one step higher each round, up to MAX_EMBER.
export function emberForTurn(turn) {
  return Math.min(MAX_EMBER, turn);
}
