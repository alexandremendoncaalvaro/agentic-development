import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'agentic.js');

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-init-test-'));
}

function runInit(cwd, args = []) {
  return execFileSync('node', [BIN, 'init', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('init --agent claude-code on greenfield → installs Claude skill', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')));
    assert.ok(!existsSync(join(dir, '.agents')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent codex on brownfield → installs Codex skill + openai.yaml', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    runInit(dir, ['--agent', 'codex']);
    assert.ok(existsSync(join(dir, '.agents/skills/ad-bootstrap/SKILL.md')));
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-bootstrap/agents/openai.yaml'))
    );
    assert.ok(!existsSync(join(dir, '.claude')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent both → installs into both .claude and .agents', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'both']);
    assert.ok(existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')));
    assert.ok(existsSync(join(dir, '.agents/skills/ad-bootstrap/SKILL.md')));
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-bootstrap/agents/openai.yaml'))
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const UNIVERSAL_SKILLS = [
  'ad-bootstrap',
  'ad-philosophy',
  'ad-architecture',
  'ad-adr',
  'ad-spec',
  'ad-task',
  'ad-drift',
  'ad-review',
  'ad-rules',
  'ad-ground',
  'ad-next',
  'ad-spike',
  'ad-tdg',
  'ad-domain',
  'ad-grill-me',
  'ad-deepen',
  'ad-diagnose',
  'ad-commit',
  'ad-pr',
  'ad-merge',
  'ad-handoff',
];

test('init --agent both → installs the full universal skill set for both agents', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'both']);
    for (const skill of UNIVERSAL_SKILLS) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `Claude SKILL.md missing for ${skill}`
      );
      assert.ok(
        existsSync(join(dir, `.agents/skills/${skill}/SKILL.md`)),
        `Codex SKILL.md missing for ${skill}`
      );
      assert.ok(
        existsSync(join(dir, `.agents/skills/${skill}/agents/openai.yaml`)),
        `Codex openai.yaml missing for ${skill}`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code → installs every universal skill (Claude only)', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    for (const skill of UNIVERSAL_SKILLS) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `Claude SKILL.md missing for ${skill}`
      );
    }
    assert.ok(!existsSync(join(dir, '.agents')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code → installs the ad-review subagent at .claude/agents/', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      existsSync(join(dir, '.claude/agents/fresh-context-reviewer.md')),
      'fresh-context-reviewer subagent must land at .claude/agents/'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-review/agents')),
      'subagent must not duplicate inside the skill dir'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: re-running on installed project is idempotent', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const before = readFileSync(
      join(dir, '.claude/skills/ad-bootstrap/SKILL.md')
    );
    runInit(dir, ['--agent', 'claude-code']);
    const after = readFileSync(
      join(dir, '.claude/skills/ad-bootstrap/SKILL.md')
    );
    assert.ok(before.equals(after), 'SKILL.md must be byte-identical after re-run');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code on greenfield → installs ad-subagent; no ad-design (no frontend); no ad-skill (opt-in only)', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-subagent/SKILL.md')),
      'ad-subagent must auto-install for Claude Code'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-design')),
      'ad-design must NOT install without frontend signal'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-skill')),
      'ad-skill must NOT auto-install (opt-in only)'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent codex on greenfield → installs ad-subagent; no ad-design, no ad-skill', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'codex']);
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-subagent/SKILL.md')),
      'ad-subagent must auto-install for Codex'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-subagent/agents/openai.yaml')),
      'ad-subagent Codex openai.yaml must land'
    );
    assert.ok(
      !existsSync(join(dir, '.agents/skills/ad-design')),
      'ad-design must NOT install without frontend signal'
    );
    assert.ok(
      !existsSync(join(dir, '.agents/skills/ad-skill')),
      'ad-skill must NOT auto-install (opt-in only)'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent both on a frontend project → installs ad-design and ad-subagent for both agents', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'fe', dependencies: { react: '^18' } })
    );
    runInit(dir, ['--agent', 'both']);
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-design/SKILL.md')),
      'ad-design must auto-install for Claude when frontend detected'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-design/SKILL.md')),
      'ad-design must auto-install for Codex when frontend detected'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-design/agents/openai.yaml')),
      'ad-design Codex openai.yaml must land'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-subagent/SKILL.md')),
      'ad-subagent must auto-install for Claude'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-subagent/SKILL.md')),
      'ad-subagent must auto-install for Codex'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-subagent/agents/openai.yaml')),
      'ad-subagent Codex openai.yaml must land'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code on a backend project → no ad-design (no frontend signal), still installs ad-subagent', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'api', dependencies: { express: '^4' } })
    );
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-design')),
      'ad-design must NOT install for backend project'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-subagent/SKILL.md')),
      'ad-subagent must still install for Claude'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: invalid --agent value rejected', () => {
  const dir = mkScratch();
  try {
    assert.throws(() => runInit(dir, ['--agent', 'gemini']));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A scratch directory that is a real git repository, so the installer's
// tracked-path probe (ADR-0049) has something to resolve against.
function mkGitScratch() {
  const dir = mkScratch();
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  return { dir, git };
}

test('init -y leaves a git-tracked root doc unmodified (ADR-0049)', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n\nTeam-owned guide.\n');
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'team baseline');
    const before = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    runInit(dir, ['--agent', 'claude-code', '-y']);

    assert.equal(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      before,
      'a git-tracked root doc must not be rewritten by a non-interactive install'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init -y --force-root-doc writes into a tracked root doc (ADR-0049)', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n\nTeam-owned guide.\n');
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'team baseline');

    runInit(dir, ['--agent', 'claude-code', '-y', '--force-root-doc']);

    assert.match(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      /agentic-managed-skills:start/,
      'the override must reach the tracked root doc the refusal skips'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The tracked check must not degrade into "refuse inside any repository".
// Untracked and unknown are distinct states from tracked, and both still
// authorise the append; only the other tests' non-repo scratch dirs cover
// `unknown`, so this pins `untracked` inside a real repository.
test('init -y still appends to an untracked root doc inside a git repo', () => {
  const { dir } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');

    runInit(dir, ['--agent', 'claude-code', '-y']);

    assert.match(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      /agentic-managed-skills:start/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
