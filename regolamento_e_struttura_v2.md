# 📜 GRIMORIO
*Il Gioco dei Duelli Linguistico-Arcani*

> **Versione 2 (bozza): gioco digitale per Android.** La versione da tavolo originale è in `regolamento_e_struttura_v1.md`.
> Le regole segnate con 🧪 sono proposte da provare nel prototipo. Quelle segnate con ❓ sono ancora da decidere.
> Dove il testo parla di tessere, segnalini o fogli, va inteso come l'equivalente sullo schermo: il conteggio è sempre automatico.

---

## 📦 Componenti e Setup

* **Il Tabellone Modulare (3 Fogli A4 Orizzontali):**
  1. **Sanctum Giocatore A (Blu):** griglia 11x3 caselle e tracciato Punti Vita (da 20 a 0).
  2. **Terra di Mezzo (Grigio/Neutro):** griglia 11x3 caselle con moltiplicatori (LD, PD) e la **Staffa Magica** lungo tutta la riga centrale.
  3. **Sanctum Giocatore B (Rosso):** speculare al Sanctum A.
* **La Sacca delle Rune (90 Tessere):**
  * **48 Consumabili Leggere:** 12 A, 10 E, 8 I, 8 O, 3 C, 3 R, 2 S, 2 T.
  * **32 Catalizzatori Standard:** 5 U, 4 L, 4 M, 4 N, 4 P, 3 D, 3 F, 3 G, 2 B.
  * **10 Grandi Catalizzatori:** 3 V, 3 H, 2 Q, 2 Z.
* **Indicatori:** 1 segnalino Punti Vita per giocatore. Si parte da **20 PV**.
* **Setup:** ogni giocatore pesca **7 tessere** iniziali nel proprio Grimorio (la mano).

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

Il campo è una griglia continua di **11 colonne x 9 righe**. Le righe sono numerate dal lato del Giocatore A:

| Righe | Zona |
|---|---|
| 1-3 | Sanctum A (la riga 1 è il bordo esterno, dove sta il mago A) |
| 4-6 | Terra di Mezzo (la riga 5 è la **Staffa Magica**) |
| 7-9 | Sanctum B (la riga 9 è il bordo esterno, dove sta il mago B) |

1. **I Sanctum Personali (Zone Protette):**
   * Qui si compongono incantesimi d'attacco e difese.
   * **Costruzione libera:** nel proprio Sanctum si può scrivere in qualsiasi punto, anche una parola staccata dalle altre. Non ci sono caselle Ancora.

2. **La Terra di Mezzo (Zona del Caos):**
   * Griglia centrale comune: le parole posate qui possono essere usate da **entrambi** i giocatori per collegarsi.
   * **Posa collegata:** una parola posata nella Terra di Mezzo deve **toccare** una parola già sulla griglia che faccia parte del tuo Collegamento Magico (vedi sotto). Non si può posare una parola isolata al centro.
   * **Cataclismi Globali:** le magie elementali lanciate al centro scatenano effetti ambientali che colpiscono *entrambi* i giocatori (es. danni ad area, scarto di lettere, blocco delle Rune nel turno successivo). ❓ *Effetti precisi da definire.*
   * **La Staffa Magica (riga 5):** è il punto d'accesso al Sanctum avversario, attivato dal Collegamento Magico.

3. **Primo giro di costruzione** 🧪: al primo turno di ciascun giocatore si può scrivere **solo nel proprio Sanctum**. Così chi gioca per primo non conquista la Staffa prima che l'avversario si sia mosso.

4. **Le parole restano sulla griglia:** una parola posata resta dov'è **finché non viene distrutta**, in qualsiasi zona si trovi (vedi *Distruzione delle parole*).

