// Frequenza delle lettere in un dizionario e proposta di Sacca (quantità su 90 tessere, valori 1-10).
// La frequenza è pesata per parole brevi (2-7 lettere), quelle che si giocano davvero.
// uso: node sacca_inglese.js <dizionario.txt> [totale=90]
const fs = require("fs");
const [file, tot = 90] = process.argv.slice(2);
const parole = fs.readFileSync(file, "utf8").split("\n").filter(w => w.length >= 2 && w.length <= 7);
const f = {}; let n = 0;
for (const w of parole) for (const c of w) { f[c] = (f[c] || 0) + 1; n++; }
const lett = Object.keys(f).sort((a, b) => f[b] - f[a]);
// quantità: proporzionali, almeno 1, arrotondate in modo che la somma sia tot
let q = {}; lett.forEach(c => q[c] = Math.max(1, Math.round(f[c] / n * tot)));
let somma = () => Object.values(q).reduce((a, b) => a + b, 0);
while (somma() > tot) { const c = lett.filter(c => q[c] > 1).sort((a, b) => q[b] - f[b] / n * tot - (q[a] - f[a] / n * tot))[0]; q[c]--; }
while (somma() < tot) { const c = lett.slice().sort((a, b) => (f[b] / n * tot - q[b]) - (f[a] / n * tot - q[a]))[0]; q[c]++; }
// valori: proporzionali a log(frequenza massima / frequenza), da 1 a 10
const fm = f[lett[0]], fl = f[lett[lett.length - 1]];
const v = {}; lett.forEach(c => v[c] = 1 + Math.round(9 * Math.log(fm / f[c]) / Math.log(fm / fl)));
console.log("parole", parole.length);
lett.forEach(c => console.log(c, (f[c] / n * 100).toFixed(2) + "%", "quantità", q[c], "valore", v[c]));
console.log("BAG", JSON.stringify(q)); console.log("VAL", JSON.stringify(v));
