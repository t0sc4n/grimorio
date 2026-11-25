// Grimorio — interfaccia di gioco (versione online)
"use strict";
const G = window.Grimorio;
const BASE = G.PRESETS.v5f; // v5e + lettura dal lato (campo girato per ciascun giocatore)
// regole da mostrare: quelle della partita aperta, altrimenti quelle scelte nel menu tr("Regole")
function regoleAttive() {
  if (S() && S().cfg) return S().cfg;
  const sel = document.getElementById("regole"), c = ((sel && REGOLE[sel.value]) || REGOLE.s1).cfg;
  const d = dizScelti();
  return d.join() !== "it" ? Object.assign({}, c, { dizionari: d }) : c;
}
const REGOLE = { s1: { cfg: G.PRESETS.s1, nome: "Semplificate (s1)", pv: [40, 60, 80], def: 60 }, v5f: { cfg: G.PRESETS.v5f, nome: "Classiche (con lessico)", pv: [20, 25, 30], def: 30 } };
const NOMI = { A: "Mago Blu", B: "Mago Rosso" };
const EL = { fuoco: "Fuoco", gelo: "Gelo", acqua: "Acqua", terra: "Terra" };

// ---------- piccoli aiuti ----------
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "style") e.style.cssText = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
// sostituisce il contenuto ignorando gli elementi assenti (null, false)
function fill(el, ...kids) { el.replaceChildren(...kids.flat().filter(k => k !== null && k !== undefined && k !== false)); }
const store = {
  // le chiavi salvate prima della correzione del nome (Grimorio) restano leggibili
  get(k, d) { try { let v = localStorage.getItem(k); if (v === null) v = localStorage.getItem(k.replace("grimorio", "grimon" + "io")); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let toastT = null;
function toast(msg, err) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast" + (err ? " err" : ""); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, err ? 4200 : 3000);
}
function sheet(title, body) {
  const s = document.getElementById("sheet"), inn = document.getElementById("sheetIn");
  inn.replaceChildren(h("h3", { text: title }), ...body, h("button", { class: "btn", onclick: closeSheet, text: tr("Chiudi") }));
  s.hidden = false;
}
function closeSheet() { document.getElementById("sheet").hidden = true; }

// ---------- lingue: dell'interfaccia (LANG, switch IT/EN) e delle parole della partita (cfg.lingua) ----------
const LINGUE_UI = { it: "Italiano", en: "English" };
function linguaIniziale() {
  const l = store.get("grimorio-lingua", null);
  if (l === "it" || l === "en") return l;
  return /^it\b/i.test(navigator.language || "") ? "it" : "en";
}
let LANG = linguaIniziale();
G.setLinguaUI(LANG); document.documentElement.lang = LANG;
// traduce un testo dell'interfaccia: la chiave è il testo italiano, {x} sono i parametri
function tr(testo, a) {
  let x = LANG === "en" && EN[testo] !== undefined ? EN[testo] : testo;
  if (a) x = x.replace(/\{(\w+)\}/g, (_, k) => a[k] === undefined ? "" : String(a[k]));
  return x;
}
function setLang(l) { LANG = l; store.set("grimorio-lingua", l); G.setLinguaUI(l); document.documentElement.lang = l; side = null; render(); }
function langSwitch() {
  return h("div", { class: "langsw", role: "group", "aria-label": tr("Lingua dell'interfaccia") },
    Object.keys(LINGUE_UI).map(l => h("button", { class: "btn small" + (LANG === l ? " on" : ""), "aria-pressed": LANG === l, lang: l, title: LINGUE_UI[l], onclick: () => setLang(l), text: l.toUpperCase() })));
}
const EN = {
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
  "Mago Blu": "Blue Wizard",
  "Mago Rosso": "Red Wizard",
  "Automa": "Automaton",
  "Automa (facile)": "Automaton (easy)",
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
  "Attacco": "Attack",
  "Difesa consacrata": "Consecrated defence",
  "Difesa (Terra)": "Defence (Earth)",
  "Cataclisma": "Cataclysm",
  "Attacco bloccato": "Blocked attack",
  "Parola neutra": "Neutral word",
  "Resistenza {a} su {b}": "Resistance {a} of {b}",
  "Stabilità {a} su {b}": "Stability {a} of {b}",
  " · perde 1 a ogni turno di {n}": " · loses 1 on each of {n}'s turns",
  "{t} di {n}": "{t} by {n}",
  "Lettera {l}": "Letter {l}",
  "Valore {n}": "Value {n}",
  " · Runa: torna a chi l'ha posata quando la parola si spegne": " · Rune: goes back to whoever placed it when the word fades",
  " · Consumabile": " · Expendable",
  "Questa lettera non appartiene più a nessuna parola.": "This letter no longer belongs to any word.",
  "es. AEIRMTS": "e.g. AEIRMTS",
  "es. lettere sul campo": "e.g. letters on the board",
  "Tutte": "All",
  "Attacchi": "Attacks",
  "Fuoco": "Fire",
  "Gelo": "Frost",
  "Acqua": "Water",
  "Terra": "Earth",
  "Difese (Terra)": "Defences (Earth)",
  "Neutre": "Neutral",
  "Difesa": "Defence",
  "Neutra": "Neutral",
  "Parola": "Word",
  "Punteggio": "Score",
  "Lunghezza": "Length",
  "Il dizionario non si è caricato: ricarica la pagina.": "The dictionary did not load: reload the page.",
  "Carico il dizionario…": "Loading the dictionary…",
  "Scrivi almeno due lettere.": "Type at least two letters.",
  "{n} parole": "{n} words",
  " (mostrate le prime 150)": " (showing the first 150)",
  "Nessuna parola con queste lettere.": "No words with these letters.",
  ": tocca per posizionarla": ": tap to place it",
  "Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R).": "The words you can make with your letters. Add under “Extra letters” the ones on the board you want to cross: words that use them show it in gold (+R).",
  " Nel tuo turno tocca una parola per posizionarla sul campo.": " On your turn, tap a word to place it on the board.",
  "Le tue lettere": "Your letters",
  "Lettere in più": "Extra letters",
  "Tipo": "Type",
  "Ordina per": "Sort by",
  "Ripristina la mia mano": "Reset to my hand",
  "Dizionario": "Dictionary",
  "Dizionario italiano": "Italian dictionary",
  "Dizionario inglese": "English dictionary",
  "Ognuno vede il proprio Sanctum in basso. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte.": "Each player sees their own Sanctum at the bottom. Vertical words read top to bottom from the side of whoever wrote them.",
  "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.": "Take turns writing an Italian word on the grid, crossword-style: every word formed must be valid. On your first turn you write only in your Sanctum.",
  "A turno scrivi una parola inglese sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.": "Take turns writing an English word on the grid, crossword-style: every word formed must be valid. On your first turn you write only in your Sanctum.",
  "Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata). Con il Collegamento attivo puoi entrare nel Sanctum nemico, agganciandoti a una sua parola.": "Magic Link: a chain of words from your Sanctum to a word lying entirely in the Midlands that touches the Arcane Pass (the golden row). With the Link active you can enter the enemy Sanctum by hooking onto one of its words.",
  "Attacco: qualsiasi parola che ha una lettera nel Sanctum nemico può essere lanciata (tocca «Attacca»). La potenza è il punteggio della parola; l'incantesimo corre verso il bordo del Sanctum nemico e perde 1 per casella e 1 in più per ogni lettera. Dopo il lancio la parola si consuma: sparisce, tranne le lettere che reggono altre parole.": "Attack: any word with a letter in the enemy Sanctum can be launched (tap “Attack”). Its power is the word's score; the spell runs to the edge of the enemy Sanctum and loses 1 per square and 1 more for each letter. After the launch the word is consumed: it disappears, except for letters that hold up other words.",
  "Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è {r} il punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.": "Defence: consecrate a word written entirely in your Sanctum (tap “Consecrate”). Its resistance is {r} its score, up to {m} active, and it loses 1 on each of your turns.",
  "{n} volte": "{n} times",
  "metà del": "half",
  "Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano.": "Shield: a consecrated defence protects its whole row (the striped rows). A spell launched on that row, or crossing it on the way out, must first get past it: if weaker it is absorbed, if stronger it shatters the shield and carries on with the power left. Shields add up.",
  "Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto.": "Defences intercept spells in their column and the ones next to it.",
  "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni {n} turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine.": "Great Bonfire: extend or cross a word in the centre or in the enemy Sanctum and burn it all, whatever its resistance; once every {n} turns. It is the way to remove a Shield that is too strong. Burning words in the centre unleashes a Storm on the nearby words.",
  "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: cambi da 1 a 7 lettere invece di scrivere.": "Words that are not launched act as bridges or obstacles and lose 1 Stability on each of your turns. Alchemy: change 1 to 7 letters instead of writing.",
  "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).": "The winner is whoever brings the opponent to 0 Health Points (this game starts at {n}).",
  "Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte.": "Each player sees their own Sanctum at the bottom, as if sitting on opposite sides of a table. Vertical words read top to bottom from the side of whoever wrote them: you see your opponent's upside down.",
  "Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso.": "The Blue Wizard's Sanctum is at the top, the Red Wizard's at the bottom. Words read left to right and top to bottom.",
  "Le parole di Fuoco, Gelo e Acqua sono attacchi: scegli una loro lettera in un Sanctum e l'incantesimo corre dritto lungo la colonna verso il mago avversario. Perde 1 di potenza per casella e 1 in più per ogni lettera che attraversa.": "Fire, Frost and Water words are attacks: pick one of their letters in a Sanctum and the spell runs straight along the column towards the enemy wizard. It loses 1 power per square and 1 more for each letter it crosses.",
  "Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo {m} attive).": "Earth words are permanent defences: they intercept spells in their column and the ones next to it. You can also consecrate a neutral word in your Sanctum as a defence (half resistance, it wears out, up to {m} active).",
  "Per invadere il Sanctum nemico serve il Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata).": "To invade the enemy Sanctum you need the Magic Link: a chain of words from your Sanctum to a word lying entirely in the Midlands that touches the Arcane Pass (the golden row).",
  "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni {n} turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine.": "Great Bonfire: extend or cross a word in the centre or in the enemy Sanctum and burn it, once every {n} turns. Destroying words in the centre unleashes a Storm on the nearby words.",
  "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: cambi da 1 a 7 lettere invece di scrivere.": "Attack and neutral words lose 1 Stability on each of your turns and then fade. Alchemy: change 1 to 7 letters instead of writing.",
  "Toccando una lettera sulla griglia vedi a quali parole appartiene, il loro tipo e quanto durano ancora.": "Tap a letter on the grid to see which words it belongs to, their type and how long they will last.",
  "Cambio {n} lettere": "Changing {n} letters",
  "Tocca le lettere da cambiare": "Tap the letters to change",
  "Tocca la lettera da cui lanciare": "Tap the letter to launch from",
  "il numero è il danno previsto": "the number is the expected damage",
  "Tocca la casella dove inizia «{w}»": "Tap the square where “{w}” starts",
  "orizzontale →": "horizontal →",
  "verticale ↓": "vertical ↓",
  "trascinala per spostarla": "drag it to move it",
  "Grande Falò su {l}": "Great Bonfire on {l}",
  "potenza {n}": "power {n}",
  " · la parola si consuma": " · the word is consumed",
  "parola neutra · Stabilità {n}": "neutral word · Stability {n}",
  " · «Attacca» per lanciarla": " · “Attack” to launch it",
  "Difesa consacrata · resistenza {n}": "Consecrated defence · resistance {n}",
  "Difesa · resistenza {n}": "Defence · resistance {n}",
  " al centro: Cataclisma (ancora senza effetto)": " in the centre: Cataclysm (no effect yet)",
  "le difese nemiche impediscono il lancio": "the enemy defences block the launch",
  "Ponte attivo": "Bridge active",
  "Ponte non attivo": "Bridge not active",
  "Consacrate {a}/{b}": "Consecrated {a}/{b}",
  "Falò pronto": "Bonfire ready",
  "Falò tra {n} turni": "Bonfire in {n} turns",
  "{n} lettere": "{n} letters",
  " (tu)": " (you)",
  " (libero)": " (open)",
  "Punti Vita": "Health Points",
  "Riga {r}, colonna {c}": "Row {r}, column {c}",
  ", lettera {l}": ", letter {l}",
  ", lettera {l} in posa": ", letter {l} being placed",
  ", vuota": ", empty",
  "Campo di battaglia": "Battlefield",
  "LD": "DL",
  "PD": "DW",
  "← Partite": "← Games",
  "Carico la partita…": "Loading the game…",
  "Vince {n}!": "{n} wins!",
  "In attesa dello sfidante": "Waiting for the challenger",
  "Il posto del Mago Rosso è libero": "The Red Wizard's seat is open",
  "Invita qualcuno: vedi «Come sfidare qualcuno a distanza» nella pagina delle partite.": "Invite someone: see “How to challenge someone remotely” on the games page.",
  "Turno del {n}": "{n}'s turn",
  "Primo turno: scrivi nel tuo Sanctum ({d}).": "First turn: write in your Sanctum ({d}).",
  "in alto": "at the top",
  "in basso": "at the bottom",
  "Modalità prova: giochi entrambi i maghi.": "Practice mode: you play both wizards.",
  "{n} sta pensando…": "{n} is thinking…",
  "Il computer gioca dal tuo dispositivo: resta su questa pagina.": "The computer plays from your device: stay on this page.",
  "Puoi chiudere la pagina: la partita ti aspetta.": "You can close the page: the game will wait for you.",
  "Stai guardando: tocca a {n}": "You are watching: {n}'s turn",
  "Il tuo Grimorio": "Your Grimoire",
  "Lettera {l}, valore {n}": "Letter {l}, value {n}",
  "Annulla lancio": "Cancel launch",
  "Annulla": "Cancel",
  "Cambia {n} lettere": "Change {n} letters",
  "↻ Gira ({d})": "↻ Turn ({d})",
  "ora orizzontale": "now horizontal",
  "ora verticale": "now vertical",
  "Ritira": "Take back",
  "Gira la parola": "Turn the word",
  "↻ Gira": "↻ Turn",
  "Attacca": "Attack",
  "Falò": "Bonfire",
  "Consacra": "Consecrate",
  "Conferma": "Confirm",
  "Mescola": "Shuffle",
  "Alchimia": "Alchemy",
  "Sì, suggerisci (−{n} PV)": "Yes, give me a hint (−{n} HP)",
  "Il computer ti propone la mossa migliore: costa {n} PV": "The computer suggests the best move: it costs {n} HP",
  "Ci penso…": "Thinking…",
  "Suggerisci": "Hint",
  "Sì, passa il turno": "Yes, pass",
  "Passa": "Pass",
  "Siediti come {n}": "Sit down as {n}",
  "Sono {n}": "I am {n}",
  "Stai già giocando questa partita da un altro dispositivo?": "Already playing this game on another device?",
  "▲ Sanctum {c}": "▲ {c} Sanctum",
  "▼ Sanctum {c}": "▼ {c} Sanctum",
  "Blu": "Blue",
  "Rosso": "Red",
  " (tuo)": " (yours)",
  "Passo Arcano · → ↓ ↑ verso di lettura": "Arcane Pass · → ↓ ↑ reading direction",
  "Ora tocca una casella del campo": "Now tap a square on the board",
  "Tocca una lettera, poi una casella": "Tap a letter, then a square",
  "Carico il dizionario ({n} parole)…": "Loading the dictionary ({n} words)…",
  "Cronaca della partita": "Game log",
  "Elimina per sempre": "Delete forever",
  "Elimina partita": "Delete game",
  "Dizionari della partita": "Game dictionaries",
  "Una parola vale se è in almeno uno dei dizionari scelti. Con più dizionari la Sacca è mista: 26 lettere.": "A word counts if it is in at least one of the chosen dictionaries. With more than one dictionary the Bag is mixed: 26 letters.",
  "Con le parole inglesi ci sono solo le regole semplificate.": "With English words only the simplified rules are available.",
  "italiano": "Italian",
  "inglese": "English",
  " o ": " or ",
  "Dizionario: {l}": "Dictionary: {l}",
  "A turno scrivi una parola in {l} sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.": "Take turns writing a word in {l} on the grid, crossword-style: every word formed must be valid. On your first turn you write only in your Sanctum.",
  " Con più dizionari vale una parola di uno qualsiasi, e la Sacca è mista: 26 lettere, con quantità e valori nella media delle lingue scelte.": " With more than one dictionary a word from any of them counts, and the Bag is mixed: 26 letters, with quantities and values averaged over the chosen languages."
};
// testi della sola versione online
Object.assign(EN, {"Nessuna connessione con il server. Controlla la rete e riprova.": "No connection to the server. Check the network and try again.", "Errore del server ({n}).": "Server error ({n}).", "Questo browser non supporta le notifiche. Su Android usa Chrome e installa Grimorio sulla schermata Home.": "This browser does not support notifications. On Android, use Chrome and install Grimorio on the Home screen.", "Notifiche non attivate: puoi abilitarle dalle impostazioni del browser.": "Notifications not enabled: you can turn them on in the browser settings.", "Notifiche attive: ti avviso quando tocca a te.": "Notifications on: I will let you know when it is your turn.", "Non riesco ad attivare le notifiche su questo dispositivo.": "I can't turn on notifications on this device.", "🔔 Avvisami quando tocca a me": "🔔 Notify me when it is my turn", "Ti sfido a Grimorio! Apri il link e siediti come Mago Rosso.": "I challenge you to Grimorio! Open the link and sit down as the Red Wizard.", "Link copiato: incollalo in un messaggio all'avversario.": "Link copied: paste it in a message to your opponent.", "Invita un amico": "Invite a friend", "Copia questo link e mandalo a chi vuoi sfidare:": "Copy this link and send it to whoever you want to challenge:", "Crea o accetta una partita: il profilo nasce lì.": "Create or accept a game: your profile starts there.", "Il tuo profilo": "Your profile", "Sei {n} su questo dispositivo.": "You are {n} on this device.", "Per giocare le stesse partite da un altro telefono o computer, apri lì questo link. Non mandarlo a nessuno: chi lo apre gioca al posto tuo.": "To play the same games from another phone or computer, open this link there. Don't send it to anyone: whoever opens it plays as you.", "Link di accesso copiato.": "Access link copied.", "Copia il link di accesso": "Copy the access link", "Accesso eseguito: bentornato, {n}.": "Signed in: welcome back, {n}.", "Il link di accesso non è valido.": "The access link is not valid.", "Se pensi che il link sia finito in mani sbagliate, crea un nuovo codice: tutti gli altri dispositivi verranno scollegati.": "If you think the link has fallen into the wrong hands, create a new code: all other devices will be signed out.", "Scollega gli altri dispositivi": "Sign out other devices", "Fatto: gli altri dispositivi sono scollegati. Questo resta collegato.": "Done: the other devices are signed out. This one stays signed in.", "Collegamento al server…": "Connecting to the server…", "Non riesco a raggiungere il server. Controlla la connessione e riprova.": "I can't reach the server. Check your connection and try again.", "Nessuna partita. Creane una qui sopra, oppure apri il link d'invito che ti hanno mandato.": "No games yet. Create one above, or open the invite link you were sent.", "Crea una partita scegliendo «Un'altra persona» e tocca «Invita un amico»: manda il link su WhatsApp o dove preferisci. Chi lo apre sceglie un nome e si siede come Mago Rosso. Ognuno gioca il proprio turno quando può; con le notifiche attive il telefono ti avvisa quando tocca a te.": "Create a game choosing “Another person” and tap “Invite a friend”: send the link on WhatsApp or wherever you like. Whoever opens it picks a name and sits down as the Red Wizard. Each of you plays your turn when you can; with notifications on, your phone tells you when it is your turn.", "Installa Grimorio sul telefono": "Install Grimorio on your phone", "In Chrome per Android apri il menu ⋮ e scegli «Aggiungi a schermata Home» (o «Installa app»). Grimorio si aprirà a tutto schermo come un'app e potrà mandarti le notifiche.": "In Chrome for Android open the ⋮ menu and choose “Add to Home screen” (or “Install app”). Grimorio will open full screen like an app and can send you notifications.", "Partita creata: ora tocca «Invita un amico».": "Game created: now tap “Invite a friend”.", "Questa partita non esiste più.": "This game no longer exists.", "Partita tolta dall'elenco.": "Game removed from the list.", "Sei il Mago Rosso. Inizia il Mago Blu: ti avviso quando tocca a te.": "You are the Red Wizard. The Blue Wizard starts: I will let you know when it is your turn.", "Sei stato sfidato a Grimorio!": "You have been challenged to Grimorio!", "Manda il link d'invito: la partita inizia quando l'avversario si siede.": "Send the invite link: the game starts when your opponent sits down.", "Scegli il tuo nome e siediti come Mago Rosso.": "Choose your name and sit down as the Red Wizard.", "Puoi chiudere: ti avviso quando tocca a te.": "You can close the page: I will let you know when it is your turn.", "Siediti come Mago Rosso": "Sit down as the Red Wizard", "Questa partita ha già due giocatori. Se è tua, aprila dal dispositivo con cui giochi o usa il link di accesso del tuo profilo.": "This game already has two players. If it is yours, open it from the device you play on or use the access link in your profile.", "Togli dall'elenco": "Remove from the list", "Sì, elimina la partita": "Yes, delete the game", "Sì, abbandono (vince l'avversario)": "Yes, I give up (my opponent wins)", "Abbandona la partita": "Leave the game", "tempo scaduto": "time is up", "1 ora": "1 hour", "{n} ore": "{n} hours", "{n} minuti": "{n} minutes", "Tempo scaduto: il turno sta per passare.": "Time is up: the turn is about to pass.", "Hai ancora {t} per giocare, poi il turno passa.": "You still have {t} to play, then the turn passes.", "Ha ancora {t} per giocare.": "They still have {t} to play.", "A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita.": "When playing remotely you have 48 hours per turn: when time runs out the turn passes by itself. Whoever lets it run out twice in a row loses the game."});

// ---------- dizionario ----------
// un dizionario per lingua, caricato solo quando serve; dictState / DICT_TEXT / DICT_OFFS sono quelli della partita in uso
// (con più dizionari, DICT_TEXT è il loro testo unito)
const DIZ = { it: { file: "parole.txt", parole: 750000, nome: tr("italiano") }, en: { file: "words-en.txt", parole: 140000, nome: tr("inglese") } };
const DIZ_UNITI = {};
let dictState = "carico", dictLang = "it", dictLangs = ["it"];
let DICT_TEXT = "", DICT_OFFS = null;
function makeDict(text) {
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offs.push(i + 1);
  const o = Uint32Array.from(offs), n = o.length;
  const line = i => text.slice(o[i], i + 1 < n ? o[i + 1] - 1 : text.length);
  return { text, offs: o, has(w) { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = line(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } };
}
function usaDiz(ls) {
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
function nomiDiz(c, sep) { return G.dizionariDi(c || {}).map(l => tr(DIZ[l].nome)).join(sep || tr(" o ")); }
async function loadDict(l) {
  const d = DIZ[l]; if (d.stato) return;
  d.stato = "carico";
  try {
    const res = await fetch(d.file);
    if (!res.ok) throw new Error("http " + res.status);
    const buf = new Uint8Array(await res.arrayBuffer());
    let text;
    if (buf[0] === 0x1f && buf[1] === 0x8b) text = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    else text = new TextDecoder().decode(buf);
    const dz = makeDict(text.replace(/\r/g, "").trim());
    d.text = dz.text; d.offs = dz.offs;
    G.setDict(dz, l);
    d.stato = "pronto";
  } catch (e) { d.stato = "errore"; }
  if (dictLangs.includes(l)) usaDiz(dictLangs);
  render();
}
// dizionari scelti per le nuove partite (salvati sul dispositivo; prima era una sola lingua)
function dizScelti() {
  let l = store.get("grimorio-lingua-parole", [LANG]);
  if (!Array.isArray(l)) l = [l];
  return G.dizionariDi({ dizionari: l });
}

// ---------- collegamento al server ----------
let CRED = store.get("grimorio-cred", null);   // { id, token, name }: chi sei su questo dispositivo
let MYID = CRED ? CRED.id : null;
let conn = "collego";                          // collego | ok | errore
let games = {};
let cur = null;                                // { id, data: { id, s, updated } }
let pendingOpen = null;
let ws = null, wsTimer = null, wsDelay = 1000;

function myName() { return store.get("grimorio-nome", "") || (CRED && CRED.name) || ""; }
async function api(method, path, body) {
  const headers = { "Content-Type": "application/json", "X-Lingua": LANG };  // il server risponde nella lingua dell'interfaccia
  if (CRED) headers.Authorization = "Bearer " + CRED.token;
  let res;
  try { res = await fetch("/api/" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { const err = new Error(tr("Nessuna connessione con il server. Controlla la rete e riprova.")); err.status = 0; throw err; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || tr("Errore del server ({n}).", { n: res.status })); err.status = res.status; throw err; }
  return data;
}
async function ensurePlayer() {
  if (CRED) return CRED;
  const r = await api("POST", "players", { name: myName() || "Mago" });
  CRED = { id: r.id, token: r.token, name: r.name }; MYID = r.id;
  store.set("grimorio-cred", CRED);
  connectWs();
  return CRED;
}
async function saveName(n) {
  n = (n || "").trim(); store.set("grimorio-nome", n);
  if (CRED && n) { try { const r = await api("POST", "me", { name: n }); CRED.name = r.name; store.set("grimorio-cred", CRED); } catch (e) {} }
}
async function loadGames() {
  if (!CRED) { conn = "ok"; render(); return; }
  try { const r = await api("GET", "games"); const g = {}; r.games.forEach(x => { g[x.id] = x; }); games = g; conn = "ok"; }
  catch (e) { conn = "errore"; }
  render();
}
function connectWs() {
  if (!CRED || (ws && ws.readyState <= 1)) return;
  try { ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"); } catch (e) { return; }
  ws.onopen = () => {
    wsDelay = 1000;
    wsSend({ type: "hello", token: CRED.token });
    wsSend({ type: "visible", v: document.visibilityState === "visible" });
    if (cur) wsSend({ type: "watch", id: cur.id });
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.type === "game") onServerGame(m);
    // collegamento (ri)aperto: recupera ciò che è successo mentre non eri collegato
    else if (m.type === "ready") { if (cur) refreshGame(cur.id); else loadGames(); }
  };
  ws.onclose = () => { ws = null; clearTimeout(wsTimer); wsTimer = setTimeout(connectWs, wsDelay); wsDelay = Math.min(wsDelay * 2, 30000); };
}
function wsSend(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function onServerGame(m) {
  games[m.id] = { id: m.id, s: m.s, updated: m.updated };
  if (cur && cur.id === m.id) onGameData(games[m.id]); else render();
}
document.addEventListener("visibilitychange", () => {
  wsSend({ type: "visible", v: document.visibilityState === "visible" });
  if (document.visibilityState === "visible") { connectWs(); if (cur) refreshGame(cur.id); else loadGames(); }
});

// ---------- notifiche ----------
function pushSupported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
function pushOn() { return pushSupported() && Notification.permission === "granted" && store.get("grimorio-push", false); }
function b64ToU8(b) { const p = "=".repeat((4 - b.length % 4) % 4); const x = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(x, c => c.charCodeAt(0)); }
async function enablePush(silent) {
  try {
    if (!pushSupported()) { if (!silent) toast(tr("Questo browser non supporta le notifiche. Su Android usa Chrome e installa Grimorio sulla schermata Home."), true); return; }
    await ensurePlayer();
    const perm = silent ? Notification.permission : await Notification.requestPermission();
    if (perm !== "granted") { if (!silent) toast(tr("Notifiche non attivate: puoi abilitarle dalle impostazioni del browser."), true); return; }
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api("GET", "push/key");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
    await api("POST", "push/subscribe", { subscription: sub.toJSON() });
    store.set("grimorio-push", true);
    if (!silent) toast(tr("Notifiche attive: ti avviso quando tocca a te."));
    render();
  } catch (e) { if (!silent) toast(tr("Non riesco ad attivare le notifiche su questo dispositivo."), true); }
}
function pushButton(cls) {
  if (pushOn() || !pushSupported()) return null;
  return h("button", { class: cls || "btn small", onclick: () => enablePush(false), text: tr("🔔 Avvisami quando tocca a me") });
}

// ---------- invito e altri dispositivi ----------
function inviteUrl(id) { return location.origin + "/#g=" + id; }
async function invite() {
  const url = inviteUrl(cur.id), text = tr("Ti sfido a Grimorio! Apri il link e siediti come Mago Rosso.");
  if (navigator.share) { try { await navigator.share({ title: "Grimorio", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); toast(tr("Link copiato: incollalo in un messaggio all'avversario.")); }
  catch (e) { sheet(tr("Invita un amico"), [h("p", { text: tr("Copia questo link e mandalo a chi vuoi sfidare:") }), h("input", { type: "text", id: "link-invito", value: url, readonly: true, onfocus: ev => ev.target.select() })]); }
}
function showProfile() {
  if (!CRED) return toast(tr("Crea o accetta una partita: il profilo nasce lì."));
  const link = location.origin + "/#accedi=" + CRED.token;
  sheet(tr("Il tuo profilo"), [
    h("p", { text: tr("Sei {n} su questo dispositivo.", { n: CRED.name || "Mago" }) }),
    h("p", { class: "sub", text: tr("Per giocare le stesse partite da un altro telefono o computer, apri lì questo link. Non mandarlo a nessuno: chi lo apre gioca al posto tuo.") }),
    h("input", { type: "text", id: "link-accesso", value: link, readonly: true, onfocus: ev => ev.target.select() }),
    h("button", { class: "btn small", onclick: async () => { try { await navigator.clipboard.writeText(link); toast(tr("Link di accesso copiato.")); } catch (e) { document.getElementById("link-accesso").select(); } }, text: tr("Copia il link di accesso") }),
    h("p", { class: "sub", text: tr("Se pensi che il link sia finito in mani sbagliate, crea un nuovo codice: tutti gli altri dispositivi verranno scollegati.") }),
    h("button", { class: "btn small danger", onclick: rotateToken, text: tr("Scollega gli altri dispositivi") })
  ]);
}
async function rotateToken() {
  try {
    const r = await api("POST", "me/rotate");
    CRED.token = r.token; store.set("grimorio-cred", CRED);
    if (ws) ws.close();
    closeSheet(); toast(tr("Fatto: gli altri dispositivi sono scollegati. Questo resta collegato."));
  } catch (e) { toast(e.message, true); }
}
async function useAccessLink(token) {
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  const prev = CRED; CRED = { id: token.split(".")[0], token, name: "" };
  try { const me = await api("GET", "me"); CRED.name = me.name; MYID = me.id; store.set("grimorio-cred", CRED); store.set("grimorio-nome", me.name); toast(tr("Accesso eseguito: bentornato, {n}.", { n: me.name })); }
  catch (e) { CRED = prev; toast(tr("Il link di accesso non è valido."), true); }
}

// ---------- stato dell'interfaccia ----------
let ui = freshUi();
function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, passConfirm: false, hintConfirm: false, hintLaunch: null, delConfirm: false, busy: false, order: null }; }
let anim = null;

function S() { return cur && cur.data && cur.data.s; }
function mySeat() {
  const s = S(); if (!s) return null;
  const a = s.seats.A && s.seats.A.tok === MYID, b = s.seats.B && s.seats.B.tok === MYID;
  if (a && b) return s.turn;
  return a ? "A" : b ? "B" : null;
}
function viewSeat() { return mySeat() || "A"; }
function flipped() { const s = S(); return !!(s && s.cfg && s.cfg.letturaDalLato); }
function topSeat() { return flipped() ? G.enemy(viewSeat()) : "A"; }
function seatName(s, p) {
  const x = s.seats[p];
  if (!x || !x.nome || x.nome === NOMI[p]) return tr(NOMI[p]);
  if (x.cpu) return tr(x.livello === "facile" ? tr("Automa (facile)") : "Automa");
  return x.nome;
}
function myTurn() { const s = S(); return !!s && !s.winner && mySeat() === s.turn && !!s.seats[G.enemy(s.turn)]; }

// ---------- lobby ----------
function renderLobby() {
  const L = document.getElementById("lobby");
  const ids = Object.keys(games).sort((a, b) => (games[b].updated || 0) - (games[a].updated || 0));
  const connMsg = { collego: tr("Collegamento al server…"), errore: tr("Non riesco a raggiungere il server. Controlla la connessione e riprova."), ok: "" }[conn];
  const name = h("input", { type: "text", id: "nome", maxlength: "24", placeholder: tr("Come ti chiami?"), value: myName(), oninput: e => store.set("grimorio-nome", e.target.value.trim()), onchange: e => saveName(e.target.value) });
  const hp = h("select", { id: "pv" });
  const fillHp = k => fill(hp, ...REGOLE[k].pv.map(v => h("option", { value: v, selected: v === REGOLE[k].def, text: tr("{n} PV", { n: v }) })));
  const reg = h("select", { id: "regole", onchange: e => fillHp(e.target.value) });
  // in inglese ci sono solo le regole s1: il lessico delle classiche è italiano
  // dizionari della partita: uno o più; le regole classiche (con lessico) solo con il solo italiano
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
  fillReg();
  const both = h("input", { type: "checkbox", id: "entrambi" });
  const vs = h("select", { id: "avversario", onchange: e => { both.disabled = e.target.value !== "persona"; if (both.disabled) both.checked = false; } },
    h("option", { value: "persona", text: tr("Un'altra persona (a distanza)"), selected: true }),
    h("option", { value: "facile", text: tr("Il computer, livello facile") }),
    h("option", { value: "normale", text: tr("Il computer, livello normale") }));
  const canCreate = conn !== "collego";
  fill(L, 
    h("div", { class: "card", style: "background:transparent;border:none;padding:0" },
      langSwitch(),
      h("h1", { text: "Grimorio" }),
      h("p", { class: "sub", text: tr("Duelli di parole tra due maghi. Scrivi incantesimi nel tuo Sanctum, costruisci un ponte fino al Passo Arcano e invadi il Sanctum nemico.") })),
    connMsg ? h("p", { class: "note", text: connMsg }) : null,
    pushButton("btn"),
    h("div", { class: "card" },
      h("h2", { text: tr("Nuova partita") }),
      h("label", { class: "field", for: "nome" }, tr("Il tuo nome di mago"), name),
      h("label", { class: "field", for: "avversario" }, tr("Avversario"), vs),
      h("div", { class: "field", role: "group", "aria-labelledby": "diz-titolo" }, h("span", { id: "diz-titolo", text: tr("Dizionari della partita") }),
        h("div", { class: "dzsel" }, dzBox.map(x => h("label", { class: "check", for: x.id }, x, h("span", { lang: x.value, text: LINGUE_UI[x.value] })))), dzNota),
      h("label", { class: "field", for: "regole" }, tr("Regole"), reg),
      h("label", { class: "field", for: "pv" }, tr("Punti Vita iniziali"), hp),
      h("label", { class: "check", for: "entrambi" }, both, tr("Gioca entrambi i maghi (per provare da solo)")),
      h("button", { class: "btn primary", disabled: !canCreate, onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value, dizSel()), text: tr("Crea partita") })),
    h("div", { class: "card" },
      h("h2", { text: tr("Partite") }),
      ids.length ? h("div", { class: "gamelist" }, ids.map(id => gameItem(id, games[id]))) : h("p", { class: "note", text: conn === "collego" ? tr("Carico le partite…") : tr("Nessuna partita. Creane una qui sopra, oppure apri il link d'invito che ti hanno mandato.") })),
    h("details", null, h("summary", { text: tr("Come sfidare qualcuno a distanza") }),
      h("p", { class: "note", style: "margin-top:8px", text: tr("Crea una partita scegliendo «Un'altra persona» e tocca «Invita un amico»: manda il link su WhatsApp o dove preferisci. Chi lo apre sceglie un nome e si siede come Mago Rosso. Ognuno gioca il proprio turno quando può; con le notifiche attive il telefono ti avvisa quando tocca a te.") })),
    h("details", null, h("summary", { text: tr("Installa Grimorio sul telefono") }),
      h("p", { class: "note", style: "margin-top:8px", text: tr("In Chrome per Android apri il menu ⋮ e scegli «Aggiungi a schermata Home» (o «Installa app»). Grimorio si aprirà a tutto schermo come un'app e potrà mandarti le notifiche.") })),
    h("div", { class: "row" }, h("button", { class: "btn link", onclick: showRules, text: tr("Regole in breve") }), h("button", { class: "btn link", onclick: showExplorer, text: tr("Esplora il dizionario") }), CRED ? h("button", { class: "btn link", onclick: showProfile, text: tr("Il tuo profilo") }) : null),
    h("p", { class: "note fonte" },
      tr("Grimorio è software libero: "),
      h("a", { href: "https://github.com/t0sc4n/grimorio", target: "_blank", rel: "noopener", text: tr("codice sorgente") }),
      " (AGPL-3.0) · ",
      h("a", { href: "https://github.com/t0sc4n/grimorio/blob/main/prototipo/DIZIONARIO.md", target: "_blank", rel: "noopener", text: tr("dizionari") }),
      tr(" (italiano: GPL-3.0, dall'Estensione linguistica italiana di A. Pescetti e altri; inglese: ENABLE, pubblico dominio)"))
  );
}
// tempo rimasto per il turno, in parole ("31 ore", "40 minuti"); "" se non c'è orologio, null se è scaduto
function timeLeft(s) {
  if (!s || !s.deadline || s.winner) return "";
  const ms = s.deadline - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600e3);
  return h >= 1 ? (h === 1 ? tr("1 ora") : tr("{n} ore", { n: h })) : tr("{n} minuti", { n: Math.max(1, Math.ceil(ms / 60e3)) });
}
function clockText(s, mine) {
  const t = timeLeft(s); if (t === "") return "";
  return t === null ? tr("Tempo scaduto: il turno sta per passare.") : tr(mine ? tr("Hai ancora {t} per giocare, poi il turno passa.") : tr("Ha ancora {t} per giocare."), { t });
}
setInterval(() => { const el = document.getElementById("orologio"); if (el && cur && games[cur.id]) el.textContent = clockText(games[cur.id].s, myTurn()); }, 30000);
function gameItem(id, d) {
  const s = d.s; if (!s || !s.seats) return null;
  const mine = (s.seats.A && s.seats.A.tok === MYID) || (s.seats.B && s.seats.B.tok === MYID);
  let st, tag = null;
  if (s.winner) st = tr("Vince {n}", { n: seatName(s, s.winner) });
  else if (!s.seats.B) { st = tr("In attesa del Mago Rosso"); tag = mine ? null : tr("Libero"); }
  else { st = tr("Tocca a {n}", { n: seatName(s, s.turn) }); if (mine && ((s.seats[s.turn] || {}).tok === MYID || (s.seats[s.turn] || {}).cpu)) tag = (s.seats[s.turn] || {}).cpu ? tr("Contro il computer") : tr("Tocca a te"); }
  return h("button", { class: "gameitem", onclick: () => openGame(id) },
    h("span", { class: "vs" }, h("span", { class: "dotA", text: seatName(s, "A") + " " + s.hp.A }), tr("  contro  "), h("span", { class: "dotB", text: (s.seats.B ? seatName(s, "B") : "—") + " " + s.hp.B })),
    tag ? h("span", { class: "tag", text: tag }) : h("span", { class: "tag idle", text: tr("{n} PV", { n: s.cfg && s.cfg.hp ? s.cfg.hp : 30 }) }),
    h("span", { class: "st", text: st + (timeLeft(s) !== "" ? " · " + (timeLeft(s) || tr("tempo scaduto")) : "") + " · " + tr("mossa {n}", { n: s.moveNo }) + " · " + ((s.cfg && s.cfg.lingua) || "it").toUpperCase() }));
}
async function createGame(hp, both, vs, regole, dizionari) {
  try {
    await ensurePlayer();
    const r = await api("POST", "games", { hp, both, vs, regole, dizionari });
    games[r.id] = r; openGame(r.id);
    if (vs === "persona" && !both) toast(tr("Partita creata: ora tocca «Invita un amico»."));
  } catch (e) { toast(e.message, true); }
}

// ---------- partita ----------
function openGame(id) {
  ui = freshUi(); anim = null;
  cur = { id, data: games[id] || null };
  try { history.replaceState(null, "", "#g=" + id); } catch (e) {}
  wsSend({ type: "watch", id });
  if (cur.data) onGameData(cur.data, true);
  render(); window.scrollTo(0, 0);
  refreshGame(id);
}
async function refreshGame(id) {
  try { const r = await api("GET", "games/" + id); games[id] = r; if (cur && cur.id === id) onGameData(r); }
  catch (e) {
    if (e.status === 404) { toast(tr("Questa partita non esiste più."), true); if (cur && cur.id === id) leaveGame(); }
    else toast(e.message, true);
  }
}
function leaveGame() {
  wsSend({ type: "unwatch" });
  cur = null; ui = freshUi(); anim = null;
  usaDiz(dizScelti());
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  render(); loadGames();
}
function onGameData(data, first) {
  const prev = cur && cur.data && cur.data.s;
  cur.data = JSON.parse(JSON.stringify(data));
  const s = cur.data.s;
  G.applyCfg(s.cfg || BASE);
  usaDiz(G.dizionariDi(s.cfg || {}));
  if (!prev || prev.moveNo !== s.moveNo) { const keepOrder = ui.order; ui = freshUi(); ui.order = keepOrder; }
  const seen = store.get("grimorio-visto", {});
  if (s.last && s.last.seq && seen[cur.id] !== s.last.seq) {
    seen[cur.id] = s.last.seq; store.set("grimorio-visto", seen);
    announce(s); startAnim(s.last);
  }
  render();
}
function announce(s) {
  const L = s.last; if (!L) return;
  const who = seatName(s, L.by);
  if (L.kind === "alchimia") return toast(tr("{n} usa l'Alchimia.", { n: who }));
  if (L.kind === "passa") return toast(tr("{n} passa il turno.", { n: who }));
  let msg = who + ": " + L.word;
  if (L.type === "attacco") msg += L.damage ? tr(" colpisce, −{n} PV", { n: L.damage }) : tr(", l'incantesimo si ferma");
  else if (L.type === "falo") msg += tr(", Grande Falò");
  else if (L.type === "difesa") { const w = Object.values(s.words).find(x => x.text === L.word && x.o === L.by); msg += w && w.consacrata ? tr(", difesa consacrata") : tr(", nuova difesa"); }
  if (L.storm) msg += tr(" · Tempesta (forza {n})", { n: L.storm.force });
  toast(msg);
}
function startAnim(last) {
  if (!last || !last.path || !last.path.length) return;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  anim = { path: last.path, launch: last.launch, i: reduce ? last.path.length : 0 };
  const done = () => setTimeout(() => { anim = null; render(); }, 2600);
  if (reduce) return done();
  const t = setInterval(() => {
    if (!anim) return clearInterval(t);
    anim.i++; render();
    if (anim.i >= anim.path.length) { clearInterval(t); done(); }
  }, 230);
}

// ---------- suggerimento: costa PV, lo calcola il server ----------
let hintBusy = false;
async function askHint() {
  if (hintBusy || !cur) return;
  hintBusy = true; render();
  try {
    const r = await api("POST", "games/" + cur.id + "/suggest", { moveNo: S().moveNo });
    games[r.id] = { id: r.id, s: r.s, updated: r.updated };
    if (cur && cur.id === r.id) { onGameData(games[r.id]); hintBusy = false; applyHint(r.hint); }
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  hintBusy = false; render();
}
// mette la mossa suggerita sulla griglia: puoi confermarla o cambiarla
function applyHint(m) {
  const s = S(), me = mySeat(), hand = s.hands[me];
  Object.assign(ui, { pending: [], place: null, mode: null, alch: null, sel: null, launch: null, hintLaunch: null, passConfirm: false, hintConfirm: false });
  if (!m || m.kind === "errore") { toast(tr("Il suggeritore ha avuto un problema") + (m && m.message ? ": " + m.message : "."), true); render(); return; }
  if (m.kind === "play") {
    const used = new Set();
    for (const t of m.placed) { const hi = hand.findIndex((l, i) => l === t.l && !used.has(i)); used.add(hi); ui.pending.push({ r: t.r, c: t.c, l: t.l, hi }); }
    const o = m.opts || {};
    ui.mode = o.attacca ? "attacca" : o.falo ? "falo" : o.consacra ? "consacra" : null;
    if (o.launch) ui.hintLaunch = o.launch;
    const v = G.validate(s, me, placed(), opts());
    const come = ui.mode === "attacca" || (v.ok && v.type === "attacco") ? tr(", da lanciare") : ui.mode === "falo" ? tr(", come Grande Falò") : ui.mode === "consacra" ? tr(", da consacrare") : "";
    toast(tr("Suggerimento: {w}{c}. Tocca «Conferma», oppure cambiala.", { w: v.ok ? v.main.text : tr("una parola"), c: come }));
  } else if (m.kind === "alchimia") {
    const used = new Set(), lett = m.letters || hand;
    ui.alch = lett.map(l => { const i = hand.findIndex((x, j) => x === l && !used.has(j)); used.add(i); return i; }).filter(i => i >= 0);
    toast(tr("Suggerimento: nessuna buona parola, usa l'Alchimia e cambia le lettere evidenziate."));
  } else toast(tr("Suggerimento: non c'è una mossa utile, passa il turno."));
  render();
}

// ---------- parola intera dal dizionario (si trascina) ----------
let drag = null, suppressClick = false;
// passo di scrittura: in verticale dall'alto in basso come vedi il campo tu
function stepFor(dir) {
  const s = S(), me = mySeat();
  return dir === "v" ? [((s.cfg && s.cfg.letturaDalLato && me === "A") ? -1 : 1), 0] : [0, 1];
}
// dove finirebbero le lettere della parola partendo da (r0, c0); non controlla il dizionario
function computePlacement(w, dir, r0, c0) {
  const s = S(), me = mySeat(), [dr, dc] = stepFor(dir);
  const hand = s.hands[me], usedIdx = new Set(), pend = [];
  for (let i = 0; i < w.length; i++) {
    const r = r0 + dr * i, c = c0 + dc * i;
    if (r < 0 || r >= G.ROWS || c < 0 || c >= G.COLS) return { err: tr("«{w}» da qui esce dal campo.", { w }) };
    const t = s.tiles[G.key(r, c)];
    if (t) { if (t.l !== w[i]) return { err: tr("In quella posizione c'è già una {a}, ma serviva una {b}.", { a: t.l, b: w[i] }) }; continue; }
    let hi = -1;
    for (let j = 0; j < hand.length; j++) if (!usedIdx.has(j) && hand[j] === w[i]) { hi = j; break; }
    if (hi < 0) return { err: tr("Ti manca una {l} per scrivere «{w}» qui.", { l: w[i], w }) };
    usedIdx.add(hi); pend.push({ r, c, l: w[i], hi, i });
  }
  if (!pend.length) return { err: tr("La parola è già tutta sul campo.") };
  return { pend };
}
// la posizione valida più vicina a (r0, c0)
function nearestPlacement(w, dir, r0, c0) {
  const cand = [];
  for (let r = 0; r < G.ROWS; r++) for (let c = 0; c < G.COLS; c++) cand.push([Math.abs(r - r0) + Math.abs(c - c0), r, c]);
  cand.sort((x, y) => x[0] - y[0]);
  // prima scelta: la più vicina che rispetta anche le regole; altrimenti la più vicina dove entra
  let fallback = null;
  for (const [, r, c] of cand) {
    const res = computePlacement(w, dir, r, c); if (!res.pend) continue;
    if (!fallback) fallback = { r, c, pend: res.pend };
    if (dictState === "pronto" && G.validate(S(), mySeat(), res.pend.map(x => ({ r: x.r, c: x.c, l: x.l })), {}).ok) return { r, c, pend: res.pend };
  }
  return fallback;
}
function setPlacement(r, c, pend) { ui.pending = pend; ui.place.start = G.key(r, c); ui.sel = null; }
function startPlace(word) {
  closeSheet();
  const s = S(), me = mySeat();
  ui.place = { word, dir: "h", start: null }; ui.pending = []; ui.mode = null; ui.sel = null; ui.launch = null; ui.alch = null;
  // parte dal centro del proprio Sanctum
  const rows = []; for (let r = 0; r < G.ROWS; r++) if (G.zoneOf(r) === me) rows.push(r);
  const r0 = rows[1], c0 = Math.max(0, 5 - Math.floor(word.length / 2));
  let found = nearestPlacement(word, "h", r0, c0);
  if (!found) { ui.place.dir = "v"; found = nearestPlacement(word, "v", r0, 5); }
  if (found) { setPlacement(found.r, found.c, found.pend); toast(tr("Trascina «{w}» dove vuoi. ↻ Gira la mette in verticale.", { w: word })); }
  else toast(tr("Non c'è spazio sul campo per «{w}» con le tue lettere.", { w: word }), true);
  render();
}
function placeWordAt(k) {
  const [r, c] = G.parse(k);
  const res = computePlacement(ui.place.word, ui.place.dir, r, c);
  if (res.err) { toast(res.err + tr(" Prova un'altra casella o girala."), true); return; }
  setPlacement(r, c, res.pend); render();
}
function rotatePlace() {
  const old = ui.place.dir;
  ui.place.dir = old === "h" ? "v" : "h";
  if (!ui.place.start) { render(); return; }
  const [r, c] = G.parse(ui.place.start);
  const found = nearestPlacement(ui.place.word, ui.place.dir, r, c);
  if (found) setPlacement(found.r, found.c, found.pend);
  else { ui.place.dir = old; toast(tr("Girata, «{w}» non entra da nessuna parte.", { w: ui.place.word }), true); }
  render();
}
function cancelPlace() { ui.place = null; ui.pending = []; ui.mode = null; render(); }
// trascinamento: si prende la parola da una sua lettera
function onBoardPointerDown(e) {
  if (!ui.place || !myTurn() || ui.busy) return;
  const cell = e.target.closest && e.target.closest(".cell"); if (!cell) return;
  const k = cell.dataset.k, p = ui.pending.find(x => G.key(x.r, x.c) === k);
  if (!p) return;
  e.preventDefault();
  drag = { i: p.i, lastK: k, err: null, bad: null };
  suppressClick = true;
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd, { once: true });
  window.addEventListener("pointercancel", onDragEnd, { once: true });
  render();
}
function onDragMove(e) {
  if (!drag) return;
  const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest && el.closest(".board .cell");
  if (!cell) return;
  const k = cell.dataset.k; if (k === drag.lastK) return;
  drag.lastK = k;
  const [r, c] = G.parse(k), [dr, dc] = stepFor(ui.place.dir);
  const r0 = r - dr * drag.i, c0 = c - dc * drag.i;
  const res = computePlacement(ui.place.word, ui.place.dir, r0, c0);
  if (res.err) { drag.err = res.err; drag.bad = k; }
  else { drag.err = null; drag.bad = null; setPlacement(r0, c0, res.pend); }
  render();
}
function onDragEnd() {
  window.removeEventListener("pointermove", onDragMove);
  if (!drag) return;
  const d = drag; drag = null;
  if (d.err) toast(d.err + tr(" La parola resta nell'ultima posizione valida."), true);
  render();
  setTimeout(() => { suppressClick = false; }, 50);
}

// mosse
function placed() { return ui.pending.map(p => ({ r: p.r, c: p.c, l: p.l })); }
function opts() { return { falo: ui.mode === "falo", consacra: ui.mode === "consacra", attacca: ui.mode === "attacca" }; }
async function sendMove(move) {
  if (ui.busy) return;
  ui.busy = true; render();
  try {
    const r = await api("POST", "games/" + cur.id + "/move", Object.assign({ moveNo: S().moveNo }, move));
    games[r.id] = r; if (cur && cur.id === r.id) onGameData(r);
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  ui.busy = false; render();
}
function onConfirm() {
  const s = S(), p = mySeat();
  const v = G.validate(s, p, placed(), opts());
  if (!v.ok) return toast(v.err, true);
  if (v.type === "attacco") {
    const pv = G.previewLaunches(s, p, placed());
    const keys = Object.keys(pv || {});
    if (ui.hintLaunch && keys.includes(ui.hintLaunch)) return doPlay({ launch: ui.hintLaunch });
    if (keys.length === 1) return doPlay({ launch: keys[0] });
    ui.launch = pv; render();
    if (keys.every(k => !pv[k])) return toast(tr("Da qui l'incantesimo si dissolve prima di arrivare al mago: danno previsto 0 da ogni lettera."), true);
    return toast(tr("Scegli la lettera da cui lanciare l'incantesimo: il numero è il danno previsto."));
  }
  doPlay({});
}
function doPlay(extra) {
  const s = S(), p = mySeat(), o = Object.assign(opts(), extra);
  const v = G.validate(s, p, placed(), o);
  if (!v.ok) return toast(v.err, true);
  sendMove({ kind: "play", placed: placed(), opts: o });
}
function onCell(k) {
  const s = S(); if (!s) return;
  if (ui.launch) { if (k in ui.launch) doPlay({ launch: k }); return; }
  if (suppressClick) return;
  if (ui.place && myTurn()) { placeWordAt(k); return; }
  const pi = ui.pending.findIndex(p => G.key(p.r, p.c) === k);
  if (myTurn() && !ui.alch && pi >= 0) { ui.pending.splice(pi, 1); render(); return; }
  if (s.tiles[k]) return showCellInfo(k);
  if (!myTurn() || ui.alch) return;
  if (ui.sel === null) return toast(tr("Tocca prima una lettera del tuo Grimorio."));
  const [r, c] = G.parse(k);
  ui.pending.push({ r, c, l: s.hands[mySeat()][ui.sel], hi: ui.sel });
  ui.sel = null; render();
}
function onHand(i) {
  if (!myTurn() || ui.launch) return;
  if (ui.alch) { const j = ui.alch.indexOf(i); if (j >= 0) ui.alch.splice(j, 1); else ui.alch.push(i); render(); return; }
  if (ui.place) ui.place = null; // si torna alla posa lettera per lettera
  if (ui.pending.some(p => p.hi === i)) return;
  ui.sel = ui.sel === i ? null : i; render();
}
function doAlchimia() {
  const s = S(), p = mySeat(), hand = s.hands[p];
  const letters = ui.alch.map(i => hand[i]);
  if (!letters.length) return toast(tr("Scegli almeno una lettera da cambiare."), true);
  sendMove({ kind: "alchimia", letters: letters.length === hand.length ? null : letters });
}
function doPass() { sendMove({ kind: "pass" }); }
async function sitDown() {
  const nameIn = document.getElementById("nome-sfidante");
  if (nameIn && nameIn.value.trim()) await saveName(nameIn.value);
  try {
    await ensurePlayer();
    const r = await api("POST", "games/" + cur.id + "/join");
    games[r.id] = r; onGameData(r); wsSend({ type: "watch", id: cur.id });
    toast(tr("Sei il Mago Rosso. Inizia il Mago Blu: ti avviso quando tocca a te."));
    if (!pushOn()) enablePush(false);
  } catch (e) { toast(e.message, true); }
}
async function resignGame() {
  try {
    const r = await api("POST", "games/" + cur.id + "/resign");
    if (r.deleted) { delete games[cur.id]; leaveGame(); toast(tr("Partita eliminata.")); }
    else { games[r.id] = r; onGameData(r); }
  } catch (e) { toast(e.message, true); }
}
async function hideGame() {
  try { await api("POST", "games/" + cur.id + "/hide"); delete games[cur.id]; leaveGame(); toast(tr("Partita tolta dall'elenco.")); }
  catch (e) { toast(e.message, true); }
}

// info su una casella
function showCellInfo(k) {
  const s = S(), idx = G.cellIndex(s.words), ids = idx[k] || [];
  const t = s.tiles[k];
  const lines = ids.map(id => {
    const w = s.words[id];
    const who = seatName(s, w.o);
    let tipo = w.type === "attacco" ? tr("Attacco") + (EL[w.el] ? " " + tr(EL[w.el]) : "") : w.type === "difesa" ? tr(w.consacrata ? tr("Difesa consacrata") : tr("Difesa (Terra)")) : tr(w.type === "cataclisma" ? tr("Cataclisma") : w.type === "bloccato" ? tr("Attacco bloccato") : tr("Parola neutra"));
    let val = tr(w.type === "difesa" ? tr("Resistenza {a} su {b}") : tr("Stabilità {a} su {b}"), { a: w.stab, b: w.max });
    const consuma = (w.type !== "difesa" || w.consacrata) ? tr(" · perde 1 a ogni turno di {n}", { n: who }) : "";
    return h("li", null, h("strong", { text: w.text }), " — " + tr("{t} di {n}", { t: tipo, n: who }) + ". " + val + consuma + ".");
  });
  sheet(tr("Lettera {l}", { l: t ? t.l : "" }), [
    h("p", { class: "sub", text: tr("Valore {n}", { n: t ? G.VAL[t.l] : "" }) + tr(t && G.VAL[t.l] >= 3 ? tr(" · Runa: torna a chi l'ha posata quando la parola si spegne") : tr(" · Consumabile")) }),
    lines.length ? h("ul", null, lines) : h("p", { text: tr("Questa lettera non appartiene più a nessuna parola.") })
  ]);
}

// ---------- esploratore del dizionario ----------
function cleanLetters(t) { return (t || "").toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "").split("").filter(l => G.VAL[l]).join(""); }
// parole componibili con mano + lettere in più; ognuna dice quali lettere in più usa
function searchWords(hand, extra, tipo, ordine, max) {
  const total = hand.length + extra.length;
  if (!DICT_OFFS || total < 2) return { list: [], total: 0 };
  const avail = new Int16Array(26), fromHand = new Int16Array(26), used = new Int16Array(26);
  for (const l of hand) { avail[l.charCodeAt(0) - 65]++; fromHand[l.charCodeAt(0) - 65]++; }
  for (const l of extra) avail[l.charCodeAt(0) - 65]++;
  const words = new Set(), T = DICT_TEXT, O = DICT_OFFS, n = O.length;
  for (let i = 0; i < n; i++) {
    const a = O[i], b = i + 1 < n ? O[i + 1] - 1 : T.length;
    if (b - a > total || b - a < 2) continue;
    let ok = true, j = a;
    for (; j < b; j++) { const c = T.charCodeAt(j) - 65; if (++used[c] > avail[c]) { ok = false; j++; break; } }
    for (let x = a; x < j; x++) used[T.charCodeAt(x) - 65] = 0;
    if (ok) words.add(T.slice(a, b));
  }
  if (G.CFG.lingua === "it") for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {
    const cnt = new Int16Array(26); let ok = w.length <= total;
    for (const ch of w) if (++cnt[ch.charCodeAt(0) - 65] > avail[ch.charCodeAt(0) - 65]) ok = false;
    if (ok) words.add(w);
  }
  const list = [];
  for (const w of words) {
    const cls = G.classify(w);
    const kind = cls.type === "attacco" ? cls.el : cls.type;
    if (tipo === "attacco" ? cls.type !== "attacco" : tipo !== "tutte" && kind !== tipo) continue;
    const cnt = new Int16Array(26); let extraUsed = "", score = 0;
    for (const ch of w) { const c = ch.charCodeAt(0) - 65; if (++cnt[c] > fromHand[c]) extraUsed += ch; score += G.VAL[ch]; }
    list.push({ w, kind, score, extraUsed });
  }
  list.sort(ordine === "lunghezza" ? (x, y) => y.w.length - x.w.length || y.score - x.score : (x, y) => y.score - x.score || y.w.length - x.w.length);
  return { list: list.slice(0, max), total: list.length };
}
const WIDE = window.matchMedia("(min-width: 1000px)");
let side = null; // dizionario a lato: { nodes, handIn, run, gameId, lastHand, lastCan, edited }
function myHandText() { const s = S(), me = mySeat(); return s && me ? s.hands[me].join("") : ""; }
function buildExplorer(lato) {
  if (!cur) G.applyCfg(regoleAttive());
  const libero = !!regoleAttive().attaccoLibero;
  const x = { edited: false };
  const handIn = h("input", { type: "text", id: lato ? "dzl-mano" : "dz-mano", value: myHandText(), placeholder: tr("es. AEIRMTS"), autocomplete: "off", autocapitalize: "characters" });
  const extraIn = h("input", { type: "text", id: lato ? "dzl-extra" : "dz-extra", placeholder: tr("es. lettere sul campo"), autocomplete: "off", autocapitalize: "characters" });
  const tipo = h("select", { id: lato ? "dzl-tipo" : "dz-tipo" },
    (libero ? [["tutte", tr("Tutte")]] : [["tutte", tr("Tutte")], ["attacco", tr("Attacchi")], ["fuoco", tr("Fuoco")], ["gelo", tr("Gelo")], ["acqua", tr("Acqua")], ["difesa", tr("Difese (Terra)")], ["neutra", tr("Neutre")]]).map(([v, t]) => h("option", { value: v, text: t })));
  const ordine = h("select", { id: lato ? "dzl-ordine" : "dz-ordine" }, h("option", { value: "punti", text: tr("Punteggio") }), h("option", { value: "lunghezza", text: tr("Lunghezza") }));
  const count = h("p", { class: "dz-count", "aria-live": "polite" });
  const list = h("div", { class: "dz-list" });
  let t = null;
  const run = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (dictState !== "pronto") {
        count.textContent = tr(dictState === "errore" ? tr("Il dizionario non si è caricato: ricarica la pagina.") : tr("Carico il dizionario…"));
        list.replaceChildren();
        if (dictState === "carico") t = setTimeout(run, 800);
        return;
      }
      const hand = cleanLetters(handIn.value), extra = cleanLetters(extraIn.value);
      const r = searchWords(hand, extra, tipo.value, ordine.value, 150);
      count.textContent = hand.length + extra.length < 2 ? tr("Scrivi almeno due lettere.") : r.total ? tr("{n} parole", { n: r.total }) + (r.total > 150 ? tr(" (mostrate le prime 150)") : "") : tr("Nessuna parola con queste lettere.");
      const nomi = { fuoco: tr("Fuoco"), gelo: tr("Gelo"), acqua: tr("Acqua"), difesa: tr("Difesa") };
      const canPlace = myTurn() && !ui.busy;
      list.replaceChildren(...r.list.map(w => { const kind = libero ? "neutra" : w.kind; return h(canPlace ? "button" : "span", { class: "dz-w " + kind, title: (libero ? tr("Parola") : (nomi[kind] || tr("Neutra"))) + (canPlace ? tr(": tocca per posizionarla") : ""), onclick: canPlace ? () => startPlace(w.w) : null },
        w.w, h("small", { text: w.score }), w.extraUsed ? h("small", { class: "x", text: "+" + w.extraUsed }) : null); }));
    }, 200);
  };
  handIn.addEventListener("input", () => { x.edited = true; run(); });
  extraIn.addEventListener("input", run);
  [tipo, ordine].forEach(i => i.addEventListener("change", run));
  const myHand = myHandText();
  x.nodes = [
    h("p", { class: "sub", text: tr("Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R).") + (myHand ? tr(" Nel tuo turno tocca una parola per posizionarla sul campo.") : "") }),
    h("div", { class: "dz-form" },
      h("label", { class: "field full", for: handIn.id }, tr("Le tue lettere"), handIn),
      h("label", { class: "field full", for: extraIn.id }, tr("Lettere in più"), extraIn),
      libero ? null : h("label", { class: "field", for: tipo.id }, tr("Tipo"), tipo),
      h("label", { class: "field" + (libero ? " full" : ""), for: ordine.id }, tr("Ordina per"), ordine)),
    myHand ? h("button", { class: "btn small", onclick: () => { handIn.value = myHandText(); extraIn.value = ""; x.edited = false; run(); }, text: tr("Ripristina la mia mano") }) : null,
    libero ? null : h("div", { class: "dz-key" }, h("span", { style: "--c:var(--fuoco)", text: tr("Fuoco") }), h("span", { style: "--c:var(--gelo)", text: tr("Gelo") }), h("span", { style: "--c:var(--acqua)", text: tr("Acqua") }), h("span", { style: "--c:var(--terra)", text: tr("Difesa") }), h("span", { style: "--c:var(--line)", text: tr("Neutra") })),
    count, list].filter(Boolean);
  Object.assign(x, { handIn, run });
  return x;
}
function showExplorer() {
  if (WIDE.matches && cur && S()) { updateSide(); if (side) side.handIn.focus(); return; }
  const x = buildExplorer(false);
  sheet(tr("Dizionario: {l}", { l: nomiDiz(G.CFG, " + ") }), x.nodes);
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
    el.setAttribute("aria-label", tr("Dizionario"));
    fill(el, h("h3", { text: tr("Dizionario: {l}", { l: nomiDiz(G.CFG, " + ") }) }), side.nodes);
  }
  const hand = myHandText(), can = myTurn() && !ui.busy;
  if (hand !== side.lastHand) { side.lastHand = hand; if (!side.edited) side.handIn.value = hand; side.lastCan = null; }
  if (can !== side.lastCan) { side.lastCan = can; side.run(); }
}
WIDE.addEventListener("change", () => render());

