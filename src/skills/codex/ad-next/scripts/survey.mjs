#!/usr/bin/env node
/**
 * Deterministic state survey for /ad-next (ADR-0057, P2.1). Run from the repo
 * root under survey:
 *
 *   node <skill-base-dir>/scripts/survey.mjs
 *
 * Prints a single JSON object of objective, countable facts about the project's
 * six-layer artifact stack — file-signal presence, `Status:` frontmatter parse,
 * ADR/task counts, the `git rev-list` ahead-of-main count, tests/hooks/CI
 * presence, and spec-task reciprocity. The SKILL.md body reads this JSON and
 * keeps the JUDGMENT as text: scenario classification, next-action
 * prioritization. That split is exactly ADR-0057's
 * agent-vs-script boundary — deterministic gathering is a low-freedom script,
 * open-ended reasoning stays high-freedom prose.
 *
 * Scope: the survey covers the single-product / single-context layout
 * (`doc/product/PRD.md`, root `CONTEXT.md`). For a multi-product
 * (`PRODUCT-MAP.md`) or multi-context (`CONTEXT-MAP.md`) repo it reports the
 * index file's presence (`product.productMap`, `domain.contextMap`) but does
 * not enumerate the per-product / per-context files — the body reads those when
 * the map is present.
 *
 * Zero dependencies, Node-only (no POSIX shell assumed — Windows CI matrix),
 * mirroring the ad-audit `scripts/resolve-rules.mjs` precedent. Every probe
 * degrades rather than throws: a missing directory, a corrupt state file, or a
 * non-git tree all resolve to an explicit empty/null fact, never a crash. And
 * per GUIDELINES.md §2.2, a probe that *reads content* never fails silently: an
 * existing-but-unreadable file (or invalid JSON) is surfaced in the top-level
 * `unreadable` array as `{ path, code }`, the same "surface the failure"
 * contract `resolve-rules.mjs` follows with its `UNREADABLE` marker.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ADR_STATUSES = ['proposed', 'accepted', 'deprecated', 'superseded'];
const TASK_STATUSES = ['proposed', 'in-progress', 'blocked', 'done'];
// An artifact file in a layer directory: NNNN- prefix, .md suffix. Index files
// (PROJECTION.md, PRODUCT-MAP.md) do not match and are skipped.
const ARTIFACT_FILE = /^\d{4}-.*\.md$/;

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// Non-empty directory listing, or [] when the path is absent or not a dir.
function listDir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/**
 * Read a repo-relative file's content. An absent file (`ENOENT`) returns `''`
 * silently — that is an existence condition, exempt per GUIDELINES.md §2.2. Any
 * other read failure (`EACCES`, `EISDIR`, …) is a content-read failure and is
 * pushed to `unreadable` so it surfaces in the survey output, never swallowed.
 * Callers that additionally parse the content record their own parse failures.
 */
function readContent(repoRoot, rel, unreadable) {
  try {
    return readFileSync(join(repoRoot, rel), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      unreadable.push({ path: rel, code: error.code ?? 'unknown' });
    }
    return '';
  }
}

/**
 * Parse the artifact `Status:` field. ADRs, tasks, and specs write it bold
 * (`**Status:** accepted`); the PRD writes it plain (`Status: accepted`). Both
 * shapes resolve to the lowercased leading token (so `superseded by SPEC-0002`
 * → `superseded`, `in-progress` stays whole). `[ \t]*` (not `\s*`) so a blank
 * status line never captures the next line's leading word across the newline.
 * Returns null when no real status line is present (e.g. a template placeholder
 * in backticks).
 */
