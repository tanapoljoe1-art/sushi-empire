// ── Static game data ─────────────────────────────────────────────────────────
export const EMOJIS = ['🤷','👩','👨','🧑','👴','👵','🧔'];

export const MENUS = [
  {id:'salmon', name:'แซลมอน',    emoji:'🍣',price:25,  time:2000,unlockLv:1, ing:{rice:1,salmon:1}},
  {id:'tuna',   name:'ทูน่า',     emoji:'🍡',price:40,  time:2500,unlockLv:2, ing:{rice:1,tuna:1}},
  {id:'shrimp', name:'กุ้ง',      emoji:'🤌',price:60,  time:3200,unlockLv:3, ing:{rice:1,shrimp:1}},
  {id:'dragon', name:'ดราก้อนโรล',emoji:'🏯',price:100, time:4500,unlockLv:5, ing:{rice:2,tuna:1,shrimp:1}},
  {id:'uni',    name:'อูนิ',      emoji:'🦐',price:160, time:6000,unlockLv:8, ing:{rice:1,uni:1,nori:1}},
  {id:'omakase',name:'เอมาคาเสะ', emoji:'🍮',price:350, time:9000,unlockLv:12,ing:{salmon:2,tuna:2,uni:1,nori:2}},
  // Secret menu — only visible when staff skill staffSecretMenu is owned
  {id:'omakase_ex',name:'เอมาคาเสะ EX',emoji:'✨',price:550,time:8500,unlockLv:12,ing:{salmon:2,tuna:2,uni:2,nori:2},secret:true},
  // NEW: Premium Menu Items
  {id:'toro',   name:'โอโทโร่',   emoji:'💎',price:480, time:10000,unlockLv:15,ing:{rice:1,tuna:2,gold:1}},
  {id:'caviar', name:'คาเวียร์',  emoji:'🖤',price:520, time:11000,unlockLv:18,ing:{rice:1,uni:1,caviar:1,nori:1}},
  {id:'wagyu',  name:'วากิว',     emoji:'🥩',price:680, time:13000,unlockLv:22,ing:{rice:2,wagyu:2,egg:1}},
  {id:'phoenix',name:'ฟีนิกซ์',   emoji:'🔥',price:850, time:15000,unlockLv:26,ing:{salmon:2,tuna:2,wagyu:1,gold:1}},
  {id:'emperor',name:'จักรพรรดิ', emoji:'👑',price:1200,time:18000,unlockLv:30,ing:{rice:3,tuna:3,caviar:2,gold:2}},
  {id:'zenith', name:'เซนิท',     emoji:'⭐',price:2000,time:25000,unlockLv:40,ing:{wagyu:3,caviar:2,gold:2,diamond:1}},
];

export const INGREDIENTS = {
  rice:  {name:'ข้าว',    emoji:'🍚',buyAmt:10,buyCost:40,  maxAmt:50},
  salmon:{name:'แซลมอน',  emoji:'🐟',buyAmt:5, buyCost:70,  maxAmt:30},
  tuna:  {name:'ทูน่า',   emoji:'🐠',buyAmt:5, buyCost:85,  maxAmt:30},
  shrimp:{name:'กุ้ง',    emoji:'🦐',buyAmt:5, buyCost:65,  maxAmt:30},
  uni:   {name:'อูนิ',    emoji:'🎣',buyAmt:3, buyCost:150, maxAmt:15},
  nori:  {name:'สาหร่าย', emoji:'🌿',buyAmt:10,buyCost:35,  maxAmt:50},
  // NEW: Premium Ingredients
  gold:  {name:'ทองคำ',   emoji:'🥇',buyAmt:2, buyCost:500, maxAmt:10},
  caviar:{name:'คาเวียร์', emoji:'⚫',buyAmt:2, buyCost:600, maxAmt:10},
  wagyu: {name:'วากิว',    emoji:'🥩',buyAmt:3, buyCost:400, maxAmt:15},
  egg:   {name:'ไข่ปลา',  emoji:'🥚',buyAmt:5, buyCost:60,  maxAmt:40},
  diamond:{name:'เพชร',   emoji:'💎',buyAmt:1, buyCost:1000,maxAmt:5},
};

// tree: volume | quality | empire — UI filter + milestone gates
// require: optional { id, min } must own that upgrade level first
export const UPGRADE_TREES = {
  volume:  { name: 'วอลุ่ม',   emoji: '⚡', desc: 'เร็ว · คิว · ออโต้' },
  quality: { name: 'คุณภาพ',  emoji: '✨', desc: 'rating · Perfect · รายได้' },
  empire:  { name: 'อาณาจักร', emoji: '🌐', desc: 'idle · สาขา · คลัง' },
};

export const UPGRADES = [
  // ── Volume ──
  {id:'kitchen',  name:'ครัวพรีเมียม', emoji:'🍳',tree:'volume', desc:'ทำเร็วขึ้น +25%', max:5,base:180,  fx:g=>{g.speedMult=1+g.up.kitchen*.25;}},
  {id:'waiter',   name:'พนักงานเสิร์ฟ',emoji:'🧑‍🍽️',tree:'volume', desc:'เสิร์ฟอัตโนมัติ', max:1,base:500,  fx:g=>{g.autoServe=g.up.waiter>=1;}},
  {id:'marketing',name:'โฆษณา',        emoji:'📢',tree:'volume', desc:'ลูกค้า +1/คิว',  max:3,base:450,  fx:g=>{g.qSize=1+g.up.marketing;}},
  {id:'autoChef', name:'เชฟ AI',       emoji:'🤖',tree:'volume', desc:'ทำอาหารอัตโนมัติ',max:1,base:1200,
   require:{id:'kitchen',min:2}, fx:g=>{g.autoChef=g.up.autoChef>=1;}},
  {id:'express',  name:'คิวด่วน',      emoji:'🚄',tree:'volume', desc:'ความเร็ว +8% + คิว +1', max:2,base:2800,
   require:{id:'marketing',min:1}, fx:g=>{
     g.speedMult = (g.speedMult || 1) + g.up.express * 0.08;
     g.qSize = (g.qSize || 1) + g.up.express;
   }},
  // ── Quality ──
  {id:'patience', name:'บริการที่ยอดเยี่ยม',emoji:'😊',tree:'quality', desc:'ลูกค้ารออดทนขึ้น',max:3,base:350,  fx:g=>{g.patMult=1+g.up.patience*.5;}},
  {id:'golden',   name:'ครัวทองคำ',    emoji:'🏆',tree:'quality', desc:'รายได้ +35% ถาวร / เลเวล',max:3,base:4500, fx:g=>{g.goldenBonus=1+g.up.golden*.35;}},
  {id:'mastery',  name:'ปรมาจารย์ซูชิ', emoji:'🎓',tree:'quality', desc:'Rating ต่อเสิร์ฟ x2',max:1,base:7500,
   require:{id:'patience',min:1}, fx:g=>{g.xpMult=g.up.mastery>=1?2:1;}},
  {id:'taste',    name:'ฝีมือชิม',      emoji:'👅',tree:'quality', desc:'โซน Perfect กว้างขึ้น', max:2,base:3200,
   require:{id:'kitchen',min:1}, fx:g=>{
     // wider perfect window: default 0.78–0.92 → expand by 0.03 per level
     g.perfectPad = (g.up.taste || 0) * 0.03;
   }},
  // ── Empire ──
  {id:'storage',  name:'คลังวัตถุดิบ', emoji:'📦',tree:'empire', desc:'ปริมาณวัตถุดิบเพิ่ม x1.5',max:3,base:300, fx:g=>{g.storageMult=1+g.up.storage*.5;}},
  {id:'franchise',name:'แฟรนไชส์',     emoji:'🌐',tree:'empire', desc:'Idle income x2',max:1,base:11000,
   require:{id:'storage',min:1}, fx:g=>{g.idleMult=g.up.franchise>=1?2:1;}},
  {id:'outpost',  name:'ด่านหน้า',     emoji:'🏯',tree:'empire', desc:'Idle สาขา +15%/lv', max:3,base:5000,
   require:{id:'franchise',min:1}, fx:g=>{ g.branchIdleBonus = (g.up.outpost || 0) * 0.15; }},
];

