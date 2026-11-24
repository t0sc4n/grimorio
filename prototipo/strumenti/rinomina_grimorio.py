# Il gioco si chiama Grimorio: corregge il vecchio nome sbagliato in tutti i file di testo indicati.
# uso: python rinomina_grimorio.py file1 file2 ...
import sys
VECCHIO = "grimon" + "io"   # scritto spezzato, così lo script non corregge se stesso
PAIRS = [(VECCHIO.upper(), "GRIMORIO"), (VECCHIO.capitalize(), "Grimorio"), (VECCHIO, "grimorio")]
tot = 0
for p in sys.argv[1:]:
    try:
        s = open(p, encoding="utf-8").read()
    except (UnicodeDecodeError, IsADirectoryError):
        continue
    n = sum(s.count(a) for a, _ in PAIRS)
    if not n:
        continue
    for a, b in PAIRS:
        s = s.replace(a, b)
    open(p, "w", encoding="utf-8", newline="").write(s)
    tot += n
    print(f"{n:4d}  {p}")
print("sostituzioni:", tot)
