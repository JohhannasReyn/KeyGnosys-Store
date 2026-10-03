import { spawn } from 'node:child_process';

export async function serve(): Promise<{ url: string; stop(): Promise<void> }> {
  const url = 'http://127.0.0.1:4321';
  const child = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', '4321'], { stdio: 'ignore', shell: process.platform === 'win32' });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    url,
    stop: async () => {
      const exited = new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        child.once('exit', () => resolve());
      });
      if (process.platform === 'win32') {
        // Kill the whole tree (shell + npx + astro) and wait for taskkill to finish.
        await new Promise<void>((resolve) => spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).once('exit', () => resolve()));
      } else {
        child.kill('SIGTERM');
      }
      await exited;
    },
  };
}
