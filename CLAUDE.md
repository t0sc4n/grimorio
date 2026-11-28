# Grimorio — Linee guida per Claude

## Panoramica e sorgenti di verità

**Grimorio** è un gioco web (PWA) di duelli di parole (Node.js 24+ con `node:sqlite` e `worker_threads`, zero build step; Python 3 per patch e deploy). Per tutti i dettagli completi vedi `GEMINI.md` e `regolamento_e_struttura.md`.

- **Motore unico:** `prototipo/engine.js` e `online/public/engine.js` devono restare **identici byte per byte**. Ogni modifica al motore va fatta in `prototipo/engine.js` e copiata in `online/public/engine.js`.
- **Pipeline client online:** le modifiche alla UI condivisa vanno fatte prima in `prototipo/index.html`, poi rigenerate in `online/public/` eseguendo in ordine:
  1. `python prototipo/strumenti/patch_online.py prototipo/index.html online/public/index.html`
  2. `python prototipo/strumenti/patch_sicurezza_client.py online/public`
  3. `python prototipo/strumenti/patch_tempo_client.py online/public`
  4. `python prototipo/strumenti/patch_suggerimento_online.py online prototipo/index.html`
- **AI in 3 posti:** `prototipo/ai.js`, `online/ai-core.js` e `prototipo/strumenti/sim.js` condividono la stessa logica AI.
- **Versione e Service Worker:** quando cambi asset in `online/public/`, incrementa e mantieni allineati `VER` in `prototipo/index.html` e `CACHE` (`grimorio-vNN`) in `online/public/sw.js`.
- **Internazionalizzazione (IT/EN):** testa le stringhe UI con `python prototipo/strumenti/controlla_traduzioni.py prototipo/index.html` (e su `online/public/app.js`).
- **Stato globale mutabile in `engine.js`:** in `online/server.js`, chiama sempre `G.applyCfg(...)` e `G.setLinguaUI(L)` immediatamente prima delle chiamate sincrone al motore senza `await` in mezzo.
- **Fine riga su Windows:** mantieni fine riga **LF** su `online/*.sh` e `online/deploy/*`.

---

## Deploy sulla VPS

1. **Configurazione locale (una tantum):** copia `online/deploy.env.example` in `.env.deploy` nella root del repository oppure in `online/deploy.env` (entrambi esclusi da `.gitignore`) e imposta `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PORT`, `DEPLOY_KEY`, `DEPLOY_SUDO`, `DEPLOY_REMOTE_DIR`.
2. **Comandi:**
   ```bash
   python online/deploy.py             # verifica invarianti, crea online/grimorio-server.tar.gz, carica via scp e lancia update.sh sulla VPS
   python online/deploy.py --pack-only # solo verifiche e creazione pacchetto locale
   python online/deploy.py --dry-run   # verifiche, pacchetto e anteprima comandi scp/ssh senza upload
   ```
- Lo script controlla automaticamente che `prototipo/engine.js` e `online/public/engine.js` siano identici, che `VER` (`prototipo/index.html`, `online/public/app.js`) e `CACHE` (`online/public/sw.js`) siano allineati, che non ci siano `<script>` inline in `online/public/index.html` e che `online/*.sh` + `online/deploy/*` abbiano fine riga `LF`; inoltre decomprime i dizionari direttamente dentro il `.tar.gz` e `online/update.sh` esegue il backup del DB prima di riavviare il servizio `grimorio`.
- **Modello consigliato per il deploy:** delega i deploy a un modello leggero (`haiku` / `flash`), evitando di sprecare contesto sul modello principale.

---

## Sicurezza e confidenzialità

- **Mai leggere, stampare o committare segreti:** `.gitignore` esclude `private_key.txt`, `pass.txt`, `*.pem`, `*.key`, `.env*`, `deploy.env`, `vapid.json`, `*.db`, `online/data/`, `*.tar.gz`. Non leggere, stampare né includere mai `private_key.txt`, `.env.deploy`, `online/deploy.env` o credenziali.
- **CSP e server autorevole:** `online/public/index.html` non deve avere `<script>` inline; i font restano locali (`/fonts.css`, `/fonts/*.woff2`); `viewFor(s, pid)` in `online/server.js` oscura sempre mano avversaria, `bag` e `focolare` con `"?"`.
