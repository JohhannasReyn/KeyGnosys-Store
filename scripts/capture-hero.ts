import { chromium } from '@playwright/test';
import { serve } from './lib/serve';

const server = await serve();
// SwiftShader gives headless Chromium a software WebGL context.
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(server.url + '/');
  await page.waitForSelector('body.immersive', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  // Wheel nine tics into the first key cutscene: the card has condensed away and the golden key is shown alone.
  await page.mouse.move(640, 400);
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#overlays,.hud,.site-nav,#flash{visibility:hidden!important}' });
  await page.locator('#gl').screenshot({ path: 'src/assets/keyboard-hero.png' });
  console.log('wrote src/assets/keyboard-hero.png');
} finally {
  await browser.close();
  await server.stop();
}
