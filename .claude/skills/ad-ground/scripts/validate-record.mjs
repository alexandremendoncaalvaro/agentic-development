#!/usr/bin/env node
/**
 * Validate the durable evidence receipt written by /ad-ground (ADR-0070).
 *
 * The checker is intentionally offline. It proves that a decision maps every
 * load-bearing claim to registered, inspectable sources; an auditor still
 * reopens the cited source to verify its substance. Keeping that distinction
 * explicit prevents structural validation from being mistaken for truth.
 *
 * Run from the consumer repository root:
 *
 *   node <skill-base-dir>/scripts/validate-record.mjs \
 *     doc/research/NNNN-ground-<slug>.md
 *
 * Content-read failures are reported in `unreadable`, never swallowed
 * (GUIDELINES.md §2.2).
 */

import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const RECORD_PATH = /^doc\/research\/(\d{4})-ground-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const ACCESS_PROVENANCE = /\(accessed \d{4}-\d{2}-\d{2} via [^)]+\)(?:[.!])?\s*$/;
const REQUIRED_METADATA = ['Status', 'Decision', 'Decision ref', 'Confidence'];
const REQUIRED_HEADINGS = [
  'Decision and confidence',
  'Evidence',
  'Source register',
  'Limitations and reversal',
  'Audit path',
];

// A message names the line that satisfies the rule, not only the rule: the
// artifact gate (Spec 0008 R3) returns these strings to a model that may not
// be able to read the template, and the pilot showed it never converges on
// the register and claim shapes without them (task-0086).
const ACCESS_SHAPE = '(accessed <YYYY-MM-DD> via <method>)';
const STRENGTH_SHAPE = '"**Strength:** <High | Medium | Low | Very-low>"';
const STAKED_STRENGTH_SHAPE = '"**Strength:** <High | Medium | Low | Very-low | design choice>"';
const TIER_SHAPE = '"**Tier:** <Measurement | Primary | Secondary | Single | Opinion>"';
const STAKES_SHAPE = '"<low | medium | high> × <reversible | irreversible>"';

// Task 0123, WORKFLOW §17: each evidence tier starts at a grade; a claim
// graded above its start states why on an `Upgrade:` line.
const GRADES = ['Very-low', 'Low', 'Medium', 'High'];
const TIER_START = {
  Measurement: 'High',
  Primary: 'Medium',
  Secondary: 'Low',
  Single: 'Low',
  Opinion: 'Very-low',
};
const STAKES = /^(low|medium|high)\s*[×x]\s*(reversible|irreversible)$/i;
const PROVENANCE_SHAPE = '"**Provenance:** <A1, B1, C1, D1>"';

function sourceShape(group) {
  return `add a line shaped "- **${group}1:** <citation> ${ACCESS_SHAPE}" under "## Source register"`;
}

function sourceLine(id) {
  return `"- **${id}:** <citation> ${ACCESS_SHAPE}" under "## Source register"`;
}

function noProvenance(id) {
  return `${id} has no provenance: add a line ${PROVENANCE_SHAPE} naming registered source ids under its heading`;
}

function titleShape(number) {
  return `the first line is "# GROUND-${number}: <short implementation decision>"`;
}

function normalizedPath(value) {
  return value.replaceAll('\\', '/');
}

function section(body, heading) {
  const marker = `## ${heading}\n`;
  const start = body.indexOf(marker);
  if (start === -1) return null;
  const contentStart = start + marker.length;
  const end = body.indexOf('\n## ', contentStart);
  return body.slice(contentStart, end === -1 ? body.length : end);
}

function metadata(body, label) {
  const match = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm').exec(body);
  return match?.[1].trim() ?? null;
}

function parseSources(body, errors) {
  const sourceSection = section(body, 'Source register');
  if (sourceSection === null) return { ids: new Set(), counts: { A: 0, B: 0, C: 0, D: 0 } };

  const ids = new Set();
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  const sourcePattern = /^- \*\*([ABCD]\d+):\*\*\s*(.+)$/gm;
  let match;
  while ((match = sourcePattern.exec(sourceSection)) !== null) {
    const [, id, detail] = match;
    if (ids.has(id)) {
      errors.push(`duplicate source ${id}`);
      continue;
    }
    if (!detail.trim()) {
      errors.push(`${id} has no source detail: write it as ${sourceLine(id)}`);
      continue;
    }
    if (!ACCESS_PROVENANCE.test(detail)) {
      errors.push(`${id} has no access date and method: end its line with "${ACCESS_SHAPE}"`);
    }
    ids.add(id);
    counts[id[0]] += 1;
  }

  for (const group of Object.keys(counts)) {
    if (counts[group] === 0)
      errors.push(`source register has no ${group} source: ${sourceShape(group)}`);
  }
  return { ids, counts };
}

function stakesOf(body, errors, warnings) {
  const value = metadata(body, 'Stakes');
  if (value === null) {
    warnings.push(
      `no Stakes line: add "**Stakes:** ${STAKES_SHAPE.slice(1, -1)}" under the title to grade claims from their tier (WORKFLOW §17)`
    );
    return null;
  }
  const match = STAKES.exec(value);
  if (!match) {
    errors.push(`Stakes must be ${STAKES_SHAPE}`);
    return null;
  }
  return { short: match[1].toLowerCase() === 'low' && match[2].toLowerCase() === 'reversible' };
}

