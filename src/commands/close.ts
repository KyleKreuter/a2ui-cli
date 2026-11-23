import type { PaneClient } from '../client/client.js';
import { locateSession } from '../session/session.js';
import {
  NotRunningError,
  connect,
  defaultClientIo,
  runClientCommand,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

/** How long `close` waits for the renderer to stop. */
const CLOSE_TIMEOUT_MS = 5000;

/** `close`: stops the session renderer. Succeeds when none runs. */
export async function runClose(
  options: SessionOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const session = locateSession(options.session, io.env);
    let client: PaneClient;
    try {
      client = await connect(session);
    } catch (error) {
      if (error instanceof NotRunningError) {
        return ExitCode.ok;
      }
      throw error;
    }
    client.send({ type: 'close' });
    const timer = setTimeout(() => {
      client.end();
    }, CLOSE_TIMEOUT_MS);
    await client.closed();
    clearTimeout(timer);
    return ExitCode.ok;
  });
}
