# Prototipo: una partita può usare più dizionari insieme (caselle da spuntare); con più dizionari la Sacca è mista.
# Sostituisce la scelta di una sola "lingua delle parole" (patch_lingua_ui.py) con cfg.dizionari = ["it", "en", …].
# uso: python patch_dizionari_multipli.py <index.html del prototipo>
import sys, json
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
assert "function dizScelti()" not in s, "già fatto"
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

NUOVI_EN = {
  "Dizionari della partita": "Game dictionaries",
  "Una parola vale se è in almeno uno dei dizionari scelti. Con più dizionari la Sacca è mista: 26 lettere.": "A word counts if it is in at least one of the chosen dictionaries. With more than one dictionary the Bag is mixed: 26 letters.",
  "Con le parole inglesi ci sono solo le regole semplificate.": "With English words only the simplified rules are available.",
  "italiano": "Italian", "inglese": "English", " o ": " or ",
  "Dizionario: {l}": "Dictionary: {l}",
  "A turno scrivi una parola in {l} sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.": "Take turns writing a word in {l} on the grid, crossword-style: every word formed must be valid. On your first turn you write only in your Sanctum.",
  " Con più dizionari vale una parola di uno qualsiasi, e la Sacca è mista: 26 lettere, con quantità e valori nella media delle lingue scelte.": " With more than one dictionary a word from any of them counts, and the Bag is mixed: 26 letters, with quantities and values averaged over the chosen languages.",
}
# tabella EN: aggiunte
i = s.index("const EN = ") + len("const EN = "); j = s.index("\n};", i) + 2
EN = json.loads(s[i:j]); EN.update(NUOVI_EN)
s = s[:i] + json.dumps(EN, ensure_ascii=False, indent=0).replace("\n", "\n  ").replace("\n  }", "\n}") + s[j:]

# ---------- dizionari: uno o più, il testo unito serve all'esploratore ----------
rep('''// un dizionario per lingua, caricato solo quando serve; dictState / DICT_TEXT / DICT_OFFS sono quelli della lingua in uso
const DIZ = { it: { file: "parole.txt", parole: 750000 }, en: { file: "words-en.txt", parole: 140000 } };
let dictState = "carico", dictLang = "it";''', '''// un dizionario per lingua, caricato solo quando serve; dictState / DICT_TEXT / DICT_OFFS sono quelli della partita in uso
// (con più dizionari, DICT_TEXT è il loro testo unito)
const DIZ = { it: { file: "parole.txt", parole: 750000, nome: "italiano" }, en: { file: "words-en.txt", parole: 140000, nome: "inglese" } };
const DIZ_UNITI = {};
let dictState = "carico", dictLang = "it", dictLangs = ["it"];''')
rep('''function usaDiz(l) {
  const d = DIZ[l] ? DIZ[l] : DIZ.it;
  dictLang = DIZ[l] ? l : "it";
  dictState = d.stato || "carico"; DICT_TEXT = d.text || ""; DICT_OFFS = d.offs || null;
  if (!d.stato) loadDict(dictLang);
}''', '''function usaDiz(ls) {
  ls = G.dizionariDi({ dizionari: ls });
  dictLangs = ls; dictLang = ls.join("+");
  ls.forEach(l => { if (!DIZ[l].stato) loadDict(l); });
  const st = ls.map(l => DIZ[l].stato);
  dictState = st.includes("errore") ? "errore" : st.every(x => x === "pronto") ? "pronto" : "carico";
  DICT_TEXT = ""; DICT_OFFS = null;
  if (dictState !== "pronto") return;
  if (ls.length === 1) { DICT_TEXT = DIZ[ls[0]].text; DICT_OFFS = DIZ[ls[0]].offs; return; }
  if (!DIZ_UNITI[dictLang]) { const dz = makeDict(G.unisciTesti(ls.map(l => DIZ[l].text))); DIZ_UNITI[dictLang] = { text: dz.text, offs: dz.offs }; }
  DICT_TEXT = DIZ_UNITI[dictLang].text; DICT_OFFS = DIZ_UNITI[dictLang].offs;
}
// nomi dei dizionari di una cfg, nella lingua dell'interfaccia: "italiano o inglese"
function nomiDiz(c, sep) { return G.dizionariDi(c || {}).map(l => tr(DIZ[l].nome)).join(sep || tr(" o ")); }''')
rep('''  if (dictLang === l) usaDiz(l);
  render();
}
function linguaParole() { const l = store.get("grimorio-lingua-parole", LANG); return DIZ[l] ? l : "it"; }''', '''  if (dictLangs.includes(l)) usaDiz(dictLangs);
  render();
}
// dizionari scelti per le nuove partite (salvati sul dispositivo; prima era una sola lingua)
function dizScelti() {
  let l = store.get("grimorio-lingua-parole", [LANG]);
  if (!Array.isArray(l)) l = [l];
  return G.dizionariDi({ dizionari: l });
}''')
rep('''  usaDiz(linguaParole()); render();''', '''  usaDiz(dizScelti()); render();''')
rep('''  usaDiz(linguaParole());
''', '''  usaDiz(dizScelti());
''')
rep('''  usaDiz((s.cfg && s.cfg.lingua) || "it");''', '''  usaDiz(G.dizionariDi(s.cfg || {}));''')
rep('''  return linguaParole() === "en" ? Object.assign({}, c, { lingua: "en" }) : c;''', '''  const d = dizScelti();
  return d.join() !== "it" ? Object.assign({}, c, { dizionari: d }) : c;''')

