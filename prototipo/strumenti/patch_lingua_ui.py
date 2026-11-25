# Interfaccia bilingue (IT/EN) e lingua delle parole della partita, nel prototipo.
# - tr("testo italiano", {param}) traduce nella lingua dell'interfaccia (LANG); il testo italiano fa da chiave.
# - switch IT/EN nella pagina delle partite e in fondo alla partita, salvato in "grimorio-lingua".
# - "Lingua delle parole" alla creazione: italiano o inglese (solo regole s1); dizionari caricati per lingua.
# uso: python patch_lingua_ui.py <index.html del prototipo>
import re, sys, json
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
assert "function tr(" not in s, "già fatto"

def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# Testi italiani -> inglesi. Chiave = testo italiano esatto (con eventuali {parametri}).
EN = {
  # lobby
  "Collegamento alle partite condivise…": "Connecting to the shared games…",
  "Le partite condivise non rispondono ancora. Controlla la connessione.": "The shared games are not responding yet. Check your connection.",
  "Non riesco a leggere le partite condivise.": "I can't read the shared games.",
  "Modalità locale: le partite restano solo su questo dispositivo. Apri la pagina da claude.ai per giocare a distanza.": "Local mode: games stay on this device only. Open the page from claude.ai to play remotely.",
  "Come ti chiami?": "What's your name?",
  "{n} PV": "{n} HP",
  "Un'altra persona (a distanza)": "Another person (remote)",
  "Il computer, livello facile": "The computer, easy level",
  "Il computer, livello normale": "The computer, normal level",
  "Duelli di parole tra due maghi. Scrivi incantesimi nel tuo Sanctum, costruisci un ponte fino al Passo Arcano e invadi il Sanctum nemico.": "Word duels between two wizards. Write spells in your Sanctum, build a bridge to the Arcane Pass and invade the enemy Sanctum.",
  "Puoi guardare le partite ma non giocare: chiedi al proprietario di invitarti come Editor.": "You can watch the games but not play: ask the owner to invite you as an Editor.",
  "Nuova partita": "New game",
  "Il tuo nome di mago": "Your wizard name",
  "Avversario": "Opponent",
  "Lingua delle parole": "Word language",
  "Lingua dell'interfaccia": "Interface language",
  "Regole": "Rules",
  "Punti Vita iniziali": "Starting Health Points",
  "Gioca entrambi i maghi (per provare da solo)": "Play both wizards (to try it alone)",
  "Crea partita": "Create game",
  "Partite": "Games",
  "Carico le partite…": "Loading games…",
  "Nessuna partita. Creane una qui sopra.": "No games yet. Create one above.",
  "Come sfidare qualcuno a distanza": "How to challenge someone remotely",
  "Condividi questa pagina dal menu di claude.ai invitando l'avversario per email come Editor. Crea una partita: l'avversario la apre dall'elenco e tocca «Siediti come Mago Rosso». Ognuno gioca il proprio turno quando può; la partita si aggiorna da sola.": "Share this page from the claude.ai menu, inviting your opponent by email as an Editor. Create a game: your opponent opens it from the list and taps “Sit down as Red Wizard”. Each of you plays your turn when you can; the game updates by itself.",
  "Regole in breve": "Rules at a glance",
  "Regole in breve (s1)": "Rules at a glance (s1)",
  "Esplora il dizionario": "Explore the dictionary",
  "Grimorio è software libero: ": "Grimorio is free software: ",
  "codice sorgente": "source code",
  "dizionari": "dictionaries",
  " (italiano: GPL-3.0, dall'Estensione linguistica italiana di A. Pescetti e altri; inglese: ENABLE, pubblico dominio)": " (Italian: GPL-3.0, from the Italian Writing Aids by A. Pescetti and others; English: ENABLE, public domain)",
  "Semplificate (s1)": "Simplified (s1)",
  "Classiche (con lessico)": "Classic (with lexicon)",
  "Vince {n}": "{n} wins",
  "In attesa del Mago Rosso": "Waiting for the Red Wizard",
  "Libero": "Open",
  "Tocca a {n}": "{n}'s turn",
  "Contro il computer": "Against the computer",
  "Tocca a te": "Your turn",
  "  contro  ": "  vs  ",
  "mossa {n}": "move {n}",
  "Mago Blu": "Blue Wizard", "Mago Rosso": "Red Wizard",
  "Automa": "Automaton", "Automa (facile)": "Automaton (easy)",
  # salvataggio, partita
  "Non hai il permesso di salvare: chiedi al proprietario di invitarti come Editor.": "You don't have permission to save: ask the owner to invite you as an Editor.",
  "Lo spazio delle partite è pieno: elimina qualche partita finita.": "The game storage is full: delete some finished games.",
  "Salvataggio non riuscito. Riprova tra poco.": "Saving failed. Try again shortly.",
  "Chiudi": "Close",
  "La partita non esiste più.": "This game no longer exists.",
  "Non riesco più a seguire la partita.": "I can no longer follow this game.",
  "{n} usa l'Alchimia.": "{n} uses Alchemy.",
  "{n} passa il turno.": "{n} passes.",
  " colpisce, −{n} PV": " hits, −{n} HP",
  ", l'incantesimo si ferma": ", the spell stops",
  ", Grande Falò": ", Great Bonfire",
  ", difesa consacrata": ", consecrated defence",
  ", nuova difesa": ", new defence",
  " · Tempesta (forza {n})": " · Storm (force {n})",
  "Il giocatore automatico non si avvia in questo browser.": "The computer player can't start in this browser.",
  "Il giocatore automatico ha avuto un problema: {m}": "The computer player ran into a problem: {m}",
  "Il giocatore automatico non risponde. Ricarica la pagina.": "The computer player isn't responding. Reload the page.",
  "Il suggeritore non si avvia in questo browser.": "The hint helper can't start in this browser.",
  "Il suggeritore non risponde.": "The hint helper isn't responding.",
  "Il suggeritore ha avuto un problema": "The hint helper ran into a problem",
  ", da lanciare": ", to launch",
  ", come Grande Falò": ", as a Great Bonfire",
  ", da consacrare": ", to consecrate",
  "una parola": "a word",
  "Suggerimento: {w}{c}. Tocca «Conferma», oppure cambiala.": "Hint: {w}{c}. Tap “Confirm”, or change it.",
  "Suggerimento: nessuna buona parola, usa l'Alchimia e cambia le lettere evidenziate.": "Hint: no good word, use Alchemy and change the highlighted letters.",
  "Suggerimento: non c'è una mossa utile, passa il turno.": "Hint: there is no useful move, pass your turn.",
  "«{w}» da qui esce dal campo.": "“{w}” goes off the board from here.",
  "In quella posizione c'è già una {a}, ma serviva una {b}.": "There is already a {a} there, but a {b} was needed.",
  "Ti manca una {l} per scrivere «{w}» qui.": "You are missing a {l} to write “{w}” here.",
  "La parola è già tutta sul campo.": "The whole word is already on the board.",
  "Trascina «{w}» dove vuoi. ↻ Gira la mette in verticale.": "Drag “{w}” wherever you like. ↻ Turn makes it vertical.",
  "Non c'è spazio sul campo per «{w}» con le tue lettere.": "There is no room on the board for “{w}” with your letters.",
  " Prova un'altra casella o girala.": " Try another square or turn it.",
  "Girata, «{w}» non entra da nessuna parte.": "Turned, “{w}” does not fit anywhere.",
  " La parola resta nell'ultima posizione valida.": " The word stays in its last valid position.",
  "Da qui l'incantesimo si dissolve prima di arrivare al mago: danno previsto 0 da ogni lettera.": "From here the spell fizzles out before reaching the wizard: expected damage 0 from every letter.",
  "Scegli la lettera da cui lanciare l'incantesimo: il numero è il danno previsto.": "Choose the letter to launch the spell from: the number is the expected damage.",
  "Tocca prima una lettera del tuo Grimorio.": "First tap a letter in your Grimoire.",
  "Scegli almeno una lettera da cambiare.": "Choose at least one letter to change.",
  "Partita eliminata.": "Game deleted.",
  # casella
  "Attacco": "Attack", "Difesa consacrata": "Consecrated defence", "Difesa (Terra)": "Defence (Earth)",
  "Cataclisma": "Cataclysm", "Attacco bloccato": "Blocked attack", "Parola neutra": "Neutral word",
  "Resistenza {a} su {b}": "Resistance {a} of {b}", "Stabilità {a} su {b}": "Stability {a} of {b}",
  " · perde 1 a ogni turno di {n}": " · loses 1 on each of {n}'s turns",
  "{t} di {n}": "{t} by {n}",
  "Lettera {l}": "Letter {l}", "Valore {n}": "Value {n}",
  " · Runa: torna a chi l'ha posata quando la parola si spegne": " · Rune: goes back to whoever placed it when the word fades",
  " · Consumabile": " · Expendable",
  "Questa lettera non appartiene più a nessuna parola.": "This letter no longer belongs to any word.",
  # dizionario
  "es. AEIRMTS": "e.g. AEIRMTS", "es. lettere sul campo": "e.g. letters on the board",
  "Tutte": "All", "Attacchi": "Attacks", "Fuoco": "Fire", "Gelo": "Frost", "Acqua": "Water", "Terra": "Earth",
  "Difese (Terra)": "Defences (Earth)", "Neutre": "Neutral", "Difesa": "Defence", "Neutra": "Neutral", "Parola": "Word",
  "Punteggio": "Score", "Lunghezza": "Length",
  "Il dizionario non si è caricato: ricarica la pagina.": "The dictionary did not load: reload the page.",
  "Carico il dizionario…": "Loading the dictionary…",
  "Scrivi almeno due lettere.": "Type at least two letters.",
  "{n} parole": "{n} words", " (mostrate le prime 150)": " (showing the first 150)",
  "Nessuna parola con queste lettere.": "No words with these letters.",
  ": tocca per posizionarla": ": tap to place it",
  "Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R).": "The words you can make with your letters. Add under “Extra letters” the ones on the board you want to cross: words that use them show it in gold (+R).",
  " Nel tuo turno tocca una parola per posizionarla sul campo.": " On your turn, tap a word to place it on the board.",
  "Le tue lettere": "Your letters", "Lettere in più": "Extra letters", "Tipo": "Type", "Ordina per": "Sort by",
  "Ripristina la mia mano": "Reset to my hand",
  "Dizionario": "Dictionary",
  "Dizionario italiano": "Italian dictionary", "Dizionario inglese": "English dictionary",
  # regole s1
  "Ognuno vede il proprio Sanctum in basso. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte.": "Each player sees their own Sanctum at the bottom. Vertical words read top to bottom from the side of whoever wrote them.",
  "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.": "Take turns writing an Italian word on the grid, crossword-style: every word formed must be valid. On your first turn you write only in your Sanctum.",
  "A turno scrivi una parola inglese sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.": "Take turns writing an English word on the grid, crossword-style: every word formed must be valid. On your first turn you write only in your Sanctum.",
  "Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata). Con il Collegamento attivo puoi entrare nel Sanctum nemico, agganciandoti a una sua parola.": "Magic Link: a chain of words from your Sanctum to a word lying entirely in the Midlands that touches the Arcane Pass (the golden row). With the Link active you can enter the enemy Sanctum by hooking onto one of its words.",
  "Attacco: qualsiasi parola che ha una lettera nel Sanctum nemico può essere lanciata (tocca «Attacca»). La potenza è il punteggio della parola; l'incantesimo corre verso il bordo del Sanctum nemico e perde 1 per casella e 1 in più per ogni lettera. Dopo il lancio la parola si consuma: sparisce, tranne le lettere che reggono altre parole.": "Attack: any word with a letter in the enemy Sanctum can be launched (tap “Attack”). Its power is the word's score; the spell runs to the edge of the enemy Sanctum and loses 1 per square and 1 more for each letter. After the launch the word is consumed: it disappears, except for letters that hold up other words.",
  "Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è {r} il punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.": "Defence: consecrate a word written entirely in your Sanctum (tap “Consecrate”). Its resistance is {r} its score, up to {m} active, and it loses 1 on each of your turns.",
  "{n} volte": "{n} times", "metà del": "half",
  "Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano.": "Shield: a consecrated defence protects its whole row (the striped rows). A spell launched on that row, or crossing it on the way out, must first get past it: if weaker it is absorbed, if stronger it shatters the shield and carries on with the power left. Shields add up.",
  "Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto.": "Defences intercept spells in their column and the ones next to it.",
  "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni {n} turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine.": "Great Bonfire: extend or cross a word in the centre or in the enemy Sanctum and burn it all, whatever its resistance; once every {n} turns. It is the way to remove a Shield that is too strong. Burning words in the centre unleashes a Storm on the nearby words.",
  "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: cambi da 1 a 7 lettere invece di scrivere.": "Words that are not launched act as bridges or obstacles and lose 1 Stability on each of your turns. Alchemy: change 1 to 7 letters instead of writing.",
  "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).": "The winner is whoever brings the opponent to 0 Health Points (this game starts at {n}).",
  # regole classiche
  "Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte.": "Each player sees their own Sanctum at the bottom, as if sitting on opposite sides of a table. Vertical words read top to bottom from the side of whoever wrote them: you see your opponent's upside down.",
  "Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso.": "The Blue Wizard's Sanctum is at the top, the Red Wizard's at the bottom. Words read left to right and top to bottom.",
  "Le parole di Fuoco, Gelo e Acqua sono attacchi: scegli una loro lettera in un Sanctum e l'incantesimo corre dritto lungo la colonna verso il mago avversario. Perde 1 di potenza per casella e 1 in più per ogni lettera che attraversa.": "Fire, Frost and Water words are attacks: pick one of their letters in a Sanctum and the spell runs straight along the column towards the enemy wizard. It loses 1 power per square and 1 more for each letter it crosses.",
  "Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo {m} attive).": "Earth words are permanent defences: they intercept spells in their column and the ones next to it. You can also consecrate a neutral word in your Sanctum as a defence (half resistance, it wears out, up to {m} active).",
  "Per invadere il Sanctum nemico serve il Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata).": "To invade the enemy Sanctum you need the Magic Link: a chain of words from your Sanctum to a word lying entirely in the Midlands that touches the Arcane Pass (the golden row).",
  "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni {n} turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine.": "Great Bonfire: extend or cross a word in the centre or in the enemy Sanctum and burn it, once every {n} turns. Destroying words in the centre unleashes a Storm on the nearby words.",
  "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: cambi da 1 a 7 lettere invece di scrivere.": "Attack and neutral words lose 1 Stability on each of your turns and then fade. Alchemy: change 1 to 7 letters instead of writing.",
  "Toccando una lettera sulla griglia vedi a quali parole appartiene, il loro tipo e quanto durano ancora.": "Tap a letter on the grid to see which words it belongs to, their type and how long they will last.",
  # anteprima
  "Cambio {n} lettere": "Changing {n} letters", "Tocca le lettere da cambiare": "Tap the letters to change",
  "Tocca la lettera da cui lanciare": "Tap the letter to launch from", "il numero è il danno previsto": "the number is the expected damage",
  "Tocca la casella dove inizia «{w}»": "Tap the square where “{w}” starts",
  "orizzontale →": "horizontal →", "verticale ↓": "vertical ↓",
  "trascinala per spostarla": "drag it to move it",
  "Grande Falò su {l}": "Great Bonfire on {l}",
  "potenza {n}": "power {n}", " · la parola si consuma": " · the word is consumed",
  "parola neutra · Stabilità {n}": "neutral word · Stability {n}",
  " · «Attacca» per lanciarla": " · “Attack” to launch it",
  "Difesa consacrata · resistenza {n}": "Consecrated defence · resistance {n}",
  "Difesa · resistenza {n}": "Defence · resistance {n}",
  " al centro: Cataclisma (ancora senza effetto)": " in the centre: Cataclysm (no effect yet)",
  "le difese nemiche impediscono il lancio": "the enemy defences block the launch",
  # barre dei giocatori, campo
  "Ponte attivo": "Bridge active", "Ponte non attivo": "Bridge not active",
  "Consacrate {a}/{b}": "Consecrated {a}/{b}", "Falò pronto": "Bonfire ready", "Falò tra {n} turni": "Bonfire in {n} turns",
  "{n} lettere": "{n} letters", " (tu)": " (you)", " (libero)": " (open)", "Punti Vita": "Health Points",
  "Riga {r}, colonna {c}": "Row {r}, column {c}", ", lettera {l}": ", letter {l}",
  ", lettera {l} in posa": ", letter {l} being placed", ", vuota": ", empty",
  "Campo di battaglia": "Battlefield",
  "LD": "DL", "PD": "DW",  # caselle bonus: lettera doppia / parola doppia
  # partita
  "← Partite": "← Games", "Carico la partita…": "Loading the game…",
  "Vince {n}!": "{n} wins!",
  "In attesa dello sfidante": "Waiting for the challenger",
  "Il posto del Mago Rosso è libero": "The Red Wizard's seat is open",
  "Invita qualcuno: vedi «Come sfidare qualcuno a distanza» nella pagina delle partite.": "Invite someone: see “How to challenge someone remotely” on the games page.",
  "Turno del {n}": "{n}'s turn",
  "Primo turno: scrivi nel tuo Sanctum ({d}).": "First turn: write in your Sanctum ({d}).",
  "in alto": "at the top", "in basso": "at the bottom",
  "Modalità prova: giochi entrambi i maghi.": "Practice mode: you play both wizards.",
  "{n} sta pensando…": "{n} is thinking…",
  "Il computer gioca dal tuo dispositivo: resta su questa pagina.": "The computer plays from your device: stay on this page.",
  "Puoi chiudere la pagina: la partita ti aspetta.": "You can close the page: the game will wait for you.",
  "Stai guardando: tocca a {n}": "You are watching: {n}'s turn",
  "Il tuo Grimorio": "Your Grimoire", "Lettera {l}, valore {n}": "Letter {l}, value {n}",
  "Annulla lancio": "Cancel launch", "Annulla": "Cancel", "Cambia {n} lettere": "Change {n} letters",
  "↻ Gira ({d})": "↻ Turn ({d})", "ora orizzontale": "now horizontal", "ora verticale": "now vertical",
  "Ritira": "Take back", "Gira la parola": "Turn the word", "↻ Gira": "↻ Turn",
  "Attacca": "Attack", "Falò": "Bonfire", "Consacra": "Consecrate", "Conferma": "Confirm",
  "Mescola": "Shuffle", "Alchimia": "Alchemy",
  "Sì, suggerisci (−{n} PV)": "Yes, give me a hint (−{n} HP)",
  "Il computer ti propone la mossa migliore: costa {n} PV": "The computer suggests the best move: it costs {n} HP",
  "Ci penso…": "Thinking…", "Suggerisci": "Hint",
  "Sì, passa il turno": "Yes, pass", "Passa": "Pass",
  "Siediti come {n}": "Sit down as {n}", "Sono {n}": "I am {n}",
  "Stai già giocando questa partita da un altro dispositivo?": "Already playing this game on another device?",
  "▲ Sanctum {c}": "▲ {c} Sanctum", "▼ Sanctum {c}": "▼ {c} Sanctum", "Blu": "Blue", "Rosso": "Red", " (tuo)": " (yours)",
  "Passo Arcano · → ↓ ↑ verso di lettura": "Arcane Pass · → ↓ ↑ reading direction",
  "Ora tocca una casella del campo": "Now tap a square on the board",
  "Tocca una lettera, poi una casella": "Tap a letter, then a square",
  "Carico il dizionario ({n} parole)…": "Loading the dictionary ({n} words)…",
  "Cronaca della partita": "Game log",
  "Elimina per sempre": "Delete forever", "Elimina partita": "Delete game",
}

