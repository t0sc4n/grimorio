// Prova della partita contro il computer. uso: node cpu_test.js <cartella scratchpad>
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const S = process.argv[2], OUT = S + "/shots";
const URL = "http://127.0.0.1:8765/test.html";
const stato = JSON.parse(fs.readFileSync(S + "/stato_prova.json", "utf8"));
const wait = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const click = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll("button")].find(x => x.textContent === t); if (!b) throw new Error("pulsante non trovato: " + t); b.click(); }, text);

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const shot = async (name, full = true) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); console.log("foto", name); };

  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto("about:blank"); await page.goto(URL, { waitUntil: "networkidle0" });
  await wait(500);
  await shot("20_lobby_avversario");

  // 1. partita nuova contro il computer (normale): passo il turno e aspetto la risposta
  await page.type("#nome", "Aurelio");
  await click(page, "Crea partita");
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await click(page, "Passa"); await click(page, "Sì, passa il turno");
  await wait(300);
  await shot("21_cpu_pensa", false);
  let t0 = Date.now();
  await page.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 60000 });
  console.log("risposta del computer (partita nuova) in", ((Date.now() - t0) / 1000).toFixed(1), "s");
  await wait(600);
  await shot("22_cpu_ha_giocato");

  // 2. partita a metà: il Rosso è il computer
  const st = JSON.parse(JSON.stringify(stato));
  st.data.s.seats.A = { tok: "tumano", nome: "Aurelio" };
  st.data.s.seats.B = { tok: "cpu", nome: "Automa", cpu: true, livello: "normale" };
  await page.evaluate(x => {
    localStorage.setItem("grimorio-token", JSON.stringify("tumano"));
    localStorage.setItem("grimorio-locali", JSON.stringify({ [x.id]: x.data }));
    localStorage.setItem("grimorio-visto", JSON.stringify({ [x.id]: x.data.s.last.seq }));
  }, st);
  await page.goto("about:blank"); await page.goto(URL + "#" + st.id, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await wait(400);
  await click(page, "Passa"); await click(page, "Sì, passa il turno");
  t0 = Date.now();
  await page.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 60000 });
  console.log("risposta del computer (partita a metà) in", ((Date.now() - t0) / 1000).toFixed(1), "s");
  await wait(500);
  await shot("23_cpu_meta_partita", false);
  const log = await page.evaluate(() => { const d = document.querySelector("details.card"); d.open = true; return [...d.querySelectorAll(".log div")].slice(0, 4).map(x => x.textContent); });
  console.log("cronaca:", log.join(" | "));

  // 3. livello facile: tempi
  st.data.s.seats.B.livello = "facile";
  await page.evaluate(x => { localStorage.setItem("grimorio-locali", JSON.stringify({ [x.id]: x.data })); localStorage.setItem("grimorio-visto", JSON.stringify({ [x.id]: x.data.s.last.seq })); }, st);
  await page.goto("about:blank"); await page.goto(URL + "#" + st.id, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await click(page, "Passa"); await click(page, "Sì, passa il turno");
  t0 = Date.now();
  await page.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 60000 });
  console.log("risposta del computer facile in", ((Date.now() - t0) / 1000).toFixed(1), "s");

  console.log(errors.length ? "ERRORI:\n" + errors.join("\n") : "nessun errore");
  await browser.close();
})().catch(e => { console.error("FALLITO:", e.message); console.log(errors.join("\n")); process.exit(1); });
