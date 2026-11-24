# 📜 GRIMORIO
*Il Gioco dei Duelli Linguistico-Arcani*

> **Versione 5: gioco digitale per Android, a turni asincroni.** Le versioni precedenti sono in `regolamento_e_struttura_v1.md` (da tavolo), `_v2.md` e `_v4.md`.
> Questa versione nasce da una serie di partite simulate (vedi *Note di bilanciamento* in fondo).
> Le regole segnate con 🧪 sono da verificare nel prototipo. Quelle segnate con ❓ sono ancora da decidere.
> Tutti i conteggi (Stabilità, resistenza, ponti, Tempeste) li gestisce il gioco.

---

## 📦 Componenti e Setup

* **Il campo:** griglia di **11 colonne x 11 righe**, divisa in tre zone (vedi *Geometria*).
* **La Sacca delle Rune (90 tessere):**
  * **48 Consumabili Leggere:** 12 A, 10 E, 8 I, 8 O, 3 C, 3 R, 2 S, 2 T.
  * **32 Catalizzatori Standard:** 5 U, 4 L, 4 M, 4 N, 4 P, 3 D, 3 F, 3 G, 2 B.
  * **10 Grandi Catalizzatori:** 3 V, 3 H, 2 Q, 2 Z.
* **Punti Vita:** ogni mago parte da **30 PV**. 🧪 *Nel prototipo si possono scegliere 20, 25 o 30 PV alla creazione della partita, per regolare la durata.*
* **Setup:** ogni giocatore pesca **7 tessere** nel proprio Grimorio (la mano). Inizia il Mago Blu.

### Valori delle lettere

| Valore | Lettere | Tipo |
|---|---|---|
| 1 | A, E, I, O | Consumabile |
| 2 | C, R, S, T | Consumabile |
| 3 | U, L, M, N | Runa |
| 4 | P, D, F, G, B, V | Runa |
| 8 | H | Runa |
| 10 | Q, Z | Runa |

Le lettere con valore **≥ 3** sono **Rune**. Quelle con valore 1-2 sono **Consumabili**.

---

## 🗺️ Geometria del Campo di Battaglia

Le righe sono numerate dal lato del Mago Blu:

| Righe | Zona |
|---|---|
| 1-3 | Sanctum Blu (la riga 1 è il bordo esterno, dove sta il Mago Blu) |
| 4-8 | Terra di Mezzo (la riga 6 è il **Passo Arcano**) |
| 9-11 | Sanctum Rosso (la riga 11 è il bordo esterno, dove sta il Mago Rosso) |

**Moltiplicatori** (solo nella Terra di Mezzo, valgono solo per le lettere appena posate):
* **LD (Lettera Doppia):** righe 4 e 8, colonne 3 e 9; Passo Arcano (riga 6), colonne 1 e 11.
* **PD (Parola Doppia):** righe 4 e 8, colonna 6.

1. **I Sanctum Personali:**
   * Qui si scrivono attacchi e difese.
   * **Costruzione libera:** nel proprio Sanctum si scrive in qualsiasi punto, anche staccati dalle altre parole.

2. **La Terra di Mezzo:**
   * Zona comune: le parole posate qui possono essere usate da **entrambi** i giocatori per collegarsi.
   * **Posa collegata:** una parola posata qui deve **toccare** una parola collegata al tuo Sanctum (vedi *Collegamento Magico*).
   * **Niente attacchi diretti dal centro:** una parola elementale scritta tutta nella Terra di Mezzo diventa un **Cataclisma** (vedi sotto).

3. **Primo giro di costruzione:** al primo turno di ciascun giocatore si scrive **solo nel proprio Sanctum**.

4. **Regola di Scarabeo:** ogni sequenza di lettere che si forma sulla griglia, in orizzontale o in verticale, deve essere una **parola valida**.
   * **Due parole si toccano** se si incrociano (condividono una lettera) o se due loro lettere sono adiacenti in orizzontale o in verticale. Le diagonali non contano.
   * **Potenza e tipo** dipendono solo dalla **parola principale**, quella formata dalle lettere posate nel turno. Le parole secondarie formate di lato devono essere valide, ma non aggiungono potenza.

