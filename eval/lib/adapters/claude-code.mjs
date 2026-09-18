import {
  countUnmapped,
  createTrial,
  finishTrial,
  parseJsonLines,
  pushDerivedEvents,
  pushEvent,
  requireString,
  trialPath,
} from './common.mjs';

/**
 * Claude Code `stream-json` adapter (ADR-0080 item 10, GROUND-0025 E1).
 * Reads the lines `claude -p --output-format stream-json --verbose` prints
 * and normalizes them into one trial. Nothing is spawned here.
 */

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function toolUses(record) {
  const content = record.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((block) => block?.type === 'tool_use');
}

function nativeOf(record, line, extra = {}) {
  return {
    line,
    type: record.type,
    parent_tool_use_id: record.parent_tool_use_id ?? null,
    ...extra,
  };
}

// The denial message names the tool call by id and carries no input, so the
// denied action is read from the tool_use block it refers to (GROUND-0025 E1).
function deniedToolUses(records) {
  const denials = new Map();
  for (const { line, record } of records) {
    if (record.type !== 'system' || record.subtype !== 'permission_denied') continue;
    denials.set(record.tool_use_id, {
      denied_at_line: line,
      decision_reason_type: record.decision_reason_type ?? null,
      decision_reason: record.decision_reason ?? null,
    });
  }
  return denials;
}

// The event a tool call maps to, or null when the vocabulary has no kind for
// the tool. `action` is what a denial of the call refers to.
function eventOf(block, line, fixtureRoot) {
  const where = `stream line ${line}: ${block.name} tool_use ${block.id}`;
  if (block.name === 'Skill') {
    const skill = requireString(block.input?.skill, where, 'skill name');
    return { event: { kind: 'skill_invoked', skill }, action: `Skill ${skill}` };
  }
  if (block.name === 'Bash') {
    const command = requireString(block.input?.command, where, 'command');
    return { event: { kind: 'command', command }, action: command };
  }
  if (WRITE_TOOLS.has(block.name)) {
    const raw = requireString(block.input?.file_path ?? block.input?.notebook_path, where, 'path');
    const path = trialPath(raw, fixtureRoot);
    return { event: { kind: 'file_write', path }, action: path };
  }
  return { event: null, action: block.name };
}

// A denied call never ran, whatever the tool: it is an approval denial, not
// the event the call would have produced.
function pushToolUse(trial, block, record, line, fixtureRoot, denials) {
  const native = nativeOf(record, line, { tool_use_id: block.id, tool: block.name });
  const { event, action } = eventOf(block, line, fixtureRoot);
  const denial = denials.get(block.id);
  if (denial) {
    pushEvent(trial, { kind: 'approval_denied', action }, { ...native, ...denial });
    return;
  }
  if (event) pushEvent(trial, event, native);
  else countUnmapped(trial, `${record.type}.tool_use.${block.name}`, line);
}

// A tool_result is the other half of a tool call: its error flag lands on the
// event the call produced; a result for a call that produced no event, or a
// text block (a subagent's driving prompt), is counted like any unmapped record.
function pushUserRecord(trial, record, line, byToolUse) {
  const content = record.message?.content;
  const blocks = Array.isArray(content) ? content : [];
  for (const block of blocks) {
    const target = block?.type === 'tool_result' ? byToolUse.get(block.tool_use_id) : undefined;
    if (target) target.result_is_error = block.is_error === true;
    else countUnmapped(trial, `${record.type}.${block?.type ?? 'unknown'}`, line);
  }
}

export function normalize({ lines, request, requestKind, policy, fixtureRoot, trialId = 't1' }) {
  const trial = createTrial(trialId);
  pushDerivedEvents(trial, { request, requestKind, policy });
  const records = parseJsonLines(lines);
  const denials = deniedToolUses(records);
  const byToolUse = new Map();
  let result = null;
  for (const { line, record } of records) {
    if (record.type === 'assistant') {
      toolUses(record).forEach((block) => {
        pushToolUse(trial, block, record, line, fixtureRoot, denials);
        const native = trial.native.at(-1);
        if (native?.tool_use_id === block.id) byToolUse.set(block.id, native);
      });
    } else if (record.type === 'user') {
      pushUserRecord(trial, record, line, byToolUse);
    } else if (record.type === 'result') {
      result = { line, record };
    } else if (!denials.has(record.tool_use_id)) {
      countUnmapped(trial, record.subtype ? `${record.type}.${record.subtype}` : record.type, line);
    }
  }
  if (!result) throw new Error('stream ended without a result message');
  const success = result.record.subtype === 'success' && result.record.is_error === false;
  return finishTrial(trial, {
    exitState: success ? 'success' : 'failure',
    finalResponse: typeof result.record.result === 'string' ? result.record.result : '',
    native: nativeOf(result.record, result.line, { subtype: result.record.subtype }),
  });
}
