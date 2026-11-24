// Grimorio — interfaccia di gioco (versione online)
"use strict";
const G = window.Grimorio;
const BASE = G.PRESETS.v5f; // v5e + lettura dal lato (campo girato per ciascun giocatore)
// regole da mostrare: quelle della partita aperta, altrimenti quelle scelte nel menu "Regole"
function regoleAttive() {
  if (S() && S().cfg) return S().cfg;
  const sel = document.getElementById("regole");
  return ((sel && REGOLE[sel.value]) || REGOLE.s1).cfg;
}
const REGOLE = { s1: { cfg: G.PRESETS.s1, nome: "Semplificate (s1)", pv: [40, 60, 80], def: 60 }, v5f: { cfg: G.PRESETS.v5f, nome: "Classiche (con lessico)", pv: [20, 25, 30], def: 30 } };
const NOMI = { A: "Mago Blu", B: "Mago Rosso" };
const EL = { fuoco: "Fuoco", gelo: "Gelo", acqua: "Acqua", terra: "Terra" };

// ---------- piccoli aiuti ----------
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "style") e.style.cssText = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
// sostituisce il contenuto ignorando gli elementi assenti (null, false)
function fill(el, ...kids) { el.replaceChildren(...kids.flat().filter(k => k !== null && k !== undefined && k !== false)); }
const store = {
  // le chiavi salvate prima della correzione del nome (Grimorio) restano leggibili
  get(k, d) { try { let v = localStorage.getItem(k); if (v === null) v = localStorage.getItem(k.replace("grimorio", "grimon" + "io")); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let toastT = null;
function toast(msg, err) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast" + (err ? " err" : ""); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, err ? 4200 : 3000);
}
function sheet(title, body) {
  const s = document.getElementById("sheet"), inn = document.getElementById("sheetIn");
  inn.replaceChildren(h("h3", { text: title }), ...body, h("button", { class: "btn", onclick: closeSheet, text: "Chiudi" }));
  s.hidden = false;
}
function closeSheet() { document.getElementById("sheet").hidden = true; }

// ---------- dizionario ----------
let dictState = "carico";
let DICT_TEXT = "", DICT_OFFS = null;
function makeDict(text) {
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) offs.push(i + 1);
  const o = Uint32Array.from(offs), n = o.length;
  DICT_TEXT = text; DICT_OFFS = o;
  const line = i => text.slice(o[i], i + 1 < n ? o[i + 1] - 1 : text.length);
  return { has(w) { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, x = line(m); if (x === w) return true; if (x < w) lo = m + 1; else hi = m - 1; } return false; } };
}
async function loadDict() {
  try {
    const res = await fetch("parole.txt");
    if (!res.ok) throw new Error("http " + res.status);
    const buf = new Uint8Array(await res.arrayBuffer());
    let text;
    if (buf[0] === 0x1f && buf[1] === 0x8b) text = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    else text = new TextDecoder().decode(buf);
    G.setDict(makeDict(text.replace(/\r/g, "").trim()));
    dictState = "pronto";
  } catch (e) { dictState = "errore"; }
  render();
}

// ---------- collegamento al server ----------
let CRED = store.get("grimorio-cred", null);   // { id, token, name }: chi sei su questo dispositivo
let MYID = CRED ? CRED.id : null;
let conn = "collego";                          // collego | ok | errore
let games = {};
let cur = null;                                // { id, data: { id, s, updated } }
let pendingOpen = null;
let ws = null, wsTimer = null, wsDelay = 1000;

