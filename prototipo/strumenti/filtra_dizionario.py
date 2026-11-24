# Secondo passaggio sul dizionario espanso da hunspell_expand.py:
# toglie i numeri romani (tenendo quelli che sono anche parole italiane) e alcune sigle e abbreviazioni.
# uso: python filtra_dizionario.py parole_espanse.txt parole.txt
import re, sys
src, dst = sys.argv[1:3]
ROMANO = re.compile(r"^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$")
PAROLE_VERE = {"CI", "DI", "LI", "MI", "VI"}          # sembrano numeri romani ma sono parole
SIGLE = set("AB DG DM DR ES ET HG HL HM HTTP MG MQ OC OD OP PST TBC UD UP".split())
parole = [w for w in open(src, encoding="ascii").read().split("\n") if w]
tenute = [w for w in parole if not ((ROMANO.match(w) and w not in PAROLE_VERE) or w in SIGLE)]
open(dst, "w", encoding="ascii", newline="\n").write("\n".join(tenute))
print("parole", len(parole), "-> tenute", len(tenute), "(tolte", len(parole) - len(tenute), ")")