/** Free battle pass track (30 days / 30 tiers) — XP from serves */
export const BATTLE_PASS = [
  { tier:1,  xp:10,  reward:{ money:80 }, label:'เงินเริ่มต้น' },
  { tier:2,  xp:25,  reward:{ money:120 }, label:'ทุนซื้อของ' },
  { tier:3,  xp:45,  reward:{ ing:{ rice:8, salmon:3 } }, label:'วัตถุดิบ' },
  { tier:4,  xp:70,  reward:{ money:200, rating:3 }, label:'เงิน+ชื่อเสียง' },
  { tier:5,  xp:100, reward:{ money:300 }, label:'ขั้น 5' },
  { tier:6,  xp:140, reward:{ ing:{ tuna:4, nori:10 } }, label:'วัตถุดิบ 2' },
  { tier:7,  xp:180, reward:{ money:400 }, label:'ทุนกลาง' },
  { tier:8,  xp:230, reward:{ rating:5 }, label:'ชื่อเสียง' },
  { tier:9,  xp:280, reward:{ money:500, ing:{ shrimp:4 } }, label:'ชุดคอมโบ' },
  { tier:10, xp:340, reward:{ money:800 }, label:'หลักสิบ!' },
  { tier:11, xp:400, reward:{ ing:{ uni:2, egg:5 } }, label:'ของพรีเมียม' },
  { tier:12, xp:470, reward:{ money:600 }, label:'เงิน' },
  { tier:13, xp:550, reward:{ money:700, rating:4 }, label:'บูสต์' },
  { tier:14, xp:640, reward:{ ing:{ rice:15, salmon:6 } }, label:'สต็อก' },
  { tier:15, xp:740, reward:{ money:1200 }, label:'ครึ่งทาง' },
  { tier:16, xp:850, reward:{ money:900 }, label:'ต่อเนื่อง' },
  { tier:17, xp:970, reward:{ ing:{ tuna:6, nori:12 } }, label:'วัตถุดิบ 3' },
  { tier:18, xp:1100, reward:{ money:1000, rating:5 }, label:'คุณภาพ' },
  { tier:19, xp:1250, reward:{ money:1100 }, label:'เกือบสุด' },
  { tier:20, xp:1420, reward:{ money:2000 }, label:'หลัก 20' },
  { tier:21, xp:1600, reward:{ ing:{ uni:3, gold:1 } }, label:'หายาก' },
  { tier:22, xp:1800, reward:{ money:1500 }, label:'ทุนใหญ่' },
  { tier:23, xp:2020, reward:{ money:1600, rating:6 }, label:'ชื่อเสียงสูง' },
  { tier:24, xp:2260, reward:{ ing:{ wagyu:2, caviar:1 } }, label:'พรีเมียม' },
  { tier:25, xp:2520, reward:{ money:2500 }, label:'ขั้น 25' },
  { tier:26, xp:2800, reward:{ money:1800 }, label:'ใกล้จบ' },
  { tier:27, xp:3100, reward:{ money:2000, rating:8 }, label:'บูสต์ใหญ่' },
  { tier:28, xp:3450, reward:{ ing:{ gold:2, diamond:1 } }, label:'สมบัติ' },
  { tier:29, xp:3850, reward:{ money:3000 }, label:'ก่อนสุดท้าย' },
  { tier:30, xp:4300, reward:{ money:5000, rating:10 }, label:'จบซีซัน!' },
];

/** Premium track rewards (claimed separately if battlePass.premium) */
export const BATTLE_PASS_PREMIUM = [
  { tier:1,  reward:{ money:150 }, label:'พรีเมียม 1' },
  { tier:2,  reward:{ money:200 }, label:'พรีเมียม 2' },
  { tier:3,  reward:{ ing:{ uni:1, egg:4 } }, label:'วัตถุดิบบน' },
  { tier:5,  reward:{ money:500, rating:3 }, label:'บูสต์ 5' },
  { tier:8,  reward:{ money:700 }, label:'ทุน 8' },
  { tier:10, reward:{ money:1200, ing:{ gold:1 } }, label:'หลักสิบ★' },
  { tier:12, reward:{ money:900 }, label:'พรีเมียม 12' },
  { tier:15, reward:{ money:1800, rating:5 }, label:'ครึ่งทาง★' },
  { tier:18, reward:{ ing:{ caviar:1, wagyu:1 } }, label:'ของหายาก' },
  { tier:20, reward:{ money:2500 }, label:'หลัก 20★' },
  { tier:22, reward:{ money:2000, rating:4 }, label:'พรีเมียม 22' },
  { tier:25, reward:{ money:3500, ing:{ diamond:1 } }, label:'ขั้น 25★' },
  { tier:28, reward:{ money:4000 }, label:'ใกล้จบ★' },
  { tier:30, reward:{ money:8000, rating:12 }, label:'จบซีซัน★' },
];

/** Cost to unlock premium track for the season (scales lightly with level) */
export function battlePassPremiumCost(level = 1) {
  return Math.round(2500 + Math.max(0, level - 1) * 120);
}

