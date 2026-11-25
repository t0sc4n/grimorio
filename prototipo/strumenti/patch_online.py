# Trasforma la pagina del prototipo (artefatto) nella versione online che parla con il server.
# Il prototipo è bilingue: i testi fissi sono tr("..."). Le ancore qui sotto sono scritte in italiano semplice
# e vengono avvolte in tr() come nel prototipo; alla fine si avvolgono anche i testi nuovi della versione online.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lingua_comune import avvolgi, chiavi, aggiungi_en_online
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
K = chiavi(s)

def rep(a, b):
    global s
    a = avvolgi(a, K)
    assert s.count(a) == 1, (a[:90], s.count(a))
    s = s.replace(a, b)

def rep_range(start, end, new):
    """sostituisce il testo da start (incluso) a end (escluso)"""
    global s
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + new + s[j:]

# ---------- dati: dal db di claude.ai al server ----------
rep_range('// ---------- identità e archivio ----------', '// ---------- stato dell\'interfaccia ----------', r'''// ---------- collegamento al server ----------
let CRED = store.get("grimorio-cred", null);   // { id, token, name }: chi sei su questo dispositivo
let MYID = CRED ? CRED.id : null;
let conn = "collego";                          // collego | ok | errore
let games = {};
let cur = null;                                // { id, data: { id, s, updated } }
let pendingOpen = null;
let ws = null, wsTimer = null, wsDelay = 1000;

function myName() { return store.get("grimorio-nome", "") || (CRED && CRED.name) || ""; }
async function api(method, path, body) {
  const headers = { "Content-Type": "application/json", "X-Lingua": LANG };  // il server risponde nella lingua dell'interfaccia
  if (CRED) headers.Authorization = "Bearer " + CRED.token;
  let res;
  try { res = await fetch("/api/" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { const err = new Error("Nessuna connessione con il server. Controlla la rete e riprova."); err.status = 0; throw err; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || tr("Errore del server ({n}).", { n: res.status })); err.status = res.status; throw err; }
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
    h("p", { text: tr("Sei {n} su questo dispositivo.", { n: CRED.name || "Mago" }) }),
    h("p", { class: "sub", text: "Per giocare le stesse partite da un altro telefono o computer, apri lì questo link. Non mandarlo a nessuno: chi lo apre gioca al posto tuo." }),
    h("input", { type: "text", id: "link-accesso", value: link, readonly: true, onfocus: ev => ev.target.select() }),
    h("button", { class: "btn small", onclick: async () => { try { await navigator.clipboard.writeText(link); toast("Link di accesso copiato."); } catch (e) { document.getElementById("link-accesso").select(); } }, text: "Copia il link di accesso" })
  ]);
}
async function useAccessLink(token) {
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  const prev = CRED; CRED = { id: token.split(".")[0], token, name: "" };
  try { const me = await api("GET", "me"); CRED.name = me.name; MYID = me.id; store.set("grimorio-cred", CRED); store.set("grimorio-nome", me.name); toast(tr("Accesso eseguito: bentornato, {n}.", { n: me.name })); }
  catch (e) { CRED = prev; toast("Il link di accesso non è valido.", true); }
}

''')
rep("function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, passConfirm: false, hintConfirm: false, hintLaunch: null, delConfirm: false, claimConfirm: null, busy: false, order: null }; }",
    "function freshUi() { return { place: null, pending: [], sel: null, mode: null, launch: null, alch: null, passConfirm: false, hintConfirm: false, hintLaunch: null, delConfirm: false, busy: false, order: null }; }")

# ---------- lobby ----------
rep('''  const connMsg = { collego: "Collegamento alle partite condivise…", lento: "Le partite condivise non rispondono ancora. Controlla la connessione.", errore: "Non riesco a leggere le partite condivise.", locale: "Modalità locale: le partite restano solo su questo dispositivo. Apri la pagina da claude.ai per giocare a distanza.", ok: "" }[conn];
  const name = h("input", { type: "text", id: "nome", maxlength: "24", placeholder: "Come ti chiami?", value: myName(), oninput: e => store.set("grimorio-nome", e.target.value.trim()) });''',
'''  const connMsg = { collego: "Collegamento al server…", errore: "Non riesco a raggiungere il server. Controlla la connessione e riprova.", ok: "" }[conn];
  const name = h("input", { type: "text", id: "nome", maxlength: "24", placeholder: "Come ti chiami?", value: myName(), oninput: e => store.set("grimorio-nome", e.target.value.trim()), onchange: e => saveName(e.target.value) });''')
