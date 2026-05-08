import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import clipboard from 'clipboardy';
import { detectMode } from '../lib/detect.js';
import { renderAgentsBootstrap } from '../lib/render.js';

const VALID_MODES = ['auto', 'greenfield', 'brownfield', 'audit'];

const MODE_LABEL = {
  greenfield: 'greenfield — empty project',
  brownfield: 'brownfield — existing code, no AGENTS.md',
  audit: 'audit — AGENTS.md exists, compare drift',
};

export async function initCommand(opts) {
  if (!VALID_MODES.includes(opts.mode)) {
    throw new Error(
      `invalid mode "${opts.mode}". Use one of: ${VALID_MODES.join(', ')}`
    );
  }

  const flagDest = opts.copy
    ? 'clipboard'
    : opts.out
      ? 'file'
      : opts.stdout
        ? 'stdout'
        : null;
  const interactive = process.stdout.isTTY && flagDest === null;

  const detected = detectMode(process.cwd());
  let mode = opts.mode === 'auto' ? detected : opts.mode;
  let dest = flagDest ?? 'stdout';
  let outPath = opts.out ?? null;

  if (interactive) {
    p.intro('agentic init');
    p.note(MODE_LABEL[detected], 'Detected context');

    if (opts.mode === 'auto') {
      const choice = await p.select({
        message: 'Confirm mode?',
        options: [
          { value: detected, label: `Use detected (${detected})` },
          ...['greenfield', 'brownfield', 'audit']
            .filter((m) => m !== detected)
            .map((m) => ({ value: m, label: `Override → ${MODE_LABEL[m]}` })),
        ],
      });
      if (p.isCancel(choice)) {
        p.cancel('Cancelled.');
        return;
      }
      mode = choice;
    }

    const chosen = await p.select({
      message: 'Where to send the prompt?',
      options: [
        { value: 'clipboard', label: 'Copy to clipboard', hint: 'recommended' },
        { value: 'stdout', label: 'Print to stdout', hint: 'for piping' },
        { value: 'file', label: 'Save to file' },
      ],
    });
    if (p.isCancel(chosen)) {
      p.cancel('Cancelled.');
      return;
    }
    dest = chosen;

    if (dest === 'file') {
      const path = await p.text({
        message: 'File path',
        initialValue: './agentic-init-prompt.md',
      });
      if (p.isCancel(path)) {
        p.cancel('Cancelled.');
        return;
      }
      outPath = path;
    }
  }

  const prompt = renderAgentsBootstrap({ mode });

  if (dest === 'clipboard') {
    await clipboard.write(prompt);
    if (interactive) {
      p.outro('Copied to clipboard. Paste it into Claude Code, Codex, or any agentic tool.');
    } else {
      process.stderr.write('Copied to clipboard.\n');
    }
  } else if (dest === 'file') {
    const absPath = resolve(outPath);
    writeFileSync(absPath, prompt);
    if (interactive) {
      p.outro(`Saved to ${absPath}. Open it and paste into your agent.`);
    } else {
      process.stderr.write(`Saved to ${absPath}\n`);
    }
  } else {
    if (interactive) {
      p.outro('Prompt below — copy and paste into your agent.');
    }
    process.stdout.write(prompt);
  }
}
