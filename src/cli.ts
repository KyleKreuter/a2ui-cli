import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { PROTOCOL_VERSION } from './a2ui/processor.js';

const program = new Command();

program
  .name('a2ui-term')
  .description(pkg.description)
  .version(`${pkg.version} (A2UI ${PROTOCOL_VERSION})`);

await program.parseAsync();
