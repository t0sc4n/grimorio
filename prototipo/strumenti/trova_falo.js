// cerca, in partite simulate s1r2h60, un Falò che brucia una difesa consacrata nel Sanctum nemico
const dir = process.argv[2];
process.argv = [process.argv[0], "sim.js", dir, "0", "21", "1", "s1r2h60", "vuoto.json"];
const { aiTurn, G } = require("./sim.js");
const fs = require("fs");
for (let g = 0; g < 30; g++) {
  let s = G.newGame(Math.random);
  s.seats = { A: { tok: "tblu", nome: "Aurelio" }, B: { tok: "trosso", nome: "Selene" } };
  while (!s.winner && s.moveNo < 200) {
    const p = s.turn, prev = s, r = aiTurn(s, p), rep = r.report || r.state.last;
    s = r.state;
    if (rep.type === "falo") {
      const burned = rep.destroyed.filter(d => d.o !== p && prev.words[d.id] && prev.words[d.id].consacrata && d.cells.every(k => G.zoneOf(G.parse(k)[0]) === G.enemy(p)));
      if (burned.length && G.bridgeActive(prev, p)) {
        // la mossa del Falò: lettere posate = celle della parola nuova non presenti prima
        const placed = rep.cells.filter(k => !prev.tiles[k]).map(k => { const [r0, c0] = G.parse(k); return { r: r0, c: c0, l: s.log && r.state.tiles[k] ? r.state.tiles[k].l : null }; });
        const word = rep.word;
        fs.writeFileSync(dir + "/../falo_caso.json", JSON.stringify({ prev, after: s, p, word, cells: rep.cells, burned: burned.map(b => ({ text: b.text, stab: prev.words[b.id].stab, cells: b.cells })), others: rep.destroyed.map(d => d.text) }, null, 1));
        console.log("partita", g, "mossa", prev.moveNo, "giocatore", p, "Falò con", word, "brucia", rep.destroyed.map(d => d.text + (prev.words[d.id] && prev.words[d.id].consacrata ? "(consacrata " + prev.words[d.id].stab + ")" : "")).join(", "), "| PV", JSON.stringify(prev.hp));
        process.exit(0);
      }
    }
  }
}
console.log("nessun caso trovato");
