// Builds the card database: data/cards.json (the data) and js/cards.data.js (the same data as an ES module for the
// browser). 180 cards: 20 characters (4 family heroes + 16 guests), 70 actions, 50 items, 40 locations.
// Every card has id, name, type, cost, effect, value — plus `fx` (what the engine runs) and a few display fields.
import { writeFileSync } from 'node:fs';

// ------------------------------------------------------------------ effect text from effect ops
// ops: ['dmg',n] ['self',n] ['heal',n] ['draw',n] ['energy',n] ['discard',n] ['steal',n] ['mill',n] ['shield',n]
//      ['poison',n,t] ['regen',n,t] ['tax',n] ['sap',n] ['reflect'] ['clearItem'] ['clearAlly'] ['clearLoc']
const T = {
  dmg: (n) => [`對手失去 ${n} 點理智`, `Opponent loses ${n} SP`],
  self: (n) => [`你自己失去 ${n} 點理智`, `you lose ${n} SP`],
  heal: (n) => [`回復 ${n} 點理智`, `restore ${n} SP`],
  draw: (n) => [`抽 ${n} 張牌`, `draw ${n} card${n > 1 ? 's' : ''}`],
  energy: (n) => [`獲得 ${n} 點能量`, `gain ${n} energy`],
  discard: (n) => [`對手隨機棄掉 ${n} 張手牌`, `opponent discards ${n} random card${n > 1 ? 's' : ''}`],
  steal: (n) => [`從對手手牌偷走 ${n} 張`, `steal ${n} card${n > 1 ? 's' : ''} from the opponent's hand`],
  mill: (n) => [`對手牌庫最上面 ${n} 張被丟掉`, `the top ${n} card${n > 1 ? 's' : ''} of the opponent's deck are thrown away`],
  shield: (n) => [`獲得 ${n} 點護盾（先擋傷害）`, `gain ${n} shield (blocks damage first)`],
  poison: (n, t) => [`接下來 ${t} 回合，對手每回合失去 ${n} 點理智`, `for ${t} turns the opponent loses ${n} SP each turn`],
  regen: (n, t) => [`接下來 ${t} 回合，你每回合回復 ${n} 點理智`, `for ${t} turns you restore ${n} SP each turn`],
  tax: (n) => [`對手下一張牌多花 ${n} 點能量`, `the opponent's next card costs ${n} more`],
  sap: (n) => [`對手下回合少 ${n} 點能量`, `the opponent has ${n} less energy next turn`],
  reflect: () => ['下一次受到的傷害反彈給對手', 'the next damage you take bounces back to the opponent'],
  clearItem: () => ['拿走對手一件道具', 'take away one of the opponent\'s items'],
  clearAlly: () => ['送走對手一位角色', 'send away one of the opponent\'s characters'],
  clearLoc: () => ['取消目前的場地', 'clear the current location'],
};
const fxText = (fx) => { const zh = [], en = []; for (const [op, a, b] of fx) { const [z, e] = T[op](a, b); zh.push(z); en.push(e); } return [zh.join('，'), en.join(', ')]; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const mainValue = (fx) => (fx.find((o) => typeof o[1] === 'number') || [0, 0])[1];
const HERO_NAME = { jeff: ['Jeff', 'Jeff'], erin: ['Erin', 'Erin'], josh: ['Josh', 'Josh'], jasper: ['Jasper', 'Jasper'] };
const sig = (h) => (h ? [`（${HERO_NAME[h][0]} 打出時數值 +1）`, ` (+1 when ${HERO_NAME[h][1]} plays it)`] : ['', '']);

const cards = [];
const add = (c) => { cards.push(c); return c; };

// ------------------------------------------------------------------ characters: the family (heroes) and guests
export const HEROES = [
  { key: 'jeff', icon: '👨', zh: 'Jeff 爸爸', en: 'Jeff (Dad)', sp: 24, hand: 4, color: '#3a7ad8',
    passive: { id: 'dadJoke', zh: '爸爸冷笑話：你打出的每張「讓對手失去理智」的牌，傷害 +1。', en: 'Dad Joke: every card you play that makes the opponent lose SP deals +1.' } },
  { key: 'erin', icon: '👩', zh: 'Erin 媽媽', en: 'Erin (Mom)', sp: 26, hand: 4, color: '#d8407a',
    passive: { id: 'superMom', zh: '超級媽媽：你的回復效果 +2，道具少花 1 點能量。', en: 'Super Mom: your healing restores 2 more, and your items cost 1 less.' } },
  { key: 'josh', icon: '👦', zh: 'Josh 哥哥（10 歲）', en: 'Josh (big brother, 10)', sp: 30, hand: 5, color: '#2aa86a',
    passive: { id: 'quickThinker', zh: '腦筋轉很快：抽牌階段如果手牌 3 張以下，多抽 1 張；起手 5 張牌。', en: 'Quick Thinker: in the draw phase, with 3 or fewer cards in hand, draw 1 more; starts with 5 cards.' } },
  { key: 'jasper', icon: '🧒', zh: 'Jasper 弟弟（8 歲）', en: 'Jasper (little brother, 8)', sp: 20, hand: 4, color: '#f0a020',
    passive: { id: 'cuteFace', zh: '可愛臉：每個對手回合，對手打出的牌第一次讓你失去 3 點以上理智時，少失去 1 點；理智低於 8 時，你打出的牌傷害 +1（大哭大鬧）。', en: 'Cute Face: in each opponent turn, the first card that would cost you 3 or more SP costs 1 less; below 8 SP your cards deal +1 (meltdown).' } },
];
HEROES.forEach((h, i) => add({ id: `C${String(i + 1).padStart(3, '0')}`, name: { zh: h.zh, en: h.en }, type: 'character', cost: 0, value: h.sp, hero: h.key, icon: h.icon,
  effect: { zh: `主角：理智 ${h.sp}，起手 ${h.hand} 張。${h.passive.zh}`, en: `Hero: ${h.sp} SP, starts with ${h.hand} cards. ${h.passive.en}` }, fx: [], stats: { sp: h.sp, hand: h.hand }, passive: h.passive.id, color: h.color }));
// guests: stay on your side for `value` turns and do their thing at the start of each of your turns
const GUESTS = [
  ['👵', '奶奶', 'Grandma', 3, 3, [['heal', 2]]],
  ['👴', '爺爺講古', 'Grandpa\'s Long Story', 2, 4, [['dmg', 1]]],
  ['🐶', '小狗旺財', 'Puppy', 2, 2, [['dmg', 2]]],
  ['🐱', '小貓咪', 'Kitten', 1, 3, [['heal', 1]]],
  ['👩‍🍼', '保母', 'Babysitter', 3, 3, [['draw', 1]]],
  ['🧔', '除草的鄰居', 'Lawnmower Neighbor', 4, 3, [['dmg', 2]]],
  ['👩‍🏫', '嚴格老師', 'Strict Teacher', 4, 2, [['discard', 1]]],
  ['🧑', '表哥', 'Cousin', 3, 3, [['energy', 1]]],
  ['🍦', '冰淇淋車', 'Ice-Cream Truck', 3, 2, [['heal', 3]]],
  ['🛵', '外送員', 'Delivery Rider', 4, 2, [['draw', 1], ['energy', 1]]],
  ['🏃', '足球教練', 'Soccer Coach', 3, 3, [['shield', 2]]],
  ['🐹', '倉鼠', 'Hamster', 1, 3, [['shield', 1]]],
  ['🤖', '掃地機器人', 'Robot Vacuum', 2, 3, [['mill', 1]]],
  ['👩‍🦰', '愛聊天的阿姨', 'Chatty Aunt', 3, 3, [['dmg', 1], ['heal', 1]]],
  ['📮', '郵差', 'Mail Carrier', 2, 2, [['draw', 1]]],
  ['🧑‍💼', '校長', 'Principal', 5, 2, [['tax', 1], ['dmg', 1]]],
];
GUESTS.forEach(([icon, zh, en, cost, turns, tick], i) => {
  const [tz, te] = fxText(tick);
  add({ id: `C${String(i + 5).padStart(3, '0')}`, name: { zh, en }, type: 'character', cost, value: turns, icon, fx: [], tick, turns,
    effect: { zh: `來你家 ${turns} 回合：你的每回合開始時，${tz}。`, en: `Visits for ${turns} turns: at the start of each of your turns, ${te}.` } });
});

// ------------------------------------------------------------------ actions (70): one-shot
const ACTIONS = [
  // making the opponent lose SP
  ['😱', '尖叫', 'Scream', 1, [['dmg', 2]]],
  ['🥛', '打翻牛奶', 'Spilled Milk', 1, [['dmg', 2]]],
  ['🎤', '大聲唱歌', 'Loud Singing', 2, [['dmg', 3]]],
  ['🧱', '樂高地雷', 'Lego Landmine', 2, [['dmg', 2]], 'jasper'],
  ['🛏️', '枕頭大戰', 'Pillow Fight', 1, [['dmg', 3], ['self', 1]]],
  ['📺', '搶遙控器', 'Remote Grab', 2, [['steal', 1], ['dmg', 1]]],
  ['❓', '一直問為什麼', 'Endless Whys', 3, [['dmg', 3]], 'jasper'],
  ['😂', '爸爸冷笑話', 'Dad Joke', 1, [['dmg', 2]], 'jeff'],
  ['📚', '不想寫作業', 'Homework Strike', 3, [['dmg', 4]], 'josh'],
  ['⏰', '鬧鐘狂響', 'Alarm Clock', 2, [['dmg', 2], ['discard', 1]]],
  ['🔑', '鑰匙不見了', 'Lost Keys', 3, [['dmg', 3], ['tax', 1]]],
  ['🏃‍♂️', '快遲到了', 'Running Late', 3, [['dmg', 5], ['self', 1]]],
  ['🎮', '電動玩太久', 'Too Much Gaming', 3, [['dmg', 4]], 'josh'],
  ['🏺', '打破花瓶', 'Broken Vase', 4, [['dmg', 6]]],
  ['🏫', '家長會', 'Parent-Teacher Night', 4, [['dmg', 5], ['discard', 1]]],
  ['🧹', '大掃除', 'Spring Cleaning', 5, [['dmg', 7]]],
  ['🎂', '生日派對失控', 'Party Chaos', 6, [['dmg', 9]]],
  ['🩴', '拖鞋飛彈', 'Slipper Missile', 2, [['dmg', 3]], 'erin'],
  ['🛁', '洗澡大逃亡', 'Bath Escape', 2, [['dmg', 3]]],
  ['🥦', '不吃青菜', 'Veggie Refusal', 1, [['dmg', 2]]],
  ['☎️', '惡作劇電話', 'Prank Call', 2, [['dmg', 1], ['poison', 1, 3]]],
  ['📢', '噪音轟炸', 'Noise Bomb', 4, [['poison', 2, 3]]],
  ['🤧', '哈啾', 'Achoo', 0, [['dmg', 1]]],
  ['🦶', '踩到積木', 'Step on a Block', 1, [['dmg', 2]]],
  ['🍪', '搶最後一塊餅乾', 'The Last Cookie', 2, [['dmg', 2], ['heal', 2]]],
  ['🗣️', '告狀', 'Tattletale', 2, [['dmg', 1], ['discard', 1]], 'jasper'],
  ['🥱', '「我好無聊」', '"I\'m Bored"', 2, [['dmg', 1], ['draw', 1]]],
  ['👕', '弄亂衣櫃', 'Messy Closet', 3, [['dmg', 2], ['mill', 2]]],
  ['🫧', '洗衣機壞掉', 'Broken Washer', 4, [['dmg', 4], ['tax', 1]]],
  ['🐕', '寵物逃跑了', 'Runaway Pet', 3, [['dmg', 3], ['discard', 1]]],
  // calming down
  ['😮‍💨', '深呼吸', 'Deep Breath', 1, [['heal', 3]]],
  ['☕', '熱可可', 'Hot Cocoa', 2, [['heal', 4]]],
  ['😴', '睡個午覺', 'Power Nap', 3, [['heal', 6]]],
  ['🤗', '全家抱抱', 'Family Hug', 2, [['heal', 3], ['draw', 1]], 'erin'],
  ['🛀', '泡泡浴', 'Bubble Bath', 4, [['heal', 8]]],
  ['🧘', '冥想', 'Meditation', 2, [['heal', 2], ['shield', 2]]],
  ['📰', '好消息', 'Good News', 3, [['heal', 4], ['draw', 1]]],
  ['🎉', '週末到了', 'Weekend!', 5, [['heal', 10]]],
  ['😆', '看喜劇', 'Watch a Comedy', 2, [['heal', 2], ['regen', 1, 3]]],
  ['🧸', '抱抱泰迪熊', 'Teddy Hug', 1, [['heal', 2]], 'jasper'],
  // cards and energy
  ['📝', '列清單', 'Make a List', 1, [['draw', 2]], 'erin'],
  ['☕', '喝咖啡', 'Coffee', 0, [['energy', 2], ['self', 1]], 'jeff'],
  ['🌅', '早起', 'Early Bird', 2, [['draw', 2], ['energy', 1]]],
  ['🗺️', '大計畫', 'Big Plan', 3, [['draw', 3]]],
  ['💡', '腦力激盪', 'Brainstorm', 2, [['draw', 2]]],
  ['📣', '加油打氣', 'Pep Talk', 1, [['energy', 2]]],
  ['🛤️', '抄捷徑', 'Shortcut', 1, [['draw', 1], ['energy', 1]]],
  ['🪙', '沙發縫找零錢', 'Couch Coins', 0, [['draw', 1]]],
  ['🔍', '上網查', 'Look It Up', 2, [['draw', 2]], 'josh'],
  ['☕', '第二杯咖啡', 'Second Coffee', 1, [['energy', 3], ['self', 2]], 'jeff'],
  // defending and messing with the opponent
  ['🙈', '躲起來', 'Hide', 1, [['shield', 3]]],
  ['🚪', '把門關上', 'Close the Door', 2, [['shield', 4]]],
  ['⏸️', '冷靜一下', 'Time-Out', 3, [['sap', 2], ['dmg', 1]]],
  ['🚫', '沒收！', 'Confiscated!', 3, [['clearItem'], ['dmg', 1]]],
  ['🛌', '該睡覺了', 'Bedtime!', 3, [['clearAlly'], ['draw', 1]]],
  ['📡', '轉台', 'Change the Channel', 2, [['clearLoc'], ['draw', 1]]],
  ['👀', '偷看', 'Sneak Peek', 1, [['steal', 1]]],
  ['🔄', '交換', 'Trade', 2, [['steal', 1], ['draw', 1]]],
  ['👉', '都是你的錯', 'Blame Game', 2, [['reflect']]],
  ['🙉', '假裝沒聽到', 'Pretend Not to Hear', 1, [['shield', 2]]],
  ['💢', '大吵一架', 'Big Argument', 2, [['dmg', 5], ['self', 2]]],
  ['🦋', '分心', 'Distraction', 2, [['discard', 2]]],
  ['🥺', '撒嬌', 'Puppy Eyes', 2, [['steal', 1], ['heal', 1]], 'jasper'],
  ['📜', '家規', 'House Rules', 4, [['tax', 2], ['shield', 2]], 'erin'],
  ['📶', '網路斷了', 'Wi-Fi Down', 4, [['discard', 3]], 'josh'],
  ['🚗', '全家出遊', 'Family Trip', 5, [['draw', 2], ['heal', 5]]],
  ['🌋', '理智線斷掉', 'Total Meltdown', 6, [['dmg', 8], ['discard', 1]]],
  ['🤝', '和好', 'Make Up', 3, [['heal', 6], ['draw', 1]]],
  ['🍫', '偷吃零食', 'Snack Raid', 2, [['heal', 2], ['draw', 1]]],
  ['💥', '最後手段', 'Last Resort', 7, [['dmg', 12]]],
];
ACTIONS.forEach(([icon, zh, en, cost, fx, hero], i) => {
  const [tz, te] = fxText(fx), [sz, se] = sig(hero);
  add({ id: `A${String(i + 1).padStart(3, '0')}`, name: { zh, en }, type: 'action', cost, value: mainValue(fx), icon, fx, ...(hero ? { hero } : {}),
    effect: { zh: tz + '。' + sz, en: cap(te) + '.' + se } });
});

// ------------------------------------------------------------------ items (50): stay on your side for `turns` turns
// on play: `fx`; every one of your turns: `tick`; while equipped: `mods` (boost: +damage, armor: -damage taken, thorns)
const ITEMS = [
  ['🎧', '降噪耳機', 'Noise-Cancelling Headphones', 3, 3, [], [], { armor: 1 }],
  ['🛋️', '軟綿綿毯子', 'Fluffy Blanket', 3, 3, [], [['heal', 2]]],
  ['☕', '咖啡機', 'Coffee Maker', 3, 3, [], [['energy', 1]], null, 'jeff'],
  ['📒', '記事本', 'Planner', 2, 3, [], [['draw', 1]], null, 'erin'],
  ['📱', '遙控器', 'The Remote', 2, 3, [], [], { boost: 1 }],
  ['🧱', '樂高盒', 'Lego Box', 2, 3, [], [], { thorns: 1 }, 'jasper'],
  ['🎮', '遊戲機', 'Game Console', 4, 3, [], [['draw', 1], ['energy', 1]], null, 'josh'],
  ['🧸', '泰迪熊', 'Teddy Bear', 2, 3, [], [['heal', 2]], null, 'jasper'],
  ['🥤', '保溫杯', 'Thermos', 1, 4, [], [['heal', 1]]],
  ['💻', '平板電腦', 'Tablet', 3, 2, [['draw', 1]], [['draw', 1]]],
  ['🍪', '零食櫃', 'Snack Cabinet', 2, 5, [], [['heal', 1]]],
  ['🪀', '溜溜球', 'Yo-Yo', 1, 2, [['dmg', 1]], [['dmg', 1]]],
  ['🔦', '手電筒', 'Flashlight', 1, 3, [], [], { armor: 1 }],
  ['⛑️', '安全帽', 'Helmet', 2, 4, [['shield', 2]], [], { armor: 1 }],
  ['🎒', '書包', 'School Bag', 2, 3, [['draw', 1]], [], { armor: 1 }, 'josh'],
  ['🧃', '果汁盒', 'Juice Box', 1, 2, [['heal', 2]], [['heal', 1]]],
  ['🎺', '小喇叭', 'Toy Trumpet', 3, 3, [], [['dmg', 2]]],
  ['🥁', '玩具鼓', 'Toy Drum', 2, 3, [], [['dmg', 1]], null, 'jasper'],
  ['🧲', '磁鐵', 'Magnet', 3, 2, [['steal', 1]], [['steal', 1]]],
  ['🗝️', '備用鑰匙', 'Spare Key', 1, 3, [['shield', 2]], []],
  ['🔋', '行動電源', 'Power Bank', 2, 3, [], [['energy', 1]]],
  ['📖', '故事書', 'Storybook', 2, 3, [], [['heal', 1], ['draw', 1]], null, 'erin'],
  ['🪁', '風箏', 'Kite', 2, 2, [['heal', 3]], []],
  ['🛹', '滑板', 'Skateboard', 3, 3, [], [], { boost: 1, armor: 1 }, 'josh'],
  ['🧯', '滅火器', 'Fire Extinguisher', 3, 3, [['shield', 3]], [], { armor: 1 }],
  ['🍳', '平底鍋', 'Frying Pan', 3, 3, [], [], { boost: 2 }, 'erin'],
  ['🔧', '工具箱', 'Toolbox', 3, 3, [['draw', 1]], [], { boost: 1 }, 'jeff'],
  ['🎈', '氣球', 'Balloon', 1, 2, [], [['heal', 1]], { thorns: 1 }],
  ['🧩', '拼圖', 'Jigsaw Puzzle', 2, 3, [], [['heal', 1], ['shield', 1]]],
  ['🎲', '桌遊', 'Board Game', 3, 3, [], [['draw', 1], ['heal', 1]]],
  ['🪥', '電動牙刷', 'Electric Toothbrush', 1, 3, [], [['dmg', 1]]],
  ['🎨', '彩色筆', 'Markers', 2, 3, [], [['mill', 1]]],
  ['🦖', '恐龍玩偶', 'Toy Dinosaur', 3, 3, [], [['dmg', 1]], { thorns: 1 }, 'jasper'],
  ['🎸', '電吉他', 'Electric Guitar', 4, 3, [], [['dmg', 2], ['heal', 1]], null, 'jeff'],
  ['🧺', '洗衣籃', 'Laundry Basket', 2, 3, [['shield', 3]], []],
  ['🪴', '盆栽', 'Potted Plant', 1, 5, [], [['heal', 1]], null, 'erin'],
  ['📷', '相機', 'Camera', 2, 2, [['draw', 2]], []],
  ['🕹️', '搖桿', 'Game Controller', 2, 3, [], [['energy', 1]], null, 'josh'],
  ['🎁', '神秘禮物', 'Mystery Gift', 3, 1, [['draw', 2], ['heal', 2]], []],
  ['⌚', '智慧手錶', 'Smartwatch', 3, 3, [], [['draw', 1]], { armor: 1 }],
  ['🛡️', '紙箱盾牌', 'Cardboard Shield', 2, 4, [['shield', 3]], []],
  ['🔫', '水槍', 'Water Gun', 2, 3, [], [['dmg', 1]], { boost: 1 }, 'josh'],
  ['🧤', '暖暖手套', 'Warm Mittens', 1, 3, [], [], { armor: 1 }],
  ['🍯', '蜂蜜罐', 'Honey Jar', 2, 3, [['heal', 2]], [['heal', 1]]],
  ['🔔', '腳踏車鈴', 'Bike Bell', 1, 3, [], [['dmg', 1]]],
  ['🎵', '音樂盒', 'Music Box', 3, 4, [], [['heal', 2]]],
  ['📦', '紙箱城堡', 'Cardboard Castle', 3, 3, [['shield', 4]], [], { armor: 1 }, 'jasper'],
  ['🧪', '科學實驗組', 'Science Kit', 3, 2, [['draw', 1]], [['draw', 1], ['dmg', 1]], null, 'josh'],
  ['🗂️', '收納盒', 'Storage Box', 2, 3, [], [['shield', 1], ['draw', 1]], null, 'erin'],
  ['🪑', '按摩椅', 'Massage Chair', 4, 3, [], [['heal', 3]], null, 'jeff'],
];
const modText = (m) => { if (!m) return ['', '']; const z = [], e = []; if (m.boost) { z.push(`你的傷害 +${m.boost}`); e.push(`your damage +${m.boost}`); } if (m.armor) { z.push(`你受到的傷害 -${m.armor}`); e.push(`damage you take -${m.armor}`); } if (m.thorns) { z.push(`被攻擊時對手失去 ${m.thorns} 點理智`); e.push(`when you are hit the opponent loses ${m.thorns} SP`); } return [z.join('，'), e.join(', ')]; };
ITEMS.forEach(([icon, zh, en, cost, turns, fx, tick, mods, hero], i) => {
  const z = [], e = [];
  if (fx.length) { const [a, b] = fxText(fx); z.push(`放下時${a}`); e.push(`when played, ${b}`); }
  if (tick.length) { const [a, b] = fxText(tick); z.push(`每回合開始時${a}`); e.push(`at the start of each of your turns, ${b}`); }
  const [mz, me] = modText(mods); if (mz) { z.push(mz); e.push(me); }
  const [sz, se] = sig(hero);
  add({ id: `I${String(i + 1).padStart(3, '0')}`, name: { zh, en }, type: 'item', cost, value: turns, icon, fx, tick, turns, ...(mods ? { mods } : {}), ...(hero ? { hero } : {}),
    effect: { zh: `使用 ${turns} 回合：${z.join('；')}。${sz}`, en: `Lasts ${turns} turns: ${e.join('; ')}.${se}` } });
});

// ------------------------------------------------------------------ locations (40): one shared location in play;
// a new one replaces it. `rule` changes things for everybody, `owner` is a bonus at the start of the owner's turns
const LOCS = [
  ['🍳', '廚房', 'Kitchen', 2, { healMod: 1 }, [['heal', 1]]],
  ['🛋️', '客廳', 'Living Room', 1, { drawExtra: 1 }, []],
  ['🛒', '超市', 'Supermarket', 2, { costItem: -1 }, []],
  ['🌳', '公園', 'Park', 2, { startAll: [['heal', 1]] }, [['heal', 1]]],
  ['🏫', '學校', 'School', 2, { costAction: 1 }, [['draw', 1]]],
  ['📚', '圖書館', 'Library', 2, { dmgMod: -1 }, [['draw', 1]]],
  ['🎢', '遊樂園', 'Theme Park', 3, { drawExtra: 1, startAll: [['energy', 1]] }, []],
  ['🦁', '動物園', 'Zoo', 2, { costChar: -1 }, [['heal', 1]]],
  ['🏖️', '海邊', 'Beach', 3, { startAll: [['heal', 2]] }, []],
  ['🚦', '大塞車', 'Traffic Jam', 2, { startAll: [['self', 1]] }, [['shield', 1]]],
  ['🦷', '牙醫診所', 'Dentist', 3, { startAll: [['self', 2]] }, [['heal', 2]]],
  ['🏬', '百貨公司', 'Department Store', 3, { costItem: -1, drawExtra: 1 }, []],
  ['🍔', '速食店', 'Burger Joint', 1, { healMod: 1 }, [['energy', 1]]],
  ['⛺', '露營區', 'Campsite', 2, { costChar: -1, startAll: [['heal', 1]] }, []],
  ['🏊', '游泳池', 'Swimming Pool', 2, { dmgMod: -1, startAll: [['heal', 1]] }, []],
  ['🎬', '電影院', 'Cinema', 2, { costAction: 1, healMod: 2 }, []],
  ['🏡', '奶奶家', 'Grandma\'s House', 3, { healMod: 2 }, [['heal', 2]]],
  ['🔧', '車庫', 'Garage', 2, { costItem: -1 }, [['shield', 1]]],
  ['🕸️', '閣樓', 'Attic', 2, { dmgMod: 1 }, []],
  ['🌻', '後院', 'Backyard', 1, { startAll: [['draw', 0]] , drawExtra: 0 }, [['heal', 1], ['draw', 1]]],
  ['🚿', '浴室', 'Bathroom', 1, { costAction: -1, dmgMod: -1 }, []],
  ['🧺', '洗衣間', 'Laundry Room', 2, {}, [['shield', 2]]],
  ['🕯️', '停電的家', 'Blackout', 3, { costAction: 1, costItem: 1, costChar: 1 }, [['energy', 1]]],
  ['🌧️', '下雨天', 'Rainy Day', 2, { drawExtra: 1, dmgMod: -1 }, []],
  ['🎈', '生日會場', 'Party Hall', 3, { dmgMod: 1, healMod: 1 }, [['draw', 1]]],
  ['🏛️', '博物館', 'Museum', 2, { costAction: 1 }, [['shield', 2]]],
  ['⚽', '足球場', 'Soccer Field', 3, { dmgMod: 1 }, [['energy', 1]]],
  ['🏮', '夜市', 'Night Market', 2, { costItem: -1, healMod: 1 }, []],
  ['✈️', '機場', 'Airport', 3, { startAll: [['self', 1], ['draw', 1]] }, []],
  ['🏥', '醫院', 'Hospital', 3, { healMod: 3 }, []],
  ['🖥️', '書房', 'Study', 2, {}, [['draw', 1]]],
  ['🧸', '遊戲室', 'Playroom', 2, { costChar: -1, costItem: -1 }, []],
  ['🍝', '亂七八糟的廚房', 'Messy Kitchen', 2, { dmgMod: 1 }, [['mill', 1]]],
  ['⛄', '下雪的院子', 'Snowy Yard', 2, { costAction: -1 }, [['self', 1], ['energy', 2]]],
  ['♨️', '溫泉', 'Hot Spring', 4, { startAll: [['heal', 2]], healMod: 1 }, []],
  ['🎲', '家庭遊戲夜', 'Family Game Night', 3, { drawExtra: 1, costAction: -1 }, []],
  ['🤫', '安靜的自修室', 'Quiet Room', 2, { dmgMod: -2 }, []],
  ['🛍️', '週年慶', 'Big Sale', 2, { costItem: -2 }, []],
  ['🌴', '叢林健行', 'Jungle Hike', 3, { startAll: [['self', 1]] }, [['heal', 3]]],
  ['🌷', '外婆的花園', 'Granny\'s Garden', 3, { healMod: 1, startAll: [['heal', 1]] }, [['shield', 1]]],
];
const ruleText = (r) => {
  const z = [], e = [], s = (n) => (n > 0 ? '+' + n : String(n));
  if (r.costAction) { z.push(`行動卡費用 ${s(r.costAction)}`); e.push(`action cards cost ${s(r.costAction)}`); }
  if (r.costItem) { z.push(`道具卡費用 ${s(r.costItem)}`); e.push(`item cards cost ${s(r.costItem)}`); }
  if (r.costChar) { z.push(`角色卡費用 ${s(r.costChar)}`); e.push(`character cards cost ${s(r.costChar)}`); }
  if (r.dmgMod) { z.push(`所有傷害 ${s(r.dmgMod)}`); e.push(`all damage ${s(r.dmgMod)}`); }
  if (r.healMod) { z.push(`所有回復 +${r.healMod}`); e.push(`all healing +${r.healMod}`); }
  if (r.drawExtra) { z.push(`抽牌階段多抽 ${r.drawExtra} 張`); e.push(`draw ${r.drawExtra} more in the draw phase`); }
  const sa = (r.startAll || []).filter((o) => o[1] !== 0);
  if (sa.length) { const [a, b] = fxText(sa); z.push(`每位玩家回合開始時${a.replace(/你自己/g, '')}`); e.push(`at the start of every player's turn, ${b.replace(/you /g, 'they ')}`); }
  return [z.join('，'), e.join(', ')];
};
LOCS.forEach(([icon, zh, en, cost, rule, owner], i) => {
  if (rule.startAll) rule.startAll = rule.startAll.filter((o) => o[1] !== 0); if (!rule.drawExtra) delete rule.drawExtra;
  const [rz, re] = ruleText(rule), z = [], e = [];
  if (rz) { z.push(`大家：${rz}`); e.push(`Everyone: ${re}`); }
  if (owner.length) { const [a, b] = fxText(owner); z.push(`打出的人每回合開始時${a}`); e.push(`whoever played it, at the start of their turns: ${b}`); }
  const v = Math.abs(rule.dmgMod || rule.healMod || rule.costItem || rule.costAction || rule.costChar || rule.drawExtra || (owner[0] && owner[0][1]) || 1);
  add({ id: `L${String(i + 1).padStart(3, '0')}`, name: { zh, en }, type: 'location', cost, value: v, icon, fx: [], rule, owner,
    effect: { zh: z.join('；') + '。打出新場地會取代舊的。', en: e.join('; ') + '. A new location replaces the old one.' } });
});

// ------------------------------------------------------------------ write
const count = (t) => cards.filter((c) => c.type === t).length;
const want = { character: 20, action: 70, item: 50, location: 40 };
for (const [t, n] of Object.entries(want)) if (count(t) !== n) throw new Error(`${t}: ${count(t)} cards, want ${n}`);
if (new Set(cards.map((c) => c.id)).size !== cards.length) throw new Error('duplicate ids');
const db = { version: 1, game: 'Family Sanity Showdown', counts: { total: cards.length, ...want }, heroes: HEROES.map((h) => ({ key: h.key, cardId: cards.find((c) => c.hero === h.key && c.type === 'character').id, sp: h.sp, hand: h.hand, passive: h.passive })), cards };
writeFileSync(new URL('../data/cards.json', import.meta.url), JSON.stringify(db, null, 1));
writeFileSync(new URL('../js/cards.data.js', import.meta.url), '// generated by tools/build-cards.mjs from the same tables as data/cards.json — do not edit\nexport default ' + JSON.stringify(db) + ';\n');
console.log(`built ${cards.length} cards: ${Object.entries(want).map(([t]) => `${count(t)} ${t}`).join(', ')}`);
