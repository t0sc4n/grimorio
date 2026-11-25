# Elenca i testi italiani rimasti fuori da tr() nello script di una pagina (prototipo o app.js online).
# uso: python controlla_traduzioni.py <index.html | app.js>
import re, sys
s = open(sys.argv[1], encoding="utf-8").read()
if '<script>\n"use strict";' in s: s = s[s.index('<script>\n"use strict";'):]
in_en = False
for n, r in enumerate(s.split("\n")):
    if r.startswith("const EN = "): in_en = True
    if in_en:
        if r.startswith("}"): in_en = False
        continue
    if r.lstrip().startswith("//"): continue
    for m in re.finditer(r'"((?:[^"\\]|\\.)*)"', r):
        lit = m.group(1)
        if r[max(0, m.start() - 3):m.start()] == "tr(": continue
        if re.search(r"[a-zà-ù]{2,}[ .,:;!?…]|[àèéìòù]|^[A-Z][a-zà-ù]+$", lit) and not re.match(r"^(--c|width|http|margin|text-align|grimorio|[a-z-]+:)", lit):
            print(n, repr(lit[:110]))
