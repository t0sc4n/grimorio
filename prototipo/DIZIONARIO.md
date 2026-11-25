# Il dizionario di Grimorio

`parole.txt.gz` contiene le **756 099 parole** che Grimorio accetta: forme italiane da 2 a 11 lettere, in maiuscolo, senza accenti, una per riga e in ordine alfabetico. Il gioco lo usa per controllare le parole e per suggerirle nell'esploratore del dizionario.

## Da dove viene

Il dizionario è un'**opera derivata** dal dizionario italiano Hunspell:

- **Estensione linguistica italiana** (Italian Writing Aids), versione 5.0 del 10/02/2016.
  - Copyright © 2010-2016 Andrea Pescetti.
  - Alcune parti © 2001-2008 di altri autori: deriva dal "Dizionario italiano" 2.4 di http://linguistico.sourceforge.net/.
  - Sito: http://extensions.openoffice.org/project/dict-it.
- Ripreso nel pacchetto npm **`dictionary-it` 2.0.0** di Titus Wormer, https://github.com/wooorm/dictionaries/tree/main/dictionaries/it. Grimorio usa i file `index.dic` e `index.aff` di questo pacchetto.

Le note di copyright originali complete e il testo della GNU GPL versione 3 sono in [`LICENSE-dizionario.txt`](LICENSE-dizionario.txt), copiato senza modifiche dal pacchetto.

## Licenza

Come l'originale, **`parole.txt.gz` è distribuito con licenza GNU GPL versione 3**. Puoi copiarlo, modificarlo e ridistribuirlo alle condizioni di quella licenza.

Il resto di Grimorio ha licenze proprie (vedi il [README](../README.md#licenze)): il dizionario è un'opera separata che il gioco carica come dati.

## Che cosa è stato cambiato

Il dizionario Hunspell contiene le parole base e le regole per formare plurali, femminili, coniugazioni e così via. Per trasformarlo in un elenco di parole si usano due script:

**[`strumenti/hunspell_expand.py`](strumenti/hunspell_expand.py)** espande le parole:
1. **Espansione:** applica a ogni parola le regole di suffissi e prefissi del file `.aff`. Se una parola derivata ha a sua volta delle regole, applica anche quelle, ma senza andare oltre questo secondo livello.
2. **Esclusioni:**
   - le voci che iniziano con la maiuscola, cioè nomi propri e sigle;
   - le forme con apostrofo o trattino.
3. **Normalizzazione:** toglie gli accenti (è → E) e porta tutto in maiuscolo.
4. **Filtro:** tiene solo le parole da 2 a 11 lettere composte con le 21 lettere delle tessere del gioco (A B C D E F G H I L M N O P Q R S T U V Z). Restano quindi fuori le parole con J, K, W, X e Y.
5. Ordina le parole ed elimina i doppioni.

**[`strumenti/filtra_dizionario.py`](strumenti/filtra_dizionario.py)** fa un secondo passaggio:
- toglie i **numeri romani** (CC, XIV, MMX…), ma tiene quelli che sono anche parole italiane: CI, DI, LI, MI, VI;
- toglie un piccolo elenco di **sigle e abbreviazioni** rimaste nel dizionario, per esempio AB, HTTP, MQ e TBC.

*Nota (24/11/2026).* Fino a questa data il filtro dei numeri romani escludeva per errore anche circa 50 parole vere composte solo dalle lettere M, D, C, L, X, V, I, per esempio CIVILI, VIDI, VIVI, DIVIDI, CICLI, CLIC, MIMI, CIMICI e IDILLI. Ora sono di nuovo valide.

## Rigenerarlo

```bash
npm pack dictionary-it@2.0.0 && tar xzf dictionary-it-2.0.0.tgz
python prototipo/strumenti/hunspell_expand.py package/index.aff package/index.dic parole_espanse.txt
python prototipo/strumenti/filtra_dizionario.py parole_espanse.txt parole.txt
gzip -9 -n -c parole.txt > prototipo/parole.txt.gz
```

Il sito https://grimorio.tecnogenitori.com serve lo stesso elenco, non compresso, all'indirizzo `/parole.txt`.

---

# Il dizionario inglese

`words-en.txt.gz` contiene le **141 047 parole** delle partite in inglese, nello stesso formato del dizionario italiano: da 2 a 11 lettere, in maiuscolo, una per riga e in ordine alfabetico. Le partite in inglese usano solo questo dizionario, quelle in italiano solo `parole.txt.gz`.

## Da dove viene

Il dizionario inglese deriva da **ENABLE** (*Enhanced North American Benchmark LExicon*), l'elenco di parole usato da molti giochi di parole. I suoi autori lo hanno messo nel **pubblico dominio**, quindi si può usare senza vincoli di licenza.

Grimorio usa il file `enable1.txt` di https://github.com/dolph/dictionary.

## Che cosa è stato cambiato

**[`strumenti/prepara_inglese.py`](strumenti/prepara_inglese.py)**:
- porta le parole in maiuscolo;
- tiene solo quelle da 2 a 11 lettere;
- ordina l'elenco ed elimina i doppioni.

ENABLE non contiene nomi propri, sigle o parole con apostrofo, quindi non serve altro filtro. Le partite in inglese usano tutte le 26 lettere.

## La Sacca inglese

Lo script **[`strumenti/sacca_inglese.js`](strumenti/sacca_inglese.js)** conta quanto è frequente ogni lettera nelle parole da 2 a 7 lettere e propone una Sacca di 90 tessere, con valori da 1 a 10. I numeri finali, in `LINGUE.en` dentro `engine.js`, sono stati ritoccati a mano:
- le vocali sono di più (circa il 40% delle tessere) perché le mani restino giocabili;
- le S sono solo 4: in inglese bastano ad allungare quasi ogni parola al plurale.

## Partite con più dizionari

Una partita può usare insieme il dizionario italiano e quello inglese: una parola vale se è in almeno uno dei due. In questo caso la Sacca è mista. La funzione `sacca()` in `engine.js` la calcola così:
- **Quantità:** fa la media delle quote di ogni lettera nelle Sacche delle lingue scelte e la riporta a 90 tessere, con almeno una tessera per lettera;
- **Valori:** fa la media dei valori della lettera nelle lingue in cui esiste. Per esempio K, che c'è solo in inglese, vale come in inglese.

## Rigenerarlo

```bash
curl -LO https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
python prototipo/strumenti/prepara_inglese.py enable1.txt words-en.txt
gzip -9 -n -c words-en.txt > prototipo/words-en.txt.gz
```
