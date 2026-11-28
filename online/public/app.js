// Grimorio — interfaccia di gioco (versione online)
"use strict";
const G = window.Grimorio;
const VER = "v22";
document.getElementById("ver").textContent = VER;
const BASE = G.PRESETS.v5f; // v5e + lettura dal lato (campo girato per ciascun giocatore)
// regole da mostrare: quelle della partita aperta, altrimenti quelle scelte nel menu tr("Regole")
function regoleAttive() {
  if (S() && S().cfg) return S().cfg;
  const sel = document.getElementById("regole"), c = ((sel && REGOLE[sel.value]) || REGOLE.s2).cfg;
  const d = dizScelti();
  return d.join() !== "it" ? Object.assign({}, c, { dizionari: d }) : c;
}
// s2 (dal 28/11/2026): semplificate con consacrazione sul bordo e Trasformazione; con più dizionari si parte da 35 PV
const REGOLE = { s2: { cfg: G.PRESETS.s2, nome: "Semplificate (s2)", pv: [25, 30, 35, 40], def: 30, defMiste: 35 }, v5f: { cfg: G.PRESETS.v5f, nome: "Classiche (con lessico)", pv: [20, 25, 30], def: 30 } };
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
function hideToast() { clearTimeout(toastT); const t = document.getElementById("toast"); if (t) t.hidden = true; }
function toast(msg, err) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast" + (err ? " err" : ""); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, err ? 4200 : 2800);
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
function setLang(l) { LANG = l; store.set("grimorio-lingua", l); G.setLinguaUI(l); document.documentElement.lang = l; hideToast(); side = null; render(); }
function langSwitch() {
  return h("div", { class: "langsw", role: "group", "aria-label": tr("Lingua dell'interfaccia") },
    Object.keys(LINGUE_UI).map(l => h("button", { class: "btn small" + (LANG === l ? " on" : ""), "aria-pressed": LANG === l, lang: l, title: LINGUE_UI[l], onclick: () => setLang(l), text: l.toUpperCase() })));
}

