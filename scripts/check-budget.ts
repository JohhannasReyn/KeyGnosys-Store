import { readFileSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';
import { chromium } from '@playwright/test';
import { serve } from './lib/serve';
import { distPathFor, LAZY_CHUNK } from './lib/perf';

const BUDGET = 300 * 1024;
const ROUTES = ['/', '/download/', '/teams/', '/trust/', '/docs/'];
const server = await serve();
const browser = await chromium.launch();
let failed = false;
try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const urls = new Set<string>();
    page.on('request', (r) => { const u = new URL(r.url()); if (u.origin === server.url) urls.add(u.pathname); });
    await page.goto(server.url + route, { waitUntil: 'networkidle' });
    let total = 0;
    for (const p of urls) {
      if (LAZY_CHUNK.test(p)) continue;
      total += brotliCompressSync(readFileSync(distPathFor(p)), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
    }
    const kb = (total / 1024).toFixed(1);
    console.log(`${route.padEnd(12)} ${kb} KB (br) across ${urls.size} requests`);
    if (total > BUDGET) { failed = true; console.error(`  over budget (${BUDGET / 1024} KB)`); }
    await page.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
if (failed) process.exit(1);
