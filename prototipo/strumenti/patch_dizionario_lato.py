# Schermo grande: durante la partita il dizionario sta fisso a lato della griglia.
# In s1 (senza lessico) il dizionario non mostra tipi elementali.
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)

# --- stile: due colonne sopra i 1000 px ---
rep('''.dz-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }''',
'''.dz-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (min-width: 1000px) {
  body.wide .wrap { max-width: 1060px; display: grid; grid-template-columns: minmax(0, 540px) minmax(0, 1fr); gap: 20px; align-items: start; }
  body.wide #side { display: flex; flex-direction: column; gap: 10px; position: sticky; top: 12px; max-height: calc(100vh - 24px); overflow: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
  body.wide #side h3 { margin: 0; font: 700 20px var(--font-display); color: var(--oro); }
  body.wide .solo-stretto { display: none; }
}''')
rep('''  <section id="game" hidden></section>
</div>''', '''  <section id="game" hidden></section>
  <aside id="side" hidden aria-label="Dizionario"></aside>
</div>''')

# --- esploratore: costruito una volta, usato nel foglio (telefono) o a lato (schermo grande) ---
i = s.index("function showExplorer() {"); j = s.index("function showRules() {")
s = s[:i] + '''const WIDE = window.matchMedia("(min-width: 1000px)");
let side = null; // dizionario a lato: { nodes, handIn, run, gameId, lastHand, lastCan, edited }
function myHandText() { const s = S(), me = mySeat(); return s && me ? s.hands[me].join("") : ""; }
function buildExplorer(lato) {
  if (!cur) G.applyCfg(BASE);
  const libero = !!(S() && S().cfg && S().cfg.attaccoLibero);
  const x = { edited: false };
  const handIn = h("input", { type: "text", id: lato ? "dzl-mano" : "dz-mano", value: myHandText(), placeholder: "es. AEIRMTS", autocomplete: "off", autocapitalize: "characters" });
  const extraIn = h("input", { type: "text", id: lato ? "dzl-extra" : "dz-extra", placeholder: "es. lettere sul campo", autocomplete: "off", autocapitalize: "characters" });
  const tipo = h("select", { id: lato ? "dzl-tipo" : "dz-tipo" },
    (libero ? [["tutte", "Tutte"]] : [["tutte", "Tutte"], ["attacco", "Attacchi"], ["fuoco", "Fuoco"], ["gelo", "Gelo"], ["acqua", "Acqua"], ["difesa", "Difese (Terra)"], ["neutra", "Neutre"]]).map(([v, t]) => h("option", { value: v, text: t })));
  const ordine = h("select", { id: lato ? "dzl-ordine" : "dz-ordine" }, h("option", { value: "punti", text: "Punteggio" }), h("option", { value: "lunghezza", text: "Lunghezza" }));
  const count = h("p", { class: "dz-count", "aria-live": "polite" });
  const list = h("div", { class: "dz-list" });
  let t = null;
  const run = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (dictState !== "pronto") {
        count.textContent = dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…";
        list.replaceChildren();
        if (dictState === "carico") t = setTimeout(run, 800);
        return;
      }
      const hand = cleanLetters(handIn.value), extra = cleanLetters(extraIn.value);
      const r = searchWords(hand, extra, tipo.value, ordine.value, 150);
      count.textContent = hand.length + extra.length < 2 ? "Scrivi almeno due lettere." : r.total ? r.total + " parole" + (r.total > 150 ? " (mostrate le prime 150)" : "") : "Nessuna parola con queste lettere.";
      const nomi = { fuoco: "Fuoco", gelo: "Gelo", acqua: "Acqua", difesa: "Difesa" };
      const canPlace = myTurn() && !ui.busy;
      list.replaceChildren(...r.list.map(w => { const kind = libero ? "neutra" : w.kind; return h(canPlace ? "button" : "span", { class: "dz-w " + kind, title: (libero ? "Parola" : (nomi[kind] || "Neutra")) + (canPlace ? ": tocca per posizionarla" : ""), onclick: canPlace ? () => startPlace(w.w) : null },
        w.w, h("small", { text: w.score }), w.extraUsed ? h("small", { class: "x", text: "+" + w.extraUsed }) : null); }));
    }, 200);
  };
  handIn.addEventListener("input", () => { x.edited = true; run(); });
  extraIn.addEventListener("input", run);
  [tipo, ordine].forEach(i => i.addEventListener("change", run));
  const myHand = myHandText();
  x.nodes = [
    h("p", { class: "sub", text: "Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R)." + (myHand ? " Nel tuo turno tocca una parola per posizionarla sul campo." : "") }),
    h("div", { class: "dz-form" },
      h("label", { class: "field full", for: handIn.id }, "Le tue lettere", handIn),
      h("label", { class: "field full", for: extraIn.id }, "Lettere in più", extraIn),
      libero ? null : h("label", { class: "field", for: tipo.id }, "Tipo", tipo),
      h("label", { class: "field" + (libero ? " full" : ""), for: ordine.id }, "Ordina per", ordine)),
    myHand ? h("button", { class: "btn small", onclick: () => { handIn.value = myHandText(); extraIn.value = ""; x.edited = false; run(); }, text: "Ripristina la mia mano" }) : null,
    libero ? null : h("div", { class: "dz-key" }, h("span", { style: "--c:var(--fuoco)", text: "Fuoco" }), h("span", { style: "--c:var(--gelo)", text: "Gelo" }), h("span", { style: "--c:var(--acqua)", text: "Acqua" }), h("span", { style: "--c:var(--terra)", text: "Difesa" }), h("span", { style: "--c:var(--line)", text: "Neutra" })),
    count, list].filter(Boolean);
  Object.assign(x, { handIn, run });
  return x;
}
function showExplorer() {
  if (WIDE.matches && cur && S()) { updateSide(); if (side) side.handIn.focus(); return; }
  const x = buildExplorer(false);
  sheet("Dizionario", x.nodes);
  x.run();
}
// a lato della griglia, su schermo grande: segue la mano e il turno senza perdere quello che hai scritto
function updateSide() {
  const el = document.getElementById("side");
  const show = WIDE.matches && !!cur && !!S();
  document.body.classList.toggle("wide", show);
  el.hidden = !show;
  if (!show) return;
  if (!side || side.gameId !== cur.id) {
    side = buildExplorer(true); side.gameId = cur.id; side.lastHand = myHandText(); side.lastCan = null;
    fill(el, h("h3", { text: "Dizionario" }), side.nodes);
  }
  const hand = myHandText(), can = myTurn() && !ui.busy;
  if (hand !== side.lastHand) { side.lastHand = hand; if (!side.edited) side.handIn.value = hand; side.lastCan = null; }
  if (can !== side.lastCan) { side.lastCan = can; side.run(); }
}
WIDE.addEventListener("change", () => render());

''' + s[j:]

# il pulsante "Esplora il dizionario" della partita serve solo quando il dizionario non è a lato
s = s.replace('''h("button", { class: "btn small", onclick: showExplorer, text: "Esplora il dizionario" })''',
              '''h("button", { class: "btn small solo-stretto", onclick: showExplorer, text: "Esplora il dizionario" })''')

rep('''  if (inGame) renderGame(); else renderLobby();
}''', '''  if (inGame) renderGame(); else renderLobby();
  updateSide();
}''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
