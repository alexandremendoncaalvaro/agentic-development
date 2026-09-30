import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// task-0092: /ad-commit's cited-record probe (GROUND-0031), driven through its
// CLI on a throwaway repository.
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-commit',
  'scripts',
  'cited-records.mjs'
);

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function withRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-cited-records-'));
  try {
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 'fixture@example.com');
    git(dir, 'config', 'user.name', 'Fixture');
    git(dir, 'config', 'commit.gpgsign', 'false');
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function write(dir, path, text = '# record\n') {
  mkdirSync(join(dir, dirname(path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

function commitAll(dir) {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'fixture');
}

function probe(cwd, message, env = process.env) {
  const result = spawnSync(process.execPath, [SCRIPT, '-'], {
    cwd,
    env,
    input: message,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('cited-records: a record committed before the draft is in-head', () => {
  withRepo((dir) => {
    write(dir, 'doc/adr/0001-pick-a-runtime.md');
    commitAll(dir);

    const report = probe(dir, 'feat: add the runtime\n\nPer ADR-0001.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0001', path: 'doc/adr/0001-pick-a-runtime.md', state: 'in-head' },
    ]);
  });
});

test('cited-records: a record added in the index is staged', () => {
  withRepo((dir) => {
    write(dir, 'README.md');
    commitAll(dir);
    write(dir, 'doc/adr/0002-cache-the-index.md');
    git(dir, 'add', 'doc/adr/0002-cache-the-index.md');

    const report = probe(dir, 'feat: cache the index\n\nPer ADR-0002.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0002', path: 'doc/adr/0002-cache-the-index.md', state: 'staged' },
    ]);
  });
});

test('cited-records: a record only on disk is working-tree', () => {
  withRepo((dir) => {
    write(dir, 'README.md');
    commitAll(dir);
    write(dir, 'doc/adr/0003-not-yet-staged.md');

    const report = probe(dir, 'feat: rely on it\n\nPer ADR-0003.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0003', path: 'doc/adr/0003-not-yet-staged.md', state: 'working-tree' },
    ]);
  });
});

test('cited-records: a record removed from the tree but in history is archived', () => {
  withRepo((dir) => {
    write(dir, 'doc/adr/0004-superseded.md');
    commitAll(dir);
    git(dir, 'rm', '-q', 'doc/adr/0004-superseded.md');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'archive');

    const report = probe(dir, 'docs: cite history\n\nSee ADR-0004.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0004', path: 'doc/adr/0004-superseded.md', state: 'archived' },
    ]);
  });
});

test('cited-records: an id that resolves nowhere is not-found', () => {
  withRepo((dir) => {
    write(dir, 'README.md');
    commitAll(dir);

    const report = probe(dir, 'fix: typo\n\nPer ADR-0099.\n');

    assert.deepEqual(report.records, [{ id: 'ADR-0099', path: null, state: 'not-found' }]);
  });
});

test('cited-records: every id form resolves in its own directory, each id once', () => {
  withRepo((dir) => {
    write(dir, 'doc/research/0031-ground-probe.md');
    write(dir, 'doc/research/0030-invocation-study.md');
    write(dir, 'doc/research/0022-prism-contract.md');
    write(dir, 'doc/tasks/0092-report-state.md');
    write(dir, 'doc/tasks/0084-measure-gate.md');
    write(dir, 'doc/specs/0008-surface-failures.md');
    write(dir, 'doc/specs/0007-trajectory-eval.md');
    commitAll(dir);

    const report = probe(
      dir,
      [
        'feat: wire the probe',
        '',
        'Grounded in GROUND-0031 and RESEARCH-0030, audited by PRISM-0022.',
        'Implements Spec 0008 and spec-0007; follows Task 0084.',
        'Closes task-0092. Refs task-0092, GROUND-0031.',
      ].join('\n')
    );

    assert.deepEqual(
      report.records.map(({ id, path }) => [id, path]),
      [
        ['GROUND-0031', 'doc/research/0031-ground-probe.md'],
        ['RESEARCH-0030', 'doc/research/0030-invocation-study.md'],
        ['PRISM-0022', 'doc/research/0022-prism-contract.md'],
        ['Spec 0008', 'doc/specs/0008-surface-failures.md'],
        ['spec-0007', 'doc/specs/0007-trajectory-eval.md'],
        ['Task 0084', 'doc/tasks/0084-measure-gate.md'],
        ['task-0092', 'doc/tasks/0092-report-state.md'],
      ]
    );
  });
});

test('cited-records: a repository with no commits still reports staged records', () => {
  withRepo((dir) => {
    write(dir, 'doc/adr/0001-first-decision.md');
    git(dir, 'add', '-A');

    const report = probe(dir, 'docs: record the first decision\n\nADR-0001.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0001', path: 'doc/adr/0001-first-decision.md', state: 'staged' },
    ]);
  });
});

test('cited-records: a leaked GIT_DIR does not redirect the probe to another repository', () => {
  withRepo((other) => {
    write(other, 'doc/adr/0005-elsewhere.md');
    commitAll(other);
    withRepo((dir) => {
      write(dir, 'README.md');
      commitAll(dir);

      const report = probe(dir, 'feat: x\n\nPer ADR-0005.\n', {
        ...process.env,
        GIT_DIR: join(other, '.git'),
        GIT_WORK_TREE: other,
        GIT_INDEX_FILE: join(other, '.git', 'index'),
      });

      assert.deepEqual(report.records, [{ id: 'ADR-0005', path: null, state: 'not-found' }]);
    });
  });
});