function showRules() {
  const c = regoleAttive();
  const scrivi = tr("A turno scrivi una parola in {l} sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum.", { l: nomiDiz(c) }) + (G.dizionariDi(c).length > 1 ? tr(" Con più dizionari vale una parola di uno qualsiasi, e la Sacca è mista: 26 lettere, con quantità e valori nella media delle lingue scelte.") : "");
  if (c.attaccoLibero) return sheet(tr("Regole in breve (s1)"), [h("ul", null,
    h("li", { text: tr("Ognuno vede il proprio Sanctum in basso. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte.") }),
    h("li", { text: tr(scrivi) }),
    h("li", { text: tr("Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata). Con il Collegamento attivo puoi entrare nel Sanctum nemico, agganciandoti a una sua parola.") }),
    h("li", { text: tr("Attacco: qualsiasi parola che ha una lettera nel Sanctum nemico può essere lanciata (tocca «Attacca»). La potenza è il punteggio della parola; l'incantesimo corre verso il bordo del Sanctum nemico e perde 1 per casella e 1 in più per ogni lettera. Dopo il lancio la parola si consuma: sparisce, tranne le lettere che reggono altre parole.") }),
    h("li", { text: tr("Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è {r} il punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.", { r: c.consacrazione >= 1 ? tr("{n} volte", { n: c.consacrazione }) : tr("metà del"), m: c.maxConsacrate || 2 }) }),
    h("li", { text: tr(c.scudo === "riga" ? tr("Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano.") : tr("Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto.")) }),
    h("li", { text: tr("Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni {n} turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine.", { n: c.faloOgni || 3 }) }),
    h("li", { text: tr("Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: cambi da 1 a 7 lettere invece di scrivere.") }),
    h("li", { text: tr("A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita.") }),
    h("li", { text: tr("Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).", { n: c.hp }) }))]);
  sheet(tr("Regole in breve"), [h("ul", null,
    h("li", { text: tr(c.letturaDalLato ? tr("Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte.") : tr("Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso.")) }),
    h("li", { text: tr(scrivi) }),
    h("li", { text: tr("Le parole di Fuoco, Gelo e Acqua sono attacchi: scegli una loro lettera in un Sanctum e l'incantesimo corre dritto lungo la colonna verso il mago avversario. Perde 1 di potenza per casella e 1 in più per ogni lettera che attraversa.") }),
    h("li", { text: tr("Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo {m} attive).", { m: c.maxConsacrate || 2 }) }),
    h("li", { text: tr("Per invadere il Sanctum nemico serve il Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata).") }),
    h("li", { text: tr("Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni {n} turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine.", { n: c.faloOgni || 3 }) }),
    h("li", { text: tr("Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: cambi da 1 a 7 lettere invece di scrivere.") }),
    h("li", { text: tr("A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita.") }),
    h("li", { text: tr("Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).", { n: c.hp }) }),
    h("li", { text: tr("Toccando una lettera sulla griglia vedi a quali parole appartiene, il loro tipo e quanto durano ancora.") }))]);
}

