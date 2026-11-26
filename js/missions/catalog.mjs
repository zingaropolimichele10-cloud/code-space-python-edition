export const missions = [
  {
    id: 1, title: 'Turbo spaziale', concept: 'Variabili numeriche',
    goal: 'Porta la velocità della navicella a 10.',
    explanation: 'Una variabile conserva un valore. Con il segno = assegni il risultato a destra al nome a sinistra.',
    source: 'velocita = 5', variable: 'velocita', type: 'int', value: 10, upgrade: { speed: 10 },
    hints: [
      'La variabile velocita deve contenere un numero intero.',
      'Modifica il valore a destra di = nella riga che comincia con velocita.',
      'velocita = 10\nIl segno = assegna l’intero 10. Anche 5 * 2 produce lo stesso intero.',
    ],
    success: 'velocita contiene l’intero 10. La navicella ora si muove al doppio della velocità iniziale.',
  },
  {
    id: 2, title: 'Riparazione di emergenza', concept: 'Variabili numeriche',
    goal: 'Imposta le vite a 5.',
    explanation: 'Puoi assegnare un nuovo valore alla stessa variabile. Per contare le vite si usa un numero intero.',
    source: 'vite = 3', variable: 'vite', type: 'int', value: 5, upgrade: { maxLives: 5 },
    hints: [
      'Le vite si contano con numeri interi, senza virgolette.',
      'Cambia il numero dopo vite =, usando il valore indicato nell’obiettivo.',
      'vite = 5\nL’assegnazione conserva l’intero 5 nella variabile vite.',
    ],
    success: 'vite contiene l’intero 5. L’HUD mostra cinque vite e la navicella è riparata.',
  },
  {
    id: 3, title: 'Scudo energetico', concept: 'Booleani',
    goal: 'Attiva lo scudo assegnando True a scudo.',
    explanation: 'Un booleano rappresenta uno stato: True per acceso e False per spento.',
    source: 'scudo = False', variable: 'scudo', type: 'bool', value: true, upgrade: { shield: true },
    hints: [
      'Scegli il valore booleano che indica acceso.',
      'Sostituisci False con True. In Python la T iniziale è maiuscola.',
      'scudo = True\nTrue senza virgolette è un booleano. Lo scudo assorbe un impatto e si ricarica in 18 secondi di volo.',
    ],
    success: 'scudo contiene il booleano True. La protezione è attiva e si ricarica dopo ogni impatto assorbito.',
  },
  {
    id: 4, title: 'Camuffamento', concept: 'Stringhe',
    goal: 'Imposta il colore della navicella a “blu”.',
    explanation: 'Una stringa conserva del testo. Le virgolette delimitano il testo da assegnare.',
    source: 'colore = "rosso"', variable: 'colore', type: 'str', value: 'blu', upgrade: { color: 'blu' },
    hints: [
      'Il colore è una parola. Usa una stringa.',
      'Sostituisci rosso con blu lasciando le virgolette attorno alla parola.',
      'colore = "blu"\nLe virgolette fanno sì che Python legga blu come testo.',
    ],
    success: 'colore contiene la stringa “blu”. Il rivestimento della navicella è cambiato.',
  },
  {
    id: 5, title: 'Protezione automatica', concept: 'Condizioni if', optional: true,
    goal: 'Accendi lo scudo solo quando le vite sono inferiori a 3.',
    explanation: 'Il Centro fornisce le vite. Il blocco sotto if viene eseguito solo quando la sua condizione è vera. Il rientro fa parte del codice.',
    source: 'scudo = False\nif vite < 3:\n    pass',
    variable: 'scudo', type: 'bool', upgrade: { autoShield: true },
    hints: [
      'Con meno di 3 vite entra nel blocco if. Fuori dal blocco lascia lo scudo spento.',
      'Al posto di pass scrivi un’assegnazione a scudo. Mantieni i quattro spazi del rientro.',
      'scudo = False\nif vite < 3:\n    scudo = True\n\nL’assegnazione nel blocco si esegue con 2 vite e si salta con 4.',
    ],
    success: 'Con 2 vite lo scudo è attivo e con 4 è spento. La riserva d’emergenza protegge una volta per partenza o ripresa dal checkpoint.',
  },
];