// The tier rules apply only to a record that names its stakes.
function checkTier(id, claim, stakes, errors) {
  const tier = metadata(claim, 'Tier');
  const strength = metadata(claim, 'Strength');
  if (tier === null) {
    if (!stakes.short || strength !== null)
      errors.push(`${id} has no tier: add a line ${TIER_SHAPE} under its heading`);
    return;
  }
  if (!(tier in TIER_START)) {
    errors.push(`${id} has an unknown tier: write ${TIER_SHAPE}`);
    return;
  }
  if (strength === null || strength === 'design choice') return;
  const start = TIER_START[tier];
  if (GRADES.indexOf(strength) > GRADES.indexOf(start) && metadata(claim, 'Upgrade') === null) {
    errors.push(
      `${id} is graded ${strength} above its ${tier} start (${start}): add a line "**Upgrade:** <reason>" or lower the strength`
    );
  }
}

function parseClaims(body, sourceIds, errors, stakes = null) {
  const evidence = section(body, 'Evidence');
  if (evidence === null) return [];

  const starts = [...evidence.matchAll(/^### (E\d+) — .+$/gm)];
  if (starts.length === 0) {
    errors.push(
      'evidence has no claim: add a heading shaped "### E1 — <claim>" under "## Evidence" ' +
        `followed by ${STRENGTH_SHAPE} and ${PROVENANCE_SHAPE} lines`
    );
    return [];
  }

  const claims = [];
  const seen = new Set();
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const id = start[1];
    const end = starts[index + 1]?.index ?? evidence.length;
    const claim = evidence.slice(start.index, end);
    if (seen.has(id)) {
      errors.push(`duplicate claim ${id}`);
      continue;
    }
    seen.add(id);

    const strengthOk = /^\*\*Strength:\*\*\s*(High|Medium|Low|Very-low)$/m.test(claim);
    const designChoice = stakes !== null && metadata(claim, 'Strength') === 'design choice';
    const optional = stakes?.short && metadata(claim, 'Strength') === null;
    if (!strengthOk && !designChoice && !optional) {
      const shape = stakes === null ? STRENGTH_SHAPE : STAKED_STRENGTH_SHAPE;
      errors.push(`${id} has no valid strength: add a line ${shape} under its heading`);
    }
    if (stakes !== null) checkTier(id, claim, stakes, errors);
    const provenance = metadata(claim, 'Provenance');
    if (!provenance) {
      errors.push(noProvenance(id));
      claims.push({ id, provenance: [] });
      continue;
    }
    const references = provenance
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (references.length === 0) errors.push(noProvenance(id));
    for (const source of references) {
      if (!sourceIds.has(source)) {
        errors.push(
          `${id} references unknown source ${source}: register it as ${sourceLine(source)} or cite a registered id`
        );
      }
    }
    claims.push({ id, provenance: references });
  }
  return claims;
}

const requested = process.argv[2];
const unreadable = [];
const errors = [];
const warnings = [];
const cwd = process.cwd();
const record = requested === undefined ? null : normalizedPath(requested);

if (!record) {
  errors.push('record path is required');
} else if (!RECORD_PATH.test(record)) {
  errors.push('record must be a doc/research/NNNN-ground-<slug>.md path');
}

let body = null;
if (record && RECORD_PATH.test(record)) {
  const target = resolve(cwd, record);
  const targetRelative = relative(cwd, target);
  if (targetRelative === '..' || targetRelative.startsWith(`..${sep}`)) {
    errors.push('record must stay inside the current repository');
  } else {
    try {
      body = readFileSync(target, 'utf8');
    } catch (error) {
      unreadable.push({ path: record, code: error.code ?? 'unknown' });
    }
  }
}

let sources = { A: 0, B: 0, C: 0, D: 0 };
let claims = [];
if (body !== null) {
  const number = record.match(RECORD_PATH)[1];
  const title = /^# GROUND-(\d{4}): .+$/m.exec(body);
  if (!title) {
    errors.push(`record title must be GROUND-NNNN: ${titleShape(number)}`);
  } else if (title[1] !== number) {
    errors.push(`record title number must match filename: ${titleShape(number)}`);
  }
  for (const label of REQUIRED_METADATA) {
    if (!metadata(body, label)) {
      errors.push(`missing ${label} metadata: add a line "**${label}:** <value>" under the title`);
    }
  }
  if (metadata(body, 'Status') && metadata(body, 'Status') !== 'recorded') {
    errors.push('Status must be recorded: write "**Status:** recorded"');
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (section(body, heading) === null) {
      errors.push(`missing ${heading} section: add a "## ${heading}" heading`);
    }
  }
  const parsedSources = parseSources(body, errors);
  sources = parsedSources.counts;
  const stakes = stakesOf(body, errors, warnings);
  claims = parseClaims(body, parsedSources.ids, errors, stakes);
}

console.log(
  JSON.stringify(
    {
      cwd,
      record,
      valid: errors.length === 0 && unreadable.length === 0,
      sources,
      claims,
      errors,
      warnings,
      unreadable,
    },
    null,
    2
  )
);
