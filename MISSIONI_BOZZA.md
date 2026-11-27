# CODE SPACE – Python Edition 1.1.0
## Fase 0 · Bozza delle 22 missioni

Bozza da approvare. La base è la 1.0.0 (merge `76e85b3`, stesso albero di `864825b`). Il `main` remoto verificato è la 2.2.0 (`ef7a14a`), che contiene già funzioni estranee a questo percorso. Il ramo della bozza parte dalla baseline 1.0.0. L’archivio di emergenza 1.0.0 ha superato il controllo SHA-256. La verifica diretta di Pages ha restituito HTTP 403 dal proxy.

### Come leggere le schede

Il blocco è indicato dal titolo di sezione. Ogni scheda indica concetto, problema, motivo, consegna, spiegazione, codice, righe modificabili, variabili di bordo, scenari, indizi, soluzione ed effetto. Nel gioco l’ordine è **Problema → Cosa fare → Codice → Risultato atteso → Esegui / Indizio / Salta per ora**. Motivo e spiegazione sono materiale per gli indizi o per il docente. Prima dell’esecuzione compaiono due frasi guida al massimo, oltre alle etichette. Le righe indicate come modificabili sono evidenziate. Le altre sono grigie e protette anche da incolla e selezione. Il confronto si applica a valori, tipi e output, indipendentemente da spazi, virgolette o espressioni equivalenti nel codice.

Gli scenari partono ogni volta da un interprete pulito con i dati di bordo indicati. L’output atteso specifica righe distinte nell’ordine di stampa. Per ogni missione sono previsti cinque test automatici: soluzione corretta, soluzione sbagliata, sorgente vuoto, sintassi errata, ciclo infinito. I casi negativi del runner si inviano attraverso l’interfaccia di test, inclusi quelli che l’editor protetto impedirebbe di digitare. Un errore mostra una frase semplice, la riga studente se disponibile e cosa controllare. Errori attesi: «Controlla i segni di questa riga» (sintassi), «Aggiungi i due punti alla fine di questa riga», «Metti quattro spazi all’inizio della riga del blocco», «Controlla che il nome sia scritto come quando gli hai dato un valore», «Per unire testo e numero, trasforma prima il numero in testo con str», «Controlla il divisore: è zero», «Il programma ha impiegato troppo tempo. Controlla che il ciclo possa finire». Per gli altri: «Il programma si è fermato qui. Controlla questa riga o prova un indizio».

Gli effetti indicati sono anteprime, messaggi o ricompense del volo già previsto. Il laser della missione 07 è una calibrazione in console, senza aggiungere sparo. Omega sblocca l’avvio della sfida finale dal proprio pannello. Il percorso libero della 1.0.0 mantiene la sfida disponibile anche con missioni incomplete.

## Blocco 1 — Variabili e output

### 01 · Riaccendi Aurora

- **Concetto:** variabile = nome che conserva un valore.
- **Problema:** Aurora è troppo lenta.
- **Perché:** il propulsore legge la velocità impostata dal computer.
- **Cosa fare:** Cambia 5 in 10.
- **Spiegazione:** `=` salva il valore a destra nel nome a sinistra.
- **Righe modificabili:** 1. **Variabili fornite:** nessuna.

```python
velocita = 5
```

- **Risultato atteso ed effetto:** indicatore da 5 a 10, doppia velocità e scia dei propulsori turbo.
- **Scenari:** senza input, `velocita` è l’intero 10. Alternativa valida: `velocita = 5 * 2`. Controprova: 5 o il testo `"10"`.

**Indizi:** 1. La velocità è un numero salvato in una variabile. 2. Cambia il valore a destra del segno uguale. 3. Scrivi la riga della soluzione.

```python
velocita = 10
```

### 02 · Messaggio di bordo

- **Concetto:** `print` = mostra un messaggio.
- **Problema:** la console di bordo è muta.
- **Perché:** l’equipaggio deve sapere quando Aurora è pronta.
- **Cosa fare:** Scrivi Aurora online tra le virgolette.
- **Spiegazione:** le virgolette delimitano il testo che `print` mostra.
- **Righe modificabili:** 1. **Variabili fornite:** nessuna.

