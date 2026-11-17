/* ---- render.js ---- */
/* ============================================================================
   RENDER — "fog silhouette": a pale misty sky, five layers of grey
   silhouettes that fade with distance, pure black terrain with rough cliff
   faces and foliage, a solid black stickman, and colour only where a hazard
   lives. Hazards are drawn last-but-player, on top of every fog layer.
   ========================================================================== */
const RENDER = (function () {
  "use strict";
  const TAU = Math.PI * 2, CH = SIM.CH;
  const COL = {}; HAZ.forEach(function (h) { COL[h.k] = h.col; }); COL["2"] = COL["1"]; COL.em = COL.ey; COL.ga = COL.ke;
  const SPK = { thorn: "thorn", antenna: "mast", post: "mast", cog: "tri", fence: "tri", cactus: "cactus", ice: "shard", stake: "tri", crystal: "shard",
    rebar: "mast", coral: "coral", rock: "shard", cone: "cone", bone: "bone", flame: "flame", candle: "flame", quill: "thorn", insul: "mast", pot: "cone", spear: "tri" };
  const BAR = { trunk: "pillar", lintel: "pillar", pipe: "pipe", chain: "chain", hook: "chain", piston: "piston", cloth: "cloth", stal: "stal", vine: "stal", beam: "beam" };
  const AMB = { leaves: [0, -1.2, .7, 1], petals: [0, -.8, .5, 1], confetti: [0, -.3, .9, 1], paper: [0, -.5, .35, 1.6], dust: [1, -.25, .05, .5], ash: [1, -.3, .3, .6],
    stars: [1, 0, 0, .5], embers: [1, -.2, -.7, .6], sparks: [1, -.6, -1.1, .5], snow: [1, -.5, .6, .7], rain: [2, -3, 9, 1], bubbles: [3, -.1, -.6, 1], steam: [3, -.2, -.5, 1.6], gulls: [4, -.9, 0, 1] };

  /* ---------------- fog palette ---------------- */
  const FOG = {
    sky: ["#EFEFEF", "#FBFBFB", "#FFFFFF"],                          /* top -> mid -> horizon */
    layers: ["#E2E2E2", "#CDCDCD", "#B2B2B2", "#8E8E8E", "#5E5E5E"], /* far -> near */
    mist: "rgba(255,255,255,0.55)",                                  /* fog band wash */
    ground: "#000000",
    rim: "rgba(255,255,255,0.22)"                                    /* light rim on black silhouettes */
  };
  /* per-level tint, render-only (never in LEVELS): a few RGB steps, < 8% saturation */
  const TINT = { cool: [-5, -1, 5], warm: [6, 1, -5], reef: [-7, 0, 6] };
  const MOOD = { 7: "cool", 9: "cool", 12: "cool", 13: "cool", 28: "cool", 11: "reef", 3: "warm", 6: "warm", 10: "warm", 20: "warm", 27: "warm" };
  const LAST = { sky: ["#B6B6B6", "#CFCFCF", "#E8E8E8"], layers: ["#F4F4F4", "#ABABAB", "#8E8E8E", "#6B6B6B", "#3E3E3E"], mist: "rgba(232,232,232,0.5)" };
  /* organic worlds get broad canopy trees (or their own big plant) on the nearest backdrop layer */
  const ORG = { 1: "canopy", 5: "canopy", 8: "canopy", 16: "canopy", 17: "canopy", 11: "kelp", 6: "palms" };
  /* backdrop layers far -> near: size, parallax factor, baseline lift (units), loop width (units), softness */
  const LAY = [{ s: .4, f: .05, up: 1.7, w: 100, soft: 1.5 }, { s: .5, f: .1, up: 1.15, w: 84, soft: 1 }, { s: .62, f: .18, up: .7, w: 66 },
    { s: .8, f: .26, up: .32, w: 54 }, { s: 1, f: .34, up: 0, w: 46 }];
  /* foliage family per ground style */
  const FOL = { grass: "tuft", tiles: "tuft", bricks: "tuft", snow: "snow", sand: "dry", roof: "ind", rivets: "ind", girder: "ind", train: "ind", hull: "ind",
    planks: "ind", rock: "peb", obsidian: "peb", checker: "cand", books: "cand" };
  const RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const hexRGB = function (h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgbHex = function (v) { return "#" + v.map(function (c) { c = Math.max(0, Math.min(255, Math.round(c))); return (c < 16 ? "0" : "") + c.toString(16); }).join(""); };
  const mixHex = function (a, b, t) { const x = hexRGB(a), y = hexRGB(b); return rgbHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); };
  function palette(n) {
    const base = n === 30 ? LAST : FOG, t = TINT[MOOD[n]] || [0, 0, 0];
    const tone = function (h) { const v = hexRGB(h), k = (v[0] + v[1] + v[2]) / 765; return rgbHex(v.map(function (c, i) { return c + t[i] * (.35 + .65 * k); })); };
    const m = base.mist.match(/[\d.]+/g).map(Number);
    return { sky: base.sky.map(tone), layers: base.layers.map(tone), mist: [m[0] + t[0], m[1] + t[1], m[2] + t[2]].map(function (c) { return Math.max(0, Math.min(255, c)); }).concat(m[3]) };
  }

  let cv, g, W = 0, H = 0, dpr = 1, sc = 32, px0 = 0, gy = 0, camX = 0, camY = 0, shake = 0, L = null, th = null, seed = 1, lvN = 1, pal = palette(1);
  let home = false, strips = [], stripKey = "", glows = {}, fx = [], amb = [], lastCamX = 0, si = 0, oi = 0, tNow = 0, pulse = 0, quality = 1;
  let skyCv = null, mistCv = null, wispCv = null, wisps = [], zLines = [];

  const hsh = function (n) { let x = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const X = function (wx) { return px0 + (wx - camX) * sc; };
  const Y = function (wy) { return gy - (wy - camY) * sc; };
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
  function glowSprite(col) {
    if (glows[col]) return glows[col];
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(col, .62)); gr.addColorStop(.45, rgba(col, .24)); gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (glows[col] = c);
  }
  function glow(col, x, y, r) { g.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); }

  function resize(canvas) {
    cv = canvas || cv; if (!cv) return;
    W = window.innerWidth; H = window.innerHeight;
    const mobile = Math.min(W, H) < 700;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2) * quality;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g = cv.getContext("2d", { alpha: false });
    sc = Math.max(W / 26, Math.min(W / 15, H / 14));
    const portrait = H > W;
    px0 = W * (home ? .2 : portrait ? .24 : .28); gy = H * (home ? (portrait ? .8 : .84) : portrait ? .66 : .72);
    stripKey = ""; if (th) buildStrips();
  }
  /* which generators feed each of the five layers */
  function layerGens(i) {
    const a = th[0], b = th[1], org = ORG[lvN], S = seed;
    switch (i) {
      case 0: return lvN === 30 ? [["ringsun", S * 7 + 1, 1, 1.5]] : [["hills", S * 3 + 2, 1, 1]].concat(org ? [["spire", S * 5 + 9, 1, 1]] : [], [[a, S * 7 + 1, 1.3, 1]]);
      case 1: return lvN === 30 ? [["shards", S * 11 + 3, 1.4, 1]] : org === "canopy" ? [[a, S * 7 + 4, 2, .9], ["canopy", S * 19 + 7, .65, .6]] : [[a, S * 7 + 4, 1, 1]];
      case 2: return [[b, S * 13 + 5, 1, 1]];
      case 3: return [[b, S * 17 + 11, 1.6, 1.15, 4]];
      default: return org ? [[org, S * 23 + 13, org === "canopy" ? 1.8 : 3, org === "canopy" ? 1 : 1.5, 9]] : [[b, S * 29 + 17, 2.6, 1.25, 15]];
    }
  }
  function buildStrips() {
    const key = "fog5|" + th[0] + th[1] + seed + "|" + lvN + "|" + W + "x" + H;
    if (key === stripKey) return; stripKey = key;
    const bs = sc > 50 ? 1 : 1.5, hpx = (gy + sc * 2.6) * bs;
    for (let i = 0; i < 5; i++) {
      const l = LAY[i], tone = pal.layers[i];
      strips[i] = BACKDROPS.strip({ gens: layerGens(i), widthU: l.w, hPx: hpx, groundPx: (gy - l.up * sc) * bs, u: sc * l.s * bs,
        tone: tone, dark: mixHex(tone, "#000000", .1), light: mixHex(tone, pal.sky[2], .45), mist: pal.mist, soft: l.soft || 0, minLine: i < 2 ? .05 : 0 });
    }
    strips.bs = bs;
    /* sky: vertical gradient + wide soft horizon glow, at half size and upscaled (gradients scale cleanly) */
    const sw = Math.max(8, Math.ceil(W / 2)), sh = Math.max(8, Math.ceil(H / 2));
    skyCv = document.createElement("canvas"); skyCv.width = sw; skyCv.height = sh;
    let c = skyCv.getContext("2d"), gr = c.createLinearGradient(0, 0, 0, sh);
    gr.addColorStop(0, pal.sky[0]); gr.addColorStop(.38, pal.sky[1]); gr.addColorStop(.6, pal.sky[2]); gr.addColorStop(1, pal.sky[2]);
    c.fillStyle = gr; c.fillRect(0, 0, sw, sh);
    c.save(); c.translate(sw / 2, sh * .6); c.scale(1, .42);
    gr = c.createRadialGradient(0, 0, 0, 0, 0, sw * .62); gr.addColorStop(0, rgba(pal.sky[2], .95)); gr.addColorStop(.55, rgba(pal.sky[2], .45)); gr.addColorStop(1, rgba(pal.sky[2], 0));
    c.fillStyle = gr; c.fillRect(-sw, -sh * 3, sw * 2, sh * 6); c.restore();
    /* mist band (drawn between layers) and soft wisp sprite */
    const mc = "rgba(" + pal.mist[0] + "," + pal.mist[1] + "," + pal.mist[2] + ",";
    mistCv = document.createElement("canvas"); mistCv.width = 2; mistCv.height = 64;
    c = mistCv.getContext("2d"); gr = c.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, mc + "0)"); gr.addColorStop(.62, mc + ".42)"); gr.addColorStop(1, mc + "0)");
    c.fillStyle = gr; c.fillRect(0, 0, 2, 64);
    wispCv = document.createElement("canvas"); wispCv.width = wispCv.height = 64;
    c = wispCv.getContext("2d"); gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, mc + "1)"); gr.addColorStop(.5, mc + ".55)"); gr.addColorStop(1, mc + "0)");
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  }
  function levelOf(theme) { for (let i = 0; i < LEVELS.length; i++) if (LEVELS[i].th === theme) return LEVELS[i].n; return 1; }
  /* render-only caches on a compiled level: exposed cliff faces and where foliage must stay away from hazards */
  function decorate(L) {
    if (L.deco) return; L.deco = true;
    const plain = L.segs.filter(function (q) { return !q.kind; });
    plain.forEach(function (q) { q.ln = q.rn = undefined; });
    for (let i = 0; i < plain.length; i++) for (let k = i + 1; k < plain.length; k++) {
      const a = plain[i], b = plain[k]; if (b.x0 > a.x1 + 1e-6) break;
      if (Math.abs(b.x0 - a.x1) > 1e-6) continue;
      /* neighbour edge, in the same orientation, or null where that side is open */
      if (!a.flip) a.rn = b.flip ? b.fb : b.top; else a.rn = b.flip ? 2 * b.fb + CH - b.top : null;
      if (!b.flip) b.ln = a.flip ? a.fb : a.top; else b.ln = a.flip ? 2 * a.fb + CH - a.top : null;
    }
    plain.forEach(function (q) { if (q.ln === undefined) q.ln = null; if (q.rn === undefined) q.rn = null; });
    const fm = new Uint8Array(Math.ceil((L.endX + 480) * 4)), mark = function (a, b) { for (let i = Math.max(0, Math.floor((a - .6 + 64) * 4)); i <= Math.ceil((b + .6 + 64) * 4) && i < fm.length; i++) fm[i] = 1; };
    L.objs.forEach(function (o) { mark(o.x0, o.x1); });
    L.segs.forEach(function (q) { if (q.kind) mark(q.x0, q.x1); });
    L.coils.forEach(function (c) { mark(c.x0, c.x1); });
    L.fm = fm;
  }
  function setLevel(level, theme, sd) {
    L = level; th = theme; seed = sd || 1; si = 0; oi = 0; fx.length = 0; camY = 0; lastCamX = 0;
    const n = levelOf(theme); if (n !== lvN || !strips.length) { lvN = n; pal = palette(n); }
    const zb = function (x) { for (const z of L.zones) if (z.k === "Z" && x >= z.x0 && x < z.x1) return z.base; return 0; };
    L.segs.forEach(function (s) { if (s.flip) s.fb = zb((s.x0 + s.x1) / 2); });
    L.objs.forEach(function (o) { if (o.flip) o.fb = zb(o.x); });
    L.rails.forEach(function (o) { if (o.flip) o.fb = zb(o.x0 + .1); });
    L.coils.forEach(function (o) { if (o.flip) o.fb = zb(o.x0 + .1); });
    decorate(L);
    /* props sit where the chart is quiet */
    L.props = [];
    for (let i = 2; i < L.cells - 2; i++) {
      let quiet = true; for (let k = -1; k <= 2; k++) if (L.T[i + k] !== "." || L.H[i + k] !== ".") quiet = false;
      if (quiet && hsh(i * 31 + seed) < .5) L.props.push({ x: i * 2 + 1 + hsh(i) * .6, y: L.baseAt(i * 2 + 1.3), v: hsh(i * 7 + 3), flip: false });
    }
    for (let x = -40; x < 0; x += 5) L.props.push({ x: x + hsh(x) * 2, y: 0, v: hsh(x * 3 + 1) });
    amb.length = 0; const A = AMB[th[5]] || AMB.dust;
    for (let i = 0; i < 44; i++) amb.push({ x: hsh(i * 3 + 1) * 1.2, y: hsh(i * 5 + 2), z: .4 + hsh(i * 7) * .9, p: hsh(i * 11) * TAU, a: A });
    wisps.length = 0;
    for (let i = 0; i < 4; i++) wisps.push({ x: hsh(i * 13 + seed) * 1.4 - .2, y: .4 + hsh(i * 17 + 2) * .38, w: 6 + hsh(i * 19) * 5, h: .8 + hsh(i * 23) * .8, a: .08 + hsh(i * 29) * .07, v: .006 + hsh(i * 31) * .01 });
    buildStrips();
  }

  /* ---------------- drawing helpers (unit space, y up) ---------------- */
  function at(x, y, flip, fb) {
    g.save();
    if (flip) { g.translate(X(x), Y(2 * fb + CH - y)); g.scale(sc, sc); } else { g.translate(X(x), Y(y)); g.scale(sc, -sc); }
  }
  /* black silhouette with a thin light rim just inside its edge; `base` hides the rim where the shape sits on the ground */
  function ink(base) {
    g.lineJoin = "round"; g.fillStyle = "#000"; g.fill();
    g.save(); g.clip(); g.lineWidth = .07; g.strokeStyle = FOG.rim; g.stroke();
    if (base) { g.fillStyle = "#000"; g.fillRect(-9, -1, 18, 1.07); }
    g.restore();
  }
  function poly(p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function wline(p, w) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.lineWidth = w || .05; g.strokeStyle = "rgba(255,255,255,.14)"; g.stroke(); }

  function spike(style, w, h, id) {
    const hw = w / 2 + .08, hh = h + .12, t = tNow;
    switch (SPK[style] || "tri") {
      case "thorn":
        for (let i = 0; i < 3; i++) { const x = (i - 1) * hw * .62, k = (i - 1) * .22; g.beginPath(); g.moveTo(x - hw * .34, 0); g.quadraticCurveTo(x - hw * .1 + k, hh * .6, x + k * 1.6, hh * (i === 1 ? 1 : .78)); g.quadraticCurveTo(x + hw * .2 + k, hh * .5, x + hw * .34, 0); g.closePath(); ink(1); }
        break;
      case "shard":
        poly([-hw, 0, -hw * .55, hh * .7, -hw * .2, hh * .45, .05, hh, hw * .35, hh * .5, hw * .7, hh * .78, hw, 0]); ink(1); wline([.05, hh * .92, -.05, .1], .04);
        break;
      case "mast":
        poly([-.1, 0, -.07, hh, .07, hh, .1, 0]); ink(1); poly([-hw, 0, -hw * .7, .16, hw * .7, .16, hw, 0]); ink(1);
        for (let i = 1; i <= 2; i++) { const y = hh * (.3 + i * .22), ww = hw * (1.1 - i * .3); poly([-ww, y - .04, ww, y - .04, ww, y + .04, -ww, y + .04]); ink(1); }
        g.beginPath(); g.arc(0, hh + .04, .11, 0, TAU); ink(1);
        break;
      case "cactus":
        g.beginPath(); g.roundRect(-.2, 0, .4, hh, .2); ink(1); g.beginPath(); g.roundRect(-hw, hh * .3, .22, hh * .45, .1); ink(1); g.beginPath(); g.roundRect(hw - .22, hh * .42, .22, hh * .4, .1); ink(1);
        poly([-hw + .1, hh * .3, -hw + .1, hh * .44, -.1, hh * .44, -.1, hh * .3]); g.fillStyle = "#000"; g.fill(); poly([hw - .1, hh * .42, hw - .1, hh * .56, .1, hh * .56, .1, hh * .42]); g.fill();
        wline([0, .15, 0, hh - .15], .03);
        break;
      case "bone":
        for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * hw, 0); g.quadraticCurveTo(d * hw * 1.1, hh * .8, d * .05, hh); g.quadraticCurveTo(d * hw * .5, hh * .6, d * hw * .45, 0); g.closePath(); ink(1); }
        break;
      case "coral":
        for (let i = -1; i <= 1; i++) { const x = i * hw * .62, top = hh * (i ? .72 : 1); g.beginPath(); g.roundRect(x - .11, 0, .22, top, .1); ink(1); g.beginPath(); g.arc(x, top, .16, 0, TAU); ink(1); }
        poly([-hw * .62, .1, hw * .62, .1, hw * .62, .3, -hw * .62, .3]); g.fillStyle = "#000"; g.fill();
        break;
      case "flame":
        for (let i = -1; i <= 1; i++) { const x = i * hw * .55, top = hh * (i ? .7 : 1) * (1 + .1 * Math.sin(t * 9 + i * 2 + id)), sw = .12 * Math.sin(t * 7 + i + id); g.beginPath(); g.moveTo(x - hw * .4, 0); g.bezierCurveTo(x - hw * .5, top * .5, x + sw - .05, top * .6, x + sw, top); g.bezierCurveTo(x + sw + .08, top * .6, x + hw * .5, top * .5, x + hw * .4, 0); g.closePath(); ink(1); }
        g.beginPath(); g.ellipse(0, hh * .25, hw * .25, hh * .2, 0, 0, TAU); g.fillStyle = "rgba(255,255,255,.18)"; g.fill();
        break;
      case "cone":
        poly([-hw, 0, 0, hh, hw, 0]); ink(1); for (let i = 1; i <= 2; i++) { const y = hh * i * .28, ww = hw * (1 - i * .28) * .82; wline([-ww, y, ww, y], .07); }
        break;
      default: {
        const n = Math.max(1, Math.round(w / .45));
        /* crisp teeth with slightly concave sides; tips exactly where they always were */
        for (let i = 0; i < n; i++) {
          const x0 = -hw + i * (2 * hw / n), x1 = x0 + 2 * hw / n, xm = (x0 + x1) / 2, tp = hh * (n > 1 && i % 2 ? .82 : 1), k = (x1 - x0) * .07;
          g.beginPath(); g.moveTo(x0, 0); g.quadraticCurveTo((x0 + xm) / 2 + k, tp * .45, xm, tp); g.quadraticCurveTo((xm + x1) / 2 - k, tp * .45, x1, 0); g.closePath(); ink(1);
        }
      }
    }
  }
  /* two chains of alternating oval / edge-on links, from y0 up to y1 (unit space) */
  function chains(xs, y0, y1) {
    g.beginPath();
    for (const cx of xs) for (let y = y0 - .04, k = 0; y < y1; y += .2, k++) {
      if (k % 2) { g.moveTo(cx + .06, y + .14); g.ellipse(cx, y + .14, .06, .14, 0, 0, TAU); }
      else g.rect(cx - .016, y, .032, .28);
    }
    g.lineWidth = .1; g.strokeStyle = FOG.rim; g.stroke();
    g.lineWidth = .045; g.strokeStyle = "#000"; g.stroke();
  }
  /* a few grass blades on top of a hanging slab (unit space, y up) */
  function slabGrass(hw, y, id) {
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      if (hsh(id * 13 + i) < .35) continue;
      const x = -hw + .12 + i * (2 * hw - .24) / 8, hb = .14 + hsh(id * 7 + i) * .22, ln = (hsh(id * 5 + i) - .5) * .14;
      g.moveTo(x - .03, y - .02); g.quadraticCurveTo(x + ln * .3, y + hb * .6, x + ln, y + hb); g.quadraticCurveTo(x + .01 + ln * .3, y + hb * .5, x + .03, y - .02);
    }
    g.fillStyle = "#000"; g.fill();
  }
  /* hanging bars: w = hitbox width, bh = hitbox height, up = art height for styles that rise as a column,
     lim = how far up chains need to go to leave the screen */
  function bar(style, w, up, id, bh, lim) {
    const hw = w / 2, t = tNow;
    bh = bh || up; lim = Math.max(bh, lim || up);
    switch (BAR[style] || "pillar") {
      case "pipe":
        poly([-hw * .7, 0, hw * .7, 0, hw * .7, up, -hw * .7, up]); ink(); poly([-hw, 0, hw, 0, hw, .3, -hw, .3]); ink();
        for (let y = 1.3; y < up; y += 1.6) wline([-hw * .7, y, hw * .7, y], .06); wline([-hw * .35, .5, -hw * .35, up], .04);
        break;
      case "chain":
        chains([-hw * .45, hw * .45], 1.3, Math.max(up, lim));
        g.beginPath(); g.roundRect(-hw, 0, w, 1.3, .16); ink(); wline([-hw * .6, .4, hw * .6, .4], .05); wline([-hw * .6, .85, hw * .6, .85], .05);
        break;
      case "piston": {
        const b = .1 * pulse;
        poly([-hw * .3, 1, hw * .3, 1, hw * .3, up, -hw * .3, up]); ink(); g.beginPath(); g.roundRect(-hw, -b, w, 1.15, .08); ink();
        for (let i = -2; i <= 2; i++) wline([i * hw * .38, .12 - b, i * hw * .38, .4 - b], .05); wline([-hw * .8, .75 - b, hw * .8, .75 - b], .05);
        break;
      }
      case "cloth": {
        g.beginPath(); g.moveTo(-hw, up); g.lineTo(-hw, .25);
        for (let i = 0; i <= 8; i++) g.lineTo(-hw + i * w / 8, .12 + (i % 2 ? .22 : 0) + .05 * Math.sin(t * 3 + i + id));
        g.lineTo(hw, up); g.closePath(); ink();
        for (let x = -hw + w / 6; x < hw; x += w / 3) wline([x, .6, x, up], .08);
        break;
      }
      case "stal":
        poly([-hw, up, -hw, 1.4, -hw * .7, .5, -hw * .4, 1.1, -.05, 0, hw * .3, .9, hw * .65, .35, hw, 1.5, hw, up]); ink(); wline([-.1, .5, -.2, up * .6], .035); wline([hw * .5, .9, hw * .6, up * .4], .035);
        break;
      default: {
        /* the reference's hanging platform: a black slab filling the hitbox, a row of teeth along its underside
           (tips on the hitbox floor, so they stay inside it), grass on top, hung from two chains */
        const beam = BAR[style] === "beam", n = Math.max(2, Math.round(w / .4)), tw = w / n, th0 = .45;
        chains([-hw * .55, hw * .55], bh, lim);
        g.beginPath(); g.moveTo(-hw, bh); g.lineTo(-hw, th0);
        for (let i = 0; i < n; i++) { const x0 = -hw + i * tw; g.lineTo(x0 + tw / 2, 0); g.lineTo(x0 + tw, th0); }
        g.lineTo(hw, bh); g.closePath(); ink();
        if (beam) { for (let y = th0 + .2; y < bh - 1; y += 1.5) { wline([-hw * .8, y, hw * .8, y + 1.3], .05); wline([hw * .8, y, -hw * .8, y + 1.3], .05); wline([-hw * .8, y, hw * .8, y], .05); } }
        else { for (let i = 0; i < 4; i++) { const x = -hw * .7 + i * hw * .47, y0 = .7 + hsh(id * 9 + i) * 1.5; wline([x, y0, x + .05, y0 + 1.2 + hsh(id + i) * 2], .04); } slabGrass(hw, bh, id); }
      }
    }
  }

  /* ---------------- ground ---------------- */
  function groundDetail(style, x0, x1, depth) {
    /* local space: x = world x, y = units below the top edge (positive down) */
    const a = Math.floor(x0), b = Math.ceil(x1);
    g.fillStyle = "#161616"; g.strokeStyle = "#161616"; g.lineWidth = .05;
    switch (style) {
      case "roof":
        g.fillRect(x0, .12, x1 - x0, .06);
        for (let x = a; x < b; x++) for (let r = 0; r < 5; r++) for (let k = 0; k < 2; k++) { const wx = x + .14 + k * .5; if (wx > x0 + .15 && wx < x1 - .5 && hsh(x * 131 + r * 17 + k) < .62) g.fillRect(wx, .6 + r * .95, .28, .5); }
        break;
      case "planks":
        g.fillRect(x0, .28, x1 - x0, .05); for (let x = a; x < b; x++) if (x > x0 && x < x1) g.fillRect(x, .33, .04, .9 + hsh(x) * .5);
        break;
      case "rivets":
        g.fillRect(x0, .5, x1 - x0, .05); for (let x = a; x < b; x += .5) if (x > x0 + .1 && x < x1 - .1) { g.beginPath(); g.arc(x + .12, .25, .06, 0, TAU); g.fill(); }
        break;
      case "bricks":
        for (let r = 0; r < 4; r++) { g.fillRect(x0, .45 + r * .5, x1 - x0, .04); for (let x = a; x < b; x++) { const wx = x + (r % 2 ? .5 : 0); if (wx > x0 + .05 && wx < x1 - .05) g.fillRect(wx, .45 + r * .5 - .5, .04, .5); } }
        break;
      case "snow":
        g.beginPath(); g.moveTo(x0, .1); g.lineTo(x1, .1); for (let x = x1; x >= x0; x -= .25) g.lineTo(x, .3 + .14 * Math.sin(x * 3.1) + .1 * hsh(Math.round(x * 4))); g.closePath(); g.fill();
        break;
      case "sand":
        for (let x = a; x < b; x += .25) { const wx = x + hsh(x * 40) * .2, d = .15 + hsh(x * 91 + 1) * 1.4; if (wx > x0 && wx < x1) g.fillRect(wx, d, .05, .05); }
        break;
      case "rock": case "obsidian":
        for (let x = a; x < b; x++) { const wx = x + hsh(x * 3) * .7, d = .2 + hsh(x * 5) * .6; if (wx > x0 + .2 && wx < x1 - .6) { g.beginPath(); g.moveTo(wx, d); g.lineTo(wx + .3, d + .35); g.lineTo(wx + .2, d + .8); g.stroke(); } }
        break;
      case "tiles":
        for (let x = a; x < b; x += .5) if (x > x0 - .01 && x < x1 - .4) { g.beginPath(); g.arc(x + .25, .12, .25, 0, Math.PI); g.stroke(); }
        g.fillRect(x0, .55, x1 - x0, .04);
        break;
      case "checker":
        for (let x = a; x < b; x += .5) for (let r = 0; r < 2; r++) if (((x * 2 + r) & 1) === 0 && x > x0 - .01 && x < x1 - .49) g.fillRect(x + .03, .12 + r * .5, .44, .44);
        break;
      case "books":
        for (let x = a; x < b; x += .25) { const wx = x + hsh(x * 13) * .1; if (wx > x0 + .05 && wx < x1 - .1) g.fillRect(wx, .15, .03, .55 + hsh(x * 7) * .45); } g.fillRect(x0, 1.25, x1 - x0, .05);
        break;
      case "girder":
        g.fillRect(x0, .16, x1 - x0, .05); g.fillRect(x0, .95, x1 - x0, .05);
        for (let x = a; x < b; x++) if (x > x0 - .01 && x < x1 - .9) { g.beginPath(); g.moveTo(x, .95); g.lineTo(x + .5, .2); g.lineTo(x + 1, .95); g.stroke(); }
        break;
      case "train":
        g.fillRect(x0, .2, x1 - x0, .05); g.fillRect(x0, 1.3, x1 - x0, .05);
        for (let x = a; x < b; x += 2) if (x > x0 + .3 && x < x1 - .8) { g.beginPath(); g.arc(x + .5, 1.9, .34, 0, TAU); g.stroke(); g.beginPath(); g.arc(x + .5, 1.9, .08, 0, TAU); g.fill(); }
        for (let x = a; x < b; x++) if (x > x0 && x < x1 - .1 && x % 2) g.fillRect(x, .25, .04, 1.05);
        break;
      case "hull":
        g.fillRect(x0, .3, x1 - x0, .05); for (let x = a; x < b; x++) if (x > x0 + .2 && x < x1 - .6) { if (x % 3 === 0) { g.beginPath(); g.arc(x + .4, .95, .22, 0, TAU); g.stroke(); } else { g.beginPath(); g.arc(x + .4, .15, .05, 0, TAU); g.fill(); } }
        break;
      default: break;
    }
  }
  /* ---------------- terrain silhouette ---------------- */
  /* jagged points down (or up) an exposed cliff face, only ever notched inward, stable per block */
  function jag(out, x, y0, y1, inw, sd) {
    const st = .25 * sc, sg = y1 > y0 ? 1 : -1, n = Math.floor(Math.abs(y1 - y0) / st), lim = sg > 0 ? H + 60 : -60;
    for (let k = 1; k < n; k++) { const y = y0 + sg * k * st; if (sg > 0 ? y > lim : y < lim) break; out.push(x + inw * hsh(sd * 131 + k) * .12 * sc, y); }
    return out;
  }
  /* body of one ground segment as a path; dn = 1 grows down from its edge (floor), -1 grows up (Zenith ceiling).
     Returns the rim polyline (exposed faces + edge). */
  function segPath(q, xa, xb, ye, yFar, dn, edgeW) {
    const exp = function (n) { if (n === null) return dn > 0 ? H + 60 : -60; const yn = Y(n); return dn > 0 ? (n < edgeW ? Math.min(yn, H + 60) : ye) : (n > edgeW ? Math.max(yn, -60) : ye); };
    const lE = exp(q.ln), rE = exp(q.rn);
    const R = jag([], xb, ye, rE, -1, Math.round(q.x1 * 8) + 7), Lp = jag([], xa, ye, lE, 1, Math.round(q.x0 * 8));
    g.beginPath(); g.moveTo(xa, ye); g.lineTo(xb, ye);
    for (let i = 0; i < R.length; i += 2) g.lineTo(R[i], R[i + 1]);
    g.lineTo(xb, rE); g.lineTo(xb, yFar); g.lineTo(xa, yFar); g.lineTo(xa, lE);
    for (let i = Lp.length - 2; i >= 0; i -= 2) g.lineTo(Lp[i], Lp[i + 1]);
    g.closePath();
    const rim = [xa, lE]; for (let i = Lp.length - 2; i >= 0; i -= 2) rim.push(Lp[i], Lp[i + 1]);
    rim.push(xa, ye, xb, ye); for (let i = 0; i < R.length; i += 2) rim.push(R[i], R[i + 1]); rim.push(xb, rE);
    return rim;
  }
  /* foliage silhouettes along a top edge, added to the current path (screen px). s = 1 grows up, -1 hangs down */
  function foliage(kind, q, left, right, ye, s) {
    const st = .3, a = Math.max(q.x0 + .14, left), b = Math.min(q.x1 - .14, right), fm = L.fm, u = sc;
    const sway = RM ? 0 : 1;
    for (let wx = Math.ceil(a / st) * st; wx < b; wx += st) {
      if (fm[Math.floor((wx + 64) * 4)]) continue;
      const i = Math.round(wx / st), h = hsh(i * 7 + 13), h2 = hsh(i * 11 + 5), px = X(wx + (hsh(i * 3 + 1) - .5) * .2), y = ye + s;
      switch (kind) {
        case "tuft": case "dry": case "snow": {
          if (kind === "snow" && h < .3) { const r = (.07 + h2 * .09) * u; g.moveTo(px - r, y); g.quadraticCurveTo(px - r, y - s * r * 1.3, px, y - s * r * 1.3); g.quadraticCurveTo(px + r, y - s * r * 1.3, px + r, y); break; }
          const dens = kind === "tuft" ? .52 : kind === "dry" ? .2 : .42;
          if (h < dens) {
            const n = kind === "dry" ? 2 + Math.floor(h2 * 2) : 3 + Math.floor(h2 * 5), H0 = (kind === "snow" ? .1 + h2 * .14 : .15 + hsh(i * 5) * .3) * u, bw = (kind === "dry" ? .018 : .03) * u;
            for (let j = 0; j < n; j++) {
              const c = j - (n - 1) / 2, bx = px + c * .04 * u, bh = H0 * (.55 + .45 * hsh(i * 13 + j)) * (kind === "dry" ? 1.2 : 1);
              const ln = (c * (kind === "dry" ? .13 : .06) + (hsh(i * 17 + j) - .5) * .1 + sway * .025 * Math.sin(tNow * 2 + wx + j)) * u;
              g.moveTo(bx - bw, y); g.quadraticCurveTo(bx - bw * .3 + ln * .2, y - s * bh * .6, bx + ln, y - s * bh); g.quadraticCurveTo(bx + bw * .3 + ln * .2, y - s * bh * .55, bx + bw, y);
            }
          } else if (kind === "tuft" && h < .56) {
            /* fern: arched stem with leaflet pairs */
            const len = (.3 + h2 * .14) * u, dir = h2 < .5 ? -1 : 1, sx = dir * len * .45;
            g.moveTo(px - .015 * u, y); g.quadraticCurveTo(px + sx * .2, y - s * len * .7, px + sx, y - s * len); g.quadraticCurveTo(px + sx * .2 + .02 * u, y - s * len * .65, px + .015 * u, y);
            for (let k = 1; k <= 4; k++) {
              const t = k / 5, cx = px + sx * t * t, cy = y - s * len * t, lw = (.12 - k * .018) * u;
              for (const d of [-1, 1]) { g.moveTo(cx, cy); g.quadraticCurveTo(cx + d * lw * .5, cy - s * lw * .55, cx + d * lw, cy - s * lw * .2); g.quadraticCurveTo(cx + d * lw * .5, cy - s * lw * .05, cx, cy); }
            }
          } else if (kind === "tuft" && h < .6) {
            /* broad leaves */
            for (const d of [-1, 1]) { const l = (.24 + h2 * .14) * u; g.moveTo(px, y); g.quadraticCurveTo(px + d * l * .2, y - s * l * .9, px + d * l, y - s * l * .7); g.quadraticCurveTo(px + d * l * .5, y - s * l * .15, px, y); }
          } else if (kind !== "dry" && h < .66) {
            /* sprout */
            const l = (.16 + h2 * .08) * u; g.moveTo(px - .012 * u, y); g.lineTo(px - .012 * u, y - s * l); g.lineTo(px + .012 * u, y - s * l); g.lineTo(px + .012 * u, y);
            for (const d of [-1, 1]) { g.moveTo(px, y - s * l); g.quadraticCurveTo(px + d * .05 * u, y - s * (l + .09 * u), px + d * .11 * u, y - s * (l + .03 * u)); g.quadraticCurveTo(px + d * .05 * u, y - s * (l - .02 * u), px, y - s * l); }
          }
          break;
        }
        case "ind": {
          if (h < .1) { const r = .06 * u; g.moveTo(px - r, y); g.quadraticCurveTo(px, y - s * r * 2, px + r, y); }
          else if (h < .15) { g.rect(px - .15 * u, y, .3 * u, -s * .14 * u); g.rect(px - .1 * u, y - s * .14 * u, .2 * u, -s * .04 * u); }
          else if (h < .19) { g.rect(px - .08 * u, y, .16 * u, -s * .32 * u); g.rect(px - .11 * u, y - s * .32 * u, .22 * u, -s * .06 * u); }
          else if (h < .23) { const r = .14 * u; g.moveTo(px - r, y); g.quadraticCurveTo(px - r, y - s * r * .9, px, y - s * r * .9); g.quadraticCurveTo(px + r, y - s * r * .9, px + r, y); }
          break;
        }
        case "peb": {
          if (h < .26) { const r = (.06 + h2 * .1) * u; g.moveTo(px - r, y); g.quadraticCurveTo(px - r * .8, y - s * r * 1.2, px + r * .1, y - s * r * 1.1); g.quadraticCurveTo(px + r, y - s * r * .9, px + r, y); }
          else if (h < .3) { const r = .07 * u; g.moveTo(px - r, y); g.lineTo(px - r * .4, y - s * .2 * u); g.lineTo(px + r * .2, y - s * .13 * u); g.lineTo(px + r, y); }
          break;
        }
        case "cand": {
          if (h < .1) { g.rect(px - .035 * u, y, .07 * u, -s * .2 * u); g.moveTo(px, y - s * .22 * u); g.quadraticCurveTo(px + .04 * u, y - s * .27 * u, px, y - s * .34 * u); g.quadraticCurveTo(px - .04 * u, y - s * .27 * u, px, y - s * .22 * u); }
          else if (h < .2) { g.rect(px - .13 * u, y, .26 * u, -s * .035 * u); }
          break;
        }
      }
    }
  }
  /* props: silhouettes on quiet ground; origin on the surface, y up */
  function sign(v) {
    g.fillStyle = "#000"; g.fillRect(-.05, 0, .1, .95);
    g.save(); g.translate(0, .72); g.rotate(-.12 + v * .1); poly([-.26, -.09, .2, -.09, .3, 0, .2, .09, -.26, .09]); g.fill(); g.restore();
    if (v > .4) { g.save(); g.translate(0, .48); g.rotate(.16); poly([.24, -.08, -.18, -.08, -.27, 0, -.18, .08, .24, .08]); g.fill(); g.restore(); }
  }
  function bush(v, s) {
    g.beginPath(); const n = 4 + Math.floor(v * 3);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1) - .5) * .7 * s, r = (.16 + hsh(i * 9 + v * 99) * .12) * s, y = r * .6 + (1 - Math.abs(x) / (.5 * s)) * .1 * s; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    g.rect(-.38 * s, 0, .76 * s, .12 * s); g.fillStyle = "#000"; g.fill();
  }
  function fern(v) {
    g.beginPath();
    for (let f = -2; f <= 2; f++) {
      const a = Math.PI / 2 + f * .38 + (v - .5) * .2, l = .55 - Math.abs(f) * .08, ex = Math.cos(a) * l, ey = Math.sin(a) * l;
      g.moveTo(-.02, 0); g.quadraticCurveTo(ex * .4 - .03, ey * .8, ex, ey); g.quadraticCurveTo(ex * .4 + .03, ey * .7, .02, 0);
      for (let k = 1; k <= 3; k++) { const t = k / 4, cx = ex * t, cy = ey * t * (1.1 - t * .2), lw = .09 - k * .015; for (const d of [-1, 1]) { g.moveTo(cx, cy); g.quadraticCurveTo(cx + d * lw * .6 - ex * .05, cy + lw * .6, cx + d * lw, cy + lw * .2); g.closePath(); } }
    }
    g.fillStyle = "#000"; g.fill();
  }
  function rock(v) { poly([-.5, 0, -.36, .24 + v * .2, -.05, .38 + v * .22, .3, .3 + v * .1, .5, 0]); g.fillStyle = "#000"; g.fill(); }
  function mush(v) {
    g.fillStyle = "#000"; g.fillRect(-.05, 0, .1, .26);
    g.beginPath(); g.moveTo(-.2, .24); g.quadraticCurveTo(-.18, .44, 0, .45); g.quadraticCurveTo(.18, .44, .2, .24); g.closePath(); g.fill();
    if (v > .5) { g.fillRect(.22, 0, .06, .14); g.beginPath(); g.moveTo(.15, .13); g.quadraticCurveTo(.25, .26, .35, .13); g.closePath(); g.fill(); }
  }
  function lantern() {
    g.fillStyle = "#000"; g.fillRect(-.035, 0, .07, 1.3); g.fillRect(-.035, 1.24, .32, .06);
    g.beginPath(); g.roundRect(.13, .86, .2, .3, .05); g.fill(); g.fillRect(.21, 1.16, .04, .1);
    g.fillStyle = FOG.rim; g.fillRect(.18, .92, .1, .17);
  }
  function crate(v) { g.fillStyle = "#000"; g.fillRect(-.3, 0, .6, .52); if (v > .5) g.fillRect(-.1, .52, .38, .3); wline([-.3, 0, .3, .52], .04); wline([-.3, .52, .3, 0], .04); }
  function barrel() { g.fillStyle = "#000"; g.beginPath(); g.roundRect(-.2, 0, .4, .55, .08); g.fill(); wline([-.2, .14, .2, .14], .035); wline([-.2, .41, .2, .41], .035); }
  function prop(style, v, id) {
    const k = Math.floor(v * 5);
    switch (style) {
      case "grass": return [sign, bush, fern, rock, mush][k](v, 1);
      case "snow": return [sign, rock, bush, rock, sign][k](v, .8);
      case "sand": return [sign, rock, bush, rock, rock][k](v, .7);
      case "rock": case "obsidian": return [rock, mush, rock, mush, rock][k](v);
      case "bricks": case "tiles": return [lantern, bush, fern, lantern, bush][k](v, .8);
      case "checker": case "books": return [lantern, crate, lantern, crate, lantern][k](v);
      case "planks": case "hull": return [barrel, crate, lantern, barrel, crate][k](v);
      case "roof": case "rivets": case "girder": case "train": return [crate, barrel, lantern, crate, barrel][k](v);
      default: return;
    }
  }

  /* ---------------- the stickman ---------------- */
  function ik(ax, ay, bx, by, l1, l2, dir) {
    let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy); const m = l1 + l2 - .002;
    if (d > m) { dx *= m / d; dy *= m / d; d = m; } if (d < .02) d = .02;
    const a = Math.atan2(dy, dx), co = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), k = Math.acos(Math.max(-1, Math.min(1, co))) * dir;
    return [ax, ay, ax + Math.cos(a + k) * l1, ay + Math.sin(a + k) * l1, ax + dx, ay + dy];
  }
  function stick(V) {
    const s = V.s, t = tNow, ph = V.beat * TAU;
    let hip, neck, head, f1, f2, h1, h2, rot = 0, kd = 1, ed = -1;
    if (s.hang >= 0) {
      const sw = .1 * Math.sin(t * 5), tuck = s.h < 1;
      hip = [sw, tuck ? 1.0 : .82]; neck = [sw * .4, 1.36]; head = [sw * .3 + .02, 1.52];
      f1 = tuck ? [sw + .28, .98] : [sw * 1.8 - .06, .04]; f2 = tuck ? [sw + .2, 1.06] : [sw * 1.8 + .1, .1];
      h1 = [-.07, 1.78]; h2 = [.09, 1.78]; ed = 1;
    } else if (s.sl && s.gr) {
      hip = [-.12, .27]; neck = [-.5, .52]; head = [-.62, .62];
      f1 = [.56, .07]; f2 = [.3, .08]; h1 = [-.82, .1 + .03 * Math.sin(t * 30)]; h2 = [-.12, .5]; kd = 1;
    } else if (!s.gr) {
      const up = Math.max(-1, Math.min(1, s.vy / 9));
      hip = [0, .9]; neck = [.12, 1.44]; head = [.18, 1.66];
      if (s.gl > 0) { rot = -1.25; f1 = [-.1, .08]; f2 = [.08, .14]; h1 = [.4, 1.85]; h2 = [.22, 1.9]; }
      else if (s.dive) { rot = -.75; f1 = [-.14, .12]; f2 = [.06, .2]; h1 = [.5, 1.1]; h2 = [.42, 1.3]; }
      else if (up > 0) { f1 = [-.16, .3 + .12 * up]; f2 = [.24, .42 + .14 * up]; h1 = [.42, 1.62 + .1 * up]; h2 = [-.24, 1.56]; rot = -.08; }
      else { f1 = [-.22, .06]; f2 = [.14, .14]; h1 = [.4, 1.7 - .2 * up]; h2 = [-.34, 1.66 - .2 * up]; rot = .06; }
      if (V.thermal) { f1 = [-.18, .1 + .05 * Math.sin(t * 6)]; f2 = [.12, .16 + .05 * Math.cos(t * 6)]; h1 = [.55, 1.42]; h2 = [-.5, 1.4]; rot = 0; }
    } else {
      const b = .045 * Math.abs(Math.sin(ph));
      hip = [-.02, .84 + b]; neck = [.16, 1.38 + b]; head = [.24, 1.6 + b];
      const ft = function (a) { return [-.4 * Math.cos(a), .04 + .3 * Math.max(0, Math.sin(a))]; };
      f1 = ft(ph); f2 = ft(ph + Math.PI);
      h1 = [neck[0] + .33 * Math.cos(ph), neck[1] - .36 + .12 * Math.abs(Math.cos(ph))]; h2 = [neck[0] - .33 * Math.cos(ph), neck[1] - .36 + .12 * Math.abs(Math.cos(ph))];
    }
    const sq = V.squash || 0, st = !s.gr && s.hang < 0 ? Math.min(.12, Math.abs(s.vy) * .007) : 0;
    g.scale(1 + sq * .2 - st * .5, 1 - sq * .26 + st);
    if (rot) { g.translate(hip[0], hip[1]); g.rotate(rot); g.translate(-hip[0], -hip[1]); }
    const sh = [neck[0] - .01, neck[1] - .05];
    const segs = [ik(sh[0], sh[1], h2[0], h2[1], .3, .3, ed), ik(hip[0], hip[1], f2[0], f2[1], .44, .44, kd), [hip[0], hip[1], neck[0], neck[1]],
      ik(hip[0], hip[1], f1[0], f1[1], .44, .44, kd), ik(sh[0], sh[1], h1[0], h1[1], .3, .3, ed)];
    /* solid black silhouette: thicker limbs, a slightly larger head, a 1px light rim on the head only */
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = g.fillStyle = "#000";
    for (let i = 0; i < segs.length; i++) {
      const p = segs[i]; g.beginPath(); g.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]);
      g.lineWidth = i === 2 ? .172 : .132; g.stroke();
    }
    g.beginPath(); g.arc(head[0], head[1], .22, 0, TAU); g.fill();
    g.lineWidth = 1 / sc; g.strokeStyle = FOG.rim; g.stroke();
    if (s.air > 0) { g.beginPath(); g.arc(hip[0], hip[1] + .1, 1.05 + .05 * Math.sin(t * 12), 0, TAU); g.lineWidth = .07; g.strokeStyle = COL.ha; g.stroke(); }
  }

  /* ---------------- particles ---------------- */
  function emit(x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      if (fx.length > 360) fx.shift();
      const a = o.ang !== undefined ? o.ang + (Math.random() - .5) * (o.spread || 1) : Math.random() * TAU, sp = (o.sp || 4) * (.35 + Math.random() * .9);
      fx.push({ x: x + (Math.random() - .5) * (o.r || .2), y: y + (Math.random() - .5) * (o.r || .2), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp, g: o.g === undefined ? 14 : o.g,
        life: 0, max: (o.life || .6) * (.6 + Math.random() * .7), sz: (o.sz || .12) * (.6 + Math.random() * .9), k: o.k || 0, col: o.col || "#000", rot: Math.random() * TAU, vr: (Math.random() - .5) * 14, flip: !!o.flip, fb: o.fb || 0 });
    }
  }
  function ring(x, y, col, max, flip, fb) { fx.push({ x: x, y: y, vx: 0, vy: 0, g: 0, life: 0, max: .45, sz: max || 1.6, k: 2, col: col || "#000", rot: 0, vr: 0, flip: !!flip, fb: fb || 0 }); }
  function burst(x, y, flip, fb) {
    emit(x, y + .85, 46, { sp: 7, life: .9, sz: .16, r: 1.1, k: 1, flip: flip, fb: fb }); emit(x, y + .85, 16, { sp: 3, life: .7, sz: .08, r: .8, flip: flip, fb: fb });
    ring(x, y + .85, "#000", 2.6, flip, fb); shake = 1;
  }
  function addShake(v) { shake = Math.max(shake, v); }

  /* ---------------- frame ---------------- */
  function frame(V, dt) {
    if (!g || !L) return;
    tNow = V.time; pulse = V.pulse;
    const s = V.s, fl = s.flip, fbase = fl && s.zz ? s.zz.base : 0;
    camX = V.x;
    /* camera height: rest on the ground the runner last stood on, keep them in frame */
    const act = fl ? 2 * fbase + CH - V.y - s.h : V.y;
    if (V.restY !== undefined) camY += (V.restY - camY) * Math.min(1, dt * 3.2);
    const top = (gy - 70) / sc - 2.2; if (act - camY > top) camY = act - top; if (act - camY < -1.5) camY = act + 1.5;
    if (V.snap) camY = V.restY || 0;
    shake = Math.max(0, shake - dt * 4.5);
    const shx = V.noShake ? 0 : (Math.random() - .5) * shake * 14, shy = V.noShake ? 0 : (Math.random() - .5) * shake * 14;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* sky */
    if (skyCv) g.drawImage(skyCv, 0, 0, W, H); else { g.fillStyle = pal.sky[2]; g.fillRect(0, 0, W, H); }
    /* backdrops: five fog layers far -> near, soft mist bands washing their bases */
    const bs = strips.bs || 1;
    for (let i = 0; i < strips.length; i++) {
      const c = strips[i]; if (!c) continue;
      const l = LAY[i], k = bs * (c.res || 1), f = l.f, w = c.width / k, t0 = c.top || 0, sh = c.height - t0, h = sh / k, off = ((camX * sc * f) % w + w) % w;
      const yy = camY * sc * f * .6 + (i === 3 ? pulse * 1.5 : 0), yt = yy + t0 / k;
      if (sh > 0) {
        g.drawImage(c, 0, t0, c.width, sh, -off, yt, w, h); if (w - off < W) g.drawImage(c, 0, t0, c.width, sh, w - off, yt, w, h);
        if (w * 2 - off < W) g.drawImage(c, 0, t0, c.width, sh, 2 * w - off, yt, w, h);
      }
      /* the far pair and the mid pair share one band each; every strip also has mist baked into its base */
      if ((i === 1 || i === 3) && mistCv) { const bh = sc * 3; g.drawImage(mistCv, 0, yy + gy - l.up * sc - bh * .62, W, bh); }
    }
    const dxp = (camX - lastCamX) * sc; lastCamX = camX;
    /* drifting fog wisps (skipped on the low-quality fallback) */
    if (quality >= 1 && wispCv) for (const p of wisps) {
      p.x -= (RM ? 0 : p.v * dt) + dxp * .3 / W; if (p.x < -.6) p.x += 1.9; if (p.x > 1.3) p.x -= 1.9;
      const ww = p.w * sc, hh = p.h * sc; g.globalAlpha = p.a; g.drawImage(wispCv, p.x * W - ww / 2, p.y * H - hh / 2, ww, hh);
    }
    g.globalAlpha = 1;
    /* ambient particles, tinted by the depth they belong to */
    for (const p of amb) {
      const a = p.a; p.x += (a[1] * dt * .06 - dxp * .5 / W) * p.z; p.y += a[2] * dt * .08 * p.z; p.p += dt * 3;
      if (p.x < -.1) p.x += 1.2; if (p.x > 1.1) p.x -= 1.2; if (p.y > 1.05) p.y -= 1.1; if (p.y < -.05) p.y += 1.1;
      const x = p.x * W + (a[0] === 0 ? Math.sin(p.p) * 8 : 0), y = p.y * H * .95, z = p.z * a[3] * sc * .06;
      g.fillStyle = g.strokeStyle = pal.layers[p.z < .7 ? 1 : p.z < 1 ? 2 : 3];
      if (a[0] === 0) { g.save(); g.translate(x, y); g.rotate(p.p); g.beginPath(); g.ellipse(0, 0, z * 1.6, z * .7 * Math.abs(Math.cos(p.p * .7)) + .4, 0, 0, TAU); g.fill(); g.restore(); }
      else if (a[0] === 1) { const tw = a[1] === 0 ? .5 + .5 * Math.sin(p.p) : 1; g.beginPath(); g.arc(x, y, z * tw + .4, 0, TAU); g.fill(); }
      else if (a[0] === 2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - z * 3, y + z * 9); g.lineWidth = 1; g.stroke(); }
      else if (a[0] === 3) { g.beginPath(); g.arc(x, y, z * 2.2 + 1, 0, TAU); g.lineWidth = 1; g.stroke(); }
      else { g.beginPath(); g.moveTo(x - z * 4, y - z * 1.5 * Math.sin(p.p)); g.lineTo(x, y); g.lineTo(x + z * 4, y - z * 1.5 * Math.sin(p.p)); g.lineWidth = 1.4; g.stroke(); }
    }
    g.translate(shx, shy);
    const left = camX - px0 / sc - 3, right = camX + (W - px0) / sc + 3;
    /* zone fields */
    for (const z of L.zones) {
      if (z.x1 < left || z.x0 > right) continue;
      const col = COL[z.k], xa = X(z.x0), xb = X(z.x1);
      g.fillStyle = rgba(col, .1 + .04 * pulse); g.fillRect(xa, 0, xb - xa, H);
      g.strokeStyle = rgba(col, .9); g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(xa, 0); g.lineTo(xa, H); g.moveTo(xb, 0); g.lineTo(xb, H); g.stroke(); g.setLineDash([]);
      const dir = z.k === "A" ? 1 : -1, sp = z.k === "D" ? .5 : z.k === "A" ? 2.4 : 1.5;
      g.strokeStyle = rgba(col, .85); g.fillStyle = rgba(col, .85); g.lineWidth = 2;
      for (let x = Math.ceil(Math.max(z.x0, left)); x < Math.min(z.x1, right); x++) for (let k = 0; k < 2; k++) {
        const hh = hsh(x * 17 + k * 5), px = X(x + hh * .8), yy = (((hh * 7 + tNow * sp * .12 * dir * (.6 + hh)) % 1) + 1) % 1 * H, q = sc * .16;
        g.beginPath();
        if (z.k === "D") g.arc(px, yy, q * (.6 + hh), 0, TAU);
        else if (z.k === "A") { g.moveTo(px - q, yy - q); g.lineTo(px, yy); g.lineTo(px + q, yy - q); }
        else if (z.k === "T") { g.moveTo(px, yy); g.bezierCurveTo(px + q * 1.5, yy + q * 2, px - q * 1.5, yy + q * 4, px, yy + q * 6); }
        else { g.moveTo(px - q, yy + q); g.lineTo(px, yy - q * .6); g.lineTo(px + q, yy + q); }
        g.stroke();
      }
    }
    /* terrain */
    while (si < L.segs.length && L.segs[si].x1 < left - 30) si++;
    const gs = th[2], fk = FOL[gs] || "tuft", rims = [];
    zLines.length = 0;
    for (let i = si; i < L.segs.length; i++) {
      const q = L.segs[i]; if (q.x0 > right) break; if (q.x1 < left || q.kind) continue;
      const xa = X(q.x0), xb = X(q.x1);
      g.fillStyle = FOG.ground;
      if (q.flip) {
        const ew = 2 * q.fb + CH - q.top, yy = Y(ew), yf = Y(q.fb);
        g.fillRect(xa, yf, xb - xa, H - yf + 40);
        rims.push(segPath(q, xa, xb, yy, -40, -1, ew)); g.fill();
        g.save(); g.clip(); g.translate(X(0), yy); g.scale(sc, -sc); groundDetail(gs, Math.max(q.x0, left), Math.min(q.x1, right)); g.restore();
        zLines.push(xa, yy, xb - xa);
      } else {
        const yy = Y(q.top);
        rims.push(segPath(q, xa, xb, yy, H + 60, 1, q.top)); g.fill();
        g.save(); g.clip(); g.translate(X(0), yy); g.scale(sc, sc); groundDetail(gs, Math.max(q.x0, left), Math.min(q.x1, right)); g.restore();
      }
    }
    /* light rim along top edges and exposed cliff faces, then foliage (roots and moss hang from Zenith ceilings) */
    g.beginPath();
    for (const r of rims) { g.moveTo(r[0], r[1]); for (let k = 2; k < r.length; k += 2) g.lineTo(r[k], r[k + 1]); }
    g.lineWidth = 1.25; g.lineJoin = "round"; g.strokeStyle = FOG.rim; g.stroke();
    g.beginPath();
    for (let i = si; i < L.segs.length; i++) {
      const q = L.segs[i]; if (q.x0 > right) break; if (q.x1 < left || q.kind) continue;
      if (q.flip) foliage(fk, q, left, right, Y(2 * q.fb + CH - q.top), -1); else foliage(fk, q, left, right, Y(q.top), 1);
    }
    g.fillStyle = FOG.ground; g.fill();
    for (let i = 0; i < zLines.length; i += 3) { g.fillStyle = COL.Z; g.fillRect(zLines[i], zLines[i + 1] - 3, zLines[i + 2], 3); }
    for (const p of L.props) { if (p.x < left || p.x > right) continue; at(p.x, p.y, false, 0); prop(gs, p.v, Math.round(p.x * 10)); g.restore(); }
    /* hazard tiles, coils, rails */
    for (let i = si; i < L.segs.length; i++) {
      const q = L.segs[i]; if (q.x0 > right) break; if (q.x1 < left || !q.kind) continue;
      const col = COL[q.kind], w = q.x1 - q.x0;
      at(q.x0, q.top, q.flip, q.fb);
      if (q.kind === "F") {
        const t0 = s.dyn[q.id], k = t0 === undefined ? 0 : (s.tick - t0) / SIM.FADE;
        if (k < 1) { g.globalAlpha = 1 - k * .85; glow(col, w / 2, -.2, w * .7); g.beginPath(); g.roundRect(.04, -.42 - k * .4, w - .08, .42, .12); g.fillStyle = col; g.fill(); g.fillStyle = "#fff"; g.fillRect(.25, -.14 - k * .4, w - .5, .05); g.globalAlpha = 1; }
      } else if (q.kind === "X") {
        if (!s.dyn[q.id]) { for (let x = 1; x < w; x += 2) glow(col, x, -.14, 1.3); g.fillStyle = rgba(col, .55); g.fillRect(0, -.28, w, .28); g.fillStyle = col; g.fillRect(0, -.07, w, .07); g.fillRect(0, -.28, w, .05); g.strokeStyle = "#fff"; g.lineWidth = .04; for (let x = .5; x < w - .3; x += 1.1) { g.beginPath(); g.moveTo(x, -.24); g.lineTo(x + .3, -.08); g.stroke(); } }
      } else {
        const on = s.par === (q.kind === "1" ? 0 : 1);
        g.beginPath(); g.roundRect(.05, -.42, w - .1, .42, .1);
        if (on) { glow(col, w / 2, -.2, w * .7); g.fillStyle = col; g.fill(); g.fillStyle = "#fff"; g.fillRect(.25, -.26, w - .5, .06); }
        else { g.setLineDash([.16, .14]); g.lineWidth = .06; g.strokeStyle = col; g.stroke(); g.setLineDash([]); }
      }
      g.restore();
    }
    for (const c of L.coils) {
      if (c.x1 < left || c.x0 > right) continue;
      const col = COL.S, w = c.x1 - c.x0, on = s.ch > 0 && V.x >= c.x0 - .5 && V.x <= c.x1 + .5, k = on ? Math.min(1, s.ch) : 0;
      at(c.x0, c.y, c.flip, c.fb); glow(col, w / 2, .1, w * (.45 + k * .3));
      g.beginPath(); const hgt = .34 * (1 - k * .6); for (let x = 0; x <= w + .001; x += .25) g.lineTo(x, (Math.round(x * 4) % 2 ? hgt : .06)); g.lineWidth = .09; g.strokeStyle = col; g.lineJoin = "round"; g.stroke();
      g.fillStyle = col; g.fillRect(0, -.04, w, .09); g.restore();
    }
    for (const r of L.rails) {
      if (r.x1 < left || r.x0 > right) continue;
      const col = COL.L; at(r.x0, r.y, r.flip, r.fb); const w = r.x1 - r.x0;
      g.fillStyle = rgba(col, .25); g.fillRect(0, -.18, w, .36); g.fillStyle = col; g.fillRect(0, -.06, w, .12);
      for (let x = 0; x <= w + .01; x += 2) { g.fillRect(x - .04, 0, .08, 14); g.beginPath(); g.arc(x, 0, .14, 0, TAU); g.fill(); }
      g.restore();
    }
    /* obstacles and hazards */
    while (oi < L.objs.length && L.objs[oi].x1 < left - 30) oi++;
    for (let i = oi; i < L.objs.length; i++) {
      const o = L.objs[i]; if (o.x0 > right) break; if (o.x1 < left) continue;
      const pp = 1 + .1 * pulse;
      switch (o.k) {
        case "L":
          if (o.v === "sp" || o.v === "tw" || o.v === "bm") { at(o.x, o.y0, o.flip, o.fb); spike(o.v === "sp" ? th[3] : o.v === "tw" ? "post" : "rock", o.x1 - o.x0, o.y1 - o.y0, o.id); }
          else if (o.v === "kn") { at(o.x, (o.y0 + o.y1) / 2 + .35, o.flip, o.fb); g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + tNow, rd = k % 2 ? .52 : .3; g.lineTo(Math.cos(a) * rd, Math.sin(a) * rd); } g.closePath(); ink(); }
          else { at(o.x, o.y0, o.flip, o.fb); bar(o.v === "bar" ? th[4] : "stal", o.x1 - o.x0, 16, o.id, o.y1 - o.y0, o.flip ? 16 : Math.min(40, camY + gy / sc + 1.5 - o.y0)); }
          g.restore(); break;
        case "bl": {
          const since = (s.tick - s.bl) / SIM.TPB, sq = since < .35 && Math.abs(V.x - o.x) < 3 ? 1 - since / .35 : 0, w = (o.x1 - o.x0) / 2;
          at(o.x, o.y0, o.flip, o.fb); glow(COL.bl, 0, .3, 1.5 * pp); g.scale(1 + sq * .35, 1 - sq * .5);
          g.beginPath(); g.moveTo(-w, 0); g.bezierCurveTo(-w, .95 * pp, w, .95 * pp, w, 0); g.closePath(); g.fillStyle = COL.bl; g.fill();
          g.beginPath(); g.ellipse(-w * .3, .42, w * .22, .09, -.3, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.fillStyle = COL.bl; g.fillRect(-w * 1.15, -.02, w * 2.3, .1); g.restore(); break;
        }
        case "ha": if (!s.dyn[o.id]) { at(o.cx, o.cy, o.flip, o.fb); glow(COL.ha, 0, 0, 1.5 * pp); g.beginPath(); g.arc(0, 0, .62 * pp, 0, TAU); g.lineWidth = .16; g.strokeStyle = COL.ha; g.stroke(); g.beginPath(); g.arc(0, 0, .3, tNow * 3, tNow * 3 + 4); g.lineWidth = .07; g.stroke(); g.restore(); } break;
        case "ke": if (!s.dyn[o.id]) { at(o.cx, o.cy + .08 * Math.sin(tNow * 4), o.flip, o.fb); glow(COL.ke, 0, 0, 1.3 * pp); const w = .34 * Math.abs(Math.cos(tNow * 2.4)) + .1; poly([0, .55, w, 0, 0, -.55, -w, 0]); g.fillStyle = COL.ke; g.fill(); poly([0, .55, w * .3, 0, 0, -.55]); g.fillStyle = "#fff"; g.globalAlpha = .6; g.fill(); g.globalAlpha = 1; g.restore(); } break;
        case "ga": {
          at(o.x, o.y0, o.flip, o.fb);
          if (!s.dyn[o.key]) { glow(COL.ke, 0, 1.6, 2.2); g.fillStyle = rgba(COL.ke, .3); g.fillRect(-.3, 0, .6, 16); g.fillStyle = COL.ke; g.fillRect(-.09, 0, .18, 16); for (let y = .4; y < 9; y += .9) { poly([0, y + .3, .26, y, 0, y - .3, -.26, y]); g.fill(); } }
          else { g.fillStyle = rgba(COL.ke, .5); g.fillRect(-.09, 0, .18, .3); g.fillRect(-.09, 5.5, .18, 12); }
          g.restore(); break;
        }
        case "ri": {
          at(o.cx, o.cy, o.flip, o.fb); const used = s.dyn[o.id], a = used ? .3 : 1; g.globalAlpha = a; glow(COL.ri, 0, 0, 1.6 * pp);
          g.strokeStyle = COL.ri; g.lineWidth = .14; g.beginPath(); g.ellipse(0, 0, .42, .72 * pp, 0, 0, TAU); g.stroke(); g.lineWidth = .05; g.beginPath(); g.ellipse(0, 0, .2, .4, tNow * 2, 0, TAU); g.stroke();
          const ey = o.ey - o.cy + .85; g.setLineDash([.1, .2]); g.beginPath(); g.moveTo(0, .8); g.lineTo(0, ey - .7); g.stroke(); g.setLineDash([]);
          glow(COL.ri, 0, ey, 1.1); g.lineWidth = .08; g.setLineDash([.2, .16]); g.beginPath(); g.ellipse(0, ey, .36, .62, 0, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.restore(); break;
        }
        case "co": if (!s.dyn[o.id]) { at(o.cx, o.cy, o.flip, o.fb); glow(COL.co, 0, 0, 1.6 * pp); poly([0, .3, -1.7, .05, -1.7, -.05, 0, -.3]); g.fillStyle = rgba(COL.co, .55); g.fill(); g.beginPath(); g.arc(0, 0, .36 * pp, 0, TAU); g.fillStyle = COL.co; g.fill(); g.beginPath(); g.arc(.08, .08, .13, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.restore(); } break;
        case "ey": {
          at(o.x, o.b, o.flip, o.fb); const rec = s.dyn[o.id]; g.strokeStyle = COL.ey; g.fillStyle = COL.ey; g.lineWidth = .05; g.setLineDash([.14, .2]); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 4.4); g.stroke(); g.setLineDash([]);
          glow(COL.ey, 0, 4.9, 1.2 * pp); g.beginPath(); g.moveTo(-.6, 4.9); g.quadraticCurveTo(0, 5.5, .6, 4.9); g.quadraticCurveTo(0, 4.3, -.6, 4.9); g.fill();
          g.beginPath(); g.arc(rec ? .12 : -.12 + .1 * Math.sin(tNow * 2), 4.9 + (rec === 2 ? .08 : rec === 1 ? -.08 : 0), .17, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.restore(); break;
        }
        case "em": {
          at(o.x, o.b, o.flip, o.fb); const rec = s.dyn[o.eye]; g.fillStyle = COL.ey;
          g.beginPath(); g.roundRect(-.3, 5.6, .6, .5, .12); g.fill(); g.fillRect(-.05, 0, .1, .12);
          if (rec) { const lo = rec === 1 ? 0 : 1.9, hi = rec === 1 ? 1.1 : 5.6; glow(COL.ey, 0, (lo + hi) / 2, 1.6); g.fillStyle = rgba(COL.ey, .35); g.fillRect(-.3, lo, .6, hi - lo); g.fillStyle = COL.ey; g.fillRect(-.1 - .03 * pulse, lo, .2 + .06 * pulse, hi - lo); g.fillStyle = "#fff"; g.fillRect(-.03, lo, .06, hi - lo); }
          else { g.strokeStyle = rgba(COL.ey, .55); g.lineWidth = .05; g.setLineDash([.1, .22]); g.beginPath(); g.moveTo(0, .12); g.lineTo(0, 5.6); g.stroke(); g.setLineDash([]); }
          g.restore(); break;
        }
      }
    }
    /* finish gate */
    if (!V.demo && L.endX > left && L.endX < right + 4) {
      at(L.endX, L.baseAt(L.endX), false, 0); g.fillStyle = "#000"; g.fillRect(-.09, 0, .18, 5); g.fillRect(1.9, 0, .18, 5);
      g.beginPath(); g.arc(0, 5.06, .13, 0, TAU); g.arc(1.99, 5.06, .13, 0, TAU); g.fill();
      g.fillStyle = FOG.rim; g.fillRect(-.09, 0, .04, 5); g.fillRect(1.9, 0, .04, 5);
      for (let i = 0; i < 8; i++) for (let k = 0; k < 2; k++) { g.fillStyle = (i + k) % 2 ? "#000" : "#EDEDED"; g.fillRect(.09 + i * .226, 4.1 + k * .4, .226, .4); }
      g.strokeStyle = "#000"; g.lineWidth = .05; g.strokeRect(.09, 4.1, 1.81, .8); g.restore();
    }
    /* player */
    if (!V.dead) {
      if (fl) { g.save(); g.translate(X(V.x), Y(2 * fbase + CH - V.y)); g.scale(sc, sc); } else { g.save(); g.translate(X(V.x), Y(V.y)); g.scale(sc, -sc); }
      if (s.hang >= 0 && s.h < 1) g.translate(0, s.h - 1.75);
      stick(V); g.restore();
    }
    /* fx */
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]; p.life += dt; if (p.life >= p.max) { fx.splice(i, 1); continue; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = 1 - p.life / p.max;
      at(p.x, p.y, p.flip, p.fb);
      if (p.k === 0 && p.col === "#000") { g.rotate(p.rot * .3); const z = (p.sz * k + .01) * 1.6; g.fillStyle = p.col; g.fillRect(-z / 2, -z / 2, z, z); }
      else if (p.k === 2) { g.beginPath(); g.arc(0, 0, p.sz * (1 - k * k), 0, TAU); g.lineWidth = .12 * k + .01; g.strokeStyle = p.col; g.globalAlpha = k; g.stroke(); g.globalAlpha = 1; }
      else if (p.k === 1) { g.rotate(p.rot); const z = p.sz * (.4 + k * .6); poly([-z, -z * .5, z * .9, -z * .2, -z * .1, z]); g.fillStyle = p.col; g.fill(); }
      else { g.beginPath(); g.arc(0, 0, p.sz * k + .01, 0, TAU); g.fillStyle = p.col; g.fill(); }
      g.restore();
    }
    if (V.flash > 0) { g.fillStyle = "rgba(0,0,0," + (V.flash * .12) + ")"; g.fillRect(-20, -20, W + 40, H + 40); }
  }
  return { resize: resize, setLevel: setLevel, frame: frame, emit: emit, ring: ring, burst: burst, shake: addShake, COL: COL,
    setHome: function (v) { if (home !== v) { home = v; if (cv) resize(); } }, get W() { return W; }, get H() { return H; }, setQuality: function (q) { quality = q; } };
})();

