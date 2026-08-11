import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { uninstallCommand } from './commands/uninstall.js';
import { menuCommand } from './commands/menu.js';

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
    .option(
      '--force-root-doc',
      'write the managed skills section even when the root doc is tracked by git (non-interactive default: skip)'
    )
    .action(initCommand);

  program
    .command('update')
    .description('Pull upstream kit changes into an installed project (three-way diff against the saved state)')
    .option('-a, --agent <agent>', 'restrict update to a specific agent: claude-code | codex | both')
    .option('-y, --yes', 'skip confirmation prompts (non-interactive)')
    .option('--dry-run', 'preview the action plan without writing any files')
    .option('--force', 'overwrite user-edited files on conflict (non-interactive default: no)')
    .option(
      '--force-root-doc',
      'write the managed skills section even when the root doc is tracked by git (non-interactive default: skip)'
    )
    .action(updateCommand);

  program
    .command('uninstall')
    .description('Remove agentic-managed files from this project while preserving local edits')
    .option('-a, --agent <agent>', 'restrict removal to a specific agent: claude-code | codex | both')
    .option('-y, --yes', 'skip the destructive-action confirmation prompt')
    .option('--dry-run', 'preview the action plan without removing files')
    .option('--force', 'also remove user-edited files recorded in agentic state')
    .action(uninstallCommand);

  // No-args + interactive TTY → show the picker. Anything else (flags,
  // subcommand, --help, --version, piped stdin) falls through to commander.
  if (argv.length === 2 && process.stdin.isTTY && process.stdout.isTTY) {
    await menuCommand(run);
    return;
  }

  await program.parseAsync(argv);
}
