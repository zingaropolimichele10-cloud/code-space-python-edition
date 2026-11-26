# Architettura

La radice contiene la pagina statica. `css/` gestisce la presentazione e `js/` contiene moduli per responsabilità. `workers/` ospita l’interprete in un contesto separato. Gli asset e le dipendenze runtime vengono serviti insieme alla pagina e i test risiedono in `tests/`.

I moduli game, missions e storage implementano il volo, il Centro di controllo e il salvataggio. Le directory teacher e audio restano riservate alle fasi successive. `laboratorio.html` offre un accesso autonomo all’interprete.

## Interprete

1. `laboratorio.html` e `js/python/editor.mjs` raccolgono lo script e mostrano i risultati come testo. Il Centro missioni usa lo stesso runner.
2. `js/python/runner.mjs` assegna un ID e crea un Worker classico dedicato a ciascuna esecuzione. Una nuova richiesta chiude quella precedente. Sia il runner sia l’editor ignorano risposte obsolete.
3. `workers/python.worker.js` carica Skulpt 1.2.0 e il bundle locale, configura Python 3 ed esegue lo script. L’output usa il callback di Skulpt. `print()` usa internamente il solo modulo `sys`, mentre gli import dal programma studente sono disattivati. L’input interattivo e i builtin di accesso a JavaScript e ai file sono disabilitati.
4. Il Worker estrae al massimo 32 globali scalari pubbliche e restituisce `{ type, value }`. Controlla l’identità del tipo Python prima della conversione. `velocita` e `vite` richiedono interi esatti, `scudo` un booleano e `colore` una stringa. Le altre globali scalari possono includere decimali finiti e `None`. Le stringhe esportate sono limitate a 512 unità UTF-16 e gli interi devono essere rappresentabili esattamente in JavaScript. Il laboratorio mostra i valori. Il Centro li passa alla validazione di missione.
5. Il limite del sorgente è 8.192 unità UTF-16. L’output si ferma a 4.096. Skulpt verifica il tempo durante l’esecuzione con un budget di 400 ms e il thread principale applica una scadenza di 3.000 ms che include caricamento e compilazione. Il Worker viene terminato alla conclusione, in caso di timeout o quando una richiesta viene sostituita. L’invio successivo crea automaticamente un Worker pulito.

Il Worker protegge la reattività della pagina. Un’operazione nativa può usare memoria o CPU tra i controlli di Skulpt e il timer esterno non impone quote di memoria. Il compilatore di Skulpt genera ed esegue JavaScript internamente. Il codice applicativo invoca l’API Python di Skulpt. La pagina statica usa percorsi relativi e una CSP che limita le risorse della pagina stessa. I limiti e i blocchi dell’interprete riducono la superficie esposta e non costituiscono una garanzia di sicurezza assoluta.

## Motore arcade

`js/game/engine.mjs` è una simulazione indipendente dal DOM. Il campo logico misura 960 × 540 e il passo è limitato a 50 ms. Il controller gestisce input, focus, HUD e un solo ciclo requestAnimationFrame. Le transizioni cancellano i tasti attivi. Canvas usa coordinate logiche stabili al ridimensionamento, un fattore di scala massimo di 1,75 e circa 1,35 milioni di pixel. La grafica leggera riduce risoluzione e stelle di sfondo e disattiva le particelle.

Gli asteroidi partono dall’alto e il generatore tiene separate le corsie vicine al bordo superiore. Collisioni circolari, invulnerabilità e cooldown sono aggiornati solo durante il volo. Il checkpoint ripristina tempo, punteggio e capacità della navicella, con vite piene e un settore pulito. La sfida finale dura 22 secondi e usa asteroidi più frequenti e veloci.

## Centro di controllo e progressione

`catalog.mjs` definisce testo, starter, valori attesi e potenziamenti. `validate.mjs` controlla il risultato tipizzato di Skulpt. Per la missione 05 il runner esegue il programma in due Worker separati con `vite = 2` e `vite = 4`, verifica che le vite fornite rimangano invariate a fine esecuzione e richiede `True` e `False` rispettivamente. Gli errori riportano la riga relativa all’editor.

La prima stella Python compare dopo circa 2,5 secondi di volo. Le successive compaiono circa 3 secondi dopo il rientro da una missione completata. Se una stella resta sul campo per 7 secondi, si avvicina alla navicella. La raccolta entra in MISSION e ferma la simulazione nello stesso passo. Il dialogo modale mantiene il focus. Uscire annulla l’eventuale Worker attivo e conserva bozza e indizi per la sessione. Da **Riprendi missione** si recupera la missione saltata. Le stelle restano in ordine e la missione successiva richiede quella precedente.

| Missione | Effetto dopo la validazione |
| --- | --- |
| Turbo spaziale | Velocità logica da 5 a 10, equivalente a 190 → 380 unità di campo al secondo. |
| Riparazione di emergenza | Aumenta la capacità a 5 vite e le ripristina tutte. |
| Scudo energetico | Assorbe un impatto, poi si ricarica dopo 18 secondi di volo. La pausa e le missioni fermano la ricarica. |
| Camuffamento | Cambia il colore di riempimento della navicella a blu. |
| Protezione automatica | Riserva che interviene al primo impatto con meno di 3 vite se lo scudo ordinario è scarico. Si consuma una volta e si ripristina solo a una nuova partenza o al checkpoint. |

Dopo le prime quattro missioni compare **Avvia sfida finale**. Il passaggio alla sfida mantiene vite e potenziamenti e crea un checkpoint da cui si può ripetere l’intera sfida. In LocalStorage restano solo gli ID delle missioni completate. Il riavvio ripristina i relativi potenziamenti. Checkpoint di volo, punteggio, bozza e indizi restano in memoria.
