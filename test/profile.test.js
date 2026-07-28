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
  assert.ok(teamNames.includes('ad-design'));
  assert.ok(teamNames.includes('ad-subagent'));
  assert.ok(teamNames.includes('ad-skill'));
  assert.ok(teamNames.includes('ad-hooks'));
});

test('mature profile recommends ad-hooks (rule === true)', () => {
  const matureRules = Object.fromEntries(
    availableConditionalsForProfile('mature').map((c) => [c.name, c.rule])
  );
  assert.equal(matureRules['ad-hooks'], true);
});

test('ad-next is universal in every profile (navigation aid is broadly valuable)', () => {
  for (const name of PROFILE_NAMES) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-next'),
      `profile ${name} must include ad-next in its universal set per ADR-0015`
    );
  }
});

test('ad-spike is universal in every profile (technique uncertainty arises at every maturity)', () => {
  for (const name of PROFILE_NAMES) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-spike'),
      `profile ${name} must include ad-spike in its universal set per ADR-0017`
    );
  }
});

test('ad-tdg is universal in every profile (implementation-strategy uncertainty arises at every maturity)', () => {
  for (const name of PROFILE_NAMES) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-tdg'),
      `profile ${name} must include ad-tdg in its universal set per ADR-0018`
    );
  }
});

test('ad-domain is universal in every profile (Layer 2 ubiquitous language applies at every maturity per ADR-0019 §4)', () => {
  for (const name of PROFILE_NAMES) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-domain'),
      `profile ${name} must include ad-domain in its universal set per ADR-0019 §4`
    );
  }
});

test('ad-grill-me is universal in every profile (interview-before-research applies at every maturity per ADR-0022)', () => {
  for (const name of PROFILE_NAMES) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-grill-me'),
      `profile ${name} must include ad-grill-me in its universal set per ADR-0022`
    );
  }
});

test('ad-diagnose is universal in every profile (debugging discipline applies at every maturity per ADR-0021 §3)', () => {
  for (const name of PROFILE_NAMES) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-diagnose'),
      `profile ${name} must include ad-diagnose in its universal set per ADR-0021 §3`
    );
  }
});

test('ad-commit is universal in solo / team / mature only (not poc per ADR-0023)', () => {
  for (const name of ['solo', 'team', 'mature']) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-commit'),
      `profile ${name} must include ad-commit in its universal set per ADR-0023`
    );
  }
  const pocUniversal = new Set(PROFILES.poc.universal);
  assert.ok(
    !pocUniversal.has('ad-commit'),
    'profile poc must NOT include ad-commit — commit ceremony aligns with artifact-producing layer per ADR-0023'
  );
});

test('ad-pr is universal in solo / team / mature only (not poc per ADR-0024)', () => {
  for (const name of ['solo', 'team', 'mature']) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-pr'),
      `profile ${name} must include ad-pr in its universal set per ADR-0024`
    );
  }
  const pocUniversal = new Set(PROFILES.poc.universal);
  assert.ok(
    !pocUniversal.has('ad-pr'),
    'profile poc must NOT include ad-pr per ADR-0024'
  );
});

test('ad-merge is universal in solo / team / mature only (not poc per ADR-0025)', () => {
  for (const name of ['solo', 'team', 'mature']) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-merge'),
      `profile ${name} must include ad-merge in its universal set per ADR-0025`
    );
  }
  const pocUniversal = new Set(PROFILES.poc.universal);
  assert.ok(
    !pocUniversal.has('ad-merge'),
    'profile poc must NOT include ad-merge per ADR-0025'
  );
});

