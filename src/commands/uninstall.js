import * as p from '@clack/prompts';
import { relative } from 'node:path';
import { removeOrphanSkills } from '../lib/install.js';
import { loadState, removeState, saveState, statePath } from '../lib/state.js';
import { resolveScope, targetForScope } from '../lib/scope.js';

const VALID_AGENTS = ['claude-code', 'codex'];
const AGENT_FLAG_VALUES = ['claude-code', 'codex', 'both'];

const AGENT_LABEL = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

const ACTION_SYMBOL = {
  removed: '-',
  'removed-missing': '?',
  'orphan-kept': '!',
  'state-removed': '-',
  'state-updated': '~',
};

function resolveAgents(flagValue, statesByAgent) {
  if (flagValue === 'both') return VALID_AGENTS;
  if (flagValue) return [flagValue];
  return VALID_AGENTS.filter((agent) => statesByAgent[agent]);
}

function loadStates(cwd) {
  const states = {};
  for (const agent of VALID_AGENTS) {
    states[agent] = loadState(cwd, agent);
  }
  return states;
}

/**
 * Remove only files recorded in agentic's per-host state. A local edit stays
 * by default, and removing the final state file never removes a host root or
 * a project-facing root document.
 */
export async function uninstallCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(
      `invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`
    );
  }

  const scope = resolveScope(opts.scope ?? 'project');
  const cwd = targetForScope(scope, process.cwd());
  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);
  const interactive = process.stdout.isTTY && !opts.yes;

  if (!interactive && !opts.yes && !dryRun) {
    throw new Error('uninstall requires --yes in a non-interactive shell');
  }

  const statesByAgent = loadStates(cwd);
  const agents = resolveAgents(opts.agent, statesByAgent);
  if (agents.length === 0) {
    process.stderr.write('note: no agentic installation state was found in this directory.\n');
    return;
  }

  if (interactive) {
    p.intro(`agentic uninstall${dryRun ? ' (dry-run)' : ''}${force ? ' (force)' : ''}`);
    const answer = await p.confirm({
      message:
        `Remove agentic-managed files for ${agents.map((agent) => AGENT_LABEL[agent]).join(' + ')}? ` +
        'Locally edited files stay unless --force is set.',
      initialValue: false,
    });
    if (p.isCancel(answer) || !answer) {
      p.cancel('Cancelled.');
      return;
    }
  }

  const actions = [];
  for (const agent of agents) {
    const state = statesByAgent[agent];
    if (!state) {
      actions.push({ type: 'state-missing', agent });
      continue;
    }

    const result = await removeOrphanSkills({
      cwd,
      agent,
      previousState: state,
      currentSkills: [],
      confirmRemove: async () => true,
      dryRun,
      force,
    });
    actions.push(...result.actions);

    const removed = new Set(result.removedSkills);
    const remainingSkills = Object.fromEntries(
      Object.entries(state.skills).filter(([skill]) => !removed.has(skill))
    );
    const stateFile = relative(cwd, statePath(cwd, agent));

    if (Object.keys(remainingSkills).length === 0) {
      removeState(cwd, agent, dryRun);
      actions.push({ type: 'state-removed', path: stateFile, agent });
    } else {
      if (!dryRun) saveState(cwd, agent, { ...state, skills: remainingSkills });
      actions.push({ type: 'state-updated', path: stateFile, agent });
    }
  }

  const lines = actions.map((action) => {
    if (action.type === 'state-missing') {
      return `note: no ${AGENT_LABEL[action.agent]} state file found`;
    }
    const symbol = ACTION_SYMBOL[action.type] ?? '?';
    return `${symbol} [${action.agent}] ${action.path}`;
  });
  if (scope === 'project') {
    lines.push(
      'note: kept legacy WORKFLOW.md, WORKFLOW-FLOWS.md, and the managed root-doc section; review those project-facing files manually.'
    );
  } else {
    lines.push(
      'note: kept ~/.agentic/kit and the global instruction import; review those global files manually.'
    );
  }

  if (interactive) {
    p.note(lines.join('\n'), dryRun ? 'Plan' : 'Result');
    p.outro(
      dryRun
        ? 'Dry-run only — nothing removed. Re-run without --dry-run to apply.'
        : 'Removed agentic-managed files where safe.'
    );
  } else {
    for (const line of lines) process.stderr.write(`${line}\n`);
  }
}
