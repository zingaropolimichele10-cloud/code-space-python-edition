# Architettura

La radice contiene la pagina statica. `css/` gestisce la presentazione e `js/` contiene moduli per responsabilità. `workers/` ospita l’interprete in un contesto separato. Gli asset e le dipendenze runtime vengono serviti insieme alla pagina e i test risiedono in `tests/`.

Le directory game, missions, storage, teacher e audio riservano gli spazi previsti per le fasi successive. La fase 01 verifica l’esecuzione Python indipendentemente dal gioco.

## Interprete

1. `index.html` e `js/python/editor.mjs` raccolgono lo script e mostrano i risultati come testo.
2. `js/python/runner.mjs` assegna un ID e crea un Worker classico dedicato a ciascuna esecuzione. Una nuova richiesta chiude quella precedente. Sia il runner sia l’editor ignorano risposte obsolete.
3. `workers/python.worker.js` carica Skulpt 1.2.0 e il bundle locale, configura Python 3 ed esegue lo script. L’output usa il callback di Skulpt. `print()` usa internamente il solo modulo `sys`, mentre gli import dal programma studente sono disattivati. L’input interattivo e i builtin di accesso a JavaScript e ai file sono disabilitati.
4. Il Worker estrae al massimo 32 globali scalari pubbliche e restituisce `{ type, value }`. Controlla l’identità del tipo Python prima della conversione. `velocita` e `vite` richiedono interi esatti, `scudo` un booleano e `colore` una stringa. Le altre globali scalari possono includere decimali finiti e `None`. Le stringhe esportate sono limitate a 512 unità UTF-16 e gli interi devono essere rappresentabili esattamente in JavaScript. Il prototipo esegue e mostra i valori. La valutazione degli obiettivi di missione appartiene alla successiva integrazione.
5. Il limite del sorgente è 8.192 unità UTF-16. L’output si ferma a 4.096. Skulpt verifica il tempo durante l’esecuzione con un budget di 400 ms e il thread principale applica una scadenza di 3.000 ms che include caricamento e compilazione. Il Worker viene terminato alla conclusione, in caso di timeout o quando una richiesta viene sostituita. L’invio successivo crea automaticamente un Worker pulito.

Il Worker protegge la reattività della pagina. Un’operazione nativa può usare memoria o CPU tra i controlli di Skulpt e il timer esterno non impone quote di memoria. Il compilatore di Skulpt genera ed esegue JavaScript internamente. Il codice applicativo invoca l’API Python di Skulpt. La pagina statica usa percorsi relativi e una CSP che limita le risorse della pagina stessa. I limiti e i blocchi dell’interprete riducono la superficie esposta e non costituiscono una garanzia di sicurezza assoluta.

## Motore arcade

`js/game/engine.mjs` è una simulazione indipendente dal DOM. Il campo logico misura 960 × 540 e il passo è limitato a 50 ms. Il controller gestisce input, focus, HUD e un solo ciclo requestAnimationFrame. Le transizioni cancellano i tasti attivi. Canvas usa coordinate logiche stabili al ridimensionamento, un fattore di scala massimo di 1,75 e circa 1,35 milioni di pixel. La grafica leggera riduce risoluzione e stelle di sfondo e disattiva le particelle.

Gli asteroidi partono dall’alto e il generatore tiene separate le corsie vicine al bordo superiore. Collisioni circolari, invulnerabilità e cooldown sono aggiornati solo durante il volo. Il checkpoint ripristina tempo, punteggio e capacità della navicella, con vite piene e un settore pulito. La sfida finale dura 22 secondi e usa asteroidi più frequenti e veloci.
