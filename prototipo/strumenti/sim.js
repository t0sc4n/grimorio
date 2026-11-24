// Simulazione di partite Grimorio tra due giocatori automatici.
// uso: node sim.js <cartella proto> <numero partite> [seed] [decay]
const fs = require("fs");
const dir = process.argv[2], N = +(process.argv[3] || 10);
let seed = +(process.argv[4] || 7);
const G = require(dir + "/engine.js");
if (process.argv[5]) G.CFG.decay = +process.argv[5];
if (process.argv[6] === "radici") G.CFG.radici = "designer";
if (G.PRESETS[process.argv[6]]) G.applyCfg(G.PRESETS[process.argv[6]]);
const OUT = process.argv[7] || "sim_result.json";
const words = fs.readFileSync(dir + "/parole.txt", "utf8").split("\n");
G.setDict(new Set(words));
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// parole come conteggi di lettere
const WL = words.filter(w => w.length >= 2 && w.length <= 9).map(w => {
  const cnt = {}; for (const ch of w) cnt[ch] = (cnt[ch] || 0) + 1; return { w, cnt };
});
for (const el of Object.keys(G.LESSICO)) for (const w of G.LESSICO[el].split(" ")) if (!words.includes(w)) { const cnt = {}; for (const ch of w) cnt[ch] = (cnt[ch] || 0) + 1; WL.push({ w, cnt }); }

function genMoves(s, p) {
  const hand = {}; for (const l of s.hands[p]) hand[l] = (hand[l] || 0) + 1;
  const board = {}; for (const k in s.tiles) { const l = s.tiles[k].l; board[l] = (board[l] || 0) + 1; }
  const cands = [];
  for (const it of WL) {
    let def = 0, ok = true;
    for (const ch in it.cnt) {
      const need = it.cnt[ch] - (hand[ch] || 0);
      if (need > 0) { if ((board[ch] || 0) < need) { ok = false; break; } def += need; if (def > 2) { ok = false; break; } }
    }
    if (ok) cands.push(it.w);
  }
  const moves = [];
  const T = s.tiles;
  for (const w0 of cands) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const w = dr === 1 && G.CFG.letturaDalLato && p === "A" ? [...w0].reverse().join("") : w0;
      const maxR = G.ROWS - dr * (w.length - 1), maxC = G.COLS - dc * (w.length - 1);
      for (let r = 0; r < maxR; r++) for (let c = 0; c < maxC; c++) {
        if (T[G.key(r - dr, c - dc)] || T[G.key(r + dr * w.length, c + dc * w.length)]) continue;
        const h = Object.assign({}, hand), placed = []; let bad = false;
        for (let i = 0; i < w.length; i++) {
          const rr = r + dr * i, cc = c + dc * i, t = T[G.key(rr, cc)];
          if (t) { if (t.l !== w[i]) { bad = true; break; } }
          else { if (!h[w[i]]) { bad = true; break; } h[w[i]]--; placed.push({ r: rr, c: cc, l: w[i] }); }
        }
        if (bad || !placed.length) continue;
        moves.push(placed);
      }
    }
  }
  return moves;
}

function evalState(s, p) {
  const e = G.enemy(p);
  if (s.winner === p) return 1e6;
  let v = (s.hp[p] - s.hp[e]) * 4;
  const bp = G.bridgeActive(s, p), be = G.bridgeActive(s, e);
  v += bp ? 12 : 0; v -= be ? 12 : 0;
  if (!bp) { // avanzamento verso la Staffa
    const net = G.network(s.words, p); let best = 0;
    for (const id in net) for (const k of s.words[id].cells) { const r = G.parse(k)[0]; const adv = p === "A" ? r : G.ROWS - 1 - r; if (adv > best) best = adv; }
    v += Math.min(best, G.STAFFA) * 2;
  }
  for (const id in s.words) { const w = s.words[id]; if (w.type === "difesa") v += (w.o === p ? 1 : -1) * Math.min(w.stab, 15) * 0.2; }
  for (const q of [p, e]) { // colonne del Sanctum coperte da difese con resistenza utile
    const cols = {};
    for (const id in s.words) { const w = s.words[id]; if (w.type !== "difesa" || w.o !== q || w.stab < 3) continue;
      for (const k of w.cells) { const [r, c] = G.parse(k); if (G.zoneOf(r) !== q) continue; for (let d = -G.CFG.difesaLarga; d <= G.CFG.difesaLarga; d++) if (c + d >= 0 && c + d < G.COLS) cols[c + d] = 1; } }
    v += (q === p ? 1 : -1) * Object.keys(cols).length * 1.2;
  }
  const vow = s.hands[p].filter(l => "AEIOU".includes(l)).length;
  if (vow === 0 || vow > 5) v -= 3;
  return v;
}

