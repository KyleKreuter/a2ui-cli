/** The session used when nothing else names one. */
export const DEFAULT_SESSION = 'default';

/** Environment variable that names the session when no flag does. */
export const SESSION_ENV = 'A2UI_TERM_SESSION';

/** Longest allowed session id. Keeps socket paths below the OS limit. */
export const MAX_SESSION_ID_LENGTH = 64;

const SESSION_ID = /^[A-Za-z0-9._-]+$/;
const OTHER_CHARACTERS = /[^A-Za-z0-9._-]/g;

/** Host environment variables that hold the id of the current pane, in lookup order. */
const HOST_PANES = [
  { host: 'tmux', variable: 'TMUX_PANE' },
  { host: 'zellij', variable: 'ZELLIJ_PANE_ID' },
  { host: 'wezterm', variable: 'WEZTERM_PANE' },
  { host: 'kitty', variable: 'KITTY_WINDOW_ID' },
] as const;

/** Host name shown when no known host is detected. */
export const NO_HOST = 'terminal';

export type Env = Readonly<Record<string, string | undefined>>;

export interface HostPane {
  readonly host: string;
  readonly paneId: string;
}

/** A session id from a flag or the environment that breaks the format rule. */
export class InvalidSessionIdError extends Error {
  constructor(readonly id: string) {
    super(
      `invalid session id "${id}": use 1 to ${MAX_SESSION_ID_LENGTH} of the characters A-Z, a-z, 0-9, "-", "_" and "."`,
    );
    this.name = 'InvalidSessionIdError';
  }
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

/**
 * Resolves the session id from the `--session` flag, then `A2UI_TERM_SESSION`,
 * then the host pane, then `default`. Throws {@link InvalidSessionIdError} for
 * an invalid id from the flag or the environment.
 */
export function resolveSessionId(flag: string | undefined, env: Env = process.env): string {
  const given = flag ?? (env[SESSION_ENV] || undefined);
  if (given !== undefined) {
    if (!isValidSessionId(given)) {
      throw new InvalidSessionIdError(given);
    }
    return given;
  }
  const pane = detectHostPane(env);
  return pane ? deriveSessionId(pane) : DEFAULT_SESSION;
}

export function isValidSessionId(id: string): boolean {
  return id.length <= MAX_SESSION_ID_LENGTH && SESSION_ID.test(id);
}

/** `<host>-<pane id>` with every character outside the allowed set replaced by `_`. */
export function deriveSessionId({ host, paneId }: HostPane): string {
  return `${host}-${paneId}`.replace(OTHER_CHARACTERS, '_').slice(0, MAX_SESSION_ID_LENGTH);
}
