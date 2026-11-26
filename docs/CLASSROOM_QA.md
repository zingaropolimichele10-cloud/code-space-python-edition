# Verifiche Classroom 2.0.0

## Esiti eseguiti

- Suite completa con Node 24 e Chromium 156. **64 esiti positivi, 0 fallimenti, 0 saltati**. Sono compresi tutti i 59 esiti della 1.1.0 e cinque nuovi esiti Classroom.
- Percorso demo in Chromium, con viewport iPad orizzontale 1180 × 820. Verificati accesso, PIN e QR locali, lobby Host e studente, avvio a conto alla rovescia, pausa, richiesta privata di aiuto, ripresa, missione eseguita con Skulpt, punteggio, boss, termine, podio e vista proiettore senza comandi o aiuto.
- Verificato l’archivio offline 2.0.0 estratto e servito da Python. La prova del Service Worker ha verificato gioco, Laboratorio Python e demo Host con QR dopo lo spegnimento del server di test. Provato l’aggiornamento da un archivio rigenerato dal commit reale 1.1.0, con sostituzione della cache e conservazione del salvataggio.
- Auth Emulator operativo. Provati registrazione e successivo accesso Email/Password con account di prova e due identità Anonymous distinte. La validazione del ruolo Host nel database e il login Google su iPad richiedono un collaudo ulteriore.
- La prova RTDB Emulator Suite è predisposta in tools/firebase-emulator-check.mjs. Il proxy ha negato con HTTP 403 il download del JAR ufficiale. Le regole sono state sottoposte ad audit statico, mentre l’esecuzione delle prove sui permessi RTDB e il collaudo Firebase reale restano da fare.

## Concorrenza e prestazioni

Nel protocollo demo in Node sono state ammesse 50 identità con un Host. Le prove coprono collisione di PIN, nickname doppio, sala piena, riconnessione, rimozione e isolamento fra stanze.

In Chromium, con uno stesso profilo e 1 Host, sono stati ammessi 30 studenti in circa 3,70 s e 50 in circa 7,18 s, tutti con nickname e posto distinti. Queste sono prove di ammissione e presenza della demo, con finestre in background non rallentate dai flag di test. Un primo test con molte schede ha evidenziato letture non aggiornate del salvataggio locale. Il percorso demo ora usa transazioni IndexedDB. L’esecuzione della simulazione e il traffico di 50 dispositivi su Firebase restano da misurare.

Il campione RAF della suite finale ha misurato 59,45 FPS su 108 intervalli a 1180 × 820, p95 16,8 ms. La prova arcade preesistente conserva la simulazione da 108.000 passi. Non sono misure di un iPad fisico.

Un report pubblico di punteggio serializzato come JSON occupa **102 byte** nel campione, prima di percorso, intestazioni e protocollo. Il traffico Firebase non è stato misurato. Il [modello di carico](MULTIPLAYER_ARCHITECTURE.md) documenta le stime per 15, 30 e 50 partecipanti e più turni. Il proxy ha negato l’accesso anche alle pagine ufficiali delle quote, quindi i limiti citati vanno riconfermati in console prima dell’evento.

```sh
CODESPACE_NO_SANDBOX=1 node --test tests/*.test.mjs
CODESPACE_NO_SANDBOX=1 CODESPACE_CLASSROOM_COUNT=50 node tools/classroom-concurrency.mjs
node tools/firebase-emulator-check.mjs --auth-only
```

## Schermate

[Menu](screenshots/v2.0.0/00-menu.png) · [Accesso Host](screenshots/v2.0.0/01-accesso-host.png) · [Creazione](screenshots/v2.0.0/02-creazione.png) · [Accesso studente](screenshots/v2.0.0/03-accesso-studente.png) · [Lobby studente](screenshots/v2.0.0/04-lobby-studente.png) · [Lobby Host](screenshots/v2.0.0/05-lobby-host.png) · [Volo](screenshots/v2.0.0/06-gameplay.png) · [Dashboard](screenshots/v2.0.0/07-dashboard.png) · [Boss](screenshots/v2.0.0/08-boss.png) · [Podio](screenshots/v2.0.0/09-podio.png) · [Proiettore](screenshots/v2.0.0/10-proiettore.png) · [Classifica](screenshots/v2.0.0/11-classifica.png).

## Esito di rilascio

Gioco individuale e demo verificati. La modalità online rimane un candidato. Prima di usarla in aula occorre collaudare le regole runtime, la rete scolastica, accesso Google e QR sull’iPad, gestione delle riconnessioni e carico simultaneo sul progetto reale. Rimane la riserva individuale negli ZIP 1.0.0 e 1.1.0.
