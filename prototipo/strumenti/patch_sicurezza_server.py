# Rafforza il server di Grimorio contro gli abusi.
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a))
    s = s.replace(a, b)

def rep_range(start, end, new):
    global s
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + new + s[j:]

rep('''const { WebSocketServer } = require("ws");''', '''const { WebSocketServer } = require("ws");
const { Worker } = require("worker_threads");''')

# ---------- limiti ----------
rep('''// ---------- aiuti ----------''', '''// ---------- limiti contro gli abusi ----------
const LIMITS = {
  apiPerIpPerMin: 240,          // richieste all'API per indirizzo IP al minuto
  signupsPerIpPerHour: 20,      // nuovi giocatori per indirizzo IP all'ora
  movesPerPlayerPerMin: 40,     // mosse per giocatore al minuto
  gamesPerPlayerPerHour: 15,    // partite create per giocatore all'ora
  activeGamesPerPlayer: 40,     // partite non finite per giocatore
  activeCpuGamesPerPlayer: 5,   // partite non finite contro il computer
  subsPerPlayer: 5,             // dispositivi con notifiche per giocatore
  socketsPerPlayer: 6,          // connessioni in tempo reale per giocatore
  socketsPerIp: 30,             // connessioni in tempo reale per indirizzo IP
  cpuQueueMax: 200              // turni del computer in attesa
};
// contatori a finestra fissa: chiave -> { n, reset }
const counters = new Map();
function hit(key, limit, windowMs) {
  const now = Date.now(); let c = counters.get(key);
  if (!c || c.reset <= now) { c = { n: 0, reset: now + windowMs }; counters.set(key, c); }
  c.n++;
  return c.n <= limit;
}
setInterval(() => { const now = Date.now(); for (const [k, c] of counters) if (c.reset <= now) counters.delete(k); }, 60000).unref();
// servizi di notifica ammessi: il server non contatta nessun altro indirizzo
const PUSH_HOSTS = /(^|\\.)(fcm\\.googleapis\\.com|android\\.googleapis\\.com|push\\.services\\.mozilla\\.com|notify\\.windows\\.com|push\\.apple\\.com)$/;

// ---------- aiuti ----------''')

# nomi: niente caratteri invisibili o di inversione del testo
rep('''function cleanName(n) { return String(n || "").replace(/[\\u0000-\\u001f<>]/g, "").trim().slice(0, 24); }''',
    '''function cleanName(n) { return String(n || "").normalize("NFC").replace(/[\\u0000-\\u001f\\u007f-\\u009f<>\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2069\\ufeff]/g, "").replace(/\\s+/g, " ").trim().slice(0, 24); }''')

# IP reale: l'ultimo valore aggiunto da Apache, solo se la richiesta arriva da Apache stesso
rep('''function clientIp(req) { return (HOST === "127.0.0.1" && req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0].trim() : req.socket.remoteAddress) || "?"; }''',
    '''function clientIp(req) {
  const direct = req.socket.remoteAddress || "?";
  const xff = req.headers["x-forwarded-for"];
  if (xff && (direct === "127.0.0.1" || direct === "::1" || direct === "::ffff:127.0.0.1")) { const parts = xff.split(",").map(x => x.trim()).filter(Boolean); return parts[parts.length - 1] || direct; }
  return direct;
}''')
rep('''    const ip = clientIp(req), now = Date.now();
    const recent = (signupLog.get(ip) || []).filter(t => now - t < 3600e3);
    if (recent.length >= 30) throw fail(429, "Troppe registrazioni da questa rete: riprova più tardi.");
    recent.push(now); signupLog.set(ip, recent);
    const body = await readBody(req);''', '''    const now = Date.now();
    if (!hit("signup:" + clientIp(req), LIMITS.signupsPerIpPerHour, 3600e3)) throw fail(429, "Troppe registrazioni da questa rete: riprova più tardi.");
    const body = await readBody(req);''')
rep('''const signupLog = new Map(); // indirizzo -> orari di registrazione (limite anti abuso)\n''', '')

# limite generale sull'API
rep('''async function api(req, res, parts) {
  const method = req.method, me = authReq(req);''', '''async function api(req, res, parts) {
  if (!hit("api:" + clientIp(req), LIMITS.apiPerIpPerMin, 60e3)) throw fail(429, "Troppe richieste: rallenta un attimo e riprova.");
  const method = req.method, me = authReq(req);''')

