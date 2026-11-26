import { limits } from '../python/protocol.mjs';

const typeNames = { int: 'un intero', bool: 'un booleano', str: 'una stringa' };
const showValue = value => typeof value === 'boolean' ? (value ? 'True' : 'False') : JSON.stringify(value);
const errorLabels = {
  SYNTAX: 'Errore di sintassi', INDENTATION: 'Errore di sintassi', VARIABLE_TYPE: 'Tipo errato',
  TYPE: 'Tipo errato', INTERPRETER_TIMEOUT: 'Tempo scaduto', WORKER_TIMEOUT: 'Tempo scaduto',
};

function executionFailure(result, offset, output) {
  const { error } = result;
  const line = error.line && error.line - offset;
  return { ok: false, output, message: [
    (errorLabels[error.code] ?? 'Errore di esecuzione') + '. ' + error.message,
    error.variable ? `Variabile: ${error.variable}.` : '',
    typeNames[error.expected] ? `Usa ${typeNames[error.expected]}.` : '',
    line > 0 ? `Riga ${line}.` : '',
  ].filter(Boolean).join(' ') };
}

export async function validateMission(mission, source, run, isCurrent = () => true) {
  let output = '';
  const observations = [];
  const fail = message => ({ ok: false, output, message, observations });
  for (const scenario of mission.cases ?? [{ value: mission.value }]) {
    const fixture = Object.entries(scenario.input ?? {});
    const prefix = fixture.map(([name, value]) => name + ' = ' + JSON.stringify(value) + '\n').join('');
    const result = await run(prefix + source);
    if (!isCurrent()) return null;
    if (result.output) output = (output + (scenario.label ? scenario.label + ':\n' : '') + result.output).slice(0, limits.output);
    if (!result.ok) return { ...executionFailure(result, fixture.length, output), observations };
    const { variables } = result;
    const actual = variables[mission.variable];
    observations.push({ label: scenario.label, value: actual?.value, values: variables, output: result.output });
    if (fixture.some(([name, value]) => typeof value === 'number' && variables[name]?.value !== value)) {
      return fail(mission.id === 7 ? 'Lascia invariato il valore di vite fornito dal computer.' : 'Lascia invariati i dati forniti dal computer di bordo.');
    }
    if (mission.budget) {
      const amounts = mission.budget.map(name => variables[name]);
      if (amounts.some(item => item?.type !== 'int' || item.value < 2) ||
          amounts.reduce((sum, item) => sum + item.value, 0) !== 12) {
        return fail('Assegna almeno 2 unità intere a ciascun sistema e usa esattamente 12 unità in totale.');
      }
      continue;
    }
    if (!actual) return fail(`Assegna un valore a ${mission.variable} prima di concludere il programma.`);
    if (actual.type !== mission.type) return fail(`Tipo errato. ${mission.variable} deve contenere ${typeNames[mission.type]}.`);
    if (actual.value !== scenario.value) {
      return fail(`${scenario.label ? scenario.label + ', ' : ''}${mission.variable} vale ${showValue(actual.value)}. L’obiettivo è ${showValue(scenario.value)}.`);
    }
    if (Object.entries(scenario.secondary ?? {}).some(([name, value]) => variables[name]?.type !== 'int' || variables[name].value !== value)) {
      return fail('Il totale della carica deve corrispondere alla somma degli impulsi.');
    }
    if (mission.trace && result.output.trim().split(/\s+/).join(',') !== mission.trace.join(',')) {
      return fail('Stampa l’energia dopo ogni giro. Il pannello attende i tre valori 3, 6 e 9.');
    }
  }
  return { ok: true, output, message: mission.success, observations };
}
