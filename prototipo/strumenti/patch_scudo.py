# Scudo di colonna: una difesa protegge le sue colonne (±difesaLarga) in tutto il proprio Sanctum.
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:80], s.count(a)); s = s.replace(a, b)
i = s.index("    s1n80: {"); line = s[i:s.index("\n", i) + 1]
rep(line, line
    + line.replace("s1n80:", "s1s:").replace("attaccoConsuma: true }", "attaccoConsuma: true, scudo: true }")
    + line.replace("s1n80:", "s1sp:").replace("consacrazione: 0.5", "consacrazione: 1").replace("attaccoConsuma: true }", "attaccoConsuma: true, scudo: true }")
    + line.replace("s1n80:", "s1b:").replace("bloccoInvasione: false", "bloccoInvasione: true"))
rep('''["attaccoLibero", "attaccoConsuma", "passo"]''', '''["attaccoLibero", "attaccoConsuma", "passo", "scudo"]''')
rep('''    var hit = {}, path = [];''', '''    var hit = {}, path = [];
    // Scudo: prima del viaggio, l'incantesimo lanciato nel Sanctum nemico affronta le difese che coprono la sua colonna
    if (CFG.scudo && zoneOf(r) === e) {
      var shields = [];
      Object.keys(s.words).forEach(function (id) {
        var w = s.words[id];
        if (w.type !== "difesa" || w.o !== e) return;
        if (w.cells.some(function (k) { var q = parse(k); return zoneOf(q[0]) === e && Math.abs(q[1] - c) <= CFG.difesaLarga; })) shields.push(w);
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
    }''')
open(p, "w", encoding="utf-8").write(s); print("ok")