# ---------- infrastruttura ----------
rep('''function closeSheet() { document.getElementById("sheet").hidden = true; }
''', '''function closeSheet() { document.getElementById("sheet").hidden = true; }

// ---------- lingue: dell'interfaccia (LANG, switch IT/EN) e delle parole della partita (cfg.lingua) ----------
const LINGUE_UI = { it: "Italiano", en: "English" };
function linguaIniziale() {
  const l = store.get("grimorio-lingua", null);
  if (l === "it" || l === "en") return l;
  return /^it\\b/i.test(navigator.language || "") ? "it" : "en";
}
let LANG = linguaIniziale();
G.setLinguaUI(LANG); document.documentElement.lang = LANG;
// traduce un testo dell'interfaccia: la chiave è il testo italiano, {x} sono i parametri
function tr(testo, a) {
  let x = LANG === "en" && EN[testo] !== undefined ? EN[testo] : testo;
  if (a) x = x.replace(/\\{(\\w+)\\}/g, (_, k) => a[k] === undefined ? "" : String(a[k]));
  return x;
}
function setLang(l) { LANG = l; store.set("grimorio-lingua", l); G.setLinguaUI(l); document.documentElement.lang = l; side = null; render(); }
function langSwitch() {
  return h("div", { class: "langsw", role: "group", "aria-label": tr("Lingua dell'interfaccia") },
    Object.keys(LINGUE_UI).map(l => h("button", { class: "btn small" + (LANG === l ? " on" : ""), "aria-pressed": LANG === l, lang: l, title: LINGUE_UI[l], onclick: () => setLang(l), text: l.toUpperCase() })));
}
const EN = ''' + json.dumps(EN, ensure_ascii=False, indent=0).replace("\n", "\n  ").replace("\n  }", "\n}") + ''';
''')
rep('''.winner {''', '''.langsw { display: flex; gap: 6px; justify-content: flex-end; }
.langsw .btn.on { border-color: var(--oro); color: var(--oro); background: transparent; }
.winner {''')

