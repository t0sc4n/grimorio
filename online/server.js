// Grimorio — server di gioco: arbitro delle partite, aggiornamenti in tempo reale, notifiche push.
// Avvio: node server.js   (variabili: PORT, HOST, DATA_DIR, SITE_URL, VAPID_SUBJECT)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const { WebSocketServer } = require("ws");
const { Worker } = require("worker_threads");
const webpush = require("web-push");
const G = require("./public/engine.js");
const { loadDict } = require("./dict.js");

const PORT = +(process.env.PORT || 3077);
const HOST = process.env.HOST || "127.0.0.1";
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
const PUBLIC = path.join(__dirname, "public");
const SITE = (process.env.SITE_URL || "http://localhost:" + PORT).replace(/\/$/, "");
const BASE_RULES = G.PRESETS.v5f;
// tempo per turno nelle partite tra due persone; promemoria quando ne restano 12 ore
const TURN_MS = Math.round(+(process.env.TURN_HOURS || 48) * 3600e3);
const REMIND_MS = Math.min(12 * 3600e3, TURN_MS / 4);
const MAX_TIMEOUTS = 2; // turni scaduti di fila che fanno perdere la partita
fs.mkdirSync(DATA, { recursive: true });

// ---------- dizionario (il giocatore automatico vive in ai-worker.js) ----------
const dict = loadDict(path.join(PUBLIC, "parole.txt"));
G.setDict(dict);

