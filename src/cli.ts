import { Command, InvalidArgumentError, Option } from 'commander';
import { PROTOCOL_VERSION } from './a2ui/processor.js';
import { DEFAULT_WIDTH, GRID_COLUMNS } from './board/registry.js';
import { runAdd, type AddOptions } from './commands/add.js';
import { runAsk } from './commands/ask.js';
import { runClose } from './commands/close.js';
import { runDemo } from './commands/demo.js';
import { runList, type ListOptions } from './commands/list.js';
import { runRemove, type RemoveOptions } from './commands/remove.js';
import { runSend } from './commands/send.js';
import { runServe } from './commands/serve.js';
import { runSet, type SetOptions } from './commands/set.js';
import { runUpdate } from './commands/update.js';
import { DESCRIPTION, VERSION } from './version.js';

const program = new Command();

program.name('a2ui-term').description(DESCRIPTION).version(`${VERSION} (A2UI ${PROTOCOL_VERSION})`);

const sessionOption = () =>
  new Option('--session <id>', 'session id (default: $A2UI_TERM_SESSION, then "default")');

const clearOption = () =>
  new Option('--clear', 'remove all surfaces before sending, so the input can reuse surface ids');

const ownerOption = () =>
  new Option(
    '--owner <id>',
    'widget owner (default: $A2UI_TERM_OWNER, then the host pane, for example "tmux:%3")',
  );

const mineOption = () => new Option('--mine', "only the widgets of the caller's owner");

const inputArgument = [
  '[file]',
  'JSON Lines or JSON array file; "-" or nothing reads stdin',
] as const;

program
  .command('demo')
  .description('Render A2UI messages from a file or stdin in this terminal.')
  .argument(...inputArgument)
  .action(async (file: string | undefined) => {
    process.exitCode = await runDemo(file);
  });

program
  .command('serve')
  .description('Run the renderer for a session in this terminal.')
  .addOption(sessionOption())
  .action(async (options: { session?: string }) => {
    process.exitCode = await runServe(options);
  });

program
  .command('send')
  .description('Send A2UI messages to the session renderer.')
  .argument(...inputArgument)
  .addOption(sessionOption())
  .addOption(clearOption())
  .action(async (file: string | undefined, options: { session?: string; clear?: boolean }) => {
    process.exitCode = await runSend(file, options);
  });

program
  .command('ask')
  .description('Send A2UI messages, then print the next user action as JSON.')
  .argument(...inputArgument)
  .addOption(sessionOption())
  .addOption(clearOption())
  .addOption(
    new Option('--timeout <seconds>', 'give up after this many seconds (exit code 2)').argParser(
      parseSeconds,
    ),
  )
  .action(
    async (
      file: string | undefined,
      options: { session?: string; clear?: boolean; timeout?: number },
    ) => {
      process.exitCode = await runAsk(file, options);
    },
  );

program
  .command('close')
  .description('Stop the session renderer.')
  .addOption(sessionOption())
  .action(async (options: { session?: string }) => {
    process.exitCode = await runClose(options);
  });

program
  .command('add')
  .description('Add a widget to the board and print its id as JSON.')
  .argument(...inputArgument)
  .addOption(
    new Option(
      '--width <columns>',
      `width in grid columns, 1 to ${GRID_COLUMNS} (default: ${DEFAULT_WIDTH})`,
    ).argParser(parseWidth),
  )
  .addOption(new Option('--title <text>', 'title in the top border of the widget'))
  .addOption(ownerOption())
  .addOption(
    new Option(
      '--label <text>',
      'label in the top border (default: $A2UI_TERM_LABEL, then the owner)',
    ),
  )
  .addOption(sessionOption())
  .action(async (file: string | undefined, options: AddOptions) => {
    process.exitCode = await runAdd(file, options);
  });

program
  .command('update')
  .description('Apply updateComponents and updateDataModel messages to a widget.')
  .argument('<widgetId>', 'id that add printed, for example w1')
  .argument(...inputArgument)
  .addOption(sessionOption())
  .action(async (widgetId: string, file: string | undefined, options: { session?: string }) => {
    process.exitCode = await runUpdate(widgetId, file, options);
  });

program
  .command('set')
  .description('Set data model values of a widget. Each value is JSON, or text with --text.')
  .argument('<widgetId>', 'id that add printed, for example w1')
  .argument('[pathAndValue...]', 'pairs of a JSON Pointer and a value, for example /percent 60')
  .addOption(new Option('--text', 'take every value as text, not as JSON'))
  .addOption(
    new Option('--delete <path>', 'remove the value at this path; repeat for more paths').argParser(
      collect,
    ),
  )
  .addOption(sessionOption())
  .action(async (widgetId: string, pairs: string[], options: SetOptions) => {
    process.exitCode = await runSet(widgetId, pairs, options);
  });

program
  .command('remove')
  .description('Remove widgets from the board and print the removed ids as JSON.')
  .argument('[widgetIds...]', 'ids that add printed')
  .addOption(mineOption())
  .addOption(ownerOption())
  .addOption(sessionOption())
  .action(async (widgetIds: string[], options: RemoveOptions) => {
    process.exitCode = await runRemove(widgetIds, options);
  });

program
  .command('list')
  .description('Print the widgets of the board in board order as JSON.')
  .addOption(mineOption())
  .addOption(ownerOption())
  .addOption(sessionOption())
  .action(async (options: ListOptions) => {
    process.exitCode = await runList(options);
  });

function parseWidth(value: string): number {
  const width = Number(value);
  if (!Number.isInteger(width) || width < 1 || width > GRID_COLUMNS) {
    throw new InvalidArgumentError(`Expected a whole number from 1 to ${GRID_COLUMNS}.`);
  }
  return width;
}

function collect(value: string, previous: string[] | undefined): string[] {
  return [...(previous ?? []), value];
}

function parseSeconds(value: string): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new InvalidArgumentError('Expected a positive number of seconds.');
  }
  return seconds;
}

await program.parseAsync();
