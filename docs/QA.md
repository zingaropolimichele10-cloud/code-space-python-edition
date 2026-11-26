# Rapporto QA delle fasi 00 e 01

Verifiche eseguite il 26 novembre 2026 su Linux con Python 3.12.14, Node.js 24.22.3, npm 11.19.1 e Chromium 156.0.8078.79. Skulpt 1.2.0 è stato scaricato dal registro npm in HTTPS. L’hash SHA-512 dell’archivio coincide con quello dichiarato dal registro. Vedi [attribuzioni e integrità](../vendor/skulpt/README.md).

## Riproduzione

```sh
node --test tests/runner.test.mjs
node --test tests/python.browser.test.mjs
```

La suite browser avvia un server locale e Chromium headless, controllandolo con il protocollo DevTools. Per usare un altro binario Chromium imposta `CHROMIUM_BIN`. In un container isolato che impedisce la sandbox di Chromium si può lanciare la sola suite di test con `CODESPACE_NO_SANDBOX=1 node --test tests/*.test.mjs`.

## Verifiche browser obbligatorie

| # | Caso | Atteso | Osservato |
| --- | --- | --- | --- |
| 01 | `velocita = 10` | Intero 10 | Intero 10 |
| 02 | `velocita = 5 * 2` | Intero 10 | Intero 10 |
| 03 | `vite = 5` | Intero 5 | Intero 5 |
| 04 | `scudo = True` | Booleano vero | Booleano vero |
| 05 | `colore = "blu"` | Stringa blu | Stringa blu |
| 06 | `if` con 2 vite | Scudo vero | Scudo vero |
| 07 | `if` con 5 e 3 vite | Scudo falso | Scudo falso in entrambi i casi |
| 08 | Assegnazione incompleta | Errore di sintassi in italiano | `SYNTAX` |
| 09 | Lettura di una variabile ignota | Nome non definito, riga 2 | `NAME`, riga 2 |
| 10 | Rientro mancante, iniziale o dedent incoerente | Errore di rientro in italiano | `INDENTATION` in tutti i casi |
| 11 | Ciclo infinito | Scadenza interna | `INTERPRETER_TIMEOUT` |
| 12 | Esecuzione valida subito dopo il ciclo | Intero 5 | Intero 5 |
| 13 | Esecuzioni consecutive | ID distinti, stato pulito e sintassi Python 3 | ID distinti, stato pulito, divisione 2,5 e sintassi Python 2 rifiutata |
| 14 | Sorgente da 8.193 unità UTF-16 | Rifiuto del sorgente | `SOURCE_LIMIT` |
| 15 | Output oltre 4.096 unità UTF-16 | Output limitato e diagnostica | 4.096 unità e `OUTPUT_LIMIT` |
| 16 | Import espliciti e tramite builtin | Moduli inaccessibili | `IMPORT` anche per `sys` dopo `print()`. `open` e `jseval` risultano indisponibili |
| 17 | Tipi incompatibili e intero troppo grande | Rifiuto senza conversione implicita | `VARIABLE_TYPE` per booleani usati come interi, decimali, liste e tipi omonimi. `VARIABLE_LIMIT` per l’intero fuori intervallo |
| 18 | Interfaccia con ciclo attivo | Rendering, timer e focus reattivi | Il focus torna all’editor mentre il Worker esegue |
| 19 | Pagina in un sottopercorso | Worker e risorse relativi, risultato visibile | Avvio sotto `/code-space-python-edition/`, output 10 e variabile intera visibile |
| 20 | Traffico runtime | Solo risorse del sottosito | Richieste di pagina e Worker osservate solo verso il sottosito |

I tre controlli aggiuntivi sono passati. In Chromium una risposta del Worker reale è stata trattenuta dal test per far scattare deterministicamente il timer esterno. Il runner ha chiamato `terminate()`, ha creato un secondo Worker e ha ottenuto `vite = 5`. In Node sono stati verificati il timeout con un Worker simulato, la ripartenza e il rifiuto delle risposte obsolete. Il runner Node riporta 24 esiti positivi contando anche il test contenitore del browser.

