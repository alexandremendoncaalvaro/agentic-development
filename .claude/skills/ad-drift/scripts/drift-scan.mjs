#!/usr/bin/env node
/**
 * Deterministic drift scan for /ad-drift (ADR-0057, P2.2). Run from the repo
 * root:
 *
 *   node <skill-base-dir>/scripts/drift-scan.mjs
 *
 * Prints a single JSON object with the seven mechanical drift checks the audit
 * used to re-derive as prose or inline `grep` every run: artifact numbering,
 * `Status:` validity, supersession-target existence, amendment-pair matching,
 * emoji in narrative docs, checkbox UI in definition docs / specs,
 * AGENTS-to-GUIDELINES reciprocity, and glossary drift. The
 * SKILL.md body reads this JSON and keeps the JUDGMENT as text — AGENTS.md /
 * ARCHITECTURE.md-vs-code conformance, business-context-first, scope
 * duplication, directory-as-index duplication, decoration cross-references,
 * orphan TODO / commented-out code, the amendment adoption suggestion, and the
 * state-projection contradiction check. That split is ADR-0057's agent-vs-script
 * boundary: mechanical checks are a low-freedom script, interpretation stays
 * high-freedom prose.
 *
 * Numbering nuance: this kit archives completed artifacts by hard-delete
 * (`/ad-archive`), so gaps in the NNNN sequence are EXPECTED and reported as
 * informational `gaps`, not drift. Only `duplicates` (two files sharing a
 * number) are unambiguous drift.
 *
 * Zero dependencies, Node-only (no POSIX shell assumed — Windows CI matrix),
 * mirroring `ad-audit/scripts/resolve-rules.mjs` and `ad-next/scripts/survey.mjs`.
 * Small filesystem/parse helpers are duplicated across those scripts on purpose:
 * ADR-0057 defers factoring a shared module to a later sub-decision, keeping
 * each script self-contained meanwhile. Every probe degrades rather than throws,
 * and per GUIDELINES.md §2.2 a content-read failure is surfaced in the top-level
 * `unreadable` array (`{path, code}`), never swallowed.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

// Pictographic emoji, regional-indicator flags, and the emoji variation
// selector — the same class test/skills.test.js bans across installed skills.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
const ARTIFACT_FILE = /^\d{4}-.*\.md$/;
const CHECKBOX = /^[ \t]*- \[[ xX]\]/;
const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const H2 = /^##[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

// Only the decision-record layers carry numbering/status/supersession drift
// checks. Tasks are intentionally excluded: the audit has no task-numbering or
// task-status category (tasks appear only under spec reciprocity, which stays
// judgment prose), so computing them here would emit facts nothing narrates.
const LAYERS = {
  adr: {
    dir: ['doc', 'adr'],
    statuses: ['proposed', 'accepted', 'deprecated', 'superseded'],
    supersede: 'ADR',
  },
  specs: {
    dir: ['doc', 'specs'],
    statuses: ['draft', 'accepted', 'shipped', 'superseded'],
    supersede: 'SPEC',
  },
};

// Narrative docs (Rule 3 bans emoji anywhere; the audit scans these).
const EMOJI_DOCS = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'ARCHITECTURE.md',
  'DESIGN.md',
  'GUIDELINES.md',
  'WORKFLOW.md',
  'CONTEXT.md',
  'CONTEXT-MAP.md',
];
// Definition-layer docs that must not carry checkbox tracking UI (ADR-0030 §1,
// Rule #9). Specs are added below; tasks are excluded — checkboxes are their
// legitimate tracking UI.
const DEFINITION_DOCS = [
  'AGENTS.md',
  'WORKFLOW.md',
  'ARCHITECTURE.md',
  'GUIDELINES.md',
  'CONTEXT.md',
];
const CONSTITUTION_POINTERS = [
  { section: 'Code Style', guidelinesSection: 2 },
  { section: 'Quality Gates', guidelinesSection: 8 },
  { section: 'Commit & PR Conventions', guidelinesSection: 10 },
  { section: 'Security & Privacy', guidelinesSection: 12 },
];

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function listDir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

// Read a repo-relative file. ENOENT (absent) returns '' silently — an existence
// condition, exempt per GUIDELINES.md §2.2. Any other read failure is pushed to
// `unreadable` so it surfaces, never swallowed.
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

// First status token, lowercased (`superseded by ADR-0002` → `superseded`).
// `[ \t]*` so a blank status line never captures the next line's word.
function parseStatus(body) {
  const m = body.match(/^\*{0,2}Status:\*{0,2}[ \t]*([A-Za-z][A-Za-z-]*)/im);
  return m ? m[1].toLowerCase() : null;
}

// Every bold-or-plain reference field value, excluding blank values and
// placeholders (opening with a backtick or angle bracket).
function parseRefs(body, label) {
  const re = new RegExp(`^\\*{0,2}${label}:\\*{0,2}[ \\t]*(.*)$`, 'gmi');
  return [...body.matchAll(re)]
    .map((match) => match[1].trim())
    .filter((value) => value !== '' && !value.startsWith('`') && !value.startsWith('<'));
}

function artifactNumber(text) {
  const m = String(text).match(/\d{4}/);
  return m ? m[0] : null;
}

function slugOf(filename) {
  return filename.replace(/\.md$/, '');
}

// Collapse repeated `{path, code}` entries (a file read by two checks records
// its failure twice) to one entry per pair, preserving first-seen order.
function dedupeUnreadable(entries) {
  const seen = new Set();
  return entries.filter((e) => {
    const key = `${e.path}\0${e.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function layerFiles(repoRoot, layer) {
  return listDir(join(repoRoot, ...layer.dir))
    .filter((n) => ARTIFACT_FILE.test(n))
    .sort();
}

// Numbering: duplicate NNNN (drift) and missing NNNN below the max (gaps —
// informational, expected under hard-delete archiving).
function scanNumbering(files) {
  const counts = new Map();
  for (const name of files) {
    const n = artifactNumber(name);
    if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([n]) => n)
    .sort();
  const ints = [...new Set([...counts.keys()].map((n) => Number.parseInt(n, 10)))].sort(
    (a, b) => a - b
  );
  const gaps = [];
  if (ints.length) {
    const present = new Set(ints);
    for (let i = 1; i < ints[ints.length - 1]; i += 1) {
      if (!present.has(i)) gaps.push(i);
    }
  }
  return { gaps, duplicates };
}

// One pass over a layer's files: status validity, supersession-target
// existence, and (adr only) the raw Amends / Amended-by edges for pairing.
function scanLayer(repoRoot, key, layer, unreadable) {
  const files = layerFiles(repoRoot, layer);
  const numbering = scanNumbering(files);
  const status = [];
  const supersession = [];
  const amends = [];
  const amendedBy = [];
  for (const name of files) {
    const before = unreadable.length;
    const body = readContent(repoRoot, join(...layer.dir, name), unreadable);
    if (unreadable.length > before) continue; // unreadable → recorded; skip content checks

    const st = parseStatus(body);
    if (!st || !layer.statuses.includes(st)) status.push({ slug: slugOf(name), status: st });

    if (layer.supersede) {
      const statusLine = (body.match(/^\*{0,2}Status:.*$/im) ?? [''])[0];
      if (/superseded by/i.test(statusLine)) {
        const m = statusLine.match(new RegExp(`${layer.supersede}-(\\d{4})`, 'i'));
        if (m && !files.some((f) => artifactNumber(f) === m[1])) {
          supersession.push({
            kind: key,
            from: slugOf(name),
            target: `${layer.supersede}-${m[1]}`,
            targetExists: false,
          });
        }
      }
    }

    if (key === 'adr') {
      const recordNum = artifactNumber(name);
      for (const value of parseRefs(body, 'Amends')) {
        amends.push({ slug: slugOf(name), recordNum, targetNum: artifactNumber(value), value });
      }
      for (const value of parseRefs(body, 'Amended by')) {
        amendedBy.push({ slug: slugOf(name), recordNum, targetNum: artifactNumber(value), value });
      }
    }
  }
  return { numbering, status, supersession, amends, amendedBy };
}

// A partial supersession is a header-field pair: `Amends: B` on A must be
// answered by `Amended by: A` on B (and vice versa). Report every declaration
// whose counterpart is missing — comparing relations, not filenames.
function pairAmendments(amends, amendedBy) {
  const findings = [];
  for (const e of amends) {
    if (!amendedBy.some((x) => x.recordNum === e.targetNum && x.targetNum === e.recordNum)) {
      findings.push({ record: e.slug, field: 'Amends', value: e.value });
    }
  }
  for (const e of amendedBy) {
    if (!amends.some((x) => x.recordNum === e.targetNum && x.targetNum === e.recordNum)) {
      findings.push({ record: e.slug, field: 'Amended by', value: e.value });
    }
  }
  return findings;
}

function scanEmoji(repoRoot, unreadable) {
  const findings = [];
  for (const doc of EMOJI_DOCS) {
    if (!isFile(join(repoRoot, doc))) continue;
    readContent(repoRoot, doc, unreadable)
      .split('\n')
      .forEach((line, i) => {
        if (EMOJI.test(line)) findings.push({ path: doc, line: i + 1 });
      });
  }
  return findings;
}

function scanCheckbox(repoRoot, unreadable) {
  const findings = [];
  const docs = [...DEFINITION_DOCS];
  for (const n of listDir(join(repoRoot, 'doc', 'product'))) {
    if (n.endsWith('.md')) docs.push(join('doc', 'product', n));
  }
  for (const n of layerFiles(repoRoot, LAYERS.specs)) docs.push(join('doc', 'specs', n));
  for (const doc of docs) {
    if (!isFile(join(repoRoot, doc))) continue;
    // Track the open fence's delimiter, not just "in a fence": a CommonMark
    // fence closes only on a line of the SAME character, length >= the opener,
    // so a shorter or different-character fence-shaped line inside a block does
    // not toggle the state (naive toggling mis-parses nested/mixed fences).
    let fence = null;
    readContent(repoRoot, doc, unreadable)
      .split('\n')
      .forEach((line, i) => {
        const m = line.match(FENCE);
        if (m) {
          const char = m[1][0];
          const len = m[1].length;
          if (fence === null) fence = { char, len };
          else if (char === fence.char && len >= fence.len) fence = null;
          return;
        }
        if (fence === null && CHECKBOX.test(line)) findings.push({ path: doc, line: i + 1 });
      });
  }
  return findings;
}

function sectionRange(lines, section) {
  let fence = null;
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const fenceMatch = lines[index].match(FENCE);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (fence === null) fence = { char, length };
      else if (char === fence.char && length >= fence.length) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const match = lines[index].match(H2);
    if (!match) continue;
    if (start !== -1) return { start, end: index };
    if (match[1].toLowerCase() === section.toLowerCase()) start = index;
  }
  return start === -1 ? null : { start, end: lines.length };
}

function hasGuidelinesPointer(body, guidelinesSection) {
  const pointer = new RegExp(`GUIDELINES\\.md[^\\n]*§\\s*${guidelinesSection}\\b`, 'i');
  let fence = null;
  for (const line of body.split('\n')) {
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (fence === null) fence = { char, length };
      else if (char === fence.char && length >= fence.length) fence = null;
      continue;
    }
    if (fence === null && pointer.test(line)) return true;
  }
  return false;
}

function scanConstitutionReciprocity(repoRoot, unreadable) {
  const report = { applicable: false, duplicateSections: [] };
  if (!isFile(join(repoRoot, 'AGENTS.md')) || !isFile(join(repoRoot, 'GUIDELINES.md'))) {
    return report;
  }

  const before = unreadable.length;
  const agents = readContent(repoRoot, 'AGENTS.md', unreadable);
  readContent(repoRoot, 'GUIDELINES.md', unreadable);
  if (unreadable.length > before) return report;

  report.applicable = true;
  const lines = agents.split('\n');
  for (const mapping of CONSTITUTION_POINTERS) {
    const range = sectionRange(lines, mapping.section);
    if (range === null) continue;
    const body = lines.slice(range.start, range.end).join('\n');
    if (!hasGuidelinesPointer(body, mapping.guidelinesSection)) {
      report.duplicateSections.push({
        section: mapping.section,
        guidelinesSection: mapping.guidelinesSection,
        line: range.start + 1,
      });
    }
  }
  return report;
}

// --- Glossary drift (task 0125) ---------------------------------------------
// Facts only, advisory: aliases a glossary says to avoid that tracked code
// still uses, and canonical terms no tracked file uses outside the glossary.
// A single-word alias is matched only when the glossary backticks it, since a
// common word ("tone") would otherwise match ordinary prose.

const GLOSSARY_FILE_LIMIT = 1024 * 1024;
const ALIAS_FILE_SAMPLE = 5;

function trackedFiles(repoRoot) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8', env });
  if (result.status !== 0) return null;
  return result.stdout.split('\0').filter(Boolean);
}

// The glossary files: the tracked per-context files a CONTEXT-MAP.md links
// (angle brackets, titles, anchors and backslashes accepted), else the root
// CONTEXT.md. A link that resolves to no tracked file, or outside the
// repository, is named in `unresolved`; when none resolves, the root
// glossary is read instead.
function glossaryFiles(repoRoot, tracked, unreadable) {
  const root = tracked.has('CONTEXT.md') ? ['CONTEXT.md'] : [];
  const map = readContent(repoRoot, 'CONTEXT-MAP.md', unreadable);
  if (!map) return { contexts: root, unresolved: null };
  const targets = [...map.matchAll(/\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)|`([^`\s]+)`/g)]
    .map((m) => (m[1] ?? m[2]).replace(/[#?].*$/, '').replace(/\\/g, '/'))
    .filter((target) => /(^|\/)CONTEXT\.md$/.test(target));
  const contexts = [];
  const unresolved = [];
  for (const target of [...new Set(targets)]) {
    const path = posix.normalize(target);
    if (tracked.has(path) && !path.startsWith('..') && !path.startsWith('/')) contexts.push(path);
    else unresolved.push(target);
  }
  return { contexts: contexts.length > 0 ? contexts.sort() : root, unresolved };
}

function glossaryTerms(text) {
  const terms = [];
  for (const block of text.split(/^### /m).slice(1)) {
    const term = block.split('\n', 1)[0].trim();
    // An alias is a quoted or backticked item outside the parenthetical that
    // explains it; names quoted inside the explanation are not aliases.
    const avoid = (block.match(/^_Avoid_:(.*)$/m)?.[1] ?? '').replace(/\([^)]*\)/g, '');
    const aliases = [];
    for (const m of avoid.matchAll(/["\u201c]([^"\u201d]+)["\u201d]|`([^`]+)`/g)) {
      const alias = (m[1] ?? m[2]).trim();
      if (m[2] !== undefined || /\s/.test(alias)) aliases.push(alias);
    }
    terms.push({ term, aliases });
  }
  return terms;
}

// The spellings a phrase takes in prose and code: spaced, kebab, snake and
// joined (camelCase and PascalCase match the joined form case-insensitively).
function phrasePattern(phrase) {
  const words = phrase
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![a-z0-9])${words.join('[\\s_-]?')}(?![a-z0-9])`, 'i');
}

function scanGlossary(repoRoot, unreadable) {
  const files = trackedFiles(repoRoot);
  if (files === null) {
    const contexts = isFile(join(repoRoot, 'CONTEXT.md')) ? ['CONTEXT.md'] : [];
    const result = { contexts, aliasesInCode: [], unusedTerms: [] };
    return contexts.length > 0 ? { ...result, skipped: 'not a git repository' } : result;
  }
  const { contexts, unresolved } = glossaryFiles(repoRoot, new Set(files), unreadable);
  const base = unresolved === null ? {} : { unresolvedLinks: unresolved };
  if (contexts.length === 0) return { contexts: [], aliasesInCode: [], unusedTerms: [], ...base };
  // Byte-identical copies (an installed mirror of a source tree) count once.
  const seen = new Set();
  const texts = [];
  for (const path of files) {
    if (contexts.includes(path) || path === 'CONTEXT-MAP.md') continue;
    try {
      if (statSync(join(repoRoot, path)).size > GLOSSARY_FILE_LIMIT) continue;
    } catch {
      continue;
    }
    const text = readContent(repoRoot, path, unreadable);
    if (text.includes('\0') || seen.has(text)) continue;
    seen.add(text);
    texts.push({ path, text, code: !/\.(md|markdown)$/i.test(path) });
  }
  const aliasesInCode = [];
  const unusedTerms = [];
  for (const context of contexts) {
    for (const { term, aliases } of glossaryTerms(readContent(repoRoot, context, unreadable))) {
      const termPattern = phrasePattern(term);
      if (!texts.some(({ text }) => termPattern.test(text))) unusedTerms.push({ context, term });
      for (const alias of aliases) {
        const pattern = phrasePattern(alias);
        const hits = texts
          .filter(({ code, text }) => code && pattern.test(text))
          .map((t) => t.path);
        if (hits.length > 0) {
          aliasesInCode.push({
            context,
            term,
            alias,
            count: hits.length,
            files: hits.sort().slice(0, ALIAS_FILE_SAMPLE),
          });
        }
      }
    }
  }
  return { contexts, aliasesInCode, unusedTerms, ...base };
}

/**
 * Build the full drift-scan object. Exported so tests can exercise it
 * in-process; `main()` owns cwd resolution and printing.
 *
 * @param {{repoRoot: string}} opts
 */
export function scanReport({ repoRoot }) {
  const unreadable = [];
  const adr = scanLayer(repoRoot, 'adr', LAYERS.adr, unreadable);
  const specs = scanLayer(repoRoot, 'specs', LAYERS.specs, unreadable);
  const report = {
    numbering: { adr: adr.numbering, specs: specs.numbering },
    status: { adr: adr.status, specs: specs.status },
    supersession: [...adr.supersession, ...specs.supersession],
    amendmentPairs: pairAmendments(adr.amends, adr.amendedBy),
    emoji: scanEmoji(repoRoot, unreadable),
    checkbox: scanCheckbox(repoRoot, unreadable),
    constitutionReciprocity: scanConstitutionReciprocity(repoRoot, unreadable),
    glossary: scanGlossary(repoRoot, unreadable),
    // A file read by more than one check (e.g. a spec, read for status and again
    // for checkbox) records once per failed read; collapse to one entry per
    // (path, code) so a caller narrating "N unreadable files" does not over-count.
    unreadable: dedupeUnreadable(unreadable),
  };
  return report;
}

function main() {
  console.log(JSON.stringify(scanReport({ repoRoot: process.cwd() }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
