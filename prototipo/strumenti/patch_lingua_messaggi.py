# Motore: messaggi in due lingue.
# - errori: G.tr(chiave, parametri) nella lingua dell'interfaccia (G.setLinguaUI("it" | "en"));
# - cronaca: voci strutturate {k, a} (a.p / a.q = seggio "A" | "B"), trasformate in testo da G.testoLog(voce, nomi).
#   Le voci vecchie, salvate come stringa, restano com'erano.
# uso: python patch_lingua_messaggi.py <engine.js>
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
assert "function tr(" not in s, "già fatto"
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80])
    s = s.replace(a, b)

MSG = r'''
  /* ---------- messaggi (errori e cronaca) nelle lingue dell'interfaccia ---------- */
  var LINGUA_UI = "it";
  var MSG = {
    it: {
      posaLettera: "Posa almeno una lettera.", fuoriCampo: "Fuori dal campo.", occupata: "Casella già occupata.",
      noLettera: "Lettera non presente nel Grimorio.", rigaColonna: "Le lettere vanno in una sola riga o colonna.",
      continua: "Le lettere devono formare una parola continua.", dueLettere: "Una parola ha almeno due lettere.",
      noDiz: "{w} non è nel dizionario.", noDizCroce: "Si forma anche {w}, che non è nel dizionario.",
      primoTurno: "Al primo turno si scrive solo nel proprio Sanctum.",
      ponteMezzo: "Nella Terra di Mezzo la parola deve collegarsi al tuo ponte.",
      serveColl: "Per entrare nel Sanctum nemico serve il Collegamento Magico attivo.",
      aggancio: "Nel Sanctum nemico devi agganciarti a una parola dell'avversario.",
      faloAttesa: "Il Falò si può usare una volta ogni {n} turni (di nuovo tra {m}).",
      faloBersaglio: "Per il Falò la parola deve allungare o incrociare una parola nella Terra di Mezzo o nel Sanctum nemico.",
      faloColl: "Per bruciare nel Sanctum nemico serve il Collegamento Magico attivo.",
      soloElementali: "In questa partita attaccano solo le parole elementali.",
      lancioMisto: "Una parola lanciata non può essere anche Falò o difesa.",
      lancioSanctum: "Per attaccare la parola deve avere una lettera in un Sanctum.",
      noConsacr: "La Consacrazione non è attiva in questa partita.", consNeutre: "Si consacrano solo parole neutre.",
      consSanctum: "Si consacrano solo parole scritte tutte nel proprio Sanctum.",
      consMax: "Hai già {n} difese consacrate attive (massimo {m}).",
      finita: "La partita è finita.", noTurno: "Non è il tuo turno.", sceltaAlch: "Scegli almeno una lettera da cambiare.",
      suggPV: "Ti servono più di {n} PV per chiedere un suggerimento.",
      saccaVuota: "La Sacca era vuota: il Focolare è stato rimescolato.", vittoria: "Vince {p}!",
      spengono: "Si spengono: {l}.", falo: "{p} scatena un Grande Falò con {w}: brucia {l}.",
      lancio: function (a) {
        return a.p + " lancia " + a.w + " (" + (a.el ? a.el + ", " : "") + "potenza " + a.n + ")" +
          (a.d ? ": " + a.d + " danni." : ": l'incantesimo si dissolve.") + (a.c ? " La parola si consuma." : "");
      },
      disintegrato: "{w} viene disintegrato.", consacra: "{p} consacra {w} come difesa (resistenza {n}).",
      bloccato: "{p} scrive {w}, ma le difese nemiche impediscono il lancio.",
      evoca: "{p} evoca {w} nella Terra di Mezzo (i Cataclismi non sono ancora attivi).",
      erige: "{p} erige {w} (resistenza {n}).", scrive: "{p} scrive {w}.",
      tempesta: "Tempesta Arcana! Estratta la {l}: forza {n}.", crollano: "Crollano: {l}.",
      alchimia: "{p} usa l'Alchimia e cambia {n} lettere.", alchimiaTutte: "{p} usa l'Alchimia e cambia tutte le lettere.",
      suggerimento: "{p} chiede un suggerimento (−{n} PV).", passa: "{p} passa il turno.",
      suggFallito: "Suggerimento non riuscito: {n} PV restituiti.", abbandona: "{p} abbandona la partita. Vince {q}.",
      tempoScaduto: "Tempo scaduto per {p}: il turno passa.",
      tempoPerso: "{p} ha lasciato scadere il tempo {n} volte di fila. Vince {q}.",
      A: "Mago Blu", B: "Mago Rosso", fuoco: "fuoco", gelo: "gelo", acqua: "acqua", terra: "terra"
    },
    en: {
      posaLettera: "Place at least one letter.", fuoriCampo: "Off the board.", occupata: "That square is already taken.",
      noLettera: "That letter is not in your Grimoire.", rigaColonna: "The letters must be in a single row or column.",
      continua: "The letters must form one continuous word.", dueLettere: "A word has at least two letters.",
      noDiz: "{w} is not in the dictionary.", noDizCroce: "It also forms {w}, which is not in the dictionary.",
      primoTurno: "On your first turn you can only write in your own Sanctum.",
      ponteMezzo: "In the Midlands the word must connect to your bridge.",
      serveColl: "To enter the enemy Sanctum you need an active Magic Link.",
      aggancio: "In the enemy Sanctum you must hook onto one of your opponent's words.",
      faloAttesa: "The Bonfire can be used once every {n} turns (again in {m}).",
      faloBersaglio: "For a Bonfire the word must extend or cross a word in the Midlands or in the enemy Sanctum.",
      faloColl: "To burn in the enemy Sanctum you need an active Magic Link.",
      soloElementali: "In this game only elemental words can attack.",
      lancioMisto: "A launched word cannot also be a Bonfire or a defence.",
      lancioSanctum: "To attack, the word must have a letter in a Sanctum.",
      noConsacr: "Consecration is not active in this game.", consNeutre: "Only neutral words can be consecrated.",
      consSanctum: "Only words written entirely in your own Sanctum can be consecrated.",
      consMax: "You already have {n} active consecrated defences (maximum {m}).",
      finita: "The game is over.", noTurno: "It is not your turn.", sceltaAlch: "Choose at least one letter to change.",
      suggPV: "You need more than {n} HP to ask for a hint.",
      saccaVuota: "The Bag was empty: the Hearth has been reshuffled.", vittoria: "{p} wins!",
      spengono: "Fading away: {l}.", falo: "{p} unleashes a Great Bonfire with {w}: it burns {l}.",
      lancio: function (a) {
        return a.p + " launches " + a.w + " (" + (a.el ? a.el + ", " : "") + "power " + a.n + ")" +
          (a.d ? ": " + a.d + " damage." : ": the spell fizzles out.") + (a.c ? " The word is consumed." : "");
      },
      disintegrato: "{w} is disintegrated.", consacra: "{p} consecrates {w} as a defence (resistance {n}).",
      bloccato: "{p} writes {w}, but the enemy defences block the launch.",
      evoca: "{p} summons {w} in the Midlands (Cataclysms are not active yet).",
      erige: "{p} raises {w} (resistance {n}).", scrive: "{p} writes {w}.",
      tempesta: "Arcane Storm! The letter {l} is drawn: force {n}.", crollano: "Collapsing: {l}.",
      alchimia: "{p} uses Alchemy and changes {n} letters.", alchimiaTutte: "{p} uses Alchemy and changes all letters.",
      suggerimento: "{p} asks for a hint (−{n} HP).", passa: "{p} passes.",
      suggFallito: "The hint failed: {n} HP refunded.", abbandona: "{p} leaves the game. {q} wins.",
      tempoScaduto: "Time is up for {p}: the turn passes.",
      tempoPerso: "{p} let the time run out {n} times in a row. {q} wins.",
      A: "Blue Wizard", B: "Red Wizard", fuoco: "fire", gelo: "frost", acqua: "water", terra: "earth"
    }
  };
  function setLinguaUI(l) { if (MSG[l]) LINGUA_UI = l; if (api) api.LINGUA_UI = LINGUA_UI; }
  function tr(k, a, lingua) {
    var M = MSG[lingua || LINGUA_UI] || MSG.it, t = M[k] !== undefined ? M[k] : MSG.it[k];
    if (t === undefined) return k;
    a = a || {};
    if (typeof t === "function") return t(a);
    return t.replace(/\{(\w+)\}/g, function (_, x) { var v = a[x]; return Array.isArray(v) ? v.join(", ") : v === undefined ? "" : String(v); });
  }
  // voce di cronaca -> testo; nomi = {A, B} facoltativo (i nomi dei giocatori), altrimenti Mago Blu / Mago Rosso
  function testoLog(m, nomi, lingua) {
    if (typeof m === "string") return m;
    var a = {}, src = m.a || {};
    Object.keys(src).forEach(function (k) { a[k] = src[k]; });
    ["p", "q"].forEach(function (k) { if (a[k] === "A" || a[k] === "B") a[k] = (nomi && nomi[a[k]]) || tr(a[k], null, lingua); });
    if (a.el) a.el = tr(a.el, null, lingua);
    return tr(m.k, a, lingua);
  }
  function E(k, a) { return { ok: false, err: tr(k, a) }; }
'''
rep("  function addLog(s, msg) { s.log.push(msg); if (s.log.length > 40) s.log = s.log.slice(-40); }",
    "  function addLog(s, k, a) { s.log.push(a ? { k: k, a: a } : { k: k }); if (s.log.length > 40) s.log = s.log.slice(-40); }" + MSG)

