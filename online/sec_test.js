// Prove di abuso contro il server locale. uso: node sec_test.js
const WebSocket = require("ws");
const B = "http://127.0.0.1:3077";
const ok = (c, m) => console.log((c ? "OK   " : "FALLA") + " " + m);
async function j(method, path, body, headers = {}) {
  const r = await fetch(B + path, { method, headers: Object.assign({ "Content-Type": "application/json" }, headers), body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch (e) {}
  return { status: r.status, data };
}
(async () => {
  // 1. IP falsificato: Apache aggiunge l'IP vero in fondo, il server deve usare quello
  let blocked = 0;
  for (let i = 0; i < 25; i++) { const r = await j("POST", "/api/players", { name: "x" }, { "X-Forwarded-For": "10.0.0." + i + ", 9.9.9.9" }); if (r.status === 429) blocked++; }
  ok(blocked === 5, "registrazioni con IP falsificato: " + blocked + " bloccate su 25 (attese 5)");

  // giocatore per le prove successive
  const me = (await j("POST", "/api/players", { name: "Ma‮licious​  nome lunghissimo che non finisce più" }, { "X-Forwarded-For": "8.8.4.4" })).data;
  const auth = { Authorization: "Bearer " + me.token, "X-Forwarded-For": "8.8.4.4" };
  ok(!/[‮​]/.test(me.name) && me.name.length <= 24, "nome ripulito: «" + me.name + "»");

  // 2. notifiche verso indirizzi scelti dall'attaccante (SSRF)
  const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };
  for (const ep of ["https://evil.example.com/raccogli", "https://127.0.0.1/interno", "http://fcm.googleapis.com/fcm/send/x", "https://fcm.googleapis.com.evil.com/x", "https://fcm.googleapis.com:8443/x"]) {
    const r = await j("POST", "/api/push/subscribe", { subscription: { endpoint: ep, keys } }, auth);
    ok(r.status === 400, "notifica verso " + ep + " → " + r.status);
  }
  const good = await j("POST", "/api/push/subscribe", { subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys } }, auth);
  ok(good.status === 200, "notifica verso il servizio di Google accettata → " + good.status);

  // 3. file fuori dalla cartella pubblica
  for (const pth of ["/../server.js", "/%2e%2e/server.js", "/..%2fserver.js", "/%2e%2e%2fdata_test%2fgrimorio.db", "/public/../../server.js"]) {
    const r = await fetch(B + pth); const t = await r.text();
    ok(!t.includes("require(") && !t.startsWith("SQLite"), "percorso " + pth + " → " + r.status);
  }

  // 4. troppe partite contro il computer
  let cpuOk = 0, cpuNo = 0;
  for (let i = 0; i < 7; i++) { const r = await j("POST", "/api/games", { vs: "normale" }, auth); if (r.status === 201) cpuOk++; else cpuNo++; }
  ok(cpuOk === 5 && cpuNo === 2, "partite contro il computer: " + cpuOk + " create, " + cpuNo + " rifiutate (limite 5)");

  // 5. mossa con dati strani
  const g = (await j("POST", "/api/games", { vs: "persona", both: true }, auth)).data;
  for (const bad of [{ kind: "play", placed: [{ r: "0;DROP", c: 1, l: "A" }] }, { kind: "play", placed: new Array(50).fill({ r: 0, c: 0, l: "A" }) }, { kind: "play", placed: [{ r: 0, c: 0, l: "<img>" }] }, { kind: "boh" }]) {
    const r = await j("POST", "/api/games/" + g.id + "/move", Object.assign({ moveNo: 0 }, bad), auth);
    ok(r.status >= 400 && r.status < 500, "mossa malformata → " + r.status + " " + (r.data && r.data.error));
  }

  // 6. nuovo codice di accesso: il vecchio smette di funzionare
  const rot = await j("POST", "/api/me/rotate", {}, auth);
  const old = await j("GET", "/api/me", null, auth);
  const neu = await j("GET", "/api/me", null, { Authorization: "Bearer " + rot.data.token, "X-Forwarded-For": "8.8.4.4" });
  ok(old.status === 401 && neu.status === 200, "dopo il nuovo codice: vecchio → " + old.status + ", nuovo → " + neu.status);

  // 7. troppe connessioni in tempo reale dallo stesso IP
  const socks = []; let refused = 0;
  await Promise.all(Array.from({ length: 33 }, () => new Promise(res => {
    const w = new WebSocket("ws://127.0.0.1:3077/ws", { headers: { "X-Forwarded-For": "7.7.7.7" } });
    socks.push(w);
    w.on("close", code => { if (code === 1013) refused++; res(); });
    w.on("open", () => setTimeout(res, 300));
    w.on("error", () => res());
  })));
  ok(refused === 3, "connessioni WebSocket dallo stesso IP: " + refused + " rifiutate su 33 (limite 30)");
  socks.forEach(w => w.terminate());

  // 8. raffica di richieste
  let limited = 0;
  await Promise.all(Array.from({ length: 300 }, async () => { const r = await fetch(B + "/api/push/key", { headers: { "X-Forwarded-For": "6.6.6.6" } }); if (r.status === 429) limited++; }));
  ok(limited >= 50, "raffica di 300 richieste: " + limited + " bloccate (limite 240 al minuto)");

  // 9. intestazioni di sicurezza
  const h = (await fetch(B + "/")).headers;
  ok(/script-src 'self';/.test(h.get("content-security-policy") || "") && h.get("x-frame-options") === "DENY", "intestazioni di sicurezza presenti");
})();
