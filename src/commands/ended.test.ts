import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clientIo, input, startServe, type Serve } from '../../test/commands.js';
import { FakeRunner, pathWith, tmuxEnv } from '../../test/hosts.js';
import { socketDir } from '../../test/socket.js';
import { CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { HOST_ADAPTERS } from '../hosts/select.js';
import { runAdd } from './add.js';
import { runClose } from './close.js';
import { ExitCode } from './exit-codes.js';
import { runList } from './list.js';
import { runRemove } from './remove.js';

let tmp: { dir: string; remove: () => void };
let serve: Serve | undefined;

beforeEach(() => {
  tmp = socketDir();
});

afterEach(async () => {
  if (serve) {
    await runClose({ session: 't' }, clientIo(tmp.dir).io);
    await serve.exit;
    serve = undefined;
  }
  tmp.remove();
});

const text = (value: string) => [
  {
    version: PROTOCOL_VERSION,
    createSurface: {
      surfaceId: 'x',
      catalogId: CATALOG_ID,
      components: [{ id: 'root', component: 'Text', text: value }],
    },
  },
];

/** A fake tmux in which the panes in `gone` do not exist. */
function tmux(gone: Set<string>) {
  return new FakeRunner().on((argv) => {
    if (argv[1] !== 'display-message') {
      return undefined;
    }
    const pane = argv[4] ?? '';
    if (gone.has(pane)) {
      return { stdout: ' \n' };
    }
    return { stdout: argv[5]?.includes('window_name') ? `${pane} api:1\n` : `${pane} 0\n` };
  });
}

async function board(runner: FakeRunner) {
  serve = await startServe(tmp.dir, {
    env: { PATH: pathWith('tmux') },
    hosts: { runner, adapters: HOST_ADAPTERS },
    ownerCheckMs: 50,
  });
  return serve;
}

const add = (value: string, owner: string) =>
  runAdd(
    input(tmp.dir, `${value}.jsonl`, text(value)),
    { session: 't', owner, label: owner },
    {
      ...clientIo(tmp.dir).io,
    },
  );

describe('ended widgets', () => {
  it('marks the widgets of a closed agent pane as ended and keeps them', async () => {
    const gone = new Set<string>();
    const shown = await board(tmux(gone));
    await add('alpha', 'tmux:%3');
    await add('beta', 'tmux:%4');
    await add('gamma', 'wezterm:12');
    await expect.poll(shown.frame).toContain('gamma');
    gone.add('%3');
    await expect.poll(shown.frame).toContain('tmux:%3 · w1 · ended');
    expect(shown.frame()).toContain('alpha');
    expect(shown.frame()).not.toMatch(/w2 · ended/);

    const listed = clientIo(tmp.dir);
    await runList({ session: 't' }, listed.io);
    const widgets = (JSON.parse(listed.stdout()) as { widgets: { ended: boolean }[] }).widgets;
    expect(widgets.map((widget) => widget.ended)).toEqual([true, false, false]);
  });

  it('remove --ended removes all ended widgets', async () => {
    const gone = new Set<string>();
    const shown = await board(tmux(gone));
    await add('alpha', 'tmux:%3');
    await add('beta', 'tmux:%4');
    await add('gamma', 'tmux:%5');
    await add('delta', 'tmux:%3');
    gone.add('%3');
    await expect.poll(shown.frame).toMatch(/w4 · ended/);

    const client = clientIo(tmp.dir);
    await expect(runRemove([], { session: 't', ended: true }, client.io)).resolves.toBe(
      ExitCode.ok,
    );
    expect(client.stdout()).toBe('{"removed":["w1","w4"]}\n');
    await expect.poll(shown.frame).not.toContain('alpha');
    expect(shown.frame()).toContain('beta');
  });

  it('remove refuses --ended together with ids or --mine', async () => {
    const client = clientIo(tmp.dir);
    await expect(runRemove(['w1'], { ended: true }, client.io)).resolves.toBe(ExitCode.error);
    await expect(runRemove([], { ended: true, mine: true }, client.io)).resolves.toBe(
      ExitCode.error,
    );
    expect(client.stderr()).toBe(
      'a2ui-term: pass either widget ids, --mine or --ended\n'.repeat(2),
    );
  });
});

describe('label from tmux', () => {
  it('add uses the window name and pane index of the caller pane', async () => {
    const runner = tmux(new Set());
    const shown = await board(runner);
    const caller = clientIo(tmp.dir, tmuxEnv('%3'));
    const io = { ...caller.io, hosts: defaultsFor(runner) };
    await runAdd(input(tmp.dir, 'a.jsonl', text('alpha')), { session: 't' }, io);
    await expect.poll(shown.frame).toContain('api:1 · w1');
    expect(runner.calls).toContainEqual([
      'tmux',
      'display-message',
      '-p',
      '-t',
      '%3',
      '#{pane_id} #{window_name}:#{pane_index}',
    ]);
  });

  it('--label and A2UI_TERM_LABEL come before the tmux label', async () => {
    const runner = tmux(new Set());
    const shown = await board(runner);
    const flagged = clientIo(tmp.dir, tmuxEnv('%3'));
    await runAdd(
      input(tmp.dir, 'a.jsonl', text('alpha')),
      { session: 't', label: 'reviewer' },
      { ...flagged.io, hosts: defaultsFor(runner) },
    );
    const named = clientIo(tmp.dir, { ...tmuxEnv('%3'), A2UI_TERM_LABEL: 'planner' });
    await runAdd(
      input(tmp.dir, 'b.jsonl', text('beta')),
      { session: 't' },
      { ...named.io, hosts: defaultsFor(runner) },
    );
    await expect.poll(shown.frame).toContain('planner · w2');
    expect(shown.frame()).toContain('reviewer · w1');
    expect(runner.calls.filter((argv) => argv[5]?.includes('window_name'))).toEqual([]);
  });
});

function defaultsFor(runner: FakeRunner) {
  return { runner, adapters: HOST_ADAPTERS, entry: ['node', 'cli.js'], readyTimeoutMs: 200 };
}
