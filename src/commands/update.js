import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { detectAgents, detectFeatures } from '../lib/detect.js';
import {
  installKitDocs,
  installSkills,
  removeOrphanSkills,
  removeRetiredSkills,
} from '../lib/install.js';
import { retiredSkillNamesForAgent } from '../lib/skill-migrations.js';
import { loadState, saveState, userLevelInstallPath } from '../lib/state.js';
import {
  DEFAULT_PROFILE,
  availableConditionalsForProfile,
  profileOrDefault,
  requiredSkillsForProfile,
} from '../lib/profiles.js';
import {
  updateRootDoc,
  rootDocAppendPrompt,
  rootDocReplacePrompt,
  trackedRootDocSkipNotice,
} from '../lib/rootdoc.js';
import { trackedState } from '../lib/git.js';
import { homedir } from 'node:os';
import { CONDITIONAL_SKILLS, REQUIRED_SKILLS } from './init.js';
import { offerKitExclude } from './kit-exclude.js';

const CONDITIONAL_BY_NAME = Object.fromEntries(
  CONDITIONAL_SKILLS.map((s) => [s.name, s])
);

function evaluateRule(rule, features, targetAgents) {
  if (rule === 'frontend') return features.frontend === true;
  if (rule === 'claude-code') return targetAgents.includes('claude-code');
  if (rule === true) return true;
  if (rule === false) return false;
  return false;
}

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
  return ['claude-code'];
}

function pickConditionalAuto(features, targetAgents, profileName) {
  const out = [];
  for (const { name, rule } of availableConditionalsForProfile(profileName)) {
    const def = CONDITIONAL_BY_NAME[name];
    if (!def) continue;
    if (!def.agents.some((a) => targetAgents.includes(a))) continue;
    if (evaluateRule(rule, features, targetAgents)) out.push(name);
  }
  return out;
}