let STATS = { valid: 0, turns: 0, noMove: 0 };
function aiTurn(s, p) {
  // prima si tengono solo le mosse valide, poi (se sono tante) se ne valuta un campione
  let moves = [];
  for (const pl of genMoves(s, p)) { const v = G.validate(s, p, pl, {}); if (v.ok) moves.push([pl, v]); }
  STATS.valid += moves.length; STATS.turns++; if (!moves.length) STATS.noMove++;
  if (moves.length > 400) { for (let i = moves.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; } moves = moves.slice(0, 400); }
  let best = null, bestV = -Infinity;
  for (const [pl, v] of moves) {
    const opts = [{}];
    if (v.type === "attacco") {
      const pv = G.previewLaunches(s, p, pl); let bk = null, bd = -1;
      for (const k in pv) if (pv[k] > bd) { bd = pv[k]; bk = k; }
      opts[0] = { launch: bk };
    }
    if (G.CFG.attaccoLibero && v.type === "neutra" && v.launches.length) {
      const pv = G.previewLaunches(s, p, pl); let bk = null, bd = -1;
      for (const k in pv) if (pv[k] > bd) { bd = pv[k]; bk = k; }
      if (bk) opts.push({ attacca: true, launch: bk });
    }
    if (G.CFG.consacrazione && v.type === "neutra") { const cv = G.validate(s, p, pl, { consacra: true }); if (cv.ok) opts.push({ consacra: true }); }
    const fv = G.validate(s, p, pl, { falo: true });
    if (fv.ok && fv.targets.some(id => s.words[id].o !== p)) opts.push({ falo: true });
    for (const o of opts) {
      const r = G.play(s, p, pl, o, rng); if (!r.ok) continue;
      const val = evalState(r.state, p) + rng() * 0.5;
      if (val > bestV) { bestV = val; best = r; }
    }
  }
  if (!best) {
    // Alchimia: con l'Alchimia parziale cambia solo le lettere pesanti (H, Q, Z) se ne ha, altrimenti tutta la mano
    const heavy = s.hands[p].filter(l => G.VAL[l] >= 8);
    const part = G.CFG.consumoNeutre && heavy.length ? heavy : undefined;
    const r = s.bag.length || s.focolare.length ? G.alchimia(s, p, rng, part) : G.pass(s, p, rng);
    return { state: r.state, report: r.state.last };
  }
  return best;
}

