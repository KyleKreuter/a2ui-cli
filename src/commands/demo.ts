import { openSync } from 'node:fs';
import { constants } from 'node:os';
import { readFile } from 'node:fs/promises';
import { ReadStream } from 'node:tty';
import { render } from 'ink';
import { createElement } from 'react';
import { A2uiRuntime, type RuntimeError } from '../a2ui/processor.js';
import { WidgetBoard } from '../board/registry.js';
import { createLogger, type Logger } from '../log.js';
import { App } from '../render/App.js';

export interface DemoIo {
  readonly stdin: NodeJS.ReadStream;
  readonly stderr: NodeJS.WritableStream;
  readonly logger: Logger;
}

const defaultIo = (): DemoIo => ({
  stdin: process.stdin,
  stderr: process.stderr,
  logger: createLogger(),
});

/**
 * Renders A2UI messages from a file, or from stdin for `-` or no argument, in
 * the current terminal. Resolves with the process exit code.
 */
export async function runDemo(
  source: string | undefined,
  io: DemoIo = defaultIo(),
): Promise<number> {
  const fromStdin = source === undefined || source === '-';
  if (fromStdin && io.stdin.isTTY) {
    return fail(io, 'no input. Pass a file, or pipe A2UI messages into stdin.');
  }

  let input: string;
  try {
    input = fromStdin ? await readAll(io.stdin) : await readFile(source, 'utf8');
  } catch (error) {
    return fail(io, `cannot read ${fromStdin ? 'stdin' : source}: ${reason(error)}`);
  }

  let keyboard: NodeJS.ReadStream;
  try {
    keyboard = io.stdin.isTTY ? io.stdin : openTerminal();
  } catch (error) {
    return fail(io, `cannot open the terminal for keyboard input: ${reason(error)}`);
  }

  const runtime = new A2uiRuntime();
  runtime.onAction((event) => {
    io.logger.write('action', { ...event });
  });
  runtime.onOutbound((message) => {
    io.logger.write('outbound', { ...message });
  });
  const errors = runtime.applyText(input);
  for (const error of errors) {
    io.logger.write('error', { ...error });
  }

  const board = new WidgetBoard(runtime);
  const instance = render(createElement(App, { board }), {
    stdin: keyboard,
    // Ink renders no frames when it detects CI, for example CI=true, even on
    // a terminal. Decide by the terminal alone.
    interactive: process.stdout.isTTY === true,
    exitOnCtrlC: false,
    alternateScreen: true,
  });
  let stoppedBy: NodeJS.Signals | undefined;
  const stop = (signal: NodeJS.Signals) => {
    stoppedBy = signal;
    instance.unmount();
  };
  const signals = ['SIGTERM', 'SIGHUP', 'SIGINT'] as const;
  for (const signal of signals) {
    process.once(signal, stop);
  }

  try {
    await instance.waitUntilExit();
  } finally {
    for (const signal of signals) {
      process.off(signal, stop);
    }
    if (keyboard !== io.stdin) {
      keyboard.destroy();
    }
    runtime.dispose();
  }

  reportErrors(io, errors);
  // Shells report a process that ends on a signal as 128 plus the signal number.
  return stoppedBy ? 128 + constants.signals[stoppedBy] : 0;
}

/** Opens the controlling terminal, so that keys work while stdin is a pipe. */
function openTerminal(): NodeJS.ReadStream {
  if (process.platform === 'win32') {
    throw new Error('reading keys while stdin is a pipe is not supported on Windows; pass a file');
  }
  return new ReadStream(openSync('/dev/tty', 'r'));
}

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function reportErrors(io: DemoIo, errors: readonly RuntimeError[]): void {
  for (const error of errors) {
    io.stderr.write(`a2ui-term: ${error.message}\n`);
  }
}

function fail(io: DemoIo, message: string): number {
  io.stderr.write(`a2ui-term: ${message}\n`);
  return 1;
}

function reason(error: unknown): string {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    return 'no such file';
  }
  return error instanceof Error ? error.message : String(error);
}
