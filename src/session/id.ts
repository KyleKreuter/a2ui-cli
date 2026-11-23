/** The session used when nothing else names one. */
export const DEFAULT_SESSION = 'default';

/** Environment variable that names the session when no flag does. */
export const SESSION_ENV = 'A2UI_TERM_SESSION';

/** Longest allowed session id. Keeps socket paths below the OS limit. */
export const MAX_SESSION_ID_LENGTH = 64;

const SESSION_ID = /^[A-Za-z0-9._-]+$/;

export type Env = Readonly<Record<string, string | undefined>>;

/** A session id from a flag or the environment that breaks the format rule. */
export class InvalidSessionIdError extends Error {
  constructor(readonly id: string) {
    super(
      `invalid session id "${id}": use 1 to ${MAX_SESSION_ID_LENGTH} of the characters A-Z, a-z, 0-9, "-", "_" and "."`,
    );
    this.name = 'InvalidSessionIdError';
  }
}

/**
 * Resolves the session id from the `--session` flag, then `A2UI_TERM_SESSION`,
 * then `default`. The host pane does not change the session, so agents in all
 * panes share one board. Throws {@link InvalidSessionIdError} for an invalid id
 * from the flag or the environment.
 */
export function resolveSessionId(flag: string | undefined, env: Env = process.env): string {
  const given = flag ?? (env[SESSION_ENV] || undefined);
  if (given !== undefined) {
    if (!isValidSessionId(given)) {
      throw new InvalidSessionIdError(given);
    }
    return given;
  }
  return DEFAULT_SESSION;
}

export function isValidSessionId(id: string): boolean {
  return id.length <= MAX_SESSION_ID_LENGTH && SESSION_ID.test(id);
}
