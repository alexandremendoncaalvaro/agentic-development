import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { detectAgents, detectFeatures } from '../lib/detect.js';
import { installSkills, removeOrphanSkills } from '../lib/install.js';
import { loadState, saveState } from '../lib/state.js';
import { updateRootDoc } from '../lib/rootdoc.js';
import { CONDITIONAL_SKILLS, REQUIRED_SKILLS } from './init.js';

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
  'orphan-kept': '?',
};

const ROOT_DOC_LABEL = {
  appended: '+ ',
  updated: '~ ',
  unchanged: '· ',
  skipped: '! ',
  absent: '',
};

function resolveAgents(flagValue, detectedAgents, previousAgents) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  if (previousAgents.length > 0) return previousAgents;
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

function previousAgentsFromStates(cwd) {
  const out = [];
  for (const agent of VALID_AGENTS) {
    const state = loadState(cwd, agent);
    if (state) out.push(agent);
  }
  return out;
}

function previouslyOptedConditional(previousStates, currentAgents) {
  const opted = new Set();
  for (const agent of currentAgents) {
    const prev = previousStates[agent];
    if (!prev) continue;
    for (const skill of Object.keys(prev.skills ?? {})) {
      if (CONDITIONAL_SKILLS.some((s) => s.name === skill)) {
        opted.add(skill);
      }
    }
  }
  return [...opted];
}

export async function updateCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(
      `invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`
    );
  }

  const cwd = process.cwd();
  const interactive = process.stdout.isTTY && !opts.yes && !opts.agent;
  const dryRun = Boolean(opts.dryRun);
  const force = Boolean(opts.force);

  const detectedAgents = detectAgents(cwd);
  const features = detectFeatures(cwd);
  const previousAgents = previousAgentsFromStates(cwd);

  const agents = resolveAgents(opts.agent, detectedAgents, previousAgents);
  const previousStates = {};
  for (const agent of agents) {
    previousStates[agent] = loadState(cwd, agent);
  }

  const previousOpted = previouslyOptedConditional(previousStates, agents);
  const autoOpted = pickConditionalAuto(features, agents);
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
        `Kit version: ${pkg.version}`,
      'Update plan'
    );

    const conditionalOptions = CONDITIONAL_SKILLS.filter((s) =>
      s.agents.some((a) => agents.includes(a))
    ).map((s) => ({
      value: s.name,
      label: s.name,
      hint: s.autoIf(features) ? s.hintWhenAuto : s.hintWhenManual,
    }));

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
    const agentSkills = skillsForAgent(agent, optedSkills);
    for (const s of agentSkills) installedSkillSet.add(s);

    const orphanResult = await removeOrphanSkills({
      cwd,
      agent,
      previousState: previousStates[agent],
      currentSkills: agentSkills,
      confirmRemove,
      dryRun,
    });
    allActions.push(...orphanResult.actions);

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

  if (!dryRun) {
    for (const agent of agents) {
      saveState(cwd, agent, nextStates[agent]);
    }
  }

  const skillDisplayOrder = [
    ...REQUIRED_SKILLS,
    ...CONDITIONAL_SKILLS.map((s) => s.name),
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

  const rootDocAction = !dryRun
    ? await updateRootDoc({
        cwd,
        skills: skillDisplayOrder,
        confirmAppend,
      })
    : { type: 'absent', path: null };

  const lines = allActions.map((a) => {
    const sym = ACTION_SYMBOL[a.type] ?? '?';
    return `${sym} [${a.agent}] ${a.path}`;
  });
  if (rootDocAction.type !== 'absent') {
    lines.push(`${ROOT_DOC_LABEL[rootDocAction.type]}${rootDocAction.path}`);
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
