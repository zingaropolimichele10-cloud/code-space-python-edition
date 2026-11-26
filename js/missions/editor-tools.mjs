export function installEditorTools(editor, gutter, indentButton) {
  function update() {
    const count = editor.value.split('\n').length;
    if (gutter.childElementCount !== count) {
      gutter.replaceChildren(...Array.from({ length: count }, (_, index) => {
        const line = document.createElement('span');
        line.textContent = index + 1;
        return line;
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
    const last = editor.value.indexOf('\n', end);
    const stop = last === -1 ? editor.value.length : last;
    const lines = editor.value.slice(first, stop).split('\n');
    editor.setRangeText(lines.map(line => '    ' + line).join('\n'), first, stop, 'preserve');
    editor.setSelectionRange(start + 4, end + lines.length * 4);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.focus();
  });
  return update;
}