```python
print("")
```

- **Risultato atteso ed effetto:** la console di volo mostra **Aurora online**.
- **Scenari:** senza input, l’output ha una riga, `Aurora online`. Controprova: riga vuota o messaggio diverso.

**Indizi:** 1. `print` mostra quello che riceve tra parentesi. 2. Riempi le virgolette mantenendo lo spazio tra le parole. 3. Scrivi `print("Aurora online")`.

```python
print("Aurora online")
```

### 03 · Interruttore scudo

- **Concetto:** booleano = acceso o spento.
- **Problema:** Aurora ha lo scudo spento.
- **Perché:** lo scudo assorbe un impatto.
- **Cosa fare:** Sostituisci False con True.
- **Spiegazione:** `False` significa spento, `True` acceso.
- **Righe modificabili:** 1. **Variabili fornite:** nessuna.

```python
scudo = False
```

- **Risultato atteso ed effetto:** anello protettivo visibile, pronto ad assorbire un impatto.
- **Scenari:** senza input, `scudo` è il booleano `True`. Controprova: `False` o il testo `"True"`.

**Indizi:** 1. Serve un valore acceso/spento. 2. Usa la parola Python per acceso, con iniziale maiuscola e senza virgolette. 3. Scrivi `scudo = True`.

```python
scudo = True
```

### 04 · Vernice spaziale

- **Concetto:** stringa = testo tra virgolette.
- **Problema:** la verniciatura di Aurora è da scegliere.
- **Perché:** il valore comanda il colore dello scafo e della scia.
- **Cosa fare:** Scrivi tra le virgolette uno dei colori blu, verde o viola.
- **Spiegazione:** il gioco riconosce solo i nomi dei colori mostrati nel pannello.
- **Righe modificabili:** 1. **Variabili fornite:** nessuna.

```python
colore = ""
```

- **Risultato atteso ed effetto:** navicella e scia assumono il colore scelto.
- **Scenari:** senza input, `colore` è una stringa tra `"blu"`, `"verde"`, `"viola"`. Ognuna è valida. Controprova: stringa vuota o `"arancione"`.

**Indizi:** 1. Il nome di un colore è testo. 2. Scegli una parola dalla tavolozza e lascia le virgolette. 3. Esempio: `colore = "blu"`.

```python
colore = "blu"
```

## Blocco 2 — Calcoli

### 05 · Ricarica energetica

- **Concetto:** aggiornare una variabile = salvare un nuovo valore nello stesso nome.
- **Problema:** la batteria di Aurora ha solo 40 unità.
- **Perché:** la riserva deve guadagnarne 20.
- **Cosa fare:** Cambia lo 0 in 20 nella riga evidenziata.
- **Spiegazione:** Python legge l’energia di partenza, fa la somma e salva il totale.
- **Righe modificabili:** 2. **Variabili fornite:** nessuna.

```python
energia = 40
energia = energia + 0
```

- **Risultato atteso ed effetto:** la barra di bordo sale da 40 a 60.
- **Scenari:** senza input, `energia` è l’intero 60. Controprova: `energia = energia + 10` sulla seconda riga.

**Indizi:** 1. `+` aggiunge unità al valore già presente. 2. Usa la carica iniziale nel calcolo a destra di `=`. 3. Scrivi `energia = energia + 20`.

```python
energia = 40
energia = energia + 20
```

### 06 · Riparazione dello scafo

- **Concetto:** sottrazione = togliere una quantità.
- **Problema:** lo scafo ha subito 35 punti di danno.
- **Perché:** Aurora deve calcolare quanta protezione le resta.
- **Cosa fare:** Sottrai danni da 100 nella riga evidenziata.
- **Spiegazione:** `danni` è un valore fornito dal computer di bordo.
- **Righe modificabili:** 1. **Variabili fornite:** `danni`.

```python
scafo = 100 - 0
```

- **Risultato atteso ed effetto:** indicatore dello scafo a 65/100 nello scenario principale.
- **Scenari:** `danni = 35` → `scafo = 65`; `danni = 12` → `scafo = 88`. Risultati interi. Controprova: sottrarre sempre 35.