5. **Regola di Scarabeo:** ogni sequenza di lettere, in orizzontale o in verticale, che si forma sulla griglia dopo una posa deve essere una **parola valida**. Se una lettera nuova si affianca a lettere già presenti e forma una parola non valida, la posa non è ammessa.
   * **Quando due parole si toccano:** se si **incrociano** (condividono una lettera) o se una lettera dell'una è **adiacente in orizzontale o in verticale** a una lettera dell'altra, formando parole valide. Le diagonali non contano.
   * **Parole incrociate e potenza:** la potenza e il tipo dell'incantesimo dipendono solo dalla **parola principale** (quella scritta con le lettere posate in questo turno). Le parole secondarie formate di lato devono essere valide, ma non aggiungono potenza.

---

## 🌉 Il Collegamento Magico

Il Collegamento Magico è un **ponte di parole** che unisce il tuo Sanctum alla Staffa.

* **Quando è attivo:** hai il Collegamento attivo se esiste una **catena ininterrotta** di parole che si toccano, che parte da **una tua parola nel tuo Sanctum** e arriva a **una lettera sulla Staffa** (riga 5).
* **Di chi sono le parole del ponte:** la parte nella Terra di Mezzo può usare parole di **chiunque**, comprese quelle dell'avversario. Il punto di partenza invece deve essere sempre una tua parola nel tuo Sanctum.
* **Cosa permette:** finché il Collegamento è attivo puoi **invadere il Sanctum avversario** (Grande Falò e Iniezione Diretta). Si controlla all'inizio della tua Fase di Lancio.
* **Entrambi possono averlo:** i due giocatori possono avere il Collegamento attivo nello stesso momento, anche usando le stesse parole centrali.
* **Spezzare il ponte:** se una parola della catena viene distrutta e non c'è un altro percorso, il Collegamento si interrompe e **non puoi più invadere** finché non lo ricostruisci. Le tue parole già posate nel Sanctum nemico restano dove sono.
  Il ponte si può spezzare in due modi:
  * **disintegrando una parola difensiva** che fa parte della catena;
  * **con un Grande Falò** sulla parola di partenza nel Sanctum dell'avversario. Questo però richiede che tu abbia già un Collegamento attivo.

> **Esempio.** A scrive `ROCCIA` in orizzontale in riga 3. Al turno dopo scrive `ONDA` in verticale, dalla `O` di `ROCCIA` fino alla riga 6: la `D` sta sulla Staffa e il Collegamento di A è attivo.
> Se poi B brucia `ROCCIA` con un Falò, `ONDA` resta sulla griglia ma non è più collegata al Sanctum di A: il ponte è spezzato.
> A deve scrivere una nuova parola nel proprio Sanctum che tocchi `ONDA` per riattivarlo.

---

## ⚔️ Il Combattimento

### Tipi di parola

| Tipo | Cosa fa |
|---|---|
| **Attacco** (Fuoco, Gelo, Acqua) | Lancia un incantesimo che infligge danni |
| **Difesa** (Terra / Protezione) | Resta sulla griglia e assorbe gli attacchi |
| **Barriera Universale** | Contrasta i Cataclismi Globali |
| **Neutra** (qualsiasi altra parola valida) | Non attacca né difende. Occupa la griglia, fa da ostacolo e da ponte per raggiungere la Staffa |

Gli elenchi delle parole sono nell'appendice **Lessico Arcano**.

### 1. Potenza dell'incantesimo
La potenza di una parola d'attacco si calcola **come a Scarabeo**: somma dei valori delle lettere, applicando i moltiplicatori LD (lettera doppia) e PD (parola doppia) delle caselle su cui è posata.

### 2. Lancio
* Il giocatore sceglie **una lettera qualsiasi della parola** come **punto di lancio**.
* L'incantesimo parte da quella casella e procede **in linea retta lungo la colonna**, verso il bordo esterno dell'avversario.

### 3. Perdita di potenza lungo il tragitto
* **−1** per ogni casella attraversata. La casella di partenza **non** conta.
* **−1 in più** se nella casella c'è una lettera di una parola **non difensiva** (attacco, neutra, barriera, di chiunque). L'incantesimo poi prosegue.
  *→ una casella con una lettera costa quindi −2 in totale.*
