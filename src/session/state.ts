import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { createLineSplitter } from '../protocol/lines.js';
import { parseServerLine } from '../protocol/messages.js';
import { toJsonLine } from '../protocol/jsonl.js';
import type { SessionPaths } from './paths.js';

/** Contents of `<session>.json` while a renderer runs. */
export interface SessionState {
  readonly pid: number;
  /** Name of the host that runs the renderer, for example `tmux`. */
  readonly host: string;
  /** Host-specific id of the renderer pane, or null when unknown. */
  readonly paneRef: string | null;
  /** The host server of the pane, for example the tmux socket path. */
  readonly hostInstance?: string;
  /** The launcher opened the pane for this renderer, so `close` may close it. */
  readonly launched?: boolean;
  readonly createdAt: string;
}

/** How long a live renderer may take to answer the probe ping. */
export const PROBE_TIMEOUT_MS = 500;

/** A socket that is neither live nor clearly stale. */
export class SessionProbeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionProbeError';
  }
}

/** Writes the state file atomically with mode `0600`. */
export function writeState(path: string, state: SessionState): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

/** Reads the state file, or returns undefined when it is missing or unreadable. */
export function readState(path: string): SessionState | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SessionState;
  } catch {
    return undefined;
  }
}

/** Removes the socket and state file of a session. Missing files are fine. */
export function removeSessionFiles(paths: SessionPaths): void {
  rmSync(paths.socket, { force: true });
  rmSync(paths.state, { force: true });
}

/**
 * Checks whether a renderer answers on `socket`. Resolves `live` when a ping
 * gets its pong within the timeout and `stale` when the socket file is missing
 * or refuses connections. Rejects with {@link SessionProbeError} otherwise, so
 * that the caller does not delete a socket it cannot judge.
 */
export function probeSocket(
  socket: string,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<'live' | 'stale'> {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const connection = createConnection(socket);
    const finish = (result: 'live' | 'stale' | Error) => {
      clearTimeout(timer);
      connection.destroy();
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    };
    const timer = setTimeout(() => {
      finish(new SessionProbeError(`no answer on ${socket} within ${timeoutMs} ms`));
    }, timeoutMs);

    const splitter = createLineSplitter((line) => {
      const parsed = parseServerLine(line);
      if (parsed.ok && parsed.message.type === 'pong' && parsed.message.id === id) {
        finish('live');
      }
    });
    connection.on('connect', () => {
      connection.write(toJsonLine({ type: 'ping', id }));
    });
    connection.on('data', (chunk) => {
      try {
        splitter.push(chunk);
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
    connection.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOENT') {
        finish('stale');
      } else {
        finish(new SessionProbeError(`cannot connect to ${socket}: ${error.message}`));
      }
    });
    connection.on('close', () => {
      finish(new SessionProbeError(`${socket} closed the connection without an answer`));
    });
  });
}
