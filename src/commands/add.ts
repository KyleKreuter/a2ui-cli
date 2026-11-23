import { selectHost } from '../hosts/select.js';
import { LABEL_ENV, resolveLabel, resolveOwner } from '../session/owner.js';
import {
  defaultClientIo,
  hostsOf,
  printJson,
  readMessages,
  runClientCommand,
  withClient,
  type ClientIo,
  type LaunchOptions,
} from './client-command.js';
import { ExitCode } from './exit-codes.js';

export interface AddOptions extends LaunchOptions {
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
    const label = resolveLabel(options.label || (await hostLabel(io)), owner, io.env);
    const reply = await withClient(
      options,
      io,
      (client) =>
        client.request({
          type: 'add',
          messages,
          ...(options.width === undefined ? {} : { width: options.width }),
          ...(options.title ? { title: options.title } : {}),
          ...(owner === undefined ? {} : { owner }),
          ...(label === undefined ? {} : { label }),
        }),
      { launch: true },
    );
    printJson(io, { widgetId: reply.widgetId });
    return ExitCode.ok;
  });
}

/**
 * The host label of the caller pane, for example `api:1` in tmux, when neither
 * `--label` nor `A2UI_TERM_LABEL` names one.
 */
async function hostLabel(io: ClientIo): Promise<string | undefined> {
  if (io.env[LABEL_ENV]) {
    return undefined;
  }
  const hosts = hostsOf(io);
  const selection = selectHost(io.env, hosts.adapters);
  if (!selection.adapter?.capabilities.label) {
    return undefined;
  }
  return selection.adapter.label(selection.callerPane, hosts.runner);
}
