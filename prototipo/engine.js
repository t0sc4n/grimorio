/* Grimorio — motore di gioco (logica pura, nessun DOM).
   Righe interne 0-8: 0-2 Sanctum A (0 = bordo esterno di A), 3-5 Terra di Mezzo (4 = Passo Arcano), 6-8 Sanctum B. */
(function (root) {
  "use strict";
  var COLS = 11, ROWS = 9, STAFFA = 4, MID0 = 3, MID1 = 5; // MID0..MID1 = righe della Terra di Mezzo
  /* Lingua della partita (cfg.lingua): ognuna ha il suo dizionario, i valori delle lettere (VAL) e la Sacca (BAG, 90 tessere).
     La Sacca inglese è ricavata dalle frequenze del dizionario ENABLE (strumenti/sacca_inglese.js) e ritoccata a mano. */
  var LINGUE = {
    it: { VAL: { A: 1, E: 1, I: 1, O: 1, C: 2, R: 2, S: 2, T: 2, U: 3, L: 3, M: 3, N: 3, P: 4, D: 4, F: 4, G: 4, B: 4, V: 4, H: 8, Q: 10, Z: 10 },
          BAG: { A: 12, E: 10, I: 8, O: 8, C: 3, R: 3, S: 2, T: 2, U: 5, L: 4, M: 4, N: 4, P: 4, D: 3, F: 3, G: 3, B: 2, V: 3, H: 3, Q: 2, Z: 2 } },
    en: { VAL: { E: 1, A: 1, I: 1, O: 1, S: 2, R: 2, T: 2, N: 2, L: 3, D: 3, U: 3, C: 3, M: 3, P: 4, G: 4, H: 4, B: 4, Y: 4, F: 4, W: 4, K: 5, V: 5, X: 8, Z: 8, J: 8, Q: 10 },
          BAG: { E: 11, A: 8, I: 7, O: 7, U: 3, S: 4, R: 6, T: 6, N: 6, L: 4, D: 4, C: 2, P: 2, G: 2, M: 2, H: 2, B: 2, Y: 2, F: 2, W: 2, K: 1, V: 1, Z: 1, X: 1, J: 1, Q: 1 } }
  };
  var VAL = {}, BAG = {};  // della lingua attiva: applyCfg ne cambia il contenuto (gli oggetti esportati restano gli stessi)
  var MULT = {};
  /* Opzioni di regola (salvate in ogni partita):
     mid: righe della Terra di Mezzo, hp: Punti Vita, decay: consumo attacchi per turno,
     radici: false | "designer" | "lunghe", attacchi: "ovunque" | "sanctum" (dal centro nessun attacco diretto),
     difesaLarga: colonne protette ai lati di ogni lettera difensiva, faloOgni: turni tra due Falò (0 = sempre) */
  /* v4: consumoNeutre: Stabilità persa a turno dalle parole neutre, ponteCentro: la parola sul Passo Arcano deve stare tutta al centro,
     tempestaLocale: la Tempesta colpisce solo le parole vicine a quella distrutta, tettoDanno: danno massimo di un attacco (frazione dei PV, 0 = nessuno) */
  var CFG = { mid: 3, hp: 20, hand: 7, decay: 1, radici: false, attacchi: "ovunque", difesaLarga: 0, faloOgni: 0,
    consumoNeutre: 0, ponteCentro: false, tempestaLocale: false, tettoDanno: 0,
    consacrazione: 0, bloccoInvasione: false, consacrataConsuma: false, maxConsacrate: 0, letturaDalLato: false,
    attaccoLibero: false, attaccoConsuma: false, lingua: "it", dizionari: ["it"] };
  /* s1: attaccoLibero: niente lessico, qualsiasi parola può essere lanciata se il giocatore lo sceglie (opts.attacca);
     attaccoConsuma: la parola lanciata sparisce subito dopo l'attacco (restano le lettere che reggono altre parole). */
  /* letturaDalLato: ognuno vede il proprio Sanctum in basso; le parole verticali si leggono dall'alto in basso
     dal lato di chi le scrive (per il Blu, che ha il campo girato, dalla riga più alta alla più bassa). */
  /* v5: consacrazione: una parola neutra tutta nel proprio Sanctum può diventare difesa con resistenza = punteggio x valore (0 = no),
     bloccoInvasione: nel Sanctum nemico non si lancia da colonne protette da una difesa nemica (colonna della lettera ±difesaLarga) */
  var PRESETS = {
    v2: { mid: 3, hp: 20, hand: 7, decay: 1, radici: false, attacchi: "ovunque", difesaLarga: 0, faloOgni: 0, consumoNeutre: 0, ponteCentro: false, tempestaLocale: false, tettoDanno: 0 },
    v3: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 0, ponteCentro: false, tempestaLocale: false, tettoDanno: 0 },
    v4a: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0.5 },
    v4b: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0 },
    v4: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0, bloccoInvasione: false },
    v5a: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false },
    v5b: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0, bloccoInvasione: true },
    v5d: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true },
    v5e: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2 },
    v5f: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true },
    s1a: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    s1n: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    s1n50: { mid: 5, hp: 50, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    s1n80: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    s1s: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: true },
    s1sp: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 1, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: true },
    s1sp60: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 1, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: true },
    s1sp60w2: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 2, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 1, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: true },
    s1rp: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 1, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga" },
    s1r2: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga" },
    s1r2m1: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 1, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga" },
    s1r2h60: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga" },
    // s1 adottata il 24/11/2026: lancio solo dal Sanctum nemico, parola lanciata consumata, Scudo di riga, consacrazione x2 (max 2), 60 PV
    s1: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga" },
    // s1 in inglese: stesse regole, dizionario ENABLE e Sacca inglese
    s1en: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga", lingua: "en" },
    // s1 con i dizionari italiano e inglese insieme (Sacca mista)
    s1iten: { mid: 5, hp: 60, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 2, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga", dizionari: ["it", "en"] },
    s1r: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, scudo: "riga" },
    s1b: { mid: 5, hp: 80, hand: 7, decay: 1, radici: "lunghe", attacchi: "nemico", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: true, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    s1d: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true, passo: 2 },
    s1p: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 1, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    v5c: { mid: 5, hp: 40, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: true }
  };
  var api;
  function applyCfg(c) {
    c = c || {};
    Object.keys(c).forEach(function (k) { CFG[k] = c[k]; });
    // regole aggiunte dopo: le partite salvate prima non le hanno, quindi valgono spente
    ["attaccoLibero", "attaccoConsuma", "passo", "scudo"].forEach(function (k) { if (!(k in c)) CFG[k] = false; });
    // dizionari della partita: cfg.dizionari (uno o più), altrimenti cfg.lingua; le partite di prima sono in italiano
    CFG.dizionari = dizionariDi(c);
    CFG.lingua = CFG.dizionari.join("+");   // "it", "en", "it+en"…: con più dizionari il lessico elementale non vale
    var L = sacca(CFG.dizionari);
    [[VAL, L.VAL], [BAG, L.BAG]].forEach(function (x) { Object.keys(x[0]).forEach(function (k) { delete x[0][k]; }); Object.assign(x[0], x[1]); });
    aggiornaDict();
    ROWS = 6 + CFG.mid; MID0 = 3; MID1 = 2 + CFG.mid; STAFFA = 3 + Math.floor(CFG.mid / 2);
    MULT = {};
    [MID0, MID1].forEach(function (r) { MULT[r + ",2"] = "LD"; MULT[r + ",8"] = "LD"; MULT[r + ",5"] = "PD"; });
    MULT[STAFFA + ",0"] = "LD"; MULT[STAFFA + "," + (COLS - 1)] = "LD";
    if (api) { api.ROWS = ROWS; api.STAFFA = STAFFA; api.MULT = MULT; api.MID0 = MID0; api.MID1 = MID1; }
  }

  var LESSICO = {
    fuoco: "FUOCO FIAMMA BRACE ROGO LAVA VAMPA SOLE IRA ARDORE CENERE FORNO MAGMA FIACCOLA INCENDIO FALO",
    gelo: "GELO GHIACCIO NEVE BRINA FREDDO INVERNO NORD GRANDINE BUFERA TORMENTA VALANGA POLO",
    acqua: "ACQUA ONDA MARE LAGO FIUME PIOGGIA MAREA TORRENTE CASCATA NEBBIA DILUVIO RUGIADA FONTE OCEANO",
    difesa: "MUR SCUD MURO MURA SCUDO TERRA ALBERO ROCCIA PIETRA MONTE ARGINE BASTIONE TORRE ROCCA CORAZZA ELMO BARRIERA DIGA QUERCIA ZOLLA ARGILLA BOSCO RADICE"
  };
  var CLASS = {};   // parola -> {type, el}
  var DICTS = {};    // lingua -> insieme di parole valide (con .has)
  var DICT = null;  // quello della lingua attiva

  function forms(w) {
    var out = [w], e2 = w.slice(-2), base = w.slice(0, -1), b2 = w.slice(0, -2);
    if (e2 === "CO") out.push(b2 + "CHI");
    if (e2 === "GO") out.push(b2 + "GHI");
    if (e2 === "CA") out.push(b2 + "CHE");
    if (e2 === "GA") out.push(b2 + "GHE");
    if (e2 === "IA") out.push(b2 + "IE");
    var last = w.slice(-1);
    if (last === "O" || last === "E") out.push(base + "I");
    if (last === "A") out.push(base + "E");
    return out;
  }
  function buildClass() {
    CLASS = {};
    Object.keys(LESSICO).forEach(function (el) {
      LESSICO[el].split(" ").forEach(function (w) {
        forms(w).forEach(function (f, i) {
          if (i > 0 && !(DICTS.it && DICTS.it.has(f))) return; // le forme flesse solo se esistono nel dizionario
          if (!CLASS[f]) CLASS[f] = el === "difesa" ? { type: "difesa", el: "terra" } : { type: "attacco", el: el };
        });
      });
    });
  }
  function setDict(set, lingua) {
    lingua = lingua || "it"; DICTS[lingua] = set;
    aggiornaDict();
    if (lingua === "it") buildClass();
  }
  // elenco valido e ordinato dei dizionari di una cfg (ordine di LINGUE)
  function dizionariDi(c) {
    var l = c && Array.isArray(c.dizionari) ? c.dizionari : [c && c.lingua];
    l = Object.keys(LINGUE).filter(function (k) { return l.indexOf(k) >= 0; });
    return l.length ? l : ["it"];
  }
  // con più dizionari una parola è valida se è in almeno uno
  function aggiornaDict() {
    var l = CFG.dizionari || ["it"];
    if (l.length === 1) { DICT = DICTS[l[0]] || null; return; }
    DICT = { has: function (w) { for (var i = 0; i < l.length; i++) if (DICTS[l[i]] && DICTS[l[i]].has(w)) return true; return false; } };
  }
  /* Sacca di una o più lingue. Con più lingue è mista: la quantità di ogni lettera è la media delle quote nelle Sacche
     delle lingue scelte (riportata a 90 tessere, almeno 1 per lettera), il valore è la media dei valori dove la lettera c'è. */
  var SACCHE = {};
  function sacca(l) {
    if (l.length === 1) return LINGUE[l[0]];
    var k = l.join("+");
    if (SACCHE[k]) return SACCHE[k];
    var lett = {}, quota = {}, val = {}, tot = 90;
    l.forEach(function (x) {
      var B = LINGUE[x].BAG, n = 0, ch;
      for (ch in B) n += B[ch];
      for (ch in B) { lett[ch] = 1; quota[ch] = (quota[ch] || 0) + B[ch] / n / l.length; }
    });
    var tutte = Object.keys(lett).sort();
    tutte.forEach(function (ch) {
      var vs = l.filter(function (x) { return LINGUE[x].VAL[ch]; }).map(function (x) { return LINGUE[x].VAL[ch]; });
      val[ch] = Math.round(vs.reduce(function (a, b) { return a + b; }, 0) / vs.length);
    });
    // quantità: almeno 1, poi le tessere che restano ai resti più grandi
    var bag = {}, usate = 0;
    tutte.forEach(function (ch) { bag[ch] = Math.max(1, Math.floor(quota[ch] * tot)); usate += bag[ch]; });
    var resti = tutte.slice().sort(function (a, b) { return (quota[b] * tot - bag[b]) - (quota[a] * tot - bag[a]) || (a < b ? -1 : 1); });
    for (var i = 0; usate < tot; i = (i + 1) % resti.length) { bag[resti[i]]++; usate++; }
    while (usate > tot) { var big = tutte.filter(function (ch) { return bag[ch] > 1; }).sort(function (a, b) { return (bag[b] - quota[b] * tot) - (bag[a] - quota[a] * tot); })[0]; bag[big]--; usate--; }
    return (SACCHE[k] = { VAL: val, BAG: bag });
  }
  // unisce dizionari (testi ordinati, una parola per riga) in un unico testo ordinato e senza doppioni
  function unisciTesti(testi) {
    if (testi.length === 1) return testi[0];
    var liste = testi.map(function (t) { return t.split("\n"); }), pos = liste.map(function () { return 0; }), out = [], ultimo = null;
    for (;;) {
      var min = null, j = -1;
      for (var i = 0; i < liste.length; i++) if (pos[i] < liste[i].length && (min === null || liste[i][pos[i]] < min)) { min = liste[i][pos[i]]; j = i; }
      if (j < 0) break;
      pos[j]++;
      if (min !== ultimo && min) { out.push(min); ultimo = min; }
    }
    return out.join("\n");
  }
  // radici del designer (regolamento v1): con CFG.radici una parola che le contiene diventa elementale
  var RADICI = {
    fuoco: ["IRA", "SOL", "FOC", "VAMP"],
    gelo: ["GEL", "NIV", "NORD", "PIST"],
    acqua: ["HO", "PO", "LAGO", "ACQUA", "AQUA"],
    difesa: ["GEO", "EST", "SUD", "FUM", "ZOO"]
  };
  var RADICI_LUNGHE = {
    fuoco: ["FUOC", "FIAMM", "INCEND", "BRUCI", "VAMP", "ROVENT", "CENER", "MAGM", "FIACCOL", "ARDOR"],
    gelo: ["GHIACC", "GELID", "GELAT", "NEVIC", "NEVOS", "BRIN", "FREDD", "INVERN", "GRANDIN", "VALANG", "BUFER"],
    acqua: ["ACQU", "PIOGG", "PIOV", "FIUM", "TORRENT", "CASCAT", "NEBBI", "DILUV", "RUGIAD", "OCEAN", "ONDAT", "ONDOS", "LAGUN"],
    difesa: ["MURA", "SCUD", "ROCCI", "PIETR", "MONTAGN", "ARGIN", "BASTION", "TORRI", "TORRE", "CORAZZ", "BARRIER", "QUERC", "ARGILL", "RADIC", "ALBER", "FORTEZZ", "BALUARD", "CASTELL"]
  };
  // il lessico elementale (CLASS, radici) esiste solo in italiano
  function isWord(w) { return (CFG.lingua === "it" && !!CLASS[w]) || !!(DICT && DICT.has(w)); }
  function classify(w) {
    if (CFG.lingua !== "it") return { type: "neutra", el: null };
    if (CLASS[w]) return CLASS[w];
    if (CFG.radici) {
      var RR = CFG.radici === "lunghe" ? RADICI_LUNGHE : RADICI;
      for (var el in RR) for (var i = 0; i < RR[el].length; i++)
        if (w.indexOf(RR[el][i]) >= 0) return el === "difesa" ? { type: "difesa", el: "terra" } : { type: "attacco", el: el };
    }
    return { type: "neutra", el: null };
  }

  function key(r, c) { return r + "," + c; }
  function parse(k) { var p = k.split(","); return [+p[0], +p[1]]; }
  function zoneOf(r) { return r < MID0 ? "A" : r > MID1 ? "B" : "M"; }
  function enemy(p) { return p === "A" ? "B" : "A"; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function shuffle(a, rng) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function newGame(rng) {
    rng = rng || Math.random;
    var bag = [];
    Object.keys(BAG).forEach(function (l) { for (var i = 0; i < BAG[l]; i++) bag.push(l); });
    shuffle(bag, rng);
    var s = {
      v: 1, cfg: clone(CFG), turn: "A", moveNo: 0, first: { A: true, B: true }, turns: { A: 0, B: 0 }, lastFalo: { A: -99, B: -99 },
      hp: { A: CFG.hp, B: CFG.hp }, hands: { A: [], B: [] }, bag: bag, focolare: [],
      tiles: {}, words: {}, nextId: 1, log: [], last: null, winner: null,
      seats: { A: null, B: null }
    };
    draw(s, "A", rng); draw(s, "B", rng);
    return s;
  }

  function draw(s, p, rng) {
    while (s.hands[p].length < CFG.hand) {
      if (!s.bag.length) {
        if (!s.focolare.length) break;
        s.bag = shuffle(s.focolare, rng); s.focolare = [];
        addLog(s, "saccaVuota");
      }
      s.hands[p].push(s.bag.pop());
    }
  }

  function addLog(s, k, a) { s.log.push(a ? { k: k, a: a } : { k: k }); if (s.log.length > 40) s.log = s.log.slice(-40); }
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


  // indice casella -> id parole che la usano
  function cellIndex(words) {
    var idx = {};
    Object.keys(words).forEach(function (id) {
      words[id].cells.forEach(function (k) { (idx[k] = idx[k] || []).push(id); });
    });
    return idx;
  }
  function touches(a, b) {
    var set = {}; b.cells.forEach(function (k) { set[k] = 1; });
    for (var i = 0; i < a.cells.length; i++) {
      var rc = parse(a.cells[i]), r = rc[0], c = rc[1];
      if (set[a.cells[i]] || set[key(r + 1, c)] || set[key(r - 1, c)] || set[key(r, c + 1)] || set[key(r, c - 1)]) return true;
    }
    return false;
  }
  function inZone(w, z) { return w.cells.some(function (k) { return zoneOf(parse(k)[0]) === z; }); }
  function onStaffa(w) {
    if (!w.cells.some(function (k) { return parse(k)[0] === STAFFA; })) return false;
    return !CFG.ponteCentro || w.cells.every(function (k) { return zoneOf(parse(k)[0]) === "M"; });
  }

  // parole raggiungibili dal Sanctum di p, attraverso parole che si toccano
  function network(words, p) {
    var ids = Object.keys(words), seen = {}, queue = [];
    ids.forEach(function (id) { var w = words[id]; if (w.o === p && inZone(w, p)) { seen[id] = 1; queue.push(id); } });
    while (queue.length) {
      var cur = words[queue.shift()];
      ids.forEach(function (id) { if (!seen[id] && touches(cur, words[id])) { seen[id] = 1; queue.push(id); } });
    }
    return seen;
  }
  function bridgeActive(s, p) {
    var net = network(s.words, p);
    return Object.keys(net).some(function (id) { return onStaffa(s.words[id]); });
  }

  function lineAt(get, r, c, dr, dc) {
    while (get(r - dr, c - dc)) { r -= dr; c -= dc; }
    var cells = [], text = "";
    while (get(r, c)) { cells.push(key(r, c)); text += get(r, c); r += dr; c += dc; }
    return { cells: cells, text: text };
  }

  /* Verifica una posa. placed = [{r,c,l}], opts = {falo:bool}.
     Ritorna {ok:false, err} oppure {ok:true, main, type, el, score, base, falo, targets}. */
  function validate(s, p, placed, opts) {
    opts = opts || {};
    if (!placed.length) return E("posaLettera");
    var hand = s.hands[p].slice();
    for (var i = 0; i < placed.length; i++) {
      var t = placed[i];
      if (t.r < 0 || t.r >= ROWS || t.c < 0 || t.c >= COLS) return E("fuoriCampo");
      if (s.tiles[key(t.r, t.c)]) return E("occupata");
      var hi = hand.indexOf(t.l); if (hi < 0) return E("noLettera");
      hand.splice(hi, 1);
    }
    var nk = {}; placed.forEach(function (t) { nk[key(t.r, t.c)] = t.l; });
    function get(r, c) { if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null; var k = key(r, c); return nk[k] || (s.tiles[k] && s.tiles[k].l) || null; }

    // per il Blu con letturaDalLato le sequenze verticali si leggono al contrario (dal suo lato del campo)
    function rd(line, vert) {
      if (!(vert && CFG.letturaDalLato && p === "A")) return line;
      return { cells: line.cells.slice().reverse(), text: line.text.split("").reverse().join("") };
    }
    var sameRow = placed.every(function (t) { return t.r === placed[0].r; });
    var sameCol = placed.every(function (t) { return t.c === placed[0].c; });
    if (!sameRow && !sameCol) return E("rigaColonna");
    var dr, dc;
    if (placed.length > 1) { dr = sameCol ? 1 : 0; dc = sameRow ? 1 : 0; }
    else {
      var h = lineAt(get, placed[0].r, placed[0].c, 0, 1), v = lineAt(get, placed[0].r, placed[0].c, 1, 0);
      if (v.cells.length > h.cells.length) { dr = 1; dc = 0; } else { dr = 0; dc = 1; }
    }
    var main = rd(lineAt(get, placed[0].r, placed[0].c, dr, dc), dr === 1);
    for (var j = 0; j < placed.length; j++) if (main.cells.indexOf(key(placed[j].r, placed[j].c)) < 0) return E("continua");
    if (main.cells.length < 2) return E("dueLettere");
    if (!isWord(main.text)) return E("noDiz", { w: main.text });
    for (var x = 0; x < placed.length; x++) {
      var cr = rd(lineAt(get, placed[x].r, placed[x].c, dc, dr), dc === 1);
      if (cr.cells.length >= 2 && !isWord(cr.text)) return E("noDizCroce", { w: cr.text });
    }

    var zones = {}; placed.forEach(function (t) { zones[zoneOf(t.r)] = 1; });
    var e = enemy(p);
    if (s.first[p] && (zones.M || zones[e])) return E("primoTurno");

    var newWord = { id: "_new", o: p, cells: main.cells };
    var hyp = clone(s.words); hyp._new = newWord;
    if (zones.M && !network(hyp, p)._new) return E("ponteMezzo");
    var active = bridgeActive(s, p);
    if (zones[e]) {
      if (!active) return E("serveColl");
      var hooked = Object.keys(s.words).some(function (id) { var w = s.words[id]; return w.o === e && inZone(w, e) && touches(newWord, w); });
      if (!hooked) return E("aggancio");
    }

    var targets = [];
    if (opts.falo) {
      if (CFG.faloOgni && s.turns[p] - s.lastFalo[p] < CFG.faloOgni) return E("faloAttesa", { n: CFG.faloOgni, m: CFG.faloOgni - (s.turns[p] - s.lastFalo[p]) });
      var idx = cellIndex(s.words), tset = {};
      main.cells.forEach(function (k) { (idx[k] || []).forEach(function (id) { tset[id] = 1; }); });
      targets = Object.keys(tset).filter(function (id) { var w = s.words[id]; return inZone(w, "M") || inZone(w, e); });
      if (!targets.length) return E("faloBersaglio");
      if (targets.some(function (id) { return inZone(s.words[id], e); }) && !active) return E("faloColl");
    }

    var base = 0, score = 0, wmul = 1;
    main.cells.forEach(function (k) {
      var l = nk[k] || s.tiles[k].l, val = VAL[l]; base += val;
      var m = nk[k] ? MULT[k] : null;
      if (m === "LD") val *= 2; if (m === "PD") wmul *= 2;
      score += val;
    });
    score *= wmul;
    var cls = CFG.attaccoLibero ? { type: "neutra", el: null } : classify(main.text);
    var launches = main.cells.filter(function (k) { var z = zoneOf(parse(k)[0]); return CFG.attacchi === "nemico" ? z === enemy(p) : (CFG.attacchi !== "sanctum" || z !== "M"); });
    var blocked = false;
    if (CFG.bloccoInvasione) {
      var prot = protectedCols(s, e);
      var before = launches.length;
      launches = launches.filter(function (k) { var rc = parse(k); return zoneOf(rc[0]) !== e || !prot[rc[1]]; });
      blocked = before > 0 && !launches.length;
    }
    var type = opts.falo ? "falo" : cls.type;
    if (type === "attacco" && !launches.length) type = blocked ? "bloccato" : "cataclisma"; // elementale tutta al centro, o bloccata dalle difese
    if (opts.attacca) {
      if (!CFG.attaccoLibero) return E("soloElementali");
      if (opts.falo || opts.consacra) return E("lancioMisto");
      if (!launches.length) return E("lancioSanctum");
      type = "attacco";
    }
    var consacrata = false;
    if (opts.consacra) {
      if (!CFG.consacrazione) return E("noConsacr");
      if (cls.type !== "neutra" || opts.falo) return E("consNeutre");
      if (!main.cells.every(function (k) { return zoneOf(parse(k)[0]) === p; })) return E("consSanctum");
      if (CFG.maxConsacrate) {
        var attive = Object.keys(s.words).filter(function (id) { return s.words[id].o === p && s.words[id].consacrata; }).length;
        if (attive >= CFG.maxConsacrate) return E("consMax", { n: attive, m: CFG.maxConsacrate });
      }
      type = "difesa"; consacrata = true;
    }
    return { ok: true, main: main, type: type, el: cls.el, score: score, base: base, falo: !!opts.falo, targets: targets, launches: launches, consacrata: consacrata };
  }

  // distrugge parole; mode: burn (tutto al Focolare) | return (Rune al proprietario)
  function destroy(s, ids, mode, rep) {
    var cells = {};
    ids.forEach(function (id) {
      var w = s.words[id]; if (!w) return;
      rep.destroyed.push({ id: id, text: w.text, o: w.o, mode: mode, mid: inZone(w, "M"), cells: w.cells.slice(), letters: w.cells.map(function (k) { return s.tiles[k] ? s.tiles[k].l : ""; }).join("") });
      w.cells.forEach(function (k) { cells[k] = 1; });
      delete s.words[id];
    });
    var idx = cellIndex(s.words);
    Object.keys(cells).forEach(function (k) {
      if (idx[k]) return; // la lettera regge ancora un'altra parola
      var t = s.tiles[k]; if (!t) return;
      if (mode !== "burn" && mode !== "consumo" && VAL[t.l] >= 3) s.hands[t.o].push(t.l); else s.focolare.push(t.l);
      delete s.tiles[k];
    });
  }

  // colonne del Sanctum di e protette dalle sue difese
  function protectedCols(s, e) {
    var cols = {};
    Object.keys(s.words).forEach(function (id) {
      var w = s.words[id];
      if (w.type !== "difesa" || w.o !== e) return;
      w.cells.forEach(function (k) {
        var rc = parse(k); if (zoneOf(rc[0]) !== e) return;
        for (var d = -CFG.difesaLarga; d <= CFG.difesaLarga; d++) cols[rc[1] + d] = 1;
      });
    });
    return cols;
  }

  // difese nemiche che intercettano un incantesimo alla riga r, colonna c (larghezza CFG.difesaLarga)
  function defsNear(s, r, c, e, hit) {
    var idx = cellIndex(s.words), out = [];
    for (var dc = -CFG.difesaLarga; dc <= CFG.difesaLarga; dc++) {
      (idx[key(r, c + dc)] || []).forEach(function (id) {
        var w = s.words[id];
        if (w.type === "difesa" && w.o === e && !hit[id] && out.indexOf(w) < 0) out.push(w);
      });
    }
    out.sort(function (x, y) { return y.stab - x.stab; });
    return out;
  }

  // simula il viaggio dell'incantesimo (muta s)
  function cast(s, p, word, launchKey, rep) {
    var rc = parse(launchKey), r = rc[0], c = rc[1], dir = p === "A" ? 1 : -1, power = word.score, e = enemy(p);
    var own = {}; word.cells.forEach(function (k) { own[k] = 1; });
    var hit = {}, path = [];
    // Scudo: prima del viaggio, l'incantesimo lanciato nel Sanctum nemico affronta le difese che coprono la sua colonna
    if (CFG.scudo && zoneOf(r) === e) {
      var shields = [];
      Object.keys(s.words).forEach(function (id) {
        var w = s.words[id];
        if (w.type !== "difesa" || w.o !== e) return;
        // "riga": lo Scudo copre tutta la sua riga, per gli incantesimi lanciati su quella riga o che la attraversano verso il bordo
        if (w.cells.some(function (k) { var q = parse(k); return zoneOf(q[0]) === e && (CFG.scudo === "riga" ? (q[0] - r) * dir >= 0 : Math.abs(q[1] - c) <= CFG.difesaLarga); })) shields.push(w);
      });
      shields.sort(function (x, y) { return y.stab - x.stab; });
      for (var si = 0; si < shields.length && power > 0; si++) {
        var d0 = shields[si]; hit[d0.id] = 1;
        if (power <= d0.stab) {
          d0.stab -= power; power = 0;
          path.push({ k: launchKey, power: 0, kind: "assorbito", def: d0.text, left: d0.stab, scudo: true });
          if (d0.stab <= 0) destroy(s, [d0.id], "return", rep);
        } else {
          power -= d0.stab;
          path.push({ k: launchKey, power: power, kind: "disintegra", def: d0.text, scudo: true });
          destroy(s, [d0.id], "return", rep);
        }
      }
      if (power <= 0) { rep.path = path; rep.launch = launchKey; rep.damage = 0; return; }
    }
    r += dir;
    while (r >= 0 && r < ROWS) {
      var k = key(r, c), t = s.tiles[k];
      var defs = defsNear(s, r, c, e, hit);
      if (defs.length) {
        var d = defs[0]; hit[d.id] = 1;
        if (power <= d.stab) {
          d.stab -= power; power = 0;
          path.push({ k: k, power: 0, kind: "assorbito", def: d.text, left: d.stab });
          if (d.stab <= 0) destroy(s, [d.id], "return", rep);
          break;
        }
        power -= d.stab;
        path.push({ k: k, power: power, kind: "disintegra", def: d.text });
        destroy(s, [d.id], "return", rep);
        r += dir; continue;
      }
      var kind;
      var passo = CFG.passo || 1;
      if (!t) { power -= passo; kind = "vuoto"; }
      else if (own[k]) { power -= passo; kind = "propria"; }
      else { power -= passo + 1; kind = "lettera"; }
      if (power <= 0) { path.push({ k: k, power: 0, kind: "dissolto" }); power = 0; break; }
      path.push({ k: k, power: power, kind: kind });
      r += dir;
    }
    rep.path = path; rep.launch = launchKey;
    rep.damage = power > 0 ? power : 0;
    if (CFG.tettoDanno && rep.damage > Math.ceil(CFG.hp * CFG.tettoDanno)) { rep.capped = rep.damage; rep.damage = Math.ceil(CFG.hp * CFG.tettoDanno); }
    if (rep.damage) s.hp[e] = Math.max(0, s.hp[e] - rep.damage);
  }

  function storm(s, rep, rng) {
    var pool = "";
    rep.destroyed.forEach(function (d) { if (d.mid && d.mode !== "crollo" && d.mode !== "fade" && d.mode !== "consumo") pool += d.letters; });
    if (!pool) return;
    var l = pool[Math.floor(rng() * pool.length)], force = VAL[l];
    rep.storm = { letter: l, force: force, hit: [] };
    var victims = [];
    var src = rep.destroyed.filter(function (d) { return d.mid && d.mode !== "crollo" && d.mode !== "fade" && d.mode !== "consumo"; });
    rep.storm.local = !!CFG.tempestaLocale;
    Object.keys(s.words).forEach(function (id) {
      var w = s.words[id]; if (!inZone(w, "M")) return;
      if (CFG.tempestaLocale && !src.some(function (d) { return touches(w, d); })) return;
      w.stab -= force; rep.storm.hit.push({ text: w.text, left: Math.max(0, w.stab) });
      if (w.stab <= 0) victims.push(id);
    });
    if (victims.length) destroy(s, victims, "crollo", rep);
  }

  function endTurn(s, p, rng, rep) {
    s.first[p] = false; s.turns[p]++;
    draw(s, p, rng);
    if (s.hp[enemy(p)] <= 0) { s.winner = p; addLog(s, "vittoria", { p: p }); }
    var e = enemy(p); s.turn = e; s.moveNo++;
    // esaurimento delle parole d'attacco di chi inizia il turno
    var fade = [];
    Object.keys(s.words).forEach(function (id) {
      var w = s.words[id];
      if (w.o !== e) return;
      var loss = w.type === "attacco" ? CFG.decay : (w.type === "neutra" || w.type === "cataclisma" || w.type === "bloccato" || (w.consacrata && CFG.consacrataConsuma)) ? CFG.consumoNeutre : 0;
      if (loss) { w.stab -= loss; if (w.stab <= 0) fade.push(id); }
    });
    if (fade.length) {
      var r2 = { destroyed: [] }; destroy(s, fade, "fade", r2);
      rep.faded = r2.destroyed.map(function (d) { return d.text; });
      addLog(s, "spengono", { l: rep.faded });
    }
    rep.seq = s.moveNo;
    s.last = rep;
  }

  function name(p) { return tr(p); }

  /* Esegue una mossa completa. Ritorna {ok, err, state}. */
  function play(s0, p, placed, opts, rng) {
    rng = rng || Math.random; opts = opts || {};
    if (s0.winner) return E("finita");
    if (s0.turn !== p) return E("noTurno");
    var v = validate(s0, p, placed, opts);
    if (!v.ok) return v;
    var s = clone(s0);
    placed.forEach(function (t) { s.hands[p].splice(s.hands[p].indexOf(t.l), 1); s.tiles[key(t.r, t.c)] = { l: t.l, o: p }; });
    var id = "w" + s.nextId++;
    var w = { id: id, o: p, text: v.main.text, type: v.type, el: v.el, cells: v.main.cells, score: v.score, base: v.base };
    w.stab = w.max = (v.type === "difesa" ? (v.consacrata ? Math.max(1, Math.ceil(v.score * CFG.consacrazione)) : v.score) : v.base);
    if (v.consacrata) w.consacrata = true;
    s.words[id] = w;
    var rep = { by: p, kind: "parola", word: w.text, type: v.type, el: v.el, score: v.score, cells: v.main.cells.slice(), destroyed: [] };
    if (v.falo) {
      s.lastFalo[p] = s.turns[p];
      destroy(s, v.targets.concat([id]), "burn", rep);
      addLog(s, "falo", { p: p, w: w.text, l: rep.destroyed.filter(function (d) { return d.id !== id; }).map(function (d) { return d.text; }) });
    } else if (v.type === "attacco") {
      var lk = opts.launch && v.launches.indexOf(opts.launch) >= 0 ? opts.launch : v.launches[0];
      cast(s, p, w, lk, rep);
      var la = { p: p, w: w.text, n: v.score };
      if (v.el) la.el = v.el;
      if (rep.damage) la.d = rep.damage;
      if (CFG.attaccoConsuma) la.c = 1;
      addLog(s, "lancio", la);
      rep.destroyed.forEach(function (d) { addLog(s, "disintegrato", { w: d.text }); });
      if (CFG.attaccoConsuma && s.words[id]) { destroy(s, [id], "consumo", rep); rep.consumed = true; }
    } else if (v.type === "difesa" && v.consacrata) {
      addLog(s, "consacra", { p: p, w: w.text, n: w.stab });
    } else if (v.type === "bloccato") {
      addLog(s, "bloccato", { p: p, w: w.text });
    } else if (v.type === "cataclisma") {
      addLog(s, "evoca", { p: p, w: w.text });
    } else if (v.type === "difesa") {
      addLog(s, "erige", { p: p, w: w.text, n: w.stab });
    } else {
      addLog(s, "scrive", { p: p, w: w.text });
    }
    storm(s, rep, rng);
    if (rep.storm) {
      addLog(s, "tempesta", { l: rep.storm.letter, n: rep.storm.force });
      var crolli = rep.destroyed.filter(function (d) { return d.mode === "crollo"; }).map(function (d) { return d.text; });
      if (crolli.length) addLog(s, "crollano", { l: crolli });
    }
    endTurn(s, p, rng, rep);
    return { ok: true, state: s, report: rep };
  }

  // letters: lettere da cambiare (tutte se omesso)
  function alchimia(s0, p, rng, letters) {
    rng = rng || Math.random;
    if (s0.turn !== p || s0.winner) return E("noTurno");
    var s = clone(s0), out = [];
    if (!letters) { out = s.hands[p]; s.hands[p] = []; }
    else for (var i = 0; i < letters.length; i++) {
      var j = s.hands[p].indexOf(letters[i]);
      if (j < 0) return E("noLettera");
      out.push(s.hands[p].splice(j, 1)[0]);
    }
    if (!out.length) return E("sceltaAlch");
    draw(s, p, rng);
    s.focolare = s.focolare.concat(out);
    if (letters) addLog(s, "alchimia", { p: p, n: out.length }); else addLog(s, "alchimiaTutte", { p: p });
    endTurn(s, p, rng, { by: p, kind: "alchimia", destroyed: [] });
    return { ok: true, state: s };
  }
  // Suggerimento: costa PV (CFG.costoSuggerimento, 3 se assente) e resta nella cronaca; il turno non passa
  function suggerisci(s0, p) {
    if (s0.winner) return E("finita");
    if (s0.turn !== p) return E("noTurno");
    var costo = CFG.costoSuggerimento || 3;
    if (s0.hp[p] <= costo) return E("suggPV", { n: costo });
    var s = clone(s0);
    s.hp[p] -= costo;
    s.suggerimenti = s.suggerimenti || { A: 0, B: 0 }; s.suggerimenti[p]++;
    addLog(s, "suggerimento", { p: p, n: costo });
    return { ok: true, state: s, costo: costo };
  }
  function pass(s0, p, rng) {
    if (s0.turn !== p || s0.winner) return E("noTurno");
    var s = clone(s0);
    addLog(s, "passa", { p: p });
    endTurn(s, p, rng || Math.random, { by: p, kind: "passa", destroyed: [] });
    return { ok: true, state: s };
  }

  // anteprima del danno per ogni punto di lancio
  function previewLaunches(s0, p, placed) {
    var v = validate(s0, p, placed, CFG.attaccoLibero ? { attacca: true } : {}); if (!v.ok || v.type !== "attacco") return null;
    var out = {};
    v.launches.forEach(function (k) {
      var s = clone(s0);
      placed.forEach(function (t) { s.tiles[key(t.r, t.c)] = { l: t.l, o: p }; });
      var w = { id: "_p", o: p, text: v.main.text, type: "attacco", cells: v.main.cells, score: v.score };
      s.words._p = w;
      var rep = { destroyed: [] }; cast(s, p, w, k, rep);
      out[k] = rep.damage;
    });
    return out;
  }

  api = {
    tr: tr, testoLog: testoLog, setLinguaUI: setLinguaUI, LINGUA_UI: LINGUA_UI, MSG: MSG,
    COLS: COLS, ROWS: ROWS, STAFFA: STAFFA, VAL: VAL, BAG: BAG, LINGUE: LINGUE, dizionariDi: dizionariDi, sacca: sacca, unisciTesti: unisciTesti, MULT: MULT, CFG: CFG, LESSICO: LESSICO, RADICI: RADICI,
    setDict: setDict, isWord: isWord, classify: classify, key: key, parse: parse, zoneOf: zoneOf, enemy: enemy,
    newGame: newGame, applyCfg: applyCfg, PRESETS: PRESETS, RADICI_LUNGHE: RADICI_LUNGHE, validate: validate, play: play, alchimia: alchimia, pass: pass, suggerisci: suggerisci,
    bridgeActive: bridgeActive, protectedCols: protectedCols, network: network, cellIndex: cellIndex, previewLaunches: previewLaunches, name: name
  };
  applyCfg({});
  buildClass();
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Grimorio = api;
})(this);
