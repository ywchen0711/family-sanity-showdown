// Tests: the card database, the rules, and thousands of computer-vs-computer games.
import { readFileSync } from 'node:fs';
import * as E from '../js/engine.js?v=1';

let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const db = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));

// 1) the database
const by = (t) => db.cards.filter((c) => c.type === t).length;
ok(db.cards.length === 180 && by('character') === 20 && by('action') === 70 && by('item') === 50 && by('location') === 40, '180 cards: 20 characters, 70 actions, 50 items, 40 locations');
ok(db.cards.every((c) => c.id && c.name?.zh && c.name?.en && c.type && Number.isInteger(c.cost) && c.effect?.zh && c.effect?.en && typeof c.value === 'number'), 'every card has id, name, type, cost, effect and value');
ok(new Set(db.cards.map((c) => c.id)).size === 180 && new Set(db.cards.map((c) => c.name.en)).size === 180, 'ids and names are unique');
ok(db.heroes.map((h) => h.key).join() === 'jeff,erin,josh,jasper', 'the four family heroes');
ok(db.cards.every((c) => c.cost >= 0 && c.cost <= 7), 'costs 0-7');

// 2) rules
{
  const s = E.newGame({ heroes: ['jeff', 'jasper'], seed: 1 });
  const p0 = s.players[0], p1 = s.players[1];
  ok(p0.sp === 24 && p1.sp === 20, 'starting sanity from the heroes');
  ok(s.players[s.cur].maxEnergy === 1 && s.players[s.cur].energy === 1, 'first turn: 1 energy');
  const firstHand = s.players[s.cur].hand.length;
  E.endTurn(s); E.endTurn(s);
  ok(s.players[s.cur].maxEnergy === 2 && s.players[s.cur].hand.length === firstHand + 1, 'energy grows by one; one card drawn each turn');
}
{ // Dad Joke and Jasper's cute face, shields
  const s = E.newGame({ heroes: ['jeff', 'jasper'], seed: 2 }); s.cur = 0;
  const jeff = s.players[0], jas = s.players[1]; jeff.energy = 10; jas.cuteReady = true;
  jeff.hand = ['A001']; E.playCard(s, 0);               // Scream: 2 (+1 Dad Joke) = 3, -1 (cute face, hits of 3+) = 2
  ok(jas.sp === 18, `Dad Joke +1, Jasper's cute face -1 (Jasper at ${jas.sp})`);
  jeff.hand = ['A001']; E.playCard(s, 0);               // second hit in the same turn: 3
  ok(jas.sp === 15, 'cute face only once per turn');
  jas.shield = 2; jeff.hand = ['A001']; E.playCard(s, 0);
  ok(jas.sp === 14 && jas.shield === 0, 'shields absorb damage first');
  jas.sp = 9; jas.reflect = true; jeff.hand = ['A001']; E.playCard(s, 0);
  ok(jas.sp === 9 && jeff.sp === 21, 'Blame Game: the next damage bounces back');
}
{ // Erin: items cost 1 less, heals +2; signature +1
  const s = E.newGame({ heroes: ['erin', 'josh'], seed: 3 }); s.cur = 0; const erin = s.players[0];
  ok(E.costOf(s, erin, 'I001') === 2, 'Erin: items cost 1 less');
  erin.sp = 10; erin.energy = 10; erin.hand = ['A034']; E.playCard(s, 0);   // Family Hug: heal 3 (+1 signature, +2 Super Mom)
  ok(erin.sp === 16, `Erin heals 3 +1 signature +2 Super Mom (now ${erin.sp})`);
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
  const t = E.newGame({ heroes: ['jeff', 'erin'], seed: 6 }); const p = t.players[t.cur]; p.deck = []; const sp0 = p.sp;
  E.endTurn(t); E.endTurn(t);
  ok(p.sp < sp0 && p.fatigue >= 1, 'drawing from an empty deck costs sanity (fatigue)');
}
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
  ok(turns / n > 10 && turns / n < 40, `games last ${(turns / n).toFixed(1)} turns on average`);
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
