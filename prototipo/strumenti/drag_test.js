const puppeteer = require("puppeteer-core");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
const click = (page, t) => page.evaluate(t => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.startsWith(t)); if (!b) throw new Error("manca " + t); b.click(); }, t);
const pend = page => page.evaluate(() => [...document.querySelectorAll(".tile.pend")].map(t => t.parentElement.dataset.k + t.childNodes[0].textContent).join(" "));
const center = (page, k) => page.evaluate(k => { const r = document.querySelector(`[data-k="${k}"]`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, k);
async function dragTouch(page, fromK, toK) {
  const a = await center(page, fromK), b = await center(page, toK);
  await page.touchscreen.touchStart(a.x, a.y);
  for (let i = 1; i <= 8; i++) { await page.touchscreen.touchMove(a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8); await wait(30); }
  await page.touchscreen.touchEnd(); await wait(150);
}
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear());
  await page.goto("about:blank"); await page.goto(URL, { waitUntil: "networkidle0" });
  await page.type("#nome", "Aurelio"); await page.select("#avversario", "persona"); await page.click("#entrambi"); await click(page, "Crea partita");
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await click(page, "Esplora il dizionario"); await wait(700);
  const w = await page.evaluate(() => { const c = [...document.querySelectorAll("button.dz-w")].find(x => x.childNodes[0].textContent.length === 4) || document.querySelector("button.dz-w"); const t = c.childNodes[0].textContent; c.click(); return t; });
  await wait(300);
  const p0 = await pend(page); console.log("parola", w, "| comparsa in:", p0);
  await page.screenshot({ path: S + "/shots/70_comparsa.png", clip: { x: 0, y: 200, width: 400, height: 900 } });
  // trascina dalla seconda lettera due colonne a sinistra e una riga
  const k1 = p0.split(" ")[1].replace(/[A-Z]/g, ""); const [r1, c1] = k1.split(",").map(Number);
  await dragTouch(page, k1, (r1 - 1) + "," + (c1 - 2));
  console.log("dopo trascinamento:", await pend(page));
  await click(page, "↻ Gira"); await wait(200);
  console.log("dopo Gira:", await pend(page));
  await page.screenshot({ path: S + "/shots/71_girata.png", clip: { x: 0, y: 200, width: 400, height: 900 } });
  // trascina fuori dalla zona valida (prima riga avversaria? oltre il bordo): prova verso l'angolo in alto
  const before = await pend(page);
  const kTop = before.split(" ")[0].replace(/[A-Z]/g, "");
  await dragTouch(page, kTop, "10,0");
  const after = await pend(page);
  console.log("trascinata verso l'alto:", after, "| messaggio:", await page.evaluate(() => document.getElementById("toast").hidden ? "" : document.getElementById("toast").textContent));
  console.log("anteprima:", await page.evaluate(() => document.querySelector(".preview").textContent));
  await page.screenshot({ path: S + "/shots/72_finale.png", clip: { x: 0, y: 200, width: 400, height: 900 } });
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); console.log(errors.join("|")); process.exit(1); });
