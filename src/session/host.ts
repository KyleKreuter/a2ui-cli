import type { Env } from './id.js';

/**
 * Host environment variables that hold the id of the current pane, in lookup
 * order. tmux comes first, so it wins when it runs inside WezTerm or kitty.
 */
const HOST_PANES = [
  { host: 'tmux', variable: 'TMUX_PANE' },
  { host: 'zellij', variable: 'ZELLIJ_PANE_ID' },
  { host: 'wezterm', variable: 'WEZTERM_PANE' },
  { host: 'kitty', variable: 'KITTY_WINDOW_ID' },
] as const;

/** Host name shown when no known host is detected. */
export const NO_HOST = 'terminal';

export interface HostPane {
  readonly host: string;
  readonly paneId: string;
}

/** The first known host pane in the environment, if any. */
export function detectHostPane(env: Env = process.env): HostPane | undefined {
  for (const { host, variable } of HOST_PANES) {
    const paneId = env[variable];
    if (paneId) {
      return { host, paneId };
    }
  }
  return undefined;
}
