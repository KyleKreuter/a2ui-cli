import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION,
  InvalidSessionIdError,
  MAX_SESSION_ID_LENGTH,
  detectHostPane,
  resolveSessionId,
} from './id.js';

describe('resolveSessionId', () => {
  it('prefers the flag over the environment', () => {
    expect(resolveSessionId('flag', { A2UI_TERM_SESSION: 'env', TMUX_PANE: '%3' })).toBe('flag');
  });

  it('uses A2UI_TERM_SESSION when no flag is given', () => {
    expect(resolveSessionId(undefined, { A2UI_TERM_SESSION: 'env', TMUX_PANE: '%3' })).toBe('env');
  });

  it('ignores an empty A2UI_TERM_SESSION', () => {
    expect(resolveSessionId(undefined, { A2UI_TERM_SESSION: '' })).toBe(DEFAULT_SESSION);
  });

  it.each([
    ['TMUX_PANE', '%3', 'tmux-_3'],
    ['ZELLIJ_PANE_ID', '7', 'zellij-7'],
    ['WEZTERM_PANE', '12', 'wezterm-12'],
    ['KITTY_WINDOW_ID', '4', 'kitty-4'],
  ])('derives the id from %s', (variable, value, expected) => {
    expect(resolveSessionId(undefined, { [variable]: value })).toBe(expected);
  });

  it('checks host variables in a fixed order', () => {
    expect(resolveSessionId(undefined, { KITTY_WINDOW_ID: '4', TMUX_PANE: '%1' })).toBe('tmux-_1');
  });

  it('shortens a long derived id', () => {
    const id = resolveSessionId(undefined, { WEZTERM_PANE: 'x'.repeat(100) });
    expect(id).toHaveLength(MAX_SESSION_ID_LENGTH);
  });

  it('falls back to default', () => {
    expect(resolveSessionId(undefined, {})).toBe(DEFAULT_SESSION);
  });

  it.each(['../x', 'a b', '', 'x'.repeat(MAX_SESSION_ID_LENGTH + 1)])(
    'rejects the invalid id %j and names the allowed characters',
    (id) => {
      expect(() => resolveSessionId(id, {})).toThrow(InvalidSessionIdError);
      expect(() => resolveSessionId(id, {})).toThrow('A-Z, a-z, 0-9, "-", "_" and "."');
    },
  );

  it('rejects an invalid id from the environment', () => {
    expect(() => resolveSessionId(undefined, { A2UI_TERM_SESSION: 'a/b' })).toThrow(
      InvalidSessionIdError,
    );
  });
});

describe('detectHostPane', () => {
  it('returns the host and pane id', () => {
    expect(detectHostPane({ TMUX_PANE: '%3' })).toEqual({ host: 'tmux', paneId: '%3' });
  });

  it('returns undefined without a host variable', () => {
    expect(detectHostPane({})).toBeUndefined();
  });
});
