# Pubblicazione 2.1.0

La 2.0 resta il rilascio di riserva. Il branch 2.1 richiede le nuove regole Firebase prima di aprire stanze Adventure.

1. Conserva una copia delle regole attive e dell’archivio 2.0. Fai la prova su un progetto di staging Spark con gli stessi provider Auth, un Host di prova e il dominio della preview autorizzato.
2. In Firebase Console apri **Realtime Database → Rules**. Sostituisci l’intero contenuto con [database.rules.json](../database.rules.json). Controlla la compilazione e pubblica in staging. In locale puoi esercitare i due formati con Firebase Emulator Suite, usando i comandi qui sotto.
3. Prova il frontend 2.0 contro queste regole. Crea una stanza, entra con PIN, esegui una missione, apri classifica e proiettore. Prova poi 2.1 in una nuova stanza, con la missione 12, un accesso esterno negato, una richiesta di aiuto e il podio. Conferma il rifiuto di scritture legacy nelle stanze 2.1.
4. Dopo il collaudo, pubblica le stesse regole sul progetto di produzione. Le stanze già aperte con 2.0 conservano formato, limiti e calcolo del punteggio. Puoi far terminare loro il turno mentre il frontend pubblico è ancora 2.0.
5. Porta il branch 2.1 su `main` dopo autorizzazione e verifica il deployment GitHub Pages. Su tutte le postazioni chiudi le schede 2.0, riapri il gioco e verifica che `release-manifest.json` riporti `2.1.0`. Crea un nuovo PIN con l’Host 2.1. Gli ingressi 2.1 richiedono una stanza 2.1 e i client 2.0 non possono iscriversi in una stanza 2.1. Il link proiettore va rigenerato per la nuova stanza.
6. Per tornare a 2.0, termina ed elimina prima le stanze 2.1, lascia installate le regole compatibili e ripristina il frontend 2.0 con una revisione cache nuova. I salvataggi 2.0 restano conservati localmente.

```sh
firebase emulators:exec --only auth,database --project demo-codespace \
  'node tools/firebase-emulator-check.mjs && node tools/firebase-emulator-check.mjs --adventure'
```

Il frontend usa la stessa istanza e lo stesso elenco degli Host. Le stanze 2.1 dichiarano `adventure: true` nel biglietto PIN e nelle impostazioni. Per una stanza 2.0 il campo resta assente. L’iscrizione atomica lega nickname, posto e iscrizione anche nel nuovo formato. Classifica e metriche restano su cammini distinti.

La migrazione locale conserva le missioni storiche 01–04 e porta lo scudo automatico dalla 05 alla 07. La nuova 05 rimane da completare. Mantiene record, preferenze, checkpoint e bozze compatibili. Le bozze 02 e 04 restano nel vecchio salvataggio perché le nuove missioni richiedono variabili diverse.