5. **Lettura dal lato:** ognuno vede il campo dal proprio lato, con il proprio Sanctum in basso, come due giocatori seduti ai lati opposti di un tavolo.
   * Le parole orizzontali si leggono da sinistra a destra per entrambi.
   * Le parole **verticali** si leggono dall'alto in basso **dal lato di chi le scrive**. Quelle dell'avversario appaiono capovolte.
   * Anche le parole secondarie che si formano in verticale devono essere valide lette dal lato di chi gioca.
   * *Conseguenza:* è difficile allungare in verticale una parola dell'avversario, mentre incrociarla in orizzontale resta facile.

---

## 🌉 Il Collegamento Magico

Il Collegamento Magico è un **ponte di parole** che unisce il tuo Sanctum al Passo Arcano.

* **Quando è attivo:** esiste una **catena ininterrotta** di parole che si toccano. Parte da **una tua parola nel tuo Sanctum** e arriva a **una parola che tocca il Passo Arcano e sta tutta nella Terra di Mezzo**.
  *Una sola parola verticale che parte dal Sanctum e arriva al Passo Arcano non basta: servono almeno due parole.*
* **Le parole del ponte:** al centro puoi usare parole di **chiunque**, comprese quelle dell'avversario. Il punto di partenza deve essere sempre una tua parola nel tuo Sanctum.
* **Cosa permette:** finché il Collegamento è attivo puoi **invadere il Sanctum avversario** (Grande Falò e Iniezione Diretta).
* **Entrambi possono averlo** nello stesso momento.
* **Il ponte si spezza** se una parola della catena viene distrutta o si consuma e non c'è un altro percorso. Le tue parole già posate nel Sanctum nemico restano.

> **Esempio.** Turno 1: il Blu scrive `ROCCIA` in orizzontale in riga 3.
> Turno 2: scrive `ONDA` in verticale, dalla `O` di `ROCCIA` fino alla riga 6. La `A` è sul Passo Arcano, ma `ONDA` parte dal Sanctum: il ponte non è ancora attivo.
> Turno 3: scrive `MARE` in orizzontale sulla riga 6, usando la `A` di `ONDA`. `MARE` sta tutta al centro e tocca il Passo Arcano: il Collegamento è attivo.

---

## ⚔️ Il Combattimento

### Tipi di parola

| Tipo | Cosa fa |
|---|---|
| **Attacco** (Fuoco, Gelo, Acqua) | Dal Sanctum lancia un incantesimo che infligge danni |
| **Cataclisma** | Parola elementale scritta tutta nella Terra di Mezzo. ❓ *Effetti da definire: nel prototipo per ora non fa nulla* |
| **Difesa** (Terra / Protezione) | Resta sulla griglia e assorbe gli attacchi nemici |
| **Barriera Universale** | Contrasta i Cataclismi |
| **Neutra** (qualsiasi altra parola valida) | Fa da ostacolo e da ponte; si consuma col tempo |

Come si riconosce il tipo di una parola è spiegato nell'appendice **Lessico Arcano**.

### 1. Potenza
Si calcola **come a Scarabeo**: somma dei valori delle lettere, con i moltiplicatori LD e PD delle lettere appena posate.

### 2. Lancio
* Il punto di lancio è **una lettera della parola che si trova in un Sanctum**: il proprio, o quello nemico se si sta invadendo. Le lettere al centro non possono fare da punto di lancio.
* L'incantesimo procede **in linea retta lungo la colonna**, verso il bordo esterno dell'avversario.

### 3. Perdita di potenza lungo il tragitto
* **−1** per ogni casella attraversata. La casella di partenza non conta.
* **−1 in più** se nella casella c'è una lettera (di qualsiasi parola non difensiva, o di una difesa propria). L'incantesimo poi prosegue.
* **Difesa nemica:** vedi sotto.
* Se la potenza arriva a 0, l'incantesimo si dissolve.

