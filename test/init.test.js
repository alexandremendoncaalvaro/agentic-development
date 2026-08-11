import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
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

// The kit's Layer 1 Constitution splits ownership: `AGENTS.md` and
// `GUIDELINES.md` are project-owned, `WORKFLOW.md` is kit-shipped. Installed
// skills cite it by section (`WORKFLOW §10`, `WORKFLOW.md §1`), and the
// installer's own completion hints print those section numbers — so a target
// without the file leaves every one of those references pointing at nothing.
// `WORKFLOW-FLOWS.md` ships with it because `WORKFLOW.md` references it in its
// own opening; installing one without the other recreates the same defect one
// level down.
const KIT_DOCS = ['WORKFLOW.md', 'WORKFLOW-FLOWS.md'];

test('init installs the kit-shipped constitution the skills cite by section', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    for (const doc of KIT_DOCS) {
      const target = join(dir, doc);
      assert.ok(
        existsSync(target),
        `${doc} must land at the target root — installed skills cite it by section`
      );
      assert.equal(
        readFileSync(target, 'utf8'),
        readFileSync(join(__dirname, '..', doc), 'utf8'),
        `${doc} at the target root must match the kit copy — it is kit-shipped, not project-owned`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

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

test('regression: bare non-interactive init on greenfield installs both hosts', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--yes']);
    assert.ok(existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')));
    assert.ok(existsSync(join(dir, '.agents/skills/ad-bootstrap/SKILL.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regression: bare non-interactive init in a Claude project installs Codex', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, '.claude'));
    runInit(dir, ['--yes']);
    assert.ok(existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')));
    assert.ok(existsSync(join(dir, '.agents/skills/ad-bootstrap/SKILL.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const INSTALLED_SKILLS = [
  'ad-adr',
  'ad-architecture',
  'ad-archive',
  'ad-audit',
  'ad-bootstrap',
  'ad-commit',
  'ad-deepen',
  'ad-derisk',
  'ad-design',
  'ad-diagnose',
  'ad-domain',
  'ad-drift',
  'ad-grill-me',
  'ad-ground',
  'ad-guidelines',
  'ad-handoff',
  'ad-hooks',
  'ad-level-up',
  'ad-merge',
  'ad-next',
  'ad-philosophy',
  'ad-pr',
  'ad-prd',
  'ad-question-me',
  'ad-release',
  'ad-research',
  'ad-review',
  'ad-roadmap',
  'ad-rules',
  'ad-skill',
  'ad-spec',
  'ad-spike',
  'ad-subagent',
  'ad-task',
  'ad-tdd',
  'ad-tdg',
];

test('init --agent both installs every bundled skill for both agents', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'both']);
    for (const skill of INSTALLED_SKILLS) {
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

test('init --agent claude-code installs every bundled skill for Claude only', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    for (const skill of INSTALLED_SKILLS) {
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

test('init --agent claude-code on greenfield installs formerly conditional skills', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-subagent/SKILL.md')),
      'ad-subagent must install for Claude Code'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-design/SKILL.md')),
      'ad-design must install without a frontend signal'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-skill/SKILL.md')),
      'ad-skill must install without opt-in'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent codex on greenfield installs formerly conditional skills', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'codex']);
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-subagent/SKILL.md')),
      'ad-subagent must install for Codex'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-subagent/agents/openai.yaml')),
      'ad-subagent Codex openai.yaml must land'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-design/SKILL.md')),
      'ad-design must install without a frontend signal'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-skill/SKILL.md')),
      'ad-skill must install without opt-in'
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

test('init --agent claude-code on a backend project still installs ad-design', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'api', dependencies: { express: '^4' } })
    );
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-design/SKILL.md')),
      'ad-design must install for a backend project'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-subagent/SKILL.md')),
      'ad-subagent must install for Claude'
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
// tracked-path probe (ADR-0051) has something to resolve against.
function mkGitScratch() {
  const dir = mkScratch();
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  return { dir, git };
}

test('init -y leaves a git-tracked root doc unmodified (ADR-0051)', () => {
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

// The append path is not the only unattended write: a root doc that already
// carries a stale managed section takes the *replace* path instead, and
// init.js never passed confirmReplace at all, so the library default (replace)
// applied. Same hazard, different branch.
test('init -y leaves a stale managed section in a tracked root doc alone', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# AGENTS.md\n\n<!-- agentic-managed-skills:start -->\n\n' +
        '## Skills installed by `agentic`\n\nstale table\n\n' +
        '<!-- agentic-managed-skills:end -->\n'
    );
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'team baseline with a stale managed section');
    const before = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    runInit(dir, ['--agent', 'claude-code', '-y']);

    assert.equal(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      before,
      'a tracked root doc must not be rewritten unattended on the replace path either'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init -y --force-root-doc writes into a tracked root doc (ADR-0051)', () => {
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

test('init -y --force-root-doc regenerates a stale section in a tracked root doc', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# AGENTS.md\n\n<!-- agentic-managed-skills:start -->\n\n' +
        '## Skills installed by `agentic`\n\nstale table\n\n' +
        '<!-- agentic-managed-skills:end -->\n'
    );
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'tracked, stale managed section');

    runInit(dir, ['--agent', 'claude-code', '-y', '--force-root-doc']);

    const body = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(body, /stale table/, 'the override must reach the replace path too');
    assert.match(body, /ad-bootstrap/);
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
