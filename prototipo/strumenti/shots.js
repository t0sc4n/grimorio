// Screenshot del prototipo in un telefono simulato. uso: node shots.js <cartella scratchpad>
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const S = process.argv[2], OUT = S + "/shots";
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://127.0.0.1:8765/test.html";
const stato = JSON.parse(fs.readFileSync(S + "/stato_prova.json", "utf8"));
const wait = ms => new Promise(r => setTimeout(r, ms));
const errors = [];

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const shot = async (name, full = true) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); console.log("foto", name); };

  // 1. lobby vuota
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: "networkidle0" });
  await wait(600);
  await shot("01_lobby_vuota");

  // 2. nuova partita in modalità prova, inizio
  await page.type("#nome", "Aurelio");
  await page.click("#entrambi");
  await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "Crea partita").click());
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await wait(400);
  await shot("02_partita_nuova");

  // 3. seleziona una lettera e posala (prima mossa: nel proprio Sanctum, riga 2)
  const hand = await page.evaluate(() => [...document.querySelectorAll(".htile")].map(b => b.childNodes[0].textContent));
  console.log("mano iniziale", hand.join(""));
  await page.evaluate(() => document.querySelectorAll(".htile")[0].click());
  await page.evaluate(() => document.querySelector('[data-k="1,4"]').click());
  await page.evaluate(() => document.querySelectorAll(".htile")[1].click());
  await page.evaluate(() => document.querySelector('[data-k="1,5"]').click());
  await wait(200);
  await shot("03_posa_due_lettere");

  // 4. partita a metà, caricata nell'archivio locale
  await page.evaluate(st => {
    localStorage.setItem("grimorio-token", JSON.stringify("tprova"));
    localStorage.setItem("grimorio-locali", JSON.stringify({ [st.id]: st.data }));
    localStorage.removeItem("grimorio-visto");
  }, stato);
  await page.goto("about:blank"); await page.goto(URL + "#" + stato.id, { waitUntil: "networkidle0" });
  await wait(700); // a metà dell'animazione dell'ultima mossa
  await shot("04_partita_meta_animazione", false);
  await page.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  await wait(3500);
  await shot("05_partita_meta");

  // 5. componi l'attacco e scegli il punto di lancio
  const atk = stato.atk;
  for (const t of atk.placed) {
    await page.evaluate(l => { const b = [...document.querySelectorAll(".htile:not(.ghost)")].find(x => x.childNodes[0].textContent === l); b.click(); }, t.l);
    await page.evaluate(k => document.querySelector(`[data-k="${k}"]`).click(), t.r + "," + t.c);
  }
  await wait(200);
  await shot("06_attacco_composto");
  await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "Conferma").click());
  await wait(300);
  await shot("07_scelta_lancio");
  // lancia dal punto con il danno più alto
  await page.evaluate(() => {
    const c = [...document.querySelectorAll(".cell.launch")].sort((a, b) => parseInt(b.querySelector(".dmg").textContent.slice(1)) - parseInt(a.querySelector(".dmg").textContent.slice(1)))[0];
    c.click();
  });
  await wait(900);
  await shot("08_incantesimo_in_volo", false);
  await wait(4000);
  await shot("09_dopo_attacco");

  // 6. info su una lettera e regole
  await page.evaluate(() => { const t = document.querySelector(".cell .tile.difesa, .cell .tile.consacrata"); (t || document.querySelector(".cell .tile")).parentElement.click(); });
  await wait(300);
  await shot("10_info_lettera", false);
  await page.evaluate(() => [...document.querySelectorAll("#sheet button")].find(b => b.textContent === "Chiudi").click());
  await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "Regole").click());
  await wait(300);
  await shot("11_regole", false);
  await page.evaluate(() => [...document.querySelectorAll("#sheet button")].find(b => b.textContent === "Chiudi").click());

  // 7. alchimia
  await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "Alchimia").click());
  await page.evaluate(() => { const t = document.querySelectorAll(".htile"); t[0].click(); t[2].click(); });
  await wait(200);
  await shot("12_alchimia", false);

  // 8. elenco partite e schermo largo
  await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "← Partite").click());
  await wait(300);
  await shot("13_lobby_con_partite");
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto("about:blank"); await page.goto(URL + "#" + stato.id, { waitUntil: "networkidle0" });
  await wait(1500);
  await shot("14_desktop", false);
  // 9. telefono piccolo
  await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto("about:blank"); await page.goto(URL + "#" + stato.id, { waitUntil: "networkidle0" });
  await wait(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log("scorrimento orizzontale a 360px:", overflow, "px");
  await shot("15_telefono_piccolo");

  console.log(errors.length ? "ERRORI:\n" + errors.join("\n") : "nessun errore nella console");
  await browser.close();
})().catch(e => { console.error("FALLITO:", e.message); console.log(errors.join("\n")); process.exit(1); });