**Indizi:** 1. I danni riducono i 100 punti dello scafo. 2. Usa il nome del valore ricevuto al posto dello 0. 3. Scrivi `scafo = 100 - danni`.

```python
scafo = 100 - danni
```

### 07 · Potenziamento laser

- **Concetto:** `*` = moltiplica.
- **Problema:** il banco di calibrazione del laser legge una potenza troppo bassa.
- **Perché:** ogni livello vale 10 unità nel controllo di bordo.
- **Cosa fare:** Moltiplica 10 per livello.
- **Spiegazione:** il computer fornisce `livello`, che può cambiare tra le prove.
- **Righe modificabili:** 1. **Variabili fornite:** `livello`.

```python
danno = 10 * 1
```

- **Risultato atteso ed effetto:** la spia di calibrazione si accende e la console mostra il danno calcolato.
- **Scenari:** `livello = 2` → `danno = 20`; `livello = 4` → `danno = 40`. Risultati interi. Controprova: sommare 10 e livello.

**Indizi:** 1. Ogni livello vale un altro gruppo di 10. 2. Sostituisci l’1 con il nome del valore di bordo. 3. Scrivi `danno = 10 * livello`.

```python
danno = 10 * livello
```

### 08 · Distribuzione delle risorse

- **Concetto:** `//` = divisione con risultato intero.
- **Problema:** i motori devono ricevere la stessa quantità di energia.
- **Perché:** il pannello assegna una quota uguale a ciascun motore.
- **Cosa fare:** Dividi energia_totale per motori usando //.
- **Spiegazione:** nelle prove le divisioni sono esatte e il numero di motori è sempre maggiore di zero.
- **Righe modificabili:** 1. **Variabili fornite:** `energia_totale`, `motori`.

```python
per_motore = energia_totale
```

- **Risultato atteso ed effetto:** il pannello mostra quote uguali, per esempio **20 · 20 · 20**.
- **Scenari:** 60 e 3 → `per_motore = 20`; 48 e 4 → `12`; 42 e 2 → `21`, tutti interi. Controprova: usare `/` e produrre un decimale.

**Indizi:** 1. Suddividi tutta l’energia in quote identiche. 2. Scrivi il totale prima di `//` e il numero di motori dopo. 3. Scrivi `per_motore = energia_totale // motori`.

```python
per_motore = energia_totale // motori
```

## Blocco 3 — Testo

### 09 · Segnale extraterrestre

- **Concetto:** concatenare = unire due pezzi di testo con `+`.
- **Problema:** Aurora ha captato un nome, ma la risposta è incompleta.
- **Perché:** il saluto deve includere il nome ricevuto.
- **Cosa fare:** Unisci "Ciao " al valore di nome.
- **Spiegazione:** lo spazio dentro le virgolette separa il saluto dal nome.
- **Righe modificabili:** 1. **Variabili fornite:** `nome`.

```python
messaggio = "Ciao " + ""
```

- **Risultato atteso ed effetto:** il terminale radio mostra il saluto, ad esempio **Ciao Vega**.
- **Scenari:** `nome = "Vega"` → `messaggio = "Ciao Vega"`; `nome = "Luna"` → `"Ciao Luna"`. Controprova: scrivere sempre Vega o omettere lo spazio.

**Indizi:** 1. Il saluto e il nome sono due pezzi di testo. 2. Il nome ricevuto è già in una variabile e si scrive senza virgolette. 3. Scrivi `messaggio = "Ciao " + nome`.

```python
messaggio = "Ciao " + nome
```

### 10 · Rapporto di bordo

- **Concetto:** `str` = trasforma un valore in testo.
- **Problema:** la console deve mostrare quante vite restano.
- **Perché:** il numero deve poter essere unito all’etichetta.
- **Cosa fare:** Sostituisci 0 con str(vite).
- **Spiegazione:** `str(vite)` rende il numero adatto a essere unito al testo con `+`.
- **Righe modificabili:** 1. **Variabili fornite:** `vite`.

```python
print("Vite: " + 0)
```

