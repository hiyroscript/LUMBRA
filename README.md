# Shadow Skirr

A rhythm runner by hiyroscript where the music and the level are the same thing.

## Play

- **Developer build:** https://hiyroscript.github.io/shkr/ serves this repo as-is, and the repo is the developer build. All 30 levels are unlocked with three rainbow stars, and Settings has a developer section for unlocking, resetting and putting progress back. Opening the repo's `index.html` from disk gives the same build.
- **Release build:** the normal game, ready to upload to itch.io, Newgrounds and similar sites. Download [`shadow-skirr.zip`](https://github.com/hiyroscript/shkr/releases/download/latest/shadow-skirr.zip) from the rolling `latest` release, or from the `shadow-skirr-release` artifact of any **Build release** run on the Actions tab. `index.html` is at the root of the zip. See [Builds](#builds).

Either way there is nothing to install: open `index.html` in a browser.

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
- 15 hazards, each introduced on its own level. How each one works is described in [Hazards](#hazards).

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

## Hazards

Everything in the game is timed in beats, so the timings below hold at every tempo. Touching anything deadly, or falling into a pit, sends you back to the start of the level for a new try.

### The basics

- **Jump** keeps you in the air for one beat and lifts your feet to about one and a half times your height. A press up to 0.2 beats before you land still counts, and so does one up to 0.15 beats after you run off a ledge.
- **Slide** lasts at least a quarter of a beat, and you stay down while something is still overhead.
- **Dive:** slide while you are in the air and you fall three times as fast. It cuts a jump short, and it is how you break Glass.
- **Plain obstacles** take the colours of each level's scenery:
  - spikes, wide spikes and tall spikes: jump them;
  - bars hanging just above the ground: slide under them;
  - walls that hang down to just above your head: stay on the ground and don't jump;
  - pits: jump them;
  - steps up and down. Running into the face of a step up kills you, so jump onto it. The tallest steps are too high for a plain jump and always come with a Bloom, Halo, Rift or Coil to get you up.

Every hazard below has its own colour, so you can always tell it from the scenery. A **zone** hazard (Drift, Anchor, Thermal, Zenith) is a tinted band with dashed edges: its rules apply while you are inside it.

### Bloom (level 1, red)

A bounce pad on the ground. Run onto it and it throws you about twice as high as a normal jump, for about one and a half beats in the air. Blooms sit in front of wide pits and tall steps. Jumping over one skips the bounce, and it never hurts you. If you are still holding slide when it launches you, you won't dive until you let go.

### Halo (level 3, cyan)

A ring floating at head height. Jump through it and you get one extra jump in mid-air, which you keep until you land. Press jump again in the air to use it. A Halo you touch while running on the ground is wasted, because landing clears the extra jump.

### Drift (level 5, purple zone, rising bubbles)

Low gravity. Jumps last one and a half beats instead of one and go about a third higher. The pits and obstacles inside are spaced for these longer, floatier jumps.

### Fade (level 7, green)

Stepping-stone tiles over a pit. A tile starts to fade the moment you touch it and is gone a little under half a beat later (0.42 beats). Land and jump straight on. Tiles you never touch stay put. A row of tiles fades all at once, counted from when you first touch it.

### Prism (level 9, orange)

A spinning crystal at head height, followed by a gate: a tall column of orange diamonds that you can't jump over. Run or jump through the crystal and the gate opens as you reach it. Reach the gate without the crystal and it kills you. Sliding under the crystal misses it.

### Anchor (level 11, blue zone, falling chevrons)

Heavy gravity. Jumps last only half a beat and reach about 70% of the usual height. The obstacles inside are packed tight to match: narrow pits and small spikes, often one every half beat.

### Rail (level 13, lime)

A bar overhead that you can hang from.

- Jump and keep holding jump: near the top of the jump you grab the rail and ride along it.
- Hold jump to keep hanging, and let go to drop. You also drop at the end of the rail.
- Hold slide while hanging to pull your legs up over tall posts.
- You can't hang past a spiked blade on the rail. Let go before it, run under it on the ground, then jump and grab the rail again.

### Rift (level 15, magenta)

A portal at head height with a dashed line up to its exit. Run or jump into it and it lifts you straight up to about twice the height of a jump, where you hang still for an instant and then fall. Rifts get you onto ledges too tall to jump. Sliding under one misses it, and each Rift works once per try.

### Comet (level 17, yellow)

A comet floating just above head height. Catch it in mid-air and you glide level for one beat, carried across pits without falling. Slide to drop out of the glide early, and landing ends it. It only works in the air: running under it does nothing.

### Thermal (level 19, orange-red zone, rising wavy lines)

An updraft that carries you up on its own, to almost twice the height of a jump. Jump does nothing inside it, and holding slide makes you sink (or slide along the ground if you are already down). Inside, rocks rise from the ground and blocks hang from above. Float over the rocks, and sink under the blocks.

### Mimic (level 21, blue)

An eye on a post, followed by a beam.

- When you pass the eye, it records whether you were in the air (more than about half your height off the ground) or on the ground. Its pupil looks up or down to show what it saw.
- The beam then fires at the height where you were:
  - if you passed the eye on the ground, the beam runs along the ground, and you must jump over it;
  - if you passed the eye in the air, the beam fills the space above head height, and you must stay on the ground.
- In short: whatever you did at the eye, do the opposite at the beam. Until the eye has seen you, the beam's path is a dashed line.

### Glass (level 23, green)

A glass pane high above the ground, often level with the ground you just came from. You can run across it, and bumping its underside while jumping just stops you. To get below it, dive onto it: slide in mid-air as you land, and it shatters and you fall through. Running into its edge side-on kills you, like a wall.

### Coil (level 25, teal)

A spring on the ground.

- Slide onto it and keep holding slide to charge it. The spring squeezes down as it charges.
- Let go of slide, or slide off its end, to launch.
- You need at least 0.15 beats of charge. A full beat of charge gives the biggest launch, as high as a Bloom bounce.
- Jumping off the Coil instead throws the charge away.

### Flicker (level 27, pink)

Floor tiles in two sets. One set is solid and the other is only a dashed outline that you fall through. Every jump you make swaps the sets, including a Halo's mid-air jump. Bloom bounces, Coil launches and Rift lifts don't swap them. Count your jumps so the tile you land on is solid when you get there.

### Zenith (level 29, indigo zone, upward chevrons)

Gravity flips. When you enter the zone you are thrown up onto the ceiling and run along it upside down, with the level mirrored above you. Jump and slide still work relative to you: jump pushes you away from the ceiling. Leaving the zone flips you back down. A gap in the ceiling is a pit like any other.

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

## How it works

- The simulation (`SIM`) runs on a fixed timestep measured in beats: 96 ticks per beat, 4 world units per beat. Because everything is in beats, a level plays the same at any tempo.
- Levels are written as compact chart strings. A phrase is `terrain/overlay`, each character is half a beat, and a level's form string chains one-letter phrase keys, with digits setting the musical energy (0-4) of the bars that follow.
- Each level's soundtrack is built from that level's spec (tempo, key, scale, chord progressions, instruments) and from its chart. The lead line plays on the half-beats where the level asks for an action.
- The game clock follows the audio clock while music is playing, so input and visuals stay on the beat.

## Builds

One source tree, two builds:

| | Developer build | Release build |
|---|---|---|
| Where | this repo, served as-is by GitHub Pages at https://hiyroscript.github.io/shkr/ | [`shadow-skirr.zip`](https://github.com/hiyroscript/shkr/releases/download/latest/shadow-skirr.zip), or the `shadow-skirr-release` artifact of a workflow run |
| What | the whole repo: the game plus `js/dev-config.js` and `js/dev.js` | only what the game needs to run: `index.html`, `css/` and the game's `js/` files, with all developer code removed |
| Progress | every level unlocked with three rainbow stars on first load | the player's own: a new save starts at level 1 with no stars |
| Extras | developer section in Settings, DEV badge on the home screen | none |
| Save key | `shadowskirr.dev.v1` (snapshot for "put back": `shadowskirr.dev.snapshot`) | `shadowskirr.v1` (old `lumbra.v1` saves are migrated) |

The developer build needs no build step: Pages keeps deploying the `main` branch root exactly as before. Because the two builds use different save keys, the developer build never reads or writes a player's real save, even on the same origin.

**Developer section** (Settings, below the normal rows). Each action asks for confirmation first, keeps the music and shake settings, and returns to the home screen.

- *Unlock all (rainbow)*: every level unlocked with three rainbow stars.
- *Reset progress*: a fresh game (level 1, no stars, no tries), to test the real first-time flow.
- *Put progress back*: restores unlocks, stars, tries and the selected level exactly as they were right before the last reset or unlock all. Both of those save a snapshot first. One level of undo, and the button is disabled when there is no snapshot.

**Release build.** `.github/workflows/build.yml` runs on every push to `main` (except pushes that only touch `max` or Markdown files, none of which go into the release) and on manual runs:

1. `bash tools/build-release.sh dist/release` copies `index.html`, `css/` and `js/` and nothing else (no `README.md`, `max`, `tools/`, `.github/` or `.git`), deletes `js/dev.js` and `js/dev-config.js`, removes the `<!-- dev-only -->` lines from `index.html`, and stamps `<meta name="shkr-build" content="dev">` as `release · <short-sha> · <UTC date>`. Its guard then fails the build if the output still contains `dev.js`, `dev-config.js`, `dev-only`, `shadowskirr.dev`, the developer section's ids or text, or any definition of `SHKR_DEV` / `SHKR_DEV_INIT`; if `index.html` loads a file that is missing; or if the release holds a file that `index.html` does not load.
2. `node tools/parity-check.js . dist/release` checks that the release holds only `index.html`, `css/` and `js/`, and that every shared file is byte-identical (`index.html` may differ only by the removed dev-only lines and the stamp), then loads `sim.js`, `levels.js`, `fixes.js` and `demo.js` from both trees in separate `vm` contexts. Every level and the home chart must compile identically, each level's solver solution must replay to the same final state, a seeded run that dies part-way must match on every tick, and the attract-mode demo (`DEMO_SOL`) must replay identically. It prints a table and names the first differing field on failure.
3. Only if both pass: zip `dist/release` with `index.html` at the root, upload it as the `shadow-skirr-release` artifact, and replace the rolling `latest` release (tag, title "Shadow Skirr — latest build", commit SHA, date and message in the notes). A manual run on another branch builds, checks and uploads the artifact but leaves `latest` alone.

The gate cannot be skipped: there is no flag for it, and it runs in the same job as the zip.

To build and check locally:

```sh
bash tools/build-release.sh /tmp/shadow-skirr
node tools/parity-check.js . /tmp/shadow-skirr
```

**The dev-only marker rule.** Anything that exists only for the developer build must be removable by the build:

- A whole developer file goes in `js/` and is deleted by `tools/build-release.sh` (add it there and to `DEV_FILES` in `tools/parity-check.js`).
- Anything else the game needs at runtime must be loaded by `index.html`, because the release keeps only `index.html` and the files it loads. A file in `css/` or `js/` that `index.html` doesn't load fails the build.
- Any line of `index.html` that only the developer build should have ends with `<!-- dev-only -->` on the same line, like the two dev `<script>` tags.
- Shared code (`js/*.js` other than the dev files, `css/style.css`) must not contain developer code. `js/game.js` only reads the optional `window.SHKR_DEV.saveKey` and calls `window.SHKR_DEV_INIT` if it exists, which does nothing in the release.

## Development notes

- **Script load order matters.** The JS files are classic scripts that share top-level globals (`SIM`, `HAZ`, `LEVELS`, `HOME`, `FIXES`, `DEMO_SOL`, `MUSIC`, `BACKDROPS`, `RENDER`). They must load in this order, at the end of `<body>`, without `defer`, `async` or `type="module"`:
  `dev-config.js` → `sim.js` → `levels.js` → `fixes.js` → `demo.js` → `music.js` → `backdrops.js` → `render.js` → `game.js` → `dev.js`
  `dev-config.js` comes first so `game.js` sees the developer save key, and `dev.js` comes last. Both are stripped from the release, which loads `sim.js` through `game.js` only.
- **Don't convert to ES modules** unless you also refactor the shared globals and serve the game from a local server. Modules don't share a global scope and don't load from `file://`.
- **Save data** lives under the `localStorage` key `shadowskirr.v1` in the release and `shadowskirr.dev.v1` in the developer build. Saves from the old `lumbra.v1` key are migrated automatically on load, for the real key only.
- **Debug handle:** `window.__SHADOWSKIRR` exposes `G` (game state), `S()` (saved state), `startLevel(n)`, `keys` (input state), `getL(n)` (compiled level), `N` (level count), `saveState()`, `paintHome(retitle)`, `paintLevels()`, `startHome()`, `show(screen)`, `showCard({...})`, `hideCard()` and `setS(obj)`, which replaces the saved state through the same validation as loading. `window.__LUMBRA` is kept as a legacy alias for old scripts.
- **Fonts** (Space Grotesk, JetBrains Mono) load from Google Fonts. Offline, the page falls back to system fonts.

## Credits

A game by hiyroscript.
