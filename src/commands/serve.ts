import { constants } from 'node:os';
import { render, type Instance } from 'ink';
import { createElement } from 'react';
import { A2uiRuntime } from '../a2ui/processor.js';
import { WidgetBoard, type BoardResult } from '../board/registry.js';
import { createLogger, type Logger } from '../log.js';
import type { CloseReason } from '../protocol/messages.js';
import { App, type SessionStatus } from '../render/App.js';
import { PaneServer } from '../server/server.js';
import { NO_HOST, detectHostPane } from '../session/host.js';
import type { Env } from '../session/id.js';
import { ensureRuntimeDir } from '../session/paths.js';
import { locateSession, type Session } from '../session/session.js';
import { probeSocket, readState, removeSessionFiles, writeState } from '../session/state.js';
import { VERSION } from '../version.js';
import { ExitCode } from './exit-codes.js';

const ENTER_ALTERNATE_SCREEN = '\u001B[?1049h';
const LEAVE_ALTERNATE_SCREEN = '\u001B[?1049l\u001B[?25h';
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

type Signal = (typeof SIGNALS)[number];

/** The parts of `process` that `serve` listens on. */
export interface ProcessEvents {
  on(event: Signal | 'uncaughtException', listener: (value: unknown) => void): unknown;
  off(event: Signal | 'uncaughtException', listener: (value: unknown) => void): unknown;
}

export interface ServeIo {
  readonly stdin: NodeJS.ReadStream;
  readonly stdout: NodeJS.WriteStream;
  readonly stderr: NodeJS.WritableStream;
  readonly env: Env;
  readonly logger: Logger;
  readonly process: ProcessEvents;
}

export interface ServeOptions {
  readonly session?: string;
}

const defaultIo = (): ServeIo => ({
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  logger: createLogger(),
  process,
});

type Stop =
  | { readonly reason: 'user' | 'client' }
  | { readonly reason: 'signal'; readonly signal: Signal }
  | { readonly reason: 'error'; readonly error: unknown };

/**
 * Runs the renderer for one session: listens on the session socket and renders
 * what clients send, until the user quits, a client sends `close`, or a signal
 * or uncaught error arrives. Resolves with the process exit code.
 */
