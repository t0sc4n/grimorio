// schermate di un Grande Falò che brucia una difesa consacrata nel Sanctum nemico (vista del Blu)
const puppeteer = require("puppeteer-core"), fs = require("fs");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const c = JSON.parse(fs.readFileSync(S + "/falo_caso.json", "utf8"));
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
const data = s => ({ s, created: 1, updated: 2 });
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts|favicon/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const open = async (id, st) => {
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.evaluate((id, d) => { localStorage.clear(); localStorage.setItem("grimorio-token", JSON.stringify("tblu")); localStorage.setItem("grimorio-locali", JSON.stringify({ [id]: d })); localStorage.setItem("grimorio-visto", JSON.stringify({ [id]: d.s.last ? d.s.last.seq : 0 })); }, id, data(st));
    await page.goto("about:blank"); await page.goto(URL + "#" + id, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
    await wait(600);
  };
  // 1. prima: il Rosso ha MUNIVO consacrata (resistenza 23) in prima linea; il Blu ha il ponte attivo
  await open("falo1", c.prev);
  await page.screenshot({ path: S + "/shots/90_falo_prima.png", clip: { x: 0, y: 0, width: 400, height: 660 } });
  // 2. il Blu posa O e N sotto la N di MUNIVO e attiva il Falò
  const placed = c.cells.filter(k => !c.prev.tiles[k]).map(k => ({ k, l: c.after.tiles[k] ? c.after.tiles[k].l : null }));
  const letters = { "9,6": "O", "10,6": "N" };
  for (const t of placed) {
    const l = t.l || letters[t.k];
    await page.evaluate(l => [...document.querySelectorAll(".htile:not(.ghost)")].find(x => x.childNodes[0].textContent === l).click(), l);
    await page.evaluate(k => document.querySelector(`[data-k="${k}"]`).click(), t.k);
  }
  await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.textContent === "Falò").click());
  await wait(500);
  await page.screenshot({ path: S + "/shots/91_falo_mossa.png", fullPage: true });
  // 3. conferma
  await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.textContent.startsWith("Conferma")).click());
  await wait(3500);
  await page.screenshot({ path: S + "/shots/92_falo_dopo.png", fullPage: true });
  console.log("cronaca:", await page.evaluate(() => S().log.slice(-3).join(" | ")));
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); console.log(errors.join(" | ")); process.exit(1); });
