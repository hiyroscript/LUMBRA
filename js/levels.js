/* ---- levels.js ---- */
/* ============================================================================
   LEVELS — 30 hand-written charts. A phrase is "terrain/overlay"; each char is
   half a beat. A form string is a list of one-letter phrase keys, digits set
   the musical energy (0-4) of the bars that follow.
   th: [far backdrop, near backdrop, ground, spike, bar, particles]
   mu: [bpm, root, scale, progA, progB, kit, bass, lead, arp, pad, swing]
   ========================================================================== */
const HAZ = [
  { k: "bl", ch: "B", name: "Bloom", col: "#FF2952", lv: 1 },
  { k: "ha", ch: "O", name: "Halo", col: "#19E3E3", lv: 3 },
  { k: "D", ch: "D", name: "Drift", col: "#A64DFF", lv: 5 },
  { k: "F", ch: "F", name: "Fade", col: "#1FE05C", lv: 7 },
  { k: "ke", ch: "K", name: "Prism", col: "#FF9F1A", lv: 9 },
  { k: "A", ch: "A", name: "Anchor", col: "#1FA8FF", lv: 11 },
  { k: "L", ch: "L", name: "Rail", col: "#B5F51B", lv: 13 },
  { k: "ri", ch: "R", name: "Rift", col: "#EE3DFF", lv: 15 },
  { k: "co", ch: "C", name: "Comet", col: "#FFEE1A", lv: 17 },
  { k: "T", ch: "T", name: "Thermal", col: "#FF5B2E", lv: 19 },
  { k: "ey", ch: "E", name: "Mimic", col: "#3D6BFF", lv: 21 },
  { k: "X", ch: "X", name: "Glass", col: "#4BEB2A", lv: 23 },
  { k: "S", ch: "S", name: "Coil", col: "#19E8A6", lv: 25 },
  { k: "1", ch: "1", name: "Flicker", col: "#FF3DB5", lv: 27 },
  { k: "Z", ch: "Z", name: "Zenith", col: "#6A4DFF", lv: 29 }
];
/* the newer plain obstacles (scenery colours, like spikes and bars): chart character and the level that brings it in */
const OBST = [
  { ch: "*", name: "Floating spike block", lv: 2 },
  { ch: "%", name: "Spiked step", lv: 6 },
  { ch: "=", name: "Low tunnel", lv: 10 },
  { ch: "&", name: "Hurdle pair", lv: 14 },
  { ch: "|", name: "Crusher", lv: 18 },
  { ch: "@", name: "Rolling blade", lv: 22 }
];