test('ad-deepen is universal in team and mature only (premature for poc and solo per ADR-0020 §4)', () => {
  // Present in team and mature.
  for (const name of ['team', 'mature']) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      universal.has('ad-deepen'),
      `profile ${name} must include ad-deepen in its universal set per ADR-0020 §4`
    );
  }
  // Absent from poc and solo — architectural deepening is premature for ≤200-line experiments.
  for (const name of ['poc', 'solo']) {
    const universal = new Set(PROFILES[name].universal);
    assert.ok(
      !universal.has('ad-deepen'),
      `profile ${name} must NOT include ad-deepen — premature for this maturity per ADR-0020 §4`
    );
  }
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
    // ad-bootstrap is NOT in poc.universal — must not install.
    assert.ok(!existsSync(join(dir, '.claude/skills/ad-bootstrap')));
    // ad-spec is NOT in poc.universal — must not install.
    assert.ok(!existsSync(join(dir, '.claude/skills/ad-spec')));
    // ad-deepen is NOT in poc.universal per ADR-0020 §4 — must not install.
    assert.ok(!existsSync(join(dir, '.claude/skills/ad-deepen')));
    // ad-commit / ad-pr / ad-merge are NOT in poc.universal per
    // ADR-0023 / ADR-0024 / ADR-0025 — must not install at poc.
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-commit')),
      'ad-commit must not install at poc profile per ADR-0023'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-pr')),
      'ad-pr must not install at poc profile per ADR-0024'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-merge')),
      'ad-merge must not install at poc profile per ADR-0025'
    );

    const state = loadState(dir, 'claude-code');
    assert.equal(state.profile, 'poc');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --profile solo does not install ad-deepen (premature for solo per ADR-0020 §4)', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--profile', 'solo', '--yes']);
    // solo gets the universal set per PROFILES.solo.universal — confirm
    // the inclusions install correctly.
    for (const skill of PROFILES.solo.universal) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `expected ${skill} for solo profile`
      );
    }
    // ad-deepen is NOT in solo.universal per ADR-0020 §4 — must not
    // install. Regression guard for the install-path level: the data-level
    // assertion in profiles.js could pass while a bug in skillsForAgent /
    // requiredSkillsForProfile lands deepen on disk anyway.
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-deepen')),
      'ad-deepen must not install at solo profile per ADR-0020 §4'
    );

    const state = loadState(dir, 'claude-code');
    assert.equal(state.profile, 'solo');
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

// C5 — profileFromStates must surface cross-agent disagreement even when
// the current `agentic update` invocation targets only one agent.
// Pre-fix the disagreement was silently masked because profileFromStates
// inspected only the narrowed slice; B2 routed the full statesByAgent.
test('agentic update --agent claude-code rejects when codex state has a different profile (B2 v0.11.3)', () => {
  const dir = mkScratch();
  try {
    // Init both agents at team profile.
    execFileSync('node', [BIN, 'init', '--agent', 'both', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Tamper with codex state to declare a different profile (poc),
    // simulating the user/team that ran `agentic profile set` for codex
    // only or hand-edited the file.
    const codexState = loadState(dir, 'codex');
    codexState.profile = 'poc';
    saveState(dir, 'codex', codexState);

    // Update --agent claude-code only must still detect the cross-agent
    // disagreement and fail loudly. Pre-fix it would silently update
    // claude-code under team profile while codex stayed at poc.
    let stderr = '';
    try {
      execFileSync(
        'node',
        [BIN, 'update', '--agent', 'claude-code', '--yes'],
        {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      assert.fail('agentic update should have rejected mismatched profiles');
    } catch (err) {
      stderr = err.stderr ?? '';
    }
    assert.match(
      stderr,
      /state files disagree on profile/,
      'cross-agent profile disagreement must surface even when --agent narrows'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// C6 — agentic profile set <name> end-to-end must capture the second
// positional and route through update so the install set matches the
// new profile. Pre-fix Commander silently dropped the positional and
// `opts.name` was undefined, producing the misleading error message
// the user saw when they followed the documented usage.
test('agentic profile <name> shorthand sets the profile end-to-end (C6 v0.11.3)', () => {
  const dir = mkScratch();
  try {
    // Init at team profile.
    execFileSync('node', [BIN, 'init', '--agent', 'claude-code', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(loadState(dir, 'claude-code').profile, 'team');

    // Set to poc via the shorthand `agentic profile <name>` form.
    execFileSync('node', [BIN, 'profile', 'poc', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // State file must record the new profile.
    assert.equal(loadState(dir, 'claude-code').profile, 'poc');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('agentic profile set <name> two-positional form sets the profile end-to-end (C1 v0.11.3)', () => {
  const dir = mkScratch();
  try {
    execFileSync('node', [BIN, 'init', '--agent', 'claude-code', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(loadState(dir, 'claude-code').profile, 'team');

    // The form documented in the error message: `agentic profile set <name>`.
    // Pre-fix Commander dropped the second positional and the form failed.
    execFileSync('node', [BIN, 'profile', 'set', 'solo', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(loadState(dir, 'claude-code').profile, 'solo');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