* **Parola Difensiva:** se l'incantesimo entra in una casella occupata da una parola difensiva, perde la potenza **pari alla resistenza della difesa** (vedi sotto).
* Se la potenza arriva a 0 o meno, l'incantesimo si dissolve.

### 4. Impatto
La potenza rimasta quando l'incantesimo oltrepassa il bordo esterno avversario (riga 9 per chi attacca da A, riga 1 per chi attacca da B) viene sottratta ai **Punti Vita** dell'avversario.
❓ *Da confermare: l'attacco colpisce il mago quando supera il bordo esterno?*

### 5. Le Difese e l'Erosione 🧪
* Una parola difensiva ha una **resistenza** iniziale pari al suo punteggio (stesse regole di Scarabeo, moltiplicatori inclusi).
* Quando un incantesimo la colpisce:
  * se la potenza dell'attacco è **minore o uguale** alla resistenza, l'attacco si ferma e la difesa **perde resistenza pari alla potenza dell'attacco**;
  * se la potenza dell'attacco è **maggiore**, la difesa viene **disintegrata** e l'attacco prosegue con la potenza residua (potenza − resistenza).
* Una difesa con resistenza 0 viene disintegrata.
* La resistenza residua si segna con un segnalino accanto alla parola.

> **Esempio.** A lancia `FIAMMA` (13) dalla riga 3, colonna 6. Nella colonna 6 B ha `ALBERO` (12) in riga 8.
> Righe 4-7 attraversate: 13 − 4 = 9. Riga 8, `ALBERO`: 9 ≤ 12, l'attacco si ferma e `ALBERO` scende a 3.
> Al turno successivo basta un attacco che arrivi con potenza 4 per disintegrarlo.

### 6. Matrice degli Elementi
Per ora gli elementi non danno bonus: il combattimento è solo aritmetico. ❓ *Vantaggi elementali da valutare in seguito.*

### 7. Parole Barriera Universali (contro i Cataclismi)
Si lanciano nel proprio Sanctum e servono **solo** contro i Cataclismi Globali (non bloccano gli attacchi diretti):
* **`ECO`:** rimbalza la propria quota di danno ambientale sull'avversario.
* **`MUR`:** assorbe fino a 8 danni ambientali. ❓ *`MUR` è anche una parola difensiva: va scelto un solo uso, o va tolta da una delle due liste.*
* **`VIA`:** devia gli effetti secondari (perdita lettere/malus) fuori dal proprio Sanctum.
* **`PACE`:** disinnesca del tutto l'ultimo cataclisma centrale per tutti. *(Con la tabella dei valori vale 8, non 7.)*
* **`NO` (istantaneo):** giocabile fuori turno come reazione. Dimezza la potenza del cataclisma nemico.

---

## 💥 Distruzione delle parole

Una parola viene distrutta quando:
* è una difesa **disintegrata** da un attacco;
* viene bruciata da un **Grande Falò**, nel Sanctum nemico o nella Terra di Mezzo (vedi sotto);
* nella Terra di Mezzo, la sua **Stabilità** scende a 0 per colpa di una **Tempesta Arcana** (vedi sotto).

Cosa succede alle lettere:
* **Difesa disintegrata o parola crollata per la Tempesta:** le Rune tornano nel Grimorio del proprietario, le Consumabili vanno nel Focolare.
* **Grande Falò:** **tutte** le lettere coinvolte, Rune comprese, vanno nel Focolare.

### Esaurimento delle parole d'attacco 🧪
* Dopo il lancio una parola d'attacco **resta sulla griglia** (fa da ostacolo e da ponte), ma si consuma col tempo.
* Ha una **Stabilità** pari al suo punteggio base. All'inizio di ogni turno del suo proprietario perde **1** di Stabilità (valore da regolare nel prototipo).
* Anche la Tempesta Arcana riduce la Stabilità delle parole d'attacco al centro.
* A 0 la parola **si spegne**: le Rune tornano nel Grimorio del proprietario, le Consumabili vanno nel Focolare.
* Lo spegnimento naturale **non** scatena una Tempesta.

