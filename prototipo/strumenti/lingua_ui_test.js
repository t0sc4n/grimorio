// Interfaccia IT/EN e partite in inglese nel prototipo.
// uso: node lingua_ui_test.js [url di test.html]
const puppeteer = require("puppeteer-core");
const URL = process.argv[2] || "http://127.0.0.1:8766/test.html";
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
let ko = 0; const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) ko++; };
// parole italiane che non devono comparire nell'interfaccia inglese
// spunta esattamente i dizionari indicati
const dizionari = (p, ls) => p.evaluate(ls => { const xs = [...document.querySelectorAll(".dzsel input")]; xs.filter(x => ls.includes(x.value) && !x.checked).forEach(x => x.click()); xs.filter(x => !ls.includes(x.value) && x.checked).forEach(x => x.click()); }, ls);
const ITA = /\b(della|delle|Tocca|Partit[ae]|Regole|Turno|lettere|parola|Crea|Avversario|Nuova|Carico|Dizionario|Passa|Conferma|Annulla|Mescola|Suggerisci|Cronaca|Elimina|Vince|contro|PV)\b/;
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--lang=en-US"] });
  const p = await b.newPage(); p.on("pageerror", e => errors.push(e.message));
  await p.setViewport({ width: 400, height: 860 });
  await p.goto(URL, { waitUntil: "networkidle0" }); await p.evaluate(() => localStorage.clear()); await p.goto(URL, { waitUntil: "networkidle0" }); await wait(500);
  // tutti i testi della pagina (anche quelli nascosti, come la cronaca chiusa), separati da " | "
  const testo = (sel) => p.evaluate(sel => { const out = [], w = document.createTreeWalker(document.querySelector(sel || "body"), NodeFilter.SHOW_TEXT); while (w.nextNode()) { const x = w.currentNode; if (x.parentElement.closest("script,style")) continue; if (x.nodeValue.trim()) out.push(x.nodeValue.trim()); } return out.join(" | "); }, sel);
  const clicca = t => p.evaluate(t => { const x = [...document.querySelectorAll("button")].find(e => e.textContent.trim() === t); if (x) x.click(); return !!x; }, t);

  let t = await testo();
  ok(t.includes("New game") && t.includes("Create game"), "browser inglese: interfaccia in inglese");
  ok(!ITA.test(t), "lobby EN senza parole italiane" + (ITA.test(t) ? ": " + t.match(ITA)[0] : ""));
  ok(await p.evaluate(() => [...document.querySelectorAll(".dzsel input")].filter(x => x.checked).map(x => x.value).join()) === "en", "dizionario predefinito = inglese");
  ok(await p.evaluate(() => [...document.querySelectorAll("#regole option")].map(o => o.value).join()) === "s1", "in inglese solo le regole s1");
  await clicca("Rules at a glance"); await wait(200);
  t = await p.evaluate(() => document.getElementById("sheetIn").textContent);
  ok(t.includes("word in English") && !ITA.test(t), "regole in breve in inglese, con «word in English»");
  await p.evaluate(() => closeSheet());

  await clicca("IT"); await wait(200);
  t = await testo();
  ok(t.includes("Nuova partita") && t.includes("Crea partita"), "switch IT: interfaccia in italiano");
  ok(await p.evaluate(() => localStorage.getItem("grimorio-lingua")) === '"it"', "la scelta resta salvata");
  await dizionari(p, ["it"]); await wait(200);
  ok(await p.evaluate(() => [...document.querySelectorAll("#regole option")].map(o => o.value).join()) === "s1,v5f", "in italiano ci sono anche le classiche");
  await dizionari(p, ["en"]); await wait(200);
  await clicca("EN"); await wait(200);

  // partita in inglese contro il computer
  await p.select("#avversario", "normale");
  await clicca("Create game"); await wait(500);
  await p.waitForFunction(() => dictState === "pronto" && dictLang === "en", { timeout: 20000 });
  ok(await p.evaluate(() => S().cfg.lingua === "en" && G.isWord("HELLO") && !G.isWord("GATTO")), "partita inglese: HELLO valida, GATTO no");
  ok(await p.evaluate(() => S().bag.concat(S().hands.A).every(l => G.VAL[l] > 0) && Object.keys(G.BAG).length === 26), "Sacca inglese a 26 lettere");
  await p.evaluate(() => doPass()); await wait(300);
  await p.waitForFunction(() => S().moveNo >= 2, { timeout: 60000 });
  t = await testo();
  ok(/Blue Wizard passes|passes\./.test(await testo(".log")), "cronaca in inglese");
  ok(await p.evaluate(() => S().log.length >= 2 && S().moveNo >= 2), "il computer ha giocato in inglese (mossa " + await p.evaluate(() => S().moveNo) + ")");
  const tg = await testo();
  ok(!ITA.test(tg), "partita EN senza parole italiane" + (ITA.test(tg) ? ": «" + tg.match(ITA)[0] + "» in " + tg.slice(Math.max(0, tg.search(ITA) - 60), tg.search(ITA) + 40).replace(/\n/g, " | ") : ""));

  // stessa partita, interfaccia italiana: la cronaca cambia lingua
  await clicca("IT"); await wait(300);
  ok(/passa il turno/.test(await testo(".log")), "cronaca della stessa partita in italiano");
  await clicca("← Partite"); await wait(300);
  t = await testo();
  ok(/· EN/.test(t), "l'elenco partite indica la lingua (EN)");

  // partita italiana con interfaccia inglese
  await clicca("EN"); await wait(200);
  await dizionari(p, ["it"]); await wait(200);
  await p.select("#regole", "v5f"); await wait(100);
  await clicca("Create game"); await wait(500);
  await p.waitForFunction(() => dictState === "pronto" && dictLang === "it", { timeout: 30000 });
  ok(await p.evaluate(() => S().cfg.lingua === "it" && G.isWord("GATTO") && Object.keys(G.BAG).length === 21), "partita italiana: GATTO valida, Sacca a 21");
  await p.evaluate(() => { ui.pending = [{ r: 7, c: 2, l: "Q", hi: 0 }, { r: 7, c: 3, l: "Q", hi: 1 }]; render(); }); await wait(200);
  const err = await p.evaluate(() => (document.querySelector(".preview") || {}).textContent || "");
  ok(/not in the dictionary|not in your Grimoire|letter/i.test(err), "errore del motore in inglese: " + err.slice(0, 70));
  await p.evaluate(() => { ui.pending = []; render(); });
  await clicca("Rules"); await wait(200);
  t = await p.evaluate(() => document.getElementById("sheetIn").textContent);
  ok(t.includes("Fire, Frost and Water") && !ITA.test(t), "regole classiche in inglese");
  await p.evaluate(() => closeSheet());

  await p.evaluate(() => closeSheet());

  // partita con i due dizionari insieme: Sacca mista
  await clicca("← Games"); await wait(300);
  await dizionari(p, ["it", "en"]); await wait(200);
  ok(await p.evaluate(() => [...document.querySelectorAll("#regole option")].map(o => o.value).join()) === "s1", "con due dizionari solo le regole s1");
  ok(/at least one of the chosen dictionaries/.test(await testo(".dzsel + .note, .field .note")), "nota sulla Sacca mista");
  await p.evaluate(() => { for (const x of document.querySelectorAll(".dzsel input")) if (x.checked) x.click(); });
  ok(await p.evaluate(() => [...document.querySelectorAll(".dzsel input")].filter(x => x.checked).length) === 1, "almeno un dizionario resta spuntato");
  await dizionari(p, ["it", "en"]); await wait(200);
  await p.select("#avversario", "normale");
  await clicca("Create game"); await wait(500);
  await p.waitForFunction(() => dictState === "pronto" && dictLang === "it+en", { timeout: 40000 });
  ok(await p.evaluate(() => S().cfg.dizionari.join() === "it,en" && G.isWord("GATTO") && G.isWord("HELLO") && !G.isWord("QZXJ")), "partita mista: valgono GATTO e HELLO");
  ok(await p.evaluate(() => Object.keys(G.BAG).length === 26 && Object.values(G.BAG).reduce((a, b) => a + b) === 90), "Sacca mista: 26 lettere, 90 tessere");
  ok(await p.evaluate(() => searchWords("CASAHLO", "", "tutte", "punti", 500).list.some(w => w.w === "CASA") && searchWords("HELLOAB", "", "tutte", "punti", 500).list.some(w => w.w === "HELLO")), "l'esploratore cerca in entrambi i dizionari");
  await clicca("Rules"); await wait(200);
  ok(/Italian or English/.test(await p.evaluate(() => document.getElementById("sheetIn").textContent)), "regole: «a word in Italian or English»");
  await p.evaluate(() => closeSheet());
  await p.evaluate(() => doPass());
  await p.waitForFunction(() => S().moveNo >= 2, { timeout: 90000 });
  ok(true, "il computer ha giocato nella partita mista: " + await p.evaluate(() => Object.values(S().words).map(w => w.text).join(" ") || "(alchimia o passo)"));
  ok(/· IT\+EN/.test(await (async () => { await clicca("← Games"); await wait(300); return testo(); })()), "elenco: la partita mista è segnata IT+EN");

  ok(!errors.length, errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore nella pagina");
  await b.close();
  console.log(ko ? ko + " prove fallite" : "tutte le prove passate");
  process.exit(ko ? 1 : 0);
})();
