# Configurare Firebase per Classroom

Per aggiornare il sito già online segui prima la [sequenza 2.0 → 2.1](RELEASE_2_1.md).

## Console Firebase del progetto `code-space-classroom`

Il frontend contiene la configurazione Web pubblica, con accesso Host Email/Password e accesso studente anonimo. Il Service Worker usa la revisione `2.1.0`, così una scheda che ha la 2.0.0 può installare la configurazione aggiornata. Le credenziali Host si inseriscono solo nel modulo del gioco.

1. Apri [Realtime Database del progetto](https://console.firebase.google.com/project/code-space-classroom/database). Seleziona l’istanza `code-space-classroom-default-rtdb` in `europe-west1`. Apri **Regole / Rules**, sostituisci l’intero editor con il contenuto di [database.rules.json](../database.rules.json), poi premi **Pubblica / Publish**. Il file è integrale e identico a quello indicato da `firebase.json`. Lascia il database in modalità bloccata se l’editor rifiuta le regole.
2. Apri **Authentication → Users** e verifica che la riga dell’account Host abbia l’UID `ixRse6E0cJYSz4BBZAldEq2BTmI2`. Da **Realtime Database → Dati / Data**, se il database è vuoto, usa **⋮ → Importa JSON / Import JSON** alla radice e importa questo intero documento. Se ci sono già dati, aggiungi il figlio `hosts` o, se esiste, modifica solo il figlio identificato dall’UID. Il valore deve avere tipo **booleano**.

   ```json
   {
     "hosts": {
       "ixRse6E0cJYSz4BBZAldEq2BTmI2": true
     }
   }
   ```

   L’unico record iniziale è `/hosts/ixRse6E0cJYSz4BBZAldEq2BTmI2`. Il gioco crea PIN, aule e presenze quando servono. Per revocare l’Host elimina il suo figlio sotto `hosts`.
3. Apri **Authentication → Sign-in method** e verifica **Email/Password** e **Anonymous**. Vai in **Authentication → Settings → Authorized domains → Add domain**, inserisci `zingaropolimichele10-cloud.github.io` e premi **Add**. Usa solo il nome del dominio, senza schema o percorso. Questa configurazione usa Email/Password per l’Host, quindi Google può restare disattivato.
4. In **Impostazioni progetto** conferma **Spark**. In **Realtime Database → Usage** controlla le connessioni durante il collaudo sulla rete scolastica. Verifica anche le soglie Auth per identità anonime create dallo stesso IP. [Prezzi Firebase](https://firebase.google.com/pricing) · [Limiti database](https://firebase.google.com/docs/database/usage/limits) · [Limiti Auth](https://firebase.google.com/docs/auth/limits)

## Collaudo su dispositivi distinti

Dopo il rilascio autorizzato del frontend aggiornato, visita [Classroom Host su GitHub Pages](https://zingaropolimichele10-cloud.github.io/code-space-python-edition/classroom.html?role=host). Se avevi già aperto il sito, conferma l’aggiornamento quando appare o chiudi le schede del gioco e riaprilo.

| Dispositivo | Azione | Risultato atteso |
| --- | --- | --- |
| A, iPad o PC Host | Accedi nell’app con l’account autorizzato e crea una sessione di prova. | Compaiono PIN, QR e comandi Host. |
| B e C, due dispositivi studente | Apri il QR o la pagina Classroom studente, inserisci il PIN e scegli pseudonimi distinti. | Entrambi appaiono nella lobby. Le due sessioni studente rimangono indipendenti. |
| A, B e C | Avvia, metti in pausa e riprendi. Su B esegui una missione Python e chiedi aiuto. Su C ricarica durante il volo. | Le fasi si sincronizzano, la classifica si aggiorna, l’Host vede l’aiuto, C recupera l’iscrizione. |
| D, proiettore o profilo separato | Apri il link proiettore riservato e, separatamente, la pagina di accesso Host con un account Email/Password di prova fuori allowlist. | Il proiettore mostra solo i dati pubblici. L’account di prova riceve il rifiuto e la scheda A mantiene il controllo. |
| A | Termina la sessione, mostra il podio e premi **Elimina dati**. | B e C vedono il termine. In console la sessione e il PIN di prova risultano rimossi. |

Il rifiuto mostrato nell’interfaccia va affiancato alla prova automatica delle regole qui sotto. Prima dell’evento ripeti il collaudo sulla rete del laboratorio. A fine evento rimuovi i dati con **Elimina dati** e rimuovi separatamente dalla console Auth le identità anonime create per l’evento.

## Verifica locale

Serve Java 21 e il CLI Firebase per l’emulatore RTDB. Avvia:

```sh
firebase emulators:exec --only auth,database --project demo-codespace "node tools/firebase-emulator-check.mjs"
```

Servendo il sito su loopback, apri classroom.html?emulator=1&role=host. Crea l’account Host di prova nell’emulatore Auth e imposta hosts/UID al booleano true nell’emulatore RTDB. Nel percorso studente usa classroom.html?emulator=1. Il file emulator/config.mjs è riservato al progetto demo. Usa profili separati per i ruoli.

Il sottocomando `node tools/firebase-emulator-check.mjs --auth-only` verifica l’accesso Email/Password e due identità anonime sull’emulatore Auth quando RTDB è indisponibile.
