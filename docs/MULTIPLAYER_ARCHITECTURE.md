# Architettura Classroom

GitHub Pages ospita frontend, bundle Firebase Web SDK, generatore QR e Worker Skulpt. Il browser esegue il gioco originale in un iframe di stessa origine, con progressi Classroom separati dal salvataggio individuale. I messaggi tra iframe e pagina passano solo da parent e contentWindow di stessa origine. Nessuna coordinata, oggetto del Canvas o sorgente Python viene trasmesso.

RTDB contiene un indice esatto PIN, un controllo per stanza con sequenza e scadenza, posti, membri, presenza, classifica e dettagli privati. L’offset del server stabilisce il conto alla rovescia di cinque secondi. Gli aggiornamenti duplicati non fanno ripartire il gioco. Disconnessione e mancanza di heartbeat congelano l’iframe. Alla ripresa si rilegge il controllo remoto. Le schede perdono la presenza grazie a onDisconnect. Una scheda ricaricata recupera identità Auth, membership e progressi accettati dal server. Il volo locale riparte dal settore iniziale, dato che posizione e frame non vengono sincronizzati.

In pausa il Canvas rimane fermo. Il Centro di controllo permette la lettura. Le esecuzioni già pendenti vengono annullate e possono essere ripetute alla ripresa. Il boss del gruppo usa lo stesso conto alla rovescia e una simulazione locale. La durata rimanente viene comunicata all’ingresso. L’Host connesso riapre il volo al termine della finestra del boss per recuperare le missioni. La fine blocca il punteggio e conserva la classifica per il podio finché il titolare non la elimina.

Una missione principale vale 1.000, la facoltativa 500, il boss 500 e il punteggio arcade viene limitato a 1.000. I cinque completamenti sono bit distinti. Gli indizi, gli errori e il game over non sottraggono punti. Pari merito con la stessa posizione, poi ordine alfabetico solo per la visualizzazione. L’obiettivo impostabile dall’Host determina quante missioni rappresentano il traguardo didattico. Il boss resta accessibile a tutti.

### Traffico

Il client pubblica solo variazioni, con un intervallo minimo operativo di circa 1,1 s. La stima include il fan-out a partecipanti, Host e proiettore. Si assume un evento di 220 byte trasferiti a ogni destinatario. Il caso intenso assume 2.182 report in 40 min per giocatore. Il caso medio indicativo usa 120 report per giocatore. Sono esclusi caricamenti degli asset e riconnessioni.

| Giocatori | 40 min, 120 report a testa | 40 min, modifiche continue |
| --- | ---: | ---: |
| 15 | 6,7 MB | 122,4 MB |
| 30 | 25,3 MB | 460,8 MB |
| 50 | 68,6 MB | 1.248,1 MB |

Per tre gruppi consecutivi moltiplica per tre. Con 30 giocatori sono circa 76 MB indicativi o 1,38 GB nell’ipotesi intensa. Le cifre sono stime e non misure Firebase. Controlla Usage dopo il collaudo. I listener pubblici usano eventi per riga, mentre i dettagli privati vengono osservati solo dalla dashboard Host.

Nella demo, schede dello stesso profilo condividono un archivio IndexedDB con transazioni e notifiche BroadcastChannel. Con IndexedDB indisponibile restano operazioni in memoria della singola scheda. Se l’Host online perde rete, i client collegati seguono l’ultimo comando accettato fino a fine timer. L’Host può rientrare con la stessa identità e riprendere il controllo.

## Protocollo Adventure 2.1

Il biglietto PIN e le impostazioni della stanza contengono il marcatore immutabile `adventure: true`. Conseguentemente iscrizioni, punteggi e metriche della stessa stanza richiedono il marcatore. Le stanze 2.0 continuano a usare registri privi del campo. Le letture di lobby, classifica e proiettore mantengono i controlli per stanza, ruolo e scadenza.

La maschera Adventure ha 12 bit con limite 4095 e vincolo monotono per ogni bit. Classifica e podio calcolano il punteggio a partire dalla maschera, con un tetto di 1.000 punti arcade. La dashboard riceve a parte il contatore degli errori e le altre metriche didattiche. L’heartbeat al frame allinea il timer del boss all’orologio della stanza anche quando il rendering rallenta. [Procedura di pubblicazione](RELEASE_2_1.md)