// ---------- effetti sonori (Web Audio API procedurale, nessun file esterno) ----------
let SOUND = store.get("grimorio-suoni", true) !== false;
let audioC = null;
function audioCtx() {
  if (audioC) return audioC;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try { audioC = new C(); } catch (e) { return null; }
  return audioC;
}
function unlockAudio() {
  const c = audioCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  return c;
}
window.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
window.addEventListener("keydown", unlockAudio, { capture: true, passive: true });
function tone(c, type, f0, f1, delay, dur, gain) {
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.025, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noiseBurst(c, delay, dur, f0, f1, q, gain) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const t = c.currentTime + delay;
  const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf; flt.type = "bandpass"; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + dur + 0.02);
}
function playSfx(kind) {
  if (!SOUND) return;
  try {
    const c = unlockAudio();
    if (!c) return;
    if (kind === "inizio") {
      [293.66, 369.99, 440, 587.33].forEach((f, i) => tone(c, "triangle", f, f, i * 0.085, 0.24, 0.09));
      tone(c, "sine", 587.33, 587.33, 0.255, 0.28, 0.05);
    } else if (kind === "parola") {
      noiseBurst(c, 0, 0.045, 950, 620, 2.2, 0.07);
      tone(c, "triangle", 587.33, 587.33, 0.02, 0.11, 0.08);
      tone(c, "triangle", 880, 880, 0.08, 0.14, 0.07);
    } else if (kind === "difesa") {
      noiseBurst(c, 0, 0.04, 720, 500, 2, 0.06);
      tone(c, "triangle", 329.63, 329.63, 0.01, 0.22, 0.08);
      tone(c, "sine", 493.88, 493.88, 0.04, 0.24, 0.06);
    } else if (kind === "falo") {
      noiseBurst(c, 0, 0.26, 260, 920, 1.4, 0.11);
      tone(c, "triangle", 293.66, 440, 0.03, 0.22, 0.07);
    } else if (kind === "fuoco_carica") {
      noiseBurst(c, 0, 0.34, 220, 780, 1.3, 0.10);
      tone(c, "triangle", 196, 330, 0.02, 0.28, 0.06);
    } else if (kind === "attacco") {
      noiseBurst(c, 0, 0.24, 340, 1750, 2.2, 0.1);
      tone(c, "sine", 220, 587.33, 0.01, 0.26, 0.09);
      tone(c, "triangle", 329.63, 659.25, 0.04, 0.22, 0.05);
    } else if (kind === "colpo") {
      tone(c, "sine", 155, 48, 0, 0.22, 0.16);
      noiseBurst(c, 0, 0.11, 780, 190, 1.2, 0.11);
      tone(c, "triangle", 659.25, 659.25, 0.03, 0.26, 0.07);
      tone(c, "sine", 987.77, 987.77, 0.05, 0.28, 0.04);
    } else if (kind === "vittoria") {
      [293.66, 440, 587.33, 739.99, 880].forEach((f, i) => tone(c, "triangle", f, f, i * 0.09, 0.28 + (i === 4 ? 0.2 : 0), 0.09));
      tone(c, "sine", 587.33, 587.33, 0.36, 0.38, 0.06);
    } else if (kind === "sconfitta") {
      [440, 349.23, 293.66].forEach((f, i) => tone(c, "sine", f, f * 0.98, i * 0.15, 0.28, 0.08));
    }
  } catch (e) {}
}
function seenSfx(k) {
  const m = store.get("grimorio-sfx-visti", {});
  if (m[k]) return true;
  m[k] = 1;
  const ks = Object.keys(m);
  if (ks.length > 60) delete m[ks[0]];
  store.set("grimorio-sfx-visti", m);
  return false;
}
function attackTiming(last) {
  if (!last || last.kind !== "parola") return null;
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (last.type === "attacco") {
    const steps = (last.path && last.path.length) || 0;
    if (reduce) return { reduce: true, wordMs: 0, stepMs: 0, impactAt: 180, totalMs: 2800 };
    const wordMs = 1150;
    const stepMs = steps > 4 ? 360 : 540;
    const impactAt = wordMs + steps * stepMs + (steps ? 180 : 0);
    return { reduce: false, wordMs, stepMs, impactAt, totalMs: impactAt + 2000 };
  }
  if (last.type === "falo") return { reduce, wordMs: 0, stepMs: 0, impactAt: 0, totalMs: 2600 };
  return null;
}
let sfxTimers = [];
function clearSfxTimers() { sfxTimers.forEach(clearTimeout); sfxTimers = []; }
function onStateSounds(id, prev, s, isNewMove) {
  if (!id || !s) return;
  if (isNewMove) clearSfxTimers();
  const after = (ms, kind) => sfxTimers.push(setTimeout(() => { if (!cur || cur.id !== id) return; playSfx(kind); }, ms));
  const ready = s.seats && s.seats.A && s.seats.B;
  if (ready && s.moveNo === 0 && !s.winner && !seenSfx("s:" + id)) playSfx("inizio");
  let hitDelay = 0;
  if (isNewMove && s.last && s.last.kind === "parola") {
    if (s.last.type === "attacco") {
      const tm = attackTiming(s.last);
      if (tm && !tm.reduce) {
        playSfx("fuoco_carica");
        after(tm.wordMs, "attacco");
      } else {
        playSfx("attacco");
      }
      if (s.last.damage > 0) {
        hitDelay = tm ? tm.impactAt : 200;
        after(hitDelay, "colpo");
      }
    } else playSfx(s.last.type === "falo" ? "falo" : s.last.type === "difesa" ? "difesa" : "parola");
  }
  if (s.winner && !seenSfx("e:" + id)) {
    const me = mySeat();
    const both = s.seats && s.seats.A && s.seats.B && s.seats.A.tok === MYID && s.seats.B.tok === MYID;
    const endKind = (!me || both || s.winner === me) ? "vittoria" : "sconfitta";
    const endDelay = hitDelay ? hitDelay + 600 : (isNewMove && s.last && s.last.kind === "parola" ? 260 : 0);
    if (endDelay) after(endDelay, endKind);
    else playSfx(endKind);
  }
}
function toggleSound() {
  SOUND = !SOUND; store.set("grimorio-suoni", SOUND);
  if (SOUND) playSfx("parola");
  toast(SOUND ? tr("Suoni attivi") : tr("Suoni disattivati"));
  render();
}
function speakerSvg(on) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "17"); svg.setAttribute("height", "17"); svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.1"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const d = on
    ? ["M11 5L6 9H2v6h4l5 4V5z", "M15.5 8.5a5 5 0 0 1 0 7", "M18.5 5.5a9 9 0 0 1 0 13"]
    : ["M11 5L6 9H2v6h4l5 4V5z", "M22 9l-6 6", "M16 9l6 6"];
  d.forEach(p => { const el = document.createElementNS(ns, "path"); el.setAttribute("d", p); svg.appendChild(el); });
  return svg;
}
function soundBtn() {
  const label = SOUND ? tr("Suoni attivi") : tr("Suoni disattivati");
  return h("button", { class: "btn small icon" + (SOUND ? " on" : ""), "aria-pressed": String(SOUND), "aria-label": label, title: label, onclick: toggleSound }, speakerSvg(SOUND));
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
  "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7.": "Words that are not launched act as bridges or obstacles and lose 1 Stability on each of your turns. Alchemy: instead of writing, discard any letters you like and draw back up to 7.",
  "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).": "The winner is whoever brings the opponent to 0 Health Points (this game starts at {n}).",
  "Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte.": "Each player sees their own Sanctum at the bottom, as if sitting on opposite sides of a table. Vertical words read top to bottom from the side of whoever wrote them: you see your opponent's upside down.",
  "Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso.": "The Blue Wizard's Sanctum is at the top, the Red Wizard's at the bottom. Words read left to right and top to bottom.",
  "Le parole di Fuoco, Gelo e Acqua sono attacchi: scegli una loro lettera in un Sanctum e l'incantesimo corre dritto lungo la colonna verso il mago avversario. Perde 1 di potenza per casella e 1 in più per ogni lettera che attraversa.": "Fire, Frost and Water words are attacks: pick one of their letters in a Sanctum and the spell runs straight along the column towards the enemy wizard. It loses 1 power per square and 1 more for each letter it crosses.",
  "Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo {m} attive).": "Earth words are permanent defences: they intercept spells in their column and the ones next to it. You can also consecrate a neutral word in your Sanctum as a defence (half resistance, it wears out, up to {m} active).",
  "Per invadere il Sanctum nemico serve il Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata).": "To invade the enemy Sanctum you need the Magic Link: a chain of words from your Sanctum to a word lying entirely in the Midlands that touches the Arcane Pass (the golden row).",
  "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni {n} turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine.": "Great Bonfire: extend or cross a word in the centre or in the enemy Sanctum and burn it, once every {n} turns. Destroying words in the centre unleashes a Storm on the nearby words.",
  "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7.": "Attack and neutral words lose 1 Stability on each of your turns and then fade. Alchemy: instead of writing, discard any letters you like and draw back up to 7.",
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
  "Semplificate (s2)": "Simplified (s2)",
  "Regole in breve (s2)": "Rules at a glance (s2)",
  "Trasforma": "Transform",
  "Trasformazione": "Transformation",
  "Trasforma {a} in {b}": "Transform {a} into {b}",
  "Suggerimento: trasforma {a} in {b}. Tocca «Trasforma {a} in {b}», oppure scegli un'altra lettera.": "Hint: transform {a} into {b}. Tap “Transform {a} into {b}”, or pick another letter.",
  "Si trasformano solo le lettere pesanti (da {n} punti in su).": "Only heavy letters ({n} points or more) can be transformed.",
  "Nessuna lettera pesante nel Grimorio (da {n} punti in su).": "No heavy letter in your Grimoire ({n} points or more).",
  "Al posto di scrivere una parola, trasformi una lettera pesante (da {n} punti in su) in una che vale al massimo la metà. Tocca nel Grimorio la lettera pesante, quelle tratteggiate.": "Instead of writing a word, you turn a heavy letter ({n} points or more) into one worth at most half. Tap the heavy letter in your Grimoire (the dashed ones).",
  "Scegli qui sotto in cosa trasformare {l} (al massimo {m} punti) e tocca «Trasforma». La lettera resta quella nuova e il turno passa all'avversario.": "Choose below what to turn {l} into (at most {m} points) and tap “Transform”. The letter stays the new one and your turn ends.",
  "È sulla riga del bordo: tocca «Consacra» per trasformarla in Scudo, che protegge tutto il tuo Sanctum, oppure «Conferma» come ponte.": "It is on the edge row: tap “Consecrate” to turn it into a Shield that protects your whole Sanctum, or “Confirm” to use it as a bridge.",
  "Può invadere il tuo Sanctum! Al tuo turno scrivi una parola sulla riga del bordo, quella più lontana dal centro, e premi «Consacra» per creare uno Scudo.": "They can invade your Sanctum! On your turn write a word on the edge row, the one farthest from the centre, and press “Consecrate” to create a Shield.",
  "Ha il Ponte attivo: scrivi una parola sulla riga del bordo del tuo Sanctum ({d}), quella più lontana dal centro, e premi «Consacra» per creare uno Scudo.": "Their Bridge is active: write a word on the edge row of your Sanctum ({d}), the one farthest from the centre, and press “Consecrate” to create a Shield.",
  "Difesa: consacra una parola scritta tutta sulla riga del bordo del tuo Sanctum, la più lontana dal centro (tocca «Consacra»). La sua resistenza è pari al suo punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.": "Defence: consecrate a word written entirely on the edge row of your Sanctum, the one farthest from the centre (tap “Consecrate”). Its resistance equals its score, at most {m} active, and it loses 1 on each of your turns.",
  "Trasformazione: invece di scrivere trasformi una lettera pesante (da {n} punti in su) in una che vale al massimo la metà, per esempio Q (10) in una lettera da 5 punti o meno. La lettera resta quella nuova.": "Transformation: instead of writing, you turn a heavy letter ({n} points or more) into one worth at most half, for example Q (10) into a letter worth 5 points or less. The letter stays the new one.",
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
  " Con più dizionari vale una parola di uno qualsiasi, e la Sacca è mista: 26 lettere, con quantità e valori nella media delle lingue scelte.": " With more than one dictionary a word from any of them counts, and the Bag is mixed: 26 letters, with quantities and values averaged over the chosen languages.",
  "Suoni attivi": "Sounds on",
  "Suoni disattivati": "Sounds off",
  "{p} lancia {w}!": "{p} launches {w}!",
  "Potenza {n} · l'incantesimo parte…": "Power {n} · the spell ignites…",
  "Potenza {n} · scaglia il colpo…": "Power {n} · hurling the strike…",
  "Incantesimo in volo": "Spell in flight",
  "Potenza residua {n}": "Remaining power {n}",
  "Colpisce lo scudo {d}!": "Hits the shield {d}!",
  "Lo scudo {d} è disintegrato! Potenza residua {n}": "The shield {d} is shattered! Remaining power {n}",
  "Lo scudo {d} assorbe l'incantesimo!": "The shield {d} absorbs the spell!",
  "{w} colpisce {t}!": "{w} hits {t}!",
  "−{n} PV": "−{n} HP",
  "L'incantesimo si ferma": "The spell stops",
  "Assorbito dallo scudo {d}": "Absorbed by the shield {d}",
  "L'incantesimo si dissolve prima di colpire": "The spell fizzles out before striking",
  "{p} scatena il Grande Falò!": "{p} unleashes the Great Bonfire!",
  "{w} brucia {l}": "{w} burns {l}",
  "Tempesta (forza {n})": "Storm (force {n})",
  "Tocca per chiudere": "Tap to dismiss",
  "L'avversario ha il Ponte attivo": "Your opponent has the Bridge active",
  "Può invadere il tuo Sanctum! Al tuo turno scrivi una parola tutta nel tuo Sanctum e premi «Consacra» per creare uno Scudo.": "They can invade your Sanctum! On your turn write a word entirely in your Sanctum and tap “Consecrate” to raise a Shield.",
  "Nel frattempo": "Meanwhile",
  "Tocca una lettera già sul campo per vedere a quali parole appartiene e quanta Stabilità le resta.": "Tap any letter on the board to see which words it belongs to and how much Stability it has left.",
  "Scegli da dove lanciare!": "Choose where to launch from!",
  "Tocca una delle lettere accese in arancio: il numero indica quanti PV toglierà l'incantesimo (perde 1 per casella e 1 per lettera attraversata).": "Tap one of the glowing orange letters: the number shows how much HP the spell will deal (it loses 1 per square and 1 per letter crossed).",
  "Al posto di scrivere una parola, scarti le lettere che non ti servono: toccale nel Grimorio (o premi «Tutte») e poi «Cambia». Finiscono nel Focolare e peschi dalla Sacca fino a tornare a {n} lettere, quindi se ne hai di più ti alleggerisci. Il turno passa all'avversario: conviene quando hai lettere pesanti, nessuna vocale o nessuna parola utile.": "Instead of writing a word, you discard the letters you don't need: tap them in your Grimoire (or press “All”) and then “Change”. They go to the Hearth and you draw from the Bag until you are back to {n} letters, so if you hold more you get lighter. Your turn ends: it is worth it when you have heavy letters, no vowels or no useful word.",
  "Ora puoi attaccare!": "Now you can attack!",
  "Questa parola tocca il Sanctum nemico: premi «Attacca» qui sopra e poi «Conferma» per lanciare l'incantesimo (potenza {n}).": "This word reaches the enemy Sanctum: tap “Attack” above and then “Confirm” to launch the spell (power {n}).",
  "Attacco pronto!": "Attack ready!",
  "Tocca «Conferma» per lanciare «{w}» con potenza {n}.": "Tap “Confirm” to launch “{w}” with power {n}.",
  "Grande Falò pronto!": "Great Bonfire ready!",
  "Tocca «Conferma» per bruciare {l}.": "Tap “Confirm” to burn {l}.",
  "Difesa pronta!": "Defence ready!",
  "Protegge tutta la sua riga dagli attacchi che passano di lì (resistenza {r}). Tocca «Conferma».": "It shields its entire row against spells passing through (resistance {r}). Tap “Confirm”.",
  "Protegge la sua colonna e quelle accanto (resistenza {r}). Tocca «Conferma».": "It shields its column and the adjacent ones (resistance {r}). Tap “Confirm”.",
  "Attacco bloccato dalle difese": "Attack blocked by defences",
  "Le difese nemiche proteggono quelle colonne: prova un'altra colonna o usa il Falò.": "Enemy defences guard those columns: try another column or use the Bonfire.",
  "Puoi anche consacrarla!": "You can also consecrate it!",
  "Scritta tutta nel tuo Sanctum: tocca «Consacra» per trasformarla in Scudo di riga, oppure «Conferma» come ponte.": "Written entirely in your Sanctum: tap “Consecrate” to turn it into a row Shield, or “Confirm” as a bridge.",
  "Scritta tutta nel tuo Sanctum: tocca «Consacra» per farla diventare una difesa, oppure «Conferma».": "Written entirely in your Sanctum: tap “Consecrate” to turn it into a defence, or “Confirm”.",
  "Attivi il Ponte Magico!": "You activate the Magic Bridge!",
  "Questa parola tocca il Passo Arcano (riga dorata): dal prossimo turno potrai invadere il Sanctum nemico!": "This word touches the Arcane Pass (golden row): from your next turn you can invade the enemy Sanctum!",
  "Parola valida!": "Valid word!",
  "Tocca «Conferma» per giocarla e avanzare sul campo.": "Tap “Confirm” to play it and advance across the board.",
  "Continua la parola": "Keep building the word",
  "Posa almeno un'altra lettera per formare una parola valida, oppure toccala per ritirarla.": "Place at least one more letter to form a valid word, or tap it to take it back.",
  "Serve prima il Ponte!": "You need the Bridge first!",
  "Non puoi entrare nel Sanctum nemico finché non hai una catena di parole fino al Passo Arcano (la riga dorata al centro).": "You can't enter the enemy Sanctum until you have a chain of words reaching the Arcane Pass (the golden row in the centre).",
  "Primo turno nel tuo Sanctum": "First turn in your Sanctum",
  "Al primo turno tutte le lettere vanno nella tua zona ({d}).": "On your first turn all letters must go in your zone ({d}).",
  "Correggi la posa": "Adjust your placement",
  "Controlla il messaggio rosso qui sopra o tocca una lettera in posa per ritirarla.": "Check the red message above or tap a placed letter to take it back.",
  "Inizia dal tuo Sanctum": "Start in your Sanctum",
  "Scrivi la prima parola nella tua zona ({d}), poi nei turni seguenti allungati verso il Passo Arcano (riga dorata). Tocca «Esplora il dizionario» per vedere cosa puoi formare.": "Write your first word in your zone ({d}), then on later turns extend towards the Arcane Pass (golden row). Tap “Explore the dictionary” to see what you can make.",
  "Ora puoi attaccare — o usare il Falò!": "Now you can attack — or use the Bonfire!",
  "Hai il Ponte attivo e parole nemiche nel Sanctum ({d}): agganciati lì e premi «Attacca», oppure distruggi uno Scudo con «Falò».": "Your Bridge is active and there are enemy words in their Sanctum ({d}): hook onto them and tap “Attack”, or shatter a Shield with “Bonfire”.",
  "Hai il Ponte attivo: scrivi una parola che si agganci nel Sanctum nemico ({d}) e poi premi «Attacca» per lanciare i suoi punti in danni!": "Your Bridge is active: write a word hooking into the enemy Sanctum ({d}) and then tap “Attack” to launch its score as damage!",
  "Hai il Ponte attivo: scrivi una parola di Fuoco, Gelo o Acqua che entri nel Sanctum nemico ({d}) per lanciare l'incantesimo!": "Your Bridge is active: write a Fire, Frost or Water word entering the enemy Sanctum ({d}) to cast the spell!",
  "Ponte attivo!": "Bridge active!",
  "Sei arrivato al Passo Arcano. Appena l'avversario avrà una parola nel suo Sanctum ({d}) potrai agganciarti e attaccare.": "You reached the Arcane Pass. As soon as your opponent has a word in their Sanctum ({d}), you can hook onto it and attack.",
  "Attento: il nemico può attaccarti!": "Watch out: the enemy can attack you!",
  "Ha il Ponte attivo: scrivi una parola tutta nel tuo Sanctum ({d}) e premi «Consacra» per creare uno Scudo di riga.": "Their Bridge is active: write a word entirely in your Sanctum ({d}) and tap “Consecrate” to raise a row Shield.",
  "Ha il Ponte attivo: proteggi il tuo Sanctum ({d}) con una parola di Terra o consacrandone una.": "Their Bridge is active: protect your Sanctum ({d}) with an Earth word or by consecrating one.",
  "Costruisci il Ponte o lancia un elemento": "Build the Bridge or cast an element",
  "Collega parole dal tuo Sanctum fino a toccare il Passo Arcano (riga dorata) per poter invadere, oppure lancia Fuoco/Gelo/Acqua dal tuo Sanctum.": "Link words from your Sanctum to touch the Arcane Pass (golden row) so you can invade, or launch Fire/Frost/Water from your Sanctum.",
  "Quasi al Passo Arcano!": "Almost at the Arcane Pass!",
  "Agganciati alla tua rete al centro e tocca la riga dorata per attivare il Ponte. Solo dopo potrai attaccare nel Sanctum nemico!": "Hook onto your network in the centre and touch the golden row to activate the Bridge. Only then can you attack in the enemy Sanctum!",
  "Costruisci il Ponte verso il centro": "Build the Bridge towards the centre",
  "Per attaccare devi prima arrivare al Passo Arcano (riga dorata): incrocia la tua parola nella Terra di Mezzo per allungare il Ponte.": "To attack you must first reach the Arcane Pass (golden row): cross your word into the Midlands to extend your Bridge.",
  "Min lettere": "Min letters",
  "Max lettere": "Max letters",
  "Qualsiasi": "Any",
  "Più lunghe": "Longest first",
  "Più corte": "Shortest first",
  "Alfabetico (A–Z)": "Alphabetical (A–Z)",
  "Altri filtri": "More filters",
  "Altri filtri ({n})": "More filters ({n})",
  "Inizia con": "Starts with",
  "Finisce con": "Ends with",
  "Contiene": "Contains",
  "Punti minimi": "Min score",
  "{n}+ punti": "{n}+ points",
  "es. CA": "e.g. CA",
  "es. RE": "e.g. RE",
  "es. ST": "e.g. ST",
  "Solo parole che usano le «Lettere in più»": "Only words using “Extra letters”",
  "Azzera filtri": "Reset filters",
  "Nessuna parola con questi filtri.": "No words match these filters.",
  "Non hai una {l} libera nel Grimorio.": "You don't have a free {l} in your Grimoire."
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
function isStale(oldData, newData) {
  if (!oldData || !oldData.s || !newData || !newData.s) return false;
  if (newData.s.moveNo < oldData.s.moveNo) return true;
  if (newData.s.moveNo === oldData.s.moveNo && (newData.updated || 0) < (oldData.updated || 0)) return true;
  return false;
}
function onServerGame(m) {
  const next = { id: m.id, s: m.s, updated: m.updated };
  if (isStale(games[m.id], next)) return;
  games[m.id] = next;
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
let ui = freshUi(), confirmTimer = null, hoverCell = null, kbCell = null;
function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, trasf: null, passConfirm: false, hintConfirm: false, hintLaunch: null, delConfirm: false, busy: false, order: null }; }
let anim = null, animSeq = 0, animTimers = [];
function stopAnim() { animTimers.forEach(clearTimeout); animTimers = []; anim = null; clearSfxTimers(); }

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
  const fillHp = k => { const d = dizScelti().length > 1 && REGOLE[k].defMiste || REGOLE[k].def; fill(hp, ...REGOLE[k].pv.map(v => h("option", { value: v, selected: v === d, text: tr("{n} PV", { n: v }) }))); };
  const reg = h("select", { id: "regole", onchange: e => fillHp(e.target.value) });
  // in inglese ci sono solo le regole s1: il lessico delle classiche è italiano
  // dizionari della partita: uno o più; le regole classiche (con lessico) solo con il solo italiano
  const scelti = dizScelti();
  const dzBox = Object.keys(DIZ).map(l => h("input", { type: "checkbox", id: "diz-" + l, value: l, checked: scelti.includes(l) }));
  const dizSel = () => dzBox.filter(x => x.checked).map(x => x.value);
  const dzNota = h("p", { class: "note" });
  const fillReg = () => {
    const soloIt = dizSel().join() === "it";
    fill(reg, ...(soloIt ? Object.keys(REGOLE) : ["s2"]).map(k => h("option", { value: k, text: tr(REGOLE[k].nome) }))); fillHp(reg.value);
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
    h("div", { class: "hero" },
      h("div", { class: "hero-top" },
        h("div", { class: "hero-runes", "aria-hidden": "true" },
          [["t", "var(--blu)"], ["0", "var(--oro)"], ["s", "var(--fuoco)"], ["c", "var(--gelo)"], ["4", "var(--oro)"], ["n", "var(--terra)"]].map(([l, c]) => h("span", { class: "rmini", style: "--c:" + c }, l))),
        h("div", { class: "topctrl" }, soundBtn(), langSwitch())),
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
      h("div", { class: "form2" },
        h("label", { class: "field", for: "regole" }, tr("Regole"), reg),
        h("label", { class: "field", for: "pv" }, tr("Punti Vita iniziali"), hp)),
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
  ui = freshUi(); anim = null; clearSfxTimers();
  cur = { id, data: games[id] || null };
  try { history.replaceState(null, "", "#g=" + id); } catch (e) {}
  wsSend({ type: "watch", id });
  if (cur.data) onGameData(cur.data, true);
  render(); window.scrollTo(0, 0);
  refreshGame(id);
}
async function refreshGame(id) {
  try { const r = await api("GET", "games/" + id); if (isStale(games[id], r)) return; games[id] = r; if (cur && cur.id === id) onGameData(r); }
  catch (e) {
    if (e.status === 404) { toast(tr("Questa partita non esiste più."), true); if (cur && cur.id === id) leaveGame(); }
    else toast(e.message, true);
  }
}
function leaveGame() {
  wsSend({ type: "unwatch" });
  cur = null; ui = freshUi(); anim = null; clearSfxTimers();
  usaDiz(dizScelti());
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  render(); loadGames();
}
function onGameData(data, first) {
  if (!first && isStale(cur && cur.data, data)) return;
  const prev = cur && cur.data && cur.data.s;
  cur.data = JSON.parse(JSON.stringify(data));
  const s = cur.data.s;
  G.applyCfg(s.cfg || BASE);
  usaDiz(G.dizionariDi(s.cfg || {}));
  if (!prev || prev.moveNo !== s.moveNo) { const keepOrder = ui.order; ui = freshUi(); ui.order = keepOrder; }
  const seen = store.get("grimorio-visto", {});
  const isNewMove = !!(s.last && s.last.seq && seen[cur.id] !== s.last.seq);
  if (isNewMove) {
    seen[cur.id] = s.last.seq; store.set("grimorio-visto", seen);
    announce(s); startAnim(s.last);
  }
  onStateSounds(cur.id, prev, s, isNewMove);
  render();
}
function announce(s) {
  const L = s.last; if (!L) return;
  if (L.kind === "parola" && (L.type === "attacco" || L.type === "falo")) return; // narrati dall'animazione fuoco in campo
  const who = seatName(s, L.by);
  if (L.kind === "alchimia") return toast(tr("{n} usa l'Alchimia.", { n: who }));
  if (L.kind === "passa") return toast(tr("{n} passa il turno.", { n: who }));
  let msg = who + ": " + L.word;
  if (L.type === "difesa") { const w = Object.values(s.words).find(x => x.text === L.word && x.o === L.by); msg += w && w.consacrata ? tr(", difesa consacrata") : tr(", nuova difesa"); }
  if (L.storm) msg += tr(" · Tempesta (forza {n})", { n: L.storm.force });
  toast(msg);
}
function startAnim(last) {
  stopAnim();
  const tm = attackTiming(last);
  if (!tm) return;
  const wordLetters = {}, shieldGhosts = {}, burnGhosts = {}, destroyedNames = [];
  if (last.cells && last.word) {
    for (let i = 0; i < last.cells.length && i < last.word.length; i++) wordLetters[last.cells[i]] = { l: last.word[i], o: last.by };
  }
  (last.destroyed || []).forEach(d => {
    if (d.text !== last.word) destroyedNames.push(d.text);
    if (last.type === "attacco" && d.mode === "return" && d.cells && d.letters) {
      for (let i = 0; i < d.cells.length && i < d.letters.length; i++) shieldGhosts[d.cells[i]] = { l: d.letters[i], o: d.o, def: d.text };
    }
    if (last.type === "falo" && d.cells && d.letters) {
      for (let i = 0; i < d.cells.length && i < d.letters.length; i++) burnGhosts[d.cells[i]] = { l: d.letters[i], o: d.o };
    }
  });
  const seq = ++animSeq;
  const path = last.path || [];
  const shatteredDefs = new Set();
  if (tm.reduce && last.type === "attacco") path.forEach(st => { if (st.kind === "disintegra" && st.def) shatteredDefs.add(st.def); });
  anim = {
    seq, kind: last.type, by: last.by, target: G.enemy(last.by), word: last.word, score: last.score,
    damage: last.damage || 0, launch: last.launch, path, storm: last.storm || null,
    phase: last.type === "falo" ? "falo" : (tm.reduce ? "impact" : "word"),
    i: tm.reduce ? path.length : 0,
    wordLetters, shieldGhosts, burnGhosts, shatteredDefs, destroyedNames, totalMs: tm.totalMs
  };
  const sched = (ms, fn) => animTimers.push(setTimeout(() => { if (!anim || anim.seq !== seq) return; fn(); render(); }, ms));
  if (last.type === "attacco" && !tm.reduce) {
    for (let k = 1; k <= path.length; k++) {
      sched(tm.wordMs + (k - 1) * tm.stepMs, () => {
        anim.phase = "travel"; anim.i = k;
        const st = path[k - 1];
        if (st && st.kind === "disintegra" && st.def) anim.shatteredDefs.add(st.def);
      });
    }
    sched(tm.impactAt, () => { anim.phase = "impact"; anim.i = path.length; });
  }
  sched(tm.totalMs, () => { stopAnim(); });
}

// ---------- suggerimento: costa PV, lo calcola il server ----------
let hintBusy = false;
async function askHint() {
  if (hintBusy || !cur || !S()) return;
  const id = cur.id, reqMoveNo = S().moveNo;
  hintBusy = true; render();
  try {
    const r = await api("POST", "games/" + id + "/suggest", { moveNo: reqMoveNo });
    if (!isStale(games[r.id], { id: r.id, s: r.s, updated: r.updated })) games[r.id] = { id: r.id, s: r.s, updated: r.updated };
    if (cur && cur.id === r.id) {
      onGameData({ id: r.id, s: r.s, updated: r.updated });
      hintBusy = false;
      if (r.hint && S() && S().moveNo === reqMoveNo && myTurn()) applyHint(r.hint);
    }
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  hintBusy = false; render();
}
// mette la mossa suggerita sulla griglia: puoi confermarla o cambiarla
function applyHint(m) {
  const s = S(), me = mySeat(), hand = s.hands[me];
  Object.assign(ui, { pending: [], place: null, mode: null, alch: null, trasf: null, sel: null, launch: null, hintLaunch: null, passConfirm: false, hintConfirm: false });
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
  } else if (m.kind === "trasforma") {
    const i = hand.indexOf(m.da);
    if (i >= 0) ui.trasf = { i, a: m.a };
    toast(tr("Suggerimento: trasforma {a} in {b}. Tocca «Trasforma {a} in {b}», oppure scegli un'altra lettera.", { a: m.da, b: m.a }));
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
  ui.place = { word, dir: "h", start: null }; ui.pending = []; ui.mode = null; ui.sel = null; ui.launch = null; ui.alch = null; ui.trasf = null;
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
function cancelPlace() { ui.place = null; ui.pending = []; ui.mode = null; hideToast(); render(); }
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
  if (myTurn() && !ui.alch && !ui.trasf && pi >= 0) { ui.pending.splice(pi, 1); render(); return; }
  if (s.tiles[k]) return showCellInfo(k);
  if (!myTurn() || ui.alch || ui.trasf) return;
  if (ui.sel === null) return toast(tr("Tocca prima una lettera del tuo Grimorio."));
  const [r, c] = G.parse(k);
  ui.pending.push({ r, c, l: s.hands[mySeat()][ui.sel], hi: ui.sel });
  ui.sel = null; render();
}
function onHand(i) {
  if (!myTurn() || ui.launch) return;
  if (ui.alch) { const j = ui.alch.indexOf(i); if (j >= 0) ui.alch.splice(j, 1); else ui.alch.push(i); render(); return; }
  if (ui.trasf) {
    if (!pesante(S().hands[mySeat()][i])) return toast(tr("Si trasformano solo le lettere pesanti (da {n} punti in su).", { n: trasfMin() }));
    ui.trasf = { i, a: null }; render(); return;
  }
  if (ui.place) ui.place = null; // si torna alla posa lettera per lettera
  if (ui.pending.some(p => p.hi === i)) return;
  ui.sel = ui.sel === i ? null : i; render();
}
// Trasformazione (regole s2): al posto della mossa una lettera pesante diventa una lettera che vale al massimo la metà
const trasfMin = () => ((S() && S().cfg) || {}).trasformaMin || 8;
const pesante = l => Object.keys(G.VAL).some(x => G.puoTrasformare(l, x));
const mete = l => Object.keys(G.VAL).filter(x => G.puoTrasformare(l, x)).sort((x, y) => G.VAL[x] - G.VAL[y] || (x < y ? -1 : 1));
function doTrasforma() {
  const s = S(), p = mySeat(), hand = s.hands[p];
  if (!ui.trasf || ui.trasf.i === null || !ui.trasf.a) return;
  sendMove({ kind: "trasforma", da: hand[ui.trasf.i], a: ui.trasf.a });
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
function cleanRaw(t) { return (t || "").toUpperCase().normalize("NFD").replace(/[^A-Z]/g, ""); }
// parole componibili con mano + lettere in più; ognuna dice quali lettere in più usa
function searchWords(hand, extra, tipo, ordine, max, opts) {
  opts = opts || {};
  const total = hand.length + extra.length;
  const minLen = Math.max(2, +opts.minLen || 2);
  const maxLen = +opts.maxLen > 0 ? Math.min(total, +opts.maxLen) : total;
  const starts = cleanRaw(opts.starts), ends = cleanRaw(opts.ends), contains = cleanRaw(opts.contains);
  const minScore = +opts.minScore || 0, onlyExtra = !!(opts.onlyExtra && extra.length);
  if (!DICT_OFFS || total < 2 || minLen > maxLen) return { list: [], total: 0 };
  const avail = new Int16Array(26), fromHand = new Int16Array(26), used = new Int16Array(26);
  for (const l of hand) { avail[l.charCodeAt(0) - 65]++; fromHand[l.charCodeAt(0) - 65]++; }
  for (const l of extra) avail[l.charCodeAt(0) - 65]++;
  const words = new Set(), T = DICT_TEXT, O = DICT_OFFS, n = O.length;
  for (let i = 0; i < n; i++) {
    const a = O[i], b = i + 1 < n ? O[i + 1] - 1 : T.length;
    const len = b - a;
    if (len > maxLen || len < minLen) continue;
    let ok = true, j = a;
    for (; j < b; j++) { const c = T.charCodeAt(j) - 65; if (++used[c] > avail[c]) { ok = false; j++; break; } }
    for (let x = a; x < j; x++) used[T.charCodeAt(x) - 65] = 0;
    if (ok) words.add(T.slice(a, b));
  }
  if (G.CFG.lingua === "it") for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {
    const cnt = new Int16Array(26); let ok = w.length >= minLen && w.length <= maxLen;
    for (const ch of w) if (++cnt[ch.charCodeAt(0) - 65] > avail[ch.charCodeAt(0) - 65]) ok = false;
    if (ok) words.add(w);
  }
  const list = [];
  for (const w of words) {
    if (starts && !w.startsWith(starts)) continue;
    if (ends && !w.endsWith(ends)) continue;
    if (contains && !w.includes(contains)) continue;
    const cls = G.classify(w);
    const kind = cls.type === "attacco" ? cls.el : cls.type;
    if (tipo === "attacco" ? cls.type !== "attacco" : tipo !== "tutte" && kind !== tipo) continue;
    const cnt = new Int16Array(26); let extraUsed = "", score = 0;
    for (const ch of w) { const c = ch.charCodeAt(0) - 65; if (++cnt[c] > fromHand[c]) extraUsed += ch; score += G.VAL[ch]; }
    if (onlyExtra && !extraUsed) continue;
    if (minScore && score < minScore) continue;
    list.push({ w, kind, score, extraUsed });
  }
  const cmp = ordine === "lunghezza"
    ? (x, y) => y.w.length - x.w.length || y.score - x.score
    : ordine === "corte"
      ? (x, y) => x.w.length - y.w.length || y.score - x.score
      : ordine === "alfa"
        ? (x, y) => (x.w < y.w ? -1 : x.w > y.w ? 1 : 0)
        : (x, y) => y.score - x.score || y.w.length - x.w.length;
  list.sort(cmp);
  return { list: list.slice(0, max), total: list.length };
}
const WIDE = window.matchMedia("(min-width: 1000px)");
let side = null; // dizionario a lato: { nodes, handIn, run, gameId, lastHand, lastCan, edited }
function myHandText() { const s = S(), me = mySeat(); return s && me ? s.hands[me].join("") : ""; }
function buildExplorer(lato) {
  if (!cur) G.applyCfg(regoleAttive());
  const libero = !!regoleAttive().attaccoLibero;
  const pfx = lato ? "dzl-" : "dz-";
  const x = { edited: false };
  const handIn = h("input", { type: "text", id: pfx + "mano", value: myHandText(), placeholder: tr("es. AEIRMTS"), autocomplete: "off", autocapitalize: "characters" });
  const extraIn = h("input", { type: "text", id: pfx + "extra", placeholder: tr("es. lettere sul campo"), autocomplete: "off", autocapitalize: "characters" });
  const lenOpts = () => [h("option", { value: "", text: tr("Qualsiasi") }), ...Array.from({ length: 10 }, (_, i) => i + 2).map(n => h("option", { value: String(n), text: tr("{n} lettere", { n }) }))];
  const minLen = h("select", { id: pfx + "min" }, lenOpts());
  const maxLen = h("select", { id: pfx + "max" }, lenOpts());
  const tipo = h("select", { id: pfx + "tipo" },
    (libero ? [["tutte", tr("Tutte")]] : [["tutte", tr("Tutte")], ["attacco", tr("Attacchi")], ["fuoco", tr("Fuoco")], ["gelo", tr("Gelo")], ["acqua", tr("Acqua")], ["difesa", tr("Difese (Terra)")], ["neutra", tr("Neutre")]]).map(([v, t]) => h("option", { value: v, text: t })));
  const ordine = h("select", { id: pfx + "ordine" },
    h("option", { value: "punti", text: tr("Punteggio") }),
    h("option", { value: "lunghezza", text: tr("Più lunghe") }),
    h("option", { value: "corte", text: tr("Più corte") }),
    h("option", { value: "alfa", text: tr("Alfabetico (A–Z)") }));
  const startsIn = h("input", { type: "text", id: pfx + "starts", placeholder: tr("es. CA"), autocomplete: "off", autocapitalize: "characters" });
  const endsIn = h("input", { type: "text", id: pfx + "ends", placeholder: tr("es. RE"), autocomplete: "off", autocapitalize: "characters" });
  const hasIn = h("input", { type: "text", id: pfx + "has", placeholder: tr("es. ST"), autocomplete: "off", autocapitalize: "characters" });
  const minScore = h("select", { id: pfx + "score" },
    h("option", { value: "", text: tr("Qualsiasi") }),
    [5, 8, 10, 12, 15, 20].map(n => h("option", { value: String(n), text: tr("{n}+ punti", { n }) })));
  const onlyExtra = h("input", { type: "checkbox", id: pfx + "onlyx" });
  const moreSummary = h("summary", { text: tr("Altri filtri") });
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
      onlyExtra.disabled = !extra.length;
      const sSt = cleanRaw(startsIn.value), sEn = cleanRaw(endsIn.value), sHas = cleanRaw(hasIn.value);
      const useOnlyX = !onlyExtra.disabled && onlyExtra.checked;
      const nMore = (sSt ? 1 : 0) + (sEn ? 1 : 0) + (sHas ? 1 : 0) + (minScore.value ? 1 : 0) + (useOnlyX ? 1 : 0);
      moreSummary.textContent = nMore ? tr("Altri filtri ({n})", { n: nMore }) : tr("Altri filtri");
      const hasFilter = nMore > 0 || !!minLen.value || !!maxLen.value || tipo.value !== "tutte";
      const r = searchWords(hand, extra, tipo.value, ordine.value, 150, {
        minLen: minLen.value, maxLen: maxLen.value, starts: sSt, ends: sEn, contains: sHas, minScore: minScore.value, onlyExtra: useOnlyX
      });
      count.textContent = hand.length + extra.length < 2
        ? tr("Scrivi almeno due lettere.")
        : r.total
          ? tr("{n} parole", { n: r.total }) + (r.total > 150 ? tr(" (mostrate le prime 150)") : "")
          : (hasFilter ? tr("Nessuna parola con questi filtri.") : tr("Nessuna parola con queste lettere."));
      const nomi = { fuoco: tr("Fuoco"), gelo: tr("Gelo"), acqua: tr("Acqua"), difesa: tr("Difesa") };
      const canPlace = myTurn() && !ui.busy;
      list.replaceChildren(...r.list.map(w => { const kind = libero ? "neutra" : w.kind; return h(canPlace ? "button" : "span", { class: "dz-w " + kind, title: (libero ? tr("Parola") : (nomi[kind] || tr("Neutra"))) + (canPlace ? tr(": tocca per posizionarla") : ""), onclick: canPlace ? () => startPlace(w.w) : null },
        w.w, h("small", { text: w.score }), w.extraUsed ? h("small", { class: "x", text: "+" + w.extraUsed }) : null); }));
    }, 200);
  };
  handIn.addEventListener("input", () => { x.edited = true; run(); });
  [extraIn, startsIn, endsIn, hasIn].forEach(i => i.addEventListener("input", run));
  [minLen, maxLen, tipo, ordine, minScore, onlyExtra].forEach(i => i.addEventListener("change", run));
  const resetFilters = () => {
    minLen.value = ""; maxLen.value = ""; startsIn.value = ""; endsIn.value = ""; hasIn.value = "";
    minScore.value = ""; onlyExtra.checked = false; tipo.value = "tutte"; ordine.value = "punti";
    run();
  };
  const myHand = myHandText();
  x.nodes = [
    h("p", { class: "sub", text: tr("Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R).") + (myHand ? tr(" Nel tuo turno tocca una parola per posizionarla sul campo.") : "") }),
    h("div", { class: "dz-form" },
      h("label", { class: "field full", for: handIn.id }, tr("Le tue lettere"), handIn),
      h("label", { class: "field full", for: extraIn.id }, tr("Lettere in più"), extraIn),
      h("label", { class: "field", for: minLen.id }, tr("Min lettere"), minLen),
      h("label", { class: "field", for: maxLen.id }, tr("Max lettere"), maxLen),
      libero ? null : h("label", { class: "field", for: tipo.id }, tr("Tipo"), tipo),
      h("label", { class: "field" + (libero ? " full" : ""), for: ordine.id }, tr("Ordina per"), ordine)),
    h("details", { class: "dz-more" },
      moreSummary,
      h("div", { class: "dz-form" },
        h("label", { class: "field", for: startsIn.id }, tr("Inizia con"), startsIn),
        h("label", { class: "field", for: endsIn.id }, tr("Finisce con"), endsIn),
        h("label", { class: "field", for: hasIn.id }, tr("Contiene"), hasIn),
        h("label", { class: "field", for: minScore.id }, tr("Punti minimi"), minScore),
        h("label", { class: "check full", for: onlyExtra.id }, onlyExtra, tr("Solo parole che usano le «Lettere in più»")))),
    h("div", { class: "dz-btns" },
      myHand ? h("button", { class: "btn small", onclick: () => { handIn.value = myHandText(); extraIn.value = ""; x.edited = false; run(); }, text: tr("Ripristina la mia mano") }) : null,
      h("button", { class: "btn small", onclick: resetFilters, text: tr("Azzera filtri") })),
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
  if (c.attaccoLibero) return sheet(c.trasformazione ? tr("Regole in breve (s2)") : tr("Regole in breve (s1)"), [h("ul", null,
    h("li", { text: tr("Ognuno vede il proprio Sanctum in basso. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte.") }),
    h("li", { text: tr(scrivi) }),
    h("li", { text: tr("Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata). Con il Collegamento attivo puoi entrare nel Sanctum nemico, agganciandoti a una sua parola.") }),
    h("li", { text: tr("Attacco: qualsiasi parola che ha una lettera nel Sanctum nemico può essere lanciata (tocca «Attacca»). La potenza è il punteggio della parola; l'incantesimo corre verso il bordo del Sanctum nemico e perde 1 per casella e 1 in più per ogni lettera. Dopo il lancio la parola si consuma: sparisce, tranne le lettere che reggono altre parole.") }),
    h("li", { text: c.consacraBordo ? tr("Difesa: consacra una parola scritta tutta sulla riga del bordo del tuo Sanctum, la più lontana dal centro (tocca «Consacra»). La sua resistenza è pari al suo punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.", { m: c.maxConsacrate || 2 }) : tr("Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è {r} il punteggio, massimo {m} attive, e perde 1 a ogni tuo turno.", { r: c.consacrazione >= 1 ? tr("{n} volte", { n: c.consacrazione }) : tr("metà del"), m: c.maxConsacrate || 2 }) }),
    h("li", { text: tr(c.scudo === "riga" ? tr("Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano.") : tr("Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto.")) }),
    h("li", { text: tr("Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni {n} turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine.", { n: c.faloOgni || 3 }) }),
    h("li", { text: tr("Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7.") }),
    h("li", { text: tr("A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita.") }),
    c.trasformazione ? h("li", { text: tr("Trasformazione: invece di scrivere trasformi una lettera pesante (da {n} punti in su) in una che vale al massimo la metà, per esempio Q (10) in una lettera da 5 punti o meno. La lettera resta quella nuova.", { n: c.trasformaMin || 8 }) }) : null,
    h("li", { text: tr("Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da {n}).", { n: c.hp }) }))]);
  sheet(tr("Regole in breve"), [h("ul", null,
    h("li", { text: tr(c.letturaDalLato ? tr("Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte.") : tr("Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso.")) }),
    h("li", { text: tr(scrivi) }),
    h("li", { text: tr("Le parole di Fuoco, Gelo e Acqua sono attacchi: scegli una loro lettera in un Sanctum e l'incantesimo corre dritto lungo la colonna verso il mago avversario. Perde 1 di potenza per casella e 1 in più per ogni lettera che attraversa.") }),
    h("li", { text: tr("Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo {m} attive).", { m: c.maxConsacrate || 2 }) }),
    h("li", { text: tr("Per invadere il Sanctum nemico serve il Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata).") }),
    h("li", { text: tr("Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni {n} turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine.", { n: c.faloOgni || 3 }) }),
    h("li", { text: tr("Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: invece di scrivere scarti le lettere che vuoi e peschi fino a tornare a 7.") }),
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
  const isAtkTarget = !!(anim && anim.kind === "attacco" && anim.damage > 0 && anim.target === p);
  const shownHp = isAtkTarget && anim.phase !== "impact" ? Math.min(max, hp + anim.damage) : hp;
  const isHit = isAtkTarget && anim.phase === "impact";
  const chips = [];
  if (G.bridgeActive(s, p)) chips.push(h("span", { class: "chip ok", text: "✦ " + tr("Ponte attivo") }));
  const cons = Object.values(s.words).filter(w => w.o === p && w.consacrata).length;
  if (s.cfg && s.cfg.maxConsacrate) chips.push(h("span", { class: "chip", text: tr("Consacrate {a}/{b}", { a: cons, b: s.cfg.maxConsacrate }) }));
  if (s.cfg && s.cfg.faloOgni) { const left = s.cfg.faloOgni - (s.turns[p] - s.lastFalo[p]); chips.push(h("span", { class: "chip" + (left <= 0 ? " ok" : ""), text: left <= 0 ? tr("Falò pronto") : tr("Falò tra {n} turni", { n: left }) })); }
  chips.push(h("span", { class: "chip", text: tr("{n} lettere", { n: s.hands[p].length }) }));
  return h("div", { class: "pbar " + p + (s.turn === p && !s.winner ? " turn" : "") + (isHit ? " hit-fire" : "") },
    h("span", { class: "nm", text: s.seats[p] ? seatName(s, p) + (s.seats[p].tok === MYID && !(s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok) ? tr(" (tu)") : "") : tr(NOMI[p]) + tr(" (libero)") }),
    h("div", { class: "hp", role: "meter", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": shownHp, "aria-label": tr("Punti Vita") }, h("i", { style: "width:" + Math.max(0, Math.min(100, shownHp / max * 100)) + "%" })),
    h("span", { class: "hpn", text: tr("{n} PV", { n: shownHp }) }),
    h("div", { class: "chips" }, chips),
    isHit ? h("span", { class: "hit-dmg", text: "🔥 " + tr("−{n} PV", { n: anim.damage }) }) : null);
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
  if (anim && anim.kind === "attacco") anim.path.slice(0, anim.i).forEach(st => { trail[st.k] = st; if (st.def) hit[st.k] = 1; });
  const atkDir = anim && anim.kind === "attacco" ? (anim.target === topSeat() ? "dir-up" : "dir-down") : "";
  const headKey = anim && anim.kind === "attacco"
    ? (anim.phase === "travel" && anim.i > 0 ? anim.path[anim.i - 1].k : (anim.phase === "impact" && !anim.path.length ? anim.launch : null))
    : null;
  // senza lettura dal lato: Blu in alto per tutti. Con lettura dal lato: il proprio Sanctum in basso
  const rows = []; for (let i = 0; i < R; i++) rows.push(topSeat() === "A" ? i : R - 1 - i);
  const scudi = {}; // righe con uno Scudo: una difesa consacrata nel proprio Sanctum
  for (const id in s.words) { const w = s.words[id]; if (w.type !== "difesa") continue; for (const kk of w.cells) { const rr = G.parse(kk)[0]; if (G.zoneOf(rr) === w.o) scudi[rr] = 1; } }
  const canType = myTurn() && !ui.busy && !ui.alch && !ui.trasf && !ui.launch && !drag;
  const cells = [];
  for (const r of rows) for (let c = 0; c < C; c++) {
    const k = G.key(r, c), z = G.zoneOf(r), t = s.tiles[k];
    const cls = ["cell", z === "M" ? (r === G.STAFFA ? "st" : "") : "z" + z];
    if (s.cfg && s.cfg.scudo === "riga" && scudi[r]) cls.push("scudo");
    if (s.cfg && s.cfg.consacraBordo && ui.mode === "consacra" && mySeat() && r === (mySeat() === "A" ? 0 : R - 1)) cls.push("bordo");
    if (ui.launch && k in ui.launch) cls.push("launch");
    if (drag && drag.bad === k) cls.push("badcell");
    if (canType && kbCell === k) cls.push("kbcur");
    const hasFlame = !!(anim && anim.kind === "attacco" && (headKey === k || (anim.phase === "word" && anim.launch === k)));
    if (anim && anim.kind === "attacco") {
      if (anim.wordLetters[k]) cls.push("burn-word");
      if (anim.launch === k) cls.push("origin");
      if (trail[k]) cls.push(hit[k] ? "hitdef" : "trail");
      if (hasFlame) { cls.push("fire-head"); if (atkDir) cls.push(atkDir); }
    } else if (anim && anim.kind === "falo" && anim.burnGhosts[k]) {
      cls.push("burn-word");
    }
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
    } else if (anim && anim.kind === "attacco" && anim.wordLetters[k]) {
      const wl = anim.wordLetters[k];
      kids.push(h("span", { class: "tile ghost-burn" }, wl.l, h("span", { class: "v", text: G.VAL[wl.l] })));
    } else if (anim && anim.kind === "attacco" && anim.shieldGhosts[k]) {
      const sg = anim.shieldGhosts[k];
      kids.push(h("span", { class: "tile ghost-shield" + (anim.shatteredDefs.has(sg.def) ? " shattered" : "") }, sg.l, h("span", { class: "v", text: G.VAL[sg.l] })));
    } else if (anim && anim.kind === "falo" && anim.burnGhosts[k]) {
      const bg = anim.burnGhosts[k];
      kids.push(h("span", { class: "tile ghost-burn" }, bg.l, h("span", { class: "v", text: G.VAL[bg.l] })));
    } else if (G.MULT[k]) kids.push(h("span", { class: "mult " + G.MULT[k], text: tr(G.MULT[k]) }));
    if (arrows[k]) arrows[k].forEach(a => kids.push(h("span", { class: "arr " + a.dir + " " + a.cls, "aria-hidden": "true", text: a.dir === "dx" ? "→" : a.dir === "giu" ? "↓" : "↑" })));
    if (ui.launch && k in ui.launch) kids.push(h("span", { class: "dmg" + (ui.launch[k] ? "" : " zero"), text: ui.launch[k] }));
    if (hasFlame) kids.push(h("span", { class: "flame", "aria-hidden": "true" }));
    if (trail[k] && !hit[k]) kids.push(h("span", { class: "pw", text: trail[k].power }));
    else if (anim && anim.kind === "attacco" && anim.launch === k && (anim.phase === "word" || !anim.path.length)) kids.push(h("span", { class: "pw", text: anim.score }));
    const label = tr("Riga {r}, colonna {c}", { r: r + 1, c: c + 1 }) + (t ? tr(", lettera {l}", { l: t.l }) : pend[k] ? tr(", lettera {l} in posa", { l: pend[k] }) : tr(", vuota"));
    cells.push(h("button", { class: cls.filter(Boolean).join(" "), "data-k": k, "aria-label": label, onclick: () => onCell(k) }, kids));
  }
  return h("div", { class: "board" + (canType ? " can-type" : "") + (ui.place && ui.pending.length ? " placing" : "") + (drag ? " dragging" : ""), role: "grid", "aria-label": tr("Campo di battaglia"), onpointerdown: onBoardPointerDown }, cells);
}
function atkBannerEl(s) {
  if (!anim) return null;
  const who = seatName(s, anim.by), tgt = seatName(s, anim.target);
  const top = topSeat();
  let atTop = anim.target !== top; // di default nella metà opposta al bersaglio
  if (anim.kind === "falo") {
    const firstK = Object.keys(anim.burnGhosts)[0];
    if (firstK) {
      const r = G.parse(firstK)[0];
      const visRow = top === "A" ? r : G.ROWS - 1 - r;
      atTop = visRow >= G.ROWS / 2;
    }
  } else if (anim.launch) {
    const r = G.parse(anim.launch)[0];
    const visRow = top === "A" ? r : G.ROWS - 1 - r;
    if (anim.phase === "word") atTop = visRow >= G.ROWS / 2;
  }
  let title = "", sub = "", isHit = false;
  if (anim.kind === "falo") {
    title = "🔥 " + tr("{p} scatena il Grande Falò!", { p: who });
    const burned = anim.destroyedNames.length ? anim.destroyedNames.join(", ") : anim.word;
    sub = tr("{w} brucia {l}", { w: anim.word, l: burned }) + (anim.storm ? " · " + tr("Tempesta (forza {n})", { n: anim.storm.force }) : "");
  } else if (anim.phase === "word") {
    title = "🔥 " + tr("{p} lancia {w}!", { p: who, w: anim.word });
    sub = anim.path.length ? tr("Potenza {n} · l'incantesimo parte…", { n: anim.score }) : tr("Potenza {n} · scaglia il colpo…", { n: anim.score });
  } else if (anim.phase === "travel") {
    const st = anim.i > 0 ? anim.path[anim.i - 1] : null;
    if (st && st.kind === "disintegra") {
      title = "🛡️ " + tr("Colpisce lo scudo {d}!", { d: st.def });
      sub = tr("Lo scudo {d} è disintegrato! Potenza residua {n}", { d: st.def, n: st.power });
    } else if (st && st.kind === "assorbito") {
      title = "🛡️ " + tr("Colpisce lo scudo {d}!", { d: st.def });
      sub = tr("Lo scudo {d} assorbe l'incantesimo!", { d: st.def });
    } else {
      title = "🔥 " + tr("{p} lancia {w}!", { p: who, w: anim.word });
      sub = tr("Incantesimo in volo") + " · " + tr("Potenza residua {n}", { n: st ? st.power : anim.score });
    }
  } else {
    isHit = anim.damage > 0;
    const lastSt = anim.path.length ? anim.path[anim.path.length - 1] : null;
    if (anim.damage > 0) {
      title = "🔥 " + tr("{w} colpisce {t}!", { w: anim.word, t: tgt });
      sub = tr("−{n} PV", { n: anim.damage });
    } else {
      title = tr("L'incantesimo si ferma");
      sub = lastSt && lastSt.kind === "assorbito" ? tr("Assorbito dallo scudo {d}", { d: lastSt.def }) : tr("L'incantesimo si dissolve prima di colpire");
    }
  }
  return h("div", { class: "atk-banner " + (atTop ? "at-top" : "at-bottom") + (isHit ? " hit" : ""), role: "status", onclick: () => { stopAnim(); render(); } },
    h("strong", { text: title }),
    sub ? h("span", { text: sub }) : null,
    h("small", { text: tr("Tocca per chiudere") }));
}
function guideHint(s, me, v) {
  if (!me || s.winner || !s.seats.A || !s.seats.B) return null;
  const cfg = s.cfg || BASE, libero = !!cfg.attaccoLibero, enemy = G.enemy(me);
  const top = topSeat(), myDir = me === top ? tr("in alto") : tr("in basso"), enemyDir = enemy === top ? tr("in alto") : tr("in basso");
  const bridge = G.bridgeActive(s, me), enemyBridge = G.bridgeActive(s, enemy);
  const oppHasSanctum = Object.values(s.words).some(w => w.o === enemy && w.cells.some(k => G.zoneOf(G.parse(k)[0]) === enemy));
  const enemyHasShield = Object.values(s.words).some(w => w.o === enemy && w.type === "difesa");
  const myConsCount = Object.values(s.words).filter(w => w.o === me && w.consacrata).length;
  const canCons = !!(cfg.consacrazione && (!cfg.maxConsacrate || myConsCount < cfg.maxConsacrate));
  const faloReady = !cfg.faloOgni || (s.turns[me] - s.lastFalo[me] >= cfg.faloOgni);
  if (!myTurn()) {
    if (enemyBridge && !myConsCount && canCons) return { tone: "warn", ico: "🛡️", title: tr("L'avversario ha il Ponte attivo"), text: cfg.consacraBordo ? tr("Può invadere il tuo Sanctum! Al tuo turno scrivi una parola sulla riga del bordo, quella più lontana dal centro, e premi «Consacra» per creare uno Scudo.") : tr("Può invadere il tuo Sanctum! Al tuo turno scrivi una parola tutta nel tuo Sanctum e premi «Consacra» per creare uno Scudo.") };
    if (!s.first[me]) return { tone: "info", ico: "💡", title: tr("Nel frattempo"), text: tr("Tocca una lettera già sul campo per vedere a quali parole appartiene e quanta Stabilità le resta.") };
    return null;
  }
  if (ui.launch) return { tone: "hot", ico: "🔥", title: tr("Scegli da dove lanciare!"), text: tr("Tocca una delle lettere accese in arancio: il numero indica quanti PV toglierà l'incantesimo (perde 1 per casella e 1 per lettera attraversata).") };
  if (ui.trasf) {
    if (ui.trasf.i === null) return { tone: "info", ico: "🔮", title: tr("Trasformazione"), text: tr("Al posto di scrivere una parola, trasformi una lettera pesante (da {n} punti in su) in una che vale al massimo la metà. Tocca nel Grimorio la lettera pesante, quelle tratteggiate.", { n: trasfMin() }) };
    const da = s.hands[me][ui.trasf.i];
    return { tone: "info", ico: "🔮", title: tr("Trasformazione"), text: tr("Scegli qui sotto in cosa trasformare {l} (al massimo {m} punti) e tocca «Trasforma». La lettera resta quella nuova e il turno passa all'avversario.", { l: da, m: Math.floor(G.VAL[da] / 2) }) };
  }
  if (ui.alch) return { tone: "info", ico: "⚗️", title: tr("Alchimia"), text: tr("Al posto di scrivere una parola, scarti le lettere che non ti servono: toccale nel Grimorio (o premi «Tutte») e poi «Cambia». Finiscono nel Focolare e peschi dalla Sacca fino a tornare a {n} lettere, quindi se ne hai di più ti alleggerisci. Il turno passa all'avversario: conviene quando hai lettere pesanti, nessuna vocale o nessuna parola utile.", { n: cfg.hand || 7 }) };
  if (ui.pending.length) {
    if (v && v.ok) {
      if (libero && v.type === "neutra" && v.launches.length) return { tone: "hot", ico: "🔥", title: tr("Ora puoi attaccare!"), text: tr("Questa parola tocca il Sanctum nemico: premi «Attacca» qui sopra e poi «Conferma» per lanciare l'incantesimo (potenza {n}).", { n: v.score }) };
      if (v.type === "attacco") return { tone: "hot", ico: "🔥", title: tr("Attacco pronto!"), text: tr("Tocca «Conferma» per lanciare «{w}» con potenza {n}.", { w: v.main.text, n: v.score }) };
      if (v.type === "falo") return { tone: "hot", ico: "🔥", title: tr("Grande Falò pronto!"), text: tr("Tocca «Conferma» per bruciare {l}.", { l: v.targets.map(id => s.words[id].text).join(", ") }) };
      if (v.type === "difesa") {
        const res = v.consacrata ? Math.max(1, Math.ceil(v.score * (cfg.consacrazione || .5))) : v.score;
        return { tone: "def", ico: "🛡️", title: tr("Difesa pronta!"), text: cfg.scudo === "riga" ? tr("Protegge tutta la sua riga dagli attacchi che passano di lì (resistenza {r}). Tocca «Conferma».", { r: res }) : tr("Protegge la sua colonna e quelle accanto (resistenza {r}). Tocca «Conferma».", { r: res }) };
      }
      if (v.type === "bloccato") return { tone: "warn", ico: "🛡️", title: tr("Attacco bloccato dalle difese"), text: tr("Le difese nemiche proteggono quelle colonne: prova un'altra colonna o usa il Falò.") };
      if (v.type === "neutra" && canCons && !s.first[me] && v.main.cells.every(k => G.zoneOf(G.parse(k)[0]) === me) && (!cfg.consacraBordo || v.main.cells.every(k => G.parse(k)[0] === (me === "A" ? 0 : G.ROWS - 1)))) {
        if (cfg.consacraBordo) return { tone: "def", ico: "🛡️", title: tr("Puoi anche consacrarla!"), text: tr("È sulla riga del bordo: tocca «Consacra» per trasformarla in Scudo, che protegge tutto il tuo Sanctum, oppure «Conferma» come ponte.") };
        return { tone: "def", ico: "🛡️", title: tr("Puoi anche consacrarla!"), text: cfg.scudo === "riga" ? tr("Scritta tutta nel tuo Sanctum: tocca «Consacra» per trasformarla in Scudo di riga, oppure «Conferma» come ponte.") : tr("Scritta tutta nel tuo Sanctum: tocca «Consacra» per farla diventare una difesa, oppure «Conferma».") };
      }
      if (!bridge && v.main.cells.some(k => G.parse(k)[0] === G.STAFFA) && (!cfg.ponteCentro || v.main.cells.every(k => G.zoneOf(G.parse(k)[0]) === "M"))) {
        return { tone: "gold", ico: "✦", title: tr("Attivi il Ponte Magico!"), text: tr("Questa parola tocca il Passo Arcano (riga dorata): dal prossimo turno potrai invadere il Sanctum nemico!") };
      }
      return { tone: "gold", ico: "✓", title: tr("Parola valida!"), text: tr("Tocca «Conferma» per giocarla e avanzare sul campo.") };
    }
    if (ui.pending.length === 1) return { tone: "info", ico: "✏️", title: tr("Continua la parola"), text: tr("Posa almeno un'altra lettera per formare una parola valida, oppure toccala per ritirarla.") };
    if (!bridge && ui.pending.some(p => G.zoneOf(p.r) === enemy)) return { tone: "warn", ico: "🌉", title: tr("Serve prima il Ponte!"), text: tr("Non puoi entrare nel Sanctum nemico finché non hai una catena di parole fino al Passo Arcano (la riga dorata al centro).") };
    if (s.first[me]) return { tone: "info", ico: "🏰", title: tr("Primo turno nel tuo Sanctum"), text: tr("Al primo turno tutte le lettere vanno nella tua zona ({d}).", { d: myDir }) };
    return { tone: "info", ico: "💡", title: tr("Correggi la posa"), text: tr("Controlla il messaggio rosso qui sopra o tocca una lettera in posa per ritirarla.") };
  }
  if (s.first[me]) return { tone: "gold", ico: "🏰", title: tr("Inizia dal tuo Sanctum"), text: tr("Scrivi la prima parola nella tua zona ({d}), poi nei turni seguenti allungati verso il Passo Arcano (riga dorata). Tocca «Esplora il dizionario» per vedere cosa puoi formare.", { d: myDir }) };
  if (bridge && oppHasSanctum) {
    if (libero && enemyHasShield && faloReady) return { tone: "hot", ico: "🔥", title: tr("Ora puoi attaccare — o usare il Falò!"), text: tr("Hai il Ponte attivo e parole nemiche nel Sanctum ({d}): agganciati lì e premi «Attacca», oppure distruggi uno Scudo con «Falò».", { d: enemyDir }) };
    if (libero) return { tone: "hot", ico: "🔥", title: tr("Ora puoi attaccare!"), text: tr("Hai il Ponte attivo: scrivi una parola che si agganci nel Sanctum nemico ({d}) e poi premi «Attacca» per lanciare i suoi punti in danni!", { d: enemyDir }) };
    return { tone: "hot", ico: "🔥", title: tr("Ora puoi attaccare!"), text: tr("Hai il Ponte attivo: scrivi una parola di Fuoco, Gelo o Acqua che entri nel Sanctum nemico ({d}) per lanciare l'incantesimo!", { d: enemyDir }) };
  }
  if (bridge) return { tone: "gold", ico: "✦", title: tr("Ponte attivo!"), text: tr("Sei arrivato al Passo Arcano. Appena l'avversario avrà una parola nel suo Sanctum ({d}) potrai agganciarti e attaccare.", { d: enemyDir }) };
  if (enemyBridge && !myConsCount && canCons) {
    if (cfg.consacraBordo) return { tone: "warn", ico: "🛡️", title: tr("Attento: il nemico può attaccarti!"), text: tr("Ha il Ponte attivo: scrivi una parola sulla riga del bordo del tuo Sanctum ({d}), quella più lontana dal centro, e premi «Consacra» per creare uno Scudo.", { d: myDir }) };
    return { tone: "warn", ico: "🛡️", title: tr("Attento: il nemico può attaccarti!"), text: cfg.scudo === "riga" ? tr("Ha il Ponte attivo: scrivi una parola tutta nel tuo Sanctum ({d}) e premi «Consacra» per creare uno Scudo di riga.", { d: myDir }) : tr("Ha il Ponte attivo: proteggi il tuo Sanctum ({d}) con una parola di Terra o consacrandone una.", { d: myDir }) };
  }
  if (!libero) return { tone: "gold", ico: "🌉", title: tr("Costruisci il Ponte o lancia un elemento"), text: tr("Collega parole dal tuo Sanctum fino a toccare il Passo Arcano (riga dorata) per poter invadere, oppure lancia Fuoco/Gelo/Acqua dal tuo Sanctum.") };
  const net = G.network(s.words, me);
  const hasMidLink = Object.keys(net).some(id => s.words[id].cells.some(k => G.zoneOf(G.parse(k)[0]) === "M"));
  if (hasMidLink) return { tone: "gold", ico: "🌉", title: tr("Quasi al Passo Arcano!"), text: tr("Agganciati alla tua rete al centro e tocca la riga dorata per attivare il Ponte. Solo dopo potrai attaccare nel Sanctum nemico!") };
  return { tone: "gold", ico: "🌉", title: tr("Costruisci il Ponte verso il centro"), text: tr("Per attaccare devi prima arrivare al Passo Arcano (riga dorata): incrocia la tua parola nella Terra di Mezzo per allungare il Ponte.") };
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
    const cls = ["htile", G.VAL[l] >= 3 ? "rune" : "", ui.sel === i ? "sel" : "", ui.alch && ui.alch.includes(i) ? "alch" : "", ui.trasf && ui.trasf.i === i ? "alch" : "", ui.trasf && ui.trasf.i !== i && pesante(l) ? "pesa" : "", used ? "ghost" : ""].filter(Boolean).join(" ");
    return h("button", { class: cls, disabled: used || !myTurn(), "aria-pressed": ui.sel === i, "aria-label": tr("Lettera {l}, valore {n}", { l, n: G.VAL[l] }), onclick: () => onHand(i) }, l, h("span", { class: "v", text: G.VAL[l] }));
  })) : null;

  // pulsanti
  const actions = [];
  const turn = myTurn() && !ui.busy;
  const curVal = turn && ui.pending.length && dictState === "pronto" ? G.validate(s, me, placed(), opts()) : null;
  const readyAtk = !!(turn && ui.pending.length && s.cfg && s.cfg.attaccoLibero && ui.mode !== "attacca" && curVal && curVal.ok && curVal.type === "neutra" && curVal.launches.length);
  if (turn && ui.launch) actions.push(h("button", { class: "btn", onclick: () => { ui.launch = null; render(); }, text: tr("Annulla lancio") }));
  else if (turn && ui.trasf) {
    actions.push(h("button", { class: "btn", onclick: () => { ui.trasf = null; render(); }, text: tr("Annulla") }));
    if (ui.trasf.i !== null) {
      const da = hand[ui.trasf.i];
      for (const x of mete(da)) actions.push(h("button", { class: "btn small meta" + (ui.trasf.a === x ? " on" : ""), "aria-pressed": ui.trasf.a === x, "aria-label": tr("Lettera {l}, valore {n}", { l: x, n: G.VAL[x] }), onclick: () => { ui.trasf.a = x; render(); }, text: x }));
      actions.push(h("button", { class: "btn primary", disabled: !ui.trasf.a, onclick: doTrasforma, text: ui.trasf.a ? tr("Trasforma {a} in {b}", { a: da, b: ui.trasf.a }) : tr("Trasforma") }));
    }
  } else if (turn && ui.alch) {
    actions.push(h("button", { class: "btn", onclick: () => { ui.alch = null; render(); }, text: tr("Annulla") }));
    actions.push(h("button", { class: "btn small", onclick: () => { ui.alch = hand.map((_, i) => i); render(); }, text: tr("Tutte") }));
    actions.push(h("button", { class: "btn primary", disabled: !ui.alch.length, onclick: doAlchimia, text: tr("Cambia {n} lettere", { n: ui.alch.length }) }));
  } else if (turn && ui.place && !ui.pending.length) {
    actions.push(h("button", { class: "btn", onclick: cancelPlace, text: tr("Annulla") }));
    actions.push(h("button", { class: "btn", onclick: rotatePlace, text: tr("↻ Gira ({d})", { d: tr(ui.place.dir === "h" ? tr("ora orizzontale") : tr("ora verticale")) }) }));
  } else if (turn && ui.pending.length) {
    const pv = previewLine();
    actions.push(h("button", { class: "btn", onclick: () => { ui.pending = []; ui.mode = null; ui.place = null; hideToast(); render(); }, text: tr("Ritira") }));
    if (ui.place) actions.push(h("button", { class: "btn", "aria-label": tr("Gira la parola"), onclick: rotatePlace, text: tr("↻ Gira") }));
    if (s.cfg && s.cfg.attaccoLibero) actions.push(h("button", { class: "btn" + (ui.mode === "attacca" ? " on" : readyAtk ? " ready-atk" : ""), "aria-pressed": ui.mode === "attacca", onclick: () => { ui.mode = ui.mode === "attacca" ? null : "attacca"; render(); }, text: tr("Attacca") }));
    actions.push(h("button", { class: "btn" + (ui.mode === "falo" ? " on" : ""), "aria-pressed": ui.mode === "falo", onclick: () => { ui.mode = ui.mode === "falo" ? null : "falo"; render(); }, text: tr("Falò") }));
    if (s.cfg && s.cfg.consacrazione) actions.push(h("button", { class: "btn" + (ui.mode === "consacra" ? " on cons" : ""), "aria-pressed": ui.mode === "consacra", onclick: () => { ui.mode = ui.mode === "consacra" ? null : "consacra"; render(); }, text: tr("Consacra") }));
    actions.push(h("button", { class: "btn primary", disabled: !pv || pv.err, onclick: onConfirm, text: tr("Conferma") }));
  } else if (turn) {
    actions.push(h("button", { class: "btn small", onclick: () => { const o = hand.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } ui.order = o; ui.sel = null; render(); }, text: tr("Mescola") }));
    actions.push(h("button", { class: "btn small", onclick: () => { ui.alch = []; ui.sel = null; render(); }, text: tr("Alchimia") }));
    if (s.cfg && s.cfg.trasformazione) {
      const pes = hand.map((l, i) => pesante(l) ? i : -1).filter(i => i >= 0);
      actions.push(h("button", { class: "btn small", disabled: !pes.length, title: pes.length ? "" : tr("Nessuna lettera pesante nel Grimorio (da {n} punti in su).", { n: trasfMin() }), onclick: () => { ui.trasf = { i: pes.length === 1 ? pes[0] : null, a: null }; ui.sel = null; render(); }, text: tr("Trasforma") }));
    }
    const costo = (s.cfg && s.cfg.costoSuggerimento) || 3;
    actions.push(ui.hintConfirm
      ? h("button", { class: "btn small danger", onclick: () => { ui.hintConfirm = false; askHint(); }, text: tr("Sì, suggerisci (−{n} PV)", { n: costo }) })
      : h("button", { class: "btn small", disabled: hintBusy || s.hp[mySeat()] <= costo, title: tr("Il computer ti propone la mossa migliore: costa {n} PV", { n: costo }), onclick: () => { ui.hintConfirm = true; render(); clearTimeout(confirmTimer); confirmTimer = setTimeout(() => { ui.hintConfirm = false; render(); }, 4000); }, text: tr(hintBusy ? tr("Ci penso…") : tr("Suggerisci")) }));
    actions.push(ui.passConfirm
      ? h("button", { class: "btn small danger", onclick: doPass, text: tr("Sì, passa il turno") })
      : h("button", { class: "btn small", onclick: () => { ui.passConfirm = true; render(); clearTimeout(confirmTimer); confirmTimer = setTimeout(() => { ui.passConfirm = false; render(); }, 4000); }, text: tr("Passa") }));
  }
  const pv = previewLine();
  const guide = guideHint(s, me, curVal);
  const bwCls = "boardwrap" + (anim && anim.kind === "attacco" && anim.phase === "impact" && anim.damage > 0 ? (anim.target === top ? " impact-top" : " impact-bottom") : "");
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
      soundBtn(),
      h("button", { class: "btn small", onclick: showRules, text: tr("Regole") })),
    pbar(s, top),
    h("div", { class: bwCls }, boardEl(s), atkBannerEl(s)),
    h("div", { class: "legend" },
      h("span", { style: "--c:var(--z" + top + ");--b:var(--" + (top === "A" ? "blu" : "rosso") + ")", text: tr("▲ Sanctum {c}", { c: tr(top === "A" ? tr("Blu") : tr("Rosso")) }) + (me === top && !both ? tr(" (tuo)") : "") }),
      h("span", { style: "--c:var(--zS);--b:var(--oro)", text: tr("Passo Arcano · → ↓ ↑ verso di lettura") }),
      h("span", { style: "--c:var(--z" + G.enemy(top) + ");--b:var(--" + (top === "A" ? "rosso" : "blu") + ")", text: tr("▼ Sanctum {c}", { c: tr(top === "A" ? tr("Rosso") : tr("Blu")) }) + (me === G.enemy(top) && !both ? tr(" (tuo)") : "") })),
    pbar(s, G.enemy(top)),
    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null, me && clockText(s, myTurn()) ? h("small", { id: "orologio", text: clockText(s, myTurn()) }) : null),
    s.winner ? h("p", { class: "winner", text: "✦ " + seatName(s, s.winner) + " ✦" }) : null,
    seatBtns.length ? h("div", { class: "actions" }, seatBtns) : null,
    pv ? h("p", { class: "preview" + (pv.err ? " err" : "") }, pv.text, pv.tipo ? h("span", { class: "tipo", text: " · " + pv.tipo }) : null) : (me && myTurn() ? h("p", { class: "preview" }, h("span", { class: "tipo", text: tr(ui.sel !== null ? tr("Ora tocca una casella del campo") : tr("Tocca una lettera, poi una casella")) })) : null),
    handEl,
    actions.length ? h("div", { class: "actions" }, actions) : null,
    guide ? h("div", { class: "guide " + guide.tone, role: "note" },
      h("span", { class: "g-ico", "aria-hidden": "true", text: guide.ico }),
      h("div", { class: "g-body" }, h("strong", { class: "g-title", text: guide.title }), h("span", { class: "g-text", text: guide.text }))) : null,
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
document.getElementById("toast").addEventListener("click", hideToast);
document.getElementById("sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
function isTypingTarget(el) {
  return !!(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
}
function onBoardKeyDown(e) {
  if (e.key === "Escape" && !document.getElementById("sheet").hidden) { closeSheet(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!document.getElementById("sheet").hidden) return;
  if (isTypingTarget(document.activeElement) || isTypingTarget(e.target)) return;
  if (!cur || !S() || !myTurn() || ui.busy || drag) return;
  if (e.key === "Escape") {
    if (ui.launch) { e.preventDefault(); ui.launch = null; render(); return; }
    if (ui.alch) { e.preventDefault(); ui.alch = null; render(); return; }
    if (ui.trasf) { e.preventDefault(); ui.trasf = null; render(); return; }
    if (ui.pending.length || ui.place) { e.preventDefault(); ui.pending = []; ui.mode = null; ui.place = null; ui.sel = null; hideToast(); render(); return; }
    if (ui.sel !== null || kbCell !== null) { e.preventDefault(); ui.sel = null; kbCell = null; render(); }
    return;
  }
  if (ui.alch || ui.trasf || ui.launch) return;
  if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    const rowStep = topSeat() === "A" ? 1 : -1;
    const [dr, dc] = e.key === "ArrowUp" ? [-rowStep, 0] : e.key === "ArrowDown" ? [rowStep, 0] : e.key === "ArrowLeft" ? [0, -1] : [0, 1];
    const base = kbCell || hoverCell || (ui.pending.length ? G.key(ui.pending[ui.pending.length - 1].r, ui.pending[ui.pending.length - 1].c) : null);
    if (base) {
      const [r, c] = G.parse(base);
      kbCell = G.key(Math.max(0, Math.min(G.ROWS - 1, r + dr)), Math.max(0, Math.min(G.COLS - 1, c + dc)));
    } else {
      const me = mySeat(), r0 = me === "A" ? 1 : G.ROWS - 2;
      kbCell = G.key(r0, Math.floor(G.COLS / 2));
    }
    render(); return;
  }
  const targetCell = kbCell || hoverCell;
  if (e.key === "Backspace" || e.key === "Delete") {
    const pi = targetCell ? ui.pending.findIndex(p => G.key(p.r, p.c) === targetCell) : -1;
    if (pi >= 0) { e.preventDefault(); ui.place = null; ui.pending.splice(pi, 1); ui.sel = null; render(); return; }
    if (e.key === "Backspace" && ui.pending.length) { e.preventDefault(); ui.place = null; ui.pending.pop(); ui.sel = null; render(); }
    return;
  }
  if (!targetCell || !e.key || e.key.length !== 1) return;
  const l = e.key.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "");
  if (l.length !== 1) return;
  const s = S(), me = mySeat();
  if (s.tiles[targetCell]) return;
  const pi = ui.pending.findIndex(p => G.key(p.r, p.c) === targetCell);
  if (pi >= 0 && ui.pending[pi].l === l) { e.preventDefault(); return; }
  const used = new Set(ui.pending.map((p, idx) => idx === pi ? -1 : p.hi));
  const hand = s.hands[me], hi = hand.findIndex((ch, i) => ch === l && !used.has(i));
  if (hi < 0) { e.preventDefault(); toast(tr("Non hai una {l} libera nel Grimorio.", { l }), true); return; }
  e.preventDefault();
  const [r, c] = G.parse(targetCell);
  ui.place = null; ui.sel = null;
  if (pi >= 0) ui.pending[pi] = { r, c, l, hi };
  else ui.pending.push({ r, c, l, hi });
  render();
}
document.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse") return;
  const cell = e.target && e.target.closest ? e.target.closest(".board .cell") : null;
  const k = cell ? cell.dataset.k : null;
  hoverCell = k;
  if (kbCell && k && k !== kbCell) { kbCell = null; render(); }
}, { passive: true });
document.addEventListener("pointerleave", () => { hoverCell = null; });
window.addEventListener("blur", () => { hoverCell = null; });
window.addEventListener("keydown", onBoardKeyDown);
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
