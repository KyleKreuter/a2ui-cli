import { describe, expect, it } from 'vitest';
import { resolveLabel, resolveOwner } from './owner.js';

describe('resolveOwner', () => {
  it('takes the owner from tmux', () => {
    expect(resolveOwner(undefined, { TMUX_PANE: '%3' })).toBe('tmux:%3');
  });

  it('takes the owner from WezTerm outside tmux', () => {
    expect(resolveOwner(undefined, { WEZTERM_PANE: '12' })).toBe('wezterm:12');
  });

  it('prefers tmux inside WezTerm', () => {
    expect(resolveOwner(undefined, { TMUX_PANE: '%3', WEZTERM_PANE: '12' })).toBe('tmux:%3');
  });

  it('prefers the flag, then A2UI_TERM_OWNER', () => {
    const env = { A2UI_TERM_OWNER: 'env', TMUX_PANE: '%3' };
    expect(resolveOwner('flag', env)).toBe('flag');
    expect(resolveOwner(undefined, env)).toBe('env');
  });

  it('returns undefined without a known host', () => {
    expect(resolveOwner(undefined, {})).toBeUndefined();
  });
});

describe('resolveLabel', () => {
  it('prefers the flag, then A2UI_TERM_LABEL, then the owner', () => {
    expect(resolveLabel('flag', 'tmux:%3', { A2UI_TERM_LABEL: 'env' })).toBe('flag');
    expect(resolveLabel(undefined, 'tmux:%3', { A2UI_TERM_LABEL: 'env' })).toBe('env');
    expect(resolveLabel(undefined, 'tmux:%3', {})).toBe('tmux:%3');
    expect(resolveLabel(undefined, undefined, {})).toBeUndefined();
  });
});