rep('''    h("option", { value: "persona", text: "Un'altra persona (a distanza)" }),
    h("option", { value: "facile", text: "Il computer, livello facile" }),
    h("option", { value: "normale", text: "Il computer, livello normale", selected: true }));
  both.disabled = true;
  const canCreate = conn === "ok" || conn === "locale";''', '''    h("option", { value: "persona", text: "Un'altra persona (a distanza)", selected: true }),
    h("option", { value: "facile", text: "Il computer, livello facile" }),
    h("option", { value: "normale", text: "Il computer, livello normale" }));
  const canCreate = conn !== "collego";''')
rep('''    CANWRITE === false ? h("p", { class: "note", text: "Puoi guardare le partite ma non giocare: chiedi al proprietario di invitarti come Editor." }) : null,''',
    '''    pushButton("btn"),''')
rep('''      h("button", { class: "btn primary", disabled: !canCreate || CANWRITE === false, onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value, dizSel()), text: "Crea partita" })),''',
    '''      h("button", { class: "btn primary", disabled: !canCreate, onclick: () => createGame(+hp.value, both.checked, vs.value, reg.value, dizSel()), text: "Crea partita" })),''')
rep('''      ids.length ? h("div", { class: "gamelist" }, ids.map(id => gameItem(id, games[id]))) : h("p", { class: "note", text: conn === "collego" ? "Carico le partite…" : "Nessuna partita. Creane una qui sopra." })),''',
    '''      ids.length ? h("div", { class: "gamelist" }, ids.map(id => gameItem(id, games[id]))) : h("p", { class: "note", text: conn === "collego" ? "Carico le partite…" : "Nessuna partita. Creane una qui sopra, oppure apri il link d'invito che ti hanno mandato." })),''')
rep('''      h("p", { class: "note", style: "margin-top:8px", text: "Condividi questa pagina dal menu di claude.ai invitando l'avversario per email come Editor. Crea una partita: l'avversario la apre dall'elenco e tocca «Siediti come Mago Rosso». Ognuno gioca il proprio turno quando può; la partita si aggiorna da sola." })),
    h("div", { class: "row" }, h("button", { class: "btn link", onclick: showRules, text: "Regole in breve" }), h("button", { class: "btn link", onclick: showExplorer, text: "Esplora il dizionario" }))''',
'''      h("p", { class: "note", style: "margin-top:8px", text: "Crea una partita scegliendo «Un'altra persona» e tocca «Invita un amico»: manda il link su WhatsApp o dove preferisci. Chi lo apre sceglie un nome e si siede come Mago Rosso. Ognuno gioca il proprio turno quando può; con le notifiche attive il telefono ti avvisa quando tocca a te." })),
    h("details", null, h("summary", { text: "Installa Grimorio sul telefono" }),
      h("p", { class: "note", style: "margin-top:8px", text: "In Chrome per Android apri il menu ⋮ e scegli «Aggiungi a schermata Home» (o «Installa app»). Grimorio si aprirà a tutto schermo come un'app e potrà mandarti le notifiche." })),
    h("div", { class: "row" }, h("button", { class: "btn link", onclick: showRules, text: "Regole in breve" }), h("button", { class: "btn link", onclick: showExplorer, text: "Esplora il dizionario" }), CRED ? h("button", { class: "btn link", onclick: showProfile, text: "Il tuo profilo" }) : null)''')

rep_range('async function createGame(hp, both, vs, regole, dizionari) {', '// ---------- partita ----------', '''async function createGame(hp, both, vs, regole, dizionari) {
  try {
    await ensurePlayer();
    const r = await api("POST", "games", { hp, both, vs, regole, dizionari });
    games[r.id] = r; openGame(r.id);
    if (vs === "persona" && !both) toast("Partita creata: ora tocca «Invita un amico».");
  } catch (e) { toast(e.message, true); }
}

''')

