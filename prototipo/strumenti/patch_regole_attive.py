# "Regole in breve" e dizionario seguono le regole giuste: quelle della partita aperta,
# oppure (nell'elenco partite) quelle scelte nel menu "Regole" (s1 se non c'è scelta).
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)
rep('''const REGOLE = {''', '''// regole da mostrare: quelle della partita aperta, altrimenti quelle scelte nel menu "Regole"
function regoleAttive() {
  if (S() && S().cfg) return S().cfg;
  const sel = document.getElementById("regole");
  return ((sel && REGOLE[sel.value]) || REGOLE.s1).cfg;
}
const REGOLE = {''')
rep('''  if (!cur) G.applyCfg(BASE);
  const libero = !!(S() && S().cfg && S().cfg.attaccoLibero);''', '''  if (!cur) G.applyCfg(regoleAttive());
  const libero = !!regoleAttive().attaccoLibero;''')
rep('''  const c = (S() && S().cfg) || BASE;''', '''  const c = regoleAttive();''')
open(p, "w", encoding="utf-8").write(s); print("ok")