function parseStatus(body) {
  const m = body.match(/^\*{0,2}Status:\*{0,2}[ \t]*([A-Za-z][A-Za-z-]*)/mi);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Parse a bold-or-plain reference field value (`**Spec ref:** <value>`). `[ \t]*`
 * (not `\s*`) so a blank field (`**Spec ref:**` immediately followed by the next
 * field on its own line) reads as empty, not as the next line. Returns the
 * trimmed value, or '' when the line is absent, blank, or an unfilled
 * placeholder (a value opening with a backtick or angle bracket).
 */
function parseRef(body, label) {
  const re = new RegExp(`^\\*{0,2}${label}:\\*{0,2}[ \\t]*(.*)$`, 'mi');
  const m = body.match(re);
  if (!m) return '';
  const value = m[1].trim();
  if (value === '' || value.startsWith('`') || value.startsWith('<')) return '';
  return value;
}

// The four-digit artifact number leading a slug or a reference path, or null.
function artifactNumber(text) {
  const m = String(text).match(/\d{4}/);
  return m ? m[0] : null;
}

function slugOf(filename) {
  return filename.replace(/\.md$/, '');
}

// --- Layer probes -------------------------------------------------------------

function surveyState(repoRoot, unreadable) {
  const fallback = { kitVersion: null };
  for (const rel of ['.claude/agentic-state.json', '.agents/agentic-state.json']) {
    if (!isFile(join(repoRoot, rel))) continue;
    const before = unreadable.length;
    const raw = readContent(repoRoot, rel, unreadable);
    if (unreadable.length > before) return fallback; // read failed, already recorded
    if (!raw.trim()) return fallback; // empty file → default, not a parse error
    try {
      const parsed = JSON.parse(raw);
      return { kitVersion: parsed?.kitVersion || null };
    } catch {
      unreadable.push({ path: rel, code: 'INVALID_JSON' });
      return fallback;
    }
  }
  return fallback;
}

function surveyConstitution(repoRoot) {
  const operationalGuide = isFile(join(repoRoot, 'AGENTS.md'))
    ? 'AGENTS.md'
    : isFile(join(repoRoot, 'CLAUDE.md'))
      ? 'CLAUDE.md'
      : null;
  return {
    workflow: isFile(join(repoRoot, 'WORKFLOW.md')),
    operationalGuide,
    guidelines: isFile(join(repoRoot, 'GUIDELINES.md')),
  };
}

// Whether the operational guide names the product contract — a stale-guide
// signal (an accepted PRD the guide never references). null when no guide
// exists (not applicable, not a finding).
function surveyRootDocReferencesProduct(repoRoot, operationalGuide, unreadable) {
  if (!operationalGuide) return null;
  const body = readContent(repoRoot, operationalGuide, unreadable);
  return body.includes('doc/product') || /\bPRD\b/.test(body);
}

function surveyDomain(repoRoot, unreadable) {
  const contextMd = isFile(join(repoRoot, 'CONTEXT.md'));
  return {
    contextMd,
    contextMap: isFile(join(repoRoot, 'CONTEXT-MAP.md')),
    // An empty glossary (a CONTEXT.md with no term carrying an `_Avoid_:` line)
    // is worse than no glossary — flag it. null when there is no root CONTEXT.md
    // (a multi-context repo, or none yet): not-applicable, never a false `false`.
    emptyGlossary: contextMd
      ? !readContent(repoRoot, 'CONTEXT.md', unreadable).includes('_Avoid_:')
      : null,
  };
}

function surveyAdrs(repoRoot, unreadable) {
  const counts = Object.fromEntries(ADR_STATUSES.map((s) => [s, 0]));
  const proposed = [];
  for (const name of listDir(join(repoRoot, 'doc', 'adr')).sort()) {
    if (!ARTIFACT_FILE.test(name)) continue;
    const status = parseStatus(readContent(repoRoot, join('doc', 'adr', name), unreadable));
    if (status && status in counts) counts[status] += 1;
    if (status === 'proposed') proposed.push(slugOf(name));
  }
  return { counts, proposed };
}

function surveyTasks(repoRoot, unreadable) {
  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
  const active = [];
  const orphans = [];
  const specRefs = [];
  for (const name of listDir(join(repoRoot, 'doc', 'tasks')).sort()) {
    if (!ARTIFACT_FILE.test(name)) continue;
    const body = readContent(repoRoot, join('doc', 'tasks', name), unreadable);
    const status = parseStatus(body);
    const scopeRef = parseRef(body, 'Scope ref');
    if (status && status in counts) counts[status] += 1;
    const specRef = parseRef(body, 'Spec ref');
    if (status === 'in-progress' || status === 'blocked') {
      active.push({ slug: slugOf(name), status, specRef: specRef || null });
    }
    // An unfinished task needs a repository-local source anchor. `Scope ref`
    // is the current contract and `Spec ref` is compatible legacy evidence;
    // an external Board ref is supplementary only (ADR-0067). Completed
    // legacy tasks are history, not navigation findings.
    if (status !== 'done' && !scopeRef && !specRef) orphans.push(slugOf(name));
    if (specRef) specRefs.push({ slug: slugOf(name), number: artifactNumber(specRef) });
  }
  return { counts, active, orphans, specRefs };
}

function surveySpecs(repoRoot, taskSpecRefs, unreadable) {
  const specs = [];
  for (const name of listDir(join(repoRoot, 'doc', 'specs')).sort()) {
    if (!ARTIFACT_FILE.test(name)) continue;
    const status = parseStatus(readContent(repoRoot, join('doc', 'specs', name), unreadable));
    const number = artifactNumber(name);
    const taskCount = taskSpecRefs.filter((r) => r.number && r.number === number).length;
    specs.push({ slug: slugOf(name), status, taskCount });
  }
  return specs;
}

// `specCount` is the total number of specs. In the single-product layout the
// survey targets, every spec implements the one PRD, so an accepted PRD with
// `specCount: 0` is the stuck state. A multi-product repo (`productMap: true`)
// is body-enumerated, not counted here.
function surveyProduct(repoRoot, specCount, unreadable) {
  const prd = isFile(join(repoRoot, 'doc', 'product', 'PRD.md'));
  return {
    prd,
    productMap: isFile(join(repoRoot, 'doc', 'product', 'PRODUCT-MAP.md')),
    status: prd
      ? parseStatus(readContent(repoRoot, join('doc', 'product', 'PRD.md'), unreadable))
      : null,
    specCount,
  };
}

// A test harness is "wired" when any conventional signal is present: an npm
// `test` script, a Rust/Go module (whose toolchains always ship a test runner),
// a Python project manifest, or a populated top-level test directory.
function surveyTests(repoRoot, unreadable) {
  if (isFile(join(repoRoot, 'package.json'))) {
    const before = unreadable.length;
    const raw = readContent(repoRoot, 'package.json', unreadable);
    if (unreadable.length === before && raw.trim()) {
      try {
        const pkg = JSON.parse(raw);
        if (pkg.scripts && typeof pkg.scripts.test === 'string' && pkg.scripts.test.trim()) {
          return true;
        }
      } catch {
        unreadable.push({ path: 'package.json', code: 'INVALID_JSON' });
      }
    }
  }
  if (['Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py'].some((f) => isFile(join(repoRoot, f)))) {
    return true;
  }
  return ['test', 'tests'].some((d) =>
    listDir(join(repoRoot, d)).some(
      (n) =>
        n.endsWith('.py') ||
        n.endsWith('.js') ||
        n.endsWith('.ts') ||
        n.endsWith('.rs') ||
        n.endsWith('.go')
    )
  );
}

function surveyHooks(repoRoot) {
  if (isDir(join(repoRoot, '.husky'))) return true;
  if (['lefthook.yml', 'lefthook.yaml', '.pre-commit-config.yaml'].some((f) => isFile(join(repoRoot, f)))) {
    return true;
  }
  // A real (non-sample) hook installed under .git/hooks/.
  return listDir(join(repoRoot, '.git', 'hooks')).some((n) => !n.endsWith('.sample'));
}

function surveyCi(repoRoot) {
  if (
    isDir(join(repoRoot, '.github', 'workflows')) &&
    listDir(join(repoRoot, '.github', 'workflows')).length
  ) {
    return true;
  }
  return isFile(join(repoRoot, '.gitlab-ci.yml')) || isDir(join(repoRoot, '.circleci'));
}

/**
 * Read git facts via the CLI, degrading each to null on any failure (a non-git
 * tree, a missing `main`, a detached HEAD). GIT_DIR / GIT_WORK_TREE /
 * GIT_INDEX_FILE are stripped from the child environment so a linked worktree
 * cannot point these calls at the wrong repository — the observed task-0033
 * hazard, documented in AGENTS.md Gotchas. Every call is read-only.
 */
function surveyGit(repoRoot) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const git = (args) => {
    try {
      return execFileSync('git', args, {
        cwd: repoRoot,
        encoding: 'utf8',
        env,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      return null;
    }
  };
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const aheadRaw = git(['rev-list', '--count', 'main..HEAD']);
  const ahead = aheadRaw === null ? null : Number.parseInt(aheadRaw, 10);
  const porcelain = git(['status', '--porcelain']);
  return {
    branch: branch || null,
    aheadOfMain: Number.isInteger(ahead) ? ahead : null,
    dirty: porcelain === null ? null : porcelain.length > 0,
  };
}

/**
 * Build the full survey object. Exported so tests can exercise it in-process;
 * `main()` owns cwd resolution and printing.
 *
 * @param {{repoRoot: string}} opts
 */
export function surveyReport({ repoRoot }) {
  const unreadable = [];
  const { kitVersion } = surveyState(repoRoot, unreadable);
  const constitution = surveyConstitution(repoRoot);
  const tasks = surveyTasks(repoRoot, unreadable);
  const specs = surveySpecs(repoRoot, tasks.specRefs, unreadable);
  const specNumbers = new Set(specs.map((s) => artifactNumber(s.slug)).filter(Boolean));

  // Reciprocity, computed from the authoritative task→spec pointer (the task
  // `Spec ref`). A task pointing at a spec number that has no file is an orphan
  // task; an accepted/shipped spec with zero implementing tasks is a stuck spec.
  const orphanTasks = tasks.specRefs
    .filter((r) => r.number && !specNumbers.has(r.number))
    .map((r) => r.slug);
  const specsWithoutTasks = specs
    .filter((s) => (s.status === 'accepted' || s.status === 'shipped') && s.taskCount === 0)
    .map((s) => s.slug);

  // specRefs is an internal join key, not part of the reported contract.
  const { specRefs, ...tasksReport } = tasks;
  void specRefs;

  return {
    kitVersion,
    git: surveyGit(repoRoot),
    constitution,
    rootDocReferencesProduct: surveyRootDocReferencesProduct(
      repoRoot,
      constitution.operationalGuide,
      unreadable
    ),
    architecture: isFile(join(repoRoot, 'ARCHITECTURE.md')),
    design: isFile(join(repoRoot, 'DESIGN.md')),
    domain: surveyDomain(repoRoot, unreadable),
    product: surveyProduct(repoRoot, specs.length, unreadable),
    specs,
    adrs: surveyAdrs(repoRoot, unreadable),
    tasks: tasksReport,
    reciprocity: { specsWithoutTasks, orphanTasks },
    code: {
      tests: surveyTests(repoRoot, unreadable),
      hooks: surveyHooks(repoRoot),
      ci: surveyCi(repoRoot),
    },
    unreadable,
  };
}

function main() {
  console.log(JSON.stringify(surveyReport({ repoRoot: process.cwd() }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
