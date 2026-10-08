#!/usr/bin/env node
/**
 * Work-in-progress briefing (ADR-0090, task-0111, GROUND-0043). Run from the
 * repo root:
 *
 *   node <skill-base-dir>/scripts/briefing.mjs [--session <session-id>]
 *
 * Prints one JSON object for the agentic-session plugin's band and pane and
 * for /ad-brief; the plugin displays it and computes nothing itself.
 *
 *   - task: the active task, `{ slug, rule, status }`. The rule is stated, not
 *     inferred: the single `in-progress` task (`single-in-progress`); else,
 *     among unfinished tasks, the one the newest commit ahead of `main`
 *     touched (`newest-commit-ahead`); else null.
 *   - plan `{ done, open }`, acceptance and definitionOfDone `{ done, open }`
 *     (done as a count): the task's checkbox items.
 *   - deviations: Notes entries whose heading or text names a deviation or
 *     "beyond the ask", `{ heading, text }`.
 *   - approval: the Notes entry approving the plan, the commit that added it,
 *     the first commit ahead of `main` touching anything outside `doc/` and
 *     the agent hosts' configuration directories, and
 *     whether the approval preceded it (null when it cannot tell).
 *   - roadmap: `{ prdStatus, tasksDone, tasksTotal }` from the survey; null
 *     without `doc/product/PRD.md`.
 *   - gate: the session's receipt-gate shadow evidence (Task 0106),
 *     `{ lines, wouldBlock, last }`; null without `--session`.
 *   - unreadable: `{ path, code }` for every existing file it could not read
 *     or parse; cannotTell: the facts above that are null for lack of input.
 *
 * Zero dependencies, Node-only; every probe degrades instead of throwing.
 * Byte-identical in both host trees.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { surveyReport } from './survey.mjs';

const ARTIFACT_FILE = /^\d{4}-.*\.md$/;
const DEVIATION = /deviat|beyond the ask/i;
const APPROVED = /plan approved|approves? (?:this|the) plan/i;
// Paths whose change is not implementation: records, and the agent hosts'
// own configuration and install state.
const NOT_IMPLEMENTING = ['doc/', '.claude/', '.agents/', '.codex/', '.agentic/'];

// --- Reading ------------------------------------------------------------------

// A file's content, or null when absent. Any other read failure is recorded in
// `unreadable` (the survey's contract), never thrown.
function readContent(path, label, unreadable) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') unreadable.push({ path: label, code: error.code ?? 'unknown' });
    return null;
  }
}

// Read-only git, degrading to null. GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE
// are stripped so a linked worktree cannot redirect the calls (AGENTS.md).
function git(repoRoot, args) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
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
}

function readTasks(repoRoot, unreadable) {
  let names;
  try {
    names = readdirSync(join(repoRoot, 'doc', 'tasks'))
      .filter((name) => ARTIFACT_FILE.test(name))
      .sort();
  } catch {
    return [];
  }
  const tasks = [];
  for (const name of names) {
    const body = readContent(join(repoRoot, 'doc', 'tasks', name), `doc/tasks/${name}`, unreadable);
    if (body !== null)
      tasks.push({ slug: name.replace(/\.md$/, ''), body, status: parseStatus(body) });
  }
  return tasks;
}

// --- Task file parsing --------------------------------------------------------

function parseStatus(body) {
  const m = body.match(/^\*{0,2}Status:\*{0,2}[ \t]*([A-Za-z][A-Za-z-]*)/im);
  return m ? m[1].toLowerCase() : null;
}

// The lines under `## <heading>`, up to the next `## ` heading.
function section(body, heading) {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

function checkboxes(lines) {
  const done = [];
  const open = [];
  for (const line of lines) {
    const m = line.match(/^\s*- \[([ xX])\] (.*)$/);
    if (!m) continue;
    (m[1] === ' ' ? open : done).push(m[2].trim());
  }
  return { done, open };
}

function openItems(lines) {
  const { done, open } = checkboxes(lines);
  return { done: done.length, open };
}

// Notes entries, one per `### ` heading, with their text joined into one line.
function noteEntries(lines) {
  const entries = [];
  for (const line of lines) {
    if (line.startsWith('### ')) {
      entries.push({ heading: line.slice(4).trim(), lines: [] });
    } else if (entries.length) {
      entries[entries.length - 1].lines.push(line.trim());
    }
  }
  return entries.map(({ heading, lines: body }) => ({
    heading,
    text: body.filter(Boolean).join(' '),
  }));
}

// --- Facts --------------------------------------------------------------------

function activeTask(repoRoot, tasks) {
  const inProgress = tasks.filter((t) => t.status === 'in-progress');
  if (inProgress.length === 1) return { task: inProgress[0], rule: 'single-in-progress' };
  const open = new Map(tasks.filter((t) => t.status !== 'done').map((t) => [t.slug, t]));
  const touched = git(repoRoot, [
    'log',
    '--format=',
    '--name-only',
    'main..HEAD',
    '--',
    'doc/tasks',
  ]);
  for (const path of (touched ?? '').split('\n')) {
    const slug = path
      .trim()
      .replace(/^doc\/tasks\//, '')
      .replace(/\.md$/, '');
    if (open.has(slug)) return { task: open.get(slug), rule: 'newest-commit-ahead' };
  }
  return null;
}

// Commits ahead of main, oldest first, each with the paths it touched.
function commitsAhead(repoRoot) {
  const raw = git(repoRoot, ['log', '--reverse', '--format=%x00%H', '--name-only', 'main..HEAD']);
  if (raw === null) return null;
  return raw
    .split('\0')
    .filter(Boolean)
    .map((chunk) => {
      const [sha, ...paths] = chunk.split('\n').map((l) => l.trim());
      return { sha, paths: paths.filter(Boolean) };
    });
}

// An approval committed on main precedes every commit ahead of it; with no
// approval entry, any implementing commit is out of order.
function approval(repoRoot, slug, notes) {
  const entry = notes.find((n) => APPROVED.test(n.heading)) ?? null;
  const commits = commitsAhead(repoRoot);
  const implementing = commits?.findIndex((c) =>
    c.paths.some((p) => !NOT_IMPLEMENTING.some((prefix) => p.startsWith(prefix)))
  );
  const firstImplementing = implementing >= 0 ? commits[implementing].sha : null;
  const added = entry
    ? git(repoRoot, [
        'log',
        '--reverse',
        '--format=%H',
        `-S### ${entry.heading}`,
        '--',
        `doc/tasks/${slug}.md`,
      ])
    : null;
  const approvedIn = added ? added.split('\n')[0] : null;
  let precedes = null;
  if (commits && entry && approvedIn) {
    const at = commits.findIndex((c) => c.sha === approvedIn);
    precedes = firstImplementing === null || at === -1 || at < implementing;
  } else if (commits && !entry) {
    precedes = firstImplementing === null ? null : false;
  }
  return {
    entry: entry?.heading ?? null,
    approvedIn,
    firstImplementingCommit: firstImplementing,
    precedesFirstImplementingCommit: precedes,
  };
}

function roadmap(survey) {
  if (!survey.product.prd) return null;
  const counts = survey.tasks.counts;
  return {
    prdStatus: survey.product.status,
    tasksDone: counts.done,
    tasksTotal: Object.values(counts).reduce((sum, n) => sum + n, 0),
  };
}

// Read from the file sequence-gate.mjs appends to, by its directory and name
// rule; a line that is not a JSON object marks the file corrupt.
function gateEvidence(sessionId, env, unreadable) {
  const dir = env.AD_SEQUENCE_GATE_EVIDENCE_DIR || join(tmpdir(), 'agentic-sequence-gate');
  const file = `${String(sessionId).replace(/[^A-Za-z0-9._-]/g, '_')}.jsonl`;
  const raw = readContent(join(dir, file), file, unreadable) ?? '';
  const lines = [];
  let corrupt = false;
  for (const text of raw.split('\n')) {
    if (!text.trim()) continue;
    let line;
    try {
      line = JSON.parse(text);
    } catch {
      line = null;
    }
    if (line && typeof line === 'object' && !Array.isArray(line)) lines.push(line);
    else corrupt = true;
  }
  if (corrupt) unreadable.push({ path: file, code: 'INVALID_JSON' });
  const last = lines.at(-1);
  return {
    lines: lines.length,
    wouldBlock: lines.filter((l) => l.state === 'would-block').length,
    last: last ? { at: last.at, action: last.action, check: last.check, state: last.state } : null,
  };
}

// --- Report -------------------------------------------------------------------

/**
 * Build the briefing. Exported so tests and callers can run it in-process;
 * `main()` owns argument parsing and printing.
 *
 * @param {{repoRoot: string, sessionId?: string|null, env?: object}} opts
 */
