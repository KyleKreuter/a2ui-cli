import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { expect } from 'vitest';
import type { ClientIo } from '../src/commands/client-command.js';
import { runServe, type ServeIo } from '../src/commands/serve.js';
import { readState } from '../src/session/state.js';
import { FakeStdin, FakeStdout, plain } from './ink.js';

/** Writes `lines` as JSON Lines into `dir` and returns the path. */
export function input(dir: string, name: string, lines: readonly unknown[]): string {
  const path = join(dir, name);
  writeFileSync(
    path,
    lines.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n'),
  );
  return path;
}

/**
 * Streams for a client command with `XDG_RUNTIME_DIR` set to `dir`. With
 * `stdinText`, stdin is a pipe that holds it; else a terminal.
 */
export function clientIo(dir: string, env: Record<string, string> = {}, stdinText?: string) {
  let stdout = '';
  let stderr = '';
  const pipe = new PassThrough();
  const stdin = pipe as unknown as NodeJS.ReadStream;
  stdin.isTTY = stdinText === undefined;
  if (stdinText !== undefined) {
    pipe.end(stdinText);
  }
  const io: ClientIo = {
    stdin,
    stdout: writer((chunk) => (stdout += chunk)),
    stderr: writer((chunk) => (stderr += chunk)),
    env: { XDG_RUNTIME_DIR: dir, ...env },
  };
  return { io, stdout: () => stdout, stderr: () => stderr };
}

export function writer(append: (chunk: string) => void): NodeJS.WritableStream {
  return {
    write: (chunk: string) => {
      append(chunk);
      return true;
    },
  } as NodeJS.WritableStream;
}

/** Runs `serve --session t` against a fake terminal. */
export async function startServe(dir: string, columns = 100, rows = 40) {
  const stdout = new FakeStdout(columns, rows);
  const stdin = new FakeStdin();
  const io: ServeIo = {
    stdin: stdin as unknown as NodeJS.ReadStream,
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: writer(() => undefined),
    env: { XDG_RUNTIME_DIR: dir },
    logger: { file: '/dev/null', write: () => undefined },
    process: new EventEmitter(),
  };
  const exit = runServe({ session: 't' }, io);
  const state = join(dir, 'a2ui-term', 't.json');
  await expect.poll(() => readState(state)?.pid).toBe(process.pid);
  /** Every frame so far, without styling. */
  const screen = () => plain(stdout.frames.join(''));
  /** The last full frame, without styling. Every full frame ends with the status line. */
  const frame = () => stdout.frames.map(plain).findLast((text) => text.includes('q quit')) ?? '';
  return { exit, stdin, screen, frame };
}