function skillsForAgent(agent, profileName, optedSkills) {
  const universal = requiredSkillsForProfile(profileName);
  const conditional = optedSkills.filter((skillName) => {
    const def = CONDITIONAL_BY_NAME[skillName];
    return def && def.agents.includes(agent);
  });
  return [...universal, ...conditional];
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

function previouslyOptedConditional(previousStates, currentAgents, profileName) {
  const available = new Set(
    availableConditionalsForProfile(profileName).map((c) => c.name)
  );
  const opted = new Set();
  for (const agent of currentAgents) {
    const prev = previousStates[agent];
    if (!prev) continue;
    for (const skill of Object.keys(prev.skills ?? {})) {
      if (
        CONDITIONAL_BY_NAME[skill] &&
        available.has(skill)
      ) {
        opted.add(skill);
      }
    }
  }
  return [...opted];
}

function profileFromStates(statesByAgent, currentAgents) {
  // Profile must match across every installed agent in the project — not
  // only across the agents the current invocation targets. Without this,
  // `--agent claude-code` on a project where codex was installed with a
  // different profile masks the disagreement and produces inconsistent
  // installs. Per review B2 (v0.11.3): always inspect the FULL set of
  // loaded states, not the narrowed slice.
  const seen = new Set();
  for (const [agent, state] of Object.entries(statesByAgent)) {
    if (state?.profile) seen.add(state.profile);
  }
  if (seen.size === 0) {
    // No state on disk for any agent. Fall back to the default; current
    // invocation is a fresh / legacy install handled by the legacy path.
    return DEFAULT_PROFILE;
  }
  if (seen.size > 1) {
    throw new Error(
      `state files disagree on profile (${[...seen].join(
        ', '
      )}). Run \`agentic profile set <name>\` to reconcile across all installed agents before re-running update.`
    );
  }
  return [...seen][0];
}

export async function updateCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(
      `invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`
    );
  }

  const cwd = process.cwd();
  // `--agent` is purely a narrowing flag and does not imply non-interactive
  // intent. Only `--yes` or a non-TTY shell suppress the TUI per ADR-0009.
  const interactive = process.stdout.isTTY && !opts.yes;
  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);
  const forceRootDoc = Boolean(opts.forceRootDoc);

  const detectedAgents = detectAgents(cwd);
  const features = detectFeatures(cwd);
  const { statesByAgent, agents: previousAgents } = loadStatesOnce(cwd);

  const agents = resolveAgents(opts.agent, detectedAgents, previousAgents);
  // previousStates is the per-agent slice of statesByAgent restricted to the
  // agents the current invocation targets. Agents outside the slice keep
  // their state file untouched on disk.
  const previousStates = {};
  for (const agent of agents) {
    previousStates[agent] = statesByAgent[agent] ?? null;
  }

  // Pass the FULL loaded set, not the narrowed slice. profileFromStates
  // surfaces cross-agent disagreement even when the current invocation
  // targets only one agent (review B2, v0.11.3).
  const profileName = profileFromStates(statesByAgent, agents);
  const previousOpted = previouslyOptedConditional(
    previousStates,
    agents,
    profileName
  );
  const autoOpted = pickConditionalAuto(features, agents, profileName);
  const defaultOpted = previousOpted.length ? previousOpted : autoOpted;

  let optedSkills;
  if (interactive) {
    p.intro(`agentic update${dryRun ? ' (dry-run)' : ''}${force ? ' (force)' : ''}`);
    const previousLine = previousAgents.length
      ? previousAgents.map((a) => AGENT_LABEL[a]).join(', ')
      : 'none — first update on a legacy install';
    p.note(
      `Previous install: ${previousLine}\n` +
        `Updating for: ${agents.map((a) => AGENT_LABEL[a]).join(' + ')}\n` +
        `Profile: ${profileName}\n` +
        `Kit version: ${pkg.version}`,
      'Update plan'
    );

    const conditionalOptions = availableConditionalsForProfile(profileName)
      .map(({ name, rule }) => {
        const def = CONDITIONAL_BY_NAME[name];
        if (!def) return null;
        if (!def.agents.some((a) => agents.includes(a))) return null;
        const auto = evaluateRule(rule, features, agents);
        return {
          value: name,
          label: name,
          hint: auto ? def.hintWhenAuto : def.hintWhenManual,
        };
      })
      .filter(Boolean);

    if (conditionalOptions.length > 0) {
      const picked = await p.multiselect({
        message: 'Optional skills (toggle to include or exclude):',
        options: conditionalOptions,
        initialValues: defaultOpted,
        required: false,
      });
      if (p.isCancel(picked)) {
        p.cancel('Cancelled.');
        return;
      }
      optedSkills = picked;
    } else {
      optedSkills = [];
    }
  } else {
    optedSkills = defaultOpted;
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
    const agentSkills = skillsForAgent(agent, profileName, optedSkills);
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
      profile: profileName,
      dryRun,
      force,
    });
    allActions.push(...result.actions);
    // installSkills now stamps `profile` into nextStates per review C3.
    // No post-hoc injection.
    nextStates[agent] = result.nextStates[agent];
  }

  // Agent-independent: the Constitution lands once at the target root, not per
  // agent surface, so it sits outside the loop above. An update refreshes it
  // because the kit owns the content — see installKitDocs.
  allActions.push(...installKitDocs({ cwd, dryRun, force }));

  if (!dryRun) {
    for (const agent of agents) {
      saveState(cwd, agent, nextStates[agent]);
    }
  }

  // Dedup: ad-architecture and ad-adr are universal at team /
  // mature (in REQUIRED_SKILLS) AND conditional at solo (in
  // CONDITIONAL_SKILLS) per review B1 (v0.11.3). Without the Set, the
  // managed-skills section would list those rows twice.
  const skillDisplayOrder = [
    ...new Set([
      ...REQUIRED_SKILLS,
      ...CONDITIONAL_SKILLS.map((s) => s.name),
    ]),
  ].filter((s) => installedSkillSet.has(s));

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

  const rootDocAction = await updateRootDoc({
    cwd,
    skills: skillDisplayOrder,
    confirmAppend,
    confirmReplace: confirmRootDocReplace,
    dryRun,
  });

  // Keep freshly-installed kit files out of a shared repo's commits
  // (ADR-0051 Decision 4). Skipped on a dry-run, which writes nothing.
  const excluded = dryRun
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
  const userInstall = cwd === homedir() ? null : userLevelInstallPath();
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
      : `Updated to ${pkg.version}. State saved at .claude/agentic-state.json / .agents/agentic-state.json.`;
    p.outro(closing);
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