---

## 🌪️ La Tempesta Arcana 🧪

La Terra di Mezzo è un luogo instabile: distruggere parole lì dentro scatena una tempesta.

* **Stabilità:** ogni parola nella Terra di Mezzo ha una **Stabilità** pari al suo punteggio base (somma dei valori delle lettere, senza moltiplicatori). Per le parole difensive la Stabilità coincide con la resistenza: erosione e Tempesta consumano lo stesso valore.
* **Quando scoppia:** ogni volta che in un turno viene **distrutta almeno una parola nella Terra di Mezzo** (Falò o difesa disintegrata), a fine Fase di Lancio scoppia **una** Tempesta.
* **Forza della Tempesta:** si prendono le tessere della parola distrutta, si girano a faccia in giù, si mescolano e se ne **estrae una a caso**. Il suo valore è la forza della Tempesta. Poi tutte le tessere vanno dove devono andare (Focolare o Grimorio del proprietario).
  * Se nello stesso turno sono state distrutte più parole al centro, si mescolano insieme le tessere di tutte e se ne estrae una sola.
  * *Conseguenza tattica:* distruggere una parola fatta solo di vocali provoca una Tempesta lieve. Distruggerne una con `H`, `Q` o `Z` può essere devastante. Le Rune pesanti al centro fanno da **deterrente**.
* **Effetto:** **tutte** le parole nella Terra di Mezzo, di entrambi i giocatori, perdono Stabilità pari alla forza della Tempesta. Quelle che arrivano a 0 crollano.
* **Niente reazione a catena:** le parole crollate per una Tempesta **non** ne scatenano un'altra.
* **I Sanctum sono al riparo:** la Tempesta colpisce solo la Terra di Mezzo.
* **Conseguenze sui ponti:** se una parola che crolla faceva parte di un Collegamento Magico, quel ponte può spezzarsi. Vale anche per il ponte di chi ha scatenato la Tempesta.

> **Esempio.** B brucia con un Falò la parola `ONDA` al centro. Scoppia una Tempesta: si mescolano O, N, D, A e si estrae la `N` (3).
> Tutte le parole della Terra di Mezzo perdono 3 di Stabilità: `MARE` (7) scende a 4, `SOLE` (7) a 4, `IRA` (4) a 1.
> Se B avesse bruciato `ZOLLA` ed estratto la `Z` (10), sarebbero crollate tutte e tre.

*Al tavolo serve un segnalino di Stabilità accanto a ogni parola centrale. Nella versione digitale il conteggio è automatico.*

---

## 🏰 Assedio, Invasione e Sabotaggio

Per attaccare o sabotare l'avversario dentro il suo Sanctum servono due cose: un **Collegamento Magico attivo** e una parola che si **aggancia fisicamente** a una parola nemica già presente nel suo Sanctum.

* **Sabotaggio Purista ("Il Grande Falò"):** il giocatore allunga o incrocia una parola già presente formando una *qualsiasi parola valida del vocabolario italiano* (es. trasforma `GELO` in `GELOSIA`). La parola originale viene annullata e **tutte le lettere coinvolte vengono bruciate** nel Focolare.
  * **Nel Sanctum nemico:** serve il Collegamento Magico attivo.
  * **Nella Terra di Mezzo:** basta che la parola nuova sia posata rispettando la *Posa collegata*. Il Falò al centro scatena però una **Tempesta Arcana**.
* **Iniezione Diretta:** l'invasore si aggancia a una lettera nel Sanctum nemico e scrive lì una nuova parola d'attacco. Il lancio parte quindi molto più vicino al mago avversario e perde molta meno potenza.

---

## ⏳ Flusso del Turno