// ---------- archivio ----------
const db = new DatabaseSync(path.join(DATA, "grimorio.db"));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, secret TEXT NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, state TEXT NOT NULL, a TEXT, b TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL, hidden TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS games_a ON games(a);
CREATE INDEX IF NOT EXISTS games_b ON games(b);
CREATE TABLE IF NOT EXISTS subs (endpoint TEXT PRIMARY KEY, player TEXT NOT NULL, json TEXT NOT NULL, created INTEGER NOT NULL);
`);
const Q = {
  addPlayer: db.prepare("INSERT INTO players (id, secret, name, created) VALUES (?, ?, ?, ?)"),
  getPlayer: db.prepare("SELECT * FROM players WHERE id = ?"),
  setName: db.prepare("UPDATE players SET name = ? WHERE id = ?"),
  setSecret: db.prepare("UPDATE players SET secret = ? WHERE id = ?"),
  activeOf: db.prepare("SELECT state FROM games WHERE (a = ? OR b = ? OR (a = ? AND b IS NULL)) AND json_extract(state, '$.winner') IS NULL"),
  countSubs: db.prepare("SELECT endpoint FROM subs WHERE player = ? ORDER BY created ASC"),
  cleanFinished: db.prepare("DELETE FROM games WHERE json_extract(state, '$.winner') IS NOT NULL AND updated < ?"),
  cleanUnstarted: db.prepare("DELETE FROM games WHERE b IS NULL AND json_extract(state, '$.seats.B') IS NULL AND updated < ?"),
  cleanIdle: db.prepare("DELETE FROM games WHERE updated < ?"),
  cleanPlayers: db.prepare("DELETE FROM players WHERE created < ? AND NOT EXISTS (SELECT 1 FROM games WHERE games.a = players.id OR games.b = players.id)"),
  cleanSubs: db.prepare("DELETE FROM subs WHERE NOT EXISTS (SELECT 1 FROM players WHERE players.id = subs.player)"),
  addGame: db.prepare("INSERT INTO games (id, state, a, b, created, updated) VALUES (?, ?, ?, ?, ?, ?)"),
  getGame: db.prepare("SELECT * FROM games WHERE id = ?"),
  updGame: db.prepare("UPDATE games SET state = ?, a = ?, b = ?, updated = ? WHERE id = ?"),
  hideGame: db.prepare("UPDATE games SET hidden = hidden || ? WHERE id = ?"),
  delGame: db.prepare("DELETE FROM games WHERE id = ?"),
  myGames: db.prepare("SELECT * FROM games WHERE (a = ? OR b = ?) AND instr(hidden, ',' || ?) = 0 ORDER BY updated DESC LIMIT 60"),
  allGames: db.prepare("SELECT id, state FROM games"),
  expired: db.prepare("SELECT id FROM games WHERE json_extract(state, '$.winner') IS NULL AND json_extract(state, '$.deadline') <= ?"),
  toRemind: db.prepare("SELECT id FROM games WHERE json_extract(state, '$.winner') IS NULL AND json_extract(state, '$.deadline') <= ? AND IFNULL(json_extract(state, '$.reminded'), 0) = 0"),
  setState: db.prepare("UPDATE games SET state = ? WHERE id = ?"),
  addSub: db.prepare("INSERT OR REPLACE INTO subs (endpoint, player, json, created) VALUES (?, ?, ?, ?)"),
  delSub: db.prepare("DELETE FROM subs WHERE endpoint = ?"),
  subsOf: db.prepare("SELECT * FROM subs WHERE player = ?")
};

// ---------- notifiche push (chiavi VAPID create al primo avvio) ----------
const vapidFile = path.join(DATA, "vapid.json");
let vapid;
try { vapid = JSON.parse(fs.readFileSync(vapidFile, "utf8")); }
catch (e) { vapid = webpush.generateVAPIDKeys(); fs.writeFileSync(vapidFile, JSON.stringify(vapid), { mode: 0o600 }); }
webpush.setVapidDetails(process.env.VAPID_SUBJECT || (SITE.startsWith("https:") ? SITE : "mailto:grimorio@example.invalid"), vapid.publicKey, vapid.privateKey);

// ---------- limiti contro gli abusi ----------
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
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)$/;

// ---------- aiuti ----------
const ALFA = "abcdefghijkmnpqrstuvwxyz23456789";
function rid(n) { let s = ""; for (const x of crypto.randomBytes(n)) s += ALFA[x % ALFA.length]; return s; }
function secretToken() { return crypto.randomBytes(24).toString("hex"); }
const sha = s => crypto.createHash("sha256").update(s).digest("hex");
const rng = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;
function fail(status, message) { const e = new Error(message); e.status = status; return e; }
function cleanName(n) { return String(n || "").normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f<>\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "").replace(/\s+/g, " ").trim().slice(0, 24); }
const clone = o => JSON.parse(JSON.stringify(o));

function authToken(token) {
  const m = /^([a-z0-9]{6,20})\.([a-f0-9]{48})$/.exec(token || "");
  if (!m) return null;
  const p = Q.getPlayer.get(m[1]);
  if (!p) return null;
  const a = Buffer.from(p.secret), b = Buffer.from(sha(m[2]));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? p : null;
}
function authReq(req) { const h = req.headers.authorization || ""; return h.startsWith("Bearer ") ? authToken(h.slice(7)) : null; }

function seatOf(s, pid) {
  const a = s.seats.A && s.seats.A.tok === pid, b = s.seats.B && s.seats.B.tok === pid;
  if (a && b) return s.turn;
  return a ? "A" : b ? "B" : null;
}
// ciò che un giocatore può vedere: la mano dell'avversario e la Sacca restano coperte
function viewFor(s, pid) {
  const v = clone(s);
  for (const p of ["A", "B"]) if (!(s.seats[p] && s.seats[p].tok === pid)) v.hands[p] = v.hands[p].map(() => "?");
  v.bag = v.bag.map(() => "?");
  v.focolare = v.focolare.map(() => "?");
  return v;
}
function loadGame(id) { const row = Q.getGame.get(id); return row ? { row, s: JSON.parse(row.state) } : null; }

// ---------- tempo reale ----------
const socketsOf = new Map(); // giocatore -> Set di connessioni
const watchersOf = new Map(); // partita -> Set di connessioni
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcast(id, s, updated) {
  const targets = new Set(watchersOf.get(id) || []);
  for (const p of ["A", "B"]) { const t = s.seats[p]; if (t && !t.cpu) for (const ws of socketsOf.get(t.tok) || []) targets.add(ws); }
  for (const ws of targets) send(ws, { type: "game", id, s: viewFor(s, ws.pid), updated });
}
// il giocatore sta guardando questa partita adesso? allora niente notifica
function isLooking(pid, id) { for (const ws of socketsOf.get(pid) || []) if (ws.visible && ws.watching.has(id)) return true; return false; }
function pushTo(pid, payload) {
  for (const row of Q.subsOf.all(pid)) {
    webpush.sendNotification(JSON.parse(row.json), JSON.stringify(payload), { TTL: 86400 })
      .catch(e => { if (e.statusCode === 404 || e.statusCode === 410) Q.delSub.run(row.endpoint); });
  }
}
function nameOf(s, p) { return (s.seats[p] && s.seats[p].nome) || (p === "A" ? "Mago Blu" : "Mago Rosso"); }
function notifyAfterMove(id, s) {
  const url = "/#g=" + id;
  if (s.winner) {
    for (const p of ["A", "B"]) {
      const t = s.seats[p]; if (!t || t.cpu || isLooking(t.tok, id)) continue;
      pushTo(t.tok, { title: "Grimorio", body: s.winner === p ? "Hai vinto contro " + nameOf(s, G.enemy(p)) + "!" : nameOf(s, s.winner) + " ha vinto la partita.", url, tag: id });
    }
    return;
  }
  const t = s.seats[s.turn], other = s.seats[G.enemy(s.turn)];
  if (!t || t.cpu || (other && other.tok === t.tok) || isLooking(t.tok, id)) return;
  pushTo(t.tok, { title: "Grimorio", body: "Tocca a te contro " + nameOf(s, G.enemy(s.turn)) + ".", url, tag: id });
}
// l'orologio corre solo tra due persone diverse; riparte a ogni nuovo turno
function setClock(s) {
  const a = s.seats.A, b = s.seats.B;
  if (s.winner || !a || !b || a.cpu || b.cpu || a.tok === b.tok) { delete s.deadline; delete s.clockMove; delete s.reminded; return; }
  if (s.clockMove !== s.moveNo) { s.clockMove = s.moveNo; s.deadline = Date.now() + TURN_MS; s.reminded = false; }
}
function commitState(id, s, quiet) {
  const now = Date.now();
  setClock(s);
  Q.updGame.run(JSON.stringify(s), s.seats.A ? s.seats.A.tok : null, s.seats.B ? s.seats.B.tok : null, now, id);
  broadcast(id, s, now);
  if (!quiet) notifyAfterMove(id, s);
  scheduleCpu(id, s);
  return now;
}

// ---------- il computer gioca sul server (in un thread separato) ----------
let aiWorker = null, aiBusy = null;   // aiBusy: { id, timer } della partita in elaborazione
const cpuQueue = [];                  // partite in attesa del turno del computer
function startAiWorker() {
  aiWorker = new Worker(path.join(__dirname, "ai-worker.js"));
  aiWorker.on("message", m => { if (m.ready) return pumpCpu(); onAiResult(m); });
  aiWorker.on("error", e => console.error("errore nel thread del computer:", e));
  aiWorker.on("exit", code => {
    console.error("il thread del computer si è fermato (" + code + "): lo riavvio");
    if (aiBusy) { clearTimeout(aiBusy.timer); if (aiBusy.hint) aiBusy.hint.reject(new Error("il suggeritore si è fermato")); aiBusy = null; }
    setTimeout(startAiWorker, 2000);
  });
}
function scheduleCpu(id, s) {
  if (s.winner || !s.seats[s.turn] || !s.seats[s.turn].cpu) return;
  if (cpuQueue.includes(id) || (aiBusy && aiBusy.id === id)) return;
  if (cpuQueue.length >= LIMITS.cpuQueueMax) { console.error("coda del computer piena, partita", id, "rimandata"); return setTimeout(() => { const g = loadGame(id); if (g) scheduleCpu(id, g.s); }, 30000); }
  setTimeout(() => { if (!cpuQueue.includes(id)) { cpuQueue.push(id); pumpCpu(); } }, 1200); // una pausa: l'animazione della mossa resta visibile
}
const hintQueue = []; // suggerimenti richiesti dai giocatori: { id, state, seat, resolve, reject }
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
  if (!cpuQueue.length) return;
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
  if (aiBusy.hint) {
    const j = aiBusy.hint; aiBusy = null;
    if (m.error) j.reject(new Error(m.error)); else j.resolve(m.move || { kind: "pass" });
    return setImmediate(pumpCpu);
  }
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

// ---------- azioni ----------
function cleanPlaced(list) {
  if (!Array.isArray(list) || !list.length || list.length > 11) throw fail(400, "Mossa non valida.");
  return list.map(t => {
    const r = +t.r, c = +t.c, l = String(t.l || "");
    if (!Number.isInteger(r) || !Number.isInteger(c) || !/^[A-Z]$/.test(l)) throw fail(400, "Mossa non valida.");
    return { r, c, l };
  });
}
function doMove(id, player, body) {
  const g = loadGame(id); if (!g) throw fail(404, "Partita non trovata.");
  const s = g.s; G.applyCfg(s.cfg || BASE_RULES);
  if (s.winner) throw fail(409, "La partita è finita.");
  const seat = seatOf(s, player.id);
  if (!seat) throw fail(403, "Non giochi in questa partita.");
  if (seat !== s.turn) throw fail(409, "Non è il tuo turno.");
  if (!s.seats[G.enemy(seat)]) throw fail(409, "Aspetta che arrivi lo sfidante.");
  if (body.moveNo !== s.moveNo) throw fail(409, "La partita è cambiata nel frattempo: la ricarico.");
  let r;
  if (body.kind === "play") {
    const o = body.opts || {};
    const opts = { falo: !!o.falo, consacra: !!o.consacra, attacca: !!o.attacca };
    if (typeof o.launch === "string" && /^\d{1,2},\d{1,2}$/.test(o.launch)) opts.launch = o.launch;
    r = G.play(s, seat, cleanPlaced(body.placed), opts, rng);
  } else if (body.kind === "alchimia") {
    const letters = Array.isArray(body.letters) ? body.letters.slice(0, 20).map(String) : undefined;
    r = G.alchimia(s, seat, rng, letters && letters.length ? letters : undefined);
  } else if (body.kind === "pass") r = G.pass(s, seat, rng);
  else throw fail(400, "Mossa sconosciuta.");
  if (!r.ok) throw fail(422, r.err);
  if (r.state.timeouts) r.state.timeouts[seat] = 0;
  const updated = commitState(id, r.state);
  return { id, s: viewFor(r.state, player.id), updated };
}

// ---------- HTTP ----------
const MIME = { ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
// il browser carica solo ciò che viene da questo sito; la pagina non può essere incorporata altrove
function securityHeaders(req) {
  const host = /^[a-z0-9.-]+(:\d+)?$/i.test(req.headers.host || "") ? req.headers.host : "";
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
  res.writeHead(status, Object.assign(securityHeaders(res.req), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > 32768) { reject(fail(413, "Richiesta troppo grande.")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (e) { reject(fail(400, "Richiesta non valida.")); } });
    req.on("error", reject);
  });
}
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Non trovato"); }
    const ext = path.extname(file);
    const cache = ext === ".html" || rel === "/sw.js" || ext === ".webmanifest" ? "no-cache" : rel === "/parole.txt" ? "public, max-age=604800" : "public, max-age=3600";
    res.writeHead(200, Object.assign(securityHeaders(req), { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache }));
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function clientIp(req) {
  const direct = req.socket.remoteAddress || "?";
  const xff = req.headers["x-forwarded-for"];
  if (xff && (direct === "127.0.0.1" || direct === "::1" || direct === "::ffff:127.0.0.1")) { const parts = xff.split(",").map(x => x.trim()).filter(Boolean); return parts[parts.length - 1] || direct; }
  return direct;
}

async function api(req, res, parts) {
  if (!hit("api:" + clientIp(req), LIMITS.apiPerIpPerMin, 60e3)) throw fail(429, "Troppe richieste: rallenta un attimo e riprova.");
  const method = req.method, me = authReq(req);
  const needMe = () => { if (!me) throw fail(401, "Accesso non valido: ricarica la pagina."); return me; };

  if (parts[0] === "players" && method === "POST" && parts.length === 1) {
    const now = Date.now();
    if (!hit("signup:" + clientIp(req), LIMITS.signupsPerIpPerHour, 3600e3)) throw fail(429, "Troppe registrazioni da questa rete: riprova più tardi.");
    const body = await readBody(req);
    const id = rid(12), secret = secretToken(), name = cleanName(body.name) || "Mago";
    Q.addPlayer.run(id, sha(secret), name, now);
    return sendJson(res, 201, { id, token: id + "." + secret, name });
  }
  if (parts[0] === "me") {
    const p = needMe();
    if (method === "GET") return sendJson(res, 200, { id: p.id, name: p.name });
    if (method === "POST" && parts[1] === "rotate") {
      const secret = secretToken();
      Q.setSecret.run(sha(secret), p.id);
      for (const ws of socketsOf.get(p.id) || []) ws.close(4001, "nuovo codice");
      return sendJson(res, 200, { token: p.id + "." + secret });
    }
    if (method === "POST" && parts.length === 1) { const body = await readBody(req); const name = cleanName(body.name); if (name) Q.setName.run(name, p.id); return sendJson(res, 200, { id: p.id, name: name || p.name }); }
  }
  if (parts[0] === "push") {
    if (parts[1] === "key" && method === "GET") return sendJson(res, 200, { key: vapid.publicKey });
    const p = needMe();
    if (parts[1] === "subscribe" && method === "POST") {
      const body = await readBody(req), sub = body.subscription;
      if (!sub || typeof sub.endpoint !== "string" || sub.endpoint.length > 1000 || !sub.keys || typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string" || sub.keys.p256dh.length > 200 || sub.keys.auth.length > 100) throw fail(400, "Iscrizione non valida.");
      let host; try { const u = new URL(sub.endpoint); if (u.protocol !== "https:" || u.port) throw 0; host = u.hostname; } catch (e) { throw fail(400, "Iscrizione non valida."); }
      if (!PUSH_HOSTS.test(host)) throw fail(400, "Servizio di notifica non riconosciuto.");
      const existing = Q.countSubs.all(p.id).filter(r => r.endpoint !== sub.endpoint);
      for (const r of existing.slice(0, Math.max(0, existing.length - (LIMITS.subsPerPlayer - 1)))) Q.delSub.run(r.endpoint);
      Q.addSub.run(sub.endpoint, p.id, JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }), Date.now());
      return sendJson(res, 200, { ok: true });
    }
    if (parts[1] === "unsubscribe" && method === "POST") { const body = await readBody(req); const row = body.endpoint ? Q.countSubs.all(p.id).find(r => r.endpoint === String(body.endpoint)) : null; if (row) Q.delSub.run(row.endpoint); return sendJson(res, 200, { ok: true }); }
  }
  if (parts[0] === "games") {
    if (parts.length === 1 && method === "GET") {
      const p = needMe();
      return sendJson(res, 200, { games: Q.myGames.all(p.id, p.id, p.id).map(r => ({ id: r.id, s: viewFor(JSON.parse(r.state), p.id), updated: r.updated })) });
    }
    if (parts.length === 1 && method === "POST") {
      const p = needMe(), body = await readBody(req);
      const cpu = body.vs === "facile" || body.vs === "normale";
      const active = Q.activeOf.all(p.id, p.id, p.id).map(r => JSON.parse(r.state));
      if (active.length >= LIMITS.activeGamesPerPlayer) throw fail(429, "Hai già " + active.length + " partite in corso: finiscine o abbandonane qualcuna.");
      if (cpu && active.filter(s => s.seats.B && s.seats.B.cpu).length >= LIMITS.activeCpuGamesPerPlayer) throw fail(429, "Hai già " + LIMITS.activeCpuGamesPerPlayer + " partite in corso contro il computer.");
      if (!hit("games:" + p.id, LIMITS.gamesPerPlayerPerHour, 3600e3)) throw fail(429, "Hai creato molte partite nell'ultima ora: riprova più tardi.");
      // regole: s1 (semplificate, predefinite) oppure v5f (classiche, con lessico)
      const regole = body.regole === "v5f" ? "v5f" : "s1";
      const pvOk = regole === "s1" ? [40, 60, 80] : [20, 25, 30], pvDef = regole === "s1" ? 60 : 30;
      const hp = pvOk.includes(+body.hp) ? +body.hp : pvDef;
      G.applyCfg(Object.assign({}, G.PRESETS[regole], { hp }));
      const s = G.newGame(rng);
      s.seats.A = { tok: p.id, nome: p.name };
      if (cpu) s.seats.B = { tok: "cpu", nome: "Automa" + (body.vs === "facile" ? " (facile)" : ""), cpu: true, livello: body.vs };
      else if (body.both) s.seats.B = { tok: p.id, nome: p.name + " (rosso)" };
      const id = rid(10), now = Date.now();
      Q.addGame.run(id, JSON.stringify(s), p.id, s.seats.B && !s.seats.B.cpu ? s.seats.B.tok : null, now, now);
      return sendJson(res, 201, { id, s: viewFor(s, p.id), updated: now });
    }
    const id = parts[1];
    if (!/^[a-z0-9]{6,20}$/.test(id || "")) throw fail(404, "Partita non trovata.");
    if (parts.length === 2 && method === "GET") {
      const g = loadGame(id); if (!g) throw fail(404, "Partita non trovata.");
      return sendJson(res, 200, { id, s: viewFor(g.s, me ? me.id : null), updated: g.row.updated });
    }
    if (parts[2] === "join" && method === "POST") {
      const p = needMe(), g = loadGame(id); if (!g) throw fail(404, "Partita non trovata.");
      const s = g.s;
      if (seatOf(s, p.id)) return sendJson(res, 200, { id, s: viewFor(s, p.id), updated: g.row.updated });
      if (s.seats.B) throw fail(409, "Questa partita ha già due giocatori.");
      s.seats.B = { tok: p.id, nome: p.name };
      const updated = commitState(id, s, true);
      if (s.seats.A && !isLooking(s.seats.A.tok, id)) pushTo(s.seats.A.tok, { title: "Grimorio", body: p.name + " ha accettato la sfida. Tocca a te!", url: "/#g=" + id, tag: id });
      return sendJson(res, 200, { id, s: viewFor(s, p.id), updated });
    }
    if (parts[2] === "move" && method === "POST") {
      const p = needMe();
      if (!hit("move:" + p.id, LIMITS.movesPerPlayerPerMin, 60e3)) throw fail(429, "Troppe mosse in poco tempo: rallenta un attimo.");
      const body = await readBody(req); return sendJson(res, 200, doMove(id, p, body));
    }
    if (parts[2] === "suggest" && method === "POST") {
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
    if (parts[2] === "resign" && method === "POST") {
      const p = needMe(), g = loadGame(id); if (!g) throw fail(404, "Partita non trovata.");
      const s = g.s, seat = seatOf(s, p.id); if (!seat) throw fail(403, "Non giochi in questa partita.");
      if (!s.seats.B || s.seats.A.tok === s.seats.B.tok) { Q.delGame.run(id); return sendJson(res, 200, { deleted: true }); }
      if (s.winner) throw fail(409, "La partita è già finita.");
      s.winner = G.enemy(seat);
      s.log.push(nameOf(s, seat) + " abbandona la partita. Vince " + nameOf(s, s.winner) + ".");
      const updated = commitState(id, s);
      return sendJson(res, 200, { id, s: viewFor(s, p.id), updated });
    }
    if (parts[2] === "hide" && method === "POST") {
      const p = needMe(), g = loadGame(id); if (!g) throw fail(404, "Partita non trovata.");
      if (!g.s.winner) throw fail(409, "Puoi togliere dall'elenco solo le partite finite.");
      Q.hideGame.run("," + p.id, id);
      return sendJson(res, 200, { ok: true });
    }
  }
  throw fail(404, "Indirizzo sconosciuto.");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url.pathname.slice(5).split("/").filter(Boolean));
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!e.status) console.error(e);
    sendJson(res, e.status || 500, { error: e.status ? e.message : "Errore del server." });
  }
});

const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 8192 });
const socketsPerIp = new Map();
wss.on("connection", (ws, req) => {
  const ip = clientIp(req);
  const nIp = (socketsPerIp.get(ip) || 0) + 1;
  if (nIp > LIMITS.socketsPerIp) { ws.close(1013, "troppe connessioni"); return; }
  socketsPerIp.set(ip, nIp);
  ws.on("close", () => { const n = (socketsPerIp.get(ip) || 1) - 1; if (n <= 0) socketsPerIp.delete(ip); else socketsPerIp.set(ip, n); });
  ws.pid = null; ws.visible = true; ws.watching = new Set(); ws.alive = true;
  const helloTimer = setTimeout(() => { if (!ws.pid) ws.close(4000, "accesso mancante"); }, 20000);
  ws.on("pong", () => { ws.alive = true; });
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.type === "hello") {
      const p = authToken(m.token); if (!p) return send(ws, { type: "error", error: "auth" });
      if (ws.pid) return;
      clearTimeout(helloTimer);
      ws.pid = p.id;
      if (!socketsOf.has(p.id)) socketsOf.set(p.id, new Set());
      const mine = socketsOf.get(p.id);
      if (mine.size >= LIMITS.socketsPerPlayer) { const oldest = mine.values().next().value; mine.delete(oldest); oldest.close(4002, "troppe connessioni"); }
      mine.add(ws);
      send(ws, { type: "ready" });
    } else if (m.type === "watch" && typeof m.id === "string" && /^[a-z0-9]{6,20}$/.test(m.id)) {
      for (const id of ws.watching) { const w = watchersOf.get(id); if (w) w.delete(ws); }
      ws.watching = new Set([m.id]);
      if (!watchersOf.has(m.id)) watchersOf.set(m.id, new Set());
      watchersOf.get(m.id).add(ws);
    } else if (m.type === "unwatch") {
      for (const id of ws.watching) { const w = watchersOf.get(id); if (w) w.delete(ws); }
      ws.watching = new Set();
    } else if (m.type === "visible") ws.visible = !!m.v;
  });
  ws.on("close", () => {
    clearTimeout(helloTimer);
    if (ws.pid && socketsOf.has(ws.pid)) { socketsOf.get(ws.pid).delete(ws); if (!socketsOf.get(ws.pid).size) socketsOf.delete(ws.pid); }
    for (const id of ws.watching) { const w = watchersOf.get(id); if (w) { w.delete(ws); if (!w.size) watchersOf.delete(id); } }
  });
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); } }, 30000);

// avvia il thread del computer e riprende i turni rimasti in sospeso (per esempio dopo un riavvio)
startAiWorker();
for (const row of Q.allGames.all()) { try { const s = JSON.parse(row.state); scheduleCpu(row.id, s); } catch (e) {} }

// ---------- tempo per turno ----------
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
setInterval(cleanup, 86400e3).unref();

server.listen(PORT, HOST, () => console.log("Grimorio in ascolto su http://" + HOST + ":" + PORT + " (sito: " + SITE + ")"));
