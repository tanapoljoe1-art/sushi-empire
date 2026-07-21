// ── Shared canvas particle-drift background ───────────────────────────────────
// Pre-refactor, main.js's game background (#bgCanvas) and nav.js's title-screen
// background (#bgCanvas2) were two independent, ~90%-structurally-identical
// implementations with different tuning constants and one real behavioral
// difference: the title background stops animating once the title screen
// closes, the game background runs forever. Unified here as one engine with
// every tuning value passed explicitly (no hidden defaults) so each caller's
// exact original look is preserved, verified frame-by-frame against the
// originals before this replaced them.
function startParticleBg(canvasId, cfg) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H;
  const pts = [];
  const rsz = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
  window.addEventListener('resize', rsz); rsz();

  for (let i = 0; i < cfg.count; i++) {
    pts.push({
      x:  cfg.spawnX(W, H),
      y:  cfg.spawnY(W, H),
      r:  Math.random() * cfg.radiusRand + cfg.radiusBase,
      vy: -cfg.vyBase - cfg.vyRand * Math.random(),
      a:  Math.random() * Math.PI * 2,
      va: cfg.vaBase + cfg.vaRand * Math.random(),
    });
  }

  let t = 0;
  let cachedGradient = null, lastGW = 0, lastGH = 0;
  const makeGradient = () => {
    const g = ctx.createRadialGradient(
      W * cfg.gradCx, H * cfg.gradCy, 0,
      W * cfg.gradCx, H * cfg.gradCy, W * cfg.gradR
    );
    g.addColorStop(0, cfg.gradColor); g.addColorStop(1, 'transparent');
    return g;
  };

  (function draw() {
    t += cfg.timeStep;
    ctx.clearRect(0, 0, W, H);

    if (cfg.cacheGradient) {
      if (!cachedGradient || Math.abs(W - lastGW) > 100 || Math.abs(H - lastGH) > 100) {
        cachedGradient = makeGradient();
        lastGW = W; lastGH = H;
      }
      ctx.fillStyle = cachedGradient;
    } else {
      ctx.fillStyle = makeGradient();
    }
    ctx.fillRect(0, 0, W, H);

    if (cfg.batched) {
      // Single path/fill for all particles — cheaper, but every particle
      // shares one alpha (phased on time only, not per-particle).
      ctx.beginPath();
      pts.forEach(p => {
        p.a += p.va; p.y += p.vy;
        if (p.y < -10) p.y = H + 10;
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      });
      ctx.fillStyle = cfg.particleColor(t, 0);
      ctx.fill();
    } else {
      // One path/fill per particle — each keeps its own phase (t + p.a).
      pts.forEach(p => {
        p.a += p.va; p.y += p.vy;
        if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = cfg.particleColor(t, p.a);
        ctx.fill();
      });
    }

    if (cfg.shouldContinue()) requestAnimationFrame(draw);
  })();
}

export function startGameBg() {
  startParticleBg('bgCanvas', {
    count: 35,
    spawnX: () => Math.random() * 1200,
    spawnY: () => Math.random() * 2400,
    radiusBase: .2, radiusRand: .7,
    vyBase: .12, vyRand: .08,
    vaBase: .004, vaRand: .006,
    gradCx: .5, gradCy: .85, gradR: .65, gradColor: 'rgba(200,150,42,.05)',
    cacheGradient: true,
    timeStep: .006,
    particleColor: (t) => `rgba(232,196,106,${.15 + .2 * Math.sin(t)})`,
    batched: true,
    shouldContinue: () => true,
  });
}

export function startTitleBg() {
  startParticleBg('bgCanvas2', {
    count: 60,
    spawnX: (W) => Math.random() * W,
    spawnY: (W, H) => H + Math.random() * H,
    radiusBase: .2, radiusRand: .8,
    vyBase: .4, vyRand: .3,
    vaBase: .003, vaRand: .006,
    gradCx: .5, gradCy: .8, gradR: .7, gradColor: 'rgba(200,150,42,.07)',
    cacheGradient: false,
    timeStep: .005,
    particleColor: (t, a) => `rgba(232,196,106,${.2 + .25 * Math.sin(t + a)})`,
    batched: false,
    shouldContinue: () => {
      const ts = document.getElementById('titleScreen');
      return !!(ts && !ts.classList.contains('out'));
    },
  });
}
