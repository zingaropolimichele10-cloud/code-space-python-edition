# Riprendere il volo e gestire tre lezioni

## Partita individuale

Il gioco salva nelle fasi significative e ogni cinque secondi di volo. Alla riapertura ripristina in pausa una partita interrotta, oppure riapre il terminale Python con la bozza. Dal menu puoi sempre scegliere **Recupera partita**. Salvataggi e backup sono specifici di indirizzo, browser e profilo.

Il checkpoint conserva vite, punteggio, settore, stato delle difese e, durante il boss, tempo e resistenza residui. Asteroidi, stelle e proiettili vengono rigenerati. Il sistema conserva tre copie rotate con controllo d’integrità e usa la più recente valida se il salvataggio principale si danneggia. I potenziamenti sono derivati dalle missioni completate. **Impostazioni** offre importazione ed esportazione JSON e chiede conferma prima della sostituzione. Il reset resta nella modalità docente e richiede conferma.

## Studente Classroom

Riapri lo stesso indirizzo con lo stesso profilo. Se l’identità e l’iscrizione sono ancora valide, il gioco recupera la stessa stanza. **Recupera partita** ripete la verifica senza creare un nuovo studente. Le bozze e gli invii in attesa sono separati per UID e stanza. Durante la disconnessione il gioco si sospende. Alla riconnessione applica fase e timer dell’Host, confronta i dati confermati e reinvia i progressi pendenti. Per punteggi e missioni usa il massimo e l’unione dei bit, quindi uno stesso aggiornamento non viene sommato.

Il recupero richiede un account anonimo Firebase ancora valido. I backup individuali e i backup Host non possono ricreare identità o scrivere nella classifica. I dati della demo con identità per scheda sono adatti alle prove locali.

## Host e archivio

1. Accedi con il tuo account Host. Scegli **Gruppo 1**, **Gruppo 2** o **Gruppo 3** nel campo **Lezione** e crea una stanza nuova per ogni turno. Mostra il nuovo PIN.
2. Se devi riaprire il browser usa lo stesso profilo e account. **Recupera sessione** riapre la stanza quando l’accesso Firebase è ancora autorizzato. La stanza sincronizza PIN, fase, timer, iscritti e classifica da Firebase.
3. Al termine premi **Termina sessione**. Da **Lezioni e archivio** puoi esportare il backup JSON di tutte le sessioni e il CSV dei risultati. Per esportare il CSV di una singola lezione, selezionala nel menu.
4. Usa **Nuova sessione** per il turno successivo. Le stanze e i risultati precedenti restano disponibili. **Elimina dati** rimuove la stanza online dopo conferma. **Elimina dall’archivio** rimuove separatamente una voce locale, sempre con conferma.
5. Importare un backup permette di esportarne i risultati in sola lettura e di selezionare eventuali stanze ancora esistenti. Per recuperare una stanza l’app controlla proprietario, scadenza e permessi sul database. I backup contengono impostazioni e risultati con pseudonimi. Conserva i file in una cartella del docente.

Le regole e la configurazione Firebase sono quelle della 2.1.2. Le prove Classroom eseguite in questo rilascio usano la demo, che conserva separatamente le sessioni locali. Il collaudo Firebase tra dispositivi e Safari iPad resta da fare.
