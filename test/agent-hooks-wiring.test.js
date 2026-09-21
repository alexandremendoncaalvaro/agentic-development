import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_ROOT = realpathSync(fileURLToPath(new URL('..', import.meta.url)));

// The artifact-gate script is contract-tested by direct invocation in
// test/skill-scripts.test.js. This file tests the WIRING — the literal hook
// configuration this repository ships for each host — because a wrong matcher,
// a broken path variable, or malformed JSON would pass every direct test and
// still never fire in a real session (HK.1: a gate that silently does less
// than its script). The command string is taken from the config file verbatim,
// the host's path variable is substituted the way the host documents it, and
// the result is executed through a shell against a crafted PostToolUse event.

function gateFixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'agentic-wiring-repo-')));
  const evidence = realpathSync(mkdtempSync(join(tmpdir(), 'agentic-wiring-evidence-')));
  mkdirSync(join(root, 'doc', 'research'), { recursive: true });
  const rel = 'doc/research/0001-ground-broken.md';
  writeFileSync(join(root, rel), '# GROUND-0001: broken\n\n**Status:** recorded\n');
  return { root, evidence, rel };
}

function postToolUseEvent(root, rel, toolName, toolInput) {
  return JSON.stringify({
    hook_event_name: 'PostToolUse',
    session_id: 'wiring-session',
    cwd: root,
    tool_name: toolName,
    tool_input: toolInput,
    tool_response: {},
  });
}

function findPostToolUseHook(config) {
  const entries = config.hooks?.PostToolUse ?? [];
  const entry = entries.find((e) => e.matcher === 'Edit|Write');
  assert.ok(entry, 'a PostToolUse entry with matcher Edit|Write is wired');
  const hook = entry.hooks.find(
    (h) => h.type === 'command' && /artifact-gate\.mjs/.test(h.command)
  );
  assert.ok(hook, 'the entry runs artifact-gate.mjs as a command hook');
  return hook;
}

// Claude Code matches this matcher form as an exact list of tool names, so the
// two file tools are covered and Bash is not.
test('agent hooks wiring: the Edit|Write matcher names exactly the two file tools', () => {
  for (const file of ['.claude/settings.json', '.codex/hooks.json']) {
    const config = JSON.parse(readFileSync(join(KIT_ROOT, file), 'utf8'));
    const entry = config.hooks.PostToolUse.find((e) => e.matcher === 'Edit|Write');
    assert.ok(entry, `${file}: matcher present`);
    const names = entry.matcher.split('|');
    assert.deepEqual(names.sort(), ['Edit', 'Write']);
  }
});

test('agent hooks wiring: the Claude Code settings command, with ${CLAUDE_PROJECT_DIR} substituted, runs the gate and surfaces a validator failure', () => {
  const { root, evidence, rel } = gateFixture();
  try {
    const config = JSON.parse(readFileSync(join(KIT_ROOT, '.claude', 'settings.json'), 'utf8'));
    const hook = findPostToolUseHook(config);
    assert.match(
      hook.command,
      /\$\{CLAUDE_PROJECT_DIR\}/,
      'the command resolves through the documented project variable'
    );
    const command = hook.command.replaceAll('${CLAUDE_PROJECT_DIR}', KIT_ROOT);
    const scriptPath = /"([^"]+artifact-gate\.mjs)"/.exec(command)?.[1];
    assert.ok(scriptPath && existsSync(scriptPath), `the wired script exists: ${scriptPath}`);
    const run = spawnSync(command, {
      shell: true,
      cwd: KIT_ROOT,
      input: postToolUseEvent(root, rel, 'Write', { file_path: join(root, rel), content: '' }),
      encoding: 'utf8',
      env: {
        ...process.env,
        AD_ARTIFACT_GATE: '',
        AD_ARTIFACT_GATE_EVIDENCE_DIR: evidence,
        AD_ARTIFACT_GATE_SKILLS_ROOT: '',
      },
    });
    assert.equal(run.status, 2, `exit 2 through the wired command; stderr: ${run.stderr}`);
    assert.match(run.stderr, /missing Decision metadata/);
    assert.equal(run.stdout, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(evidence, { recursive: true, force: true });
  }
});

// Codex documents `$(git rev-parse --show-toplevel)` as the idiom for a
// repository-local hook and runs commands with the session cwd; the shell
// here stands in for Codex. cmd.exe has no `$(...)`, so the execution half is
// POSIX-only; the structural half runs everywhere.
test('agent hooks wiring: the Codex hooks.json command resolves the script from the git root and points at the Codex tree', () => {
  const config = JSON.parse(readFileSync(join(KIT_ROOT, '.codex', 'hooks.json'), 'utf8'));
  const hook = findPostToolUseHook(config);
  assert.match(hook.command, /\$\(git rev-parse --show-toplevel\)/);
  assert.match(hook.command, /src\/skills\/codex\/ad-hooks\/scripts\/artifact-gate\.mjs/);
  assert.equal(typeof hook.timeout, 'number');
  const rel = /toplevel\)([^"]+artifact-gate\.mjs)"/.exec(hook.command)?.[1];
  assert.ok(rel && existsSync(join(KIT_ROOT, rel)), `the wired script exists: ${rel}`);
});

if (process.platform === 'win32') {
  test.skip('agent hooks wiring: the Codex hooks.json command runs the gate through a POSIX shell (POSIX only)', () => {});
} else {
  test('agent hooks wiring: the Codex hooks.json command runs the gate through a POSIX shell and surfaces a validator failure from an apply_patch event', () => {
    const { root, evidence, rel } = gateFixture();
    try {
      const config = JSON.parse(readFileSync(join(KIT_ROOT, '.codex', 'hooks.json'), 'utf8'));
      const hook = findPostToolUseHook(config);
      const patch = [
        '*** Begin Patch',
        `*** Update File: ${rel}`,
        '@@',
        '+x',
        '*** End Patch',
      ].join('\n');
      const run = spawnSync(hook.command, {
        shell: '/bin/sh',
        cwd: KIT_ROOT,
        input: postToolUseEvent(root, rel, 'apply_patch', { command: patch }),
        encoding: 'utf8',
        env: {
          ...process.env,
          AD_ARTIFACT_GATE: '',
          AD_ARTIFACT_GATE_EVIDENCE_DIR: evidence,
          AD_ARTIFACT_GATE_SKILLS_ROOT: '',
        },
      });
      assert.equal(run.status, 2, `exit 2 through the wired command; stderr: ${run.stderr}`);
      assert.match(run.stderr, /missing Decision metadata/);
      assert.equal(run.stdout, '');
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(evidence, { recursive: true, force: true });
    }
  });
}