function myName() { return store.get("grimorio-nome", "") || (CRED && CRED.name) || ""; }
async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (CRED) headers.Authorization = "Bearer " + CRED.token;
  let res;
  try { res = await fetch("/api/" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { const err = new Error("Nessuna connessione con il server. Controlla la rete e riprova."); err.status = 0; throw err; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || "Errore del server (" + res.status + ")."); err.status = res.status; throw err; }
  return data;
}
async function ensurePlayer() {
  if (CRED) return CRED;
  const r = await api("POST", "players", { name: myName() || "Mago" });
  CRED = { id: r.id, token: r.token, name: r.name }; MYID = r.id;
  store.set("grimorio-cred", CRED);
  connectWs();
  return CRED;
}
async function saveName(n) {
  n = (n || "").trim(); store.set("grimorio-nome", n);
  if (CRED && n) { try { const r = await api("POST", "me", { name: n }); CRED.name = r.name; store.set("grimorio-cred", CRED); } catch (e) {} }
}
async function loadGames() {
  if (!CRED) { conn = "ok"; render(); return; }
  try { const r = await api("GET", "games"); const g = {}; r.games.forEach(x => { g[x.id] = x; }); games = g; conn = "ok"; }
  catch (e) { conn = "errore"; }
  render();
}
function connectWs() {
  if (!CRED || (ws && ws.readyState <= 1)) return;
  try { ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"); } catch (e) { return; }
  ws.onopen = () => {
    wsDelay = 1000;
    wsSend({ type: "hello", token: CRED.token });
    wsSend({ type: "visible", v: document.visibilityState === "visible" });
    if (cur) wsSend({ type: "watch", id: cur.id });
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.type === "game") onServerGame(m);
    // collegamento (ri)aperto: recupera ciò che è successo mentre non eri collegato
    else if (m.type === "ready") { if (cur) refreshGame(cur.id); else loadGames(); }
  };
  ws.onclose = () => { ws = null; clearTimeout(wsTimer); wsTimer = setTimeout(connectWs, wsDelay); wsDelay = Math.min(wsDelay * 2, 30000); };
}
function wsSend(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function onServerGame(m) {
  games[m.id] = { id: m.id, s: m.s, updated: m.updated };
  if (cur && cur.id === m.id) onGameData(games[m.id]); else render();
}
document.addEventListener("visibilitychange", () => {
  wsSend({ type: "visible", v: document.visibilityState === "visible" });
  if (document.visibilityState === "visible") { connectWs(); if (cur) refreshGame(cur.id); else loadGames(); }
});

// ---------- notifiche ----------
function pushSupported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
function pushOn() { return pushSupported() && Notification.permission === "granted" && store.get("grimorio-push", false); }
function b64ToU8(b) { const p = "=".repeat((4 - b.length % 4) % 4); const x = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(x, c => c.charCodeAt(0)); }
async function enablePush(silent) {
  try {
    if (!pushSupported()) { if (!silent) toast("Questo browser non supporta le notifiche. Su Android usa Chrome e installa Grimorio sulla schermata Home.", true); return; }
    await ensurePlayer();
    const perm = silent ? Notification.permission : await Notification.requestPermission();
    if (perm !== "granted") { if (!silent) toast("Notifiche non attivate: puoi abilitarle dalle impostazioni del browser.", true); return; }
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api("GET", "push/key");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
    await api("POST", "push/subscribe", { subscription: sub.toJSON() });
    store.set("grimorio-push", true);
    if (!silent) toast("Notifiche attive: ti avviso quando tocca a te.");
    render();
  } catch (e) { if (!silent) toast("Non riesco ad attivare le notifiche su questo dispositivo.", true); }
}
function pushButton(cls) {
  if (pushOn() || !pushSupported()) return null;
  return h("button", { class: cls || "btn small", onclick: () => enablePush(false), text: "🔔 Avvisami quando tocca a me" });
}

// ---------- invito e altri dispositivi ----------
function inviteUrl(id) { return location.origin + "/#g=" + id; }
async function invite() {
  const url = inviteUrl(cur.id), text = "Ti sfido a Grimorio! Apri il link e siediti come Mago Rosso.";
  if (navigator.share) { try { await navigator.share({ title: "Grimorio", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); toast("Link copiato: incollalo in un messaggio all'avversario."); }
  catch (e) { sheet("Invita un amico", [h("p", { text: "Copia questo link e mandalo a chi vuoi sfidare:" }), h("input", { type: "text", id: "link-invito", value: url, readonly: true, onfocus: ev => ev.target.select() })]); }
}
function showProfile() {
  if (!CRED) return toast("Crea o accetta una partita: il profilo nasce lì.");
  const link = location.origin + "/#accedi=" + CRED.token;
  sheet("Il tuo profilo", [
    h("p", { text: "Sei " + (CRED.name || "Mago") + " su questo dispositivo." }),
    h("p", { class: "sub", text: "Per giocare le stesse partite da un altro telefono o computer, apri lì questo link. Non mandarlo a nessuno: chi lo apre gioca al posto tuo." }),
    h("input", { type: "text", id: "link-accesso", value: link, readonly: true, onfocus: ev => ev.target.select() }),
    h("button", { class: "btn small", onclick: async () => { try { await navigator.clipboard.writeText(link); toast("Link di accesso copiato."); } catch (e) { document.getElementById("link-accesso").select(); } }, text: "Copia il link di accesso" }),
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
  } catch (e) { toast(e.message, true); }
}
async function useAccessLink(token) {
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  const prev = CRED; CRED = { id: token.split(".")[0], token, name: "" };
  try { const me = await api("GET", "me"); CRED.name = me.name; MYID = me.id; store.set("grimorio-cred", CRED); store.set("grimorio-nome", me.name); toast("Accesso eseguito: bentornato, " + me.name + "."); }
  catch (e) { CRED = prev; toast("Il link di accesso non è valido.", true); }
}

// ---------- stato dell'interfaccia ----------
let ui = freshUi();
function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, passConfirm: false, hintConfirm: false, hintLaunch: null, delConfirm: false, busy: false, order: null }; }
let anim = null;

function S() { return cur && cur.data && cur.data.s; }
function mySeat() {
  const s = S(); if (!s) return null;
  const a = s.seats.A && s.seats.A.tok === MYID, b = s.seats.B && s.seats.B.tok === MYID;
  if (a && b) return s.turn;
  return a ? "A" : b ? "B" : null;
}
function viewSeat() { return mySeat() || "A"; }
function flipped() { const s = S(); return !!(s && s.cfg && s.cfg.letturaDalLato); }
function topSeat() { return flipped() ? G.enemy(viewSeat()) : "A"; }
function seatName(s, p) { return (s.seats[p] && s.seats[p].nome) || NOMI[p]; }
function myTurn() { const s = S(); return !!s && !s.winner && mySeat() === s.turn && !!s.seats[G.enemy(s.turn)]; }

// ---------- lobby ----------
function renderLobby() {
  const L = document.getElementById("lobby");
  const ids = Object.keys(games).sort((a, b) => (games[b].updated || 0) - (games[a].updated || 0));
  const connMsg = { collego: "Collegamento al server…", errore: "Non riesco a raggiungere il server. Controlla la connessione e riprova.", ok: "" }[conn];
  const name = h("input", { type: "text", id: "nome", maxlength: "24", placeholder: "Come ti chiami?", value: myName(), oninput: e => store.set("grimorio-nome", e.target.value.trim()), onchange: e => saveName(e.target.value) });
  const hp = h("select", { id: "pv" });
  const fillHp = k => fill(hp, ...REGOLE[k].pv.map(v => h("option", { value: v, selected: v === REGOLE[k].def, text: v + " PV" })));
  const reg = h("select", { id: "regole", onchange: e => fillHp(e.target.value) }, Object.keys(REGOLE).map(k => h("option", { value: k, text: REGOLE[k].nome })));
  fillHp("s1");
  const both = h("input", { type: "checkbox", id: "entrambi" });
  const vs = h("select", { id: "avversario", onchange: e => { both.disabled = e.target.value !== "persona"; if (both.disabled) both.checked = false; } },
    h("option", { value: "persona", text: "Un'altra persona (a distanza)", selected: true }),
    h("option", { value: "facile", text: "Il computer, livello facile" }),
    h("option", { value: "normale", text: "Il computer, livello normale" }));
  const canCreate = conn !== "collego";
  fill(L, 
    h("div", { class: "card", style: "background:transparent;border:none;padding:0" },
      h("h1", { text: "Grimorio" }),
      h("p", { class: "sub", text: "Duelli di parole tra due maghi. Scrivi incantesimi nel tuo Sanctum, costruisci un ponte fino al Passo Arcano e invadi il Sanctum nemico." })),
    connMsg ? h("p", { class: "note", text: connMsg }) : null,
    pushButton("btn"),
    h("div", { class: "card" },
      h("h2", { text: "Nuova partita" }),
      h("label", { class: "field", for: "nome" }, "Il tuo nome di mago", name),
      h("label", { class: "field", for: "avversario" }, "Avversario", vs),
      h("label", { class: "field", for: "regole" }, "Regole", reg),
      h("label", { class: "field", for: "pv" }, "Punti Vita iniziali", hp),
      h("label", { class: "check", for: "entrambi" }, both, "Gioca entrambi i maghi (per provare da solo)"),
      h("button", { class: "btn primary", disabled: !canCreate, onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value), text: "Crea partita" })),
    h("div", { class: "card" },
      h("h2", { text: "Partite" }),
      ids.length ? h("div", { class: "gamelist" }, ids.map(id => gameItem(id, games[id]))) : h("p", { class: "note", text: conn === "collego" ? "Carico le partite…" : "Nessuna partita. Creane una qui sopra, oppure apri il link d'invito che ti hanno mandato." })),
    h("details", null, h("summary", { text: "Come sfidare qualcuno a distanza" }),
      h("p", { class: "note", style: "margin-top:8px", text: "Crea una partita scegliendo «Un'altra persona» e tocca «Invita un amico»: manda il link su WhatsApp o dove preferisci. Chi lo apre sceglie un nome e si siede come Mago Rosso. Ognuno gioca il proprio turno quando può; con le notifiche attive il telefono ti avvisa quando tocca a te." })),
    h("details", null, h("summary", { text: "Installa Grimorio sul telefono" }),
      h("p", { class: "note", style: "margin-top:8px", text: "In Chrome per Android apri il menu ⋮ e scegli «Aggiungi a schermata Home» (o «Installa app»). Grimorio si aprirà a tutto schermo come un'app e potrà mandarti le notifiche." })),
    h("div", { class: "row" }, h("button", { class: "btn link", onclick: showRules, text: "Regole in breve" }), h("button", { class: "btn link", onclick: showExplorer, text: "Esplora il dizionario" }), CRED ? h("button", { class: "btn link", onclick: showProfile, text: "Il tuo profilo" }) : null)
  );
}
// tempo rimasto per il turno, in parole ("31 ore", "40 minuti")
function timeLeft(s) {
  if (!s || !s.deadline || s.winner) return "";
  const ms = s.deadline - Date.now();
  if (ms <= 0) return "tempo scaduto";
  const h = Math.floor(ms / 3600e3);
  return h >= 1 ? (h === 1 ? "1 ora" : h + " ore") : Math.max(1, Math.ceil(ms / 60e3)) + " minuti";
}
function clockText(s, mine) {
  const t = timeLeft(s); if (!t) return "";
  return t === "tempo scaduto" ? "Tempo scaduto: il turno sta per passare." : (mine ? "Hai ancora " + t + " per giocare, poi il turno passa." : "Ha ancora " + t + " per giocare.");
}
setInterval(() => { const el = document.getElementById("orologio"); if (el && cur && games[cur.id]) el.textContent = clockText(games[cur.id].s, myTurn()); }, 30000);
function gameItem(id, d) {
  const s = d.s; if (!s || !s.seats) return null;
  const mine = (s.seats.A && s.seats.A.tok === MYID) || (s.seats.B && s.seats.B.tok === MYID);
  let st, tag = null;
  if (s.winner) st = "Vince " + seatName(s, s.winner);
  else if (!s.seats.B) { st = "In attesa del Mago Rosso"; tag = mine ? null : "Libero"; }
  else { st = "Tocca a " + seatName(s, s.turn); if (mine && ((s.seats[s.turn] || {}).tok === MYID || (s.seats[s.turn] || {}).cpu)) tag = (s.seats[s.turn] || {}).cpu ? "Contro il computer" : "Tocca a te"; }
  return h("button", { class: "gameitem", onclick: () => openGame(id) },
    h("span", { class: "vs" }, h("span", { class: "dotA", text: seatName(s, "A") + " " + s.hp.A }), "  contro  ", h("span", { class: "dotB", text: (s.seats.B ? seatName(s, "B") : "—") + " " + s.hp.B })),
    tag ? h("span", { class: "tag", text: tag }) : h("span", { class: "tag idle", text: (s.cfg && s.cfg.hp ? s.cfg.hp : 30) + " PV" }),
    h("span", { class: "st", text: st + (timeLeft(s) ? " · " + timeLeft(s) : "") + " · mossa " + s.moveNo }));
}
async function createGame(hp, both, vs, regole) {
  try {
    await ensurePlayer();
    const r = await api("POST", "games", { hp, both, vs, regole });
    games[r.id] = r; openGame(r.id);
    if (vs === "persona" && !both) toast("Partita creata: ora tocca «Invita un amico».");
  } catch (e) { toast(e.message, true); }
}

// ---------- partita ----------
function openGame(id) {
  ui = freshUi(); anim = null;
  cur = { id, data: games[id] || null };
  try { history.replaceState(null, "", "#g=" + id); } catch (e) {}
  wsSend({ type: "watch", id });
  if (cur.data) onGameData(cur.data, true);
  render(); window.scrollTo(0, 0);
  refreshGame(id);
}
async function refreshGame(id) {
  try { const r = await api("GET", "games/" + id); games[id] = r; if (cur && cur.id === id) onGameData(r); }
  catch (e) {
    if (e.status === 404) { toast("Questa partita non esiste più.", true); if (cur && cur.id === id) leaveGame(); }
    else toast(e.message, true);
  }
}
function leaveGame() {
  wsSend({ type: "unwatch" });
  cur = null; ui = freshUi(); anim = null;
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  render(); loadGames();
}
function onGameData(data, first) {
  const prev = cur && cur.data && cur.data.s;
  cur.data = JSON.parse(JSON.stringify(data));
  const s = cur.data.s;
  G.applyCfg(s.cfg || BASE);
  if (!prev || prev.moveNo !== s.moveNo) { const keepOrder = ui.order; ui = freshUi(); ui.order = keepOrder; }
  const seen = store.get("grimorio-visto", {});
  if (s.last && s.last.seq && seen[cur.id] !== s.last.seq) {
    seen[cur.id] = s.last.seq; store.set("grimorio-visto", seen);
    announce(s); startAnim(s.last);
  }
  render();
}
function announce(s) {
  const L = s.last; if (!L) return;
  const who = seatName(s, L.by);
  if (L.kind === "alchimia") return toast(who + " usa l'Alchimia.");
  if (L.kind === "passa") return toast(who + " passa il turno.");
  let msg = who + ": " + L.word;
  if (L.type === "attacco") msg += L.damage ? " colpisce, −" + L.damage + " PV" : ", l'incantesimo si ferma";
  else if (L.type === "falo") msg += ", Grande Falò";
  else if (L.type === "difesa") { const w = Object.values(s.words).find(x => x.text === L.word && x.o === L.by); msg += w && w.consacrata ? ", difesa consacrata" : ", nuova difesa"; }
  if (L.storm) msg += " · Tempesta (forza " + L.storm.force + ")";
  toast(msg);
}
function startAnim(last) {
  if (!last || !last.path || !last.path.length) return;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  anim = { path: last.path, launch: last.launch, i: reduce ? last.path.length : 0 };
  const done = () => setTimeout(() => { anim = null; render(); }, 2600);
  if (reduce) return done();
  const t = setInterval(() => {
    if (!anim) return clearInterval(t);
    anim.i++; render();
    if (anim.i >= anim.path.length) { clearInterval(t); done(); }
  }, 230);
}

// ---------- suggerimento: costa PV, lo calcola il server ----------
let hintBusy = false;
async function askHint() {
  if (hintBusy || !cur) return;
  hintBusy = true; render();
  try {
    const r = await api("POST", "games/" + cur.id + "/suggest", { moveNo: S().moveNo });
    games[r.id] = { id: r.id, s: r.s, updated: r.updated };
    if (cur && cur.id === r.id) { onGameData(games[r.id]); hintBusy = false; applyHint(r.hint); }
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  hintBusy = false; render();
}
// mette la mossa suggerita sulla griglia: puoi confermarla o cambiarla
function applyHint(m) {
  const s = S(), me = mySeat(), hand = s.hands[me];
  Object.assign(ui, { pending: [], place: null, mode: null, alch: null, sel: null, launch: null, hintLaunch: null, passConfirm: false, hintConfirm: false });
  if (!m || m.kind === "errore") { toast("Il suggeritore ha avuto un problema" + (m && m.message ? ": " + m.message : "."), true); render(); return; }
  if (m.kind === "play") {
    const used = new Set();
    for (const t of m.placed) { const hi = hand.findIndex((l, i) => l === t.l && !used.has(i)); used.add(hi); ui.pending.push({ r: t.r, c: t.c, l: t.l, hi }); }
    const o = m.opts || {};
    ui.mode = o.attacca ? "attacca" : o.falo ? "falo" : o.consacra ? "consacra" : null;
    if (o.launch) ui.hintLaunch = o.launch;
    const v = G.validate(s, me, placed(), opts());
    const come = ui.mode === "attacca" || (v.ok && v.type === "attacco") ? ", da lanciare" : ui.mode === "falo" ? ", come Grande Falò" : ui.mode === "consacra" ? ", da consacrare" : "";
    toast("Suggerimento: " + (v.ok ? v.main.text : "una parola") + come + ". Tocca «Conferma», oppure cambiala.");
  } else if (m.kind === "alchimia") {
    const used = new Set(), lett = m.letters || hand;
    ui.alch = lett.map(l => { const i = hand.findIndex((x, j) => x === l && !used.has(j)); used.add(i); return i; }).filter(i => i >= 0);
    toast("Suggerimento: nessuna buona parola, usa l'Alchimia e cambia le lettere evidenziate.");
  } else toast("Suggerimento: non c'è una mossa utile, passa il turno.");
  render();
}

// ---------- parola intera dal dizionario (si trascina) ----------
let drag = null, suppressClick = false;
// passo di scrittura: in verticale dall'alto in basso come vedi il campo tu
function stepFor(dir) {
  const s = S(), me = mySeat();
  return dir === "v" ? [((s.cfg && s.cfg.letturaDalLato && me === "A") ? -1 : 1), 0] : [0, 1];
}
// dove finirebbero le lettere della parola partendo da (r0, c0); non controlla il dizionario
function computePlacement(w, dir, r0, c0) {
  const s = S(), me = mySeat(), [dr, dc] = stepFor(dir);
  const hand = s.hands[me], usedIdx = new Set(), pend = [];
  for (let i = 0; i < w.length; i++) {
    const r = r0 + dr * i, c = c0 + dc * i;
    if (r < 0 || r >= G.ROWS || c < 0 || c >= G.COLS) return { err: "«" + w + "» da qui esce dal campo." };
    const t = s.tiles[G.key(r, c)];
    if (t) { if (t.l !== w[i]) return { err: "In quella posizione c'è già una " + t.l + ", ma serviva una " + w[i] + "." }; continue; }
    let hi = -1;
    for (let j = 0; j < hand.length; j++) if (!usedIdx.has(j) && hand[j] === w[i]) { hi = j; break; }
    if (hi < 0) return { err: "Ti manca una " + w[i] + " per scrivere «" + w + "» qui." };
    usedIdx.add(hi); pend.push({ r, c, l: w[i], hi, i });
  }
  if (!pend.length) return { err: "La parola è già tutta sul campo." };
  return { pend };
}
// la posizione valida più vicina a (r0, c0)
function nearestPlacement(w, dir, r0, c0) {
  const cand = [];
  for (let r = 0; r < G.ROWS; r++) for (let c = 0; c < G.COLS; c++) cand.push([Math.abs(r - r0) + Math.abs(c - c0), r, c]);
  cand.sort((x, y) => x[0] - y[0]);
  // prima scelta: la più vicina che rispetta anche le regole; altrimenti la più vicina dove entra
  let fallback = null;
  for (const [, r, c] of cand) {
    const res = computePlacement(w, dir, r, c); if (!res.pend) continue;
    if (!fallback) fallback = { r, c, pend: res.pend };
    if (dictState === "pronto" && G.validate(S(), mySeat(), res.pend.map(x => ({ r: x.r, c: x.c, l: x.l })), {}).ok) return { r, c, pend: res.pend };
  }
  return fallback;
}
function setPlacement(r, c, pend) { ui.pending = pend; ui.place.start = G.key(r, c); ui.sel = null; }
function startPlace(word) {
  closeSheet();
  const s = S(), me = mySeat();
  ui.place = { word, dir: "h", start: null }; ui.pending = []; ui.mode = null; ui.sel = null; ui.launch = null; ui.alch = null;
  // parte dal centro del proprio Sanctum
  const rows = []; for (let r = 0; r < G.ROWS; r++) if (G.zoneOf(r) === me) rows.push(r);
  const r0 = rows[1], c0 = Math.max(0, 5 - Math.floor(word.length / 2));
  let found = nearestPlacement(word, "h", r0, c0);
  if (!found) { ui.place.dir = "v"; found = nearestPlacement(word, "v", r0, 5); }
  if (found) { setPlacement(found.r, found.c, found.pend); toast("Trascina «" + word + "» dove vuoi. ↻ Gira la mette in verticale."); }
  else toast("Non c'è spazio sul campo per «" + word + "» con le tue lettere.", true);
  render();
}
function placeWordAt(k) {
  const [r, c] = G.parse(k);
  const res = computePlacement(ui.place.word, ui.place.dir, r, c);
  if (res.err) { toast(res.err + " Prova un'altra casella o girala.", true); return; }
  setPlacement(r, c, res.pend); render();
}
function rotatePlace() {
  const old = ui.place.dir;
  ui.place.dir = old === "h" ? "v" : "h";
  if (!ui.place.start) { render(); return; }
  const [r, c] = G.parse(ui.place.start);
  const found = nearestPlacement(ui.place.word, ui.place.dir, r, c);
  if (found) setPlacement(found.r, found.c, found.pend);
  else { ui.place.dir = old; toast("Girata, «" + ui.place.word + "» non entra da nessuna parte.", true); }
  render();
}
function cancelPlace() { ui.place = null; ui.pending = []; ui.mode = null; render(); }
// trascinamento: si prende la parola da una sua lettera
function onBoardPointerDown(e) {
  if (!ui.place || !myTurn() || ui.busy) return;
  const cell = e.target.closest && e.target.closest(".cell"); if (!cell) return;
  const k = cell.dataset.k, p = ui.pending.find(x => G.key(x.r, x.c) === k);
  if (!p) return;
  e.preventDefault();
  drag = { i: p.i, lastK: k, err: null, bad: null };
  suppressClick = true;
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd, { once: true });
  window.addEventListener("pointercancel", onDragEnd, { once: true });
  render();
}
function onDragMove(e) {
  if (!drag) return;
  const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest && el.closest(".board .cell");
  if (!cell) return;
  const k = cell.dataset.k; if (k === drag.lastK) return;
  drag.lastK = k;
  const [r, c] = G.parse(k), [dr, dc] = stepFor(ui.place.dir);
  const r0 = r - dr * drag.i, c0 = c - dc * drag.i;
  const res = computePlacement(ui.place.word, ui.place.dir, r0, c0);
  if (res.err) { drag.err = res.err; drag.bad = k; }
  else { drag.err = null; drag.bad = null; setPlacement(r0, c0, res.pend); }
  render();
}
function onDragEnd() {
  window.removeEventListener("pointermove", onDragMove);
  if (!drag) return;
  const d = drag; drag = null;
  if (d.err) toast(d.err + " La parola resta nell'ultima posizione valida.", true);
  render();
  setTimeout(() => { suppressClick = false; }, 50);
}

// mosse
function placed() { return ui.pending.map(p => ({ r: p.r, c: p.c, l: p.l })); }
function opts() { return { falo: ui.mode === "falo", consacra: ui.mode === "consacra", attacca: ui.mode === "attacca" }; }
async function sendMove(move) {
  if (ui.busy) return;
  ui.busy = true; render();
  try {
    const r = await api("POST", "games/" + cur.id + "/move", Object.assign({ moveNo: S().moveNo }, move));
    games[r.id] = r; if (cur && cur.id === r.id) onGameData(r);
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  ui.busy = false; render();
}
function onConfirm() {
  const s = S(), p = mySeat();
  const v = G.validate(s, p, placed(), opts());
  if (!v.ok) return toast(v.err, true);
  if (v.type === "attacco") {
    const pv = G.previewLaunches(s, p, placed());
    const keys = Object.keys(pv || {});
    if (ui.hintLaunch && keys.includes(ui.hintLaunch)) return doPlay({ launch: ui.hintLaunch });
    if (keys.length === 1) return doPlay({ launch: keys[0] });
    ui.launch = pv; render();
    if (keys.every(k => !pv[k])) return toast("Da qui l'incantesimo si dissolve prima di arrivare al mago: danno previsto 0 da ogni lettera.", true);
    return toast("Scegli la lettera da cui lanciare l'incantesimo: il numero è il danno previsto.");
  }
  doPlay({});
}
function doPlay(extra) {
  const s = S(), p = mySeat(), o = Object.assign(opts(), extra);
  const v = G.validate(s, p, placed(), o);
  if (!v.ok) return toast(v.err, true);
  sendMove({ kind: "play", placed: placed(), opts: o });
}
function onCell(k) {
  const s = S(); if (!s) return;
  if (ui.launch) { if (k in ui.launch) doPlay({ launch: k }); return; }
  if (suppressClick) return;
  if (ui.place && myTurn()) { placeWordAt(k); return; }
  const pi = ui.pending.findIndex(p => G.key(p.r, p.c) === k);
  if (myTurn() && !ui.alch && pi >= 0) { ui.pending.splice(pi, 1); render(); return; }
  if (s.tiles[k]) return showCellInfo(k);
  if (!myTurn() || ui.alch) return;
  if (ui.sel === null) return toast("Tocca prima una lettera del tuo Grimorio.");
  const [r, c] = G.parse(k);
  ui.pending.push({ r, c, l: s.hands[mySeat()][ui.sel], hi: ui.sel });
  ui.sel = null; render();
}
function onHand(i) {
  if (!myTurn() || ui.launch) return;
  if (ui.alch) { const j = ui.alch.indexOf(i); if (j >= 0) ui.alch.splice(j, 1); else ui.alch.push(i); render(); return; }
  if (ui.place) ui.place = null; // si torna alla posa lettera per lettera
  if (ui.pending.some(p => p.hi === i)) return;
  ui.sel = ui.sel === i ? null : i; render();
}
function doAlchimia() {
  const s = S(), p = mySeat(), hand = s.hands[p];
  const letters = ui.alch.map(i => hand[i]);
  if (!letters.length) return toast("Scegli almeno una lettera da cambiare.", true);
  sendMove({ kind: "alchimia", letters: letters.length === hand.length ? null : letters });
}
function doPass() { sendMove({ kind: "pass" }); }
async function sitDown() {
  const nameIn = document.getElementById("nome-sfidante");
  if (nameIn && nameIn.value.trim()) await saveName(nameIn.value);
  try {
    await ensurePlayer();
    const r = await api("POST", "games/" + cur.id + "/join");
    games[r.id] = r; onGameData(r); wsSend({ type: "watch", id: cur.id });
    toast("Sei il Mago Rosso. Inizia il Mago Blu: ti avviso quando tocca a te.");
    if (!pushOn()) enablePush(false);
  } catch (e) { toast(e.message, true); }
}
async function resignGame() {
  try {
    const r = await api("POST", "games/" + cur.id + "/resign");
    if (r.deleted) { delete games[cur.id]; leaveGame(); toast("Partita eliminata."); }
    else { games[r.id] = r; onGameData(r); }
  } catch (e) { toast(e.message, true); }
}
async function hideGame() {
  try { await api("POST", "games/" + cur.id + "/hide"); delete games[cur.id]; leaveGame(); toast("Partita tolta dall'elenco."); }
  catch (e) { toast(e.message, true); }
}

// info su una casella
function showCellInfo(k) {
  const s = S(), idx = G.cellIndex(s.words), ids = idx[k] || [];
  const t = s.tiles[k];
  const lines = ids.map(id => {
    const w = s.words[id];
    const who = seatName(s, w.o);
    let tipo = w.type === "attacco" ? "Attacco " + (EL[w.el] || "") : w.type === "difesa" ? (w.consacrata ? "Difesa consacrata" : "Difesa (Terra)") : w.type === "cataclisma" ? "Cataclisma" : w.type === "bloccato" ? "Attacco bloccato" : "Parola neutra";
    let val = w.type === "difesa" ? "Resistenza " + w.stab + " su " + w.max : "Stabilità " + w.stab + " su " + w.max;
    const consuma = (w.type !== "difesa" || w.consacrata) ? " · perde 1 a ogni turno di " + who : "";
    return h("li", null, h("strong", { text: w.text }), " — " + tipo + " di " + who + ". " + val + consuma + ".");
  });
  sheet("Lettera " + (t ? t.l : ""), [
    h("p", { class: "sub", text: "Valore " + (t ? G.VAL[t.l] : "") + (t && G.VAL[t.l] >= 3 ? " · Runa: torna a chi l'ha posata quando la parola si spegne" : " · Consumabile") }),
    lines.length ? h("ul", null, lines) : h("p", { text: "Questa lettera non appartiene più a nessuna parola." })
  ]);
}

// ---------- esploratore del dizionario ----------
function cleanLetters(t) { return (t || "").toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "").split("").filter(l => G.VAL[l]).join(""); }
// parole componibili con mano + lettere in più; ognuna dice quali lettere in più usa
function searchWords(hand, extra, tipo, ordine, max) {
  const total = hand.length + extra.length;
  if (!DICT_OFFS || total < 2) return { list: [], total: 0 };
  const avail = new Int16Array(26), fromHand = new Int16Array(26), used = new Int16Array(26);
  for (const l of hand) { avail[l.charCodeAt(0) - 65]++; fromHand[l.charCodeAt(0) - 65]++; }
  for (const l of extra) avail[l.charCodeAt(0) - 65]++;
  const words = new Set(), T = DICT_TEXT, O = DICT_OFFS, n = O.length;
  for (let i = 0; i < n; i++) {
    const a = O[i], b = i + 1 < n ? O[i + 1] - 1 : T.length;
    if (b - a > total || b - a < 2) continue;
    let ok = true, j = a;
    for (; j < b; j++) { const c = T.charCodeAt(j) - 65; if (++used[c] > avail[c]) { ok = false; j++; break; } }
    for (let x = a; x < j; x++) used[T.charCodeAt(x) - 65] = 0;
    if (ok) words.add(T.slice(a, b));
  }
  for (const el in G.LESSICO) for (const w of G.LESSICO[el].split(" ")) {
    const cnt = new Int16Array(26); let ok = w.length <= total;
    for (const ch of w) if (++cnt[ch.charCodeAt(0) - 65] > avail[ch.charCodeAt(0) - 65]) ok = false;
    if (ok) words.add(w);
  }
  const list = [];
  for (const w of words) {
    const cls = G.classify(w);
    const kind = cls.type === "attacco" ? cls.el : cls.type;
    if (tipo === "attacco" ? cls.type !== "attacco" : tipo !== "tutte" && kind !== tipo) continue;
    const cnt = new Int16Array(26); let extraUsed = "", score = 0;
    for (const ch of w) { const c = ch.charCodeAt(0) - 65; if (++cnt[c] > fromHand[c]) extraUsed += ch; score += G.VAL[ch]; }
    list.push({ w, kind, score, extraUsed });
  }
  list.sort(ordine === "lunghezza" ? (x, y) => y.w.length - x.w.length || y.score - x.score : (x, y) => y.score - x.score || y.w.length - x.w.length);
  return { list: list.slice(0, max), total: list.length };
}
const WIDE = window.matchMedia("(min-width: 1000px)");
let side = null; // dizionario a lato: { nodes, handIn, run, gameId, lastHand, lastCan, edited }
function myHandText() { const s = S(), me = mySeat(); return s && me ? s.hands[me].join("") : ""; }
function buildExplorer(lato) {
  if (!cur) G.applyCfg(regoleAttive());
  const libero = !!regoleAttive().attaccoLibero;
  const x = { edited: false };
  const handIn = h("input", { type: "text", id: lato ? "dzl-mano" : "dz-mano", value: myHandText(), placeholder: "es. AEIRMTS", autocomplete: "off", autocapitalize: "characters" });
  const extraIn = h("input", { type: "text", id: lato ? "dzl-extra" : "dz-extra", placeholder: "es. lettere sul campo", autocomplete: "off", autocapitalize: "characters" });
  const tipo = h("select", { id: lato ? "dzl-tipo" : "dz-tipo" },
    (libero ? [["tutte", "Tutte"]] : [["tutte", "Tutte"], ["attacco", "Attacchi"], ["fuoco", "Fuoco"], ["gelo", "Gelo"], ["acqua", "Acqua"], ["difesa", "Difese (Terra)"], ["neutra", "Neutre"]]).map(([v, t]) => h("option", { value: v, text: t })));
  const ordine = h("select", { id: lato ? "dzl-ordine" : "dz-ordine" }, h("option", { value: "punti", text: "Punteggio" }), h("option", { value: "lunghezza", text: "Lunghezza" }));
  const count = h("p", { class: "dz-count", "aria-live": "polite" });
  const list = h("div", { class: "dz-list" });
  let t = null;
  const run = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (dictState !== "pronto") {
        count.textContent = dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…";
        list.replaceChildren();
        if (dictState === "carico") t = setTimeout(run, 800);
        return;
      }
      const hand = cleanLetters(handIn.value), extra = cleanLetters(extraIn.value);
      const r = searchWords(hand, extra, tipo.value, ordine.value, 150);
      count.textContent = hand.length + extra.length < 2 ? "Scrivi almeno due lettere." : r.total ? r.total + " parole" + (r.total > 150 ? " (mostrate le prime 150)" : "") : "Nessuna parola con queste lettere.";
      const nomi = { fuoco: "Fuoco", gelo: "Gelo", acqua: "Acqua", difesa: "Difesa" };
      const canPlace = myTurn() && !ui.busy;
      list.replaceChildren(...r.list.map(w => { const kind = libero ? "neutra" : w.kind; return h(canPlace ? "button" : "span", { class: "dz-w " + kind, title: (libero ? "Parola" : (nomi[kind] || "Neutra")) + (canPlace ? ": tocca per posizionarla" : ""), onclick: canPlace ? () => startPlace(w.w) : null },
        w.w, h("small", { text: w.score }), w.extraUsed ? h("small", { class: "x", text: "+" + w.extraUsed }) : null); }));
    }, 200);
  };
  handIn.addEventListener("input", () => { x.edited = true; run(); });
  extraIn.addEventListener("input", run);
  [tipo, ordine].forEach(i => i.addEventListener("change", run));
  const myHand = myHandText();
  x.nodes = [
    h("p", { class: "sub", text: "Le parole che puoi comporre con le tue lettere. Aggiungi in «Lettere in più» quelle sul campo che vuoi incrociare: le parole che le usano lo indicano in oro (+R)." + (myHand ? " Nel tuo turno tocca una parola per posizionarla sul campo." : "") }),
    h("div", { class: "dz-form" },
      h("label", { class: "field full", for: handIn.id }, "Le tue lettere", handIn),
      h("label", { class: "field full", for: extraIn.id }, "Lettere in più", extraIn),
      libero ? null : h("label", { class: "field", for: tipo.id }, "Tipo", tipo),
      h("label", { class: "field" + (libero ? " full" : ""), for: ordine.id }, "Ordina per", ordine)),
    myHand ? h("button", { class: "btn small", onclick: () => { handIn.value = myHandText(); extraIn.value = ""; x.edited = false; run(); }, text: "Ripristina la mia mano" }) : null,
    libero ? null : h("div", { class: "dz-key" }, h("span", { style: "--c:var(--fuoco)", text: "Fuoco" }), h("span", { style: "--c:var(--gelo)", text: "Gelo" }), h("span", { style: "--c:var(--acqua)", text: "Acqua" }), h("span", { style: "--c:var(--terra)", text: "Difesa" }), h("span", { style: "--c:var(--line)", text: "Neutra" })),
    count, list].filter(Boolean);
  Object.assign(x, { handIn, run });
  return x;
}
function showExplorer() {
  if (WIDE.matches && cur && S()) { updateSide(); if (side) side.handIn.focus(); return; }
  const x = buildExplorer(false);
  sheet("Dizionario", x.nodes);
  x.run();
}
// a lato della griglia, su schermo grande: segue la mano e il turno senza perdere quello che hai scritto
function updateSide() {
  const el = document.getElementById("side");
  const show = WIDE.matches && !!cur && !!S();
  document.body.classList.toggle("wide", show);
  el.hidden = !show;
  if (!show) return;
  if (!side || side.gameId !== cur.id) {
    side = buildExplorer(true); side.gameId = cur.id; side.lastHand = myHandText(); side.lastCan = null;
    fill(el, h("h3", { text: "Dizionario" }), side.nodes);
  }
  const hand = myHandText(), can = myTurn() && !ui.busy;
  if (hand !== side.lastHand) { side.lastHand = hand; if (!side.edited) side.handIn.value = hand; side.lastCan = null; }
  if (can !== side.lastCan) { side.lastCan = can; side.run(); }
}
WIDE.addEventListener("change", () => render());

