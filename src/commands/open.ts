import { openBoard } from '../launcher/launcher.js';
import { resolvePlacement, type PlacementInput } from '../launcher/placement.js';
import { locateSession } from '../session/session.js';
import {
  defaultClientIo,
  hostsOf,
  printJson,
  runClientCommand,
  type ClientIo,
  type SessionOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

export interface OpenOptions extends SessionOptions, PlacementInput {}

/** `open`: opens the board pane once per session and prints where it runs as JSON. */
export async function runOpen(
  options: OpenOptions,
  io: ClientIo = defaultClientIo(),
): Promise<number> {
  return runClientCommand(io, async () => {
    const settings = resolvePlacement(options, io.env);
    const session = locateSession(options.session, io.env);
    printJson(io, await openBoard(session, settings, io.env, hostsOf(io)));
    return ExitCode.ok;
  });
}