export const ACHIEVEMENTS = [
  {id:'s1',   name:'มือใหม่',    desc:'เสิร์ฟครั้งแรก',      icon:'🍣',reward:50,   chk:g=>g.served>=1},
  {id:'s20',  name:'เชฟมือดี',    desc:'เสิร์ฟครบ 20 ครั้ง',  icon:'⭐',reward:150,  chk:g=>g.served>=20},
  {id:'s100', name:'ร้านดัง',        desc:'เสิร์ฟครบ 100 ครั้ง', icon:'🎖',reward:500,  chk:g=>g.served>=100},
  {id:'s500', name:'ตำนานซูชิ',    desc:'เสิร์ฟครบ 500 ครั้ง', icon:'👑',reward:2000, chk:g=>g.served>=500},
  {id:'m1k',  name:'รวยเร้',         desc:'มีเงิน 1,000฿',        icon:'💰',reward:100,  chk:g=>g.money>=1000},
  {id:'m10k', name:'เศรษฐีซูชิ',    desc:'มีเงิน 10,000฿',       icon:'💎',reward:800,  chk:g=>g.money>=10000},
  {id:'m100k',name:'มหาเศรษฐี',     desc:'มีเงิน 100,000฿',      icon:'🏦',reward:5000, chk:g=>g.money>=100000},
  {id:'lv5',  name:'ร้านระดับ 5',    desc:'Level ถึง 5',           icon:'🏅',reward:200,  chk:g=>g.level>=5},
  {id:'lv15', name:'ร้านเลเวลสูง',   desc:'Level ถึง 15',          icon:'🏆',reward:600,  chk:g=>g.level>=15},
  {id:'lv30', name:'ปรมาจารย์',     desc:'Level ถึง 30',          icon:'🌟',reward:2500, chk:g=>g.level>=30},
  {id:'sk15', name:'Streak เกิน',     desc:'Streak ถึง 15',         icon:'🔥',reward:200,  chk:g=>g.streak>=15},
  {id:'sk30', name:'Combo Master',  desc:'Streak ถึง 30',         icon:'💫',reward:1000, chk:g=>g.streak>=30},
  {id:'br2',  name:'ขยายสาขา',       desc:'เปิดสาขาที่ 2',         icon:'🏪',reward:400,  chk:g=>g.branches.filter(b=>b.owned).length>=2},
  {id:'br5',  name:'จักรวรรดิ',      desc:'เปิด 5 สาขา',           icon:'🌍',reward:3000, chk:g=>g.branches.filter(b=>b.owned).length>=5},
  {id:'mg5',  name:'นักเล่นเกม',     desc:'ชนะมินิเกม 5 ครั้ง',   icon:'🎮',reward:300,  chk:g=>g.mgWins>=5},
  {id:'vip3', name:'บริการ VIP',     desc:'เสิร์ฟ VIP 3 คน',       icon:'👑',reward:500,  chk:g=>g.vipServed>=3},
  {id:'prest1',name:'Prestige ครั้งแรก',desc:'Prestige ครั้งแรก',  icon:'✨',reward:1000, chk:g=>g.prestigeLevel>=1},
  {id:'rush5',name:'Rush Master',    desc:'ผ่าน Rush Hour 5 ครั้ง',icon:'⚡',reward:400,  chk:g=>g.rushCleared>=5},
  {id:'fus1', name:'นักต้มตุ๋น',       desc:'ค้นพบ Fusion Recipe แรก',icon:'🧪',reward:300,  chk:g=>(g.fusion&&g.fusion.discovered&&g.fusion.discovered.length||0)>=1},
  {id:'fus5', name:'นักเคมีอาหาร',   desc:'ค้นพบ 5 เมนู Fusion',   icon:'🎮',reward:800,  chk:g=>(g.fusion&&g.fusion.discovered&&g.fusion.discovered.length||0)>=5},
  {id:'fusAll',name:'Master Alchemist',desc:'ค้นพบทุก Fusion เมนู', icon:'🌟',reward:3000, chk:g=>(g.fusion&&g.fusion.discovered&&g.fusion.discovered.length||0)>=FUSION_RECIPES.length},

  // ── Hidden / secret (ไม่โชว์ชื่อ-เงื่อนไขจนกว่าจะปลด) ─────────────────────
  // UI: renderAch แสดง ❓ / "???" จนกว่า G.ach[id]; modal ยังขึ้นชื่อจริงตอนปลด
  {id:'h_perf1',  name:'มือทอง',         desc:'ทำ Perfect ครั้งแรก',              icon:'✨',reward:200,  hidden:true, chk:g=>(g.perfectCount||0)>=1},
  {id:'h_perf25', name:'เซนแห่งมีด',     desc:'ทำ Perfect ครบ 25 ครั้ง',          icon:'🔪',reward:1200, hidden:true, chk:g=>(g.perfectCount||0)>=25},
  {id:'h_match50',name:'อ่านใจลูกค้า',   desc:'เสิร์ฟตรงออเดอร์ 50 ครั้ง',        icon:'🎯',reward:800,  hidden:true, chk:g=>(g.orderMatchCount||0)>=50},
  {id:'h_chain20',name:'ไม่พลาดแม้ครั้ง', desc:'เสิร์ฟตรงติดกัน 20 ครั้ง',         icon:'🔗',reward:1500, hidden:true, chk:g=>(g.maxOrderMatchStreak||0)>=20},
  {id:'h_fest3',  name:'เจ้าภาพตัวยง',   desc:'จัดเทศกาลเอง 3 ครั้ง',             icon:'🎊',reward:900,  hidden:true, chk:g=>(g.festivalHosted||0)>=3},
  {id:'h_staff6', name:'ทีมในฝัน',       desc:'จ้างพนักงานครบทุกตำแหน่ง',         icon:'👥',reward:2000, hidden:true, chk:g=>Object.values(g.staff||{}).filter(s=>s&&s.hired).length>=6},
  {id:'h_deco4',  name:'ห้องครัวสมบูรณ์', desc:'ติดตั้ง deco ครบ 4 ช่อง',          icon:'🖼️',reward:1000, hidden:true, chk:g=>{const s=g.deco?.slots||{}; return ['wall','counter','light','floor'].every(k=>!!s[k]);}},
  {id:'h_secret', name:'เมนูลับ',         desc:'เสิร์ฟ Omakase EX สำเร็จ',         icon:'🤫',reward:1500, hidden:true, chk:g=>(g.secretServed||0)>=1},
  {id:'h_rival1', name:'เอาชนะ Tsunami', desc:'ชนะคู่แข่งรายสัปดาห์ครั้งแรก',     icon:'🏆',reward:1200, hidden:true, chk:g=>(g.rivalWins||0)>=1},
  {id:'h_critic', name:'มิตรนักวิจารณ์', desc:'เลือกทางมิตรกับนักวิจารณ์',        icon:'📰',reward:800,  hidden:true, chk:g=>!!g.storyFlags?.criticFriend},
  {id:'h_sk50',   name:'ไฟลุกไม่ดับ',    desc:'Streak ถึง 50',                    icon:'🔥',reward:2500, hidden:true, chk:g=>(g.streak||0)>=50},
  {id:'h_bp_prem',name:'Pass ทอง',       desc:'ซื้อ Premium Battle Pass',          icon:'🎫',reward:500,  hidden:true, chk:g=>!!g.battlePass?.premium},
  {id:'h_prest3', name:'อาณาจักรนิรันดร์',desc:'Prestige ครบ 3 รอบ',              icon:'♾️',reward:3000, hidden:true, chk:g=>(g.prestigeLevel||0)>=3},
  {id:'h_fusOnly',name:'นักเล่นสูตร',    desc:'เสิร์ฟเมนู Fusion 15 ครั้ง',        icon:'🧪',reward:1000, hidden:true, chk:g=>(g.fusionServed||0)>=15},
];

// spec = branch specialization (gameplay hooks in pickCustomerType / calcServeEarn / getPatience)
export const BRANCHES = [
  {id:'main',   name:'สาขาหลัก',    loc:'ย่านเมือง',   emoji:'🏠',cost:0,    idleRate:5,  mult:1.0,
   spec:{ label:'สมดุล', touristW:0.15, foodieW:0.10, influW:0.05, patienceMult:1.0, earnMult:1.0, ratingMult:1.0 }},
  {id:'mall',   name:'เซ็นทรัล',     loc:'ศูนย์การค้า', emoji:'🏬',cost:3000, idleRate:18, mult:1.4,
   spec:{ label:'วอลุ่มห้าง', touristW:0.30, foodieW:0.10, influW:0.12, patienceMult:0.92, earnMult:1.06, ratingMult:1.0 }},
  {id:'beach',  name:'ริมทะเล',      loc:'ชายหาด',      emoji:'🏝️',cost:10000,idleRate:35, mult:1.8,
   spec:{ label:'ซีฟู้ด', touristW:0.45, foodieW:0.10, influW:0.08, patienceMult:0.88, earnMult:1.0, ratingMult:1.0, seafoodBonus:1.22 }},
  {id:'airport',name:'สนามบิน',      loc:'เขตปลอดภาษี', emoji:'✈️',cost:25000,idleRate:70, mult:2.2,
   spec:{ label:'วอลุ่มสูง', touristW:0.55, foodieW:0.05, influW:0.10, patienceMult:0.70, earnMult:1.10, ratingMult:0.95 }},
  {id:'tokyo',  name:'สาขาในญี่ปุ่น', loc:'ชินจุกุ โตเกียว',emoji:'🗼',cost:60000,idleRate:150,mult:3.0,
   spec:{ label:'gourmet', touristW:0.10, foodieW:0.42, influW:0.12, patienceMult:1.08, earnMult:1.0, ratingMult:1.18 }},
  {id:'paris',  name:'ปารีส',        loc:'ช็องส์-เอลิเซ', emoji:'🗼',cost:150000,idleRate:300,mult:4.0,
   spec:{ label:'ไฮโซ', touristW:0.20, foodieW:0.35, influW:0.18, patienceMult:1.0, earnMult:1.08, ratingMult:1.12, premiumBonus:1.15 }},
  {id:'dubai',  name:'ดูไบ',         loc:'เบิร์จ คาลิฟา', emoji:'🏙️',cost:400000,idleRate:600,mult:5.5,
   spec:{ label:'พรีเมียม', touristW:0.15, foodieW:0.40, influW:0.15, patienceMult:0.95, earnMult:1.05, ratingMult:1.05, premiumBonus:1.30 }},
  {id:'space',  name:'สถานีอวกาศ',   loc:'วงโคจรโลก',    emoji:'🚀',cost:1000000,idleRate:1200,mult:8.0,
   spec:{ label:'สุดขั้ว', touristW:0.25, foodieW:0.25, influW:0.20, patienceMult:0.85, earnMult:1.15, ratingMult:1.10, premiumBonus:1.20 }},
];

