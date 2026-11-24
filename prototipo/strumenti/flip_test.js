const puppeteer = require("puppeteer-core");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
const click = (page, t) => page.evaluate(t => [...document.querySelectorAll("button")].find(x => x.textContent === t).click(), t);
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear());
  await page.goto("about:blank"); await page.goto(URL, { waitUntil: "networkidle0" });
  await page.type("#nome", "Aurelio"); await click(page, "Crea partita");
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  // il Blu scrive una parola verticale dal suo lato: cerca nel motore una parola di 3 lettere dalla mano
  const mv = await page.evaluate(() => {
    const G = window.Grimorio; const s = JSON.parse(localStorage.getItem("grimorio-locali")); const g = Object.values(s)[0].s;
    const hand = g.hands.A;
    for (let i = 0; i < hand.length; i++) for (let j = 0; j < hand.length; j++) for (let k = 0; k < hand.length; k++) {
      if (i === j || j === k || i === k) continue;
      const w = hand[i] + hand[j] + hand[k];
      const placed = [{ r: 2, c: 5, l: w[0] }, { r: 1, c: 5, l: w[1] }, { r: 0, c: 5, l: w[2] }]; // dall'alto (riga 2) verso il proprio bordo (riga 0)
      const v = G.validate(g, "A", placed, {}); if (v.ok) return { w, placed, text: v.main.text };
    } return null;
  });
  console.log("parola verticale del Blu:", JSON.stringify(mv && { w: mv.w, letta: mv.text }));
  if (mv) for (const t of mv.placed) {
    await page.evaluate(l => [...document.querySelectorAll(".htile:not(.ghost)")].find(x => x.childNodes[0].textContent === l).click(), t.l);
    await page.evaluate(k => document.querySelector(`[data-k="${k}"]`).click(), t.r + "," + t.c);
  }
  await wait(200);
  await page.screenshot({ path: S + "/shots/30_blu_verticale.png" });
  if (mv) { await click(page, "Conferma"); }
  await page.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 60000 });
  await wait(800);
  await page.screenshot({ path: S + "/shots/31_dopo_cpu.png" });
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); process.exit(1); });
