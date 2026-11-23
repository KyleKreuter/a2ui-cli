import { realpathSync } from 'node:fs';
import { selectHost, HOST_ADAPTERS } from '../hosts/select.js';
import { ProcessRunner } from '../hosts/runner.js';
import type { CommandRunner, HostAdapter, PaneRef } from '../hosts/types.js';
import type { Env } from '../session/id.js';
import { checkRuntimeDir } from '../session/paths.js';
import type { Session } from '../session/session.js';
import { SessionProbeError, probeSocket, readState, type SessionState } from '../session/state.js';
import type { PlacementSettings } from './placement.js';

/** How long `open` waits for the renderer in the new pane. */
export const READY_TIMEOUT_MS = 5000;

/** How often `open` checks whether the renderer answers. */
const READY_POLL_MS = 50;

/**
 * Environment variables that decide where the session files are. A new host
 * pane gets the environment of the host server, not of the caller, so the
 * launcher passes them on.
 */
const FORWARDED_ENV = ['XDG_RUNTIME_DIR', 'TMPDIR'] as const;

/** What the launcher needs from the outside. Tests replace each part. */
export interface HostIo {
  readonly runner: CommandRunner;
  readonly adapters: readonly HostAdapter[];
  /** The command that starts a2ui-term, without its arguments. */
  readonly entry: readonly string[];
  readonly readyTimeoutMs: number;
}

export const defaultHostIo = (env: Env): HostIo => ({
  runner: new ProcessRunner(env),
  adapters: HOST_ADAPTERS,
  entry: rendererEntry(),
  readyTimeoutMs: READY_TIMEOUT_MS,
});

/** The board of a session, as `open` prints it. */
export interface BoardInfo {
  readonly session: string;
  readonly socket: string;
  readonly host: string;
  readonly paneId: PaneRef | null;
}

/** No host can open the board pane. The message names the `serve` command instead. */
export class NoHostError extends Error {
  constructor(
    readonly session: Session,
    readonly reasons: readonly string[],
  ) {
    super(
      `no host can open the board pane (${reasons.join('; ')}). Run the renderer in another terminal: a2ui-term serve --session ${session.id}`,
    );
    this.name = 'NoHostError';
  }
}

/**
 * The same Node.js executable, Node.js flags and a2ui-term entry script as the
 * running process. Through `npx`, the entry script is in the npx cache.
 */
export function rendererEntry(): string[] {
  const script = process.argv[1];
  if (script === undefined) {
    throw new Error('cannot find the a2ui-term entry script');
  }
  return [process.execPath, ...process.execArgv, realpathSync(script)];
}

/** The board of the session when a renderer answers for it, else undefined. */
export async function runningBoard(session: Session): Promise<BoardInfo | undefined> {
  if (!checkRuntimeDir(session.dir) || (await probeSocket(session.paths.socket)) !== 'live') {
    return undefined;
  }
  return boardInfo(session, readState(session.paths.state));
}

/**
 * Opens a pane that runs the renderer for the session, unless one answers
 * already, and waits until it answers. The caller pane keeps the focus.
 * Throws {@link NoHostError} when no host can open a pane.
 */
export async function openBoard(
  session: Session,
  settings: PlacementSettings,
  env: Env,
  hosts: HostIo,
): Promise<BoardInfo> {
  const running = await runningBoard(session);
  if (running) {
    return running;
  }
  const selection = selectHost(env, hosts.adapters);
  if (!selection.adapter) {
    throw new NoHostError(session, selection.reasons);
  }
  const { adapter, callerPane } = selection;
  const pane = await adapter.open(
    {
      callerPane,
      ...settings,
      argv: [...hosts.entry, 'serve', '--session', session.id, '--launched'],
      env: forwardedEnv(env),
      cwd: process.cwd(),
    },
    hosts.runner,
  );

  const state = await waitForRenderer(session, hosts.readyTimeoutMs);
  if (!state) {
    if (adapter.capabilities.close) {
      await adapter.close(pane, hosts.runner).catch(() => undefined);
    }
    throw new Error(
      `the renderer for session "${session.id}" did not answer within ${hosts.readyTimeoutMs / 1000} s in ${adapter.name} pane ${pane}`,
    );
  }
  // Two agents can open a pane at the same time. The renderer that claimed the
  // session wrote the state file; the other pane exits on its own.
  return { ...boardInfo(session, state), host: state.host, paneId: state.paneRef ?? pane };
}

/** Polls until a renderer answers and its state file exists, or the time is up. */
async function waitForRenderer(
  session: Session,
  timeoutMs: number,
): Promise<SessionState | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = readState(session.paths.state);
    if (state && (await answers(session.paths.socket))) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
  return undefined;
}

async function answers(socket: string): Promise<boolean> {
  try {
    return (await probeSocket(socket)) === 'live';
  } catch (error) {
    if (error instanceof SessionProbeError) {
      return false;
    }
    throw error;
  }
}

function boardInfo(session: Session, state: SessionState | undefined): BoardInfo {
  return {
    session: session.id,
    socket: session.paths.socket,
    host: state?.host ?? 'unknown',
    paneId: state?.paneRef ?? null,
  };
}

function forwardedEnv(env: Env): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const name of FORWARDED_ENV) {
    const value = env[name];
    if (value) {
      forwarded[name] = value;
    }
  }
  return forwarded;
}
