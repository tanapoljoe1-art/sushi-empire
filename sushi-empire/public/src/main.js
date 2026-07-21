// ── Entry point ────────────────────────────────────────────────────────────────
import { G, load, save } from './core/state.js';
// save export/import re-exported via nav
import { MENUS, FUSION_RECIPES, BRANCHES } from './data.js';
import { getEl } from './core/dom.js';
import { startGameBg } from './ui/background.js';
import { updateUI, renderUpgrades, renderIngredients, updateEarnPreview, selMenu } from './ui/render.js';
import { spawnSteam, updateKitchenTheme } from './ui/kitchen-scene.js';
import { settings, unlockAudio, startBgm, syncBgmToGame } from './systems/audio.js';
import { applyPrestigeShop } from './systems/prestige-shop.js';
import { buyPrestigeItem } from './systems/prestige-shop.js';
import { connectNet } from './systems/net.js';
import {
  initSpectate, openSpectateModal, closeSpectateModal, hostFromModal, joinFromModal,
  leaveSpectateRoom, sendReaction, sendSpectateChat,
} from './systems/spectate.js';
import { assignBranchManager } from './systems/game.js';
import {
  cook, serve, buyIngredient, buyUpgrade, respecUpgrades, setUpgTreeFilter, buyBranch, switchBranch,
  showPrestModal, closePrest, doPrestige, closeAch, spawnQueue,
} from './systems/game.js';
import { closeEvent, closeVip, challengeVip, tickEventScheduler, updateEventForecastUI, chooseEventOption } from './systems/events.js';
import { refreshUnlockUI, markExistingUnlocksSeen } from './systems/unlocks.js';
import { ensureDailySpecial } from './systems/daily.js';
import { ensureRivalWeekly, renderRivalBanner, claimRivalReward } from './systems/rival.js';
import { ensureFishMarket, renderMarketBanner, tickSpoil } from './systems/market.js';
import { renderSeasonBanner } from './systems/season.js';
import { runCoachSequence, dismissCoachTip } from './systems/coach.js';
import { ensureBattlePass, renderBattlePass, claimBattlePassTier, claimAllBattlePass } from './systems/battlepass.js';
import {
  initDebug, openDebugPanel, closeDebugPanel, toggleDebugEnabled, debugCloseAndDisable,
  debugGiveMoney, debugAddLevel, debugSetLevel, debugFillIng, debugSkipTime, debugForceEvent,
  debugSpawnSpy, debugSpawnCriticCust, debugBpXp, debugMaxUpgrades, debugResetDay,
} from './systems/debug.js';
import { applyA11yClasses } from './systems/audio.js';
import { ctxMgTap, ctxMgSkip } from './systems/context-mg.js';
import { applyAllStaffBonuses, renderStaff, hireStaff, levelUpStaff, restStaff, fireStaff, unlockSkill } from './systems/staff.js';
import { applyDecoBonus, buyDeco, unequipSlot } from './systems/decoration.js';
import { initQuests, claimQuest, submitScore, savePlayerName, setLbMode } from './systems/progress.js';
import { initStory, checkStoryTriggers, openStoryPing, storyChoose, storyTapOutside } from './systems/story.js';
import { initFusion, doFusion, pickFusionIng, clearFusionSlot } from './systems/fusion.js';
import { selectMG, rhTap, startSlice, startMemory } from './systems/minigames.js';
import { closeIdle } from './core/state.js';
import {
  goTab, bnavGo, bnavDrawer, drawerGo, closeDrawer,
  titleContinue, titleNewGame, titleDeleteSave, titleSettings, initTitleScreen,
  openPause, closePause, pauseSettings, pauseToTitle, pauseNewGame,
  closeConfirm, confirmOk, closeSettings, toggleSetting,
  exportSaveFile, exportSaveCopy, importSaveFromText, importSaveFromFile,
} from './systems/nav.js';

// ── Background canvas ─────────────────────────────────────────────────────────
startGameBg();

// ── Initialisation ────────────────────────────────────────────────────────────

load();

// Restore fusion menus discovered in a previous session
(G.fusion && G.fusion.discovered || []).forEach(id => {
  if (!MENUS.find(m => m.id === id)) {
    const r = FUSION_RECIPES.find(x => x.id === id);
    if (r) {
      const fusionIng = {};
      r.combo.forEach(k => fusionIng[k] = (fusionIng[k] || 0) + 1);
      MENUS.push({ id:r.id, name:r.name, emoji:r.emoji, price:r.price,
                   time:r.time, unlockLv:1, ing:fusionIng, isFusion:true, tags:r.tags || [] });
    }
  }
});

applyAllStaffBonuses();
applyDecoBonus();
applyPrestigeShop();
initQuests();
initStory();
initFusion();

