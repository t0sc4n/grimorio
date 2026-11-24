# "Suggerisci mossa": costa PV (3), il computer propone la mossa migliore. Il turno non passa.
# uso: python patch_suggerimento.py <cartella proto>   (engine.js + index.html del prototipo)
import sys, os
d = sys.argv[1]
def patch(fn, pairs):
    p = os.path.join(d, fn); s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (fn, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, "w", encoding="utf-8").write(s)

patch("engine.js", [
('''  function pass(s0, p, rng) {''',
 '''  // Suggerimento: costa PV (CFG.costoSuggerimento, 3 se assente) e resta nella cronaca; il turno non passa
  function suggerisci(s0, p) {
    if (s0.winner) return { ok: false, err: "La partita è finita." };
    if (s0.turn !== p) return { ok: false, err: "Non è il tuo turno." };
    var costo = CFG.costoSuggerimento || 3;
    if (s0.hp[p] <= costo) return { ok: false, err: "Ti servono più di " + costo + " PV per chiedere un suggerimento." };
    var s = clone(s0);
    s.hp[p] -= costo;
    s.suggerimenti = s.suggerimenti || { A: 0, B: 0 }; s.suggerimenti[p]++;
    addLog(s, name(p) + " chiede un suggerimento (−" + costo + " PV).");
    return { ok: true, state: s, costo: costo };
  }
  function pass(s0, p, rng) {'''),
('''alchimia: alchimia, pass: pass,''', '''alchimia: alchimia, pass: pass, suggerisci: suggerisci,'''),
])

patch("index.html", [
('''function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, passConfirm: false,''',
 '''function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, passConfirm: false, hintConfirm: false, hintLaunch: null,'''),
# il lancio suggerito viene usato direttamente, se è ancora possibile
('''    const pv = G.previewLaunches(s, p, placed());
    const keys = Object.keys(pv || {});
    if (keys.length === 1) return doPlay({ launch: keys[0] });''',
 '''    const pv = G.previewLaunches(s, p, placed());
    const keys = Object.keys(pv || {});
    if (ui.hintLaunch && keys.includes(ui.hintLaunch)) return doPlay({ launch: ui.hintLaunch });
    if (keys.length === 1) return doPlay({ launch: keys[0] });'''),
# pulsante
('''    actions.push(ui.passConfirm''',
 '''    const costo = (s.cfg && s.cfg.costoSuggerimento) || 3;
    actions.push(ui.hintConfirm
      ? h("button", { class: "btn small danger", onclick: () => { ui.hintConfirm = false; askHint(); }, text: "Sì, suggerisci (−" + costo + " PV)" })
      : h("button", { class: "btn small", disabled: hintBusy || s.hp[mySeat()] <= costo, title: "Il computer ti propone la mossa migliore: costa " + costo + " PV", onclick: () => { ui.hintConfirm = true; render(); setTimeout(() => { ui.hintConfirm = false; render(); }, 4000); }, text: hintBusy ? "Ci penso…" : "Suggerisci" }));
    actions.push(ui.passConfirm'''),
# funzioni
('''// ---------- parola intera dal dizionario (si trascina) ----------''',
 '''// ---------- suggerimento: costa PV, il computer propone la mossa migliore ----------
let hintBusy = false;
// SUGGERIMENTO-INIZIO (la versione online chiede al server)
async function askHint() {
  const s = S(), p = mySeat();
  const r = G.suggerisci(s, p); if (!r.ok) return toast(r.err, true);
  await commit(r.state);
  let w; try { w = new Worker("ai.js"); } catch (e) { toast("Il suggeritore non si avvia in questo browser.", true); return; }
  hintBusy = true; render();
  const id = cur.id, moveNo = S().moveNo;
  w.onmessage = ev => { w.terminate(); hintBusy = false; if (!cur || cur.id !== id || !S() || S().moveNo !== moveNo) { render(); return; } applyHint(ev.data); };
  w.onerror = () => { w.terminate(); hintBusy = false; toast("Il suggeritore non risponde.", true); render(); };
  w.postMessage({ state: JSON.parse(JSON.stringify(S())), seat: p, level: "normale" });
}
// SUGGERIMENTO-FINE
// mette la mossa suggerita sulla griglia: puoi confermarla o cambiarla
function applyHint(m) {
  const s = S(), me = mySeat(), hand = s.hands[me];
  Object.assign(ui, { pending: [], place: null, mode: null, alch: null, sel: null, launch: null, hintLaunch: null, passConfirm: false, hintConfirm: false });
  if (!m || m.kind === "errore") { toast("Il suggeritore ha avuto un problema" + (m && m.message ? ": " + m.message : "."), true); render(); return; }
  if (m.kind === "play") {
    const used = new Set();
    for (const t of m.placed) { const hi = hand.findIndex((l, i) => l === t.l && !used.has(i)); used.add(hi); ui.pending.push({ r: t.r, c: t.c, l: t.l, hi }); }
    const o = m.opts || {};
    ui.mode = o.attacca ? "attacca" : o.falo ? "falo" : o.consacra ? "consacra" : null;
    if (o.launch) ui.hintLaunch = o.launch;
    const v = G.validate(s, me, placed(), opts());
    const come = ui.mode === "attacca" || (v.ok && v.type === "attacco") ? ", da lanciare" : ui.mode === "falo" ? ", come Grande Falò" : ui.mode === "consacra" ? ", da consacrare" : "";
    toast("Suggerimento: " + (v.ok ? v.main.text : "una parola") + come + ". Tocca «Conferma», oppure cambiala.");
  } else if (m.kind === "alchimia") {
    const used = new Set(), lett = m.letters || hand;
    ui.alch = lett.map(l => { const i = hand.findIndex((x, j) => x === l && !used.has(j)); used.add(i); return i; }).filter(i => i >= 0);
    toast("Suggerimento: nessuna buona parola, usa l'Alchimia e cambia le lettere evidenziate.");
  } else toast("Suggerimento: non c'è una mossa utile, passa il turno.");
  render();
}

// ---------- parola intera dal dizionario (si trascina) ----------'''),
])
print("ok")
