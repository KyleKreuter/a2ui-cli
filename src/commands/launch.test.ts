import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clientIo, fakeHosts, input, startServe } from '../../test/commands.js';
import { tmuxEnv } from '../../test/hosts.js';
import { keys } from '../../test/ink.js';
import { socketDir } from '../../test/socket.js';
import { CATALOG_ID, PROTOCOL_VERSION } from '../a2ui/processor.js';
import { runAdd } from './add.js';
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

const button = [
  {
    version: PROTOCOL_VERSION,
    createSurface: {
      surfaceId: 'confirm',
      catalogId: CATALOG_ID,
      components: [
        { id: 'root', component: 'Button', child: 'label', action: { event: { name: 'ok' } } },
        { id: 'label', component: 'Text', text: 'Confirm me' },
      ],
    },
  },
];

/** A caller in tmux pane `%3` with a fake tmux. */
function agent(fake: ReturnType<typeof fakeHosts>, env = tmuxEnv('%3')) {
  const client = clientIo(tmp.dir, env);
  return { ...client, io: { ...client.io, hosts: fake.hosts } };
}

/** The commands that opened a pane. */
const opened = (calls: readonly string[][]) =>
  calls.filter((argv) => argv[1] === 'split-window' || argv[1] === 'new-window');

/** Commands that would move the focus away from the caller pane. */
const focusCommands = (calls: readonly string[][]) =>
  calls.filter((argv) => /^(select|switch)-/.test(argv[1] ?? ''));

describe('automatic launch', () => {
  it('add opens the board, shows the widget, and prints its id', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake);
    await expect(
      runAdd(input(tmp.dir, 'w.jsonl', button), { session: 't' }, caller.io),
    ).resolves.toBe(ExitCode.ok);
    expect(JSON.parse(caller.stdout())).toEqual({ widgetId: 'w1' });
    const board = await fake.board();
    await expect.poll(board.frame).toContain('Confirm me');
    expect(opened(fake.runner.calls).map((argv) => argv.slice(0, 3))).toEqual([
      ['tmux', 'split-window', '-d'],
    ]);
    expect(focusCommands(fake.runner.calls)).toEqual([]);

    await runClose({ session: 't' }, caller.io);
    await board.exit;
  });

  it('the placement comes from the environment', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake, { ...tmuxEnv(), A2UI_TERM_PLACEMENT: 'window' });
    await runAdd(input(tmp.dir, 'w.jsonl', button), { session: 't' }, caller.io);
    expect(opened(fake.runner.calls)[0]?.[1]).toBe('new-window');
    await runClose({ session: 't' }, caller.io);
    await (
      await fake.board()
    ).exit;
  });

  it('send opens the board and renders the messages', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake);
    await expect(
      runSend(input(tmp.dir, 's.jsonl', button), { session: 't' }, caller.io),
    ).resolves.toBe(ExitCode.ok);
    const board = await fake.board();
    await expect.poll(board.screen).toContain('Confirm me');
    await runClose({ session: 't' }, caller.io);
    await board.exit;
  });

  it('ask opens the board and prints the action', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake);
    const exit = runAsk(input(tmp.dir, 'a.jsonl', button), { session: 't' }, caller.io);
    const board = await fake.board();
    await expect.poll(board.screen).toContain('Confirm me');
    board.stdin.write(keys.enter);
    await expect(exit).resolves.toBe(ExitCode.ok);
    expect(JSON.parse(caller.stdout())).toMatchObject({ name: 'ok', surfaceId: 'confirm' });
    await runClose({ session: 't' }, caller.io);
    await board.exit;
  });

  it('a second agent uses the same board', async () => {
    const fake = fakeHosts(tmp.dir);
    const first = agent(fake, tmuxEnv('%3'));
    const second = agent(fake, tmuxEnv('%12'));
    await runAdd(input(tmp.dir, 'a.jsonl', button), { session: 't' }, first.io);
    await runAdd(input(tmp.dir, 'b.jsonl', button), { session: 't' }, second.io);
    expect(JSON.parse(second.stdout())).toEqual({ widgetId: 'w2' });
    expect(fake.boards).toHaveLength(1);
    await runClose({ session: 't' }, first.io);
    await (
      await fake.board()
    ).exit;
  });

  it('--no-open opens nothing and names the serve command', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake);
    await expect(
      runAdd(input(tmp.dir, 'w.jsonl', button), { session: 't', open: false }, caller.io),
    ).resolves.toBe(ExitCode.error);
    expect(caller.stderr()).toBe(
      'a2ui-term: no renderer runs for session "t". Start one with: a2ui-term serve --session t\n',
    );
    expect(opened(fake.runner.calls)).toEqual([]);
  });

  it('without a host, the message names the reason and the serve command', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake, { PATH: '' });
    await expect(
      runSend(input(tmp.dir, 's.jsonl', button), { session: 't' }, caller.io),
    ).resolves.toBe(ExitCode.error);
    expect(caller.stderr()).toBe(
      'a2ui-term: no renderer runs for session "t" and no host can open the board pane (tmux: TMUX is not set, so this is not a tmux pane). Run the renderer in another terminal: a2ui-term serve --session t\n',
    );
  });
});

describe('close', () => {
  it('closes the board pane that stays after the renderer exits', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake);
    await runAdd(input(tmp.dir, 'w.jsonl', button), { session: 't' }, caller.io);
    // remain-on-exit keeps the pane with a dead command.
    fake.runner.when(['tmux', 'display-message'], { stdout: '%9 1\n' });
    await expect(runClose({ session: 't' }, caller.io)).resolves.toBe(ExitCode.ok);
    await (
      await fake.board()
    ).exit;
    expect(fake.runner.calls.slice(-2)).toEqual([
      ['tmux', 'display-message', '-p', '-t', '%9', '#{pane_id} #{pane_dead}'],
      ['tmux', 'kill-pane', '-t', '%9'],
    ]);
  });

  it('leaves the board pane when the caller uses another tmux server', async () => {
    const fake = fakeHosts(tmp.dir);
    await runAdd(input(tmp.dir, 'w.jsonl', button), { session: 't' }, agent(fake).io);
    const elsewhere = agent(fake, tmuxEnv('%9', '/tmp/tmux-501/other,99,0'));
    const calls = fake.runner.calls.length;
    await expect(runClose({ session: 't' }, elsewhere.io)).resolves.toBe(ExitCode.ok);
    await (
      await fake.board()
    ).exit;
    expect(fake.runner.calls.slice(calls)).toEqual([]);
  });

  it('runs no kill-pane when the board pane closed on its own', async () => {
    const fake = fakeHosts(tmp.dir);
    const caller = agent(fake);
    await runAdd(input(tmp.dir, 'w.jsonl', button), { session: 't' }, caller.io);
    fake.runner.when(['tmux', 'display-message'], { stdout: ' \n' });
    await expect(runClose({ session: 't' }, caller.io)).resolves.toBe(ExitCode.ok);
    await (
      await fake.board()
    ).exit;
    expect(fake.runner.calls.filter((argv) => argv[1] === 'kill-pane')).toEqual([]);
  });

  it('leaves the pane of a renderer that the user started', async () => {
    const serve = await startServe(tmp.dir, { env: { TMUX_PANE: '%4' } });
    const fake = fakeHosts(tmp.dir);
    await expect(runClose({ session: 't' }, agent(fake).io)).resolves.toBe(ExitCode.ok);
    await serve.exit;
    expect(fake.runner.calls).toEqual([]);
  });
});
