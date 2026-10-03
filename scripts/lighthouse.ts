import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { serve } from './lib/serve';
import { failures, median } from './lib/perf';

const ROUTES = ['/', '/download/', '/teams/', '/trust/'];
const RUNS = 3;
const MIN = 0.95;

const server = await serve();
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const results: { route: string; perf: number; a11y: number }[] = [];
try {
  for (const route of ROUTES) {
    const perf: number[] = [];
    const a11y: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      // Default Lighthouse config: mobile emulation + simulated throttling (see docs/testing.md).
      const r = await lighthouse(server.url + route, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility'] });
      perf.push(r!.lhr.categories.performance.score ?? 0);
      a11y.push(r!.lhr.categories.accessibility.score ?? 0);
    }
    results.push({ route, perf: median(perf), a11y: median(a11y) });
    console.log(`${route.padEnd(12)} perf ${Math.round(median(perf) * 100)}  a11y ${Math.round(median(a11y) * 100)}`);
  }
} finally {
  await chrome.kill();
  await server.stop();
}
const bad = failures(results, MIN);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
