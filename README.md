# code-space-python-edition
Educational Python space game – Ferraris Orientation 2026

## Sviluppo locale

Dalla radice del repository, avvia `python3 -m http.server 8000 --bind 127.0.0.1` e apri `http://127.0.0.1:8000/`.

Consulta [specifiche](SPECIFICATIONS.md), [architettura](docs/ARCHITECTURE.md) e [roadmap](docs/ROADMAP.md).

La pagina apre il gioco. Seleziona **Laboratorio Python** per usare il prototipo autonomo. Modifica l’esempio e premi **Esegui** per leggere l’output e i valori delle variabili. Il sito carica Skulpt localmente.

Per eseguire le verifiche usa `node --test tests/*.test.mjs` con Chromium installato. Puoi specificare il binario con `CHROMIUM_BIN`. Consulta [risultati QA e opzioni per il container](docs/QA.md).

## Gioco e missioni

Scegli **Inizia**, prova le frecce e premi **Decolla**. Le stelle contrassegnate PYTHON aprono il Centro di controllo. Dopo quattro missioni puoi avviare la sfida finale. La quinta missione è facoltativa. **Grafica leggera** riduce il carico del Canvas.

Vedi la [guida docente](docs/TEACHER_GUIDE.md), le [verifiche](docs/QA.md) e le [schermate](docs/screenshots/).
