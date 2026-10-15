import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Task 0126: aggregate metrics from local session transcripts, by period,
// with no transcript text in the output.
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'eval', 'daily-use.mjs');

const owner = (at, text, session = 's1') => ({
  type: 'user',
  sessionId: session,
  timestamp: at,
  isSidechain: false,
  origin: { kind: 'human' },
  message: { role: 'user', content: text },
});
const notification = (at, session = 's1') => ({
  type: 'user',
  sessionId: session,
  timestamp: at,
  isSidechain: false,
  origin: { kind: 'task-notification' },
  message: { role: 'user', content: 'responda em português de novo' },
});
const tool = (at, name, input, session = 's1', isSidechain = false) => ({
  type: 'assistant',
  sessionId: session,
  timestamp: at,
  isSidechain,
  message: { role: 'assistant', content: [{ type: 'tool_use', name, input }] },
});

function transcripts(files) {
  const root = mkdtempSync(join(tmpdir(), 'agentic-daily-use-'));
  for (const [name, lines] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(
      join(root, name),
      lines.map((l) => JSON.stringify(l)).join('\n') + '\nnot json\n'
    );
  }
  return root;
}

function run(root, args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, AGENTIC_TRANSCRIPTS_DIR: root },
  });
  assert.equal(result.status, 0, result.stderr);
  return { stdout: result.stdout, report: JSON.parse(result.stdout) };
}

test('daily-use: counts dispatches, pull requests, CI failure reads and owner corrections in the period', () => {
  const root = transcripts({
    'proj-a/s1.jsonl': [
      owner('2026-09-20T10:00:00Z', 'implement the SECRET-PHRASE feature'),
      owner('2026-09-20T10:05:00Z', 'responda em português, já falei'),
      notification('2026-09-20T10:06:00Z'),
      tool('2026-09-20T10:10:00Z', 'Agent', { subagent_type: 'fresh-context-reviewer' }),
      tool('2026-09-20T10:11:00Z', 'Agent', { subagent_type: 'fresh-context-reviewer' }),
      tool('2026-09-20T10:12:00Z', 'Task', { subagent_type: 'audit-group-reviewer' }),
      tool(
        '2026-09-20T10:13:00Z',
        'Agent',
        { subagent_type: 'fresh-context-reviewer' },
        's1',
        true
      ),
      tool('2026-09-20T10:20:00Z', 'Bash', { command: 'ghp pr create --fill' }),
      tool('2026-09-20T10:30:00Z', 'Bash', { command: 'gh run view 1 --log-failed | tail' }),
    ],
    'proj-b/s2.jsonl': [
      owner('2026-09-25T09:00:00Z', 'no emoji please', 's2'),
      tool('2026-09-25T09:10:00Z', 'Bash', { command: 'gh pr create' }, 's2'),
      owner('2026-10-20T09:00:00Z', 'outside the period', 's2'),
    ],
  });
  try {
    const { stdout, report } = run(root, ['--from', '2026-09-15', '--to', '2026-10-15']);
    assert.doesNotMatch(stdout, /SECRET-PHRASE|já falei|no emoji please/);
    assert.deepEqual(report.period, { from: '2026-09-15', to: '2026-10-15' });
    assert.deepEqual(report.counts, {
      sessions: 2,
      ownerMessages: 3,
      reviewerDispatches: 2,
      auditorDispatches: 1,
      pullRequestsCreated: 2,
      ciFailureReads: 1,
      ownerCorrections: 2,
    });
    assert.deepEqual(report.correctionsByRule, {
      language: 1,
      repetition: 1,
      emoji: 1,
      estimates: 0,
    });
    assert.deepEqual(report.ratios, {
      reviewerDispatchesPerSession: 1,
      auditorDispatchesPerSession: 0.5,
      reviewerDispatchesPerPullRequest: 1,
      auditorDispatchesPerPullRequest: 0.5,
      ciFailureReadsPerPullRequest: 0.5,
      ownerCorrectionsPerSession: 1,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('daily-use: an empty period reports zero counts and null ratios; a bad date is a usage error', () => {
  const root = transcripts({ 'p/s.jsonl': [owner('2026-01-01T00:00:00Z', 'x')] });
  try {
    const { report } = run(root, ['--from', '2026-09-15', '--to', '2026-10-15']);
    assert.equal(report.counts.sessions, 0);
    assert.equal(report.ratios.reviewerDispatchesPerSession, null);
    const bad = spawnSync(process.execPath, [SCRIPT, '--from', 'yesterday'], {
      encoding: 'utf8',
      env: { ...process.env, AGENTIC_TRANSCRIPTS_DIR: root },
    });
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /usage: daily-use\.mjs --from YYYY-MM-DD --to YYYY-MM-DD/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
