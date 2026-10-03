import type { FormState } from './deps';

const HTML = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
/** Served when the static page itself cannot be loaded; keeps the caller's status. */
const FALLBACK = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KeyGnosys</title></head>'
  + '<body><p>Something went wrong — email hello@keygnosys.com</p></body></html>';
const fallback = (status: number) => new Response(FALLBACK, { status, headers: HTML });

export async function renderPage(assets: Fetcher, origin: string, path: string, status: number): Promise<Response> {
  const page = await assets.fetch(new Request(new URL(path, origin)));
  if (!page.ok) return fallback(status);
  return new Response(page.body, { status, headers: HTML });
}

/** Re-renders a static form page with the visitor's values and errors. All values go through setAttribute/setInnerContent (escaped). */
export async function renderForm(assets: Fetcher, origin: string, path: string, state: FormState, status: number): Promise<Response> {
  const page = await assets.fetch(new Request(new URL(path, origin)));
  if (!page.ok) return fallback(status);
  const val = (name: string | null) => (name ? state.values[name] : undefined);
  const markInvalid = (el: Element) => { if (state.errors[el.getAttribute('name') ?? '']) el.setAttribute('aria-invalid', 'true'); };
  const out = new HTMLRewriter()
    .on('#main input[name]', {
      element(el) {
        const name = el.getAttribute('name');
        if (name === 'website' || name === 't') return;
        markInvalid(el);
        const v = val(name);
        if (el.getAttribute('type') === 'checkbox') {
          if (v === true) el.setAttribute('checked', ''); else el.removeAttribute('checked');
        } else if (typeof v === 'string') {
          el.setAttribute('value', v);
        }
      },
    })
    .on('#main textarea[name]', { element(el) { markInvalid(el); const v = val(el.getAttribute('name')); if (typeof v === 'string') el.setInnerContent(v); } })
    .on('#main select[name]', { element(el) { markInvalid(el); } })
    .on('#main select[name="interest"] option', {
      element(el) { if (el.getAttribute('value') === val('interest')) el.setAttribute('selected', ''); else el.removeAttribute('selected'); },
    })
    .on('#main [data-error-for]', {
      element(el) { const msg = state.errors[el.getAttribute('data-error-for') ?? '']; if (msg) { el.setInnerContent(msg); el.removeAttribute('hidden'); } },
    })
    .on('#main [data-form-banner]', {
      element(el) { if (state.banner && el.getAttribute('data-form-banner') === state.banner) el.removeAttribute('hidden'); },
    })
    .transform(page);
  return new Response(out.body, { status, headers: HTML });
}
