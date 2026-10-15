import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { detectAgents } from '../lib/detect.js';
import {
  bundledSkills,
  installKitDocs,
  installSkills,
  removeOrphanSkills,
  removeRetiredSkills,
} from '../lib/install.js';
import { retiredSkillNamesForAgent } from '../lib/skill-migrations.js';
import { loadState, saveState, userLevelInstallPath } from '../lib/state.js';
import { updateRootDoc } from '../lib/rootdoc.js';
import { homedir } from 'node:os';
import {
  ACTION_SYMBOL,
  formatInstallReport,
  offerKitExclude,
  rootDocConfirmers,
} from '../lib/install-flow.js';
import { configureGlobalConstitution, globalKitPath } from '../lib/global-rules.js';
import { migrateLegacyProject } from '../lib/legacy-project-migration.js';
import { resolveScope, targetForScope } from '../lib/scope.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

const VALID_AGENTS = ['claude-code', 'codex'];
const AGENT_FLAG_VALUES = ['claude-code', 'codex', 'both'];

const AGENT_LABEL = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

// Prompts and warnings for the shared install flow (src/lib/install-flow.js).
async function ask(prompt) {
  const answer = await p.confirm(prompt);
  return !p.isCancel(answer) && answer;
}

function warn(line) {
  process.stderr.write(`${line}\n`);
}

function resolveAgents(flagValue, detectedAgents, previousAgents) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  if (previousAgents.length > 0) return previousAgents;
  if (detectedAgents.length > 0) return detectedAgents;
  return ['claude-code', 'codex'];
}

/**
 * Load every per-agent state file once. Returns `{ statesByAgent, agents }`
 * where `agents` lists the agents whose state files exist on disk. Avoids
 * the prior pattern of calling `loadState` twice per agent (once for
 * presence detection, once for content); also surfaces malformed-state
 * errors with the loader's own context, in a single pass.
 */
function loadStatesOnce(cwd) {
  const statesByAgent = {};
  const agents = [];
  for (const agent of VALID_AGENTS) {
    const state = loadState(cwd, agent);
    if (state) {
      statesByAgent[agent] = state;
      agents.push(agent);
    }
  }
  return { statesByAgent, agents };
}