# ---------- dizionari per lingua ----------
rep('''let dictState = "carico";
let DICT_TEXT = "", DICT_OFFS = null;
function makeDict(text) {
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offs.push(i + 1);
  const o = Uint32Array.from(offs), n = o.length;
  DICT_TEXT = text; DICT_OFFS = o;
  const line = i => text.slice(o[i], i + 1 < n ? o[i + 1] - 1 : text.length);
  return { has(w) { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = line(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } };
}
async function loadDict() {
  try {
    const res = await fetch("parole.txt");''', '''// un dizionario per lingua, caricato solo quando serve; dictState / DICT_TEXT / DICT_OFFS sono quelli della lingua in uso
const DIZ = { it: { file: "parole.txt", parole: 750000 }, en: { file: "words-en.txt", parole: 140000 } };
let dictState = "carico", dictLang = "it";
let DICT_TEXT = "", DICT_OFFS = null;
function makeDict(text) {
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offs.push(i + 1);
  const o = Uint32Array.from(offs), n = o.length;
  const line = i => text.slice(o[i], i + 1 < n ? o[i + 1] - 1 : text.length);
  return { text, offs: o, has(w) { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = line(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } };
}
function usaDiz(l) {
  const d = DIZ[l] ? DIZ[l] : DIZ.it;
  dictLang = DIZ[l] ? l : "it";
  dictState = d.stato || "carico"; DICT_TEXT = d.text || ""; DICT_OFFS = d.offs || null;
  if (!d.stato) loadDict(dictLang);
}
async function loadDict(l) {
  const d = DIZ[l]; if (d.stato) return;
  d.stato = "carico";
  try {
    const res = await fetch(d.file);''')
