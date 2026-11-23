import { afterEach, describe, expect, it } from 'vitest';
import { FakeRunner, pathWith } from '../../test/hosts.js';
import { A2uiRuntime, CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { HOST_ADAPTERS } from '../hosts/select.js';
import { watchOwners } from './owner-watch.js';
import { WidgetBoard } from './registry.js';

const widget = [
  {
    version: PROTOCOL_VERSION,
    createSurface: {
      surfaceId: 'x',
      catalogId: CATALOG_ID,
      components: [{ id: 'root', component: 'Text', text: 'hi' }],
    },
  },
];

let stop: (() => void) | undefined;

afterEach(() => {
  stop?.();
});

/** A board with one widget per owner, checked every 20 ms against a fake tmux. */
function watched(owners: readonly string[], env = { PATH: pathWith('tmux') }) {
  const board = new WidgetBoard(new A2uiRuntime());
  for (const owner of owners) {
    board.add({ messages: widget, owner });
  }
  const runner = new FakeRunner().on((argv) => {
    const pane = argv[4] ?? '';
    return { stdout: `${pane} 0\n` };
  });
  stop = watchOwners(board, { adapters: HOST_ADAPTERS, runner, env, intervalMs: 20 });
  const ended = () => board.list().map((info) => info.ended);
  return { board, runner, ended };
}

const settle = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

describe('watchOwners', () => {
  it('marks the widgets of a pane that is gone as ended, and keeps them', async () => {
    const { runner, ended } = watched(['tmux:%3', 'tmux:%4', 'tmux:%3']);
    await settle();
    expect(ended()).toEqual([false, false, false]);
    runner.when(['tmux', 'display-message', '-p', '-t', '%3'], { stdout: ' \n' });
    await expect.poll(ended).toEqual([true, false, true]);
  });

  it('marks the widgets of a pane whose command exited as ended', async () => {
    const { runner, ended } = watched(['tmux:%3']);
    runner.when(['tmux', 'display-message', '-p', '-t', '%3'], { stdout: '%3 1\n' });
    await expect.poll(ended).toEqual([true]);
  });

  it('keeps a widget when tmux cannot tell', async () => {
    const { runner, ended } = watched(['tmux:%3']);
    runner.when(['tmux'], { code: 1, stderr: 'no server running' });
    await settle();
    expect(ended()).toEqual([false]);
  });

  it('checks an ended owner no more', async () => {
    const { runner } = watched(['tmux:%3']);
    runner.when(['tmux'], { stdout: ' \n' });
    await settle();
    const checks = runner.calls.length;
    await settle();
    expect(runner.calls.length).toBe(checks);
  });

  it('skips owners of a host without an adapter, and widgets without owner', async () => {
    const { runner, ended } = watched(['wezterm:12', 'custom-agent']);
    await settle();
    expect(runner.calls).toEqual([]);
    expect(ended()).toEqual([false, false]);
  });

  it('skips tmux owners when tmux is not installed', async () => {
    const { runner } = watched(['tmux:%3'], { PATH: pathWith() });
    await settle();
    expect(runner.calls).toEqual([]);
  });
});
