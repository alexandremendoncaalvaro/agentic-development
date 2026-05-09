import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROFILE,
  PROFILE_NAMES,
  PROFILES,
  availableConditionalsForProfile,
  profileOrDefault,
  requiredSkillsForProfile,
  validateProfile,
} from '../src/lib/profiles.js';
import { loadState, saveState, statePath, STATE_DIRS } from '../src/lib/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'agentic.js');

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-profile-test-'));
}

function runInit(cwd, args = []) {
  return execFileSync('node', [BIN, 'init', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('PROFILE_NAMES is poc/solo/team/mature in monotone order', () => {
  assert.deepEqual(PROFILE_NAMES, ['poc', 'solo', 'team', 'mature']);
});

test('DEFAULT_PROFILE is team', () => {
  assert.equal(DEFAULT_PROFILE, 'team');
});

test('every profile has universal, conditional, and note', () => {
  for (const name of PROFILE_NAMES) {
    const def = PROFILES[name];
    assert.ok(Array.isArray(def.universal), `${name}: universal must be array`);
    assert.ok(typeof def.conditional === 'object', `${name}: conditional must be object`);
    assert.ok(typeof def.note === 'string' && def.note.length > 0, `${name}: note must be non-empty string`);
  }
});

test('profiles are monotone supersets: poc ⊆ solo ⊆ team ⊆ mature (for universal sets)', () => {
  const poc = new Set(PROFILES.poc.universal);
  const solo = new Set(PROFILES.solo.universal);
  const team = new Set(PROFILES.team.universal);
  const mature = new Set(PROFILES.mature.universal);

  for (const skill of poc) assert.ok(solo.has(skill), `solo missing ${skill}`);
  for (const skill of solo) assert.ok(team.has(skill), `team missing ${skill}`);
  for (const skill of team) assert.ok(mature.has(skill), `mature missing ${skill}`);
});

test('validateProfile rejects unknown', () => {
  assert.throws(() => validateProfile('enterprise'), /unknown profile/);
});

test('profileOrDefault returns DEFAULT_PROFILE on empty', () => {
  assert.equal(profileOrDefault(undefined), DEFAULT_PROFILE);
  assert.equal(profileOrDefault(null), DEFAULT_PROFILE);
  assert.equal(profileOrDefault(''), DEFAULT_PROFILE);
});

test('requiredSkillsForProfile returns the universal set per profile', () => {
  assert.deepEqual(requiredSkillsForProfile('poc'), PROFILES.poc.universal);
  assert.deepEqual(requiredSkillsForProfile('team'), PROFILES.team.universal);
});

test('availableConditionalsForProfile omits blocked entries', () => {
  // poc blocks all conditionals.
  const pocAvailable = availableConditionalsForProfile('poc');
  assert.equal(pocAvailable.length, 0);

  // team allows the four v0.7-shape conditionals.
  const teamAvailable = availableConditionalsForProfile('team');
  const teamNames = teamAvailable.map((c) => c.name);
  assert.ok(teamNames.includes('agentic-design'));
  assert.ok(teamNames.includes('agentic-subagent'));
  assert.ok(teamNames.includes('agentic-skill'));
  assert.ok(teamNames.includes('agentic-hooks'));
});

test('mature profile recommends agentic-hooks (rule === true)', () => {
  const matureRules = Object.fromEntries(
    availableConditionalsForProfile('mature').map((c) => [c.name, c.rule])
  );
  assert.equal(matureRules['agentic-hooks'], true);
});

test('init --profile poc installs only the poc universal set', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--profile', 'poc', '--yes']);
    for (const skill of PROFILES.poc.universal) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `expected ${skill} for poc profile`
      );
    }
    // agentic-bootstrap is NOT in poc.universal — must not install.
    assert.ok(!existsSync(join(dir, '.claude/skills/agentic-bootstrap')));
    // agentic-spec is NOT in poc.universal — must not install.
    assert.ok(!existsSync(join(dir, '.claude/skills/agentic-spec')));

    const state = loadState(dir, 'claude-code');
    assert.equal(state.profile, 'poc');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init without --profile defaults to team (preserves v0.7 install set)', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--yes']);
    for (const skill of PROFILES.team.universal) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `expected ${skill} for default profile`
      );
    }
    const state = loadState(dir, 'claude-code');
    assert.equal(state.profile, 'team');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --profile <bad> rejected', () => {
  const dir = mkScratch();
  try {
    assert.throws(() => runInit(dir, ['--agent', 'claude-code', '--profile', 'enterprise', '--yes']));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('legacy state file without profile field migrates to team default', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, STATE_DIRS['claude-code']), { recursive: true });
    writeFileSync(
      statePath(dir, 'claude-code'),
      JSON.stringify({
        schemaVersion: 1,
        kitVersion: '0.7.0-beta.1',
        agent: 'claude-code',
        skills: {},
      })
    );
    const state = loadState(dir, 'claude-code');
    assert.equal(state.profile, 'team');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('saveState includes profile field for new writes', () => {
  const dir = mkScratch();
  try {
    saveState(dir, 'claude-code', {
      schemaVersion: 1,
      kitVersion: '0.8.0-beta.1',
      agent: 'claude-code',
      profile: 'solo',
      skills: {},
    });
    const written = JSON.parse(readFileSync(statePath(dir, 'claude-code'), 'utf8'));
    assert.equal(written.profile, 'solo');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('agentic profile --help works', () => {
  execFileSync('node', [BIN, 'profile', '--help'], { encoding: 'utf8' });
});
