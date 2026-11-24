// tabella di confronto dai risultati di sim.js
const fs = require("fs");
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
for (const f of process.argv.slice(2)) {
  const R = JSON.parse(fs.readFileSync(f, "utf8")), n = R.length;
  const turni = R.map(r => r.moves / 2), att = R.map(r => r.attacks), hit = R.map(r => r.attacksHit);
  const dmg = R.map(r => r.dmg.A + r.dmg.B), perHit = R.map(r => r.attacksHit ? (r.dmg.A + r.dmg.B) / r.attacksHit : 0).filter(x => x);
  const z = k => avg(R.map(r => r.dmgByZone[k]));
  const wA = R.filter(r => r.winner === "A").length, wB = R.filter(r => r.winner === "B").length;
  const brevi = R.filter(r => r.moves / 2 <= 5).length;
  console.log([f.replace(/^sim_|\.json$/g, ""), n, "turni a testa: media " + avg(turni).toFixed(1) + ", mediana " + med(turni) + ", ≤5 turni " + Math.round(100 * brevi / n) + "%",
    "vittorie Blu/Rosso/patta " + wA + "/" + wB + "/" + (n - wA - wB),
    "attacchi " + avg(att).toFixed(1) + " (a segno " + Math.round(100 * avg(hit) / Math.max(avg(att), 1e-9)) + "%), danno per colpo " + avg(perHit).toFixed(1),
    "danno da casa/centro/invasione " + z("casa").toFixed(0) + "/" + z("centro").toFixed(0) + "/" + z("invasione").toFixed(0),
    "consacrate " + avg(R.map(r => r.consacrate || 0)).toFixed(1) + ", intercettati " + avg(R.map(r => r.intercepted || 0)).toFixed(1),
    "falò " + avg(R.map(r => r.falo)).toFixed(1) + ", tempeste " + avg(R.map(r => r.storms)).toFixed(1),
    "ponte attivo: " + Math.round(100 * avg(R.map(r => (r.bridgeTurn.A !== null) + (r.bridgeTurn.B !== null))) / 2) + "% dei giocatori",
    "ponti rotti attaccando " + avg(R.map(r => r.ponteRotto || 0)).toFixed(1)].join(" | "));
}
