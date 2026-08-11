import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { detectAgents, detectMode } from '../src/lib/detect.js';
import { installSkills } from '../src/lib/install.js';
import {
  updateRootDoc,
  rootDocAppendPrompt,
  rootDocReplacePrompt,
} from '../src/lib/rootdoc.js';
import {
  trackedState,
  writeExcludeEntries,
  installedPathsToExclude,
} from '../src/lib/git.js';
import {
  offerKitExclude,
  kitExcludeCandidates,
} from '../src/commands/kit-exclude.js';
import { userLevelInstallPath } from '../src/lib/state.js';

function mkGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-git-test-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  return dir;
}

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-test-'));
}

// A skill installs more than its SKILL.md — references/ and scripts/ ship
// alongside it since ADR-0056/0057 — so `actions` holds one entry per file and
// its order follows the directory walk. Asserting on `actions[0]` silently
// bound the assertion to that order and read whichever file happened to come
// first; look the action up by the path under test instead.
function actionFor(actions, path) {
  const match = actions.find((action) => action.path.split('\\').join('/') === path);
  assert.ok(
    match,
    `no action for ${path}; got ${actions.map((a) => a.path).join(', ')}`
  );
  return match;
}

// Per task-0029, updateRootDoc reads the table cell from each installed
// SKILL.md's `summary:` frontmatter field at section-build time. Tests
// that exercise the rendered table need at minimum a SKILL.md per skill
// they reference; this helper writes the smallest valid one.
//
// `agent` defaults to claude-code; pass 'codex' to exercise the .agents
// path that readSkillSummary walks as the second iteration of its loop.
function seedInstalledSkill(
  cwd,
  skill,
  { summary = `Test fixture for ${skill}.`, agent = 'claude-code' } = {}
) {
  const skillsDir = agent === 'codex' ? '.agents/skills' : '.claude/skills';
  const dir = join(cwd, skillsDir, skill);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${skill}\ndescription: Test fixture.\nsummary: ${summary}\n---\n`
  );
}

test('detectMode: empty directory → greenfield', () => {
  const dir = mkScratch();
  try {
    assert.equal(detectMode(dir), 'greenfield');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMode: only trivial files → greenfield', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    writeFileSync(join(dir, 'README.md'), '# x\n');
    writeFileSync(join(dir, 'LICENSE'), 'MIT\n');
    assert.equal(detectMode(dir), 'greenfield');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMode: meaningful file present → brownfield', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    assert.equal(detectMode(dir), 'brownfield');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMode: AGENTS.md present → audit', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    writeFileSync(join(dir, 'package.json'), '{}\n');
    assert.equal(detectMode(dir), 'audit');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectAgents: empty → []', () => {
  const dir = mkScratch();
  try {
    assert.deepEqual(detectAgents(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectAgents: .claude/ present → ["claude-code"]', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, '.claude'));
    assert.deepEqual(detectAgents(dir), ['claude-code']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectAgents: .claude/ + .agents/ → ["claude-code","codex"] (deterministic order)', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, '.agents'));
    mkdirSync(join(dir, '.claude'));
    assert.deepEqual(detectAgents(dir), ['claude-code', 'codex']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: claude-code ad-skill → file at .claude/skills/...', async () => {
  // ad-skill is the minimal-install fixture: lean, single-file on Claude, and
  // untouched by the references/ progressive-disclosure rollout (ADR-0056), so
  // this stays a genuine one-file assertion.
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-skill'],
    });
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, 'created');
    assert.equal(actions[0].path, '.claude/skills/ad-skill/SKILL.md');
    assert.ok(existsSync(join(dir, '.claude/skills/ad-skill/SKILL.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: codex ad-skill → SKILL.md + agents/openai.yaml', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['codex'],
      skills: ['ad-skill'],
    });
    const paths = actions.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      '.agents/skills/ad-skill/SKILL.md',
      '.agents/skills/ad-skill/agents/openai.yaml',
    ]);
    for (const action of actions) assert.equal(action.type, 'created');
    assert.ok(existsSync(join(dir, '.agents/skills/ad-skill/agents/openai.yaml')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: idempotent re-run → unchanged for every file', async () => {
  const dir = mkScratch();
  try {
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
    });
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
    });
    for (const action of actions) assert.equal(action.type, 'unchanged');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: divergent target + confirmReplace=false → skipped, file untouched', async () => {
  const dir = mkScratch();
  try {
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    mkdirSync(join(dir, '.claude/skills/ad-bootstrap'), { recursive: true });
    writeFileSync(target, 'CUSTOM CONTENT\n');

    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
    });

    assert.equal(actionFor(actions, '.claude/skills/ad-bootstrap/SKILL.md').type, 'skipped');
    assert.equal(readFileSync(target, 'utf8'), 'CUSTOM CONTENT\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: divergent target + confirmReplace=true → replaced', async () => {
  const dir = mkScratch();
  try {
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    mkdirSync(join(dir, '.claude/skills/ad-bootstrap'), { recursive: true });
    writeFileSync(target, 'CUSTOM CONTENT\n');

    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      confirmReplace: async () => true,
    });

    assert.equal(actionFor(actions, '.claude/skills/ad-bootstrap/SKILL.md').type, 'replaced');
    assert.notEqual(readFileSync(target, 'utf8'), 'CUSTOM CONTENT\n');
    assert.match(readFileSync(target, 'utf8'), /ad-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: unknown agent throws', async () => {
  const dir = mkScratch();
  try {
    await assert.rejects(
      () =>
        installSkills({
          cwd: dir,
          agents: ['gemini'],
          skills: ['ad-bootstrap'],
        }),
      /unknown agent/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: claude-code ad-review → SKILL.md + subagent at .claude/agents/, no manifest.json copied', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-review'],
    });
    const paths = actions.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      '.claude/agents/fresh-context-reviewer.md',
      '.claude/skills/ad-review/SKILL.md',
    ]);
    assert.ok(existsSync(join(dir, '.claude/agents/fresh-context-reviewer.md')));
    assert.ok(existsSync(join(dir, '.claude/skills/ad-review/SKILL.md')));
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-review/manifest.json')),
      'manifest.json must never be installed'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-review/agents')),
      'subagent must not duplicate inside the skill dir'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: codex ad-review → SKILL.md + openai.yaml + bundled subagent', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['codex'],
      skills: ['ad-review'],
    });
    const paths = actions.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      '.agents/skills/ad-review/SKILL.md',
      '.agents/skills/ad-review/agents/openai.yaml',
      '.agents/skills/ad-review/references/codex-escalation.md',
      '.codex/agents/fresh-context-reviewer.toml',
    ]);
    assert.ok(existsSync(join(dir, '.codex/agents/fresh-context-reviewer.toml')));
    assert.ok(!existsSync(join(dir, '.claude')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: no AGENTS.md or CLAUDE.md → action absent, nothing written', async () => {
  const dir = mkScratch();
  try {
    const action = await updateRootDoc({ cwd: dir, skills: ['ad-bootstrap'] });
    assert.equal(action.type, 'absent');
    assert.equal(action.path, null);
    assert.ok(!existsSync(join(dir, 'AGENTS.md')));
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: existing AGENTS.md, no managed section, confirm true → appended; user content preserved', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-philosophy');
    const original = '# AGENTS.md\n\nMy guide.\n';
    writeFileSync(join(dir, 'AGENTS.md'), original);
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-philosophy'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'appended');
    assert.equal(action.path, 'AGENTS.md');
    const updated = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(updated.startsWith(original), 'user content must be preserved at the start');
    assert.match(updated, /<!-- agentic-managed-skills:start -->/);
    assert.match(updated, /<!-- agentic-managed-skills:end -->/);
    assert.match(updated, /ad-bootstrap/);
    assert.match(updated, /ad-philosophy/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: confirm false → skipped, file untouched', async () => {
  const dir = mkScratch();
  try {
    const original = '# AGENTS.md\n\nMy guide.\n';
    writeFileSync(join(dir, 'AGENTS.md'), original);
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => false,
    });
    assert.equal(action.type, 'skipped');
    assert.equal(action.path, 'AGENTS.md');
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: existing managed section + same skills → unchanged', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    const before = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'unchanged');
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: existing managed section + different skill set → updated, user content preserved', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-architecture');
    const userContent = '# AGENTS.md\n\nUser notes here.\n';
    writeFileSync(join(dir, 'AGENTS.md'), userContent);
    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-architecture'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'updated');
    const updated = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(updated.startsWith(userContent), 'user content must be preserved');
    assert.match(updated, /ad-architecture/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: only CLAUDE.md present → falls back to CLAUDE.md', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    writeFileSync(join(dir, 'CLAUDE.md'), '# CLAUDE.md\n');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'appended');
    assert.equal(action.path, 'CLAUDE.md');
    assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /ad-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: AGENTS.md preferred when both AGENTS.md and CLAUDE.md exist', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    writeFileSync(join(dir, 'CLAUDE.md'), '# CLAUDE.md\n');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.path, 'AGENTS.md');
    assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /ad-bootstrap/);
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '# CLAUDE.md\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: marker strings inside a fenced code block are NOT treated as the managed section', async () => {
  // Real risk: a user who pastes the kit's README into AGENTS.md to document
  // it for their team would have the literal marker strings in their content.
  // The parser must require markers on their own line at column 0.
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    const userBody = [
      '# AGENTS.md',
      '',
      'Here is how the agentic kit marks its managed section, for reference:',
      '',
      '```',
      '<!-- agentic-managed-skills:start -->',
      '... table of skills ...',
      '<!-- agentic-managed-skills:end -->',
      '```',
      '',
      'My actual rules below.',
      '',
    ].join('\n');
    writeFileSync(join(dir, 'AGENTS.md'), userBody);
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    // Markers inside the fenced block do NOT match (they're indented inside ```).
    // Behavior: parser sees no section, asks confirmAppend, appends at EOF.
    assert.equal(action.type, 'appended');
    const after = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(after.startsWith(userBody), 'user content (incl. fenced markers) must be preserved');
    // The user's literal marker text inside the fence is intact:
    assert.match(after, /```\n<!-- agentic-managed-skills:start -->\n\.\.\. table of skills \.\.\.\n<!-- agentic-managed-skills:end -->\n```/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: malformed markers (start without end) → treated as no section, prompts to append', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# AGENTS.md\n\n<!-- agentic-managed-skills:start -->\nbroken — no end marker\n'
    );
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => false,
    });
    // No matching end → parser returns null → append path → confirmAppend false → skipped.
    assert.equal(action.type, 'skipped');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Per task-0029, the table cell text now lives in each source SKILL.md's
