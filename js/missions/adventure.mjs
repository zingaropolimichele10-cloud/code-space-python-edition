export const missions = [
  {
    id: 1, titolo: 'Riaccendi Aurora', blocco: 1, concetto: 'Variabile = nome che conserva un valore',
    problema: 'Aurora è troppo lenta.', perche: 'Il propulsore legge la velocità impostata dal computer.',
    cosaFare: 'Cambia 5 in 10.', spiegazione: '= salva il valore a destra nel nome a sinistra.',
    codiceIniziale: 'velocita = 5', righeModificabili: [1], variabiliFornite: [],
    scenariDiTest: [{ input: {}, atteso: { velocita: { type: 'int', value: 10 } } }],
    indizi: [
      'La velocità è un numero salvato in una variabile.',
      'Cambia il valore a destra del segno uguale.',
      'velocita = 10',
    ],
    soluzioneEsempio: 'velocita = 10',
    effettoNelGioco: { anteprima: 'Velocità 5 → 10 · Propulsori turbo', upgrade: { speed: 10 },
      esito: 'velocita contiene l’intero 10. I propulsori turbo sono pronti.' },
  },
  {
    id: 2, titolo: 'Messaggio di bordo', blocco: 1, concetto: 'print = mostra un messaggio',
    problema: 'La console di bordo è muta.', perche: 'L’equipaggio deve sapere quando Aurora è pronta.',
    cosaFare: 'Scrivi Aurora online tra le virgolette.', spiegazione: 'Le virgolette delimitano il testo che print mostra.',
    codiceIniziale: 'print("")', righeModificabili: [1], variabiliFornite: [],
    scenariDiTest: [{ input: {}, output: ['Aurora online'] }],
    indizi: [
      'print mostra quello che riceve tra parentesi.',
      'Riempi le virgolette mantenendo lo spazio tra le parole.',
      'print("Aurora online")',
    ],
    soluzioneEsempio: 'print("Aurora online")',
    effettoNelGioco: { anteprima: 'Console di volo · Aurora online', upgrade: {}, console: true,
      esito: 'Aurora online è comparso nella console di volo.' },
  },
  {
    id: 3, titolo: 'Interruttore scudo', blocco: 1, concetto: 'Booleano = acceso o spento',
    problema: 'Aurora ha lo scudo spento.', perche: 'Lo scudo assorbe un impatto.',
    cosaFare: 'Sostituisci False con True.', spiegazione: 'False significa spento, True acceso.',
    codiceIniziale: 'scudo = False', righeModificabili: [1], variabiliFornite: [],
    scenariDiTest: [{ input: {}, atteso: { scudo: { type: 'bool', value: true } } }],
    indizi: [
      'Serve un valore acceso/spento.',
      'Usa la parola Python per acceso, con iniziale maiuscola e senza virgolette.',
      'scudo = True',
    ],
    soluzioneEsempio: 'scudo = True',
    effettoNelGioco: { anteprima: 'Anello protettivo · Un impatto assorbito', upgrade: { shield: true },
      esito: 'Lo scudo è acceso e può assorbire un impatto.' },
  },
  {
    id: 4, titolo: 'Vernice spaziale', blocco: 1, concetto: 'Stringa = testo tra virgolette',
    problema: 'La verniciatura di Aurora è da scegliere.', perche: 'Il valore comanda il colore dello scafo e della scia.',
    cosaFare: 'Scrivi tra le virgolette uno dei colori blu, verde o viola.',
    spiegazione: 'Il gioco riconosce i nomi dei colori mostrati nel pannello.',
    codiceIniziale: 'colore = ""', righeModificabili: [1], variabiliFornite: [],
    scenariDiTest: [{ input: {}, atteso: { colore: { type: 'str', oneOf: ['blu', 'verde', 'viola'] } } }],
    indizi: [
      'Il nome di un colore è testo.',
      'Scegli una parola dalla tavolozza e lascia le virgolette.',
      'colore = "blu"',
    ],
    soluzioneEsempio: 'colore = "blu"',
    effettoNelGioco: { anteprima: 'Scafo e scia · Blu, verde o viola', upgrade: {}, colore: true,
      esito: 'La navicella e la sua scia hanno il colore scelto.' },
  },
  {
    id: 5, titolo: 'Ricarica energetica', blocco: 2, concetto: 'Aggiornare una variabile = salvare un nuovo valore nello stesso nome',
    problema: 'La batteria di Aurora ha solo 40 unità.', perche: 'La riserva deve guadagnarne 20.',
    cosaFare: 'Cambia lo 0 in 20 nella riga evidenziata.',
    spiegazione: 'Python legge l’energia di partenza, fa la somma e salva il totale.',
    codiceIniziale: 'energia = 40\nenergia = energia + 0', righeModificabili: [2], variabiliFornite: [],
    rigaDiInput: 1,
    scenariDiTest: [40, 25, 70].map(energia => ({ input: { energia }, atteso: { energia: { type: 'int', value: energia + 20 } } })),
    indizi: [
      '+ aggiunge unità al valore già presente.',
      'Usa la carica iniziale nel calcolo a destra di =.',
      'Scrivi energia = energia + 20.',
    ],
    soluzioneEsempio: 'energia = 40\nenergia = energia + 20',
    effettoNelGioco: { anteprima: 'Batteria · 40 → 60 unità', upgrade: {}, pannello: 'batteria',
      esito: 'La batteria ha guadagnato 20 unità in ogni prova.' },
  },
  {
    id: 6, titolo: 'Riparazione dello scafo', blocco: 2, concetto: 'Sottrazione = togliere una quantità',
    problema: 'Lo scafo ha subito 35 punti di danno.', perche: 'Aurora deve calcolare quanta protezione le resta.',
    cosaFare: 'Sostituisci 12 con il nome danni nella riga evidenziata.', spiegazione: 'danni è il nome che contiene i danni misurati. Il segno − toglie quel valore dai 100 punti dello scafo.',
    codiceIniziale: 'scafo = 100 - 12', righeModificabili: [1], variabiliFornite: ['danni'],
    scenariDiTest: [35, 12].map(danni => ({ input: { danni }, atteso: { scafo: { type: 'int', value: 100 - danni } } })),
    indizi: ['I danni riducono i 100 punti dello scafo.', 'Usa il nome del valore ricevuto al posto del 12.', 'Scrivi scafo = 100 - danni.'],
    soluzioneEsempio: 'scafo = 100 - danni',
    effettoNelGioco: { anteprima: 'Integrità dello scafo · 65/100', upgrade: {}, pannello: 'scafo',
      esito: 'L’indicatore dello scafo mostra la protezione rimasta.' },
  },
  {
    id: 7, titolo: 'Potenziamento laser', blocco: 2, concetto: '* = moltiplica',
    problema: 'Il banco di calibrazione del laser legge una potenza troppo bassa.', perche: 'Ogni livello vale 10 unità nel controllo di bordo.',
    cosaFare: 'Moltiplica 10 per livello.', spiegazione: 'Il computer fornisce livello, che cambia tra le prove.',
    codiceIniziale: 'danno = 10 * 1', righeModificabili: [1], variabiliFornite: ['livello'],
    scenariDiTest: [2, 4].map(livello => ({ input: { livello }, atteso: { danno: { type: 'int', value: 10 * livello } } })),
    indizi: ['Ogni livello vale un altro gruppo di 10.', 'Sostituisci l’1 con il nome del valore di bordo.', 'Scrivi danno = 10 * livello.'],
    soluzioneEsempio: 'danno = 10 * livello',
    effettoNelGioco: { anteprima: 'Laser · Colpi più larghi e frequenti', upgrade: { laser: true }, pannello: 'laser',
      esito: 'Calibrazione riuscita. I colpi dorati sono più larghi e ravvicinati.' },
  },
  {
    id: 8, titolo: 'Distribuzione delle risorse', blocco: 2, concetto: '// = divisione con risultato intero',
    problema: 'I motori devono ricevere la stessa quantità di energia.', perche: 'Il pannello assegna una quota uguale a ciascun motore.',
    cosaFare: 'Dividi energia_totale per motori usando //.',
    spiegazione: 'Le divisioni sono esatte e c’è sempre almeno un motore.',
    codiceIniziale: 'per_motore = energia_totale', righeModificabili: [1], variabiliFornite: ['energia_totale', 'motori'],
    scenariDiTest: [[60, 3], [48, 4], [42, 2]].map(([energia_totale, motori]) => ({
      input: { energia_totale, motori }, atteso: { per_motore: { type: 'int', value: energia_totale / motori } },
    })),
    indizi: ['Suddividi tutta l’energia in quote identiche.', 'Scrivi il totale prima di // e il numero di motori dopo.', 'Scrivi per_motore = energia_totale // motori.'],
    soluzioneEsempio: 'per_motore = energia_totale // motori',
    effettoNelGioco: { anteprima: 'Tre motori · 20 unità ciascuno', upgrade: {}, pannello: 'motori',
      esito: 'Ogni motore riceve la stessa quota.' },
  },
  {
    id: 9, titolo: 'Segnale extraterrestre', blocco: 3, concetto: 'Concatenare = unire due pezzi di testo con +',
    problema: 'Aurora ha captato un nome, ma la risposta è incompleta.', perche: 'Il saluto deve includere il nome ricevuto.',
    cosaFare: 'Unisci "Ciao " al valore di nome.', spiegazione: 'Lo spazio nelle virgolette separa il saluto dal nome.',
    codiceIniziale: 'messaggio = "Ciao " + ""', righeModificabili: [1], variabiliFornite: ['nome'],
    scenariDiTest: ['Vega', 'Luna'].map(nome => ({ input: { nome }, atteso: { messaggio: { type: 'str', value: 'Ciao ' + nome } } })),
    indizi: ['Il saluto e il nome sono due pezzi di testo.', 'Il nome ricevuto è già in una variabile e si scrive senza virgolette.', 'Scrivi messaggio = "Ciao " + nome.'],
    soluzioneEsempio: 'messaggio = "Ciao " + nome',
    effettoNelGioco: { anteprima: 'Terminale radio · Ciao Vega', upgrade: {}, pannello: 'radio',
      esito: 'Il terminale radio risponde con il nome ricevuto.' },
  },
  {
    id: 10, titolo: 'Rapporto di bordo', blocco: 3, concetto: 'str = trasforma un valore in testo',
    problema: 'La console deve mostrare quante vite restano.', perche: 'Il numero deve poter essere unito all’etichetta.',
    cosaFare: 'Sostituisci 0 con str(vite).', spiegazione: 'str(vite) trasforma il numero in testo da unire con +.',
    codiceIniziale: 'print("Vite: " + 0)', righeModificabili: [1], variabiliFornite: ['vite'],
    scenariDiTest: [3, 1, 5].map(vite => ({ input: { vite }, output: ['Vite: ' + vite] })),
    indizi: ['Python distingue il testo dai numeri.', 'Trasforma il valore di bordo con str(…) prima di unirlo all’etichetta.', 'Scrivi print("Vite: " + str(vite)).'],
    soluzioneEsempio: 'print("Vite: " + str(vite))',
    effettoNelGioco: { anteprima: 'Registro di volo · Vite: 3', upgrade: {}, pannello: 'registro',
      esito: 'La console mostra il rapporto del primo scenario.' },
  },
  {
    id: 11, titolo: 'Scudo intelligente', blocco: 4, concetto: 'if = «se», < = «minore di»',
    problema: 'Aurora ha bisogno dello scudo quando restano meno di tre vite.',
    perche: 'La difesa di emergenza deve accendersi solo quando serve.',
    cosaFare: 'Cambia in True il False della riga rientrata.',
    spiegazione: 'Le righe rientrate si eseguono se la condizione è vera. Il computer di bordo fornisce vite.',
    codiceIniziale: 'scudo = False\nif vite < 3:\n    scudo = False', righeModificabili: [3], variabiliFornite: ['vite'],
    scenariDiTest: [2, 3, 4].map(vite => ({ input: { vite }, atteso: { scudo: { type: 'bool', value: vite < 3 } } })),
    indizi: [
      'Fai attenzione a quando il computer arriva alla riga rientrata.',
      'Lo scudo parte spento. Solo la riga sotto if deve accenderlo.',
      'Lascia le prime due righe e scrivi     scudo = True nella terza.',
    ],
    soluzioneEsempio: 'scudo = False\nif vite < 3:\n    scudo = True',
    effettoNelGioco: { anteprima: 'Riserva · 2 vite: accesa · 3 e 4: spenta', upgrade: { autoShield: true }, pannello: 'riserva',
      esito: 'Lo scudo di riserva può assorbire un impatto quando restano meno di tre vite.' },
  },
  {
    id: 12, titolo: "Radar automatico", blocco: 4, concetto: "if = «se», else = «altrimenti».",
    problema: "Il radar deve distinguere un ostacolo vicino da uno lontano.", perche: "Sotto 50 unità il pannello deve invitare il pilota a deviare.",
    cosaFare: "Scrivi \"devia\" nel ramo se e \"continua\" nel ramo altrimenti.", spiegazione: "La distanza è fornita dal radar. Python sceglie un solo ramo.",
    codiceIniziale: "if distanza < 50:\n    rotta = \"\"\nelse:\n    rotta = \"\"", righeModificabili: [2, 4], variabiliFornite: ["distanza"],
    scenariDiTest: [49, 50, 80].map(distanza => ({
      input: { distanza }, atteso: { rotta: { type: 'str', value: distanza < 50 ? 'devia' : 'continua' } },
    })),
    indizi: [
      "Il secondo ramo copre i valori per cui il primo confronto è falso.",
      "Con 49 si esegue la prima riga rientrata. Con 50 si esegue la seconda.",
      "if distanza < 50:\n    rotta = \"devia\"\nelse:\n    rotta = \"continua\"",
    ],
    soluzioneEsempio: "if distanza < 50:\n    rotta = \"devia\"\nelse:\n    rotta = \"continua\"",
    effettoNelGioco: { anteprima: "Radar · Devia a 49, continua da 50", upgrade: {}, pannello: "radar",
      esito: "Il radar ha scelto la rotta corretta in tutte le prove." },
  },
  {
    id: 13, titolo: "Livelli di allarme", blocco: 4, concetto: "elif = «altrimenti, se».",
    problema: "La spia dell’energia deve distinguere tre livelli.", perche: "L’equipaggio deve riconoscere un problema prima di restare senza energia.",
    cosaFare: "Completa nell’ordine le tre etichette: rosso, giallo, verde.", spiegazione: "Rosso sotto 20, giallo da 20 a meno di 50, verde da 50 in su. Python usa il primo ramo vero.",
    codiceIniziale: "if energia < 20:\n    allarme = \"\"\nelif energia < 50:\n    allarme = \"\"\nelse:\n    allarme = \"\"", righeModificabili: [2, 4, 6], variabiliFornite: ["energia"],
    scenariDiTest: [19, 20, 49, 50, 80].map(energia => ({
      input: { energia }, atteso: { allarme: { type: 'str', value: energia < 20 ? 'rosso' : energia < 50 ? 'giallo' : 'verde' } },
    })),
    indizi: [
      "Leggi i confronti dall’alto verso il basso.",
      "Sotto 20 basta il primo confronto. Da 20 a 49 serve il secondo.",
      "if energia < 20:\n    allarme = \"rosso\"\nelif energia < 50:\n    allarme = \"giallo\"\nelse:\n    allarme = \"verde\"",
    ],
    soluzioneEsempio: "if energia < 20:\n    allarme = \"rosso\"\nelif energia < 50:\n    allarme = \"giallo\"\nelse:\n    allarme = \"verde\"",
    effettoNelGioco: { anteprima: "Allarme · Rosso, giallo o verde", upgrade: {}, pannello: "allarme",
      esito: "La spia dell’energia distingue i tre livelli." },
  },
  {
    id: 14, titolo: "Doppia sicurezza", blocco: 4, concetto: "and = «e», entrambe le condizioni devono essere vere.",
    problema: "La riserva deve proteggere Aurora senza scaricare la batteria.", perche: "Lo scudo può attivarsi solo con poche vite e carica sufficiente.",
    cosaFare: "Sostituisci False dopo and con il controllo energia > 20.", spiegazione: "> significa «maggiore di». Con 20 unità esatte l’energia è insufficiente.",
    codiceIniziale: "scudo = False\nif vite < 3 and False:\n    scudo = True", righeModificabili: [2], variabiliFornite: ["vite", "energia"],
    scenariDiTest: [[2, 21], [2, 20], [3, 21], [4, 10]].map(([vite, energia]) => ({
      input: { vite, energia }, atteso: { scudo: { type: 'bool', value: vite < 3 && energia > 20 } },
    })),
    indizi: [
      "Uno dei due sì da solo non basta.",
      "Dopo and fai un secondo confronto, questa volta sulla carica.",
      "if vite < 3 and energia > 20:",
    ],
    soluzioneEsempio: "scudo = False\nif vite < 3 and energia > 20:\n    scudo = True",
    effettoNelGioco: { anteprima: "Difesa · Via libera solo con poche vite e carica sufficiente", upgrade: {}, pannello: "sicurezza",
      esito: "La spia di difesa si accende solo quando entrambi i controlli danno il via libera." },
  },
  {
    id: 15, titolo: "Propulsori a catena", blocco: 5, concetto: "for = ripeti una volta per ogni valore.",
    problema: "I propulsori richiedono tre impulsi di avvio.", perche: "Ripetere una riga accende le tre spie in sequenza.",
    cosaFare: "Cambia 1 in 3 dentro range.", spiegazione: "Range(3) fornisce 0, 1 e 2. La riga rientrata si ripete tre volte.",
    codiceIniziale: "for i in range(1):\n    print(\"Impulso\")", righeModificabili: [1], variabiliFornite: [],
    scenariDiTest: [{ input: {}, output: ['Impulso', 'Impulso', 'Impulso'] }],
    indizi: [
      "Guarda quante volte vuoi ripetere l’istruzione rientrata.",
      "Il numero tra le parentesi di range decide quante volte parte.",
      "for i in range(3):",
    ],
    soluzioneEsempio: "for i in range(3):\n    print(\"Impulso\")",
    effettoNelGioco: { anteprima: "Propulsori · Tre impulsi", upgrade: {}, pannello: "impulsi",
      esito: "Il pannello ha registrato tre impulsi." },
  },
  {
    id: 16, titolo: "Generatore automatico", blocco: 5, concetto: "accumulare = aggiungere a un totale a ogni giro.",
    problema: "Il generatore registra cinque scariche, ma il totale rimane a zero.", perche: "Ogni scarica va aggiunta una sola volta.",
    cosaFare: "Sostituisci 0 con i nella riga del totale.", spiegazione: "Range(1, 6) va da 1 a 5. Il limite 6 è escluso.",
    codiceIniziale: "totale = 0\nfor i in range(1, 6):\n    totale = totale + 0\n    print(totale)", righeModificabili: [3], variabiliFornite: [],
    scenariDiTest: [{ input: {}, atteso: { totale: { type: 'int', value: 15 } }, output: ['1', '3', '6', '10', '15'] }],
    indizi: [
      "Il valore della scarica cambia da un giro all’altro.",
      "Aggiungi al totale il valore che il ciclo assegna a i.",
      "    totale = totale + i",
    ],
    soluzioneEsempio: "totale = 0\nfor i in range(1, 6):\n    totale = totale + i\n    print(totale)",
    effettoNelGioco: { anteprima: "Generatore · 15 unità", upgrade: {}, pannello: "generatore",
      esito: "Il generatore ha sommato una scarica per giro, per un totale di 15 unità." },
  },
  {
    id: 17, titolo: "Conto alla rovescia", blocco: 5, concetto: "while = ripeti finché la condizione è vera.",
    problema: "Il conto alla rovescia salta alcuni numeri.", perche: "Aurora deve sottrarre un solo passo prima di ciascuna nuova prova.",
    cosaFare: "Cambia 2 in 1 nella sottrazione del contatore.", spiegazione: "Quando il contatore arriva a zero il ciclo finisce. Se resta sempre positivo, il limite di tempo ferma l’esecuzione.",
    codiceIniziale: "while contatore > 0:\n    print(contatore)\n    contatore = contatore - 2", righeModificabili: [3], variabiliFornite: ["contatore"],
    scenariDiTest: [3, 2, 0].map(contatore => ({
      input: { contatore }, atteso: { contatore: { type: 'int', value: 0 } },
      output: Array.from({ length: contatore }, (_, index) => String(contatore - index)),
    })),
    indizi: [
      "Il ciclo deve avvicinarsi allo zero.",
      "Il numero successivo è sempre uno in meno del precedente.",
      "    contatore = contatore - 1",
    ],
    soluzioneEsempio: "while contatore > 0:\n    print(contatore)\n    contatore = contatore - 1",
    effettoNelGioco: { anteprima: "Conto alla rovescia · Nessun numero saltato", upgrade: {}, pannello: "conto",
      esito: "Il conto è arrivato a zero anche partendo da valori differenti." },
  },
  {
    id: 18, titolo: "Inventario spaziale", blocco: 6, concetto: "lista = più oggetti tra parentesi quadre, append = aggiungi in fondo, len = conta.",
    problema: "manca un kit nell’inventario di Aurora.", perche: "la console deve mostrare il carico e il suo nuovo totale.",
    cosaFare: "Sostituisci \"\" con \"kit\" nella riga append.", spiegazione: "inventario.append(\"kit\") aggiunge un oggetto. La riga successiva lo include nel conteggio.",
    codiceIniziale: "inventario = [\"cavo\", \"filtro\"]\ninventario.append(\"\")\ntotale = len(inventario)", righeModificabili: [2], variabiliFornite: [],
    scenariDiTest: [{ input: {}, atteso: { inventario: { type: 'list', value: ['cavo', 'filtro', 'kit'] },
      totale: { type: 'int', value: 3 } } }],
    indizi: [
      "Il kit va aggiunto in coda agli oggetti già presenti.",
      "Cambia solo il testo passato ad append.",
      "inventario = [\"cavo\", \"filtro\"]\ninventario.append(\"kit\")\ntotale = len(inventario)",
    ],
    soluzioneEsempio: "inventario = [\"cavo\", \"filtro\"]\ninventario.append(\"kit\")\ntotale = len(inventario)",
    effettoNelGioco: { anteprima: "Stiva · Tre oggetti", upgrade: {}, pannello: "stiva",
      esito: "Il kit è in stiva e il conteggio include tutti e tre gli oggetti." },
  },
  {
    id: 19, titolo: "Scansione inventario", blocco: 6, concetto: "for oggetto in inventario = guarda ogni oggetto, in in un controllo = è presente.",
    problema: "la stiva contiene oggetti diversi e il computer cerca carburante.", perche: "il registro mostra gli oggetti scansionati e conferma se il carburante c’è.",
    cosaFare: "Sostituisci \"\" con \"carburante\" nel controllo sotto la scansione.", spiegazione: "il ciclo mostra tutti gli oggetti. Il controllo successivo cerca un nome preciso nella lista.",
    codiceIniziale: "for oggetto in inventario:\n    print(oggetto)\ntrovato = False\nif \"\" in inventario:\n    trovato = True", righeModificabili: [4], variabiliFornite: ["inventario"],
    scenariDiTest: [['cavo', 'carburante'], ['kit'], [], ['cavo']].map(inventario => ({
      input: { inventario }, atteso: { trovato: { type: 'bool', value: inventario.includes('carburante') } },
      output: inventario,
    })),
    indizi: [
      "Il controllo deve chiedere se nella lista c’è un oggetto, anche se non è il primo.",
      "Il nome cercato va prima di in inventario.",
      "for oggetto in inventario:\n    print(oggetto)\ntrovato = False\nif \"carburante\" in inventario:\n    trovato = True",
    ],
    soluzioneEsempio: "for oggetto in inventario:\n    print(oggetto)\ntrovato = False\nif \"carburante\" in inventario:\n    trovato = True",
    effettoNelGioco: { anteprima: "Scansione · Spia carburante", upgrade: {}, pannello: "scansione",
      esito: "La console elenca la stiva e segnala quando trova carburante." },
  },
  {
    id: 20, titolo: "Computer in avaria", blocco: 6, concetto: "debug = trovare e correggere un errore.",
    problema: "il computer si blocca prima di mostrare il messaggio di pronto.", perche: "tre piccoli errori impediscono di leggere il comando.",
    cosaFare: "Correggi i due punti, il rientro e il nome nelle righe evidenziate.", spiegazione: "la prima segnalazione indica dove iniziare. Esegui di nuovo dopo ogni correzione.",
    codiceIniziale: "messaggio = \"Sistemi pronti\"\nif sistema_pronto\nprint(messagio)", righeModificabili: [2, 3], variabiliFornite: ["sistema_pronto"],
    scenariDiTest: [true, false, true].map(sistema_pronto => ({
      input: { sistema_pronto }, output: sistema_pronto ? ['Sistemi pronti'] : [],
    })),
    indizi: [
      "Parti dalla riga indicata dall’errore. Quando esegui di nuovo puoi scoprire quella successiva.",
      "Controlla la fine di if, gli spazi iniziali sotto if e le lettere del nome dentro print.",
      "messaggio = \"Sistemi pronti\"\nif sistema_pronto:\n    print(messaggio)",
    ],
    soluzioneEsempio: "messaggio = \"Sistemi pronti\"\nif sistema_pronto:\n    print(messaggio)",
    effettoNelGioco: { anteprima: "Terminale · Sistemi pronti", upgrade: {}, pannello: "diagnostica",
      esito: "Il terminale risponde solo quando riceve il segnale di pronto." },
  },
  {
    id: 21, titolo: "Nuovo comando", blocco: 6, concetto: "def = definisci un comando, return = restituisci un risultato.",
    problema: "Aurora ha un comando per lo scudo, ma il computer non lo usa.", perche: "il comando va chiamato per leggere il valore restituito.",
    cosaFare: "Sostituisci il False dell’ultima riga con attiva_scudo().", spiegazione: "def prepara il comando. Il nome seguito da parentesi lo esegue e return consegna il valore a chi lo ha chiamato.",
    codiceIniziale: "def attiva_scudo():\n    return True\n\nscudo = False", righeModificabili: [4], variabiliFornite: [],
    scenariDiTest: [
      { input: {}, atteso: { scudo: { type: 'bool', value: true } } },
      { input: {}, rigaAlternativa: [2, '    return False'], atteso: { scudo: { type: 'bool', value: false } } },
    ],
    indizi: [
      "Scrivere il nome di un comando non lo fa partire.",
      "Usa il nome seguito da parentesi vuote al posto del valore di partenza.",
      "def attiva_scudo():\n    return True\n\nscudo = attiva_scudo()",
    ],
    soluzioneEsempio: "def attiva_scudo():\n    return True\n\nscudo = attiva_scudo()",
    effettoNelGioco: { anteprima: "Generatore · Scudo attivo", upgrade: { shield: true }, pannello: "comando",
      esito: "Il generatore usa il valore restituito dal comando." },
  },
  {
    id: 22, titolo: "Protocollo Omega", blocco: 6, concetto: "funzione, ciclo e condizione insieme.",
    problema: "il protocollo finale deve controllare la somma degli impulsi di Aurora.", perche: "l’accesso rapido alla sfida si attiva con almeno 10 unità.",
    cosaFare: "Aggiungi ogni impulso a carica nella riga evidenziata.", spiegazione: "il ciclo somma dentro il comando. Il comando restituisce il totale e il controllo finale lo confronta con 10.",
    codiceIniziale: "def carica_banco():\n    carica = 0\n    for impulso in impulsi:\n        carica = carica + 0\n    return carica\n\ntotale = carica_banco()\nomega = False\nif totale >= 10:\n    omega = True", righeModificabili: [4], variabiliFornite: ["impulsi"],
    scenariDiTest: [[2, 3, 4], [2, 3, 5], [7, 5], []].map(impulsi => {
      const totale = impulsi.reduce((sum, impulso) => sum + impulso, 0);
      return { input: { impulsi }, atteso: { totale: { type: 'int', value: totale },
        omega: { type: 'bool', value: totale >= 10 } } };
    }),
    indizi: [
      "A ogni giro il ciclo consegna il valore di un impulso.",
      "Conserva la carica già accumulata e sostituisci lo 0 con il valore del giro.",
      "def carica_banco():\n    carica = 0\n    for impulso in impulsi:\n        carica = carica + impulso\n    return carica\n\ntotale = carica_banco()\nomega = False\nif totale >= 10:\n    omega = True",
    ],
    soluzioneEsempio: "def carica_banco():\n    carica = 0\n    for impulso in impulsi:\n        carica = carica + impulso\n    return carica\n\ntotale = carica_banco()\nomega = False\nif totale >= 10:\n    omega = True",
    effettoNelGioco: { anteprima: "Banco Omega · Accesso rapido alla sfida", upgrade: {}, pannello: "omega",
      esito: "Il banco ha verificato il totale e la soglia. Ora puoi avviare la sfida dal pannello." },
  },
];