# errori
E = [
 ('{ ok: false, err: "Posa almeno una lettera." }', 'E("posaLettera")'),
 ('{ ok: false, err: "Fuori dal campo." }', 'E("fuoriCampo")'),
 ('{ ok: false, err: "Casella già occupata." }', 'E("occupata")'),
 ('{ ok: false, err: "Le lettere vanno in una sola riga o colonna." }', 'E("rigaColonna")'),
 ('{ ok: false, err: "Le lettere devono formare una parola continua." }', 'E("continua")'),
 ('{ ok: false, err: "Una parola ha almeno due lettere." }', 'E("dueLettere")'),
 ('{ ok: false, err: main.text + " non è nel dizionario." }', 'E("noDiz", { w: main.text })'),
 ('{ ok: false, err: "Si forma anche " + cr.text + ", che non è nel dizionario." }', 'E("noDizCroce", { w: cr.text })'),
 ('{ ok: false, err: "Al primo turno si scrive solo nel proprio Sanctum." }', 'E("primoTurno")'),
 ('{ ok: false, err: "Nella Terra di Mezzo la parola deve collegarsi al tuo ponte." }', 'E("ponteMezzo")'),
 ('{ ok: false, err: "Per entrare nel Sanctum nemico serve il Collegamento Magico attivo." }', 'E("serveColl")'),
 ('{ ok: false, err: "Nel Sanctum nemico devi agganciarti a una parola dell\'avversario." }', 'E("aggancio")'),
 ('{ ok: false, err: "Il Falò si può usare una volta ogni " + CFG.faloOgni + " turni (di nuovo tra " + (CFG.faloOgni - (s.turns[p] - s.lastFalo[p])) + ")." }',
  'E("faloAttesa", { n: CFG.faloOgni, m: CFG.faloOgni - (s.turns[p] - s.lastFalo[p]) })'),
 ('{ ok: false, err: "Per il Falò la parola deve allungare o incrociare una parola nella Terra di Mezzo o nel Sanctum nemico." }', 'E("faloBersaglio")'),
 ('{ ok: false, err: "Per bruciare nel Sanctum nemico serve il Collegamento Magico attivo." }', 'E("faloColl")'),
 ('{ ok: false, err: "In questa partita attaccano solo le parole elementali." }', 'E("soloElementali")'),
 ('{ ok: false, err: "Una parola lanciata non può essere anche Falò o difesa." }', 'E("lancioMisto")'),
 ('{ ok: false, err: "Per attaccare la parola deve avere una lettera in un Sanctum." }', 'E("lancioSanctum")'),
 ('{ ok: false, err: "La Consacrazione non è attiva in questa partita." }', 'E("noConsacr")'),
 ('{ ok: false, err: "Si consacrano solo parole neutre." }', 'E("consNeutre")'),
 ('{ ok: false, err: "Si consacrano solo parole scritte tutte nel proprio Sanctum." }', 'E("consSanctum")'),
 ('{ ok: false, err: "Hai già " + attive + " difese consacrate attive (massimo " + CFG.maxConsacrate + ")." }', 'E("consMax", { n: attive, m: CFG.maxConsacrate })'),
 ('{ ok: false, err: "Scegli almeno una lettera da cambiare." }', 'E("sceltaAlch")'),
 ('{ ok: false, err: "Ti servono più di " + costo + " PV per chiedere un suggerimento." }', 'E("suggPV", { n: costo })'),
]
for a, b in E: rep(a, b)
rep('{ ok: false, err: "Lettera non presente nel Grimorio." }', 'E("noLettera")', 2)
rep('{ ok: false, err: "La partita è finita." }', 'E("finita")', 2)
rep('{ ok: false, err: "Non è il tuo turno." }', 'E("noTurno")', 4)

