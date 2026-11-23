import { describe, expect, it } from 'vitest';
import { tmuxEnv } from '../../test/hosts.js';
import { adapterNamed, selectHost } from './select.js';
import { tmuxAdapter } from './tmux.js';

describe('selectHost', () => {
  it('selects tmux inside tmux', () => {
    expect(selectHost(tmuxEnv('%5'))).toEqual({ adapter: tmuxAdapter, callerPane: '%5' });
  });

  it('names the reason of every host outside a host', () => {
    expect(selectHost({ PATH: '' })).toEqual({
      adapter: undefined,
      reasons: ['tmux: TMUX is not set, so this is not a tmux pane'],
    });
  });
});

describe('adapterNamed', () => {
  it('finds the adapter for an owner prefix', () => {
    expect(adapterNamed('tmux')).toBe(tmuxAdapter);
    expect(adapterNamed('wezterm')).toBeUndefined();
  });
});
