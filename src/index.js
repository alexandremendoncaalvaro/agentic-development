import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

export async function run(argv) {
  const program = new Command();

  program
    .name('agentic')
    .description(pkg.description)
    .version(pkg.version);

  program
    .command('init')
    .description('Bootstrap AGENTS.md for the current project — interactive by default')
    .option('-m, --mode <mode>', 'force mode: auto | greenfield | brownfield | audit', 'auto')
    .option('--copy', 'skip TUI and copy the prompt to clipboard')
    .option('--stdout', 'skip TUI and print the prompt to stdout')
    .option('-o, --out <file>', 'skip TUI and write the prompt to a file')
    .action(initCommand);

  await program.parseAsync(argv);
}
