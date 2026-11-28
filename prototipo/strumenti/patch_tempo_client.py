# Pagina online: tempo rimasto per il turno (48 h tra due persone).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lingua_comune import avvolgi, chiavi
p = os.path.join(sys.argv[1], "app.js")
s = open(p, encoding="utf-8").read()
K = chiavi(s)

def rep(a, b):
    # i testi fissi sono tr("...") (vedi lingua_comune.py)
    global s
    a, b = avvolgi(a, K), avvolgi(b, K)
    assert s.count(a) == 1, (a[:90], s.count(a))
    s = s.replace(a, b)

rep('''function gameItem(id, d) {''', '''// tempo rimasto per il turno, in parole ("31 ore", "40 minuti"); "" se non c'è orologio, null se è scaduto
function timeLeft(s) {
  if (!s || !s.deadline || s.winner) return "";
  const ms = s.deadline - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600e3);
  return h >= 1 ? (h === 1 ? tr("1 ora") : tr("{n} ore", { n: h })) : tr("{n} minuti", { n: Math.max(1, Math.ceil(ms / 60e3)) });
}
function clockText(s, mine) {
  const t = timeLeft(s); if (t === "") return "";
  return t === null ? tr("Tempo scaduto: il turno sta per passare.") : tr(mine ? "Hai ancora {t} per giocare, poi il turno passa." : "Ha ancora {t} per giocare.", { t });
}
setInterval(() => { const el = document.getElementById("orologio"); if (el && cur && games[cur.id]) el.textContent = clockText(games[cur.id].s, myTurn()); }, 30000);
function gameItem(id, d) {''')

rep('''    h("span", { class: "st", text: st + " · " + tr("mossa {n}", { n: s.moveNo }) + " · " + ((s.cfg && s.cfg.lingua) || "it").toUpperCase() }));''',
    '''    h("span", { class: "st", text: st + (timeLeft(s) !== "" ? " · " + (timeLeft(s) || tr("tempo scaduto")) : "") + " · " + tr("mossa {n}", { n: s.moveNo }) + " · " + ((s.cfg && s.cfg.lingua) || "it").toUpperCase() }));''')

rep('''    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null),''',
    '''    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null, me && clockText(s, myTurn()) ? h("small", { id: "orologio", text: clockText(s, myTurn()) }) : null),''')

rep('''    h("li", { text: "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7." }),''',
    '''    h("li", { text: "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7." }),
    h("li", { text: "A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita." }),''')
# anche nelle regole semplificate (s1)
rep('''    h("li", { text: "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7." }),''',
    '''    h("li", { text: "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7." }),
    h("li", { text: "A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita." }),''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