## Diagnosi e correzioni

Il primo avvio completo ha rilevato cinque casi browser in errore. Il blocco indiscriminato del loader impediva `print()`, che in Skulpt usa `sys`. Il loader ora consente solo il modulo interno necessario e blocca separatamente gli import utente, anche quando il modulo è già caricato. Il builtin `__import__` è bloccato esplicitamente e restituisce lo stesso errore delle istruzioni di import. Alcuni rientri errati arrivavano come `SyntaxError`. Il prototipo riconosce i casi verificati dai messaggi e dal contesto della riga. Dopo le correzioni la suite completa è passata. Nel container Chromium ha rifiutato l’avvio con il suo helper SUID. La suite headless è stata quindi eseguita con la variabile prevista per il container isolato.

## Limiti della verifica

Chrome di marca, Edge e Firefox non sono stati eseguiti. Chromium headless ha verificato l’implementazione web nel motore condiviso da Chrome ed Edge. La fase 01 si limitava al laboratorio Python autonomo. Le misurazioni Canvas delle fasi successive sono riportate più sotto. Il test di rete dimostra che il prototipo usa risorse locali sotto HTTP.

# Rapporto QA delle fasi 02 e 03

La suite completa è stata eseguita il 26 novembre 2026 con Node.js 24.22.3 e Chromium 156.0.8078.79. L’esito è **39 passati, 0 falliti, 0 saltati**, inclusi i due test contenitore. Sono stati rieseguiti tutti i 20 scenari Python obbligatori, le prove sul timer esterno e il recupero dagli errori. L’integrità npm dichiarata per Skulpt 1.2.0 corrisponde a quella documentata nel repository.

```sh
# Avvio del gioco e del laboratorio autonomo
python3 -m http.server 8000 --bind 127.0.0.1

# Verifica completa in un ambiente che supporta la sandbox Chromium
node --test tests/*.test.mjs

# Verifica e screenshot nel container isolato di sviluppo
CODESPACE_NO_SANDBOX=1 CODESPACE_SCREENSHOTS=docs/screenshots node --test tests/*.test.mjs
```

| Copertura | Atteso e osservato |
| --- | --- |
| Movimento | Tutte le frecce muovono nella direzione prevista. La diagonale ha la stessa lunghezza del percorso assiale. Due passi dimezzati producono lo stesso spostamento e i bordi fermano la nave. Tutorial interattivo verificato in Chromium. |
| Collisioni e scudi | L’impatto riduce le vite. L’invulnerabilità impedisce il secondo danno ravvicinato. Lo scudo ordinario assorbe un urto e torna disponibile. Sotto 3 vite la riserva assorbe un solo urto successivo. |
| Stelle e transizioni | Una stella normale aggiunge 10 punti, una Python 25 e una sola missione. Durante la missione lo stato e il Canvas restano invariati e la freccia sposta il cursore del testo. |
| Pausa, focus e ripresa | La perdita di focus arresta il volo e svuota i tasti attivi. Alla ripresa il movimento richiede un nuovo comando. La grafica leggera e il ridimensionamento restano sotto il limite di pixel testato. |
| Validazione | Espressioni equivalenti per le quattro missioni principali sono accettate. Valore diverso, tipo sbagliato, sintassi, errore di esecuzione e timeout hanno esiti distinti senza assegnazione di premi. |
| Potenziamenti | Movimento più rapido misurato in Canvas, 5 vite nell’HUD, scudo attivo e vernice blu. La quinta missione accetta `True` con 2 vite e `False` con 4, rifiutando uno scudo sempre attivo. Il motore verifica il consumo effettivo della riserva. |
| Indizi e recupero | Tre indizi appaiono uno alla volta. La chiusura conserva bozza e indizi e annulla una richiesta Python pendente. La missione rimane riapribile con il suo codice. |
| Game over e checkpoint | A zero vite appare l’azione di ripresa. Chromium ha verificato il ripristino a 3 vite nel primo settore e la disponibilità di una missione lasciata in sospeso. |
| Sfida e riavvii | Il finale termina con la vittoria e si può vincere con i soli completamenti 1–4. Tre riavvii consecutivi mantengono le missioni, ripristinano le vite e lasciano al massimo un callback di frame del gioco in coda. Il conteggio sopravvive al ricaricamento. |
| Rete e diagnostica | Tutte le richieste runtime osservate per pagina e Worker rimangono sotto `/code-space-python-edition/`. Nessuna eccezione non gestita osservata da DevTools nei flussi verificati. |

