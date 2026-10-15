// Tests: the card database, the rules, and thousands of computer-vs-computer games.
import { readFileSync } from 'node:fs';
import * as E from '../js/engine.js?v=2';
import * as K from '../js/collection.js?v=1';

let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const db = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));

// 1) the database
const by = (t) => db.cards.filter((c) => c.type === t).length;
ok(db.cards.length === 500 && by('character') === 60 && by('action') === 200 && by('item') === 140 && by('location') === 100, '500 cards: 60 characters, 200 actions, 140 items, 100 locations');
ok(db.cards.every((c) => c.id && c.name?.zh && c.name?.en && c.type && Number.isInteger(c.cost) && c.effect?.zh && c.effect?.en && typeof c.value === 'number'), 'every card has id, name, type, cost, effect and value');
ok(new Set(db.cards.map((c) => c.id)).size === 500 && new Set(db.cards.map((c) => c.name.en)).size === 500 && new Set(db.cards.map((c) => c.name.zh)).size === 500, 'ids and names are unique');
{ const rc = db.rarityCounts; ok(rc.hero === 4 && rc.legendary >= 25 && rc.legendary <= 40 && rc.epic > rc.legendary && rc.rare > rc.epic && rc.common > rc.rare, `rarities: ${JSON.stringify(rc)}`); }
ok(db.cards.every((c) => ['hero', 'common', 'rare', 'epic', 'legendary'].includes(c.rarity)), 'every card has a rarity');
ok(db.heroes.map((h) => h.key).join() === 'jeff,erin,josh,jasper', 'the four family heroes');
ok(db.cards.every((c) => c.cost >= 0 && c.cost <= 9), 'costs 0-9');