// Anteprime e riscontri descrivono il comportamento senza anticipare il codice.
const didattica = {
  1: ['Il segno = salva il valore a destra nel nome a sinistra.', 'Propulsori · Velocità più alta', 'Controlla il valore salvato nel nome velocita. È quello che legge il propulsore.'],
  2: ['print mostra il testo tra parentesi. Le virgolette segnano dove inizia e finisce il testo.', 'Console · Compare il messaggio di avvio', 'Controlla che il testo di avvio sia tra virgolette e che maiuscole e spazi siano quelli richiesti.'],
  3: ['True significa acceso e False spento. Si scrivono con la maiuscola e senza virgolette.', 'Scudo · Anello luminoso', 'Lo scudo legge un interruttore acceso o spento. Usa un valore Python, non una parola tra virgolette.'],
  4: ['Per Python il testo va tra virgolette. Aurora riconosce blu, verde e viola.', 'Scafo e scia · La tavolozza cambia', 'Controlla che colore contenga uno dei tre nomi riconosciuti, scritto in minuscolo.'],
  5: ['Python legge prima il valore a destra di =, poi salva il risultato a sinistra. + aggiunge.', 'Batteria · La barra sale di 20 unità', 'Parti dalla carica presente in energia e aggiungi la stessa quantità a ogni prova.'],
  6: ['danni è il nome che contiene i danni misurati. Il segno − toglie quel valore dai 100 punti dello scafo.', 'Scafo · La parte integra è quella che rimane dopo i danni', 'Sottrai dai 100 punti il valore contenuto in danni. Il numero dei danni cambia tra una prova e l’altra.'],
  7: ['* significa moltiplica. Usa il livello letto dal computer per contare gruppi da 10.', 'Laser · La calibrazione rende i colpi più larghi e frequenti', 'Calcola la potenza usando il livello di bordo. Con un livello diverso deve cambiare anche il risultato.'],
  8: ['// divide e dà un intero. Qui puoi distribuire tutta l’energia senza avanzarne.', 'Motori · Tutti ricevono la stessa quota', 'Usa il totale e il numero di motori della prova. La quota deve essere un numero intero.'],
  9: ['Tra due testi, + li unisce. Lo spazio alla fine del saluto separa le due parole.', 'Radio · Il saluto contiene il nome ricevuto', 'Usa il nome fornito dal radar e controlla lo spazio tra il saluto e il nome.'],
  10: ['str trasforma un numero in testo. Così + può unire l’etichetta al valore.', 'Registro · Il rapporto cambia con le vite', 'Trasforma il valore di vite in testo prima di unirlo all’etichetta.'],
  11: ['if significa «se» e < significa «minore di». La riga rientrata parte solo se il confronto è vero.', 'Scudo · Si attiva quando restano poche vite', 'Lo scudo deve partire spento e cambiare solo nel ramo eseguito con meno di tre vite.'],
  12: ['if significa «se», else «altrimenti». Si esegue solo uno dei due blocchi rientrati.', 'Radar · Cambia la freccia quando l’ostacolo è vicino', 'Distingui la distanza sotto la soglia da quella uguale o superiore.'],
  13: ['elif significa «altrimenti, se». Python prova i confronti in ordine e usa il primo vero.', 'Allarme · La spia ha tre livelli', 'Verifica le etichette dei tre rami. Un valore esattamente sulla soglia passa al ramo successivo.'],
  14: ['and significa «e». Entrambi i confronti devono essere veri. > significa «maggiore di».', 'Difesa · Via libera quando entrambi i controlli passano', 'Verifica insieme le vite rimaste e la carica. Un solo confronto vero non basta.'],
  15: ['for ripete la riga rientrata per ogni valore di range. Il numero tra parentesi indica quanti giri fare.', 'Propulsori · Le spie si accendono una alla volta', 'Conta i giri necessari. Ogni giro deve produrre un solo impulso.'],
  16: ['Il ciclo cambia i a ogni giro. range(1, 6) va da 1 a 5 perché esclude il limite finale.', 'Generatore · Il totale cresce a ogni scarica', 'Al totale precedente aggiungi il valore del giro corrente. Ogni riga stampata mostra il nuovo totale.'],
  17: ['while significa «finché». Il ciclo continua mentre il valore è sopra zero. Se non finisce, Python viene fermato.', 'Conto · Il display scende senza saltare numeri', 'Riduci il contatore di un solo passo a ogni giro e controlla quando si ferma.'],
  18: ['append aggiunge un oggetto alla fine della lista. len conta gli oggetti presenti.', 'Stiva · Compare un nuovo oggetto e il contatore sale', 'Conserva l’ordine degli oggetti già presenti. Il kit va aggiunto una sola volta, in fondo.'],
  19: ['for visita gli oggetti uno alla volta. In un confronto, in controlla se un oggetto è presente nella lista.', 'Stiva · Il registro elenca gli oggetti e segnala il carburante', 'Cerca il carburante per nome. La spia deve restare spenta anche se in stiva ci sono altri oggetti.'],
  20: ['Debug significa trovare e correggere errori. Controlla i due punti, il rientro e le lettere dei nomi.', 'Terminale · Il messaggio appare solo con il segnale di pronto', 'Il messaggio va stampato solo nel blocco che parte quando il sistema è pronto.'],
  21: ['def definisce il comando. Le parentesi dopo il suo nome lo avviano e return restituisce il risultato.', 'Generatore · Lo scudo segue il valore restituito dal comando', 'Usa il risultato del comando per aggiornare lo scudo. Quel risultato può essere acceso oppure spento.'],
  22: ['Il ciclo somma gli impulsi, return restituisce il totale e >= verifica se raggiunge o supera la soglia.', 'Banco Omega · L’indicatore segue il totale degli impulsi', 'Aggiungi l’impulso del giro alla carica già accumulata. La somma deve funzionare anche se cambia la lista.'],
};

