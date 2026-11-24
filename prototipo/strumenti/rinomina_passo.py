# "Staffa" -> "Passo Arcano" nei testi per i giocatori (il nome interno STAFFA nel codice resta)
import sys, re
PAIRS = [("Staffa Magica", "Passo Arcano"), ("fino alla Staffa", "fino al Passo Arcano"), ("alla Staffa", "al Passo Arcano"),
         ("sulla Staffa", "sul Passo Arcano"), ("della Staffa", "del Passo Arcano"), ("dalla Staffa", "dal Passo Arcano"),
         ("la Staffa", "il Passo Arcano"), ("Staffa", "Passo Arcano")]
for p in sys.argv[1:]:
    s = open(p, encoding="utf-8").read(); n0 = len(re.findall(r"Staffa", s))
    for a, b in PAIRS: s = re.sub(r"(?<![A-Za-z])" + re.escape(a) + r"(?![A-Za-z(])", b, s)  # non tocca nomi di funzione come onStaffa(
    open(p, "w", encoding="utf-8").write(s)
    print(p.split("/")[-1], n0, "->", len(re.findall(r"Staffa", s)))