test('cited-records: reads the draft from a file path', () => {
  withRepo((dir) => {
    write(dir, 'doc/tasks/0001-first-task.md');
    commitAll(dir);
    write(dir, '.draft-message', 'fix: y\n\nCloses task-0001.\n');

    const result = spawnSync(process.execPath, [SCRIPT, '.draft-message'], {
      cwd: dir,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).records, [
      { id: 'task-0001', path: 'doc/tasks/0001-first-task.md', state: 'in-head' },
    ]);
  });
});

test('cited-records: a missing or unreadable message is a usage error', () => {
  withRepo((dir) => {
    for (const args of [[], ['no-such-file']]) {
      const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });

      assert.equal(result.status, 1);
      assert.match(JSON.parse(result.stdout).error, /cited-records\.mjs <message-file \| ->/);
    }
  });
});

test('cited-records: outside a git repository it reports the error instead of crashing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-cited-records-nogit-'));
  try {
    const result = spawnSync(process.execPath, [SCRIPT, '-'], {
      cwd: dir,
      input: 'Per ADR-0001.\n',
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /not inside a git work tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cited-records: resolves from the repository root when run in a subdirectory', () => {
  withRepo((dir) => {
    write(dir, 'doc/adr/0001-root-relative.md');
    commitAll(dir);

    const report = probe(join(dir, 'doc'), 'Per ADR-0001.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0001', path: 'doc/adr/0001-root-relative.md', state: 'in-head' },
    ]);
  });
});

test('cited-records: a committed record with a non-ASCII slug is in-head', () => {
  withRepo((dir) => {
    write(dir, 'doc/adr/0001-decisão-de-runtime.md');
    commitAll(dir);

    const report = probe(dir, 'Per ADR-0001.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0001', path: 'doc/adr/0001-decisão-de-runtime.md', state: 'in-head' },
    ]);
  });
});

test('cited-records: a record renamed into place in the index is staged', () => {
  withRepo((dir) => {
    write(dir, 'notes/draft.md', '# ground record with enough text to be a rename\n'.repeat(4));
    commitAll(dir);
    mkdirSync(join(dir, 'doc', 'research'), { recursive: true });
    git(dir, 'mv', 'notes/draft.md', 'doc/research/0007-ground-moved.md');

    const report = probe(dir, 'Grounded in GROUND-0007.\n');

    assert.deepEqual(report.records, [
      { id: 'GROUND-0007', path: 'doc/research/0007-ground-moved.md', state: 'staged' },
    ]);
  });
});

test('cited-records: an in-head record with uncommitted edits names where they sit', () => {
  withRepo((dir) => {
    write(dir, 'doc/research/0028-ground-gate.md');
    write(dir, 'doc/research/0029-ground-capture.md');
    write(dir, 'doc/research/0030-study.md');
    commitAll(dir);
    write(dir, 'doc/research/0028-ground-gate.md', '# record\n\n## Addendum\n');
    git(dir, 'add', 'doc/research/0028-ground-gate.md');
    write(dir, 'doc/research/0029-ground-capture.md', '# record\n\n## Addendum\n');

    const report = probe(dir, 'GROUND-0028, GROUND-0029, RESEARCH-0030.\n');

    assert.deepEqual(report.records, [
      {
        id: 'GROUND-0028',
        path: 'doc/research/0028-ground-gate.md',
        state: 'in-head',
        pending: 'staged',
      },
      {
        id: 'GROUND-0029',
        path: 'doc/research/0029-ground-capture.md',
        state: 'in-head',
        pending: 'unstaged',
      },
      { id: 'RESEARCH-0030', path: 'doc/research/0030-study.md', state: 'in-head' },
    ]);
  });
});

test('cited-records: a missing git binary is reported as such', () => {
  withRepo((dir) => {
    const result = spawnSync(process.execPath, [SCRIPT, '-'], {
      cwd: dir,
      // An unset PATH falls back to the system default, which finds git; an
      // empty directory does not. Windows spells the key Path.
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH')
        ),
        PATH: join(dir, 'no-binaries'),
      },
      input: 'Per ADR-0001.\n',
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /git is not available/);
  });
});

test('cited-records: a record renamed or removed in the index is reported as such', () => {
  withRepo((dir) => {
    write(dir, 'doc/adr/0001-old-slug.md', '# decision one\n'.repeat(4));
    write(dir, 'doc/adr/0002-dropped.md');
    commitAll(dir);
    git(dir, 'mv', 'doc/adr/0001-old-slug.md', 'doc/adr/0001-new-slug.md');
    git(dir, 'rm', '-q', 'doc/adr/0002-dropped.md');

    const report = probe(dir, 'ADR-0001 and ADR-0002.\n');

    assert.deepEqual(report.records, [
      { id: 'ADR-0001', path: 'doc/adr/0001-new-slug.md', state: 'in-head', pending: 'staged' },
      {
        id: 'ADR-0002',
        path: 'doc/adr/0002-dropped.md',
        state: 'in-head',
        pending: 'staged-removal',
      },
    ]);
  });
});
