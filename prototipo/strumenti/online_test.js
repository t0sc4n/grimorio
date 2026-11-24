// Prova della versione online: due giocatori in due browser separati + partita contro il computer.
const puppeteer = require("puppeteer-core");
const S = process.argv[2], URL = "http://127.0.0.1:3077/";
const wait = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const click = (page, t) => page.evaluate(t => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.startsWith(t)); if (!b) throw new Error("pulsante non trovato: " + t); b.click(); }, t);
const statusOf = page => page.evaluate(() => (document.querySelector(".status") || {}).textContent || "");

// cerca nel motore una parola di 2-3 lettere dalla mano, nel proprio Sanctum
async function playSomething(page) {
  const mv = await page.evaluate(() => {
    const G = window.Grimorio, s = S(), me = mySeat(), hand = s.hands[me];
    const rows = []; for (let r = 0; r < G.ROWS; r++) if (G.zoneOf(r) === me) rows.push(r);
    for (const r of rows) for (let c = 0; c < 9; c++)
      for (let i = 0; i < hand.length; i++) for (let j = 0; j < hand.length; j++) {
        if (i === j) continue;
        const placed = [{ r, c, l: hand[i] }, { r, c: c + 1, l: hand[j] }];
        const v = G.validate(s, me, placed, {}); if (v.ok) return { placed, word: v.main.text, type: v.type };
      }
    return null;
  });
  if (!mv) { await click(page, "Passa"); await click(page, "Sì, passa il turno"); return "passa"; }
  for (const t of mv.placed) {
    await page.evaluate(l => [...document.querySelectorAll(".htile:not(.ghost)")].find(x => x.childNodes[0].textContent === l).click(), t.l);
    await page.evaluate(k => document.querySelector(`[data-k="${k}"]`).click(), t.r + "," + t.c);
  }
  await click(page, "Conferma"); await wait(300);
  if (await page.$(".cell.launch")) await page.evaluate(() => document.querySelector(".cell.launch").click());
  return mv.word + " (" + mv.type + ")";
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const ctxA = await browser.createBrowserContext(), ctxB = await browser.createBrowserContext();
  const A = await ctxA.newPage(), B = await ctxB.newPage();
  for (const [p, n] of [[A, "A"], [B, "B"]]) {
    p.on("pageerror", e => errors.push(n + " pageerror: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(n + " console: " + m.text()); });
    await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  }

  // 1. Aurelio crea la partita
  await A.goto(URL, { waitUntil: "networkidle0" });
  await A.type("#nome", "Aurelio");
  await click(A, "Crea partita");
  await A.waitForFunction(() => location.hash.startsWith("#g="), { timeout: 10000 });
  const gid = await A.evaluate(() => location.hash.slice(3));
  await A.waitForFunction(() => !document.body.innerText.includes("Carico il dizionario"), { timeout: 30000 });
  console.log("partita creata:", gid, "|", await statusOf(A));
  await A.screenshot({ path: S + "/shots/80_online_attesa.png" });

  // 2. Selene apre il link d'invito e si siede
  await B.goto(URL + "#g=" + gid, { waitUntil: "networkidle0" });
  await B.waitForFunction(() => document.body.innerText.includes("Siediti come Mago Rosso"), { timeout: 10000 });
  console.log("Selene vede:", await statusOf(B));
  await B.screenshot({ path: S + "/shots/81_online_invito.png" });
  await B.type("#nome-sfidante", "Selene");
  await click(B, "Siediti come Mago Rosso");
  await B.waitForFunction(() => document.body.innerText.includes("Tocca a Aurelio"), { timeout: 10000 });
  // 3. Aurelio viene aggiornato in tempo reale
  await A.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 10000 });
  console.log("Aurelio aggiornato in tempo reale:", await statusOf(A));

  // 4. la mano dell'avversario non arriva al browser
  console.log("mano di Aurelio vista da Selene:", await B.evaluate(() => S().hands.A.join("")), "| Sacca:", await B.evaluate(() => S().bag.slice(0, 5).join("")));

  // 5. Aurelio gioca; Selene riceve la mossa
  console.log("Aurelio gioca:", await playSomething(A));
  await B.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 10000 });
  console.log("Selene aggiornata:", await statusOf(B));
  await wait(3500);
  await B.screenshot({ path: S + "/shots/82_online_selene.png" });

  // 6. una mossa fuori turno viene rifiutata dal server
  const cheat = await A.evaluate(async () => { try { await api("POST", "games/" + cur.id + "/move", { moveNo: S().moveNo, kind: "pass" }); return "accettata!"; } catch (e) { return e.status + " " + e.message; } });
  console.log("mossa fuori turno di Aurelio:", cheat);

  // 7. Selene gioca; Aurelio riceve la mossa
  console.log("Selene gioca:", await playSomething(B));
  await A.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 10000 });
  console.log("Aurelio aggiornato:", await statusOf(A));
  await wait(3500);
  await A.screenshot({ path: S + "/shots/83_online_aurelio.png" });

  // 8. partita contro il computer (gioca sul server)
  await click(A, "← Partite"); await wait(500);
  await A.select("#avversario", "normale");
  await click(A, "Crea partita");
  await A.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 10000 });
  await click(A, "Passa"); await click(A, "Sì, passa il turno");
  const t0 = Date.now();
  await A.waitForFunction(() => document.body.innerText.includes("Tocca a te"), { timeout: 30000, polling: 200 });
  console.log("il computer ha risposto in", ((Date.now() - t0) / 1000).toFixed(1), "s:", await A.evaluate(() => S().log.slice(-1)[0]));

  // 9. elenco partite di Aurelio
  await click(A, "← Partite"); await wait(600);
  console.log("elenco:", await A.evaluate(() => [...document.querySelectorAll(".gameitem")].map(x => x.innerText.replace(/\s+/g, " ")).join(" || ")));
  await A.screenshot({ path: S + "/shots/84_online_elenco.png" });

  console.log(errors.length ? "ERRORI:\n" + errors.join("\n") : "nessun errore");
  await browser.close();
})().catch(e => { console.error("FALLITO:", e.message); console.log(errors.join("\n")); process.exit(1); });
