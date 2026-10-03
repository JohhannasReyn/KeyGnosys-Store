for (const form of document.querySelectorAll<HTMLFormElement>('form[data-timestamped]')) {
  const t = form.querySelector<HTMLInputElement>('input[name="t"]');
  if (t) t.value = String(Date.now());
}
