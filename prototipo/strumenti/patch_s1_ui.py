# Prototipo: regole s1 (semplificate) con pulsante "Attacca", Scudo di riga visibile, computer che attacca.
import sys, os
d = sys.argv[1]
def patch(fn, pairs):
    p = os.path.join(d, fn); s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (fn, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, "w", encoding="utf-8").write(s)

patch("index.html", [
# regole di partenza
('''const BASE = G.PRESETS.v5f; // v5e + lettura dal lato (campo girato per ciascun giocatore)''',
 '''const BASE = G.PRESETS.v5f; // v5e + lettura dal lato (campo girato per ciascun giocatore)
const REGOLE = { s1: { cfg: G.PRESETS.s1, nome: "Semplificate (s1)", pv: [40, 60, 80], def: 60 }, v5f: { cfg: G.PRESETS.v5f, nome: "Classiche (con lessico)", pv: [20, 25, 30], def: 30 } };'''),
('''  const hp = h("select", { id: "pv" }, [20, 25, 30].map(v => h("option", { value: v, selected: v === 30, text: v + " PV" })));''',
 '''  const hp = h("select", { id: "pv" });
  const fillHp = k => fill(hp, ...REGOLE[k].pv.map(v => h("option", { value: v, selected: v === REGOLE[k].def, text: v + " PV" })));
  const reg = h("select", { id: "regole", onchange: e => fillHp(e.target.value) }, Object.keys(REGOLE).map(k => h("option", { value: k, text: REGOLE[k].nome })));
  fillHp("s1");'''),
('''      h("label", { class: "field", for: "pv" }, "Punti Vita iniziali", hp),''',
 '''      h("label", { class: "field", for: "regole" }, "Regole", reg),
      h("label", { class: "field", for: "pv" }, "Punti Vita iniziali", hp),'''),
('''onclick: () => createGame(+hp.value, both.checked, vs.value), text: "Crea partita" })),''',
 '''onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value), text: "Crea partita" })),'''),
('''async function createGame(hp, both, vs) {
  const nome = myName();
  G.applyCfg(Object.assign({}, BASE, { hp }));''',
 '''async function createGame(hp, both, vs, regole) {
  const nome = myName();
  G.applyCfg(Object.assign({}, (REGOLE[regole] || REGOLE.v5f).cfg, { hp }));'''),
# scelta "Attacca"
('''function opts() { return { falo: ui.mode === "falo", consacra: ui.mode === "consacra" }; }''',
 '''function opts() { return { falo: ui.mode === "falo", consacra: ui.mode === "consacra", attacca: ui.mode === "attacca" }; }'''),
('''    actions.push(h("button", { class: "btn" + (ui.mode === "falo" ? " on" : ""), "aria-pressed": ui.mode === "falo",''',
 '''    if (s.cfg && s.cfg.attaccoLibero) actions.push(h("button", { class: "btn" + (ui.mode === "attacca" ? " on" : ""), "aria-pressed": ui.mode === "attacca", onclick: () => { ui.mode = ui.mode === "attacca" ? null : "attacca"; render(); }, text: "Attacca" }));
    actions.push(h("button", { class: "btn" + (ui.mode === "falo" ? " on" : ""), "aria-pressed": ui.mode === "falo",'''),
('''  if (v.type === "attacco") return { text: nm, tipo: EL[v.el] + " · potenza " + v.score };''',
 '''  if (v.type === "attacco") return { text: nm, tipo: (v.el ? EL[v.el] + " · " : "Attacco · ") + "potenza " + v.score + (s.cfg.attaccoConsuma ? " · la parola si consuma" : "") };
  if (s.cfg.attaccoLibero && v.type === "neutra") return { text: nm, tipo: "parola neutra · Stabilità " + v.base + (v.launches.length ? " · «Attacca» per lanciarla" : "") };'''),
('''    let tipo = w.type === "attacco" ? "Attacco " + EL[w.el] :''',
 '''    let tipo = w.type === "attacco" ? "Attacco " + (EL[w.el] || "") :'''),
# Scudo di riga visibile: le righe protette dalle difese consacrate
('''    const cls = ["cell", z === "M" ? (r === G.STAFFA ? "st" : "") : "z" + z];''',
 '''    const cls = ["cell", z === "M" ? (r === G.STAFFA ? "st" : "") : "z" + z];
    if (s.cfg && s.cfg.scudo === "riga" && scudi[r]) cls.push("scudo");'''),
('''  const rows = []; for (let i = 0; i < R; i++) rows.push(topSeat() === "A" ? i : R - 1 - i);''',
 '''  const rows = []; for (let i = 0; i < R; i++) rows.push(topSeat() === "A" ? i : R - 1 - i);
  const scudi = {}; // righe con uno Scudo: una difesa consacrata nel proprio Sanctum
  for (const id in s.words) { const w = s.words[id]; if (w.type !== "difesa") continue; for (const kk of w.cells) { const rr = G.parse(kk)[0]; if (G.zoneOf(rr) === w.o) scudi[rr] = 1; } }'''),
('''.cell.zA { background: var(--zA); } .cell.zB { background: var(--zB); }''',
 '''.cell.zA { background: var(--zA); } .cell.zB { background: var(--zB); }
.cell.scudo { background-image: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--terra) 22%, transparent) 6px 8px); }'''),
])

# regole in breve: testo diverso per s1
patch("index.html", [
('''  sheet("Regole in breve", [h("ul", null,''',
 '''  if (c.attaccoLibero) return sheet("Regole in breve (s1)", [h("ul", null,
    h("li", { text: "Ognuno vede il proprio Sanctum in basso. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte." }),
    h("li", { text: "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum." }),
    h("li", { text: "Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata). Con il Collegamento attivo puoi entrare nel Sanctum nemico, agganciandoti a una sua parola." }),
    h("li", { text: "Attacco: qualsiasi parola che ha una lettera nel Sanctum nemico può essere lanciata (tocca «Attacca»). La potenza è il punteggio della parola; l'incantesimo corre verso il bordo del Sanctum nemico e perde 1 per casella e 1 in più per ogni lettera. Dopo il lancio la parola si consuma: sparisce, tranne le lettere che reggono altre parole." }),
    h("li", { text: "Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è " + (c.consacrazione >= 1 ? c.consacrazione + " volte" : "metà del") + " il punteggio, massimo " + (c.maxConsacrate || 2) + " attive, e perde 1 a ogni tuo turno." }),
    h("li", { text: c.scudo === "riga" ? "Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano." : "Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto." }),
    h("li", { text: "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni " + (c.faloOgni || 3) + " turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine." }),
    h("li", { text: "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: cambi da 1 a 7 lettere invece di scrivere." }),
    h("li", { text: "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da " + c.hp + ")." }))]);
  sheet("Regole in breve", [h("ul", null,'''),
])

# computer: valuta anche il lancio di qualsiasi parola
patch("ai.js", [
('''    if (G.CFG.consacrazione && v.type === "neutra") {''',
 '''    if (G.CFG.attaccoLibero && v.type === "neutra" && v.launches.length) {
      const pv = G.previewLaunches(s, p, pl); let bk = null, bd = -1;
      for (const k in pv) if (pv[k] > bd) { bd = pv[k]; bk = k; }
      if (bk) opts.push({ attacca: true, launch: bk });
    }
    if (G.CFG.consacrazione && v.type === "neutra") {'''),
])
print("ok")
