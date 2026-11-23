import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

describe('package', () => {
  it('declares the a2ui-term binary', () => {
    expect(pkg.bin['a2ui-term']).toBe('dist/cli.js');
  });
});
