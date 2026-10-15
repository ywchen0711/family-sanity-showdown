// Chinese / English. ?lang=zh|en from the lobby wins, then the saved choice, then the browser.
const q = (typeof location !== 'undefined' && location.search.match(/[?&]lang=(zh|en)(?![a-z])/)) || null;
let lang = q ? q[1] : null;
try { if (lang) localStorage.setItem('fss_lang', lang); else lang = localStorage.getItem('fss_lang'); } catch (e) { /* ignore */ }
if (lang !== 'zh' && lang !== 'en') lang = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem('fss_lang', l); } catch (e) { /* ignore */ } }
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en);
const S = {
  title: { zh: '家庭理智大作戰', en: 'Family Sanity Showdown' }, sub: { zh: 'Jeff、Erin、Josh、Jasper 的卡牌對決', en: 'A card battle for Jeff, Erin, Josh and Jasper' },
  vsCpu: { zh: '對戰電腦', en: 'vs Computer' }, twoP: { zh: '雙人對戰（同一台）', en: '2 Players (same device)' }, library: { zh: '卡牌圖鑑', en: 'Card Library' }, howto: { zh: '玩法說明', en: 'How to Play' },
  back: { zh: '返回', en: 'Back' }, start: { zh: '開始對戰！', en: 'Start!' }, easy: { zh: '簡單', en: 'Easy' }, normal: { zh: '普通', en: 'Normal' }, cpuLevel: { zh: '電腦難度', en: 'Computer' },
  p1: { zh: '玩家 1', en: 'Player 1' }, p2: { zh: '玩家 2', en: 'Player 2' }, cpu: { zh: '電腦', en: 'Computer' }, you: { zh: '你', en: 'You' }, random: { zh: '隨機', en: 'Random' },
  pickHero: { zh: '選擇角色', en: 'Choose a hero' }, sp: { zh: '理智', en: 'SP' }, energy: { zh: '能量', en: 'Energy' }, deck: { zh: '牌庫', en: 'Deck' }, hand: { zh: '手牌', en: 'Hand' },
  endTurn: { zh: '結束回合', en: 'End Turn' }, play: { zh: '打出', en: 'Play' }, cancel: { zh: '取消', en: 'Cancel' }, notEnough: { zh: '能量不夠', en: 'Not enough energy' }, notYourTurn: { zh: '還沒輪到你', en: 'Not your turn' },
  turnOf: { zh: '輪到 {n} 了', en: "{n}'s turn" }, ready: { zh: '我準備好了', en: "I'm ready" }, passNote: { zh: '把裝置交給 {n}，其他人不要偷看手牌喔！', en: 'Pass the device to {n} — no peeking at the cards!' },
  noLoc: { zh: '（還沒有場地）', en: '(no location yet)' }, location: { zh: '場地', en: 'Location' },
  win: { zh: '{n} 獲勝！', en: '{n} wins!' }, draw: { zh: '平手！', en: "It's a draw!" }, again: { zh: '再玩一次', en: 'Play again' }, menu: { zh: '主選單', en: 'Main menu' },
  turns: { zh: '回合數', en: 'Turns' }, cardsPlayed: { zh: '出牌數', en: 'Cards played' },
  all: { zh: '全部', en: 'All' }, character: { zh: '角色', en: 'Character' }, action: { zh: '行動', en: 'Action' }, item: { zh: '道具', en: 'Item' }, locationT: { zh: '場地', en: 'Location' },
  search: { zh: '搜尋卡牌…', en: 'Search cards…' }, cost: { zh: '費用', en: 'Cost' }, value: { zh: '數值', en: 'Value' }, turnsLeft: { zh: '剩 {n} 回合', en: '{n} turns left' },
  shield: { zh: '護盾', en: 'Shield' }, poison: { zh: '每回合 -{n}', en: '-{n} per turn' }, tax: { zh: '下張牌 +{n}', en: 'next card +{n}' }, sap: { zh: '能量 -{n}', en: 'energy -{n}' }, reflect: { zh: '反彈', en: 'Reflect' },
  cpuThinking: { zh: '電腦思考中…', en: 'Computer is thinking…' }, lang: { zh: 'English', en: '中文' },
  shop: { zh: '開卡包', en: 'Card Packs' }, decks: { zh: '我的牌組', en: 'My Decks' }, collection: { zh: '卡牌收藏', en: 'Collection' },
  coins: { zh: '金幣', en: 'coins' }, free: { zh: '免費', en: 'Free' }, freePacks: { zh: '免費卡包 ×{n}', en: '{n} free pack(s)' }, dailyGift: { zh: '🎁 今天的免費卡包到了！', en: '🎁 Your free pack for today is here!' },
  pack_basic: { zh: '家庭基本包', en: 'Family Pack' }, pack_jeff: { zh: 'Jeff 爸爸包', en: 'Dad Pack' }, pack_erin: { zh: 'Erin 媽媽包', en: 'Mom Pack' }, pack_josh: { zh: 'Josh 哥哥包', en: 'Big Brother Pack' }, pack_jasper: { zh: 'Jasper 弟弟包', en: 'Little Brother Pack' },
  packNote_basic: { zh: '5 張牌，至少 1 張稀有以上', en: '5 cards, at least 1 rare or better' }, packNote_hero: { zh: '一半機會出現 {n} 的招牌卡', en: 'Half the cards are {n} signature cards' },
  packOdds: { zh: '每包 5 張：3 張多半是普通、1 張稀有以上、1 張什麼都有可能。', en: 'Each pack has 5 cards: 3 mostly common, 1 rare or better, 1 that could be anything.' },
  pityLeft: { zh: '再開 {n} 包內保證出傳說卡', en: 'Legendary guaranteed within {n} packs' },
  buy: { zh: '買', en: 'Buy' }, openFree: { zh: '免費開', en: 'Open free' }, noCoins: { zh: '金幣不夠', en: 'Not enough coins' },
  tapPack: { zh: '點一下打開卡包！', en: 'Tap to open the pack!' }, tapCards: { zh: '點卡片翻開', en: 'Tap the cards to flip them' }, flipAll: { zh: '全部翻開', en: 'Flip all' },
  newCard: { zh: '新卡！', en: 'NEW!' }, toCoins: { zh: '多的 → 🪙{n}', en: 'extra → 🪙{n}' }, newCards: { zh: '新卡 {n} 張', en: '{n} new card(s)' }, dustNote: { zh: '多出來的牌換成 🪙{n}', en: 'Extra copies became 🪙{n}' },
  openAnother: { zh: '再開一包', en: 'Open another' }, toShop: { zh: '回商店', en: 'Back to the shop' }, toCollection: { zh: '看收藏', en: 'See collection' },
  common: { zh: '普通', en: 'Common' }, rare: { zh: '稀有', en: 'Rare' }, epic: { zh: '史詩', en: 'Epic' }, legendary: { zh: '傳說', en: 'Legendary' }, hero: { zh: '主角', en: 'Hero' },
  collected: { zh: '已收集 {a} / {b}', en: 'Collected {a} / {b}' }, ownedOnly: { zh: '只看擁有的', en: 'Owned only' }, showAll: { zh: '全部卡牌', en: 'All cards' },
  ownedN: { zh: '擁有 {a} / {b}', en: 'Owned {a} / {b}' }, craftBtn: { zh: '製作 🪙{n}', en: 'Craft 🪙{n}' }, crafted: { zh: '做好了：{n}！', en: 'Crafted: {n}!' }, maxed: { zh: '已經收集滿了', en: 'You have the max copies' },
  notOwned: { zh: '還沒有這張牌', en: "You don't own this card yet" },
  newDeck: { zh: '＋ 新牌組', en: '+ New deck' }, deckOf: { zh: '{n} 的牌組', en: "{n}'s deck" }, edit: { zh: '編輯', en: 'Edit' }, del: { zh: '刪除', en: 'Delete' }, delAsk: { zh: '確定刪除「{n}」？', en: 'Delete "{n}"?' },
  deckFull: { zh: '牌組已經 30 張了', en: 'The deck already has 30 cards' }, copyLimit: { zh: '這張牌最多放 {n} 張', en: 'At most {n} of this card' }, needOwn: { zh: '你只有 {n} 張這張牌', en: 'You only own {n} of this card' },
  autoFill: { zh: '自動補滿', en: 'Auto-fill' }, clear: { zh: '清空', en: 'Clear' }, done: { zh: '完成', en: 'Done' }, deckName: { zh: '牌組名稱', en: 'Deck name' },
  cardsN: { zh: '{n} / 30 張', en: '{n} / 30 cards' }, ready2: { zh: '可以出戰', en: 'Ready' }, needN: { zh: '還差 {n} 張', en: '{n} more needed' }, tooMany: { zh: '多了 {n} 張', en: '{n} too many' },
  problemCards: { zh: '有牌不夠或超過張數', en: 'Some cards are missing or over the limit' }, pickHeroDeck: { zh: '這個牌組的主角', en: 'Hero for this deck' },
  yourDeck: { zh: '你的牌組', en: 'Your deck' }, quickDeck: { zh: '隨機快速牌組', en: 'Quick random deck' }, opponent: { zh: '對手', en: 'Opponent' },
  noValidDeck: { zh: '先到「我的牌組」組好一副 30 張的牌組吧！', en: 'Build a 30-card deck in My Decks first!' },
  reward: { zh: '獲得 🪙{n}', en: 'You got 🪙{n}' }, nowCoins: { zh: '現在共有 🪙{n}', en: 'You now have 🪙{n}' }, inDeck: { zh: '牌組中', en: 'in deck' }, maxDecks: { zh: '最多 8 副牌組', en: 'At most 8 decks' },
  rarity: { zh: '稀有度', en: 'Rarity' }, curve: { zh: '費用分布', en: 'Cost curve' },
  howtoText: { zh: `<b>目標</b>：讓對手的<b>理智值（SP）</b>變成 0！<br><br>
<b>每個回合</b><br>① 能量回滿：第 1 回合有 1 點能量，之後每回合多 1 點（最多 10）。<br>② 抽牌階段：抽 1 張牌（有些場地或角色能力會多抽）。<br>③ 出牌：花能量打出手牌，想打幾張都可以。<br>④ 按「結束回合」。手牌最多留 8 張。<br><br><b>卡包與牌組</b><br>打對戰得到金幣，用金幣買卡包開新卡（每天還有一包免費）。卡牌分成普通、稀有、史詩、傳說四種稀有度。到「我的牌組」用自己收集的卡組一副 30 張的牌組：同一張最多 2 張，傳說卡最多 1 張。多出來的卡會自動換成金幣，也可以用金幣製作想要的卡。<br><br>
<b>四種卡牌</b><br>🔴 <b>行動</b>：立刻生效，例如讓對手失去理智、回復、抽牌、偷牌。<br>🔵 <b>道具</b>：放在你面前幾個回合，每回合幫忙或一直保護你（最多 3 件）。<br>🟣 <b>角色</b>：家人朋友來幫忙幾個回合（最多 2 位）。<br>🟢 <b>場地</b>：全場只有一個場地，會改變大家的規則；打出的人還有額外好處。<br><br>
<b>家人的被動技能</b><br>👨 Jeff：冷笑話，出牌傷害 +1。👩 Erin：回復 +1、道具便宜 1。👦 Josh：手牌少時多抽牌，理智最多。🧒 Jasper：可愛臉擋一點傷害，快崩潰時傷害 +1。<br>有「★」的卡是某位家人的招牌卡，由他打出時數值 +1。<br><br>
牌庫抽完時，棄牌會洗回去變成新牌庫，但要失去 6 點理智（第二次 12 點，越來越多），所以別拖太久！`,
  en: `<b>Goal</b>: bring your opponent's <b>Sanity Points (SP)</b> down to 0!<br><br>
<b>Each turn</b><br>① Your energy refills: 1 on turn 1, one more every turn (up to 10).<br>② Draw phase: draw 1 card (some locations and heroes draw more).<br>③ Play cards by paying their energy cost — as many as you can afford.<br>④ Press End Turn. You keep at most 8 cards.<br><br><b>Packs and decks</b><br>Matches earn coins; spend them on packs of new cards (and there is a free pack every day). Cards are common, rare, epic or legendary. In My Decks, build a 30-card deck from your own collection: at most 2 of a card and 1 of a legendary. Extra copies turn into coins, and coins can also craft a card you want.<br><br>
<b>Four kinds of cards</b><br>🔴 <b>Actions</b> happen right away: make the opponent lose SP, calm down, draw, steal…<br>🔵 <b>Items</b> stay in front of you for a few turns and keep helping (up to 3).<br>🟣 <b>Characters</b> are family and friends who visit and help for a few turns (up to 2).<br>🟢 <b>Locations</b>: one is in play at a time; it changes the rules for everyone, and whoever played it gets a bonus.<br><br>
<b>Family passives</b><br>👨 Jeff: Dad Joke, card damage +1. 👩 Erin: healing +1, items 1 cheaper. 👦 Josh: draws more when low on cards, most SP. 🧒 Jasper: his cute face softens a big hit, and his meltdown adds +1 damage.<br>Cards with ★ are a family member's signature card: +1 when they play it.<br><br>
When your deck runs out, your discard pile is shuffled into a new deck — but that costs 6 SP (12 the next time, and so on), so don't wait too long!` },
};
export const t = (k, vars) => { let s = L(S[k]) || k; if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]); return s; };
