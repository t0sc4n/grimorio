# Server online bilingue: partite in italiano o inglese (un dizionario per lingua, anche per il computer),
# errori nella lingua di chi chiede (header X-Lingua), cronaca strutturata, notifiche nella lingua di ogni giocatore.
# uso: python patch_lingua_server.py <cartella del server (online/)>
import sys, os, json
d = sys.argv[1]
def patch(fn, pairs):
    p = os.path.join(d, fn); s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (fn, s.count(a), a[:90])
        s = s.replace(a, b)
    open(p, "w", encoding="utf-8", newline="").write(s)

SRV_EN = {
  "Il suggeritore è occupato: riprova tra poco.": "The hint helper is busy: try again shortly.",
  "Mossa non valida.": "Invalid move.",
  "Partita non trovata.": "Game not found.",
  "La partita è finita.": "The game is over.",
  "Non giochi in questa partita.": "You are not playing in this game.",
  "Non è il tuo turno.": "It is not your turn.",
  "Aspetta che arrivi lo sfidante.": "Wait for the challenger to arrive.",
  "La partita è cambiata nel frattempo: la ricarico.": "The game changed in the meantime: reloading it.",
  "Mossa sconosciuta.": "Unknown move.",
  "Richiesta troppo grande.": "Request too large.",
  "Richiesta non valida.": "Invalid request.",
  "Troppe richieste: rallenta un attimo e riprova.": "Too many requests: slow down a moment and try again.",
  "Accesso non valido: ricarica la pagina.": "Invalid access: reload the page.",
  "Troppe registrazioni da questa rete: riprova più tardi.": "Too many sign-ups from this network: try again later.",
  "Iscrizione non valida.": "Invalid subscription.",
  "Servizio di notifica non riconosciuto.": "Unrecognised notification service.",
  "Hai già {n} partite in corso: finiscine o abbandonane qualcuna.": "You already have {n} games in progress: finish or leave some of them.",
  "Hai già {n} partite in corso contro il computer.": "You already have {n} games in progress against the computer.",
  "Hai creato molte partite nell'ultima ora: riprova più tardi.": "You have created many games in the last hour: try again later.",
  "Questa partita ha già due giocatori.": "This game already has two players.",
  "Troppe mosse in poco tempo: rallenta un attimo.": "Too many moves in a short time: slow down a moment.",
  "Troppi suggerimenti in poco tempo: aspetta un attimo.": "Too many hints in a short time: wait a moment.",
  "La partita è già finita.": "The game is already over.",
  "Puoi togliere dall'elenco solo le partite finite.": "You can only remove finished games from the list.",
  "Indirizzo sconosciuto.": "Unknown address.",
  "Errore del server.": "Server error.",
  "il suggeritore non ha risposto, i PV ti sono stati restituiti": "the hint helper did not respond, your HP have been refunded",
  # notifiche
  "Hai vinto contro {n}!": "You won against {n}!",
  "{n} ha vinto la partita.": "{n} won the game.",
  "Tocca a te contro {n}.": "Your turn against {n}.",
  "{n} ha accettato la sfida. Tocca a te!": "{n} accepted the challenge. Your turn!",
  "Tempo scaduto contro {n}: hai perso il turno. Se scade di nuovo, perdi la partita.": "Time ran out against {n}: you lost your turn. If it runs out again, you lose the game.",
  "Ti restano {t} per giocare contro {n}, poi il turno passa.": "You have {t} left to play against {n}, then the turn passes.",
  "{n} ora": "{n} hour", "{n} ore": "{n} hours", "{n} minuti": "{n} minutes",
  "Mago Blu": "Blue Wizard", "Mago Rosso": "Red Wizard", "Automa": "Automaton", "Automa (facile)": "Automaton (easy)",
}

