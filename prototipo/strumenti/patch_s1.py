# s1 (semplificata): ogni parola può attaccare, a scelta del giocatore, e attaccando si consuma.
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:80], s.count(a))
    s = s.replace(a, b)

rep('''consacrazione: 0, bloccoInvasione: false, consacrataConsuma: false, maxConsacrate: 0, letturaDalLato: false };''',
    '''consacrazione: 0, bloccoInvasione: false, consacrataConsuma: false, maxConsacrate: 0, letturaDalLato: false,
    attaccoLibero: false, attaccoConsuma: false };
  /* s1: attaccoLibero: niente lessico, qualsiasi parola può essere lanciata se il giocatore lo sceglie (opts.attacca);
     attaccoConsuma: la parola lanciata sparisce subito dopo l'attacco (restano le lettere che reggono altre parole). */''')
rep('''    v5c: {''', '''    s1: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 0.5, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    s1p: { mid: 5, hp: 30, hand: 7, decay: 1, radici: "lunghe", attacchi: "sanctum", difesaLarga: 1, faloOgni: 3, consumoNeutre: 1, ponteCentro: true, tempestaLocale: true, tettoDanno: 0, consacrazione: 1, bloccoInvasione: false, consacrataConsuma: true, maxConsacrate: 2, letturaDalLato: true, attaccoLibero: true, attaccoConsuma: true },
    v5c: {''')
rep('''    var cls = classify(main.text);''', '''    var cls = CFG.attaccoLibero ? { type: "neutra", el: null } : classify(main.text);''')
rep('''    var consacrata = false;
    if (opts.consacra) {''', '''    if (opts.attacca) {
      if (!CFG.attaccoLibero) return { ok: false, err: "In questa partita attaccano solo le parole elementali." };
      if (opts.falo || opts.consacra) return { ok: false, err: "Una parola lanciata non può essere anche Falò o difesa." };
      if (!launches.length) return { ok: false, err: "Per attaccare la parola deve avere una lettera in un Sanctum." };
      type = "attacco";
    }
    var consacrata = false;
    if (opts.consacra) {''')
rep('''      var msg = who + " lancia " + w.text + " (" + v.el + ", potenza " + v.score + ")";
      msg += rep.damage ? ": " + rep.damage + " danni." : ": l'incantesimo si dissolve.";
      addLog(s, msg);
      rep.destroyed.forEach(function (d) { addLog(s, d.text + " viene disintegrato."); });''',
'''      var msg = who + " lancia " + w.text + " (" + (v.el ? v.el + ", " : "") + "potenza " + v.score + ")";
      msg += rep.damage ? ": " + rep.damage + " danni." : ": l'incantesimo si dissolve.";
      if (CFG.attaccoConsuma) msg += " La parola si consuma.";
      addLog(s, msg);
      rep.destroyed.forEach(function (d) { addLog(s, d.text + " viene disintegrato."); });
      if (CFG.attaccoConsuma && s.words[id]) { destroy(s, [id], "fade", rep); rep.consumed = true; }''')
rep('''    var v = validate(s0, p, placed, {}); if (!v.ok || v.type !== "attacco") return null;''',
    '''    var v = validate(s0, p, placed, CFG.attaccoLibero ? { attacca: true } : {}); if (!v.ok || v.type !== "attacco") return null;''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
