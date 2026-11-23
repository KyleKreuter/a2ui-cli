import { PROTOCOL_VERSION } from '../a2ui/processor.js';
import {
  CommandError,
  defaultClientIo,
  runClientCommand,
  withClient,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

export interface SetOptions extends SessionOptions {
  /** Take every value as a literal string instead of JSON. */
  readonly text?: boolean;
  /** Paths whose values to remove. */
  readonly delete?: readonly string[];
}

/** A JSON Pointer (RFC 6901): `/` followed by tokens, with `~` only in `~0` and `~1`. */
const JSON_POINTER = /^(\/([^~/]|~[01])*)+$/;

/**
 * `set`: sets data model values of a widget, one `updateDataModel` message per
 * path and value pair, and removes the values at the `--delete` paths.
 */
export async function runSet(
  widgetId: string,
  pairs: readonly string[],
  options: SetOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const messages = dataMessages(widgetId, pairs, options);
    await withClient(options, io, (client) =>
      client.request({ type: 'update', widgetId, messages }),
    );
    return ExitCode.ok;
  });
}

/** Builds the `updateDataModel` messages. Throws with exit code 4 for invalid input. */
export function dataMessages(
  widgetId: string,
  pairs: readonly string[],
  options: Pick<SetOptions, 'text' | 'delete'>,
): unknown[] {
  const deletes = options.delete ?? [];
  if (pairs.length === 0 && deletes.length === 0) {
    throw new CommandError(ExitCode.inputError, 'set needs a path and a value, or --delete <path>');
  }
  if (pairs.length % 2 !== 0) {
    throw new CommandError(
      ExitCode.inputError,
      `the path ${pairs.at(-1) ?? ''} has no value. Pass a value after every path.`,
    );
  }
  const messages: unknown[] = [];
  for (let index = 0; index < pairs.length; index += 2) {
    const path = checkPath(pairs[index] ?? '');
    const value = options.text
      ? (pairs[index + 1] ?? '')
      : parseValue(path, pairs[index + 1] ?? '');
    messages.push(dataMessage(widgetId, path, value));
  }
  for (const path of deletes) {
    messages.push(dataMessage(widgetId, checkPath(path)));
  }
  return messages;
}

function dataMessage(surfaceId: string, path: string, ...value: [unknown?]) {
  return {
    version: PROTOCOL_VERSION,
    updateDataModel: { surfaceId, path, ...(value.length > 0 ? { value: value[0] } : {}) },
  };
}

function checkPath(path: string): string {
  if (!JSON_POINTER.test(path)) {
    throw new CommandError(
      ExitCode.inputError,
      `invalid path "${path}". Use a JSON Pointer such as /percent or /items/0/name.`,
    );
  }
  return path;
}

function parseValue(path: string, value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new CommandError(
      ExitCode.inputError,
      `the value ${value} for ${path} is not valid JSON. Quote text as JSON, for example '"${value}"', or pass --text.`,
    );
  }
}
