import { normalizePath } from './shared.mjs';

const TOOL_ACTION_KINDS = new Set(['command', 'file_write']);

/**
 * The join between the artifact-validator gate's evidence lines and the trial
 * the live lane captured (Task 0084, Spec 0008 Scenario 7 as read by its open
 * question). Claude Code 2.1.227 serializes no `PostToolUse` hook record in
 * `stream-json`, so the join cannot anchor on a hook record in the stream; it
 * anchors on the write the hook fired for. Each evidence line, in sequence
 * order, is paired with the next unpaired `file_write` event of the same
 * path, in event order. The pairing is deterministic and needs no timestamp:
 * the gate fires once per governed write and appends one line per firing
 * (ADR-0083 decisions 4 and 5), so order plus path is the identity.
 *
 * A sidecar, not a receipt event kind: Spec 0008 keeps the receipt schema out
 * of scope and ADR-0083 decision 4 leaves that extension to the harness.
 */
function compareAt(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function joinGateEvidence({ trial, evidence }) {
  const writes = trial.events
    .filter((event) => event.kind === 'file_write')
    .map((event) => ({ seq: event.seq, path: normalizePath(event.path), paired: false }));
  const rows = [];
  const unjoined = [];
  const finalState = {};
  // `seq` restarts per evidence file (one file per host session), so two
  // files in one trial cannot be ordered by `seq` alone; the gate's `at`
  // timestamp orders across files and the reader's file-then-line order is
  // kept when a line has none.
  const ordered = evidence
    .map((line, index) => ({ line, index }))
    .sort((a, b) => compareAt(a.line.at, b.line.at) || a.index - b.index)
    .map((entry) => entry.line);
  for (const line of ordered) {
    if (typeof line.path !== 'string') {
      unjoined.push({ evidence_seq: line.seq ?? null, state: line.state, path: null });
      rows.push({ evidence_seq: line.seq ?? null, state: line.state, path: null, event_seq: null });
      continue;
    }
    const path = normalizePath(line.path);
    const write = writes.find((candidate) => !candidate.paired && candidate.path === path);
    if (write) write.paired = true;
    else unjoined.push({ evidence_seq: line.seq, state: line.state, path });
    rows.push({ evidence_seq: line.seq, state: line.state, path, event_seq: write?.seq ?? null });
    finalState[path] = line.state;
  }
  return {
    rows,
    unjoined_evidence: unjoined,
    ungoverned_writes: writes
      .filter((write) => !write.paired)
      .map((write) => ({ event_seq: write.seq, path: write.path })),
    final_state: finalState,
    complete: unjoined.length === 0,
  };
}

/**
 * The comparison numbers ADR-0083 decision 7 asks for, read from what the
 * host itself reported: the Claude Code `result` record carries wall-clock,
 * turns, and cost; the trial's events carry the tool actions. Nothing here is
 * asserted by the harness; a field the stream lacks is `null`.
 */
export function trialMetrics({ trial, stream }) {
  let result = null;
  for (const text of String(stream).split(/\r?\n/)) {
    if (text.trim() === '') continue;
    let record;
    try {
      record = JSON.parse(text);
    } catch {
      continue;
    }
    if (record.type === 'result') result = record;
  }
  // Tool actions are the host tool calls that ran (`command`, `file_write`);
  // routing, approval bookkeeping, and the terminal marker are events, not
  // actions, and are counted apart so the comparison does not overstate them.
  const events = {};
  for (const event of trial.events) events[event.kind] = (events[event.kind] ?? 0) + 1;
  const actions = Object.fromEntries(
    Object.entries(events).filter(([kind]) => TOOL_ACTION_KINDS.has(kind))
  );
  return {
    duration_ms: result?.duration_ms ?? null,
    num_turns: result?.num_turns ?? null,
    total_cost_usd: result?.total_cost_usd ?? null,
    tool_actions: actions,
    events,
    exit_state: trial.outcome?.exit_state ?? null,
  };
}
