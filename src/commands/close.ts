import { existsSync } from 'node:fs';
import type { PaneClient } from '../client/client.js';
import { adapterNamed } from '../hosts/select.js';
import { locateSession } from '../session/session.js';
import { readState, type SessionState } from '../session/state.js';
import {
  NotRunningError,
  connect,
  defaultClientIo,
  hostsOf,
  runClientCommand,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

/** How long `close` waits for the renderer to stop. */
const CLOSE_TIMEOUT_MS = 5000;

/** How often `close` checks whether the renderer has removed its state file. */
const STOP_POLL_MS = 25;

/**
 * `close`: stops the session renderer, then closes the board pane when `open`
 * started the renderer in it. Succeeds when no renderer runs.
 */
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
    const state = readState(session.paths.state);
    const deadline = Date.now() + CLOSE_TIMEOUT_MS;
    client.send({ type: 'close' });
    const timer = setTimeout(() => {
      client.end();
    }, CLOSE_TIMEOUT_MS);
    await client.closed();
    clearTimeout(timer);
    // The renderer removes its state file last. A pane with `remain-on-exit`
    // stays open after that.
    while (existsSync(session.paths.state) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, STOP_POLL_MS));
    }
    await closePane(state, io);
    return ExitCode.ok;
  });
}

/**
 * Closes the pane that `open` started the renderer in, when it still exists.
 * Pane ids are unique only within one host server, so the caller must use the
 * same server as the renderer.
 */
async function closePane(state: SessionState | undefined, io: ClientIo): Promise<void> {
  if (!state?.launched || state.paneRef === null) {
    return;
  }
  const hosts = hostsOf(io);
  const adapter = adapterNamed(state.host, hosts.adapters);
  if (
    !adapter?.capabilities.close ||
    state.hostInstance === undefined ||
    adapter.instance(io.env) !== state.hostInstance
  ) {
    return;
  }
  if ((await adapter.paneState(state.paneRef, hosts.runner)) !== 'missing') {
    await adapter.close(state.paneRef, hosts.runner);
  }
}
