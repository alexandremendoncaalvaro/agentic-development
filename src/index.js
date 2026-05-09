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
    .description('Install agentic skills into this project for Claude Code and/or Codex')
    .option('-a, --agent <agent>', 'install for a specific agent: claude-code | codex | both')
    .option('-y, --yes', 'skip confirmation prompts (non-interactive)')
    .action(initCommand);

  await program.parseAsync(argv);
}
