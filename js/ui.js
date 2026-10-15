// Family Sanity Showdown: menus, the battle board, hot-seat turns, the computer player, the card library.
import * as E from './engine.js?v=1';
import DB from './cards.data.js?v=1';
import { t, L, getLang, setLang } from './i18n.js?v=1';

const $ = (s) => document.querySelector(s);
const app = $('#app'), modal = $('#modal');
const C = E.CARDS, HEROES = E.HEROES, HERO_KEYS = Object.keys(HEROES);
let G = null, setup = { mode: 'cpu', heroes: ['jeff', 'random'], level: 'normal' }, busy = false, lastSp = [0, 0], logLines = [], spot = null;
const hubBtn = (show) => { const h = document.getElementById('hub-back'); if (h) h.style.display = show ? '' : 'none'; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const btn = (label, fn, cls = '') => { const b = el('button', 'btn ' + cls, label); b.onclick = fn; return b; };
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
let toastT = 0; const toast = (m) => { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1600); };
const heroName = (k) => L(HEROES[k].card.name).split(/[ （(]/)[0];
const pname = (i) => { const p = G.players[i]; const who = heroName(p.hero); return G.cpu[i] ? `${who}（${t('cpu')}）`.replace('（', getLang() === 'en' ? ' (' : '（').replace('）', getLang() === 'en' ? ')' : '）') : who; };
const TYPE_LABEL = { character: 'character', action: 'action', item: 'item', location: 'locationT' };

// ------------------------------------------------------------------ a card
function cardEl(id, o = {}) {
  const c = C[id], d = el('div', `card t-${c.type}${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}`);
  const cost = o.cost ?? c.cost;
  d.innerHTML = `<div class="cost${cost !== c.cost ? (cost < c.cost ? ' cheaper' : ' pricier') : ''}">${cost}</div>
    ${c.hero && c.type !== 'character' ? `<div class="sig" title="${esc(heroName(c.hero))}">★${esc(heroName(c.hero))}</div>` : ''}
    <div class="art">${c.icon}</div><div class="nm">${esc(L(c.name))}</div><div class="ty">${t(TYPE_LABEL[c.type])}${c.turns ? ` · ${c.turns}${getLang() === 'zh' ? '回合' : 'T'}` : ''}</div>
    <div class="fx">${esc(L(c.effect))}</div><div class="id">${c.id}</div>`;
  return d;
}

// ------------------------------------------------------------------ menus
function menu() {
  G = null; hubBtn(true); modal.classList.add('hidden');
  const box = el('div', 'menu');
  box.innerHTML = `<div class="family">${HERO_KEYS.map((k) => `<span style="--c:${HEROES[k].card.color}">${HEROES[k].card.icon}</span>`).join('')}</div>
    <h1>${t('title')}</h1><p class="sub">${t('sub')}</p>`;
  const col = el('div', 'col');
  col.appendChild(btn('🤖 ' + t('vsCpu'), () => { setup.mode = 'cpu'; setupScreen(); }, 'big a'));
  col.appendChild(btn('👥 ' + t('twoP'), () => { setup.mode = '2p'; setupScreen(); }, 'big b'));
  col.appendChild(btn('📚 ' + t('library'), () => library('all', ''), 'c'));
  col.appendChild(btn('❓ ' + t('howto'), howto, 'c'));
  col.appendChild(btn('🌐 ' + t('lang'), () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en'; menu(); }, 'ghost'));
  box.appendChild(col);
  app.replaceChildren(box);
}
function howto() { const box = el('div', 'page'); box.appendChild(btn('‹ ' + t('back'), menu, 'ghost')); box.appendChild(el('div', 'panel howto', t('howtoText'))); app.replaceChildren(box); }
function heroPicker(i, label) {
  const wrap = el('div', 'picker'); wrap.appendChild(el('h3', '', label));
  const row = el('div', 'heroes');
  const keys = i === 1 && setup.mode === 'cpu' ? [...HERO_KEYS, 'random'] : HERO_KEYS;
  for (const k of keys) {
    const sel = setup.heroes[i] === k, h = HEROES[k];
    const b = el('div', 'hero' + (sel ? ' sel' : ''), k === 'random' ? `<div class="av" style="--c:#999">🎲</div><b>${t('random')}</b>`
      : `<div class="av" style="--c:${h.card.color}">${h.card.icon}</div><b>${esc(L(h.card.name))}</b><div class="spv">❤️ ${h.sp} ${t('sp')}</div><div class="pv">${esc(L(h.passive))}</div>`);
    b.onclick = () => { setup.heroes[i] = k; setupScreen(); };
    row.appendChild(b);
  }
  wrap.appendChild(row); return wrap;
}
function setupScreen() {
  if (setup.mode === '2p' && setup.heroes[1] === 'random') setup.heroes[1] = 'erin';
  const box = el('div', 'page'); box.appendChild(btn('‹ ' + t('back'), menu, 'ghost'));
  box.appendChild(heroPicker(0, setup.mode === 'cpu' ? t('you') : t('p1')));
  box.appendChild(heroPicker(1, setup.mode === 'cpu' ? t('cpu') : t('p2')));
  if (setup.mode === 'cpu') { const r = el('div', 'opts'); r.appendChild(el('b', '', t('cpuLevel'))); for (const lv of ['easy', 'normal']) r.appendChild(btn(t(lv), () => { setup.level = lv; setupScreen(); }, setup.level === lv ? 'on' : 'ghost')); box.appendChild(r); }
  box.appendChild(btn('▶ ' + t('start'), startGame, 'big a'));
  app.replaceChildren(box);
}

// ------------------------------------------------------------------ the game
function startGame() {
  const heroes = setup.heroes.map((k) => (k === 'random' ? HERO_KEYS[Math.floor(Math.random() * 4)] : k));
  G = E.newGame({ heroes, cpu: setup.mode === 'cpu' ? [false, setup.level] : [false, false], seed: Date.now() });
  lastSp = G.players.map((p) => p.sp); logLines = []; spot = null; hubBtn(false);
  readEvents();
  if (setup.mode === '2p') passScreen(); else { render(); maybeCpu(); }
}
const viewer = () => (setup.mode === 'cpu' ? 0 : G.cur);          // whose hand is shown at the bottom
function passScreen() {
  modal.classList.remove('hidden');
  modal.innerHTML = '';
  const b = el('div', 'pass');
  b.innerHTML = `<div class="av big" style="--c:${HEROES[G.players[G.cur].hero].card.color}">${HEROES[G.players[G.cur].hero].card.icon}</div><h2>${t('turnOf', { n: pname(G.cur) })}</h2><p>${t('passNote', { n: pname(G.cur) })}</p>`;
  b.appendChild(btn(t('ready'), () => { modal.classList.add('hidden'); render(); }, 'big a'));
  modal.appendChild(b); render(true);
}
function readEvents() {
  for (const e of G.events.splice(0)) {
    const who = e.p != null ? pname(e.p) : '';
    let line = null;
    if (e.kind === 'play') { line = `${who} ▶ ${C[e.id].icon} ${L(C[e.id].name)}`; spot = { id: e.id, p: e.p, t: Date.now() }; }
    if (e.kind === 'hurt') line = `${who} −${e.n} ${t('sp')}${e.why === 'poison' ? ' ☠️' : e.why === 'thorns' ? ' 🌵' : ''}`;
    if (e.kind === 'heal') line = `${who} +${e.n} ${t('sp')}`;
    if (e.kind === 'absorbed') line = `${who} 🛡️ ${e.n}`;
    if (e.kind === 'reflected') line = `${who} 🔁 ${t('reflect')}!`;
    if (e.kind === 'fatigue') line = `${who} 😵 ${getLang() === 'zh' ? '牌庫空了' : 'deck is empty'} −${e.n}`;
    if (e.kind === 'stolen') line = `${who} 🫳 ${getLang() === 'zh' ? '偷到一張牌' : 'stole a card'}`;
    if (e.kind === 'discarded') line = `${who} 🗑️ ${getLang() === 'zh' ? '棄了一張牌' : 'discarded a card'}`;
    if (e.kind === 'leave' || e.kind === 'wornout' || e.kind === 'cleared') line = `${e.id ? C[e.id].icon + ' ' + L(C[e.id].name) : ''} ${getLang() === 'zh' ? '離開了' : 'is gone'}`;
    if (e.kind === 'turn') line = `— ${t('turnOf', { n: pname(e.p) })} —`;
    if (line) logLines.push(line);
  }
  if (logLines.length > 40) logLines = logLines.slice(-40);
}
function statusChips(p) {
  const out = [];
  if (p.shield) out.push(`<span class="chip sh">🛡️ ${p.shield}</span>`);
  for (const x of p.poison) out.push(`<span class="chip bad">☠️ ${t('poison', { n: x.n })}·${x.t}</span>`);
  for (const x of p.regen) out.push(`<span class="chip good">💚 +${x.n}·${x.t}</span>`);
  if (p.tax) out.push(`<span class="chip bad">💸 ${t('tax', { n: p.tax })}</span>`);
  if (p.sap) out.push(`<span class="chip bad">🔌 ${t('sap', { n: p.sap })}</span>`);
  if (p.reflect) out.push(`<span class="chip good">🔁 ${t('reflect')}</span>`);
  return out.join('');
}
function side(i, bottom) {
  const p = G.players[i], h = HEROES[p.hero], cur = G.cur === i && G.winner == null;
  const s = el('div', 'side' + (bottom ? ' me' : ' them') + (cur ? ' active' : ''));
  const diff = p.sp - lastSp[i];
  s.innerHTML = `<div class="hero-box"><div class="av" style="--c:${h.card.color}">${h.card.icon}${diff ? `<span class="pop ${diff < 0 ? 'neg' : 'pos'}">${diff > 0 ? '+' : ''}${diff}</span>` : ''}</div>
    <div class="info"><b>${esc(pname(i))}</b><div class="spbar"><i style="width:${Math.max(0, p.sp / p.maxSp * 100)}%"></i><span>❤️ ${Math.max(0, p.sp)} / ${p.maxSp}</span></div>
    <div class="en">${'<i class="on"></i>'.repeat(Math.max(0, Math.min(p.energy, 12)))}${'<i></i>'.repeat(Math.max(0, p.maxEnergy - p.energy))}<span>⚡ ${p.energy}/${p.maxEnergy}</span></div>
    <div class="chips">${statusChips(p)}</div></div>
    <div class="counts">🂠 ${p.deck.length}<br>✋ ${p.hand.length}</div></div>`;
  const row = el('div', 'board-row');
  for (const a of p.allies) { const b = el('div', 'mini t-character', `${C[a.id].icon}<small>${a.left}</small>`); b.title = L(C[a.id].name); b.onclick = () => preview(a.id, null, `${t('turnsLeft', { n: a.left })}`); row.appendChild(b); }
  for (const it of p.items) { const b = el('div', 'mini t-item', `${C[it.id].icon}<small>${it.left}</small>`); b.title = L(C[it.id].name); b.onclick = () => preview(it.id, null, `${t('turnsLeft', { n: it.left })}`); row.appendChild(b); }
  s.appendChild(row);
  if (diff) setTimeout(() => { lastSp[i] = p.sp; }, 0);
  return s;
}
function render(hidden) {
  if (!G) return;
  const me = viewer(), them = 1 - me, P = G.players[me];
  const box = el('div', 'game');
  box.appendChild(side(them, false));
  // middle: location, the card just played, the log, end turn
  const mid = el('div', 'mid');
  const locBox = el('div', 'loc');
  if (G.loc) { const c = cardEl(G.loc.id, { small: true }); c.onclick = () => preview(G.loc.id, null, `${t('location')} · ${pname(G.loc.owner)}`); locBox.appendChild(c); locBox.appendChild(el('div', 'lbl', `🏠 ${esc(pname(G.loc.owner))}`)); }
  else locBox.appendChild(el('div', 'empty', t('noLoc')));
  mid.appendChild(locBox);
  const sp = el('div', 'spot');
  if (spot && Date.now() - spot.t < 2600) { const c = cardEl(spot.id, { small: true }); c.classList.add('fly'); sp.appendChild(c); sp.appendChild(el('div', 'lbl', esc(pname(spot.p)))); }
  mid.appendChild(sp);
  const lg = el('div', 'log'); lg.innerHTML = logLines.slice(-7).map((l) => `<div>${esc(l)}</div>`).join(''); mid.appendChild(lg);
  const myTurn = G.cur === me && G.winner == null && !G.cpu[G.cur];
  const end = btn(G.cpu[G.cur] && G.winner == null ? t('cpuThinking') : t('endTurn'), endTurn, 'endt' + (myTurn ? ' a' : ''));
  end.disabled = !myTurn || busy; mid.appendChild(end);
  box.appendChild(mid);
  box.appendChild(side(me, true));
  // the hand
  const hand = el('div', 'hand');
  if (!hidden) P.hand.forEach((id, i) => {
    const cost = E.costOf(G, P, id), playable = myTurn && cost <= P.energy;
    const c = cardEl(id, { cost, dim: !playable }); c.style.setProperty('--i', i - (P.hand.length - 1) / 2);
    c.onclick = () => preview(id, i);
    hand.appendChild(c);
  });
  box.appendChild(hand);
  app.replaceChildren(box);
  if (G.winner != null) setTimeout(gameOver, 900);
}
function preview(id, handIndex, note) {
  modal.classList.remove('hidden'); modal.innerHTML = '';
  const b = el('div', 'preview');
  const P = G && G.players[viewer()];
  const cost = handIndex != null && P ? E.costOf(G, P, id) : C[id].cost;
  b.appendChild(cardEl(id, { cost }));
  if (note) b.appendChild(el('div', 'note', esc(note)));
  const row = el('div', 'row');
  if (handIndex != null) {
    const myTurn = G.cur === viewer() && !G.cpu[G.cur] && G.winner == null;
    const ok2 = myTurn && cost <= P.energy;
    const pb = btn(`${t('play')} ⚡${cost}`, () => { modal.classList.add('hidden'); playCard(handIndex); }, ok2 ? 'a big' : 'big');
    if (!ok2) { pb.disabled = true; pb.textContent = myTurn ? t('notEnough') : t('notYourTurn'); }
    row.appendChild(pb);
  }
  row.appendChild(btn(t('cancel'), () => modal.classList.add('hidden'), 'ghost'));
  b.appendChild(row); modal.appendChild(b);
  modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
}
function playCard(i) {
  if (busy || !G || G.winner != null) return;
  if (E.playCard(G, i)) { readEvents(); render(); }
}
function endTurn() {
  if (busy || !G || G.winner != null) return;
  E.endTurn(G); readEvents();
  if (G.winner != null) { render(); return; }
  if (setup.mode === '2p') passScreen(); else { render(); maybeCpu(); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function maybeCpu() {
  if (!G || G.winner != null || !G.cpu[G.cur]) return;
  busy = true; render();
  await sleep(700);
  let guard = 0;
  while (G && G.winner == null && guard++ < 15) {
    const i = E.cpuPlan(G, G.cpu[G.cur]);
    if (i == null) break;
    E.playCard(G, i); readEvents(); render();
    await sleep(1100);
  }
  if (G && G.winner == null) { E.endTurn(G); readEvents(); }
  busy = false; render();
}
function gameOver() {
  if (!G || !modal.classList.contains('hidden')) return;
  modal.classList.remove('hidden'); modal.innerHTML = '';
  const b = el('div', 'pass over');
  const w = G.winner;
  b.innerHTML = w === 'draw' ? `<h2>${t('draw')}</h2>` : `<div class="av big" style="--c:${HEROES[G.players[w].hero].card.color}">${HEROES[G.players[w].hero].card.icon}</div><h2>🏆 ${t('win', { n: pname(w) })}</h2>`;
  b.appendChild(el('p', '', `${t('turns')}: ${G.turn} · ${G.players.map((p) => `${pname(p.i)} ❤️${Math.max(0, p.sp)}`).join(' · ')}`));
  const row = el('div', 'row'); row.appendChild(btn('🔁 ' + t('again'), startGame, 'a big')); row.appendChild(btn('🏠 ' + t('menu'), menu, 'ghost')); b.appendChild(row);
  modal.appendChild(b);
}

// ------------------------------------------------------------------ the card library
function library(type, query) {
  const box = el('div', 'page');
  box.appendChild(btn('‹ ' + t('back'), menu, 'ghost'));
  const bar = el('div', 'opts');
  for (const ty of ['all', 'character', 'action', 'item', 'location']) {
    const n = ty === 'all' ? DB.cards.length : DB.cards.filter((c) => c.type === ty).length;
    bar.appendChild(btn(`${ty === 'all' ? t('all') : t(TYPE_LABEL[ty])} ${n}`, () => library(ty, query), type === ty ? 'on' : 'ghost'));
  }
  const inp = el('input', 'search'); inp.placeholder = t('search'); inp.value = query;
  inp.oninput = () => { clearTimeout(inp._t); inp._t = setTimeout(() => { library(type, inp.value); const n = $('.search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  bar.appendChild(inp); box.appendChild(bar);
  const grid = el('div', 'grid');
  const qq = query.trim().toLowerCase();
  for (const c of DB.cards) {
    if (type !== 'all' && c.type !== type) continue;
    if (qq && !(`${c.id} ${c.name.zh} ${c.name.en} ${c.effect.zh} ${c.effect.en}`.toLowerCase().includes(qq))) continue;
    const d = cardEl(c.id); d.onclick = () => preview(c.id, null, `${c.id} · ${t('cost')} ${c.cost} · ${t('value')} ${c.value}`); grid.appendChild(d);
  }
  box.appendChild(grid);
  app.replaceChildren(box);
}

document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en';
document.title = t('title') + (getLang() === 'zh' ? ' Family Sanity Showdown' : '');
menu();
window.__fss = { get G() { return G; }, E, startGame, setup, menu, library, render, endTurn, playCard, get busy() { return busy; } };
