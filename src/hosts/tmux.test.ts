import { describe, expect, it } from 'vitest';
import { FakeRunner, pathWith, tmuxEnv } from '../../test/hosts.js';
import { tmuxAdapter } from './tmux.js';
import type { OpenRequest } from './types.js';

const renderer = ['/usr/bin/node', '/opt/a2ui-term/dist/cli.js', 'serve', '--session', 'default'];

const request = (overrides: Partial<OpenRequest> = {}): OpenRequest => ({
  callerPane: '%3',
  placement: 'split',
  direction: 'right',
  size: 40,
  argv: renderer,
  env: {},
  cwd: '/work',
  ...overrides,
});

describe('tmux detection', () => {
  it('is usable inside tmux with tmux on PATH, with the caller pane', () => {
    expect(tmuxAdapter.detect(tmuxEnv('%3'))).toEqual({ usable: true, callerPane: '%3' });
  });

  it('is not usable without TMUX', () => {
    expect(tmuxAdapter.detect({ TMUX_PANE: '%3', PATH: pathWith('tmux') })).toEqual({
      usable: false,
      reason: 'TMUX is not set, so this is not a tmux pane',
    });
  });

  it('is not usable when tmux is not on PATH', () => {
    expect(tmuxAdapter.detect({ ...tmuxEnv(), PATH: pathWith() })).toEqual({
      usable: false,
      reason: 'tmux is not on PATH',
    });
  });
});

describe('tmux server', () => {
  it('is the socket path in TMUX', () => {
    expect(tmuxAdapter.instance(tmuxEnv())).toBe('/tmp/tmux-501/default');
    expect(tmuxAdapter.instance({})).toBeUndefined();
  });
});

describe('tmux commands', () => {
  it.each([
    [{}, ['split-window', '-d', '-h', '-l', '40%', '-t', '%3', '-c', '/work']],
    [
      { direction: 'down', size: 25 },
      ['split-window', '-d', '-v', '-l', '25%', '-t', '%3', '-c', '/work'],
    ],
    [{ placement: 'window' }, ['new-window', '-d', '-n', 'a2ui', '-c', '/work']],
  ] as const)('opens the board for %j without moving the focus', async (overrides, command) => {
    const runner = new FakeRunner().when(['tmux'], { stdout: '%9\n' });
    await expect(tmuxAdapter.open(request(overrides), runner)).resolves.toBe('%9');
    expect(runner.calls).toEqual([['tmux', ...command, '-P', '-F', '#{pane_id}', ...renderer]]);
  });

  it('passes environment variables to the new pane', async () => {
    const runner = new FakeRunner().when(['tmux'], { stdout: '%9' });
    await tmuxAdapter.open(request({ env: { XDG_RUNTIME_DIR: '/run/user/1000' } }), runner);
    expect(runner.calls[0]).toEqual([
      'tmux',
      'split-window',
      '-d',
      '-h',
      '-l',
      '40%',
      '-t',
      '%3',
      '-c',
      '/work',
      '-e',
      'XDG_RUNTIME_DIR=/run/user/1000',
      '-P',
      '-F',
      '#{pane_id}',
      ...renderer,
    ]);
  });

  it('names the command and its stderr when tmux fails', async () => {
    const runner = new FakeRunner().when(['tmux'], { code: 1, stderr: 'no space for new pane' });
    await expect(tmuxAdapter.open(request(), runner)).rejects.toThrow(
      /^tmux split-window .+ failed with exit code 1: no space for new pane$/,
    );
  });

  it('names the command when tmux hangs', async () => {
    const runner = new FakeRunner().when(['tmux'], { code: null, timedOut: true });
    await expect(tmuxAdapter.open(request(), runner)).rejects.toThrow(
      /^tmux split-window .+ did not finish within 3 seconds$/,
    );
  });

  it.each([
    [{ stdout: '%7 0\n' }, 'live'],
    [{ stdout: '%7 1\n' }, 'dead'],
    // tmux 3.8 expands a missing target to empty values and exits with 0.
    [{ stdout: ' \n' }, 'missing'],
    [{ code: 1, stderr: "can't find pane: %7" }, 'missing'],
    [{ code: 1, stderr: 'no server running on /tmp/tmux-501/default' }, 'unknown'],
    [{ code: null, timedOut: true }, 'unknown'],
  ] as const)('reads the pane state from %j', async (result, state) => {
    const runner = new FakeRunner().when(['tmux'], result);
    await expect(tmuxAdapter.paneState('%7', runner)).resolves.toBe(state);
    expect(runner.calls).toEqual([
      ['tmux', 'display-message', '-p', '-t', '%7', '#{pane_id} #{pane_dead}'],
    ]);
  });

  it('reads the window name and pane index as label', async () => {
    const runner = new FakeRunner().when(['tmux'], { stdout: '%3 my api:1\n' });
    await expect(tmuxAdapter.label('%3', runner)).resolves.toBe('my api:1');
    expect(runner.calls).toEqual([
      ['tmux', 'display-message', '-p', '-t', '%3', '#{pane_id} #{window_name}:#{pane_index}'],
    ]);
  });

  it.each([[{ code: 1 }], [{ stdout: ' :\n' }]])('has no label for %j', async (result) => {
    const runner = new FakeRunner().when(['tmux'], result);
    await expect(tmuxAdapter.label('%3', runner)).resolves.toBeUndefined();
  });

  it('closes a pane and passes a pane id with shell characters as one argument', async () => {
    const runner = new FakeRunner();
    await tmuxAdapter.close('x;rm -rf ~', runner);
    expect(runner.calls).toEqual([['tmux', 'kill-pane', '-t', 'x;rm -rf ~']]);
  });

  it('accepts a pane that closed on its own before kill-pane', async () => {
    const runner = new FakeRunner().when(['tmux'], { code: 1, stderr: "can't find pane" });
    await expect(tmuxAdapter.close('%9', runner)).resolves.toBeUndefined();
  });

  it('fails when kill-pane fails for a pane that still exists', async () => {
    const runner = new FakeRunner()
      .when(['tmux', 'kill-pane'], { code: 1, stderr: 'denied' })
      .when(['tmux', 'display-message'], { stdout: '%9 0' });
    await expect(tmuxAdapter.close('%9', runner)).rejects.toThrow('tmux kill-pane -t %9');
  });
});
