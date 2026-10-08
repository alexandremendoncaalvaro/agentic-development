// agentic-session: a context band above the prompt with a one-press
// /ad-handoff, drawn only at or above the user's threshold (ADR-0088,
// task-0104), and /agentic-briefing, which opens the work-in-progress briefing
// in a pane (ADR-0090, task-0111). Shaped on Anthropic's token-weather sample:
// read on session start, after each main-loop turn and after a compaction,
// never on every draw. The briefing is the kit script's output, drawn as
// printed; the plugin establishes no fact. The engine reads on(...) and
// $.noun.method(...) from source, so they are spelled literally, and helpers
// that take $ are top-level functions. A threshold changed in /config reloads
// the module with the new options.

import { HANDOFF_LABEL, bandLabel, fillReading, normalizeThreshold, shouldShow } from './band.mjs';
import {
  detailsMarkdown,
  paneModel,
  progressSvg,
  progressText,
  readBriefing,
  scriptCandidates,
} from './briefing-view.mjs';

const PANE = 'agentic-briefing';
const PANE_TITLE = 'Briefing';
// A run that outlives this is dropped: the band shows nothing rather than wait.
const SCRIPT_TIMEOUT_MS = 10_000;

export function register(on, options) {
  const threshold = normalizeThreshold(options?.threshold);
  const state = { fill: null, briefing: null, briefingRun: 0 };

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

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => drawPane($, e, state.briefing));
}

const LEVEL_COLOR = { ok: 'green', warn: 'yellow', unknown: 'gray', active: '#d97757' };
const ACCENT = '#d97757';
const BAR_PX = 160;
const BAR_CELLS = 16;

function drawPane($, e, briefing) {
  const el = $.ui.resolve(e);
  const { Box, Text } = el;
  if (!briefing) {
    return Box({
      padding: 1,
      children: [
        Text({
          dimColor: true,
          children: 'No briefing: the kit script is not installed or did not run.',
        }),
      ],
    });
  }
  const model = paneModel(briefing);
  const details = detailsMarkdown(briefing);
  return Box({
    flexDirection: 'column',
    gap: 1,
    paddingX: 1,
    children: [
      headerCard(el, model),
      ...(model.next ? [nextCard(el, model.next)] : []),
      ...(model.progress.length
        ? [
            section(
              el,
              'Progress',
              model.progress.map((p) => progressRow(el, e, p))
            ),
          ]
        : []),
      section(
        el,
        'Health',
        model.health.map((h) => healthRow(el, h))
      ),
      ...(details && el.Markdown ? [el.Markdown({ text: details })] : []),
    ],
  });
}

function headerCard({ Box, Text }, model) {
  if (!model.header) {
    return Box({
      borderStyle: 'round',
      paddingX: 1,
      children: [Text({ bold: true, children: 'No single active task' })],
    });
  }
  const { number, title, status, statusLevel, chosenBy } = model.header;
  return Box({
    flexDirection: 'column',
    borderStyle: 'round',
    paddingX: 1,
    children: [
      Box({
        flexDirection: 'row',
        gap: 1,
        children: [
          Text({ bold: true, color: ACCENT, children: `Task ${number}` }),
          Text({
            backgroundColor: LEVEL_COLOR[statusLevel],
            color: 'black',
            children: ` ${status} `,
          }),
        ],
      }),
      Text({ bold: true, children: title }),
      Text({ dimColor: true, children: `Active because: ${chosenBy}` }),
    ],
  });
}

function nextCard({ Box, Text }, next) {
  return Box({
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: ACCENT,
    paddingX: 1,
    children: [
      Text({ dimColor: true, bold: true, children: 'NEXT STEP' }),
      Text({ bold: true, children: next.step }),
      ...(next.detail ? [Text({ dimColor: true, children: next.detail })] : []),
    ],
  });
}

function section({ Box, Text }, title, rows) {
  return Box({
    flexDirection: 'column',
    children: [Text({ dimColor: true, bold: true, children: title.toUpperCase() }), ...rows],
  });
}

function progressRow({ Box, Text, Svg }, e, item) {
  const bar =
    e.surface === 'desktop' && Svg
      ? [
          Svg({
            source: progressSvg(item, BAR_PX),
            alt: `${item.done} of ${item.total}`,
            width: BAR_PX,
            height: 8,
          }),
          Text({ children: `${item.done}/${item.total}` }),
        ]
      : [Text({ children: progressText(item, BAR_CELLS) })];
  return Box({
    flexDirection: 'row',
    gap: 1,
    alignItems: 'center',
    children: [Box({ width: 20, children: [Text({ children: item.label })] }), ...bar],
  });
}

function healthRow({ Box, Text }, item) {
  return Box({
    flexDirection: 'row',
    gap: 1,
    children: [
      Text({ color: LEVEL_COLOR[item.level], children: '●' }),
      Box({ width: 18, children: [Text({ bold: true, children: item.label })] }),
      Text({ children: item.value }),
    ],
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
// not a briefing leaves the pane without a briefing.
async function takeBriefing($, state) {
  // A run that finishes after a newer one started is dropped, never drawn.
  const run = ++state.briefingRun;
  const settle = (briefing) => {
    if (run === state.briefingRun) state.briefing = briefing;
  };
  try {
    const root = await $.session.root();
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'));
    const script = await firstInstalled($, scriptCandidates(root, home));
    if (!script) {
      settle(null);
      return;
    }
    const sessionId = await $.session.id();
    const result = await $.process.run(['node', script, '--session', sessionId], {
      cwd: root,
      timeoutMs: SCRIPT_TIMEOUT_MS,
    });
    const briefing = readBriefing(result);
    settle(briefing);
    if (!briefing) logFailure($, 'briefing unreadable', `exit ${result.exitCode}`);
  } catch (error) {
    settle(null);
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
