// Family Sanity Showdown: the rules engine (pure, no DOM). Turn: start effects -> draw phase -> main phase -> end.
// Each player has Sanity Points (SP); reach 0 and you lose. Energy grows by 1 each turn (max 10) and pays for cards.
import DB from './cards.data.js?v=2';

export const CARDS = Object.fromEntries(DB.cards.map((c) => [c.id, c]));
export const HEROES = Object.fromEntries(DB.heroes.map((h) => [h.key, { ...h, card: CARDS[h.cardId] }]));
export const RULES = { maxEnergy: 10, handLimit: 8, maxItems: 3, maxAllies: 2, deckSize: 30, turnLimit: 60, healCap: 0, reshuffleSp: 6 };
// hero passives (numbers kept here so the balance tests can try other values)
export const TUNE = { dadJoke: 1, momHeal: 1, momItems: 1, joshHand: 3, cute: 1, meltdownAt: 8, meltdown: 1 };

// ------------------------------------------------------------------ random numbers kept inside the state (so it can be cloned)
export function rnd(s) { s.seed = (s.seed * 16807) % 2147483647; return (s.seed - 1) / 2147483646; }
const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
function shuffle(s, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

// ------------------------------------------------------------------ decks: 30 cards, the hero's signature cards first
// (a random deck for quick games and the computer; players bring the decks they build from their collection)
const POOL = DB.cards.filter((c) => !(c.type === 'character' && c.stats));
export const DECK_MIX = { character: 3, action: 15, item: 8, location: 4 };
export function buildDeck(s, heroKey, pool = POOL) {
  const want = DECK_MIX, deck = [];
  for (const [type, n] of Object.entries(want)) {
    const own = shuffle(s, pool.filter((c) => c.type === type && c.hero === heroKey));
    const rest = shuffle(s, pool.filter((c) => c.type === type && !c.hero));
    const others = shuffle(s, pool.filter((c) => c.type === type && c.hero && c.hero !== heroKey));
    const list = [...own.slice(0, Math.ceil(n / 3)), ...rest, ...others].slice(0, n);
    deck.push(...list.map((c) => c.id));
  }
  return shuffle(s, deck);
}

// ------------------------------------------------------------------ a new game
// opts: { heroes: ['jeff', 'josh'], decks?: [[ids…] | null, …], names?, cpu?: [false, 'normal'], seed? }
export function newGame(opts) {
  const s = { seed: (opts.seed || Date.now()) % 2147483646 + 1, turn: 0, cur: 0, loc: null, log: [], winner: null, events: [], cpu: opts.cpu || [false, false] };
  s.players = opts.heroes.map((hk, i) => {
    const h = HEROES[hk];
    return { i, hero: hk, name: opts.names?.[i] || h.card.name, sp: h.sp, maxSp: h.sp, energy: 0, maxEnergy: 0, deck: opts.decks?.[i]?.length ? shuffle(s, opts.decks[i].filter((id) => CARDS[id]).slice()) : buildDeck(s, hk), hand: [], discard: [],
      items: [], allies: [], shield: 0, poison: [], regen: [], tax: 0, sap: 0, reflect: false, cuteReady: false, fatigue: 0, played: 0 };
  });
  s.cur = rnd(s) < 0.5 ? 0 : 1;                     // a coin toss decides who starts
  s.players.forEach((p) => { for (let k = 0; k < HEROES[p.hero].hand; k++) draw(s, p, true); });
  const second = s.players[1 - s.cur]; draw(s, second, true);   // the second player gets one more card
  log(s, 'start', { first: s.cur });
  startTurn(s);
  return s;
}
export const clone = (s) => structuredClone(s);
function log(s, kind, data = {}) { s.log.push({ kind, turn: s.turn, ...data }); s.events.push({ kind, ...data }); if (s.log.length > 200) s.log.shift(); }
const opp = (s, p) => s.players[1 - p.i];

// ------------------------------------------------------------------ drawing
function draw(s, p, quiet) {
  if (!p.deck.length) {
    p.fatigue++;
    if (!p.discard.length) { log(s, 'fatigue', { p: p.i, n: p.fatigue }); loseSp(s, p, p.fatigue, null, true); return null; }
    // the deck ran out: the discard pile is shuffled into a new deck, and that costs SP (more each time)
    p.deck = shuffle(s, p.discard.splice(0)); log(s, 'reshuffle', { p: p.i, n: p.fatigue * RULES.reshuffleSp }); loseSp(s, p, p.fatigue * RULES.reshuffleSp, null, true);
    if (s.winner != null) return null;
  }
  const id = p.deck.pop();
  if (p.hand.length >= 10) { p.discard.push(id); log(s, 'burn', { p: p.i, id }); return null; }
  p.hand.push(id); if (!quiet) log(s, 'draw', { p: p.i });
  return id;
}

// ------------------------------------------------------------------ the turn
export function startTurn(s) {
  if (s.winner != null) return;
  s.turn++;
  const p = s.players[s.cur], o = opp(s, p);
  p.played = 0;
  o.cuteReady = true;                                        // Jasper: the first damage each opponent turn is softened
  p.maxEnergy = Math.min(RULES.maxEnergy, p.maxEnergy + 1);
  p.energy = Math.max(0, p.maxEnergy - p.sap); p.sap = 0;
  log(s, 'turn', { p: p.i, turn: s.turn });
  // start-of-turn effects: the location, poison and regeneration, guests, items
  const L = s.loc && CARDS[s.loc.id];
  if (L && L.rule.startAll) apply(s, p, L.rule.startAll, { src: 'loc' });
  if (L && s.loc.owner === p.i && L.owner.length) apply(s, p, L.owner, { src: 'loc' });
  for (const po of p.poison) { loseSp(s, p, po.n, o, false, 'poison'); po.t--; } p.poison = p.poison.filter((x) => x.t > 0);
  for (const r of p.regen) { heal(s, p, r.n, 'regen'); r.t--; } p.regen = p.regen.filter((x) => x.t > 0);
  for (const a of p.allies) { apply(s, p, CARDS[a.id].tick, { src: 'ally', id: a.id }); a.left--; }
  p.allies = p.allies.filter((a) => { if (a.left <= 0) { p.discard.push(a.id); log(s, 'leave', { p: p.i, id: a.id }); return false; } return true; });
  for (const it of p.items) { if (CARDS[it.id].tick.length) apply(s, p, CARDS[it.id].tick, { src: 'item', id: it.id }); it.left--; }
  p.items = p.items.filter((it) => { if (it.left <= 0) { p.discard.push(it.id); log(s, 'wornout', { p: p.i, id: it.id }); return false; } return true; });
  if (s.winner != null) return;
  // draw phase
  let n = 1 + ((L && L.rule.drawExtra) || 0);
  if (p.hero === 'josh' && p.hand.length <= TUNE.joshHand) n++;
  for (let k = 0; k < n && s.winner == null; k++) draw(s, p);
}
export function endTurn(s) {
  if (s.winner != null) return;
  const p = s.players[s.cur];
  while (p.hand.length > RULES.handLimit) { const k = Math.floor(rnd(s) * p.hand.length); p.discard.push(p.hand.splice(k, 1)[0]); log(s, 'overflow', { p: p.i }); }
  if (s.turn >= RULES.turnLimit) { const [a, b] = s.players; s.winner = a.sp === b.sp ? 'draw' : a.sp > b.sp ? 0 : 1; log(s, 'timeup', { winner: s.winner }); return; }
  s.cur = 1 - s.cur;
  startTurn(s);
}

// ------------------------------------------------------------------ costs and playing cards
export function costOf(s, p, id) {
  const c = CARDS[id], L = s.loc && CARDS[s.loc.id];
  let cost = c.cost + p.tax;
  if (L) cost += c.type === 'action' ? L.rule.costAction || 0 : c.type === 'item' ? L.rule.costItem || 0 : c.type === 'character' ? L.rule.costChar || 0 : 0;
  if (c.type === 'item' && p.hero === 'erin') cost -= TUNE.momItems;
  return Math.max(0, cost);
}
export const canPlay = (s, p, id) => s.winner == null && s.cur === p.i && costOf(s, p, id) <= p.energy;
export function playCard(s, handIndex) {
  const p = s.players[s.cur], id = p.hand[handIndex];
  if (id == null || !canPlay(s, p, id)) return false;
  const c = CARDS[id];
  p.energy -= costOf(s, p, id); p.tax = 0; p.hand.splice(handIndex, 1); p.played++;
  log(s, 'play', { p: p.i, id });
  if (c.type === 'action') { apply(s, p, c.fx, { src: 'card', card: c }); p.discard.push(id); }
  else if (c.type === 'item') {
    if (p.items.length >= RULES.maxItems) { const old = p.items.shift(); p.discard.push(old.id); }
    p.items.push({ id, left: c.turns });
    if (c.fx.length) apply(s, p, c.fx, { src: 'card', card: c });
  } else if (c.type === 'character') {
    if (p.allies.length >= RULES.maxAllies) { const old = p.allies.shift(); p.discard.push(old.id); }
    p.allies.push({ id, left: c.turns });
  } else if (c.type === 'location') {
    if (s.loc) s.players[s.loc.owner].discard.push(s.loc.id);
    s.loc = { id, owner: p.i };
  }
  return true;
}

// ------------------------------------------------------------------ effects
function dmgBonus(s, p, ctx) {
  let b = 0;
  if (ctx.src === 'card' && p.hero === 'jeff') b += TUNE.dadJoke;                     // Dad Joke
  if (ctx.src === 'card' && p.hero === 'jasper' && p.sp < TUNE.meltdownAt) b += TUNE.meltdown;   // meltdown
  for (const it of p.items) b += CARDS[it.id].mods?.boost || 0;
  const L = s.loc && CARDS[s.loc.id]; if (L) b += L.rule.dmgMod || 0;
  return b;
}
export function apply(s, p, ops, ctx = {}) {
  const o = opp(s, p);
  let sigBonus = ctx.card && ctx.card.hero === p.hero ? 1 : 0;      // signature cards: +1 to the first number
  const num = (n) => { const v = n + sigBonus; sigBonus = 0; return v; };
  for (const [op, a, b] of ops) {
    if (s.winner != null) return;
    switch (op) {
      case 'dmg': { const n = num(a) + dmgBonus(s, p, ctx); dealDamage(s, o, n, p, ctx.src === 'card'); break; }
      case 'self': loseSp(s, p, a, null, true); break;
      case 'heal': heal(s, p, num(a)); break;
      case 'draw': for (let k = num(a); k > 0; k--) draw(s, p); break;
      case 'energy': p.energy += num(a); log(s, 'energy', { p: p.i, n: a }); break;
      case 'discard': for (let k = num(a); k > 0 && o.hand.length; k--) { const i = Math.floor(rnd(s) * o.hand.length); o.discard.push(o.hand.splice(i, 1)[0]); log(s, 'discarded', { p: o.i }); } break;
      case 'steal': for (let k = num(a); k > 0 && o.hand.length; k--) { const i = Math.floor(rnd(s) * o.hand.length); p.hand.push(o.hand.splice(i, 1)[0]); log(s, 'stolen', { p: p.i }); } break;
      case 'mill': for (let k = num(a); k > 0 && o.deck.length; k--) o.discard.push(o.deck.pop()); log(s, 'mill', { p: o.i, n: a }); break;
      case 'shield': p.shield += num(a); log(s, 'shield', { p: p.i, n: a }); break;
      case 'poison': o.poison.push({ n: num(a), t: b }); log(s, 'poisoned', { p: o.i, n: a, t: b }); break;
      case 'regen': p.regen.push({ n: num(a), t: b }); break;
      case 'tax': o.tax += num(a); log(s, 'taxed', { p: o.i, n: a }); break;
      case 'sap': o.sap += num(a); log(s, 'sapped', { p: o.i, n: a }); break;
      case 'reflect': p.reflect = true; log(s, 'reflect', { p: p.i }); break;
      case 'clearItem': if (o.items.length) { const it = o.items.splice(0, 1)[0]; o.discard.push(it.id); log(s, 'cleared', { p: o.i, id: it.id }); } break;
      case 'clearAlly': if (o.allies.length) { const a2 = o.allies.splice(0, 1)[0]; o.discard.push(a2.id); log(s, 'cleared', { p: o.i, id: a2.id }); } break;
      case 'clearLoc': if (s.loc) { s.players[s.loc.owner].discard.push(s.loc.id); log(s, 'cleared', { id: s.loc.id }); s.loc = null; } break;
      case 'clearItems': for (const it of o.items.splice(0)) { o.discard.push(it.id); log(s, 'cleared', { p: o.i, id: it.id }); } break;
      case 'ramp': { const n = num(a); p.maxEnergy = Math.min(RULES.maxEnergy, p.maxEnergy + n); p.energy += n; log(s, 'ramp', { p: p.i, n }); break; }
      case 'refill': p.energy = Math.max(p.energy, p.maxEnergy); log(s, 'energy', { p: p.i, n: p.maxEnergy }); break;
      case 'cleanse': p.poison = []; p.tax = 0; p.sap = 0; log(s, 'cleanse', { p: p.i }); break;
    }
  }
}
function heal(s, p, n, why) {
  const L = s.loc && CARDS[s.loc.id];
  n += (L && L.rule.healMod) || 0;
  if (p.hero === 'erin') n += TUNE.momHeal;                                          // Super Mom
  const before = p.sp; p.sp = Math.min(p.maxSp, p.sp + Math.max(0, n));
  if (p.sp > before) log(s, 'heal', { p: p.i, n: p.sp - before, why });
}
// damage from the opponent: reflect, armor, Jasper's cute face, shield, then thorns back at the attacker
function dealDamage(s, t, n, from, fromCard) {
  if (n <= 0) return;
  if (t.reflect) { t.reflect = false; log(s, 'reflected', { p: t.i }); loseSp(s, from, n, null, true); return; }
  for (const it of t.items) n -= CARDS[it.id].mods?.armor || 0;
  if (t.hero === 'jasper' && t.cuteReady && fromCard && n >= 3) { t.cuteReady = false; n -= TUNE.cute; }
  if (n <= 0) { log(s, 'blocked', { p: t.i }); return; }
  loseSp(s, t, n, from, false);
  const thorns = t.items.reduce((a, it) => a + (CARDS[it.id].mods?.thorns || 0), 0);
  if (thorns && from && s.winner == null) loseSp(s, from, thorns, null, true, 'thorns');
}
function loseSp(s, p, n, from, direct, why) {
  if (n <= 0 || s.winner != null) return;
  if (!direct && p.shield > 0) { const a = Math.min(p.shield, n); p.shield -= a; n -= a; if (a) log(s, 'absorbed', { p: p.i, n: a }); }
  if (n <= 0) return;
  p.sp -= n; log(s, 'hurt', { p: p.i, n, why });
  if (p.sp <= 0) { const o = opp(s, p); s.winner = o.sp <= 0 ? 'draw' : o.i; log(s, 'win', { winner: s.winner }); }
}

// ------------------------------------------------------------------ the computer player
// tries each playable card on a copy of the game and plays the one that improves its position the most
export function evaluate(s, me) {
  if (s.winner === me) return 1e6; if (s.winner === 1 - me) return -1e6; if (s.winner === 'draw') return 0;
  const p = s.players[me], o = s.players[1 - me];
  const sp = (x) => (x.sp <= 8 ? x.sp * 1.6 : 8 * 1.6 + (x.sp - 8));                // low SP matters more
  let v = sp(p) - sp(o) * 1.15;
  v += p.hand.length * 0.9 - o.hand.length * 0.6 + p.shield * 0.7;
  v += p.items.reduce((a, it) => a + it.left * 0.9, 0) + p.allies.reduce((a, x) => a + x.left * 1.2, 0);
  v -= o.items.reduce((a, it) => a + it.left * 0.9, 0) + o.allies.reduce((a, x) => a + x.left * 1.2, 0);
  v += o.poison.reduce((a, x) => a + x.n * x.t, 0) * 0.8 + p.regen.reduce((a, x) => a + x.n * x.t, 0) * 0.6;
  if (s.loc) v += s.loc.owner === me ? 2 : -1.5;
  v += p.energy * 0.15 + (p.reflect ? 2.5 : 0) + o.tax * 0.8 + o.sap * 1;
  v -= p.poison.reduce((a, x) => a + x.n * x.t, 0) * 0.8 + p.tax * 0.8 + p.sap * 1;
  v += (p.maxEnergy - o.maxEnergy) * (s.turn < 14 ? 1.2 : 0.3);
  return v;
}
export function cpuPlan(s, level = 'normal') {
  const me = s.cur, p = s.players[me];
  if (level === 'easy') {                                     // easy: a random playable card, and sometimes it just stops
    const ok2 = p.hand.map((id, i) => (canPlay(s, p, id) ? i : -1)).filter((i) => i >= 0);
    return !ok2.length || rnd(s) < 0.3 ? null : ok2[Math.floor(rnd(s) * ok2.length)];
  }
  const base = evaluate(s, me);
  let best = null, bestV = base + (level === 'easy' ? 1.5 : 0.25);
  p.hand.forEach((id, i) => {
    if (!canPlay(s, p, id)) return;
    let v = 0;
    const tries = CARDS[id].fx.some((o) => ['discard', 'steal'].includes(o[0])) ? 3 : 1;    // random effects: average a few tries
    for (let k = 0; k < tries; k++) { const t = clone(s); t.seed = (t.seed + k * 7919) % 2147483646 + 1; playCard(t, i); v += evaluate(t, me); }
    v /= tries;
    if (level === 'easy') v += (rnd(s) - 0.5) * 6;
    if (v > bestV) { bestV = v; best = i; }
  });
  return best;                                                                    // a hand index, or null to end the turn
}
// run a whole CPU turn (used by tests and quick simulations)
export function cpuTurn(s, level) { let guard = 0; while (s.winner == null && guard++ < 20) { const i = cpuPlan(s, level); if (i == null) break; playCard(s, i); } endTurn(s); }