for (const mission of missions) {
  [mission.spiegazione, mission.anteprimaDidattica, mission.riscontro] = didattica[mission.id];
}

// Spiegazioni per studenti senza conoscenze di programmazione.
const beginnerLessons = {
  1: [
    'Alla riga 1 cancella il numero 5 e scrivi 10. Lascia tutto il resto com’è.',
    'Una variabile è come una scatola con un nome, nella quale possiamo conservare un numero o un’altra informazione. Qui la scatola si chiama velocita. Il segno = serve a inserire un valore nella scatola.',
    'La navicella passerà dalla velocità 5 alla velocità 10.'
  ],
  2: [
    'Alla riga 1 scrivi Aurora online nello spazio tra le due virgolette. Non cancellare le virgolette o le parentesi.',
    'print è un comando che mostra un messaggio sullo schermo. Le virgolette indicano dove inizia e dove finisce il testo.',
    'Sullo schermo apparirà il messaggio Aurora online.'
  ],
  3: [
    'Alla riga 1 cancella False e scrivi True, rispettando la T maiuscola.',
    'In Python True significa vero e False significa falso. In questa missione funzionano come un interruttore: True accende lo scudo, False lo spegne.',
    'Lo scudo sarà acceso e potrà proteggere la navicella.'
  ],
  4: [
    'Alla riga 1 scrivi tra le virgolette uno di questi colori: blu, verde, viola. Scegli quello che preferisci.',
    'Una stringa è semplicemente un testo. In Python il testo si scrive tra virgolette. Non cancellarle e scrivi il colore in minuscolo.',
    'La navicella e la sua scia assumeranno il colore scelto.'
  ],
  5: [
    'Lascia invariata la prima riga. Nella seconda riga sostituisci lo 0 con il numero 20.',
    'La prima riga contiene la carica iniziale della batteria. Nella seconda Python prende la carica precedente, aggiunge 20 e conserva il nuovo totale. Se parti da 40, ottieni 60. Se parti da 25, ottieni 45.',
    'La batteria guadagnerà 20 unità qualunque sia la carica iniziale.'
  ],
  6: [
    'Nella riga scafo = 100 - 12 cancella il numero 12 e scrivi danni, senza virgolette.',
    'Il computer conosce già il numero dei danni e lo conserva nella variabile danni (una scatola che contiene un valore). Se danni contiene 35, il calcolo sarà 100 meno 35, cioè 65. Usando il nome danni, il calcolo funziona anche quando quel numero cambia.',
    'Il computer calcolerà automaticamente la protezione rimasta.'
  ],
  7: [
    'Nella riga danno = 10 * 1 sostituisci il numero 1 con la parola livello, senza virgolette.',
    'In Python il simbolo * significa moltiplicazione. Il computer conosce già il livello del laser. Se il livello è 2, il risultato sarà 10 per 2, cioè 20. Se è 4, sarà 40.',
    'Il computer calcolerà la potenza del laser in base al livello.'
  ],
  8: [
    'Alla fine della riga 1, dopo energia_totale, aggiungi uno spazio, due barre //, un altro spazio e la parola motori.',
    'Il computer conosce già l’energia totale e il numero di motori. Le due barre // indicano una divisione con risultato intero (senza decimali). Per esempio, 60 unità divise tra 3 motori danno 20 unità ciascuno.',
    'Tutti i motori riceveranno la stessa quantità di energia.'
  ],
  9: [
    'Alla riga 1 cancella le due virgolette vuote dopo il simbolo + e scrivi nome, senza virgolette. Lascia intatto il testo "Ciao ".',
    'Il simbolo + può anche unire due testi. Il computer ha già conservato il nome ricevuto nella variabile nome. Se contiene Vega, unendo "Ciao " e nome otterrai "Ciao Vega".',
    'La radio saluterà automaticamente chiunque invii un segnale.'
  ],
  10: [
    'Alla riga 1 sostituisci soltanto il numero 0 con str(vite). Lascia il resto invariato.',
    'Python distingue i numeri dal testo. Il comando str trasforma un numero in testo. Se vite contiene il numero 3, str(vite) lo trasforma nel testo "3", che possiamo unire al messaggio "Vite: ".',
    'Lo schermo mostrerà il numero di vite rimaste.'
  ],
  11: [
    'Modifica soltanto la riga 3. Sostituisci False con True. Mantieni i quattro spazi all’inizio della riga.',
    'if significa SE. Il simbolo < significa minore di. Python legge: se le vite sono meno di 3, esegui la riga sottostante. Gli spazi iniziali indicano quale istruzione appartiene al SE.',
    'Con 2 vite lo scudo si accenderà. Con 3 o più resterà spento.'
  ],
  12: [
    'Alla riga 2 scrivi devia tra le virgolette. Alla riga 4 scrivi continua tra le virgolette. Non modificare gli spazi iniziali.',
    'if significa SE ed else significa ALTRIMENTI. È come scegliere tra due strade: se l’ostacolo è a meno di 50 unità, devia; altrimenti continua.',
    'Il radar sceglierà automaticamente la direzione corretta.'
  ],
  13: [
    'Scrivi rosso tra le virgolette della riga 2, giallo nella riga 4 e verde nella riga 6.',
    'if significa SE, elif significa ALTRIMENTI SE ed else significa ALTRIMENTI. Python controlla le possibilità dall’alto verso il basso. Sotto 20: rosso. Da 20 a 49: giallo. Da 50 in poi: verde.',
    'La spia mostrerà il colore corrispondente alla carica.'
  ],
  14: [
    'Alla riga 2 cancella soltanto False, dopo la parola and, e scrivi energia > 20. Lascia i due punti alla fine della riga.',
    'and significa E. Per accendere lo scudo devono essere vere due condizioni contemporaneamente: avere meno di 3 vite E avere più di 20 unità di energia. Il simbolo > significa maggiore di.',
    'Lo scudo si accenderà soltanto quando entrambe le condizioni saranno rispettate.'
  ],
  15: [
    'Alla riga 1 sostituisci il numero 1 dentro range(1) con il numero 3.',
    'for è un comando che permette di ripetere un’azione. range(3) produce tre numeri: 0, 1 e 2. Per ciascuno Python esegue la riga sottostante. In questo caso stampa Impulso tre volte.',
    'Il computer invierà tre impulsi consecutivi.'
  ],
  16: [
    'Alla riga 3, dopo totale +, sostituisci lo 0 con la lettera i minuscola. Non modificare gli spazi iniziali.',
    'Il comando for ripete un’azione. Qui la variabile i assume uno dopo l’altro i valori 1, 2, 3, 4 e 5. Ogni volta dobbiamo aggiungere i al totale precedente. Otterremo prima 1, poi 3, poi 6, poi 10 e infine 15.',
    'Il generatore sommerà automaticamente tutte e cinque le scariche.'
  ],
  17: [
    'Alla riga 3 sostituisci il numero 2 con il numero 1. Lascia invariato il resto.',
    'while significa FINCHÉ. Python ripete le istruzioni sottostanti finché il contatore è maggiore di zero. Sottraendo 1 a ogni ripetizione, partendo da 3 vedremo 3, 2, 1 e poi il conto terminerà.',
    'Il conto alla rovescia funzionerà senza saltare numeri.'
  ],
  18: [
    'Alla riga 2 scrivi kit tra le virgolette vuote. Non modificare le altre righe.',
    'Una lista è un insieme di elementi, scritti tra parentesi quadre. append aggiunge un nuovo elemento alla fine della lista. len conta quanti elementi contiene. Partiamo da due oggetti e ne aggiungiamo uno.',
    'L’inventario conterrà cavo, filtro e kit: tre oggetti.'
  ],
  19: [
    'Alla riga 4 scrivi carburante tra le virgolette vuote. Lascia tutto il resto invariato.',
    'Le prime due righe mostrano gli oggetti presenti nella stiva, uno alla volta. Nella quarta riga la parola in significa È PRESENTE IN. Python controlla se il carburante si trova nella lista.',
    'Il computer segnalerà se nella stiva è presente del carburante.'
  ],
  20: [
    'Correggi tre errori: aggiungi i due punti alla fine della riga 2; inserisci quattro spazi all’inizio della riga 3; nella riga 3 correggi messagio in messaggio, con due g.',
    'Il debug è la ricerca e correzione degli errori. Python richiede i due punti dopo if, gli spazi iniziali per le istruzioni che dipendono da if e i nomi delle variabili scritti sempre nello stesso modo.',
    'Il computer mostrerà Sistemi pronti quando riceverà il segnale di avvio.'
  ],
  21: [
    'Alla riga 4 sostituisci False con attiva_scudo(). Ricordati entrambe le parentesi.',
    'Una funzione è un gruppo di istruzioni a cui diamo un nome, come un pulsante che possiamo usare quando serve. def crea la funzione, return consegna il suo risultato. Scrivere il nome seguito dalle parentesi fa partire la funzione.',
    'Lo scudo utilizzerà il risultato prodotto dalla funzione.'
  ],
  22: [
    'Alla riga 4 sostituisci lo 0 dopo carica + con la parola impulso, senza virgolette. Non cambiare gli spazi iniziali.',
    'La funzione carica_banco contiene un ciclo (istruzioni ripetute) che legge tutti gli impulsi disponibili. Ogni impulso deve essere aggiunto alla carica precedente. return consegna il totale. Infine if controlla se il totale è almeno 10. Il simbolo >= significa maggiore o uguale.',
    'Il computer sommerà gli impulsi e verificherà se è possibile attivare il Protocollo Omega.'
  ]
};