patch("server.js", [
 ('''const dict = loadDict(path.join(PUBLIC, "parole.txt"));
G.setDict(dict);''', '''// un dizionario per lingua della partita
const dict = loadDict(path.join(PUBLIC, "parole.txt"));
G.setDict(dict, "it");
G.setDict(loadDict(path.join(PUBLIC, "words-en.txt")), "en");'''),
 ('''CREATE TABLE IF NOT EXISTS subs (endpoint TEXT PRIMARY KEY, player TEXT NOT NULL, json TEXT NOT NULL, created INTEGER NOT NULL);
`);''', '''CREATE TABLE IF NOT EXISTS subs (endpoint TEXT PRIMARY KEY, player TEXT NOT NULL, json TEXT NOT NULL, created INTEGER NOT NULL);
`);
// lingua dell'interfaccia di ogni giocatore (per le notifiche): colonna aggiunta con l'inglese
if (!db.prepare("PRAGMA table_info(players)").all().some(c => c.name === "lingua")) db.exec("ALTER TABLE players ADD COLUMN lingua TEXT NOT NULL DEFAULT 'it'");'''),
 ('''  setName: db.prepare("UPDATE players SET name = ? WHERE id = ?"),''', '''  setName: db.prepare("UPDATE players SET name = ? WHERE id = ?"),
  setLingua: db.prepare("UPDATE players SET lingua = ? WHERE id = ?"),'''),
 ('''function fail(status, message) { const e = new Error(message); e.status = status; return e; }''',
  '''function fail(status, message, a) { const e = new Error(message); e.status = status; e.a = a; return e; }
// ---------- lingue: messaggi del server in italiano (chiave) e inglese ----------
const SRV_EN = ''' + json.dumps(SRV_EN, ensure_ascii=False, indent=0).replace("\n", "\n  ").replace("\n  }", "\n}") + ''';
function trS(msg, l, a) {
  let x = l === "en" && SRV_EN[msg] !== undefined ? SRV_EN[msg] : msg;
  if (a) x = x.replace(/\\{(\\w+)\\}/g, (_, k) => a[k] === undefined ? "" : String(a[k]));
  return x;
}
function linguaReq(req) { return req.headers["x-lingua"] === "en" ? "en" : "it"; }
function linguaOf(pid) { const p = Q.getPlayer.get(pid); return p && p.lingua === "en" ? "en" : "it"; }'''),
 # notifiche: il testo si compone nella lingua di chi le riceve
 ('''function pushTo(pid, payload) {
  for (const row of Q.subsOf.all(pid)) {
    webpush.sendNotification(JSON.parse(row.json), JSON.stringify(payload), { TTL: 86400 })''', '''function pushTo(pid, payload) {
  if (typeof payload.body === "function") payload = Object.assign({}, payload, { body: payload.body(linguaOf(pid)) });
  for (const row of Q.subsOf.all(pid)) {
    webpush.sendNotification(JSON.parse(row.json), JSON.stringify(payload), { TTL: 86400 })'''),
 ('''function nameOf(s, p) { return (s.seats[p] && s.seats[p].nome) || (p === "A" ? "Mago Blu" : "Mago Rosso"); }''',
  '''function nameOf(s, p, l) {
  const x = s.seats[p];
  if (x && x.cpu) return trS(x.livello === "facile" ? "Automa (facile)" : "Automa", l);
  return (x && x.nome) || trS(p === "A" ? "Mago Blu" : "Mago Rosso", l);
}'''),
 ('''body: s.winner === p ? "Hai vinto contro " + nameOf(s, G.enemy(p)) + "!" : nameOf(s, s.winner) + " ha vinto la partita.", url, tag: id });''',
  '''body: l => s.winner === p ? trS("Hai vinto contro {n}!", l, { n: nameOf(s, G.enemy(p), l) }) : trS("{n} ha vinto la partita.", l, { n: nameOf(s, s.winner, l) }), url, tag: id });'''),
 ('''body: "Tocca a te contro " + nameOf(s, G.enemy(s.turn)) + ".", url, tag: id });''',
  '''body: l => trS("Tocca a te contro {n}.", l, { n: nameOf(s, G.enemy(s.turn), l) }), url, tag: id });'''),
 ('''body: p.name + " ha accettato la sfida. Tocca a te!", url: "/#g=" + id, tag: id });''',
  '''body: l => trS("{n} ha accettato la sfida. Tocca a te!", l, { n: p.name }), url: "/#g=" + id, tag: id });'''),
 ('''body: "Tempo scaduto contro " + nameOf(s, G.enemy(seat)) + ": hai perso il turno. Se scade di nuovo, perdi la partita.", url, tag: id + "-t" });''',
  '''body: l => trS("Tempo scaduto contro {n}: hai perso il turno. Se scade di nuovo, perdi la partita.", l, { n: nameOf(s, G.enemy(seat), l) }), url, tag: id + "-t" });'''),
 ('''body: "Ti restano " + fmtHours(s.deadline - now) + " per giocare contro " + nameOf(s, G.enemy(s.turn)) + ", poi il turno passa.",''',
  '''body: l => trS("Ti restano {t} per giocare contro {n}, poi il turno passa.", l, { t: fmtHours(s.deadline - now, l), n: nameOf(s, G.enemy(s.turn), l) }),'''),
 ('''function fmtHours(ms) { const h = Math.round(ms / 3600e3); return h >= 1 ? h + (h === 1 ? " ora" : " ore") : Math.max(1, Math.round(ms / 60e3)) + " minuti"; }''',
  '''function fmtHours(ms, l) { const h = Math.round(ms / 3600e3); return h >= 1 ? trS(h === 1 ? "{n} ora" : "{n} ore", l, { n: h }) : trS("{n} minuti", l, { n: Math.max(1, Math.round(ms / 60e3)) }); }'''),
 # cronaca strutturata: il client la scrive nella lingua di chi guarda
 ('''g2.s.log.push("Suggerimento non riuscito: " + r.costo + " PV restituiti.");''', '''g2.s.log.push({ k: "suggFallito", a: { n: r.costo } });'''),
 ('''s.log.push(nameOf(s, seat) + " abbandona la partita. Vince " + nameOf(s, s.winner) + ".");''', '''s.log.push({ k: "abbandona", a: { p: seat, q: s.winner } });'''),
 ('''t.log[t.log.length - 1] = "Tempo scaduto per " + who + ": il turno passa.";''', '''t.log[t.log.length - 1] = { k: "tempoScaduto", a: { p: seat } };'''),
 ('''t.log.push(who + " ha lasciato scadere il tempo " + MAX_TIMEOUTS + " volte di fila. Vince " + nameOf(t, t.winner) + ".");''', '''t.log.push({ k: "tempoPerso", a: { p: seat, n: MAX_TIMEOUTS, q: t.winner } });'''),
 ('''      const seat = s.turn, who = nameOf(s, seat), url = "/#g=" + id;''', '''      const seat = s.turn, url = "/#g=" + id;'''),
 # errori nella lingua della richiesta; la lingua del giocatore si aggiorna a ogni richiesta
 ('''  const method = req.method, me = authReq(req);''', '''  const method = req.method, me = authReq(req), L = linguaReq(req);
  if (me && me.lingua !== L) { Q.setLingua.run(L, me.id); me.lingua = L; }'''),
 ('''    Q.addPlayer.run(id, sha(secret), name, now);''', '''    Q.addPlayer.run(id, sha(secret), name, now);
    if (L !== "it") Q.setLingua.run(L, id);'''),
 ('''throw fail(429, "Hai già " + active.length + " partite in corso: finiscine o abbandonane qualcuna.");''', '''throw fail(429, "Hai già {n} partite in corso: finiscine o abbandonane qualcuna.", { n: active.length });'''),
 ('''throw fail(429, "Hai già " + LIMITS.activeCpuGamesPerPlayer + " partite in corso contro il computer.");''', '''throw fail(429, "Hai già {n} partite in corso contro il computer.", { n: LIMITS.activeCpuGamesPerPlayer });'''),
 ('''      // regole: s1 (semplificate, predefinite) oppure v5f (classiche, con lessico)
      const regole = body.regole === "v5f" ? "v5f" : "s1";''', '''      // lingua delle parole: italiano o inglese (in inglese solo s1); regole: s1 (predefinite) oppure v5f (classiche, con lessico)
      const lingua = body.lingua === "en" ? "en" : "it";
      const regole = lingua === "it" && body.regole === "v5f" ? "v5f" : "s1";'''),
 ('''      G.applyCfg(Object.assign({}, G.PRESETS[regole], { hp }));''', '''      G.applyCfg(Object.assign({}, G.PRESETS[regole], { hp, lingua }));'''),
 ('''      const body = await readBody(req); return sendJson(res, 200, doMove(id, p, body));''', '''      const body = await readBody(req); G.setLinguaUI(L); return sendJson(res, 200, doMove(id, p, body));'''),
 ('''      const r = G.suggerisci(s, seat); if (!r.ok) throw fail(422, r.err);''', '''      G.setLinguaUI(L);
      const r = G.suggerisci(s, seat); if (!r.ok) throw fail(422, r.err);'''),
 ('''hint = { kind: "errore", message: "il suggeritore non ha risposto, i PV ti sono stati restituiti" };''', '''hint = { kind: "errore", message: trS("il suggeritore non ha risposto, i PV ti sono stati restituiti", L) };'''),
 ('''    sendJson(res, e.status || 500, { error: e.status ? e.message : "Errore del server." });''', '''    const l = linguaReq(req);
    sendJson(res, e.status || 500, { error: e.status ? trS(e.message, l, e.a) : trS("Errore del server.", l) });'''),
 ('''rel === "/parole.txt" ? "public, max-age=604800"''', '''(rel === "/parole.txt" || rel === "/words-en.txt") ? "public, max-age=604800"'''),
])

