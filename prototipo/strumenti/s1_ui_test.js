// prova del prototipo con le regole s1: lobby, partita contro il computer, attacco con «Attacca», Scudo visibile
const puppeteer = require("puppeteer-core"), fs = require("fs");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const c = JSON.parse(fs.readFileSync(S + "/falo_caso.json", "utf8"));
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
const click = (page, t) => page.evaluate(t => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.startsWith(t)); if (!b) throw new Error("pulsante non trovato: " + t); b.click(); }, t);
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts|favicon|404/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // 1. lobby
  await page.goto(URL, { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: "networkidle0" }); await wait(500);
  console.log("regole:", await page.evaluate(() => [...document.querySelectorAll("#regole option")].map(o => o.textContent).join(" / ")), "| PV:", await page.evaluate(() => [...document.querySelectorAll("#pv option")].map(o => o.textContent + (o.selected ? "*" : "")).join(" ")));
  await page.screenshot({ path: S + "/shots/93_s1_lobby.png", clip: { x: 0, y: 0, width: 400, height: 760 } });
  // 2. partita s1 contro il computer: passo due volte e il computer risponde
  await page.type("#nome", "Aurelio");
  await click(page, "Crea partita");
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  console.log("cfg:", await page.evaluate(() => { const c = S().cfg; return [c.attacchi, c.scudo, c.consacrazione, c.hp].join(" ") }));
  for (let i = 0; i < 3; i++) {
    await click(page, "Passa"); await click(page, "Sì, passa il turno");
    await page.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 60000, polling: 300 });
    console.log("computer:", await page.evaluate(() => S().log.slice(-1)[0]));
  }
  // 3. dal caso del Falò: il Blu attacca con «Attacca» invece di bruciare
  const data = { s: c.prev, created: 1, updated: 2 };
  await page.evaluate((d) => { localStorage.clear(); localStorage.setItem("grimorio-token", JSON.stringify("tblu")); localStorage.setItem("grimorio-locali", JSON.stringify({ atk1: d })); localStorage.setItem("grimorio-visto", JSON.stringify({ atk1: d.s.last.seq })); }, data);
  await page.goto("about:blank"); await page.goto(URL + "#atk1", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 }); await wait(500);
  console.log("righe con Scudo:", await page.evaluate(() => new Set([...document.querySelectorAll(".cell.scudo")].map(x => x.dataset.k.split(",")[0])).size));
  const mv = await page.evaluate(() => {
    const G = window.Grimorio, s = S(), hand = s.hands.A; let best = null;
    for (let r = 8; r <= 10; r++) for (let c = 0; c < 11; c++) for (const x of hand) for (const y of hand) for (const pl of [[{ r, c, l: x }], [{ r, c, l: x }, { r: r + 1, c, l: y }], [{ r, c, l: x }, { r, c: c + 1, l: y }]]) {
      if (pl.some(t => s.tiles[t.r + "," + t.c] || t.r > 10 || t.c > 10)) continue;
      if (pl.length === 2 && pl[0].l === pl[1].l && hand.filter(z => z === x).length < 2) continue;
      const v = G.validate(s, "A", pl, { attacca: true }); if (!v.ok) continue;
      const pv = G.previewLaunches(s, "A", pl), d = Math.max(...Object.values(pv || { a: 0 }));
      if (!best || d > best.d) best = { pl, d, word: v.main.text };
    }
    return best;
  });
  console.log("attacco scelto:", mv && mv.word, "danno previsto", mv && mv.d);
  for (const t of mv.pl) {
    await page.evaluate(l => [...document.querySelectorAll(".htile:not(.ghost)")].find(x => x.childNodes[0].textContent === l).click(), t.l);
    await page.evaluate(k => document.querySelector(`[data-k="${k}"]`).click(), t.r + "," + t.c);
  }
  await click(page, "Attacca"); await wait(300);
  console.log("anteprima:", await page.evaluate(() => (document.querySelector(".preview, .pv, .prev") || {}).textContent || [...document.querySelectorAll("p,div")].map(x => x.textContent).find(t => /potenza/.test(t) && t.length < 120)));
  await page.screenshot({ path: S + "/shots/94_s1_attacca.png", fullPage: true });
  await click(page, "Conferma"); await wait(400);
  if (await page.$(".cell.launch")) { await page.screenshot({ path: S + "/shots/95_s1_lancio.png", clip: { x: 0, y: 0, width: 400, height: 700 } }); await page.evaluate(() => { const l = [...document.querySelectorAll(".cell.launch")]; l.sort((a, b) => (+b.querySelector(".dmg").textContent) - (+a.querySelector(".dmg").textContent)); l[0].click(); }); }
  await wait(3500);
  console.log("cronaca:", await page.evaluate(() => S().log.slice(-2).join(" | ")), "| PV Rosso", await page.evaluate(() => S().hp.B));
  await page.screenshot({ path: S + "/shots/96_s1_dopo_attacco.png", clip: { x: 0, y: 0, width: 400, height: 700 } });
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); console.log(errors.join(" | ")); process.exit(1); });