// Each event is fully self-describing: everything a system needs to apply its
// effect lives here as declarative fields (or, for the one case that's genuinely
// imperative-but-pure-state, an onEnd hook — same contract as UPGRADES/STAFF_DATA/
// DECO_DATA's existing `fx`: G-mutation only, never DOM). Adding a new event means
// adding an entry here — no hunting through systems/*.js for hardcoded id checks.
//
// Fields:
//   earnMult              multiply serve() earnings
//   patienceMult          multiply customer patience (getPatience)
//   queueDelta            +/- customers per spawnQueue batch
//   ratingGainOverride    replace the normal streak-based rating gain on serve
//   missRatingLossOverride replace the normal -5 rating loss when a customer leaves angry
//   ingredientDiscount    fraction off ingredient purchase cost (0.5 = 50% off)
//   streakProtect         streak doesn't reset when a customer leaves angry
//   guaranteedVip         a VIP customer is guaranteed when this event's intro modal closes
//   instant               no duration/modal — resolves immediately (only 'vip' today)
//   badge                 short text for the event-intro modal's amount badge
//   onEnd(g)              optional pure G-mutation hook run when the event ends
export const EVENTS = [
  {id:'rush',   name:'Rush Hour! 🔥',  desc:'รายได้ x2.5 เป็นเวลา 60 วินาที!', icon:'⚡', dur:60,  color:'#ff4d6d',
   earnMult:2.5, patienceMult:0.7, queueDelta:1, badge:'x2.5 💰',
   onEnd:g=>{ g.rushCleared++; }},
  {id:'vip',    name:'VIP มาแล้ว! 👑', desc:'เสิร์ฟ VIP รับโบนัสพิเศษ!',       icon:'👑', dur:0,   color:'#f0d080',
   instant:true},
  {id:'critic', name:'นักวิจารณ์มา! 📰', desc:'เสิร์ฟให้สมบูรณ์แบบ! +3 Rating/ครั้ง', icon:'📰', dur:90, color:'#a78bfa',
   ratingGainOverride:3, missRatingLossOverride:-8, badge:'+3 ⭐/เสิร์ฟ'},
  {id:'storm',  name:'พายุ! ☁️',       desc:'ลูกค้าน้อยลง แต่ค่ายเพิ่ม x1.5!', icon:'☁️', dur:120, color:'#4a9eff',
   earnMult:1.5, patienceMult:1.4, queueDelta:-1, badge:'x1.5 💰'},
  // NEW: Special Events
  {id:'festival', name:'เทศกาลอาหาร! 🎊', desc:'ลูกค้าเพิ่มขึ้น 2 คน + Income x2', icon:'🎊', dur:90, color:'#ff9f43',
   earnMult:2, queueDelta:2, badge:'x2 💰 + ลูกค้า 2'},
  {id:'celebrity', name:'เซเลบริตี้มา! ⭐', desc:'VIP มาตลอด + Income x3', icon:'⭐', dur:45, color:'#ffd700',
   earnMult:3, guaranteedVip:true, badge:'x3 💰 + VIP'},
  {id:'lucky',  name:'วันโชคดี! 🍀',   desc:'วัตถุดิบลดราคา 50% + Streak ไม่ลด', icon:'🍀', dur:120, color:'#2ecc71',
   ingredientDiscount:0.5, streakProtect:true, badge:'-50% วัตถุดิบ'},
  // Negative events — player picks 1 of 3 responses (see events.js chooseEventOption)
  {id:'blackout', name:'ไฟดับ! 🌑', desc:'ไฟฟ้าในครัวดับ — เลือกทางรับมือ', icon:'🌑', dur:0, color:'#64748b',
   negative:true, choice:true, badge:'วิกฤต',
   choices:[
     {id:'pay', label:'⚡ จ้างช่างด่วน', desc:'จ่ายเงิน แก้ทันที', costMult:80, costBase:200},
     {id:'endure', label:'🕯️ ใช้เทียน', desc:'รายได้ −40% · อดทน 50 วิ', start:{dur:50, earnMult:0.6, patienceMult:0.85, badge:'−40% ฿'}},
     {id:'promo', label:'📢 โปรลดราคา', desc:'รายได้ −20% แต่คิว +1 · 40 วิ', start:{dur:40, earnMult:0.8, queueDelta:1, badge:'คิว+ · ฿−'}},
   ]},
  {id:'inspect', name:'ตรวจสุขาภิบาล 🧪', desc:'เจ้าหน้าที่มาตรวจร้าน — เลือกทางรับ', icon:'🧪', dur:0, color:'#22d3ee',
   negative:true, choice:true, badge:'ตรวจ',
   choices:[
     {id:'comply', label:'✅ ร่วมมือเต็มที่', desc:'เสียเงิน + ได้ Rating', costMult:50, costBase:150, rating:5},
     {id:'rush_clean', label:'🧹 เก็บกวาดด่วน', desc:'ความเร็ว −15% · 55 วิ', start:{dur:55, earnMult:0.9, badge:'ช้าลง'}},
     {id:'bribe', label:'💼 ค่าดำเนินการ', desc:'จ่ายหนัก แต่จบเร็ว + ไม่ debuff', costMult:120, costBase:400},
   ]},
  {id:'rival_sale', name:'Tsunami ลดราคา! ⚔️', desc:'คู่แข่งจัดโปร — ลูกค้าหนี?', icon:'⚔️', dur:0, color:'#f43f5e',
   negative:true, choice:true, badge:'คู่แข่ง',
   choices:[
     {id:'match', label:'📉 ลดราคาสู้', desc:'รายได้ −30% · คิว +1 · 60 วิ', start:{dur:60, earnMult:0.7, queueDelta:1, badge:'ลดราคา'}},
     {id:'quality', label:'✨ เน้นคุณภาพ', desc:'Rating +3 · รายได้ปกติ · อดทนสูงขึ้น 45 วิ', start:{dur:45, patienceMult:1.2, ratingGainOverride:2, badge:'คุณภาพ'}, rating:3},
     {id:'ignore', label:'🧘 ไม่สน', desc:'คิว −1 · 50 วิ แต่ไม่เสียเงิน', start:{dur:50, queueDelta:-1, earnMult:0.95, badge:'เงียบ'}},
   ]},
];

/** Calendar seasons — bonus menus / ingredient price lean */
export const SEASONS = [
  { id:'spring', name:'ฤดูใบไม้ผลิ', emoji:'🌸', months:[2,3,4],
    menuBoost:['sakura_maki','salmon','shrimp'], ingCheap:['salmon','nori'], ingDear:['uni'],
    earnTag:'ซากุระ', menuEarnMult:1.12 },
  { id:'summer', name:'ฤดูร้อน', emoji:'☀️', months:[5,6,7],
    menuBoost:['shrimp','uni','tuna'], ingCheap:['shrimp','egg'], ingDear:['salmon'],
    earnTag:'ซีฟู้ดร้อน', menuEarnMult:1.10 },
  { id:'autumn', name:'ฤดูใบไม้ร่วง', emoji:'🍁', months:[8,9,10],
    menuBoost:['uni','omakase','toro'], ingCheap:['uni','tuna'], ingDear:['shrimp'],
    earnTag:'อูนิหน้า', menuEarnMult:1.14 },
  { id:'winter', name:'ฤดูหนาว', emoji:'❄️', months:[11,0,1],
    menuBoost:['omakase','dragon','wagyu'], ingCheap:['rice','nori'], ingDear:['wagyu','caviar'],
    earnTag:'อุ่นเครื่อง', menuEarnMult:1.08 },
];

