export function protectsLines(mission, source) {
  const template = mission.codiceIniziale.split('\n');
  const editable = new Set(mission.righeModificabili);
  if (template.every((_, index) => editable.has(index + 1))) return true;
  const lines = source.split('\n');
  return lines.length === template.length && template.every((line, index) =>
    editable.has(index + 1) || lines[index] === line);
}

export function installEditorTools(editor, gutter, indentButton, mirror) {
  let mission;
  let previous = '';
  let selection = [0, 0];
  function update() {
    const lines = editor.value.split('\n');
    const allRows = mission?.codiceIniziale.split('\n').every((_, index) => mission.righeModificabili.includes(index + 1));
    function render(container, values) {
      container.replaceChildren(...values.map((value, index) => {
        const item = document.createElement('span');
        item.className = allRows || mission?.righeModificabili.includes(index + 1) ? 'editable-row' : 'protected-row';
        item.textContent = value || ' ';
        return item;
      }));
    }
    render(gutter, lines.map((_, index) => index + 1));
    render(mirror, lines);
    scroll();
  }
  function scroll() {
    gutter.scrollTop = editor.scrollTop;
    mirror.scrollTop = editor.scrollTop;
    mirror.scrollLeft = editor.scrollLeft;
  }
  editor.addEventListener('beforeinput', () => {
    selection = [editor.selectionStart, editor.selectionEnd];
  });
  editor.addEventListener('input', event => {
    if (mission && !protectsLines(mission, editor.value)) {
      editor.value = previous;
      editor.setSelectionRange(...selection);
      event.stopImmediatePropagation();
    } else previous = editor.value;
    update();
  });
  editor.addEventListener('scroll', scroll);
  indentButton.addEventListener('click', () => {
    if (editor.readOnly) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const first = start === 0 ? 0 : editor.value.lastIndexOf('\n', start - 1) + 1;
    const endsAtNextLine = end > start && editor.value[end - 1] === '\n';
    const last = editor.value.indexOf('\n', endsAtNextLine ? end - 1 : end);
    const stop = last === -1 ? editor.value.length : last;
    const lines = editor.value.slice(first, stop).split('\n');
    if (editor.value.length + lines.length * 4 > editor.maxLength) return;
    const replacement = lines.map(line => '    ' + line).join('\n');
    if (mission && !protectsLines(mission, editor.value.slice(0, first) + replacement + editor.value.slice(stop))) return;
    editor.setRangeText(replacement, first, stop, 'preserve');
    editor.setSelectionRange(start + 4, end + lines.length * 4);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.focus();
  });
  return (newMission, draft) => {
    mission = newMission;
    editor.value = previous = draft !== undefined && protectsLines(mission, draft) ? draft : mission.codiceIniziale;
    update();
  };
}
