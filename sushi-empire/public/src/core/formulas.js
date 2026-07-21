/**
 * Pure score / prestige formulas — shared by client, server, and deep-test.
 * Keep this free of DOM / G / localStorage so Node can import it directly.
 */

/** Client leaderboard score (no clamps). Must stay aligned with progress.calcScore. */
export function calcScoreClient({ served, level, prestige, money }) {
  const s = Number(served) || 0;
  const lv = Number(level) || 1;
  const p = Number(prestige) || 0;
  const m = Number(money) || 0;
  return s * 10 + lv * 50 + p * 500 + (m > 0 ? Math.floor(Math.log10(m) * 20) : 0);
}

/** Server-authoritative score with anti-cheat clamps. */
export function calcScoreServer({ served, level, prestige, money }) {
  const s = Math.max(0, Math.min(2_000_000, Number(served) || 0));
  const lv = Math.max(1, Math.min(500, Number(level) || 1));
  const p = Math.max(0, Math.min(100, Number(prestige) || 0));
  const m = Math.max(0, Math.min(1e15, Number(money) || 0));
  return s * 10 + lv * 50 + p * 500 + (m > 0 ? Math.floor(Math.log10(m) * 20) : 0);
}

/** Prestige income multiplier curve (hard-capped at 2.6). */
export function prestigeIncomeMultAt(level) {
  let mult = 1;
  const p = Math.max(0, level || 0);
  for (let i = 1; i <= p; i++) mult += i <= 5 ? 0.10 : i <= 10 ? 0.06 : 0.03;
  return Math.min(2.6, mult);
}