export function briefingReport({ repoRoot, sessionId = null, env = process.env }) {
  const unreadable = [];
  const tasks = readTasks(repoRoot, unreadable);
  const survey = surveyReport({ repoRoot });
  for (const entry of survey.unreadable) {
    const path = entry.path.replace(/\\/g, '/');
    if (!unreadable.some((u) => u.path === path)) unreadable.push({ ...entry, path });
  }
  const progress = roadmap(survey);
  const gate = sessionId ? gateEvidence(sessionId, env, unreadable) : null;
  const chosen = activeTask(repoRoot, tasks);
  const active = chosen?.task ?? null;
  const notes = active ? noteEntries(section(active.body, 'Notes')) : [];
  return {
    task: active ? { slug: active.slug, rule: chosen.rule, status: active.status } : null,
    plan: active ? checkboxes(section(active.body, 'Plan')) : null,
    acceptance: active ? openItems(section(active.body, 'Acceptance Criteria')) : null,
    definitionOfDone: active ? openItems(section(active.body, 'Definition of Done')) : null,
    deviations: active
      ? notes.filter((n) => DEVIATION.test(n.heading) || DEVIATION.test(n.text))
      : null,
    approval: active ? approval(repoRoot, active.slug, notes) : null,
    roadmap: progress,
    gate,
    unreadable,
    cannotTell: [
      ...(active ? [] : ['task']),
      ...(progress ? [] : ['roadmap']),
      ...(gate ? [] : ['gate']),
    ],
  };
}

function main() {
  const at = process.argv.indexOf('--session');
  const sessionId = at === -1 ? null : (process.argv[at + 1] ?? null);
  console.log(JSON.stringify(briefingReport({ repoRoot: process.cwd(), sessionId }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
