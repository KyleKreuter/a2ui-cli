import {
  defaultClientIo,
  printJson,
  requireOwner,
  runClientCommand,
  withClient,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

export interface ListOptions extends SessionOptions {
  /** List only the widgets of the caller's owner. */
  readonly mine?: boolean;
  readonly owner?: string;
}

/** `list`: prints the widgets of the board in board order as one JSON document. */
export async function runList(
  options: ListOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const owner = options.mine ? requireOwner(options.owner, io) : undefined;
    const reply = await withClient(options, io, (client) => client.request({ type: 'list' }));
    const widgets =
      owner === undefined
        ? reply.widgets
        : reply.widgets.filter((widget) => widget.owner === owner);
    printJson(io, { widgets });
    return ExitCode.ok;
  });
}