patch("ai-worker.js", [
 ('''const dict = loadDict(path.join(__dirname, "public", "parole.txt"));
G.setDict(dict);
const AI = createAI(G, dict);''', '''// un dizionario (e un giocatore) per lingua della partita
const AIS = {};
for (const [l, file] of [["it", "parole.txt"], ["en", "words-en.txt"]]) {
  const dict = loadDict(path.join(__dirname, "public", file));
  G.setDict(dict, l);
  AIS[l] = createAI(G, dict);
}'''),
 ('''    G.applyCfg(job.state.cfg || {});
    const move = AI.choose(job.state, job.seat, job.level);''', '''    G.applyCfg(job.state.cfg || {});
    const AI = AIS[G.CFG.lingua] || AIS.it;
    const move = AI.choose(job.state, job.seat, job.level);'''),
])
patch(os.path.join("public", "sw.js"), [
 ('''const CACHE = "grimorio-v10";''', '''const CACHE = "grimorio-v11";'''),
 ('''(url.pathname === "/parole.txt" || url.pathname.startsWith("/icon")''', '''(url.pathname === "/parole.txt" || url.pathname === "/words-en.txt" || url.pathname.startsWith("/icon")'''),
])
patch("ai-core.js", [
 ('''    for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {''', '''    if (G.CFG.lingua === "it") for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {'''),
])
print("ok")
