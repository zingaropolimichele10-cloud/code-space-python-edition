import { limits } from '../python/protocol.mjs';

const typeNames = { int: 'un intero', bool: 'un booleano', str: 'una stringa', list: 'una lista' };
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
  OUTPUT_LIMIT: 'La console ha ricevuto troppo testo. Controlla quante volte stampi e se il ciclo può finire.',
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
  const cases = [];
  let scenarioLabel = '';
  const fail = message => ({ ok: false, output, message: scenarioLabel + message });
  const row = mission.righeModificabili[0];
  for (const scenario of mission.scenariDiTest) {
    const fixture = Object.entries(scenario.input).map(([key, value]) => `${key} = ${pythonLiteral(value)}\n`);
    const inputs = Object.entries(scenario.input).map(([key, value]) => `${key} = ${showValue(value)}`);
    scenarioLabel = inputs.length ? 'Prova con ' + inputs.join(', ') + '. '
      : scenario.rigaAlternativa ? 'Prova con il comando di bordo che restituisce False. ' : '';
    let program = source;
    // Varia il dato nella riga protetta del modello, conservando i numeri di riga.
    if ((mission.rigaDiInput || scenario.rigaAlternativa) && source.trim()) {
      const lines = source.split('\n');
      const [rowNumber, replacement] = scenario.rigaAlternativa ?? [mission.rigaDiInput, fixture.shift().trimEnd()];
      lines[rowNumber - 1] = replacement;
      program = lines.join('\n');
    }
    const result = await run(fixture.join('') + program);
    if (!isCurrent()) return null;
    output = (output + (result.output ?? '')).slice(0, limits.output);
    if (!result.ok) return executionFailure(result, source, fixture.length, output);
    if (!source.trim()) return fail(`Riga ${row}. Scrivi il codice richiesto prima di eseguire.`);
    const { variables } = result;
    for (const [name, expected] of Object.entries(scenario.atteso ?? {})) {
      const actual = variables[name];
      if (!actual) return fail(`Riga ${row}. Assegna un valore a ${name}.`);
      if (actual.type !== expected.type) return fail(`Riga ${row}. Tipo errato. ${name} deve contenere ${typeNames[expected.type]}.`);
      const matches = expected.oneOf ? expected.oneOf.includes(actual.value)
        : expected.type === 'list' ? actual.value.length === expected.value.length
          && actual.value.every((item, index) => item === expected.value[index])
          : actual.value === expected.value;
      if (!matches) {
        return fail(`Riga ${row}. ${name} vale ${showValue(actual.value)}. Controlla che il valore sia ${(expected.oneOf ?? [expected.value]).map(showValue).join(' oppure ')}.`);
      }
    }
    if (scenario.output) {
      const lines = result.output.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
      if (scenario.output.length ? lines.length !== scenario.output.length || lines.some((line, i) => line !== scenario.output[i])
        : result.output.length > 0) {
        return fail(`Riga ${row}. Controlla il testo stampato da print, l’ordine delle righe e gli spazi.`);
      }
    }
    cases.push({ input: scenario.input, variables, output: result.output ?? '' });
  }
  return { ok: true, output: cases[0].output, variables: cases[0].variables, cases, message: mission.effettoNelGioco.esito };
}