// 2) rules
{
  const s = E.newGame({ heroes: ['jeff', 'jasper'], seed: 1 });
  const p0 = s.players[0], p1 = s.players[1];
  ok(p0.sp === 28 && p1.sp === 21, 'starting sanity from the heroes');
  ok(s.players[s.cur].maxEnergy === 1 && s.players[s.cur].energy === 1, 'first turn: 1 energy');
  const firstHand = s.players[s.cur].hand.length;
  E.endTurn(s); E.endTurn(s);
  ok(s.players[s.cur].maxEnergy === 2 && s.players[s.cur].hand.length === firstHand + 1, 'energy grows by one; one card drawn each turn');
}
{ // Dad Joke and Jasper's cute face, shields
  const s = E.newGame({ heroes: ['jeff', 'jasper'], seed: 2 }); s.cur = 0;
  const jeff = s.players[0], jas = s.players[1]; jeff.energy = 10; jas.cuteReady = true;
  jeff.hand = ['A001']; E.playCard(s, 0);               // Scream: 2 (+1 Dad Joke) = 3, -1 (cute face, hits of 3+) = 2
  ok(jas.sp === 19, `Dad Joke +1, Jasper's cute face -1 (Jasper at ${jas.sp})`);
  jeff.hand = ['A001']; E.playCard(s, 0);               // second hit in the same turn: 3
  ok(jas.sp === 16, 'cute face only once per turn');
  jas.shield = 2; jeff.hand = ['A001']; E.playCard(s, 0);
  ok(jas.sp === 15 && jas.shield === 0, 'shields absorb damage first');
  jas.sp = 9; jas.reflect = true; jeff.hand = ['A001']; E.playCard(s, 0);
  ok(jas.sp === 9 && jeff.sp === 25, 'Blame Game: the next damage bounces back');
}
{ // Erin: items cost 1 less, heals +2; signature +1
  const s = E.newGame({ heroes: ['erin', 'josh'], seed: 3 }); s.cur = 0; const erin = s.players[0];
  ok(E.costOf(s, erin, 'I001') === 2, 'Erin: items cost 1 less');
  erin.sp = 10; erin.energy = 10; erin.hand = ['A034']; E.playCard(s, 0);   // Family Hug: heal 3 (+1 signature, +1 Super Mom)
  ok(erin.sp === 15, `Erin heals 3 +1 signature +1 Super Mom (now ${erin.sp})`);
}
{ // locations change costs; one location at a time
  const s = E.newGame({ heroes: ['josh', 'jeff'], seed: 4 }); s.cur = 0; const p = s.players[0]; p.energy = 10;
  p.hand = ['L003']; E.playCard(s, 0);                 // Supermarket: items -1
  ok(E.costOf(s, p, 'I001') === 2 && s.loc.id === 'L003', 'the Supermarket makes items cheaper');
  p.hand = ['L005']; E.playCard(s, 0);
  ok(s.loc.id === 'L005' && p.discard.includes('L003'), 'a new location replaces the old one');
}
{ // winning, fatigue
  const s = E.newGame({ heroes: ['jeff', 'erin'], seed: 5 }); s.cur = 0; const a = s.players[0], b = s.players[1];
  b.sp = 2; a.energy = 10; a.hand = ['A001']; E.playCard(s, 0);
  ok(s.winner === 0, 'reaching 0 sanity loses the game');
  const t = E.newGame({ heroes: ['jeff', 'erin'], seed: 6 }); const p = t.players[t.cur]; p.deck = []; p.discard = []; const sp0 = p.sp;
  E.endTurn(t); E.endTurn(t);
  ok(p.sp < sp0 && p.fatigue >= 1, 'drawing with no cards left at all costs sanity (fatigue)');
  const u = E.newGame({ heroes: ['jeff', 'erin'], seed: 7 }); const q = u.players[u.cur]; q.deck = []; q.discard = ['A001', 'A002', 'A003']; const sp1 = q.sp, h1 = q.hand.length;
  E.endTurn(u); E.endTurn(u);
  ok(q.sp === sp1 - 6 && q.hand.length === h1 + 1 && q.deck.length === 2, 'an empty deck: the discard pile becomes the new deck for 6 SP');
}
{ // the new effects
  const s = E.newGame({ heroes: ['josh', 'jeff'], seed: 9 }); s.cur = 0; const p = s.players[0], o = s.players[1];
  p.energy = 10; p.maxEnergy = 3; p.hand = ['A155']; const id = p.hand[0];
  ok(E.CARDS[id].fx[0][0] === 'ramp', 'A155 is a ramp card (' + E.CARDS[id].name.en + ')');
  E.playCard(s, 0); ok(p.maxEnergy === 4, 'ramp: max energy +1 for good');
  p.energy = 4; p.hand = ['A153']; E.playCard(s, 0); ok(E.CARDS.A153.fx[0][0] === 'refill' && p.energy === 4, 'refill: energy back to the max');
  p.poison = [{ n: 2, t: 3 }]; p.tax = 2; p.sap = 1; p.energy = 10; p.hand = [E.CARDS.A136.id]; E.playCard(s, 0);
  ok(E.CARDS.A136.fx.some((x) => x[0] === 'cleanse') && !p.poison.length && !p.tax && !p.sap, 'cleanse removes poison, extra cost and lost energy');
  o.items = [{ id: 'I001', left: 3 }, { id: 'I002', left: 3 }]; p.energy = 10; p.hand = ['A188']; E.playCard(s, 0);
  ok(E.CARDS.A188.fx[0][0] === 'clearItems' && o.items.length === 0, 'clearItems takes all of the opponent\'s items');
  const d = E.newGame({ heroes: ['erin', 'jeff'], decks: [Array(30).fill('A001'), null], seed: 3 });
  ok(d.players[0].hand.concat(d.players[0].deck).every((x) => x === 'A001') && d.players[1].deck.length + d.players[1].hand.length === 30, 'players can bring their own 30-card deck');
}
{ // collection, packs, crafting, decks
  let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const p = K.newProfile(rng);
  ok(p.freePacks === 3 && p.coins === 0 && K.STARTER.length >= 60 && p.decks.length === 4, `a new player: 3 free packs, ${K.STARTER.length} starter cards, 4 starter decks`);
  ok(p.decks.every((d) => d.cards.length === 30 && K.deckProblems(p, d).length === 0), 'the starter decks are complete and legal');
  ok(K.openPack(p, 'basic', { rng }).error === 'noCoins', 'a pack costs coins');
  const r = K.openPack(p, 'basic', { free: true, rng });
  ok(r.cards.length === 5 && p.freePacks === 2 && r.cards.every((c) => K.CARDS[c.id].rarity === c.rarity), 'a free pack gives 5 cards');
  ok(r.cards.some((c) => c.rarity !== 'common'), 'every pack has a rare or better card');
  // odds over many packs
  const q = K.newProfile(rng); q.coins = 1e7; const n = { common: 0, rare: 0, epic: 0, legendary: 0 }; let longest = 0, since = 0;
  for (let k = 0; k < 2000; k++) { const x = K.openPack(q, 'basic', { rng }); for (const c of x.cards) n[c.rarity]++; since = x.cards.some((c) => c.rarity === 'legendary') ? 0 : since + 1; longest = Math.max(longest, since); }
  console.log('     2000 packs: ' + JSON.stringify(n));
  ok(longest < K.PITY, `a legendary at least every ${K.PITY} packs (longest wait ${longest + 1})`);
  ok(n.legendary / 2000 > 0.1 && n.legendary / 2000 < 0.25 && n.epic > n.legendary && n.rare > n.epic, 'pack odds: legendaries ~1 in 7 packs, epics and rares more common');
  ok(Object.entries(q.col).every(([id, c]) => c <= K.maxCopies(id)), 'never more copies than a deck can use');
  ok(COMPLETE(q), 'after 2000 packs the whole collection is complete');
  const before = q.coins; const y = K.openPack(q, 'basic', { rng }); ok(y.dust > 0 && q.coins === before - 100 + y.dust, 'extra copies turn into coins');
  const hp = K.newProfile(rng); hp.coins = 1e6; let sig = 0, tot = 0;
  for (let k = 0; k < 300; k++) for (const c of K.openPack(hp, 'jasper', { rng }).cards) { tot++; if (K.CARDS[c.id].hero === 'jasper') sig++; }
  ok(sig / tot > 0.3, `a Jasper pack is full of Jasper cards (${(sig / tot * 100).toFixed(0)}%)`);
  const z = K.newProfile(rng); const leg = K.COLLECTIBLE.find((c) => c.rarity === 'legendary').id;
  ok(K.craft(z, leg) === 'noCoins', 'crafting needs coins'); z.coins = 600;
  ok(K.craft(z, leg) === null && z.col[leg] === 1 && z.coins === 0 && K.craft(z, leg) === 'maxed', 'craft a legendary: one copy at most');
  const deck = { hero: 'jeff', cards: [leg, leg, ...Array(28).fill(K.STARTER[0])] };
  const probs = K.deckProblems(z, deck).map((x) => x.code);
  ok(probs.includes('copies') && !probs.includes('size'), 'deck rules: copies are limited (' + probs.join(',') + ')');
  ok(K.daily(z, '2026-01-01') && !K.daily(z, '2026-01-01') && K.daily(z, '2026-01-02'), 'one free pack a day');
  ok(K.reward(z, 'cpu', 'normal', true) === 60 && K.reward(z, 'cpu', 'easy', false) === 10, 'coins for playing');
  const full = K.normalize(JSON.parse(JSON.stringify(q)));
  ok(full.decks.length === 4 && Object.keys(full.col).length === K.COLLECTIBLE.length, 'a saved profile loads back');
  ok(K.normalize(null).freePacks === 3 && K.normalize({ col: { ZZZ: 5, A001: 9 } }).col.A001 === 2, 'bad saves are repaired');
}
function COMPLETE(p) { return K.COLLECTIBLE.every((c) => (p.col[c.id] || 0) === K.maxCopies(c.id)); }
// 3) computer vs computer: games finish, no hero dominates
{
  const heroes = ['jeff', 'erin', 'josh', 'jasper'], wins = {}, games = {}; let turns = 0, n = 0, draws = 0, errors = 0;
  for (const h of heroes) { wins[h] = 0; games[h] = 0; }
  for (let g = 0; g < 800; g++) {
    const pair = [heroes[g % 4], heroes[Math.floor(g / 4) % 4]];
    const s = E.newGame({ heroes: pair, seed: 1000 + g });
    try { let guard = 0; while (s.winner == null && guard++ < 200) E.cpuTurn(s, 'normal'); } catch (e) { errors++; if (errors < 3) console.log(e); }
    if (s.winner == null) { errors++; continue; }
    n++; turns += s.turn;
    if (s.winner === 'draw') { draws++; continue; }
    if (pair[0] !== pair[1]) { games[pair[0]]++; games[pair[1]]++; wins[pair[s.winner]]++; }
  }
  ok(errors === 0, `800 computer games all finish without errors (${errors} problems)`);
  ok(turns / n > 16 && turns / n < 44, `games last ${(turns / n).toFixed(1)} turns on average`);
  const rates = heroes.map((h) => [h, wins[h] / games[h]]);
  console.log('     win rates in mirror-free games: ' + rates.map(([h, r]) => `${h} ${(r * 100).toFixed(0)}%`).join(', ') + `, draws ${draws}`);
  ok(rates.every(([, r]) => r > 0.38 && r < 0.62), 'every hero wins between 38% and 62% of their games');
}
{ // normal beats easy
  let wins = 0; const N = 300;
  for (let g = 0; g < N; g++) { const s = E.newGame({ heroes: ['jeff', 'jeff'], seed: 5000 + g }); let guard = 0; while (s.winner == null && guard++ < 200) E.cpuTurn(s, s.cur === 0 ? 'normal' : 'easy'); if (s.winner === 0) wins++; }
  ok(wins / N > 0.6, `the normal computer beats the easy one ${(wins / N * 100).toFixed(0)}% of the time`);
}
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
