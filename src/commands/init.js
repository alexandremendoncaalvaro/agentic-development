import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { detectAgents, detectMode } from '../lib/detect.js';
import { bundledSkills, installKitDocs, installSkills } from '../lib/install.js';
import { saveState, loadState, userLevelInstallPath } from '../lib/state.js';
import { updateRootDoc } from '../lib/rootdoc.js';
import { formatInstallReport, offerKitExclude, rootDocConfirmers } from '../lib/install-flow.js';
import { configureGlobalConstitution, globalKitPath } from '../lib/global-rules.js';
import { resolveScope, targetForScope } from '../lib/scope.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

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

// Prompts and warnings for the shared install flow (src/lib/install-flow.js).
async function ask(prompt) {
  const answer = await p.confirm(prompt);
  return !p.isCancel(answer) && answer;
}

function warn(line) {
  process.stderr.write(`${line}\n`);
}

function resolveAgents(flagValue) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  return ['claude-code', 'codex'];
}

export async function initCommand(opts) {
  if (opts.agent && !AGENT_FLAG_VALUES.includes(opts.agent)) {
    throw new Error(`invalid agent "${opts.agent}". Use one of: ${AGENT_FLAG_VALUES.join(', ')}`);
  }

  const invocationCwd = process.cwd();
  const scope = resolveScope(opts.scope);
  const cwd = targetForScope(scope, invocationCwd);
  const interactive = process.stdout.isTTY && !opts.yes && !opts.agent;

  const detectedMode = detectMode(cwd);
  const detectedAgents = detectAgents(cwd);
  let agents;

  if (interactive) {
    p.intro('agentic init');
    p.note(
      `Mode: ${MODE_LABEL[detectedMode]}\n` +
        `Agents detected: ${
          detectedAgents.length ? detectedAgents.map((a) => AGENT_LABEL[a]).join(', ') : 'none'
        }\n` +
        'All bundled skills install by default.',
      'Detected context'
    );

    const choice = await p.select({
      message: 'Install skills for which agent(s)?',
      options: [
        { value: ['claude-code'], label: 'Claude Code' },
        { value: ['codex'], label: 'Codex' },
        { value: ['claude-code', 'codex'], label: 'Both' },
      ],
      initialValue: detectedAgents.length === 1 ? detectedAgents : ['claude-code', 'codex'],
    });
    if (p.isCancel(choice)) {
      p.cancel('Cancelled.');
      return;
    }
    agents = choice;

    const totalCount = bundledSkills(agents[0]).length;
    const confirm = await p.confirm({
      message: `Install all ${totalCount} skill${
        totalCount === 1 ? '' : 's'
      } for ${agents.map((a) => AGENT_LABEL[a]).join(' + ')}?`,
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cancelled.');
      return;
    }
  } else {
    agents = resolveAgents(opts.agent);
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
    : async () => false;

  const allActions = [];
  const installedSkillSet = new Set();
  for (const agent of agents) {
    const agentSkills = bundledSkills(agent);
    for (const s of agentSkills) installedSkillSet.add(s);
    const previousStates = { [agent]: loadState(cwd, agent) };
    const { actions, nextStates } = await installSkills({
      cwd,
      agents: [agent],
      skills: agentSkills,
      confirmReplace,
      previousStates,
      kitVersion: pkg.version,
    });
    allActions.push(...actions);
    saveState(cwd, agent, nextStates[agent]);
  }

  // The constitution is machine-global. A project installation is deliberately
  // skills-only: it may be a team-pinned exception, but it never sprays root
  // kit files into a repository.
  if (scope === 'user') {
    allActions.push(...installKitDocs({ targetDir: globalKitPath() }));
    for (const agent of agents) {
      allActions.push(configureGlobalConstitution({ agent }));
    }
  }

  const skillDisplayOrder = [...installedSkillSet].sort();

  // A tracked root doc is shared with everyone who clones the repo (ADR-0051):
  // an unattended run writes it only under --force-root-doc.
  const { confirmAppend, confirmReplace: confirmRootDocReplace } = rootDocConfirmers({
    cwd,
    interactive,
    forceRootDoc: Boolean(opts.forceRootDoc),
    untrackedReplace: 'allow',
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
        })
      : { type: 'absent' };

  // Keep freshly-installed kit files out of a shared repo's commits via
  // .git/info/exclude — per-clone and never committed, unlike .gitignore
  // (ADR-0051 Decision 4). Interactive offers; non-interactive leaves them and
  // says so, holding the refuse-to-guess posture. Files already tracked (the
  // dogfood self-install, a team-owned subagent) are dropped by filename, so a
  // mixed-ownership directory never has a team file hidden from git.
  const excluded =
    scope === 'project'
      ? await offerKitExclude({
          cwd,
          paths: [...new Set(allActions.map((a) => a.path))],
          interactive,
          ask,
          warn,
        })
      : 0;

  const userInstall = scope === 'user' || cwd === homedir() ? null : userLevelInstallPath();
  const lines = formatInstallReport({
    actions: allActions,
    rootDocAction,
    excluded,
    tagAgent: false,
    userInstall,
  });

  if (interactive) {
    p.note(lines.join('\n'), 'Result');
    p.outro(
      `Done. Installed ${installedSkillSet.size} skills for ${agents
        .map((a) => AGENT_LABEL[a])
        .join(
          ' + '
        )} (${scope} scope). Start with /ad-next; ad-philosophy auto-loads on non-trivial work.`
    );
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