const LEVELS = [
{ n: 1, name: "Whispering Pines", th: ["peaks", "pines", "grass", "thorn", "trunk", "leaves"],
  mu: [112, 50, "major", "1546", "6415", 0, 0, "flute", 1, 1, 0],
  phr: { i: "........", a: "....^...", b: "..^...^.", c: "....-...", d: "..^...-.", e: "...._...", f: "..+...v.",
    P: "......../....B...", Q: "....U.../....B...", R: ".....H../....B...", s: "..V...V." },
  form: "0ii 1aaca bcea 2PaQc bdQe 1faRs 2bdQe da" },

{ n: 2, name: "Midnight Rooftops", th: ["towers", "city", "roof", "antenna", "pipe", "dust"],
  mu: [116, 57, "dorian", "1414", "1746", 1, 2, "epiano", 4, 1, 0.16],
  phr: { i: "........", a: "...._...", b: ".._..._.", c: "..+..._.", d: "..v...^.", e: "....-...", f: ".._...-.", g: "..^..._.",
    h: "..#...V.", Q: "..U...../..B.....", R: "...H..../..B.....", s: "..V...V.", T: "..U..._./..B....." },
  form: "0ii 1aeba cdfg 2Qahb RseT 1cdae 2bfQg hTgb ea" },

{ n: 3, name: "Lantern Harbor", th: ["masts", "cranes", "planks", "post", "chain", "gulls"],
  mu: [120, 55, "major", "1451", "6451", 7, 5, "accordion", 0, 3, 0],
  phr: { i: "........", a: "....^...", b: "..^...^.", c: "..-...-.", d: ".._...^.", e: "..^.-...", f: "..+...+.", g: "..v...v.",
    h: "..--....", k: "..^..._.", O: "..^...../...O....", P: "..U...../...O....", Q: "...H..../...O....", s: "..V...V.",
    U: "..U...^./...O...." },
  form: "0ii 1acba dehk 2OaPc bPdU 1fgah 2QsPk ebUd 1ca" },

{ n: 4, name: "Clockwork Attic", th: ["gears", "pendulums", "rivets", "cog", "piston", "sparks"],
  mu: [124, 48, "harm", "1515", "4151", 7, 6, "musicbox", 2, 0, 0],
  phr: { i: "........", a: "..^.^...", b: "^.^.^.^.", c: "..-.-...", d: "..^.-.^.", e: ".._._...", f: "+.+.v.v.",
    P: "..U...../...O....", Q: "..U...../..B.....", R: ".....H../....B...", s: "..V...V.", S: "...H..../...O...." },
  form: "0ii 1acba dbec 2PaQd bfPe 1cadb 2RsdQ SsbP ebda 1ci" },

{ n: 5, name: "Paper Kite Plains", th: ["kites", "windmills", "grass", "fence", "cloth", "petals"],
  mu: [126, 53, "lydian", "1215", "4536", 0, 0, "whistle", 1, 2, 0],
  phr: { i: "........", a: "....^...", b: "..^...^.", c: "..-...-.", d: ".._...^.", e: "..^.-...", f: "..+...v.", g: "..I.....", h: "..^.^.-.",
    D: "........ ......../D....... .......d", E: "..^..... ..^...../.D...... ......d.",
    F: "..^..._. ..M...../.D...... ......d.", G: ".._..._. .._...../.D...... ......d.", Q: "..U...../..B....." },
  form: "0ii 1abca 2Dadb Ecg 1fheb 2FQdh Gca 1fb 2EhQ Fdg 1ai" },

{ n: 6, name: "Mirage Dunes", th: ["pyramids", "palms", "sand", "cactus", "trunk", "dust"],
  mu: [128, 50, "phrydom", "1217", "4211", 5, 3, "reed", 0, 1, 0],
  phr: { i: "........", a: "..^...^.", b: "..M.....", c: "..-.-...", d: ".._.^...", e: "..^.-.^.", f: "..+.+...", g: "..v.v...", h: "....I...",
    B: "....'.../..B.....", Q: "..U...^./..B.....", D: "..M..._. ..^..I../.D...... .......d",
    E: ".._...M. .._...../.D...... ......d.", R: ".....H../....B...", s: "..V...V." },
  form: "0ii 1abca dech 2DaBQ efgb 1dch 2EcQa RsBd 2Deh QbaE 1ci" },

{ n: 7, name: "Frostbite Ridge", th: ["peaks", "icepines", "snow", "ice", "stal", "snow"],
  mu: [130, 47, "minor", "1637", "6711", 6, 0, "bell", 4, 2, 0],
  phr: { i: "........", a: "..^...^.", b: "..-...^.", c: ".._._...", d: "..M.....", e: "..^.-.^.", f: "..+.v...", g: "....I...", h: "^.^.^...",
    N: "........ ......../....FF.. ........", F: "..~~~~~~ ~......./..F.F.F. F.......", G: "..~~~~.^/..F.F...",
    H: "..^.~~~~ ~...-.../....F.F. F.......", Q: "..U...../..B....." },
  form: "0ii 1abca N 2deFb Gca 1fgah 2Hed GFc 1bQ 2hGHa dFGe 1ci" },

{ n: 8, name: "Bamboo Monastery", th: ["pagodas", "bamboo", "tiles", "stake", "cloth", "petals"],
  mu: [132, 45, "hira", "1151", "4151", 5, 0, "koto", 3, 0, 0],
  phr: { i: "........", a: "^...^.^.", b: "..-.-.^.", c: ".._.^._.", d: "..M...-.", e: "..+...+.", f: "..v...v.", g: "..I...^.",
    P: "..U...^./...O....", S: "...H..../...O....", s: "..V...V.", F: "..~~~~~~ ~......./..F.F.F. F.......",
    J: "..U.~~../...O.F..", G: "..~~~~.^/..F.F..." },
  form: "0ii 1abca dcbg 2FPae Gfd 1agc 2SsJb FcGP 1db 2JaFg SsGc PJba 1i" },

{ n: 9, name: "Prism Caverns", th: ["stalact", "crystals", "rock", "crystal", "stal", "dust"],
  mu: [134, 52, "minor", "1645", "6415", 2, 1, "pluck", 2, 2, 0],
  phr: { i: "........", a: "..^.^...", b: "..-...M.", c: ".._..._.", d: "^.^.-...", e: "..I.-...", f: "..+.v.^.", g: "..--.^..",
    N: "........ ......../..K..... ..G.....", K: "....^... ..-...../..K..... ....G...",
    J: "..-..._. ......../....K... ..G.....", L: "......../..K.G...", P: "..U...../...O...." },
  form: "0ii 1abca N 2dceK gfab 1cL 2JcLd ePKa 1bg 2LaPJ dKcL eJba 1i" },

{ n: 10, name: "Iron Foundry", th: ["chimneys", "pipes", "rivets", "rebar", "piston", "embers"],
  mu: [136, 49, "phryg", "1216", "1612", 3, 6, "saw", 0, 1, 0],
  phr: { i: "........", a: "^.^...-.", b: "..M.^...", c: "..-.^.-.", d: ".._._.^.", e: "..I...I.", f: "..#...V.", g: "+.+.v.v.",
    Q: "..U...^./..B.....", B: "....'.../..B.....", K: "..^.-... ..M...../K....... ....G...",
    G: "..~~~~.^/..F.F...", F: "..~~~~~~ ~......./..F.F.F. F.......", J: "..~~~~.. ......../..F.FK.. ..G....." },
  form: "0ii 1abca dcef 2QaKb Gcd 1gcae 2BdFK aGe 1fb 2QbGJ dcKB FaQG ed 1ai" },

{ n: 11, name: "Sunken Reef", th: ["wreck", "kelp", "sand", "coral", "chain", "bubbles"],
  mu: [132, 55, "dorian", "1414", "7411", 4, 3, "bubble", 4, 2, 0.08],
  phr: { i: "........", a: "..^.^.-.", b: "..M..._.", c: "..-.-.^.", d: "^.^._...", e: "..I.-.^.", f: "..+.v...",
    N: "........ ......../.A...... ......a.", A: "...^.^.^ .^....../.A...... ....a...",
    C: "..^^.^^. _._...../.A...... ......a.", E: "..+++... vvv...../.A...... ......a.", P: "..U...^./...O...." },
  form: "0ii 1abca N 2daAc ebP 1fcd 2CdPA Eab 1ce 2AbCP dEaC AeP 1bi" },

{ n: 12, name: "Storm Lighthouse", th: ["lighthouse", "cliffs", "rock", "rock", "beam", "rain"],
  mu: [138, 45, "harm", "1765", "4511", 3, 6, "organ", 1, 3, 0],
  phr: { i: "........", a: "^.^.^.-.", b: "..M.-.^.", c: ".._.^._.", d: "..-.-.-.", e: "..I.^.I.", f: "..#...V.", g: "..+.+.v.", h: "..v.^...",
    S: "...H..../...O....", s: "..V...V.", P: "..U...^./...O....", Q: "..U...-./..B.....",
    A: "...^.^.^ .^....../.A...... ....a...", C: ".._^_^_^ ._.-..../.A...... ......a.",
    E: "..-.^-.^ +++.vvv./.A...... ......a." },
  form: "0ii 1abca 2dPAc eb 1ghfa 2SsCb PEd 1ce 2aQAc PCdb EaQe AP 1bi" },

{ n: 13, name: "Cable Car Summit", th: ["peaks", "pylons", "snow", "post", "beam", "snow"],
  mu: [140, 52, "major", "1564", "4516", 2, 1, "square", 2, 1, 0],
  phr: { i: "........", a: "^.^.^.^.", b: "..M.-.^.", c: ".._._.-.", d: "..I...M.", e: "..-.^.-.", f: "..+.+.v.", g: "..v.^...",
    N: "........ ......../...L.... ....l...", R: "...~~~~~ ~~~...../...L.... ...l....",
    M: "...MMMMM M......./...L.... ...l....", T: "...MM!MM M......./...L.... ...l....",
    X: "...~~~.. ~~~...../...L..x. ...l...." },
  form: "0ii 1abca N 2RdaM fgce 1bd 2TbXa Rec 1fga 2MdTe XaRb TcXM ed 1bi" },

{ n: 14, name: "Carnival After Dark", th: ["ferris", "tents", "planks", "cone", "cloth", "confetti"],
  mu: [142, 50, "harm", "1515", "4151", 7, 5, "calliope", 3, 0, 0],
  phr: { i: "........", a: "^.^._.^.", b: "..M.-.-.", c: "..I.^.-.", d: ".._.-._.", e: "..#...V.",
    Q: "..U...^./..B.....", B: "....'.../..B.....", D: "..M..._. ..^..I../.D...... .......d",
    E: ".._...M. .._...../.D...... ......d.", M: "...MMMMM M......./...L.... ...l....",
    T: "...MM!MM M......./...L.... ...l....", X: "...~~~.. ~~~...../...L..x. ...l....",
    J: "...~~~~~ ~......./..BL.... ..l....." },
  form: "0ii 1abca 2QdMc Bea 1Db 2TaQJ bEc 1de 2XdBJ cDaM QbTE JXca 1bi" },

{ n: 15, name: "Rift Observatory", th: ["domes", "antennas", "tiles", "antenna", "beam", "stars"],
  mu: [144, 50, "lydian", "1271", "4521", 2, 1, "fmbell", 2, 2, 0],
  phr: { i: "........", a: "^.^.-.^.", b: "..M._.-.", c: "..I.I...", d: ".._.^.-.", e: "..-.-.^.",
    N: "....H.../....R...", y: "..Y.....", z: "..Y...^.", X: "..^.H.../....R...", W: "..H...H./..R...R.",
    V: "...H.-../...R....", P: "..U...^./...O....", T: "...MM!MM M......./...L.... ...l...." },
  form: "0ii 1abca Ny 2daXz ecb 1Vya 2Wyzb PXyd 1ce 2Tadb Wzya VyPX zecW yyTb 1ai" },

{ n: 16, name: "Hanging Gardens", th: ["arches", "vines", "bricks", "thorn", "vine", "petals"],
  mu: [140, 56, "major", "1625", "4536", 0, 2, "harp", 2, 1, 0],
  phr: { i: "........", a: "^.^.^.-.", b: "..M.-.M.", c: "._.^._..", d: "..I.-.^.", e: "..-.^._.", f: "..#...V.",
    X: "..^.H.../....R...", y: "..Y...^.", J: "..H.~~~~ ~......./..R.F.F. F.......",
    R: "...~~~~~ ~~~...../...L.... ...l....", T: "...MM!MM M......./...L.... ...l....", G: "..~~~~.^/..F.F..." },
  form: "0ii 1abca 2XydG Rfc 1eab 2JybT GdXy 1cf 2aGRe JyTb XyGd RcJy Tae 1bi" },

{ n: 17, name: "Comet Steppe", th: ["meteors", "stones", "grass", "rock", "lintel", "dust"],
  mu: [146, 45, "minor", "1675", "6715", 2, 6, "supersaw", 2, 1, 0],
  phr: { i: "........", a: "^.^._.^.", b: "..M.-.-.", c: "..I.^.M.", d: ".._._.-.", e: "..-.^.^.", f: "+.+.v.v.",
    N: "........ ......../....C... ........", C: "...~~.../..C.....", K: "...~~~~./..C.C...",
    M: "...M~.../..C.....", J: "...I~.../..C.....", P: "..U...^./...O...." },
  form: "0ii 1abca N 2CdCa fce 1bd 2KibM dJa 1ec 2CPKi bMJd aKic 1fa 2CeMP JbKi dCaK iMcJ 1ci" },

{ n: 18, name: "Shipwreck Graveyard", th: ["masts", "ribs", "planks", "bone", "chain", "ash"],
  mu: [148, 50, "minor", "1767", "1455", 5, 0, "brass", 0, 4, 0],
  phr: { i: "........", a: "^.^.-.^.", b: "..M.M.-.", c: "..I._.I.", d: "..-.-._.", e: ".._.^.-.", f: "..#...V.",
    C: "...~~.../..C.....", K: "...~~~~./..C.C...", A: "...^.^.^ .^....../.A...... ....a...",
    E: ".._^_^_^ ._.-..../.A...... ......a.", G: "..^.-... ..M...../K....... ....G...", L: "......../..K.G..." },
  form: "0ii 1abca 2CLdA fce 1ba 2GKib Eda 1ce 2aCLe AKic GbEd CLaK iAGc Ede 1bi" },

{ n: 19, name: "Geyser Flats", th: ["geysers", "rockarch", "rock", "rock", "stal", "steam"],
  mu: [150, 55, "mixo", "1741", "4571", 4, 4, "acid", 4, 1, 0],
  phr: { i: "........", a: "^.^._.^.", b: "..M.-.M.", c: "..I.I.-.", d: ".._.-.^.", e: "-.^.-.^.", f: "..+.+.v.", g: "..v.^._.",
    N: "........ ......../.T...... ......t.", T: "........ ......../T...n... m...n..t",
    U: "........ ......../T..n...m ..n..m.t", V: "..M...-. ..M...-. ......../.T...... ........ .t......",
    Q: "..U...^./..B.....", B: "....'.../..B....." },
  form: "0ii 1abca N 2TdaV fgce 1bd 2UbQT aVe 1cB 2TaUd VeQb UcBT VdaU eb 1ci" },

{ n: 20, name: "Ashfall Caldera", th: ["volcano", "deadtrees", "rock", "flame", "stal", "embers"],
  mu: [152, 52, "phryg", "1212", "6711", 8, 6, "saw", 2, 1, 0],
  phr: { i: "........", a: "^.^.^._.", b: "..M.M.-.", c: "..I.-.I.", d: ".._._.^.", e: "-.^.-.M.",
    U: "........ ......../T..n...m ..n..m.t", V: "..M...-. ..M...-. ......../.T...... ........ .t......",
    W: "..M.M... -.-...M. ......../.T...... ........ .t......", K: "...~~~~./..C.C...", M: "...M~.../..C.....",
    Q: "..U...^./..B.....", B: "....'.../..B.....", R: ".....H../....B...", s: "..V...V." },
  form: "0ii 1abca 2UdKi Bec 1Rsa 2VbMQ Wdc 1ea 2aKiU dBMe VRsb 1cd 2WQKi UcMd VaeB 1bi" },

{ n: 21, name: "Echo Palace", th: ["columns", "chandeliers", "checker", "candle", "cloth", "dust"],
  mu: [150, 50, "harm", "14736251", "14736251", 7, 2, "harpsi", 3, 0, 0],
  phr: { i: "........", a: "^.^.-.^.", b: "..M._.M.", c: "..I.-.-.", d: ".._.^._.", e: "-.-.^.^.", f: "..#...V.",
    N: "........ ......../..E..... ..e.....", M: "........ ..'...../..E..... ..e.....",
    J: "..^...../..E...e.", K: "......^./..E...e.", L: "....'... ......^./E...e... ..E...e.",
    W: "..'...^./E.e.E.e.", P: "..U...^./...O...." },
  form: "0ii 1abca N 2MdJa fce 1bK 2JbLd WaP 1ce 2MKaW dLPb JeWK 1fa 2cMdL WaPJ KebW LdMP 1di" },

{ n: 22, name: "Library of Dust", th: ["shelves", "ladders", "books", "quill", "beam", "paper"],
  mu: [154, 47, "dorian", "1415", "4175", 1, 7, "pizz", 4, 2, 0],
  phr: { i: "........", a: "^.^.^.-.", b: "..M.-.M.", c: "._.^._..", d: "..I.^.I.", e: "-.^.-.^.", f: "+.+.v.v.",
    M: "........ ..'...../..E..... ..e.....", J: "..^...../..E...e.", K: "......^./..E...e.", W: "..'...^./E.e.E.e.",
    P: "..U...^./...O....", S: "...H..../...O....", s: "..V...V.", F: "..~~~~~~ ~......./..F.F.F. F.......",
    G: "..~~~~../..F.F..." },
  form: "0ii 1abca 2JGWd ceSs 1fa 2FKPb MaGe 1dc 2WbFJ SsKG PdMa FeWK 1fb 2GcJP bSsF WdaM KGeP 1ci" },

{ n: 23, name: "Stained Cathedral", th: ["spires", "gothic", "bricks", "candle", "chain", "dust"],
  mu: [156, 48, "minor", "1637", "4511", 6, 0, "organ", 1, 4, 0],
  phr: { i: "........", a: "^.^.-.^.", b: "..M.M.-.", c: "..I._.I.", d: "-.-.^._.", e: ".._.^.-.", f: "..#...V.",
    N: "...Y.... --..#.#./....XXXX ........", G: "..^.Y... .-.-..H./.....XXX X.....R.",
    X: "..^.H.../....R...", y: "..Y...^.", P: "..U...^./...O...." },
  form: "0ii 1abca N 2daGe fcb 1ae 2NPaG Xydb 1ce 2GaNd PbXy GeNc aPGd XyNb GceN Pda 1bi" },

{ n: 24, name: "High Steel", th: ["towers", "girders", "girder", "rebar", "hook", "sparks"],
  mu: [158, 52, "dorian", "1417", "4175", 4, 7, "brass", 0, 1, 0.06],
  phr: { i: "........", a: "^.^.^.^.", b: "..M.-.M.", c: "..I.I.-.", d: "._.^._..", e: "-.^.-.^.",
    N: "...Y.... --..#.#./....XXXX ........", G: "..^.Y... .-.-..H./.....XXX X.....R.",
    R: "...~~~~~ ~~~...../...L.... ...l....", T: "...MM!MM M......./...L.... ...l....",
    U: "...~~~.. ~~~...../...L..x. ...l....", X: "..^.H.../....R...", y: "..Y...^.", W: "..H...H./..R...R.", z: "..Y....." },
  form: "0ii 1abca 2NRdX yce 1ba 2GTbW zyUa 1de 2NeRG cXyT aUbN WzyG dRTe XyUc NGab 1di" },

{ n: 25, name: "Tesla Yard", th: ["pylons", "coils", "rivets", "insul", "pipe", "sparks"],
  mu: [160, 54, "minor", "1167", "6715", 2, 4, "zap", 2, 2, 0],
  phr: { i: "........", a: "^.^._.^.", b: "..M.-.M.", c: "..I.^.I.", d: "-.-._.^.", e: "-.^.-.^.", f: "..#...V.",
    N: "........ ......../....SS.. ........", S: "......H./....SS..", s: "..V...V.", U: "......U./....SS..",
    T: ".....!../....S...", D: "......'./..SS....", Q: "..U...^./..B.....", K: "...~~~~./..C.C..." },
  form: "0ii 1abca N 2SsdU iaTc 1feb 2TbSs DaUi 1cd 2aKiU idTe QDSs bUiT 1fa 2cKiD aSsQ TdUi ebTD SsaU icKi QTdD 1ci" },

{ n: 26, name: "Rail Yard Express", th: ["watertowers", "trains", "train", "post", "beam", "steam"],
  mu: [162, 52, "mixo", "11415415", "11415415", 9, 2, "harmonica", 0, 3, 0.1],
  phr: { i: "........", a: "^.^.-.^.", b: "..M.M.M.", c: "..I.-.I.", d: "._.^._..", e: "-.^._.-.", f: "+.+.v.v.",
    S: "......H./....SS..", s: "..V...V.", U: "......U./....SS..", T: ".....!../....S...",
    C: "...~~.../..C.....", K: "...~~~~./..C.C...", J: "..^...../..E...e.", L: "......^./..E...e.", W: "..'...^./E.e.E.e." },
  form: "0ii 1abca 2UidK iWce 1Ssa 2JbTC LaUi 1df 2aLUi eKiW dSsb TCJc 1fa 2UiKi WaLT eSsd CJbU iWKi caTL WbCJ Ssd 1ci" },

{ n: 27, name: "Lantern Bazaar", th: ["minarets", "stalls", "tiles", "pot", "cloth", "petals"],
  mu: [164, 50, "dblharm", "1212", "4211", 5, 3, "reed", 3, 0, 0],
  phr: { i: "........", a: "^.^.-.^.", b: "..M._.M.", c: "..I.-.I.", d: "-.-.^.^.", e: "._.^._..", f: "..#...V.",
    N: "........ ......../...11... ........", K: "...~~~~~ ~~....../....2.1. 2.......",
    J: "...~~~~./....1.2.", L: "......../..1111..", M: "....-.../..1111..", P: "..U...^./...O...." },
  form: "0ii 1abca N 2KdJa fce 1bL 2KbMa PJd 1ec 2LaKP dJMb KeLc PaJd 1fa 2MKbe JLPc aKMd JeLb KPaJ MdLc KbJe PLaM 1ci" },

{ n: 28, name: "Stormfront Armada", th: ["zeppelins", "clouds", "hull", "antenna", "hook", "rain"],
  mu: [166, 48, "minor", "1675", "6711", 3, 6, "brass", 2, 4, 0],
  phr: { i: "........", a: "^.^.^._.", b: "..M.-.M.", c: "..I.I.-.", d: "-.^.-.^.", e: "._.^._..",
    K: "...~~~~~ ~~....../....2.1. 2.......", J: "...~~~~./....1.2.", M: "....-.../..1111..",
    U: "........ ......../T..n...m ..n..m.t", V: "..M...-. ..M...-. ......../.T...... ........ .t......",
    P: "..U...^./...O....", S: "...H..../...O....", s: "..V...V.",
    D: "..M..._. ..^..I../.D...... .......d", E: ".._...M. .._...../.D...... ......d." },
  form: "0ii 1abca 2KUdP ceD 1ba 2JbVS sEa 1dc 2aMEK dUPJ eSsV bDKM cUaJ PEdV KSsb JMDa 1ei" },

{ n: 29, name: "Inverted Citadel", th: ["castles", "battlements", "bricks", "spear", "chain", "ash"],
  mu: [168, 45, "harm", "15634125", "15634125", 6, 6, "bell", 2, 4, 0],
  phr: { i: "........", a: "^.^.-.^.", b: "..M.M.-.", c: "..I._.I.", d: "-.-.^._.", e: "._.^.-..", f: "..#...V.",
    N: "........ ........ ......../..Z..... ........ ..z.....",
    Z: "........ ..^...-. ..^..... ......../.Z...... ........ ........ .z......",
    Y: "......^. ^._.-.-. ^......./..Z..... ........ ....z...",
    X: "....M._. -.^.M... ......../.Z...... ......z. ........",
    P: "..U...^./...O....", K: "...~~~~./..C.C...", G: "...Y.... --..#.#./....XXXX ........", U: "......U./....SS.." },
  form: "0ii 1abca N 2dZa fce 1bd 2YbPX 1ac 2aKiZ dGY Uie X 2bPZ cKiY GaX UidZ eY 1bi" },

{ n: 30, name: "The Last Light", th: ["ringsun", "shards", "obsidian", "crystal", "lintel", "embers"],
  mu: [172, 50, "minor", "1637", "6711", 8, 6, "supersaw", 2, 4, 0],
  phr: { i: "........", a: "^.^.^.^.", b: "..M.M.-.", c: "..I.-.I.", d: "-.^.-.^.", e: "._.^._..", f: "..M.I.M.",
    Q: "..U...^./..B.....", P: "..U...^./...O....", F: "..~~~~.^/..F.F...", L: "......../..K.G...",
    A: ".._^_^_^ ._.-..../.A...... ......a.", R: "...MM!MM M......./...L.... ...l....",
    X: "..^.H.../....R...", y: "..Y...^.", K: "...~~~~./..C.C...", V: "..M...-. ..M...-. ......../.T...... ........ .t......",
    W: "..'...^./E.e.E.e.", G: "...Y.... --..#.#./....XXXX ........", U: "......U./....SS..",
    J: "...~~~~./....1.2.", Z: "......^. ^._.-.-. ^......./..Z..... ........ ....z...",
    D: "..M..._. ..^..I../.D...... .......d" },
  form: "0ii 1abca 2QPFL cdA 1eb 2RXyK iVa 1df 2WGUi JZ 1ca 2DbQK iAeX yFPW dRGf 3UiJV ZaLD cKiQ PXyF AWbR GUiJ 1ai" }
];

/* Home screen: its own track, and a hazard-free demo chart. */
const HOME = { n: 0, name: "Home", th: null, loops: 8,
  mu: [96, 48, "lydian", "1564", "4156", 0, 0, "bell", 1, 2, 0],
  phr: { a: "....^...", b: "..^...-.", c: "...._...", d: "..-...^.", e: "..+...v.", f: "..^..._.", g: "....-...", h: ".._...^." },
  form: "2abcd efgh abhd fegc" };


