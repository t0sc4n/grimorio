// prove rapide della regola s1
const fs = require("fs"), G = require(process.argv[2] + "/engine.js");
G.setDict(new Set(fs.readFileSync(process.argv[2] + "/parole.txt", "utf8").trim().split("\n")));
let seed = 3; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const ok = (c, m) => { console.log((c ? "OK  " : "NO  ") + m); if (!c) process.exitCode = 1; };
G.applyCfg(G.PRESETS.s1a);
let s = G.newGame(rng);
s.hands.A = ["C", "A", "S", "A", "T", "O", "R"];
// CASA nel Sanctum Blu (riga 2), parola neutra qualsiasi
const casa = [{ r: 2, c: 3, l: "C" }, { r: 2, c: 4, l: "A" }, { r: 2, c: 5, l: "S" }, { r: 2, c: 6, l: "A" }];
let v = G.validate(s, "A", casa, {});
ok(v.ok && v.type === "neutra", "senza scelta la parola è neutra (" + v.type + ")");
v = G.validate(s, "A", casa, { attacca: true });
ok(v.ok && v.type === "attacco", "con «attacca» diventa attacco, punti di lancio: " + (v.launches || []).length);
ok(!G.validate(s, "A", casa, { attacca: true, consacra: true }).ok, "attacco + consacrazione rifiutati");
const foc0 = s.focolare.length;
let r = G.play(s, "A", casa, { attacca: true }, rng);
ok(r.ok, "attacco giocato: " + r.state.log.slice(-1)[0]);
ok(!Object.values(r.state.words).some(w => w.text === "CASA") && !r.state.tiles["2,3"], "la parola è sparita dalla griglia");
ok(r.state.focolare.length === foc0 + 4, "le 4 lettere vanno al Focolare (nessuna torna in mano)");
// lettere condivise: SALE scritta (neutra) poi CASA lanciata incrociando la S
s = G.newGame(rng); s.first.A = false;
s.hands.A = ["S", "A", "L", "E", "C", "A", "A"];
r = G.play(s, "A", [{ r: 1, c: 4, l: "S" }, { r: 1, c: 5, l: "A" }, { r: 1, c: 6, l: "L" }, { r: 1, c: 7, l: "E" }], {}, rng);
console.log("    base:", r.ok ? r.state.log.slice(-1)[0] : r.err);
s = r.state; s.turn = "A"; s.hands.A = ["C", "A", "O", "I", "E", "T", "N"];
// cerca una parola verticale di 2-3 lettere che incroci una lettera di SALE e si possa lanciare
let found = null;
for (let c = 4; c <= 7 && !found; c++) for (const x of s.hands.A) for (const y of s.hands.A) {
  for (const pl of [[{ r: 0, c, l: x }, { r: 2, c, l: y }], [{ r: 0, c, l: x }], [{ r: 2, c, l: x }]]) {
    const v = G.validate(s, "A", pl, { attacca: true }); if (v.ok) { found = { pl, c, text: v.main.text }; break; }
  }
  if (found) break;
}
ok(!!found, "trovata parola incrociata: " + (found && found.text));
if (found) {
  r = G.play(s, "A", found.pl, { attacca: true }, rng);
  const shared = "1," + found.c, others = found.pl.map(t => t.r + "," + t.c);
  ok(r.ok && r.state.tiles[shared] && others.every(k => !r.state.tiles[k]) && Object.values(r.state.words).some(w => w.text === "SALE"),
    "la lettera condivisa resta e SALE è intatta, le lettere nuove spariscono: " + r.state.log.slice(-1)[0]);
}
// errore senza punto di lancio: parola tutta nella Terra di Mezzo non si può lanciare
G.applyCfg(G.PRESETS.v5f);
s = G.newGame(rng); s.hands.A = ["C", "A", "S", "A", "T", "O", "R"];
ok(!G.validate(s, "A", casa, { attacca: true }).ok, "in v5f «attacca» è rifiutato");
ok(G.validate(s, "A", casa, {}).type === "neutra", "in v5f CASA resta neutra");
// s1 definitiva: si lancia solo dal Sanctum nemico
G.applyCfg(G.PRESETS.s1);
s = G.newGame(rng); s.hands.A = ["C", "A", "S", "A", "T", "O", "R"];
ok(!G.validate(s, "A", casa, { attacca: true }).ok, "s1: dal proprio Sanctum «attacca» è rifiutato");
ok(G.CFG.scudo === "riga" && G.CFG.consacrazione === 2 && G.CFG.hp === 60, "s1: Scudo di riga, consacrazione x2, 60 PV");
