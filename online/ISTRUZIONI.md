# Installare Grimorio sulla VPS

Questa cartella contiene il server di gioco di Grimorio: partite a distanza con link d'invito, aggiornamenti in tempo reale, notifiche "Tocca a te" e partite contro il computer.

**Cosa serve:** una VPS Ubuntu con Apache (già presente), accesso con `sudo` e un nome di dominio che punti alla VPS.

---

## 1. Un nome di dominio gratuito (DuckDNS)

L'HTTPS è obbligatorio per installare l'app sul telefono e ricevere le notifiche, e per l'HTTPS serve un nome di dominio. Se non ne hai uno, DuckDNS ne dà uno gratis:

1. Vai su **duckdns.org** e accedi (con Google, GitHub o un altro account).
2. Scegli un nome libero, per esempio `grimorio-mago`: il tuo indirizzo sarà `grimorio-mago.duckdns.org`.
3. Nel campo **current ip** scrivi l'indirizzo IP della VPS e premi **update ip**.
4. Dopo un minuto, da un terminale: `ping grimorio-mago.duckdns.org` deve rispondere con l'IP della VPS.

Se in futuro compri un dominio vero (pochi euro l'anno), basta creare un record **A** verso l'IP della VPS e rifare il punto 4 con il nuovo nome.

## 2. Porte aperte

Le porte 80 e 443 devono essere raggiungibili. Se usi il firewall `ufw`:

```bash
sudo ufw allow 'Apache Full'
```

Se il tuo fornitore VPS ha un firewall nel pannello di controllo, apri lì le porte 80 e 443.

## 3. Copiare il pacchetto sulla VPS

Dal tuo computer (sostituisci utente e IP):

```bash
scp grimorio-server.tar.gz utente@IP-DELLA-VPS:~
ssh utente@IP-DELLA-VPS
tar xzf grimorio-server.tar.gz
cd grimorio-server
```

## 4. Installare

```bash
sudo bash install.sh grimorio-mago.duckdns.org
```

Lo script:
- installa Node.js 24 se manca (se trova una versione più vecchia si ferma e ti spiega come procedere);
- crea l'utente di sistema `grimorio` e le cartelle `/opt/grimorio` (programma) e `/var/lib/grimorio` (partite);
- avvia il servizio `grimorio`, che ripartirà da solo anche dopo un riavvio della VPS;
- aggiunge ad Apache un sito separato per il tuo dominio. **I siti che hai già non vengono toccati.**

## 5. Attivare l'HTTPS

```bash
sudo certbot --apache -d grimorio-mago.duckdns.org --redirect
```

Certbot ti chiede un indirizzo email (solo per gli avvisi di scadenza del certificato) e rinnova il certificato da solo.

## 6. Giocare

Apri `https://grimorio-mago.duckdns.org` con Chrome sul telefono:
- menu ⋮ → **Aggiungi a schermata Home** per installarlo come app;
- crea una partita, tocca **Invita un amico** e manda il link;
- tocca **Avvisami quando tocca a me** per le notifiche.

Per giocare le stesse partite da un altro dispositivo: **Il tuo profilo** → copia il link di accesso e aprilo sull'altro dispositivo. Non mandarlo ad altri: chi lo apre gioca al posto tuo.

---

## Backup delle partite

Una copia manuale:

```bash
sudo bash /opt/grimorio/backup.sh
```

Le copie vanno in `/var/backups/grimorio` e restano le ultime 14. Per farlo ogni notte alle 3:30:

```bash
sudo crontab -e
```
e aggiungi la riga:
```
30 3 * * * bash /opt/grimorio/backup.sh >/dev/null 2>&1
```

Il file `/var/lib/grimorio/vapid.json` contiene le chiavi delle notifiche: il backup lo copia insieme alle partite. Se lo perdi, i giocatori dovranno riattivare le notifiche.

## Aggiornare Grimorio

Quando ricevi un nuovo pacchetto, copialo ed estrailo come al punto 3, poi:

```bash
cd grimorio-server
sudo bash update.sh
```

L'aggiornamento fa prima un backup; le partite in corso restano.

## Se qualcosa non va

| Problema | Cosa guardare |
|---|---|
| La pagina non si apre | `systemctl status grimorio` e `journalctl -u grimorio -n 50` |
| Errore di Apache | `sudo apache2ctl configtest` e `/var/log/apache2/grimorio-error.log` |
| Le mosse dell'avversario arrivano solo ricaricando | Il WebSocket non passa: controlla che `proxy_wstunnel` e `rewrite` siano attivi (`apache2ctl -M`) |
| Niente notifiche | Servono HTTPS e Chrome; su iPhone solo con l'app aggiunta alla schermata Home (iOS 16.4 o successivo) |
| Certbot fallisce | Il dominio deve già puntare alla VPS e la porta 80 deve essere aperta |

## Sicurezza

### Cosa è già protetto

- **Niente imbrogli:** il server controlla ogni mossa con le regole. Ogni giocatore riceve solo la propria mano; Sacca e mano dell'avversario non arrivano mai al browser.
- **Accesso:** ogni giocatore ha un codice casuale di 48 caratteri, salvato sul server solo in forma cifrata (hash). Dal profilo si può creare un nuovo codice, che scollega tutti gli altri dispositivi.
- **Limiti contro gli abusi** (in `server.js`, oggetto `LIMITS`):

| Limite | Valore |
|---|---|
| Richieste all'API per indirizzo IP | 240 al minuto |
| Nuovi giocatori per indirizzo IP | 20 all'ora |
| Mosse per giocatore | 40 al minuto |
| Partite create per giocatore | 15 all'ora |
| Partite in corso per giocatore | 40, di cui al massimo 5 contro il computer |
| Dispositivi con notifiche per giocatore | 5 |
| Connessioni in tempo reale | 6 per giocatore, 30 per indirizzo IP |

- **Il computer avversario** pensa in un thread separato, una partita alla volta: anche se qualcuno lo tiene occupato, il resto del gioco risponde subito. Se un calcolo si blocca, il thread viene riavviato.
- **Notifiche:** il server contatta solo i servizi ufficiali (Google, Mozilla, Microsoft, Apple), mai indirizzi scelti da un utente.
- **Browser:** la pagina carica solo file del tuo sito (Content-Security-Policy), non può essere incorporata in altri siti e non manda a nessuno l'indirizzo da cui arriva. I font sono sul tuo server, quindi Google non vede gli indirizzi IP dei giocatori.
- **Sistema:** il servizio gira con un utente senza privilegi e può scrivere solo in `/var/lib/grimorio`. Ascolta solo su `127.0.0.1`, quindi da Internet si raggiunge solo passando da Apache.
- **Tempo per turno:** 48 ore nelle partite tra due persone, con un promemoria 12 ore prima. Allo scadere il turno passa da solo; chi lo lascia scadere 2 volte di fila perde la partita. Per cambiare la durata aggiungi `Environment=TURN_HOURS=24` (o il valore che vuoi) nel file `/etc/systemd/system/grimorio.service`, poi `sudo systemctl daemon-reload && sudo systemctl restart grimorio`.
- **Pulizia automatica:** le partite finite da 90 giorni, quelle mai iniziate da 14 e quelle ferme da 180 giorni vengono cancellate, insieme ai giocatori rimasti senza partite.

### Rischi che restano (da sapere)

- **Il link di accesso è una password.** Chi lo ottiene gioca al posto tuo finché non crei un nuovo codice.
- **Chi ha il link di una partita la può guardare** (senza vedere le mani). I link sono casuali e impossibili da indovinare, ma chi li riceve li può inoltrare.
- **I nomi non sono moderati.** Li vedono solo gli avversari che inviti.
- **Le copie di sicurezza** in `/var/backups/grimorio` non sono cifrate: contengono solo nomi e partite, ma tienile sulla VPS o in un posto sicuro.

### Consigli per la VPS

- Aggiornamenti automatici di sicurezza: `sudo apt install unattended-upgrades` e poi `sudo dpkg-reconfigure -plow unattended-upgrades`.
- Accesso SSH solo con chiave (niente password) e, se vuoi, `fail2ban` contro i tentativi di accesso.
- Non aprire la porta 3077 nel firewall: non serve, il gioco passa da Apache.

## Come è fatto

- `server.js`: arbitro delle partite, WebSocket, notifiche, limiti contro gli abusi. Ascolta solo su `127.0.0.1:3077`, quindi è raggiungibile solo attraverso Apache.
- `ai-worker.js`: il computer avversario, in un thread separato.
- `public/`: la pagina del gioco, il motore delle regole (`engine.js`, lo stesso usato dal server), il dizionario, l'app installabile.
- Partite e giocatori stanno in un unico file SQLite: `/var/lib/grimorio/grimorio.db`.
- Il dizionario deriva dal correttore ortografico italiano di LibreOffice (licenza GPL-3): verifica la licenza prima di un uso commerciale.
