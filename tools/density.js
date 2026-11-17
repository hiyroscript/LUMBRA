#!/usr/bin/env node
/* =============================================================================
   tools/density.js [levels] [--check]

   How busy each chart is, read straight from the chart (no solver, instant).
   Built-in Node modules only. Also used as a module by tools/check-levels.js.

     node tools/density.js            all levels
     node tools/density.js 7          one level
     node tools/density.js 10-20      a range
     node tools/density.js --check    exit 1 if a level is outside its band

   Columns (each chart char is half a beat):
     obst/bar  obstacle chars per bar: non-"." chars in the terrain row, over
               every bar of the level (intro and outro included)
     median    median gap in beats between consecutive busy cells after the
               2-bar intro. A cell is busy when its terrain char is not "." or
               its overlay holds a hazard object (Bloom, Halo, Prism key or
               gate, Rift, Comet, Mimic eye or beam, Thermal rock or block,
               Rail blade, Glass, Coil, Fade or Flicker tile); zone edges do
               not count
     longest   the longest such gap, in beats
     2nd       the second longest (levels 21-30 may spend the longest on one
               breather bar before the climax)
     empty     share of bars after the intro with no busy cell

   Bands (README, Difficulty):
     levels  1-9   2.0-2.5 obstacle chars per bar, longest gap <= 4 beats
     levels 10-20  2.5-3.5,                         longest gap <= 3 beats
     levels 21-30  3.5-4.5,                         longest gap <= 2 beats,
                   except one breather (at most 5 beats) before the climax
   ========================================================================== */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const HAZ_OVERLAY = "BOKGRCEenmxXS12F";
function band(n) {
  return n <= 9 ? { lo: 2.0, hi: 2.5, gap: 4, breather: 0 } : n <= 20 ? { lo: 2.5, hi: 3.5, gap: 3, breather: 0 } : { lo: 3.5, hi: 4.5, gap: 2, breather: 5 };
}

function measure(SIM, def) {
  const ex = SIM.expand(def), T = ex.T, H = ex.H, n = T.length, bars = n / 8;
  let obst = 0;
  for (let i = 0; i < n; i++) if (T[i] !== ".") obst++;
  const busy = [];
  for (let i = 16; i < n; i++) if (T[i] !== "." || HAZ_OVERLAY.indexOf(H[i]) >= 0) busy.push(i);
  const gaps = [], at = [];
  for (let i = 1; i < busy.length; i++) { gaps.push((busy[i] - busy[i - 1]) / 2); at.push(busy[i - 1]); }
  const sorted = gaps.slice().sort(function (a, b) { return a - b; });
  const desc = gaps.slice().sort(function (a, b) { return b - a; });
  let empty = 0;
  for (let b = 2; b < bars; b++) {
    let any = false;
    for (let i = b * 8; i < b * 8 + 8; i++) if (T[i] !== "." || HAZ_OVERLAY.indexOf(H[i]) >= 0) { any = true; break; }
    if (!any) empty++;
  }
  const where = function (g) { const i = gaps.indexOf(g); return i < 0 ? "" : " (from bar " + Math.floor(at[i] / 8) + " char " + at[i] % 8 + ")"; };
  const r = { n: def.n, name: def.name, bars: bars, perBar: obst / bars, median: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0,
    longest: desc[0] || 0, second: desc[1] || 0, empty: empty / (bars - 2) };
  const b = band(def.n), fails = [];
  if (r.perBar < b.lo - 1e-9 || r.perBar > b.hi + 1e-9) fails.push("obstacle chars per bar " + r.perBar.toFixed(2) + " outside " + b.lo + "-" + b.hi);
  if (b.breather) {
    if (r.longest > b.breather) fails.push("longest gap " + r.longest + " beats" + where(r.longest) + " (one breather may be up to " + b.breather + ")");
    if (r.second > b.gap) fails.push("second longest gap " + r.second + " beats (max " + b.gap + ")");
  } else if (r.longest > b.gap) fails.push("longest gap " + r.longest + " beats" + where(r.longest) + " (max " + b.gap + ")");
  r.fails = fails;
  return r;
}

function load(root) {
  const ctx = vm.createContext({});
  ["js/sim.js", "js/levels.js"].forEach(function (f) { new vm.Script(fs.readFileSync(path.join(root, f), "utf8"), { filename: f }).runInContext(ctx); });
  return vm.runInContext("({ SIM: SIM, LEVELS: LEVELS })", ctx);
}

module.exports = { measure: measure, band: band, load: load };

if (require.main === module) {
  const args = process.argv.slice(2), root = path.resolve(__dirname, "..");
  let sel = null, check = false;
  args.forEach(function (a) { if (a === "--check") check = true; else { const m = /^(\d+)(?:-(\d+))?$/.exec(a); if (m) sel = [+m[1], +(m[2] || m[1])]; } });
  const api = load(root), N = api.LEVELS.length, lo = sel ? sel[0] : 1, hi = sel ? sel[1] : N;
  const head = ["lv", "name", "bars", "obst/bar", "band", "median", "longest", "2nd", "max", "empty", "ok"], tab = [head];
  let bad = 0;
  for (let n = lo; n <= hi; n++) {
    const r = measure(api.SIM, api.LEVELS[n - 1]), b = band(n);
    if (r.fails.length) bad++;
    tab.push([String(n), r.name, String(r.bars), r.perBar.toFixed(2), b.lo.toFixed(1) + "-" + b.hi.toFixed(1), r.median.toFixed(1), r.longest.toFixed(1),
      r.second.toFixed(1), b.breather ? b.gap + " (+" + b.breather + ")" : String(b.gap), Math.round(r.empty * 100) + " %", r.fails.length ? "NO" : "ok"]);
  }
  const w = head.map(function (_, c) { return Math.max.apply(null, tab.map(function (r) { return r[c].length; })); });
  tab.forEach(function (r, i) {
    console.log(r.map(function (c, j) { return j === 1 ? c + " ".repeat(w[j] - c.length) : " ".repeat(w[j] - c.length) + c; }).join("  "));
    if (i === 0) console.log(w.map(function (x) { return "-".repeat(x); }).join("  "));
  });
  for (let n = lo; n <= hi; n++) measure(api.SIM, api.LEVELS[n - 1]).fails.forEach(function (f) { console.log("  L" + n + " " + f); });
  if (check && bad) { console.log("\ndensity: " + bad + " level" + (bad > 1 ? "s" : "") + " outside the band"); process.exit(1); }
}