### 4. Impatto
La potenza rimasta quando l'incantesimo supera il bordo esterno avversario viene sottratta ai suoi **Punti Vita**.

### 5. Le Difese e l'Erosione
* Una parola difensiva ha una **resistenza** pari al suo punteggio, moltiplicatori inclusi.
* **Difesa larga:** una difesa intercetta gli incantesimi nemici che passano sulla riga di una sua lettera, **nella stessa colonna o in una colonna accanto**.
* Quando un incantesimo viene intercettato:
  * se la potenza è **minore o uguale** alla resistenza, l'incantesimo si ferma e la difesa perde resistenza pari alla potenza;
  * se la potenza è **maggiore**, la difesa viene **disintegrata** e l'incantesimo prosegue con potenza − resistenza.
* Una difesa a resistenza 0 è disintegrata. Le difese **non** si consumano col tempo, solo con gli attacchi.
* Le proprie difese non fermano i propri incantesimi: contano come lettere normali (−2).

### 5b. La Consacrazione
* Una **parola neutra** scritta **tutta nel proprio Sanctum** può essere **consacrata** come difesa.
* Una difesa consacrata ha resistenza pari a **metà del suo punteggio** (arrotondata per eccesso) e funziona come le altre difese.
* A differenza delle difese del lessico Terra, **si consuma col tempo**: perde 1 di Stabilità a ogni tuo turno, come le parole neutre.
* Puoi avere **al massimo 2 difese consacrate attive** alla volta.

> **Esempio.** Il Blu scrive `CASA` (5) in riga 2 e la consacra: diventa una difesa da 3 che protegge le colonne della parola e quelle accanto. Dopo tre turni del Blu si spegne, se nessuno l'ha già sfondata.

> **Esempio.** Il Blu lancia `FIAMMA` (13) dalla riga 3, colonna 6. Il Rosso ha `ALBERO` (12) in riga 10, colonne 5-10.
> Righe 4-9 attraversate: 13 − 6 = 7. In riga 10 `ALBERO` intercetta: 7 ≤ 12, l'incantesimo si ferma e `ALBERO` scende a 5.
> Anche un lancio dalla colonna 4 sarebbe stato intercettato, perché la colonna 4 è accanto alla `A` di `ALBERO`.

### 6. Matrice degli Elementi
Per ora gli elementi non danno bonus. ❓ *Vantaggi elementali da valutare.*

### 7. Barriere Universali e Contromagia
Servono contro i Cataclismi: ❓ *da completare quando saranno definiti gli effetti dei Cataclismi*.
* **`ECO`:** rimbalza la propria quota di danno ambientale sull'avversario.
* **`VIA`:** devia gli effetti secondari (perdita lettere, malus) fuori dal proprio Sanctum.
* **`PACE`:** disinnesca l'ultimo Cataclisma per tutti.
* **`NO` (contromagia preparata):** si posa nel proprio turno e resta nascosta. Scatta da sola al prossimo Cataclisma nemico e ne dimezza la potenza.
* `MUR` ora è solo una parola difensiva.

---

## ⏳ Il consumo delle parole

Le parole non restano per sempre: così il campo si svuota e le tessere tornano in circolo.

* **Stabilità:** ogni parola ha una Stabilità pari al suo punteggio base (senza moltiplicatori). Per le difese coincide con la resistenza.
* **Consumo:** all'inizio di ogni turno del proprietario, le sue parole **d'attacco, neutre, Cataclisma e le difese consacrate** perdono **1** di Stabilità. Le difese del lessico Terra no.
* **A 0 la parola si spegne:** le Rune tornano nel Grimorio di chi le aveva posate, le Consumabili vanno nel Focolare. Lo spegnimento non scatena Tempeste.
* Se una lettera fa parte anche di un'altra parola ancora viva, resta sulla griglia.

