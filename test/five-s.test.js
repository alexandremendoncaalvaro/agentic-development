// ad-5s sweep classifier (ADR-0101). The claude-code copy is executed; the
// byte-parity test in skills.test.js guarantees the codex twin is identical.
// Every fixture is a real git repository with a local bare remote, and GitHub
// is a fake `gh` (a Node script named by AGENTIC_GH, the same seam ad-pr's
// preflight uses) that answers from a JSON file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SWEEP = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-5s',
  'scripts',
  'sweep.mjs'
);

const FAKE_GH = `import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.env.FAKE_GH_DATA, 'utf8'));
if (data.fail) { process.stderr.write('gh: not authenticated'); process.exit(1); }
if (data.failState && process.argv.includes(data.failState)) {
  process.stderr.write('gh: rate limited'); process.exit(1);
}
const [a, b, c] = process.argv.slice(2);
let out;
if (a === 'pr' && b === 'view') out = data.view[c];
else if (a === 'pr' && b === 'list') {
  const i = process.argv.indexOf('--state');
  out = data[process.argv[i + 1]] ?? [];
}
if (out === undefined) { process.stderr.write('no such pull request'); process.exit(1); }
process.stdout.write(JSON.stringify(out));
`;

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function commit(cwd, file, text) {
  writeFileSync(join(cwd, file), text);
  git(cwd, 'add', file);
  git(cwd, 'commit', '-q', '-m', `add ${file}`);
  return git(cwd, 'rev-parse', 'HEAD');
}

