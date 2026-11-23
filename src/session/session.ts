import { resolveSessionId, type Env } from './id.js';
import { runtimeDir, sessionPaths, type SessionPaths } from './paths.js';

export interface Session {
  readonly id: string;
  /** The runtime directory that holds the session files. */
  readonly dir: string;
  readonly paths: SessionPaths;
}

/**
 * Resolves the session id and the location of its files. Throws
 * `InvalidSessionIdError` or `RuntimeDirError`.
 */
export function locateSession(flag: string | undefined, env: Env = process.env): Session {
  const id = resolveSessionId(flag, env);
  const dir = runtimeDir(env);
  return { id, dir, paths: sessionPaths(dir, id) };
}
