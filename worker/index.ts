import { EmailMessage } from 'cloudflare:email';
import securityHeaders from './generated/security-headers.json';
import type { HandlerDeps } from './deps';
import { e2eEndpoint, e2eOverrides, sandboxOverrides } from './e2e';
import type { Env } from './env';
import { createSubscriber } from './lib/buttondown';
import { clientKey } from './lib/client-key';
import { buildRawEmail } from './lib/mime';
import { renderForm, renderPage } from './render';
import { route } from './router';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const e2e = env.E2E_FAULTS === 'on';
    const deps: HandlerDeps = {
      now: () => Date.now(),
      allow: async () => {
        if (!env.RL) return true;
        const key = await clientKey(req.headers.get('CF-Connecting-IP') ?? 'unknown', env.RL_KEY_SALT ?? '');
        return (await env.RL.limit({ key })).success;
      },
      sendContact: async ({ subject, text, replyTo }) => {
        if (!env.CONTACT_EMAIL || !env.CONTACT_TO) throw new Error('contact email not configured');
        const raw = buildRawEmail({
          from: env.CONTACT_FROM, to: env.CONTACT_TO, replyTo, subject, text,
          messageId: `${crypto.randomUUID()}@keygnosys.com`, date: new Date(),
        });
        await env.CONTACT_EMAIL.send(new EmailMessage(env.CONTACT_FROM, env.CONTACT_TO, raw));
      },
      subscribe: (email) => createSubscriber({ apiBase: env.BUTTONDOWN_API_BASE, apiKey: env.BUTTONDOWN_API_KEY ?? '' }, email),
      newsletterEnabled: Boolean(env.BUTTONDOWN_API_KEY),
      renderForm: (path, state, status) => renderForm(env.ASSETS, url.origin, path, state, status),
      renderPage: (path, status) => renderPage(env.ASSETS, url.origin, path, status),
      log: (event) => console.log(JSON.stringify({ event })),
      ...(env.SANDBOX_FORMS === 'on' ? sandboxOverrides() : {}),
      ...(e2e ? e2eOverrides(req) : {}),
    };
    const headers = securityHeaders as Record<string, string>;
    try {
      return await route(req, deps, headers, e2e ? e2eEndpoint : undefined);
    } catch {
      // Never log the error itself: it could contain user data.
      console.log(JSON.stringify({ event: 'api.unhandled' }));
      return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
      });
    }
  },
};
