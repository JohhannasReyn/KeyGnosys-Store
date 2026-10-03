export type SubscribeOutcome = 'ok' | 'failed';

export async function createSubscriber(
  cfg: { apiBase: string; apiKey: string }, email: string, fetchFn: typeof fetch = fetch,
): Promise<SubscribeOutcome> {
  try {
    const res = await fetchFn(`${cfg.apiBase.replace(/\/+$/, '')}/v1/subscribers`, {
      method: 'POST',
      headers: { Authorization: `Token ${cfg.apiKey}`, 'Content-Type': 'application/json', 'X-API-Version': '2026-04-01' },
      // No `type`: Buttondown's default is double opt-in. No `ip_address`: we don't share it.
      body: JSON.stringify({ email_address: email }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return 'ok';
    // Already-subscribed or rejected addresses look identical to success, so the form never reveals list membership.
    if (res.status === 400 || res.status === 409 || res.status === 422) return 'ok';
    return 'failed';
  } catch {
    return 'failed';
  }
}
