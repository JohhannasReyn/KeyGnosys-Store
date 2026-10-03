import { execSync } from 'node:child_process';

// D7: e2e builds enable every optional section. Production never sets KG_SITE_OVERRIDES (enforced in deploy.yml).
const overrides = {
  newsletter: { postalAddress: 'PO Box 0000, Testville' },
  discussionsUrl: 'https://github.com/JohhannasReyn/KeyGnosys/discussions',
  sponsorship: { githubSponsorsUrl: 'https://github.com/sponsors/JohhannasReyn', tiers: [{ name: 'Supporter', monthlyUsd: 3, perks: ['Name in the credits'] }] },
  workshopPricing: [{ name: 'Half-day workshop', priceUsd: 900, description: 'Up to 12 people, remote.' }],
};
const env = { ...process.env, KG_SITE_OVERRIDES: JSON.stringify(overrides) };
execSync('npm run fetch-content:fixtures', { stdio: 'inherit', env });
execSync('npm run build:site', { stdio: 'inherit', env });
