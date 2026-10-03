import type { HandlerDeps } from './deps';

interface OutboxEntry { kind: 'contact' | 'subscribe'; subject?: string; text?: string; replyTo?: string; email?: string }
const outbox: OutboxEntry[] = [];

/** Test doubles used only when E2E_FAULTS=on (never set in production; see tests/unit/wrangler-config.test.ts). */
export function e2eOverrides(req: Request): Pick<HandlerDeps, 'allow' | 'sendContact' | 'subscribe' | 'newsletterEnabled'> {
  return {
    newsletterEnabled: true,
    allow: async () => req.headers.get('x-e2e-rate-limit') !== 'block',
    sendContact: async (m) => {
      if (m.replyTo.endsWith('@fail-email.test')) throw new Error('e2e email failure');
      outbox.push({ kind: 'contact', ...m });
    },
    subscribe: async (email) => {
      if (email.endsWith('@fail-subscribe.test')) return 'failed';
      outbox.push({ kind: 'subscribe', email });
      return 'ok';
    },
  };
}

/** Preview Worker only (SANDBOX_FORMS=on): forms behave normally for reviewers but contact no email or newsletter service. */
export function sandboxOverrides(): Pick<HandlerDeps, 'sendContact' | 'subscribe' | 'newsletterEnabled'> {
  return {
    newsletterEnabled: true,
    sendContact: async () => { console.log(JSON.stringify({ event: 'contact.sandboxed' })); },
    subscribe: async () => { console.log(JSON.stringify({ event: 'subscribe.sandboxed' })); return 'ok'; },
  };
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export async function e2eEndpoint(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Defence in depth: the outbox is only ever reachable on a local wrangler dev server.
  if (!LOCAL_HOSTS.has(url.hostname) || url.pathname !== '/api/__e2e/outbox') return new Response('not found', { status: 404 });
  if (req.method === 'DELETE') { outbox.length = 0; return new Response(null, { status: 204 }); }
  return Response.json(outbox);
}
