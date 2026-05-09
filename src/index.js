import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { profileCommand } from './commands/profile.js';

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
    .option('-p, --profile <profile>', 'project maturity profile: poc | solo | team | mature (default: team)')
    .option('-y, --yes', 'skip confirmation prompts (non-interactive)')
    .action(initCommand);

  program
    .command('update')
    .description('Pull upstream kit changes into an installed project (three-way diff against the saved state)')
    .option('-a, --agent <agent>', 'restrict update to a specific agent: claude-code | codex | both')
    .option('-y, --yes', 'skip confirmation prompts (non-interactive)')
    .option('--dry-run', 'preview the action plan without writing any files')
    .option('--force', 'overwrite user-edited files on conflict (non-interactive default: no)')
    .action(updateCommand);

  program
    .command('profile [subcommand]')
    .description('Show, list, or set the project maturity profile (poc | solo | team | mature)')
    .option('-n, --name <name>', 'profile name when used with `set` subcommand')
    .option('-y, --yes', 'skip confirmation prompts (non-interactive)')
    .action(profileCommand);

  await program.parseAsync(argv);
}
