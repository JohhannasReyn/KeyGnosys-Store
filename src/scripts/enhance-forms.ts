interface JsonResult { ok: boolean; redirect?: string; errors?: Record<string, string>; error?: string }

function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => { el.hidden = true; el.textContent = ''; });
  form.querySelectorAll<HTMLElement>('[data-form-banner]').forEach((el) => { el.hidden = true; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}
function showErrors(form: HTMLFormElement, errors: Record<string, string>) {
  let first: HTMLElement | null = null;
  for (const [field, msg] of Object.entries(errors)) {
    const el = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(field)}"]`);
    if (el) { el.textContent = msg; el.hidden = false; }
    const input = form.querySelector<HTMLElement>(`[name="${CSS.escape(field)}"]`);
    if (input) { input.setAttribute('aria-invalid', 'true'); first ??= input; }
  }
  first?.focus();
}
function showBanner(form: HTMLFormElement, name: string) {
  const el = form.querySelector<HTMLElement>(`[data-form-banner="${name}"]`);
  if (el) { el.hidden = false; el.focus?.(); }
}

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-enhance]')) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button?.disabled) return;
    clearErrors(form);
    if (!form.reportValidity()) return;
    if (button) button.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const body = (await res.json()) as JsonResult;
      if (body.redirect) { window.location.assign(body.redirect); return; } // keep button disabled: no double submit
      if (body.errors) showErrors(form, body.errors);
      else if (body.error === 'rate_limited') { window.location.assign('/errors/rate-limited/'); return; }
      else showBanner(form, 'send_failed');
    } catch {
      showBanner(form, 'network');
    }
    if (button) button.disabled = false;
  });
}
