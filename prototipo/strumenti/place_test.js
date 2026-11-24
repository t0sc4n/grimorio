const puppeteer = require("puppeteer-core");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
const click = (page, t) => page.evaluate(t => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.startsWith(t)); if (!b) throw new Error("manca " + t); b.click(); }, t);
const status = page => page.evaluate(() => document.querySelector(".preview") ? document.querySelector(".preview").textContent : "");
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear());
  await page.goto("about:blank"); await page.goto(URL, { waitUntil: "networkidle0" });
  await page.type("#nome", "Aurelio"); await page.select("#avversario", "persona"); await page.click("#entrambi"); await click(page, "Crea partita");
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await click(page, "Esplora il dizionario"); await wait(700);
  // una parola di 3 lettere
  const w = await page.evaluate(() => { const c = [...document.querySelectorAll("button.dz-w")].find(x => x.childNodes[0].textContent.length === 3) || document.querySelector("button.dz-w"); const t = c.childNodes[0].textContent; c.click(); return t; });
  console.log("parola scelta:", w);
  await wait(200);
  console.log("anteprima prima del tocco:", await status(page));
  // orizzontale nella riga 2 del Sanctum Blu, colonna 4
  await page.evaluate(() => document.querySelector('[data-k="1,3"]').click()); await wait(200);
  console.log("orizzontale:", await status(page));
  await page.screenshot({ path: S + "/shots/60_parola_orizzontale.png" });
  await click(page, "↻ Gira"); await wait(200);
  console.log("dopo Gira:", await status(page));
  // verticale: per il Blu (campo girato) dall'alto in basso = dalla riga 3 verso il bordo
  await page.evaluate(() => document.querySelector('[data-k="2,6"]').click()); await wait(200);
  console.log("verticale:", await status(page), "| caselle:", await page.evaluate(() => [...document.querySelectorAll(".tile.pend")].map(t => t.parentElement.dataset.k + t.childNodes[0].textContent).join(" ")));
  await page.screenshot({ path: S + "/shots/61_parola_verticale.png" });
  await click(page, "Conferma"); await wait(800);
  const log = await page.evaluate(() => [...document.querySelectorAll(".log div")].map(x => x.textContent)[0]);
  console.log("cronaca:", log);
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); console.log(errors.join("|")); process.exit(1); });
