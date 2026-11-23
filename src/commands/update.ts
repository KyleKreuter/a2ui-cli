import {
  defaultClientIo,
  readMessages,
  runClientCommand,
  withClient,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

/** `update`: applies `updateComponents` and `updateDataModel` messages to one widget. */
export async function runUpdate(
  widgetId: string,
  source: string | undefined,
  options: SessionOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const messages = await readMessages(source, io);
    await withClient(options, io, (client) =>
      client.request({ type: 'update', widgetId, messages }),
    );
    return ExitCode.ok;
  });
}
