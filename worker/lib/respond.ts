export const wantsJson = (req: Request) => (req.headers.get('Accept') ?? '').includes('application/json');

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export const seeOther = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });

export async function readForm(req: Request): Promise<Record<string, string> | null> {
  try {
    const fd = await req.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of fd) if (typeof v === 'string' && !(k in out)) out[k] = v;
    return out;
  } catch {
    return null;
  }
}
