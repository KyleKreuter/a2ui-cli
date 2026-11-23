import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clientIo, input, startServe } from '../../test/commands.js';
import { keys } from '../../test/ink.js';
import { socketDir } from '../../test/socket.js';
import { CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { runAdd } from './add.js';
import { runAsk } from './ask.js';
import { runClose } from './close.js';
import { ExitCode } from './exit-codes.js';
import { runList } from './list.js';
import { runRemove } from './remove.js';
import { runSend } from './send.js';
import { runSet } from './set.js';
import { runUpdate } from './update.js';

let tmp: { dir: string; remove: () => void };
let serve: Awaited<ReturnType<typeof startServe>> | undefined;

beforeEach(() => {
  tmp = socketDir();
  serve = undefined;
});

afterEach(async () => {
  if (serve) {
    await runClose({ session: 't' }, clientIo(tmp.dir).io);
    await serve.exit;
  }
  tmp.remove();
});

const v = PROTOCOL_VERSION;
const session = { session: 't' };
const example = (name: string) => join(import.meta.dirname, '..', '..', 'examples', name);

async function board(columns = 100) {
  serve = await startServe(tmp.dir, { columns });
  return serve;
}

/** Runs a command with the given environment and returns its exit code and output. */
async function run(
  command: (io: ReturnType<typeof clientIo>['io']) => Promise<number>,
  env: Record<string, string> = {},
) {
  const client = clientIo(tmp.dir, env);
  const code = await command(client.io);
  return { code, stdout: client.stdout(), stderr: client.stderr() };
}

const textWidget = (name: string, text: unknown) =>
  input(tmp.dir, name, [
    { version: v, createSurface: { surfaceId: 'x', catalogId: CATALOG_ID } },
    {
      version: v,
      updateComponents: { surfaceId: 'x', components: [{ id: 'root', component: 'Text', text }] },
    },
  ]);

async function add(text: string, env: Record<string, string> = {}, extra = {}) {
  const result = await run(
    (io) => runAdd(textWidget(`${text}.jsonl`, text), { ...session, ...extra }, io),
    env,
  );
  expect(result.code).toBe(ExitCode.ok);
  return (JSON.parse(result.stdout) as { widgetId: string }).widgetId;
}

async function list(env: Record<string, string> = {}, mine = false) {
  const result = await run((io) => runList({ ...session, mine }, io), env);
  return {
    ...result,
    widgets:
      result.code === 0
        ? (JSON.parse(result.stdout) as { widgets: { widgetId: string; owner: string | null }[] })
            .widgets
        : [],
  };
}

describe('add', () => {
  it('prints the widget id and shows the widget with its title', async () => {
    const { frame } = await board();
    const result = await run((io) =>
      runAdd(example('progress.jsonl'), { ...session, title: 'Build' }, io),
    );
    expect(result).toEqual({ code: ExitCode.ok, stdout: '{"widgetId":"w1"}\n', stderr: '' });
    await expect.poll(frame).toMatch(/╭─ Build · w1 ─/);
    expect(frame()).toContain('100%');
  });

  it('exits with 4 without createSurface and creates nothing', async () => {
    await board();
    const file = input(tmp.dir, 'data.jsonl', [
      { version: v, updateDataModel: { surfaceId: 'x', path: '/a', value: 1 } },
    ]);
    const result = await run((io) => runAdd(file, session, io));
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toContain('add needs exactly one createSurface');
    expect((await list()).widgets).toEqual([]);
  });

  it('creates nothing when the second message fails validation', async () => {
    await board();
    const file = input(tmp.dir, 'bad.jsonl', [
      { version: v, createSurface: { surfaceId: 'x', catalogId: CATALOG_ID } },
      {
        version: v,
        updateComponents: { surfaceId: 'x', components: [{ id: 'root', component: 'Text' }] },
      },
    ]);
    expect((await run((io) => runAdd(file, session, io))).code).toBe(ExitCode.inputError);
    expect((await list()).widgets).toEqual([]);
  });

  it.each([
    [{ TMUX_PANE: '%3' }, 'tmux:%3'],
    [{ WEZTERM_PANE: '12' }, 'wezterm:12'],
    [{ TMUX_PANE: '%3', WEZTERM_PANE: '12' }, 'tmux:%3'],
    [{ ZELLIJ_PANE_ID: '7' }, 'zellij:7'],
    [{ KITTY_WINDOW_ID: '4' }, 'kitty:4'],
    [{ A2UI_TERM_OWNER: 'ci', TMUX_PANE: '%3' }, 'ci'],
  ])('records the owner for %j', async (env, owner) => {
    await board();
    await add('a', env);
    expect((await list()).widgets).toMatchObject([{ widgetId: 'w1', owner }]);
  });

  it('shows the label in the frame, from --label, then A2UI_TERM_LABEL, then the owner', async () => {
    const { frame } = await board(120);
    await add('a', { TMUX_PANE: '%3' }, { label: 'api-agent', title: 'Build' });
    await add('b', { TMUX_PANE: '%3', A2UI_TERM_LABEL: 'env-label' });
    await add('c', { TMUX_PANE: '%5' });
    // Ink renders after the reply to add, so wait for each frame line.
    await expect.poll(frame).toContain('╭─ Build · api-agent · w1 ─');
    await expect.poll(frame).toContain('╭─ env-label · w2 ─');
    await expect.poll(frame).toContain('╭─ tmux:%5 · w3 ─');
  });

  it('exits with 1 without a renderer', async () => {
    const result = await run((io) => runAdd(example('progress.jsonl'), session, io));
    expect(result.code).toBe(ExitCode.error);
    expect(result.stderr).toContain('no renderer runs for session "t"');
  });
});

describe('update', () => {
  it('replaces the components at the same position', async () => {
    const { frame } = await board();
    await add('first');
    await add('second');
    const done = input(tmp.dir, 'done.jsonl', [
      {
        version: v,
        updateComponents: {
          surfaceId: 'any',
          components: [{ id: 'root', component: 'Text', text: 'Done' }],
        },
      },
    ]);
    expect((await run((io) => runUpdate('w1', done, session, io))).code).toBe(ExitCode.ok);
    await expect.poll(frame).toContain('Done');
    expect((await list()).widgets.map(({ widgetId }) => widgetId)).toEqual(['w1', 'w2']);
    expect(frame().indexOf('Done')).toBeLessThan(frame().indexOf('second'));
  });

  it('exits with 4 for createSurface', async () => {
    await board();
    await add('a');
    const file = input(tmp.dir, 'create.jsonl', [
      { version: v, createSurface: { surfaceId: 'x', catalogId: CATALOG_ID } },
    ]);
    const result = await run((io) => runUpdate('w1', file, session, io));
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toContain('not createSurface');
  });
});

describe('set', () => {
  it('sets a JSON value', async () => {
    const { frame } = await board();
    await run((io) => runAdd(example('progress.jsonl'), session, io));
    expect((await run((io) => runSet('w1', ['/percent', '"60%"'], session, io))).code).toBe(0);
    await expect.poll(frame).toContain('60%');
  });

  it('takes values as text with --text', async () => {
    const { frame } = await board();
    await run((io) => runAdd(example('progress.jsonl'), session, io));
    const result = await run((io) =>
      runSet('w1', ['/step', 'Compiling', '/percent', '42'], { ...session, text: true }, io),
    );
    expect(result.code).toBe(ExitCode.ok);
    await expect.poll(frame).toContain('Compiling');
    expect(frame()).toContain('42');
  });

  it('removes a value with --delete', async () => {
    const { frame } = await board();
    await run((io) => runAdd(example('progress.jsonl'), session, io));
    await expect.poll(frame).toContain('Done');
    expect((await run((io) => runSet('w1', [], { ...session, delete: ['/step'] }, io))).code).toBe(
      0,
    );
    await expect.poll(frame).not.toContain('Done');
  });

  it('exits with 4 for invalid JSON, names the value, suggests --text and sends nothing', async () => {
    await board();
    await run((io) => runAdd(example('progress.jsonl'), session, io));
    const result = await run((io) =>
      runSet('w1', ['/step', '"ok"', '/percent', '60%'], session, io),
    );
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toContain('60%');
    expect(result.stderr).toContain('--text');
  });

  it.each([
    [['percent', '1'], 'invalid path "percent"'],
    [['/a~2', '1'], 'invalid path "/a~2"'],
    [['/a'], 'the path /a has no value'],
    [[], 'set needs a path and a value'],
  ])('exits with 4 for %j', async (pairs, message) => {
    const result = await run((io) => runSet('w1', pairs, session, io));
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toContain(message);
  });

  it('exits with 4 for a removed widget and names it', async () => {
    await board();
    await add('a');
    await add('b');
    await run((io) => runRemove(['w2'], session, io));
    const result = await run((io) => runSet('w2', ['/x', '1'], session, io));
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toBe('a2ui-term: widget w2 does not exist\n');
  });

  it('exits with 1 without a renderer', async () => {
    const result = await run((io) => runSet('w1', ['/x', '1'], session, io));
    expect(result.code).toBe(ExitCode.error);
    expect(result.stderr).toContain('session "t"');
  });
});

describe('remove', () => {
  it('removes the widgets of the caller with --mine', async () => {
    const { frame } = await board();
    const pane3 = { TMUX_PANE: '%3' };
    await add('one', pane3);
    await add('two', { TMUX_PANE: '%5' });
    await add('three');
    await add('four', pane3);
    const result = await run((io) => runRemove([], { ...session, mine: true }, io), pane3);
    expect(result).toEqual({ code: 0, stdout: '{"removed":["w1","w4"]}\n', stderr: '' });
    expect((await list()).widgets.map(({ widgetId }) => widgetId)).toEqual(['w2', 'w3']);
    await expect.poll(frame).not.toContain('one');
  });

  it('removes named widgets', async () => {
    await board();
    await add('a');
    await add('b');
    const result = await run((io) => runRemove(['w2', 'w1'], session, io));
    expect(result.stdout).toBe('{"removed":["w2","w1"]}\n');
  });

  it('exits with 4 for an unknown id and removes nothing', async () => {
    await board();
    await add('a');
    const result = await run((io) => runRemove(['w1', 'w7'], session, io));
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toContain('w7');
    expect((await list()).widgets).toHaveLength(1);
  });

  it('exits with 1 for --mine without a known owner', async () => {
    await board();
    const result = await run((io) => runRemove([], { ...session, mine: true }, io));
    expect(result.code).toBe(ExitCode.error);
    expect(result.stderr).toContain('no owner is known');
  });

  it('exits with 1 for ids together with --mine', async () => {
    const result = await run((io) => runRemove(['w1'], { ...session, mine: true }, io));
    expect(result.code).toBe(ExitCode.error);
  });
});

describe('list', () => {
  it('prints all widgets in board order', async () => {
    await board();
    await add('a', { TMUX_PANE: '%3' }, { title: 'Build', width: 4 });
    await add('b');
    const result = await run((io) => runList(session, io));
    expect(JSON.parse(result.stdout)).toEqual({
      widgets: [
        {
          widgetId: 'w1',
          title: 'Build',
          label: 'tmux:%3',
          owner: 'tmux:%3',
          width: 4,
          position: 0,
          ended: false,
        },
        {
          widgetId: 'w2',
          title: null,
          label: null,
          owner: null,
          width: 6,
          position: 1,
          ended: false,
        },
      ],
    });
  });

  it('prints only the caller widgets with --mine', async () => {
    await board();
    await add('a', { TMUX_PANE: '%3' });
    await add('b', { TMUX_PANE: '%5' });
    expect((await list({ TMUX_PANE: '%5' }, true)).widgets.map(({ widgetId }) => widgetId)).toEqual(
      ['w2'],
    );
  });

  it('exits with 1 for --mine without a known owner', async () => {
    await board();
    const result = await list({}, true);
    expect(result.code).toBe(ExitCode.error);
    expect(result.stderr).toContain('no owner is known');
  });

  it('exits with 1 without a renderer', async () => {
    expect((await list()).code).toBe(ExitCode.error);
  });
});

describe('M2 commands on the board', () => {
  it('send shows a plain surface as a full-width widget with its surface id', async () => {
    const { frame } = await board();
    expect((await run((io) => runSend(example('confirm.jsonl'), session, io))).code).toBe(0);
    await expect.poll(frame).toMatch(/^╭─ confirm ─+╮$/m);
    expect((await list()).widgets).toMatchObject([{ widgetId: 'confirm', width: 12, owner: null }]);
  });

  it('send rejects a reserved surface id', async () => {
    await board();
    const file = input(tmp.dir, 'reserved.jsonl', [
      { version: v, createSurface: { surfaceId: 'w9', catalogId: CATALOG_ID } },
    ]);
    const result = await run((io) => runSend(file, session, io));
    expect(result.code).toBe(ExitCode.inputError);
    expect(result.stderr).toContain('w9 is reserved');
  });

  it('ask reports the action of a widget with the widget id as surfaceId', async () => {
    const { frame, stdin } = await board();
    const client = clientIo(tmp.dir);
    const asked = runAsk(example('confirm.jsonl'), session, client.io);
    await expect.poll(frame).toContain('Delete');
    stdin.write(keys.enter);
    await expect(asked).resolves.toBe(ExitCode.ok);
    expect(JSON.parse(client.stdout())).toMatchObject({ surfaceId: 'confirm', name: 'confirm' });
  });
});