---

## 💥 Distruzione delle parole

Una parola viene distrutta quando:
* è una difesa **disintegrata** da un attacco;
* viene bruciata da un **Grande Falò**;
* la sua Stabilità scende a 0 per una **Tempesta Arcana**.

Cosa succede alle lettere:
* **Difesa disintegrata o parola crollata:** le Rune tornano al proprietario, le Consumabili vanno nel Focolare.
* **Grande Falò:** **tutte** le lettere, Rune comprese, vanno nel Focolare.

---

## 🌪️ La Tempesta Arcana

* **Quando scoppia:** quando in un turno viene distrutta almeno una parola nella Terra di Mezzo, con un Falò o disintegrando una difesa.
* **Forza:** si estrae a caso una lettera tra quelle della parola distrutta (o delle parole distrutte). Il suo valore è la forza della Tempesta.
  *Distruggere una parola di sole vocali provoca una Tempesta lieve, una con `H`, `Q` o `Z` può essere devastante.*
* **Tempesta locale:** colpisce solo le parole della Terra di Mezzo che **toccavano** la parola distrutta. Perdono Stabilità pari alla forza; quelle a 0 crollano.
* **Niente reazione a catena:** i crolli non scatenano altre Tempeste.
* I Sanctum sono al riparo.

> **Esempio.** Il Rosso brucia `ONDA` con un Falò. Si estrae una lettera di `ONDA`: esce la `N` (3).
> `MARE`, che toccava `ONDA`, perde 3 di Stabilità. Le parole lontane da `ONDA` non subiscono nulla.

---

## 🏰 Assedio, Invasione e Sabotaggio

* **Grande Falò:** allunghi o incroci una parola nella Terra di Mezzo o nel Sanctum nemico formando una *qualsiasi parola valida*, per esempio trasformando `GELO` in `GELOSIA`. La parola originale e quella nuova bruciano: tutte le lettere vanno nel Focolare.
  * **Una volta ogni 3 turni:** dopo un Falò devono passare 2 tuoi turni prima di poterne fare un altro.
  * Nel Sanctum nemico serve il Collegamento Magico attivo.
  * Un Falò al centro scatena una Tempesta Arcana.
* **Iniezione Diretta:** con il Collegamento attivo ti agganci a una parola nemica nel suo Sanctum e scrivi lì una parola d'attacco. La lanci da vicino, quindi perde molta meno potenza.

---

## 🔄 Flusso del Turno

1. **Inizio turno:** le tue parole d'attacco, neutre e Cataclisma perdono 1 di Stabilità.
2. **Azione** (una sola):
   * **Scrivere una parola:** nel tuo Sanctum, nella Terra di Mezzo (posa collegata) o nel Sanctum nemico (con il Collegamento attivo). Se è un attacco scegli il punto di lancio, poi si risolvono subito danni, Falò e Tempeste. Se è una parola neutra nel tuo Sanctum puoi consacrarla come difesa.
   * **Alchimia:** scarti da **1 a 7 lettere** a scelta e ne peschi altrettante.
   * **Passare.**
3. **Fine turno:** peschi dalla Sacca fino a 7 lettere. Se ne hai già 7 o più, non peschi. Se la Sacca è vuota, il Focolare viene rimescolato e diventa la nuova Sacca.

**Vittoria:** vince il primo mago che porta a **0** i Punti Vita dell'avversario.

**Partite a distanza** 🧪: ognuno gioca il proprio turno quando può.

**Tempo per turno (partite a distanza):**
* Ogni turno dura al massimo **48 ore**. Quando ne mancano 12 arriva un promemoria.
* Se il tempo scade, il turno **passa da solo**, come se il giocatore avesse passato.
* Chi lascia scadere il tempo **2 volte di fila** perde la partita. Basta giocare un turno qualsiasi per azzerare il conto.
* Il tempo non vale nelle partite contro il computer né nella modalità prova (un giocatore muove entrambi i maghi).

---

