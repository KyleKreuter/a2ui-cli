import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clientIo, fakeHosts } from '../../test/commands.js';
import { tmuxEnv } from '../../test/hosts.js';
import { socketDir } from '../../test/socket.js';
import { runClose } from './close.js';
import { ExitCode } from './exit-codes.js';
import { runOpen } from './open.js';

let tmp: { dir: string; remove: () => void };

beforeEach(() => {
  tmp = socketDir();
});

afterEach(() => {
  tmp.remove();
});

describe('open', () => {
  it('prints session, socket, host and pane as JSON, also for a second agent', async () => {
    const fake = fakeHosts(tmp.dir);
    const first = clientIo(tmp.dir, tmuxEnv('%3'));
    await expect(runOpen({ session: 't' }, { ...first.io, hosts: fake.hosts })).resolves.toBe(
      ExitCode.ok,
    );
    const printed = JSON.parse(first.stdout()) as Record<string, unknown>;
    expect(printed).toEqual({
      session: 't',
      socket: `${tmp.dir}/a2ui-term/t.sock`,
      host: 'tmux',
      paneId: '%9',
    });

    const second = clientIo(tmp.dir, tmuxEnv('%12'));
    await expect(runOpen({ session: 't' }, { ...second.io, hosts: fake.hosts })).resolves.toBe(
      ExitCode.ok,
    );
    expect(JSON.parse(second.stdout())).toEqual(printed);
    expect(fake.boards).toHaveLength(1);

    await runClose({ session: 't' }, { ...first.io, hosts: fake.hosts });
    await (
      await fake.board()
    ).exit;
  });

  it('opens a window with placement window', async () => {
    const fake = fakeHosts(tmp.dir);
    const client = clientIo(tmp.dir, tmuxEnv());
    await runOpen({ session: 't', placement: 'window' }, { ...client.io, hosts: fake.hosts });
    expect(fake.runner.calls[0]?.slice(0, 5)).toEqual(['tmux', 'new-window', '-d', '-n', 'a2ui']);
    await runClose({ session: 't' }, { ...client.io, hosts: fake.hosts });
    await (
      await fake.board()
    ).exit;
  });

  it('refuses a size out of range and opens nothing', async () => {
    const fake = fakeHosts(tmp.dir);
    const client = clientIo(tmp.dir, tmuxEnv());
    await expect(runOpen({ size: '95' }, { ...client.io, hosts: fake.hosts })).resolves.toBe(
      ExitCode.error,
    );
    expect(client.stderr()).toBe(
      'a2ui-term: invalid size "95": use a whole number of percent from 10 to 90\n',
    );
    expect(fake.runner.calls).toEqual([]);
  });

  it('names the missing host and the serve command outside tmux', async () => {
    const fake = fakeHosts(tmp.dir);
    const client = clientIo(tmp.dir, { PATH: '' });
    await expect(runOpen({}, { ...client.io, hosts: fake.hosts })).resolves.toBe(ExitCode.error);
    expect(client.stderr()).toContain('tmux: TMUX is not set');
    expect(client.stderr()).toContain('a2ui-term serve --session default\n');
  });
});
