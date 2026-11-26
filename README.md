# CODE SPACE – Python Edition 2.0.0
Educational Python space game – Ferraris Orientation 2026

## Sviluppo locale

Dalla radice del repository, avvia `python3 -m http.server 8000 --bind 127.0.0.1` e apri `http://127.0.0.1:8000/`.

Consulta [specifiche](SPECIFICATIONS.md), [architettura](docs/ARCHITECTURE.md) e [roadmap](docs/ROADMAP.md).

La pagina apre il gioco. Seleziona **Laboratorio Python** per usare il prototipo autonomo. Modifica l’esempio e premi **Esegui** per leggere l’output e i valori delle variabili. Il sito carica Skulpt localmente.

Per eseguire le verifiche usa `node --test tests/*.test.mjs` con Chromium installato. Puoi specificare il binario con `CHROMIUM_BIN`. Consulta [risultati QA e opzioni per il container](docs/QA.md).

## Gioco e missioni

Scegli **Inizia missione**, prova le frecce e usa **Spazio** per sparare. Decolla quando sei pronto. Le stelle PYTHON aprono il Centro di controllo. Puoi iniziare la sfida contro il drone da circa 60 secondi anche con missioni incomplete. La quinta è sempre facoltativa. **Continua** ripristina il checkpoint locale. **Grafica leggera** riduce il carico del Canvas e l’audio parte disattivato.

Vedi la [guida docente](docs/TEACHER_GUIDE.md), le [verifiche](docs/QA.md) e le [schermate](docs/screenshots/).

## Distribuzione

Consulta [GitHub Pages e pacchetto offline](docs/DEPLOYMENT.md), la [checklist](docs/LAB_CHECKLIST.md) e la [risoluzione dei problemi](docs/TROUBLESHOOTING.md). Il sito è statico.

## Classroom

Dal menu scegli **Gioca da solo**, **Unisciti a una sessione** o **Crea una sessione — Host**. Il gioco individuale resta offline. La demo locale usa solo schede dello stesso profilo di browser. La modalità online richiede la configurazione Firebase pubblica e l’autorizzazione dell’Host. [Configurazione](docs/FIREBASE_SETUP.md) · [Guida Host](docs/HOST_GUIDE.md) · [Guida studente](docs/STUDENT_GUIDE.md) · [Privacy](docs/PRIVACY.md) · [Verifiche](docs/CLASSROOM_QA.md).
