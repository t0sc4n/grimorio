// dizionario a lato su schermo grande; foglio su telefono
const puppeteer = require("puppeteer-core");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
const click = (page, t) => page.evaluate(t => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.startsWith(t)); if (!b) throw new Error("pulsante non trovato: " + t); b.click(); }, t);
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts|favicon|404/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 1366, height: 860 });
  await page.goto(URL, { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: "networkidle0" }); await wait(400);
  console.log("lobby: dizionario a lato visibile?", await page.evaluate(() => !document.getElementById("side").hidden));
  await page.type("#nome", "Aurelio"); await click(page, "Crea partita");
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await page.waitForFunction(() => /parole/.test((document.querySelector("#side .dz-count") || {}).textContent || ""), { timeout: 30000 });
  console.log("partita: a lato visibile?", await page.evaluate(() => !document.getElementById("side").hidden), "| mano nel campo:", await page.evaluate(() => document.getElementById("dzl-mano").value), "| mano vera:", await page.evaluate(() => S().hands.A.join("")));
  console.log("conteggio:", await page.evaluate(() => document.querySelector("#side .dz-count").textContent), "| pulsante Esplora nascosto?", await page.evaluate(() => { const b = document.querySelector("#game .solo-stretto"); return !!b && getComputedStyle(b).display === "none"; }));
  await page.screenshot({ path: S + "/shots/97_lato_grande.png" });
  // tocco una parola: si prepara il posizionamento
  const w = await page.evaluate(() => { const x = document.querySelector("#side button.dz-w"); const t = x.childNodes[0].textContent; x.click(); return t; });
  await wait(400);
  console.log("parola toccata:", w, "| anteprima:", await page.evaluate(() => (ui.place && ui.place.word) || "-"));
  // passo: tocca al computer, la mano cambia? il dizionario segue dopo che gioco
  await page.evaluate(() => { cancelPlace(); });
  await click(page, "Passa"); await click(page, "Sì, passa il turno");
  await page.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 60000, polling: 300 });
  await wait(600);
  console.log("dopo il turno, parole cliccabili:", await page.evaluate(() => document.querySelectorAll("#side button.dz-w").length > 0));
  // schermo stretto: niente lato, il pulsante apre il foglio
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await wait(500);
  console.log("telefono: a lato nascosto?", await page.evaluate(() => document.getElementById("side").hidden));
  await click(page, "Esplora il dizionario"); await wait(600);
  console.log("telefono: foglio aperto?", await page.evaluate(() => !document.getElementById("sheet").hidden && !!document.getElementById("dz-mano")));
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); console.log(errors.join(" | ")); process.exit(1); });
