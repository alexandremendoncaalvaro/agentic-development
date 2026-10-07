// agentic-session: a context band above the prompt with a one-press
// /ad-handoff, drawn only at or above the user's threshold (ADR-0088,
// task-0104). Shaped on Anthropic's token-weather sample: read on session start,
// after each main-loop turn and after a compaction, never on every draw. The
// engine reads on(...) and $.noun.method(...) from source, so they are spelled
// literally, and helpers that take $ are top-level functions. A threshold
// changed in /config reloads the module with the new options.

import { HANDOFF_LABEL, bandLabel, fillReading, normalizeThreshold, shouldShow } from './band.mjs';

export function register(on, options) {
  const threshold = normalizeThreshold(options?.threshold);
  const state = { fill: null };

  on('session.start', async ($, e, next) => {
    const result = await next(e);
    await takeReading($, state);
    return result;
  });

  on('turn.complete', async ($, e, next) => {
    const result = await next(e);
    if (!e.agentId) await takeReading($, state);
    return result;
  });

  on('session.compact', async ($, e, next) => {
    const result = await next(e);
    await takeReading($, state);
    return result;
  });

  // /clear ends the session with no session.start after it: drop the reading.
  on('session.end', async ($, e, next) => {
    const result = await next(e);
    clearReading($, state);
    return result;
  });

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.hasSurvey || !shouldShow(state.fill, threshold)) return next(e);
    const { Box, Text, Button } = $.ui.resolve(e);
    return Box({
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingX: 1,
      children: [
        Text({ dimColor: true, children: bandLabel(state.fill) }),
        Button({ key: 'handoff', label: HANDOFF_LABEL, onPress: () => submitHandoff($) }),
      ],
    });
  });
}

async function takeReading($, state) {
  try {
    const { context } = await $.session.usage({ breakdown: 'summary' });
    state.fill = fillReading(context);
  } catch {
    // Fail closed (ADR-0088): with no fresh reading the band is not drawn.
    state.fill = null;
  }
  $.ui.invalidate('ui.render');
}

function clearReading($, state) {
  state.fill = null;
  $.ui.invalidate('ui.render');
}

function submitHandoff($) {
  void $.prompt.submit({ text: '/ad-handoff', asUser: true });
}