rep('''    G.setDict(makeDict(text.replace(/\\r/g, "").trim()));
    dictState = "pronto";
  } catch (e) { dictState = "errore"; }
  render();
}''', '''    const dz = makeDict(text.replace(/\\r/g, "").trim());
    d.text = dz.text; d.offs = dz.offs;
    G.setDict(dz, l);
    d.stato = "pronto";
  } catch (e) { d.stato = "errore"; }
  if (dictLang === l) usaDiz(l);
  render();
}
function linguaParole() { const l = store.get("grimorio-lingua-parole", LANG); return DIZ[l] ? l : "it"; }''')
rep('''  render(); loadDict();
  const c = window.claude;''', '''  usaDiz(linguaParole()); render();
  const c = window.claude;''')
rep('''  G.applyCfg(s.cfg || BASE);
  if (!prev''', '''  G.applyCfg(s.cfg || BASE);
  usaDiz((s.cfg && s.cfg.lingua) || "it");
  if (!prev''')
rep('''  cur = null; ui = freshUi(); anim = null;
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}''', '''  cur = null; ui = freshUi(); anim = null;
  usaDiz(linguaParole());
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}''')
# regole mostrate fuori da una partita: anche la lingua scelta
rep('''  const sel = document.getElementById("regole");
  return ((sel && REGOLE[sel.value]) || REGOLE.s1).cfg;''', '''  const sel = document.getElementById("regole"), c = ((sel && REGOLE[sel.value]) || REGOLE.s1).cfg;
  return linguaParole() === "en" ? Object.assign({}, c, { lingua: "en" }) : c;''')
# esploratore: il lessico elementale c'è solo in italiano
rep('''  for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {''', '''  if (G.CFG.lingua === "it") for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {''')