export const PRESTIGE_BONUSES = [
  'รายได้ +10% ถาวร',
  'ความเร็วทำอาหาร +5% ถาวร',
  'เริ่มต้นด้วยเงิน +500฿',
  'ลูกค้าเริ่มต้นด้วยความอดทน +20%',
  'ปลดล็อก Prestige Skin',
];

export const STAFF_DATA = [
  {id:'chef_a',  name:'ซากุระ',   role:'เชฟซูชิ',     emoji:'👩‍🍳',rarity:'rare',
   stats:{speed:85,patience:40,income:60,mood:100},
   baseBonusDesc:'ความเร็วทำ +20%',
   fx:g=>{g.staffSpeedBonus+=.20*(1+((g.staff&&g.staff.chef_a&&g.staff.chef_a.level)||1)*.1);},
   skills:[
     {id:'sk_sa1',name:'Precision Cut',emoji:'🔪',desc:'+5% ความเร็ว',cost:300,effect:g=>{g.staffSpeedBonus+=.05;}},
     {id:'sk_sa2',name:'Rice Master',  emoji:'🍚',desc:'วัตถุดิบข้าวลด 1/เมนู',cost:600,effect:g=>{g.staffRiceDiscount=true;}},
     {id:'sk_sa3',name:'Speed Burst',  emoji:'⚡',desc:'ทุก 5 เสิร์ฟ ความเร็ว x2 ชั่วคราว',cost:1200,effect:g=>{g.staffSpeedBurst=true;}},
   ],levels:[{cost:500},{cost:1500},{cost:4000}],unlockLv:1,
   chemistry:{waiter_a:'เพื่อนเก้า → Income +15%',chef_b:'คู่แข้ง → Speed +10% ทั้งคู่'}},
  {id:'waiter_a',name:'ฮิระ',    role:'หัวหน้าบริกร', emoji:'🧑‍🍽️',rarity:'common',
   stats:{speed:30,patience:90,income:50,mood:100},
   baseBonusDesc:'ลูกค้าอดทน +30%',
   fx:g=>{g.staffPatBonus+=.30*(1+((g.staff&&g.staff.waiter_a&&g.staff.waiter_a.level)||1)*.1);},
   skills:[
     {id:'sk_wa1',name:'Smile Service',emoji:'😊',desc:'+20% ความอดทนลูกค้า',cost:250,effect:g=>{g.staffPatBonus+=.20;}},
     {id:'sk_wa2',name:'Fast Serve',   emoji:'🏃',desc:'เสิร์ฟอัตโนมัติเมื่อพร้อม',cost:500,effect:g=>{g.autoServe=true;}},
     {id:'sk_wa3',name:'VIP Handler',  emoji:'👑',desc:'VIP bonus +50%',cost:1000,effect:g=>{g.staffVipBonus=true;}},
   ],levels:[{cost:400},{cost:1200},{cost:3000}],unlockLv:1,
   chemistry:{chef_a:'เพื่อนเก้า → Income +15%',mgr:'ทีมเวิร์ก → Patience +25%'}},
  {id:'chef_b',  name:'เคนจิ',   role:'เชฟ Sashimi',  emoji:'👨‍🍳',rarity:'rare',
   stats:{speed:70,patience:50,income:90,mood:100},
   baseBonusDesc:'รายได้ +25%',
   fx:g=>{g.staffIncomeBonus+=.25*(1+((g.staff&&g.staff.chef_b&&g.staff.chef_b.level)||1)*.1);},
   skills:[
     {id:'sk_cb1',name:'Premium Cut',  emoji:'🌟',desc:'เมนูระดับสูง +30% ราคา',cost:400,effect:g=>{g.staffPremiumBonus=true;}},
     {id:'sk_cb2',name:'Critic Proof', emoji:'📰',desc:'นักวิจารณ์ไม่ลด Rating',cost:800,effect:g=>{g.staffCriticProof=true;}},
     {id:'sk_cb3',name:'Omakase Pro',  emoji:'🍮',desc:'Omakase income x2',cost:1500,effect:g=>{g.staffOmakaseBonus=true;}},
   ],levels:[{cost:800},{cost:2500},{cost:6000}],unlockLv:3,
   chemistry:{chef_a:'คู่แข้ง → Speed +10% ทั้งคู่',chef_c:'Sushi Bros → ลูกค้า Streak ไม่ reset'}},
  {id:'mgr',     name:'อายาเนะ', role:'ผู้จัดการ',     emoji:'👩‍💼',rarity:'epic',
   stats:{speed:50,patience:80,income:80,mood:100},
   baseBonusDesc:'Streak guard + Team bonus',
   fx:g=>{g.staffStreakGuard=true;},
   skills:[
     {id:'sk_mg1',name:'Leadership',   emoji:'👥',desc:'ทีมทุกคน +10% income',cost:600,effect:g=>{g.staffLeaderBonus=true;}},
     {id:'sk_mg2',name:'Schedule Mgmt',emoji:'📅',desc:'Event duration +20s',cost:1200,effect:g=>{g.staffEventBonus=true;}},
     {id:'sk_mg3',name:'Staff Trainer',emoji:'📚',desc:'Staff lvlup cost -20%',cost:2000,effect:g=>{g.staffTrainerBonus=true;}},
   ],levels:[{cost:1200},{cost:3500},{cost:8000}],unlockLv:5,
   chemistry:{waiter_a:'ทีมเวิร์ก → Patience +25%',artist:'Creative Team → Deco bonus x2'}},
  {id:'chef_c',  name:'ริวอิจิ', role:'เชฟ Omakase',  emoji:'🧑‍🍳',rarity:'legendary',
   stats:{speed:60,patience:60,income:95,mood:100},
   baseBonusDesc:'เมนูสูง income x1.5',
   fx:g=>{g.staffOmakaseBonus=true;g.staffIncomeBonus+=.15;},
   skills:[
     {id:'sk_cc1',name:'Secret Recipe', emoji:'📖',desc:'ปลดล็อกเมนูพิเศษ Omakase EX',cost:800,effect:g=>{g.staffSecretMenu=true;}},
     {id:'sk_cc2',name:'Master Taste',  emoji:'👅',desc:'Rating gain +1 ทุกเสิร์ฟ',cost:1500,effect:g=>{g.staffExtraRating=true;}},
     {id:'sk_cc3',name:'Legend Chef',   emoji:'🌟',desc:'รายได้ทั้งหมด +20%',cost:3000,effect:g=>{g.staffIncomeBonus+=.20;}},
   ],levels:[{cost:2000},{cost:5000},{cost:12000}],unlockLv:8,
   chemistry:{chef_b:'Sushi Bros → Streak ไม่ reset',mgr:'Dream Team → Income +30%'}},
  {id:'artist',  name:'ฮานะ',    role:'Food Artist',   emoji:'🎨',rarity:'rare',
   stats:{speed:40,patience:70,income:70,mood:100},
   baseBonusDesc:'ตกแต่งร้าน bonus x1.5',
   fx:g=>{g.staffDecoBonus=true;},
   skills:[
     {id:'sk_ar1',name:'Eye Candy',    emoji:'👁️',desc:'ลูกค้าเพิ่มขึ้น +1',cost:500,effect:g=>{g.qSize=Math.min(6,g.qSize+1);}},
     {id:'sk_ar2',name:'Instagrammable',emoji:'📸',desc:'ทุก VIP ให้ +Rating 2',cost:900,effect:g=>{g.staffPhotoBonus=true;}},
     {id:'sk_ar3',name:'Viral Food',   emoji:'📱',desc:'Streak bonus income x2',cost:1800,effect:g=>{g.staffViralBonus=true;}},
   ],levels:[{cost:1500},{cost:4000},{cost:10000}],unlockLv:6,
   chemistry:{mgr:'Creative Team → Deco bonus x2',waiter_a:'Friendly Crew → Mood regen 2x'}},
];