export async function runServe(options: ServeOptions, io: ServeIo = defaultIo()): Promise<number> {
  if (!io.stdin.isTTY) {
    return fail(io, 'serve needs a terminal for keyboard input');
  }

  let session: Session;
  try {
    session = locateSession(options.session, io.env);
    ensureRuntimeDir(session.dir);
    await claimSession(session);
  } catch (error) {
    return fail(io, errorMessage(error));
  }

  const runtime = new A2uiRuntime();
  runtime.onAction((event) => {
    io.logger.write('action', { ...event });
  });
  runtime.onOutbound((message) => {
    io.logger.write('outbound', { ...message });
  });

  const board = new WidgetBoard(runtime);
  const pane = detectHostPane(io.env);
  let status: SessionStatus = { sessionId: session.id, clients: 0 };
  let instance: Instance | undefined;
  let stop: Stop | undefined;
  let stopped: Promise<void> | undefined;

  const shutdown = (reason: Stop) => {
    if (stop) {
      return;
    }
    stop = reason;
    stopped = server.stop(closeReason(reason));
    instance?.unmount();
  };

  let server: PaneServer;
  try {
    server = await PaneServer.listen({
      socket: session.paths.socket,
      renderer: {
        apply: (messages) => {
          const errors = board.apply(messages);
          for (const error of errors) {
            io.logger.write('error', { ...error });
          }
          return errors;
        },
        clear: () => {
          board.clear();
        },
        onAction: (handler) => board.onAction(handler),
        add: (request) => logged(io.logger, 'add', board.add(request)),
        update: (widgetId, messages) =>
          logged(io.logger, 'update', board.update(widgetId, messages)),
        remove: (target) => logged(io.logger, 'remove', board.remove(target)),
        list: () => board.list(),
      },
      version: VERSION,
      logger: io.logger,
      onClientCount: (clients) => {
        status = { ...status, clients };
        instance?.rerender(createElement(App, { board, session: status }));
      },
      // Focusing the pane needs a host adapter (add-tmux-board).
      onFocus: () => {
        io.logger.write('focus requested');
      },
      onCloseRequest: () => {
        shutdown({ reason: 'client' });
      },
    });
  } catch (error) {
    runtime.dispose();
    return fail(io, `cannot listen on ${session.paths.socket}: ${errorMessage(error)}`);
  }

  writeState(session.paths.state, {
    pid: process.pid,
    host: pane?.host ?? NO_HOST,
    paneRef: pane?.paneId ?? null,
    createdAt: new Date().toISOString(),
  });
  io.logger.write('serve started', { session: session.id, socket: session.paths.socket });

  const onSignal = SIGNALS.map((signal) => {
    const listener = () => {
      shutdown({ reason: 'signal', signal });
    };
    io.process.on(signal, listener);
    return [signal, listener] as const;
  });
  const onError = (error: unknown) => {
    shutdown({ reason: 'error', error });
  };
  io.process.on('uncaughtException', onError);

  try {
    io.stdout.write(ENTER_ALTERNATE_SCREEN);
    instance = render(createElement(App, { board, session: status }), {
      stdin: io.stdin,
      stdout: io.stdout,
      // Ink renders no frames when it detects CI, for example CI=true, even on
      // a terminal. The board always runs on a terminal, so render live.
      interactive: io.stdout.isTTY,
      exitOnCtrlC: false,
      patchConsole: false,
    });
    await instance.waitUntilExit();
  } catch (error) {
    shutdown({ reason: 'error', error });
  } finally {
    // Ink exits on its own only when the user quits.
    shutdown({ reason: 'user' });
    await stopped;
    restoreTerminal(io.stdout);
    removeSessionFiles(session.paths);
    for (const [signal, listener] of onSignal) {
      io.process.off(signal, listener);
    }
    io.process.off('uncaughtException', onError);
    board.dispose();
    runtime.dispose();
  }

  io.logger.write('serve stopped', { session: session.id, reason: stop?.reason });
  return exitCode(io, stop);
}

/** Writes a failed widget request to the log and returns the result unchanged. */
function logged<T>(logger: Logger, request: string, result: BoardResult<T>): BoardResult<T> {
  if (!result.ok) {
    logger.write('error', { request, message: result.error });
  }
  return result;
}

/**
 * Makes sure no other renderer serves the session, and removes the files of a
 * renderer that died without cleanup.
 */
async function claimSession(session: Session): Promise<void> {
  const result = await probeSocket(session.paths.socket);
  if (result === 'live') {
    const pid = readState(session.paths.state)?.pid;
    throw new Error(
      `session "${session.id}" already has a renderer${pid === undefined ? '' : ` (pid ${pid})`}`,
    );
  }
  removeSessionFiles(session.paths);
}

/** A signal stops the renderer on behalf of the user, so clients see `user`. */
function closeReason(stop: Stop): CloseReason {
  return stop.reason === 'signal' ? 'user' : stop.reason;
}

function exitCode(io: ServeIo, stop: Stop | undefined): number {
  if (stop?.reason === 'signal') {
    // Shells report a process that ends on a signal as 128 plus the signal number.
    return 128 + constants.signals[stop.signal];
  }
  if (stop?.reason === 'error') {
    return fail(io, `stopped after an error: ${errorMessage(stop.error)}`);
  }
  return ExitCode.ok;
}

function restoreTerminal(stdout: NodeJS.WriteStream): void {
  try {
    stdout.write(LEAVE_ALTERNATE_SCREEN);
  } catch {
    // The terminal is gone, for example after SIGHUP.
  }
}

function fail(io: { readonly stderr: NodeJS.WritableStream }, message: string): number {
  io.stderr.write(`a2ui-term: ${message}\n`);
  return ExitCode.error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