### Prestazioni misurate

- **Simulazione Node con generatore deterministico:** 108.000 passi, equivalenti a 1.800 secondi con passo 1/60. Una prova della suite completa ha impiegato **127,3 ms a parete**, solo per il motore senza Canvas. Picchi di **7 asteroidi, 7 stelle, 20 particelle** rispetto ai limiti **16, 8, 90**. Si sono verificati 43 recuperi dal checkpoint.
- **Chromium headless, viewport 1.360 × 900, grafica standard, volo iniziale e RAF reale:** 121 intervalli in **2.016,6 ms**, circa **60 intervalli/s**, mediana **16,7 ms** e 95º percentile **16,8 ms**. Il campione misura la cadenza dei callback nel container, per circa due secondi. Le prove funzionali usano un orologio controllato e non concorrono a quella misura.

### Diagnosi durante la verifica

La suite browser iniziale non installava il clock controllato prima della navigazione. L’attivazione esplicita del dominio Page del protocollo DevTools ha corretto l’avvio. È stato inoltre necessario indicare il codice virtuale della freccia per esercitare il movimento nativo del cursore e attendere la fine del lampeggio di invulnerabilità prima di campionare il colore della nave. Il primo test unitario combinava un percorso ai bordi con un’ulteriore prova di danno e la traiettoria causava già collisioni. I due scenari ora partono da sessioni separate. La suite finale è passata senza modifiche al Worker Skulpt.

### Schermate

Acquisite in Chromium e controllate visivamente per leggibilità e sovrapposizioni. Il Centro di controllo è stato verificato anche a 430 × 900. L’ispezione ha rilevato un glifo mancante nel collegamento al laboratorio, rimosso prima delle catture finali.

[Menu](screenshots/02-menu.png) · [Tutorial](screenshots/02-tutorial.png) · [Volo](screenshots/02-volo.png) · [Game over](screenshots/02-game-over.png) · [Centro di controllo](screenshots/03-centro-di-controllo.png) · [Centro a larghezza ridotta](screenshots/03-centro-mobile.png) · [Sfida finale](screenshots/03-sfida-finale.png) · [Vittoria](screenshots/03-vittoria.png)

### Limiti residui

I tempi didattici di 15–20 minuti e le prestazioni su oltre 15 PC non sono stati misurati con studenti. Restano da provare i browser ufficiali Chrome, Edge e Firefox sulle postazioni del Ferraris. Le richieste locali sono state verificate sotto HTTP. Distribuzione offline completa, modalità docente e audio restano nelle fasi successive.

# Rapporto QA delle fasi 04 e 05

Verifica del 26 novembre 2026 con Node.js 24.22.3 e Chromium headless 156.0.8078.79. Sono stati rieseguiti tutti i 39 esiti delle fasi precedenti. La verifica del timer finale ora usa la durata di 60 secondi e le asserzioni sul ripristino usano lo schema v2.

```sh
node --test tests/*.test.mjs

# Esecuzione e catture nel container isolato
CODESPACE_NO_SANDBOX=1 CODESPACE_ORIENTATION_SCREENSHOTS=docs/screenshots/fasi-04-05 node --test tests/*.test.mjs
```

