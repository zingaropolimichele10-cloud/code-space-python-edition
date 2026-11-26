import { createPythonRunner } from './runner.mjs';

const form = document.querySelector('form');
const source = document.querySelector('#codice');
const status = document.querySelector('#stato');
const output = document.querySelector('#output');
const variables = document.querySelector('#variabili');
const run = createPythonRunner();
const typeNames = { int: 'intero', bool: 'booleano', float: 'decimale', str: 'stringa', NoneType: 'nessun valore' };
let revision = 0;

function formatValue(value) {
  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return JSON.stringify(value);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const current = ++revision;
  status.textContent = 'Esecuzione in corso…';
  output.textContent = '';
  variables.textContent = '';
  const result = await run(source.value);
  if (current !== revision) return;

  output.textContent = result.output ?? '';
  if (!result.ok) {
    const { message, line, variable, expected } = result.error;
    status.textContent = [
      message,
      line ? `Riga ${line}.` : '',
      variable ? `Variabile ${variable}.` : '',
      expected ? `Tipo richiesto: ${typeNames[expected]}.` : '',
    ].filter(Boolean).join(' ');
    return;
  }

  status.textContent = 'Esecuzione completata.';
  variables.textContent = Object.entries(result.variables)
    .map(([name, { type, value }]) => `${name} = ${formatValue(value)} (${typeNames[type]})`)
    .join('\n');
});
