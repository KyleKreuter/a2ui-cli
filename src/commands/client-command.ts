import { readFile } from 'node:fs/promises';
import {
  ActionTimeoutError,
  NoRendererError,
  PaneClient,
  RendererClosedError,
} from '../client/client.js';
import { parseMessages } from '../protocol/jsonl.js';
import type { Env } from '../session/id.js';
import { checkRuntimeDir } from '../session/paths.js';
import type { Session } from '../session/session.js';
import { ExitCode } from './exit-codes.js';

export interface ClientIo {
  readonly stdin: NodeJS.ReadStream;
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
  readonly env: Env;
}

export interface SessionOptions {
  readonly session?: string;
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

/** Sends every message and fails with exit code 4 when the renderer rejects one. */
export async function deliver(client: PaneClient, messages: readonly unknown[]): Promise<void> {
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