# ---------- lobby ----------
rep('''  const fillHp = k => fill(hp, ...REGOLE[k].pv.map(v => h("option", { value: v, selected: v === REGOLE[k].def, text: v + " PV" })));
  const reg = h("select", { id: "regole", onchange: e => fillHp(e.target.value) }, Object.keys(REGOLE).map(k => h("option", { value: k, text: REGOLE[k].nome })));
  fillHp("s1");''', '''  const fillHp = k => fill(hp, ...REGOLE[k].pv.map(v => h("option", { value: v, selected: v === REGOLE[k].def, text: tr("{n} PV", { n: v }) })));
  const reg = h("select", { id: "regole", onchange: e => fillHp(e.target.value) });
  // in inglese ci sono solo le regole s1: il lessico delle classiche è italiano
  const lw = h("select", { id: "lingua-parole" }, Object.keys(LINGUE_UI).map(l => h("option", { value: l, lang: l, selected: l === linguaParole(), text: LINGUE_UI[l] })));
  const fillReg = () => { fill(reg, ...(lw.value === "en" ? ["s1"] : Object.keys(REGOLE)).map(k => h("option", { value: k, text: tr(REGOLE[k].nome) }))); fillHp(reg.value); };
  lw.addEventListener("change", () => { store.set("grimorio-lingua-parole", lw.value); fillReg(); usaDiz(lw.value); });
  fillReg();''')
rep('''      h("h1", { text: "Grimorio" }),''', '''      langSwitch(),
      h("h1", { text: "Grimorio" }),''')
rep('''      h("label", { class: "field", for: "regole" }, "Regole", reg),''', '''      h("label", { class: "field", for: "lingua-parole" }, "Lingua delle parole", lw),
      h("label", { class: "field", for: "regole" }, "Regole", reg),''')
rep('''onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value), text: "Crea partita" })),''', '''onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value, lw.value), text: "Crea partita" })),''')
rep('''      "Grimorio è software libero: ",''', '''      tr("Grimorio è software libero: "),''')
rep('''text: "dizionario" }),
      " (GPL-3.0, dall'Estensione linguistica italiana di A. Pescetti e altri)")''', '''text: tr("dizionari") }),
      tr(" (italiano: GPL-3.0, dall'Estensione linguistica italiana di A. Pescetti e altri; inglese: ENABLE, pubblico dominio)"))''')
rep('''  if (s.winner) st = "Vince " + seatName(s, s.winner);''', '''  if (s.winner) st = tr("Vince {n}", { n: seatName(s, s.winner) });''')
rep('''  else { st = "Tocca a " + seatName(s, s.turn);''', '''  else { st = tr("Tocca a {n}", { n: seatName(s, s.turn) });''')
rep('''text: (s.cfg && s.cfg.hp ? s.cfg.hp : 30) + " PV" }),
    h("span", { class: "st", text: st + " · mossa " + s.moveNo }));''', '''text: tr("{n} PV", { n: s.cfg && s.cfg.hp ? s.cfg.hp : 30 }) }),
    h("span", { class: "st", text: st + " · " + tr("mossa {n}", { n: s.moveNo }) + " · " + ((s.cfg && s.cfg.lingua) || "it").toUpperCase() }));''')
rep('''async function createGame(hp, both, vs, regole) {
  const nome = myName();
  G.applyCfg(Object.assign({}, (REGOLE[regole] || REGOLE.v5f).cfg, { hp }));''', '''async function createGame(hp, both, vs, regole, lingua) {
  const nome = myName();
  if (lingua === "en") regole = "s1";
  G.applyCfg(Object.assign({}, (REGOLE[regole] || REGOLE.v5f).cfg, { hp, lingua: lingua === "en" ? "en" : "it" }));''')
# nomi: quelli predefiniti e del computer si traducono, quelli scelti dai giocatori no
rep('''function seatName(s, p) { return (s.seats[p] && s.seats[p].nome) || NOMI[p]; }''', '''function seatName(s, p) {
  const x = s.seats[p];
  if (!x || !x.nome || x.nome === NOMI[p]) return tr(NOMI[p]);
  if (x.cpu) return tr(x.livello === "facile" ? "Automa (facile)" : "Automa");
  return x.nome;
}''')

# ---------- messaggi ----------
rep('''  if (L.kind === "alchimia") return toast(who + " usa l'Alchimia.");
  if (L.kind === "passa") return toast(who + " passa il turno.");''', '''  if (L.kind === "alchimia") return toast(tr("{n} usa l'Alchimia.", { n: who }));
  if (L.kind === "passa") return toast(tr("{n} passa il turno.", { n: who }));''')
rep('''msg += L.damage ? " colpisce, −" + L.damage + " PV" : ", l'incantesimo si ferma";''', '''msg += L.damage ? tr(" colpisce, −{n} PV", { n: L.damage }) : tr(", l'incantesimo si ferma");''')
rep('''if (L.storm) msg += " · Tempesta (forza " + L.storm.force + ")";''', '''if (L.storm) msg += tr(" · Tempesta (forza {n})", { n: L.storm.force });''')
rep('''toast("Il giocatore automatico ha avuto un problema: " + m.message, true);''', '''toast(tr("Il giocatore automatico ha avuto un problema: {m}", { m: m.message }), true);''')
rep('''toast("Il suggeritore ha avuto un problema" + (m && m.message ? ": " + m.message : "."), true);''', '''toast(tr("Il suggeritore ha avuto un problema") + (m && m.message ? ": " + m.message : "."), true);''')
rep('''    toast("Suggerimento: " + (v.ok ? v.main.text : "una parola") + come + ". Tocca «Conferma», oppure cambiala.");''', '''    toast(tr("Suggerimento: {w}{c}. Tocca «Conferma», oppure cambiala.", { w: v.ok ? v.main.text : tr("una parola"), c: come }));''')
rep('''return { err: "«" + w + "» da qui esce dal campo." };''', '''return { err: tr("«{w}» da qui esce dal campo.", { w }) };''')
rep('''return { err: "In quella posizione c'è già una " + t.l + ", ma serviva una " + w[i] + "." };''', '''return { err: tr("In quella posizione c'è già una {a}, ma serviva una {b}.", { a: t.l, b: w[i] }) };''')
rep('''return { err: "Ti manca una " + w[i] + " per scrivere «" + w + "» qui." };''', '''return { err: tr("Ti manca una {l} per scrivere «{w}» qui.", { l: w[i], w }) };''')
rep('''toast("Trascina «" + word + "» dove vuoi. ↻ Gira la mette in verticale."); }
  else toast("Non c'è spazio sul campo per «" + word + "» con le tue lettere.", true);''', '''toast(tr("Trascina «{w}» dove vuoi. ↻ Gira la mette in verticale.", { w: word })); }
  else toast(tr("Non c'è spazio sul campo per «{w}» con le tue lettere.", { w: word }), true);''')
