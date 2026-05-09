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
    assert.ok(existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')));
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
    assert.ok(existsSync(join(dir, '.agents/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(
      existsSync(join(dir, '.agents/skills/agentic-bootstrap/agents/openai.yaml'))
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
    assert.ok(existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(existsSync(join(dir, '.agents/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(
      existsSync(join(dir, '.agents/skills/agentic-bootstrap/agents/openai.yaml'))
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const UNIVERSAL_SKILLS = [
  'agentic-bootstrap',
  'agentic-philosophy',
  'agentic-architecture',
  'agentic-adr',
  'agentic-spec',
  'agentic-task',
  'agentic-audit',
  'agentic-review',
  'agentic-ground',
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

test('init --agent claude-code → installs the agentic-review subagent at .claude/agents/', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      existsSync(join(dir, '.claude/agents/fresh-context-reviewer.md')),
      'fresh-context-reviewer subagent must land at .claude/agents/'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-review/agents')),
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
      join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')
    );
    runInit(dir, ['--agent', 'claude-code']);
    const after = readFileSync(
      join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')
    );
    assert.ok(before.equals(after), 'SKILL.md must be byte-identical after re-run');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code on greenfield → installs agentic-subagent (Claude only); no agentic-design (no frontend); no agentic-skill (opt-in only)', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      existsSync(join(dir, '.claude/skills/agentic-subagent/SKILL.md')),
      'agentic-subagent must auto-install for Claude Code'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-design')),
      'agentic-design must NOT install without frontend signal'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-skill')),
      'agentic-skill must NOT auto-install (opt-in only)'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent codex on greenfield → no agentic-subagent (Claude-only source), no agentic-design, no agentic-skill', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'codex']);
    assert.ok(
      !existsSync(join(dir, '.agents/skills/agentic-subagent')),
      'agentic-subagent must NOT install for Codex (no source)'
    );
    assert.ok(
      !existsSync(join(dir, '.agents/skills/agentic-design')),
      'agentic-design must NOT install without frontend signal'
    );
    assert.ok(
      !existsSync(join(dir, '.agents/skills/agentic-skill')),
      'agentic-skill must NOT auto-install (opt-in only)'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent both on a frontend project → installs agentic-design for both agents; agentic-subagent for Claude only', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'fe', dependencies: { react: '^18' } })
    );
    runInit(dir, ['--agent', 'both']);
    assert.ok(
      existsSync(join(dir, '.claude/skills/agentic-design/SKILL.md')),
      'agentic-design must auto-install for Claude when frontend detected'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/agentic-design/SKILL.md')),
      'agentic-design must auto-install for Codex when frontend detected'
    );
    assert.ok(
      existsSync(join(dir, '.agents/skills/agentic-design/agents/openai.yaml')),
      'agentic-design Codex openai.yaml must land'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/agentic-subagent/SKILL.md')),
      'agentic-subagent must auto-install for Claude'
    );
    assert.ok(
      !existsSync(join(dir, '.agents/skills/agentic-subagent')),
      'agentic-subagent must NOT install for Codex'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code on a backend project → no agentic-design (no frontend signal), still installs agentic-subagent', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'api', dependencies: { express: '^4' } })
    );
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-design')),
      'agentic-design must NOT install for backend project'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/agentic-subagent/SKILL.md')),
      'agentic-subagent must still install for Claude'
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
