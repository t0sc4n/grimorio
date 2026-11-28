// Il computer avversario pensa qui, in un thread separato: il server resta sempre reattivo.
"use strict";
const { parentPort } = require("worker_threads");
const path = require("path");
const G = require("./public/engine.js");
const { loadDict, fromText } = require("./dict.js");
const { createAI } = require("./ai-core.js");

// un dizionario (e un giocatore) per lingua; per le partite con più dizionari, un giocatore sul loro testo unito
const AIS = {}, DIZ = {};
for (const [l, file] of [["it", "parole.txt"], ["en", "words-en.txt"]]) {
  const dict = DIZ[l] = loadDict(path.join(__dirname, "public", file));
  G.setDict(dict, l);
  AIS[l] = createAI(G, dict);
}
function aiFor(ls) {
  const k = ls.join("+");
  if (!AIS[k]) AIS[k] = createAI(G, fromText(G.unisciTesti(ls.map(l => DIZ[l].text))));
  return AIS[k];
}

parentPort.on("message", job => {
  try {
    G.applyCfg(job.state.cfg || {});
    const AI = aiFor(G.CFG.dizionari);
    const move = AI.choose(job.state, job.seat, job.level);
    parentPort.postMessage({ id: job.id, jobId: job.jobId, move });
  } catch (e) {
    parentPort.postMessage({ id: job.id, jobId: job.jobId, error: String(e && e.message || e) });
  }
});
parentPort.postMessage({ ready: true });
