// Regression guard for Task 0006 / ADR-0005.
// Asserts the bootstrap prompt emitted by `agentic init` does not bundle
// universal agent behavior, follows the scan-first pattern in brownfield,
// stays interview-only in greenfield, and stays non-destructive in audit.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'agentic.js');

function run(args) {
  return execSync(`node ${BIN} ${args}`, { encoding: 'utf8' });
}

const cases = ['greenfield', 'brownfield', 'audit'];

const INTERVIEW_BY_SECTION = /interview\s+(me|each|by|section|one\s+section)/i;
const LINE_CAP = /(≤|<=|under|below|at most|no more than)\s*150\s*lines/i;

for (const mode of cases) {
  const output = run(`init --stdout --mode ${mode}`);

  // ADR-0005 — universal agent behavior never inlined into AGENTS.md output.
  // Heading-style matches catch the actual section, not the negative reference
  // in instructions.
  assert.ok(
    !/^#+\s*Universal Agent Behavior\b/m.test(output),
    `[${mode}] bootstrap prompt must not contain a "Universal Agent Behavior" section heading — moved to agentic-philosophy skill per ADR-0005`
  );

  assert.ok(
    !/^#+\s*(Think Before Coding|Ground Before Coding|Surgical Changes|Goal-Driven Execution|Verify Before Claiming Done)\b/m.test(
      output
    ),
    `[${mode}] bootstrap prompt must not inline agents-general.md section headings — moved to agentic-philosophy skill per ADR-0005`
  );

  // Task 0006 — interview-by-section anti-pattern. Catches the original
  // wording plus common rephrasings ("interview each", "interview by section").
  assert.ok(
    !INTERVIEW_BY_SECTION.test(output),
    `[${mode}] bootstrap prompt must not use the interview-by-section anti-pattern — replaced with scan-first per Task 0006`
  );
}

// Brownfield — full scan-first contract.
{
  const output = run('init --stdout --mode brownfield');

  assert.ok(
    /Step 1 — Scan/.test(output),
    '[brownfield] prompt must include "Step 1 — Scan" instruction'
  );
  assert.ok(
    /Show me only the gaps/.test(output),
    '[brownfield] prompt must instruct the agent to surface only gaps, not interview every section'
  );
  assert.ok(
    LINE_CAP.test(output),
    '[brownfield] prompt must cap the produced AGENTS.md at 150 lines'
  );
  assert.ok(
    /agentic-philosophy/.test(output),
    '[brownfield] prompt must point at the agentic-philosophy skill instead of inlining universal behavior'
  );
}

// Greenfield — interview-by-placeholder is correct (no code to scan), but
// must not promise a scan step it cannot deliver, and must keep the
// 150-line cap and the agentic-philosophy pointer.
{
  const output = run('init --stdout --mode greenfield');

  assert.ok(
    !/Step 1 — Scan/.test(output),
    '[greenfield] prompt must not advertise a "Step 1 — Scan" — the repo is empty'
  );
  assert.ok(
    LINE_CAP.test(output),
    '[greenfield] prompt must cap the produced AGENTS.md at 150 lines'
  );
  assert.ok(
    /agentic-philosophy/.test(output),
    '[greenfield] prompt must point at the agentic-philosophy skill instead of inlining universal behavior'
  );
  assert.ok(
    /Do not invent|do not invent|<TODO>/.test(output),
    '[greenfield] prompt must keep the "do not invent values" rule — unknowns marked <TODO>'
  );
}

// Audit — must NOT instruct the agent to write or rewrite AGENTS.md.
{
  const output = run('init --stdout --mode audit');

  assert.ok(
    !/On my confirmation, write the file/i.test(output),
    '[audit] prompt must not instruct the agent to write the file — audit is read-only per Task 0006 / mode contract'
  );
  assert.ok(
    !/On my confirmation, write `AGENTS\.md`/i.test(output),
    '[audit] prompt must not instruct the agent to write AGENTS.md — audit is read-only per Task 0006 / mode contract'
  );
  assert.ok(
    /[Dd]o not rewrite/.test(output),
    '[audit] prompt must explicitly tell the agent not to rewrite AGENTS.md'
  );
  assert.ok(
    /list of disagreements|drift/i.test(output),
    '[audit] prompt must produce a drift / disagreements list as output'
  );
}

console.log('init-output: OK');
