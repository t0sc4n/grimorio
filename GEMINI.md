# Grimorio — Linee guida per Gemini / Antigravity

## Panoramica

**Grimorio** è un gioco web (PWA) di duelli di parole asincroni e in tempo reale tra due maghi (o contro il computer), in italiano, inglese o con più dizionari insieme.

- **Sito in produzione:** `https://grimorio.tecnogenitori.com`
- **Runtime:** Node.js 24+ (usa `node:sqlite`, `worker_threads`, zero build step / zero bundler) e Python 3 per gli script di generazione/patch.
- **Regole e storico del bilanciamento:** `regolamento_e_struttura.md` (versioni precedenti in `regolamento_e_struttura_v*.md`).
- **Preset attivi:** `s1` (semplificate, predefinite: 60 PV, lancio dal Sanctum nemico, consumo parola lanciata, Scudo di riga, consacrazione ×2 max 2) e `v5f` (classiche con lessico elementale, solo con il solo dizionario italiano).

---

## Struttura del repository e sorgenti di verità

```text
prototipo/                   Versione standalone/artefatto (sorgente primaria di motore e UI)
  engine.js                  Motore puro delle regole (UMD, nessun DOM) — UNICO MOTORE
  index.html                 UI completa bilingue (CSS + HTML + JS inline)
  ai.js                      AI browser (Web Worker)
  parole.txt.gz              Dizionario IT (~756k forme, GPL-3.0)
  words-en.txt.gz            Dizionario EN ENABLE (~141k forme, pubblico dominio)
  DIZIONARIO.md              Origine, filtri e rigenerazione dizionari
  strumenti/                 Patch per generare il client online, test automatici, simulatore

online/                      Versione produzione VPS (Ubuntu + Apache + systemd)
  server.js                  Server HTTP + API REST + WebSocket (/ws) + SQLite + Web Push + rate limit
  dict.js                    Caricamento dizionario e ricerca binaria su stringa/Uint32Array
  ai-core.js                 Logica AI lato server (riportata dal prototipo/simulatore)
  ai-worker.js               Thread `worker_threads` dedicato all'AI e ai suggerimenti
  public/engine.js           Copia ESATTA di prototipo/engine.js
  public/index.html, app.js  Client PWA generati da prototipo/index.html via script di patch
  public/sw.js               Service Worker PWA (cache + notifiche push)
  deploy/                    Unità systemd (grimorio.service) e vhost Apache (grimorio-apache.conf)
  install.sh, update.sh, backup.sh
```

### Regole di sincronizzazione (FONDAMENTALI)

1. **Motore unico:** `prototipo/engine.js` e `online/public/engine.js` devono restare **identici byte per byte**. Ogni modifica al motore va fatta in `prototipo/engine.js` e copiata in `online/public/engine.js`.
2. **Pipeline client online:** le modifiche alla UI condivisa vanno fatte prima in `prototipo/index.html`, poi rigenerate in `online/public/` applicando in ordine gli script in `prototipo/strumenti/`:
   1. `patch_online.py <prototipo/index.html> <online/public/index.html>`
   2. `patch_sicurezza_client.py <online/public>` (estrae `app.js` per la CSP, font locali, rotazione token)
   3. `patch_tempo_client.py <online/public>` (timer 48 h per turno)
   4. `patch_suggerimento_online.py <online> <prototipo/index.html>` (suggerimenti calcolati dal server)
3. **AI in 3 posti:** la logica AI (`candidates`, `genMoves`, `evalState`, `choose`/`aiTurn`) è duplicata in `prototipo/ai.js`, `online/ai-core.js` e `prototipo/strumenti/sim.js`. Quando cambiano regole o euristiche, aggiorna tutti e tre i file.
4. **Aggiungere un dizionario/lingua di gioco:** richiede il file `.txt.gz`, una voce in `LINGUE` in `engine.js`, la configurazione in `DIZ` nella pagina (`prototipo/index.html`), e l'aggiornamento dei caricatori in `prototipo/ai.js`, `online/ai-worker.js`, `online/server.js`, `online/public/sw.js` e `prototipo/strumenti/sim.js`.

---

## Invarianti critici e attenzione ai bug

- **Stato globale mutabile in `engine.js`:** `CFG`, `VAL`, `BAG`, `ROWS`, `MID0`, `MID1`, `STAFFA`, `MULT`, `DICT`, `LINGUA_UI` sono variabili globali di modulo mutate da `G.applyCfg(...)` e `G.setLinguaUI(...)`.
  - In `online/server.js`, chiama sempre `G.applyCfg(s.cfg || BASE_RULES)` e `G.setLinguaUI(L)` **immediatamente prima** delle chiamate sincrone al motore (`validate`, `play`, `alchimia`, `pass`, `suggerisci`) e **non inserire mai un `await` tra `applyCfg`/`setLinguaUI` e la chiamata al motore** (evita race condition tra richieste concorrenti con regole o lingue diverse).