rep('''toast(res.err + " Prova un'altra casella o girala.", true);''', '''toast(res.err + tr(" Prova un'altra casella o girala."), true);''')
rep('''toast("Girata, «" + ui.place.word + "» non entra da nessuna parte.", true);''', '''toast(tr("Girata, «{w}» non entra da nessuna parte.", { w: ui.place.word }), true);''')
rep('''toast(d.err + " La parola resta nell'ultima posizione valida.", true);''', '''toast(d.err + tr(" La parola resta nell'ultima posizione valida."), true);''')

# ---------- casella ----------
rep('''    let tipo = w.type === "attacco" ? "Attacco " + (EL[w.el] || "") : w.type === "difesa" ? (w.consacrata ? "Difesa consacrata" : "Difesa (Terra)") : w.type === "cataclisma" ? "Cataclisma" : w.type === "bloccato" ? "Attacco bloccato" : "Parola neutra";
    let val = w.type === "difesa" ? "Resistenza " + w.stab + " su " + w.max : "Stabilità " + w.stab + " su " + w.max;
    const consuma = (w.type !== "difesa" || w.consacrata) ? " · perde 1 a ogni turno di " + who : "";
    return h("li", null, h("strong", { text: w.text }), " — " + tipo + " di " + who + ". " + val + consuma + ".");''', '''    let tipo = w.type === "attacco" ? tr("Attacco") + (EL[w.el] ? " " + tr(EL[w.el]) : "") : w.type === "difesa" ? tr(w.consacrata ? "Difesa consacrata" : "Difesa (Terra)") : tr(w.type === "cataclisma" ? "Cataclisma" : w.type === "bloccato" ? "Attacco bloccato" : "Parola neutra");
    let val = tr(w.type === "difesa" ? "Resistenza {a} su {b}" : "Stabilità {a} su {b}", { a: w.stab, b: w.max });
    const consuma = (w.type !== "difesa" || w.consacrata) ? tr(" · perde 1 a ogni turno di {n}", { n: who }) : "";
    return h("li", null, h("strong", { text: w.text }), " — " + tr("{t} di {n}", { t: tipo, n: who }) + ". " + val + consuma + ".");''')
rep('''  sheet("Lettera " + (t ? t.l : ""), [
    h("p", { class: "sub", text: "Valore " + (t ? G.VAL[t.l] : "") + (t && G.VAL[t.l] >= 3 ? " · Runa: torna a chi l'ha posata quando la parola si spegne" : " · Consumabile") }),''', '''  sheet(tr("Lettera {l}", { l: t ? t.l : "" }), [
    h("p", { class: "sub", text: tr("Valore {n}", { n: t ? G.VAL[t.l] : "" }) + tr(t && G.VAL[t.l] >= 3 ? " · Runa: torna a chi l'ha posata quando la parola si spegne" : " · Consumabile") }),''')

# ---------- dizionario ----------
rep('''count.textContent = dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…";''', '''count.textContent = tr(dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…");''')
rep('''count.textContent = hand.length + extra.length < 2 ? "Scrivi almeno due lettere." : r.total ? r.total + " parole" + (r.total > 150 ? " (mostrate le prime 150)" : "") : "Nessuna parola con queste lettere.";''', '''count.textContent = hand.length + extra.length < 2 ? tr("Scrivi almeno due lettere.") : r.total ? tr("{n} parole", { n: r.total }) + (r.total > 150 ? tr(" (mostrate le prime 150)") : "") : tr("Nessuna parola con queste lettere.");''')
rep('''title: (libero ? "Parola" : (nomi[kind] || "Neutra")) + (canPlace ? ": tocca per posizionarla" : ""),''', '''title: (libero ? tr("Parola") : (nomi[kind] || tr("Neutra"))) + (canPlace ? tr(": tocca per posizionarla") : ""),''')
rep('''    h("p", { class: "sub", text: "Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R)." + (myHand ? " Nel tuo turno tocca una parola per posizionarla sul campo." : "") }),''', '''    h("p", { class: "sub", text: tr("Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R).") + (myHand ? tr(" Nel tuo turno tocca una parola per posizionarla sul campo.") : "") }),''')
rep('''  sheet("Dizionario", x.nodes);''', '''  sheet(tr(G.CFG.lingua === "en" ? "Dizionario inglese" : "Dizionario italiano"), x.nodes);''')
rep('''    fill(el, h("h3", { text: "Dizionario" }), side.nodes);''', '''    el.setAttribute("aria-label", tr("Dizionario"));
    fill(el, h("h3", { text: tr(G.CFG.lingua === "en" ? "Dizionario inglese" : "Dizionario italiano") }), side.nodes);''')

# ---------- regole ----------
rep('''  if (c.attaccoLibero) return sheet("Regole in breve (s1)", [h("ul", null,''', '''  const scrivi = c.lingua === "en" ? "A turno scrivi una parola inglese sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum." : "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.";
  if (c.attaccoLibero) return sheet(tr("Regole in breve (s1)"), [h("ul", null,''')
rep('''    h("li", { text: "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum." }),''', '''    h("li", { text: tr(scrivi) }),''', 2)
rep('''    h("li", { text: "Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è " + (c.consacrazione >= 1 ? c.consacrazione + " volte" : "metà del") + " il punteggio, massimo " + (c.maxConsacrate || 2) + " attive, e perde 1 a ogni tuo turno." }),''', '''    h("li", { text: tr("Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è {r} il punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.", { r: c.consacrazione >= 1 ? tr("{n} volte", { n: c.consacrazione }) : tr("metà del"), m: c.maxConsacrate || 2 }) }),''')
rep('''    h("li", { text: c.scudo === "riga" ? "Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano." : "Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto." }),''', '''    h("li", { text: tr(c.scudo === "riga" ? "Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano." : "Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto.") }),''')
rep('''    h("li", { text: "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni " + (c.faloOgni || 3) + " turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine." }),''', '''    h("li", { text: tr("Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni {n} turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine.", { n: c.faloOgni || 3 }) }),''')
rep('''    h("li", { text: "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da " + c.hp + ")." }))]);''', '''    h("li", { text: tr("Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).", { n: c.hp }) }))]);''')
rep('''    h("li", { text: "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da " + c.hp + ")." }),''', '''    h("li", { text: tr("Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).", { n: c.hp }) }),''')
rep('''  sheet("Regole in breve", [h("ul", null,
    h("li", { text: c.letturaDalLato ? "Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte." : "Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso." }),''', '''  sheet(tr("Regole in breve"), [h("ul", null,
    h("li", { text: tr(c.letturaDalLato ? "Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte." : "Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso.") }),''')