function showRules() {
  const c = regoleAttive();
  if (c.attaccoLibero) return sheet("Regole in breve (s1)", [h("ul", null,
    h("li", { text: "Ognuno vede il proprio Sanctum in basso. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte." }),
    h("li", { text: "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum." }),
    h("li", { text: "Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata). Con il Collegamento attivo puoi entrare nel Sanctum nemico, agganciandoti a una sua parola." }),
    h("li", { text: "Attacco: qualsiasi parola che ha una lettera nel Sanctum nemico può essere lanciata (tocca «Attacca»). La potenza è il punteggio della parola; l'incantesimo corre verso il bordo del Sanctum nemico e perde 1 per casella e 1 in più per ogni lettera. Dopo il lancio la parola si consuma: sparisce, tranne le lettere che reggono altre parole." }),
    h("li", { text: "Difesa: consacra una parola scritta tutta nel tuo Sanctum (tocca «Consacra»). La sua resistenza è " + (c.consacrazione >= 1 ? c.consacrazione + " volte" : "metà del") + " il punteggio, massimo " + (c.maxConsacrate || 2) + " attive, e perde 1 a ogni tuo turno." }),
    h("li", { text: c.scudo === "riga" ? "Scudo: una difesa consacrata protegge tutta la sua riga (le righe a strisce). Un incantesimo lanciato su quella riga, o che la attraversa per uscire, deve prima superarla: se è più debole viene assorbito, se è più forte la disintegra e prosegue con la potenza che resta. Gli scudi si sommano." : "Le difese intercettano gli incantesimi nella loro colonna e in quelle accanto." }),
    h("li", { text: "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala tutta, qualunque sia la sua resistenza; una volta ogni " + (c.faloOgni || 3) + " turni. È il modo per togliere uno Scudo troppo forte. Bruciare parole al centro scatena una Tempesta sulle parole vicine." }),
    h("li", { text: "Le parole non lanciate fanno da ponte o da ostacolo e perdono 1 di Stabilità a ogni tuo turno. Alchimia: cambi da 1 a 7 lettere invece di scrivere." }),
    h("li", { text: "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da " + c.hp + ")." }))]);
  sheet("Regole in breve", [h("ul", null,
    h("li", { text: c.letturaDalLato ? "Ognuno vede il proprio Sanctum in basso, come seduti ai lati opposti di un tavolo. Le parole verticali si leggono dall'alto in basso dal lato di chi le ha scritte: quelle dell'avversario le vedi capovolte." : "Il Sanctum del Mago Blu è in alto, quello del Mago Rosso in basso. Le parole si leggono da sinistra a destra e dall'alto in basso." }),
    h("li", { text: "A turno scrivi una parola italiana sulla griglia, come a Scarabeo: tutte le parole che si formano devono essere valide. Al primo turno scrivi solo nel tuo Sanctum." }),
    h("li", { text: "Le parole di Fuoco, Gelo e Acqua sono attacchi: scegli una loro lettera in un Sanctum e l'incantesimo corre dritto lungo la colonna verso il mago avversario. Perde 1 di potenza per casella e 1 in più per ogni lettera che attraversa." }),
    h("li", { text: "Le parole di Terra sono difese permanenti: intercettano gli incantesimi nella loro colonna e in quelle accanto. Puoi anche consacrare come difesa una parola neutra del tuo Sanctum (metà resistenza, si consuma, massimo " + (c.maxConsacrate || 2) + " attive)." }),
    h("li", { text: "Per invadere il Sanctum nemico serve il Collegamento Magico: una catena di parole dal tuo Sanctum fino a una parola tutta nella Terra di Mezzo che tocca il Passo Arcano (la riga dorata)." }),
    h("li", { text: "Grande Falò: allunga o incrocia una parola al centro o nel Sanctum nemico e bruciala, una volta ogni " + (c.faloOgni || 3) + " turni. Distruggere parole al centro scatena una Tempesta sulle parole vicine." }),
    h("li", { text: "Le parole d'attacco e neutre perdono 1 di Stabilità a ogni tuo turno e poi si spengono. Alchimia: cambi da 1 a 7 lettere invece di scrivere." }),
    h("li", { text: "A distanza hai 48 ore per ogni turno: allo scadere il turno passa da solo. Chi lo lascia scadere 2 volte di fila perde la partita." }),
    h("li", { text: "Vince chi porta l'avversario a 0 Punti Vita (in questa partita si parte da " + c.hp + ")." }),
    h("li", { text: "Toccando una lettera sulla griglia vedi a quali parole appartiene, il loro tipo e quanto durano ancora." }))]);
}

