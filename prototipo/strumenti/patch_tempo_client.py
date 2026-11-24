# Pagina online: tempo rimasto per il turno (48 h tra due persone).
import sys, os
p = os.path.join(sys.argv[1], "app.js")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a))
    s = s.replace(a, b)

rep('''function gameItem(id, d) {''', '''// tempo rimasto per il turno, in parole ("31 ore", "40 minuti")
function timeLeft(s) {
  if (!s || !s.deadline || s.winner) return "";
  const ms = s.deadline - Date.now();
  if (ms <= 0) return "tempo scaduto";
  const h = Math.floor(ms / 3600e3);
  return h >= 1 ? (h === 1 ? "1 ora" : h + " ore") : Math.max(1, Math.ceil(ms / 60e3)) + " minuti";
}
function clockText(s, mine) {
  const t = timeLeft(s); if (!t) return "";
  return t === "tempo scaduto" ? "Tempo scaduto: il turno sta per passare." : (mine ? "Hai ancora " + t + " per giocare, poi il turno passa." : "Ha ancora " + t + " per giocare.");
}
setInterval(() => { const el = document.getElementById("orologio"); if (el && cur && games[cur.id]) el.textContent = clockText(games[cur.id].s, myTurn()); }, 30000);
function gameItem(id, d) {''')

rep('''    h("span", { class: "st", text: st + " · mossa " + s.moveNo }));''',
    '''    h("span", { class: "st", text: st + (timeLeft(s) ? " · " + timeLeft(s) : "") + " · mossa " + s.moveNo }));''')

rep('''    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null),''',
    '''    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null, me && clockText(s, myTurn()) ? h("small", { id: "orologio", text: clockText(s, myTurn()) }) : null),''')

rep('''    h("li", { text: "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: cambi da 1 a 7 lettere invece di scrivere." }),''',
    '''    h("li", { text: "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: cambi da 1 a 7 lettere invece di scrivere." }),
    h("li", { text: "A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita." }),''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
