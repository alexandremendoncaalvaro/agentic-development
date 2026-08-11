import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { detectAgents, detectMode } from '../lib/detect.js';
import { bundledSkills, installKitDocs, installSkills } from '../lib/install.js';
import { saveState, loadState, userLevelInstallPath } from '../lib/state.js';
import {
  updateRootDoc,
  rootDocAppendPrompt,
  rootDocReplacePrompt,
  trackedRootDocSkipNotice,
} from '../lib/rootdoc.js';
import { trackedState } from '../lib/git.js';
import { offerKitExclude } from './kit-exclude.js';

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

function resolveAgents(flagValue) {
  if (flagValue === 'both') return ['claude-code', 'codex'];
  if (flagValue) return [flagValue];
  return ['claude-code', 'codex'];
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
        const answer = await p.confirm({ message: question, initialValue: false });
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

  // Agent-independent: the Constitution lands once at the target root, not per
  // agent surface, so it sits outside the loop above.
  allActions.push(...installKitDocs({ cwd }));

  const skillDisplayOrder = [...installedSkillSet].sort();

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
    p.outro(
      `Done. Installed ${installedSkillSet.size} skills for ${agents
        .map((a) => AGENT_LABEL[a])
        .join(' + ')}. Start with /ad-next; ad-philosophy auto-loads on non-trivial work.`
    );
  } else {
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }
  }
}
