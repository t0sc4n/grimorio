# Grimorio

**Grimorio** è un duello di parole tra due maghi, in italiano. Si gioca sul telefono o sul computer, anche a distanza e un turno alla volta.

Come a Scarabeo, si scrivono parole su una griglia. Qui però le parole diventano incantesimi:
- costruisci un ponte fino al **Passo Arcano**, la riga dorata al centro;
- entra nel Sanctum dell'avversario e lancia le tue parole contro di lui;
- difenditi consacrando parole come Scudi;
- vince chi porta l'avversario a 0 Punti Vita.

- **Si gioca qui:** https://grimorio.tecnogenitori.com
- **Regole complete e storia del bilanciamento:** [`regolamento_e_struttura.md`](regolamento_e_struttura.md)

## Le regole in breve (s1, semplificate)

| | |
|---|---|
| **Griglia** | 11×11: Sanctum Blu (3 righe), Terra di Mezzo (5 righe, al centro il Passo Arcano), Sanctum Rosso (3 righe). Ognuno vede il proprio Sanctum in basso. |
| **Turno** | Scrivi una parola italiana valida, come a Scarabeo. In alternativa usi l'Alchimia (cambi lettere) o passi. |
| **Collegamento Magico** | Una catena di parole dal tuo Sanctum fino a una parola che tocca il Passo Arcano. Serve per entrare nel Sanctum nemico. |
| **Attacco** | Qualsiasi parola con una lettera nel Sanctum nemico si può lanciare. La sua potenza è il punteggio della parola e cala lungo il tragitto. Dopo il lancio la parola si consuma. |
| **Difesa** | Una parola del tuo Sanctum si può consacrare: resistenza pari al doppio del punteggio, massimo 2 attive. Protegge tutta la sua riga (Scudo). |
| **Grande Falò** | Una volta ogni 3 turni bruci le parole che incroci al centro o nel Sanctum nemico, Scudi compresi. |
| **Suggerisci mossa** | Il computer ti propone la mossa migliore al costo di 3 Punti Vita. Resta scritto nella cronaca. |
| **A distanza** | 48 ore per turno. Allo scadere il turno passa; chi lo lascia scadere 2 volte di fila perde. |

Si può giocare anche con le regole **classiche (v5f)**, dove il tipo di parola dipende da un lessico elementale: Fuoco, Gelo, Acqua, Terra.

## Struttura del repository

```
regolamento_e_struttura.md   regole attuali + note di bilanciamento (simulazioni)
regolamento_e_struttura_v*.md  versioni precedenti delle regole

prototipo/                   versione "artifact" per claude.ai (una sola pagina)
  index.html                 interfaccia di gioco
  engine.js                  motore delle regole: logica pura, condiviso con il server
  ai.js                      giocatore automatico (web worker)
  parole.txt.gz              dizionario: circa 756 000 forme italiane
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

- **Il motore è unico.** `prototipo/engine.js` e `online/public/engine.js` sono lo stesso file: il server lo usa per controllare ogni mossa, il browser per mostrare le anteprime. Le regole stanno nei preset (`s1`, `v5f`, …) e ogni partita salva le proprie, così cambiare le regole non tocca le partite in corso.
- **Il client online si genera dal prototipo.** `online/public/index.html` e `app.js` nascono da `prototipo/index.html` applicando, in quest'ordine, gli script in `prototipo/strumenti/`:
  1. `patch_online.py`: dal database di claude.ai all'API del server;
  2. `patch_sicurezza_client.py`: script esterno per la Content-Security-Policy e font locali;
  3. `patch_tempo_client.py`: tempo per turno;
  4. `patch_suggerimento_online.py`: il suggerimento lo calcola il server.

  Gli script sono pensati per i percorsi della cartella di lavoro, quindi usali come riferimento: le modifiche vanno fatte prima nel prototipo.

## Provare in locale

Serve **Node.js 24** o successivo: il server usa `node:sqlite`, già incluso in Node.

```bash
cd online
npm ci
gunzip -c ../prototipo/parole.txt.gz > public/parole.txt   # il dizionario in chiaro non è nel repository
node server.js                                             # http://127.0.0.1:3077
```

Le partite finiscono in `online/data/`, che è esclusa dal repository.

Per il prototipo basta servire la cartella `prototipo/` con qualsiasi server statico e aprire `index.html`. Fuori da claude.ai le partite restano solo nel browser.

## Simulazioni

```bash
cd prototipo/strumenti
node sim.js ../ 100 7 1 s1 sim_s1.json   # 100 partite tra giocatori automatici con le regole s1
node riassunto.js ../sim_s1.json         # durata, vittorie Blu/Rosso, attacchi, difese, Falò
```

Ogni simulazione occupa circa 1 GB di memoria per il dizionario.

## Pubblicare sulla VPS

Le istruzioni complete sono in [`online/ISTRUZIONI.md`](online/ISTRUZIONI.md).

1. Prepara il pacchetto con il dizionario in chiaro:
   ```bash
   mkdir -p build && cp -r online build/grimorio-server
   gunzip -c prototipo/parole.txt.gz > build/grimorio-server/public/parole.txt
   tar czf grimorio-server.tar.gz -C build grimorio-server
   ```
2. Copialo sulla VPS, estrailo ed esegui `sudo bash update.sh`. L'aggiornamento fa prima un backup e le partite restano.

## Sicurezza

- Nel repository non vanno mai chiavi o credenziali: `.gitignore` esclude chiavi SSH, `.env`, il database, le chiavi delle notifiche push (`vapid.json`) e i backup.
- Il server è l'arbitro delle partite: controlla ogni mossa, non manda mai al browser la mano dell'avversario né la Sacca, e limita le richieste per evitare abusi. I dettagli sono in [`online/ISTRUZIONI.md`](online/ISTRUZIONI.md#sicurezza).

## Licenze

- **Dizionario** (`prototipo/parole.txt.gz`): deriva dal dizionario italiano Hunspell di LibreOffice, distribuito con licenza **GPL-3**. Chi redistribuisce il dizionario deve rispettarla.
- **Font** (Alegreya Sans, Cinzel Decorative): licenza SIL Open Font License.
- **Codice e regolamento:** la licenza è ancora da scegliere. Finché non c'è un file `LICENSE`, tutti i diritti sono riservati all'autore.