## 📖 Appendice: Lessico Arcano

Il tipo di una parola si riconosce in tre modi:
1. è in uno degli **elenchi** qui sotto;
2. è una **forma flessa** di una parola degli elenchi (plurale o femminile: `FIAMME`, `FUOCHI`, `ALBERI`);
3. **contiene una radice lunga** (di almeno 4 lettere) di un elemento: per esempio `GHIACCIAIO` contiene `GHIACC`, quindi è Gelo.

Il dizionario di gioco conta circa 756.000 parole italiane, compresi plurali e coniugazioni.

### 🔥 Fuoco (attacco)
**Elenco:** FUOCO 11 · FIAMMA 13 · BRACE 10 · ROGO 8 · LAVA 9 · VAMPA 13 · SOLE 7 · IRA 4 · ARDORE 11 · CENERE 10 · FORNO 11 · MAGMA 12 · FIACCOLA 15 · INCENDIO 16 · FALO 9
**Radici:** FUOC · FIAMM · INCEND · BRUCI · VAMP · ROVENT · CENER · MAGM · FIACCOL · ARDOR

### ❄️ Gelo (attacco)
**Elenco:** GELO 9 · GHIACCIO 20 · NEVE 9 · BRINA 11 · FREDDO 16 · INVERNO 15 · NORD 10 · GRANDINE 19 · BUFERA 15 · TORMENTA 15 · VALANGA 17 · POLO 9
**Radici:** GHIACC · GELID · GELAT · NEVIC · NEVOS · BRIN · FREDD · INVERN · GRANDIN · VALANG · BUFER

### 💧 Acqua (attacco)
**Elenco:** ACQUA 17 · ONDA 9 · MARE 7 · LAGO 9 · FIUME 12 · PIOGGIA 16 · MAREA 8 · TORRENTE 14 · CASCATA 11 · NEBBIA 14 · DILUVIO 17 · RUGIADA 16 · FONTE 11 · OCEANO 9
**Radici:** ACQU · PIOGG · PIOV · FIUM · TORRENT · CASCAT · NEBBI · DILUV · RUGIAD · OCEAN · ONDAT · ONDOS · LAGUN

### 🪨 Terra / Protezione (difesa)
**Elenco:** MUR 8 · SCUD 11 · MURO 9 · MURA 9 · SCUDO 12 · TERRA 8 · ALBERO 12 · ROCCIA 9 · PIETRA 11 · MONTE 10 · ARGINE 12 · BASTIONE 15 · TORRE 8 · ROCCA 8 · CORAZZA 27 · ELMO 8 · BARRIERA 14 · DIGA 10 · QUERCIA 20 · ZOLLA 18 · ARGILLA 15 · BOSCO 10 · RADICE 11
**Radici:** MURA · SCUD · ROCCI · PIETR · MONTAGN · ARGIN · BASTION · TORRI · TORRE · CORAZZ · BARRIER · QUERC · ARGILL · RADIC · ALBER · FORTEZZ · BALUARD · CASTELL

### Note sul lessico
* Le radici corte della v1 (`HO`, `PO`, `EST`, `SOL`, `IRA`, `GEL`…) sono state escluse: stanno dentro migliaia di parole e nelle simulazioni rendevano quasi tutto un attacco (partite di 3 turni).
* Gli elenchi sono provvisori, in attesa delle parole del designer (foglio *Parole arcane*).
* Le parole si scrivono senza accenti (`FALO`). Non esistono le lettere J, K, W, X, Y.
* Il dizionario viene dal correttore ortografico italiano di LibreOffice (licenza GPL-3). ❓ *Prima di un'eventuale pubblicazione commerciale va verificato se la licenza è compatibile.*

---

## 📊 Note di bilanciamento (simulazioni del 23/11/2026)

Partite tra due giocatori automatici, 10 per variante. Ogni giocatore sceglie la mossa migliore turno per turno, senza strategia a lungo termine. I dati della v3 sono quelli della seconda serie, dopo aver corretto un difetto del giocatore automatico che a volte non vedeva mosse valide.

