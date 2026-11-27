# Checklist di laboratorio

## Controlli automatizzati disponibili

- [ ] Consultare il [rapporto QA](QA.md) e verificare la suite completa sul commit da distribuire.
- [ ] Verificare il caricamento in Chromium dal sottopercorso Pages, la rete limitata al sito e la prima missione Python.
- [ ] Verificare il ripristino dei progressi, la modalità docente, l’audio disattivato al primo avvio e la grafica leggera.
- [ ] Verificare contenuto e SHA-256 dello ZIP. Provare il caricamento offline dopo aver preparato la cache e provare il server HTTP del pacchetto.
- [ ] Consultare il test dei 30 contesti isolati come prova software di separazione. Ripetere il test fisico sui PC.

## Controlli da eseguire al Ferraris

- [ ] Aprire il sito con i browser installati. Verificare nelle postazioni campione Chrome, Edge e Firefox se presenti.
- [ ] Provare le quattro frecce, Pausa, Riprendi, perdita del focus e navigazione da tastiera nell’editor.
- [ ] Controllare fluidità e leggibilità alla risoluzione reale. Attivare **Grafica leggera** sui PC più lenti.
- [ ] Eseguire `velocita = 5 * 2` nella prima missione e verificare esito e HUD. Provare un indizio, un errore Python e il ritorno al gioco.
- [ ] Saltare un esercizio, ricaricare, scegliere **Continua** e recuperare la bozza.
- [ ] Aprire **Modalità docente**, verificare soluzione, demo, pausa e reset con conferma.
- [ ] Controllare che l’audio sia disattivato sui profili già usati, oltre che su quelli nuovi.
- [ ] Far aprire il sito contemporaneamente su oltre 15 postazioni, poi avviare un esercizio su ognuna.
- [ ] Preparare la cache sul profilo effettivo e disconnettere una macchina campione per la prova. Tenere una copia dello ZIP su un supporto disponibile e verificare Python 3 sulla macchina ospitante.
- [ ] Se si userà la LAN, ottenere l’autorizzazione, verificare porta e firewall, poi aprire URL e prima missione da un secondo PC con Internet non disponibile.
- [ ] Tra due gruppi avviare una nuova sessione, confermare e ricontrollare audio e grafica.