// A clone with origin/main, plus feat/x worked on in its own worktree and
// pushed, then squash-merged into main: the shape the kit's own flow leaves.
function fixture() {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), 'agentic-5s-')));
  const remote = join(dir, 'remote.git');
  const repo = join(dir, 'repo');
  const wt = join(dir, 'wt-x');
  git(dir, 'init', '-q', '--bare', '-b', 'main', remote);
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'T');
  git(repo, 'config', 'user.email', 't@example.invalid');
  git(repo, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(repo, '.gitignore'), 'node_modules/\n.env\n');
  git(repo, 'add', '.gitignore');
  commit(repo, 'README.md', 'r\n');
  git(repo, 'remote', 'add', 'origin', remote);
  git(repo, 'push', '-q', '-u', 'origin', 'main');
  git(repo, 'remote', 'set-head', 'origin', 'main');
  git(repo, 'worktree', 'add', '-q', '-b', 'feat/x', wt, 'main');
  commit(wt, 'a.txt', 'a\n');
  const tip = commit(wt, 'b.txt', 'b\n');
  git(wt, 'push', '-q', '-u', 'origin', 'feat/x');
  git(repo, 'merge', '-q', '--squash', 'feat/x');
  git(repo, 'commit', '-q', '-m', 'feat: x (#7)');
  git(repo, 'push', '-q', 'origin', 'main');
  const squash = git(repo, 'rev-parse', 'HEAD');
  const pr = {
    number: 7,
    state: 'MERGED',
    headRefName: 'feat/x',
    headRefOid: tip,
    baseRefName: 'main',
    isCrossRepository: false,
    mergeCommit: { oid: squash },
  };
  const ghData = join(dir, 'gh.json');
  const writeGh = (data) => writeFileSync(ghData, JSON.stringify(data));
  writeGh({ view: { 7: pr }, merged: [pr], open: [] });
  const fakeGh = join(dir, 'fake-gh.mjs');
  writeFileSync(fakeGh, FAKE_GH);
  const env = { ...process.env, AGENTIC_GH: fakeGh, FAKE_GH_DATA: ghData };
  const run = (args, cwd = repo) =>
    JSON.parse(execFileSync('node', [SWEEP, ...args], { cwd, encoding: 'utf8', env }));
  const fails = (args, cwd = repo) =>
    spawnSync('node', [SWEEP, ...args], { cwd, encoding: 'utf8', env });
  // Runs a CANDIDATE's argv as the skill does: as separate arguments, no shell.
  const exec = (argv, cwd = repo) =>
    execFileSync(argv[0], argv.slice(1), {
      cwd,
      encoding: 'utf8',
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  return { dir, remote, repo, wt, tip, pr, writeGh, run, fails, exec, cleanup };
}

const find = (out, kind, target) =>
  out.items.find((i) => i.kind === kind && (target === undefined || i.target === target));
const same = (a, b) =>
  realpathSync.native(a).toLowerCase() === realpathSync.native(b).toLowerCase();

test('after-merge: a squash-merged PR at its exact head clears worktree, branch and remote, in order', () => {
  const f = fixture();
  try {
    const out = f.run(['after-merge', '--pr', '7']);
    assert.equal(out.mode, 'after-merge');
    assert.equal(out.defaultBranch, 'main');
    const kinds = out.items.map((i) => i.kind);
    assert.deepEqual(kinds, ['worktree', 'branch', 'remote']);
    const wt = find(out, 'worktree');
    assert.equal(wt.verdict, 'CANDIDATE', wt.reason);
    assert.ok(same(wt.target, f.wt));
    assert.deepEqual(wt.command.slice(0, 3), ['git', 'worktree', 'remove']);
    assert.ok(!wt.command.includes('--force'));
    const br = find(out, 'branch', 'feat/x');
    assert.equal(br.verdict, 'CANDIDATE', br.reason);
    assert.equal(br.sha, f.tip);
    assert.ok(same(br.command[1], SWEEP));
    assert.deepEqual(br.command.slice(2), ['delete-branch', 'feat/x', f.tip]);
    assert.deepEqual(br.undo, ['git', 'branch', 'feat/x', f.tip]);
    assert.match(br.reason, /#7/);
    const rm = find(out, 'remote', 'origin/feat/x');
    assert.equal(rm.verdict, 'CANDIDATE', rm.reason);
    assert.deepEqual(rm.command, [
      'git',
      'push',
      `--force-with-lease=refs/heads/feat/x:${f.tip}`,
      'origin',
      ':refs/heads/feat/x',
    ]);
    assert.deepEqual(rm.undo, ['git', 'push', 'origin', `${f.tip}:refs/heads/feat/x`]);
  } finally {
    f.cleanup();
  }
});

test('after-merge: running the candidates in order removes the worktree, the branch and the remote branch', () => {
  const f = fixture();
  try {
    const out = f.run(['after-merge', '--pr', '7']);
    for (const item of out.items) {
      assert.equal(item.verdict, 'CANDIDATE', item.reason);
      f.exec(item.command);
    }
    assert.equal(existsSync(f.wt), false);
    assert.equal(git(f.repo, 'branch', '--list', 'feat/x'), '');
    assert.equal(git(f.repo, 'ls-remote', '--heads', 'origin', 'feat/x'), '');
    assert.equal(git(f.repo, 'branch', '--show-current'), 'main');
    const again = f.run(['after-merge', '--pr', '7']);
    assert.deepEqual(again.items, []);
  } finally {
    f.cleanup();
  }
});

test('after-merge: a branch or remote that moved after classifying is not deleted', () => {
  const f = fixture();
  try {
    const out = f.run(['after-merge', '--pr', '7']);
    const br = find(out, 'branch');
    const rm = find(out, 'remote');
    f.exec(find(out, 'worktree').command);
    const other = join(f.dir, 'other');
    git(f.dir, 'clone', '-q', '-b', 'feat/x', f.remote, other);
    git(other, 'config', 'user.name', 'T');
    git(other, 'config', 'user.email', 't@example.invalid');
    commit(other, 'late.txt', 'late\n');
    git(other, 'push', '-q', 'origin', 'feat/x');
    git(f.repo, 'fetch', '-q', 'origin', 'feat/x:feat/x', '--update-head-ok');
    const kept = JSON.parse(f.exec(br.command));
    assert.equal(kept.removed, false);
    assert.match(kept.reason, /moved/);
    assert.throws(() => f.exec(rm.command));
    assert.notEqual(git(f.repo, 'ls-remote', '--heads', 'origin', 'feat/x'), '');
  } finally {
    f.cleanup();
  }
});

test('after-merge: with no pull request answer and no --branch it fails loudly, not silently empty', () => {
  const f = fixture();
  try {
    f.writeGh({ fail: true });
    const r = f.fails(['after-merge', '--pr', '7']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--branch/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: when only the open pull request list fails, the remote branch is asked, not deleted', () => {
  const f = fixture();
  try {
    f.writeGh({ view: { 7: f.pr }, merged: [f.pr], open: [], failState: 'open' });
    const out = f.run(['after-merge', '--pr', '7']);
    assert.equal(out.github.ok, false);
    assert.equal(find(out, 'remote').verdict, 'ASK');
    assert.match(find(out, 'remote').reason, /GitHub could not be asked/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: a --branch that is not the pull request head is an error', () => {
  const f = fixture();
  try {
    const r = f.fails(['after-merge', '--pr', '7', '--branch', 'other']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /feat\/x/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: a remote ref that only ends in the branch name is not the branch', () => {
  const f = fixture();
  try {
    git(f.repo, 'push', '-q', 'origin', 'main:refs/heads/zz/refs/heads/feat/x');
    git(f.repo, 'push', '-q', 'origin', '--delete', 'feat/x');
    const out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'remote'), undefined);
  } finally {
    f.cleanup();
  }
});

test('after-merge: a branch reset to the base with none of the pull request commits asks', () => {
  const f = fixture();
  try {
    git(f.repo, 'worktree', 'remove', f.wt);
    git(f.repo, 'branch', '-f', 'feat/x', `${f.tip}~2`);
    assert.equal(find(f.run(['after-merge', '--pr', '7']), 'branch').verdict, 'ASK');
    git(f.repo, 'branch', '-f', 'feat/x', `${f.tip}~1`);
    const behind = find(f.run(['after-merge', '--pr', '7']), 'branch');
    assert.equal(behind.verdict, 'CANDIDATE', 'behind the merged head with its own commit');
  } finally {
    f.cleanup();
  }
});

test('after-merge: an open pull request list that may be cut short is no proof', () => {
  const f = fixture();
  try {
    const open = Array.from({ length: 1000 }, (_, i) => ({
      number: 100 + i,
      headRefName: `other/${i}`,
      baseRefName: 'main',
    }));
    f.writeGh({ view: { 7: f.pr }, merged: [f.pr], open });
    const out = f.run(['after-merge', '--pr', '7']);
    assert.equal(out.github.ok, false);
    assert.match(out.github.error, /1000/);
    assert.equal(find(out, 'remote').verdict, 'ASK');
    assert.equal(find(out, 'branch').verdict, 'ASK');
    assert.equal(find(out, 'worktree').verdict, 'ASK');
  } finally {
    f.cleanup();
  }
});

test('after-merge: a branch behind the merged head whose fork point is unknown asks', () => {
  const f = fixture();
  try {
    const { mergeCommit, ...bare } = f.pr;
    assert.ok(mergeCommit);
    f.writeGh({ view: { 7: bare }, merged: [bare], open: [] });
    git(f.repo, 'worktree', 'remove', f.wt);
    git(f.repo, 'branch', '-f', 'feat/x', `${f.tip}~1`);
    const br = find(f.run(['after-merge', '--pr', '7']), 'branch');
    assert.equal(br.verdict, 'ASK');
    assert.match(br.reason, /could not be found/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: the fork point holds for a merge commit and for a rebase merge', () => {
  const f = fixture();
  try {
    git(f.repo, 'worktree', 'remove', f.wt);
    git(f.repo, 'merge', '-q', '--no-ff', '-m', 'merge feat/x', 'feat/x');
    const merge = git(f.repo, 'rev-parse', 'HEAD');
    git(f.repo, 'switch', '-q', '-c', 'rebased', 'main~2');
    git(f.repo, 'cherry-pick', `${f.tip}~1`, f.tip);
    const rebase = git(f.repo, 'rev-parse', 'HEAD');
    git(f.repo, 'switch', '-q', 'main');
    for (const oid of [merge, rebase]) {
      const pr = { ...f.pr, mergeCommit: { oid } };
      f.writeGh({ view: { 7: pr }, merged: [pr], open: [] });
      git(f.repo, 'branch', '-f', 'feat/x', `${f.tip}~2`);
      assert.equal(find(f.run(['after-merge', '--pr', '7']), 'branch').verdict, 'ASK', oid);
      git(f.repo, 'branch', '-f', 'feat/x', `${f.tip}~1`);
      assert.equal(find(f.run(['after-merge', '--pr', '7']), 'branch').verdict, 'CANDIDATE', oid);
    }
  } finally {
    f.cleanup();
  }
});

test('after-merge: a branch that merged the base in after the pull request is kept', () => {
  const f = fixture();
  try {
    commit(f.repo, 'later.txt', 'later\n');
    git(f.wt, 'merge', '-q', '--no-edit', 'main');
    const out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'branch').verdict, 'KEEP');
    assert.equal(find(out, 'worktree').verdict, 'KEEP');
  } finally {
    f.cleanup();
  }
});

test('sweep: a merged pull request list that may be cut short is no proof', () => {
  const f = fixture();
  try {
    const merged = Array.from({ length: 1000 }, (_, i) => ({
      ...f.pr,
      number: 100 + i,
      headRefName: `other/${i}`,
    }));
    f.writeGh({ view: {}, merged: [f.pr, ...merged.slice(1)], open: [] });
    const out = f.run(['sweep', '--idle-hours', '0']);
    assert.equal(out.github.ok, false);
    assert.match(out.github.error, /merged/);
    assert.notEqual(find(out, 'branch', 'feat/x').verdict, 'CANDIDATE');
    assert.notEqual(find(out, 'remote', 'origin/feat/x').verdict, 'CANDIDATE');
  } finally {
    f.cleanup();
  }
});

test('an option given without its value is an error that names it', () => {
  const f = fixture();
  try {
    const r = f.fails(['sweep', '--temp']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--temp needs a value/);
    assert.match(f.fails(['sweep', '--']).stderr, /an option needs a name/);
    const kept = f.run(['record', '--kind', 'branch', '--target', 'x', '--proof', '--lease held']);
    assert.equal(kept.recorded, true, 'a value that only starts with -- is still a value');
  } finally {
    f.cleanup();
  }
});

test('after-merge: a local commit newer than what merged keeps the branch and its worktree', () => {
  const f = fixture();
  try {
    commit(f.wt, 'c.txt', 'c\n');
    const out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'branch').verdict, 'KEEP');
    assert.match(find(out, 'branch').reason, /newer than/);
    assert.equal(find(out, 'worktree').verdict, 'KEEP');
  } finally {
    f.cleanup();
  }
});

test('after-merge: a dirty or locked worktree is kept, and so is the branch it holds', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.wt, 'notes.txt'), 'unsaved\n');
    let out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'worktree').verdict, 'KEEP');
    assert.match(find(out, 'worktree').reason, /untracked or modified/);
    assert.equal(find(out, 'branch').verdict, 'KEEP');
    assert.match(find(out, 'branch').reason, /checked out/);
    rmSync(join(f.wt, 'notes.txt'));
    git(f.repo, 'worktree', 'lock', f.wt);
    out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'worktree').verdict, 'KEEP');
    assert.match(find(out, 'worktree').reason, /locked/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: gitignored build output may go with the worktree, any other ignored file asks', () => {
  const f = fixture();
  try {
    mkdirSync(join(f.wt, 'node_modules', 'x'), { recursive: true });
    writeFileSync(join(f.wt, 'node_modules', 'x', 'i.js'), '');
    let out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'worktree').verdict, 'CANDIDATE', find(out, 'worktree').reason);
    writeFileSync(join(f.wt, '.env'), 'X=1\n');
    out = f.run(['after-merge', '--pr', '7']);
    const wt = find(out, 'worktree');
    assert.equal(wt.verdict, 'ASK');
    assert.deepEqual(wt.ignored, ['.env']);
  } finally {
    f.cleanup();
  }
});

