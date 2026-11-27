# Confronto delle consegne delle 22 missioni

La colonna originale trascrive il campo cosaFare del catalogo fornito. La colonna rivista riporta il campo effettivamente usato dal gioco.

| Missione | Consegna originale | Consegna rivista |
| --- | --- | --- |
| 01 · Riaccendi Aurora | Porta la velocità della navicella a 10. | Nella riga evidenziata, regola il valore di velocita. Premi Esegui e verifica che il propulsore passi da 5 a 10. |
| 02 · Messaggio di bordo | Fai comparire il messaggio Aurora online. | Completa il messaggio dentro print (il comando che mostra il testo). Premi Esegui e controlla che la console mostri esattamente «Aurora online». |
| 03 · Interruttore scudo | Accendi lo scudo della navicella. | Nella riga evidenziata, cambia lo stato di scudo da spento ad acceso. Premi Esegui e controlla che lo scudo si attivi. |
| 04 · Vernice spaziale | Personalizza Aurora scegliendo tra blu, verde e viola. | Nella riga evidenziata, scegli un colore per Aurora tra blu, verde e viola. Premi Esegui e verifica che scafo e scia prendano il colore scelto. |
| 05 · Ricarica energetica | Aumenta di 20 unità la carica della batteria. | Usa la carica della prima riga. Modifica solo la somma nella riga evidenziata, poi premi Esegui: il totale deve salire di 20 in ogni prova. |
| 06 · Riparazione dello scafo | Calcola la protezione rimasta usando i danni rilevati. | Usa il valore di danni fornito dal computer di bordo. Modifica la sottrazione nella riga evidenziata e premi Esegui per ottenere la protezione che rimane dei 100 punti iniziali. |
| 07 · Potenziamento laser | Calcola la potenza del laser: 10 unità per ogni livello. | Usa il livello fornito dal computer di bordo nella moltiplicazione evidenziata. Premi Esegui: la potenza deve valere 10 unità per ogni livello. |
| 08 · Distribuzione delle risorse | Distribuisci equamente tutta l’energia tra i motori. | Usa energia_totale e motori, forniti dal computer di bordo. Completa il calcolo evidenziato, poi premi Esegui e controlla che per_motore contenga la quota intera per un motore. |
| 09 · Segnale extraterrestre | Crea un saluto che includa il nome ricevuto. | Completa il saluto dopo «Ciao », usando il nome fornito dal computer di bordo. Premi Esegui e controlla che il saluto cambi quando cambia il nome. |
| 10 · Rapporto di bordo | Mostra il messaggio Vite: seguito dalle vite rimaste. | Completa la parte dopo «Vite: » nella riga evidenziata, usando il numero di vite del computer di bordo. Premi Esegui e controlla che la console mostri l’etichetta seguita dal numero. |
| 11 · Scudo intelligente | Accendi lo scudo soltanto quando restano meno di 3 vite. | Modifica solo la riga evidenziata sotto if (se). Premi Esegui e verifica che lo scudo si accenda con 2 vite e resti spento con 3 o 4. |
| 12 · Radar automatico | Fai deviare Aurora sotto 50 unità di distanza; altrimenti falla continuare. | Completa le due righe evidenziate che impostano rotta. Premi Esegui e verifica che Aurora devii sotto 50 unità e continui da 50 in su. |
| 13 · Livelli di allarme | Imposta l’allarme: rosso sotto 20, giallo da 20 a 49, verde da 50. | Completa le tre righe evidenziate che impostano allarme. Premi Esegui e controlla i colori: rosso sotto 20, giallo da 20 a 49, verde da 50 in su. |
| 14 · Doppia sicurezza | Attiva lo scudo soltanto con meno di 3 vite e più di 20 unità di energia. | Completa il secondo controllo nella riga evidenziata. Premi Esegui e verifica che lo scudo si accenda solo con meno di 3 vite e più di 20 unità di energia. |
| 15 · Propulsori a catena | Fai inviare esattamente tre impulsi consecutivi. | Modifica nella riga evidenziata il numero di ripetizioni. Premi Esegui e conta tre messaggi «Impulso» nella console. |
| 16 · Generatore automatico | Somma progressivamente le cinque scariche del generatore. | Completa la somma evidenziata usando il valore della scarica di quel giro. Premi Esegui e controlla che la console mostri i totali via via, fino a 15. |
| 17 · Conto alla rovescia | Completa il conto alla rovescia senza saltare numeri. | Modifica la sottrazione evidenziata così che il contatore scenda di uno a ogni giro. Premi Esegui: la console deve mostrare i numeri positivi in ordine, senza salti. |
| 18 · Inventario spaziale | Aggiungi un kit all’inventario e aggiorna il conteggio. | Completa la riga evidenziata che aggiunge un oggetto. Premi Esegui e verifica che in fondo all’inventario compaia un kit e che gli oggetti siano tre. |
| 19 · Scansione inventario | Verifica se nella stiva è presente del carburante. | Completa il controllo evidenziato usando l’inventario di bordo. Premi Esegui e verifica che il registro elenchi gli oggetti e che la spia si accenda solo se trova carburante. |
| 20 · Computer in avaria | Correggi gli errori che impediscono al computer di funzionare. | Premi Esegui per trovare il primo errore nelle righe evidenziate. Correggine uno alla volta e riprova, finché «Sistemi pronti» appare solo quando arriva il segnale di pronto. |
| 21 · Nuovo comando | Utilizza il risultato della funzione per controllare lo scudo. | Modifica l’ultima riga evidenziata perché lo scudo usi il risultato di attiva_scudo (il comando già scritto sopra). Premi Esegui e verifica che lo scudo segua il risultato del comando. |
| 22 · Protocollo Omega | Somma tutti gli impulsi per verificare se il Protocollo Omega può attivarsi. | Completa la somma evidenziata usando gli impulsi forniti dal computer di bordo. Premi Esegui e controlla che Omega si attivi quando il totale raggiunge almeno 10 unità. |

## Verifica di integrità

Il confronto profondo dei 22 oggetti esportati dopo aver escluso cosaFare ha rilevato zero differenze. Il confronto testuale delle due trascrizioni, con le sole righe cosaFare rimosse, ha dato lo stesso risultato. Questo controllo include i tre indizi generati dal file, teoria, messaggi di errore, anteprime e ricompense.

SHA-256 del JSON dei 22 oggetti esportati, escluso cosaFare, uguale per riferimento e revisione. `a3784fc0c63427e914695d40bb238a91fd3537869f97d6d3d5353be0549e5cf9`

Un secondo controllo ha confrontato con la base 2.3.2 gli identificativi e l’ordine, il codice di partenza, le righe modificabili, le variabili fornite, tutti gli scenari, le soluzioni e gli effetti. I valori coincidono. Le domande di comprensione e gli adattamenti delle ricompense già applicati dal gioco sono rimasti invariati.
