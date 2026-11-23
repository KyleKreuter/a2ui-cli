import { describe, expect, it } from 'vitest';
import { resolvePlacement } from './placement.js';

describe('resolvePlacement', () => {
  it('defaults to a split to the right with 40 percent', () => {
    expect(resolvePlacement({}, {})).toEqual({ placement: 'split', direction: 'right', size: 40 });
  });

  it('takes the environment, and the flag before the environment', () => {
    const env = {
      A2UI_TERM_PLACEMENT: 'window',
      A2UI_TERM_DIRECTION: 'down',
      A2UI_TERM_SIZE: '30',
    };
    expect(resolvePlacement({}, env)).toEqual({ placement: 'window', direction: 'down', size: 30 });
    expect(resolvePlacement({ placement: 'split', size: '55' }, env)).toEqual({
      placement: 'split',
      direction: 'down',
      size: 55,
    });
  });

  it.each([
    [{ size: '95' }, 'invalid size "95": use a whole number of percent from 10 to 90'],
    [{ size: '9' }, 'from 10 to 90'],
    [{ size: '40.5' }, 'from 10 to 90'],
    [{ placement: 'tab' }, 'invalid placement "tab": use "split" or "window"'],
    [{ direction: 'left' }, 'invalid direction "left": use "right" or "down"'],
  ])('refuses %j and names the allowed values', (input, message) => {
    expect(() => resolvePlacement(input, {})).toThrow(message);
  });

  it('refuses an invalid value from the environment', () => {
    expect(() => resolvePlacement({}, { A2UI_TERM_SIZE: '100' })).toThrow('from 10 to 90');
  });
});
