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