spawnQueue();
spawnSteam();
updateKitchenTheme(G);
updateUI();
renderUpgrades();
renderIngredients();
updateEarnPreview();
refreshUnlockUI();
markExistingUnlocksSeen();
ensureDailySpecial();
ensureRivalWeekly();
renderRivalBanner();
ensureFishMarket();
renderMarketBanner();
renderSeasonBanner();
ensureBattlePass();
renderBattlePass();
applyA11yClasses();
initDebug();
updateEventForecastUI();
connectNet().then(() => initSpectate()); // online LB + spectate handlers

// Unlock audio + BGM on first gesture (browser autoplay policy)
const _kickAudio = () => {
  unlockAudio();
  if (settings.music) startBgm();
  document.removeEventListener('pointerdown', _kickAudio);
  document.removeEventListener('keydown', _kickAudio);
};
document.addEventListener('pointerdown', _kickAudio, { once: true });
document.addEventListener('keydown', _kickAudio, { once: true });

// ── Periodic intervals ────────────────────────────────────────────────────────

// Auto-save every 10 s
setInterval(() => { if (settings.autosave) save(); }, 10000);

// Fish spoil tension (high stock of perishables)
setInterval(tickSpoil, 45000);

// Passive income from owned branches (not active) — runs every 1 s
setInterval(() => {
  let idleM = (G.idleMult || 1) * (G.goldenBonus || 1);
  if (G.decoIdleBonus) idleM *= 2;
  G.branches.forEach(b => {
    if (b.owned && b.id !== G.activeBranch) {
      const bd = BRANCHES.find(x => x.id === b.id);
      if (!bd) return;
      let m = idleM;
      // Manager assigned to this branch boosts idle
      const mid = G.branchManagers && G.branchManagers[b.id];
      if (mid && G.staff && G.staff[mid]?.hired) {
        const lv = G.staff[mid].level || 1;
        const mood = (G.staff[mid].mood ?? 100) / 100;
        m *= 1.2 + lv * 0.08 * (0.5 + 0.5 * mood);
      }
      G.money += Math.round((bd.idleRate / 60) * m * (1 + (G.branchIdleBonus || 0)));
    }
  });
  updateUI();
}, 1000);

// Staff mood decay every 30 s
setInterval(() => {
  const anyHired = Object.keys(G.staff || {}).some(id => G.staff[id] && G.staff[id].hired);
  if (!anyHired) return;
  Object.values(G.staff || {}).forEach(info => {
    if (info.hired && info.mood != null) info.mood = Math.max(10, (info.mood || 100) - 0.3);
  });
  const staffTab = getEl('tab-staff');
  if (staffTab && staffTab.classList.contains('on')) renderStaff();
}, 30000);

// Story trigger check every 20 s
setInterval(checkStoryTriggers, 20000);

// Event scheduler + forecast UI (cooldown / marketing chance / pity)
setInterval(tickEventScheduler, 1000);

// BGM mode follows rush / prestige mood
setInterval(() => syncBgmToGame(G), 4000);

// ── window-attach: index.html and template-string HTML use onclick="fn(...)"
// attributes, which only resolve against `window`. This is the definitive set —
// verified by grepping every onclick/oninput across index.html and every JS
// file for the function name it invokes (51 names). Keep this list and that
// grep in sync; a name missing here throws ReferenceError only when a player
// clicks that exact button, not at load time.
Object.assign(window, {
  assignBranchManager, bnavDrawer, bnavGo, buyBranch, buyDeco, buyIngredient, buyPrestigeItem, buyUpgrade, claimAllBattlePass, claimBattlePassTier, claimQuest,
  challengeVip, claimRivalReward, clearFusionSlot, closeAch, closeConfirm, closeDrawer, chooseEventOption, closeEvent, closeIdle,
  closePause, closePrest, closeSettings, closeSpectateModal, closeVip, confirmOk, cook, ctxMgSkip, ctxMgTap, doFusion,
  doPrestige, drawerGo, fireStaff, goTab, hireStaff, hostFromModal, joinFromModal, leaveSpectateRoom, levelUpStaff, openPause,
  openSpectateModal, openStoryPing, pauseNewGame, pauseSettings, pauseToTitle, pickFusionIng,
  respecUpgrades, restStaff, rhTap, setUpgTreeFilter, savePlayerName, selMenu, selectMG, sendReaction, sendSpectateChat, serve, setLbMode, showPrestModal,
  startMemory, startSlice, storyChoose, storyTapOutside, submitScore,
  switchBranch, titleContinue, titleDeleteSave, titleNewGame, titleSettings,
  toggleSetting, unequipSlot, unlockSkill, dismissCoachTip,
  exportSaveFile, exportSaveCopy, importSaveFromText, importSaveFromFile,
  toggleDebugEnabled, openDebugPanel, closeDebugPanel, debugCloseAndDisable,
  debugGiveMoney, debugAddLevel, debugSetLevel, debugFillIng, debugSkipTime, debugForceEvent,
  debugSpawnSpy, debugSpawnCriticCust, debugBpXp, debugMaxUpgrades, debugResetDay,
});

// Show title screen last (after everything is initialised)
initTitleScreen();
