# Shadow Skirr

A rhythm runner by hiyroscript where the music and the level are the same thing.

## Play

Open `index.html` in a browser. There is nothing to install and no build step.

GitHub Pages: _(owner: add the Pages URL here if Pages is enabled for this repository)_

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

## Project structure

```
shkr/
├── index.html        page markup (screens, HUD, overlay) and the script tags
├── css/
│   └── style.css     UI ported from hiyroscript/vl: tokens, type, chips, bars, orb, wipe, cards and panels
├── js/
│   ├── sim.js        deterministic fixed-timestep simulation, shared by the game and the Node beatability solver
│   ├── levels.js     the 30 hand-written charts, the hazard list (HAZ) and the home screen chart (HOME)
│   ├── fixes.js      per-level fix-ups applied when a level compiles (currently empty)
│   ├── demo.js       precomputed input for the home screen's attract-mode demo (DEMO_SOL)
│   ├── music.js      sequenced Web Audio synthesis: one original track per level, built from its spec and chart
│   ├── backdrops.js  the terrain background layer: five looping parallax strips of fog-grey silhouettes per world
│   ├── render.js     "fog silhouette" renderer: misty sky, grey layers, black terrain, colour only on hazards
│   └── game.js       state, clock, input, HUD, home screen, results, rebirth
├── README.md
└── max               design brief
```

## How it works

- The simulation (`SIM`) runs on a fixed timestep measured in beats: 96 ticks per beat, 4 world units per beat. Because everything is in beats, a level plays the same at any tempo.
- Levels are written as compact chart strings. A phrase is `terrain/overlay`, each character is half a beat, and a level's form string chains one-letter phrase keys, with digits setting the musical energy (0-4) of the bars that follow.
- Each level's soundtrack is built from that level's spec (tempo, key, scale, chord progressions, instruments) and from its chart. The lead line plays on the half-beats where the level asks for an action.
- The game clock follows the audio clock while music is playing, so input and visuals stay on the beat.

## Development notes

- **Script load order matters.** The JS files are classic scripts that share top-level globals (`SIM`, `HAZ`, `LEVELS`, `HOME`, `FIXES`, `DEMO_SOL`, `MUSIC`, `BACKDROPS`, `RENDER`). They must load in this order, at the end of `<body>`, without `defer`, `async` or `type="module"`:
  `sim.js` → `levels.js` → `fixes.js` → `demo.js` → `music.js` → `backdrops.js` → `render.js` → `game.js`
- **Don't convert to ES modules** unless you also refactor the shared globals and serve the game from a local server. Modules don't share a global scope and don't load from `file://`.
- **Save data** lives under the `localStorage` key `shadowskirr.v1`. Saves from the old `lumbra.v1` key are migrated automatically on load.
- **Debug handle:** `window.__SHADOWSKIRR` exposes `G` (game state), `S()` (saved state), `startLevel(n)`, `keys` (input state) and `getL(n)` (compiled level). `window.__LUMBRA` is kept as a legacy alias for old scripts.
- **Fonts** (Space Grotesk, JetBrains Mono) load from Google Fonts. Offline, the page falls back to system fonts.

## Credits

A game by hiyroscript.
