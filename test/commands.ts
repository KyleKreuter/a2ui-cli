import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { expect } from 'vitest';
import type { ClientIo } from '../src/commands/client-command.js';
import { runServe, type ServeIo } from '../src/commands/serve.js';
import { HOST_ADAPTERS } from '../src/hosts/select.js';
import type { HostIo } from '../src/launcher/launcher.js';
import { readState } from '../src/session/state.js';
import { FakeRunner, TMUX } from './hosts.js';
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

export interface ServeSetup {
  readonly columns?: number;
  readonly rows?: number;
  readonly session?: string;
  /** More environment of the renderer, for example `TMUX_PANE`. */
  readonly env?: Record<string, string>;
  readonly launched?: boolean;
  readonly hosts?: ServeIo['hosts'];
  readonly ownerCheckMs?: number;
}

/** Runs `serve --session t` against a fake terminal. */
export async function startServe(
  dir: string,
  {
    columns = 100,
    rows = 40,
    session = 't',
    env = {},
    launched,
    hosts,
    ownerCheckMs,
  }: ServeSetup = {},
) {
  const stdout = new FakeStdout(columns, rows);
  const stdin = new FakeStdin();
  const io: ServeIo = {
    stdin: stdin as unknown as NodeJS.ReadStream,
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: writer(() => undefined),
    env: { XDG_RUNTIME_DIR: dir, ...env },
    logger: { file: '/dev/null', write: () => undefined },
    process: new EventEmitter(),
    ...(hosts ? { hosts } : {}),
    ...(ownerCheckMs === undefined ? {} : { ownerCheckMs }),
  };
  const exit = runServe({ session, ...(launched ? { launched } : {}) }, io);
  const state = join(dir, 'a2ui-term', `${session}.json`);
  await expect.poll(() => readState(state)?.pid).toBe(process.pid);
  /** Every frame so far, without styling. */
  const screen = () => plain(stdout.frames.join(''));
  /** The last full frame, without styling. Every full frame ends with the status line. */
  const frame = () => stdout.frames.map(plain).findLast((text) => text.includes('q quit')) ?? '';
  return { exit, stdin, screen, frame };
}

export type Serve = Awaited<ReturnType<typeof startServe>>;

/**
 * Host access with a fake tmux. Each new pane is `%9`; with `start`, it runs an
 * in-process renderer for the session in its argv, as `open` would.
 */
export function fakeHosts(dir: string, { start = true }: { readonly start?: boolean } = {}) {
  const boards: Promise<Serve>[] = [];
  const runner = new FakeRunner().on((argv) => {
    if (argv[0] !== 'tmux' || (argv[1] !== 'split-window' && argv[1] !== 'new-window')) {
      return undefined;
    }
    if (start) {
      const session = argv[argv.indexOf('--session') + 1] ?? 't';
      boards.push(startServe(dir, { session, env: { TMUX, TMUX_PANE: '%9' }, launched: true }));
    }
    return { stdout: '%9\n' };
  });
  const hosts: HostIo = {
    runner,
    adapters: HOST_ADAPTERS,
    entry: ['/usr/bin/node', '/opt/a2ui-term/dist/cli.js'],
    readyTimeoutMs: start ? 5000 : 200,
  };
  /** The renderer of the first pane. */
  const board = async (): Promise<Serve> => {
    await expect.poll(() => boards.length).toBeGreaterThan(0);
    return boards[0] as Promise<Serve>;
  };
  return { hosts, runner, boards, board };
}
