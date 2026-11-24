// prova del tempo per turno con un orologio accelerato (TURN_HOURS piccolo)
const B = "http://127.0.0.1:3099/api/";
const wait = ms => new Promise(r => setTimeout(r, ms));
async function api(m, p, body, tok) {
  const r = await fetch(B + p, { method: m, headers: Object.assign({ "Content-Type": "application/json" }, tok ? { Authorization: "Bearer " + tok } : {}), body: body ? JSON.stringify(body) : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(r.status + " " + d.error); return d;
}
(async () => {
  const a = await api("POST", "players", { name: "Aurelio" }), b = await api("POST", "players", { name: "Selene" });
  const g = await api("POST", "games", { hp: 30, vs: "persona" }, a.token);
  console.log("prima dello sfidante, deadline:", g.s.deadline);
  let j = await api("POST", "games/" + g.id + "/join", {}, b.token);
  console.log("dopo il posto: turno", j.s.turn, "scade tra", ((j.s.deadline - Date.now()) / 1000).toFixed(0), "s");
  const cpu = await api("POST", "games", { hp: 30, vs: "facile" }, a.token);
  console.log("contro il computer, deadline:", cpu.s.deadline);
  await wait(22000);
  let s = (await api("GET", "games/" + g.id, null, a.token)).s;
  console.log("dopo 22s: turno", s.turn, "| timeouts", JSON.stringify(s.timeouts), "| reminded", s.reminded, "|", s.log.slice(-2).join(" / "));
  // Selene gioca davvero (passa): Aurelio torna di turno
  await api("POST", "games/" + g.id + "/move", { moveNo: s.moveNo, kind: "pass" }, b.token);
  await wait(22000);
  s = (await api("GET", "games/" + g.id, null, a.token)).s;
  console.log("secondo scadere di Aurelio: winner", s.winner, "|", s.log.slice(-2).join(" / "));
  const c = (await api("GET", "games/" + cpu.id, null, a.token)).s;
  console.log("partita col computer: winner", c.winner, "deadline", c.deadline);
})().catch(e => { console.error("FALLITO", e.message); process.exit(1); });