- **Risultato atteso ed effetto:** una riga nel registro di volo, ad esempio **Vite: 3**.
- **Scenari:** `vite = 3` → output `Vite: 3`; `vite = 1` → `Vite: 1`; `vite = 5` → `Vite: 5`. Controprova: usare `+ vite` senza trasformare il numero.

**Indizi:** 1. Python distingue il testo dai numeri. 2. Trasforma il valore di bordo con `str(…)` prima di unirlo all’etichetta. 3. Scrivi `print("Vite: " + str(vite))`.

```python
print("Vite: " + str(vite))
```

## Blocco 4 — Decisioni

### 11 · Scudo intelligente

- **Concetto:** `if` = «se», `<` = «minore di».
- **Problema:** Aurora ha bisogno dello scudo quando restano meno di tre vite.
- **Perché:** la difesa di emergenza deve accendersi solo quando serve.
- **Cosa fare:** Cambia in True il False della riga rientrata.
- **Spiegazione:** le righe con rientro si eseguono se la condizione è vera. Il computer di bordo fornisce `vite`.
- **Righe modificabili:** 3. **Variabili fornite:** `vite`.

```python
scudo = False
if vite < 3:
    scudo = False
```

- **Risultato atteso ed effetto:** scudo di riserva acceso con 2 vite, spento con 3 e 4. Si usa la protezione di emergenza del volo.
- **Scenari:** `vite = 2` → `scudo is True`; `vite = 3` → `False`; `vite = 4` → `False`. Controprova: cambiare anche il primo False negli scenari con 3 e 4 vite.

**Indizi:** 1. Fai attenzione a quando il computer arriva alla riga rientrata. 2. Lo scudo parte spento. Solo la riga sotto `if` deve accenderlo. 3. Lascia le prime due righe e scrivi `    scudo = True` nella terza.

```python
scudo = False
if vite < 3:
    scudo = True
```

### 12 · Radar automatico

- **Concetto:** `if` = «se», `else` = «altrimenti».
- **Problema:** il radar deve distinguere un ostacolo vicino da uno lontano.
- **Perché:** sotto 50 unità il pannello deve invitare il pilota a deviare.
- **Cosa fare:** Scrivi "devia" nel ramo se e "continua" nel ramo altrimenti.
- **Spiegazione:** la distanza è fornita dal radar. Python sceglie un solo ramo.
- **Righe modificabili:** 2, 4. **Variabili fornite:** `distanza`.

```python
if distanza < 50:
    rotta = ""
else:
    rotta = ""
```

- **Risultato atteso ed effetto:** freccia di deviazione oppure conferma della rotta sul radar.
- **Scenari:** `distanza = 49` → `rotta = "devia"`; 50 → `"continua"`; 80 → `"continua"`. Controprova: usare la stessa risposta in entrambi i rami.

**Indizi:** 1. Il secondo ramo copre i valori per cui il primo confronto è falso. 2. Con 49 si esegue la prima riga rientrata. Con 50 si esegue la seconda. 3. Usa l’ordine delle risposte nella soluzione.

```python
if distanza < 50:
    rotta = "devia"
else:
    rotta = "continua"
```

### 13 · Livelli di allarme

- **Concetto:** `elif` = «altrimenti, se».
- **Problema:** la spia dell’energia deve distinguere tre livelli.
- **Perché:** l’equipaggio deve riconoscere un problema prima di restare senza energia.
- **Cosa fare:** Completa nell’ordine le tre etichette: rosso, giallo, verde.
- **Spiegazione:** rosso sotto 20, giallo da 20 a meno di 50, verde da 50 in su. Python usa il primo ramo vero.
- **Righe modificabili:** 2, 4, 6. **Variabili fornite:** `energia`.

```python
if energia < 20:
    allarme = ""
elif energia < 50:
    allarme = ""
else:
    allarme = ""
```

- **Risultato atteso ed effetto:** la spia cambia colore e riporta l’etichetta corrispondente.
- **Scenari:** `energia = 19` → `allarme = "rosso"`; 20 e 49 → `"giallo"`; 50 e 80 → `"verde"`. Controprova: scambiare le etichette dei primi due rami.

