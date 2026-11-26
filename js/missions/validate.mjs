import { limits } from '../python/protocol.mjs';

const typeNames = { int: 'un intero', bool: 'un booleano', str: 'una stringa' };
const showValue = value => typeof value === 'boolean' ? (value ? 'True' : 'False') : JSON.stringify(value);
const errorLabels = {
  SYNTAX: 'Errore di sintassi', INDENTATION: 'Errore di sintassi', VARIABLE_TYPE: 'Tipo errato',
  TYPE: 'Tipo errato', INTERPRETER_TIMEOUT: 'Tempo scaduto', WORKER_TIMEOUT: 'Tempo scaduto',
};

function executionFailure(result, fixture, output) {
  const { error } = result;
  const line = error.line && error.line - Number(fixture);
  const label = errorLabels[error.code] ?? 'Errore di esecuzione';
  return { ok: false, output, message: [
    `${label}. ${error.message}`,
    error.variable ? `Variabile: ${error.variable}.` : '',
    typeNames[error.expected] ? `Usa ${typeNames[error.expected]}.` : '',
    line > 0 ? `Riga ${line}.` : '',
  ].filter(Boolean).join(' ') };
}

export async function validateMission(mission, source, run, isCurrent = () => true) {
  const cases = mission.optional ? [{ vite: 2, value: true }, { vite: 4, value: false }]
    : [{ value: mission.value }];
  let output = '';
  for (const { vite, value } of cases) {
    const fixture = vite !== undefined;
    const result = await run(fixture ? `vite = ${vite}\n${source}` : source);
    if (!isCurrent()) return null;
    if (result.output) {
      output = (output + (fixture ? `Con ${vite} vite:\n` : '') + result.output).slice(0, limits.output);
    }
    if (!result.ok) return executionFailure(result, fixture, output);

    if (fixture && (result.variables.vite?.type !== 'int' || result.variables.vite.value !== vite)) {
      return { ok: false, output, message: 'Lascia invariato il valore di vite fornito dal Centro e modifica solo lo scudo.' };
    }
    const actual = result.variables[mission.variable];
    if (!actual) return { ok: false, output, message: `Assegna un valore a ${mission.variable} prima di concludere il programma.` };
    if (actual.type !== mission.type) {
      return { ok: false, output, message: `Tipo errato. ${mission.variable} deve contenere ${typeNames[mission.type]}.` };
    }
    if (actual.value !== value) {
      const scenario = fixture ? `Con ${vite} vite, ` : '';
      return { ok: false, output, message: `${scenario}${mission.variable} vale ${showValue(actual.value)}. L’obiettivo è ${showValue(value)}. Rivedi l’assegnazione o usa un indizio.` };
    }
  }
  return { ok: true, output, message: mission.success };
}
