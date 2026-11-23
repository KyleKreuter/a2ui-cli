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

export interface AskOptions extends SendOptions {
  /** Seconds to wait for an action. Waits without limit when undefined. */
  readonly timeout?: number;
}

/** `ask`: delivers A2UI messages, then prints the next user action as JSON. */
export async function runAsk(
  source: string | undefined,
  options: AskOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const messages = await readMessages(source, io);
    const session = locateSession(options.session, io.env);
    const client = await connect(session);
    try {
      await deliver(client, messages, options);
      const timeoutMs = options.timeout === undefined ? undefined : options.timeout * 1000;
      const { type, ...action } = await client.waitForAction(timeoutMs);
      io.stdout.write(`${JSON.stringify(action)}\n`);
    } finally {
      client.end();
    }
    return ExitCode.ok;
  });
}
