function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && webglAvailable()) {
  const go = () => {
    // A visitor who has already started reading the flat page keeps it.
    if (window.scrollY > 100) return;
    import('./keyboard-scene').then((m) => m.start()).catch(() => { /* stay flat */ });
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 200);
}
