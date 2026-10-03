import { validateSubscribe } from '../src/lib/contact';
import type { HandlerDeps } from './deps';
import type { SubscribeOutcome } from './lib/buttondown';
import { json, readForm, seeOther, wantsJson } from './lib/respond';

export async function handleSubscribe(req: Request, d: HandlerDeps): Promise<Response> {
  const asJson = wantsJson(req);
  const done = (path: string) => (asJson ? json({ ok: true, redirect: path }) : seeOther(path));
  if (!d.newsletterEnabled) return asJson ? json({ ok: false, error: 'not_found' }, 404) : d.renderPage('/404.html', 404);

  if (!(await d.allow())) {
    d.log('subscribe.rate_limited');
    return asJson ? json({ ok: false, error: 'rate_limited' }, 429) : d.renderPage('/errors/rate-limited/', 429);
  }
  const fields = await readForm(req);
  if (!fields) return asJson ? json({ ok: false, error: 'bad_request' }, 400) : d.renderPage('/errors/bad-request/', 400);

  const r = validateSubscribe(fields, d.now());
  if (r.kind === 'bot') { d.log('subscribe.honeypot'); return done('/subscribe/check-email/'); }
  if (r.kind === 'invalid') {
    d.log('subscribe.invalid');
    return asJson ? json({ ok: false, errors: r.errors }, 422) : d.renderForm('/subscribe/', { values: r.raw, errors: r.errors }, 422);
  }
  let outcome: SubscribeOutcome;
  try { outcome = await d.subscribe(r.email); } catch { outcome = 'failed'; }
  d.log(`subscribe.${outcome}${r.fast ? '_flagged' : ''}`);
  if (outcome === 'ok') return done('/subscribe/check-email/');
  return asJson ? json({ ok: false, error: 'subscribe_failed', redirect: '/subscribe/failed/' }) : seeOther('/subscribe/failed/');
}
