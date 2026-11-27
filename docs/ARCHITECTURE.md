# Architettura

La radice contiene la pagina statica. `css/` gestisce la presentazione e `js/` contiene moduli per responsabilità. `workers/` ospita l’interprete in un contesto separato. Gli asset e le dipendenze runtime vengono serviti insieme alla pagina e i test risiedono in `tests/`.

I moduli game, missions, storage, teacher e audio implementano il volo, il Centro di controllo, il salvataggio, i comandi docente e gli effetti sonori. `laboratorio.html` offre un accesso autonomo all’interprete.

## Interprete

1. `laboratorio.html` e `js/python/editor.mjs` raccolgono lo script e mostrano i risultati come testo. Il Centro missioni usa lo stesso runner.
2. `js/python/runner.mjs` assegna un ID e crea un Worker classico dedicato a ciascuna esecuzione. Una nuova richiesta chiude quella precedente. Sia il runner sia l’editor ignorano risposte obsolete.
3. `workers/python.worker.js` carica Skulpt 1.2.0 e il bundle locale, configura Python 3 ed esegue lo script. L’output usa il callback di Skulpt. `print()` usa internamente il solo modulo `sys`, mentre gli import dal programma studente sono disattivati. L’input interattivo e i builtin di accesso a JavaScript e ai file sono disabilitati.
4. Il Worker estrae al massimo 32 globali scalari pubbliche e restituisce `{ type, value }`. Controlla l’identità del tipo Python prima della conversione. `velocita` e `vite` richiedono interi esatti, `scudo` un booleano e `colore` una stringa. Le altre globali scalari possono includere decimali finiti e `None`. Le stringhe esportate sono limitate a 512 unità UTF-16 e gli interi devono essere rappresentabili esattamente in JavaScript. Il laboratorio mostra i valori. Il Centro li passa alla validazione di missione.
5. Il limite del sorgente è 8.192 unità UTF-16. L’output si ferma a 4.096. Skulpt verifica il tempo durante l’esecuzione con un budget di 400 ms e il thread principale applica una scadenza di 3.000 ms che include caricamento e compilazione. Il Worker viene terminato alla conclusione, in caso di timeout o quando una richiesta viene sostituita. L’invio successivo crea automaticamente un Worker pulito.

Il Worker protegge la reattività della pagina. Un’operazione nativa può usare memoria o CPU tra i controlli di Skulpt e il timer esterno non impone quote di memoria. Il compilatore di Skulpt genera ed esegue JavaScript internamente. Il codice applicativo invoca l’API Python di Skulpt. La pagina statica usa percorsi relativi e una CSP che limita le risorse della pagina stessa. I limiti e i blocchi dell’interprete riducono la superficie esposta e non costituiscono una garanzia di sicurezza assoluta.

## Motore arcade

`js/game/engine.mjs` è una simulazione indipendente dal DOM. Il campo logico misura 960 × 540 e il passo è limitato a 50 ms. Il controller gestisce input, focus, HUD e un solo ciclo requestAnimationFrame. Le transizioni cancellano i tasti attivi. Canvas usa coordinate logiche stabili al ridimensionamento, un fattore di scala massimo di 1,75 e circa 1,35 milioni di pixel. La grafica leggera riduce risoluzione e stelle di sfondo e disattiva le particelle.

Gli asteroidi partono dall’alto e il generatore tiene separate le corsie vicine al bordo superiore. Collisioni circolari, invulnerabilità e cooldown sono aggiornati solo durante il volo. Il checkpoint ripristina tempo, punteggio e capacità della navicella, con vite piene e un settore pulito. La sfida finale dura 60 secondi per impostazione predefinita e aumenta progressivamente densità e velocità degli asteroidi.

## Centro di controllo e progressione

`catalog.mjs` definisce testo, starter, valori attesi e potenziamenti. `validate.mjs` controlla il risultato tipizzato di Skulpt. Per la missione 05 il runner esegue il programma in due Worker separati con `vite = 2` e `vite = 4`, verifica che le vite fornite rimangano invariate a fine esecuzione e richiede `True` e `False` rispettivamente. Gli errori riportano la riga relativa all’editor.

