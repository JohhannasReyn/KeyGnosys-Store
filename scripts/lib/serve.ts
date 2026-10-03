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
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else child.kill('SIGTERM');
    },
  };
}
