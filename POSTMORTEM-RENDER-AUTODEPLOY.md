# Post-mortem: Render auto-deploy after GitHub repo recreate

**Status:** Root cause known · fix is operational (Connect) · may still need one-time dashboard action  
**Service:** `sushi-empire` on Render · root directory `sushi-empire`  
**Repo:** `https://github.com/tanapoljoe1-art/sushi-empire` (recreated; history reset)

## Symptom
- Code pushed to `main` on GitHub
- Render **did not** start a new deploy
- Live `last-modified` / package version stayed on last **manual** deploy
- Auto-Deploy toggle appeared on, but no webhook-driven builds

## Impact
- Ship latency: features only reached production after manual Deploy
- False confidence that “push = live”
- Wasted investigation into GitHub App permissions (already correct)

## Timeline (compressed)
1. Repo deleted + recreated on GitHub (clean history from recreation point)
2. Local force-push corrected once after a brief wrong history on `origin/main`
3. Test bump `package.json` → `1.0.1` (`d2f8197`) to probe webhook — **no auto deploy**
4. GitHub App install checked: **All repositories** access already granted
5. Auto-Deploy toggled off/on once — **still no deploy**
6. Diagnosis: stale webhook subscription from delete+recreate, not permissions

## Root cause
Render’s Auto-Deploy is driven by a **GitHub webhook subscription** tied to the repo identity at connect time.

After **delete + recreate** of the GitHub repo:
- New repo = new GitHub id / delivery target
- Old Render “connected repo” pointer / webhook can remain **stale**
- UI may still show Auto-Deploy enabled while events never arrive

**Not the cause:** missing GitHub App permissions (confirmed “All repositories”).

## Fix (do this, in order)
1. Render Dashboard → service `sushi-empire` → **Settings** → **Build & Deploy**
2. Use **Connect** (or disconnect + reconnect the GitHub repo) — bind the **new** repo
3. **Do not** only toggle Auto-Deploy off/on again (already tried; not sufficient)
4. Trigger **Manual Deploy** once to confirm pipeline
5. Push a tiny commit (e.g. version bump) and verify a deploy starts without manual click

## Verification
- [ ] GitHub repo Settings → Webhooks shows Render delivery with recent 2xx
- [ ] Push to `main` creates a new deploy in Render Events
- [ ] Live site reflects new `package.json` version / asset hashes

## Prevention
- Prefer **rename** or transfer over delete+recreate when the deploy target is Render/Vercel
- After any repo recreate: treat **Reconnect** on every CI/CD host as mandatory checklist
- Keep a deploy smoke: bump version or `health` field and confirm live after push
- Document service root directory (`sushi-empire`) so reconnect does not point at monorepo root by mistake

## Dead ends (do not re-try first)
- Re-toggling Auto-Deploy alone
- Re-checking GitHub App “All repositories” when already confirmed
- Assuming local `/private/tmp` loss means the GitHub repo is gone (clone from remote)

## Related facts
- Local ephemeral path: `/private/tmp/sushi-empire-review/` — push docs + code often
- Server serves `dist/` if present else `public/`; Render should run `npm run build` if using production bundle
- Game code lives in nested `sushi-empire/`; Render Root Directory must stay `sushi-empire`