export const CHEMISTRY = [
  {pair:['chef_a','waiter_a'], name:'เพื่อนเก้า',    emoji:'🤝', desc:'Income +15%',    fx:g=>{g.staffIncomeBonus+=.15;}},
  {pair:['chef_a','chef_b'],   name:'คู่แข้ง',       emoji:'⚔️', desc:'Speed +10% ทั้งคู่',fx:g=>{g.staffSpeedBonus+=.10;}},
  {pair:['chef_b','chef_c'],   name:'Sushi Bros',    emoji:'🤜🤛',desc:'Streak ไม่ reset เมื่อพลาด',fx:g=>{g.staffStreakGuard=true;}},
  {pair:['waiter_a','mgr'],    name:'ทีมเวิร์ก',     emoji:'🤗', desc:'Patience +25%',   fx:g=>{g.staffPatBonus+=.25;}},
  {pair:['mgr','artist'],      name:'Creative Team', emoji:'🎨', desc:'Deco bonus x2',   fx:g=>{g.staffDecoMult=2;}},
  {pair:['chef_c','mgr'],      name:'Dream Team',    emoji:'✨', desc:'Income +30%',     fx:g=>{g.staffIncomeBonus+=.30;}},
];

export const RARITY_COLOR = {common:'var(--muted)',rare:'var(--teal)',epic:'var(--purple)',legendary:'var(--gold)'};
export const RARITY_STYLE = {
  common:    {label:'Common',    color:'rgba(136,135,128,.8)',  bg:'rgba(136,135,128,.1)'},
  rare:      {label:'Rare',      color:'rgba(74,158,255,.9)',   bg:'rgba(74,158,255,.08)'},
  epic:      {label:'Epic',      color:'rgba(167,139,250,.9)',  bg:'rgba(167,139,250,.1)'},
  legendary: {label:'Legendary', color:'rgba(232,196,106,.95)', bg:'rgba(232,196,106,.1)'},
};

// slot: wall | counter | light | floor — can equip one per slot (stack bonuses)
// set: group id for set bonuses (e.g. sakura set)
export const DECO_DATA = [
  {id:'lantern',  name:'โคมไฟญี่ปุ่น',emoji:'🏮',cost:300,  slot:'light',   set:'sakura', bonus:'+5% Rating gain',   fx:g=>{g.decoRatingBonus+=.05;}},
  {id:'bamboo',   name:'ไม้ไผ่',       emoji:'🎋',cost:500,  slot:'wall',    set:'zen',    bonus:'+8% Income',        fx:g=>{g.decoIncomeBonus+=.08;}},
  {id:'koi',      name:'ปลาคาร์ฟ',     emoji:'🐠',cost:1200, slot:'counter', set:'zen',    bonus:'VIP มาบ่อยขึ้น',    fx:g=>{g.decoVipBonus=true;}},
  {id:'bonsai',   name:'ต้นบอนไซ',    emoji:'🌿',cost:800,  slot:'counter', set:'sakura', bonus:'+10% Patience',     fx:g=>{g.decoPatienceBonus+=.10;}},
  {id:'noren',    name:'ผ้าม่านประตู',emoji:'🎏',cost:2000, slot:'wall',    set:'sakura', bonus:'Streak bonus x1.5', fx:g=>{g.decoStreakMult=Math.max(g.decoStreakMult||1,1.5);}},
  {id:'taiko',    name:'กลองไทโกะ',   emoji:'🥁',cost:3500, slot:'floor',   set:null,     bonus:'Rush Hour ยาวขึ้น',fx:g=>{g.decoRushBonus=true;}},
  {id:'sakura',   name:'ซากุระ',       emoji:'🌸',cost:5000, slot:'wall',    set:'sakura', bonus:'+12% Income',       fx:g=>{g.decoIncomeBonus+=.12;}},
  {id:'moon',     name:'จันทร์เพ็ญ',  emoji:'🌕',cost:8000, slot:'light',   set:null,     bonus:'Idle income x2',    fx:g=>{g.decoIdleBonus=true;}},
  {id:'fountain', name:'น้ำพุทองคำ',  emoji:'⛲',cost:15000,slot:'floor',   set:null,     bonus:'+20% Income + VIP', fx:g=>{g.decoIncomeBonus+=.20;g.decoVipBonus=true;}},
  {id:'statue',   name:'รูปปั้นมังกร', emoji:'🐉',cost:25000,slot:'counter', set:null,     bonus:'Streak bonus x2',   fx:g=>{g.decoStreakMult=Math.max(g.decoStreakMult||1,2);}},
  {id:'garden',   name:'สวนเซน',       emoji:'🏞️',cost:40000,slot:'floor',   set:'zen',    bonus:'+25% Patience +10% ฿',fx:g=>{g.decoPatienceBonus+=.25;g.decoIncomeBonus+=.10;}},
  {id:'crystal',  name:'คริสตัลวิเศษ', emoji:'💠',cost:75000,slot:'light',   set:null,     bonus:'+18% ฿ · VIP · Idle', fx:g=>{
    g.decoIncomeBonus   += .18;
    g.decoPatienceBonus += .12;
    g.decoRatingBonus   += .08;
    g.decoStreakMult     = Math.max(g.decoStreakMult||1, 2.2);
    g.decoVipBonus       = true;
    g.decoRushBonus      = true;
    g.decoIdleBonus      = true;
  }},
];

export const DECO_SLOT_LABEL = {
  wall: 'ผนัง', counter: 'เคาน์เตอร์', light: 'แสง', floor: 'พื้น',
};

/** Set bonuses applied when ≥2 / ≥3 pieces of the set are equipped */
export const DECO_SETS = {
  sakura: {
    name: 'ชุดซากุระ',
    pieces: ['lantern', 'bonsai', 'noren', 'sakura'],
    at2: g => { g.decoIncomeBonus += 0.05; g.decoSetBonus += 0.05; },
    at3: g => { g.decoRatingBonus += 0.08; g.decoPatienceBonus += 0.05; g.decoSetBonus += 0.08; },
  },
  zen: {
    name: 'ชุดเซน',
    pieces: ['bamboo', 'koi', 'garden'],
    at2: g => { g.decoPatienceBonus += 0.08; g.decoSetBonus += 0.05; },
    at3: g => { g.decoIdleBonus = true; g.decoIncomeBonus += 0.06; g.decoSetBonus += 0.08; },
  },
};

// reward = money; rewardIng = { ingredientId: amount }; rewardRating = flat rating
export const DAILY_POOL = [
  {id:'d_serve10',  name:'เสิร์ฟ 10 ครั้ง',     emoji:'🍣',target:10, field:'served',     reward:200, rewardIng:{rice:5,salmon:2}},
  {id:'d_streak5',  name:'Streak 5 ครั้งติด',    emoji:'🔥',target:5,  field:'streak',     reward:150, rewardRating:3},
  {id:'d_money500', name:'หาเงิน 500฿',           emoji:'💰',target:500,field:'moneyEarned',reward:180, rewardIng:{nori:8}},
  {id:'d_nomiss',   name:'เสิร์ฟโดยไม่มีคนเดิน', emoji:'😊',target:5,  field:'servedNomiss',reward:250, rewardIng:{uni:1,egg:3}},
  {id:'d_mg1',      name:'ชนะ Mini-game 1 ครั้ง', emoji:'🎮',target:1,  field:'mgWinsToday', reward:120, rewardIng:{shrimp:3}},
  {id:'d_special3', name:'เสิร์ฟ Daily Special 3 จาน', emoji:'⭐',target:3, field:'specialServed', reward:220, rewardIng:{tuna:2}, rewardRating:2},
];

