import { describe, expect, it } from 'vitest';
import type { FormState, HandlerDeps } from '../../worker/deps';
import { route } from '../../worker/router';

const NOW = 1_800_000_000_000;
const valid = { name: 'Ada Lovelace', email: 'ada@example.com', company: 'Analytical', interest: 'enterprise', message: 'We would like a rollout plan.', t: String(NOW - 60_000) };

function harness(o: Partial<HandlerDeps> = {}) {
  const rec = { sent: [] as { subject: string; text: string; replyTo: string }[], subscribed: [] as string[], logs: [] as string[],
    forms: [] as { path: string; state: FormState; status: number }[], pages: [] as { path: string; status: number }[] };
  const deps: HandlerDeps = {
    now: () => NOW,
    allow: async () => true,
    sendContact: async (m) => { rec.sent.push(m); },
    subscribe: async (e) => { rec.subscribed.push(e); return 'ok'; },
    newsletterEnabled: true,
    renderForm: async (path, state, status) => { rec.forms.push({ path, state, status }); return new Response('form', { status }); },
    renderPage: async (path, status) => { rec.pages.push({ path, status }); return new Response('page', { status }); },
    log: (e) => { rec.logs.push(e); },
    ...o,
  };
  return { deps, rec };
}
function post(path: string, fields: Record<string, string>, json = false) {
  return new Request(`https://keygnosys.com${path}`, {
    method: 'POST', body: new URLSearchParams(fields),
    headers: json ? { Accept: 'application/json' } : {},
  });
}
const H = { 'X-Test': '1' };

describe('contact', () => {
  it('no-JS success: sends once and 303s to thanks', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/contact', valid), deps, H);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/teams/thanks/');
    expect(rec.sent).toHaveLength(1);
    expect(rec.sent[0]).toMatchObject({ subject: 'KeyGnosys contact: Enterprise deployment & support', replyTo: 'ada@example.com' });
    expect(rec.subscribed).toEqual([]);
    expect(rec.logs).toEqual(['contact.sent']);
  });
  it('JSON success returns redirect', async () => {
    const res = await route(post('/api/contact', valid, true), harness().deps, H);
    expect(await res.json()).toEqual({ ok: true, redirect: '/teams/thanks/' });
  });
  it('honeypot: silent discard', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/contact', { ...valid, website: 'spam' }), deps, H);
    expect(res.headers.get('Location')).toBe('/teams/thanks/');
    expect(rec.sent).toEqual([]);
    expect(rec.logs).toEqual(['contact.honeypot']);
  });
  it('invalid no-JS: 422 re-render with raw values and errors', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/contact', { ...valid, email: 'nope', message: '"><script>x</script> long enough' }), deps, H);
    expect(res.status).toBe(422);
    expect(rec.forms[0].path).toBe('/teams/');
    expect(rec.forms[0].state.errors).toEqual({ email: 'Please enter a valid email address.' });
    expect(rec.forms[0].state.values.message).toBe('"><script>x</script> long enough');
    expect(rec.sent).toEqual([]);
  });
  it('invalid JSON: 422 with errors', async () => {
    const res = await route(post('/api/contact', { ...valid, name: '' }, true), harness().deps, H);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, errors: { name: 'Please enter your name.' } });
  });
  it('provider failure no-JS: 502 re-render with banner, values kept', async () => {
    const { deps, rec } = harness({ sendContact: async () => { throw new Error('boom'); } });
    const res = await route(post('/api/contact', valid), deps, H);
    expect(res.status).toBe(502);
    expect(rec.forms[0].state).toMatchObject({ banner: 'send_failed', values: { name: 'Ada Lovelace' } });
    expect(rec.logs).toEqual(['contact.provider_error']);
  });
  it('provider failure JSON: 502 send_failed', async () => {
    const res = await route(post('/api/contact', valid, true), harness({ sendContact: async () => { throw new Error('x'); } }).deps, H);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'send_failed' });
  });
  it('newsletter opt-in: subscribes after sending', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/contact', { ...valid, newsletter: 'on' }), deps, H);
    expect(rec.sent).toHaveLength(1);
    expect(rec.subscribed).toEqual(['ada@example.com']);
    expect(res.headers.get('Location')).toBe('/teams/thanks/confirm-subscription/');
  });
  it.each([
    ['returns failed', async () => 'failed' as const],
    ['throws', async (): Promise<'ok'> => { throw new Error('x'); }],
  ])('newsletter failure (%s) never loses the contact', async (_n, subscribe) => {
    const { deps, rec } = harness({ subscribe });
    const res = await route(post('/api/contact', { ...valid, newsletter: 'on' }), deps, H);
    expect(rec.sent).toHaveLength(1);
    expect(res.headers.get('Location')).toBe('/teams/thanks/subscription-failed/');
  });
  it('no subscription when unchecked, even with the newsletter disabled', async () => {
    const a = harness();
    await route(post('/api/contact', valid), a.deps, H);
    expect(a.rec.subscribed).toEqual([]);
    const b = harness({ newsletterEnabled: false });
    const res = await route(post('/api/contact', valid), b.deps, H);
    expect(b.rec.subscribed).toEqual([]);
    expect(res.headers.get('Location')).toBe('/teams/thanks/');
  });
  it('ticked newsletter while disabled: contact sent, subscription reported as failed', async () => {
    const { deps, rec } = harness({ newsletterEnabled: false });
    const res = await route(post('/api/contact', { ...valid, newsletter: 'on' }), deps, H);
    expect(rec.sent).toHaveLength(1);
    expect(rec.subscribed).toEqual([]);
    expect(res.headers.get('Location')).toBe('/teams/thanks/subscription-failed/');
    expect(rec.logs).toEqual(['contact.sent', 'newsletter.not_configured']);
  });
  it('fast submission: delivered with spam tag, newsletter not acted on', async () => {
    const { deps, rec } = harness();
    await route(post('/api/contact', { ...valid, newsletter: 'on', t: String(NOW - 500) }), deps, H);
    expect(rec.sent[0].subject).toBe('[Possible spam] KeyGnosys contact: Enterprise deployment & support');
    expect(rec.subscribed).toEqual([]);
    expect(rec.logs).toEqual(['contact.sent_flagged']);
  });
  it('rate limited: 429 page, nothing sent', async () => {
    const { deps, rec } = harness({ allow: async () => false });
    const res = await route(post('/api/contact', valid), deps, H);
    expect(res.status).toBe(429);
    expect(rec.pages).toEqual([{ path: '/errors/rate-limited/', status: 429 }]);
    expect(rec.sent).toEqual([]);
  });
  it('unparseable body: 400', async () => {
    const req = new Request('https://keygnosys.com/api/contact', { method: 'POST', body: '{', headers: { 'Content-Type': 'multipart/form-data; boundary=x' } });
    const res = await route(req, harness().deps, H);
    expect(res.status).toBe(400);
  });
  it('logs never contain personal data', async () => {
    const { deps, rec } = harness({ sendContact: async () => { throw new Error('ada@example.com'); } });
    await route(post('/api/contact', { ...valid, newsletter: 'on' }), deps, H);
    const all = rec.logs.join(' ');
    for (const pii of ['Ada', 'ada@example.com', 'Analytical', 'rollout']) expect(all).not.toContain(pii);
  });
});