# nuovo codice di accesso (scollega gli altri dispositivi)
rep('''    if (method === "POST") { const body = await readBody(req); const name = cleanName(body.name); if (name) Q.setName.run(name, p.id); return sendJson(res, 200, { id: p.id, name: name || p.name }); }''',
    '''    if (method === "POST" && parts[1] === "rotate") {
      const secret = secretToken();
      Q.setSecret.run(sha(secret), p.id);
      for (const ws of socketsOf.get(p.id) || []) ws.close(4001, "nuovo codice");
      return sendJson(res, 200, { token: p.id + "." + secret });
    }
    if (method === "POST" && parts.length === 1) { const body = await readBody(req); const name = cleanName(body.name); if (name) Q.setName.run(name, p.id); return sendJson(res, 200, { id: p.id, name: name || p.name }); }''')
rep('''  setName: db.prepare("UPDATE players SET name = ? WHERE id = ?"),''', '''  setName: db.prepare("UPDATE players SET name = ? WHERE id = ?"),
  setSecret: db.prepare("UPDATE players SET secret = ? WHERE id = ?"),
  activeOf: db.prepare("SELECT state FROM games WHERE (a = ? OR b = ? OR (a = ? AND b IS NULL)) AND json_extract(state, '$.winner') IS NULL"),
  countSubs: db.prepare("SELECT endpoint FROM subs WHERE player = ? ORDER BY created ASC"),
  cleanFinished: db.prepare("DELETE FROM games WHERE json_extract(state, '$.winner') IS NOT NULL AND updated < ?"),
  cleanUnstarted: db.prepare("DELETE FROM games WHERE b IS NULL AND json_extract(state, '$.seats.B') IS NULL AND updated < ?"),
  cleanIdle: db.prepare("DELETE FROM games WHERE updated < ?"),
  cleanPlayers: db.prepare("DELETE FROM players WHERE created < ? AND NOT EXISTS (SELECT 1 FROM games WHERE games.a = players.id OR games.b = players.id)"),
  cleanSubs: db.prepare("DELETE FROM subs WHERE NOT EXISTS (SELECT 1 FROM players WHERE players.id = subs.player)"),''')
rep('''  myGames: db.prepare("SELECT * FROM games WHERE (a = ? OR b = ?) AND instr(hidden, ?) = 0 ORDER BY updated DESC LIMIT 60"),''',
    '''  myGames: db.prepare("SELECT * FROM games WHERE (a = ? OR b = ?) AND instr(hidden, ',' || ?) = 0 ORDER BY updated DESC LIMIT 60"),''')

# notifiche: solo verso i servizi ufficiali, massimo 5 dispositivi
rep('''      if (!sub || typeof sub.endpoint !== "string" || !/^https:\\/\\//.test(sub.endpoint) || !sub.keys) throw fail(400, "Iscrizione non valida.");
      Q.addSub.run(''', '''      if (!sub || typeof sub.endpoint !== "string" || sub.endpoint.length > 1000 || !sub.keys || typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string" || sub.keys.p256dh.length > 200 || sub.keys.auth.length > 100) throw fail(400, "Iscrizione non valida.");
      let host; try { const u = new URL(sub.endpoint); if (u.protocol !== "https:" || u.port) throw 0; host = u.hostname; } catch (e) { throw fail(400, "Iscrizione non valida."); }
      if (!PUSH_HOSTS.test(host)) throw fail(400, "Servizio di notifica non riconosciuto.");
      const existing = Q.countSubs.all(p.id).filter(r => r.endpoint !== sub.endpoint);
      for (const r of existing.slice(0, Math.max(0, existing.length - (LIMITS.subsPerPlayer - 1)))) Q.delSub.run(r.endpoint);
      Q.addSub.run(''')
rep('''    if (parts[1] === "unsubscribe" && method === "POST") { const body = await readBody(req); if (body.endpoint) Q.delSub.run(String(body.endpoint)); return sendJson(res, 200, { ok: true }); }''',
    '''    if (parts[1] === "unsubscribe" && method === "POST") { const body = await readBody(req); const row = body.endpoint ? Q.countSubs.all(p.id).find(r => r.endpoint === String(body.endpoint)) : null; if (row) Q.delSub.run(row.endpoint); return sendJson(res, 200, { ok: true }); }''')

