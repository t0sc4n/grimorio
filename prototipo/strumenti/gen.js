// Genera una partita a metà (regole v5e) e una mossa d'attacco valida per il giocatore di turno.
const path = require("path");
const dir = process.argv[2], moves = +(process.argv[3] || 24), out = process.argv[4];
process.argv = [process.argv[0], "sim.js", dir, "0", "5", "1", "v5e", "gen_tmp.json"];
const { aiTurn, genMoves, G } = require("./sim.js");
let seed = 5; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let s = G.newGame(rng), tries = 0;
while (true) {
  for (let i = 0; i < moves && !s.winner; i++) s = aiTurn(s, s.turn).state;
  // cerca una mossa d'attacco con più punti di lancio per il giocatore di turno
  const p = s.turn; let atk = null;
  for (const pl of genMoves(s, p)) { const v = G.validate(s, p, pl, {}); if (v.ok && v.type === "attacco" && v.launches.length > 1) { atk = { placed: pl, word: v.main.text, launches: v.launches }; break; } }
  if (atk && !s.winner) { 
    s.seats.A = { tok: "tprova", nome: "Aurelio" }; s.seats.B = { tok: "tprova", nome: "Selene" };
    require("fs").writeFileSync(out, JSON.stringify({ id: "pprova1", data: { s, created: Date.now(), updated: Date.now() }, atk }, null, 0));
    console.log("mosse", s.moveNo, "turno", p, "PV", s.hp, "attacco", atk.word, "parole", Object.values(s.words).map(w => w.text + ":" + w.type).join(" "));
    break;
  }
  if (s.winner) s = G.newGame(rng); else s = aiTurn(s, s.turn).state; if (++tries > 30) { console.log("nessun attacco trovato"); break; }
}
