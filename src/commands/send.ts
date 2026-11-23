import { locateSession } from '../session/session.js';
import {
  connect,
  defaultClientIo,
  deliver,
  readMessages,
  runClientCommand,
  type ClientIo,
  type SendOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

/** `send`: delivers A2UI messages to the session renderer. */
export async function runSend(
  source: string | undefined,
  options: SendOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const messages = await readMessages(source, io);
    const session = locateSession(options.session, io.env);
    const client = await connect(session);
    try {
      await deliver(client, messages, options);
    } finally {
      client.end();
    }
    return ExitCode.ok;
  });
}
