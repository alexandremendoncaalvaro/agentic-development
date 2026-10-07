// The band's rule, kept free of the engine interface so node:test covers it
// (ADR-0088, task-0104). register.mjs feeds it what $.session.usage() returns.

export const DEFAULT_THRESHOLD = 60;

// Names the kit's skill, so the press is recognisably Agentic Development's handoff.
export const HANDOFF_LABEL = 'AD handoff';

// A reading as { percent, basis }, measured toward the auto-compact point when
// auto-compaction is on (GROUND-0035 E3, RESEARCH-0036 E3), else toward the
// model's window; null before the first response of the live window.
export function fillReading(context) {
  if (!context || typeof context.tokens !== 'number') return null;
  const breakdown = context.breakdown;
  if (breakdown?.isAutoCompactEnabled && breakdown.autoCompactThreshold > 0) {
    return reading(context.tokens, breakdown.autoCompactThreshold, 'auto-compact');
  }
  if (context.window > 0) return reading(context.tokens, context.window, 'window');
  return null;
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
  const against = fill.basis === 'auto-compact' ? 'the auto-compact point' : 'the window';
  return `Context ${fill.percent}% of ${against}`;
}
