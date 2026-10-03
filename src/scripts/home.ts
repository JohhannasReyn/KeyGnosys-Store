function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Keep in sync with the inline head script (index.astro), home.css and keyboard-scene.ts: short or narrow viewports stay flat.
const roomy = window.matchMedia('(min-height: 640px) and (min-width: 768px)').matches;
const htmlEl = document.documentElement;

if (!reduce && roomy && webglAvailable()) {
  const flat = () => htmlEl.classList.remove('immersive-pending');
  const go = () => {
    // A visitor who has already started reading the flat page keeps it (only when not pre-rendered immersive).
    if (!htmlEl.classList.contains('immersive-pending') && window.scrollY > 100) return;
    import('./keyboard-scene')
      .then((m) => { m.start(); flat(); })
      .catch(flat);
  };
  const events = ['pointermove', 'wheel', 'touchstart', 'keydown'] as const;
  const onFirst = () => {
    for (const e of events) window.removeEventListener(e, onFirst);
    go();
  };
  for (const e of events) window.addEventListener(e, onFirst, { passive: true, once: true });
}
