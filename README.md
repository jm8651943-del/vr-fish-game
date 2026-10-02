# Abyss Arena — VR Fish Game
Standalone WebXR fish-shooter prototype for Meta Quest Browser, with a desktop practice mode. Version **0.9.1 — Expedition**.

## Run
Requires Node 18+ and npm. Run `npm ci`, then `npm start` and open http://localhost:3000.
For Meta Quest, open your deployment's **HTTPS** URL in Quest Browser and press **ENTER VR**. Localhost on a laptop is not a headset-accessible HTTPS deployment.

## Controls
- Desktop: hold left mouse button to fire; WASD/arrows to move; R reload; Q optional weapon wheel; F armory; M world; L lock; E super; [ / ] shot denomination; H support; O economy.
- Quest: hold trigger to fire; left grip reload; hold right grip for the optional flat wheel, choose with the right stick, release to confirm; X/Y decrease/increase denomination; A opens the wheel; B cancels it or toggles sound when it is closed; left stick click lock; right stick click super.
- Graphics button changes desktop pixel density and XR foveation. Balanced is the default. The default blaster works on every fish; loadout selection is optional. Sound starts muted and pauses on page exit or hidden/blurred XR sessions. Use the Sound control (or B in VR) to resume intentionally. Actual headset frame rate needs hardware validation.

## Design
Procedural 3D fish use species-specific bodies, fins, shells, eyes and animated tails. Static parts merge by material to limit draw calls. Five worlds include animated caustics, suspended particles, light shafts and vegetation. No external images or model downloads are required.

## Verification
`npm test` runs gameplay-rule and HTTP integration regressions. Optional browser checks require Playwright (`npm install --no-save playwright` and `npx playwright install chromium`), a running server, then `npm run test:browser`. `GAME_ORIGIN`, `BROWSER_EXECUTABLE`, `PLAYWRIGHT_MODULE` and `GAME_SCREENSHOT` can configure that check.

See [AUDIT.md](AUDIT.md) for coverage and remaining limitations. Saved progression and balances are local entertainment data, not authoritative accounts. No cash payments or withdrawals are implemented. This repository is independent from PrimeForge OPTIMIZE.
