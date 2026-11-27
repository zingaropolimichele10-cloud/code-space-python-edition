# CODE SPACE 2.3.2

Base verificata: commit `8a42325` (2.3.1) di `release/2.3.0-integration`. Il catalogo, la validazione, i punteggi e le ricompense provengono da quel commit. La nuova versione conserva la chiave dei progressi della 2.3.1.

## Stelle e disponibilità

Il contatore usa i passi della simulazione in volo normale. La prima stella e le successive richiedono l’intervallo selezionato. Una richiesta manuale può anticipare l’intervallo automatico fino al minimo di 20 secondi dall’inizio del volo o dalla chiusura della missione. Le richieste ravvicinate confluiscono in una sola stella. Una stella già presente resta raccoglibile se l’Host sospende la generazione. L’attrazione comincia dopo 20 secondi e aumenta gradualmente. Il timer riparte in modo conservativo dopo il ripristino del volo. Una riconnessione rilegge limite, cadenza e automatismo correnti. I segnali manuali già ricevuti prima del ricaricamento non generano una seconda stella.

Il limite predefinito è 10. Gli indicatori separano il totale del catalogo e le missioni disponibili. Il limite aumenta senza cambiare stanza, PIN, punteggio o stato di volo. Il pannello docente locale conserva le preferenze sul browser.

## Firebase e pubblicazione

1. Conservare una copia delle regole attualmente pubblicate. Nel progetto Firebase aprire **Realtime Database → Regole**.
2. Pubblicare il file integrale `database.rules.json` della 2.3.2 prima del frontend. Sono aggiunti solo quattro campi opzionali in `rooms/$room/settings`. Restano valide le stanze precedenti. Scrittura, lettura, PIN, autenticazione, punteggi e richieste di aiuto usano i permessi già esistenti.
3. Provare una stanza con Host e studente. Verificare che lo studente non possa scrivere le impostazioni, che il limite salga da 10 a 22 e che dopo un refresh rimangano il PIN e la configurazione.
4. Dopo approvazione e collaudo Firebase, pubblicare il commit approvato su `main` e attendere GitHub Pages. Conservare il riferimento precedente con un tag o branch di riserva. Verificare `release-manifest.json`, aprire una sessione e provare **Aggiorna ora** su una scheda che carica la 2.3.1.

Per ripristinare la 2.3.1, ripubblicare l’albero di `8a42325` con un normale commit su `main`. Le regole 2.3.2 sono retrocompatibili e possono restare attive. Prima di ripristinare anche le regole precedenti, chiudere le stanze 2.3.2 per evitare che i campi aggiuntivi siano rifiutati alla scrittura.

## Richieste di aiuto

Le richieste 2.3.2 usano `helpRequests/$room/$uid`. L’identificativo distingue una richiesta nuova da una conferma ritardata. La telemetria di volo e Python conserva il formato precedente e non scrive in questo percorso. Lo studente può aprire o annullare la propria richiesta, l’Host può risolvere quella aperta. Il browser salva le operazioni in attesa e, quando si riconnette, le applica solo alla richiesta per cui erano state create. L’aiuto non mette in pausa il gioco. Annullamento e risoluzione lasciano il volo, il terminale Python e la pausa globale sotto i rispettivi controlli.

Il nuovo blocco va pubblicato insieme alle altre regole 2.3.2, prima del frontend. Le sessioni con tutti i partecipanti sulla 2.3.1 continuano a usare `metrics/$room/$uid/help`. Per le prove della nuova modalità usa una nuova stanza e aggiorna sia l’Host sia gli studenti.

### Collaudo Firebase reale

1. Salva dalla console una copia delle regole attive. Carica il JSON della 2.3.2 in **Realtime Database → Regole** e pubblica le sole regole.
2. Da una preview HTTPS autorizzata, apri una stanza come Host e collega due studenti con lo stesso PIN, su browser o dispositivi distinti.
3. Chiedi aiuto da entrambi. Verifica la presenza delle due richieste. Annullane una dallo studente e risolvi l’altra dall’Host. Chiedi nuovamente aiuto e ripeti la risoluzione.
4. Ripeti con un terminale Python aperto e una bozza già scritta. Verifica che resti aperto e conservi il codice. Metti in pausa l’intera classe, risolvi una richiesta e verifica che la ripresa avvenga solo con il comando dell’Host.
5. Ricarica uno studente con una richiesta aperta. Ripeti la prova dopo un’interruzione della connessione. Verifica che la richiesta non raddoppi e che lo studente riceva lo stato risolto.

Per ritirare la 2.3.2, ripristina prima il frontend 2.3.1. Le nuove regole possono restare attive. Se devi ripristinare anche le regole, chiudi le stanze 2.3.2 e poi incolla la copia salvata in **Realtime Database → Regole**.