- **Retrocompatibilità delle partite salvate:**
  - Ogni partita salva il proprio `s.cfg`; nuove opzioni di regola aggiunte in futuro devono avere default spento in `applyCfg` se la chiave manca in `c`.
  - Le voci di `s.log` sono oggetti strutturati `{ k, a }`, ma `G.testoLog` deve continuare a supportare le vecchie stringhe semplici.
- **Internazionalizzazione (IT / EN):**
  - Lingua UI (del dispositivo/giocatore) e dizionari della partita (`cfg.dizionari`) sono **indipendenti**.
  - Testi UI prototipo: `tr("testo italiano", { ... })` + tabella `EN` in `prototipo/index.html`.
  - Testi solo online: `EN_ONLINE` in `prototipo/strumenti/lingua_comune.py`.
  - Errori e cronaca del motore: `MSG.it` e `MSG.en` in `engine.js` (devono avere esattamente le stesse chiavi).
  - Errori e notifiche push del server: `SRV_EN` in `online/server.js`.
  - Verifica stringhe mancanti: `python prototipo/strumenti/controlla_traduzioni.py prototipo/index.html` (e su `online/public/app.js`).
- **Service Worker:** quando modifichi `index.html`, `app.js`, `engine.js`, `fonts.css` o altri asset della shell in `online/public/`, valuta di incrementare `CACHE` in `online/public/sw.js`.
- **Fine riga su Windows:** il repository viene sviluppato su Windows e deployato su Linux (Ubuntu). Mantieni fine riga **LF** sugli script shell (`online/*.sh`) e sui file di `online/deploy/`.
- **Memoria sulla VPS:** `online/deploy/grimorio.service` imposta `MemoryMax=700M`. Il server carica i dizionari sia nel processo principale sia in `ai-worker.js` (più eventuale fusione `it+en`): evita strutture inutilmente pesanti in memoria.

---

## Sicurezza e confidenzialità

- **Mai leggere, stampare o committare segreti:** `.gitignore` esclude `private_key.txt`, `pass.txt`, `*.pem`, `*.key`, `.env*`, `vapid.json`, `*.db`, `online/data/`, `*.tar.gz`. Non toccare né includere mai `private_key.txt` o credenziali.
- **Server autorevole:** ogni mossa passa da `doMove` in `online/server.js`. `viewFor(s, pid)` deve sempre oscurare la mano avversaria, `bag` e `focolare` con `"?"`.
- **CSP e sanitizzazione:** `online/public/index.html` non deve avere `<script>` inline (`script-src 'self'`). I font devono restare locali (`/fonts.css`, `/fonts/*.woff2`), mai CDN esterne. Le push subscription accettano solo host in `PUSH_HOSTS`.

---

## Stile e convenzioni del codice

- **JavaScript vanilla senza framework né build:** nessuna dipendenza frontend; lato server solo `ws` e `web-push` (e moduli built-in Node come `node:sqlite`, `worker_threads`, `crypto`).
- **`engine.js`:** pattern IIFE/UMD compatibile sia con browser (`window.Grimorio` / `self.Grimorio`) sia con CommonJS (`module.exports`). Nessun accesso al DOM.
- **Lingua del codice:** commenti, identificatori di dominio (es. `consacra`, `falo`, `focolare`, `sacca`, `dizionariDi`), documentazione e messaggi di commit sono in **italiano** chiaro e conciso.
- **DOM client:** costruzione dichiarativa tramite helper `h(tag, attrs, ...kids)` e `fill(el, ...)` con `textContent` (evitare `innerHTML` per prevenire XSS).

---

## Comandi utili

### Avvio locale del server online
```bash
# Decomprimi i dizionari (non tracciati in git)
gzip -dc prototipo/parole.txt.gz > online/public/parole.txt
gzip -dc prototipo/words-en.txt.gz > online/public/words-en.txt

cd online
npm ci
node server.js   # http://127.0.0.1:3077
```

### Verifica e test
```bash
# Test motore (regole s1 e supporto bilingue — richiede parole.txt e words-en.txt in chiaro nella cartella passata)
node prototipo/strumenti/test_s1.js online/public
node prototipo/strumenti/test_inglese.js online/public

# Controllo traduzioni UI
python prototipo/strumenti/controlla_traduzioni.py prototipo/index.html
python prototipo/strumenti/controlla_traduzioni.py online/public/app.js

# Test sicurezza server locale (con server attivo su 127.0.0.1:3077)
node online/sec_test.js

# Test end-to-end bilingue online (richiede server attivo + puppeteer-core + Chrome)
node prototipo/strumenti/lingua_online_test.js http://127.0.0.1:3077 online/data/grimorio.db
```

### Simulazioni di bilanciamento
```bash
cd prototipo/strumenti
node sim.js ../ 100 7 1 s1 sim_s1.json
node sim.js ../ 100 7 1 s1en sim_en.json
node riassunto.js ../sim_s1.json
```
