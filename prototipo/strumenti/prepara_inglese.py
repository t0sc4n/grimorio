# Dizionario inglese di Grimorio da ENABLE (enable1.txt, pubblico dominio).
# Tiene le parole da 2 a 11 lettere A-Z, in maiuscolo, ordinate e senza doppioni.
# uso: python prepara_inglese.py enable1.txt words-en.txt
import re, sys
src, dst = sys.argv[1:3]
ok = re.compile(r"^[A-Z]{2,11}$")
parole = sorted({w.strip().upper() for w in open(src, encoding="ascii") if ok.match(w.strip().upper())})
open(dst, "w", encoding="ascii", newline="\n").write("\n".join(parole))
print("parole", len(parole))
