import type { Env } from '../session/id.js';
import { findProgram } from './runner.js';
import {
  HostCommandError,
  type CommandRunner,
  type Detection,
  type HostAdapter,
  type OpenRequest,
  type PaneRef,
  type PaneState,
} from './types.js';

/** Name of the tmux window that placement `window` creates. */
export const BOARD_WINDOW = 'a2ui';

/**
 * The tmux adapter. tmux finds its server through `TMUX`, which every child
 * process inherits, so the commands need no socket flag. A command given as
 * several arguments runs without `sh -c`, so the renderer needs no quoting.
 */
export const tmuxAdapter: HostAdapter = {
  name: 'tmux',
  capabilities: { close: true, ownerCheck: true, label: true },

  detect(env: Env): Detection {
    if (!env.TMUX) {
      return { usable: false, reason: 'TMUX is not set, so this is not a tmux pane' };
    }
    const pane = env.TMUX_PANE;
    if (!pane) {
      return { usable: false, reason: 'TMUX_PANE is not set' };
    }
    if (!findProgram('tmux', env)) {
      return { usable: false, reason: 'tmux is not on PATH' };
    }
    return { usable: true, callerPane: pane };
  },

  installed(env: Env): boolean {
    return findProgram('tmux', env);
  },

  instance(env: Env): string | undefined {
    // TMUX holds the socket path, the server pid and the session index.
    return env.TMUX?.split(',')[0] || undefined;
  },

  async open(request: OpenRequest, runner: CommandRunner): Promise<PaneRef> {
    const environment = Object.entries(request.env).flatMap(([name, value]) => [
      '-e',
      `${name}=${value}`,
    ]);
    const argv =
      request.placement === 'window'
        ? ['tmux', 'new-window', '-d', '-n', BOARD_WINDOW, '-c', request.cwd, ...environment]
        : [
            'tmux',
            'split-window',
            '-d',
            request.direction === 'down' ? '-v' : '-h',
            '-l',
            `${request.size}%`,
            '-t',
            request.callerPane,
            '-c',
            request.cwd,
            ...environment,
          ];
    argv.push('-P', '-F', '#{pane_id}', ...request.argv);
    const result = await runner.run(argv);
    const pane = result.stdout.trim();
    if (result.code !== 0 || !pane) {
      throw new HostCommandError(argv, result);
    }
    return pane;
  },

  async paneState(pane: PaneRef, runner: CommandRunner): Promise<PaneState> {
    const result = await describe(pane, '#{pane_dead}', runner);
    if (!result.found) {
      return result.state;
    }
    return result.value === '1' ? 'dead' : 'live';
  },

  async label(pane: PaneRef, runner: CommandRunner): Promise<string | undefined> {
    const result = await describe(pane, '#{window_name}:#{pane_index}', runner);
    return result.found && result.value ? result.value : undefined;
  },

  async close(pane: PaneRef, runner: CommandRunner): Promise<void> {
    const argv = ['tmux', 'kill-pane', '-t', pane];
    const result = await runner.run(argv);
    // A pane that closed on its own in the meantime is fine.
    if (result.code !== 0 && (await tmuxAdapter.paneState(pane, runner)) !== 'missing') {
      throw new HostCommandError(argv, result);
    }
  },
};

/**
 * Expands `format` for `pane`. tmux 3.8 expands an unknown target to empty
 * values and exits with 0, so the output starts with the pane id to tell a
 * missing pane apart. Older tmux versions fail with "can't find pane".
 */
type Described =
  | { readonly found: true; readonly value: string }
  | { readonly found: false; readonly state: 'missing' | 'unknown' };

async function describe(pane: PaneRef, format: string, runner: CommandRunner): Promise<Described> {
  const result = await runner.run([
    'tmux',
    'display-message',
    '-p',
    '-t',
    pane,
    `#{pane_id} ${format}`,
  ]);
  if (result.timedOut) {
    return { found: false, state: 'unknown' };
  }
  if (result.code !== 0) {
    return { found: false, state: /can't find/.test(result.stderr) ? 'missing' : 'unknown' };
  }
  const output = result.stdout.replace(/\n$/, '');
  const separator = output.indexOf(' ');
  const id = separator === -1 ? output : output.slice(0, separator);
  return id === pane
    ? { found: true, value: separator === -1 ? '' : output.slice(separator + 1) }
    : { found: false, state: 'missing' };
}
