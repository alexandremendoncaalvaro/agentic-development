import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_PROFILE, validateProfile } from './profiles.js';

export const SCHEMA_VERSION = 1;
export const STATE_FILE = 'agentic-state.json';

export const STATE_DIRS = {
  'claude-code': '.claude',
  codex: '.agents',
};

export function statePath(cwd, agent) {
  const dir = STATE_DIRS[agent];
  if (!dir) throw new Error(`unknown agent "${agent}"`);
  return join(cwd, dir, STATE_FILE);
}

export function emptyState(agent, kitVersion, profile = DEFAULT_PROFILE) {
  return {
    schemaVersion: SCHEMA_VERSION,
    kitVersion,
    agent,
    profile: validateProfile(profile),
    skills: {},
  };
}

export function loadState(cwd, agent) {
  const path = statePath(cwd, agent);
  if (!existsSync(path)) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`malformed state at ${path}: ${err.message}`);
  }
  if (typeof raw.schemaVersion !== 'number') {
    throw new Error(`state at ${path} missing schemaVersion`);
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `state at ${path} has schemaVersion ${raw.schemaVersion}; this kit only knows ${SCHEMA_VERSION}. Upgrade the kit.`
    );
  }
  if (raw.agent && raw.agent !== agent) {
    throw new Error(
      `state at ${path} declares agent "${raw.agent}" but expected "${agent}"`
    );
  }
  // `profile` is optional and forward-compatible. Pre-v0.8 state files have
  // no profile field; default to `team` per ADR-0013 (the v0.7 install set is
  // byte-identical to the team profile).
  let profile = DEFAULT_PROFILE;
  if (raw.profile) {
    try {
      profile = validateProfile(raw.profile);
    } catch (err) {
      throw new Error(`state at ${path}: ${err.message}`);
    }
  }

  return {
    schemaVersion: raw.schemaVersion,
    kitVersion: raw.kitVersion ?? null,
    agent,
    profile,
    skills: raw.skills ?? {},
  };
}

export function saveState(cwd, agent, state) {
  const path = statePath(cwd, agent);
  mkdirSync(dirname(path), { recursive: true });
  const ordered = orderState(state);
  writeFileSync(path, JSON.stringify(ordered, null, 2) + '\n');
}

function orderState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('orderState: state must be an object');
  }
  if (!state.skills || typeof state.skills !== 'object') {
    throw new Error(
      'orderState: state.skills must be an object (got ' + typeof state.skills + ')'
    );
  }
  const skills = {};
  for (const skillName of Object.keys(state.skills).sort()) {
    const entry = state.skills[skillName];
    if (!entry || !Array.isArray(entry.files)) {
      throw new Error(
        `orderState: state.skills["${skillName}"].files must be an array`
      );
    }
    const files = [...entry.files].sort((a, b) => a.path.localeCompare(b.path));
    skills[skillName] = {
      version: entry.version,
      files: files.map((f) => ({ path: f.path, sourceSha: f.sourceSha })),
    };
  }
  return {
    schemaVersion: state.schemaVersion,
    kitVersion: state.kitVersion,
    agent: state.agent,
    profile: state.profile ?? DEFAULT_PROFILE,
    skills,
  };
}
