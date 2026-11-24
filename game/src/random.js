// Seeded randomness for Topaz Bay: the same seed always builds the same city,
// so a screenshot staged today can be reproduced tomorrow.
export function mulberry32SeededRandom(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function seededPick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function seedFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = Number.parseInt(params.get('seed') ?? '7', 10);
  return Number.isFinite(raw) ? raw : 7;
}
