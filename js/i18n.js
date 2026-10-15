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
  howtoText: { zh: `<b>目標</b>：讓對手的<b>理智值（SP）</b>變成 0！<br><br>
<b>每個回合</b><br>① 能量回滿：第 1 回合有 1 點能量，之後每回合多 1 點（最多 10）。<br>② 抽牌階段：抽 1 張牌（有些場地或角色能力會多抽）。<br>③ 出牌：花能量打出手牌，想打幾張都可以。<br>④ 按「結束回合」。手牌最多留 8 張。<br><br>
<b>四種卡牌</b><br>🔴 <b>行動</b>：立刻生效，例如讓對手失去理智、回復、抽牌、偷牌。<br>🔵 <b>道具</b>：放在你面前幾個回合，每回合幫忙或一直保護你（最多 3 件）。<br>🟣 <b>角色</b>：家人朋友來幫忙幾個回合（最多 2 位）。<br>🟢 <b>場地</b>：全場只有一個場地，會改變大家的規則；打出的人還有額外好處。<br><br>
<b>家人的被動技能</b><br>👨 Jeff：冷笑話，出牌傷害 +1。👩 Erin：回復 +2、道具便宜 1。👦 Josh：手牌少時多抽牌，理智最多。🧒 Jasper：可愛臉擋一點傷害，快崩潰時傷害 +1。<br>有「★」的卡是某位家人的招牌卡，由他打出時數值 +1。<br><br>
牌庫抽完後每次抽牌都會失去越來越多理智，所以別拖太久！`,
  en: `<b>Goal</b>: bring your opponent's <b>Sanity Points (SP)</b> down to 0!<br><br>
<b>Each turn</b><br>① Your energy refills: 1 on turn 1, one more every turn (up to 10).<br>② Draw phase: draw 1 card (some locations and heroes draw more).<br>③ Play cards by paying their energy cost — as many as you can afford.<br>④ Press End Turn. You keep at most 8 cards.<br><br>
<b>Four kinds of cards</b><br>🔴 <b>Actions</b> happen right away: make the opponent lose SP, calm down, draw, steal…<br>🔵 <b>Items</b> stay in front of you for a few turns and keep helping (up to 3).<br>🟣 <b>Characters</b> are family and friends who visit and help for a few turns (up to 2).<br>🟢 <b>Locations</b>: one is in play at a time; it changes the rules for everyone, and whoever played it gets a bonus.<br><br>
<b>Family passives</b><br>👨 Jeff: Dad Joke, card damage +1. 👩 Erin: healing +2, items 1 cheaper. 👦 Josh: draws more when low on cards, most SP. 🧒 Jasper: his cute face softens a big hit, and his meltdown adds +1 damage.<br>Cards with ★ are a family member's signature card: +1 when they play it.<br><br>
Once your deck runs out, every draw costs more and more SP — so don't wait too long!` },
};
export const t = (k, vars) => { let s = L(S[k]) || k; if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]); return s; };
