// Versione online bilingue: API (errori nella lingua della richiesta, partite in inglese, computer in inglese) e pagina.
// uso: node lingua_online_test.js [url del server] [file del database, per controllare la lingua del giocatore]
const puppeteer = require("puppeteer-core");
const BASE = process.argv[2] || "http://127.0.0.1:3077";
const DBFILE = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
let ko = 0; const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) ko++; };
async function api(method, path, body, tok, lingua) {
  const h = { "Content-Type": "application/json", "X-Lingua": lingua || "en" };
  if (tok) h.Authorization = "Bearer " + tok;
  const r = await fetch(BASE + "/api/" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
(async () => {
  // --- API ---
  const p = (await api("POST", "players", { name: "Test" })).data;
  ok(!!p.token, "giocatore creato");
  if (DBFILE) {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(DBFILE, { readOnly: true });
    ok(db.prepare("SELECT lingua FROM players WHERE id = ?").get(p.id).lingua === "en", "la lingua del giocatore è salvata (en)");
    db.close();
  }
  let r = await api("POST", "games", { hp: 60, vs: "normale", regole: "v5f", lingua: "en" }, p.token);
  ok(r.status === 201 && r.data.s.cfg.lingua === "en" && r.data.s.cfg.attaccoLibero, "partita inglese creata (le classiche diventano s1)");
  const g = r.data;
  r = await api("POST", "games/" + g.id + "/move", { moveNo: 0, kind: "play", placed: [{ r: 7, c: 3, l: "Q" }, { r: 7, c: 4, l: "Q" }] }, p.token);
  ok(r.status === 422 && /not in your Grimoire|not in the dictionary/.test(r.data.error), "errore del motore in inglese: " + r.data.error);
  r = await api("POST", "games/" + g.id + "/move", { moveNo: 0, kind: "play", placed: [{ r: 7, c: 3, l: "Q" }, { r: 7, c: 4, l: "Q" }] }, p.token, "it");
  ok(r.status === 422 && /non presente nel Grimorio|non è nel dizionario/.test(r.data.error), "stesso errore in italiano: " + r.data.error);
  r = await api("GET", "games/zzzzzzzz", null, p.token);
  ok(r.data.error === "Game not found.", "errore del server in inglese: " + r.data.error);
  r = await api("GET", "games/zzzzzzzz", null, p.token, "it");
  ok(r.data.error === "Partita non trovata.", "errore del server in italiano: " + r.data.error);
  r = await api("POST", "games/" + g.id + "/move", { moveNo: 0, kind: "pass" }, p.token);
  ok(r.status === 200, "passo il turno");
  let s = null;
  for (let i = 0; i < 40; i++) { await wait(500); s = (await api("GET", "games/" + g.id, null, p.token)).data.s; if (s.moveNo >= 2) break; }
  ok(s && s.moveNo >= 2, "il computer ha risposto nella partita inglese");
  const last = s.log[s.log.length - 1];
  ok(typeof last === "object" && last.k, "cronaca strutturata: " + JSON.stringify(last));
  const parole = Object.values(s.words || {}).map(w => w.text);
  console.log("     parole sul campo:", parole.join(" ") || "(nessuna)");
  r = await api("POST", "games/" + g.id + "/resign", {}, p.token);
  ok(r.status === 200, "partita eliminata");

  // partita con due dizionari: valgono parole italiane e inglesi, Sacca mista
  r = await api("POST", "games", { hp: 60, vs: "normale", regole: "v5f", dizionari: ["en", "it", "xx"] }, p.token);
  ok(r.status === 201 && r.data.s.cfg.dizionari.join() === "it,en" && r.data.s.cfg.lingua === "it+en" && r.data.s.cfg.attaccoLibero, "partita mista creata (dizionari it+en, regole s1)");
  const gm = r.data;
  ok(gm.s.hands.A.length === 7 && gm.s.bag.length === 76, "Sacca mista di 90 tessere");
  r = await api("POST", "games/" + gm.id + "/move", { moveNo: 0, kind: "pass" }, p.token);
  let sm = null;
  for (let i = 0; i < 60; i++) { await wait(500); sm = (await api("GET", "games/" + gm.id, null, p.token)).data.s; if (sm.moveNo >= 2) break; }
  ok(sm && sm.moveNo >= 2, "il computer ha risposto nella partita mista: " + Object.values(sm.words || {}).map(w => w.text).join(" "));
  await api("POST", "games/" + gm.id + "/resign", {}, p.token);

  // --- pagina ---
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--lang=en-US"] });
  const errors = [];
  const pg = await b.newPage(); pg.on("pageerror", e => errors.push(e.message));
  await pg.setViewport({ width: 400, height: 860 });
  await pg.goto(BASE + "/", { waitUntil: "networkidle0" }); await pg.evaluate(() => localStorage.clear()); await pg.goto(BASE + "/", { waitUntil: "networkidle0" }); await wait(500);
  const testo = sel => pg.evaluate(sel => { const out = [], w = document.createTreeWalker(document.querySelector(sel || "body"), NodeFilter.SHOW_TEXT); while (w.nextNode()) { const x = w.currentNode; if (x.parentElement.closest("script,style")) continue; if (x.nodeValue.trim()) out.push(x.nodeValue.trim()); } return out.join(" | "); }, sel);
  const ITA = /\b(della|delle|Tocca|Partit[ae]|Regole|Turno|lettere|parola|Crea|Avversario|Nuova|Carico|Dizionario|Passa|Conferma|Annulla|Mescola|Suggerisci|Cronaca|Elimina|Vince|contro|PV|Invita|Avvisami|profilo)\b/;
  let t = await testo();
  ok(t.includes("New game") && t.includes("Install Grimorio on your phone"), "pagina online in inglese");
  ok(!ITA.test(t), "elenco partite senza parole italiane" + (ITA.test(t) ? ": «" + t.match(ITA)[0] + "» in " + t.slice(Math.max(0, t.search(ITA) - 60), t.search(ITA) + 40) : ""));
  await pg.type("#nome", "Tester");
  await pg.select("#avversario", "normale");
  ok(await pg.evaluate(() => [...document.querySelectorAll(".dzsel input")].filter(x => x.checked).map(x => x.value).join()) === "en", "pagina: dizionario predefinito inglese");
  await pg.evaluate(() => [...document.querySelectorAll("button")].find(e => e.textContent === "Create game").click());
  await pg.waitForFunction(() => S() && dictState === "pronto" && dictLang === "en", { timeout: 30000 });
  ok(await pg.evaluate(() => S().cfg.lingua === "en" && G.isWord("HELLO")), "partita inglese dalla pagina, dizionario inglese caricato");
  await pg.evaluate(() => doPass());
  await pg.waitForFunction(() => S().moveNo >= 2, { timeout: 40000 });
  t = await testo();
  ok(!ITA.test(t), "partita online senza parole italiane" + (ITA.test(t) ? ": «" + t.match(ITA)[0] + "» in " + t.slice(Math.max(0, t.search(ITA) - 60), t.search(ITA) + 40) : ""));
  ok(/passes\./.test(await testo(".log")), "cronaca in inglese");
  await pg.evaluate(() => [...document.querySelectorAll("button")].find(e => e.textContent === "IT").click()); await wait(300);
  ok(/passa il turno/.test(await testo(".log")), "switch IT: cronaca in italiano");
  // errore del server tradotto: mossa con numero vecchio
  await pg.evaluate(() => [...document.querySelectorAll("button")].find(e => e.textContent === "EN").click()); await wait(200);
  const msg = await pg.evaluate(async () => { try { await api("POST", "games/" + cur.id + "/move", { moveNo: 0, kind: "pass" }); return "nessun errore"; } catch (e) { return e.message; } });
  ok(/changed in the meantime/.test(msg), "errore del server nella pagina, in inglese: " + msg);
  // pulizia: abbandona la partita di prova
  await pg.evaluate(async () => { try { await api("POST", "games/" + cur.id + "/resign"); } catch (e) {} });
  ok(!errors.length, errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore nella pagina");
  await b.close();
  console.log(ko ? ko + " prove fallite" : "tutte le prove passate");
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
