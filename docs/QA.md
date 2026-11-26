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

Chrome di marca, Edge e Firefox non sono stati eseguiti. Chromium headless ha verificato l’implementazione web nel motore condiviso da Chrome ed Edge. La prova su oltre 15 postazioni, il profilo prestazionale Canvas e la distribuzione offline completa appartengono alla validazione del gioco finale. Il test di rete dimostra che il prototipo usa risorse locali sotto HTTP.