La prima stella Python compare dopo circa 2,5 secondi di volo. Le successive compaiono circa 3 secondi dopo il rientro da una missione completata. Se una stella resta sul campo per 7 secondi, si avvicina alla navicella. La raccolta entra in MISSION e ferma la simulazione nello stesso passo. Il dialogo modale mantiene il focus. Uscire annulla l’eventuale Worker attivo e conserva la bozza localmente e gli indizi consultati per la sessione. Da **Riprendi missione** si recupera la missione saltata. Le stelle restano in ordine e la missione successiva richiede quella precedente.

| Missione | Effetto dopo la validazione |
| --- | --- |
| Turbo spaziale | Velocità logica da 5 a 10, equivalente a 190 → 380 unità di campo al secondo. |
| Riparazione di emergenza | Aumenta la capacità a 5 vite e le ripristina tutte. |
| Scudo energetico | Assorbe un impatto, poi si ricarica dopo 18 secondi di volo. La pausa e le missioni fermano la ricarica. |
| Camuffamento | Cambia il colore di riempimento della navicella a blu. |
| Protezione automatica | Riserva che interviene al primo impatto con meno di 3 vite se lo scudo ordinario è scarico. Si consuma una volta e si ripristina solo a una nuova partenza o al checkpoint. |

La sfida finale è accessibile in volo lungo entrambi i percorsi. Mantiene vita, scudo, riserva e velocità e crea un checkpoint per ripetere il settore. La quinta missione resta un esercizio facoltativo. La vittoria riporta punteggio, record, missioni, premi e concetti praticati.

## Interfaccia, accessibilità e audio

Aurora è un SVG originale e il campo di volo usa primitive Canvas, pianeta e stelle a strati. La grafica leggera disattiva pianeta e particelle, riduce il campo stellare e limita la risoluzione. Il movimento ridotto del sistema elimina il parallasse, il lampeggio e le animazioni decorative. I colori di stato sono accompagnati da etichette testuali.

Il tutorial usa lo stesso campo di volo e apre il Centro in modalità prova. In prova Skulpt esegue il codice senza modificare missioni, premi o bozze della campagna. L’editor usa una textarea nativa con numeri di riga sincronizzati e un comando di rientro a quattro spazi. Tab mantiene la navigazione nativa. L’evidenziazione sintattica è rimasta fuori per preservare l’editor nativo e la sua leggibilità.

Web Audio sintetizza brevi sequenze al verificarsi degli eventi di gioco. Il contesto viene creato solo a seguito di un’interazione per attivare l’audio o iniziare una sessione con audio già abilitato. Un gain comune consente mute immediato e volume contenuto. Gli oscillatori terminano e vengono scollegati dopo ogni effetto.

## Salvataggio e modalità docente

Lo schema `code-space:progress:v2` valida stato, record, preferenze, bozze e checkpoint, importando i vecchi ID e le preferenze audio quando lo schema v2 è assente. Gli ID dei potenziamenti sono derivati dalle missioni completate. Il checkpoint salva il settore, il tempo, il punteggio e la durata di una sfida già avviata. Al ripristino il settore viene rigenerato con vite piene e i premi ottenuti. Il volume e le bozze vengono scritti con un breve ritardo, con una scrittura finale su pagehide. Se LocalStorage è bloccato, i cambiamenti restano utilizzabili in memoria.

La modalità docente è locale e ad accesso libero. Permette di scegliere o sbloccare le missioni, mostrare soluzioni e avviare la sfida. La demo sospende gli asteroidi preservando stelle ed esercizi. Difficoltà, demo, sblocco e asteroidi sono impostazioni temporanee. La durata già associata a un checkpoint finale segue quel checkpoint. Una nuova sessione richiede conferma e azzera record, missioni, bozze e checkpoint, conservando le preferenze audio e grafiche.

## Distribuzione e cache

Le risorse restano relative allo scope del sito. Il manifest elenca i file del pacchetto runtime ed è condiviso dal Service Worker e dal generatore ZIP. L’installazione raccoglie tutte le risorse nella cache della versione. L’attivazione avviene dopo la chiusura dei client della versione precedente e rimuove solo le cache obsolete dello stesso scope. Il sito resta accessibile via HTTP locale anche senza Service Worker.
