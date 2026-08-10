#!/usr/bin/env node
/**
 * Terminal-artifact discovery for /ad-archive (ADR-0057, P2.3). Run from the
 * repo root:
 *
 *   node <skill-base-dir>/scripts/find-terminal.mjs
 *
 * Prints a single JSON object listing the artifacts whose decision-record
 * lifecycle is over and are therefore hard-delete candidates: tasks
 * `Status: done`, specs `Status: shipped`, PRDs `Status: superseded`, and ADRs
 * `Status: superseded by ADR-NNNN` or `deprecated`. Each candidate carries its
 * `path`, `slug`, `status`, `created` date, and `title` so the SKILL.md body
 * can render the slate without re-parsing frontmatter.
 *
 * This is Step 1 (discovery) only — the JUDGMENT and the ACTION stay with the
 * skill: `Status: accepted` ADRs are deliberately NOT candidates (they require
 * the body's absorption-proof gate), user-named legacy plan docs have no
 * `Status:` field and are the body's call, and the `git rm` itself is the
 * skill's confirmed action, never this script's. That is ADR-0057's
 * agent-vs-script boundary: deterministic discovery is a low-freedom script, the
 * removal decision stays high-freedom and human-gated.
 *
 * Zero dependencies, Node-only, mirroring the sibling scripts. Every probe
 * degrades rather than throws, and per GUIDELINES.md §2.2 a content-read failure
 * is surfaced in `unreadable` (`{path, code}`), never swallowed — an unreadable
 * file is never silently treated as a candidate.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ARTIFACT_FILE = /^\d{4}-.*\.md$/;

function listDir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

// ENOENT (absent) → '' silently (existence condition, exempt per GUIDELINES
// §2.2); any other read failure is surfaced in `unreadable`, never swallowed.
function readContent(repoRoot, rel, unreadable) {
  try {
    return readFileSync(join(repoRoot, rel), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') unreadable.push({ path: rel, code: error.code ?? 'unknown' });
    return '';
  }
}

// First status token, lowercased (`superseded by ADR-0027` → `superseded`).
function parseStatus(body) {
  const m = body.match(/^\*{0,2}Status:\*{0,2}[ \t]*([A-Za-z][A-Za-z-]*)/mi);
  return m ? m[1].toLowerCase() : null;
}

// The artifact's creation date — `Created:` (specs / PRDs) or `Date:` (ADRs /
// tasks), bold or plain — or null.
function parseCreated(body) {
  const m = body.match(/^\*{0,2}(?:Created|Date):\*{0,2}[ \t]*([0-9]{4}-[0-9]{2}-[0-9]{2})/mi);
  return m ? m[1] : null;
}

// The descriptive title from the H1, stripped of a leading `type-NNNN:` /
// `type NNNN:` prefix (e.g. `task-0001: Apply the kit` → `Apply the kit`).
function parseTitle(body) {
  const m = body.match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (!m) return null;
  // Strip a leading artifact-type prefix — `task-0001:` / `ADR-0019:` /
  // `Task \`0001\`:` (optional backticks around the number). Anchored to the
  // known type words so a real title like `Fix 500: ...` is NOT mis-stripped.
  return m[1].replace(/^(?:task|adr|spec|prd)[-\s`]*\d{3,4}`?[ \t]*:[ \t]*/i, '').trim() || m[1].trim();
}

// The supersession target `ADR-NNNN` declared in the Status line, or null.
function supersededTarget(body) {
  const statusLine = (body.match(/^\*{0,2}Status:.*$/mi) ?? [''])[0];
  const m = statusLine.match(/superseded by\s+(ADR-\d{4})/i);
  return m ? m[1].toUpperCase() : null;
}

function slugOf(filename) {
  return filename.replace(/\.md$/, '');
}

// Read a candidate's frontmatter, or null when the file could not be read (the
// failure is recorded in `unreadable` and the caller skips it).
function readCandidate(repoRoot, rel, unreadable) {
  const before = unreadable.length;
  const body = readContent(repoRoot, rel, unreadable);
  if (unreadable.length > before) return null;
  return body;
}

// Terminal artifacts in a NNNN-numbered layer whose status is in `terminal`.
function terminalIn(repoRoot, dir, terminal, unreadable) {
  const out = [];
  for (const name of listDir(join(repoRoot, ...dir)).filter((n) => ARTIFACT_FILE.test(n)).sort()) {
    const rel = join(...dir, name);
    const body = readCandidate(repoRoot, rel, unreadable);
    if (body === null) continue;
    const status = parseStatus(body);
    if (!terminal.includes(status)) continue;
    const entry = {
      path: rel,
      slug: slugOf(name),
      status,
      created: parseCreated(body),
      title: parseTitle(body),
    };
    if (dir[dir.length - 1] === 'adr') {
      entry.supersededBy = status === 'superseded' ? supersededTarget(body) : null;
    }
    out.push(entry);
  }
  return out;
}

// PRDs: `doc/product/PRD.md` (single) or `doc/product/<slug>.md` (multi);
// the PRODUCT-MAP index is not itself an archivable record.
function terminalPrds(repoRoot, unreadable) {
  const out = [];
  for (const name of listDir(join(repoRoot, 'doc', 'product')).filter((n) => n.endsWith('.md')).sort()) {
    if (name === 'PRODUCT-MAP.md') continue;
    const rel = join('doc', 'product', name);
    const body = readCandidate(repoRoot, rel, unreadable);
    if (body === null) continue;
    if (parseStatus(body) !== 'superseded') continue;
    out.push({
      path: rel,
      slug: slugOf(name),
      status: 'superseded',
      created: parseCreated(body),
      title: parseTitle(body),
    });
  }
  return out;
}

/**
 * Build the candidate object. Exported so tests can exercise it in-process;
 * `main()` owns cwd resolution and printing.
 *
 * @param {{repoRoot: string}} opts
 */
export function findTerminal({ repoRoot }) {
  const unreadable = [];
  return {
    tasks: terminalIn(repoRoot, ['doc', 'tasks'], ['done'], unreadable),
    specs: terminalIn(repoRoot, ['doc', 'specs'], ['shipped'], unreadable),
    prds: terminalPrds(repoRoot, unreadable),
    // Accepted ADRs are excluded — they require the body's absorption gate.
    adrs: terminalIn(repoRoot, ['doc', 'adr'], ['superseded', 'deprecated'], unreadable),
    unreadable,
  };
}

function main() {
  console.log(JSON.stringify(findTerminal({ repoRoot: process.cwd() }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
