# Grimorio

**Grimorio** è un duello di parole tra due maghi, in italiano o in inglese. Si gioca sul telefono o sul computer, anche a distanza e un turno alla volta.

Come a Scarabeo, si scrivono parole su una griglia. Qui però le parole diventano incantesimi:
- costruisci un ponte fino al **Passo Arcano**, la riga dorata al centro;
- entra nel Sanctum dell'avversario e lancia le tue parole contro di lui;
- difenditi consacrando parole come Scudi;
- vince chi porta l'avversario a 0 Punti Vita.

- **Si gioca qui:** https://grimorio.tecnogenitori.com
- **Regole complete e storia del bilanciamento:** [`regolamento_e_struttura.md`](regolamento_e_struttura.md)

## Le regole in breve (s2, semplificate)

| | |
|---|---|
| **Griglia** | 11×11: Sanctum Blu (3 righe), Terra di Mezzo (5 righe, al centro il Passo Arcano), Sanctum Rosso (3 righe). Ognuno vede il proprio Sanctum in basso. |
| **Turno** | Scrivi una parola valida nella lingua della partita, come a Scarabeo. In alternativa usi l'Alchimia (scarti lettere e peschi fino a 7), la Trasformazione o passi. |
| **Collegamento Magico** | Una catena di parole dal tuo Sanctum fino a una parola che tocca il Passo Arcano. Serve per entrare nel Sanctum nemico. |
| **Attacco** | Qualsiasi parola con una lettera nel Sanctum nemico, agganciata a una parola dell'avversario, si può lanciare. La sua potenza è il punteggio della parola e cala lungo il tragitto. Dopo il lancio la parola si consuma. |
| **Difesa** | Una parola scritta sulla riga del bordo del tuo Sanctum si può consacrare: resistenza pari al punteggio, massimo 2 attive. È uno Scudo che protegge tutto il Sanctum. |
| **Trasformazione** | Al posto della mossa una lettera pesante (H, Q, Z; in inglese X, Z, J, Q) diventa una lettera che vale al massimo la metà. |
| **Punti Vita** | 30 (35 proposti con più dizionari insieme); si possono scegliere 25, 30, 35 o 40. |
| **Grande Falò** | Una volta ogni 3 turni bruci le parole che incroci al centro o nel Sanctum nemico, Scudi compresi. |
| **Suggerisci mossa** | Il computer ti propone la mossa migliore al costo di 3 Punti Vita. Resta scritto nella cronaca. |
| **A distanza** | 48 ore per turno. Allo scadere il turno passa; chi lo lascia scadere 2 volte di fila perde. |

Si può giocare anche con le regole **classiche (v5f)**, dove il tipo di parola dipende da un lessico elementale: Fuoco, Gelo, Acqua, Terra.

## Lingue e dizionari

Le scelte sono due e indipendenti:
- **La lingua dell'interfaccia** (IT/EN) si cambia con il pulsante in alto nell'elenco delle partite o in fondo alla partita. Resta salvata sul dispositivo; la prima volta segue la lingua del browser.
- **I dizionari della partita** si spuntano quando si crea la partita, anche più di uno, e restano salvati nella partita come le regole.
  - **Italiano:** dizionario italiano e Sacca di 21 lettere.
  - **Inglese:** dizionario ENABLE e Sacca di 26 lettere, con valori e quantità ricavati dalle frequenze dell'inglese.
  - **Più dizionari insieme:** una parola vale se è in almeno uno dei dizionari scelti. La Sacca è **mista**: 26 lettere, con quantità e valori nella media delle lingue scelte.
  - Le regole classiche ci sono solo con il solo dizionario italiano, perché il loro lessico è italiano; negli altri casi si gioca con le semplificate (s2).

Si può quindi giocare una partita in italiano con l'interfaccia in inglese, e viceversa. Online anche i messaggi del server e le notifiche arrivano nella lingua di ciascun giocatore.

Per aggiungere un dizionario servono il file delle parole, una voce in `LINGUE` in `engine.js` (valori e Sacca), il nome in `DIZ` nella pagina e nei programmi che lo caricano (`ai.js`, `ai-worker.js`, `server.js`, `sim.js`).

## Struttura del repository

```
regolamento_e_struttura.md   regole attuali + note di bilanciamento (simulazioni)
regolamento_e_struttura_v*.md  versioni precedenti delle regole

prototipo/                   versione "artifact" per claude.ai (una sola pagina)
  index.html                 interfaccia di gioco
  engine.js                  motore delle regole: logica pura, condiviso con il server
  ai.js                      giocatore automatico (web worker)
  parole.txt.gz              dizionario italiano: circa 756 000 forme
  words-en.txt.gz            dizionario inglese (ENABLE): circa 141 000 forme
  DIZIONARIO.md              origine, licenze e rigenerazione dei dizionari
  strumenti/                 simulatore, prove automatiche, script di generazione

online/                      versione per il web, ospitata su una VPS
  server.js                  arbitro delle partite: API, WebSocket, notifiche push, limiti anti-abuso
  ai-core.js, ai-worker.js   computer avversario e suggeritore (in un thread separato)
  dict.js                    dizionario lato server
  public/                    client PWA (pagina, service worker, manifest, icone, font locali)
  deploy/                    unità systemd e configurazione Apache
  install.sh, update.sh, backup.sh
  ISTRUZIONI.md              installazione, aggiornamento, sicurezza
```

