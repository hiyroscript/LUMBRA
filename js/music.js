/* ---- music.js ---- */
/* ============================================================================
   MUSIC — sequenced Web Audio synthesis. One original track per level, built
   from that level's spec (tempo, key, scale, progressions, kit, bass, lead,
   arp, pad) and from its chart: the lead line plays on exactly the half-beats
   where the level asks for an action, so the song and the level are one thing.
   There are no sound effects anywhere: this file is the only source of audio.
   ========================================================================== */
const MUSIC = (function () {
  "use strict";
  const SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11], phrydom: [0, 1, 4, 5, 7, 8, 10],
    hira: [0, 2, 3, 7, 8], dblharm: [0, 1, 4, 5, 7, 8, 11] };
  /* w/w2/w3 oscillators, det cents, a d s r envelope, f cutoff + fe env + fd decay + q, vib cents @ vr Hz,
     fm [ratio, index, decay], pb [semitones, time], g gain, rv / dl sends, oct shift */
  const INS = {
    flute: { w: "sine", w2: "triangle", det: 3, a: .05, d: .15, s: .8, r: .16, vib: 9, vr: 5.4, g: .2, rv: .4, dl: .12, oct: 1 },
    epiano: { w: "sine", fm: [1, 1.6, .35], a: .004, d: .7, s: .15, r: .3, g: .26, rv: .3, dl: .18, oct: 1 },
    accordion: { w: "square", w2: "sawtooth", det: 9, a: .03, d: .1, s: .9, r: .08, f: 2100, vib: 5, vr: 5, g: .11, rv: .22, oct: 1 },
    musicbox: { w: "sine", fm: [3.5, .9, .12], a: .002, d: .6, s: 0, r: .5, g: .24, rv: .45, dl: .2, oct: 2 },
    whistle: { w: "sine", a: .03, d: .1, s: .9, r: .12, vib: 13, vr: 6, pb: [-.6, .05], g: .2, rv: .4, dl: .15, oct: 2 },
    reed: { w: "sawtooth", w2: "square", det: 6, a: .02, d: .1, s: .85, r: .1, f: 1700, q: 5, vib: 16, vr: 6, pb: [1, .05], g: .11, rv: .3, dl: .15, oct: 1 },
    bell: { w: "sine", fm: [2.76, 2.2, .5], a: .002, d: 1.3, s: 0, r: 1, g: .2, rv: .55, dl: .25, oct: 1 },
    koto: { w: "triangle", w2: "sawtooth", det: 4, a: .002, d: .4, s: 0, r: .25, f: 1400, fe: 5200, fd: .07, pb: [.35, .04], g: .2, rv: .35, dl: .1, oct: 1 },
    pluck: { w: "sawtooth", w2: "square", det: 8, a: .003, d: .28, s: .08, r: .16, f: 600, fe: 3800, fd: .11, q: 2, g: .15, rv: .25, dl: .32, oct: 1 },
    saw: { w: "sawtooth", w2: "sawtooth", det: 13, a: .008, d: .12, s: .75, r: .1, f: 2400, fe: 1600, fd: .15, q: 2, g: .11, rv: .2, dl: .18, oct: 1 },
    bubble: { w: "sine", fm: [2, .7, .1], a: .003, d: .25, s: .2, r: .12, pb: [-5, .06], g: .22, rv: .4, dl: .38, oct: 1 },
    organ: { w: "sine", w2: "sine", det: 1200, w3: "triangle", a: .01, d: .05, s: 1, r: .07, vib: 4, vr: 6.4, g: .13, rv: .4, oct: 1 },
    square: { w: "square", w2: "square", det: 7, a: .006, d: .1, s: .7, r: .1, f: 3400, vib: 7, vr: 5.5, g: .09, rv: .22, dl: .22, oct: 1 },
    calliope: { w: "triangle", w2: "sine", det: 1200, a: .02, d: .05, s: .9, r: .08, vib: 15, vr: 7, g: .18, rv: .3, oct: 1 },
    fmbell: { w: "sine", fm: [3.01, 3, .22], a: .002, d: .8, s: .04, r: .6, g: .18, rv: .5, dl: .3, oct: 1 },
    harp: { w: "triangle", a: .002, d: .7, s: 0, r: .5, f: 1800, fe: 3000, fd: .14, g: .24, rv: .45, dl: .12, oct: 1 },
    supersaw: { w: "sawtooth", w2: "sawtooth", det: 19, w3: "sawtooth", a: .008, d: .15, s: .8, r: .16, f: 3800, g: .075, rv: .3, dl: .26, oct: 1 },
    brass: { w: "sawtooth", w2: "sawtooth", det: 7, a: .035, d: .2, s: .85, r: .12, f: 500, fe: 2300, fd: .22, g: .12, rv: .3, oct: 0 },
    acid: { w: "sawtooth", a: .003, d: .2, s: .5, r: .05, f: 320, fe: 2900, fd: .09, q: 13, g: .13, rv: .15, dl: .25, oct: 0 },
    harpsi: { w: "sawtooth", w2: "square", det: 1203, a: .001, d: .32, s: 0, r: .1, f: 5200, g: .1, rv: .3, oct: 1 },
    pizz: { w: "triangle", w2: "square", det: 5, a: .002, d: .16, s: 0, r: .08, f: 900, fe: 2000, fd: .05, g: .2, rv: .35, oct: 1 },
    zap: { w: "square", a: .002, d: .2, s: .3, r: .08, f: 3000, pb: [12, .045], g: .1, rv: .2, dl: .28, oct: 1 },
    harmonica: { w: "square", w2: "sawtooth", det: 5, a: .03, d: .1, s: .9, r: .1, f: 1500, q: 4, vib: 11, vr: 5.6, pb: [-1, .08], g: .11, rv: .25, oct: 1 },
    /* accompaniment */
    bass: { w: "sawtooth", w2: "square", det: 4, a: .004, d: .18, s: .6, r: .06, f: 260, fe: 900, fd: .12, q: 1.5, g: .3, oct: -1 },
    sub: { w: "sine", w2: "triangle", det: 0, a: .008, d: .3, s: .8, r: .12, g: .42, oct: -1 },
    bacid: { w: "sawtooth", a: .003, d: .14, s: .4, r: .04, f: 200, fe: 1900, fd: .07, q: 11, g: .26, oct: -1 },
    pad1: { w: "sawtooth", w2: "sawtooth", det: 11, a: .35, d: .3, s: .8, r: .6, f: 900, g: .04, rv: .5, oct: 0 },
    pad2: { w: "sine", w2: "triangle", det: 6, a: .5, d: .3, s: .9, r: .9, g: .075, rv: .7, oct: 1 },
    pad3: { w: "sine", w2: "sine", det: 1200, a: .05, d: .1, s: 1, r: .15, vib: 4, vr: 6, g: .05, rv: .4, oct: 0 },
    pad4: { w: "sawtooth", w2: "sawtooth", det: 9, a: .3, d: .3, s: .85, r: .7, f: 1100, q: 3, bp: 1, vib: 6, vr: 4.5, g: .09, rv: .7, oct: 0 },
    arp: { w: "triangle", w2: "square", det: 6, a: .002, d: .16, s: 0, r: .1, f: 800, fe: 2600, fd: .06, g: .1, rv: .3, dl: .3, oct: 1 },
    chime: { w: "sine", fm: [4.2, 1.6, .15], a: .002, d: .5, s: 0, r: .4, g: .12, rv: .55, dl: .3, oct: 2 },
    /* the special-hazard cue (Bloom, Fade, Glass, Flicker, Mimic cells): a glassy two-operator ping that falls a
       little in pitch, so those actions never sound like a plain jump */
    cue: { w: "triangle", fm: [5.01, 2.4, .08], a: .001, d: .22, s: 0, r: .2, pb: [2, .05], g: .13, rv: .5, dl: .28, oct: 1 }
  };
  const KITS = [
    { k: ["x.......x.......", "x.....x.x......."], s: ["....r.......r...", "....r.......r..."], h: ["..s...s...s...s.", "s.s.s.s.s.s.s.s."] },
    { k: ["x.........x.....", "x..x......x....."], s: ["....r.......r...", "....x.......x..o"], h: ["x.x.x.x.x.x.x.x.", "x.xoxox.x.xoxox."] },
    { k: ["x.......x.......", "x...x...x...x..."], s: ["............c...", "....c.......c..."], h: ["..x...x...x...x.", "..O...O...O...O."] },
    { k: ["x.......x.......", "x.....x.x.x....."], s: ["....r.......r...", "....x.......x..."], h: ["x...x...x...x...", "x.x.x.x.x.x.x.x."] },
    { k: ["x.........x.....", "x.....x...x....."], s: ["....r.......r...", "....x..o.o..x..."], h: ["x.x.x.x.x.x.x.x.", "x.x.x.xox.x.x.xo"] },
    { k: ["t.....t.....t...", "t..t..t...t.t..."], s: ["........T.......", "..T...T..T....T."], h: ["s...s...s...s...", "s.s.s.s.s.s.s.s."], c: ["................", "....r.......r.r."] },
    { k: ["x...............", "x.........x....."], s: ["........r.......", "........x......."], h: ["x...x...x...x...", "x.x.x.x.x.xxx.x."] },
    { k: ["x.......x.......", "x.......x......."], s: ["....r.......r...", "....x..x....x.xx"], h: ["w...W...w...W...", "w.w.W.w.w.w.W.w."] },
    { k: ["x.........x.....", "x.........x....."], s: ["....r.......r...", "....x.......x..."], h: ["x.x.x.x.x.x.x.x.", "x.xox.x.xox.x.xo"] },
    { k: ["x.......x.......", "x...x...x...x..."], s: ["....r.......r...", "....x.......x..."], h: ["sosososososososo", "sosososososososo"] },
    /* 10: the drop kit, four on the floor with open hats on every off-beat */
    { k: ["x.......x.......", "x...x...x...x..."], s: ["....r.......r...", "....x.......x..."], h: ["..h...h...h...h.", "..O...O...O...O."] },
    /* 11: breakbeat, ghost snares and a skipping kick */
    { k: ["x.........x.....", "x.x.......x..x.."], s: ["....x.......x...", "....x..o.o..x..o"], h: ["x.x.x.x.x.x.x.x.", "xxoxxxoxxxoxxxox"] },
    /* 12: taiko march, low and high drums with a shaker */
    { k: ["t.....t.t.......", "t..t..t.t..t..t."], s: ["....T.......T...", "....T..T....T.TT"], h: ["s...s...s...s...", "s.s.s.s.s.s.s.s."], c: ["................", "........r...r.r."] }
  ];
  const BASS = ["r...............", "r.o.r.o.r.o.r.o.", "r...t...f...a...", "...r......r.r...", "r.rorr.or.rof.ro", "r...f...r...f...", "r.r.r.r.r.r.r.o.", "r..r.r....r.o.r.",
    /* 8: off-beat pump, 9: rolling sixteenths, 10: 3-3-2 syncopation */
    "..r...r...r...o.", "rrorrrorrrorrror", "r..o..r..o..r.o."];
  /* bass voice and note length (in sixteenths) per pattern */
  const BASS_INS = function (b) { return b === 3 || b === 10 ? "sub" : b === 4 || b === 9 ? "bacid" : "bass"; };
  const BASS_LEN = function (b, e) { return b === 0 ? (e >= 2 ? 7.5 : 15) : b === 2 || b === 5 ? 3.4 : b === 3 || b === 10 ? 2.6 : b === 8 ? 1.6 : b === 9 ? 0.9 : 1.5; };
  let ctx = null, master = null, comp = null, rev = null, dly = null, noise = null, bus = null, song = null;
  let t0 = 0, nextStep = 0, vol = 0.8, timer = 0, offline = false;

  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function build(c) {
    ctx = c;
    master = ctx.createGain(); master.gain.value = vol * .7;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .18; comp.knee.value = 8;
    master.connect(comp); comp.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate), r = rng(7);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev = ctx.createConvolver(); rev.buffer = ir;
    const rg = ctx.createGain(); rg.gain.value = .55; rev.connect(rg); rg.connect(master);
    dly = ctx.createDelay(1.5);
    const fb = ctx.createGain(), dl = ctx.createBiquadFilter(), dg = ctx.createGain();
    fb.gain.value = .34; dl.type = "lowpass"; dl.frequency.value = 2600; dg.gain.value = .5;
    dly.connect(dl); dl.connect(fb); fb.connect(dly); dl.connect(dg); dg.connect(master);
    const nl = ctx.sampleRate; noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = noise.getChannelData(0), r2 = rng(99); for (let i = 0; i < nl; i++) nd[i] = r2() * 2 - 1;
  }
  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { build(new AC({ latencyHint: "interactive" })); } catch (e) { try { build(new AC()); } catch (e2) { return false; } }
    return true;
  }
  function newBus() {
    const b = { out: ctx.createGain(), rv: ctx.createGain(), dl: ctx.createGain(), ins: {} };
    b.out.connect(master); b.rv.connect(rev); b.dl.connect(dly);
    return b;
  }
  function inp(name) {
    let n = bus.ins[name];
    if (n) return n;
    const P = INS[name] || {}; n = ctx.createGain();
    n.connect(bus.out);
    if (P.rv) { const g = ctx.createGain(); g.gain.value = P.rv; n.connect(g); g.connect(bus.rv); }
    if (P.dl) { const g = ctx.createGain(); g.gain.value = P.dl; n.connect(g); g.connect(bus.dl); }
    bus.ins[name] = n; return n;
  }

  function voice(name, t, midi, dur, vel, bend, tight) {
    const P0 = INS[name];
    /* tight < 1 shortens a percussive voice's decay and release (fast songs would otherwise smear its tail) */
    const P = tight && tight < 1 && !P0.s ? Object.assign({}, P0, { d: P0.d * tight, r: P0.r * tight }) : P0;
    let f = 440 * Math.pow(2, (midi - 69 + (P.oct || 0) * 12) / 12); while (f > 3600) f /= 2;
    const g = ctx.createGain(), peak = P.g * vel, a = P.a, end = P.s > 0 ? t + Math.max(dur, a + .02) : t + a + P.d * 1.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * P.s, t + a, P.d / 3);
    if (P.s > 0) g.gain.setTargetAtTime(0.0001, end, P.r / 3);
    const stop = end + (P.s > 0 ? P.r * 2.2 : P.r);
    let dest = g;
    if (P.f) {
      const fl = ctx.createBiquadFilter(); fl.type = P.bp ? "bandpass" : "lowpass"; fl.Q.value = P.q || .7;
      const base = Math.min(P.f * (0.7 + 0.5 * vel), 14000);
      if (P.fe) { fl.frequency.setValueAtTime(Math.min(base + P.fe * vel, 16000), t); fl.frequency.setTargetAtTime(base, t, P.fd); }
      else fl.frequency.value = base;
      fl.connect(g); dest = fl;
    }
    const oscs = [], types = [P.w, P.w2, P.w3];
    for (let i = 0; i < 3; i++) {
      if (!types[i]) continue;
      const o = ctx.createOscillator(); o.type = types[i]; o.frequency.value = f;
      const dt = i === 1 ? (P.det || 0) : i === 2 ? -(P.det || 0) * (P.det > 600 ? 0 : .8) + (P.det > 600 ? 1902 : 0) : 0;
      const pb = bend || P.pb;
      if (pb) { o.detune.setValueAtTime(dt + pb[0] * 100, t); o.detune.linearRampToValueAtTime(dt, t + pb[1]); } else o.detune.value = dt;
      if (i === 2 && P.det > 600) { const og = ctx.createGain(); og.gain.value = .4; o.connect(og); og.connect(dest); } else o.connect(dest);
      o.start(t); o.stop(stop); oscs.push(o);
    }
    if (P.fm) {
      const m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = Math.min(f * P.fm[0], 16000); mg.gain.setValueAtTime(f * P.fm[1] * (.6 + .6 * vel), t); mg.gain.setTargetAtTime(f * P.fm[1] * .12, t, P.fm[2]);
      m.connect(mg); mg.connect(oscs[0].frequency); m.start(t); m.stop(stop);
    }
    if (P.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = P.vr; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(P.vib, t + Math.min(.25, dur * .6 + .05));
      l.connect(lg); for (const o of oscs) lg.connect(o.detune); l.start(t); l.stop(stop);
    }
    g.connect(inp(name));
  }
  function nz(t, dur, type, freq, q, vel, target) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true; fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(g); g.connect(target || inp("drum"));
    s.start(t, (t * 7.31) % .9); s.stop(t + dur + .02);
  }
  /* combo cue: filtered noise sweeping up over dur, swelling into the downbeat that follows */
  function riser(t, dur, vel) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true; fl.type = "bandpass"; fl.Q.value = 2.2;
    fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0008, t); g.gain.exponentialRampToValueAtTime(vel, t + dur * .92); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + .05);
    s.connect(fl); fl.connect(g); g.connect(inp("drum"));
    s.start(t, (t * 3.17) % .9); s.stop(t + dur + .08);
  }
  function tone(t, f0, f1, sweep, dur, vel, type) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(inp("drum")); o.start(t); o.stop(t + dur + .02);
  }
  function drum(ch, t, v, kit) {
    switch (ch) {
      case "x": tone(t, kit >= 6 ? 170 : 150, 44, .09, kit === 6 || kit === 3 ? .34 : .24, .9 * v); nz(t, .012, "highpass", 2500, .7, .18 * v); break;
      case "t": tone(t, 150, 78, .07, .3, .55 * v); break;
      case "T": tone(t, 300, 170, .06, .2, .4 * v); break;
      case "w": tone(t, 1900, 1700, .01, .03, .16 * v, "square"); break;
      case "W": tone(t, 1300, 1200, .01, .035, .16 * v, "square"); break;
      case "r": tone(t, 1750, 1650, .01, .03, .2 * v, "triangle"); nz(t, .03, "bandpass", 2400, 2, .16 * v); break;
      case "c": nz(t, .012, "bandpass", 1300, 1.2, .5 * v); nz(t + .011, .012, "bandpass", 1300, 1.2, .45 * v); nz(t + .022, .16, "bandpass", 1300, 1.2, .5 * v); break;
      case "s": nz(t, .05, "highpass", 5200, .8, .12 * v); break;
      case "o": nz(t, .025, "highpass", 7500, .8, .07 * v); break;
      case "O": nz(t, .2, "highpass", 7000, .8, .16 * v); break;
      case "h": nz(t, .03, "highpass", 7500, .8, .16 * v); break;
      case "n": nz(t, .16, "highpass", 1500, .7, .42 * v); tone(t, 200, 150, .03, .1, .3 * v, "triangle"); break;
      case "g": nz(t, .07, "highpass", 1800, .7, .14 * v); break;
      case "C": nz(t, 1.3, "highpass", 4500, .5, .26 * v); break;
    }
  }

  /* Bars that hold the start of a combo: two different hazards within 2 beats (8 units) of each other, or a hazard
     inside another's zone, found from the compiled level the same way tools/difficulty.js counts combos. The bar
     before each one gets a riser. Audio only: nothing here touches the simulation. */
  const HK = { bl: "bl", ha: "ha", ke: "ke", ga: "ke", ri: "ri", co: "co", ey: "ey", em: "ey", F: "F", X: "X", "1": "1", "2": "1" };
  function comboBars(L) {
    const hz = [], byId = {}, out = {};
    L.objs.forEach(function (o) { byId[o.id] = o; });
    L.objs.forEach(function (o) {
      const k = HK[o.k]; if (!k || o.k === "ke" || o.k === "ey") return;
      const src = o.k === "ga" ? byId[o.key] : o.k === "em" ? byId[o.eye] : null;
      hz.push({ k: k, x0: src ? (src.cx !== undefined ? src.cx : src.x) : o.x0, x1: o.x1 });
    });
    L.segs.forEach(function (q) { if (HK[q.kind]) hz.push({ k: HK[q.kind], x0: q.x0, x1: q.x1 }); });
    L.coils.forEach(function (c) { hz.push({ k: "S", x0: c.x0, x1: c.x1 }); });
    L.rails.forEach(function (r) { hz.push({ k: "L", x0: r.x0, x1: r.x1 }); });
    L.zones.forEach(function (z) { hz.push({ k: z.k, x0: z.x0, x1: z.x1 }); });
    let last = -99;
    const locs = [];
    for (let i = 0; i < hz.length; i++) for (let j = i + 1; j < hz.length; j++) {
      const a = hz[i], b = hz[j]; if (a.k === b.k) continue;
      const gap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
      if (gap <= 8) locs.push(gap <= 0 ? Math.max(a.x0, b.x0) : (Math.min(a.x1, b.x1) + Math.max(a.x0, b.x0)) / 2);
    }
    locs.sort(function (a, b) { return a - b; });
    locs.forEach(function (x) { if (x - last > 8) { last = x; out[Math.floor(x / 16)] = 1; } });
    return out;
  }
  function makeSong(def, L, loop) {
    const m = def.mu, sc = SC[m[2]];
    /* action cells per bar, to tell a dense passage from a sparse one */
    const dens = []; for (let b = 0; b < L.bars; b++) { let c = 0; for (let i = 0; i < 8; i++) if (L.chart[b * 8 + i]) c++; dens.push(c); }
    return { bpm: m[0], spb: 60 / m[0], root: m[1], sc: sc, pA: m[3], pB: m[4], kit: m[5], bass: m[6], lead: m[7], arp: m[8], pad: m[9],
      sw: m[10], lead2: m[11] || "arp", chart: L.chart, energy: L.energy, bars: L.bars, seed: hash(def.name), loop: !!loop, endBeat: L.endX / 4, T: L.T,
      combo: loop ? {} : comboBars(L), dens: dens, tight: Math.min(1, 150 / m[0]) };
  }
  function semi(S, d) { const n = S.sc.length; return S.sc[((d % n) + n) % n] + 12 * Math.floor(d / n); }
  function chordAt(S, bar) { const p = (bar >> 3) & 1 ? S.pB : S.pA; return +p[bar % p.length] - 1; }

  function playStep(S, k, t) {
    const bar0 = Math.floor(k / 16), pos = k % 16, bar = S.loop ? bar0 % S.bars : bar0;
    if (bar >= S.bars) {
      if (bar === S.bars && pos === 0) { /* closing chord */
        const c = chordAt(S, 0);
        for (const d of [0, 2, 4, 7]) voice(S.pad ? "pad" + S.pad : "arp", t, S.root + semi(S, c + d), S.spb * 3, 1);
        voice(S.lead, t, S.root + 12 + semi(S, c), S.spb * 2, .9); voice("sub", t, S.root + semi(S, c), S.spb * 3, .9);
        drum("x", t, 1, S.kit); drum("C", t, 1, S.kit);
      }
      return;
    }
    const e = S.energy[bar], ch = chordAt(S, bar), st = S.spb / 4, K = KITS[S.kit], lv = e >= 2 ? 1 : 0;
    const ts = pos % 2 ? t + S.sw * st : t;
    /* drums */
    if (e >= 1) {
      const fill = e >= 2 && bar % 8 === 7 && pos >= 12;
      let c = K.k[lv][pos]; if (c !== ".") drum(c, t, 1, S.kit);
      c = K.s[lv][pos]; if (fill) drum("n", ts, .5 + (pos - 12) * .14, S.kit); else if (c !== ".") drum(c === "x" ? "n" : c === "o" ? "g" : c, ts, 1, S.kit);
      c = K.h[lv][pos]; if (c !== ".") drum(c === "x" ? "h" : c, ts, pos % 4 === 0 ? 1 : .7, S.kit);
      if (K.c) { c = K.c[lv][pos]; if (c !== ".") drum(c, ts, .8, S.kit); }
      if (e >= 3 && pos % 2 === 1) drum("o", ts, .8, S.kit);
      if (pos === 0 && bar % 8 === 0 && e >= 2 && bar > 0) drum("C", t, .8, S.kit);
      /* the drop: energy 4 always gets a kick on every beat and an open hat on every off-beat, and the first bar of a
         run of 4s lands with a crash and a sub boom */
      if (e >= 4) {
        if (pos % 4 === 0 && K.k[lv][pos] === ".") drum("x", t, .7, S.kit);
        if (pos % 4 === 2 && K.h[lv][pos] !== "O") drum("O", ts, .6, S.kit);
        if (pos === 0 && (bar === 0 || S.energy[bar - 1] < 4)) { drum("C", t, .85, S.kit); tone(t, 90, 32, .5, .7, .55); }
      }
    }
    /* the build: the bar before a drop rises and rolls, unless a combo cue already does */
    if (S.energy[bar + 1] >= 4 && e < 4 && !S.combo[bar + 1]) {
      if (pos === 0) riser(t, S.spb * 4, .1 + .03 * e);
      if (pos >= 8) drum("n", ts, .25 + (pos - 8) * .07, S.kit);
    }
    /* combo cue: a riser across the bar before a combo and a quick snare roll on its last beat */
    if (S.combo[bar + 1]) {
      if (pos === 8) riser(t, S.spb * 2, .13 + .03 * e);
      if (pos >= 12) drum("n", ts, .35 + (pos - 12) * .12, S.kit);
    }
    /* bass */
    if (e >= 1) {
      const c = BASS[S.bass][pos], bi = BASS_INS(S.bass);
      if (c !== "." && (e >= 2 || pos % 8 === 0 || S.bass === 0)) {
        let d = ch;
        if (c === "o") d = ch + S.sc.length; else if (c === "f") d = ch + 4; else if (c === "t") d = ch + 2;
        else if (c === "a") d = chordAt(S, (bar + 1) % (S.loop ? S.bars : 1e9)) - 1;
        const len = BASS_LEN(S.bass, e);
        voice(bi, t, S.root + semi(S, d), st * len, c === "o" ? .8 : 1);
        if (S.bass === 0 && e >= 2 && pos === 0) voice(bi, t + st * 8, S.root + semi(S, ch), st * 7, .85);
      }
    }
    /* pad */
    if (S.pad && pos === 0) { for (const d of e >= 2 ? [0, 2, 4, 6] : [0, 2, 4]) voice("pad" + S.pad, t, S.root + semi(S, ch + d), S.spb * 4, e === 0 ? 1.2 : 1); }
    /* arp */
    if (S.arp && (e >= 2 || (e >= 0 && pos % 4 === 0 && S.arp !== 4))) {
      const ai = S.lead === "koto" || S.lead === "musicbox" || S.lead === "harpsi" || S.lead === "harp" ? S.lead : "arp";
      const v = e >= 2 ? .8 : .55; let d = null;
      if (S.arp === 1 && pos % 2 === 0) d = [0, 2, 4, 7, 4, 2, 4, 7][pos / 2];
      else if (S.arp === 2) d = [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 11, 9, 7][pos];
      else if (S.arp === 3 && pos % 2 === 0) d = [0, 4, 2, 4, 0, 4, 2, 4][pos / 2];
      else if (S.arp === 4 && pos % 2 === 0) { const r = rng(S.seed + bar * 31 + pos); if (r() < .34) d = [0, 2, 4, 6, 7, 9][Math.floor(r() * 6)]; }
      else if (S.arp === 5) d = [0, 4, 7, 11, 7, 4, 2, 4, 0, 4, 7, 9, 11, 9, 7, 4][pos];   /* up-down sixteenths across the octave */
      else if (S.arp === 6 && pos % 2 === 0) d = [0, 7, 0, 7, 2, 9, 4, 7][pos / 2];            /* gated octave pulse */
      if (d !== null) voice(ai === S.lead ? ai : S.arp === 4 ? "chime" : "arp", ts, S.root + semi(S, ch + d) - (ai === S.lead ? 12 : 0), st * 1.6, ai === S.lead ? v * .5 : v);
    }
    /* lead: the level's own rhythm */
    if (pos % 2 === 0) {
      const cell = bar * 8 + pos / 2, a = S.chart[cell];
      let str = ""; for (let i = 0; i < 8; i++) str += S.chart[bar * 8 + i];
      const empty = str === "00000000", r = rng(hash(str) ^ S.seed), cp = pos / 2;
      let deg = [0, 2, 4, 7][Math.floor(r() * 4)], note = null, kind = a;
      const motif = [0, -1, 2, -1, 4, -1, 2, 1];
      for (let i = 0; i <= cp; i++) {
        const stepv = [-2, -1, -1, 1, 1, 2, 2, 3][Math.floor(r() * 8)], on = empty ? motif[i] >= 0 && (bar % 2 === 0 || i < 5) : S.chart[bar * 8 + i] > 0;
        if (on) { deg = empty ? motif[i] + (bar % 4 === 3 ? 1 : 0) : Math.max(-2, Math.min(11, deg + stepv)); if (i % 4 === 0 && !empty) deg = deg - (deg % 2); if (i === cp) note = deg; }
      }
      if (note !== null) {
        let len = 1; for (let i = cp + 1; i < 8 && (empty ? motif[i] < 0 : !S.chart[bar * 8 + i]); i++) len++;
        /* a dense bar (five or more actions) keeps the tune readable: short notes, and every other note steps up to the
           arp octave on the level's second lead voice, so the line alternates between two timbres instead of smearing */
        const dense = !empty && S.dens[bar] >= 5;
        let k2 = 0; if (dense) for (let i = 0; i < cp; i++) if (S.chart[bar * 8 + i]) k2++;
        const alt = dense && k2 % 2 === 1, lead = alt ? S.lead2 : S.lead;
        const dur = (dense ? 1 : Math.min(len, 4)) * st * 2 * (dense ? .55 : .92), vel = empty ? .5 : e >= 2 ? 1 : .8;
        const mid = S.root + 12 + semi(S, ch + note) + (alt ? 12 : 0);
        if (kind === 2) voice(lead, t, mid - 12, dur * .8, vel, [4, .09], S.tight);
        else if (kind === 3) { voice(lead, t, mid + 12, dur, vel * .8, null, S.tight); voice("cue", t, mid + 19, dur, .8); voice("chime", t, mid + 12, dur, .45); }
        else { voice(lead, t, mid, dur, alt ? vel * .8 : vel, null, S.tight); if (e >= 3 && !dense) voice(lead, t, mid + 12, dur, vel * .45, null, S.tight); }
      }
    }
  }
  function schedule() {
    if (!song || !ctx) return;
    const until = ctx.currentTime + (offline ? 1e9 : 0.22), st = song.spb / 4, maxK = song.loop ? 1e12 : (song.bars + 1) * 16;
    while (nextStep < maxK && t0 + nextStep * st < until) {
      const t = t0 + nextStep * st;
      if (t >= ctx.currentTime - 0.03) playStep(song, nextStep, Math.max(t, ctx.currentTime + 0.002));
      nextStep++;
    }
  }
  function start(S, fromBeat) {
    if (!ctx) return 0;
    stop(0.05);
    bus = newBus(); song = S;
    dly.delayTime.value = Math.min(1.4, S.spb * .75);
    bus.out.gain.setValueAtTime(0.0001, ctx.currentTime); bus.out.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
    t0 = ctx.currentTime + 0.1 - (fromBeat || 0) * S.spb; nextStep = Math.ceil((fromBeat || 0) * 4);
    schedule();
    if (!timer && !offline) timer = setInterval(schedule, 60);
    return t0;
  }
  function stop(fade) {
    if (!ctx || !bus) { song = null; return; }
    const b = bus, f = fade === undefined ? 0.08 : fade, now = ctx.currentTime;
    try { b.out.gain.cancelScheduledValues(now); b.out.gain.setValueAtTime(b.out.gain.value, now); b.out.gain.linearRampToValueAtTime(0.0001, now + f); } catch (e) {}
    b.rv.gain.setTargetAtTime(0, now, f / 2 + .01); b.dl.gain.setTargetAtTime(0, now, f / 2 + .01);
    if (!offline) setTimeout(function () { try { b.out.disconnect(); b.rv.disconnect(); b.dl.disconnect(); } catch (e) {} }, f * 1000 + 250);
    bus = null; song = null;
  }
  function beat() {
    if (!ctx || !song) return null;
    const lat = Math.min(0.3, ctx.outputLatency || ctx.baseLatency || 0);
    return (ctx.currentTime - lat - t0) / song.spb;
  }
  /* Offline render, used by the test harness to check every track is audible and unclipped. */
  function renderStats(def, L, seconds) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sr = 22050, oc = new OC(2, sr * seconds, sr), keep = [ctx, master, comp, rev, dly, noise, bus, song, t0, nextStep];
    offline = true; build(oc);
    const S = makeSong(def, L, false); bus = newBus(); song = S; t0 = 0.05; nextStep = 0;
    const st = S.spb / 4; while (t0 + nextStep * st < seconds - .5) { playStep(S, nextStep, t0 + nextStep * st); nextStep++; }
    const p = oc.startRendering();
    offline = false; ctx = keep[0]; master = keep[1]; comp = keep[2]; rev = keep[3]; dly = keep[4]; noise = keep[5]; bus = keep[6]; song = keep[7]; t0 = keep[8]; nextStep = keep[9];
    /* peak and RMS of the whole render, plus the RMS of each second (to see where the song stops) */
    return p.then(function (buf) {
      const d = buf.getChannelData(0); let pk = 0, pi = 0, sum = 0; const secs = [];
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) { pk = v; pi = i; } sum += v * v; const k = Math.floor(i / sr); secs[k] = (secs[k] || 0) + v * v; }
      return { peak: +pk.toFixed(3), peakAt: +(pi / sr).toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), secs: secs.map(function (x) { return +Math.sqrt(x / sr).toFixed(4); }) };
    });
  }
  return {
    init: init, makeSong: makeSong, start: start, stop: stop, beat: beat, schedule: schedule, renderStats: renderStats,
    get ctx() { return ctx; }, get song() { return song; }, get t0() { return t0; },
    setVol: function (v) { vol = v; if (master) master.gain.setTargetAtTime(v * .7, ctx.currentTime, .03); },
    resume: function () { if (ctx && ctx.state !== "running") return ctx.resume(); },
    suspend: function () { if (ctx && ctx.state === "running") return ctx.suspend(); }
  };
})();

