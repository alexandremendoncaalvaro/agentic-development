import * as p from '@clack/prompts';
import { detectAgents, detectFeatures, detectMode } from '../lib/detect.js';
import { installSkills } from '../lib/install.js';

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
  unchanged: '·',
  skipped: '!',
};

const REQUIRED_SKILLS = [
  'agentic-bootstrap',
  'agentic-philosophy',
  'agentic-architecture',
  'agentic-adr',
  'agentic-task',
  'agentic-audit',
  'agentic-review',
];

/**
 * Conditional skills.
 * - autoIf(features): true → pre-checked / installed by default in non-interactive.
 * - agents: which agents have a source tree for this skill (claude-code, codex, or both).
 * - hint: shown next to the option in the TUI.
 */
const CONDITIONAL_SKILLS = [
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
];

function resolveAgents(flagValue, detectedAgents) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  if (detectedAgents.length > 0) return detectedAgents;
  return ['claude-code'];
}

function pickConditionalAuto(features, targetAgents) {
  return CONDITIONAL_SKILLS.filter(
    (s) => s.autoIf(features) && s.agents.some((a) => targetAgents.includes(a))
  ).map((s) => s.name);
}

function skillsForAgent(agent, optedSkills) {
  const conditional = optedSkills.filter((skillName) => {
    const def = CONDITIONAL_SKILLS.find((s) => s.name === skillName);
    return def && def.agents.includes(agent);
  });
  return [...REQUIRED_SKILLS, ...conditional];
}

export async function initCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(
      `invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`
    );
  }

  const cwd = process.cwd();
  const interactive = process.stdout.isTTY && !opts.yes && !opts.agent;

  const detectedMode = detectMode(cwd);
  const detectedAgents = detectAgents(cwd);
  const features = detectFeatures(cwd);

  let agents;
  let optedSkills;

  if (interactive) {
    p.intro('agentic init');
    const featureLine = [
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

    const conditionalOptions = CONDITIONAL_SKILLS.filter((s) =>
      s.agents.some((a) => agents.includes(a))
    ).map((s) => ({
      value: s.name,
      label: s.name,
      hint: s.autoIf(features) ? s.hintWhenAuto : s.hintWhenManual,
    }));
    const initialValues = pickConditionalAuto(features, agents);

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

    const totalCount = REQUIRED_SKILLS.length + optedSkills.length;
    const optedSummary = optedSkills.length
      ? `, plus ${optedSkills.join(', ')}`
      : '';
    const confirm = await p.confirm({
      message: `Install ${totalCount} skill${totalCount === 1 ? '' : 's'} (${REQUIRED_SKILLS.join(
        ', '
      )}${optedSummary}) for ${agents.map((a) => AGENT_LABEL[a]).join(' + ')}?`,
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cancelled.');
      return;
    }
  } else {
    agents = resolveAgents(opts.agent, detectedAgents);
    optedSkills = pickConditionalAuto(features, agents);
  }

  const confirmReplace = interactive
    ? async (question) => {
        const answer = await p.confirm({ message: question, initialValue: false });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => false;

  const allActions = [];
  for (const agent of agents) {
    const agentSkills = skillsForAgent(agent, optedSkills);
    const { actions } = await installSkills({
      cwd,
      agents: [agent],
      skills: agentSkills,
      confirmReplace,
    });
    allActions.push(...actions);
  }

  const lines = allActions.map((a) => `${ACTION_SYMBOL[a.type]} ${a.path}`);

  if (interactive) {
    p.note(lines.join('\n'), 'Result');
    const slashLine = [
      '/agentic-bootstrap (AGENTS.md)',
      '/agentic-architecture (ARCHITECTURE.md)',
      '/agentic-adr',
      '/agentic-task',
      '/agentic-audit',
      '/agentic-review (WORKFLOW §10)',
      ...(optedSkills.includes('agentic-design') ? ['/agentic-design (DESIGN.md)'] : []),
      ...(optedSkills.includes('agentic-subagent') && agents.includes('claude-code')
        ? ['/agentic-subagent']
        : []),
      ...(optedSkills.includes('agentic-skill') ? ['/agentic-skill'] : []),
    ].join(', ');
    p.outro(
      `Done. In ${agents
        .map((a) => AGENT_LABEL[a])
        .join(' or ')}: ${slashLine}. agentic-philosophy auto-loads on non-trivial work.`
    );
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
