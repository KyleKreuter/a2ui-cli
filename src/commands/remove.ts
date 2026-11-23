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
  /** Remove every widget whose owner pane is gone. */
  readonly ended?: boolean;
}

/**
 * `remove`: removes the named widgets, the caller's widgets, or the ended
 * widgets, and prints their ids.
 */
export async function runRemove(
  widgetIds: readonly string[],
  options: RemoveOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const targets = [widgetIds.length > 0, options.mine === true, options.ended === true];
    if (targets.filter(Boolean).length !== 1) {
      throw new CommandError(ExitCode.error, 'pass either widget ids, --mine or --ended');
    }
    const target = options.mine
      ? { owner: requireOwner(options.owner, io) }
      : options.ended
        ? { ended: true as const }
        : { widgetIds: [...widgetIds] };
    const reply = await withClient(options, io, (client) =>
      client.request({ type: 'remove', ...target }),
    );
    printJson(io, { removed: reply.widgetIds });
    return ExitCode.ok;
  });
}
