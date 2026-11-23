import { resolveLabel, resolveOwner } from '../session/owner.js';
import {
  defaultClientIo,
  printJson,
  readMessages,
  runClientCommand,
  withClient,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

export interface AddOptions extends SessionOptions {
  readonly width?: number;
  readonly title?: string;
  readonly owner?: string;
  readonly label?: string;
}

/** `add`: creates a widget from A2UI messages and prints its id as JSON. */
export async function runAdd(
  source: string | undefined,
  options: AddOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const messages = await readMessages(source, io);
    const owner = resolveOwner(options.owner, io.env);
    const label = resolveLabel(options.label, owner, io.env);
    const reply = await withClient(options, io, (client) =>
      client.request({
        type: 'add',
        messages,
        ...(options.width === undefined ? {} : { width: options.width }),
        ...(options.title ? { title: options.title } : {}),
        ...(owner === undefined ? {} : { owner }),
        ...(label === undefined ? {} : { label }),
      }),
    );
    printJson(io, { widgetId: reply.widgetId });
    return ExitCode.ok;
  });
}
