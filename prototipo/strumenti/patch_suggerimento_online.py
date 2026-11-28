# "Suggerisci mossa" nella versione online: lo calcola il server (paga 3 PV; se fallisce restituisce i PV).
# uso: python patch_suggerimento_online.py <cartella srv> <proto/index.html>   (dopo patch_online/sicurezza/tempo sul client)
import sys, os, re
d = sys.argv[1]
def patch(fn, pairs):
    p = os.path.join(d, fn); s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (fn, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, "w", encoding="utf-8").write(s)

# --- client: chiede al server ---
p = os.path.join(d, "public", "app.js"); s = open(p, encoding="utf-8").read()
# patch_online toglie la parte del giocatore automatico (dove sta il suggerimento del prototipo): la si rimette in versione online
proto = open(sys.argv[2], encoding="utf-8").read()
apply_src = proto[proto.index("// mette la mossa suggerita sulla griglia"):proto.index("// ---------- parola intera dal dizionario")]
assert "askHint" not in s.replace("askHint(); }", "") and "function applyHint" not in s
k = s.index("// ---------- parola intera dal dizionario")
s = s[:k] + '''// ---------- suggerimento: costa PV, lo calcola il server ----------
let hintBusy = false;
async function askHint() {
  if (hintBusy || !cur || !S()) return;
  const id = cur.id, reqMoveNo = S().moveNo;
  hintBusy = true; render();
  try {
    const r = await api("POST", "games/" + id + "/suggest", { moveNo: reqMoveNo });
    if (!isStale(games[r.id], { id: r.id, s: r.s, updated: r.updated })) games[r.id] = { id: r.id, s: r.s, updated: r.updated };
    if (cur && cur.id === r.id) {
      onGameData({ id: r.id, s: r.s, updated: r.updated });
      hintBusy = false;
      if (r.hint && S() && S().moveNo === reqMoveNo && myTurn()) applyHint(r.hint);
    }
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  hintBusy = false; render();
}
''' + apply_src + s[k:]
assert "new Worker" not in s
open(p, "w", encoding="utf-8").write(s)

# --- server (solo se non è già stato fatto) ---
if 'parts[2] === "suggest"' not in open(os.path.join(d, "server.js"), encoding="utf-8").read(): patch("server.js", [
# coda dei suggerimenti, servita prima delle mosse del computer
('''function pumpCpu() {
  if (!aiWorker || aiBusy || !cpuQueue.length) return;''',
 '''const hintQueue = []; // suggerimenti richiesti dai giocatori: { id, state, seat, resolve, reject }
function askAi(id, state, seat) {
  return new Promise((resolve, reject) => {
    if (hintQueue.length >= 20) return reject(fail(503, "Il suggeritore è occupato: riprova tra poco."));
    hintQueue.push({ id, state, seat, resolve, reject }); pumpCpu();
  });
}
function pumpCpu() {
  if (!aiWorker || aiBusy) return;
  if (hintQueue.length) {
    const j = hintQueue.shift();
    aiBusy = { id: j.id, hint: j, timer: setTimeout(() => { console.error("il suggeritore ci mette troppo nella partita", j.id); aiWorker.terminate(); }, 30000) };
    aiWorker.postMessage({ id: j.id, state: j.state, seat: j.seat, level: "normale" });
    return;
  }
  if (!cpuQueue.length) return;'''),
('''function onAiResult(m) {
  if (!aiBusy || aiBusy.id !== m.id) return;
  clearTimeout(aiBusy.timer);''',
 '''function onAiResult(m) {
  if (!aiBusy || aiBusy.id !== m.id) return;
  clearTimeout(aiBusy.timer);
  if (aiBusy.hint) {
    const j = aiBusy.hint; aiBusy = null;
    if (m.error) j.reject(new Error(m.error)); else j.resolve(m.move || { kind: "pass" });
    return setImmediate(pumpCpu);
  }'''),
('''    if (aiBusy) { clearTimeout(aiBusy.timer); aiBusy = null; }''',
 '''    if (aiBusy) { clearTimeout(aiBusy.timer); if (aiBusy.hint) aiBusy.hint.reject(new Error("il suggeritore si è fermato")); aiBusy = null; }'''),
# endpoint
('''    if (parts[2] === "resign" && method === "POST") {''',
 '''    if (parts[2] === "suggest" && method === "POST") {
      const p = needMe();
      if (!hit("hint:" + p.id, 10, 60e3)) throw fail(429, "Troppi suggerimenti in poco tempo: aspetta un attimo.");
      const body = await readBody(req);
      const g = loadGame(id); if (!g) throw fail(404, "Partita non trovata.");
      const s = g.s; G.applyCfg(s.cfg || BASE_RULES);
      if (s.winner) throw fail(409, "La partita è finita.");
      const seat = seatOf(s, p.id);
      if (!seat) throw fail(403, "Non giochi in questa partita.");
      if (seat !== s.turn) throw fail(409, "Non è il tuo turno.");
      if (!s.seats[G.enemy(seat)]) throw fail(409, "Aspetta che arrivi lo sfidante.");
      if (body.moveNo !== s.moveNo) throw fail(409, "La partita è cambiata nel frattempo: la ricarico.");
      const r = G.suggerisci(s, seat); if (!r.ok) throw fail(422, r.err);
      let updated = commitState(id, r.state, true), hint, state = r.state;
      try { hint = await askAi(id, JSON.parse(JSON.stringify(r.state)), seat); }
      catch (e) {
        // il suggerimento non è arrivato: si restituiscono i PV, se la partita non è andata avanti
        hint = { kind: "errore", message: "il suggeritore non ha risposto, i PV ti sono stati restituiti" };
        const g2 = loadGame(id);
        if (g2 && g2.s.moveNo === r.state.moveNo && !g2.s.winner) {
          G.applyCfg(g2.s.cfg || BASE_RULES);
          g2.s.hp[seat] += r.costo; g2.s.log.push("Suggerimento non riuscito: " + r.costo + " PV restituiti.");
          state = g2.s; updated = commitState(id, g2.s, true);
        }
      }
      return sendJson(res, 200, { id, s: viewFor(state, p.id), updated, hint });
    }
    if (parts[2] === "resign" && method === "POST") {'''),
])
print("ok")