describe('subscribe', () => {
  it('ok -> check-email', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/subscribe', { email: 'a@b.co' }), deps, H);
    expect(res.headers.get('Location')).toBe('/subscribe/check-email/');
    expect(rec.subscribed).toEqual(['a@b.co']);
  });
  it('invalid -> 422 re-render of /subscribe/', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/subscribe', { email: 'x' }), deps, H);
    expect(res.status).toBe(422);
    expect(rec.forms[0]).toMatchObject({ path: '/subscribe/', state: { values: { email: 'x' } } });
  });
  it('honeypot -> looks successful, nothing subscribed', async () => {
    const { deps, rec } = harness();
    const res = await route(post('/api/subscribe', { email: 'a@b.co', website: '1' }), deps, H);
    expect(res.headers.get('Location')).toBe('/subscribe/check-email/');
    expect(rec.subscribed).toEqual([]);
  });
  it('provider failure -> /subscribe/failed/', async () => {
    const res = await route(post('/api/subscribe', { email: 'a@b.co' }, true), harness({ subscribe: async () => 'failed' }).deps, H);
    expect(await res.json()).toEqual({ ok: false, error: 'subscribe_failed', redirect: '/subscribe/failed/' });
  });
  it('newsletter disabled -> 404', async () => {
    const res = await route(post('/api/subscribe', { email: 'a@b.co' }), harness({ newsletterEnabled: false }).deps, H);
    expect(res.status).toBe(404);
  });
});

describe('router', () => {
  it('405 for non-POST with Allow header', async () => {
    const res = await route(new Request('https://keygnosys.com/api/contact'), harness().deps, H);
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });
  it('404 for unknown api paths, and e2e paths only when wired', async () => {
    expect((await route(new Request('https://keygnosys.com/api/nope'), harness().deps, H)).status).toBe(404);
    expect((await route(new Request('https://keygnosys.com/api/__e2e/outbox'), harness().deps, H)).status).toBe(404);
    const res = await route(new Request('https://keygnosys.com/api/__e2e/outbox'), harness().deps, H, async () => new Response('[]'));
    expect(res.status).toBe(200);
  });
  it('413 for oversized bodies', async () => {
    // Node's Request may drop a hand-set Content-Length; a request-shaped object exercises the same router code.
    const req = { url: 'https://keygnosys.com/api/contact', method: 'POST', headers: new Headers({ 'Content-Length': '70000' }) } as unknown as Request;
    expect((await route(req, harness().deps, H)).status).toBe(413);
  });
  it('applies security headers to every response, including redirects and errors', async () => {
    for (const req of [post('/api/contact', valid), new Request('https://keygnosys.com/api/nope')]) {
      expect((await route(req, harness().deps, H)).headers.get('X-Test')).toBe('1');
    }
  });
});