| | v2 | v2 con radici corte | v3 | **v4** |
|---|---|---|---|---|
| Esito | 8 vittorie, 2 pareggi | 10 vittorie | 6 vittorie, 4 pareggi (blocchi) | **10 vittorie** |
| Vittorie Blu / Rosso | 5 / 3 | 6 / 4 | 5 / 1 | **5 / 5** |
| Durata media | ~70 mosse | ~7 mosse | ~115 mosse | ~74 mosse |
| Attacchi per partita | ~5 | quasi ogni mossa | ~6 | ~11 |
| Ponte attivo (mossa n°) | 3-4 | 3-4 | 3-4 | 5-16 |
| Attacchi fermati da difese | 0 | 0 | 0 | 3 su 109 |

* **v3** ha aggiunto: attacchi solo dai Sanctum, centro di 5 righe, 40 PV, difese larghe, Falò ogni 3 turni, radici lunghe. Il campo però si riempiva (fino a 78 tessere su 90) e i giocatori restavano senza mosse.
* **v4** ha aggiunto: consumo delle parole neutre, ponte tutto al centro, Tempesta locale, Alchimia parziale. Abbiamo provato anche un **tetto al danno** (metà dei PV), ma nessun attacco lo ha mai raggiunto: per ora non è nelle regole.

### Le difese (v5)

Nella v4 le difese erano rare e intercettavano il 4% degli attacchi. Queste varianti sono state giocate con un giocatore automatico migliorato, che valuta anche quante colonne del proprio Sanctum le difese coprono.

| | v4 | v5a | v5b | v5c | v5d | **v5e** |
|---|---|---|---|---|---|---|
| Modifica | – | Consacrazione permanente | Difese bloccano i lanci di chi invade | a + b | Consacrate si consumano | **d + max 2 consacrate + 30 PV** |
| Esito | 10 vittorie (5-5) | 9 pareggi | 10 vittorie (6-4) | 10 pareggi | 10 vittorie (6-4) | **10 vittorie (4-6)** |
| Durata media | 76 mosse | 193 | 74 | 200 | 135 | **83** |
| Attacchi intercettati | 4% | 78% | 4% | 92% | 76% | **66%** |
| Consacrazioni a partita | – | ~58 | – | ~56 | ~75 | **~30** |

* Il **blocco delle invasioni** da solo non cambia nulla (ci sono troppo poche difese) e insieme alla Consacrazione rende le invasioni impossibili: scartato.
* La **Consacrazione permanente** riempie il campo di muri e porta al pareggio; quella che si consuma funziona, ma senza limite diventa la mossa di metà dei turni.
* La **v5e** è stata adottata come regola base.

### Lettura dal lato (v5f)

10 partite con la lettura dal lato contro 10 con il campo fisso (v5e), stesse condizioni:

| | v5e | v5f |
|---|---|---|
| Vittorie Blu / Rosso | 4 / 6 | 6 / 4 |
| Durata media | 83 mosse | 84 |
| Falò su parole verticali nemiche | 73 | 65 |
| Attacchi intercettati | 70 su 106 | 63 su 96 |

L'equilibrio non cambia in modo apprezzabile: la **v5f** è la regola attuale.

### Versione semplificata s1 🧪 (simulazioni del 24/11/2026)

**Idea:** niente lessico e niente radici.
* Ogni parola del dizionario si può lanciare: lo sceglie il giocatore quando la posa.
* La parola lanciata **sparisce subito**. Le sue lettere vanno al Focolare, tranne quelle che reggono anche un'altra parola.
* La parola non lanciata resta come ponte o ostacolo (neutra), oppure si consacra come difesa.
* Il resto è come la v5f.

100 partite per variante, giocatori automatici:

