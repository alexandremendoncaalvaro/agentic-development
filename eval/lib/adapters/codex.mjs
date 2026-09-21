import { isRecord } from '../shared.mjs';
import {
  countUnmapped,
  createTrial,
  finishTrial,
  parseJsonLines,
  pushDerivedEvents,
  pushEvent,
  requireArray,
  requireString,
  trialPath,
  UnterminatedStreamError,
} from './common.mjs';

/**
 * Codex `codex exec --json` adapter (ADR-0080 item 10, GROUND-0025 E2).
 * Normalizes the JSON Lines thread events into one trial. Nothing is spawned.
 *
 * The stream has no skill record (GROUND-0025 E4): an implicit activation is
 * recognized from a command that reads a `SKILL.md` under one of the
 * documented skills roots. That mapping is conditional on the first live pilot.
 */

const SKILL_FILE =
  /(?:^|[\s"'/\\])(?:\.agents|etc[/\\]codex)[/\\]skills[/\\]([a-z0-9][a-z0-9-]*)[/\\]SKILL\.md(?=$|[\s"'])/;

const TERMINALS = new Set(['turn.completed', 'turn.failed', 'error']);

function terminalOf(record, line) {
  if (record.type === 'turn.completed') return { line, type: record.type, exitState: 'success' };
  const where = `stream line ${line}: ${record.type}`;
  const message = record.type === 'turn.failed' ? record.error?.message : record.message;
  return {
    line,
    type: record.type,
    exitState: 'failure',
    error: requireString(message, where, 'error message'),
  };
}

export function normalize({ lines, request, requestKind, policy, fixtureRoot, trialId = 't1' }) {
  const trial = createTrial(trialId);
  pushDerivedEvents(trial, { request, requestKind, policy });
  const startedAt = new Map();
  let lastMessage = '';
  let terminal = null;
  for (const { line, record } of parseJsonLines(lines)) {
    if (record.type === 'item.started' || record.type === 'item.updated') {
      // The in-progress half of an item; its line lands on the completed item's record.
      if (record.item?.id !== undefined) startedAt.set(record.item.id, line);
      else countUnmapped(trial, record.type, line);
    } else if (record.type === 'item.completed') {
      const native = { started_at_line: startedAt.get(record.item?.id) ?? null };
      lastMessage = pushItem(trial, record, line, fixtureRoot, native) ?? lastMessage;
    } else if (TERMINALS.has(record.type)) {
      terminal = terminalOf(record, line);
    } else {
      countUnmapped(trial, record.type, line);
    }
  }
  if (!terminal) {
    throw new UnterminatedStreamError(
      'stream ended without a turn.completed, turn.failed, or error record'
    );
  }
  const { exitState, ...native } = terminal;
  return finishTrial(trial, { exitState, finalResponse: lastMessage, native });
}

// A declined command never ran: it is the approval stop holding, not a
// command event. A command that read a SKILL.md is also the skill activation.
function pushCommand(trial, item, where, native) {
  const command = requireString(item.command, where, 'command');
  if (item.status === 'declined') {
    pushEvent(trial, { kind: 'approval_denied', action: command }, native);
    return;
  }
  // A read that failed loaded nothing: only a clean exit is the activation.
  const skill = item.exit_code === 0 ? SKILL_FILE.exec(command)?.[1] : undefined;
  if (skill) {
    pushEvent(trial, { kind: 'skill_invoked', skill }, { ...native, source: 'skill_file_read' });
  }
  pushEvent(trial, { kind: 'command', command }, native);
}

// A declined change never landed: like a declined command, it is the approval
// stop holding, not a write.
function pushChanges(trial, item, where, fixtureRoot, native) {
  for (const change of requireArray(item.changes, where, 'changes')) {
    const path = trialPath(requireString(change?.path, where, 'change path'), fixtureRoot);
    const withKind = { ...native, change_kind: change?.kind };
    if (item.status === 'declined')
      pushEvent(trial, { kind: 'approval_denied', action: path }, withKind);
    else pushEvent(trial, { kind: 'file_write', path }, withKind);
  }
}

function pushItem(trial, record, line, fixtureRoot, extra) {
  const item = record.item;
  if (!isRecord(item) || typeof item.type !== 'string') {
    throw new Error(`stream line ${line}: item.completed has no item record`);
  }
  const where = `stream line ${line}: ${item.type} ${item.id}`;
  const native = {
    line,
    type: record.type,
    item_id: item.id,
    item_type: item.type,
    status: item.status,
    ...extra,
  };
  if (item.type === 'command_execution') {
    pushCommand(trial, item, where, native);
  } else if (item.type === 'file_change') {
    pushChanges(trial, item, where, fixtureRoot, native);
  } else if (item.type === 'agent_message') {
    return item.text;
  } else {
    countUnmapped(trial, `${record.type}.${item.type}`, line);
  }
  return undefined;
}
