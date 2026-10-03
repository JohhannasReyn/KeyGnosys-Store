export interface SponsorTier { name: string; monthlyUsd: number; perks: string[] }
export interface SiteConfig {
  repo: string;
  siteRepo: string;
  contactAddress: string;
  sponsorship: null | { githubSponsorsUrl?: string; openCollectiveUrl?: string; tiers: SponsorTier[] };
  workshopPricing: null | { name: string; priceUsd: number; description: string }[];
  newsletter: null | { postalAddress: string };
  discussionsUrl: string | null;
  hsts: boolean;
}

export interface ContentStatus {
  hasRelease: boolean;
  hasDocs: boolean;
  docsEntry: string | null;
  docsCommit: string | null;
  docsVersion: string | null;
}

export interface NavItem { label: string; href: string; external: boolean }

const base: SiteConfig = {
  repo: 'JohhannasReyn/KeyGnosys',
  siteRepo: 'JohhannasReyn/KeyGnosys-Store',
  contactAddress: 'hello@keygnosys.com',
  sponsorship: null,
  workshopPricing: null,
  newsletter: null,
  discussionsUrl: null,
  hsts: false,
};

/** Test/e2e builds only: KG_SITE_OVERRIDES is never set in production (see Task 23 deploy workflow). */
export function applyOverrides(cfg: SiteConfig, json: string | undefined): SiteConfig {
  if (!json) return cfg;
  const patch = JSON.parse(json) as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    if (!(key in cfg)) throw new Error(`unknown override key: ${key}`);
  }
  return { ...cfg, ...(patch as Partial<SiteConfig>) };
}

export const site: SiteConfig = applyOverrides(base, process.env.KG_SITE_OVERRIDES);

export function navItems(cfg: SiteConfig, status: ContentStatus): NavItem[] {
  const items: NavItem[] = [{ label: 'Download', href: '/download/', external: false }];
  if (status.hasDocs && status.docsEntry) items.push({ label: 'Docs', href: status.docsEntry, external: false });
  items.push({ label: 'Trust', href: '/trust/', external: false }, { label: 'Teams', href: '/teams/', external: false });
  if (cfg.sponsorship) items.push({ label: 'Support', href: '/support/', external: false });
  if (cfg.discussionsUrl) items.push({ label: 'Community', href: cfg.discussionsUrl, external: true });
  items.push({ label: 'GitHub', href: `https://github.com/${cfg.repo}`, external: true });
  return items;
}