rep('''    h("li", { text: "Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo " + (c.maxConsacrate || 2) + " attive)." }),''', '''    h("li", { text: tr("Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo {m} attive).", { m: c.maxConsacrate || 2 }) }),''')
rep('''    h("li", { text: "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni " + (c.faloOgni || 3) + " turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine." }),''', '''    h("li", { text: tr("Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni {n} turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine.", { n: c.faloOgni || 3 }) }),''')

# ---------- anteprima ----------
rep('''return { text: ui.alch.length ? "Cambio " + ui.alch.length + " lettere" : "Tocca le lettere da cambiare" };''', '''return { text: ui.alch.length ? tr("Cambio {n} lettere", { n: ui.alch.length }) : tr("Tocca le lettere da cambiare") };''')
rep('''return { text: "Tocca la casella dove inizia «" + ui.place.word + "»", tipo: ui.place.dir === "h" ? "orizzontale →" : "verticale ↓" };''', '''return { text: tr("Tocca la casella dove inizia «{w}»", { w: ui.place.word }), tipo: tr(ui.place.dir === "h" ? "orizzontale →" : "verticale ↓") };''')
rep('''text: dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…" };''', '''text: tr(dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…") };''')
rep('''tipo: (base.tipo ? base.tipo + " · " : "") + "trascinala per spostarla" }); }''', '''tipo: (base.tipo ? base.tipo + " · " : "") + tr("trascinala per spostarla") }); }''')
rep('''  if (v.type === "falo") return { text: nm, tipo: "Grande Falò su " + v.targets.map(id => s.words[id].text).join(", ") };
  if (v.type === "attacco") return { text: nm, tipo: (v.el ? EL[v.el] + " · " : "Attacco · ") + "potenza " + v.score + (s.cfg.attaccoConsuma ? " · la parola si consuma" : "") };
  if (s.cfg.attaccoLibero && v.type === "neutra") return { text: nm, tipo: "parola neutra · Stabilità " + v.base + (v.launches.length ? " · «Attacca» per lanciarla" : "") };
  if (v.type === "difesa") return { text: nm, tipo: v.consacrata ? "Difesa consacrata · resistenza " + Math.max(1, Math.ceil(v.score * (s.cfg.consacrazione || .5))) : "Difesa · resistenza " + v.score };
  if (v.type === "cataclisma") return { text: nm, tipo: EL[v.el] + " al centro: Cataclisma (ancora senza effetto)" };
  if (v.type === "bloccato") return { text: nm, tipo: "le difese nemiche impediscono il lancio" };
  return { text: nm, tipo: "parola neutra · Stabilità " + v.base };''', '''  if (v.type === "falo") return { text: nm, tipo: tr("Grande Falò su {l}", { l: v.targets.map(id => s.words[id].text).join(", ") }) };
  if (v.type === "attacco") return { text: nm, tipo: (v.el ? tr(EL[v.el]) + " · " : tr("Attacco") + " · ") + tr("potenza {n}", { n: v.score }) + (s.cfg.attaccoConsuma ? tr(" · la parola si consuma") : "") };
  if (s.cfg.attaccoLibero && v.type === "neutra") return { text: nm, tipo: tr("parola neutra · Stabilità {n}", { n: v.base }) + (v.launches.length ? tr(" · «Attacca» per lanciarla") : "") };
  if (v.type === "difesa") return { text: nm, tipo: v.consacrata ? tr("Difesa consacrata · resistenza {n}", { n: Math.max(1, Math.ceil(v.score * (s.cfg.consacrazione || .5))) }) : tr("Difesa · resistenza {n}", { n: v.score }) };
  if (v.type === "cataclisma") return { text: nm, tipo: tr(EL[v.el]) + tr(" al centro: Cataclisma (ancora senza effetto)") };
  if (v.type === "bloccato") return { text: nm, tipo: tr("le difese nemiche impediscono il lancio") };
  return { text: nm, tipo: tr("parola neutra · Stabilità {n}", { n: v.base }) };''')

# ---------- barre, campo ----------
rep('''text: "Consacrate " + cons + "/" + s.cfg.maxConsacrate }));''', '''text: tr("Consacrate {a}/{b}", { a: cons, b: s.cfg.maxConsacrate }) }));''')
rep('''text: left <= 0 ? "Falò pronto" : "Falò tra " + left + " turni" })); }''', '''text: left <= 0 ? tr("Falò pronto") : tr("Falò tra {n} turni", { n: left }) })); }''')
rep('''chips.push(h("span", { class: "chip", text: s.hands[p].length + " lettere" }));''', '''chips.push(h("span", { class: "chip", text: tr("{n} lettere", { n: s.hands[p].length }) }));''')
rep('''text: s.seats[p] ? seatName(s, p) + (s.seats[p].tok === MYID && !(s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok) ? " (tu)" : "") : NOMI[p] + " (libero)" }),''', '''text: s.seats[p] ? seatName(s, p) + (s.seats[p].tok === MYID && !(s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok) ? tr(" (tu)") : "") : tr(NOMI[p]) + tr(" (libero)") }),''')
rep('''    h("span", { class: "hpn", text: hp + " PV" }),''', '''    h("span", { class: "hpn", text: tr("{n} PV", { n: hp }) }),''')
rep('''    const label = "Riga " + (r + 1) + ", colonna " + (c + 1) + (t ? ", lettera " + t.l : pend[k] ? ", lettera " + pend[k] + " in posa" : ", vuota");''', '''    const label = tr("Riga {r}, colonna {c}", { r: r + 1, c: c + 1 }) + (t ? tr(", lettera {l}", { l: t.l }) : pend[k] ? tr(", lettera {l} in posa", { l: pend[k] }) : tr(", vuota"));''')

rep('''kids.push(h("span", { class: "mult " + G.MULT[k], text: G.MULT[k] }));''', '''kids.push(h("span", { class: "mult " + G.MULT[k], text: tr(G.MULT[k]) }));''')

