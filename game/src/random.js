// Ember Court — a small seeded random source (mulberry32). Every shuffle and
// every AI tie-break draws from it, so a game played from one seed always
// plays the same way: the screenshot scenes and the soak tests rely on it.
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  function nextInt(bound) {
    return Math.floor(next() * bound);
  }
  // Fisher-Yates, in place, driven by this source only.
  function shuffle(list) {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const other = nextInt(index + 1);
      const held = list[index];
      list[index] = list[other];
      list[other] = held;
    }
    return list;
  }
  return { next, nextInt, shuffle };
}
