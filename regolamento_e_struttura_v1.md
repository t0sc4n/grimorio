# 📜 GRIMORIO
*Il Gioco dei Duelli Linguistico-Arcani*

---

## 📦 Componenti e Setup

* **Il Tabellone Modulare (3 Fogli A4 Orizzontali):**
  1. **Sanctum Giocatore A (Blu):** Griglia 11x3 caselle, Tracciato Punti Vita (da 20 a 0), Timer di Rigenerazione.
  2. **Terra di Mezzo (Grigio/Neutro):** Griglia 11x3 caselle con moltiplicatori (LD, PD) e la **Staffa Magica** lungo l'intera riga centrale.
  3. **Sanctum Giocatore B (Rosso):** Speculare al Sanctum A.
* **La Sacca delle Rune (90 Tessere):**
  * **48 Consumabili Leggere (Valore 1-2):** 12 A, 10 E, 8 I, 8 O, 3 C, 3 R, 2 S, 2 T.
  * **32 Catalizzatori Standard (Valore 3-4):** 5 U, 4 L, 4 M, 4 N, 4 P, 3 D, 3 F, 3 G, 2 B.
  * **10 Grandi Catalizzatori (Valore 4-10):** 3 V (valore 4), 3 H (valore 8), 2 Q (valore 10), 2 Z (valore 10).
* **Indicatori:** 2 segnalini per i Punti Vita (si parte da **20 PV** e **0 Scudi**). Ogni giocatore pesca **7 tessere** iniziali nel proprio Grimorio.

---

## 🗺️ Geometria del Campo di Battaglia

Il campo di battaglia totale forma una griglia continua di **11 colonne x 9 righe**:

1. **I Sanctum Personali (Zone Protette):**
   * Qui componi incantesimi mirati o difensivi.
   * **Legge dei Catalizzatori:** A fine turno, le lettere usate con **valore uguale o superiore a 3 (le Rune)** tornano fisicamente nella mano/grimorio del giocatore. Le lettere con valore 1 o 2 si consumano e vengono scartate nel Focolare.
   * **Ancoraggio:** La prima parola della partita deve toccare una delle due caselle Ancora del proprio Sanctum (Colonna 4 o 8 della prima riga esterna).

2. **La Terra di Mezzo (Zona del Caos):**
   * Griglia centrale comune. Qui **tutte le lettere giocate rimangono fisse** sul tabellone per il resto della partita (anche le Rune).
   * **Cataclismi Globali:** Le magie elementali lanciate al centro scatenano effetti ambientali che colpiscono *entrambi* i giocatori (es. danni ad area, scarto di carte, blocco delle rune nel turno successivo).
   * **La Staffa Magica (Riga Centrale):** Chi riesce a piazzare una parola che tocca fisicamente la Staffa sblocca il teletrasporto arcano, ottenendo il permesso di invadere direttamente il Sanctum avversario nei turni successivi.

---

## ⚔️ Tipologie di Incantesimi e Difese

### 1. Incantesimi Elementali Diretti (Lanciati dal proprio Sanctum)
Colpiscono frontalmente l'avversario (vengono assorbiti dagli Scudi prima di intaccare i PV). Seguono la **Matrice degli Elementi**:
* 🔥 **Fuoco** (`IRA`, `SOL`, `FOC`, `VAMP`) > batte ❄️ **Gelo**
* ❄️ **Gelo** (`GEL`, `NIV`, `NORD`, `CRYO`, `PIST`) > batte 💧 **Acqua**
* 💧 **Acqua** (`HO`, `PO`, `LAGO`, `ACQUA`, `AQUA`) > batte 🪨 **Terra**
* 🪨 **Terra** (`GEO`, `EST`, `SUD`, `FUM`, `ZOO`) > batte 🔥 **Fuoco**

### 2. Parole Barriera Universali (Lanciati nel proprio Sanctum)
Incantesimi neutri efficaci **esclusivamente** per contrastare i Cataclismi Globali provenienti dalla Terra di Mezzo (non bloccano gli attacchi diretti):
* **`ECO` (4 punti):** Rimbalza la propria quota di danno ambientale sull'avversario. Nessun catalizzatore recuperato.
* **`MUR` (8 punti):** Assorbe fino a 8 danni ambientali. Recupera `M` e `U`.
* **`VIA` (6 punti):** Devia gli effetti secondari (perdita carte/malus) fuori dal proprio Sanctum. Recupera `V`.
* **`PACE` (7 punti):** Disinnesca totalmente l'ultimo cataclisma centrale per tutti. Recupera `P`.
* **`NO` (4 punti - Istantaneo):** Giocabile fuori turno come reazione; dimezza la potenza del cataclisma nemico. Recupera `N`.

### 3. Regola della Rigenerazione ("Pace dei Saggi")
Se un giocatore riesce a trascorrere **2 interi turni consecutivi senza subire alcun danno agli scudi** (e senza subire invasioni), la sua aura si stabilizza e **tutti i suoi scudi si ricaricano istantaneamente al massimo (10 punti)**.

---

## 🏰 Assedio, Invasione e Sabotaggio

Per attaccare o sabotare l'avversario dentro il suo Sanctum è necessario **agganciarsi fisicamente** alle sue parole già presenti sulla griglia, utilizzando la **Staffa Magica** centrale come ponte di collegamento.

* **Sabotaggio Purista ("Il Grande Falò"):** L'invasore allunga o incrocia una parola nel Sanctum nemico formando una *qualsiasi parola valida del vocabolario italiano* (es. trasforma `GEO` in `GEOMETRA` o `PO` in `POLLO`). L'incantesimo originale viene annullato e **tutte le lettere coinvolte (incluse le Rune del difensore) vengono bruciate** ed eliminate negli scarti.
* **Iniezione Diretta:** L'invasore si aggancia a una lettera nel Sanctum nemico per scrivere una nuova parola magica elementale direttamente in territorio avversario, infliggendo danni diretti ai PV.

---

## ⏳ Flusso del Turno

1. **Fase di Studio:** Il giocatore può decidere di scartare l'intera mano e pescare 7 nuove lettere (*Alchimia*), rinunciando però alla fase di lancio.
2. **Fase di Lancio:** Compone una parola sul tabellone (nel proprio Sanctum, nella Terra di Mezzo, o invadendo il Sanctum nemico se controlla la Staffa). Risolve immediatamente danni, scudi, cataclismi o sabotaggi.
3. **Fase di Ristoro:**
   * Recupera in mano le eventuali **Rune (valore $\ge 3$)** giocate nel proprio Sanctum (se non sono state bruciate).
   * Scarta nel Focolare le lettere consumabili (valore 1-2).
   * Aggiorna il contatore dei turni senza danni per la Rigenerazione Scudi.
   * Pesca dalla sacca fino a tornare a **7 lettere** nel Grimorio.

**Condizione di Vittoria:** Vince il primo mago che riduce a **0 i Punti Vita** dell'avversario.