import { detectOS, selectCta, type CtaModel } from '../lib/os';
import type { ReleaseSummary } from '../lib/releases';

function link(text: string, href: string, cls = '') {
  const a = document.createElement('a');
  a.textContent = text; a.href = href; if (cls) a.className = cls;
  return a;
}
function render(c: CtaModel): Node[] {
  switch (c.kind) {
    case 'download': {
      const a = link(c.label, c.href, 'btn btn-primary');
      a.dataset.platform = c.platform;
      return c.showOthers ? [a, link('Other platforms', '/download/', 'cta-others')] : [a];
    }
    case 'browse':
      return [link(c.label, c.href, 'btn btn-primary')];
    default: {
      const p = document.createElement('p');
      p.className = 'cta-note';
      p.append(`${c.label}. `, link(c.linkLabel, c.href));
      return [p];
    }
  }
}

const nav = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
const os = detectOS({
  ua: navigator.userAgent, uaDataPlatform: nav.userAgentData?.platform,
  uaDataMobile: nav.userAgentData?.mobile, maxTouchPoints: navigator.maxTouchPoints,
});
for (const root of document.querySelectorAll<HTMLElement>('[data-cta]')) {
  const summary = JSON.parse(root.dataset.release ?? 'null') as ReleaseSummary | null;
  root.replaceChildren(...render(selectCta(os, summary)));
  root.dataset.os = os;
}