// ---------- disegno della partita ----------
function previewLine() {
  const s = S(), p = mySeat();
  if (ui.alch) return { text: ui.alch.length ? tr("Cambio {n} lettere", { n: ui.alch.length }) : tr("Tocca le lettere da cambiare") };
  if (ui.launch) return { text: tr("Tocca la lettera da cui lanciare"), tipo: tr("il numero è il danno previsto") };
  if (ui.place && !ui.pending.length) return { text: tr("Tocca la casella dove inizia «{w}»", { w: ui.place.word }), tipo: tr(ui.place.dir === "h" ? tr("orizzontale →") : tr("verticale ↓")) };
  if (drag && drag.err) return { err: true, text: drag.err };
  if (!ui.pending.length) return null;
  if (dictState !== "pronto") return { err: true, text: tr(dictState === "errore" ? tr("Il dizionario non si è caricato: ricarica la pagina.") : tr("Carico il dizionario…")) };
  const v = G.validate(s, p, placed(), opts());
  if (!v.ok) return { err: true, text: v.err };
  const nm = v.main.text;
  if (ui.place && !drag) { const base = previewCore(v, s); return Object.assign(base, { tipo: (base.tipo ? base.tipo + " · " : "") + tr("trascinala per spostarla") }); }
  return previewCore(v, s);
}
function previewCore(v, s) {
  const nm = v.main.text;
  if (v.type === "falo") return { text: nm, tipo: tr("Grande Falò su {l}", { l: v.targets.map(id => s.words[id].text).join(", ") }) };
  if (v.type === "attacco") return { text: nm, tipo: (v.el ? tr(EL[v.el]) + " · " : tr("Attacco") + " · ") + tr("potenza {n}", { n: v.score }) + (s.cfg.attaccoConsuma ? tr(" · la parola si consuma") : "") };
  if (s.cfg.attaccoLibero && v.type === "neutra") return { text: nm, tipo: tr("parola neutra · Stabilità {n}", { n: v.base }) + (v.launches.length ? tr(" · «Attacca» per lanciarla") : "") };
  if (v.type === "difesa") return { text: nm, tipo: v.consacrata ? tr("Difesa consacrata · resistenza {n}", { n: Math.max(1, Math.ceil(v.score * (s.cfg.consacrazione || .5))) }) : tr("Difesa · resistenza {n}", { n: v.score }) };
  if (v.type === "cataclisma") return { text: nm, tipo: tr(EL[v.el]) + tr(" al centro: Cataclisma (ancora senza effetto)") };
  if (v.type === "bloccato") return { text: nm, tipo: tr("le difese nemiche impediscono il lancio") };
  return { text: nm, tipo: tr("parola neutra · Stabilità {n}", { n: v.base }) };
}
function pbar(s, p) {
  const max = (s.cfg && s.cfg.hp) || 30, hp = s.hp[p];
  const chips = [];
  if (G.bridgeActive(s, p)) chips.push(h("span", { class: "chip ok", text: tr("Ponte attivo") }));
  else chips.push(h("span", { class: "chip", text: tr("Ponte non attivo") }));
  const cons = Object.values(s.words).filter(w => w.o === p && w.consacrata).length;
  if (s.cfg && s.cfg.maxConsacrate) chips.push(h("span", { class: "chip", text: tr("Consacrate {a}/{b}", { a: cons, b: s.cfg.maxConsacrate }) }));
  if (s.cfg && s.cfg.faloOgni) { const left = s.cfg.faloOgni - (s.turns[p] - s.lastFalo[p]); chips.push(h("span", { class: "chip" + (left <= 0 ? " ok" : ""), text: left <= 0 ? tr("Falò pronto") : tr("Falò tra {n} turni", { n: left }) })); }
  chips.push(h("span", { class: "chip", text: tr("{n} lettere", { n: s.hands[p].length }) }));
  return h("div", { class: "pbar " + p + (s.turn === p && !s.winner ? " turn" : "") },
    h("span", { class: "nm", text: s.seats[p] ? seatName(s, p) + (s.seats[p].tok === MYID && !(s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok) ? tr(" (tu)") : "") : tr(NOMI[p]) + tr(" (libero)") }),
    h("div", { class: "hp", role: "meter", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": hp, "aria-label": tr("Punti Vita") }, h("i", { style: "width:" + Math.max(0, Math.min(100, hp / max * 100)) + "%" })),
    h("span", { class: "hpn", text: tr("{n} PV", { n: hp }) }),
    h("div", { class: "chips" }, chips));
}
function boardEl(s) {
  const view = viewSeat(), R = G.ROWS, C = G.COLS;
  const idx = G.cellIndex(s.words);
  const pend = {}; ui.pending.forEach(p => { pend[G.key(p.r, p.c)] = p.l; });
  const firstCell = {}; Object.values(s.words).forEach(w => { if (w.type === "difesa" || w.type === "attacco") firstCell[w.cells[0]] = w; });
  // frecce: sulla prima lettera di ogni parola, nel verso in cui si legge come la vedi tu
  const topA = topSeat() === "A";
  const arrows = {};
  const addArrow = (cells, cls) => {
    if (!cells || cells.length < 2) return;
    const [r0, c0] = G.parse(cells[0]), [r1, c1] = G.parse(cells[1]);
    let dir = "dx";
    if (c0 === c1) dir = ((topA ? r1 - r0 : r0 - r1) > 0) ? "giu" : "su";
    (arrows[cells[0]] = arrows[cells[0]] || []).push({ dir, cls });
  };
  Object.values(s.words).forEach(w => addArrow(w.cells, w.o));
  if (ui.pending.length && mySeat() && dictState === "pronto") {
    const v = G.validate(s, mySeat(), placed(), opts());
    if (v.ok) addArrow(v.main.cells, "pend");
  }
  const trail = {}, hit = {};
  if (anim) anim.path.slice(0, anim.i).forEach(st => { trail[st.k] = st; if (st.def) hit[st.k] = 1; });
  // senza lettura dal lato: Blu in alto per tutti. Con lettura dal lato: il proprio Sanctum in basso
  const rows = []; for (let i = 0; i < R; i++) rows.push(topSeat() === "A" ? i : R - 1 - i);
  const scudi = {}; // righe con uno Scudo: una difesa consacrata nel proprio Sanctum
  for (const id in s.words) { const w = s.words[id]; if (w.type !== "difesa") continue; for (const kk of w.cells) { const rr = G.parse(kk)[0]; if (G.zoneOf(rr) === w.o) scudi[rr] = 1; } }
  const cells = [];
  for (const r of rows) for (let c = 0; c < C; c++) {
    const k = G.key(r, c), z = G.zoneOf(r), t = s.tiles[k];
    const cls = ["cell", z === "M" ? (r === G.STAFFA ? "st" : "") : "z" + z];
    if (s.cfg && s.cfg.scudo === "riga" && scudi[r]) cls.push("scudo");
    if (ui.launch && k in ui.launch) cls.push("launch");
    if (drag && drag.bad === k) cls.push("badcell");
    if (trail[k]) cls.push(hit[k] ? "hitdef" : "trail");
    if (anim && anim.launch === k) cls.push("origin");
    const kids = [];
    if (t) {
      const ws = (idx[k] || []).map(id => s.words[id]);
      const d = ws.find(w => w.type === "difesa"), a = ws.find(w => w.type === "attacco");
      const tc = ["tile", "o" + t.o]; if (d) tc.push(d.consacrata ? "consacrata" : "difesa"); else if (a) tc.push(a.el);
      kids.push(h("span", { class: tc.join(" ") }, t.l, h("span", { class: "v", text: G.VAL[t.l] })));
      const fw = firstCell[k];
      if (fw) kids.push(h("span", { class: "badge " + (fw.type === "difesa" ? (fw.consacrata ? "consacrata" : "difesa") : fw.el), text: fw.stab }));
    } else if (pend[k]) {
      kids.push(h("span", { class: "tile pend" }, pend[k], h("span", { class: "v", text: G.VAL[pend[k]] })));
    } else if (G.MULT[k]) kids.push(h("span", { class: "mult " + G.MULT[k], text: tr(G.MULT[k]) }));
    if (arrows[k]) arrows[k].forEach(a => kids.push(h("span", { class: "arr " + a.dir + " " + a.cls, "aria-hidden": "true", text: a.dir === "dx" ? "→" : a.dir === "giu" ? "↓" : "↑" })));
    if (ui.launch && k in ui.launch) kids.push(h("span", { class: "dmg" + (ui.launch[k] ? "" : " zero"), text: ui.launch[k] }));
    if (trail[k] && !hit[k]) kids.push(h("span", { class: "pw", text: trail[k].power }));
    const label = tr("Riga {r}, colonna {c}", { r: r + 1, c: c + 1 }) + (t ? tr(", lettera {l}", { l: t.l }) : pend[k] ? tr(", lettera {l} in posa", { l: pend[k] }) : tr(", vuota"));
    cells.push(h("button", { class: cls.filter(Boolean).join(" "), "data-k": k, "aria-label": label, onclick: () => onCell(k) }, kids));
  }
  return h("div", { class: "board" + (ui.place && ui.pending.length ? " placing" : "") + (drag ? " dragging" : ""), role: "grid", "aria-label": tr("Campo di battaglia"), onpointerdown: onBoardPointerDown }, cells);
}
function renderGame() {
  const Gm = document.getElementById("game");
  const s = S();
  if (!s) { Gm.replaceChildren(h("div", { class: "topbar" }, h("button", { class: "btn small", onclick: leaveGame, text: tr("← Partite") })), h("p", { class: "note", text: tr("Carico la partita…") })); return; }
  const me = mySeat(), view = viewSeat(), opp = G.enemy(view), top = topSeat();
  const both = s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok && s.seats.A.tok === MYID;
  // stato
  let status, sub = "";
  if (s.winner) status = tr("Vince {n}!", { n: seatName(s, s.winner) });
  else if (!s.seats.B) { status = me === "A" ? tr("In attesa dello sfidante") : tr("Sei stato sfidato a Grimorio!"); sub = me === "A" ? tr("Manda il link d'invito: la partita inizia quando l'avversario si siede.") : tr("Scegli il tuo nome e siediti come Mago Rosso."); }
  else if (myTurn()) { status = both ? tr("Turno del {n}", { n: tr(NOMI[s.turn]) }) : tr("Tocca a te"); sub = s.first[me] ? tr("Primo turno: scrivi nel tuo Sanctum ({d}).", { d: tr(me === top ? tr("in alto") : tr("in basso")) }) : both ? tr("Modalità prova: giochi entrambi i maghi.") : ""; }
  else if (me && s.seats[s.turn] && s.seats[s.turn].cpu) { status = tr("{n} sta pensando…", { n: seatName(s, s.turn) }); }
  else if (me) { status = tr("Tocca a {n}", { n: seatName(s, s.turn) }); sub = pushOn() ? tr("Puoi chiudere: ti avviso quando tocca a te.") : tr("Puoi chiudere la pagina: la partita ti aspetta."); }
  else status = tr("Stai guardando: tocca a {n}", { n: seatName(s, s.turn) });

  // mano
  const hand = me ? s.hands[me] : [];
  const usedIdx = new Set(ui.pending.map(p => p.hi));
  let order = ui.order && ui.order.length === hand.length ? ui.order : hand.map((_, i) => i);
  const handEl = me ? h("div", { class: "hand", role: "group", "aria-label": tr("Il tuo Grimorio") }, order.map(i => {
    const l = hand[i], used = usedIdx.has(i);
    const cls = ["htile", G.VAL[l] >= 3 ? "rune" : "", ui.sel === i ? "sel" : "", ui.alch && ui.alch.includes(i) ? "alch" : "", used ? "ghost" : ""].filter(Boolean).join(" ");
    return h("button", { class: cls, disabled: used || !myTurn(), "aria-pressed": ui.sel === i, "aria-label": tr("Lettera {l}, valore {n}", { l, n: G.VAL[l] }), onclick: () => onHand(i) }, l, h("span", { class: "v", text: G.VAL[l] }));
  })) : null;

  // pulsanti
  const actions = [];
  const turn = myTurn() && !ui.busy;
  if (turn && ui.launch) actions.push(h("button", { class: "btn", onclick: () => { ui.launch = null; render(); }, text: tr("Annulla lancio") }));
  else if (turn && ui.alch) {
    actions.push(h("button", { class: "btn", onclick: () => { ui.alch = null; render(); }, text: tr("Annulla") }));
    actions.push(h("button", { class: "btn small", onclick: () => { ui.alch = hand.map((_, i) => i); render(); }, text: tr("Tutte") }));
    actions.push(h("button", { class: "btn primary", disabled: !ui.alch.length, onclick: doAlchimia, text: tr("Cambia {n} lettere", { n: ui.alch.length }) }));
  } else if (turn && ui.place && !ui.pending.length) {
    actions.push(h("button", { class: "btn", onclick: cancelPlace, text: tr("Annulla") }));
    actions.push(h("button", { class: "btn", onclick: rotatePlace, text: tr("↻ Gira ({d})", { d: tr(ui.place.dir === "h" ? tr("ora orizzontale") : tr("ora verticale")) }) }));
  } else if (turn && ui.pending.length) {
    const pv = previewLine();
    actions.push(h("button", { class: "btn", onclick: () => { ui.pending = []; ui.mode = null; ui.place = null; render(); }, text: tr("Ritira") }));
    if (ui.place) actions.push(h("button", { class: "btn", "aria-label": tr("Gira la parola"), onclick: rotatePlace, text: tr("↻ Gira") }));
    if (s.cfg && s.cfg.attaccoLibero) actions.push(h("button", { class: "btn" + (ui.mode === "attacca" ? " on" : ""), "aria-pressed": ui.mode === "attacca", onclick: () => { ui.mode = ui.mode === "attacca" ? null : "attacca"; render(); }, text: tr("Attacca") }));
    actions.push(h("button", { class: "btn" + (ui.mode === "falo" ? " on" : ""), "aria-pressed": ui.mode === "falo", onclick: () => { ui.mode = ui.mode === "falo" ? null : "falo"; render(); }, text: tr("Falò") }));
    if (s.cfg && s.cfg.consacrazione) actions.push(h("button", { class: "btn" + (ui.mode === "consacra" ? " on cons" : ""), "aria-pressed": ui.mode === "consacra", onclick: () => { ui.mode = ui.mode === "consacra" ? null : "consacra"; render(); }, text: tr("Consacra") }));
    actions.push(h("button", { class: "btn primary", disabled: !pv || pv.err, onclick: onConfirm, text: tr("Conferma") }));
  } else if (turn) {
    actions.push(h("button", { class: "btn small", onclick: () => { const o = hand.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } ui.order = o; ui.sel = null; render(); }, text: tr("Mescola") }));
    actions.push(h("button", { class: "btn small", onclick: () => { ui.alch = []; ui.sel = null; render(); }, text: tr("Alchimia") }));
    const costo = (s.cfg && s.cfg.costoSuggerimento) || 3;
    actions.push(ui.hintConfirm
      ? h("button", { class: "btn small danger", onclick: () => { ui.hintConfirm = false; askHint(); }, text: tr("Sì, suggerisci (−{n} PV)", { n: costo }) })
      : h("button", { class: "btn small", disabled: hintBusy || s.hp[mySeat()] <= costo, title: tr("Il computer ti propone la mossa migliore: costa {n} PV", { n: costo }), onclick: () => { ui.hintConfirm = true; render(); setTimeout(() => { ui.hintConfirm = false; render(); }, 4000); }, text: tr(hintBusy ? tr("Ci penso…") : tr("Suggerisci")) }));
    actions.push(ui.passConfirm
      ? h("button", { class: "btn small danger", onclick: doPass, text: tr("Sì, passa il turno") })
      : h("button", { class: "btn small", onclick: () => { ui.passConfirm = true; render(); setTimeout(() => { ui.passConfirm = false; render(); }, 4000); }, text: tr("Passa") }));
  }
  const pv = previewLine();
  const seatBtns = [];
  if (!me && !s.winner && !s.seats.B) {
    if (!CRED) seatBtns.push(h("label", { class: "field", for: "nome-sfidante", style: "width:100%" }, tr("Il tuo nome di mago"), h("input", { type: "text", id: "nome-sfidante", maxlength: "24", placeholder: tr("Come ti chiami?"), value: myName() })));
    seatBtns.push(h("button", { class: "btn primary", onclick: sitDown, text: tr("Siediti come Mago Rosso") }));
  }
  if (!me && s.seats.A && s.seats.B && !s.winner) seatBtns.push(h("p", { class: "note", text: tr("Questa partita ha già due giocatori. Se è tua, aprila dal dispositivo con cui giochi o usa il link di accesso del tuo profilo.") }));
  if (me === "A" && !s.seats.B && !s.winner) seatBtns.push(h("button", { class: "btn primary", onclick: invite, text: tr("Invita un amico") }));
  if (me && !s.winner && s.seats.B && !s.seats.B.cpu && !both) { const pb = pushButton(); if (pb) seatBtns.push(pb); }

  fill(Gm, 
    h("div", { class: "topbar" },
      h("button", { class: "btn small", onclick: leaveGame, text: tr("← Partite") }),
      h("span", { class: "title", text: "Grimorio" }),
      h("button", { class: "btn small", onclick: showRules, text: tr("Regole") })),
    pbar(s, top),
    h("div", { class: "boardwrap" }, boardEl(s)),
    h("div", { class: "legend" },
      h("span", { style: "--c:var(--z" + top + ")", text: tr("▲ Sanctum {c}", { c: tr(top === "A" ? tr("Blu") : tr("Rosso")) }) + (me === top && !both ? tr(" (tuo)") : "") }),
      h("span", { style: "--c:var(--zS)", text: tr("Passo Arcano · → ↓ ↑ verso di lettura") }),
      h("span", { style: "--c:var(--z" + G.enemy(top) + ")", text: tr("▼ Sanctum {c}", { c: tr(top === "A" ? tr("Rosso") : tr("Blu")) }) + (me === G.enemy(top) && !both ? tr(" (tuo)") : "") })),
    pbar(s, G.enemy(top)),
    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null, me && clockText(s, myTurn()) ? h("small", { id: "orologio", text: clockText(s, myTurn()) }) : null),
    s.winner ? h("p", { class: "winner", text: "✦ " + seatName(s, s.winner) + " ✦" }) : null,
    seatBtns.length ? h("div", { class: "actions" }, seatBtns) : null,
    pv ? h("p", { class: "preview" + (pv.err ? " err" : "") }, pv.text, pv.tipo ? h("span", { class: "tipo", text: " · " + pv.tipo }) : null) : (me && myTurn() ? h("p", { class: "preview" }, h("span", { class: "tipo", text: tr(ui.sel !== null ? tr("Ora tocca una casella del campo") : tr("Tocca una lettera, poi una casella")) })) : null),
    handEl,
    actions.length ? h("div", { class: "actions" }, actions) : null,
    h("div", { class: "actions" }, h("button", { class: "btn small solo-stretto", onclick: showExplorer, text: tr("Esplora il dizionario") })),
    dictState === "carico" && me ? h("p", { class: "note", style: "text-align:center", text: tr("Carico il dizionario ({n} parole)…", { n: dictLangs.reduce((n, l) => n + DIZ[l].parole, 0).toLocaleString(LANG) }) }) : null,
    h("details", { class: "card" }, h("summary", { text: tr("Cronaca della partita") }), h("div", { class: "log" }, s.log.slice().reverse().map(m => h("div", { text: G.testoLog(m, { A: seatName(s, "A"), B: seatName(s, "B") }) })))),
    me ? (s.winner
      ? h("div", { class: "actions" }, h("button", { class: "btn link", onclick: hideGame, text: tr("Togli dall'elenco") }))
      : ui.delConfirm
        ? h("div", { class: "actions" }, h("button", { class: "btn small", onclick: () => { ui.delConfirm = false; render(); }, text: tr("Annulla") }),
            h("button", { class: "btn small danger", onclick: resignGame, text: (!s.seats.B || both) ? tr("Sì, elimina la partita") : tr("Sì, abbandono (vince l'avversario)") }))
        : h("div", { class: "actions" }, h("button", { class: "btn link", onclick: () => { ui.delConfirm = true; render(); }, text: (!s.seats.B || both) ? tr("Elimina partita") : tr("Abbandona la partita") }))) : null,
    langSwitch()
  );
}

function render() {
  const inGame = !!cur;
  document.getElementById("lobby").hidden = inGame;
  document.getElementById("game").hidden = !inGame;
  if (inGame) renderGame(); else renderLobby();
  updateSide();
}
document.getElementById("sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
window.addEventListener("hashchange", () => { const m = /^#g=([a-z0-9]+)/.exec(location.hash); if (m && (!cur || cur.id !== m[1])) openGame(m[1]); });
async function init() {
  usaDiz(dizScelti()); render();
  const acc = /^#accedi=([a-z0-9]+\.[a-f0-9]+)/.exec(location.hash);
  if (acc) await useAccessLink(acc[1]);
  const m = /^#g=([a-z0-9]+)/.exec(location.hash);
  if (CRED) { connectWs(); await loadGames(); if (pushOn()) enablePush(true); } else { conn = "ok"; render(); }
  if (m) openGame(m[1]);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}
init();