| Caso | Esito osservato |
| --- | --- |
| Menu e navigazione | Impostazioni aperte da tastiera, chiusura con Esc, percorso da menu a tutorial e volo, scelta di rigiocare e recupero esercizi dalla vittoria. |
| Tutorial | Provate le direzioni e le tappe di asteroide, stella normale e stella Python. Il Centro di prova accetta codice valido senza assegnare progressi. Ritornare al tutorial consente ancora di scegliere quando decollare. |
| Editor | Selezione e cursore con freccia, copia e incolla nativi con clipboard di Chromium, numerazione su due righe e rientro a quattro spazi. Il gioco resta sospeso durante le missioni. |
| Audio | All’avvio il contesto non viene creato e il mute è attivo. Un comando da tastiera crea il contesto. Disattivazione e volume del 33% sono salvati. I sei eventi sono coperti con nodi Web Audio simulati e si verifica il recupero da errore del contesto. |
| Persistenza | Provati migrazione, tipi e valori fuori intervallo, schema incompatibile, checkpoint e durata della sfida. Chromium ha ricaricato una bozza saltata usando **Continua** e **Riprendi missione**. |
| Storage indisponibile | La pagina avvia il volo sia con accesso bloccato sia con JSON corrotto. La prova JavaScript conferma l’uso della memoria durante la sessione. |
| Modalità docente | Soluzione della missione selezionata, apertura diretta, sblocco del selettore, demo, assenza di asteroidi in demo, livello Intenso, durate errate respinte e sfida configurata a 12 secondi. Annullare il reset preserva i dati e confermarlo li azzera. **Avvia nuova sessione** torna al tutorial. |
| Finale libero | Il comando studente avvia la sfida standard da 60 s con zero missioni. Verificata la vittoria con zero missioni nel finale dimostrativo e con quattro missioni senza la quinta nel finale standard. |
| Layout | Controlli DOM su 1024 × 768, 1280 × 720, 1366 × 768, 1920 × 1080 e 430 × 700. A 1366 e 1920 le catture coprono anche gli stati modali. |
| Browser e rete | Nessuna eccezione JavaScript non gestita nei flussi osservati. Tutte le richieste runtime registrate rimangono sotto il sottopercorso di GitHub Pages. |

### Problemi corretti

La chiusura della prova del tutorial faceva partire il volo. Il Centro ora distingue la prova dalla missione e il motore accetta la chiusura di una missione solo dallo stato MISSION. Il salvataggio su pagehide poteva riscrivere uno stato senza modifiche. Ora scrive solo se esistono aggiornamenti pendenti. La revisione di una cattura a 1920 × 1080 ha evidenziato il Canvas nero durante il ridimensionamento. Il ResizeObserver ora ridisegna subito dopo un cambio di risoluzione e il test verifica che il Canvas resti dipinto a ogni cattura.

### Schermate verificate

| Schermata | 1366 × 768 | 1920 × 1080 |
| --- | --- | --- |
| Menu | [1366](screenshots/fasi-04-05/1366x768-01-menu.png) | [1920](screenshots/fasi-04-05/1920x1080-01-menu.png) |
| Impostazioni | [1366](screenshots/fasi-04-05/1366x768-02-impostazioni.png) | [1920](screenshots/fasi-04-05/1920x1080-02-impostazioni.png) |
| Tutorial | [1366](screenshots/fasi-04-05/1366x768-03-tutorial.png) | [1920](screenshots/fasi-04-05/1920x1080-03-tutorial.png) |
| Centro di controllo | [1366](screenshots/fasi-04-05/1366x768-04-centro.png) | [1920](screenshots/fasi-04-05/1920x1080-04-centro.png) |
| Volo | [1366](screenshots/fasi-04-05/1366x768-05-volo.png) | [1920](screenshots/fasi-04-05/1920x1080-05-volo.png) |
| Modalità docente | [1366](screenshots/fasi-04-05/1366x768-06-docente.png) | [1920](screenshots/fasi-04-05/1920x1080-06-docente.png) |
| Finale | [1366](screenshots/fasi-04-05/1366x768-07-finale.png) | [1920](screenshots/fasi-04-05/1920x1080-07-finale.png) |
| Vittoria | [1366](screenshots/fasi-04-05/1366x768-08-vittoria.png) | [1920](screenshots/fasi-04-05/1920x1080-08-vittoria.png) |

### Limiti residui

Le misure sono del container di sviluppo. La durata didattica con studenti, le prestazioni sulle postazioni del Ferraris, i browser ufficiali Chrome, Edge e Firefox e la distribuzione offline completa richiedono una prova successiva. La generazione audio è stata verificata in Chromium e tramite test sui nodi, senza una prova di ascolto in aula.

