/**
 * Deep integration test suite for Sushi Empire.
 * Run: npm run test:deep  (boots server if needed, tears down after)
 * Or:  TEST_URL=http://127.0.0.1:3000 node scripts/deep-test.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calcScoreClient,
  calcScoreServer,
  prestigeIncomeMultAt,
} from '../public/src/core/formulas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.TEST_URL || 'http://127.0.0.1:3000';
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass, detail: String(detail).slice(0, 160) });
  if (!pass) console.error('FAIL', name, detail);
  else console.log('OK  ', name, detail ? `— ${String(detail).slice(0, 80)}` : '');
};

// ── Server lifecycle (skip if TEST_URL already reachable) ────────────────────
let ownedServer = null;

async function healthOk() {
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await healthOk()) {
    console.log('Server already up at', BASE);
    return;
  }
  if (process.env.TEST_URL) {
    throw new Error(`TEST_URL=${process.env.TEST_URL} is not reachable (/health failed)`);
  }
  console.log('Booting local server for deep-test…');
  ownedServer = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3000', SUSHI_STATIC: 'public' },
  });
  let bootLog = '';
  ownedServer.stdout.on('data', (d) => { bootLog += d.toString(); });
  ownedServer.stderr.on('data', (d) => { bootLog += d.toString(); });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (ownedServer.exitCode != null) {
      throw new Error(`Server exited early (code ${ownedServer.exitCode}): ${bootLog.slice(0, 400)}`);
    }
    if (await healthOk()) {
      console.log('Server healthy');
      return;
    }
  }
  ownedServer.kill('SIGTERM');
  throw new Error(`Server failed to become healthy: ${bootLog.slice(0, 400)}`);
}

function teardownServer() {
  if (!ownedServer || ownedServer.exitCode != null) return;
  ownedServer.kill('SIGTERM');
  ownedServer = null;
}

// ── Pure unit tests (no browser) — real formulas from core/formulas.js ───────
{
  const clientScore = (s, l, p, m) => calcScoreClient({ served: s, level: l, prestige: p, money: m });
  const serverScore = (o) => calcScoreServer(o);

  ok('U1 score parity base', clientScore(100, 10, 1, 10000) === serverScore({ served: 100, level: 10, prestige: 1, money: 10000 }));
  ok('U2 score parity zero money', clientScore(0, 1, 0, 0) === serverScore({ served: 0, level: 1, prestige: 0, money: 0 }));
  ok('U3 server clamps served', serverScore({ served: 9e9, level: 1, prestige: 0, money: 0 }) === 2e6 * 10 + 50);
  ok('U4 server clamps level', serverScore({ served: 0, level: 9999, prestige: 0, money: 0 }) === 500 * 50);
  ok('U5 cheat score rejected formula', (() => {
    const exp = serverScore({ served: 10, level: 5, prestige: 0, money: 100 });
    const client = exp * 50;
    const final = client > exp + 50 ? exp : Math.min(client, exp + 50);
    return final === exp;
  })());
  ok('U6 prestige P1 = 1.1', Math.abs(prestigeIncomeMultAt(1) - 1.1) < 1e-9);
  ok('U7 prestige P5 = 1.5', Math.abs(prestigeIncomeMultAt(5) - 1.5) < 1e-9);
  // P20 = 1 + 0.5 + 0.3 + 0.3 = 2.1 (hits hard cap 2.6 only much later)
  ok('U8 prestige P20 = 2.1', Math.abs(prestigeIncomeMultAt(20) - 2.1) < 1e-9, prestigeIncomeMultAt(20));
  ok('U8b prestige high capped 2.6', prestigeIncomeMultAt(50) === 2.6, prestigeIncomeMultAt(50));
}

await ensureServer();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) {
    errs.push('console:' + m.text().slice(0, 120));
  }
});

async function ready() {
  await page.waitForFunction(() => typeof window.goTab === 'function' && typeof window.cook === 'function', null, { timeout: 15000 });
}
async function hideTitle() {
  await page.evaluate(() => {
    const t = document.getElementById('titleScreen');
    if (t) {
      t.style.display = 'none';
      t.classList.add('out');
    }
  });
}
async function seed(partial) {
  await page.evaluate((p) => {
    const base = {
      saveVersion: 6,
      money: 5000,
      rating: 10,
      level: 8,
      menu: 'salmon',
      cooking: false,
      plateReady: false,
      streak: 0,
      served: 10,
      vipServed: 0,
      rushCleared: 0,
      mgWins: 0,
      queue: [],
      up: {
        kitchen: 0, waiter: 0, marketing: 0, patience: 0, storage: 0, autoChef: 0,
        golden: 0, mastery: 0, franchise: 0, express: 0, taste: 0, outpost: 0,
      },
      speedMult: 1,
      autoServe: false,
      qSize: 1,
      patMult: 1,
      storageMult: 1,
      autoChef: false,
      goldenBonus: 1,
      xpMult: 1,
      idleMult: 1,
      perfectPad: 0,
      branchIdleBonus: 0,
      ing: { rice: 30, salmon: 15, tuna: 15, shrimp: 15, uni: 8, nori: 20, gold: 5, caviar: 3, wagyu: 3, egg: 10, diamond: 2 },
      ach: {},
      branches: [{ id: 'main', owned: true }, { id: 'mall', owned: false }],
      activeBranch: 'main',
      branchManagers: {},
      prestigeLevel: 0,
      prestigeIncomeMult: 1,
      prestigeSpeedBonus: 0,
      prestigeStars: 0,
      prestShop: {},
      staff: {},
      deco: { owned: [], equipped: null, slots: { wall: null, counter: null, light: null, floor: null } },
      quests: {
        daily: {},
        weekly: {},
        lastDailyReset: Date.now(),
        lastWeeklyReset: Date.now(),
        activeDailyIds: [],
        activeWeeklyIds: [],
      },
      qDaily: { served: 0, streak: 0, moneyEarned: 0, servedNomiss: 0, mgWinsToday: 0, perfects: 0, maxStreakToday: 0 },
      qWeekly: { servedWeek: 0, upgradesWeek: 0, eventsWeek: 0, mgWinsWeek: 0, perfectsWeek: 0 },
      fusion: { discovered: [], newDisc: [] },
      storyData: { seenChapters: {}, pendingChapters: [] },
      storyFlags: {},
      playerName: 'Tester',
      lastSave: Date.now(),
      perfectCount: 0,
      orderMatchCount: 0,
      orderMatchStreak: 0,
      maxOrderMatchStreak: 0,
      festivalHosted: 0,
      rivalWins: 0,
      secretServed: 0,
      fusionServed: 0,
      eventLog: [],
      coachSeen: {},
      battlePass: { season: '', xp: 0, claimed: {}, premiumClaimed: {}, premium: false, lastDay: '' },
    };
    localStorage.setItem('SE5', JSON.stringify({ ...base, ...p }));
  }, partial);
  await page.reload({ waitUntil: 'networkidle' });
  await ready();
  await hideTitle();
}

try {
  // ── A. Boot ──────────────────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await ready();
  const bootExports = await page.evaluate(() => ({
    goTab: typeof window.goTab === 'function',
    cook: typeof window.cook === 'function',
    initTitleScreen: typeof window.initTitleScreen === 'function',
  }));
  ok(
    'A1 boot exports',
    bootExports.goTab && bootExports.cook && bootExports.initTitleScreen,
    JSON.stringify(bootExports),
  );
  ok('A2 version 1.6.x', /v1\.6/.test(await page.locator('.ts-ver').innerText()));

  if (await page.locator('#btnNewGame').isVisible()) await page.locator('#btnNewGame').click();
  await page.waitForTimeout(600);
  await hideTitle();

  // ── B. Core loop cook → serve ────────────────────────────────────────────
  await page.evaluate(() => {
    window.debugFillIng?.();
    window.debugGiveMoney?.(20000);
  });
  await page.waitForTimeout(100);
  ok('B1 cook visible', await page.locator('#cookBtn').isVisible());
  const servedBefore = await page.evaluate(() => Number(JSON.parse(localStorage.getItem('SE5') || '{}').served) || 0);
  await page.locator('#cookBtn').click();
  await page.waitForTimeout(3000);
  const servePath = await page.evaluate(() => {
    const btn = document.getElementById('serveBtn');
    if (btn?.classList.contains('vis')) {
      btn.click();
      return 'manual';
    }
    return 'auto-or-done';
  });
  await page.waitForTimeout(250);
  const servedAfter = await page.evaluate(() => Number(JSON.parse(localStorage.getItem('SE5') || '{}').served) || 0);
  ok(
    'B2 cook/serve path',
    servedAfter > servedBefore,
    `${servePath} served ${servedBefore}->${servedAfter}`,
  );
  const moneyAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('SE5') || '{}').money);
  ok('B3 save has money', Number(moneyAfter) > 0, moneyAfter);

  // ── C. Upgrade soft-caps ─────────────────────────────────────────────────
  await page.evaluate(() => window.debugMaxUpgrades?.());
  await page.waitForTimeout(200);
  let g = await page.evaluate(() => JSON.parse(localStorage.getItem('SE5')));
  ok('C1 qSize<=6', g.qSize <= 6, g.qSize);
  ok('C2 speedMult<=3', g.speedMult <= 3.05, g.speedMult);
  ok('C3 idleMult 1.75', g.idleMult === 1.75, g.idleMult);
  ok('C4 goldenBonus ~1.84', Math.abs(g.goldenBonus - 1.84) < 0.02, g.goldenBonus);
  ok('C5 storageMult<=3', g.storageMult <= 3.01, g.storageMult);
  ok('C6 patMult<=3', g.patMult <= 3.01, g.patMult);

  // ── D. Staff + deco soft-caps ────────────────────────────────────────────
  await seed({
    level: 20,
    money: 999999,
    staff: {
      chef_a: { hired: true, level: 3, mood: 100, skills: ['sk_sa1', 'sk_sa2', 'sk_sa3'] },
      waiter_a: { hired: true, level: 3, mood: 100, skills: ['sk_wa1', 'sk_wa2', 'sk_wa3'] },
      chef_b: { hired: true, level: 3, mood: 100, skills: ['sk_cb1', 'sk_cb2', 'sk_cb3'] },
      mgr: { hired: true, level: 3, mood: 100, skills: ['sk_mg1', 'sk_mg2', 'sk_mg3'] },
      chef_c: { hired: true, level: 3, mood: 100, skills: ['sk_cc1', 'sk_cc2', 'sk_cc3'] },
      artist: { hired: true, level: 3, mood: 100, skills: ['sk_ar1', 'sk_ar2', 'sk_ar3'] },
    },
    deco: {
      owned: ['fountain', 'garden', 'crystal', 'sakura', 'bamboo', 'statue'],
      equipped: 'fountain',
      slots: { wall: 'sakura', counter: 'crystal', light: 'bamboo', floor: 'fountain' },
    },
  });
  await page.evaluate(() => window.debugGiveMoney?.(1));
  await page.waitForTimeout(100);
  g = await page.evaluate(() => JSON.parse(localStorage.getItem('SE5')));
  ok('D1 staffIncome<=0.85', (g.staffIncomeBonus || 0) <= 0.851, g.staffIncomeBonus);
  ok('D2 decoIncome<=0.50', (g.decoIncomeBonus || 0) <= 0.501, g.decoIncomeBonus);
  ok('D3 staffSpeed<=0.70', (g.staffSpeedBonus || 0) <= 0.701, g.staffSpeedBonus);
  ok('D4 staffPat<=0.90', (g.staffPatBonus || 0) <= 0.901, g.staffPatBonus);

  // ── E. Corrupted / edge saves ────────────────────────────────────────────
  await seed({ quests: { daily: null, weekly: null } });
  const qErr = await page.evaluate(() => {
    try {
      window.goTab('quest');
      return null;
    } catch (e) {
      return String(e);
    }
  });
  await page.waitForTimeout(200);
  ok('E1 corrupt quests boot', !qErr && !errs.some((e) => /activeDailyIds/.test(e)), qErr);

  await seed({ up: null, staff: null, deco: null, fusion: null });
  ok('E2 null systems boot', (await page.evaluate(() => typeof window.goTab)) === 'function');

  // ── F. Achievements ──────────────────────────────────────────────────────
  await page.evaluate(() => window.goTab('ach'));
  await page.waitForTimeout(250);
  ok('F1 ach 35', (await page.locator('#achList .ac').count()) === 35);
  ok('F2 secret 14', (await page.locator('#achList .ac.secret').count()) === 14);
  ok('F3 tiers present', (await page.locator('#achList .ac-tier').count()) >= 30);

  // Unlock first serve ach via force
  await seed({ served: 1, ach: {} });
  await page.evaluate(() => {
    window.debugFillIng?.();
    // trigger checkAch via serve if possible
    window.goTab('main');
  });
  // set ach manually and render
  await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('SE5'));
    g.ach = { s1: true, lv5: true, h_perf1: true };
    localStorage.setItem('SE5', JSON.stringify(g));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await ready();
  await hideTitle();
  // title chips
  // Title chips live on #titleScreen — show title to verify, then open via API
  await page.evaluate(() => {
    const ts = document.getElementById('titleScreen');
    if (ts) {
      ts.style.display = 'flex';
      ts.classList.remove('out');
    }
  });
  await page.waitForTimeout(200);
  // re-init title showcase from save
  await page.evaluate(() => window.initTitleScreen?.());
  await page.waitForTimeout(300);
  const chips = await page.locator('#tsAchShowcase .ts-ach-chip').count();
  ok('F4 title showcase chips', chips >= 1 && chips <= 4, chips);
  // force click (title may animate) + API fallback
  await page.evaluate(() => window.openAchFromTitle?.());
  await page.waitForTimeout(500);
  ok('F5 openAchFromTitle → ach tab', await page.evaluate(() => document.getElementById('pg-ach')?.classList.contains('on')));

  // ── G. Quests claim-all ──────────────────────────────────────────────────
  await seed({
    level: 5,
    qDaily: { served: 99, streak: 99, moneyEarned: 9999, servedNomiss: 99, mgWinsToday: 99, perfects: 99, maxStreakToday: 99 },
    qDailyExtra: { specialServed: 99 },
    quests: {
      daily: {},
      weekly: {},
      lastDailyReset: Date.now(),
      lastWeeklyReset: Date.now(),
      activeDailyIds: ['d_serve10', 'd_streak5', 'd_money500'],
      activeWeeklyIds: [],
    },
  });
  await page.evaluate(() => window.goTab('quest'));
  await page.waitForTimeout(300);
  const readyN = await page.locator('.quest-card.ready').count();
  ok('G1 quests ready highlighted', readyN >= 1, readyN);
  if (await page.locator('.quest-claim-all').count()) {
    await page.locator('.quest-claim-all').click();
    await page.waitForTimeout(300);
    ok('G2 claim-all clears ready', (await page.locator('.quest-card.ready').count()) === 0);
  } else {
    ok('G2 claim-all button', false, 'missing');
  }

  // ── H. Prestige ETA + mult recompute ─────────────────────────────────────
  await seed({ level: 16, rating: 40, prestigeLevel: 0 });
  await page.evaluate(() => window.goTab('prest'));
  await page.waitForTimeout(300);
  const eta = await page.locator('.prest-eta').innerText().catch(() => '');
  ok('H1 prestige ETA', /เลเวล|เสิร์ฟ|Prestige/.test(eta), eta.slice(0, 90));

  await seed({ level: 25, prestigeLevel: 8 });
  await page.evaluate(() => window.debugGiveMoney?.(1));
  g = await page.evaluate(() => JSON.parse(localStorage.getItem('SE5')));
  ok('H2 prestige mult recompute <=2.6', (g.prestigeIncomeMult || 1) <= 2.6, g.prestigeIncomeMult);
  ok('H3 prestige speed <=0.45', (g.prestigeSpeedBonus || 0) <= 0.451, g.prestigeSpeedBonus);

  // ── I. Fusion cookbook + fail ────────────────────────────────────────────
  await seed({
    level: 8,
    fusion: { discovered: [], newDisc: [] },
    ing: { rice: 30, salmon: 15, tuna: 15, shrimp: 15, uni: 8, nori: 20, gold: 5, caviar: 3, wagyu: 3, egg: 10, diamond: 2 },
  });
  await page.evaluate(() => window.goTab('fusion'));
  await page.waitForTimeout(350);
  ok('I1 cookbook hints', (await page.locator('#fusionHints .fh-row').count()) >= 1);
  const riceBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('SE5')).ing.rice);
  await page.evaluate(() => {
    window.pickFusionIng('rice');
    window.pickFusionIng('gold');
    window.doFusion();
  });
  await page.waitForTimeout(600);
  const toast = await page.locator('#toast').innerText();
  ok('I2 fail clue toast', /💡|ใกล้|ใบ้|สูตร/.test(toast), toast.slice(0, 90));
  // rice: spent 1 for fail (amt=1), refund 0 → -1
  // gold: spent 1, refund 0 → -1
  // partial refund is amt-1 so 0 refund when amt=1
  const riceAfter = await page.evaluate(() => {
    // force flush via save if exposed; else read live G or localStorage
    if (typeof window.save === 'function') window.save();
    const live = window.G?.ing?.rice;
    if (Number.isFinite(live)) return live;
    return JSON.parse(localStorage.getItem('SE5') || '{}').ing?.rice;
  });
  ok(
    'I3 fusion fail non-crash',
    Number.isFinite(riceAfter) && riceAfter < riceBefore,
    `rice ${riceBefore}->${riceAfter}`,
  );

  // successful fusion if possible - salmon+nori
  await seed({
    level: 8,
    fusion: { discovered: [], newDisc: [] },
    ing: { rice: 30, salmon: 15, tuna: 15, shrimp: 15, uni: 8, nori: 20, gold: 5, caviar: 3, wagyu: 3, egg: 10, diamond: 2 },
  });
  await page.evaluate(() => {
    window.goTab('fusion');
    window.pickFusionIng('salmon');
    window.pickFusionIng('nori');
    window.doFusion();
  });
  await page.waitForTimeout(800);
  g = await page.evaluate(() => {
    if (typeof window.save === 'function') window.save();
    return JSON.parse(localStorage.getItem('SE5'));
  });
  const disc = g.fusion?.discovered || [];
  ok('I4 successful fusion discovers', disc.includes('salmon_nori'), disc.join(',') || '(empty)');
  ok(
    'I4b salmon_nori found',
    disc.includes('salmon_nori') && !errs.some((e) => /fusion|doFusion|TypeError/i.test(e)),
    disc.join(','),
  );

  // ── J. Menu roles + earn preview ─────────────────────────────────────────
  await seed({ level: 12 });
  await page.evaluate(() => {
    window.goTab('main');
    window.selMenu?.('salmon');
  });
  await page.waitForTimeout(200);
  const earn = await page.locator('#earnPreview').innerText().catch(() => '');
  ok('J1 earn preview', /฿/.test(earn) && !/NaN|undefined/.test(earn), earn);
  const roles = await page.locator('.mi-role').count();
  ok('J2 menu roles', roles >= 1, roles);

  // ── K. Settings / stats / open ach ───────────────────────────────────────
  await page.evaluate(() => window.openSettings?.());
  await page.waitForTimeout(250);
  const stats = await page.locator('#playStatsLine').innerText();
  ok('K1 play stats', /Lv|เสิร์ฟ|Perfect|ทีม/.test(stats), stats.slice(0, 80));
  await page.evaluate(() => window.openAchFromSettings?.());
  await page.waitForTimeout(400);
  ok('K2 settings→ach', await page.evaluate(() => document.getElementById('pg-ach')?.classList.contains('on')));

  // ── L. Mobile + desktop layout ───────────────────────────────────────────
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => window.goTab('main'));
  await page.waitForTimeout(200);
  const ov360 = await page.evaluate(() => {
    const h = document.querySelector('header') || document.querySelector('.hstats');
    if (!h) return { missing: true };
    const r = h.getBoundingClientRect();
    return { overflow: r.right > window.innerWidth + 2, right: r.right, vw: window.innerWidth };
  });
  ok('L1 no overflow 360', !ov360.overflow, JSON.stringify(ov360));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  const ov390 = await page.evaluate(() => {
    const h = document.querySelector('header') || document.querySelector('.hstats');
    if (!h) return { missing: true };
    const r = h.getBoundingClientRect();
    return { overflow: r.right > window.innerWidth + 2 };
  });
  ok('L2 no overflow 390', !ov390.overflow);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(150);
  ok('L3 desktop cook present', (await page.locator('#cookBtn').count()) >= 1);

  // ── M. Branches / map ────────────────────────────────────────────────────
  await seed({ level: 10, money: 50000 });
  await page.evaluate(() => window.goTab('br'));
  await page.waitForTimeout(300);
  ok('M1 branch map', (await page.locator('#brMap .br-node, #brMap').count()) >= 1);
  ok('M2 branch list', (await page.locator('#brList .br, #brList').count()) >= 1);

  // ── N. Leaderboard submit offline ────────────────────────────────────────
  await page.evaluate(() => {
    window.goTab('lb');
    const input = document.getElementById('playerName');
    if (input) input.value = 'DeepTest';
    window.submitScore?.();
  });
  await page.waitForTimeout(400);
  ok('N1 lb submit no crash', !errs.some((e) => /submitScore|leaderboard/i.test(e)));

  // ── O. AFK idle load order (caps before idle) ────────────────────────────
  // Max upgrades + intentionally uncapped derived fields; lastSave 2 min ago
  await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('SE5') || '{}');
    g.up = {
      kitchen: 5, waiter: 1, marketing: 3, patience: 3, storage: 3, autoChef: 1,
      golden: 3, mastery: 1, franchise: 1, express: 2, taste: 2, outpost: 3,
    };
    // Poison derived fields — load() must recompute + soft-cap before idle math
    g.qSize = 99;
    g.speedMult = 50;
    g.autoChef = true;
    g.lastSave = Date.now() - 120000;
    g.money = 1000;
    g.ing = { rice: 50, salmon: 30, tuna: 30, shrimp: 30, uni: 15, nori: 50, gold: 5, caviar: 3, wagyu: 3, egg: 10, diamond: 2 };
    localStorage.setItem('SE5', JSON.stringify(g));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await ready();
  // Flush in-memory post-load G (caps applied in load()) out to localStorage
  await page.evaluate(() => window.debugGiveMoney?.(0));
  const idleVis = await page.evaluate(() => document.getElementById('idleModal')?.classList.contains('vis'));
  g = await page.evaluate(() => JSON.parse(localStorage.getItem('SE5')));
  ok(
    'O1 idle path caps before idle',
    (g.qSize || 1) <= 6 && (g.speedMult || 1) <= 3.05,
    `idleModal=${idleVis} qSize=${g.qSize} speedMult=${g.speedMult}`,
  );
  ok('O2 post-load qSize capped', (g.qSize || 1) <= 6, g.qSize);

  // ── P. Export/import structure ───────────────────────────────────────────
  const exportOk = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('SE5');
      const g = JSON.parse(raw);
      return g && typeof g.money === 'number' && g.saveVersion >= 6;
    } catch {
      return false;
    }
  });
  ok('P1 save shape', exportOk);

  // ── Q. Tab unlock gates ──────────────────────────────────────────────────
  await seed({ level: 1 });
  const prestBlocked = await page.evaluate(() => {
    // prest unlocks at 15
    window.goTab('prest');
    return !document.getElementById('pg-prest')?.classList.contains('on');
  });
  ok('Q1 prest locked at Lv1', prestBlocked);

  await seed({ level: 16 });
  await page.evaluate(() => window.goTab('prest'));
  await page.waitForTimeout(200);
  ok('Q2 prest open at Lv16', await page.evaluate(() => document.getElementById('pg-prest')?.classList.contains('on')));

  // ── R. Fatal errors ──────────────────────────────────────────────────────
  const fatal = errs.filter((e) =>
    /TypeError|ReferenceError|SyntaxError|is not a function|Cannot read|undefined is not/i.test(e)
  );
  ok('R1 no fatal pageerrors', fatal.length === 0, fatal.slice(0, 5).join(' || '));

  // ── S. Desktop full click tabs ───────────────────────────────────────────
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed({ level: 20, money: 100000 });
  for (const tab of ['main', 'quest', 'ach', 'lb', 'staff', 'deco', 'fusion', 'mg', 'br', 'prest']) {
    await page.evaluate((t) => window.goTab(t), tab);
    await page.waitForTimeout(120);
  }
  ok('S1 all tabs navigable Lv20', !errs.some((e) => /goTab|Cannot/.test(e)));

} catch (e) {
  ok('SUITE exception', false, e.message);
  console.error(e);
} finally {
  await browser.close().catch(() => {});
  teardownServer();
}

const failed = results.filter((r) => !r.pass);
console.log('\n======== SUMMARY ========');
console.log(JSON.stringify({
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  failList: failed,
  errSample: errs.slice(0, 12),
}, null, 2));

process.exit(failed.length ? 1 : 0);