// `summary:` frontmatter field, read by rootdoc.js at section-build time.
// The equivalent static-coverage assertion (every kit skill carries
// `summary:`) lives in test/skills.test.js alongside the other frontmatter
// invariants.

// Per ADR-0044, ad-philosophy has two modes: it auto-loads as posture AND
// takes an explicit `/ad-philosophy` that triggers the recommitment protocol.
// The table advertised only the implicit surface before that decision, which
// would now hide the very gesture the mode exists to serve.
test('updateRootDoc: ad-philosophy advertises both the slash command and the implicit load', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-philosophy');
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-philosophy'],
      confirmAppend: async () => true,
    });
    const updated = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    const row = updated
      .split('\n')
      .find((line) => line.startsWith('| `ad-philosophy` |'));
    assert.ok(row, 'ad-philosophy row must exist in the managed table');
    assert.match(row, /`\/ad-philosophy`/, 'slash command must be advertised');
    assert.match(row, /implicit/, 'implicit auto-load must still be signalled');
    const otherRow = updated
      .split('\n')
      .find((line) => line.startsWith('| `ad-bootstrap` |'));
    assert.doesNotMatch(
      otherRow,
      /implicit/,
      'the dual-surface note is specific to ad-philosophy'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: confirmAppend defaults to false (non-interactive safe)', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    const action = await updateRootDoc({ cwd: dir, skills: ['ad-bootstrap'] });
    assert.equal(action.type, 'skipped');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: missing skill source throws', async () => {
  const dir = mkScratch();
  try {
    await assert.rejects(
      () =>
        installSkills({
          cwd: dir,
          agents: ['claude-code'],
          skills: ['does-not-exist'],
        }),
      /skill "does-not-exist" not found/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The interactive confirmation is the one ADR-0051 surface a TTY-less suite
// cannot drive, so the decision it encodes lives in a pure function and is
// asserted here rather than exercised through the TUI.
test('rootDocAppendPrompt: a tracked root doc names the sharing risk and defaults to no', () => {
  const { message, initialValue } = rootDocAppendPrompt('AGENTS.md', 'tracked');
  assert.equal(initialValue, false, 'a shared file must not be pre-answered yes');
  assert.match(message, /tracked by git/);
  assert.match(message, /everyone who shares the repository/);
  assert.match(message, /AGENTS\.md/);
});

test('rootDocAppendPrompt: an untracked root doc keeps the prior wording and yes default', () => {
  const { message, initialValue } = rootDocAppendPrompt('AGENTS.md', 'untracked');
  assert.equal(initialValue, true);
  assert.match(message, /existing content preserved/);
  assert.doesNotMatch(message, /tracked by git/);
});

test('rootDocAppendPrompt: unknown tracking state is treated as not shared', () => {
  const unknown = rootDocAppendPrompt('CLAUDE.md', 'unknown');
  const untracked = rootDocAppendPrompt('CLAUDE.md', 'untracked');
  assert.deepEqual(
    unknown,
    untracked,
    'no evidence of sharing must not become a warning the user cannot act on'
  );
});

test('rootDocReplacePrompt: names the sharing risk and the lost-edits risk, defaults to no', () => {
  const { message, initialValue } = rootDocReplacePrompt('AGENTS.md');
  assert.equal(initialValue, false, 'regenerating a shared, edited section must not be pre-answered yes');
  assert.match(message, /tracked by git/);
  assert.match(message, /everyone who clones the repo/);
  assert.match(message, /lost/);
  assert.match(message, /AGENTS\.md/);
});

test('writeExcludeEntries: adds anchored, by-filename entries to .git/info/exclude', () => {
  const dir = mkGitRepo();
  try {
    const res = writeExcludeEntries(dir, [
      '.claude/skills/ad-audit/SKILL.md',
      '.claude/agents/fresh-context-reviewer.md',
    ]);
    assert.deepEqual(res.added, [
      '/.claude/skills/ad-audit/SKILL.md',
      '/.claude/agents/fresh-context-reviewer.md',
    ]);
    const body = readFileSync(join(dir, '.git/info/exclude'), 'utf8');
    // Anchored with a leading slash (this exact path, not a same-named file
    // elsewhere) and never a bare directory.
    assert.match(body, /^\/\.claude\/skills\/ad-audit\/SKILL\.md$/m);
    assert.match(body, /^\/\.claude\/agents\/fresh-context-reviewer\.md$/m);
    assert.doesNotMatch(body, /^\/?\.claude\/agents\/?$/m, 'never a directory entry');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeExcludeEntries: idempotent — a second run adds nothing already present', () => {
  const dir = mkGitRepo();
  try {
    writeExcludeEntries(dir, ['.claude/skills/ad-audit/SKILL.md']);
    const first = readFileSync(join(dir, '.git/info/exclude'), 'utf8');
    const res = writeExcludeEntries(dir, [
      '.claude/skills/ad-audit/SKILL.md',
      '.claude/skills/ad-review/SKILL.md',
    ]);
    assert.deepEqual(res.added, ['/.claude/skills/ad-review/SKILL.md']);
    const second = readFileSync(join(dir, '.git/info/exclude'), 'utf8');
    // The already-present entry appears exactly once.
    assert.equal(
      (second.match(/\/\.claude\/skills\/ad-audit\/SKILL\.md/g) || []).length,
      1
    );
    assert.ok(second.startsWith(first), 'existing content preserved verbatim');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installedPathsToExclude: drops a tracked file in a mixed-ownership dir, keeps untracked kit files', () => {
  const dir = mkGitRepo();
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  try {
    // A team-authored subagent, tracked, in the same directory the kit uses.
    mkdirSync(join(dir, '.claude/agents'), { recursive: true });
    writeFileSync(join(dir, '.claude/agents/team-owned.md'), 'team\n');
    git('add', '.claude/agents/team-owned.md');
    git('commit', '-qm', 'team subagent');
    // Kit files freshly written, untracked.
    writeFileSync(join(dir, '.claude/agents/fresh-context-reviewer.md'), 'kit\n');
    mkdirSync(join(dir, '.claude/skills/ad-audit'), { recursive: true });
    writeFileSync(join(dir, '.claude/skills/ad-audit/SKILL.md'), 'kit\n');

    const result = installedPathsToExclude(dir, [
      '.claude/agents/team-owned.md',
      '.claude/agents/fresh-context-reviewer.md',
      '.claude/skills/ad-audit/SKILL.md',
    ]);

    assert.deepEqual(result.sort(), [
      '.claude/agents/fresh-context-reviewer.md',
      '.claude/skills/ad-audit/SKILL.md',
    ]);
    assert.ok(
      !result.includes('.claude/agents/team-owned.md'),
      'a tracked team file must never be excluded from git'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('userLevelInstallPath: finds a user-level state file, null when absent', () => {
  const home = mkdtempSync(join(tmpdir(), 'agentic-home-'));
  try {
    assert.equal(userLevelInstallPath(home), null);
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(join(home, '.claude/agentic-state.json'), '{}');
    assert.equal(
      userLevelInstallPath(home),
      join(home, '.claude/agentic-state.json')
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('kitExcludeCandidates: sweeps the agent surface but never root kit-docs (ADR-0051 scope)', () => {
  const dir = mkGitRepo();
  try {
    // Root kit-docs installKitDocs writes (ADR-0049 D6) — untracked, but NOT
    // the exclude offer's business: the team may commit and diverge from them.
    writeFileSync(join(dir, 'WORKFLOW.md'), 'kit\n');
    writeFileSync(join(dir, 'WORKFLOW-FLOWS.md'), 'kit\n');
    // Agent-surface files — these ARE the exclude offer's business.
    mkdirSync(join(dir, '.claude/skills/ad-audit'), { recursive: true });
    writeFileSync(join(dir, '.claude/skills/ad-audit/SKILL.md'), 'kit\n');
    mkdirSync(join(dir, '.agents/skills/ad-audit'), { recursive: true });
    writeFileSync(join(dir, '.agents/skills/ad-audit/SKILL.md'), 'kit\n');

    const candidates = kitExcludeCandidates(dir, [
      'WORKFLOW.md',
      'WORKFLOW-FLOWS.md',
      '.claude/skills/ad-audit/SKILL.md',
      '.agents/skills/ad-audit/SKILL.md',
    ]);

    assert.deepEqual(candidates.sort(), [
      '.agents/skills/ad-audit/SKILL.md',
      '.claude/skills/ad-audit/SKILL.md',
    ]);
    assert.ok(
      !candidates.includes('WORKFLOW.md') && !candidates.includes('WORKFLOW-FLOWS.md'),
      'root kit-docs must not be offered for exclusion — the kit commits them'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('offerKitExclude: non-interactive declines and writes nothing (refuse-to-guess default)', async () => {
  const dir = mkGitRepo();
  try {
    mkdirSync(join(dir, '.claude/skills/ad-audit'), { recursive: true });
    writeFileSync(join(dir, '.claude/skills/ad-audit/SKILL.md'), 'kit\n');

    const added = await offerKitExclude({
      cwd: dir,
      paths: ['.claude/skills/ad-audit/SKILL.md'],
      interactive: false,
    });

    assert.equal(added, 0);
    assert.ok(
      !existsSync(join(dir, '.git/info/exclude')) ||
        !readFileSync(join(dir, '.git/info/exclude'), 'utf8').includes('ad-audit'),
      'a non-interactive run must not silently modify .git/info/exclude'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeExcludeEntries: fail-open outside a git repository — writes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nogit-'));
  try {
    const res = writeExcludeEntries(dir, ['.claude/skills/ad-audit/SKILL.md']);
    assert.equal(res.skipped, 'not-a-repo');
    assert.deepEqual(res.added, []);
    assert.ok(!existsSync(join(dir, '.git')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