# ---------- partita ----------
rep('''  if (s.winner) status = "Vince " + seatName(s, s.winner) + "!";''', '''  if (s.winner) status = tr("Vince {n}!", { n: seatName(s, s.winner) });''')
rep('''  else if (myTurn()) { status = both ? "Turno del " + NOMI[s.turn] : "Tocca a te"; sub = s.first[me] ? "Primo turno: scrivi nel tuo Sanctum (" + (me === top ? "in alto" : "in basso") + ")." : both ? "Modalità prova: giochi entrambi i maghi." : ""; }
  else if (me && s.seats[s.turn] && s.seats[s.turn].cpu) { status = seatName(s, s.turn) + " sta pensando…"; sub = "Il computer gioca dal tuo dispositivo: resta su questa pagina."; }
  else if (me) { status = "Tocca a " + seatName(s, s.turn); sub = "Puoi chiudere la pagina: la partita ti aspetta."; }
  else status = "Stai guardando: tocca a " + seatName(s, s.turn);''', '''  else if (myTurn()) { status = both ? tr("Turno del {n}", { n: tr(NOMI[s.turn]) }) : tr("Tocca a te"); sub = s.first[me] ? tr("Primo turno: scrivi nel tuo Sanctum ({d}).", { d: tr(me === top ? "in alto" : "in basso") }) : both ? tr("Modalità prova: giochi entrambi i maghi.") : ""; }
  else if (me && s.seats[s.turn] && s.seats[s.turn].cpu) { status = tr("{n} sta pensando…", { n: seatName(s, s.turn) }); sub = tr("Il computer gioca dal tuo dispositivo: resta su questa pagina."); }
  else if (me) { status = tr("Tocca a {n}", { n: seatName(s, s.turn) }); sub = tr("Puoi chiudere la pagina: la partita ti aspetta."); }
  else status = tr("Stai guardando: tocca a {n}", { n: seatName(s, s.turn) });''')
rep('''"aria-label": "Lettera " + l + ", valore " + G.VAL[l],''', '''"aria-label": tr("Lettera {l}, valore {n}", { l, n: G.VAL[l] }),''')
rep('''text: "Cambia " + ui.alch.length + " lettere" }));''', '''text: tr("Cambia {n} lettere", { n: ui.alch.length }) }));''')
rep('''text: "↻ Gira (" + (ui.place.dir === "h" ? "ora orizzontale" : "ora verticale") + ")" }));''', '''text: tr("↻ Gira ({d})", { d: tr(ui.place.dir === "h" ? "ora orizzontale" : "ora verticale") }) }));''')
rep('''text: "Sì, suggerisci (−" + costo + " PV)" })''', '''text: tr("Sì, suggerisci (−{n} PV)", { n: costo }) })''')
rep('''title: "Il computer ti propone la mossa migliore: costa " + costo + " PV",''', '''title: tr("Il computer ti propone la mossa migliore: costa {n} PV", { n: costo }),''')
rep('''text: hintBusy ? "Ci penso…" : "Suggerisci" }));''', '''text: tr(hintBusy ? "Ci penso…" : "Suggerisci") }));''')
rep('''text: "Siediti come " + NOMI[p] }));''', '''text: tr("Siediti come {n}", { n: tr(NOMI[p]) }) }));''')
rep('''text: "Sono " + seatName(s, p) })))''', '''text: tr("Sono {n}", { n: seatName(s, p) }) })))''')
rep('''      h("span", { style: "--c:var(--z" + top + ")", text: "▲ Sanctum " + (top === "A" ? "Blu" : "Rosso") + (me === top && !both ? " (tuo)" : "") }),''', '''      h("span", { style: "--c:var(--z" + top + ")", text: tr("▲ Sanctum {c}", { c: tr(top === "A" ? "Blu" : "Rosso") }) + (me === top && !both ? tr(" (tuo)") : "") }),''')
rep('''      h("span", { style: "--c:var(--z" + G.enemy(top) + ")", text: "▼ Sanctum " + (top === "A" ? "Rosso" : "Blu") + (me === G.enemy(top) && !both ? " (tuo)" : "") })),''', '''      h("span", { style: "--c:var(--z" + G.enemy(top) + ")", text: tr("▼ Sanctum {c}", { c: tr(top === "A" ? "Rosso" : "Blu") }) + (me === G.enemy(top) && !both ? tr(" (tuo)") : "") })),''')
rep('''text: ui.sel !== null ? "Ora tocca una casella del campo" : "Tocca una lettera, poi una casella" })) : null),''', '''text: tr(ui.sel !== null ? "Ora tocca una casella del campo" : "Tocca una lettera, poi una casella") })) : null),''')
rep('''text: "Carico il dizionario (750.000 parole)…" }) : null,''', '''text: tr("Carico il dizionario ({n} parole)…", { n: (DIZ[dictLang] || DIZ.it).parole.toLocaleString(LANG) }) }) : null,''')
rep('''s.log.slice().reverse().map(m => h("div", { text: m })))),''', '''s.log.slice().reverse().map(m => h("div", { text: G.testoLog(m, { A: seatName(s, "A"), B: seatName(s, "B") }) })))),''')
rep('''      : h("div", { class: "actions" }, h("button", { class: "btn link", onclick: () => { ui.delConfirm = true; render(); }, text: "Elimina partita" }))) : null
  );''', '''      : h("div", { class: "actions" }, h("button", { class: "btn link", onclick: () => { ui.delConfirm = true; render(); }, text: "Elimina partita" }))) : null,
    langSwitch()
  );''')

# ---------- tutti gli altri testi fissi: "testo" -> tr("testo") ----------
NO_AUTO = {"Grimorio", "Automa"}
script_i = s.index('<script>\n"use strict";')
testa, corpo = s[:script_i], s[script_i:]
righe = corpo.split("\n")
fuori = ("const REGOLE", "const NOMI", "const EL ", "const EN = ", "const LINGUE_UI")
in_en = False
for i, r in enumerate(righe):
    if r.startswith("const EN = "): in_en = True
    if in_en:
        if r.startswith("}"): in_en = False
        continue
    if r.startswith(fuori): continue
    # tutte le stringhe della riga, in ordine (così le virgolette restano appaiate); si avvolgono quelle non già in tr(
    def avvolgi(m, r=r):
        lit = m.group(1)
        if r[max(0, m.start() - 3):m.start()] == "tr(" or lit not in EN or lit in NO_AUTO: return m.group(0)
        return 'tr("' + lit + '")'
    righe[i] = re.sub(r'"((?:[^"\\]|\\.)*)"', avvolgi, r)
s = testa + "\n".join(righe)
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok (i testi rimasti fuori da tr() si controllano con controlla_traduzioni.py)")