**Indizi:** 1. Leggi i confronti dall’alto verso il basso. 2. Sotto 20 basta il primo confronto. Da 20 a 49 serve il secondo. 3. Completa le tre righe come nella soluzione.

```python
if energia < 20:
    allarme = "rosso"
elif energia < 50:
    allarme = "giallo"
else:
    allarme = "verde"
```

### 14 · Doppia sicurezza

- **Concetto:** `and` = «e», entrambe le condizioni devono essere vere.
- **Problema:** la riserva deve proteggere Aurora senza scaricare la batteria.
- **Perché:** lo scudo può attivarsi solo con poche vite e carica sufficiente.
- **Cosa fare:** Sostituisci False dopo and con il controllo energia > 20.
- **Spiegazione:** `>` significa «maggiore di». Con 20 unità esatte l’energia è insufficiente.
- **Righe modificabili:** 2. **Variabili fornite:** `vite`, `energia`.

```python
scudo = False
if vite < 3 and False:
    scudo = True
```

- **Risultato atteso ed effetto:** il pannello mostra uno spunto di difesa solo se entrambe le spie danno il via libera.
- **Scenari:** (vite 2, energia 21) → `scudo = True`; (2, 20), (3, 21) e (4, 10) → `False`. Controprova: usare `or` al posto di `and`.

**Indizi:** 1. Uno dei due sì da solo non basta. 2. Dopo `and` fai un secondo confronto, questa volta sulla carica. 3. Scrivi `if vite < 3 and energia > 20:`.

```python
scudo = False
if vite < 3 and energia > 20:
    scudo = True
```

## Blocco 5 — Cicli

### 15 · Propulsori a catena

- **Concetto:** `for` = ripeti una volta per ogni valore.
- **Problema:** i propulsori richiedono tre impulsi di avvio.
- **Perché:** ripetere una riga accende le tre spie in sequenza.
- **Cosa fare:** Cambia 1 in 3 dentro range.
- **Spiegazione:** `range(3)` fornisce 0, 1 e 2. La riga rientrata si ripete tre volte.
- **Righe modificabili:** 1. **Variabili fornite:** nessuna.

```python
for i in range(1):
    print("Impulso")
```

- **Risultato atteso ed effetto:** tre impulsi sul pannello, uno per riga di output.
- **Scenari:** senza input, output `Impulso`, `Impulso`, `Impulso`. Controprova: due impulsi.

**Indizi:** 1. Guarda quante volte vuoi ripetere l’istruzione rientrata. 2. Il numero tra le parentesi di `range` decide quante volte parte. 3. Scrivi `for i in range(3):`.

```python
for i in range(3):
    print("Impulso")
```

### 16 · Generatore automatico

- **Concetto:** accumulare = aggiungere a un totale a ogni giro.
- **Problema:** il generatore registra cinque scariche, ma il totale rimane a zero.
- **Perché:** ogni scarica va aggiunta una sola volta.
- **Cosa fare:** Sostituisci 0 con i nella riga del totale.
- **Spiegazione:** `range(1, 6)` va da 1 a 5. Il limite 6 è escluso.
- **Righe modificabili:** 3. **Variabili fornite:** nessuna.

```python
totale = 0
for i in range(1, 6):
    totale = totale + 0
    print(totale)
```

- **Risultato atteso ed effetto:** il pannello del generatore mostra **15 unità**.
- **Scenari:** senza input, `totale` è l’intero 15 e l’output mostra `1`, `3`, `6`, `10`, `15`. Controprove: aggiungere 1 a ogni giro o assegnare sempre 15.

**Indizi:** 1. Il valore della scarica cambia da un giro all’altro. 2. Aggiungi al totale il valore che il ciclo assegna a `i`. 3. Scrivi `    totale = totale + i`.

```python
totale = 0
for i in range(1, 6):
    totale = totale + i
    print(totale)
```

### 17 · Conto alla rovescia

- **Concetto:** `while` = ripeti finché la condizione è vera.
- **Problema:** il conto alla rovescia salta alcuni numeri.
- **Perché:** Aurora deve sottrarre un solo passo prima di ciascuna nuova prova.
- **Cosa fare:** Cambia 2 in 1 nella sottrazione del contatore.
- **Spiegazione:** quando il contatore arriva a zero il ciclo finisce. Se resta sempre positivo, il limite di tempo ferma l’esecuzione.
- **Righe modificabili:** 3. **Variabili fornite:** `contatore`.