# ---------- apertura e aggiornamento della partita ----------
rep_range('// ---------- partita ----------', 'function announce(s) {', '''// ---------- partita ----------
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
  usaDiz(dizScelti());
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  render(); loadGames();
}
function onGameData(data, first) {
  const prev = cur && cur.data && cur.data.s;
  cur.data = JSON.parse(JSON.stringify(data));
  const s = cur.data.s;
  G.applyCfg(s.cfg || BASE);
  usaDiz(G.dizionariDi(s.cfg || {}));
  if (!prev || prev.moveNo !== s.moveNo) { const keepOrder = ui.order; ui = freshUi(); ui.order = keepOrder; }
  const seen = store.get("grimorio-visto", {});
  const isNewMove = !!(s.last && s.last.seq && seen[cur.id] !== s.last.seq);
  if (isNewMove) {
    seen[cur.id] = s.last.seq; store.set("grimorio-visto", seen);
    announce(s); startAnim(s.last);
  }
  onStateSounds(cur.id, prev, s, isNewMove);
  render();
}
''')

# il computer ora gioca sul server
rep_range('// ---------- giocatore automatico ----------', '// ---------- parola intera dal dizionario', '')

# ---------- mosse inviate al server ----------
rep_range('async function commit(newS) {', 'function onConfirm() {', '''async function sendMove(move) {
  if (ui.busy) return;
  ui.busy = true; render();
  try {
    const r = await api("POST", "games/" + cur.id + "/move", Object.assign({ moveNo: S().moveNo }, move));
    games[r.id] = r; if (cur && cur.id === r.id) onGameData(r);
  } catch (e) { toast(e.message, true); if (e.status === 409 && cur) refreshGame(cur.id); }
  ui.busy = false; render();
}
''')
rep_range('function doPlay(extra) {', 'function onCell(k) {', '''function doPlay(extra) {
  const s = S(), p = mySeat(), o = Object.assign(opts(), extra);
  const v = G.validate(s, p, placed(), o);
  if (!v.ok) return toast(v.err, true);
  sendMove({ kind: "play", placed: placed(), opts: o });
}
''')
rep_range('function doAlchimia() {', '// info su una casella', '''function doAlchimia() {
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

''')

# ---------- schermata di gioco ----------
rep('''  else if (!s.seats.B) { status = me === "A" ? "In attesa dello sfidante" : "Il posto del Mago Rosso è libero"; sub = me === "A" ? "Invita qualcuno: vedi «Come sfidare qualcuno a distanza» nella pagina delle partite." : ""; }''',
    '''  else if (!s.seats.B) { status = me === "A" ? "In attesa dello sfidante" : "Sei stato sfidato a Grimorio!"; sub = me === "A" ? "Manda il link d'invito: la partita inizia quando l'avversario si siede." : "Scegli il tuo nome e siediti come Mago Rosso."; }''')
rep('''  else if (me && s.seats[s.turn] && s.seats[s.turn].cpu) { status = tr("{n} sta pensando…", { n: seatName(s, s.turn) }); sub = "Il computer gioca dal tuo dispositivo: resta su questa pagina."; }
  else if (me) { status = tr("Tocca a {n}", { n: seatName(s, s.turn) }); sub = "Puoi chiudere la pagina: la partita ti aspetta."; }''',
    '''  else if (me && s.seats[s.turn] && s.seats[s.turn].cpu) { status = tr("{n} sta pensando…", { n: seatName(s, s.turn) }); }
  else if (me) { status = tr("Tocca a {n}", { n: seatName(s, s.turn) }); sub = pushOn() ? "Puoi chiudere: ti avviso quando tocca a te." : "Puoi chiudere la pagina: la partita ti aspetta."; }''')
