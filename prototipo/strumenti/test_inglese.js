// Prove della lingua della partita e dei messaggi bilingue.
// uso: node test_inglese.js <cartella con engine.js, parole.txt e words-en.txt>
const fs = require("fs");
const dir = process.argv[2];
const G = require(dir + "/engine.js");
const leggi = f => new Set(fs.readFileSync(dir + "/" + f, "utf8").replace(/\r/g, "").split("\n"));
G.setDict(leggi("parole.txt"), "it");
G.setDict(leggi("words-en.txt"), "en");
let ko = 0;
const ok = (cond, msg) => { console.log((cond ? "ok   " : "NO   ") + msg); if (!cond) ko++; };
let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// parola orizzontale nella riga di casa del Blu (riga 1), colonna 2
function prova(s, parola) {
  const t = JSON.parse(JSON.stringify(s));
  t.hands.A = parola.split("");
  const placed = parola.split("").map((l, i) => ({ r: 1, c: 2 + i, l }));
  return G.validate(t, "A", placed, {});
}

G.applyCfg(G.PRESETS.s1en);
const en = G.newGame(rng);
ok(en.cfg.lingua === "en", "la partita inglese salva lingua = en");
ok(en.bag.length + 14 === 90, "la Sacca inglese ha 90 tessere");
ok(Object.keys(G.BAG).length === 26, "la Sacca inglese ha 26 lettere");
ok(en.bag.concat(en.hands.A, en.hands.B).some(l => "JKWXY".includes(l)), "nella Sacca inglese ci sono J K W X Y");
ok(prova(en, "HELLO").ok, "in inglese HELLO è valida");
ok(!prova(en, "GATTO").ok, "in inglese GATTO non è valida");
ok(G.VAL.Q === 10 && G.VAL.K === 5, "valori inglesi attivi (Q 10, K 5)");

G.applyCfg(G.PRESETS.s1);
const it = G.newGame(rng);
ok(it.cfg.lingua === "it", "la partita italiana salva lingua = it");
ok(Object.keys(G.BAG).length === 21 && !("K" in G.VAL), "di nuovo la Sacca italiana a 21 lettere");
ok(prova(it, "GATTO").ok, "in italiano GATTO è valida");
ok(!prova(it, "HELLO").ok, "in italiano HELLO non è valida");

// partita salvata prima delle lingue: cfg senza lingua -> italiano
const vecchia = JSON.parse(JSON.stringify(it)); delete vecchia.cfg.lingua;
G.applyCfg(G.PRESETS.s1en); G.applyCfg(vecchia.cfg);
ok(G.CFG.lingua === "it" && prova(vecchia, "GATTO").ok, "una partita senza lingua resta italiana");

// alternanza: il motore segue la partita a cui si applica la cfg
G.applyCfg(en.cfg); const a1 = prova(en, "HELLO").ok;
G.applyCfg(it.cfg); const a2 = prova(it, "GATTO").ok;
G.applyCfg(en.cfg); const a3 = !prova(en, "GATTO").ok;
ok(a1 && a2 && a3, "alternando partite it/en il dizionario segue la partita");

// messaggi
G.setLinguaUI("it");
G.applyCfg(en.cfg);
ok(prova(en, "QZXJ").err === "QZXJ non è nel dizionario.", "errore in italiano con interfaccia IT");
G.setLinguaUI("en");
ok(prova(en, "QZXJ").err === "QZXJ is not in the dictionary.", "errore in inglese con interfaccia EN");
const r = G.pass(en, "A", rng);
const voce = r.state.log[r.state.log.length - 1];
ok(typeof voce === "object" && voce.k === "passa" && voce.a.p === "A", "la cronaca salva voci strutturate");
ok(G.testoLog(voce) === "Blue Wizard passes.", "cronaca in inglese");
ok(G.testoLog(voce, { A: "Fabio" }, "it") === "Fabio passa il turno.", "cronaca in italiano con il nome del giocatore");
ok(G.testoLog("Mago Blu scrive CASA.") === "Mago Blu scrive CASA.", "le voci vecchie (stringhe) restano com'erano");
const chiavi = Object.keys(G.MSG.it).filter(k => !(k in G.MSG.en));
ok(!chiavi.length, "tutti i messaggi hanno la traduzione inglese" + (chiavi.length ? ": mancano " + chiavi.join(", ") : ""));
G.setLinguaUI("it");

console.log(ko ? ko + " prove fallite" : "tutte le prove passate");
process.exit(ko ? 1 : 0);
