// Il computer avversario pensa qui, in un thread separato: il server resta sempre reattivo.
"use strict";
const { parentPort } = require("worker_threads");
const path = require("path");
const G = require("./public/engine.js");
const { loadDict } = require("./dict.js");
const { createAI } = require("./ai-core.js");

const dict = loadDict(path.join(__dirname, "public", "parole.txt"));
G.setDict(dict);
const AI = createAI(G, dict);

parentPort.on("message", job => {
  try {
    G.applyCfg(job.state.cfg || {});
    const move = AI.choose(job.state, job.seat, job.level);
    parentPort.postMessage({ id: job.id, move });
  } catch (e) {
    parentPort.postMessage({ id: job.id, error: String(e && e.message || e) });
  }
});
parentPort.postMessage({ ready: true });