| Variante | Turni a testa | Vittorie Blu / Rosso | Attacchi | Danno per colpo | Ponte attivo | Note |
|---|---|---|---|---|---|---|
| **v5f** (riferimento, 46 partite) | 42 | 28 / 18 | | | | |
| **s1**: si lancia dal proprio Sanctum, 30 PV | 2,4 | 65 / 35 | 4,0 | 14 | 0% | si vince lanciando dal proprio Sanctum, il centro non serve |
| **s1p**: come s1, Consacrazione a resistenza piena | 2,5 | 62 / 38 | 4,3 | 14 | 0% | le difese non bastano a cambiare le cose |
| **s1d**: come s1, ma l'incantesimo perde 2 per casella | 3,6 | 64 / 36 | 4,4 | 17 | 0% | ancora troppo breve |
| **s1n**: si lancia **solo dal Sanctum nemico**, 30 PV | 7,0 | 46 / 54 | 4,2 | 16 | 75% | il Collegamento diventa il cuore del gioco |
| **s1n50**: come s1n, 50 PV | 10,4 | 45 / 55 | 7,1 | 16 | 86% | |
| **s1n80**: come s1n, 80 PV | 15,5 | 54 / 46 | 11,4 | 13 | 96% | durata adatta al gioco a distanza |

**Cosa emerge:**
* Senza lessico ogni parola è un attacco. Lanciando dal proprio Sanctum, una parola qualunque fa 14-17 danni anche attraversando tutta la griglia: in 2-3 colpi la partita è chiusa e chi comincia è avvantaggiato.
* Rafforzare le difese o aumentare la perdita per casella non basta.
* Funziona invece **lanciare solo dal Sanctum nemico**:
  * per attaccare bisogna costruire il Collegamento Magico, entrare nel Sanctum avversario e agganciarsi a una sua parola;
  * le vittorie sono equilibrate e quasi tutti i giocatori costruiscono il ponte.
* Con **80 PV** la durata è di circa 15 turni a testa, la misura cercata per le partite a distanza.
* **Da rivedere in s1n:**
  * le difese intercettano poco, circa 1 attacco su 11;
  * Falò e Tempeste sono rari, circa 1 a partita;
  * ogni attacco va a segno.
  
  Possibili correttivi: Consacrazione più ampia, oppure difese che proteggono anche le righe d'ingresso del proprio Sanctum.

#### Rafforzare la difesa: lo Scudo (simulazioni del 24/11/2026)

In s1n l'incantesimo parte dal Sanctum nemico e percorre solo 0-2 caselle prima del bordo, quindi le difese non lo incontrano quasi mai. Lo **Scudo** fa sì che l'incantesimo affronti le difese consacrate **prima** di partire. Lo scontro è quello di sempre:
* se la difesa è più forte, assorbe il colpo e si erode;
* se è più debole, si disintegra e il resto del colpo passa.

Ci sono due forme:
* **Scudo di colonna:** la difesa protegge le sue colonne (±1, oppure ±2) in tutto il proprio Sanctum.
* **Scudo di riga:** la difesa protegge **tutta la sua riga**. L'incantesimo la incontra se parte da quella riga o se la attraversa per uscire verso il bordo. Uno scudo sulla riga più arretrata protegge quindi tutto il Sanctum, uno sulla riga d'ingresso solo quella riga. Più scudi si sommano.

Tutte le varianti sono s1n; 100 partite ciascuna, salvo il lancio vietato.

