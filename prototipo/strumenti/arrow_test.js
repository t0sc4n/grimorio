const puppeteer = require("puppeteer-core"); const fs = require("fs");
const S = process.argv[2], URL = "http://127.0.0.1:8765/test.html";
const st = JSON.parse(fs.readFileSync(S + "/stato_prova.json", "utf8"));
st.data.s.cfg.letturaDalLato = true;
st.data.s.seats.A = { tok: "tblu", nome: "Aurelio" }; st.data.s.seats.B = { tok: "trosso", nome: "Selene" };
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await b.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const [tok, name] of [["tblu", "40_frecce_vista_blu"], ["trosso", "41_frecce_vista_rosso"]]) {
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.evaluate((x, tok) => { localStorage.clear(); localStorage.setItem("grimorio-token", JSON.stringify(tok)); localStorage.setItem("grimorio-locali", JSON.stringify({ [x.id]: x.data })); localStorage.setItem("grimorio-visto", JSON.stringify({ [x.id]: x.data.s.last.seq })); }, st, tok);
    await page.goto("about:blank"); await page.goto(URL + "#" + st.id, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
    await wait(500);
    const n = await page.evaluate(() => [...document.querySelectorAll(".arr")].map(a => a.textContent).join(""));
    console.log(name, "frecce:", n);
    await page.screenshot({ path: S + "/shots/" + name + ".png", clip: { x: 0, y: 0, width: 400, height: 620 } });
  }
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore");
  await b.close();
})().catch(e => { console.error("FALLITO", e.message); process.exit(1); });
