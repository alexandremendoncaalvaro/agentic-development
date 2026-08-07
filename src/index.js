import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { profileCommand } from './commands/profile.js';
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
    .option('-p, --profile <profile>', 'project maturity profile: poc | solo | team | mature (default: team)')
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

  // Profile command accepts two positionals so `agentic profile set <name>`
  // captures the name natively. Per review C1 (v0.11.3): the prior single-
  // positional form had Commander swallow the second arg, leaving the
  // documented `Usage: agentic profile set <name>` error message misleading.
  // All forms work now:
  //   agentic profile                          → show
  //   agentic profile show                     → show
  //   agentic profile list                     → list
  //   agentic profile set <name>               → set
  //   agentic profile <name>                   → shorthand for `set <name>`
  //   agentic profile set --name <name>        → flag form (back-compat)
  program
    .command('profile [subcommand] [name]')
    .description('Show, list, or set the project maturity profile (poc | solo | team | mature)')
    .option('-n, --name <name>', 'profile name (alternative to positional, for `set` subcommand)')
    .option('-y, --yes', 'skip confirmation prompts (non-interactive)')
    .action((subcommand, name, opts) =>
      profileCommand(subcommand, { ...opts, name: opts.name ?? name })
    );

  // No-args + interactive TTY → show the picker. Anything else (flags,
  // subcommand, --help, --version, piped stdin) falls through to commander.
  if (argv.length === 2 && process.stdin.isTTY && process.stdout.isTTY) {
    await menuCommand(run);
    return;
  }

  await program.parseAsync(argv);
}
