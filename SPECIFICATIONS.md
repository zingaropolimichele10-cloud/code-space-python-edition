# Specifiche di prodotto

CODE SPACE – Python Edition è un arcade spaziale didattico per una sessione Ferraris di 35–40 minuti con oltre 15 postazioni. Il gruppo di riferimento è composto da studenti di terza media senza esperienza di programmazione.

Il gioco finale comprende schermata iniziale con trama, tutorial interattivo, navicella controllata con le quattro frecce, asteroidi da evitare e stelle da raccogliere. Vite e punteggio accompagnano la partita. Le stelle sbloccano le missioni Python, ciascuna con editor, tre indizi progressivi, tentativi illimitati ed errori in italiano. Le soluzioni valide applicano potenziamenti alla navicella. Sono previsti checkpoint, salvataggio locale, modalità docente, sfida finale, audio disattivabile, grafica leggera e una soluzione offline verificata.

| Missione | Concetto | Risultato |
| --- | --- | --- |
| 1 | Interi | `velocita = 10` |
| 2 | Interi | `vite = 5` |
| 3 | Booleani | `scudo = True` |
| 4 | Stringhe | `colore = "blu"` |
| 5, facoltativa | Condizioni | Attivare lo scudo quando le vite sono inferiori a 3 |

Direzione visiva con blu notte, nero, azzurro elettrico e oro, HUD futuristico, animazioni fluide, editor leggibile e tono adatto agli adolescenti. I requisiti tecnici permanenti sono in [AGENTS.md](AGENTS.md).

La sfida finale è disponibile nel percorso libero e nel percorso con tutti i potenziamenti principali. Parte da 60 secondi ed è configurabile localmente dal relatore. Il salvataggio contiene solo dati di gioco e preferenze.

La versione 1.0.0 resta la baseline di emergenza. La versione 1.1.0 aggiunge combattimento, settori e un finale con drone. Le risorse statiche vengono distribuite tramite Pages o pacchetto HTTP locale. La cache offline richiede un primo caricamento completo su un’origine sicura.