// ---------- disegno della partita ----------
function previewLine() {
  const s = S(), p = mySeat();
  if (ui.alch) return { text: ui.alch.length ? "Cambio " + ui.alch.length + " lettere" : "Tocca le lettere da cambiare" };
  if (ui.launch) return { text: "Tocca la lettera da cui lanciare", tipo: "il numero è il danno previsto" };
  if (ui.place && !ui.pending.length) return { text: "Tocca la casella dove inizia «" + ui.place.word + "»", tipo: ui.place.dir === "h" ? "orizzontale →" : "verticale ↓" };
  if (drag && drag.err) return { err: true, text: drag.err };
  if (!ui.pending.length) return null;
  if (dictState !== "pronto") return { err: true, text: dictState === "errore" ? "Il dizionario non si è caricato: ricarica la pagina." : "Carico il dizionario…" };
  const v = G.validate(s, p, placed(), opts());
  if (!v.ok) return { err: true, text: v.err };
  const nm = v.main.text;
  if (ui.place && !drag) { const base = previewCore(v, s); return Object.assign(base, { tipo: (base.tipo ? base.tipo + " · " : "") + "trascinala per spostarla" }); }
  return previewCore(v, s);
}
function previewCore(v, s) {
  const nm = v.main.text;
  if (v.type === "falo") return { text: nm, tipo: "Grande Falò su " + v.targets.map(id => s.words[id].text).join(", ") };
  if (v.type === "attacco") return { text: nm, tipo: (v.el ? EL[v.el] + " · " : "Attacco · ") + "potenza " + v.score + (s.cfg.attaccoConsuma ? " · la parola si consuma" : "") };
  if (s.cfg.attaccoLibero && v.type === "neutra") return { text: nm, tipo: "parola neutra · Stabilità " + v.base + (v.launches.length ? " · «Attacca» per lanciarla" : "") };
  if (v.type === "difesa") return { text: nm, tipo: v.consacrata ? "Difesa consacrata · resistenza " + Math.max(1, Math.ceil(v.score * (s.cfg.consacrazione || .5))) : "Difesa · resistenza " + v.score };
  if (v.type === "cataclisma") return { text: nm, tipo: EL[v.el] + " al centro: Cataclisma (ancora senza effetto)" };
  if (v.type === "bloccato") return { text: nm, tipo: "le difese nemiche impediscono il lancio" };
  return { text: nm, tipo: "parola neutra · Stabilità " + v.base };
}
function pbar(s, p) {
  const max = (s.cfg && s.cfg.hp) || 30, hp = s.hp[p];
  const chips = [];
  if (G.bridgeActive(s, p)) chips.push(h("span", { class: "chip ok", text: "Ponte attivo" }));
  else chips.push(h("span", { class: "chip", text: "Ponte non attivo" }));
  const cons = Object.values(s.words).filter(w => w.o === p && w.consacrata).length;
  if (s.cfg && s.cfg.maxConsacrate) chips.push(h("span", { class: "chip", text: "Consacrate " + cons + "/" + s.cfg.maxConsacrate }));
  if (s.cfg && s.cfg.faloOgni) { const left = s.cfg.faloOgni - (s.turns[p] - s.lastFalo[p]); chips.push(h("span", { class: "chip" + (left <= 0 ? " ok" : ""), text: left <= 0 ? "Falò pronto" : "Falò tra " + left + " turni" })); }
  chips.push(h("span", { class: "chip", text: s.hands[p].length + " lettere" }));
  return h("div", { class: "pbar " + p + (s.turn === p && !s.winner ? " turn" : "") },
    h("span", { class: "nm", text: s.seats[p] ? seatName(s, p) + (s.seats[p].tok === MYID && !(s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok) ? " (tu)" : "") : NOMI[p] + " (libero)" }),
    h("div", { class: "hp", role: "meter", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": hp, "aria-label": "Punti Vita" }, h("i", { style: "width:" + Math.max(0, Math.min(100, hp / max * 100)) + "%" })),
    h("span", { class: "hpn", text: hp + " PV" }),
    h("div", { class: "chips" }, chips));
}
function boardEl(s) {
  const view = viewSeat(), R = G.ROWS, C = G.COLS;
  const idx = G.cellIndex(s.words);
  const pend = {}; ui.pending.forEach(p => { pend[G.key(p.r, p.c)] = p.l; });
  const firstCell = {}; Object.values(s.words).forEach(w => { if (w.type === "difesa" || w.type === "attacco") firstCell[w.cells[0]] = w; });
  // frecce: sulla prima lettera di ogni parola, nel verso in cui si legge come la vedi tu
  const topA = topSeat() === "A";
  const arrows = {};
  const addArrow = (cells, cls) => {
    if (!cells || cells.length < 2) return;
    const [r0, c0] = G.parse(cells[0]), [r1, c1] = G.parse(cells[1]);
    let dir = "dx";
    if (c0 === c1) dir = ((topA ? r1 - r0 : r0 - r1) > 0) ? "giu" : "su";
    (arrows[cells[0]] = arrows[cells[0]] || []).push({ dir, cls });
  };
  Object.values(s.words).forEach(w => addArrow(w.cells, w.o));
  if (ui.pending.length && mySeat() && dictState === "pronto") {
    const v = G.validate(s, mySeat(), placed(), opts());
    if (v.ok) addArrow(v.main.cells, "pend");
  }
  const trail = {}, hit = {};
  if (anim) anim.path.slice(0, anim.i).forEach(st => { trail[st.k] = st; if (st.def) hit[st.k] = 1; });
  // senza lettura dal lato: Blu in alto per tutti. Con lettura dal lato: il proprio Sanctum in basso
  const rows = []; for (let i = 0; i < R; i++) rows.push(topSeat() === "A" ? i : R - 1 - i);
  const scudi = {}; // righe con uno Scudo: una difesa consacrata nel proprio Sanctum
  for (const id in s.words) { const w = s.words[id]; if (w.type !== "difesa") continue; for (const kk of w.cells) { const rr = G.parse(kk)[0]; if (G.zoneOf(rr) === w.o) scudi[rr] = 1; } }
  const cells = [];
  for (const r of rows) for (let c = 0; c < C; c++) {
    const k = G.key(r, c), z = G.zoneOf(r), t = s.tiles[k];
    const cls = ["cell", z === "M" ? (r === G.STAFFA ? "st" : "") : "z" + z];
    if (s.cfg && s.cfg.scudo === "riga" && scudi[r]) cls.push("scudo");
    if (ui.launch && k in ui.launch) cls.push("launch");
    if (drag && drag.bad === k) cls.push("badcell");
    if (trail[k]) cls.push(hit[k] ? "hitdef" : "trail");
    if (anim && anim.launch === k) cls.push("origin");
    const kids = [];
    if (t) {
      const ws = (idx[k] || []).map(id => s.words[id]);
      const d = ws.find(w => w.type === "difesa"), a = ws.find(w => w.type === "attacco");
      const tc = ["tile", "o" + t.o]; if (d) tc.push(d.consacrata ? "consacrata" : "difesa"); else if (a) tc.push(a.el);
      kids.push(h("span", { class: tc.join(" ") }, t.l, h("span", { class: "v", text: G.VAL[t.l] })));
      const fw = firstCell[k];
      if (fw) kids.push(h("span", { class: "badge " + (fw.type === "difesa" ? (fw.consacrata ? "consacrata" : "difesa") : fw.el), text: fw.stab }));
    } else if (pend[k]) {
      kids.push(h("span", { class: "tile pend" }, pend[k], h("span", { class: "v", text: G.VAL[pend[k]] })));
    } else if (G.MULT[k]) kids.push(h("span", { class: "mult " + G.MULT[k], text: G.MULT[k] }));
    if (arrows[k]) arrows[k].forEach(a => kids.push(h("span", { class: "arr " + a.dir + " " + a.cls, "aria-hidden": "true", text: a.dir === "dx" ? "→" : a.dir === "giu" ? "↓" : "↑" })));
    if (ui.launch && k in ui.launch) kids.push(h("span", { class: "dmg" + (ui.launch[k] ? "" : " zero"), text: ui.launch[k] }));
    if (trail[k] && !hit[k]) kids.push(h("span", { class: "pw", text: trail[k].power }));
    const label = "Riga " + (r + 1) + ", colonna " + (c + 1) + (t ? ", lettera " + t.l : pend[k] ? ", lettera " + pend[k] + " in posa" : ", vuota");
    cells.push(h("button", { class: cls.filter(Boolean).join(" "), "data-k": k, "aria-label": label, onclick: () => onCell(k) }, kids));
  }
  return h("div", { class: "board" + (ui.place && ui.pending.length ? " placing" : "") + (drag ? " dragging" : ""), role: "grid", "aria-label": "Campo di battaglia", onpointerdown: onBoardPointerDown }, cells);
}
function renderGame() {
  const Gm = document.getElementById("game");
  const s = S();
  if (!s) { Gm.replaceChildren(h("div", { class: "topbar" }, h("button", { class: "btn small", onclick: leaveGame, text: "← Partite" })), h("p", { class: "note", text: "Carico la partita…" })); return; }
  const me = mySeat(), view = viewSeat(), opp = G.enemy(view), top = topSeat();
  const both = s.seats.A && s.seats.B && s.seats.A.tok === s.seats.B.tok && s.seats.A.tok === MYID;
  // stato
  let status, sub = "";
  if (s.winner) status = "Vince " + seatName(s, s.winner) + "!";
  else if (!s.seats.B) { status = me === "A" ? "In attesa dello sfidante" : "Sei stato sfidato a Grimorio!"; sub = me === "A" ? "Manda il link d'invito: la partita inizia quando l'avversario si siede." : "Scegli il tuo nome e siediti come Mago Rosso."; }
  else if (myTurn()) { status = both ? "Turno del " + NOMI[s.turn] : "Tocca a te"; sub = s.first[me] ? "Primo turno: scrivi nel tuo Sanctum (" + (me === top ? "in alto" : "in basso") + ")." : both ? "Modalità prova: giochi entrambi i maghi." : ""; }
  else if (me && s.seats[s.turn] && s.seats[s.turn].cpu) { status = seatName(s, s.turn) + " sta pensando…"; }
  else if (me) { status = "Tocca a " + seatName(s, s.turn); sub = pushOn() ? "Puoi chiudere: ti avviso quando tocca a te." : "Puoi chiudere la pagina: la partita ti aspetta."; }
  else status = "Stai guardando: tocca a " + seatName(s, s.turn);

  // mano
  const hand = me ? s.hands[me] : [];
  const usedIdx = new Set(ui.pending.map(p => p.hi));
  let order = ui.order && ui.order.length === hand.length ? ui.order : hand.map((_, i) => i);
  const handEl = me ? h("div", { class: "hand", role: "group", "aria-label": "Il tuo Grimorio" }, order.map(i => {
    const l = hand[i], used = usedIdx.has(i);
    const cls = ["htile", G.VAL[l] >= 3 ? "rune" : "", ui.sel === i ? "sel" : "", ui.alch && ui.alch.includes(i) ? "alch" : "", used ? "ghost" : ""].filter(Boolean).join(" ");
    return h("button", { class: cls, disabled: used || !myTurn(), "aria-pressed": ui.sel === i, "aria-label": "Lettera " + l + ", valore " + G.VAL[l], onclick: () => onHand(i) }, l, h("span", { class: "v", text: G.VAL[l] }));
  })) : null;

  // pulsanti
  const actions = [];
  const turn = myTurn() && !ui.busy;
  if (turn && ui.launch) actions.push(h("button", { class: "btn", onclick: () => { ui.launch = null; render(); }, text: "Annulla lancio" }));
  else if (turn && ui.alch) {
    actions.push(h("button", { class: "btn", onclick: () => { ui.alch = null; render(); }, text: "Annulla" }));
    actions.push(h("button", { class: "btn small", onclick: () => { ui.alch = hand.map((_, i) => i); render(); }, text: "Tutte" }));
    actions.push(h("button", { class: "btn primary", disabled: !ui.alch.length, onclick: doAlchimia, text: "Cambia " + ui.alch.length + " lettere" }));
  } else if (turn && ui.place && !ui.pending.length) {
    actions.push(h("button", { class: "btn", onclick: cancelPlace, text: "Annulla" }));
    actions.push(h("button", { class: "btn", onclick: rotatePlace, text: "↻ Gira (" + (ui.place.dir === "h" ? "ora orizzontale" : "ora verticale") + ")" }));
  } else if (turn && ui.pending.length) {
    const pv = previewLine();
    actions.push(h("button", { class: "btn", onclick: () => { ui.pending = []; ui.mode = null; ui.place = null; render(); }, text: "Ritira" }));
    if (ui.place) actions.push(h("button", { class: "btn", "aria-label": "Gira la parola", onclick: rotatePlace, text: "↻ Gira" }));
    if (s.cfg && s.cfg.attaccoLibero) actions.push(h("button", { class: "btn" + (ui.mode === "attacca" ? " on" : ""), "aria-pressed": ui.mode === "attacca", onclick: () => { ui.mode = ui.mode === "attacca" ? null : "attacca"; render(); }, text: "Attacca" }));
    actions.push(h("button", { class: "btn" + (ui.mode === "falo" ? " on" : ""), "aria-pressed": ui.mode === "falo", onclick: () => { ui.mode = ui.mode === "falo" ? null : "falo"; render(); }, text: "Falò" }));
    if (s.cfg && s.cfg.consacrazione) actions.push(h("button", { class: "btn" + (ui.mode === "consacra" ? " on cons" : ""), "aria-pressed": ui.mode === "consacra", onclick: () => { ui.mode = ui.mode === "consacra" ? null : "consacra"; render(); }, text: "Consacra" }));
    actions.push(h("button", { class: "btn primary", disabled: !pv || pv.err, onclick: onConfirm, text: "Conferma" }));
  } else if (turn) {
    actions.push(h("button", { class: "btn small", onclick: () => { const o = hand.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } ui.order = o; ui.sel = null; render(); }, text: "Mescola" }));
    actions.push(h("button", { class: "btn small", onclick: () => { ui.alch = []; ui.sel = null; render(); }, text: "Alchimia" }));
    const costo = (s.cfg && s.cfg.costoSuggerimento) || 3;
    actions.push(ui.hintConfirm
      ? h("button", { class: "btn small danger", onclick: () => { ui.hintConfirm = false; askHint(); }, text: "Sì, suggerisci (−" + costo + " PV)" })
      : h("button", { class: "btn small", disabled: hintBusy || s.hp[mySeat()] <= costo, title: "Il computer ti propone la mossa migliore: costa " + costo + " PV", onclick: () => { ui.hintConfirm = true; render(); setTimeout(() => { ui.hintConfirm = false; render(); }, 4000); }, text: hintBusy ? "Ci penso…" : "Suggerisci" }));
    actions.push(ui.passConfirm
      ? h("button", { class: "btn small danger", onclick: doPass, text: "Sì, passa il turno" })
      : h("button", { class: "btn small", onclick: () => { ui.passConfirm = true; render(); setTimeout(() => { ui.passConfirm = false; render(); }, 4000); }, text: "Passa" }));
  }
  const pv = previewLine();
  const seatBtns = [];
  if (!me && !s.winner && !s.seats.B) {
    if (!CRED) seatBtns.push(h("label", { class: "field", for: "nome-sfidante", style: "width:100%" }, "Il tuo nome di mago", h("input", { type: "text", id: "nome-sfidante", maxlength: "24", placeholder: "Come ti chiami?", value: myName() })));
    seatBtns.push(h("button", { class: "btn primary", onclick: sitDown, text: "Siediti come Mago Rosso" }));
  }
  if (!me && s.seats.A && s.seats.B && !s.winner) seatBtns.push(h("p", { class: "note", text: "Questa partita ha già due giocatori. Se è tua, aprila dal dispositivo con cui giochi o usa il link di accesso del tuo profilo." }));
  if (me === "A" && !s.seats.B && !s.winner) seatBtns.push(h("button", { class: "btn primary", onclick: invite, text: "Invita un amico" }));
  if (me && !s.winner && s.seats.B && !s.seats.B.cpu && !both) { const pb = pushButton(); if (pb) seatBtns.push(pb); }

  fill(Gm, 
    h("div", { class: "topbar" },
      h("button", { class: "btn small", onclick: leaveGame, text: "← Partite" }),
      h("span", { class: "title", text: "Grimorio" }),
      h("button", { class: "btn small", onclick: showRules, text: "Regole" })),
    pbar(s, top),
    h("div", { class: "boardwrap" }, boardEl(s)),
    h("div", { class: "legend" },
      h("span", { style: "--c:var(--z" + top + ")", text: "▲ Sanctum " + (top === "A" ? "Blu" : "Rosso") + (me === top && !both ? " (tuo)" : "") }),
      h("span", { style: "--c:var(--zS)", text: "Passo Arcano · → ↓ ↑ verso di lettura" }),
      h("span", { style: "--c:var(--z" + G.enemy(top) + ")", text: "▼ Sanctum " + (top === "A" ? "Rosso" : "Blu") + (me === G.enemy(top) && !both ? " (tuo)" : "") })),
    pbar(s, G.enemy(top)),
    h("p", { class: "status" }, status, sub ? h("small", { text: sub }) : null, me && clockText(s, myTurn()) ? h("small", { id: "orologio", text: clockText(s, myTurn()) }) : null),
    s.winner ? h("p", { class: "winner", text: "✦ " + seatName(s, s.winner) + " ✦" }) : null,
    seatBtns.length ? h("div", { class: "actions" }, seatBtns) : null,
    pv ? h("p", { class: "preview" + (pv.err ? " err" : "") }, pv.text, pv.tipo ? h("span", { class: "tipo", text: " · " + pv.tipo }) : null) : (me && myTurn() ? h("p", { class: "preview" }, h("span", { class: "tipo", text: ui.sel !== null ? "Ora tocca una casella del campo" : "Tocca una lettera, poi una casella" })) : null),
    handEl,
    actions.length ? h("div", { class: "actions" }, actions) : null,
    h("div", { class: "actions" }, h("button", { class: "btn small solo-stretto", onclick: showExplorer, text: "Esplora il dizionario" })),
    dictState === "carico" && me ? h("p", { class: "note", style: "text-align:center", text: "Carico il dizionario (750.000 parole)…" }) : null,
    h("details", { class: "card" }, h("summary", { text: "Cronaca della partita" }), h("div", { class: "log" }, s.log.slice().reverse().map(m => h("div", { text: m })))),
    me ? (s.winner
      ? h("div", { class: "actions" }, h("button", { class: "btn link", onclick: hideGame, text: "Togli dall'elenco" }))
      : ui.delConfirm
        ? h("div", { class: "actions" }, h("button", { class: "btn small", onclick: () => { ui.delConfirm = false; render(); }, text: "Annulla" }),
            h("button", { class: "btn small danger", onclick: resignGame, text: (!s.seats.B || both) ? "Sì, elimina la partita" : "Sì, abbandono (vince l'avversario)" }))
        : h("div", { class: "actions" }, h("button", { class: "btn link", onclick: () => { ui.delConfirm = true; render(); }, text: (!s.seats.B || both) ? "Elimina partita" : "Abbandona la partita" }))) : null
  );
}

function render() {
  const inGame = !!cur;
  document.getElementById("lobby").hidden = inGame;
  document.getElementById("game").hidden = !inGame;
  if (inGame) renderGame(); else renderLobby();
  updateSide();
}
document.getElementById("sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
window.addEventListener("hashchange", () => { const m = /^#g=([a-z0-9]+)/.exec(location.hash); if (m && (!cur || cur.id !== m[1])) openGame(m[1]); });
async function init() {
  render(); loadDict();
  const acc = /^#accedi=([a-z0-9]+\.[a-f0-9]+)/.exec(location.hash);
  if (acc) await useAccessLink(acc[1]);
  const m = /^#g=([a-z0-9]+)/.exec(location.hash);
  if (CRED) { connectWs(); await loadGames(); if (pushOn()) enablePush(true); } else { conn = "ok"; render(); }
  if (m) openGame(m[1]);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}
init();
