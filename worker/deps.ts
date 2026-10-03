import type { SubscribeOutcome } from './lib/buttondown';

export interface FormState { values: Record<string, string | boolean>; errors: Record<string, string>; banner?: 'send_failed' }
export interface HandlerDeps {
  now(): number;
  allow(): Promise<boolean>;
  sendContact(m: { subject: string; text: string; replyTo: string }): Promise<void>;
  subscribe(email: string): Promise<SubscribeOutcome>;
  newsletterEnabled: boolean;
  renderForm(path: string, state: FormState, status: number): Promise<Response>;
  renderPage(path: string, status: number): Promise<Response>;
  log(event: string): void;
}