```python
while contatore > 0:
    print(contatore)
    contatore = contatore - 2
```

- **Risultato atteso ed effetto:** il display mostra il conto in sequenza, senza saltare numeri.
- **Scenari:** `contatore = 3` → output `3`, `2`, `1` e valore finale 0; `contatore = 2` → `2`, `1` e 0; `contatore = 0` → nessuna stampa e 0. Controprova: sottrarre 0 provoca l’arresto per limite di tempo per un contatore positivo.

**Indizi:** 1. Il ciclo deve avvicinarsi allo zero. 2. Il numero successivo è sempre uno in meno del precedente. 3. Scrivi `    contatore = contatore - 1`.

```python
while contatore > 0:
    print(contatore)
    contatore = contatore - 1
```

## Blocco 6 — Liste, debug, funzioni

### 18 · Inventario spaziale

- **Concetto:** lista = più oggetti tra parentesi quadre, `append` = aggiungi in fondo, `len` = conta.
- **Problema:** manca un kit nell’inventario di Aurora.
- **Perché:** la console deve mostrare il carico e il suo nuovo totale.
- **Cosa fare:** Sostituisci "" con "kit" nella riga append.
- **Spiegazione:** `inventario.append("kit")` aggiunge un oggetto. La riga successiva lo include nel conteggio.
- **Righe modificabili:** 2. **Variabili fornite:** nessuna.

```python
inventario = ["cavo", "filtro"]
inventario.append("")
totale = len(inventario)
```

- **Risultato atteso ed effetto:** la stiva mostra **cavo, filtro, kit · 3 oggetti**.
- **Scenari:** senza input, lista `["cavo", "filtro", "kit"]` in quest’ordine, `totale = 3` intero. Controprova: lasciare vuoto il terzo elemento o aggiungerlo due volte.

**Indizi:** 1. Il kit va aggiunto in coda agli oggetti già presenti. 2. Cambia solo il testo passato ad `append`. 3. Scrivi `inventario.append("kit")`.

```python
inventario = ["cavo", "filtro"]
inventario.append("kit")
totale = len(inventario)
```

### 19 · Scansione inventario

- **Concetto:** `for oggetto in inventario` = guarda ogni oggetto, `in` in un controllo = è presente.
- **Problema:** la stiva contiene oggetti diversi e il computer cerca carburante.
- **Perché:** il registro mostra gli oggetti scansionati e conferma se il carburante c’è.
- **Cosa fare:** Sostituisci "" con "carburante" nel controllo sotto la scansione.
- **Spiegazione:** il ciclo mostra tutti gli oggetti. Il controllo successivo cerca un nome preciso nella lista.
- **Righe modificabili:** 4. **Variabili fornite:** `inventario`.

```python
for oggetto in inventario:
    print(oggetto)
trovato = False
if "" in inventario:
    trovato = True
```

- **Risultato atteso ed effetto:** la console elenca gli oggetti e accende la spia carburante solo se presente.
- **Scenari:** `["cavo", "carburante"]` → stampa `cavo`, `carburante` e `trovato = True`; `["kit"]` → stampa `kit` e `False`; `[]` → nessuna stampa e `False`. Controprova: cercare sempre `"cavo"`.

**Indizi:** 1. Il controllo deve chiedere se nella lista c’è un oggetto, anche se non è il primo. 2. Il nome cercato va prima di `in inventario`. 3. Scrivi `if "carburante" in inventario:`.

```python
for oggetto in inventario:
    print(oggetto)
trovato = False
if "carburante" in inventario:
    trovato = True
```

### 20 · Computer in avaria

- **Concetto:** debug = trovare e correggere un errore.
- **Problema:** il computer si blocca prima di mostrare il messaggio di pronto.
- **Perché:** tre piccoli errori impediscono di leggere il comando.
- **Cosa fare:** Correggi i due punti, il rientro e il nome nelle righe evidenziate.
- **Spiegazione:** la prima segnalazione indica dove iniziare. Esegui di nuovo dopo ogni correzione.
- **Righe modificabili:** 2 e 3. **Variabili fornite:** `sistema_pronto`.

