import * as p from '@clack/prompts';
import { detectAgents } from '../lib/detect.js';
import {
  DEFAULT_PROFILE,
  PROFILES,
  PROFILE_NAMES,
  validateProfile,
} from '../lib/profiles.js';
import { loadState, saveState } from '../lib/state.js';
import { updateCommand } from './update.js';

const VALID_AGENTS = ['claude-code', 'codex'];

const AGENT_LABEL = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

function readProjectProfile(cwd) {
  // Returns { agent: profileName }. Use `loadProjectStates(cwd)` instead
  // when you need both the profile and the full state objects in a single
  // pass (avoids the TOCTOU window where state files could be deleted
  // between two reads — review C2, v0.11.3).
  const perAgent = {};
  for (const agent of VALID_AGENTS) {
    const state = loadState(cwd, agent);
    if (state) perAgent[agent] = state.profile ?? DEFAULT_PROFILE;
  }
  return perAgent;
}

function loadProjectStates(cwd) {
  // Single-pass load of every per-agent state file. Returns
  // { statesByAgent, profilesByAgent }. Both objects share the same agent
  // keys so callers can iterate one and look up the other without a
  // second filesystem read.
  const statesByAgent = {};
  const profilesByAgent = {};
  for (const agent of VALID_AGENTS) {
    const state = loadState(cwd, agent);
    if (state) {
      statesByAgent[agent] = state;
      profilesByAgent[agent] = state.profile ?? DEFAULT_PROFILE;
    }
  }
  return { statesByAgent, profilesByAgent };
}

function showProfile(cwd) {
  const perAgent = readProjectProfile(cwd);
  if (Object.keys(perAgent).length === 0) {
    process.stdout.write(
      'No agentic install detected (no .claude/agentic-state.json or .agents/agentic-state.json).\n'
    );
    process.stdout.write(
      `Run \`agentic init\` to scaffold; default profile is \`${DEFAULT_PROFILE}\`.\n`
    );
    return;
  }
  for (const [agent, profile] of Object.entries(perAgent)) {
    process.stdout.write(`${AGENT_LABEL[agent]}: ${profile}\n`);
  }
}

function listProfiles() {
  for (const name of PROFILE_NAMES) {
    const def = PROFILES[name];
    process.stdout.write(`${name}\n  ${def.note}\n`);
    process.stdout.write(`  Universal: ${def.universal.join(', ')}\n`);
    const conditional = Object.entries(def.conditional)
      .filter(([, rule]) => rule !== 'blocked')
      .map(([skill, rule]) => `${skill}=${formatRule(rule)}`)
      .join(', ');
    process.stdout.write(`  Conditional: ${conditional || 'none'}\n\n`);
  }
}

function formatRule(rule) {
  if (rule === true) return 'recommended';
  if (rule === false) return 'opt-in';
  if (typeof rule === 'string') return `auto-if-${rule}`;
  return String(rule);
}

async function setProfile(cwd, name, opts) {
  validateProfile(name);

  // Single load — reuse below to write. Avoids the TOCTOU window where
  // state files could be deleted between read and re-read (review C2,
  // v0.11.3). Previous implementation called readProjectProfile then
  // loadState again per agent in the write loop.
  const { statesByAgent, profilesByAgent } = loadProjectStates(cwd);
  if (Object.keys(statesByAgent).length === 0) {
    throw new Error(
      'no agentic install detected. Run `agentic init --profile <name>` first.'
    );
  }

  const interactive = process.stdout.isTTY && !opts.yes;

  const currentProfiles = [...new Set(Object.values(profilesByAgent))];
  if (currentProfiles.length === 1 && currentProfiles[0] === name) {
    process.stdout.write(`Profile already \`${name}\` for all installed agents. No change.\n`);
    return;
  }

  if (interactive) {
    p.intro(`agentic profile set ${name}`);
    p.note(
      Object.entries(profilesByAgent)
        .map(([agent, profile]) => `${AGENT_LABEL[agent]}: ${profile} → ${name}`)
        .join('\n'),
      'Profile change'
    );
    p.note(PROFILES[name].note, `${name} profile`);

    const confirm = await p.confirm({
      message:
        'This may add or remove skills under the new profile. Continue? (`agentic update` runs after.)',
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cancelled.');
      return;
    }
  }

  // Write the new profile to each installed agent's state file before
  // running update, so update reads the new profile. Reuses the in-memory
  // states loaded above — no second filesystem read.
  for (const [agent, state] of Object.entries(statesByAgent)) {
    state.profile = name;
    saveState(cwd, agent, state);
  }

  // Run the equivalent of `agentic update` so the install set matches the
  // new profile. The update command picks profile up from the state files
  // we just wrote.
  await updateCommand({
    agent: undefined,
    yes: opts.yes,
    dryRun: false,
    force: false,
  });

  if (interactive) {
    p.outro(`Profile set to \`${name}\`. Install state refreshed.`);
  } else {
    process.stdout.write(`Profile set to \`${name}\`. Install state refreshed.\n`);
  }
}

export async function profileCommand(arg, opts) {
  const cwd = process.cwd();

  if (!arg) {
    showProfile(cwd);
    return;
  }

  if (arg === 'list') {
    listProfiles();
    return;
  }

  if (arg === 'show') {
    showProfile(cwd);
    return;
  }

  if (arg === 'set') {
    if (!opts.name) {
      throw new Error(
        'profile set requires a profile name. Usage: `agentic profile set <name>`'
      );
    }
    await setProfile(cwd, opts.name, opts);
    return;
  }

  // If `arg` is not a subcommand, treat it as `set <name>` shorthand.
  if (PROFILE_NAMES.includes(arg)) {
    await setProfile(cwd, arg, opts);
    return;
  }

  throw new Error(
    `unknown subcommand "${arg}". Use \`show\`, \`list\`, or \`set <name>\` (or pass a profile name directly).`
  );
}
