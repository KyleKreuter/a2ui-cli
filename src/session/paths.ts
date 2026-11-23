import { chmodSync, lstatSync, mkdirSync, type Stats } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Env } from './id.js';

/**
 * Longest socket path in bytes. `sun_path` holds 104 bytes on macOS and 108 on
 * Linux, including the terminating NUL byte.
 */
export const MAX_SOCKET_PATH_BYTES = process.platform === 'darwin' ? 103 : 107;

const PRIVATE_MODE = 0o700;

/** A runtime directory or session path that a2ui-term must not use. */
export class RuntimeDirError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeDirError';
  }
}

export interface SessionPaths {
  readonly socket: string;
  readonly state: string;
}

/**
 * The directory for sockets and state files: `$XDG_RUNTIME_DIR/a2ui-term` when
 * `XDG_RUNTIME_DIR` is set, else `<tmpdir>/a2ui-term-<uid>`.
 */
export function runtimeDir(env: Env = process.env, uid: number = currentUid()): string {
  const xdg = env.XDG_RUNTIME_DIR;
  return xdg ? join(xdg, 'a2ui-term') : join(tmpdir(), `a2ui-term-${uid}`);
}

/** Creates the runtime directory with mode `0700`, or checks the one that exists. */
export function ensureRuntimeDir(dir: string, uid: number = currentUid()): void {
  try {
    mkdirSync(dir, { mode: PRIVATE_MODE });
    // mkdir applies the umask; set the mode explicitly.
    chmodSync(dir, PRIVATE_MODE);
    return;
  } catch (error) {
    if (!isCode(error, 'EEXIST')) {
      throw new RuntimeDirError(`cannot create ${dir}: ${errorMessage(error)}`);
    }
  }
  checkStats(dir, lstatSync(dir), uid);
}

/**
 * Checks the runtime directory without creating it. Returns false when it does
 * not exist, and throws {@link RuntimeDirError} when it is not private.
 */
export function checkRuntimeDir(dir: string, uid: number = currentUid()): boolean {
  let stats: Stats;
  try {
    stats = lstatSync(dir);
  } catch (error) {
    if (isCode(error, 'ENOENT')) {
      return false;
    }
    throw new RuntimeDirError(`cannot read ${dir}: ${errorMessage(error)}`);
  }
  checkStats(dir, stats, uid);
  return true;
}

/** The socket and state file of a session. Throws when the socket path is too long. */
export function sessionPaths(dir: string, sessionId: string): SessionPaths {
  const socket = join(dir, `${sessionId}.sock`);
  const bytes = Buffer.byteLength(socket);
  if (bytes > MAX_SOCKET_PATH_BYTES) {
    throw new RuntimeDirError(
      `socket path ${socket} has ${bytes} bytes; the limit is ${MAX_SOCKET_PATH_BYTES}. Use a shorter session id or XDG_RUNTIME_DIR.`,
    );
  }
  return { socket, state: join(dir, `${sessionId}.json`) };
}

function checkStats(dir: string, stats: Stats, uid: number): void {
  if (!stats.isDirectory()) {
    throw new RuntimeDirError(`${dir} is not a directory`);
  }
  if (stats.uid !== uid) {
    throw new RuntimeDirError(`${dir} belongs to another user`);
  }
  const mode = stats.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new RuntimeDirError(
      `${dir} has mode ${mode.toString(8).padStart(4, '0')}; it must be 0700. Remove it or run chmod 700 on it.`,
    );
  }
}

function currentUid(): number {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new RuntimeDirError('sessions need macOS or Linux');
  }
  return uid;
}

function isCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
