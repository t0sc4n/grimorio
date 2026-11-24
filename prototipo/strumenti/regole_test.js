// "Regole in breve" dall'elenco partite: segue il menu Regole; in partita segue le regole della partita
const puppeteer = require("puppeteer-core");
const URL = process.argv[2] || "http://127.0.0.1:8765/test.html";
const wait = ms => new Promise(r => setTimeout(r, ms)); const errors = [];
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const p = await b.newPage(); p.on("pageerror", e => errors.push(e.message));
  await p.setViewport({ width: 400, height: 860 });
  await p.goto(URL, { waitUntil: "networkidle0" }); await p.evaluate(() => localStorage.clear()); await p.goto(URL, { waitUntil: "networkidle0" }); await wait(400);
  const titolo = async () => { await p.evaluate(() => [...document.querySelectorAll("#lobby button")].find(x => x.textContent === "Regole in breve").click()); await wait(200); const t = await p.evaluate(() => document.querySelector("#sheetIn h3").textContent + " | " + document.querySelector("#sheetIn li:nth-child(4)").textContent.slice(0, 50)); await p.evaluate(() => closeSheet()); return t; };
  console.log("menu s1:", await titolo());
  await p.select("#regole", "v5f"); await wait(200);
  console.log("menu classiche:", await titolo());
  console.log(errors.length ? "ERRORI " + errors.join(" | ") : "nessun errore"); await b.close();
})();
