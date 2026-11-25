# Giocatore automatico del prototipo (ai.js): un dizionario per lingua, scelto da state.cfg.lingua.
# uso: python patch_lingua_ai.py <ai.js>
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
assert "FILE_DIZ" not in s, "già fatto"
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
rep('''let TEXT = null, OFFS = null, N = 0, loading = null;

function loadDict() {
  if (loading) return loading;
  loading = fetch("parole.txt").then(r => { if (!r.ok) throw new Error("dizionario " + r.status); return r.text(); }).then(t => {
    TEXT = t.replace(/\\r/g, "").trim();
    const o = [0];
    for (let i = 0; i < TEXT.length; i++) if (TEXT.charCodeAt(i) === 10) o.push(i + 1);
    OFFS = Uint32Array.from(o); N = OFFS.length;
    G.setDict({ has: w => { let lo = 0, hi = N - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = line(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } });
  });
  return loading;
}''', '''// un dizionario per lingua della partita; TEXT / OFFS / N sono quelli della partita in corso
const FILE_DIZ = { it: "parole.txt", en: "words-en.txt" };
const DIZ = {};
let TEXT = null, OFFS = null, N = 0;

function loadDict(l) {
  if (DIZ[l]) return DIZ[l].loading;
  const d = DIZ[l] = {};
  d.loading = fetch(FILE_DIZ[l]).then(r => { if (!r.ok) throw new Error("dizionario " + r.status); return r.text(); }).then(t => {
    const text = t.replace(/\\r/g, "").trim(), o = [0];
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) o.push(i + 1);
    const offs = Uint32Array.from(o), n = offs.length;
    const riga = i => text.slice(offs[i], i + 1 < n ? offs[i + 1] - 1 : text.length);
    Object.assign(d, { text, offs, n });
    G.setDict({ has: w => { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = riga(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } }, l);
  });
  return d.loading;
}
function usaDict(l) { const d = DIZ[l]; TEXT = d.text; OFFS = d.offs; N = d.n; }''')
rep('''  for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) if (!G.isWord(w) || out.indexOf(w) < 0) {''',
    '''  if (G.CFG.lingua === "it") for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) if (!G.isWord(w) || out.indexOf(w) < 0) {''')
rep('''    await loadDict();
    G.applyCfg(state.cfg || {});''', '''    const l = state.cfg && FILE_DIZ[state.cfg.lingua] ? state.cfg.lingua : "it";
    await loadDict(l);
    G.applyCfg(state.cfg || {});
    usaDict(l);''')
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
