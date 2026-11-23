import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leaveStaleSocket } from '../../test/socket.js';
import { createLineSplitter } from '../protocol/lines.js';
import {
  SessionProbeError,
  probeSocket,
  readState,
  removeSessionFiles,
  writeState,
  type SessionState,
} from './state.js';

let dir: string;
const servers: Server[] = [];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'a2ui-state-'));
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))));
  rmSync(dir, { recursive: true, force: true });
});

function listen(socket: string, answer: boolean): Promise<void> {
  const server = createServer((connection) => {
    const splitter = createLineSplitter((line) => {
      const { id } = JSON.parse(line) as { id: string };
      if (answer) {
        connection.write(`${JSON.stringify({ type: 'pong', id })}\n`);
      }
    });
    connection.on('data', (chunk) => {
      splitter.push(chunk);
    });
  });
  servers.push(server);
  return new Promise((resolve) => server.listen(socket, resolve));
}

describe('state file', () => {
  const state: SessionState = {
    pid: 42,
    host: 'tmux',
    paneRef: '%3',
    createdAt: '2026-11-23T10:00:00.000Z',
  };

  it('writes and reads the state with mode 0600', () => {
    const path = join(dir, 't.json');
    writeState(path, state);
    expect(readState(path)).toEqual(state);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('returns undefined for a missing state file', () => {
    expect(readState(join(dir, 'none.json'))).toBeUndefined();
  });

  it('removes socket and state file and accepts missing files', () => {
    const paths = { socket: join(dir, 't.sock'), state: join(dir, 't.json') };
    writeState(paths.state, state);
    removeSessionFiles(paths);
    expect(existsSync(paths.state)).toBe(false);
    expect(() => {
      removeSessionFiles(paths);
    }).not.toThrow();
  });
});

describe('probeSocket', () => {
  it('reports a renderer that answers the ping as live', async () => {
    const socket = join(dir, 'live.sock');
    await listen(socket, true);
    await expect(probeSocket(socket)).resolves.toBe('live');
  });

  it('reports a socket file without a process as stale', async () => {
    const socket = join(dir, 'refused.sock');
    await leaveStaleSocket(socket);
    expect(existsSync(socket)).toBe(true);
    await expect(probeSocket(socket)).resolves.toBe('stale');
  });

  it('reports a missing socket as stale', async () => {
    await expect(probeSocket(join(dir, 'missing.sock'))).resolves.toBe('stale');
  });

  it('rejects when the socket accepts but does not answer', async () => {
    const socket = join(dir, 'silent.sock');
    await listen(socket, false);
    await expect(probeSocket(socket, 50)).rejects.toThrow(SessionProbeError);
  });
});