# creazione partite: limiti
rep('''      const p = needMe(), body = await readBody(req);
      const hp = [20, 25, 30].includes(+body.hp) ? +body.hp : 30;''', '''      const p = needMe(), body = await readBody(req);
      const cpu = body.vs === "facile" || body.vs === "normale";
      const active = Q.activeOf.all(p.id, p.id, p.id).map(r => JSON.parse(r.state));
      if (active.length >= LIMITS.activeGamesPerPlayer) throw fail(429, "Hai già " + active.length + " partite in corso: finiscine o abbandonane qualcuna.");
      if (cpu && active.filter(s => s.seats.B && s.seats.B.cpu).length >= LIMITS.activeCpuGamesPerPlayer) throw fail(429, "Hai già " + LIMITS.activeCpuGamesPerPlayer + " partite in corso contro il computer.");
      if (!hit("games:" + p.id, LIMITS.gamesPerPlayerPerHour, 3600e3)) throw fail(429, "Hai creato molte partite nell'ultima ora: riprova più tardi.");
      const hp = [20, 25, 30].includes(+body.hp) ? +body.hp : 30;''')
rep('''      if (body.vs === "facile" || body.vs === "normale") s.seats.B''', '''      if (cpu) s.seats.B''')

# mosse: limite per giocatore
rep('''    if (parts[2] === "move" && method === "POST") { const p = needMe(), body = await readBody(req); return sendJson(res, 200, doMove(id, p, body)); }''',
    '''    if (parts[2] === "move" && method === "POST") {
      const p = needMe();
      if (!hit("move:" + p.id, LIMITS.movesPerPlayerPerMin, 60e3)) throw fail(429, "Troppe mosse in poco tempo: rallenta un attimo.");
      const body = await readBody(req); return sendJson(res, 200, doMove(id, p, body));
    }''')

# ---------- il computer pensa in un thread separato, una partita alla volta ----------
rep_range('// ---------- il computer gioca sul server ----------', '// ---------- azioni ----------', '''// ---------- il computer gioca sul server (in un thread separato) ----------
let aiWorker = null, aiBusy = null;   // aiBusy: { id, timer } della partita in elaborazione
const cpuQueue = [];                  // partite in attesa del turno del computer
function startAiWorker() {
  aiWorker = new Worker(path.join(__dirname, "ai-worker.js"));
  aiWorker.on("message", m => { if (m.ready) return pumpCpu(); onAiResult(m); });
  aiWorker.on("error", e => console.error("errore nel thread del computer:", e));
  aiWorker.on("exit", code => {
    console.error("il thread del computer si è fermato (" + code + "): lo riavvio");
    if (aiBusy) { clearTimeout(aiBusy.timer); aiBusy = null; }
    setTimeout(startAiWorker, 2000);
  });
}
function scheduleCpu(id, s) {
  if (s.winner || !s.seats[s.turn] || !s.seats[s.turn].cpu) return;
  if (cpuQueue.includes(id) || (aiBusy && aiBusy.id === id)) return;
  if (cpuQueue.length >= LIMITS.cpuQueueMax) { console.error("coda del computer piena, partita", id, "rimandata"); return setTimeout(() => { const g = loadGame(id); if (g) scheduleCpu(id, g.s); }, 30000); }
  setTimeout(() => { if (!cpuQueue.includes(id)) { cpuQueue.push(id); pumpCpu(); } }, 1200); // una pausa: l'animazione della mossa resta visibile
}
function pumpCpu() {
  if (!aiWorker || aiBusy || !cpuQueue.length) return;
  const id = cpuQueue.shift(), g = loadGame(id);
  if (!g) return pumpCpu();
  const s = g.s, seat = s.turn;
  if (s.winner || !s.seats[seat] || !s.seats[seat].cpu) return pumpCpu();
  // se il calcolo si blocca, il thread viene riavviato
  aiBusy = { id, moveNo: s.moveNo, timer: setTimeout(() => { console.error("il computer ci mette troppo nella partita", id); aiWorker.terminate(); }, 60000) };
  aiWorker.postMessage({ id, state: s, seat, level: s.seats[seat].livello || "normale" });
}
function onAiResult(m) {
  if (!aiBusy || aiBusy.id !== m.id) return;
  clearTimeout(aiBusy.timer);
  const moveNo = aiBusy.moveNo; aiBusy = null;
  try {
    const g = loadGame(m.id);
    if (g && g.s.moveNo === moveNo && !g.s.winner) {
      const s = g.s, seat = s.turn; G.applyCfg(s.cfg || BASE_RULES);
      const mv = m.move || { kind: "pass" };
      if (m.error) console.error("errore del computer nella partita", m.id, m.error);
      let r = mv.kind === "play" ? G.play(s, seat, mv.placed, mv.opts, rng) : mv.kind === "alchimia" ? G.alchimia(s, seat, rng, mv.letters || undefined) : G.pass(s, seat, rng);
      if (!r || !r.ok) r = G.pass(s, seat, rng);
      commitState(m.id, r.state);
    }
  } catch (e) { console.error("errore applicando la mossa del computer", m.id, e); }
  setImmediate(pumpCpu);
}

''')
rep('''// riprende i turni del computer rimasti in sospeso (per esempio dopo un riavvio)
for (const row of Q.allGames.all()) { try { const s = JSON.parse(row.state); scheduleCpu(row.id, s); } catch (e) {} }''',
'''// avvia il thread del computer e riprende i turni rimasti in sospeso (per esempio dopo un riavvio)
startAiWorker();
for (const row of Q.allGames.all()) { try { const s = JSON.parse(row.state); scheduleCpu(row.id, s); } catch (e) {} }

// pulizia quotidiana: partite finite da 90 giorni, mai iniziate da 14, ferme da 180; giocatori senza partite
function cleanup() {
  const day = 86400e3, now = Date.now();
  try {
    const a = Q.cleanFinished.run(now - 90 * day).changes, b = Q.cleanUnstarted.run(now - 14 * day).changes, c = Q.cleanIdle.run(now - 180 * day).changes;
    const d = Q.cleanPlayers.run(now - 30 * day).changes; Q.cleanSubs.run();
    if (a + b + c + d) console.log("pulizia: partite tolte " + (a + b + c) + ", giocatori tolti " + d);
  } catch (e) { console.error("pulizia non riuscita", e); }
}
setTimeout(cleanup, 60e3).unref();
setInterval(cleanup, 86400e3).unref();''')

