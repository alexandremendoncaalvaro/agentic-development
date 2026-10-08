// agentic-session: a band above the prompt with the work-in-progress briefing
// and, past the user's threshold, the context reading with a one-press
// /ad-handoff (ADR-0088, ADR-0090, tasks 0104 and 0111); /agentic-briefing
// opens the full briefing in a pane. Shaped on Anthropic's token-weather
// sample: read on session start, after each main-loop turn and after a
// compaction, never on every draw. The briefing is the kit script's output,
// displayed as printed; the plugin computes no fact. The engine reads on(...)
// and $.noun.method(...) from source, so they are spelled literally, and
// helpers that take $ are top-level functions. A threshold changed in /config
// reloads the module with the new options.

import { HANDOFF_LABEL, bandLabel, fillReading, normalizeThreshold, shouldShow } from './band.mjs';
import { briefingLine, paneSections, readBriefing, scriptCandidates } from './briefing-view.mjs';

const PANE = 'agentic-briefing';
const PANE_TITLE = 'Briefing';
// A run that outlives this is dropped: the band shows nothing rather than wait.
const SCRIPT_TIMEOUT_MS = 10_000;

export function register(on, options) {
  const threshold = normalizeThreshold(options?.threshold);
  const state = { fill: null, briefing: null };

  on('session.start', async ($, e, next) => {
    const result = await next(e);
    await registerCommand($);
    await refresh($, state);
    return result;
  });

  on('turn.complete', async ($, e, next) => {
    const result = await next(e);
    if (!e.agentId) await refresh($, state);
    return result;
  });

  on('session.compact', async ($, e, next) => {
    const result = await next(e);
    await refresh($, state);
    return result;
  });

  // /clear ends the session with no session.start after it: drop the readings.
  on('session.end', async ($, e, next) => {
    const result = await next(e);
    clearReadings($, state);
    return result;
  });

  on('command.run', { command: PANE }, async ($) => {
    await $.ui.open({ id: PANE, title: PANE_TITLE });
    return { text: 'Briefing pane opened.' };
  });

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    const showContext = shouldShow(state.fill, threshold);
    if (e.hasSurvey || (!state.briefing && !showContext)) return next(e);
    const { Box, Text, Button } = $.ui.resolve(e);
    const children = [];
    if (state.briefing) {
      children.push(
        Text({ dimColor: true, wrap: 'truncate-end', children: briefingLine(state.briefing) })
      );
    }
    if (showContext) {
      children.push(
        Box({
          flexDirection: 'row',
          children: [
            Text({ dimColor: true, children: bandLabel(state.fill) }),
            Button({ key: 'handoff', label: HANDOFF_LABEL, onPress: () => submitHandoff($) }),
          ],
        })
      );
    }
    return Box({ flexDirection: 'row', justifyContent: 'space-between', paddingX: 1, children });
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e);
    if (!state.briefing) {
      return Box({
        flexDirection: 'column',
        children: [
          Text({
            dimColor: true,
            children: 'No briefing: the kit script is not installed or did not run.',
          }),
        ],
      });
    }
    return Box({
      flexDirection: 'column',
      children: paneSections(state.briefing).map((section) =>
        Box({
          flexDirection: 'column',
          marginBottom: 1,
          children: [
            Text({ bold: true, children: section.title }),
            ...section.lines.map((line) => Text({ children: line })),
          ],
        })
      ),
    });
  });
}

async function registerCommand($) {
  try {
    await $.command.register({
      name: PANE,
      description: 'Show the work-in-progress briefing in a pane',
    });
  } catch (error) {
    logFailure($, 'briefing command not registered', error);
  }
}

async function refresh($, state) {
  await takeReading($, state);
  await takeBriefing($, state);
  $.ui.invalidate('ui.render');
}

async function takeReading($, state) {
  try {
    const { context } = await $.session.usage({ breakdown: 'summary' });
    state.fill = fillReading(context);
  } catch (error) {
    // Fail closed (ADR-0088): with no fresh reading the context part is not
    // drawn; the reason goes to the debug log, never on screen.
    state.fill = null;
    logFailure($, 'no context reading', error);
  }
}

// Fail closed (ADR-0090): no installed script, a failed run or output that is
// not a briefing leaves the briefing out of the band.
async function takeBriefing($, state) {
  try {
    const root = await $.session.root();
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'));
    const script = await firstInstalled($, scriptCandidates(root, home));
    if (!script) {
      state.briefing = null;
      return;
    }
    const sessionId = await $.session.id();
    const result = await $.process.run(['node', script, '--session', sessionId], {
      cwd: root,
      timeoutMs: SCRIPT_TIMEOUT_MS,
    });
    state.briefing = readBriefing(result);
    if (!state.briefing) logFailure($, 'briefing unreadable', `exit ${result.exitCode}`);
  } catch (error) {
    state.briefing = null;
    logFailure($, 'no briefing', error);
  }
}

async function firstInstalled($, paths) {
  for (const path of paths) {
    const found = await $.fs.stat(path).catch(() => undefined);
    if (found) return path;
  }
  return null;
}

function clearReadings($, state) {
  state.fill = null;
  state.briefing = null;
  $.ui.invalidate('ui.render');
}

function submitHandoff($) {
  $.prompt
    .submit({ text: '/ad-handoff', asUser: true })
    .catch((error) => logFailure($, 'handoff not submitted', error));
}

function logFailure($, what, error) {
  $.ui.log(`agentic-session: ${what} (${error?.message ?? error})`, { to: 'debug' });
}