const all = [];
for (let g = 0; g < N; g++) {
  let s = G.newGame(rng);
  const st = { winner: null, moves: 0, dmg: { A: 0, B: 0 }, dmgByZone: { casa: 0, centro: 0, invasione: 0 }, attacks: 0, attacksHit: 0, absorbedStops: 0, disintegrated: 0, falo: 0, storms: 0, crolli: 0, defenses: 0, alchimia: 0, passa: 0, bridgeTurn: { A: null, B: null }, faded: 0, scores: [], words: [] };
  const t0 = Date.now(); STATS = { valid: 0, turns: 0, noMove: 0 };
  while (!s.winner && s.moveNo < 200) {
    const prevS = s, p = s.turn, r = aiTurn(s, p), rep = r.report || r.state.last;
    s = r.state; st.moves++;
    if (rep.kind === "alchimia") st.alchimia++;
    else if (rep.kind === "passa") st.passa++;
    else {
      st.words.push(rep.word);
      if (rep.type === "falo") st.falo++;
      const vert = rep.cells && rep.cells.length > 1 && G.parse(rep.cells[0])[1] === G.parse(rep.cells[1])[1];
      if (vert) st.vert = (st.vert || 0) + 1;
      if (rep.type === "falo") for (const d of rep.destroyed) if (d.o !== p && d.cells && d.cells.length > 1 && G.parse(d.cells[0])[1] === G.parse(d.cells[1])[1]) st.faloVert = (st.faloVert || 0) + 1;
      if (rep.type === "difesa") st.defenses++;
      if (rep.type === "bloccato") st.blocked = (st.blocked || 0) + 1;
      if (rep.type === "difesa" && s.words && Object.values(r.state.words).some(w => w.text === rep.word && w.consacrata)) st.consacrate = (st.consacrate || 0) + 1;
      if (rep.type === "cataclisma") st.cataclismi = (st.cataclismi || 0) + 1;
      if (rep.type === "attacco") {
        if (rep.consumed && G.bridgeActive(prevS, p) && !G.bridgeActive(s, p)) st.ponteRotto = (st.ponteRotto || 0) + 1;
        st.attacks++; st.scores.push(rep.score);
        const lr = G.parse(rep.launch)[0], z = G.zoneOf(lr), zone = z === p ? "casa" : z === "M" ? "centro" : "invasione";
        if (rep.capped) st.capped = (st.capped || 0) + 1;
        if (rep.damage) { st.attacksHit++; st.dmg[p] += rep.damage; st.dmgByZone[zone] += rep.damage; }
        if (rep.path.some(x => x.kind === "assorbito")) st.absorbedStops++;
        if (rep.path.some(x => x.def)) st.intercepted = (st.intercepted || 0) + 1;
        if (rep.path.some(x => x.kind === "disintegra")) st.broken = (st.broken || 0) + 1;
      }
      st.disintegrated += rep.destroyed.filter(d => d.mode === "return").length;
      if (rep.storm) { st.storms++; st.crolli += rep.destroyed.filter(d => d.mode === "crollo").length; }
    }
    if (rep.faded) st.faded += rep.faded.length;
    for (const q of ["A", "B"]) if (st.bridgeTurn[q] === null && G.bridgeActive(s, q)) st.bridgeTurn[q] = s.moveNo;
  }
  console.log(`   turni senza nessuna mossa valida: ${STATS.noMove}/${STATS.turns} | mosse valide medie per turno: ${(STATS.valid / STATS.turns).toFixed(0)} | tessere sul campo a fine partita: ${Object.keys(s.tiles).length}/90 | sacca ${s.bag.length} | mani ${s.hands.A.join("")} ${s.hands.B.join("")}`);
  st.winner = s.winner || "pareggio"; st.hp = s.hp; st.sec = ((Date.now() - t0) / 1000).toFixed(1);
  all.push(st);
  console.log(`Partita ${g + 1}: vince ${st.winner} in ${st.moves} mosse | PV A ${s.hp.A} B ${s.hp.B} | attacchi ${st.attacks} (a segno ${st.attacksHit}) | colpi tagliati dal tetto ${st.capped || 0} | danni casa/centro/invasione ${st.dmgByZone.casa}/${st.dmgByZone.centro}/${st.dmgByZone.invasione} | difese ${st.defenses} (consacrate ${st.consacrate || 0}) | intercettati ${st.intercepted || 0}, fermati ${st.absorbedStops}, sfondate ${st.broken || 0}, lanci bloccati ${st.blocked || 0} | falò ${st.falo}, tempeste ${st.storms}, crolli ${st.crolli} | ponte A@${st.bridgeTurn.A} B@${st.bridgeTurn.B} | cataclismi ${st.cataclismi || 0} | ponti rotti attaccando ${st.ponteRotto || 0} | alchimie ${st.alchimia} passi ${st.passa} | ${st.sec}s`);
  console.log("   parole: " + st.words.join(" "));
}
fs.writeFileSync(dir + "/../" + OUT, JSON.stringify(all, null, 1));
module.exports = { aiTurn, genMoves, G, rng };
