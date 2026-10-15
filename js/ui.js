// Family Sanity Showdown: menus, packs, the collection, deck building, the battle board, hot-seat turns, the computer.
import * as E from './engine.js?v=2';
import * as K from './collection.js?v=1';
import { t, L, getLang, setLang } from './i18n.js?v=2';

const $ = (s) => document.querySelector(s);
const app = $('#app'), modal = $('#modal');
const C = E.CARDS, HEROES = E.HEROES, HERO_KEYS = Object.keys(HEROES);
const TYPES = ['character', 'action', 'item', 'location'];
const TYPE_LABEL = { character: 'character', action: 'action', item: 'item', location: 'locationT' };
let G = null, busy = false, lastSp = [0, 0], logLines = [], spot = null, match = null;
let setup = { mode: 'cpu', decks: [null, null], opp: 'random', level: 'normal' };
const hubBtn = (show) => { const h = document.getElementById('hub-back'); if (h) h.style.display = show ? '' : 'none'; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const btn = (label, fn, cls = '') => { const b = el('button', 'btn ' + cls, label); b.onclick = fn; return b; };
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
let toastT = 0; const toast = (m) => { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1800); };
const heroName = (k) => L(HEROES[k].card.name).split(/[ （(]/)[0];
const closeModal = () => { modal.classList.add('hidden'); modal.innerHTML = ''; };

// ------------------------------------------------------------------ the player's profile (saved here and in the cloud)
const SAVE = 'fss.profile.v1';
let P = load(), cloud = null;
function load() { try { return K.normalize(JSON.parse(localStorage.getItem(SAVE))); } catch (e) { return K.newProfile(); } }
function save() { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (e) { /* private mode */ } if (cloud) cloud.touch('family-cards', SAVE); }
if (K.daily(P)) setTimeout(() => toast(t('dailyGift')), 600);
save();
import('/save.js').then(async (m) => { cloud = m; if (await m.pull('family-cards', SAVE)) { P = load(); if (K.daily(P)) toast(t('dailyGift')); save(); if (!G) menu(); } }).catch(() => {});
const deckName = (d) => d.name || t('deckOf', { n: heroName(d.hero) });
const coinBar = () => `<div class="wallet"><span>🪙 <b>${P.coins}</b></span>${P.freePacks ? `<span class="fp">🎁 ${t('freePacks', { n: P.freePacks })}</span>` : ''}</div>`;

// ------------------------------------------------------------------ a card
function cardEl(id, o = {}) {
  const c = C[id], d = el('div', `card t-${c.type} r-${c.rarity}${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}${o.locked ? ' locked' : ''}`);
  const cost = o.cost ?? c.cost;
  d.innerHTML = `<div class="cost${cost !== c.cost ? (cost < c.cost ? ' cheaper' : ' pricier') : ''}">${cost}</div>
    ${c.hero && c.type !== 'character' ? `<div class="sig" title="${esc(heroName(c.hero))}">★${esc(heroName(c.hero))}</div>` : ''}
    <div class="art">${c.icon}</div><div class="nm">${esc(L(c.name))}</div><div class="ty">${t(TYPE_LABEL[c.type])}${c.turns ? ` · ${c.turns}${getLang() === 'zh' ? '回合' : 'T'}` : ''}</div>
    <div class="fx">${esc(L(c.effect))}</div><div class="gem" title="${t(c.rarity)}"></div><div class="id">${c.id}</div>
    ${o.count != null ? `<div class="cnt">×${o.count}</div>` : ''}${o.badge ? `<div class="badge">${o.badge}</div>` : ''}`;
  return d;
}

// ------------------------------------------------------------------ menu
function menu() {
  G = null; match = null; hubBtn(true); closeModal();
  const box = el('div', 'menu');
  box.innerHTML = `<div class="family">${HERO_KEYS.map((k) => `<span style="--c:${HEROES[k].card.color}">${HEROES[k].card.icon}</span>`).join('')}</div>
    <h1>${t('title')}</h1><p class="sub">${t('sub')}</p>${coinBar()}`;
  const col = el('div', 'col');
  col.appendChild(btn('🤖 ' + t('vsCpu'), () => { setup.mode = 'cpu'; setupScreen(); }, 'big a'));
  col.appendChild(btn('👥 ' + t('twoP'), () => { setup.mode = '2p'; setupScreen(); }, 'big b'));
  col.appendChild(btn('🎁 ' + t('shop') + (P.freePacks ? ` <span class="dot">${P.freePacks}</span>` : ''), shop, 'big pk'));
  const row = el('div', 'two');
  row.appendChild(btn('🗂️ ' + t('decks'), decks, 'c'));
  row.appendChild(btn('📚 ' + t('collection'), () => collection(), 'c'));
  col.appendChild(row);
  const row2 = el('div', 'two');
  row2.appendChild(btn('❓ ' + t('howto'), howto, 'ghost'));
  row2.appendChild(btn('🌐 ' + t('lang'), () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en'; menu(); }, 'ghost'));
  col.appendChild(row2);
  box.appendChild(col);
  app.replaceChildren(box);
}
function page(title) {
  const box = el('div', 'page'), top = el('div', 'topbar');
  top.appendChild(btn('‹ ' + t('back'), menu, 'ghost'));
  top.appendChild(el('h2', '', title));
  top.appendChild(el('div', '', coinBar()));
  box.appendChild(top); return box;
}
function howto() { const box = page(t('howto')); box.appendChild(el('div', 'panel howto', t('howtoText'))); app.replaceChildren(box); }

// ------------------------------------------------------------------ the shop and opening packs
function shop() {
  hubBtn(true);
  const box = page('🎁 ' + t('shop'));
  box.appendChild(el('p', 'note', `${t('packOdds')} <b>${t('pityLeft', { n: K.PITY - P.stats.sinceLegend })}</b>`));
  const grid = el('div', 'packs');
  for (const pk of K.PACKS) {
    const d = el('div', `packcard p-${pk.id}`);
    d.innerHTML = `<div class="packart"><span>${pk.icon}</span><b>${t('pack_' + pk.id)}</b></div>
      <p>${pk.hero ? t('packNote_hero', { n: heroName(pk.hero) }) : t('packNote_basic')}</p>`;
    const row = el('div', 'row');
    if (pk.id === 'basic' && P.freePacks > 0) row.appendChild(btn(`🎁 ${t('openFree')} (${P.freePacks})`, () => buyPack(pk.id, true), 'a'));
    const b = btn(`${t('buy')} 🪙${pk.price}`, () => buyPack(pk.id, false), P.coins >= pk.price ? 'b' : '');
    if (P.coins < pk.price) b.disabled = true;
    row.appendChild(b); d.appendChild(row); grid.appendChild(d);
  }
  box.appendChild(grid);
  app.replaceChildren(box);
}
function buyPack(id, free) {
  const r = K.openPack(P, id, { free });
  if (r.error) { toast(t('noCoins')); return; }
  save(); opening(id, r);
}
function opening(packId, r) {
  hubBtn(false);
  const pk = K.PACKS.find((k) => k.id === packId);
  const box = el('div', 'opening');
  const pack = el('div', `bigpack p-${pk.id}`, `<span>${pk.icon}</span><b>${t('pack_' + pk.id)}</b><i class="tear"></i>`);
  box.appendChild(el('p', 'hint', t('tapPack'))); box.appendChild(pack);
  app.replaceChildren(box);
  pack.onclick = () => { if (pack.classList.contains('torn')) return; pack.classList.add('torn'); setTimeout(showCards, 550); };
  function showCards() {
    box.innerHTML = '';
    box.appendChild(el('p', 'hint', t('tapCards')));
    const row = el('div', 'reveal');
    let left = r.cards.length;
    const summary = el('div', 'summary hidden');
    r.cards.forEach((card, k) => {
      const f = el('div', `flip r-${card.rarity}`);
      f.style.animationDelay = k * 0.08 + 's';
      f.appendChild(el('div', 'back', '<span>🃏</span>'));
      f.appendChild(cardEl(card.id, { badge: card.isNew ? t('newCard') : card.dust ? t('toCoins', { n: card.dust }) : null }));
      f.onclick = () => {
        if (f.classList.contains('open')) { cardInfo(card.id, () => {}); return; }
        f.classList.add('open'); left--;
        if (card.rarity === 'legendary') { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); }
        if (!left) { summary.classList.remove('hidden'); all.remove(); }
      };
      row.appendChild(f);
    });
    box.appendChild(row);
    const all = btn(t('flipAll'), () => row.querySelectorAll('.flip:not(.open)').forEach((f, k) => setTimeout(() => { if (!f.classList.contains('open')) f.click(); }, k * 200)), 'ghost');
    box.appendChild(all);
    const nNew = r.cards.filter((c) => c.isNew).length;
    summary.innerHTML = `<p>✨ ${t('newCards', { n: nNew })}${r.dust ? ` · ${t('dustNote', { n: r.dust })}` : ''} · 🪙 ${P.coins}</p>`;
    const act = el('div', 'row');
    const useFree = packId === 'basic' && P.freePacks > 0;
    const again = btn('🎁 ' + t('openAnother') + (useFree ? ` (${t('free')})` : ` 🪙${pk.price}`), () => buyPack(packId, useFree), 'a');
    if (K.canOpen(P, packId, useFree)) again.disabled = true;
    act.appendChild(again); act.appendChild(btn('📚 ' + t('toCollection'), () => collection(), 'c')); act.appendChild(btn(t('toShop'), shop, 'ghost'));
    summary.appendChild(act); box.appendChild(summary);
  }
}

// ------------------------------------------------------------------ the collection
const colF = { type: 'all', rarity: 'all', owned: false, q: '' };
function filterBar(f, redraw, withOwned) {
  const bar = el('div', 'filters');
  const tabs = el('div', 'opts');
  for (const ty of ['all', ...TYPES]) tabs.appendChild(btn(ty === 'all' ? t('all') : t(TYPE_LABEL[ty]), () => { f.type = ty; redraw(); }, (f.type === ty ? 'on' : 'ghost') + ' sm'));
  bar.appendChild(tabs);
  const rs = el('div', 'opts');
  for (const r of ['all', ...K.RARITY]) rs.appendChild(btn(r === 'all' ? t('rarity') : `<i class="g r-${r}"></i>${t(r)}`, () => { f.rarity = r; redraw(); }, (f.rarity === r ? 'on' : 'ghost') + ' sm'));
  if (withOwned) rs.appendChild(btn(f.owned ? '☑ ' + t('ownedOnly') : '☐ ' + t('ownedOnly'), () => { f.owned = !f.owned; redraw(); }, 'ghost sm'));
  const inp = el('input', 'search'); inp.placeholder = t('search'); inp.value = f.q;
  inp.oninput = () => { clearTimeout(inp._t); inp._t = setTimeout(() => { f.q = inp.value; redraw(); const n = $('.search'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 300); };
  rs.appendChild(inp);
  bar.appendChild(rs);
  return bar;
}
function matches(c, f) {
  if (f.type !== 'all' && c.type !== f.type) return false;
  if (f.rarity !== 'all' && c.rarity !== f.rarity) return false;
  const q = f.q.trim().toLowerCase();
  return !q || `${c.id} ${c.name.zh} ${c.name.en} ${c.effect.zh} ${c.effect.en}`.toLowerCase().includes(q);
}
function collection() {
  hubBtn(true);
  const have = K.COLLECTIBLE.filter((c) => K.owned(P, c.id)).length;
  const box = page('📚 ' + t('collection'));
  box.appendChild(el('p', 'note', t('collected', { a: have, b: K.COLLECTIBLE.length })));
  box.appendChild(filterBar(colF, collection, true));
  const grid = el('div', 'grid');
  for (const c of K.COLLECTIBLE) {
    if (!matches(c, colF)) continue;
    const n = K.owned(P, c.id); if (colF.owned && !n) continue;
    const d = cardEl(c.id, { locked: !n, count: n || null });
    d.onclick = () => cardInfo(c.id);
    grid.appendChild(d);
  }
  box.appendChild(grid);
  const y = window.scrollY; app.replaceChildren(box); window.scrollTo(0, y);
}
function cardInfo(id, after = collection) {
  const c = C[id], n = K.owned(P, id), max = K.maxCopies(id);
  modal.classList.remove('hidden'); modal.innerHTML = '';
  const b = el('div', 'preview');
  b.appendChild(cardEl(id));
  b.appendChild(el('div', 'note', `<i class="g r-${c.rarity}"></i> ${t(c.rarity)} · ${t('ownedN', { a: n, b: max })}`));
  const row = el('div', 'row');
  if (n < max) {
    const price = K.CRAFT[c.rarity];
    const cb = btn(t('craftBtn', { n: price }), () => { if (!K.craft(P, id)) { save(); toast(t('crafted', { n: L(c.name) })); closeModal(); after(); } }, P.coins >= price ? 'a big' : 'big');
    if (P.coins < price) { cb.disabled = true; cb.title = t('noCoins'); }
    row.appendChild(cb);
  } else row.appendChild(el('span', 'note', '✅ ' + t('maxed')));
  row.appendChild(btn(t('cancel'), closeModal, 'ghost'));
  b.appendChild(row); modal.appendChild(b);
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}

// ------------------------------------------------------------------ decks
function deckStatus(d) {
  const pr = K.deckProblems(P, d);
  if (!pr.length) return { ok: true, text: '✅ ' + t('ready2') };
  const size = pr.find((x) => x.code === 'size');
  if (size) return { ok: false, text: '⚠️ ' + (size.n < K.DECK_SIZE ? t('needN', { n: K.DECK_SIZE - size.n }) : t('tooMany', { n: size.n - K.DECK_SIZE })) };
  return { ok: false, text: '⚠️ ' + t('problemCards') };
}
function deckTile(d, onClick, extra) {
  const h = HEROES[d.hero], st = deckStatus(d);
  const tile = el('div', 'decktile' + (st.ok ? '' : ' bad'));
  const leg = d.cards.filter((id) => C[id].rarity === 'legendary').length, epic = d.cards.filter((id) => C[id].rarity === 'epic').length;
  tile.innerHTML = `<div class="av" style="--c:${h.card.color}">${h.card.icon}</div><div class="dinfo"><b>${esc(deckName(d))}</b>
    <small>${t('cardsN', { n: d.cards.length })} · ${st.text}</small><small><i class="g r-legendary"></i>${leg} <i class="g r-epic"></i>${epic}</small></div>`;
  if (onClick) tile.onclick = onClick;
  if (extra) tile.appendChild(extra);
  return tile;
}
function decks() {
  hubBtn(true);
  const box = page('🗂️ ' + t('decks'));
  const list = el('div', 'decklist');
  for (const d of P.decks) {
    const acts = el('div', 'row');
    acts.appendChild(btn(t('edit'), (e) => { e.stopPropagation(); editor(d); }, 'b sm'));
    acts.appendChild(btn(t('del'), (e) => { e.stopPropagation(); if (confirm(t('delAsk', { n: deckName(d) }))) { P.decks = P.decks.filter((x) => x !== d); save(); decks(); } }, 'ghost sm'));
    list.appendChild(deckTile(d, () => editor(d), acts));
  }
  box.appendChild(list);
  const nb = btn(t('newDeck'), newDeck, 'a big');
  if (P.decks.length >= K.MAX_DECKS) { nb.disabled = true; nb.title = t('maxDecks'); }
  box.appendChild(nb);
  app.replaceChildren(box);
}
function newDeck() {
  modal.classList.remove('hidden'); modal.innerHTML = '';
  const b = el('div', 'pass');
  b.appendChild(el('h2', '', t('pickHeroDeck')));
  const row = el('div', 'heroes small');
  for (const k of HERO_KEYS) {
    const h = HEROES[k], x = el('div', 'hero', `<div class="av" style="--c:${h.card.color}">${h.card.icon}</div><b>${esc(heroName(k))}</b>`);
    x.onclick = () => { const d = { id: Math.random().toString(36).slice(2, 9), name: null, hero: k, cards: [] }; P.decks.push(d); save(); closeModal(); editor(d); };
    row.appendChild(x);
  }
  b.appendChild(row); b.appendChild(btn(t('cancel'), closeModal, 'ghost'));
  modal.appendChild(b);
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}
const edF = { type: 'all', rarity: 'all', owned: true, q: '' };
function editor(d) {
  hubBtn(false);
  const redraw = () => editor(d);
  const box = el('div', 'page editor');
  const top = el('div', 'topbar');
  top.appendChild(btn('‹ ' + t('done'), () => { save(); decks(); }, 'a'));
  const name = el('input', 'dname'); name.value = d.name || ''; name.placeholder = t('deckOf', { n: heroName(d.hero) }); name.maxLength = 20;
  name.onchange = () => { d.name = name.value.trim() || null; save(); };
  top.appendChild(name);
  const heroes = el('div', 'opts');
  for (const k of HERO_KEYS) heroes.appendChild(btn(HEROES[k].card.icon, () => { d.hero = k; save(); redraw(); }, (d.hero === k ? 'on' : 'ghost') + ' sm hb'));
  top.appendChild(heroes);
  box.appendChild(top);
  // the deck itself
  const side = el('div', 'deckside');
  const st = deckStatus(d);
  side.innerHTML = `<div class="dhead"><b>${t('cardsN', { n: d.cards.length })}</b><span class="${st.ok ? 'okc' : 'badc'}">${st.text}</span></div>`;
  const curve = el('div', 'curve'), counts = Array(8).fill(0);
  for (const id of d.cards) counts[Math.min(7, C[id].cost)]++;
  const mx = Math.max(1, ...counts);
  counts.forEach((n, k) => curve.appendChild(el('div', 'bar', `<i style="height:${n / mx * 100}%"></i><span>${n || ''}</span><small>${k === 7 ? '7+' : k}</small>`)));
  side.appendChild(curve);
  const tools = el('div', 'row');
  tools.appendChild(btn('✨ ' + t('autoFill'), () => { d.cards = K.autoDeck(P, d.hero, d.cards); save(); redraw(); }, 'b sm'));
  tools.appendChild(btn(t('clear'), () => { d.cards = []; save(); redraw(); }, 'ghost sm'));
  side.appendChild(tools);
  const list = el('div', 'dlist');
  const groups = {}; for (const id of K.sortDeck(d.cards)) groups[id] = (groups[id] || 0) + 1;
  for (const [id, n] of Object.entries(groups)) {
    const c = C[id], over = n > K.owned(P, id) || n > K.maxCopies(id);
    const r = el('div', `drow t-${c.type}${over ? ' over' : ''}`, `<span class="dc">${c.cost}</span><span class="di">${c.icon}</span><span class="dn">${esc(L(c.name))}</span><i class="g r-${c.rarity}"></i><span class="dx">×${n}</span>`);
    r.title = L(c.effect);
    r.onclick = () => { d.cards.splice(d.cards.indexOf(id), 1); save(); redraw(); };
    list.appendChild(r);
  }
  side.appendChild(list);
  // your collection
  const main = el('div', 'deckmain');
  main.appendChild(filterBar(edF, redraw, true));
  const grid = el('div', 'grid');
  for (const c of K.COLLECTIBLE) {
    if (!matches(c, edF)) continue;
    const own = K.owned(P, c.id); if (edF.owned && !own) continue;
    const inDeck = K.countIn(d.cards, c.id), lim = Math.min(own, K.maxCopies(c.id));
    const card = cardEl(c.id, { dim: own && inDeck >= lim, locked: !own, badge: inDeck ? `${t('inDeck')} ${inDeck}/${lim}` : null, count: own || null });
    card.onclick = () => {
      if (!own) return cardInfo(c.id, redraw);
      if (d.cards.length >= K.DECK_SIZE) return toast(t('deckFull'));
      if (inDeck >= K.maxCopies(c.id)) return toast(t('copyLimit', { n: K.maxCopies(c.id) }));
      if (inDeck >= own) return toast(t('needOwn', { n: own }));
      d.cards.push(c.id); save(); redraw();
    };
    grid.appendChild(card);
  }
  main.appendChild(grid);
  const wrap = el('div', 'edwrap'); wrap.appendChild(side); wrap.appendChild(main);
  box.appendChild(wrap);
  const y = window.scrollY; app.replaceChildren(box); window.scrollTo(0, y);
}

// ------------------------------------------------------------------ choosing decks before a match
const deckById = (id) => P.decks.find((d) => d.id === id && deckStatus(d).ok);
function deckChooser(i, label) {
  const wrap = el('div', 'picker'); wrap.appendChild(el('h3', '', label));
  const row = el('div', 'decklist');
  for (const d of P.decks) {
    const ok = deckStatus(d).ok;
    const tile = deckTile(d, ok ? () => { setup.decks[i] = d.id; setupScreen(); } : () => editor(d));
    if (setup.decks[i] === d.id) tile.classList.add('sel');
    row.appendChild(tile);
  }
  if (setup.mode === '2p') {
    for (const k of HERO_KEYS) {
      const q = 'quick:' + k, h = HEROES[k];
      const tile = el('div', 'decktile quick' + (setup.decks[i] === q ? ' sel' : ''), `<div class="av" style="--c:${h.card.color}">${h.card.icon}</div><div class="dinfo"><b>${esc(heroName(k))}</b><small>🎲 ${t('quickDeck')}</small></div>`);
      tile.onclick = () => { setup.decks[i] = q; setupScreen(); };
      row.appendChild(tile);
    }
  }
  wrap.appendChild(row); return wrap;
}
const validChoice = (v) => String(v).startsWith('quick:') ? setup.mode === '2p' : !!deckById(v);
function setupScreen() {
  hubBtn(true);
  const firstOk = (P.decks.find((d) => deckStatus(d).ok) || {}).id || null;
  if (!validChoice(setup.decks[0])) setup.decks[0] = firstOk || (setup.mode === '2p' ? 'quick:jeff' : null);
  if (setup.mode === '2p' && !validChoice(setup.decks[1])) setup.decks[1] = 'quick:erin';
  const box = page(setup.mode === 'cpu' ? '🤖 ' + t('vsCpu') : '👥 ' + t('twoP'));
  if (!setup.decks[0]) { box.appendChild(el('p', 'panel', t('noValidDeck'))); box.appendChild(btn('🗂️ ' + t('decks'), decks, 'a big')); app.replaceChildren(box); return; }
  if (setup.mode === 'cpu') {
    box.appendChild(deckChooser(0, t('yourDeck')));
    const pk = el('div', 'picker'); pk.appendChild(el('h3', '', t('opponent')));
    const row = el('div', 'opts');
    for (const k of [...HERO_KEYS, 'random']) row.appendChild(btn(k === 'random' ? '🎲 ' + t('random') : `${HEROES[k].card.icon} ${esc(heroName(k))}`, () => { setup.opp = k; setupScreen(); }, setup.opp === k ? 'on' : 'ghost'));
    pk.appendChild(row);
    const lv = el('div', 'opts'); lv.appendChild(el('b', '', t('cpuLevel')));
    for (const x of ['easy', 'normal']) lv.appendChild(btn(t(x), () => { setup.level = x; setupScreen(); }, setup.level === x ? 'on' : 'ghost'));
    pk.appendChild(lv); box.appendChild(pk);
  } else {
    box.appendChild(deckChooser(0, t('p1')));
    box.appendChild(deckChooser(1, t('p2')));
  }
  box.appendChild(btn('▶ ' + t('start'), startGame, 'big a'));
  app.replaceChildren(box);
}

// ------------------------------------------------------------------ the game
function pickDeck(i) {                                   // [hero, cards | null] for player i
  if (i === 1 && setup.mode === 'cpu') { const h = setup.opp === 'random' ? HERO_KEYS[Math.floor(Math.random() * 4)] : setup.opp; return [h, K.cpuDeck({ seed: Date.now() % 1e9 + 7 }, h, setup.level)]; }
  const v = setup.decks[i];
  if (String(v).startsWith('quick:')) return [v.slice(6), null];
  const d = deckById(v); return [d.hero, d.cards.slice()];
}
function startGame() {
  const a = pickDeck(0), b = pickDeck(1);
  G = E.newGame({ heroes: [a[0], b[0]], decks: [a[1], b[1]], cpu: setup.mode === 'cpu' ? [false, setup.level] : [false, false], seed: Date.now() });
  match = { mode: setup.mode, level: setup.level, rewarded: false };
  lastSp = G.players.map((p) => p.sp); logLines = []; spot = null; hubBtn(false);
  readEvents();
  if (setup.mode === '2p') passScreen(); else { render(); maybeCpu(); }
}
const pname = (i) => { const who = heroName(G.players[i].hero); return G.cpu[i] ? (getLang() === 'en' ? `${who} (${t('cpu')})` : `${who}（${t('cpu')}）`) : who; };
const viewer = () => (setup.mode === 'cpu' ? 0 : G.cur);          // whose hand is shown at the bottom
function passScreen() {
  modal.classList.remove('hidden'); modal.innerHTML = '';
  const h = HEROES[G.players[G.cur].hero];
  const b = el('div', 'pass');
  b.innerHTML = `<div class="av big" style="--c:${h.card.color}">${h.card.icon}</div><h2>${t('turnOf', { n: pname(G.cur) })}</h2><p>${t('passNote', { n: pname(G.cur) })}</p>`;
  b.appendChild(btn(t('ready'), () => { closeModal(); render(); }, 'big a'));
  modal.appendChild(b); modal.onclick = null; render(true);
}
function readEvents() {
  const zh = getLang() === 'zh';
  for (const e of G.events.splice(0)) {
    const who = e.p != null ? pname(e.p) : '';
    let line = null;
    if (e.kind === 'play') { line = `${who} ▶ ${C[e.id].icon} ${L(C[e.id].name)}`; spot = { id: e.id, p: e.p, t: Date.now() }; }
    if (e.kind === 'hurt') line = `${who} −${e.n} ${t('sp')}${e.why === 'poison' ? ' ☠️' : e.why === 'thorns' ? ' 🌵' : ''}`;
    if (e.kind === 'heal') line = `${who} +${e.n} ${t('sp')}`;
    if (e.kind === 'absorbed') line = `${who} 🛡️ ${e.n}`;
    if (e.kind === 'reflected') line = `${who} 🔁 ${t('reflect')}!`;
    if (e.kind === 'fatigue') line = `${who} 😵 ${zh ? '沒牌可抽了' : 'no cards left'} −${e.n}`;
    if (e.kind === 'reshuffle') line = `${who} 🔄 ${zh ? '棄牌洗回牌庫' : 'reshuffled the discard pile'} −${e.n}`;
    if (e.kind === 'ramp') line = `${who} ⚡ ${zh ? '能量上限' : 'max energy'} +${e.n}`;
    if (e.kind === 'cleanse') line = `${who} ✨ ${zh ? '壞效果清除了' : 'bad effects removed'}`;
    if (e.kind === 'stolen') line = `${who} 🫳 ${zh ? '偷到一張牌' : 'stole a card'}`;
    if (e.kind === 'discarded') line = `${who} 🗑️ ${zh ? '棄了一張牌' : 'discarded a card'}`;
    if (e.kind === 'leave' || e.kind === 'wornout' || e.kind === 'cleared') line = `${e.id ? C[e.id].icon + ' ' + L(C[e.id].name) : ''} ${zh ? '離開了' : 'is gone'}`;
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
  for (const a of p.allies) { const b = el('div', 'mini t-character', `${C[a.id].icon}<small>${a.left}</small>`); b.title = L(C[a.id].name); b.onclick = () => preview(a.id, null, t('turnsLeft', { n: a.left })); row.appendChild(b); }
  for (const it of p.items) { const b = el('div', 'mini t-item', `${C[it.id].icon}<small>${it.left}</small>`); b.title = L(C[it.id].name); b.onclick = () => preview(it.id, null, t('turnsLeft', { n: it.left })); row.appendChild(b); }
  s.appendChild(row);
  if (diff) setTimeout(() => { lastSp[i] = p.sp; }, 0);
  return s;
}
function render(hidden) {
  if (!G) return;
  const me = viewer(), them = 1 - me, Pl = G.players[me];
  const box = el('div', 'game');
  box.appendChild(side(them, false));
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
  const hand = el('div', 'hand');
  if (!hidden) Pl.hand.forEach((id, i) => {
    const cost = E.costOf(G, Pl, id), playable = myTurn && cost <= Pl.energy;
    const c = cardEl(id, { cost, dim: !playable }); c.style.setProperty('--i', i - (Pl.hand.length - 1) / 2);
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
  const Pl = G && G.players[viewer()];
  const cost = handIndex != null && Pl ? E.costOf(G, Pl, id) : C[id].cost;
  b.appendChild(cardEl(id, { cost }));
  if (note) b.appendChild(el('div', 'note', esc(note)));
  const row = el('div', 'row');
  if (handIndex != null) {
    const myTurn = G.cur === viewer() && !G.cpu[G.cur] && G.winner == null;
    const ok2 = myTurn && cost <= Pl.energy;
    const pb = btn(`${t('play')} ⚡${cost}`, () => { closeModal(); playCard(handIndex); }, ok2 ? 'a big' : 'big');
    if (!ok2) { pb.disabled = true; pb.textContent = myTurn ? t('notEnough') : t('notYourTurn'); }
    row.appendChild(pb);
  }
  row.appendChild(btn(t('cancel'), closeModal, 'ghost'));
  b.appendChild(row); modal.appendChild(b);
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
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
  const w = G.winner;
  if (match && !match.rewarded) { match.rewarded = true; match.got = K.reward(P, match.mode, match.level, match.mode === '2p' || w === 0); save(); }
  const got = match ? match.got : 0;
  modal.classList.remove('hidden'); modal.innerHTML = '';
  const b = el('div', 'pass over');
  b.innerHTML = w === 'draw' ? `<h2>${t('draw')}</h2>` : `<div class="av big" style="--c:${HEROES[G.players[w].hero].card.color}">${HEROES[G.players[w].hero].card.icon}</div><h2>🏆 ${t('win', { n: pname(w) })}</h2>`;
  b.appendChild(el('p', '', `${t('turns')}: ${G.turn} · ${G.players.map((p) => `${pname(p.i)} ❤️${Math.max(0, p.sp)}`).join(' · ')}`));
  if (got) b.appendChild(el('p', 'reward', `${t('reward', { n: got })}<br><small>${t('nowCoins', { n: P.coins })}</small>`));
  const row = el('div', 'row');
  row.appendChild(btn('🔁 ' + t('again'), () => { closeModal(); startGame(); }, 'a big'));
  row.appendChild(btn('🎁 ' + t('shop'), () => { closeModal(); G = null; shop(); }, 'b'));
  row.appendChild(btn('🏠 ' + t('menu'), menu, 'ghost'));
  b.appendChild(row);
  modal.appendChild(b); modal.onclick = null;
}

document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en';
document.title = t('title') + (getLang() === 'zh' ? ' Family Sanity Showdown' : '');
menu();
window.__fss = { get G() { return G; }, get P() { return P; }, E, K, startGame, setup, menu, shop, buyPack, collection, decks, editor, setupScreen, render, endTurn, playCard, save, get busy() { return busy; } };