```python
messaggio = "Sistemi pronti"
if sistema_pronto
print(messagio)
```

- **Risultato atteso ed effetto:** il terminale torna operativo e mostra **Sistemi pronti** quando riceve il segnale.
- **Scenari:** `sistema_pronto = True` → stampa `Sistemi pronti`; `False` → nessuna stampa; ripetere `True` in un interprete pulito → stessa riga. Controprova: correggere solo due dei tre errori o stampare sempre.

**Indizi:** 1. Parti dalla riga indicata dall’errore. Quando esegui di nuovo puoi scoprire quella successiva. 2. Controlla la fine di `if`, gli spazi iniziali sotto `if` e le lettere del nome dentro `print`. 3. Aggiungi `:` alla seconda riga. Nella terza usa quattro spazi e `print(messaggio)`.

```python
messaggio = "Sistemi pronti"
if sistema_pronto:
    print(messaggio)
```

### 21 · Nuovo comando

- **Concetto:** `def` = definisci un comando, `return` = restituisci un risultato.
- **Problema:** Aurora ha un comando per lo scudo, ma il computer non lo usa.
- **Perché:** il comando va chiamato per leggere il valore restituito.
- **Cosa fare:** Sostituisci il False dell’ultima riga con attiva_scudo().
- **Spiegazione:** `def` prepara il comando. Il nome seguito da parentesi lo esegue e `return` consegna il valore a chi lo ha chiamato.
- **Righe modificabili:** 4. **Variabili fornite:** nessuna.

```python
def attiva_scudo():
    return True

scudo = False
```

- **Risultato atteso ed effetto:** la console conferma che lo scudo è attivo e il generatore lo segnala.
- **Scenari:** senza input, `attiva_scudo()` restituisce il booleano `True` e il valore finale di `scudo` è `True`. Prova aggiuntiva del runner: sostituire nel solo scenario di test il valore restituito dalla funzione protetta con `False` e richiedere `scudo = False`. Controprova: assegnare sempre `True` ignorando il risultato del comando.

**Indizi:** 1. Scrivere il nome di un comando non lo fa partire. 2. Usa il nome seguito da parentesi vuote al posto del valore di partenza. 3. Scrivi `scudo = attiva_scudo()`.

```python
def attiva_scudo():
    return True

scudo = attiva_scudo()
```

### 22 · Protocollo Omega

- **Concetto:** funzione, ciclo e condizione insieme.
- **Problema:** il protocollo finale deve controllare la somma degli impulsi di Aurora.
- **Perché:** l’accesso rapido alla sfida si attiva con almeno 10 unità.
- **Cosa fare:** Aggiungi ogni impulso a carica nella riga evidenziata.
- **Spiegazione:** il ciclo somma dentro il comando. Il comando restituisce il totale e il controllo finale lo confronta con 10.
- **Righe modificabili:** 4. **Variabili fornite:** `impulsi`.

```python
def carica_banco():
    carica = 0
    for impulso in impulsi:
        carica = carica + 0
    return carica

totale = carica_banco()
omega = False
if totale >= 10:
    omega = True
```

- **Risultato atteso ed effetto:** il banco mostra il totale e l’indicatore Omega. Dopo il successo compare il comando di avvio della sfida finale nel pannello.
- **Scenari:** `[2, 3, 4]` → `totale = 9`, `omega = False`; `[2, 3, 5]` → `10`, `True`; `[7, 5]` → `12`, `True`; `[]` → `0`, `False`. Controprova: aggiungere sempre 1 per impulso.

**Indizi:** 1. A ogni giro il ciclo consegna il valore di un impulso. 2. Conserva la carica già accumulata e sostituisci lo 0 con il valore del giro. 3. Scrivi `        carica = carica + impulso`.

```python
def carica_banco():
    carica = 0
    for impulso in impulsi:
        carica = carica + impulso
    return carica

totale = carica_banco()
omega = False
if totale >= 10:
    omega = True
```
