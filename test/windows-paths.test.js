import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep as PATH_SEP } from 'node:path';
import { installSkills } from '../src/lib/install.js';

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-windows-paths-test-'));
}

// The ad-review skill carries a manifest.json declaring the
// fresh-context-reviewer subagent at `agents/fresh-context-reviewer.md`.
// On Windows, `path.join('agents', 'fresh-context-reviewer.md')` produces
// `agents\\fresh-context-reviewer.md`. Manifest comparisons compare strings,
// so without normalization the manifest validation fails on Windows with
// "manifest declares subagent X but no such file exists in the skill source"
// even though the file does exist on disk.
//
// The fix: walkSkill normalizes `rel` to forward-slash form before returning.
// This test ensures the install completes successfully and that the resulting
// state file records the canonical forward-slash path on every platform.

test('installSkills: ad-review manifest validates on every platform (forward-slash internal paths)', async () => {
  const dir = mkScratch();
  try {
    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-review'],
      kitVersion: '0.9.3-test',
    });

    // Subagent file lands at the .claude/agents/ surface, the SKILL.md at
    // the standard skill path. Both must succeed without the manifest
    // validation throwing.
    assert.ok(
      existsSync(join(dir, '.claude/agents/fresh-context-reviewer.md')),
      'fresh-context-reviewer subagent must install at .claude/agents/'
    );
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-review/SKILL.md')),
      'ad-review SKILL.md must install at .claude/skills/ad-review/'
    );

    // Returned action paths and the state-file path entries must be
    // forward-slash regardless of the platform running the test, so a
    // state file written on Windows is byte-comparable to one written on
    // macOS / Linux for the same install.
    const reviewSkill = result.nextStates['claude-code'].skills['ad-review'];
    for (const f of reviewSkill.files) {
      assert.ok(
        !f.path.includes('\\'),
        `state path must use forward-slash, got: ${f.path}`
      );
    }
    for (const a of result.actions) {
      assert.ok(
        !a.path.includes('\\'),
        `action path must use forward-slash, got: ${a.path}`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: a multi-level skill (codex ad-review with agents/openai.yaml) lands every nested file', async () => {
  const dir = mkScratch();
  try {
    const result = await installSkills({
      cwd: dir,
      agents: ['codex'],
      skills: ['ad-review'],
      kitVersion: '0.9.3-test',
    });
    // The nested agents/openai.yaml file must land — this exercises the
    // walkSkill recursion + the join(prefix, entry) path that produced
    // backslashes on Windows pre-fix.
    assert.ok(
      existsSync(join(dir, '.agents/skills/ad-review/agents/openai.yaml')),
      'nested agents/openai.yaml must install for codex ad-review'
    );
    const reviewSkill = result.nextStates.codex.skills['ad-review'];
    const nested = reviewSkill.files.find((f) =>
      f.path.endsWith('agents/openai.yaml')
    );
    assert.ok(nested, 'state must record the nested agents/openai.yaml entry');
    assert.ok(
      !nested.path.includes('\\'),
      `state path must use forward-slash, got: ${nested.path}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PATH_SEP sanity: forward-slash test runs no-op on POSIX, real fix on Windows', () => {
  // This test does not branch on platform. It documents the contract:
  // toPosix in src/lib/install.js is a no-op when PATH_SEP === '/' and
  // performs `.split('\\').join('/')` when PATH_SEP === '\\'. The two
  // installSkills tests above are the actual regression coverage; this
  // assertion just confirms PATH_SEP is one of the two known values.
  assert.ok(['/', '\\'].includes(PATH_SEP), `unexpected PATH_SEP: ${PATH_SEP}`);
});
