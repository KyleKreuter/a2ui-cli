import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clientIo as createClientIo,
  input as writeInput,
  startServe as startServeIn,
} from '../../test/commands.js';
import { keys, settle } from '../../test/ink.js';
import { socketDir } from '../../test/socket.js';
import { CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { EMPTY_STATE } from '../render/App.js';
import { runAsk } from './ask.js';
import { runClose } from './close.js';
import { ExitCode } from './exit-codes.js';
import { runSend } from './send.js';

let tmp: { dir: string; remove: () => void };

beforeEach(() => {
  tmp = socketDir();
});

afterEach(() => {
  tmp.remove();
});

const v = PROTOCOL_VERSION;

const confirmSurface = [
  {
    version: v,
    createSurface: {
      surfaceId: 'confirm',
      catalogId: CATALOG_ID,
      components: [
        {
          id: 'root',
          component: 'Button',
          child: 'label',
          action: { event: { name: 'ok', context: { answer: 'yes' } } },
        },
        { id: 'label', component: 'Text', text: 'Confirm me' },
      ],
    },
  },
];

const input = (name: string, lines: readonly unknown[]) => writeInput(tmp.dir, name, lines);
const clientIo = (stdinText?: string) => createClientIo(tmp.dir, {}, stdinText);
const startServe = () => startServeIn(tmp.dir);

describe('client commands against serve', () => {
  it('send renders the messages and exits with 0', async () => {
    const serve = await startServe();
    const client = clientIo();
    await expect(
      runSend(input('ok.jsonl', confirmSurface), { session: 't' }, client.io),
    ).resolves.toBe(ExitCode.ok);
    await expect.poll(serve.screen).toContain('Confirm me');
    expect(client.stderr()).toBe('');
    await runClose({ session: 't' }, clientIo().io);
    await expect(serve.exit).resolves.toBe(0);
  });

  it('send reports a rejected message and exits with 4', async () => {
    const serve = await startServe();
    const client = clientIo();
    const bad = {
      version: v,
      updateComponents: { components: [{ id: 'root', component: 'Text' }] },
    };
    await expect(runSend(input('bad.jsonl', [bad]), { session: 't' }, client.io)).resolves.toBe(
      ExitCode.inputError,
    );
    expect(client.stderr()).toMatch(/^a2ui-term: .+/);
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
  });

  it('send refuses malformed input, names the line, and sends nothing', async () => {
    const serve = await startServe();
    const client = clientIo();
    const lines = [...confirmSurface, '', '{"version": "1.0", "upd'];
    await expect(runSend(input('broken.jsonl', lines), { session: 't' }, client.io)).resolves.toBe(
      ExitCode.inputError,
    );
    expect(client.stderr()).toContain('line 3: ');
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
    expect(serve.screen()).not.toContain('Confirm me');
  });

  it('ask prints the action as JSON and exits with 0', async () => {
    const serve = await startServe();
    const client = clientIo();
    const exit = runAsk(input('ask.jsonl', confirmSurface), { session: 't' }, client.io);
    await expect.poll(serve.screen).toContain('Confirm me');
    serve.stdin.write(keys.enter);
    await expect(exit).resolves.toBe(ExitCode.ok);
    expect(JSON.parse(client.stdout())).toMatchObject({
      name: 'ok',
      surfaceId: 'confirm',
      sourceComponentId: 'root',
      context: { answer: 'yes' },
    });
    expect(client.stdout().endsWith('}\n')).toBe(true);
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
  });

  it('ask exits with 2 and prints nothing after the timeout', async () => {
    const serve = await startServe();
    const client = clientIo();
    await expect(
      runAsk(input('ask.jsonl', confirmSurface), { session: 't', timeout: 0.2 }, client.io),
    ).resolves.toBe(ExitCode.timeout);
    expect(client.stdout()).toBe('');
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
  });

  it('ask exits with 3 when the user quits the renderer', async () => {
    const serve = await startServe();
    const client = clientIo();
    const exit = runAsk(input('ask.jsonl', confirmSurface), { session: 't' }, client.io);
    await expect.poll(serve.screen).toContain('Confirm me');
    serve.stdin.write('q');
    await expect(exit).resolves.toBe(ExitCode.userClosed);
    expect(client.stderr()).toBe('a2ui-term: the user closed the renderer\n');
    await serve.exit;
  });

  it('send without --clear fails for a surface id that exists', async () => {
    const serve = await startServe();
    const file = input('ok.jsonl', confirmSurface);
    await expect(runSend(file, { session: 't' }, clientIo().io)).resolves.toBe(ExitCode.ok);
    const client = clientIo();
    await expect(runSend(file, { session: 't' }, client.io)).resolves.toBe(ExitCode.inputError);
    expect(client.stderr()).toContain('Surface confirm already exists');
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
  });

  it('ask --clear shows the same file again', async () => {
    const serve = await startServe();
    const file = input('ask.jsonl', confirmSurface);
    await expect(runSend(file, { session: 't' }, clientIo().io)).resolves.toBe(ExitCode.ok);
    const client = clientIo();
    const exit = runAsk(file, { session: 't', clear: true }, client.io);
    // Clear and create land in one render, so the screen does not change. Without
    // --clear, ask would fail with exit code 4 right away.
    await expect(Promise.race([exit, settle(300).then(() => 'waiting')])).resolves.toBe('waiting');
    serve.stdin.write(keys.enter);
    await expect(exit).resolves.toBe(ExitCode.ok);
    expect(JSON.parse(client.stdout())).toMatchObject({ name: 'ok', surfaceId: 'confirm' });
    expect(client.stderr()).toBe('');
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
  });

  it('send --clear with empty input shows the empty state', async () => {
    const serve = await startServe();
    await runSend(input('ok.jsonl', confirmSurface), { session: 't' }, clientIo().io);
    await expect.poll(serve.screen).toContain('Confirm me');
    const client = clientIo('');
    await expect(runSend(undefined, { session: 't', clear: true }, client.io)).resolves.toBe(
      ExitCode.ok,
    );
    await expect
      .poll(() => serve.screen().slice(serve.screen().lastIndexOf('Confirm me')))
      .toContain(EMPTY_STATE);
    await runClose({ session: 't' }, clientIo().io);
    await serve.exit;
  });

  it('close stops the renderer and exits with 0', async () => {
    const serve = await startServe();
    await expect(runClose({ session: 't' }, clientIo().io)).resolves.toBe(ExitCode.ok);
    await expect(serve.exit).resolves.toBe(0);
  });
});

describe('client commands without a renderer', () => {
  it('send names the session and exits with 1', async () => {
    const client = clientIo();
    await expect(
      runSend(input('ok.jsonl', confirmSurface), { session: 't' }, client.io),
    ).resolves.toBe(ExitCode.error);
    expect(client.stderr()).toContain('no renderer runs for session "t"');
  });

  it('close exits with 0', async () => {
    await expect(runClose({ session: 't' }, clientIo().io)).resolves.toBe(ExitCode.ok);
  });

  it('the CLI exits with 1 for send', async () => {
    const run = promisify(execFile);
    const error = await run(
      process.execPath,
      [
        '--import',
        'tsx',
        'src/cli.ts',
        'send',
        '--session',
        't',
        input('ok.jsonl', confirmSurface),
      ],
      { env: { ...process.env, XDG_RUNTIME_DIR: tmp.dir } },
    ).catch((failure: unknown) => failure as { code: number; stderr: string });
    expect(error).toMatchObject({ code: 1 });
    expect((error as { stderr: string }).stderr).toContain('no renderer runs for session "t"');
  });
});
