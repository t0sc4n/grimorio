# 📜 GRIMORIO
*Il Gioco dei Duelli Linguistico-Arcani*

> **Versione 4: gioco digitale per Android, a turni asincroni.** Le versioni precedenti sono in `regolamento_e_struttura_v1.md` (da tavolo) e `regolamento_e_struttura_v2.md`.
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
* **Punti Vita:** ogni mago parte da **40 PV**.
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
| 4-8 | Terra di Mezzo (la riga 6 è la **Staffa Magica**) |
| 9-11 | Sanctum Rosso (la riga 11 è il bordo esterno, dove sta il Mago Rosso) |

**Moltiplicatori** (solo nella Terra di Mezzo, valgono solo per le lettere appena posate):
* **LD (Lettera Doppia):** righe 4 e 8, colonne 3 e 9; Staffa (riga 6), colonne 1 e 11.
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

---

## 🌉 Il Collegamento Magico

Il Collegamento Magico è un **ponte di parole** che unisce il tuo Sanctum alla Staffa.

* **Quando è attivo:** esiste una **catena ininterrotta** di parole che si toccano. Parte da **una tua parola nel tuo Sanctum** e arriva a **una parola che tocca la Staffa e sta tutta nella Terra di Mezzo**.
  *Una sola parola verticale che parte dal Sanctum e arriva alla Staffa non basta: servono almeno due parole.*
* **Le parole del ponte:** al centro puoi usare parole di **chiunque**, comprese quelle dell'avversario. Il punto di partenza deve essere sempre una tua parola nel tuo Sanctum.
* **Cosa permette:** finché il Collegamento è attivo puoi **invadere il Sanctum avversario** (Grande Falò e Iniezione Diretta).
* **Entrambi possono averlo** nello stesso momento.
* **Il ponte si spezza** se una parola della catena viene distrutta o si consuma e non c'è un altro percorso. Le tue parole già posate nel Sanctum nemico restano.

> **Esempio.** Turno 1: il Blu scrive `ROCCIA` in orizzontale in riga 3.
> Turno 2: scrive `ONDA` in verticale, dalla `O` di `ROCCIA` fino alla riga 6. La `A` è sulla Staffa, ma `ONDA` parte dal Sanctum: il ponte non è ancora attivo.
> Turno 3: scrive `MARE` in orizzontale sulla riga 6, usando la `A` di `ONDA`. `MARE` sta tutta al centro e tocca la Staffa: il Collegamento è attivo.

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
* **Consumo:** all'inizio di ogni turno del proprietario, le sue parole **d'attacco, neutre e Cataclisma** perdono **1** di Stabilità. Le difese no.
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
   * **Scrivere una parola:** nel tuo Sanctum, nella Terra di Mezzo (posa collegata) o nel Sanctum nemico (con il Collegamento attivo). Se è un attacco scegli il punto di lancio, poi si risolvono subito danni, Falò e Tempeste.
   * **Alchimia:** scarti da **1 a 7 lettere** a scelta e ne peschi altrettante.
   * **Passare.**
3. **Fine turno:** peschi dalla Sacca fino a 7 lettere. Se ne hai già 7 o più, non peschi. Se la Sacca è vuota, il Focolare viene rimescolato e diventa la nuova Sacca.

**Vittoria:** vince il primo mago che porta a **0** i Punti Vita dell'avversario.

**Partite a distanza** 🧪: ognuno gioca il proprio turno quando può. ❓ *Tempo massimo per turno (24 o 48 ore) e cosa succede se scade: da decidere.*

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

---

## ❓ Punti ancora aperti

1. **Effetti dei Cataclismi** e, di conseguenza, delle Barriere e del `NO`.
2. **Difese ancora deboli:** nelle simulazioni hanno fermato 3 attacchi su 109.
3. **Falò ancora frequente:** circa 15 a partita.
4. **Mano che si gonfia:** con le Rune che tornano si arriva a 9-11 lettere, spesso pesanti. Serve un limite?
5. **Durata:** circa 37 turni a testa. Per il gioco a distanza 15-20 sarebbero più adatti.
6. **Tempo massimo per turno** nelle partite a distanza.
7. **Vantaggi elementali** (per ora solo aritmetica).
