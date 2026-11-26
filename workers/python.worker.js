/* Worker classico richiesto dalla distribuzione UMD di Skulpt. */
importScripts('../vendor/skulpt/skulpt.min.js', '../vendor/skulpt/skulpt-stdlib.js');

const protocol = import('../js/python/protocol.mjs');
const scalarTypes = new Map([
  [Sk.builtin.int_, 'int'],
  [Sk.builtin.bool, 'bool'],
  [Sk.builtin.float_, 'float'],
  [Sk.builtin.str, 'str'],
]);
const expected = new Map([
  ['velocita', 'int'],
  ['vite', 'int'],
  ['scudo', 'bool'],
  ['colore', 'str'],
]);
const pythonErrors = new Map([
  ['SyntaxError', 'SYNTAX'],
  ['NameError', 'NAME'],
  ['UnboundLocalError', 'NAME'],
  ['IndentationError', 'INDENTATION'],
  ['TabError', 'INDENTATION'],
  ['TypeError', 'TYPE'],
  ['ZeroDivisionError', 'DIVISION_BY_ZERO'],
  ['ImportError', 'IMPORT'],
  ['ModuleNotFoundError', 'IMPORT'],
  ['TimeLimitError', 'INTERPRETER_TIMEOUT'],
]);

class ExecutionError extends Error {
  constructor(code, details) {
    super(code);
    this.details = details;
  }
}

function extractVariables(globals, limits) {
  const variables = Object.create(null);
  let count = 0;
  for (const name of Object.keys(globals)) {
    if (name.startsWith('_')) continue;
    const item = globals[name];
    const type = scalarTypes.get(item?.ob$type);
    if (expected.has(name) && expected.get(name) !== type) {
      throw new ExecutionError('VARIABLE_TYPE', { variable: name, expected: expected.get(name) });
    }
    let value;
    if (type === 'bool') value = item === Sk.builtin.bool.true$;
    else if (['int', 'float', 'str'].includes(type)) value = item.v;
    else if (item === Sk.builtin.none.none$) value = null;
    else continue;

    if (++count > limits.variables ||
        (type === 'int' && !Number.isSafeInteger(value)) ||
        (type === 'float' && !Number.isFinite(value)) ||
        (type === 'str' && (typeof value !== 'string' || value.length > limits.variableText))) {
      throw new ExecutionError('VARIABLE_LIMIT', { variable: name });
    }
    variables[name] = { type: value === null ? 'NoneType' : type, value };
  }
  return variables;
}

function denyImport() {
  throw new Sk.builtin.ImportError('Importazione disattivata');
}

function classifyPythonError(error, source, line) {
  const code = pythonErrors.get(error?.tp$name) ?? 'PYTHON_ERROR';
  if (code !== 'SYNTAX') return code;
  const reason = error.args?.v?.[0]?.v;
  if (reason === 'unindent does not match any outer indentation level') return 'INDENTATION';
  if (reason !== 'bad input' || !line) return code;

  // Skulpt 1.2.0 segnala un blocco senza rientro come "bad input".
  const lines = source.split(/\r?\n/);
  const previous = lines.slice(0, line - 1).findLast(text => !/^\s*(?:#|$)/.test(text));
  const current = lines[line - 1] ?? '';
  const indent = text => text.match(/^[ \t]*/)[0].replaceAll('\t', '        ').length;
  if (!previous && indent(current) > 0) return 'INDENTATION';
  const block = previous && /^\s*(?:if|elif|else|for|while|def|class|try|except|finally|with)\b.*:\s*(?:#.*)?$/.test(previous);
  return block && indent(current) <= indent(previous) ? 'INDENTATION' : code;
}

self.onmessage = async ({ data: { id, source } }) => {
  const { limits, failure } = await protocol;
  let output = '';
  let outputLimitReached = false;

  try {
    if (typeof source !== 'string' || source.length > limits.source) {
      throw new ExecutionError('SOURCE_LIMIT');
    }
    Sk.configure({
      __future__: Sk.python3,
      execLimit: limits.interpreterMs,
      output(chunk) {
        const available = limits.output - output.length;
        output += chunk.slice(0, available);
        if (chunk.length > available) {
          outputLimitReached = true;
          throw new ExecutionError('OUTPUT_LIMIT');
        }
      },
      read(path) {
        // print() usa internamente sys anche quando il programma non importa nulla.
        if (path === 'src/builtin/sys.js') return Sk.builtinFiles.files[path];
        return denyImport();
      },
      inputfun() { throw new ExecutionError('INPUT'); },
    });
    Sk.onBeforeImport = name => name === 'sys';
    Sk.builtin.__import__ = denyImport;
    Sk.builtins.__import__ = new Sk.builtin.func(denyImport);
    for (const name of ['jseval', 'execfile', 'open', 'file']) delete Sk.builtins[name];
    const module = await Sk.misceval.asyncToPromise(
      () => Sk.importMainWithBody('programma', false, source, true),
    );
    if (outputLimitReached) throw new ExecutionError('OUTPUT_LIMIT');
    self.postMessage({ id, ok: true, output, variables: extractVariables(module.$d, limits) });
  } catch (error) {
    const line = error?.traceback?.find(frame => Number.isInteger(frame.lineno) && frame.lineno > 0)?.lineno;
    const code = outputLimitReached ? 'OUTPUT_LIMIT' : error instanceof ExecutionError
      ? error.message
      : classifyPythonError(error, source, line);
    const details = error instanceof ExecutionError ? error.details : { line };
    self.postMessage({ id, output, ...failure(code, details) });
  }
};
