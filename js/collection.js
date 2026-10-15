// Family Sanity Showdown: the card collection, packs, coins, crafting and decks (pure logic, no DOM).
// A profile is plain JSON (kept in localStorage by the UI and synced to the cloud):
//   { v, coins, freePacks, col: { cardId: copies }, decks: [{ id, name, hero, cards: [ids] }], stats, daily }
import DB from './cards.data.js?v=2';
import { buildDeck } from './engine.js?v=2';

export const CARDS = Object.fromEntries(DB.cards.map((c) => [c.id, c]));
export const RARITY = ['common', 'rare', 'epic', 'legendary'];
export const MAX_COPIES = { common: 2, rare: 2, epic: 2, legendary: 1 };
export const DUST = { common: 5, rare: 15, epic: 40, legendary: 120 };      // coins for a copy you can't use any more
export const CRAFT = { common: 40, rare: 100, epic: 250, legendary: 600 };   // coins to make one card you want
export const DECK_SIZE = 30, MAX_DECKS = 8, PACK_SIZE = 5, PITY = 10;
export const PACKS = [
  { id: 'basic', price: 100, icon: '🎁' },
  { id: 'jeff', hero: 'jeff', price: 120, icon: '👨' },
  { id: 'erin', hero: 'erin', price: 120, icon: '👩' },
  { id: 'josh', hero: 'josh', price: 120, icon: '👦' },
  { id: 'jasper', hero: 'jasper', price: 120, icon: '🧒' },
];
export const REWARD = { cpu: { easy: [35, 10], normal: [60, 20] }, '2p': [25, 25] };   // [win, loss]
const HERO_KEYS = DB.heroes.map((h) => h.key);
export const COLLECTIBLE = DB.cards.filter((c) => c.rarity !== 'hero');
const pools = {}, sigPools = {};
for (const r of RARITY) {
  pools[r] = COLLECTIBLE.filter((c) => c.rarity === r);
  for (const h of HERO_KEYS) (sigPools[h] ||= {})[r] = pools[r].filter((c) => c.hero === h);
}
const pickFrom = (arr, rng) => arr[Math.floor(rng() * arr.length)];
export const maxCopies = (id) => MAX_COPIES[CARDS[id].rarity] || 0;
export const owned = (p, id) => p.col[id] || 0;
const uid = () => Math.random().toString(36).slice(2, 9);

// ------------------------------------------------------------------ a new player
// one copy of every common card from the base set, a starter deck for each family member, and 3 packs to open
export const STARTER = COLLECTIBLE.filter((c) => c.set === 'base' && c.rarity === 'common').map((c) => c.id);
export function newProfile(rng = Math.random) {
  const p = { v: 1, coins: 0, freePacks: 3, col: {}, decks: [], stats: { packs: 0, sinceLegend: 0, games: 0, wins: 0, crafted: 0 }, daily: '' };
  for (const id of STARTER) p.col[id] = 1;
  for (const h of HERO_KEYS) p.decks.push({ id: uid(), name: null, starter: h, hero: h, cards: autoDeck(p, h, [], rng) });
  return p;
}
// fill in anything missing from an older or damaged save
export function normalize(p) {
  if (!p || typeof p !== 'object' || !p.col) return newProfile();
  p.coins = Math.max(0, p.coins | 0); p.freePacks = Math.max(0, p.freePacks | 0);
  p.stats = { packs: 0, sinceLegend: 0, games: 0, wins: 0, crafted: 0, ...(p.stats || {}) };
  for (const id of Object.keys(p.col)) if (!CARDS[id] || CARDS[id].rarity === 'hero') delete p.col[id]; else p.col[id] = Math.min(p.col[id] | 0, maxCopies(id));
  p.decks = (Array.isArray(p.decks) ? p.decks : []).filter((d) => d && HERO_KEYS.includes(d.hero)).slice(0, MAX_DECKS)
    .map((d) => ({ id: d.id || uid(), name: d.name || null, starter: d.starter || null, hero: d.hero, cards: (d.cards || []).filter((id) => CARDS[id] && CARDS[id].rarity !== 'hero') }));
  return p;
}