### Esito finale e confronto prestazionale

**48 esiti positivi, zero fallimenti e zero test saltati**, inclusi tre contenitori browser. Nove esiti si aggiungono alla suite precedente.

| Misura | Fasi 02–03 | Fasi 04–05 |
| --- | --- | --- |
| Simulazione Node, 108.000 passi, senza Canvas | 127,3 ms a parete | 135,3 ms a parete |
| Picchi di asteroidi, stelle e particelle | 7, 7, 20 | 7, 7, 20 |
| Recuperi dal checkpoint nel simulatore | 43 | 43 |
| Chromium RAF reale, 1360 × 900 | 121 intervalli in 2016,6 ms | 121 intervalli in 2016,6 ms |
| Mediana e 95º percentile RAF | 16,7 / 16,8 ms | 16,7 / 16,7 ms |

La misura Chromium riguarda circa due secondi di volo iniziale con grafica standard. I valori sono campioni del container, senza ripetizioni sufficienti per stimare una differenza prestazionale stabile.

# Revisione e distribuzione 1.0.0

## Revisione del codice

| Priorità | Rilievo | Disposizione |
| --- | --- | --- |
| Importante | Modificare l’editor durante una prova poteva lasciare valida una risposta relativa al testo precedente. | Modificare l’input invalida l’ID logico della prova e termina il Worker in corso. Testata anche la chiusura durante l’esecuzione. |
| Importante | Le operazioni native che producono successioni molto grandi potevano superare l’output massimo prima che intervenisse il watchdog. | Controlli preventivi per moltiplicazione e concatenazione di stringhe, liste e tuple e per le espansioni di interi tramite operatori di potenza e shift. |
| Secondario | Un avvio diretto docente poteva lasciare sospeso l’audio precedentemente abilitato. | I pulsanti di avvio docente possono sbloccare il contesto durante l’interazione. |

È stato controllato il percorso degli eventi e degli errori tra editor, runner, Worker e macchina a stati. Il runner libera timer e Worker anche in caso di sostituzione o errore. Il loop Canvas resta unico e i limiti di oggetti, risoluzione e delta time sono espliciti. Cache, asset e dipendenze sono locali. I file distribuiti di Skulpt, la mappa e la licenza coincidono con i file della distribuzione npm fissata alla versione 1.2.0. La ricerca dei principali formati di chiavi private, token e file di credenziali nel checkout tracciato non ha segnalato corrispondenze. L’identità pubblica degli autori Git appartiene alla cronologia dei commit.

Il budget riduce il rischio di allocazioni nelle operazioni intercettate. Restano superfici di allocazione in built-in, conversioni e collezioni create per altre vie. Il watchdog non limita direttamente la memoria e il Worker non è una sandbox assoluta. Usare programmi didattici e ricaricare la scheda in caso di arresto del renderer.

Il riesame delle cinque missioni ha verificato starter, progressione degli indizi, messaggi italiani e corrispondenza fra valore convalidato e premio. Le prove precedenti coprono soluzioni equivalenti e casi errati per la condizione sulle vite. Il tutorial presenta i comandi e l’esecuzione di prova prima della campagna.

## Catture aggiornate

Controllate a 1366 × 768 per leggibilità e sovrapposizioni. [Menu](screenshots/v1.0.0/01-menu.png) · [Tutorial](screenshots/v1.0.0/02-tutorial.png) · [Volo](screenshots/v1.0.0/03-volo.png) · [Centro](screenshots/v1.0.0/04-centro.png) · [Indizi](screenshots/v1.0.0/05-indizi.png) · [Errore](screenshots/v1.0.0/06-errore.png) · [Premio](screenshots/v1.0.0/07-premio.png) · [Game over](screenshots/v1.0.0/08-game-over.png) · [Docente](screenshots/v1.0.0/09-docente.png) · [Sfida](screenshots/v1.0.0/10-finale.png) · [Vittoria](screenshots/v1.0.0/11-vittoria.png).
