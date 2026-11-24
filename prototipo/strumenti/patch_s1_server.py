# Server: regole s1 (predefinite) o classiche alla creazione, mossa "attacca", computer che attacca.
import sys, os
d = sys.argv[1]
def patch(fn, pairs):
    p = os.path.join(d, fn); s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (fn, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, "w", encoding="utf-8").write(s)

patch("server.js", [
('''      const hp = [20, 25, 30].includes(+body.hp) ? +body.hp : 30;
      G.applyCfg(Object.assign({}, BASE_RULES, { hp }));''',
 '''      // regole: s1 (semplificate, predefinite) oppure v5f (classiche, con lessico)
      const regole = body.regole === "v5f" ? "v5f" : "s1";
      const pvOk = regole === "s1" ? [40, 60, 80] : [20, 25, 30], pvDef = regole === "s1" ? 60 : 30;
      const hp = pvOk.includes(+body.hp) ? +body.hp : pvDef;
      G.applyCfg(Object.assign({}, G.PRESETS[regole], { hp }));'''),
('''    const opts = { falo: !!o.falo, consacra: !!o.consacra };''',
 '''    const opts = { falo: !!o.falo, consacra: !!o.consacra, attacca: !!o.attacca };'''),
])
patch("ai-core.js", [
('''      if (G.CFG.consacrazione && v.type === "neutra") { const cv = G.validate(s, p, pl, { consacra: true }); if (cv.ok) opts.push({ consacra: true }); }''',
 '''      if (G.CFG.attaccoLibero && v.type === "neutra" && v.launches.length) {
        const pv = G.previewLaunches(s, p, pl); let bk = null, bd = -1;
        for (const k in pv) if (pv[k] > bd) { bd = pv[k]; bk = k; }
        if (bk) opts.push({ attacca: true, launch: bk });
      }
      if (G.CFG.consacrazione && v.type === "neutra") { const cv = G.validate(s, p, pl, { consacra: true }); if (cv.ok) opts.push({ consacra: true }); }'''),
])
print("ok")
