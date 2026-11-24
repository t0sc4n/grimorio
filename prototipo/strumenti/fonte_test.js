const puppeteer = require("puppeteer-core");
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  for (const url of ["http://127.0.0.1:8765/test.html", "http://127.0.0.1:3077/"]) {
    const p = await b.newPage(); const err = []; p.on("pageerror", e => err.push(e.message));
    await p.goto(url, { waitUntil: "networkidle0" });
    await p.waitForFunction(() => typeof dictState !== "undefined" && dictState === "pronto", { timeout: 30000 }).catch(() => {});
    const r = await p.evaluate(() => ({ link: [...document.querySelectorAll(".fonte a")].map(a => a.textContent + "→" + a.href.replace("https://github.com/t0sc4n/grimorio", "repo")).join(" , "), civili: window.Grimorio.isWord("CIVILI"), cc: window.Grimorio.isWord("CC"), casa: window.Grimorio.isWord("CASA") }));
    console.log(url, JSON.stringify(r), err.length ? "ERRORI " + err.join("|") : "nessun errore");
  }
  await b.close();
})();