export const WEEKLY_POOL = [
  {id:'w_serve100', name:'เสิร์ฟ 100 ครั้งในสัปดาห์',emoji:'🏅',target:100,field:'servedWeek',  reward:2000, rewardIng:{salmon:10,tuna:8,rice:20}},
  {id:'w_lv3',      name:'อัปเกรด 3 อย่าง',          emoji:'⬆️',target:3,  field:'upgradesWeek',reward:1500, rewardIng:{gold:1}, rewardRating:5},
  {id:'w_event5',   name:'ผ่าน Event 5 ครั้ง',        emoji:'⚡',target:5,  field:'eventsWeek',  reward:1800, rewardIng:{uni:3,caviar:1}},
  {id:'w_mg5',      name:'ชนะ Mini-game 5 ครั้ง',     emoji:'🎮',target:5,  field:'mgWinsWeek',  reward:2500, rewardIng:{wagyu:2,egg:10}},
];

export const FUSION_RECIPES = [
  {id:'spicy_tuna',   combo:['tuna','shrimp'],    name:'สเปซี่ทูน่า',      emoji:'🌶️',
   desc:'ทูน่ากับคอสตริง → เผ็ดร้อนสุดๆ!',
   price:90, time:3000, rarity:'common', hint:'ทูน่า + กุ้ง = ?', tags:['เผ็ด','ยอดนิยม'] },
  {id:'salmon_nori',  combo:['salmon','nori'],     name:'แซลมอน เทมากิ',   emoji:'🍮',
   desc:'ม้วนสาหร่ายกรอบกับแซลมอน',
   price:80, time:2800, rarity:'common', hint:'แซลมอน + สาหร่าย', tags:['กรอบ','คลาสสิก'] },
  {id:'uni_rice',     combo:['uni','rice'],        name:'อูนิ ดองบุริ',     emoji:'🎣',
   desc:'อูนิสดบนข้าวหน้าทะเลสุด',
   price:200, time:5000, rarity:'rare', hint:'อูนิ + ข้าว', tags:['พรีเมียม','หายาก'] },
  {id:'shrimp_nori',  combo:['shrimp','nori'],     name:'เทมปุระ เรล',      emoji:'🥢',
   desc:'กุ้งกรอบห่อสาหร่าย',
   price:110, time:3500, rarity:'common', hint:'กุ้ง + สาหร่าย', tags:['กรอบ','กอบ'] },
  {id:'tuna_nori',    combo:['tuna','nori'],       name:'ทูน่า เฮ็นมากิ',  emoji:'🌱',
   desc:'มากิทำ ทูน่าสด สาหร่ายหอม',
   price:85, time:2600, rarity:'common', hint:'ทูน่า + สาหร่าย', tags:['คลาสสิก'] },
  {id:'salmon_uni',   combo:['salmon','uni'],      name:'คัตเซลิ ครีมมี่',emoji:'🌟',
   desc:'แซลมอน+อูนิ คู่ที่ชิมแล้วยกนิ้วร้อง!',
   price:280, time:7000, rarity:'epic', hint:'แซลมอน + อูนิ', tags:['หายากมาก','VIP'] },
  {id:'rainbow_roll',  combo:['salmon','tuna','shrimp'], name:'เรนโบ้ เรล',  emoji:'🌈',
   desc:'สามสีสามรส → เมนูที่ลูกค้าค้าย รูปมากที่สุด!',
   price:180, time:5500, rarity:'rare', hint:'ปลา 3 ชนิด', tags:['ฮิต','ค้าย รูป','Streak+'] },
  {id:'ninja_roll',    combo:['tuna','nori','rice'],     name:'นินจา เรล',    emoji:'🥷',
   desc:'ม้วนทำ ด้วยมือทูน่า → ลึกลับเหมือนนินจา',
   price:150, time:4500, rarity:'rare', hint:'ทูน่า + สาหร่าย + ข้าว', tags:['ฝีมือ','คูล'] },
  {id:'volcano_roll',  combo:['shrimp','uni','rice'],    name:'วอลคาโน เรล',  emoji:'🌋',
   desc:'กุ้ง+อูนิ+ข้าว ราดซอสร้อน ระเบิดกา!',
   price:220, time:6000, rarity:'rare', hint:'กุ้ง + อูนิ + ข้าว', tags:['เผ็ด','Rush+'] },
  {id:'sakura_maki',   combo:['salmon','nori','rice'],   name:'ซากุระ มากิ',  emoji:'🌸',
   desc:'มากิสีชมพู → สวยงามเหมือนดอกซากุระ',
   price:170, time:5000, rarity:'rare', hint:'แซลมอน + สาหร่าย + ข้าว', tags:['สวย','Rating+'] },
  {id:'dragon_king',   combo:['salmon','tuna','nori'],   name:'ดราก้อน คิง',  emoji:'🐉',
   desc:'รวมปลาสองชนิดกับสาหร่าย → เมนูของกษัตริย์',
   price:260, time:7500, rarity:'epic', hint:'แซลมอน + ทูน่า + สาหร่าย', tags:['กษัตริย์','Income+'] },
  {id:'moonlight',     combo:['uni','salmon','nori'],    name:'มูนไลท์ เรล',  emoji:'🌕',
   desc:'อูนิ+แซลมอน+สาหร่ายทำ → ติดอยู่บนปลาดาวคืนรสชาติดีที่สุด',
   price:310, time:8000, rarity:'epic', hint:'อูนิ + แซลมอน + สาหร่าย', tags:['กลางคืน','Idle+'] },
  {id:'ultimate',      combo:['salmon','tuna','uni'],    name:'Ultimate Sushi', emoji:'🌠',
   desc:'3 วัตถุดิบครีมมี่ → เมนูสูงสุดของ Sushi Empire!',
   price:450, time:10000, rarity:'legendary', hint:'ปลา 3 ตัวครีมมี่', tags:['ขำมาก','ทุก bonus'] },
];

