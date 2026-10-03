import { describe, expect, it } from 'vitest';
import { FAST_SUBMIT_MS, isValidEmail, validateContact, validateSubscribe } from '../../src/lib/contact';

const NOW = 1_800_000_000_000;
const good = { name: 'Ada', email: 'ada@example.com', company: '', interest: 'enterprise', message: 'Hello there team', t: String(NOW - 60_000) };

describe('validateContact', () => {
  it('accepts a valid submission', () => {
    const r = validateContact(good, NOW);
    expect(r).toMatchObject({ kind: 'ok', fast: false, values: { name: 'Ada', interest: 'enterprise', newsletter: false } });
  });
  it('newsletter only when explicitly "on"', () => {
    expect(validateContact({ ...good, newsletter: 'on' }, NOW)).toMatchObject({ values: { newsletter: true } });
    expect(validateContact({ ...good, newsletter: '' }, NOW)).toMatchObject({ values: { newsletter: false } });
  });
  it('honeypot -> bot', () => expect(validateContact({ ...good, website: 'x' }, NOW)).toEqual({ kind: 'bot' }));
  it('fast submission is a signal, not a discard', () => {
    const r = validateContact({ ...good, t: String(NOW - FAST_SUBMIT_MS + 1) }, NOW);
    expect(r).toMatchObject({ kind: 'ok', fast: true });
  });
  it('missing/garbage/future timestamp is not "fast"', () => {
    for (const t of ['', 'abc', String(NOW + 10_000)]) expect(validateContact({ ...good, t }, NOW)).toMatchObject({ fast: false });
  });
  it.each([
    ['name', '', 'Please enter your name.'],
    ['name', 'x'.repeat(101), 'Name must be 100 characters or fewer.'],
    ['name', 'A\u0007da', 'Name contains invalid characters.'],
    ['email', 'not-an-email', 'Please enter a valid email address.'],
    ['email', 'a@b.com\r\nBcc: x@y.z', 'Please enter a valid email address.'],
    ['email', 'a@b.com, c@d.com', 'Please enter a valid email address.'],
    ['company', 'x'.repeat(101), 'Company must be 100 characters or fewer.'],
    ['interest', 'hack', 'Please choose a topic.'],
    ['message', 'short', 'Message must be at least 10 characters.'],
    ['message', 'x'.repeat(5001), 'Message must be 5000 characters or fewer.'],
  ])('%s=%j -> error', (field, value, msg) => {
    const r = validateContact({ ...good, [field]: value }, NOW);
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') {
      expect(r.errors[field as keyof typeof r.errors]).toBe(msg);
      expect(r.raw[field as 'name']).toBe(value);
    }
  });
  it('counts characters not UTF-16 units', () => {
    const emoji = '😀'.repeat(5000); // 10000 UTF-16 units, 5000 characters
    expect(validateContact({ ...good, message: emoji }, NOW).kind).toBe('ok');
  });
  it('keeps non-ASCII intact', () => {
    const r = validateContact({ ...good, name: 'José Ñúñez 山田', message: 'Grüße — 你好 👋 world' }, NOW);
    expect(r).toMatchObject({ kind: 'ok', values: { name: 'José Ñúñez 山田', message: 'Grüße — 你好 👋 world' } });
  });
  it('trims name/company/email but preserves message whitespace', () => {
    const r = validateContact({ ...good, name: '  Ada  ', email: ' ada@example.com ', message: '  line1\n\tline2  ' }, NOW);
    expect(r).toMatchObject({ values: { name: 'Ada', email: 'ada@example.com', message: '  line1\n\tline2  ' } });
  });
  it('caps raw values echoed back for re-render', () => {
    const r = validateContact({ ...good, message: 'x'.repeat(50_000) }, NOW);
    if (r.kind !== 'invalid') throw new Error('expected invalid');
    expect(r.raw.message.length).toBe(10_000);
  });
});

describe('validateSubscribe', () => {
  it('ok', () => expect(validateSubscribe({ email: 'a@b.co', t: '' }, NOW)).toEqual({ kind: 'ok', email: 'a@b.co', fast: false }));
  it('bot', () => expect(validateSubscribe({ email: 'a@b.co', website: '1' }, NOW)).toEqual({ kind: 'bot' }));
  it('invalid', () => expect(validateSubscribe({ email: 'nope' }, NOW)).toEqual({
    kind: 'invalid', errors: { email: 'Please enter a valid email address.' }, raw: { email: 'nope' },
  }));
});

describe('isValidEmail', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.org'])('valid %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['', 'a@b', 'a b@c.de', 'a@-b.com', `${'x'.repeat(250)}@b.co`, 'a@b.co\n'])('invalid %j', (e) => expect(isValidEmail(e)).toBe(false));
});
