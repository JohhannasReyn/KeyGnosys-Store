export interface RateLimitBinding { limit(o: { key: string }): Promise<{ success: boolean }> }
export interface Env {
  ASSETS: Fetcher;
  CONTACT_EMAIL?: SendEmail;
  RL?: RateLimitBinding;
  CONTACT_FROM: string;
  CONTACT_TO?: string;
  BUTTONDOWN_API_BASE: string;
  BUTTONDOWN_API_KEY?: string;
  RL_KEY_SALT?: string;
  E2E_FAULTS?: string;
  SANDBOX_FORMS?: string;
}
