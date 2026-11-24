# In fondo all'elenco partite: link al codice sorgente (AGPL-3.0) e alla pagina del dizionario (GPL-3.0).
# Vale sia per il prototipo sia per la versione online (dopo patch_online).
# uso: python patch_fonte.py <file con renderLobby: index.html del prototipo oppure app.js online>
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
assert "Codice sorgente" not in s, "già fatto"
i = s.index("function renderLobby()")
j = s.index("\n  );\n}", i)
s = s[:j] + ''',
    h("p", { class: "note fonte" },
      "Grimorio è software libero: ",
      h("a", { href: "https://github.com/t0sc4n/grimorio", target: "_blank", rel: "noopener", text: "codice sorgente" }),
      " (AGPL-3.0) · ",
      h("a", { href: "https://github.com/t0sc4n/grimorio/blob/main/prototipo/DIZIONARIO.md", target: "_blank", rel: "noopener", text: "dizionario" }),
      " (GPL-3.0, dall'Estensione linguistica italiana di A. Pescetti e altri)")''' + s[j:]
open(p, "w", encoding="utf-8").write(s)
print("ok")