# ---------- elenco partite: caselle dei dizionari ----------
rep('''  const lw = h("select", { id: "lingua-parole" }, Object.keys(LINGUE_UI).map(l => h("option", { value: l, lang: l, selected: l === linguaParole(), text: LINGUE_UI[l] })));
  const fillReg = () => { fill(reg, ...(lw.value === "en" ? ["s1"] : Object.keys(REGOLE)).map(k => h("option", { value: k, text: tr(REGOLE[k].nome) }))); fillHp(reg.value); };
  lw.addEventListener("change", () => { store.set("grimorio-lingua-parole", lw.value); fillReg(); usaDiz(lw.value); });
  fillReg();''', '''  // dizionari della partita: uno o più; le regole classiche (con lessico) solo con il solo italiano
  const scelti = dizScelti();
  const dzBox = Object.keys(DIZ).map(l => h("input", { type: "checkbox", id: "diz-" + l, value: l, checked: scelti.includes(l) }));
  const dizSel = () => dzBox.filter(x => x.checked).map(x => x.value);
  const dzNota = h("p", { class: "note" });
  const fillReg = () => {
    const soloIt = dizSel().join() === "it";
    fill(reg, ...(soloIt ? Object.keys(REGOLE) : ["s1"]).map(k => h("option", { value: k, text: tr(REGOLE[k].nome) }))); fillHp(reg.value);
    dzNota.textContent = dizSel().length > 1 ? tr("Una parola vale se è in almeno uno dei dizionari scelti. Con più dizionari la Sacca è mista: 26 lettere.") : soloIt ? "" : tr("Con le parole inglesi ci sono solo le regole semplificate.");
  };
  dzBox.forEach(x => x.addEventListener("change", () => { if (!dizSel().length) x.checked = true; store.set("grimorio-lingua-parole", dizSel()); fillReg(); usaDiz(dizSel()); }));
  fillReg();''')
rep('''      h("label", { class: "field", for: "lingua-parole" }, tr("Lingua delle parole"), lw),''', '''      h("div", { class: "field", role: "group", "aria-labelledby": "diz-titolo" }, h("span", { id: "diz-titolo", text: tr("Dizionari della partita") }),
        h("div", { class: "dzsel" }, dzBox.map(x => h("label", { class: "check", for: x.id }, x, h("span", { lang: x.value, text: LINGUE_UI[x.value] })))), dzNota),''')
rep('''createGame(+hp.value, both.checked, vs.value, reg.value, lw.value)''', '''createGame(+hp.value, both.checked, vs.value, reg.value, dizSel())''')
rep('''  if (lingua === "en") regole = "s1";
  G.applyCfg(Object.assign({}, (REGOLE[regole] || REGOLE.v5f).cfg, { hp, lingua: lingua === "en" ? "en" : "it" }));''', '''  dizionari = G.dizionariDi({ dizionari });
  if (dizionari.join() !== "it") regole = "s1";
  G.applyCfg(Object.assign({}, (REGOLE[regole] || REGOLE.v5f).cfg, { hp, dizionari }));''')
rep('''async function createGame(hp, both, vs, regole, lingua) {''', '''async function createGame(hp, both, vs, regole, dizionari) {''')
rep('''.langsw {''','''.dzsel { display: flex; gap: 6px 18px; flex-wrap: wrap; margin-top: 6px; }
.dzsel .check { margin: 0; color: var(--text); }
.langsw {''')

rep('''label.field { display: flex;''', '''label.field, div.field { display: flex;''')

# ---------- regole e titoli ----------
i = s.index("  const scrivi = c.lingua === \"en\""); j = s.index("\n", i)
s = s[:i] + '''  const scrivi = tr("A turno scrivi una parola in {l} sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.", { l: nomiDiz(c) }) + (G.dizionariDi(c).length > 1 ? tr(" Con più dizionari vale una parola di uno qualsiasi, e la Sacca è mista: 26 lettere, con quantità e valori nella media delle lingue scelte.") : "");''' + s[j:]
rep('''tr(G.CFG.lingua === "en" ? tr("Dizionario inglese") : tr("Dizionario italiano"))''', '''tr("Dizionario: {l}", { l: nomiDiz(G.CFG, " + ") })''', 2)
rep('''(DIZ[dictLang] || DIZ.it).parole.toLocaleString(LANG)''', '''dictLangs.reduce((n, l) => n + DIZ[l].parole, 0).toLocaleString(LANG)''')
assert "linguaParole" not in s and "lw." not in s
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
