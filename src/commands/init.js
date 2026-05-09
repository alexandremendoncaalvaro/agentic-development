import * as p from '@clack/prompts';
import { detectAgents, detectMode } from '../lib/detect.js';
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

const REQUIRED_SKILLS = ['agentic-bootstrap'];

function resolveAgents(flagValue, detectedAgents) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  if (detectedAgents.length > 0) return detectedAgents;
  return ['claude-code'];
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

  let agents;

  if (interactive) {
    p.intro('agentic init');
    p.note(
      `Mode: ${MODE_LABEL[detectedMode]}\n` +
        `Agents detected: ${
          detectedAgents.length
            ? detectedAgents.map((a) => AGENT_LABEL[a]).join(', ')
            : 'none'
        }`,
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

    const confirm = await p.confirm({
      message: `Install ${REQUIRED_SKILLS.join(', ')} for ${agents
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
  }

  const confirmReplace = interactive
    ? async (question) => {
        const answer = await p.confirm({ message: question, initialValue: false });
        if (p.isCancel(answer)) return false;
        return answer;
      }
    : async () => false;

  const { actions } = await installSkills({
    cwd,
    agents,
    skills: REQUIRED_SKILLS,
    confirmReplace,
  });

  const lines = actions.map((a) => `${ACTION_SYMBOL[a.type]} ${a.path}`);

  if (interactive) {
    p.note(lines.join('\n'), 'Result');
    p.outro(
      `Done. Run /agentic-bootstrap in ${agents
        .map((a) => AGENT_LABEL[a])
        .join(' or ')} to generate AGENTS.md.`
    );
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
