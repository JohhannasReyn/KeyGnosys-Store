import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cfg = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));

describe('wrangler.jsonc', () => {
  it('production never enables e2e fault injection', () => {
    expect(cfg.vars.E2E_FAULTS).toBeUndefined();
    expect(cfg.env.e2e.vars.E2E_FAULTS).toBe('on');
  });
  it('routes only /api/* through the Worker', () => expect(cfg.assets.run_worker_first).toEqual(['/api/*']));
  it('uses a rate-limit period the binding supports', () => expect([10, 60]).toContain(cfg.ratelimits[0].simple.period));
  it('commits no personal inbox or secrets', () => {
    const text = JSON.stringify(cfg);
    expect(text).not.toMatch(/gmail|CONTACT_TO|BUTTONDOWN_API_KEY|RL_KEY_SALT/);
  });
  it('rate limit is 3 per 60 s, one namespace shared by both endpoints', () => {
    expect(cfg.ratelimits).toEqual([{ name: 'RL', namespace_id: '1001', simple: { limit: 3, period: 60 } }]);
  });
  it('production Worker exposes no preview URLs and never sandboxes forms', () => {
    expect(cfg.preview_urls).toBe(false);
    expect(cfg.vars.SANDBOX_FORMS).toBeUndefined();
  });
  it('preview Worker is isolated from production email/newsletter resources', () => {
    const p = cfg.env.preview;
    expect(p.name).toBe('keygnosys-site-preview');
    expect(p.preview_urls).toBe(true);
    expect(p.workers_dev).toBe(true);
    expect(p.send_email).toBeUndefined();
    expect(p.vars.SANDBOX_FORMS).toBe('on');
    expect(p.vars.E2E_FAULTS).toBeUndefined();
    expect(p.ratelimits[0].namespace_id).not.toBe('1001');
  });
  it('pins wrangler at a version that supports Worker Previews (>= 4.135.0)', () => {
    const range: string = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies.wrangler;
    const [maj, min] = range.replace(/^[^\d]*/, '').split('.').map(Number);
    expect(maj > 4 || (maj === 4 && min >= 135)).toBe(true);
  });
});
