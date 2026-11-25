# Pagina online: script in un file separato (per la Content-Security-Policy), font locali, scollegamento dispositivi.
import sys, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lingua_comune import avvolgi, chiavi
pub = sys.argv[1]
p = os.path.join(pub, "index.html")
s = open(p, encoding="utf-8").read()
K = chiavi(s)

def rep(a, b):
    # i testi fissi sono tr("...") (vedi lingua_comune.py)
    global s
    a, b = avvolgi(a, K), avvolgi(b, K)
    assert s.count(a) == 1, (a[:90], s.count(a))
    s = s.replace(a, b)

# font locali invece di Google Fonts
s = re.sub(r'<link rel="preconnect" href="https://fonts.googleapis.com">\s*', "", s)
s = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com/[^"]+">', '<link rel="stylesheet" href="/fonts.css">', s)
assert "googleapis" not in s
rep('<meta name="theme-color" content="#13111d">', '<meta name="theme-color" content="#13111d">\n<meta name="referrer" content="no-referrer">')

# scollegare gli altri dispositivi (nuovo codice di accesso)
rep('''    h("button", { class: "btn small", onclick: async () => { try { await navigator.clipboard.writeText(link); toast("Link di accesso copiato."); } catch (e) { document.getElementById("link-accesso").select(); } }, text: "Copia il link di accesso" })
  ]);''', '''    h("button", { class: "btn small", onclick: async () => { try { await navigator.clipboard.writeText(link); toast("Link di accesso copiato."); } catch (e) { document.getElementById("link-accesso").select(); } }, text: "Copia il link di accesso" }),
    h("p", { class: "sub", text: "Se pensi che il link sia finito in mani sbagliate, crea un nuovo codice: tutti gli altri dispositivi verranno scollegati." }),
    h("button", { class: "btn small danger", onclick: rotateToken, text: "Scollega gli altri dispositivi" })
  ]);
}
async function rotateToken() {
  try {
    const r = await api("POST", "me/rotate");
    CRED.token = r.token; store.set("grimorio-cred", CRED);
    if (ws) ws.close();
    closeSheet(); toast("Fatto: gli altri dispositivi sono scollegati. Questo resta collegato.");
  } catch (e) { toast(e.message, true); }''')

# codice nella pagina -> app.js
m = re.search(r'<script>\n(.*?)</script>', s, re.S)
open(os.path.join(pub, "app.js"), "w", encoding="utf-8").write("// Grimorio — interfaccia di gioco (versione online)\n" + m.group(1))
s = s[:m.start()] + '<script src="/app.js"></script>' + s[m.end():]
s = s.replace('<script src="engine.js"></script>', '<script src="/engine.js"></script>')
assert "<script>" not in s
open(p, "w", encoding="utf-8").write(s)
print("ok")
