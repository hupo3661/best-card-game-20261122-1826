// Ember Court — the cards. Every design is original to this game: four
// elements in a cycle (Flame beats Thorn, Thorn beats Tide, Tide beats
// Flame) and Stone, which stands outside the cycle and never gains or
// suffers the advantage bonus. A card's element matters because of the
// sigil rule: the element of the last card you played becomes your sigil,
// and a card whose element beats the opposing sigil deals 50% more damage.
//
// Effect kinds: shield (gain block), heal, draw, ember (gain ember now),
// pierce (damage ignores block), double (the hit lands twice).
export const ELEMENTS = {
  flame: { name: 'Flame', beats: 'thorn', color: '#d9481c', soft: '#fde8df', ink: '#7a1e05' },
  tide: { name: 'Tide', beats: 'flame', color: '#1d6fd9', soft: '#dfeefc', ink: '#0b3a75' },
  thorn: { name: 'Thorn', beats: 'tide', color: '#2e8b3a', soft: '#e2f4e4', ink: '#14501d' },
  stone: { name: 'Stone', beats: null, color: '#6b7280', soft: '#eceff1', ink: '#374151' },
};

export function elementBeats(attacker, defenderSigil) {
  if (!attacker || !defenderSigil) return false;
  return ELEMENTS[attacker].beats === defenderSigil;
}

// id, name, element, cost in ember, attack, effect, the line printed on the card.
export const CARD_POOL = [
  { id: 'spark-imp', name: 'Spark Imp', element: 'flame', cost: 1, attack: 2, effect: null, text: 'A quick bite of fire.', copies: 2 },
  { id: 'cinder-fox', name: 'Cinder Fox', element: 'flame', cost: 2, attack: 3, effect: null, text: 'It hunts in the ashes.', copies: 2 },
  { id: 'flame-lash', name: 'Flame Lash', element: 'flame', cost: 3, attack: 5, effect: null, text: 'A whip of open flame.', copies: 2 },
  { id: 'ember-trickster', name: 'Ember Trickster', element: 'flame', cost: 2, attack: 2, effect: { kind: 'ember', value: 1 }, text: '+1 ember.', copies: 1 },
  { id: 'phoenix-rise', name: 'Phoenix Rise', element: 'flame', cost: 5, attack: 8, effect: { kind: 'draw', value: 1 }, text: 'Draw a card.', copies: 1 },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', cost: 1, attack: 1, effect: { kind: 'draw', value: 1 }, text: 'Draw a card.', copies: 2 },
  { id: 'river-serpent', name: 'River Serpent', element: 'tide', cost: 2, attack: 3, effect: null, text: 'It coils under the table.', copies: 2 },
  { id: 'tidal-surge', name: 'Tidal Surge', element: 'tide', cost: 3, attack: 4, effect: { kind: 'pierce' }, text: 'Pierce: ignores block.', copies: 2 },
  { id: 'moonlit-heron', name: 'Moonlit Heron', element: 'tide', cost: 4, attack: 5, effect: { kind: 'draw', value: 1 }, text: 'Draw a card.', copies: 1 },
  { id: 'deep-leviathan', name: 'Deep Leviathan', element: 'tide', cost: 5, attack: 7, effect: { kind: 'heal', value: 3 }, text: 'Heal 3.', copies: 1 },
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: 'thorn', cost: 1, attack: 1, effect: { kind: 'shield', value: 3 }, text: 'Gain 3 block.', copies: 2 },
  { id: 'briar-wolf', name: 'Briar Wolf', element: 'thorn', cost: 2, attack: 3, effect: null, text: 'Teeth like green glass.', copies: 2 },
  { id: 'thornsnare', name: 'Thornsnare', element: 'thorn', cost: 3, attack: 4, effect: { kind: 'shield', value: 4 }, text: 'Gain 4 block.', copies: 2 },
  { id: 'elder-oak', name: 'Elder Oak', element: 'thorn', cost: 5, attack: 6, effect: { kind: 'heal', value: 5 }, text: 'Heal 5.', copies: 1 },
  { id: 'pebble-guard', name: 'Pebble Guard', element: 'stone', cost: 1, attack: 1, effect: { kind: 'shield', value: 4 }, text: 'Gain 4 block.', copies: 2 },
  { id: 'stone-sentinel', name: 'Stone Sentinel', element: 'stone', cost: 2, attack: 2, effect: { kind: 'shield', value: 5 }, text: 'Gain 5 block.', copies: 2 },
  { id: 'granite-golem', name: 'Granite Golem', element: 'stone', cost: 4, attack: 6, effect: null, text: 'It does not hurry. It does not stop.', copies: 2 },
  { id: 'mountain-heart', name: "Mountain's Heart", element: 'stone', cost: 5, attack: 5, effect: { kind: 'shield', value: 6 }, text: 'Gain 6 block.', copies: 1 },
];

export function cardById(id) {
  return CARD_POOL.find((card) => card.id === id);
}

// A fresh 30-card deck: one entry per copy, shuffled by the caller's random source.
export function buildDeck(random) {
  const deck = [];
  for (const card of CARD_POOL) {
    for (let copy = 0; copy < card.copies; copy += 1) deck.push(card.id);
  }
  return random.shuffle(deck);
}

export function describeEffect(card) {
  if (!card.effect) return '';
  if (card.effect.kind === 'pierce') return 'Pierce';
  return card.text;
}
