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
import {
  updateRootDoc,
  rootDocAppendPrompt,
  rootDocReplacePrompt,
  trackedRootDocSkipNotice,
} from '../lib/rootdoc.js';
import { trackedState } from '../lib/git.js';
import { homedir } from 'node:os';
import { offerKitExclude } from './kit-exclude.js';
import { configureGlobalConstitution, globalKitPath } from '../lib/global-rules.js';
import { migrateLegacyProject } from '../lib/legacy-project-migration.js';
import { resolveScope, targetForScope } from '../lib/scope.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
);

const VALID_AGENTS = ['claude-code', 'codex'];
const AGENT_FLAG_VALUES = ['claude-code', 'codex', 'both'];

const AGENT_LABEL = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

const ACTION_SYMBOL = {
  created: '+',
  updated: '~',
  replaced: '~',
  unchanged: '·',
  kept: '·',
  skipped: '!',
  removed: '-',
  'removed-missing': '?',
  'orphan-kept': '?',
  'migration-removed': '-',
  'migration-kept': '!',
  'migration-state-removed': '-',
  'migration-state-updated': '!',
};

const ROOT_DOC_LABEL = {
  appended: '+ ',
  updated: '~ ',
  unchanged: '· ',
  skipped: '! ',
  'kept-stale': '! ',
  absent: '',
};

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
    throw new Error(
      `invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`
    );
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
      p.note(lines.join('\n') || '(no legacy Agentic Development files found)', dryRun ? 'Plan' : 'Result');
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
        const answer = await p.confirm({ message: question, initialValue: false });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => Boolean(force);

  const confirmRemove = interactive
    ? async (question) => {
        const answer = await p.confirm({ message: question, initialValue: false });
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

  // An unattended run must not decide for the team: a tracked root doc is
  // shared with everyone who clones the repo (ADR-0051). Mirrors init.js;
  // `--force-root-doc` is the explicit override, distinct from `--force`
  // (which overwrites user-edited skill files on conflict). Unknown tracking
  // state keeps the prior behaviour.
  const allowUnattendedRootDocWrite = (path) => {
    if (forceRootDoc) return true;
    if (trackedState(cwd, path) !== 'tracked') return true;
    process.stderr.write(trackedRootDocSkipNotice(path) + '\n');
    return false;
  };

  const confirmAppend = interactive
    ? async (path) => {
        const answer = await p.confirm(
          rootDocAppendPrompt(path, trackedState(cwd, path))
        );
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async (path) => allowUnattendedRootDocWrite(path);

  const confirmRootDocReplace = interactive
    ? async (path) => {
        // A tracked doc names the sharing risk (ADR-0051 Decision 2); an
        // untracked doc keeps the pre-existing diverged-section warning.
        const answer = await p.confirm(
          trackedState(cwd, path) === 'tracked'
            ? rootDocReplacePrompt(path)
            : {
                message: `${path}: managed section diverged on disk. Regenerate it? (any edits between the agentic-managed-skills markers will be lost)`,
                initialValue: false,
              }
        );
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : // Tracked-state is checked FIRST: `--force-root-doc` authorizes writing a
      // tracked (shared) doc only. On an untracked doc the pre-existing
      // `--force` gate alone governs overwriting a diverged, hand-edited
      // section — `--force-root-doc` must not reach it, or it would destroy a
      // local edit it was never scoped to touch.
      async (path) => {
        if (trackedState(cwd, path) === 'tracked') {
          if (forceRootDoc) return true;
          process.stderr.write(trackedRootDocSkipNotice(path) + '\n');
          return false;
        }
        return Boolean(force);
      };

  const rootDocAction = scope === 'project'
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
  const excluded = scope === 'user' || dryRun
    ? 0
    : await offerKitExclude({
        cwd,
        paths: [...new Set(allActions.map((a) => a.path))],
        interactive,
      });

  const lines = allActions.map((a) => {
    const sym = ACTION_SYMBOL[a.type] ?? '?';
    // Kit-doc actions are agent-independent and carry no `agent` field; tagging
    // them would print `[undefined]`.
    return a.agent ? `${sym} [${a.agent}] ${a.path}` : `${sym} ${a.path}`;
  });
  if (rootDocAction.type !== 'absent') {
    lines.push(`${ROOT_DOC_LABEL[rootDocAction.type]}${rootDocAction.path}`);
  }
  if (excluded > 0) {
    lines.push(`! .git/info/exclude (+${excluded})`);
  }
  const userInstall = scope === 'user' || cwd === homedir() ? null : userLevelInstallPath();
  if (userInstall) {
    lines.push(
      `note: agentic is also installed at the user level (${userInstall}); ` +
        `a project install is only needed to pin a version or share it via the repo.`
    );
  }

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
