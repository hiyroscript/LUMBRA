# Shadow Skirr

A rhythm runner by hiyroscript where the music and the level are the same thing.

## Play

Open `index.html` in a browser. There is nothing to install.

<!-- dev-only:begin -->
- **Developer build:** https://hiyroscript.github.io/shkr/ serves this repo as-is, and the repo is the developer build. All 30 levels are unlocked with three rainbow stars, and Settings has a developer section for unlocking, resetting and putting progress back. Opening the repo's `index.html` from disk gives the same build.
- **Release build:** the normal game, ready to upload to itch.io, Newgrounds and similar sites. Download [`shadow-skirr.zip`](https://github.com/hiyroscript/shkr/releases/download/latest/shadow-skirr.zip) from the rolling `latest` release, or from the `shadow-skirr-release` artifact of any **Build release** run on the Actions tab. `index.html` is at the root of the zip. See [Builds](#builds).

<!-- dev-only:end -->
## Controls

| Action | Keyboard | Mouse | Touch |
|---|---|---|---|
| Jump | `Space`, `↑`, `W` | left click | tap the right half of the screen |
| Slide | `↓`, `S` | right click | hold the left half of the screen |
| Pause / resume | `Esc` | pause button (top right) | pause button (top right) |

On the home screen, `←` / `→` browse levels and `Enter` or `Space` starts the selected level. When a card is open (pause, level cleared, confirmations), `Enter` picks its first button. The game also pauses itself when the tab is hidden or the window loses focus.

## Features

- 30 levels plus a home screen, each with its own soundtrack generated live with Web Audio. There are no audio files and no sound effects. The music is the only sound in the game.
- The home screen plays an attract-mode demo run behind the menu.
- 15 hazards, each introduced on its own level:

  | Level | Hazard | Level | Hazard | Level | Hazard |
  |---|---|---|---|---|---|
  | 1 | Bloom | 11 | Anchor | 21 | Mimic |
  | 3 | Halo | 13 | Rail | 23 | Glass |
  | 5 | Drift | 15 | Rift | 25 | Coil |
  | 7 | Fade | 17 | Comet | 27 | Flicker |
  | 9 | Prism | 19 | Thermal | 29 | Zenith |

- Star rating per level, based on how many tries the first clear took: 1 try earns three rainbow stars, up to 3 tries three stars, up to 7 tries two stars, more than that one star. Try counts are recorded per level, and clearing a level unlocks the next one.
- Rebirth: on a cleared level, "rebirth level" clears that level's stars and tries. Unlocked levels stay unlocked.
- Settings: music volume, screen shake on/off, and reset all progress.
- Reduced motion: with `prefers-reduced-motion: reduce`, the play button's pulse animation, the foliage sway and the drifting fog wisps are turned off.
- Progress and settings are saved in `localStorage`.

<!-- dev-only:begin -->
## Project structure

```
shkr/
├── index.html          page markup (screens, HUD, overlay) and the script tags
├── css/
│   └── style.css       UI ported from hiyroscript/vl: tokens, type, chips, bars, orb, wipe, cards and panels
├── js/
│   ├── dev-config.js   developer build only: points the save at its own key (loaded first)
│   ├── sim.js          deterministic fixed-timestep simulation, shared by the game and the Node beatability solver
│   ├── levels.js       the 30 hand-written charts, the hazard list (HAZ) and the home screen chart (HOME)
│   ├── fixes.js        per-level fix-ups applied when a level compiles (currently empty)
│   ├── demo.js         precomputed input for the home screen's attract-mode demo (DEMO_SOL)
│   ├── music.js        sequenced Web Audio synthesis: one original track per level, built from its spec and chart
│   ├── backdrops.js    the terrain background layer: five looping parallax strips of fog-grey silhouettes per world
│   ├── render.js       "fog silhouette" renderer: misty sky, grey layers, black terrain, colour only on hazards
│   ├── game.js         state, clock, input, HUD, home screen, results, rebirth
│   └── dev.js          developer build only: rainbow unlock-all default, developer section in Settings, DEV badge (loaded last)
├── tools/
│   ├── build-release.sh   makes the release: the repo minus the developer code, with a guard against leaks
│   └── parity-check.js    proves the release plays exactly like the source
├── .github/
│   └── workflows/
│       └── build.yml   on every push to main: build, guard, parity check, zip, publish
├── README.md
└── max                 design brief
```

<!-- dev-only:end -->
## How it works

- The simulation (`SIM`) runs on a fixed timestep measured in beats: 96 ticks per beat, 4 world units per beat. Because everything is in beats, a level plays the same at any tempo.
- Levels are written as compact chart strings. A phrase is `terrain/overlay`, each character is half a beat, and a level's form string chains one-letter phrase keys, with digits setting the musical energy (0-4) of the bars that follow.
- Each level's soundtrack is built from that level's spec (tempo, key, scale, chord progressions, instruments) and from its chart. The lead line plays on the half-beats where the level asks for an action.
- The game clock follows the audio clock while music is playing, so input and visuals stay on the beat.

<!-- dev-only:begin -->
## Builds

One source tree, two builds:

| | Developer build | Release build |
|---|---|---|
| Where | this repo, served as-is by GitHub Pages at https://hiyroscript.github.io/shkr/ | [`shadow-skirr.zip`](https://github.com/hiyroscript/shkr/releases/download/latest/shadow-skirr.zip), or the `shadow-skirr-release` artifact of a workflow run |
| What | the game plus `js/dev-config.js` and `js/dev.js` | the repo minus all developer code |
| Progress | every level unlocked with three rainbow stars on first load | the player's own: a new save starts at level 1 with no stars |
| Extras | developer section in Settings, DEV badge on the home screen | none |
| Save key | `shadowskirr.dev.v1` (snapshot for "put back": `shadowskirr.dev.snapshot`) | `shadowskirr.v1` (old `lumbra.v1` saves are migrated) |

The developer build needs no build step: Pages keeps deploying the `main` branch root exactly as before. Because the two builds use different save keys, the developer build never reads or writes a player's real save, even on the same origin.

**Developer section** (Settings, below the normal rows). Each action asks for confirmation first, keeps the music and shake settings, and returns to the home screen.

- *Unlock all (rainbow)*: every level unlocked with three rainbow stars.
- *Reset progress*: a fresh game (level 1, no stars, no tries), to test the real first-time flow.
- *Put progress back*: restores unlocks, stars, tries and the selected level exactly as they were right before the last reset or unlock all. Both of those save a snapshot first. One level of undo, and the button is disabled when there is no snapshot.

**Release build.** `.github/workflows/build.yml` runs on every push to `main` (except pushes that only touch `max` or Markdown files other than this README) and on manual runs:

1. `bash tools/build-release.sh dist/release` copies `index.html`, `css/`, `js/` and `README.md` (never `max`, `tools/`, `.github/` or `.git`), deletes `js/dev.js` and `js/dev-config.js`, removes the dev-only lines (below) from `index.html` and `README.md`, and stamps `<meta name="shkr-build" content="dev">` as `release · <short-sha> · <UTC date>`. Its guard then fails the build if the output still contains `dev.js`, `dev-config.js`, `dev-only`, `shadowskirr.dev`, the developer section's ids or text, or any definition of `SHKR_DEV` / `SHKR_DEV_INIT`, or if a `<script src>` points at a missing file.
2. `node tools/parity-check.js . dist/release` checks that every shared file is byte-identical (`index.html` and `README.md` may differ only by the removed dev-only lines and the stamp), then loads `sim.js`, `levels.js`, `fixes.js` and `demo.js` from both trees in separate `vm` contexts. Every level and the home chart must compile identically, each level's solver solution must replay to the same final state, a seeded run that dies part-way must match on every tick, and the attract-mode demo (`DEMO_SOL`) must replay identically. It prints a table and names the first differing field on failure.
3. Only if both pass: zip `dist/release` with `index.html` at the root, upload it as the `shadow-skirr-release` artifact, and replace the rolling `latest` release (tag, title "Shadow Skirr — latest build", commit SHA, date and message in the notes). A manual run on another branch builds, checks and uploads the artifact but leaves `latest` alone.

The gate cannot be skipped: there is no flag for it, and it runs in the same job as the zip.

To build and check locally:

```sh
bash tools/build-release.sh /tmp/shadow-skirr
node tools/parity-check.js . /tmp/shadow-skirr
```

**The dev-only marker rule.** Anything that exists only for the developer build must be removable by the build:

- A whole developer file goes in `js/` and is deleted by `tools/build-release.sh` (add it there and to `DEV_FILES` in `tools/parity-check.js`).
- Any line of `index.html` or `README.md` that only the developer build should have ends with `<!-- dev-only -->` on the same line, like the two dev `<script>` tags. A longer stretch goes between a `<!-- dev-only:begin -->` line and a `<!-- dev-only:end -->` line, each marker alone on its line, like the developer parts of this README. Unbalanced markers fail the build.
- Shared code (`js/*.js` other than the dev files, `css/style.css`) must not contain developer code. `js/game.js` only reads the optional `window.SHKR_DEV.saveKey` and calls `window.SHKR_DEV_INIT` if it exists, which does nothing in the release.

## Development notes

- **Script load order matters.** The JS files are classic scripts that share top-level globals (`SIM`, `HAZ`, `LEVELS`, `HOME`, `FIXES`, `DEMO_SOL`, `MUSIC`, `BACKDROPS`, `RENDER`). They must load in this order, at the end of `<body>`, without `defer`, `async` or `type="module"`:
  `dev-config.js` → `sim.js` → `levels.js` → `fixes.js` → `demo.js` → `music.js` → `backdrops.js` → `render.js` → `game.js` → `dev.js`
  `dev-config.js` comes first so `game.js` sees the developer save key, and `dev.js` comes last. Both are stripped from the release, which loads `sim.js` through `game.js` only.
- **Don't convert to ES modules** unless you also refactor the shared globals and serve the game from a local server. Modules don't share a global scope and don't load from `file://`.
- **Save data** lives under the `localStorage` key `shadowskirr.v1` in the release and `shadowskirr.dev.v1` in the developer build. Saves from the old `lumbra.v1` key are migrated automatically on load, for the real key only.
- **Debug handle:** `window.__SHADOWSKIRR` exposes `G` (game state), `S()` (saved state), `startLevel(n)`, `keys` (input state), `getL(n)` (compiled level), `N` (level count), `saveState()`, `paintHome(retitle)`, `paintLevels()`, `startHome()`, `show(screen)`, `showCard({...})`, `hideCard()` and `setS(obj)`, which replaces the saved state through the same validation as loading. `window.__LUMBRA` is kept as a legacy alias for old scripts.
- **Fonts** (Space Grotesk, JetBrains Mono) load from Google Fonts. Offline, the page falls back to system fonts.

<!-- dev-only:end -->
## Credits

A game by hiyroscript.
