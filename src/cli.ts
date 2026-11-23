import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { PROTOCOL_VERSION } from './a2ui/processor.js';
import { runDemo } from './commands/demo.js';

const program = new Command();

program
  .name('a2ui-term')
  .description(pkg.description)
  .version(`${pkg.version} (A2UI ${PROTOCOL_VERSION})`);

program
  .command('demo')
  .description('Render A2UI messages from a file or stdin in this terminal.')
  .argument('[file]', 'JSON Lines or JSON array file; "-" or nothing reads stdin')
  .action(async (file: string | undefined) => {
    process.exitCode = await runDemo(file);
  });

await program.parseAsync();
