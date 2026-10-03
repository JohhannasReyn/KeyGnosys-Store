import { describe, expect, it } from 'vitest';
import { distPathFor, failures, LAZY_CHUNK, median } from '../../scripts/lib/perf';

describe('perf helpers', () => {
  it('identifies lazily loaded 3D chunks', () => {
    expect(LAZY_CHUNK.test('/_astro/three.Ab12.js')).toBe(true);
    expect(LAZY_CHUNK.test('/_astro/keyboard-scene.Cd34.js')).toBe(true);
    expect(LAZY_CHUNK.test('/_astro/index.Ef56.js')).toBe(false);
  });
  it('maps URL paths to dist files', () => {
    expect(distPathFor('/')).toBe('dist/index.html');
    expect(distPathFor('/download/')).toBe('dist/download/index.html');
    expect(distPathFor('/_astro/a.js')).toBe('dist/_astro/a.js');
  });
  it('takes the median of three runs', () => expect(median([0.91, 0.99, 0.96])).toBe(0.96));
  it('reports any category below the minimum', () => {
    expect(failures([{ route: '/', perf: 0.97, a11y: 0.94 }], 0.95)).toEqual(['/ accessibility 94 < 95']);
  });
});
