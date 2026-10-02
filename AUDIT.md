# Source audit and verification — 0.9.0 Expedition

Reviewed against main commit `008a398fd8b41e5cc0ca144f13b742b031e12fad` on October 1, 2026 (America/Chicago). Scope: package and deployment configuration, static server, entrypoint/styles, gameplay, data definitions, WebXR input/HUD, audio, rendering and persistence. This is a source and local-runtime audit; it does not establish production deployment health or regulatory clearance.

## Implemented changes

| Area | Finding and adjustment |
| --- | --- |
| Fish presentation | Replaced camera-facing fish artwork with procedural volumetric models, distinct species silhouettes and animated tails/fins. Removed the unused sprite/model builders. |
| Environment | Added animated seabed caustics with distance haze, subdued light columns, plankton, and instanced vegetation. Background now follows the world's atmosphere. |
| GPU budget | Merged static fish geometry by material; shared immutable primitive geometry and health textures; balanced resolution/foveation defaults; cap population to 14 on VR entry. |
| Resource lifecycle | Removed fish, expired particles/bolts, world geometry, transient labels and replaced VR HUDs release owned resources. Shared textures/geometry remain alive. Dynamic hologram text no longer enters an unbounded texture cache. |
| Movement | Replaced per-frame accumulated vertical/depth motion with bounded elapsed-time functions; normalized particle damping by elapsed time; clamp boundary crossings. |
| World lifecycle | Respawns and automatic transitions use the active game clock and world epoch. Changing worlds invalidates stale callbacks and clears old transient effects/boss banner. |
| Combat | Reload blocks firing; chain hits exclude all visited targets; actual damage contribution caps at remaining HP; score power-ups/upgrades affect score as described; labels and health UI are excluded from targeting. |
| Input | F opens the armory, allowing A movement; held desktop firing works; repeated key events do not repeat toggles; blur/pointer cancellation/controller disconnection clear held inputs. Grip action follows handedness. |
| Session/persistence | Malformed JSON or unavailable storage no longer abort startup; numeric values, upgrades, weapon unlocks, map indices and visited worlds are normalized. Streaks reset and session baseline starts at the loaded balance. Save failures show a once-per-session message. |
| XR/audio | Session request occurs before awaited audio work; audio failure does not prevent entry. Power/reload clocks pause with gameplay, VR HUD regeneration is throttled, and delayed audio scheduling resynchronizes. |
| HTTP/telemetry | Oversized bodies return usable 413 responses; non-object JSON returns 400; aggregate event cardinality is bounded. Health build/version is derived from package.json. |
| Packaging/UI | Added dependency lockfile, ignore rules, regression commands, compact HUD, visible graphics control, language/accessible canvas labels, and keyboard focus indicators. |

## Fresh verification

- `npm test`: **12 tests passed**, covering corrupt/inaccessible storage, migration bounds, earned progression, bounded motion at 60/72/120 Hz, overkill damage, unique chain targets, world definitions, health/vendor/security headers, module routes and HEAD, traversal/encoding rejection, JSON/body limits, and bounded telemetry aggregates.
- `npm run test:browser` with local headless Chromium/SwiftShader: **passed**. Exercises real WebGL startup, all five worlds, desktop start, movement/armory keys, graphics toggle, shooting, reload guard, old-world callback isolation, twenty world rebuilds, hologram texture disposal, corrupt-save reload and 390×844 layout. No page errors or shader errors reported.
- Browser resource sample after repeated rebuilds: **162 geometries / 42 textures / 260 draw calls**. Counts vary with random species and effects. This is a local desktop sample, not a Quest FPS measurement.
- `npm audit --omit=dev`: **0 known vulnerabilities reported** for the pinned dependency tree. This is advisory-database evidence, not a guarantee of security.
- JavaScript syntax checks and `git diff --check`: passed.

## Remaining limits and decisions

1. **Quest hardware unverified.** Session start/exit, controller mappings, stereoscopic appearance, comfort, actual frame rate and thermal behavior require an actual headset. The headless browser check cannot certify XR behavior. High mode increases GPU cost.
2. **Local progression is editable.** There is no server-authoritative account, identity, economy, inventory, purchase validation or anti-cheat. The data is suitable for a single-player entertainment prototype, not financial transactions or competitive rankings.
3. **Sweepstakes is unavailable.** The server's jurisdiction status stays `NOT_CLEARED`; there is no promotional ledger, payment or redemption implementation. Interface status flags are not evidence of actual KYC, geofencing, age verification or approvals.
4. **Analytics is best-effort.** Stats reside in process memory, reset on restart, count events rather than unique people, and accept unauthenticated submissions. Cardinality/body limits do not replace rate limiting or a durable verified analytics pipeline.
5. **Mobile is a desktop-style fallback.** Touch can aim/fire and controls wrap, but there is no touch movement joystick. The manifest is not an offline/service-worker implementation or native Quest package.
6. **Hosting baseline verified, upgrade not deployed.** The `vr-fish-game-live` service points to this repository's main branch and baseline commit; Railway reports SUCCESS and its HTTPS `/health` returned 200 with version 0.8.2. Current play URL: https://vr-fish-game-live-production.up.railway.app. A separate older `vr-fish-game` service is also healthy, and `fish-arena-web` has no deployment. These services were not changed or deleted. This source update has not been merged or deployed; production traffic/logs and secret values were not inspected. Repository visibility remains public as found.
7. **Asset style is procedural.** The models are newly authored stylized geometry; no commissioned art, imported high-detail meshes, texture atlases or post-processing pipeline is included. Additional fidelity should follow measured headset performance.
