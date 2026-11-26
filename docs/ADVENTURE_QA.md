# Rapporto Mission Adventure 2.1.0

## Verifiche di rilascio

Suite finale in Chromium 156 e Node 24 con **84 esiti positivi, 0 fallimenti e 0 saltati**, in circa 64 s.

Dalla radice del repository, con Chromium installato:

```sh
CODESPACE_NO_SANDBOX=1 node --test --test-concurrency=2 tests/*.test.mjs
```

I test delle precedenti versioni sono rimasti nella suite. I controlli browser sulle missioni seguono i nuovi titoli, obiettivi, numeri e chiave del salvataggio. I controlli del prototipo Python sono eseguiti su una pagina generata dal server di test. Il file pubblico e la relativa cache sono stati rimossi. Il gioco offline esegue ancora una missione con un Worker vero.

Per ciascuna delle dodici missioni Chromium ha eseguito il codice iniziale incompleto, la soluzione guida e un’alternativa. Sono stati verificati il risultato, i tre indizi e il pannello contestuale. Le prove includono scudo con 2 e 4 vite, entrambe le rotte e la soglia 5, gli incrementi 3/6/9, due inventari e la carica Omega sotto e sulla soglia. I test browser verificano anche salto, recupero di una bozza, avanzamento a un’altra missione e vittoria con missioni incomplete.

L’aggiornamento offline usa l’archivio rigenerato dal commit pubblico 2.0 `8ac2aaf`. La prova verifica l’installazione della nuova cache, la conservazione del salvataggio 2.0 e l’apertura della difesa migrata come missione 07. L’archivio 2.1 viene estratto e avviato tramite server HTTP Python.

## Lezione e prestazioni

La prova di lezione accelera un orologio virtuale di 40 minuti. Esegue lobby, conto alla rovescia, volo, pausa, ripresa, completamenti simulati, volo con bonus saltate, boss e classifica finale. I sorgenti Python delle dodici missioni sono eseguiti separatamente nel browser. La prova della lezione comprende 25.000 chiamate al motore. I picchi sono 5 proiettili, 7 asteroidi, 7 stelle e 40 particelle, entro i limiti del motore.

Il percorso Classroom in Chromium usa la demo con schede Host, studente e proiettore. La prova comprende PIN, pausa e richiesta di aiuto, missione Python, classifica, boss e podio. L’heartbeat del boss usa il tempo condiviso, per evitare che un client con rendering più lento arrivi alla fine dopo il riepilogo Host.

Il campione RAF individuale a 1360 × 900 ha rilevato 120 intervalli in 2,017 s, mediana e p95 pari a 16,7 ms. Nella demo Classroom a 1180 × 820, 109 intervalli in 1,817 s corrispondono a circa 60 FPS, con p95 pari a 16,7 ms. I campioni del container coprono finestre brevi.

Durante le regressioni il boss poteva terminare tardi su un client rallentato. Il timer condiviso corregge il comportamento e conserva il tempo residuo quando il drone è distrutto in anticipo. Il test del podio ora attende la conferma di ogni rivelazione e il controllo mostra il contatore. L’avvio del browser crea un target se Chromium non ha ancora aperto la scheda predefinita.

Lo ZIP 2.1.0 è stato validato con CRC e SHA-256. Comprende 35 risorse runtime e occupa 398.311 byte.

## Limiti del collaudo

- Il JAR dell’emulatore Realtime Database ha restituito HTTP 403 attraverso il proxy. Sono stati eseguiti l’audit statico delle regole e la prova di Auth Emulator. Le prove RTDB in esecuzione, l’aggiornamento contro Firebase reale e il collaudo multi-dispositivo richiedono staging.
- Safari, iPad fisico, PC del Ferraris e tempi di risoluzione da parte degli studenti restano da provare. La simulazione usa tempo virtuale e il campione browser è stato acquisito nel container.
- Volume e durata di una sessione reale dipendono dalle quote Spark, dalla rete e dal numero di postazioni.

## Schermate

Pannelli a 1366 × 900 e Classroom a 1180 × 820 in Chromium. [Motori](screenshots/v2.1.0/01-motori.png) · [Sistema vitale](screenshots/v2.1.0/02-vita.png) · [Scudo](screenshots/v2.1.0/03-scudo.png) · [Segnale](screenshots/v2.1.0/04-segnale.png) · [Armi](screenshots/v2.1.0/05-armi.png) · [Reattore](screenshots/v2.1.0/06-energia.png) · [Difesa](screenshots/v2.1.0/07-scudo.png) · [Radar](screenshots/v2.1.0/08-radar.png) · [Ciclo](screenshots/v2.1.0/09-ciclo.png) · [Stiva](screenshots/v2.1.0/10-stiva.png) · [Diagnostica](screenshots/v2.1.0/11-diagnostica.png) · [Omega](screenshots/v2.1.0/12-omega.png).

[Dashboard](screenshots/v2.1.0/classroom/07-dashboard.png) · [Boss](screenshots/v2.1.0/classroom/08-boss.png) · [Podio](screenshots/v2.1.0/classroom/09-podio.png) · [Proiettore](screenshots/v2.1.0/classroom/10-proiettore.png).