export const STORY_CHAPTERS = [
  {
    id:'intro', chapter:'CH.1', title:'วันแรกของร้าน',
    triggerLv:1, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'ฮิระ', role:'บริกร', avatar:'🧑‍🍽️',
        text:'เฮ้! ร้านเรายังไม่มีลูกค้าเลยสักคน... แต่ไม่เป็นไร วันแรกมันต้องเป็นแบบนี้แหละ!',
        choices:[{label:'เช้า เดี๋ยวขึ้น!', next:1},{label:'...', next:1}]},
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'ฉันเตรียมส่วนผสมไว้หมดแล้ว ทำซูชิแรกกันเลย!',
        choices:[{label:'เริ่มทำซูชิ! 🍣', next:null, reward:{money:0}, close:true}]},
    ]
  },
  {
    id:'first_customer', chapter:'CH.1', title:'ลูกค้าคนแรก',
    triggerLv:1, triggerServed:1, triggerOnce:true,
    scenes:[
      { speaker:'ลูกค้า', role:'แขกคนแรก', avatar:'🤷',
        text:'"อร่อยมาก! ซูชิที่นี่ดีจริงเลย ฉันจะบอกให้เพื่อนมาด้วย!"',
        choices:[{label:'ขอบคุณมา! 😊', next:1}]},
      { speaker:'ฮิระ', role:'บริกร', avatar:'🧑‍🍽️',
        text:'เห็นมั้ย! ทุกอย่างเริ่มต้นจากก้าวเดียว ต้องเดินต่อเลย!',
        choices:[{label:'เดินต่อเลย! 💪', next:null, reward:{money:50}, close:true}]},
    ]
  },
  {
    id:'hire_sakura', chapter:'CH.2', title:'มือใหม่หัดทำซูชิ',
    triggerLv:3, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'เฮ้! ฉันชื่อซากุระ เรียนทำซูชิมาจากญี่ปุ่นเลย ขอทำงานที่นี่ได้ไหม?',
        choices:[{label:'ยินดีต้อนรับ! 🌸', next:1, flag:'staffAffinity'},{label:'ลองดูก่อนนะ', next:1}]},
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'เยี่ยม! ฉันจะทำให้ร้านที่นี่เป็นที่รู้จักทั่วเมือง เดินหน้า!',
        choices:[{label:'เดินหน้าแล้ว! ⚡', next:null, reward:{money:100}, close:true}]},
    ]
  },
  {
    id:'food_critic', chapter:'CH.2', title:'นักวิจารณ์อาหาร',
    triggerLv:5, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'นักวิจารณ์', role:'คอลัมนิสต์อาหาร', avatar:'🧐',
        text:'"ผมได้ยินมาว่าร้านที่นี่ดูดีที่สุด... ลองลิ้มรสสักที แต่ถ้าไม่ถูกปากเลย ผมจะเขียนถึงในคอลัมน์นะ!"',
        choices:[{label:'รับมือได้! เดี๋ยวทำให้ดู', next:1, flag:'criticFriend'},{label:'(กลัวนิดหน่อย...)', next:1}]},
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'ไม่ต้องกังวล! ทำซูชิให้ดีที่สุด Rating เราต้องสูงขึ้นแน่นอน',
        choices:[{label:'เดินหน้าเลย! 🍣', next:null, reward:{money:200, rating:5}, close:true}]},
    ]
  },
  {
    id:'rival_appears', chapter:'CH.3', title:'ร้านคู่แข้ง',
    triggerLv:8, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'ฮิระ', role:'บริกร', avatar:'🧑‍🍽️',
        text:'มีร้านใหม่เปิดตรงข้าม "Tsunami Sushi" — เขาโฆษณาเต็มไปหมด...',
        choices:[{label:'ไม่กลัว! เดินหน้าเลย!', next:1, flag:'rivalPride'},{label:'เขาดูน่ากลัว...', next:1, flag:'rivalHate'}]},
      { speaker:'เคนจิ', role:'เชฟ Sashimi', avatar:'👨‍🍳',
        text:'"ผมเคยทำงานที่ Tsunami Sushi มาก่อน ออกมาเพราะเจ้าของกระหายเงินมาก ที่นี่ดีว่ายะ"',
        choices:[{label:'ขอบคุณที่เลือกเรา 😊', next:2}]},
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'เรามีทีม มีใจ → เดินหน้าต่อแล้วเลย!',
        choices:[{label:'เพื่อ Sushi Empire! 🌟', next:null, reward:{money:300}, close:true}]},
    ]
  },
  {
    id:'rival_war', chapter:'CH.3', title:'สงครามซูชิรายสัปดาห์',
    triggerLv:8, triggerServed:40, triggerOnce:true,
    scenes:[
      { speaker:'ฮิระ', role:'บริกร', avatar:'🧑‍🍽️',
        text:'Tsunami Sushi เริ่มแข่งยอดขายรายสัปดาห์กับเราแล้ว! ต้องทำเงินให้ถึงเป้าก่อนสิ้นอาทิตย์',
        choices:[{label:'รับศึก! ⚔️', next:1, flag:'rivalPride'},{label:'...ระวังไว้', next:1, flag:'rivalHate'}]},
      { speaker:'อายาเนะ', role:'ผู้จัดการ', avatar:'👩‍💼',
        text:'ฉันติดตามยอดบนแบนเนอร์ "vs Tsunami" แล้ว — เสิร์ฟเยอะ ๆ แล้วกดรับรางวัลเมื่อชนะ!',
        choices:[{label:'ลุยเลย! 🏆', next:null, reward:{money:250, rating:2}, close:true}]},
    ]
  },
  {
        id:'first_branch', chapter:'CH.3', title:'ก้าวแรกสู่การขยาย',
    triggerLv:10, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'อายาเนะ', role:'ผู้จัดการ', avatar:'👩‍💼',
        text:'ยอดขายเราเพิ่มมากขึ้นมาก มีโอกาสให้เราเปิดเห็นห้าแล้ว! นี่คือโอกาสของ',
        choices:[{label:'ทำเลย! 🏬', next:1},{label:'ค้าก่อนนิด', next:1}]},
      { speaker:'อายาเนะ', role:'ผู้จัดการ', avatar:'👩‍💼',
        text:'ฉันจะดูแลทุกอย่างเอง แต่เจ้าต้องทำอาหารให้อร่อย ส่วนที่เหลือฝากถือ',
        choices:[{label:'เพื่อนรักมาค! 😊', next:null, reward:{money:500}, close:true}]},
    ]
  },
  {
    id:'tokyo_dream', chapter:'CH.4', title:'ความฝันในญี่ปุ่น',
    triggerLv:15, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'ตอนอายุ 7 ขวบ ฉันกินซูชิที่ญี่ปุ่นครั้งแรก ฉันร้องให้เพราะอร่อยมากเลย',
        choices:[{label:'ค้ารักมาก 😊', next:1},{label:'เล่าต่อสิ!', next:1}]},
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'ตั้งแต่นั้นทำให้ฉันอยากเป็นเชฟ ฉันอยากเปิดร้านที่ญี่ปุ่นสักวัน...',
        choices:[{label:'เราจะทำให้ได้! 🗼', next:2},{label:'ยังอีกนิดหน่อย', next:2}]},
      { speaker:'ฮิระ', role:'บริกร', avatar:'🧑‍🍽️',
        text:'อีกไม่นาน เราเปิดสาขา Airport แล้ว ต่อไปก็ญี่ปุ่นเลย!',
        choices:[{label:'เดินต่อด้วยกัน! 🌸', next:null, reward:{money:1000}, close:true}]},
    ]
  },
  {
    id:'legend_status', chapter:'CH.5', title:'กำขาวบูชิ',
    triggerLv:20, triggerServed:0, triggerOnce:true,
    scenes:[
      { speaker:'นักวิจารณ์', role:'คอลัมนิสต์อาหาร', avatar:'🧐',
        text:'"ผมกลับมาแล้ว... และต้องยอมรับว่า ร้านที่นี่ได้รับ 5 ดาวจากผม ยอดจริง!"',
        choices:[{label:'ขอบคุณมา! 🌟', next:1}]},
      { speaker:'อายาเนะ', role:'ผู้จัดการ', avatar:'👩‍💼',
        text:'ตอนนี้เราเป็น "Sushi Empire" จริงๆ แล้ว ตั้งแต่ร้านเล็กๆ มาถึงวันนี้ยังไม่ไกลเลย',
        choices:[{label:'เพราะทีมที่ดีนี่เหละ 😊', next:2}]},
      { speaker:'ทีมทุกคน', role:'พนักงานทั้งหมด', avatar:'🍣',
        text:'"SUSHI EMPIRE!" 🎉🎊✨',
        choices:[{label:'ยังไม่หยุด → เดินต่อ! 🚀', next:null, reward:{money:2000, prestige:true}, close:true}]},
    ]
  },
  {
    id:'happy_regular', chapter:'★', title:'ลูกค้าประจำ',
    triggerLv:0, triggerServed:20, triggerOnce:false, cooldown:30,
    scenes:[
      { speaker:'ลูกค้า', role:'ลูกค้าประจำ', avatar:'👵',
        text:'"มากินที่นี่ทุกวันอาทิตย์เลย ลูกๆ ชอบมาก ขอบคุณสำหรับซูชิอร่อยๆ คลองๆ นะ"',
        choices:[{label:'ขอบคุณที่มาเสมอ! 😊', next:null, reward:{money:50, rating:2}, close:true}]},
    ]
  },
  {
    id:'tourist_visit', chapter:'★', title:'นักท่องเที่ยว',
    triggerLv:0, triggerServed:35, triggerOnce:false, cooldown:40,
    scenes:[
      { speaker:'นักท่องเที่ยว', role:'ชาวต่างชาติ', avatar:'✈',
        text:'"Excuse me, is this the best sushi in town? My friend said THIS is the place!"',
        choices:[{label:'Yes! Welcome! 🍣', next:1}]},
      { speaker:'ซากุระ', role:'เชฟ', avatar:'👩‍🍳',
        text:'เห็นมั้ย! ชื่อเสียงเราออกไปแล้ว! 😊',
        choices:[{label:'ยินดีมาก! ✨', next:null, reward:{money:150}, close:true}]},
    ]
  },
];