// ------------------------------------------------------------------ packs
// slots 1-3 are mostly common, slot 4 is rare or better, slot 5 can be anything; a legendary is guaranteed
// by the 10th pack without one
const ODDS = [
  { common: 88, rare: 10, epic: 2, legendary: 0 }, { common: 88, rare: 10, epic: 2, legendary: 0 }, { common: 88, rare: 10, epic: 2, legendary: 0 },
  { common: 0, rare: 74, epic: 21, legendary: 5 },
  { common: 50, rare: 30, epic: 14, legendary: 6 },
];
export function rollRarity(slot, rng) {
  let x = rng() * 100;
  for (const r of RARITY) { x -= ODDS[slot][r]; if (x < 0) return r; }
  return 'common';
}
export function canOpen(p, packId, free) {
  const pack = PACKS.find((k) => k.id === packId);
  if (!pack) return 'noPack';
  if (free) return p.freePacks > 0 && packId === 'basic' ? null : 'noFree';
  return p.coins >= pack.price ? null : 'noCoins';
}
export function openPack(p, packId, { free = false, rng = Math.random } = {}) {
  const err = canOpen(p, packId, free); if (err) return { error: err };
  const pack = PACKS.find((k) => k.id === packId);
  if (free) p.freePacks--; else p.coins -= pack.price;
  const rar = []; for (let k = 0; k < PACK_SIZE; k++) rar.push(rollRarity(k, rng));
  if (!rar.includes('legendary') && p.stats.sinceLegend + 1 >= PITY) rar[PACK_SIZE - 1] = 'legendary';
  const got = [], seen = new Set();
  for (const r of rar) {
    let id = null;
    for (let tries = 0; tries < 20 && (!id || seen.has(id)); tries++) {
      const sig = pack.hero && rng() < 0.5 && sigPools[pack.hero][r].length ? sigPools[pack.hero][r] : pools[r];
      id = pickFrom(sig, rng).id;
    }
    seen.add(id);
    const have = owned(p, id), card = { id, rarity: r, isNew: have === 0, dust: 0 };
    if (have < maxCopies(id)) p.col[id] = have + 1; else { card.dust = DUST[r]; p.coins += DUST[r]; }
    got.push(card);
  }
  p.stats.packs++;
  p.stats.sinceLegend = rar.includes('legendary') ? 0 : p.stats.sinceLegend + 1;
  // show the commons first and the best card last
  got.sort((a, b) => RARITY.indexOf(a.rarity) - RARITY.indexOf(b.rarity));
  return { cards: got, dust: got.reduce((a, c) => a + c.dust, 0) };
}
export function craft(p, id) {
  const c = CARDS[id]; if (!c || c.rarity === 'hero') return 'noCard';
  if (owned(p, id) >= maxCopies(id)) return 'maxed';
  if (p.coins < CRAFT[c.rarity]) return 'noCoins';
  p.coins -= CRAFT[c.rarity]; p.col[id] = owned(p, id) + 1; p.stats.crafted++;
  return null;
}
// once a day: a free pack
export function daily(p, today = new Date().toISOString().slice(0, 10)) {
  if (p.daily === today) return false;
  p.daily = today; p.freePacks++; return true;
}
export function reward(p, mode, level, won) {
  const pair = mode === 'cpu' ? REWARD.cpu[level] || REWARD.cpu.normal : REWARD['2p'];
  const n = won ? pair[0] : pair[1];
  p.coins += n; p.stats.games++; if (won) p.stats.wins++;
  return n;
}

// ------------------------------------------------------------------ decks
export const countIn = (cards, id) => cards.reduce((a, x) => a + (x === id), 0);
// problems with a deck, [] when it can be played: size, copies, and cards you don't own (enough of)
export function deckProblems(p, deck) {
  const out = [];
  if (deck.cards.length !== DECK_SIZE) out.push({ code: 'size', n: deck.cards.length });
  const seen = {};
  for (const id of deck.cards) seen[id] = (seen[id] || 0) + 1;
  for (const [id, n] of Object.entries(seen)) {
    if (n > maxCopies(id)) out.push({ code: 'copies', id });
    else if (p && n > owned(p, id)) out.push({ code: 'notOwned', id });
  }
  return out;
}
export const canAdd = (p, deck, id) => deck.cards.length < DECK_SIZE && countIn(deck.cards, id) < Math.min(maxCopies(id), p ? owned(p, id) : 9);
// build or finish a deck from what you own: rarer cards and the hero's own signature cards first, a sensible mix
// of card types, and not too many expensive cards
export function autoDeck(p, hero, start = [], rng = Math.random) {
  const cards = start.filter((id) => CARDS[id]).slice(0, DECK_SIZE);
  const want = { character: 3, action: 15, item: 8, location: 4 };
  const have = (t) => cards.filter((id) => CARDS[id].type === t).length;
  const big = () => cards.filter((id) => CARDS[id].cost >= 5).length;
  const score = (c) => RARITY.indexOf(c.rarity) * 2 + (c.hero === hero ? 2.5 : c.hero ? -1 : 0) + rng() * 2.2 - (c.cost >= 5 && big() >= 5 ? 6 : 0);
  const avail = (c) => countIn(cards, c.id) < Math.min(maxCopies(c.id), p ? owned(p, c.id) : 1);
  const fill = (type, n) => {
    while (cards.length < DECK_SIZE && (n == null || have(type) < n)) {
      const list = COLLECTIBLE.filter((c) => (!type || c.type === type) && avail(c));
      if (!list.length) return;
      let best = null, bv = -1e9; for (const c of list) { const v = score(c); if (v > bv) { bv = v; best = c; } }
      cards.push(best.id);
    }
  };
  for (const [t, n] of Object.entries(want)) fill(t, n);
  fill(null, null);                                   // short of some type: fill with anything you own
  return cards;
}
// the computer's deck: a random deck from the whole card pool (easy: common and rare cards only)
const EASY_POOL = COLLECTIBLE.filter((c) => c.rarity === 'common' || c.rarity === 'rare');
export function cpuDeck(state, hero, level) { return buildDeck(state, hero, level === 'easy' ? EASY_POOL : COLLECTIBLE); }
export const sortDeck = (cards) => cards.slice().sort((a, b) => CARDS[a].cost - CARDS[b].cost || CARDS[a].type.localeCompare(CARDS[b].type) || a.localeCompare(b));
