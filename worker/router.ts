import { handleContact } from './contact';
import type { HandlerDeps } from './deps';
import { json } from './lib/respond';
import { handleSubscribe } from './subscribe';

const MAX_BODY = 65_536;

export async function route(
  req: Request, d: HandlerDeps, headers: Record<string, string>, e2e?: (req: Request) => Promise<Response>,
): Promise<Response> {
  const { pathname } = new URL(req.url);
  let res: Response;
  if (Number(req.headers.get('Content-Length') ?? '0') > MAX_BODY) res = json({ ok: false, error: 'too_large' }, 413);
  else if (pathname === '/api/contact') res = req.method === 'POST' ? await handleContact(req, d) : notAllowed();
  else if (pathname === '/api/subscribe') res = req.method === 'POST' ? await handleSubscribe(req, d) : notAllowed();
  else if (e2e && pathname.startsWith('/api/__e2e/')) res = await e2e(req);
  else res = json({ ok: false, error: 'not_found' }, 404);

  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}

function notAllowed(): Response {
  const res = json({ ok: false, error: 'method_not_allowed' }, 405);
  res.headers.set('Allow', 'POST');
  return res;
}
