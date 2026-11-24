# Tempo massimo per turno (48 h) nelle partite tra due persone.
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a))
    s = s.replace(a, b)

rep('''const BASE_RULES = G.PRESETS.v5f;''', '''const BASE_RULES = G.PRESETS.v5f;
// tempo per turno nelle partite tra due persone; promemoria quando ne restano 12 ore
const TURN_MS = Math.round(+(process.env.TURN_HOURS || 48) * 3600e3);
const REMIND_MS = Math.min(12 * 3600e3, TURN_MS / 4);
const MAX_TIMEOUTS = 2; // turni scaduti di fila che fanno perdere la partita''')

rep('''  allGames: db.prepare("SELECT id, state FROM games"),''', '''  allGames: db.prepare("SELECT id, state FROM games"),
  expired: db.prepare("SELECT id FROM games WHERE json_extract(state, '$.winner') IS NULL AND json_extract(state, '$.deadline') <= ?"),
  toRemind: db.prepare("SELECT id FROM games WHERE json_extract(state, '$.winner') IS NULL AND json_extract(state, '$.deadline') <= ? AND IFNULL(json_extract(state, '$.reminded'), 0) = 0"),
  setState: db.prepare("UPDATE games SET state = ? WHERE id = ?"),''')

rep('''function commitState(id, s, quiet) {
  const now = Date.now();''', '''// l'orologio corre solo tra due persone diverse; riparte a ogni nuovo turno
function setClock(s) {
  const a = s.seats.A, b = s.seats.B;
  if (s.winner || !a || !b || a.cpu || b.cpu || a.tok === b.tok) { delete s.deadline; delete s.clockMove; delete s.reminded; return; }
  if (s.clockMove !== s.moveNo) { s.clockMove = s.moveNo; s.deadline = Date.now() + TURN_MS; s.reminded = false; }
}
function commitState(id, s, quiet) {
  const now = Date.now();
  setClock(s);''')

# una mossa vera azzera il conto dei turni scaduti
rep('''  if (!r.ok) throw fail(422, r.err);
  const updated = commitState(id, r.state);''', '''  if (!r.ok) throw fail(422, r.err);
  if (r.state.timeouts) r.state.timeouts[seat] = 0;
  const updated = commitState(id, r.state);''')

rep('''// pulizia quotidiana''', '''// ---------- tempo per turno ----------
function fmtHours(ms) { const h = Math.round(ms / 3600e3); return h >= 1 ? h + (h === 1 ? " ora" : " ore") : Math.max(1, Math.round(ms / 60e3)) + " minuti"; }
function checkClocks() {
  const now = Date.now();
  try {
    for (const { id } of Q.expired.all(now)) {
      const g = loadGame(id); if (!g) continue;
      const s = g.s; if (s.winner || !s.deadline || s.deadline > now) continue;
      G.applyCfg(s.cfg || BASE_RULES);
      const seat = s.turn, who = nameOf(s, seat), url = "/#g=" + id;
      const r = G.pass(s, seat, rng); if (!r.ok) continue;
      const t = r.state;
      t.timeouts = t.timeouts || { A: 0, B: 0 };
      t.timeouts[seat] = (t.timeouts[seat] || 0) + 1;
      t.log[t.log.length - 1] = "Tempo scaduto per " + who + ": il turno passa.";
      if (t.timeouts[seat] >= MAX_TIMEOUTS) {
        t.winner = G.enemy(seat);
        t.log.push(who + " ha lasciato scadere il tempo " + MAX_TIMEOUTS + " volte di fila. Vince " + nameOf(t, t.winner) + ".");
      } else pushTo(s.seats[seat].tok, { title: "Grimorio", body: "Tempo scaduto contro " + nameOf(s, G.enemy(seat)) + ": hai perso il turno. Se scade di nuovo, perdi la partita.", url, tag: id + "-t" });
      commitState(id, t);
    }
    for (const { id } of Q.toRemind.all(now + REMIND_MS)) {
      const g = loadGame(id); if (!g) continue;
      const s = g.s; if (s.winner || !s.deadline || s.reminded) continue;
      s.reminded = true; Q.setState.run(JSON.stringify(s), id);
      const t = s.seats[s.turn];
      if (t && !t.cpu && !isLooking(t.tok, id)) pushTo(t.tok, { title: "Grimorio", body: "Ti restano " + fmtHours(s.deadline - now) + " per giocare contro " + nameOf(s, G.enemy(s.turn)) + ", poi il turno passa.", url: "/#g=" + id, tag: id });
    }
  } catch (e) { console.error("controllo dei tempi non riuscito", e); }
}
setInterval(checkClocks, +(process.env.CLOCK_CHECK_MS || 60e3)).unref();
setTimeout(checkClocks, 5e3).unref();
// partite già in corso prima di questo aggiornamento: l'orologio parte adesso
for (const row of Q.allGames.all()) {
  try { const s = JSON.parse(row.state); if (s.winner || s.deadline) continue; const had = s.deadline; setClock(s); if (s.deadline !== had) Q.setState.run(JSON.stringify(s), row.id); } catch (e) {}
}

// pulizia quotidiana''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
