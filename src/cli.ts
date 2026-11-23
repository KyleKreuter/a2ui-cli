import { Command, InvalidArgumentError, Option } from 'commander';
import { PROTOCOL_VERSION } from './a2ui/processor.js';
import { runAsk } from './commands/ask.js';
import { runClose } from './commands/close.js';
import { runDemo } from './commands/demo.js';
import { runSend } from './commands/send.js';
import { runServe } from './commands/serve.js';
import { DESCRIPTION, VERSION } from './version.js';

const program = new Command();

program.name('a2ui-term').description(DESCRIPTION).version(`${VERSION} (A2UI ${PROTOCOL_VERSION})`);

const sessionOption = () =>
  new Option(
    '--session <id>',
    'session id (default: $A2UI_TERM_SESSION, then the host pane, then "default")',
  );

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
  .action(async (file: string | undefined, options: { session?: string }) => {
    process.exitCode = await runSend(file, options);
  });

program
  .command('ask')
  .description('Send A2UI messages, then print the next user action as JSON.')
  .argument(...inputArgument)
  .addOption(sessionOption())
  .addOption(
    new Option('--timeout <seconds>', 'give up after this many seconds (exit code 2)').argParser(
      parseSeconds,
    ),
  )
  .action(async (file: string | undefined, options: { session?: string; timeout?: number }) => {
    process.exitCode = await runAsk(file, options);
  });

program
  .command('close')
  .description('Stop the session renderer.')
  .addOption(sessionOption())
  .action(async (options: { session?: string }) => {
    process.exitCode = await runClose(options);
  });

function parseSeconds(value: string): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new InvalidArgumentError('Expected a positive number of seconds.');
  }
  return seconds;
}

await program.parseAsync();