# cronaca
L = [
 ('addLog(s, "La Sacca era vuota: il Focolare è stato rimescolato.");', 'addLog(s, "saccaVuota");'),
 ('addLog(s, "Vittoria del Mago " + (p === "A" ? "Blu" : "Rosso") + "!");', 'addLog(s, "vittoria", { p: p });'),
 ('addLog(s, "Si spengono: " + rep.faded.join(", ") + ".");', 'addLog(s, "spengono", { l: rep.faded });'),
 ('addLog(s, who + " scatena un Grande Falò con " + w.text + ": brucia " + rep.destroyed.filter(function (d) { return d.id !== id; }).map(function (d) { return d.text; }).join(", ") + ".");',
  'addLog(s, "falo", { p: p, w: w.text, l: rep.destroyed.filter(function (d) { return d.id !== id; }).map(function (d) { return d.text; }) });'),
 ('''      var msg = who + " lancia " + w.text + " (" + (v.el ? v.el + ", " : "") + "potenza " + v.score + ")";
      msg += rep.damage ? ": " + rep.damage + " danni." : ": l'incantesimo si dissolve.";
      if (CFG.attaccoConsuma) msg += " La parola si consuma.";
      addLog(s, msg);''',
  '''      var la = { p: p, w: w.text, n: v.score };
      if (v.el) la.el = v.el;
      if (rep.damage) la.d = rep.damage;
      if (CFG.attaccoConsuma) la.c = 1;
      addLog(s, "lancio", la);'''),
 ('addLog(s, d.text + " viene disintegrato.");', 'addLog(s, "disintegrato", { w: d.text });'),
 ('addLog(s, who + " consacra " + w.text + " come difesa (resistenza " + w.stab + ").");', 'addLog(s, "consacra", { p: p, w: w.text, n: w.stab });'),
 ('addLog(s, who + " scrive " + w.text + ", ma le difese nemiche impediscono il lancio.");', 'addLog(s, "bloccato", { p: p, w: w.text });'),
 ('addLog(s, who + " evoca " + w.text + " nella Terra di Mezzo (i Cataclismi non sono ancora attivi).");', 'addLog(s, "evoca", { p: p, w: w.text });'),
 ('addLog(s, who + " erige " + w.text + " (resistenza " + w.stab + ").");', 'addLog(s, "erige", { p: p, w: w.text, n: w.stab });'),
 ('addLog(s, who + " scrive " + w.text + ".");', 'addLog(s, "scrive", { p: p, w: w.text });'),
 ('addLog(s, "Tempesta Arcana! Estratta la " + rep.storm.letter + ": forza " + rep.storm.force + ".");', 'addLog(s, "tempesta", { l: rep.storm.letter, n: rep.storm.force });'),
 ('if (crolli.length) addLog(s, "Crollano: " + crolli.join(", ") + ".");', 'if (crolli.length) addLog(s, "crollano", { l: crolli });'),
 ('addLog(s, name(p) + " usa l\'Alchimia e cambia " + (letters ? out.length + " lettere." : "tutte le lettere."));',
  'if (letters) addLog(s, "alchimia", { p: p, n: out.length }); else addLog(s, "alchimiaTutte", { p: p });'),
 ('addLog(s, name(p) + " chiede un suggerimento (−" + costo + " PV).");', 'addLog(s, "suggerimento", { p: p, n: costo });'),
 ('addLog(s, name(p) + " passa il turno.");', 'addLog(s, "passa", { p: p });'),
]
for a, b in L: rep(a, b)
rep("    var who = name(p);\n", "")
rep("  function name(p) { return p === \"A\" ? \"Mago Blu\" : \"Mago Rosso\"; }", "  function name(p) { return tr(p); }")
rep("    COLS: COLS, ROWS: ROWS,", "    tr: tr, testoLog: testoLog, setLinguaUI: setLinguaUI, LINGUA_UI: LINGUA_UI, MSG: MSG,\n    COLS: COLS, ROWS: ROWS,")
assert "err: \"" not in s, s[s.index("err: \""):][:120]
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
