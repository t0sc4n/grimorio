/* Grimorio — giocatore automatico (web worker).
   Riceve {state, seat, level} e risponde con la mossa scelta:
   {kind:"play", placed, opts} | {kind:"alchimia", letters} | {kind:"pass"} */
importScripts("engine.js");
const G = self.Grimorio;
// un dizionario per lingua della partita; TEXT / OFFS / N sono quelli della partita in corso
const FILE_DIZ = { it: "parole.txt", en: "words-en.txt" };
const DIZ = {};
let TEXT = null, OFFS = null, N = 0;

function loadDict(l) {
  if (DIZ[l]) return DIZ[l].loading;
  const d = DIZ[l] = {};
  d.loading = fetch(FILE_DIZ[l]).then(r => { if (!r.ok) throw new Error("dizionario " + r.status); return r.text(); }).then(t => {
    const text = t.replace(/\r/g, "").trim(), o = [0];
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) o.push(i + 1);
    const offs = Uint32Array.from(o), n = offs.length;
    const riga = i => text.slice(offs[i], i + 1 < n ? offs[i + 1] - 1 : text.length);
    Object.assign(d, { text, offs, n });
    G.setDict({ has: w => { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = riga(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } }, l);
  });
  return d.loading;
}
// con più dizionari le parole candidate vengono dal loro testo unito (ordinato, senza doppioni)
const UNITI = {};
function usaDict(ls) {
  let d = ls.length === 1 ? DIZ[ls[0]] : UNITI[ls.join("+")];
  if (!d) {
    const text = G.unisciTesti(ls.map(l => DIZ[l].text)), o = [0];
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) o.push(i + 1);
    d = UNITI[ls.join("+")] = { text, offs: Uint32Array.from(o), n: o.length };
  }
  TEXT = d.text; OFFS = d.offs; N = d.n;
}
function lineEnd(i) { return i + 1 < N ? OFFS[i + 1] - 1 : TEXT.length; }
function line(i) { return TEXT.slice(OFFS[i], lineEnd(i)); }

// parole componibili con la mano più al massimo 2 lettere già sul campo
function candidates(s, p) {
  const hand = new Int16Array(26), board = new Int16Array(26), used = new Int16Array(26);
  for (const l of s.hands[p]) hand[l.charCodeAt(0) - 65]++;
  for (const k in s.tiles) board[s.tiles[k].l.charCodeAt(0) - 65]++;
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = OFFS[i], b = lineEnd(i), len = b - a;
    if (len < 2 || len > 9) continue;
    let def = 0, ok = true, j = a;
    for (; j < b; j++) {
      const c = TEXT.charCodeAt(j) - 65;
      used[c]++;
      if (used[c] > hand[c]) { if (used[c] - hand[c] > board[c] || ++def > 2) { ok = false; j++; break; } }
    }
    for (let x = a; x < j; x++) used[TEXT.charCodeAt(x) - 65] = 0;
    if (ok) out.push(TEXT.slice(a, b));
  }
  if (G.CFG.lingua === "it") for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) if (!G.isWord(w) || out.indexOf(w) < 0) {
    const cnt = {}; let def = 0, ok = true;
    for (const ch of w) cnt[ch] = (cnt[ch] || 0) + 1;
    for (const ch in cnt) { const need = cnt[ch] - s.hands[p].filter(x => x === ch).length; if (need > 0) { const onb = Object.values(s.tiles).filter(t => t.l === ch).length; if (onb < need) ok = false; def += need; } }
    if (ok && def <= 2) out.push(w);
  }
  return out;
}

function genMoves(s, p) {
  const hand = {}; for (const l of s.hands[p]) hand[l] = (hand[l] || 0) + 1;
  const T = s.tiles, moves = [];
  for (const w0 of candidates(s, p)) {
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
        if (!bad && placed.length) moves.push(placed);
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
  if (!bp) {
    const net = G.network(s.words, p); let best = 0;
    for (const id in net) for (const k of s.words[id].cells) { const r = G.parse(k)[0]; const adv = p === "A" ? r : G.ROWS - 1 - r; if (adv > best) best = adv; }
    v += Math.min(best, G.STAFFA) * 2;
  }
  for (const id in s.words) { const w = s.words[id]; if (w.type === "difesa") v += (w.o === p ? 1 : -1) * Math.min(w.stab, 15) * 0.2; }
  for (const q of [p, e]) {
    const cols = {};
    for (const id in s.words) {
      const w = s.words[id]; if (w.type !== "difesa" || w.o !== q || w.stab < 3) continue;
      for (const k of w.cells) { const [r, c] = G.parse(k); if (G.zoneOf(r) !== q) continue; for (let d = -G.CFG.difesaLarga; d <= G.CFG.difesaLarga; d++) if (c + d >= 0 && c + d < G.COLS) cols[c + d] = 1; }
    }
    v += (q === p ? 1 : -1) * Object.keys(cols).length * 1.2;
  }
  const vow = s.hands[p].filter(l => "AEIOU".includes(l)).length;
  if (vow === 0 || vow > 5) v -= 3;
  return v;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function choose(s, p, level) {
  let moves = [];
  for (const pl of genMoves(s, p)) { const v = G.validate(s, p, pl, {}); if (v.ok) moves.push([pl, v]); }
  const cap = level === "facile" ? 60 : 300;
  if (moves.length > cap) moves = shuffle(moves).slice(0, cap);
  const scored = [];
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
      const r = G.play(s, p, pl, o, Math.random); if (!r.ok) continue;
      scored.push({ val: evalState(r.state, p) + Math.random() * 0.5, placed: pl, opts: o });
    }
  }
  if (!scored.length) {
    const heavy = s.hands[p].filter(l => G.VAL[l] >= 8);
    if (s.bag.length || s.focolare.length) return { kind: "alchimia", letters: heavy.length ? heavy : null };
    return { kind: "pass" };
  }
  scored.sort((a, b) => b.val - a.val);
  const pick = level === "facile" ? scored[Math.floor(Math.random() * Math.min(4, scored.length))] : scored[0];
  return { kind: "play", placed: pick.placed, opts: pick.opts };
}

self.onmessage = async e => {
  const { state, seat, level } = e.data;
  try {
    const ls = G.dizionariDi(state.cfg || {});
    await Promise.all(ls.map(loadDict));
    G.applyCfg(state.cfg || {});
    usaDict(ls);
    self.postMessage(choose(state, seat, level));
  } catch (err) {
    self.postMessage({ kind: "errore", message: String(err && err.message || err) });
  }
};
