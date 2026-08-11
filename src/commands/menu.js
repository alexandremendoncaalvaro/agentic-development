import * as p from '@clack/prompts';

/**
 * Interactive menu shown when `agentic` is invoked with no arguments on a TTY.
 * Lets the user pick init / update without remembering subcommand
 * names. Dispatches by re-running the parser with synthesized argv so each
 * sub-command keeps its own interactive flow (clack prompts inside init,
 * three-way diff confirmation inside update, etc).
 */
export async function menuCommand(runWithArgv) {
  p.intro('agentic');

  const choice = await p.select({
    message: 'What do you want to do?',
    options: [
      {
        value: 'update',
        label: 'update — pull latest kit changes into this project',
      },
      {
        value: 'init',
        label: 'init — install agentic skills into this project',
      },
      { value: 'exit', label: 'exit' },
    ],
  });

  if (p.isCancel(choice) || choice === 'exit') {
    p.cancel('Cancelled.');
    return;
  }

  const baseArgv = process.argv.slice(0, 2);
  const dispatch = {
    update: [...baseArgv, 'update'],
    init: [...baseArgv, 'init'],
  };

  await runWithArgv(dispatch[choice]);
}
