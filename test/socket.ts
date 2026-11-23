import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createConnection, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLineSplitter } from '../src/protocol/lines.js';

/** A temporary directory for sockets. Short, so socket paths stay below the OS limit. */
export function socketDir(): { dir: string; remove: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'a2ui-'));
  return {
    dir,
    remove: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** A raw protocol client that records every line it receives. */
export interface RawClient {
  readonly socket: Socket;
  readonly received: Record<string, unknown>[];
  send(message: unknown): void;
  write(data: string | Buffer): void;
  /** Waits for the next received message that matches `type`. */
  next(type: string): Promise<Record<string, unknown>>;
  /** Resolves when the server closes the connection. */
  closed: Promise<void>;
}

export async function connectRaw(path: string): Promise<RawClient> {
  const socket = createConnection(path);
  const received: Record<string, unknown>[] = [];
  const waiters: { type: string; seen: number; resolve: (m: Record<string, unknown>) => void }[] =
    [];
  let read = 0;

  const deliver = () => {
    for (const waiter of [...waiters]) {
      const index = received.findIndex(
        (message, i) => i >= waiter.seen && message.type === waiter.type,
      );
      if (index !== -1) {
        waiters.splice(waiters.indexOf(waiter), 1);
        read = Math.max(read, index + 1);
        waiter.resolve(received[index] as Record<string, unknown>);
      }
    }
  };
  const splitter = createLineSplitter((line) => {
    received.push(JSON.parse(line) as Record<string, unknown>);
    deliver();
  });
  socket.on('data', (chunk) => {
    splitter.push(chunk);
  });
  socket.on('error', () => undefined);
  const closed = new Promise<void>((resolve) =>
    socket.once('close', () => {
      resolve();
    }),
  );
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  return {
    socket,
    received,
    closed,
    send: (message) => socket.write(`${JSON.stringify(message)}\n`),
    write: (data) => socket.write(data),
    next: (type) =>
      new Promise((resolve) => {
        waiters.push({ type, seen: read, resolve });
        deliver();
      }),
  };
}

/** Leaves a socket file without a process behind it, as a killed renderer does. */
export async function leaveStaleSocket(socket: string): Promise<void> {
  const child = spawn(process.execPath, [
    '-e',
    `require('node:net').createServer().listen(${JSON.stringify(socket)}, () => console.log('up'))`,
  ]);
  await new Promise((resolve) => child.stdout.once('data', resolve));
  child.kill('SIGKILL');
  await new Promise((resolve) => child.once('exit', resolve));
}
