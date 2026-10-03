import type { APIRoute } from 'astro';
import feed from '../data/feed.json';
import { buildAtom } from '../lib/atom';

export const GET: APIRoute = () =>
  new Response(buildAtom(feed, 'https://keygnosys.com'), { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
