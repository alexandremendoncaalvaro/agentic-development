import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { detectAgents, detectFeatures, detectMode } from '../lib/detect.js';
import { installKitDocs, installSkills } from '../lib/install.js';
import { saveState, loadState, userLevelInstallPath } from '../lib/state.js';
import {
  DEFAULT_PROFILE,
  PROFILES,
  PROFILE_NAMES,
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
import {
  trackedState,
  installedPathsToExclude,
  writeExcludeEntries,
} from '../lib/git.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
);

const VALID_AGENTS = ['claude-code', 'codex'];
const AGENT_FLAG_VALUES = ['claude-code', 'codex', 'both'];

const MODE_LABEL = {
  greenfield: 'greenfield — empty project',
  brownfield: 'brownfield — existing code, no AGENTS.md',
  audit: 'audit — AGENTS.md exists',
};

const AGENT_LABEL = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

const ACTION_SYMBOL = {
  created: '+',
  replaced: '~',
  updated: '~',
  unchanged: '·',
  kept: '·',
  skipped: '!',
};

const ROOT_DOC_LABEL = {
  appended: '+ ',
  updated: '~ ',
  unchanged: '· ',
  skipped: '! ',
  'kept-stale': '! ',
  absent: '',
};

/**
 * Backward-compatible export: the `team` profile's universal skill list.
 * Tests and downstream code that imported REQUIRED_SKILLS pre-v0.8 get the
 * same list. New code should call `requiredSkillsForProfile(profileName)`.
 */
export const REQUIRED_SKILLS = requiredSkillsForProfile('team');

/**
 * Backward-compatible export: the v0.7-shape conditional skill catalog.
 * The four entries match the four conditional skills available in v0.7
 * with their autoIf / agents / hint configuration. The profile-aware
 * install path overrides `autoIf` per profile via `availableConditionalsForProfile`.
 */
export const CONDITIONAL_SKILLS = [
  {
    name: 'ad-design',
    autoIf: (f) => f.frontend,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'detected: frontend',
    hintWhenManual: 'frontend / DESIGN.md',
  },
  {
    name: 'ad-subagent',
    autoIf: () => true,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'subagent scaffolder',
    hintWhenManual: 'subagent scaffolder',
  },
  {
    name: 'ad-skill',
    autoIf: () => false,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'opt-in',
    hintWhenManual: 'opt-in (rarely needed)',
  },
  {
    name: 'ad-hooks',
    autoIf: () => false,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'opt-in',
    hintWhenManual: 'WORKFLOW §11 hooks scaffolder (pre-commit, pre-push)',
  },
  // The next two skills are universal in `team` / `mature` profiles
  // (declared in PROFILES['team' / 'mature'].universal in src/lib/profiles.js)
  // and conditional/opt-in in `solo`. They must appear in this catalog so
  // `availableConditionalsForProfile('solo')` lookups in `pickConditionalAuto`
  // succeed — without these entries, `if (!def) continue` silently skipped
  // them and a `solo` user could not opt-in to either (review B1, v0.11.3).
  // The autoIf rule here is the universal-default; per-profile overrides
  // come from `availableConditionalsForProfile`'s rule field.
  {
    name: 'ad-architecture',
    autoIf: () => true,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'system patterns + boundaries',
    hintWhenManual: 'opt-in (recommended once load-bearing patterns emerge)',
  },
  {
    name: 'ad-adr',
    autoIf: () => true,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'binding architectural decisions (Nygard pattern)',
    hintWhenManual: 'opt-in (recommended for binding decisions worth recording)',
  },
];

const CONDITIONAL_BY_NAME = Object.fromEntries(
  CONDITIONAL_SKILLS.map((s) => [s.name, s])
);

function resolveAgents(flagValue, detectedAgents) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  if (detectedAgents.length > 0) return detectedAgents;
  return ['claude-code'];
}

/**
 * Translate a profile rule (`'frontend'`, `'claude-code'`, `true`, `false`)
 * into a boolean: should this conditional auto-install for the current
 * features and target agents?
 */
