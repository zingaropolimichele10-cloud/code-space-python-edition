export const limits = Object.freeze({
  source: 8192,
  output: 4096,
  variableText: 512,
  variables: 32,
  interpreterMs: 400,
  workerMs: 3000,
  sequence: 65536,
  sequenceBudget: 1048576,
  integerExpansion: 4096,
});

const messages = {
  SYNTAX: 'Sintassi non valida. Controlla i simboli e i due punti.',
  NAME: 'Nome non definito. Assegna un valore alla variabile prima di usarla.',
  INDENTATION: 'Rientro non valido. Usa quattro spazi all’inizio delle righe del blocco.',
  TYPE: 'Operazione incompatibile con il tipo di valore.',
  DIVISION_BY_ZERO: 'Non è possibile dividere per zero.',
  IMPORT: 'Le importazioni sono disattivate in questo prototipo.',
  INPUT: 'L’input interattivo è disattivato in questo prototipo.',
  SOURCE_LIMIT: 'Il codice supera il limite di 8.192 caratteri.',
  OUTPUT_LIMIT: 'L’output supera il limite di 4.096 caratteri.',
  RESOURCE_LIMIT: 'L’operazione richiede troppe risorse. Riduci le dimensioni dei valori.',
  VARIABLE_LIMIT: 'Una variabile supera il limite previsto per l’esportazione.',
  VARIABLE_TYPE: 'Il tipo della variabile non corrisponde a quello richiesto.',
  INTERPRETER_TIMEOUT: 'Il programma ha superato il tempo di esecuzione. Controlla i cicli.',
  WORKER_TIMEOUT: 'L’interprete è stato arrestato perché il programma non rispondeva.',
  WORKER_ERROR: 'Impossibile avviare o utilizzare l’interprete.',
  CANCELLED: 'Esecuzione sostituita da una richiesta più recente.',
  PYTHON_ERROR: 'Il programma si è interrotto. Controlla la riga indicata.',
};

export function failure(code, details = {}) {
  return { ok: false, error: { code, message: messages[code], ...details } };
}
