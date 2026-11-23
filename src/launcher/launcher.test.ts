import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clientIo, fakeHosts, startServe } from '../../test/commands.js';
import { tmuxEnv } from '../../test/hosts.js';
import { socketDir } from '../../test/socket.js';
import { runClose } from '../commands/close.js';
import { locateSession } from '../session/session.js';
import { NoHostError, openBoard } from './launcher.js';
import { resolvePlacement } from './placement.js';

let tmp: { dir: string; remove: () => void };

beforeEach(() => {
  tmp = socketDir();
});

afterEach(() => {
  tmp.remove();
});

const defaults = resolvePlacement({}, {});
const env = (pane = '%3') => ({ ...tmuxEnv(pane), XDG_RUNTIME_DIR: tmp.dir });
const session = () => locateSession('t', env());
const close = (hosts: ReturnType<typeof fakeHosts>['hosts']) =>
  runClose({ session: 't' }, { ...clientIo(tmp.dir).io, hosts });

describe('openBoard', () => {
  it('opens a split next to the caller that runs the renderer, and waits for it', async () => {
    const fake = fakeHosts(tmp.dir);
    await expect(openBoard(session(), defaults, env(), fake.hosts)).resolves.toEqual({
      session: 't',
      socket: session().paths.socket,
      host: 'tmux',
      paneId: '%9',
    });
    expect(fake.runner.calls).toEqual([
      [
        'tmux',
        'split-window',
        '-d',
        '-h',
        '-l',
        '40%',
        '-t',
        '%3',
        '-c',
        process.cwd(),
        '-e',
        `XDG_RUNTIME_DIR=${tmp.dir}`,
        '-P',
        '-F',
        '#{pane_id}',
        '/usr/bin/node',
        '/opt/a2ui-term/dist/cli.js',
        'serve',
        '--session',
        't',
        '--launched',
      ],
    ]);
    await close(fake.hosts);
    await (
      await fake.board()
    ).exit;
  });

  it('opens no pane when a renderer answers, and reports its pane', async () => {
    const serve = await startServe(tmp.dir, { env: { TMUX_PANE: '%4' } });
    const fake = fakeHosts(tmp.dir);
    await expect(openBoard(session(), defaults, env('%7'), fake.hosts)).resolves.toMatchObject({
      host: 'tmux',
      paneId: '%4',
    });
    expect(fake.runner.calls).toEqual([]);
    await close(fake.hosts);
    await serve.exit;
  });

  it('names the reason and the serve command when no host is usable', async () => {
    const fake = fakeHosts(tmp.dir);
    const outside = { XDG_RUNTIME_DIR: tmp.dir, PATH: '' };
    const failure = openBoard(session(), defaults, outside, fake.hosts);
    await expect(failure).rejects.toBeInstanceOf(NoHostError);
    await expect(failure).rejects.toThrow(
      'no host can open the board pane (tmux: TMUX is not set, so this is not a tmux pane). Run the renderer in another terminal: a2ui-term serve --session t',
    );
    expect(fake.runner.calls).toEqual([]);
  });

  it('closes the new pane and names session and host when the renderer does not answer', async () => {
    const fake = fakeHosts(tmp.dir, { start: false });
    const started = Date.now();
    await expect(openBoard(session(), defaults, env(), fake.hosts)).rejects.toThrow(
      'the renderer for session "t" did not answer within 0.2 s in tmux pane %9',
    );
    expect(Date.now() - started).toBeLessThan(2000);
    expect(fake.runner.calls.at(-1)).toEqual(['tmux', 'kill-pane', '-t', '%9']);
  });

  it('reports a failing host command', async () => {
    const fake = fakeHosts(tmp.dir);
    fake.runner.when(['tmux', 'split-window'], { code: 1, stderr: 'no space for new pane' });
    await expect(openBoard(session(), defaults, env(), fake.hosts)).rejects.toThrow(
      /^tmux split-window .+ failed with exit code 1: no space for new pane$/,
    );
  });
});
