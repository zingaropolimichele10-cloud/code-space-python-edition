export function downloadFile(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readJson(file) {
  if (!file || file.size > 256_000) throw Error('File mancante o troppo grande.');
  try { return JSON.parse(await file.text()); }
  catch { throw Error('Il file non contiene un salvataggio JSON valido.'); }
}
