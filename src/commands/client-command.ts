import { readFile } from 'node:fs/promises';
import {
  ActionTimeoutError,
  NoRendererError,
  PaneClient,
  RendererClosedError,
  RequestError,
} from '../client/client.js';
import { NoHostError, defaultHostIo, openBoard, type HostIo } from '../launcher/launcher.js';
import { resolvePlacement } from '../launcher/placement.js';
import { parseMessages } from '../protocol/jsonl.js';
import type { Env } from '../session/id.js';
import { resolveOwner } from '../session/owner.js';
import { checkRuntimeDir } from '../session/paths.js';
import { locateSession, type Session } from '../session/session.js';
import { ExitCode } from './exit-codes.js';

export interface ClientIo {
  readonly stdin: NodeJS.ReadStream;
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
  readonly env: Env;
  /** Host access for opening the board. Defaults to the real hosts. */
  readonly hosts?: HostIo;
}

export interface SessionOptions {
  readonly session?: string;
}

export interface LaunchOptions extends SessionOptions {
  /** Open the board when no renderer runs. `--no-open` sets it to false. */
  readonly open?: boolean;
}

export interface SendOptions extends LaunchOptions {
  /** Remove all surfaces before the input messages. */
  readonly clear?: boolean;
}

export const defaultClientIo = (): ClientIo => ({
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
});

/** A failure that ends the command with an exit code and a message. */
export class CommandError extends Error {
  constructor(
    readonly exitCode: ExitCode,
    message: string,
  ) {
    super(message);
  }
}

/** No renderer runs for the session. */
export class NotRunningError extends CommandError {
  constructor(session: Session) {
    super(
      ExitCode.error,
      `no renderer runs for session "${session.id}". Start one with: a2ui-term serve --session ${session.id}`,
    );
  }
}

/** Runs a client command and turns its failure into a message and an exit code. */
export async function runClientCommand(
  io: ClientIo,
  command: () => Promise<number>,
): Promise<number> {
  try {
    return await command();
  } catch (error) {
    const { exitCode, message } = toCommandError(error);
    io.stderr.write(`a2ui-term: ${message}\n`);
    return exitCode;
  }
}

/** Reads and parses the whole input, so that nothing is sent when any line is invalid. */
export async function readMessages(source: string | undefined, io: ClientIo): Promise<unknown[]> {
  const fromStdin = source === undefined || source === '-';
  if (fromStdin && io.stdin.isTTY) {
    throw new CommandError(
      ExitCode.error,
      'no input. Pass a file, or pipe A2UI messages into stdin.',
    );
  }
  let input: string;
  try {
    input = fromStdin ? await readAll(io.stdin) : await readFile(source, 'utf8');
  } catch (error) {
    throw new CommandError(
      ExitCode.error,
      `cannot read ${fromStdin ? 'stdin' : source}: ${readError(error)}`,
    );
  }
  const { messages, errors } = parseMessages(input);
  if (errors.length > 0) {
    throw new CommandError(
      ExitCode.inputError,
      errors.map((error) => `line ${error.line}: ${error.message}`).join('\na2ui-term: '),
    );
  }
  return messages;
}

/** Connects to the session renderer. Throws {@link NotRunningError} when none runs. */
export async function connect(session: Session): Promise<PaneClient> {
  if (!checkRuntimeDir(session.dir)) {
    throw new NotRunningError(session);
  }
  try {
    return await PaneClient.connect(session.paths.socket);
  } catch (error) {
    throw error instanceof NoRendererError ? new NotRunningError(session) : error;
  }
}

/** The host access of the command: the one of the io, else the real hosts. */
export function hostsOf(io: ClientIo): HostIo {
  return io.hosts ?? defaultHostIo(io.env);
}

/**
 * Connects to the session renderer. When none runs, opens the board first,
 * unless `options.open` is false. Placement comes from the environment.
 */
export async function connectOrOpen(
  session: Session,
  options: LaunchOptions,
  io: ClientIo,
): Promise<PaneClient> {
  try {
    return await connect(session);
  } catch (error) {
    if (!(error instanceof NotRunningError) || options.open === false) {
      throw error;
    }
  }
  try {
    await openBoard(session, resolvePlacement({}, io.env), io.env, hostsOf(io));
  } catch (error) {
    if (error instanceof NoHostError) {
      throw new CommandError(
        ExitCode.error,
        `no renderer runs for session "${session.id}" and ${error.message}`,
      );
    }
    throw error;
  }
  return connect(session);
}

/**
 * Connects to the renderer of the session, runs `action`, and ends the
 * connection. With `launch`, opens the board first when no renderer runs.
 */
export async function withClient<T>(
  options: LaunchOptions,
  io: ClientIo,
  action: (client: PaneClient) => Promise<T>,
  { launch = false }: { readonly launch?: boolean } = {},
): Promise<T> {
  const session = locateSession(options.session, io.env);
  const client = await (launch ? connectOrOpen(session, options, io) : connect(session));
  try {
    return await action(client);
  } finally {
    client.end();
  }
}

/** The owner of the caller for `--mine`. Throws with exit code 1 when none is known. */
export function requireOwner(flag: string | undefined, io: ClientIo): string {
  const owner = resolveOwner(flag, io.env);
  if (owner === undefined) {
    throw new CommandError(
      ExitCode.error,
      'no owner is known for --mine. Run inside tmux, Zellij, WezTerm or kitty, set A2UI_TERM_OWNER, or pass --owner.',
    );
  }
  return owner;
}

/** Writes `value` to stdout as one JSON line. */
export function printJson(io: ClientIo, value: unknown): void {
  io.stdout.write(`${JSON.stringify(value)}\n`);
}

/**
 * Sends every message and fails with exit code 4 when the renderer rejects one.
 * With `clear`, removes all surfaces first. The server handles one connection
 * in order, so the messages see the cleared renderer.
 */
export async function deliver(
  client: PaneClient,
  messages: readonly unknown[],
  { clear = false }: { readonly clear?: boolean } = {},
): Promise<void> {
  if (clear) {
    client.send({ type: 'clear' });
  }
  for (const message of messages) {
    client.send({ type: 'a2ui', message });
  }
  const errors = await client.confirm();
  if (errors.length > 0) {
    throw new CommandError(ExitCode.inputError, errors.join('\na2ui-term: '));
  }
}

function toCommandError(error: unknown): CommandError {
  if (error instanceof CommandError) {
    return error;
  }
  if (error instanceof RequestError) {
    return new CommandError(ExitCode.inputError, error.message);
  }
  if (error instanceof ActionTimeoutError) {
    return new CommandError(ExitCode.timeout, error.message);
  }
  if (error instanceof RendererClosedError) {
    return new CommandError(
      error.reason === 'user' ? ExitCode.userClosed : ExitCode.error,
      error.reason === 'user' ? 'the user closed the renderer' : error.message,
    );
  }
  return new CommandError(ExitCode.error, error instanceof Error ? error.message : String(error));
}

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function readError(error: unknown): string {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    return 'no such file';
  }
  return error instanceof Error ? error.message : String(error);
}
