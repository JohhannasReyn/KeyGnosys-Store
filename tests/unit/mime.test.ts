import { describe, expect, it } from 'vitest';
import { buildRawEmail, contactBody, contactSubject } from '../../worker/lib/mime';

const base = {
  from: 'contact-form@keygnosys.com', to: 'owner@example.com', replyTo: 'ada@example.com',
  subject: 'KeyGnosys contact: Team workshop', text: 'hello', messageId: 'abc@keygnosys.com',
  date: new Date('2026-10-15T12:00:00Z'),
};
function decodeBody(raw: string) {
  const body = raw.split('\r\n\r\n')[1];
  return Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
}

describe('buildRawEmail', () => {
  it('builds CRLF headers with fixed From and validated Reply-To', () => {
    const raw = buildRawEmail(base);
    expect(raw).toContain('From: KeyGnosys contact form <contact-form@keygnosys.com>\r\n');
    expect(raw).toContain('To: owner@example.com\r\n');
    expect(raw).toContain('Reply-To: ada@example.com\r\n');
    expect(raw).toContain('Subject: KeyGnosys contact: Team workshop\r\n');
    expect(raw).toContain('Date: Thu, 15 Oct 2026 12:00:00 GMT\r\n');
    expect(raw).toContain('Message-ID: <abc@keygnosys.com>\r\n');
    expect(raw).toContain('Content-Type: text/plain; charset=utf-8\r\n');
    expect(raw).toContain('Content-Transfer-Encoding: base64\r\n\r\n');
  });
  it('round-trips non-ASCII body', () => {
    const text = 'José Ñúñez 山田\nGrüße — 你好 👋\n\n' + 'é'.repeat(300);
    expect(decodeBody(buildRawEmail({ ...base, text }))).toBe(text);
  });
  it('wraps base64 lines at 76 chars', () => {
    const body = buildRawEmail({ ...base, text: 'x'.repeat(1000) }).split('\r\n\r\n')[1];
    for (const line of body.trimEnd().split('\r\n')) expect(line.length).toBeLessThanOrEqual(76);
  });
  it.each(['replyTo', 'subject', 'to', 'from'] as const)('rejects CR/LF injection in %s', (k) => {
    expect(() => buildRawEmail({ ...base, [k]: 'a@b.co\r\nBcc: x@y.z' })).toThrow(/unsafe header/);
  });
  it('rejects non-ASCII headers', () => {
    expect(() => buildRawEmail({ ...base, subject: 'Grüße' })).toThrow(/unsafe header/);
  });
});

describe('contactSubject / contactBody', () => {
  it('builds subject from the enum and flags fast submissions', () => {
    expect(contactSubject('workshop', false)).toBe('KeyGnosys contact: Team workshop');
    expect(contactSubject('enterprise', true)).toBe('[Possible spam] KeyGnosys contact: Enterprise deployment & support');
  });
  it('builds a readable body', () => {
    expect(contactBody({ name: 'Ada', email: 'ada@example.com', company: '', interest: 'other', message: 'Hi there team', newsletter: true }))
      .toBe('Name: Ada\nEmail: ada@example.com\nCompany: -\nTopic: Something else\nNewsletter opt-in: yes\n\nHi there team');
  });
});
