import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION,
  InvalidSessionIdError,
  MAX_SESSION_ID_LENGTH,
  resolveSessionId,
} from './id.js';

describe('resolveSessionId', () => {
  it('prefers the flag over the environment', () => {
    expect(resolveSessionId('flag', { A2UI_TERM_SESSION: 'env' })).toBe('flag');
  });

  it('uses A2UI_TERM_SESSION when no flag is given', () => {
    expect(resolveSessionId(undefined, { A2UI_TERM_SESSION: 'env' })).toBe('env');
  });

  it('ignores an empty A2UI_TERM_SESSION', () => {
    expect(resolveSessionId(undefined, { A2UI_TERM_SESSION: '' })).toBe(DEFAULT_SESSION);
  });

  it('uses one session for agents in different panes', () => {
    expect(resolveSessionId(undefined, { TMUX_PANE: '%3' })).toBe(DEFAULT_SESSION);
    expect(resolveSessionId(undefined, { TMUX_PANE: '%5' })).toBe(DEFAULT_SESSION);
    expect(resolveSessionId(undefined, { WEZTERM_PANE: '12' })).toBe(DEFAULT_SESSION);
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
