import { validateContact } from '../src/lib/contact';
import type { HandlerDeps } from './deps';
import type { SubscribeOutcome } from './lib/buttondown';
import { contactBody, contactSubject } from './lib/mime';
import { json, readForm, seeOther, wantsJson } from './lib/respond';

export async function handleContact(req: Request, d: HandlerDeps): Promise<Response> {
  const asJson = wantsJson(req);
  const done = (path: string) => (asJson ? json({ ok: true, redirect: path }) : seeOther(path));

  if (!(await d.allow())) {
    d.log('contact.rate_limited');
    return asJson ? json({ ok: false, error: 'rate_limited' }, 429) : d.renderPage('/errors/rate-limited/', 429);
  }
  const fields = await readForm(req);
  if (!fields) {
    d.log('contact.bad_request');
    return asJson ? json({ ok: false, error: 'bad_request' }, 400) : d.renderPage('/errors/bad-request/', 400);
  }

  const r = validateContact(fields, d.now());
  if (r.kind === 'bot') { d.log('contact.honeypot'); return done('/teams/thanks/'); }
  if (r.kind === 'invalid') {
    d.log('contact.invalid');
    return asJson ? json({ ok: false, errors: r.errors }, 422) : d.renderForm('/teams/', { values: { ...r.raw }, errors: r.errors }, 422);
  }

  try {
    await d.sendContact({ subject: contactSubject(r.values.interest, r.fast), text: contactBody(r.values), replyTo: r.values.email });
  } catch {
    d.log('contact.provider_error');
    return asJson
      ? json({ ok: false, error: 'send_failed' }, 502)
      : d.renderForm('/teams/', { values: { ...r.raw }, errors: {}, banner: 'send_failed' }, 502);
  }
  d.log(r.fast ? 'contact.sent_flagged' : 'contact.sent');

  // Separate operation: a newsletter problem never affects the contact that was already sent.
  if (r.values.newsletter && !r.fast) {
    let outcome: SubscribeOutcome;
    if (!d.newsletterEnabled) {
      // The visitor asked to subscribe but no provider is configured: tell them it didn't happen.
      outcome = 'failed';
      d.log('newsletter.not_configured');
    } else {
      try { outcome = await d.subscribe(r.values.email); } catch { outcome = 'failed'; }
      d.log(`newsletter.${outcome}`);
    }
    return done(outcome === 'ok' ? '/teams/thanks/confirm-subscription/' : '/teams/thanks/subscription-failed/');
  }
  return done('/teams/thanks/');
}
