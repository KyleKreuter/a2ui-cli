import { describe, expect, it } from 'vitest';
import { detectHostPane } from './host.js';

describe('detectHostPane', () => {
  it.each([
    ['TMUX_PANE', '%3', 'tmux'],
    ['ZELLIJ_PANE_ID', '7', 'zellij'],
    ['WEZTERM_PANE', '12', 'wezterm'],
    ['KITTY_WINDOW_ID', '4', 'kitty'],
  ])('reads %s', (variable, paneId, host) => {
    expect(detectHostPane({ [variable]: paneId })).toEqual({ host, paneId });
  });

  it('prefers tmux when it runs inside another host', () => {
    expect(detectHostPane({ WEZTERM_PANE: '12', TMUX_PANE: '%3' })).toEqual({
      host: 'tmux',
      paneId: '%3',
    });
  });

  it('ignores an empty variable', () => {
    expect(detectHostPane({ TMUX_PANE: '', KITTY_WINDOW_ID: '4' })?.host).toBe('kitty');
  });

  it('returns undefined without a host variable', () => {
    expect(detectHostPane({})).toBeUndefined();
  });
});
