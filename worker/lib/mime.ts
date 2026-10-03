import { INTEREST_LABELS, type ContactValues, type Interest } from '../../src/lib/contact';

export interface RawEmail { from: string; to: string; replyTo: string; subject: string; text: string; messageId: string; date: Date }

const HEADER_SAFE = /^[\x20-\x7E]*$/;

function base64Lines(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return (btoa(bin).match(/.{1,76}/g) ?? ['']).join('\r\n');
}

export function buildRawEmail(e: RawEmail): string {
  const headers: [string, string][] = [
    ['From', `KeyGnosys contact form <${e.from}>`],
    ['To', e.to],
    ['Reply-To', e.replyTo],
    ['Subject', e.subject],
    ['Date', e.date.toUTCString()],
    ['Message-ID', `<${e.messageId}>`],
    ['MIME-Version', '1.0'],
    ['Content-Type', 'text/plain; charset=utf-8'],
    ['Content-Transfer-Encoding', 'base64'],
  ];
  for (const [k, v] of headers) if (!HEADER_SAFE.test(v)) throw new Error(`unsafe header ${k}`);
  return `${headers.map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n${base64Lines(e.text)}\r\n`;
}

export const contactSubject = (interest: Interest, fast: boolean) =>
  `${fast ? '[Possible spam] ' : ''}KeyGnosys contact: ${INTEREST_LABELS[interest]}`;

export const contactBody = (v: ContactValues) => [
  `Name: ${v.name}`, `Email: ${v.email}`, `Company: ${v.company || '-'}`,
  `Topic: ${INTEREST_LABELS[v.interest]}`, `Newsletter opt-in: ${v.newsletter ? 'yes' : 'no'}`, '', v.message,
].join('\n');
