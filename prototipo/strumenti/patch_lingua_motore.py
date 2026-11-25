# Motore: lingua della partita (cfg.lingua "it" | "en"), con dizionario, valori e Sacca per lingua; preset s1en.
# uso: python patch_lingua_motore.py <engine.js>
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
assert "LINGUE" not in s, "già fatto"
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)

rep('''  var VAL = { A: 1, E: 1, I: 1, O: 1, C: 2, R: 2, S: 2, T: 2, U: 3, L: 3, M: 3, N: 3, P: 4, D: 4, F: 4, G: 4, B: 4, V: 4, H: 8, Q: 10, Z: 10 };
  var BAG = { A: 12, E: 10, I: 8, O: 8, C: 3, R: 3, S: 2, T: 2, U: 5, L: 4, M: 4, N: 4, P: 4, D: 3, F: 3, G: 3, B: 2, V: 3, H: 3, Q: 2, Z: 2 };
''', '''  /* Lingua della partita (cfg.lingua): ognuna ha il suo dizionario, i valori delle lettere (VAL) e la Sacca (BAG, 90 tessere).
     La Sacca inglese è ricavata dalle frequenze del dizionario ENABLE (strumenti/sacca_inglese.js) e ritoccata a mano. */
  var LINGUE = {
    it: { VAL: { A: 1, E: 1, I: 1, O: 1, C: 2, R: 2, S: 2, T: 2, U: 3, L: 3, M: 3, N: 3, P: 4, D: 4, F: 4, G: 4, B: 4, V: 4, H: 8, Q: 10, Z: 10 },
          BAG: { A: 12, E: 10, I: 8, O: 8, C: 3, R: 3, S: 2, T: 2, U: 5, L: 4, M: 4, N: 4, P: 4, D: 3, F: 3, G: 3, B: 2, V: 3, H: 3, Q: 2, Z: 2 } },
    en: { VAL: { E: 1, A: 1, I: 1, O: 1, S: 2, R: 2, T: 2, N: 2, L: 3, D: 3, U: 3, C: 3, M: 3, P: 4, G: 4, H: 4, B: 4, Y: 4, F: 4, W: 4, K: 5, V: 5, X: 8, Z: 8, J: 8, Q: 10 },
          BAG: { E: 11, A: 8, I: 7, O: 7, U: 3, S: 4, R: 6, T: 6, N: 6, L: 4, D: 4, C: 2, P: 2, G: 2, M: 2, H: 2, B: 2, Y: 2, F: 2, W: 2, K: 1, V: 1, Z: 1, X: 1, J: 1, Q: 1 } }
  };
  var VAL = {}, BAG = {};  // della lingua attiva: applyCfg ne cambia il contenuto (gli oggetti esportati restano gli stessi)
''')
rep('''    attaccoLibero: false, attaccoConsuma: false };''', '''    attaccoLibero: false, attaccoConsuma: false, lingua: "it" };''')
rep('''    ["attaccoLibero", "attaccoConsuma", "passo", "scudo"].forEach(function (k) { if (!(k in c)) CFG[k] = false; });
''', '''    ["attaccoLibero", "attaccoConsuma", "passo", "scudo"].forEach(function (k) { if (!(k in c)) CFG[k] = false; });
    if (!LINGUE[c.lingua]) CFG.lingua = "it";  // partite salvate prima delle lingue: italiano
    var L = LINGUE[CFG.lingua];
    [[VAL, L.VAL], [BAG, L.BAG]].forEach(function (x) { Object.keys(x[0]).forEach(function (k) { delete x[0][k]; }); Object.assign(x[0], x[1]); });
    DICT = DICTS[CFG.lingua] || null;
''')
rep('''  var DICT = null;  // Set di parole valide
''', '''  var DICTS = {};    // lingua -> insieme di parole valide (con .has)
  var DICT = null;  // quello della lingua attiva
''')
rep('''          if (i > 0 && !(DICT && DICT.has(f))) return;''', '''          if (i > 0 && !(DICTS.it && DICTS.it.has(f))) return;''')
rep('''  function setDict(set) { DICT = set; buildClass(); }''', '''  function setDict(set, lingua) {
    lingua = lingua || "it"; DICTS[lingua] = set;
    if (lingua === CFG.lingua) DICT = set;
    if (lingua === "it") buildClass();
  }''')
rep('''  function isWord(w) { return !!CLASS[w] || !!(DICT && DICT.has(w)); }
  function classify(w) {
    if (CLASS[w]) return CLASS[w];''', '''  // il lessico elementale (CLASS, radici) esiste solo in italiano
  function isWord(w) { return (CFG.lingua === "it" && !!CLASS[w]) || !!(DICT && DICT.has(w)); }
  function classify(w) {
    if (CFG.lingua !== "it") return { type: "neutra", el: null };
    if (CLASS[w]) return CLASS[w];''')
rep('''    s1r: {''', '''    // s1 in inglese: stesse regole, dizionario ENABLE e Sacca inglese
    s1en: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga", lingua: "en" },
    s1r: {''')
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
