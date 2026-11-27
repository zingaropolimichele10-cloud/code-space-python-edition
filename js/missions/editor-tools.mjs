export function installEditorTools(editor, gutter, indentButton) {
  let renderedCount;
  let editableRows = [];
  function update() {
    const count = editor.value.split('\n').length;
    if (renderedCount !== count) {
      renderedCount = count;
      gutter.replaceChildren(...Array.from({ length: count }, (_, index) => {
        const row = document.createElement('span');
        const lineNumber = index + 1;
        row.textContent = lineNumber + (index + 1 < count ? '\n' : '');
        if (editableRows.includes(lineNumber)) row.className = 'mission-editable-line';
        return row;
      }));
    }
    gutter.scrollTop = editor.scrollTop;
  }
  editor.addEventListener('input', update);
  editor.addEventListener('scroll', update);
  indentButton.addEventListener('click', () => {
    if (editor.readOnly) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const first = start === 0 ? 0 : editor.value.lastIndexOf('\n', start - 1) + 1;
    const endsAtNextLine = end > start && editor.value[end - 1] === '\n';
    const last = editor.value.indexOf('\n', endsAtNextLine ? end - 1 : end);
    const stop = last === -1 ? editor.value.length : last;
    const lines = editor.value.slice(first, stop).split('\n');
    if (editor.maxLength >= 0 && editor.value.length + lines.length * 4 > editor.maxLength) return;
    editor.setRangeText(lines.map(line => '    ' + line).join('\n'), first, stop, 'preserve');
    editor.setSelectionRange(start + 4, end + lines.length * 4);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.focus();
  });
  return rows => {
    editableRows = rows;
    renderedCount = undefined;
    update();
  };
}