1. **Fase di Studio:** il giocatore può scartare l'intera mano nel Focolare e pescare 7 nuove lettere (*Alchimia*). In questo caso salta la Fase di Lancio.
2. **Fase di Lancio:** compone una parola sul tabellone: nel proprio Sanctum (ovunque), nella Terra di Mezzo (collegata al proprio ponte) o nel Sanctum nemico (solo con il Collegamento Magico attivo). Se è un attacco, sceglie il punto di lancio e risolve subito il tragitto e i danni. Risolve anche cataclismi e sabotaggi.
3. **Fase di Ristoro:**
   * Riprende nel Grimorio le Rune delle proprie difese disintegrate in questo turno.
   * Pesca dalla Sacca fino a tornare a **7 lettere**. Se ha già 7 lettere o più non pesca.
   * **Rimescolamento:** se la Sacca è vuota, si mescola il Focolare e diventa la nuova Sacca. 🧪

**Condizione di Vittoria:** vince il primo mago che porta a **0 i Punti Vita** dell'avversario.

---

## 📖 Appendice: Lessico Arcano (provvisorio)

Elenchi di partenza, da integrare con le parole del designer. Il numero è il punteggio base (senza moltiplicatori). Tutte le parole sono componibili con le tessere della Sacca.

### 🔥 Fuoco (attacco)
FUOCO 11 · FIAMMA 13 · BRACE 10 · ROGO 8 · LAVA 9 · VAMPA 13 · SOLE 7 · IRA 4 · ARDORE 11 · CENERE 10 · FORNO 11 · MAGMA 12 · FIACCOLA 15 · INCENDIO 16 · FALO 9

### ❄️ Gelo (attacco)
GELO 9 · GHIACCIO 20 · NEVE 9 · BRINA 11 · FREDDO 16 · INVERNO 15 · NORD 10 · GRANDINE 19 · BUFERA 15 · TORMENTA 15 · VALANGA 17 · POLO 9

### 💧 Acqua (attacco)
ACQUA 17 · ONDA 9 · MARE 7 · LAGO 9 · FIUME 12 · PIOGGIA 16 · MAREA 8 · TORRENTE 14 · CASCATA 11 · NEBBIA 14 · DILUVIO 17 · RUGIADA 16 · FONTE 11 · OCEANO 9

### 🪨 Terra / Protezione (difesa)
MUR 8 · SCUD 11 · MURO 9 · MURA 9 · SCUDO 12 · TERRA 8 · ALBERO 12 · ROCCIA 9 · PIETRA 11 · MONTE 10 · ARGINE 12 · BASTIONE 15 · TORRE 8 · ROCCA 8 · CORAZZA 27 · ELMO 8 · BARRIERA 14 · DIGA 10 · QUERCIA 20 · ZOLLA 18 · ARGILLA 15 · BOSCO 10 · RADICE 11

### Note sul lessico
* Le radici della v1 (`SOL`, `FOC`, `VAMP`, `GEL`, `NIV`, `PIST`, `HO`, `PO`, `GEO`, `EST`, `SUD`, `FUM`, `ZOO`…) sono state messe da parte in attesa della lista del designer. ❓ *Valgono come parole a sé, o una parola è elementale se **contiene** una radice (es. `GELATO` contiene `GEL`)?*
* `CRYO` non è componibile: la Sacca non ha la lettera Y.
* `FALO` va scritto senza accento (le tessere non hanno lettere accentate).

---

## ❓ Punti ancora aperti

1. Dove si trova esattamente il bersaglio dell'attacco (vedi *Impatto*). Nel prototipo: oltre il bordo esterno.
3. Le radici elementali: parole a sé o parti di parole più lunghe?
4. Gli effetti precisi dei Cataclismi Globali.
5. La posizione delle caselle LD e PD nella Terra di Mezzo.
6. `MUR`: difesa o barriera contro i cataclismi?
7. I vantaggi elementali (per ora solo aritmetica).
8. Cosa succede se la mano supera 7 lettere quando tornano le Rune (per ora: si gioca normalmente e non si pesca).
9. Il Falò nella Terra di Mezzo brucia anche la parola nuova appena scritta, o solo quella originale?
