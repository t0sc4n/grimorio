// Dizionario di Grimorio: un'unica stringa ordinata, una parola per riga, con ricerca binaria.
"use strict";
const fs = require("fs");

function loadDict(file) { return fromText(fs.readFileSync(file, "utf8")); }
function fromText(t) {
  const text = t.replace(/\r/g, "").trim();
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offs.push(i + 1);
  const o = Uint32Array.from(offs), n = o.length;
  const line = i => text.slice(o[i], i + 1 < n ? o[i + 1] - 1 : text.length);
  return {
    text, offs: o, size: n,
    has(w) {
      let lo = 0, hi = n - 1;
      while (lo <= hi) { const m = (lo + hi) >> 1, x = line(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; }
      return false;
    }
  };
}
module.exports = { loadDict, fromText };
