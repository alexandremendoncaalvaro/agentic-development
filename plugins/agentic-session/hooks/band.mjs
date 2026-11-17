// The band's rule, kept free of the engine interface so node:test covers it
// (ADR-0088, task-0104). register.mjs feeds it what $.session.usage() returns.

export const DEFAULT_THRESHOLD = 80;

// Names the kit's skill, so the press is recognisably Agentic Development's handoff.
export const HANDOFF_LABEL = 'AD handoff';

// A reading as { percent, basis }. With auto-compaction on and a Messages row
// in the breakdown, it is the conversation's share of working space: the
// auto-compact point minus the fixed floor of every other used row
// (GROUND-0048 E3). Otherwise it is measured toward the auto-compact point
// (GROUND-0035 E3, RESEARCH-0036 E3), else toward the model's window; null
// before the first response of the live window.
export function fillReading(context) {
  if (!context || typeof context.tokens !== 'number') return null;
  const breakdown = context.breakdown;
  if (breakdown?.isAutoCompactEnabled && breakdown.autoCompactThreshold > 0) {
    const working = workingSpace(breakdown);
    if (working) return reading(working.messages, working.space, 'working-space');
    return reading(context.tokens, breakdown.autoCompactThreshold, 'auto-compact');
  }
  if (context.window > 0) return reading(context.tokens, context.window, 'window');
  return null;
}

// The plugin types name 'Messages' as a row and give every row a kind; only
// used rows count toward the floor (deferred, free and buffer rows do not).
function workingSpace(breakdown) {
  const rows = Array.isArray(breakdown.categories) ? breakdown.categories : [];
  const messages = rows.find((row) => row.name === 'Messages' && row.kind === 'used');
  if (!messages || typeof messages.tokens !== 'number') return null;
  const floor = rows
    .filter((row) => row !== messages && row.kind === 'used' && typeof row.tokens === 'number')
    .reduce((sum, row) => sum + row.tokens, 0);
  const space = breakdown.autoCompactThreshold - floor;
  return space > 0 ? { messages: messages.tokens, space } : null;
}

function reading(tokens, limit, basis) {
  return { percent: Math.min(100, Math.round((tokens / limit) * 100)), basis };
}

export function normalizeThreshold(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(number) && number >= 1 && number <= 99 ? number : DEFAULT_THRESHOLD;
}

export function shouldShow(fill, threshold) {
  return fill !== null && fill.percent >= threshold;
}

export function bandLabel(fill) {
  const against =
    {
      'working-space': 'working space',
      'auto-compact': 'the auto-compact point',
    }[fill.basis] ?? 'the window';
  return `Context ${fill.percent}% of ${against}`;
}

// The opt-in box that clears the session after a handoff (task-0115).
export const CLEAR_KEY = 'clearAfterHandoff';

export function clearLabel(on) {
  return `${on ? '[x]' : '[ ]'} clear and continue`;
}

// Where ad-handoff writes: ${TMPDIR:-/tmp}/agentic-handoffs.
export function handoffDirs(tmpdir) {
  const base = (tmpdir || '/tmp').replace(/\/+$/, '');
  return [...new Set([`${base}/agentic-handoffs`, '/tmp/agentic-handoffs'])];
}

// ad-handoff names its file <UTC stamp>-<slug>.md, the slug free text. The
// directory may be the shared /tmp and the name reaches the model as the
// person's own words in the resume prompt, so a name off that shape, or with
// a double quote, a control or invisible format character or a line break,
// is not taken.
const HANDOFF_NAME = /^\d{8}T\d{6}Z-[^/"\p{Cc}\p{Cf}\u2028\u2029]+\.md$/u;

// The handoff files written at or after `sinceMs`, newest first, by name. The
// caller clears only when exactly one is found: none means the handoff wrote
// nothing, several mean another session wrote one in the same window.
export function handoffsSince(entries, sinceMs) {
  return entries
    .filter((e) => e.kind === 'file' && HANDOFF_NAME.test(e.name) && e.mtimeMs >= sinceMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map((e) => e.name);
}

// The prompt that resumes the cleared session, as ad-handoff's own resume
// chip words it.
export function resumePrompt(path) {
  return `Read "${path}" first and follow its Resume protocol before any work, then continue with its recommended first action.`;
}
