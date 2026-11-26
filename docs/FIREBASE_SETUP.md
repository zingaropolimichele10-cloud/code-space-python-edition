# Configurare Firebase per Classroom

1. Apri la console Firebase con l’account del responsabile. Su iPad usa Safari in orizzontale e, se necessario, seleziona **Richiedi sito desktop**. Crea un progetto senza Analytics. Verifica il piano **Spark** e mantienilo gratuito. Interrompi la configurazione se richiede Blaze o una carta.
2. Da **Impostazioni progetto → Le tue app**, registra un’app **Web**. Conserva l’oggetto di configurazione Web. GitHub Pages continuerà a servire il sito.
3. Apri **Authentication → Sign-in method** e abilita **Anonymous** e **Google**. Per Google, imposta l’email di assistenza richiesta dalla console. In **Settings → Authorized domains** aggiungi l’hostname di GitHub Pages, per esempio zingaropolimichele10-cloud.github.io, senza schema o percorso.
4. Apri **Realtime Database → Create Database**, scegli la regione opportuna e seleziona **Locked mode**. Copia l’URL del database nella configurazione Web. In **Rules** incolla e pubblica database.rules.json. Verifica che l’editor accetti le regole prima di distribuire il frontend.
5. Crea l’accesso Host. Nella pagina Classroom premi **Accedi come Host con Google**. Alla prima prova il login crea l’identità, mentre l’accesso alla sessione è negato finché l’UID non è autorizzato. In **Authentication → Users** copia l’UID del responsabile. In **Realtime Database → Data** aggiungi sotto hosts una chiave uguale a quell’UID con valore booleano true. Il testo "true" non è equivalente.
6. Copia js/classroom/config.example.mjs in js/classroom/config.mjs e sostituisci i valori con quelli dell’app Web. Servono apiKey, authDomain, projectId, appId e databaseURL. La configurazione Web è pubblica. Password, token, chiavi amministrative e file service account restano esclusi dal repository. Se 2.0.0 è già servita dalla cache, cambia versione nel manifest e nel Service Worker prima di distribuire la configurazione.
7. Per iPad che blocca l’accesso Google via popup, consenti il popup per il sito. In alternativa abilita **Email/Password**, crea nella console l’account del solo responsabile, autorizzane l’UID e imposta hostEmail a true nel modulo. Inserisci la password direttamente nel modulo di login del browser. Gli studenti usano sempre Anonymous.
8. Dopo la pubblicazione autorizzata, apri la pagina Host e uno studente su profili separati. Crea il PIN, avvia il decollo e verifica pausa, assistenza, classifica e uscita. Prova il QR con l’iPad e il proiettore con il collegamento riservato generato dall’Host. Prima dell’evento, prova anche le regole con gli emulatori e verifica i volumi in **Usage**.
9. Controlla i limiti correnti nelle due pagine ufficiali. La stima assume 100 connessioni RTDB simultanee, 1 GB di storage e 10 GB/mese di download Spark, valori da riconfermare. Due gruppi contemporanei da 50, oltre a Host e proiettori, oltrepassano 100 connessioni. Controlla anche le soglie Auth per nuove identità dallo stesso IP. [Prezzi Firebase](https://firebase.google.com/pricing) · [Limiti database](https://firebase.google.com/docs/database/usage/limits) · [Limiti Auth](https://firebase.google.com/docs/auth/limits)
10. A fine evento termina la sessione e premi **Elimina dati**. In console verifica che i nodi siano spariti. Per le aule archiviate prima della pulizia, rimuovi per ID le raccolte rooms, members, names, seats, scores, presence metrics, projectors e viewAccess, e il PIN corrispondente. Elimina separatamente gli utenti anonimi dell’evento dalla console Auth. Per revocare l’Host elimina il suo UID sotto hosts.

Per completare il collegamento sono utili la configurazione pubblica dell’app Web, l’URL RTDB e la conferma dell’hostname autorizzato e dell’UID abilitato. Condividi solo configurazione pubblica, mai password o token.

## Verifica locale

Serve Java 21 e il CLI Firebase per l’emulatore RTDB. Avvia:

```sh
firebase emulators:start --only auth,database --project demo-codespace
node tools/firebase-emulator-check.mjs
```

Servendo il sito su loopback, apri classroom.html?emulator=1&role=host. Crea l’account Host di prova nell’emulatore Auth e imposta hosts/UID al booleano true nell’emulatore RTDB. Nel percorso studente usa classroom.html?emulator=1. Il file emulator/config.mjs è riservato al progetto demo. Usa profili separati per i ruoli.

Il sottocomando `node tools/firebase-emulator-check.mjs --auth-only` verifica l’accesso Email/Password e due identità anonime sull’emulatore Auth quando RTDB è indisponibile.