# ---------- intestazioni di sicurezza ----------
rep('''function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });''',
'''// il browser carica solo ciò che viene da questo sito; la pagina non può essere incorporata altrove
function securityHeaders(req) {
  const host = /^[a-z0-9.-]+(:\\d+)?$/i.test(req.headers.host || "") ? req.headers.host : "";
  const h = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'" + (host ? " wss://" + host + " ws://" + host : "") + "; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin"
  };
  if (SITE.startsWith("https:")) h["Strict-Transport-Security"] = "max-age=15552000";
  return h;
}
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign(securityHeaders(res.req), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }));''')
rep('''  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }''', '''  const file = path.normalize(path.join(PUBLIC, rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }''')
rep('''    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });''',
    '''    res.writeHead(200, Object.assign(securityHeaders(req), { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache }));''')
rep('''const MIME = { ".html": "text/html; charset=utf-8",''', '''const MIME = { ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8",''')

# ---------- WebSocket: limiti per IP e per giocatore, chi non si presenta viene chiuso ----------
rep('''wss.on("connection", ws => {
  ws.pid = null; ws.visible = true; ws.watching = new Set(); ws.alive = true;''', '''const socketsPerIp = new Map();
wss.on("connection", (ws, req) => {
  const ip = clientIp(req);
  const nIp = (socketsPerIp.get(ip) || 0) + 1;
  if (nIp > LIMITS.socketsPerIp) { ws.close(1013, "troppe connessioni"); return; }
  socketsPerIp.set(ip, nIp);
  ws.on("close", () => { const n = (socketsPerIp.get(ip) || 1) - 1; if (n <= 0) socketsPerIp.delete(ip); else socketsPerIp.set(ip, n); });
  ws.pid = null; ws.visible = true; ws.watching = new Set(); ws.alive = true;
  const helloTimer = setTimeout(() => { if (!ws.pid) ws.close(4000, "accesso mancante"); }, 20000);''')
rep('''      ws.pid = p.id;
      if (!socketsOf.has(p.id)) socketsOf.set(p.id, new Set());
      socketsOf.get(p.id).add(ws);''', '''      if (ws.pid) return;
      clearTimeout(helloTimer);
      ws.pid = p.id;
      if (!socketsOf.has(p.id)) socketsOf.set(p.id, new Set());
      const mine = socketsOf.get(p.id);
      if (mine.size >= LIMITS.socketsPerPlayer) { const oldest = mine.values().next().value; mine.delete(oldest); oldest.close(4002, "troppe connessioni"); }
      mine.add(ws);''')
rep('''    } else if (m.type === "watch" && typeof m.id === "string") {''', '''    } else if (m.type === "watch" && typeof m.id === "string" && /^[a-z0-9]{6,20}$/.test(m.id)) {''')
rep('''  ws.on("close", () => {
    if (ws.pid''', '''  ws.on("close", () => {
    clearTimeout(helloTimer);
    if (ws.pid''')

open(p, "w", encoding="utf-8").write(s)
print("ok")