rep('''  const seatBtns = [];
  if (!me && !s.winner) for (const p of ["A", "B"]) {
    if (!s.seats[p]) seatBtns.push(h("button", { class: "btn primary", disabled: CANWRITE === false, onclick: () => sitDown(p), text: tr("Siediti come {n}", { n: tr(NOMI[p]) }) }));
  }
  if (!me && s.seats.A && s.seats.B && !s.winner) {
    seatBtns.push(ui.claimConfirm
      ? h("div", { class: "row" }, ["A", "B"].map(p => h("button", { class: "btn small", onclick: () => sitDown(p), text: tr("Sono {n}", { n: seatName(s, p) }) })))
      : h("button", { class: "btn link", onclick: () => { ui.claimConfirm = true; render(); }, text: "Stai già giocando questa partita da un altro dispositivo?" }));
  }''', '''  const seatBtns = [];
  if (!me && !s.winner && !s.seats.B) {
    if (!CRED) seatBtns.push(h("label", { class: "field", for: "nome-sfidante", style: "width:100%" }, "Il tuo nome di mago", h("input", { type: "text", id: "nome-sfidante", maxlength: "24", placeholder: "Come ti chiami?", value: myName() })));
    seatBtns.push(h("button", { class: "btn primary", onclick: sitDown, text: "Siediti come Mago Rosso" }));
  }
  if (!me && s.seats.A && s.seats.B && !s.winner) seatBtns.push(h("p", { class: "note", text: "Questa partita ha già due giocatori. Se è tua, aprila dal dispositivo con cui giochi o usa il link di accesso del tuo profilo." }));
  if (me === "A" && !s.seats.B && !s.winner) seatBtns.push(h("button", { class: "btn primary", onclick: invite, text: "Invita un amico" }));
  if (me && !s.winner && s.seats.B && !s.seats.B.cpu && !both) { const pb = pushButton(); if (pb) seatBtns.push(pb); }''')
rep('''    me ? (ui.delConfirm
      ? h("div", { class: "actions" }, h("button", { class: "btn small", onclick: () => { ui.delConfirm = false; render(); }, text: "Annulla" }), h("button", { class: "btn small danger", onclick: deleteGame, text: "Elimina per sempre" }))
      : h("div", { class: "actions" }, h("button", { class: "btn link", onclick: () => { ui.delConfirm = true; render(); }, text: "Elimina partita" }))) : null''',
'''    me ? (s.winner
      ? h("div", { class: "actions" }, h("button", { class: "btn link", onclick: hideGame, text: "Togli dall'elenco" }))
      : ui.delConfirm
        ? h("div", { class: "actions" }, h("button", { class: "btn small", onclick: () => { ui.delConfirm = false; render(); }, text: "Annulla" }),
            h("button", { class: "btn small danger", onclick: resignGame, text: (!s.seats.B || both) ? "Sì, elimina la partita" : "Sì, abbandono (vince l'avversario)" }))
        : h("div", { class: "actions" }, h("button", { class: "btn link", onclick: () => { ui.delConfirm = true; render(); }, text: (!s.seats.B || both) ? "Elimina partita" : "Abbandona la partita" }))) : null''')

# ---------- avvio ----------
rep('''window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (id && games[id] && (!cur || cur.id !== id)) openGame(id); });
init();''', '''window.addEventListener("hashchange", () => { const m = /^#g=([a-z0-9]+)/.exec(location.hash); if (m && (!cur || cur.id !== m[1])) openGame(m[1]); });
async function init() {
  usaDiz(dizScelti()); render();
  const acc = /^#accedi=([a-z0-9]+\\.[a-f0-9]+)/.exec(location.hash);
  if (acc) await useAccessLink(acc[1]);
  const m = /^#g=([a-z0-9]+)/.exec(location.hash);
  if (CRED) { connectWs(); await loadGames(); if (pushOn()) enablePush(true); } else { conn = "ok"; render(); }
  if (m) openGame(m[1]);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}
init();''')

# nessun riferimento rimasto al vecchio archivio
for bad in ["DB.", "LOCAL", "CANWRITE", "maybeRunCpu", "writeGame", "commit(", "deleteGame", "claimConfirm", "aiWorker"]:
    assert bad not in s, "resta: " + bad

# ---------- traduzioni: testi della versione online in tr(), con la loro traduzione inglese ----------
s = aggiungi_en_online(s)
i = s.index('<script>\n"use strict";'); j = s.rindex("</script>")
s = s[:i] + avvolgi(s[i:j], K) + s[j:]

# ---------- documento completo (fuori da claude.ai serve l'intestazione) ----------
s = s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
head = '''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#13111d">
<meta name="description" content="Grimorio: duelli di parole tra due maghi, anche a distanza.">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
'''
s = head + s.replace('<div class="wrap" id="app">', '</head>\n<body>\n<div class="wrap" id="app">', 1) + '\n</body>\n</html>\n'
open(dst, 'w', encoding='utf-8').write(s)
print('ok')