test('after-merge: an open PR keeps everything; no GitHub answer turns a squash into a question', () => {
  const f = fixture();
  try {
    f.writeGh({ view: { 7: { ...f.pr, state: 'OPEN' } }, merged: [], open: [] });
    let out = f.run(['after-merge', '--pr', '7']);
    assert.ok(
      out.items.every((i) => i.verdict === 'KEEP'),
      JSON.stringify(out.items)
    );
    f.writeGh({ fail: true });
    out = f.run(['after-merge', '--pr', '7', '--branch', 'feat/x']);
    assert.equal(out.github.ok, false);
    assert.ok(
      out.items.every((i) => i.verdict !== 'CANDIDATE'),
      JSON.stringify(out.items)
    );
    assert.equal(find(out, 'branch').verdict, 'ASK');
    assert.match(find(out, 'branch').reason, /squash/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: run from inside the worktree it would remove, it keeps it and says why', () => {
  const f = fixture();
  try {
    const out = f.run(['after-merge', '--pr', '7'], f.wt);
    assert.equal(find(out, 'worktree').verdict, 'KEEP');
    assert.match(find(out, 'worktree').reason, /current directory/);
  } finally {
    f.cleanup();
  }
});

test('after-merge: a remote branch already deleted is not an item, and an open PR on it keeps it', () => {
  const f = fixture();
  try {
    f.writeGh({
      view: { 7: f.pr },
      merged: [f.pr],
      open: [{ number: 9, headRefName: 'feat/y', baseRefName: 'feat/x' }],
    });
    let out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'remote').verdict, 'KEEP');
    assert.match(find(out, 'remote').reason, /#9/);
    git(f.repo, 'push', '-q', 'origin', '--delete', 'feat/x');
    out = f.run(['after-merge', '--pr', '7']);
    assert.equal(find(out, 'remote'), undefined);
  } finally {
    f.cleanup();
  }
});

test('sweep: proves merges by ancestry or a merged PR, asks for the rest, never lists the default branch', () => {
  const f = fixture();
  try {
    git(f.repo, 'switch', '-q', '-c', 'chore/ff');
    commit(f.repo, 'ff.txt', 'ff\n');
    git(f.repo, 'switch', '-q', 'main');
    git(f.repo, 'merge', '-q', '--ff-only', 'chore/ff');
    commit(f.repo, 'later.txt', 'later\n');
    git(f.repo, 'push', '-q', 'origin', 'main');
    git(f.repo, 'branch', 'fresh', 'main');
    git(f.repo, 'branch', 'staging', 'main');
    git(f.repo, 'branch', 'wip/z', 'main');
    git(f.repo, 'switch', '-q', 'wip/z');
    commit(f.repo, 'z.txt', 'z\n');
    git(f.repo, 'switch', '-q', 'main');
    writeFileSync(join(f.repo, 'stray.log'), 'x\n');
    writeFileSync(join(f.repo, '.env'), 'X=1\n');
    mkdirSync(join(f.repo, 'node_modules'));
    writeFileSync(join(f.repo, 'node_modules', 'i.js'), '');
    const out = f.run(['sweep', '--idle-hours', '0']);
    assert.equal(out.mode, 'sweep');
    assert.equal(find(out, 'branch', 'main'), undefined);
    assert.equal(find(out, 'branch', 'chore/ff').verdict, 'CANDIDATE');
    assert.match(find(out, 'branch', 'chore/ff').reason, /origin\/main/);
    assert.equal(find(out, 'branch', 'fresh').verdict, 'ASK');
    assert.match(find(out, 'branch', 'fresh').reason, /no commits of its own/);
    assert.equal(find(out, 'branch', 'staging'), undefined);
    assert.equal(find(out, 'branch', 'wip/z').verdict, 'ASK');
    assert.equal(find(out, 'branch', 'feat/x').verdict, 'CANDIDATE');
    assert.equal(find(out, 'worktree').verdict, 'CANDIDATE');
    assert.equal(find(out, 'remote', 'origin/feat/x').verdict, 'CANDIDATE');
    assert.equal(find(out, 'remote', 'origin/main'), undefined);
    const stray = find(out, 'untracked');
    assert.equal(stray.verdict, 'ASK');
    assert.equal(stray.target, 'stray.log');
    assert.deepEqual(
      out.items.filter((i) => i.kind === 'ignored').map((i) => [i.target, i.verdict]),
      [['.env', 'ASK']]
    );
  } finally {
    f.cleanup();
  }
});

test('sweep: a worktree or branch touched recently asks, since another session may be in it', () => {
  const f = fixture();
  try {
    git(f.repo, 'switch', '-q', '-c', 'chore/ff');
    commit(f.repo, 'ff.txt', 'ff\n');
    git(f.repo, 'switch', '-q', 'main');
    git(f.repo, 'merge', '-q', '--ff-only', 'chore/ff');
    commit(f.repo, 'later.txt', 'later\n');
    git(f.repo, 'push', '-q', 'origin', 'main');
    const out = f.run(['sweep']);
    assert.equal(find(out, 'branch', 'chore/ff').verdict, 'ASK');
    assert.match(find(out, 'branch', 'chore/ff').reason, /24 h/);
    assert.deepEqual(find(out, 'branch', 'chore/ff').command.slice(2, 3), ['delete-branch']);
    assert.equal(find(out, 'worktree').verdict, 'ASK');
    assert.match(find(out, 'worktree').reason, /24 h/);
  } finally {
    f.cleanup();
  }
});

test('sweep: a remote branch that moved since the last fetch is kept', () => {
  const f = fixture();
  try {
    commit(f.wt, 'late.txt', 'late\n');
    git(f.wt, 'push', '-q', 'origin', 'feat/x');
    git(f.repo, 'update-ref', 'refs/remotes/origin/feat/x', f.tip);
    const out = f.run(['sweep', '--idle-hours', '0']);
    assert.equal(find(out, 'remote', 'origin/feat/x').verdict, 'KEEP');
    assert.match(find(out, 'remote', 'origin/feat/x').reason, /moved/);
  } finally {
    f.cleanup();
  }
});

test('sweep: a branch proved only by ancestry keeps its remote copy as a question', () => {
  const f = fixture();
  try {
    git(f.repo, 'switch', '-q', '-c', 'chore/ff');
    commit(f.repo, 'ff.txt', 'ff\n');
    git(f.repo, 'push', '-q', 'origin', 'chore/ff');
    git(f.repo, 'switch', '-q', 'main');
    git(f.repo, 'merge', '-q', '--ff-only', 'chore/ff');
    commit(f.repo, 'later.txt', 'later\n');
    git(f.repo, 'push', '-q', 'origin', 'main');
    const out = f.run(['sweep', '--idle-hours', '0']);
    assert.equal(find(out, 'branch', 'chore/ff').verdict, 'CANDIDATE');
    assert.equal(find(out, 'remote', 'origin/chore/ff').verdict, 'ASK');
    assert.match(find(out, 'remote', 'origin/chore/ff').reason, /no merged pull request/);
    assert.match(find(out, 'remote', 'origin/chore/ff').command[2], /^--force-with-lease=/);
  } finally {
    f.cleanup();
  }
});

test('sweep --path inside a worktree lists that worktree; a path outside the repository is an error', () => {
  const f = fixture();
  try {
    const out = f.run(['sweep', '--idle-hours', '0', '--path', f.wt]);
    assert.ok(same(find(out, 'worktree').target, f.wt));
    assert.equal(find(out, 'branch', 'feat/x').verdict, 'CANDIDATE');
    const r = f.fails(['sweep', '--path', join(f.dir, 'nowhere')]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /no such path/);
  } finally {
    f.cleanup();
  }
});

test('sweep --path limits worktrees and untracked files to that path', () => {
  const f = fixture();
  try {
    mkdirSync(join(f.repo, 'sub'));
    writeFileSync(join(f.repo, 'sub', 'in.log'), '');
    writeFileSync(join(f.repo, 'out.log'), '');
    const out = f.run(['sweep', '--idle-hours', '0', '--path', join(f.repo, 'sub')]);
    assert.equal(find(out, 'worktree'), undefined);
    assert.deepEqual(
      out.items.filter((i) => i.kind === 'untracked').map((i) => i.target),
      ['sub/in.log']
    );
  } finally {
    f.cleanup();
  }
});

test('temp: a named path the session made is a candidate only when untracked, inside an allowed root and not a repository', () => {
  const f = fixture();
  try {
    const scratch = mkdtempSync(join(tmpdir(), 'agentic-5s-scratch-'));
    writeFileSync(join(scratch, 'log.txt'), '');
    const inRepo = join(f.repo, 'gate.log');
    writeFileSync(inRepo, '');
    const nested = join(f.dir, 'clone');
    mkdirSync(join(nested, '.git'), { recursive: true });
    const deep = join(f.dir, 'scratch2');
    mkdirSync(join(deep, 'sub', 'clone', '.git'), { recursive: true });
    const out = f.run([
      'after-merge',
      '--pr',
      '7',
      '--temp',
      scratch,
      '--temp',
      inRepo,
      '--temp',
      join(f.repo, 'README.md'),
      '--temp',
      nested,
      '--temp',
      deep,
      '--temp',
      f.repo,
    ]);
    const temp = out.items.filter((i) => i.kind === 'temp');
    const verdictOf = (p) => temp.find((i) => same(i.target, p)).verdict;
    assert.equal(verdictOf(scratch), 'CANDIDATE');
    assert.equal(verdictOf(inRepo), 'CANDIDATE');
    assert.equal(verdictOf(join(f.repo, 'README.md')), 'KEEP');
    assert.equal(verdictOf(nested), 'ASK');
    assert.equal(verdictOf(deep), 'ASK', 'a repository deeper inside is found too');
    assert.equal(verdictOf(f.repo), 'KEEP');
    assert.deepEqual(out.items.slice(-temp.length), temp, 'temp items come last');
    rmSync(scratch, { recursive: true, force: true });
  } finally {
    f.cleanup();
  }
});

test('remove-temp deletes a candidate and refuses anything else', () => {
  const f = fixture();
  try {
    const scratch = mkdtempSync(join(tmpdir(), 'agentic-5s-scratch-'));
    const ok = f.run(['remove-temp', scratch]);
    assert.equal(ok.removed, true);
    assert.equal(existsSync(scratch), false);
    const no = f.run(['remove-temp', join(f.repo, 'README.md')]);
    assert.equal(no.removed, false);
    assert.equal(existsSync(join(f.repo, 'README.md')), true);
    for (const inner of [join(f.repo, '.git'), join(f.repo, '.git', 'hooks')]) {
      const refused = f.run(['remove-temp', inner]);
      assert.equal(refused.removed, false, inner);
      assert.match(refused.reason, /git's own directory/);
      assert.equal(existsSync(inner), true);
    }
    writeFileSync(join(f.repo, '.env'), 'X=1\n');
    const ignored = f.run(['remove-temp', join(f.repo, '.env')]);
    assert.equal(ignored.removed, false);
    assert.equal(ignored.verdict, 'ASK');
    assert.equal(existsSync(join(f.repo, '.env')), true);
    const receipts = join(f.repo, '.agentic', 'receipts');
    mkdirSync(receipts, { recursive: true });
    assert.equal(f.run(['remove-temp', receipts]).removed, false);
    const empty = f.fails(['remove-temp']);
    assert.notEqual(empty.status, 0);
    assert.equal(existsSync(f.repo), true);
  } finally {
    f.cleanup();
  }
});

test('record appends one receipt line in the main worktree, from any worktree', () => {
  const f = fixture();
  try {
    const out = f.run(
      [
        'record',
        '--kind',
        'branch',
        '--target',
        'feat/x',
        '--sha',
        f.tip,
        '--proof',
        'PR #7 merged at its head',
        '--undo',
        `git branch feat/x ${f.tip}`,
      ],
      f.wt
    );
    assert.equal(out.recorded, true);
    const lines = readFileSync(join(f.repo, '.agentic', 'receipts', '5s.jsonl'), 'utf8')
      .trim()
      .split('\n');
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.target, 'feat/x');
    assert.equal(entry.sha, f.tip);
    assert.ok(entry.at);
  } finally {
    f.cleanup();
  }
});
