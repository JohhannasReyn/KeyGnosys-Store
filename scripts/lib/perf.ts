export const LAZY_CHUNK = /\/_astro\/(three|keyboard-scene)[.-][^/]*\.js$/;
export const distPathFor = (pathname: string) => `dist${pathname.endsWith('/') ? `${pathname}index.html` : decodeURI(pathname)}`;
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
export function failures(results: { route: string; perf: number; a11y: number }[], min: number): string[] {
  const pct = (x: number) => Math.round(x * 100);
  return results.flatMap((r) => [
    ...(r.perf < min ? [`${r.route} performance ${pct(r.perf)} < ${pct(min)}`] : []),
    ...(r.a11y < min ? [`${r.route} accessibility ${pct(r.a11y)} < ${pct(min)}`] : []),
  ]);
}
