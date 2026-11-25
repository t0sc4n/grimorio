# Server online: partite con più dizionari (cfg.dizionari); il computer usa il testo unito dei dizionari scelti.
# Da applicare dopo patch_lingua_server.py.
# uso: python patch_dizionari_server.py <cartella del server (online/)>
import sys, os
d = sys.argv[1]
def patch(fn, pairs):
    p = os.path.join(d, fn); s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (fn, s.count(a), a[:90])
        s = s.replace(a, b)
    open(p, "w", encoding="utf-8", newline="").write(s)

patch("server.js", [
 ('''      // lingua delle parole: italiano o inglese (in inglese solo s1); regole: s1 (predefinite) oppure v5f (classiche, con lessico)
      const lingua = body.lingua === "en" ? "en" : "it";
      const regole = lingua === "it" && body.regole === "v5f" ? "v5f" : "s1";''', '''      // dizionari: uno o più tra quelli noti (le richieste di prima mandano "lingua"); regole: s1 (predefinite)
      // oppure v5f (classiche, con lessico: solo con il solo dizionario italiano)
      const dizionari = G.dizionariDi({ dizionari: Array.isArray(body.dizionari) ? body.dizionari.slice(0, 8).map(String) : [body.lingua] });
      const regole = dizionari.join() === "it" && body.regole === "v5f" ? "v5f" : "s1";'''),
 ('''      G.applyCfg(Object.assign({}, G.PRESETS[regole], { hp, lingua }));''', '''      G.applyCfg(Object.assign({}, G.PRESETS[regole], { hp, dizionari }));'''),
])
patch("dict.js", [
 ('''function loadDict(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\\r/g, "").trim();''', '''function loadDict(file) { return fromText(fs.readFileSync(file, "utf8")); }
function fromText(t) {
  const text = t.replace(/\\r/g, "").trim();'''),
 ('''module.exports = { loadDict };''', '''module.exports = { loadDict, fromText };'''),
])
patch("ai-worker.js", [
 ('''const { loadDict } = require("./dict.js");''', '''const { loadDict, fromText } = require("./dict.js");'''),
 ('''// un dizionario (e un giocatore) per lingua della partita
const AIS = {};
for (const [l, file] of [["it", "parole.txt"], ["en", "words-en.txt"]]) {
  const dict = loadDict(path.join(__dirname, "public", file));
  G.setDict(dict, l);
  AIS[l] = createAI(G, dict);
}''', '''// un dizionario (e un giocatore) per lingua; per le partite con più dizionari, un giocatore sul loro testo unito
const AIS = {}, DIZ = {};
for (const [l, file] of [["it", "parole.txt"], ["en", "words-en.txt"]]) {
  const dict = DIZ[l] = loadDict(path.join(__dirname, "public", file));
  G.setDict(dict, l);
  AIS[l] = createAI(G, dict);
}
function aiFor(ls) {
  const k = ls.join("+");
  if (!AIS[k]) AIS[k] = createAI(G, fromText(G.unisciTesti(ls.map(l => DIZ[l].text))));
  return AIS[k];
}'''),
 ('''    const AI = AIS[G.CFG.lingua] || AIS.it;''', '''    const AI = aiFor(G.CFG.dizionari);'''),
])
print("ok")