| Variante | PV | Turni a testa (mediana) | Blu / Rosso | A segno | Danno per colpo | Intercettati | Falò |
|---|---|---|---|---|---|---|---|
| Senza scudo | 80 | 15,5 (15,5) | 54 / 46 | 100% | 13,4 | 1,0 | 1,2 |
| Scudo di colonna ±1, resistenza a metà | 80 | 20,7 (21) | 44 / 56 | 96% | 11,9 | 7,5 | 1,9 |
| Scudo di colonna ±1, resistenza piena | 80 | 24,6 (24) | 51 / 49 | 89% | 9,7 | 9,0 | 3,9 |
| Scudo di colonna ±1, resistenza piena | 60 | 18,4 (17,5) | 61 / 39 | 91% | 11,2 | 6,3 | 3,0 |
| Scudo di colonna ±2, resistenza piena | 60 | 21,2 (20,5) | 55 / 45 | 88% | 10,6 | 7,6 | 4,0 |
| Scudo di riga, resistenza a metà | 80 | 19,9 (19,5) | 49 / 51 | 94% | 11,3 | 5,7 | 1,8 |
| **Scudo di riga, resistenza piena** | **80** | **21,3 (19,5)** | **53 / 47** | **84%** | 11,6 | 5,7 | 3,3 |
| Scudo di riga, difesa a **valore doppio** | 80 | 21,2 (19,5) | 54 / 46 | 84% | 11,4 | 3,9 | 4,5 |
| **Scudo di riga, difesa a valore doppio** | **60** | **17,3 (16)** | **51 / 49** | **81%** | 11,6 | 3,6 | 3,7 |
| Scudo di riga, valore doppio, **1 sola consacrata** | 80 | 13,5 (13,5) | 60 / 40 | 96% | 12,4 | 1,0 | 1,6 |
| Lancio vietato nelle colonne coperte (44 partite) | 80 | circa 40 | — | — | — | — | — |

**Cosa emerge:**
* **Lo Scudo funziona in tutte le forme.** Le difese entrano in gioco (da 1 a 6-9 attacchi intercettati a partita), il danno per colpo scende e il Falò torna utile per bruciare gli scudi.
* **Lo Scudo di riga a resistenza piena è il miglior compromesso:**
  * è la percentuale di colpi a segno più bassa (84%);
  * le vittorie sono equilibrate;
  * la durata mediana è di 19,5 turni a testa, dentro l'obiettivo di 15-20 per il gioco a distanza;
  * è anche il più facile da spiegare: «lo Scudo protegge la sua riga».
* **Con 60 PV le partite si accorciano ma il Blu**, che parte per primo, **vince di più** (61 / 39 con lo Scudo ±1). Su 100 partite può essere in parte un caso, ma è un segnale da tenere d'occhio.
* **Il lancio vietato** raddoppia la durata e porta partite senza vincitore: scartato, come già nella v5.
* **Ancora aperto:** l'84% di colpi a segno resta sopra l'obiettivo (55-75%). Lo Scudo indebolisce gli attacchi ma raramente li ferma del tutto.
* **Difesa a valore doppio:**
  * a 80 PV non cambia quasi nulla;
  * a **60 PV** è la combinazione migliore finora: circa 17 turni a testa, 51 / 49, 81% a segno. Le difese sono poche (circa 8 consacrazioni a partita) ma robuste, e il Falò diventa il modo naturale per toglierle (vedi l'esempio NON su MUNIVO nel prototipo).
* **Una sola difesa consacrata** non basta: la difesa torna quasi inutile (96% a segno, 1 attacco intercettato a partita) e il Blu vince 60 / 40. Il massimo resta 2.

---

## ❓ Punti ancora aperti

1. **Effetti dei Cataclismi** e, di conseguenza, delle Barriere e del `NO`.
2. **Consacrazioni frequenti:** circa un terzo delle mosse. Da osservare giocando.
3. **Falò ancora frequente:** circa 14 a partita.
4. **Mano che si gonfia:** con le Rune che tornano si arriva a 9-11 lettere, spesso pesanti. Serve un limite?
5. **Durata:** circa 40 turni a testa con 30 PV. Per il gioco a distanza 15-20 sarebbero più adatti: da provare con 20 o 25 PV.
6. ~~Tempo massimo per turno~~: deciso, 48 ore (vedi «Partite a distanza»).
7. **Vantaggi elementali** (per ora solo aritmetica).

---

*© 2026 t0sc4n. Questo regolamento è distribuito con licenza [Creative Commons Attribuzione - Condividi allo stesso modo 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.it) (CC BY-SA 4.0).*
