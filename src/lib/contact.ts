export const INTERESTS = ['enterprise', 'custom-config', 'sponsored-config', 'workshop', 'other'] as const;
export type Interest = (typeof INTERESTS)[number];
export const INTEREST_LABELS: Record<Interest, string> = {
  enterprise: 'Enterprise deployment & support',
  'custom-config': 'Custom configs for in-house software',
  'sponsored-config': 'Official config for my software',
  workshop: 'Team workshop',
  other: 'Something else',
};
export const FAST_SUBMIT_MS = 3000;
const RAW_CAP = 10_000;

export type ContactField = 'name' | 'email' | 'company' | 'interest' | 'message';
export interface ContactRaw { name: string; email: string; company: string; interest: string; message: string; newsletter: boolean }
export interface ContactValues { name: string; email: string; company: string; interest: Interest; message: string; newsletter: boolean }
export type ContactResult =
  | { kind: 'bot' }
  | { kind: 'invalid'; errors: Partial<Record<ContactField, string>>; raw: ContactRaw }
  | { kind: 'ok'; values: ContactValues; fast: boolean; raw: ContactRaw };
export type SubscribeResult =
  | { kind: 'bot' }
  | { kind: 'invalid'; errors: { email: string }; raw: { email: string } }
  | { kind: 'ok'; email: string; fast: boolean };

const CONTROL = /[\u0000-\u001F\u007F]/;
const MESSAGE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';
const EMAIL = new RegExp(`^[A-Za-z0-9.!#$%&'*+/=?^_\`{|}~-]+@${LABEL}(?:\\.${LABEL})+$`);

const chars = (s: string) => [...s].length;
const cap = (s: string) => s.slice(0, RAW_CAP);

export function isValidEmail(s: string): boolean {
  return s.length <= 254 && !CONTROL.test(s) && EMAIL.test(s);
}

function isFast(t: string | undefined, now: number): boolean {
  const ts = Number(t);
  if (!t || !Number.isFinite(ts)) return false;
  const age = now - ts;
  return age >= 0 && age < FAST_SUBMIT_MS;
}

export function validateContact(f: Record<string, string>, now: number): ContactResult {
  if (f.website) return { kind: 'bot' };
  const raw: ContactRaw = {
    name: cap(f.name ?? ''), email: cap(f.email ?? ''), company: cap(f.company ?? ''),
    interest: cap(f.interest ?? ''), message: cap(f.message ?? ''), newsletter: f.newsletter === 'on',
  };
  const name = (f.name ?? '').trim();
  const email = (f.email ?? '').trim();
  const company = (f.company ?? '').trim();
  const message = f.message ?? '';
  const errors: Partial<Record<ContactField, string>> = {};

  if (!name) errors.name = 'Please enter your name.';
  else if (chars(name) > 100) errors.name = 'Name must be 100 characters or fewer.';
  else if (CONTROL.test(name)) errors.name = 'Name contains invalid characters.';

  if (!isValidEmail(email)) errors.email = 'Please enter a valid email address.';

  if (chars(company) > 100) errors.company = 'Company must be 100 characters or fewer.';
  else if (CONTROL.test(company)) errors.company = 'Company contains invalid characters.';

  if (!(INTERESTS as readonly string[]).includes(f.interest ?? '')) errors.interest = 'Please choose a topic.';

  const len = chars(message.trim());
  if (len < 10) errors.message = 'Message must be at least 10 characters.';
  else if (chars(message) > 5000) errors.message = 'Message must be 5000 characters or fewer.';
  else if (MESSAGE_CONTROL.test(message)) errors.message = 'Message contains invalid characters.';

  if (Object.keys(errors).length) return { kind: 'invalid', errors, raw };
  return {
    kind: 'ok', raw, fast: isFast(f.t, now),
    values: { name, email, company, interest: f.interest as Interest, message, newsletter: raw.newsletter },
  };
}

export function validateSubscribe(f: Record<string, string>, now: number): SubscribeResult {
  if (f.website) return { kind: 'bot' };
  const email = (f.email ?? '').trim();
  if (!isValidEmail(email)) return { kind: 'invalid', errors: { email: 'Please enter a valid email address.' }, raw: { email: cap(f.email ?? '') } };
  return { kind: 'ok', email, fast: isFast(f.t, now) };
}