export async function updateCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(`invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`);
  }

  const invocationCwd = process.cwd();
  const scope = resolveScope(opts.scope);
  const cwd = targetForScope(scope, invocationCwd);
  // `--agent` is purely a narrowing flag and does not imply non-interactive
  // intent. Only `--yes` or a non-TTY shell suppress the TUI per ADR-0009.
  const interactive = process.stdout.isTTY && !opts.yes;
  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);
  const forceRootDoc = Boolean(opts.forceRootDoc);

  if (opts.migrateLegacy) {
    if (scope !== 'project') {
      throw new Error('--migrate-legacy requires --scope project');
    }
    const { actions } = await migrateLegacyProject({
      cwd,
      agent: opts.agent,
      dryRun,
      force,
    });
    const lines = actions.map((action) => {
      const symbol = ACTION_SYMBOL[action.type] ?? '?';
      return action.agent
        ? `${symbol} [${action.agent}] ${action.path}`
        : `${symbol} ${action.path}`;
    });
    if (interactive) {
      p.intro(`agentic update — migrate legacy project${dryRun ? ' (dry-run)' : ''}`);
      p.note(
        lines.join('\n') || '(no legacy Agentic Development files found)',
        dryRun ? 'Plan' : 'Result'
      );
      p.outro(
        dryRun
          ? 'Dry-run only — nothing removed. Re-run without --dry-run to apply.'
          : 'Legacy project materialization migrated to the global kit.'
      );
    } else {
      for (const line of lines) process.stderr.write(`${line}\n`);
    }
    return;
  }

  const detectedAgents = detectAgents(cwd);
  const { statesByAgent, agents: previousAgents } = loadStatesOnce(cwd);

  const agents = resolveAgents(opts.agent, detectedAgents, previousAgents);
  // previousStates is the per-agent slice of statesByAgent restricted to the
  // agents the current invocation targets. Agents outside the slice keep
  // their state file untouched on disk.
  const previousStates = {};
  for (const agent of agents) {
    previousStates[agent] = statesByAgent[agent] ?? null;
  }

  if (interactive) {
    p.intro(`agentic update${dryRun ? ' (dry-run)' : ''}${force ? ' (force)' : ''}`);
    const previousLine = previousAgents.length
      ? previousAgents.map((a) => AGENT_LABEL[a]).join(', ')
      : 'none — first update on a legacy install';
    p.note(
      `Previous install: ${previousLine}\n` +
        `Updating for: ${agents.map((a) => AGENT_LABEL[a]).join(' + ')}\n` +
        'Skills: all bundled skills\n' +
        `Kit version: ${pkg.version}`,
      'Update plan'
    );
  }

  const confirmReplace = interactive
    ? async (question) => {
        const answer = await p.confirm({
          message: question,
          initialValue: false,
        });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => Boolean(force);

  const confirmRemove = interactive
    ? async (question) => {
        const answer = await p.confirm({
          message: question,
          initialValue: false,
        });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => Boolean(force);

  const installedSkillSet = new Set();
  const allActions = [];
  const nextStates = {};

  for (const agent of agents) {
    const agentSkills = bundledSkills(agent);
    for (const s of agentSkills) installedSkillSet.add(s);

    const orphanResult = await removeOrphanSkills({
      cwd,
      agent,
      previousState: previousStates[agent],
      currentSkills: [...agentSkills, ...retiredSkillNamesForAgent(agent)],
      confirmRemove,
      dryRun,
    });
    allActions.push(...orphanResult.actions);

    const migrationResult = removeRetiredSkills({
      cwd,
      agent,
      previousState: previousStates[agent],
      dryRun,
    });
    allActions.push(...migrationResult.actions);

    const result = await installSkills({
      cwd,
      agents: [agent],
      skills: agentSkills,
      confirmReplace,
      previousStates: { [agent]: previousStates[agent] ?? null },
      kitVersion: pkg.version,
      dryRun,
      force,
    });
    allActions.push(...result.actions);
    nextStates[agent] = result.nextStates[agent];
  }

  if (scope === 'user') {
    allActions.push(...installKitDocs({ targetDir: globalKitPath(), dryRun, force }));
    for (const agent of agents) {
      allActions.push(configureGlobalConstitution({ agent, dryRun }));
    }
  }

  if (!dryRun) {
    for (const agent of agents) {
      saveState(cwd, agent, nextStates[agent]);
    }
  }

  const skillDisplayOrder = [...installedSkillSet].sort();

  // A tracked root doc is shared with everyone who clones the repo (ADR-0051):
  // --force-root-doc authorizes that write only; on an untracked doc --force
  // alone governs overwriting a diverged, hand-edited section.
  const { confirmAppend, confirmReplace: confirmRootDocReplace } = rootDocConfirmers({
    cwd,
    interactive,
    force,
    forceRootDoc,
    untrackedReplace: 'force-gated',
    ask,
    warn,
  });

  const rootDocAction =
    scope === 'project'
      ? await updateRootDoc({
          cwd,
          skills: skillDisplayOrder,
          confirmAppend,
          confirmReplace: confirmRootDocReplace,
          dryRun,
        })
      : { type: 'absent' };

  // Keep freshly-installed kit files out of a shared repo's commits
  // (ADR-0051 Decision 4). Skipped on a dry-run, which writes nothing.
  const excluded =
    scope === 'user' || dryRun
      ? 0
      : await offerKitExclude({
          cwd,
          paths: [...new Set(allActions.map((a) => a.path))],
          interactive,
          ask,
          warn,
        });

  const userInstall = scope === 'user' || cwd === homedir() ? null : userLevelInstallPath();
  const lines = formatInstallReport({
    actions: allActions,
    rootDocAction,
    excluded,
    tagAgent: true,
    userInstall,
  });

  if (interactive) {
    p.note(lines.join('\n') || '(no changes)', dryRun ? 'Plan' : 'Result');
    const closing = dryRun
      ? 'Dry-run only — nothing written. Re-run without --dry-run to apply.'
      : `Updated ${scope} install to ${pkg.version}. State saved at .claude/agentic-state.json / .agents/agentic-state.json.`;
    p.outro(closing);
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
