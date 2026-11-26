# Specifiche di prodotto

CODE SPACE – Python Edition è un arcade spaziale didattico per una sessione Ferraris di 35–40 minuti con oltre 15 postazioni. Il gruppo di riferimento è composto da studenti di terza media senza esperienza di programmazione.

Il gioco finale comprende schermata iniziale con trama, tutorial interattivo, navicella controllata con le quattro frecce, asteroidi da evitare e stelle da raccogliere. Vite e punteggio accompagnano la partita. Le stelle sbloccano le missioni Python, ciascuna con editor, tre indizi progressivi, tentativi illimitati ed errori in italiano. Le soluzioni valide applicano potenziamenti alla navicella. Sono previsti checkpoint, salvataggio locale, modalità docente, sfida finale, audio disattivabile, grafica leggera e una soluzione offline verificata.

| Missione | Concetto | Sistema |
| --- | --- | --- |
| 01–03 | Variabili, somma e booleani | Motori, sistema vitale e scudo |
| 04–05 | Concatenazione ed espressioni | Coordinate NORD-7 e cannoni |
| 06–08 | Budget e condizioni | Reattore, scudo di riserva, navigatore |
| 09–12 | Cicli, liste e debugging | Ricarica, magnete, computer di bordo e Omega |

Le missioni 06–12 sono facoltative. Il [catalogo](js/missions/catalog.mjs) contiene gli obiettivi, gli indizi e i premi. La sfida contro il drone è sempre raggiungibile.

Direzione visiva con blu notte, nero, azzurro elettrico e oro, HUD futuristico, animazioni fluide, editor leggibile e tono adatto agli adolescenti. I requisiti tecnici permanenti sono in [AGENTS.md](AGENTS.md).

La sfida finale è disponibile nel percorso libero e nel percorso con tutti i potenziamenti principali. Parte da 60 secondi ed è configurabile localmente dal relatore. Il salvataggio contiene solo dati di gioco e preferenze.

La versione 1.0.0 resta la baseline di emergenza. La versione 1.1.0 aggiunge combattimento, settori e un finale con drone. Le risorse statiche vengono distribuite tramite Pages o pacchetto HTTP locale. La cache offline richiede un primo caricamento completo su un’origine sicura.

La modalità Classroom 2.0.0 aggiunge una sessione coordinata da Host. La simulazione e Python restano locali. Gli studenti accedono con PIN e pseudonimo, mentre le funzioni del responsabile richiedono autorizzazione Firebase. La demo è locale e la modalità individuale resta disponibile senza rete.