### Come sono collegati prototipo e versione online

- **Il motore è unico.** `prototipo/engine.js` e `online/public/engine.js` sono lo stesso file: il server lo usa per controllare ogni mossa, il browser per mostrare le anteprime. Le regole stanno nei preset (`s2`, `s1`, `v5f`, …) e ogni partita salva le proprie, così cambiare le regole non tocca le partite in corso.
- **Il client online si genera dal prototipo.** `online/public/index.html` e `app.js` nascono da `prototipo/index.html` applicando, in quest'ordine, gli script in `prototipo/strumenti/`:
  1. `patch_online.py`: dal database di claude.ai all'API del server;
  2. `patch_sicurezza_client.py`: script esterno per la Content-Security-Policy e font locali;
  3. `patch_tempo_client.py`: tempo per turno;
  4. `patch_suggerimento_online.py`: il suggerimento lo calcola il server.

  Il prototipo è bilingue: i testi sono `tr("testo italiano")` e la traduzione inglese sta nella tabella `EN` (`patch_lingua_ui.py`). Gli script qui sopra avvolgono in `tr()` anche i testi propri della versione online, con le traduzioni in `lingua_comune.py`. Per vedere se è rimasto qualche testo non tradotto si usa `controlla_traduzioni.py`.

  Gli script sono pensati per i percorsi della cartella di lavoro, quindi usali come riferimento: le modifiche vanno fatte prima nel prototipo.

## Provare in locale

Serve **Node.js 24** o successivo: il server usa `node:sqlite`, già incluso in Node.

```bash
cd online
npm ci
gunzip -c ../prototipo/parole.txt.gz > public/parole.txt     # i dizionari in chiaro non sono nel repository
gunzip -c ../prototipo/words-en.txt.gz > public/words-en.txt
node server.js                                             # http://127.0.0.1:3077
```

Le partite finiscono in `online/data/`, che è esclusa dal repository.

Per il prototipo basta servire la cartella `prototipo/` con qualsiasi server statico e aprire `index.html`. Fuori da claude.ai le partite restano solo nel browser.

## Simulazioni

```bash
cd prototipo/strumenti
node sim.js ../ 100 7 1 s2 sim_s2.json   # 100 partite tra giocatori automatici con le regole s2
node sim.js ../ 100 7 1 s1en sim_en.json # le stesse regole in inglese (serve words-en.txt in chiaro in prototipo/)
node riassunto.js ../sim_s2.json         # durata, vittorie Blu/Rosso, attacchi, difese, Falò
```

Ogni simulazione occupa circa 1 GB di memoria per il dizionario.

## Pubblicare sulla VPS

Le istruzioni complete sono in [`online/ISTRUZIONI.md`](online/ISTRUZIONI.md).

1. Prepara il pacchetto con il dizionario in chiaro:
   ```bash
   mkdir -p build && cp -r online build/grimorio-server
   gunzip -c prototipo/parole.txt.gz > build/grimorio-server/public/parole.txt
   gunzip -c prototipo/words-en.txt.gz > build/grimorio-server/public/words-en.txt
   tar czf grimorio-server.tar.gz -C build grimorio-server
   ```
2. Copialo sulla VPS, estrailo ed esegui `sudo bash update.sh`. L'aggiornamento fa prima un backup e le partite restano.

## Sicurezza

- Nel repository non vanno mai chiavi o credenziali: `.gitignore` esclude chiavi SSH, `.env`, il database, le chiavi delle notifiche push (`vapid.json`) e i backup.
- Il server è l'arbitro delle partite: controlla ogni mossa, non manda mai al browser la mano dell'avversario né la Sacca, e limita le richieste per evitare abusi. I dettagli sono in [`online/ISTRUZIONI.md`](online/ISTRUZIONI.md#sicurezza).

## Licenze

| Che cosa | Licenza | File |
|---|---|---|
| **Codice** (`prototipo/`, `online/`, script e prove) | [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) | [`LICENSE`](LICENSE) |
| **Regolamento** (`regolamento_e_struttura*.md`) | [Creative Commons BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.it) | [`LICENSE-regolamento.txt`](LICENSE-regolamento.txt) |
| **Dizionario italiano** (`prototipo/parole.txt.gz`) | GPL-3.0: deriva dal dizionario italiano Hunspell di LibreOffice | [`DIZIONARIO.md`](prototipo/DIZIONARIO.md), [`LICENSE-dizionario.txt`](prototipo/LICENSE-dizionario.txt) |
| **Dizionario inglese** (`prototipo/words-en.txt.gz`) | Pubblico dominio: deriva da ENABLE | [`DIZIONARIO.md`](prototipo/DIZIONARIO.md#il-dizionario-inglese) |
| **Font** (Alegreya Sans, Cinzel Decorative) | SIL Open Font License 1.1 | |

Copyright © 2026 t0sc4n.

**Codice (AGPL-3.0).** Puoi usare, modificare e ridistribuire Grimorio, anche a scopo commerciale. Le versioni modificate devono però restare con la stessa licenza e con il codice sorgente disponibile. Questo vale anche se le offri soltanto come sito o servizio online: chi gioca deve poter scaricare il sorgente della versione che sta usando.

**Regolamento (CC BY-SA 4.0).** Puoi riprendere e adattare il regolamento citando l'autore e il link a questo repository. Le versioni modificate vanno condivise con la stessa licenza.
