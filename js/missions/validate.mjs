import { limits } from '../python/protocol.mjs';

const typeNames = { int: 'un intero', bool: 'un booleano', str: 'una stringa' };
const showValue = value => typeof value === 'boolean' ? (value ? 'True' : 'False') : JSON.stringify(value);
const pythonLiteral = value => typeof value === 'boolean' ? showValue(value)
  : Array.isArray(value) ? '[' + value.map(pythonLiteral).join(', ') + ']'
  : value === null ? 'None' : JSON.stringify(value);

const feedback = {
  SYNTAX: 'Errore di sintassi. Controlla i segni di questa riga.',
  INDENTATION: 'Errore di sintassi. Metti quattro spazi all’inizio della riga del blocco.',
  NAME: 'Errore di esecuzione. Controlla che il nome sia scritto come quando gli hai dato un valore.',
  TYPE: 'Tipo errato. Controlla i valori. Per unire testo e numero, trasforma prima il numero in testo con str.',
  VARIABLE_TYPE: 'Tipo errato. Controlla il valore assegnato.',
  RESOURCE_LIMIT: 'Il programma richiede troppe risorse. Riduci le dimensioni dei valori.',
  SOURCE_LIMIT: 'Il codice supera il limite di 8.192 caratteri.',
  OUTPUT_LIMIT: 'La console ha ricevuto troppo testo. Controlla quante volte stampi.',
  DIVISION_BY_ZERO: 'Controlla il divisore: è zero.',
  INTERPRETER_TIMEOUT: 'Tempo scaduto. Controlla che il ciclo possa finire.',
  WORKER_TIMEOUT: 'Tempo scaduto. Controlla che il ciclo possa finire.',
};

function executionFailure(result, source, offset, output) {
  const { error } = result;
  let line = error.line - offset;
  let message = feedback[error.code] ?? 'Il programma si è fermato qui. Controlla questa riga o prova un indizio.';
  if (error.code === 'SYNTAX' && line > 0) {
    const lines = source.split('\n');
    const missingColon = /^\s*(?:if|elif|else|for|while|def)\b[^:#]+(?:#.*)?$/;
    const at = [line - 1, line - 2].find(index => missingColon.test(lines[index] ?? ''));
    if (at !== undefined) {
      message = 'Errore di sintassi. Aggiungi i due punti alla fine di questa riga.';
      line = at + 1;
    }
  }
  return { ok: false, output, message: [
    message,
    error.variable ? `Variabile: ${error.variable}.` : '',
    typeNames[error.expected] ? `Usa ${typeNames[error.expected]}.` : '',
    line > 0 ? `Riga ${line}.` : '',
  ].filter(Boolean).join(' ') };
}

export async function validateMission(mission, source, run, isCurrent = () => true) {
  let output = '';
  let variables;
  const fail = message => ({ ok: false, output, message });
  const row = mission.righeModificabili[0];
  for (const scenario of mission.scenariDiTest) {
    const fixture = Object.entries(scenario.input).map(([key, value]) => `${key} = ${pythonLiteral(value)}\n`);
    const result = await run(fixture.join('') + source);
    if (!isCurrent()) return null;
    output = (output + (result.output ?? '')).slice(0, limits.output);
    if (!result.ok) return executionFailure(result, source, fixture.length, output);
    if (!source.trim()) return fail(`Riga ${row}. Scrivi il codice richiesto prima di eseguire.`);
    variables = result.variables;
    for (const [name, expected] of Object.entries(scenario.atteso ?? {})) {
      const actual = variables[name];
      if (!actual) return fail(`Riga ${row}. Assegna un valore a ${name}.`);
      if (actual.type !== expected.type) return fail(`Riga ${row}. Tipo errato. ${name} deve contenere ${typeNames[expected.type]}.`);
      if (expected.oneOf ? !expected.oneOf.includes(actual.value) : actual.value !== expected.value) {
        return fail(`Riga ${row}. ${name} vale ${showValue(actual.value)}. Controlla che il valore sia ${(expected.oneOf ?? [expected.value]).map(showValue).join(' oppure ')}.`);
      }
    }
    if (scenario.output) {
      const lines = result.output.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
      if (scenario.output.length ? lines.length !== scenario.output.length || lines.some((line, i) => line !== scenario.output[i])
        : result.output.length > 0) {
        return fail(`Riga ${row}. Controlla il messaggio mostrato da print e gli spazi.`);
      }
    }
  }
  return { ok: true, output, variables, message: mission.effettoNelGioco.esito };
}
