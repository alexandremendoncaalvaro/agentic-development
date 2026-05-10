import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { detectAgents, detectFeatures, detectMode } from '../lib/detect.js';
import { installSkills } from '../lib/install.js';
import { saveState, loadState } from '../lib/state.js';
import {
  DEFAULT_PROFILE,
  PROFILES,
  PROFILE_NAMES,
  availableConditionalsForProfile,
  profileOrDefault,
  requiredSkillsForProfile,
} from '../lib/profiles.js';
import { updateRootDoc } from '../lib/rootdoc.js';

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
    name: 'agentic-design',
    autoIf: (f) => f.frontend,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'detected: frontend',
    hintWhenManual: 'frontend / DESIGN.md',
  },
  {
    name: 'agentic-subagent',
    autoIf: () => true,
    agents: ['claude-code'],
    hintWhenAuto: 'Claude Code only',
    hintWhenManual: 'Claude Code only',
  },
  {
    name: 'agentic-skill',
    autoIf: () => false,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'opt-in',
    hintWhenManual: 'opt-in (rarely needed)',
  },
  {
    name: 'agentic-hooks',
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
    name: 'agentic-architecture',
    autoIf: () => true,
    agents: ['claude-code', 'codex'],
    hintWhenAuto: 'system patterns + boundaries',
    hintWhenManual: 'opt-in (recommended once load-bearing patterns emerge)',
  },
  {
    name: 'agentic-adr',
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

  // Dedup: agentic-architecture and agentic-adr are universal at team /
  // mature (in REQUIRED_SKILLS) AND conditional at solo (in
  // CONDITIONAL_SKILLS) per review B1 (v0.11.3). Without the Set, the
  // managed-skills section would list those rows twice.
  const skillDisplayOrder = [
    ...new Set([
      ...REQUIRED_SKILLS,
      ...CONDITIONAL_SKILLS.map((s) => s.name),
    ]),
  ].filter((s) => installedSkillSet.has(s));

  const confirmAppend = interactive
    ? async (path) => {
        const answer = await p.confirm({
          message: `Append a managed "Skills installed by agentic" section to ${path}? (existing content preserved)`,
          initialValue: true,
        });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => true;

  const rootDocAction = await updateRootDoc({
    cwd,
    skills: skillDisplayOrder,
    confirmAppend,
  });

  const lines = allActions.map((a) => `${ACTION_SYMBOL[a.type]} ${a.path}`);
  if (rootDocAction.type !== 'absent') {
    lines.push(`${ROOT_DOC_LABEL[rootDocAction.type]}${rootDocAction.path}`);
  }

  if (interactive) {
    p.note(lines.join('\n'), 'Result');
    const slashLine = [
      '/agentic-bootstrap (AGENTS.md)',
      '/agentic-architecture (ARCHITECTURE.md)',
      '/agentic-adr',
      '/agentic-spec (doc/specs/)',
      '/agentic-task',
      '/agentic-audit',
      '/agentic-review (WORKFLOW §10)',
      '/agentic-ground (WORKFLOW §4 + §5)',
      '/agentic-next (state survey + recommendations)',
      '/agentic-spike (WORKFLOW §14 — staged spike with golden fixtures)',
      '/agentic-tdg (WORKFLOW §9 — outcome-based prompting + TDM)',
      '/agentic-domain (CONTEXT.md — Layer 2 ubiquitous language)',
      '/agentic-grill (interview-before-research)',
      '/agentic-deepen (WORKFLOW §8 — deepening opportunities)',
      '/agentic-diagnose (WORKFLOW §15 — five-phase diagnosis)',
      '/agentic-commit (Conventional Commits + DCO sign-off)',
      '/agentic-pr (open PR with uniform body)',
      '/agentic-merge (evaluate + merge PR)',
      ...(optedSkills.includes('agentic-design') ? ['/agentic-design (DESIGN.md)'] : []),
      ...(optedSkills.includes('agentic-subagent') && agents.includes('claude-code')
        ? ['/agentic-subagent']
        : []),
      ...(optedSkills.includes('agentic-skill') ? ['/agentic-skill'] : []),
      ...(optedSkills.includes('agentic-hooks') ? ['/agentic-hooks (WORKFLOW §11)'] : []),
    ]
      .filter((line) => {
        // Filter the universal-set entries to only those actually installed
        // for this profile.
        const universalNames = requiredSkillsForProfile(profileName);
        const universalLabels = {
          'agentic-bootstrap': '/agentic-bootstrap (AGENTS.md)',
          'agentic-architecture': '/agentic-architecture (ARCHITECTURE.md)',
          'agentic-adr': '/agentic-adr',
          'agentic-spec': '/agentic-spec (doc/specs/)',
          'agentic-task': '/agentic-task',
          'agentic-audit': '/agentic-audit',
          'agentic-review': '/agentic-review (WORKFLOW §10)',
          'agentic-ground': '/agentic-ground (WORKFLOW §4 + §5)',
          'agentic-deepen': '/agentic-deepen (WORKFLOW §8 — deepening opportunities)',
          'agentic-commit': '/agentic-commit (Conventional Commits + DCO sign-off)',
          'agentic-pr': '/agentic-pr (open PR with uniform body)',
          'agentic-merge': '/agentic-merge (evaluate + merge PR)',
          // 'agentic-philosophy' is implicit and not listed.
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
        .join(' or ')}: ${slashLine}. agentic-philosophy auto-loads on non-trivial work.`
    );
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