function evaluateRule(rule, features, targetAgents) {
  if (rule === 'frontend') return features.frontend === true;
  if (rule === 'claude-code') return targetAgents.includes('claude-code');
  if (rule === true) return true;
  if (rule === false) return false;
  return false;
}

function pickConditionalAuto(features, targetAgents, profileName) {
  const out = [];
  for (const { name, rule } of availableConditionalsForProfile(profileName)) {
    const def = CONDITIONAL_BY_NAME[name];
    if (!def) continue;
    if (!def.agents.some((a) => targetAgents.includes(a))) continue;
    if (evaluateRule(rule, features, targetAgents)) {
      out.push(name);
    }
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
 * Offer to keep freshly-installed kit files out of a shared repo's commits via
 * `.git/info/exclude` (ADR-0051 Decision 4). Shared by init and update.
 * Returns the number of entries added. Interactive asks (default yes);
 * non-interactive declines and notes it, holding the refuse-to-guess posture —
 * the write is local-only, but a `-y`/CI run shouldn't silently hide files a
 * user might mean to commit. Tracked files are already dropped by
 * `installedPathsToExclude`, so a mixed-ownership directory is safe.
 */
export async function offerKitExclude({ cwd, paths, interactive }) {
  const toExclude = installedPathsToExclude(cwd, paths);
  if (toExclude.length === 0) return 0;
  if (!interactive) {
    process.stderr.write(
      `note: ${toExclude.length} kit file(s) are untracked in this repo; ` +
        `run interactively to add them to .git/info/exclude so they are not committed.\n`
    );
    return 0;
  }
  const answer = await p.confirm({
    message:
      `Exclude ${toExclude.length} installed kit file(s) from git via ` +
      `.git/info/exclude, so they are not committed to this repo? ` +
      `(per-clone, never committed; recommended when the repo is shared)`,
    initialValue: true,
  });
  if (p.isCancel(answer) || !answer) return 0;
  return writeExcludeEntries(cwd, toExclude).added.length;
}

export async function initCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(
      `invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`
    );
  }

  if (opts.profile && !PROFILE_NAMES.includes(opts.profile)) {
    throw new Error(
      `invalid profile "${opts.profile}". Use one of: ${PROFILE_NAMES.join(', ')}`
    );
  }

  const cwd = process.cwd();
  const interactive = process.stdout.isTTY && !opts.yes && !opts.agent;

  const detectedMode = detectMode(cwd);
  const detectedAgents = detectAgents(cwd);
  const features = detectFeatures(cwd);

  let profileName = profileOrDefault(opts.profile);
  let agents;
  let optedSkills;

  if (interactive) {
    p.intro('agentic init');
    const featureLine =
      [
        features.frontend ? 'frontend' : null,
        features.hasClaudeCode ? '.claude/ present' : null,
        features.hasCodex ? '.agents/.openai/ present' : null,
      ]
        .filter(Boolean)
        .join(', ') || 'none';

    p.note(
      `Mode: ${MODE_LABEL[detectedMode]}\n` +
        `Agents detected: ${
          detectedAgents.length
            ? detectedAgents.map((a) => AGENT_LABEL[a]).join(', ')
            : 'none'
        }\n` +
        `Features: ${featureLine}`,
      'Detected context'
    );

    const profileChoice = await p.select({
      message: 'Project maturity profile?',
      options: PROFILE_NAMES.map((name) => ({
        value: name,
        label: name,
        hint: PROFILES[name].note,
      })),
      initialValue: profileName,
    });
    if (p.isCancel(profileChoice)) {
      p.cancel('Cancelled.');
      return;
    }
    profileName = profileChoice;

    const choice = await p.select({
      message: 'Install skills for which agent(s)?',
      options: [
        { value: ['claude-code'], label: 'Claude Code' },
        { value: ['codex'], label: 'Codex' },
        { value: ['claude-code', 'codex'], label: 'Both' },
      ],
      initialValue:
        detectedAgents.length === 1
          ? detectedAgents
          : ['claude-code', 'codex'],
    });
    if (p.isCancel(choice)) {
      p.cancel('Cancelled.');
      return;
    }
    agents = choice;

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
    const initialValues = pickConditionalAuto(features, agents, profileName);

    if (conditionalOptions.length > 0) {
      const picked = await p.multiselect({
        message: 'Optional skills (toggle to include or exclude):',
        options: conditionalOptions,
        initialValues,
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

    const universalForProfile = requiredSkillsForProfile(profileName);
    const totalCount = universalForProfile.length + optedSkills.length;
    const optedSummary = optedSkills.length
      ? `, plus ${optedSkills.join(', ')}`
      : '';
    const confirm = await p.confirm({
      message: `Install ${totalCount} skill${
        totalCount === 1 ? '' : 's'
      } (${universalForProfile.join(', ')}${optedSummary}) for ${agents
        .map((a) => AGENT_LABEL[a])
        .join(' + ')}?`,
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cancelled.');
      return;
    }
  } else {
    agents = resolveAgents(opts.agent, detectedAgents);
    optedSkills = pickConditionalAuto(features, agents, profileName);
  }

  const confirmReplace = interactive
    ? async (question) => {
        const answer = await p.confirm({ message: question, initialValue: false });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => false;

  const allActions = [];
  const installedSkillSet = new Set();
  for (const agent of agents) {
    const agentSkills = skillsForAgent(agent, profileName, optedSkills);
    for (const s of agentSkills) installedSkillSet.add(s);
    const previousStates = { [agent]: loadState(cwd, agent) };
    const { actions, nextStates } = await installSkills({
      cwd,
      agents: [agent],
      skills: agentSkills,
      confirmReplace,
      previousStates,
      kitVersion: pkg.version,
      profile: profileName,
    });
    allActions.push(...actions);
    // installSkills now stamps `profile` into nextStates per review C3.
    // No post-hoc injection.
    saveState(cwd, agent, nextStates[agent]);
  }

  // Agent-independent: the Constitution lands once at the target root, not per
  // agent surface, so it sits outside the loop above.
  allActions.push(...installKitDocs({ cwd }));

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

  // A non-interactive run has nobody to ask, so it must not decide for the
  // team: a tracked root doc is shared with everyone who clones the repo
  // (ADR-0051). Unknown tracking state keeps the prior behaviour. Shared by
  // both root-doc write paths — appending a new section and replacing a stale
  // one are the same hazard on the same file.
  const allowUnattendedRootDocWrite = (path) => {
    if (opts.forceRootDoc) return true;
    if (trackedState(cwd, path) !== 'tracked') return true;
    process.stderr.write(trackedRootDocSkipNotice(path) + '\n');
    return false;
  };

  const confirmAppend = interactive
    ? async (path) => {
        // Message and default come from rootDocAppendPrompt so the decision is
        // unit-tested; a TTY-less suite cannot drive p.confirm itself.
        const answer = await p.confirm(
          rootDocAppendPrompt(path, trackedState(cwd, path))
        );
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async (path) => allowUnattendedRootDocWrite(path);

  // Distinct from the `confirmReplace` passed to installSkills above: that one
  // resolves a skill-file conflict and receives a question, this one receives
  // the root doc's name. A tracked doc names the sharing risk and defaults to
  // no (ADR-0051 Decision 2); an untracked doc keeps the prior behaviour of
  // silently regenerating the kit's own section.
  const confirmRootDocReplace = interactive
    ? async (path) => {
        if (trackedState(cwd, path) !== 'tracked') return true;
        const answer = await p.confirm(rootDocReplacePrompt(path));
        return !p.isCancel(answer) && answer;
      }
    : async (path) => allowUnattendedRootDocWrite(path);

  const rootDocAction = await updateRootDoc({
    cwd,
    skills: skillDisplayOrder,
    confirmAppend,
    confirmReplace: confirmRootDocReplace,
  });

  // Keep freshly-installed kit files out of a shared repo's commits via
  // .git/info/exclude — per-clone and never committed, unlike .gitignore
  // (ADR-0051 Decision 4). Interactive offers; non-interactive leaves them and
  // says so, holding the refuse-to-guess posture. Files already tracked (the
  // dogfood self-install, a team-owned subagent) are dropped by filename, so a
  // mixed-ownership directory never has a team file hidden from git.
  const excluded = await offerKitExclude({
    cwd,
    paths: [...new Set(allActions.map((a) => a.path))],
    interactive,
  });

  const lines = allActions.map((a) => `${ACTION_SYMBOL[a.type]} ${a.path}`);
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
    p.note(lines.join('\n'), 'Result');
    const slashLine = [
      '/ad-bootstrap (AGENTS.md)',
      '/ad-architecture (ARCHITECTURE.md)',
      '/ad-adr',
      '/ad-spec (doc/specs/)',
      '/ad-task',
      '/ad-drift',
      '/ad-review (WORKFLOW §10)',
      '/ad-audit (maximum-gate rules-anchored audit)',
      '/ad-level-up (curate the project rule-set)',
      '/ad-ground (WORKFLOW §4 + §5)',
      '/ad-next (state survey + recommendations)',
      '/ad-archive (sweep done tasks / shipped specs / superseded ADRs into git history)',
      '/ad-spike (WORKFLOW §14 — staged spike with golden fixtures)',
      '/ad-tdg (WORKFLOW §9 — outcome-based prompting + TDM)',
      '/ad-domain (CONTEXT.md — Layer 2 ubiquitous language)',
      '/ad-grill-me (interview-before-research)',
      '/ad-deepen (WORKFLOW §8 — deepening opportunities)',
      '/ad-diagnose (WORKFLOW §15 — five-phase diagnosis)',
      '/ad-commit (Conventional Commits + DCO sign-off)',
      '/ad-pr (open PR with uniform body)',
      '/ad-merge (evaluate + merge PR)',
      '/ad-handoff (compact session → $TMPDIR/agentic-handoffs/)',
      ...(optedSkills.includes('ad-design') ? ['/ad-design (DESIGN.md)'] : []),
      ...(optedSkills.includes('ad-subagent') ? ['/ad-subagent'] : []),
      ...(optedSkills.includes('ad-skill') ? ['/ad-skill'] : []),
      ...(optedSkills.includes('ad-hooks') ? ['/ad-hooks (WORKFLOW §11)'] : []),
    ]
      .filter((line) => {
        // Filter the universal-set entries to only those actually installed
        // for this profile.
        const universalNames = requiredSkillsForProfile(profileName);
        const universalLabels = {
          'ad-bootstrap': '/ad-bootstrap (AGENTS.md)',
          'ad-architecture': '/ad-architecture (ARCHITECTURE.md)',
          'ad-adr': '/ad-adr',
          'ad-spec': '/ad-spec (doc/specs/)',
          'ad-task': '/ad-task',
          'ad-drift': '/ad-drift',
          'ad-archive':
            '/ad-archive (sweep done tasks / shipped specs / superseded ADRs into git history)',
          'ad-review': '/ad-review (WORKFLOW §10)',
          'ad-audit': '/ad-audit (maximum-gate rules-anchored audit)',
          'ad-level-up': '/ad-level-up (curate the project rule-set)',
          'ad-ground': '/ad-ground (WORKFLOW §4 + §5)',
          'ad-deepen': '/ad-deepen (WORKFLOW §8 — deepening opportunities)',
          'ad-commit': '/ad-commit (Conventional Commits + DCO sign-off)',
          'ad-pr': '/ad-pr (open PR with uniform body)',
          'ad-merge': '/ad-merge (evaluate + merge PR)',
          'ad-handoff':
            '/ad-handoff (compact session → $TMPDIR/agentic-handoffs/)',
          // 'ad-philosophy' is implicit and not listed.
        };
        for (const [skill, label] of Object.entries(universalLabels)) {
          if (line === label) return universalNames.includes(skill);
        }
        return true;
      })
      .join(', ');
    p.outro(
      `Done (profile: ${profileName}). In ${agents
        .map((a) => AGENT_LABEL[a])
        .join(' or ')}: ${slashLine}. ad-philosophy auto-loads on non-trivial work.`
    );
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
