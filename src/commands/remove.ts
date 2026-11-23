import {
  CommandError,
  defaultClientIo,
  printJson,
  requireOwner,
  runClientCommand,
  withClient,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

export interface RemoveOptions extends SessionOptions {
  /** Remove every widget of the caller's owner. */
  readonly mine?: boolean;
  readonly owner?: string;
}

/** `remove`: removes the named widgets, or the caller's widgets, and prints their ids. */
export async function runRemove(
  widgetIds: readonly string[],
  options: RemoveOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    if (options.mine === widgetIds.length > 0) {
      throw new CommandError(ExitCode.error, 'pass either widget ids or --mine');
    }
    const target = options.mine
      ? { owner: requireOwner(options.owner, io) }
      : { widgetIds: [...widgetIds] };
    const reply = await withClient(options, io, (client) =>
      client.request({ type: 'remove', ...target }),
    );
    printJson(io, { removed: reply.widgetIds });
    return ExitCode.ok;
  });
}
