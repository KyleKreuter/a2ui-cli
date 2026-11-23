import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeStdin, FakeStdout, keys, plain } from '../../test/ink.js';
import { connectRaw, leaveStaleSocket, socketDir } from '../../test/socket.js';
import { PROTOCOL_VERSION } from '../a2ui/processor.js';
import { readState } from '../session/state.js';
import { runServe, type ServeIo } from './serve.js';

let tmp: { dir: string; remove: () => void };
let runtimeDir: string;

beforeEach(() => {
  tmp = socketDir();
  runtimeDir = join(tmp.dir, 'a2ui-term');
});

afterEach(() => {
  tmp.remove();
});

function fakeIo(env: Record<string, string> = {}) {
  const stdout = new FakeStdout();
  const stdin = new FakeStdin();
  const events = new EventEmitter();
  let stderr = '';
  const io: ServeIo = {
    stdin: stdin as unknown as NodeJS.ReadStream,
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: {
      write: (chunk: string) => {
        stderr += chunk;
        return true;
      },
    } as NodeJS.WritableStream,
    env: { XDG_RUNTIME_DIR: tmp.dir, ...env },
    logger: { file: '/dev/null', write: () => undefined },
    process: events,
  };
  return { io, stdout, stdin, events, stderr: () => stderr };
}

const paths = (session: string) => ({
  socket: join(runtimeDir, `${session}.sock`),
  state: join(runtimeDir, `${session}.json`),
});

/** Starts serve and waits until it writes its state file. */
async function startServe(session = 't', env: Record<string, string> = {}) {
  const fake = fakeIo(env);
  const exit = runServe({ session }, fake.io);
  // A state file with this pid means that serve listens.
  await expect.poll(() => readState(paths(session).state)?.pid).toBe(process.pid);
  const client = await connectRaw(paths(session).socket);
  await client.next('ready');
  return { ...fake, exit, client };
}

describe('runServe', () => {
  it('writes the state file, renders client messages and stops on close', async () => {
    const { exit, client, stdout } = await startServe('t', { TMUX_PANE: '%3' });
    const state = JSON.parse(readFileSync(paths('t').state, 'utf8')) as Record<string, unknown>;
    expect(state).toMatchObject({ pid: process.pid, host: 'tmux', paneRef: '%3' });
    expect(typeof state.createdAt).toBe('string');

    client.send({
      type: 'a2ui',
      message: {
        version: PROTOCOL_VERSION,
        createSurface: {
          surfaceId: 'main',
          catalogId: 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
          components: [{ id: 'root', component: 'Text', text: 'Hello from the socket' }],
        },
      },
    });
    await expect.poll(() => plain(stdout.frames.join(''))).toContain('Hello from the socket');
    expect(plain(stdout.frames.join(''))).toContain('session t · tmux · 1 client');

    client.send({ type: 'close' });
    expect(await client.next('closed')).toEqual({ type: 'closed', reason: 'client' });
    await expect(exit).resolves.toBe(0);
    expect(existsSync(paths('t').socket)).toBe(false);
    expect(existsSync(paths('t').state)).toBe(false);
  });

  it('uses the alternate screen and restores the cursor', async () => {
    const { exit, client, stdout } = await startServe();
    client.send({ type: 'close' });
    await exit;
    expect(stdout.frames[0]).toBe('\u001B[?1049h');
    expect(stdout.frames.at(-1)).toBe('\u001B[?1049l\u001B[?25h');
  });

  it('sends closed with reason user and cleans up when the user presses q', async () => {
    const { exit, client, stdin } = await startServe();
    stdin.write('q');
    expect(await client.next('closed')).toEqual({ type: 'closed', reason: 'user' });
    await expect(exit).resolves.toBe(0);
    expect(existsSync(paths('t').socket)).toBe(false);
    expect(existsSync(paths('t').state)).toBe(false);
  });

  it('restores the terminal and notifies clients on SIGTERM', async () => {
    const { exit, client, events, stdout } = await startServe();
    events.emit('SIGTERM');
    expect(await client.next('closed')).toEqual({ type: 'closed', reason: 'user' });
    await expect(exit).resolves.toBe(128 + 15);
    expect(stdout.frames.at(-1)).toBe('\u001B[?1049l\u001B[?25h');
    expect(existsSync(paths('t').state)).toBe(false);
  });

  it('reports an uncaught error with reason error and exit code 1', async () => {
    const { exit, client, events, stderr } = await startServe();
    events.emit('uncaughtException', new Error('boom'));
    expect(await client.next('closed')).toEqual({ type: 'closed', reason: 'error' });
    await expect(exit).resolves.toBe(1);
    expect(stderr()).toContain('boom');
  });

  it('refuses a second renderer for the same session', async () => {
    const first = await startServe();
    const second = fakeIo();
    await expect(runServe({ session: 't' }, second.io)).resolves.toBe(1);
    expect(second.stderr()).toBe(
      `a2ui-term: session "t" already has a renderer (pid ${process.pid})\n`,
    );
    first.client.send({ type: 'ping', id: 'still' });
    await first.client.next('pong');
    first.stdin.write(keys.ctrlC);
    await first.exit;
  });

  it('replaces the files of a renderer that was killed', async () => {
    mkdirSync(runtimeDir, { mode: 0o700 });
    await leaveStaleSocket(paths('t').socket);
    writeFileSync(paths('t').state, '{"pid":1}');
    const { exit, client } = await startServe();
    expect(JSON.parse(readFileSync(paths('t').state, 'utf8'))).toMatchObject({ pid: process.pid });
    client.send({ type: 'close' });
    await expect(exit).resolves.toBe(0);
  });

  it('refuses an invalid session id', async () => {
    const { io, stderr } = fakeIo();
    await expect(runServe({ session: '../x' }, io)).resolves.toBe(1);
    expect(stderr()).toContain('A-Z, a-z, 0-9');
  });

  it('refuses to run without a terminal', async () => {
    const { io, stderr } = fakeIo();
    Object.assign(io.stdin, { isTTY: false });
    await expect(runServe({ session: 't' }, io)).resolves.toBe(1);
    expect(stderr()).toContain('needs a terminal');
  });
});