for (const mission of missions) {
  const [instruction, explanation, result] = beginnerLessons[mission.id];

  mission.cosaFare = instruction;
  mission.spiegazione = explanation;
  mission.anteprimaDidattica = result;

  const originalHints = mission.indizi;
  mission.indizi = [
    explanation,
    instruction,
    'Soluzione completa:\n' + mission.soluzioneEsempio
  ];
  mission.riscontro = 'Non preoccuparti, puoi riprovare. ' + instruction;
}

// Obiettivi autonomi: la soluzione resta negli indizi.
const learningGoals = [
  'Porta la velocità della navicella a 10.',
  'Fai comparire il messaggio Aurora online.',
  'Accendi lo scudo della navicella.',
  'Personalizza Aurora scegliendo tra blu, verde e viola.',
  'Aumenta di 20 unità la carica della batteria.',
  'Calcola la protezione rimasta usando i danni rilevati.',
  'Calcola la potenza del laser: 10 unità per ogni livello.',
  'Distribuisci equamente tutta l’energia tra i motori.',
  'Crea un saluto che includa il nome ricevuto.',
  'Mostra il messaggio Vite: seguito dalle vite rimaste.',
  'Accendi lo scudo soltanto quando restano meno di 3 vite.',
  'Fai deviare Aurora sotto 50 unità di distanza; altrimenti falla continuare.',
  'Imposta l’allarme: rosso sotto 20, giallo da 20 a 49, verde da 50.',
  'Attiva lo scudo soltanto con meno di 3 vite e più di 20 unità di energia.',
  'Fai inviare esattamente tre impulsi consecutivi.',
  'Somma progressivamente le cinque scariche del generatore.',
  'Completa il conto alla rovescia senza saltare numeri.',
  'Aggiungi un kit all’inventario e aggiorna il conteggio.',
  'Verifica se nella stiva è presente del carburante.',
  'Correggi gli errori che impediscono al computer di funzionare.',
  'Utilizza il risultato della funzione per controllare lo scudo.',
  'Somma tutti gli impulsi per verificare se il Protocollo Omega può attivarsi.'
];

for (const mission of missions) {
  mission.cosaFare = learningGoals[mission.id - 1];
  mission.riscontro = 'Non è ancora corretto. Rileggi la spiegazione, controlla il codice e riprova. Se necessario, consulta un indizio.';
}
