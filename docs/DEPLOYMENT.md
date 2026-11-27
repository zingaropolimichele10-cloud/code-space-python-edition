# Distribuzione di CODE SPACE 1.1.0

## GitHub Pages

1. Nel repository GitHub `zingaropolimichele10-cloud/code-space-python-edition`, porta i commit approvati nel branch `main` secondo il flusso del progetto. I commit consegnati sono locali. Su GitHub Free la disponibilità di Pages dipende dalla visibilità prevista dal piano del repository.
2. Verifica nella radice di `main` la presenza di `index.html`, `.nojekyll`, `sw.js`, `release-manifest.json` e delle directory runtime. GitHub Pages serve direttamente questi file.
3. Apri **Settings → Pages**. In **Build and deployment**, scegli **Deploy from a branch**. Seleziona **main** e **/ (root)**, poi **Save**.
4. Attendi il successo della distribuzione Pages. Apri `https://zingaropolimichele10-cloud.github.io/code-space-python-edition/` o l’indirizzo mostrato da GitHub. Verifica menu, volo, prima missione, Python e ricaricamento. Agli studenti basta un browser.
5. Prova l’offline con lo stesso profilo e lo stesso URL dopo aver completato il caricamento. Prima della lezione verifica l’indirizzo reale con la [checklist](LAB_CHECKLIST.md).

## A. Offline dopo un primo caricamento completo

Su HTTPS o sull’indirizzo loopback il Service Worker preleva tutte le risorse elencate nel manifest. Per il primo caricamento occorre raggiungere il server. Apri il gioco, attendi l’attivazione del Service Worker e verifica l’offline disconnettendo la rete di prova e ricaricando. Esegui la prima missione e riapri il Laboratorio Python. Usa lo stesso indirizzo e profilo. La modalità privata, la pulizia dei dati e le regole della postazione possono eliminare o impedire la cache.

Per pubblicare un aggiornamento, incrementa la stessa versione in `sw.js` e `release-manifest.json`. Aggiorna l’elenco dei file se necessario e distribuisci l’intera versione insieme. Il Service Worker scarica la nuova cache prima di proporla. Quando compare l’avviso, salva il lavoro e chiudi **tutte** le schede di CODE SPACE su quell’origine. Alla riapertura si attiva la nuova versione e viene rimossa la cache precedente di quello scope. Questa procedura conserva LocalStorage. L’uso offline mantiene l’ultima versione installata fino a una successiva connessione.

## B. Pacchetto ZIP indipendente da Internet

Usa il pacchetto consegnato oppure ricrealo dalla radice del checkout con Python 3:

```sh
python3 tools/build-offline.py ../CODE-SPACE-1.1.0-offline.zip
```

Estrai l’intera cartella. Entra nella directory con `index.html` ed esegui:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Su Windows con il launcher Python usa `py -3 -m http.server 8000 --bind 127.0.0.1`. Apri `http://127.0.0.1:8000/`. Python 3 serve sulla macchina che ospita il server. La pagina usa moduli e un Worker via HTTP, quindi l’apertura da `file://` resta fuori dal percorso supportato. Conserva lo ZIP in una cartella accessibile prima della lezione. Il generatore stampa dimensione e SHA-256.

## C. Server condiviso sulla LAN

Solo con autorizzazione del referente IT, estrai il pacchetto su una macchina raggiungibile e avvia il server da quella cartella:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Dai PC apri `http://IP_DEL_SERVER:8000/`. I client richiedono solo un browser e accesso a quella porta. Verifica firewall e connettività da un secondo PC. Su HTTP all’indirizzo LAN il browser in genere disabilita il Service Worker. Il server deve restare acceso e raggiungibile, mentre Internet può essere assente. Interrompi il servizio a fine lezione con Ctrl+C. Tieni il percorso B come riserva.
