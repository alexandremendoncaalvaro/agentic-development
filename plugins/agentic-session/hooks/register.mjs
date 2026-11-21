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
//
// The automatic rollover (ADR-0098, task-0127): from the owner's start point
// the plugin asks the model for a handoff, mid-turn as a note or at a turn's
// end as a prompt, and once the file is whole it clears the session and
// resumes from it. It blocks nothing: every failure is a toast or a debug line.

import {
  COOLDOWN_MS,
  autoHandoffPath,
  autoResumePrompt,
  autoSettings,
  SYSTEM_SECTION_ID,
  compactInstructions,
  handoffInAnswer,
  handoffRequest,
  isHandoffComplete,
  midTurnNote,
  systemSection,
  tierOf,
} from './auto.mjs';
import {
  CLEAR_KEY,
  HANDOFF_LABEL,
  bandLabel,
  clearLabel,
  fillReading,
  handoffDirs,
  handoffsSince,
  normalizeThreshold,
  resumePrompt,
  shouldShow,
} from './band.mjs';
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
  const state = { fill: null, briefing: null, briefingRun: 0, clearAfter: false, pending: null };
  // Kept in the module, not the session: /clear starts no new session.start.
  const auto = { options, settings: null, cycle: null, fresh: false, restUntil: 0 };

  on('session.start', async ($, e, next) => {
    const result = await next(e);
    await registerCommand($);
    state.clearAfter = (await $.store.get(CLEAR_KEY).catch(() => false)) === true;
    await refresh($, state);
    return result;
  });

  // The first main-loop turn to start after the press is the handoff's own:
  // the command queues until the session is idle (task-0115). Its start time
  // tells the handoff's file from older ones.
  on('turn.start', async ($, e, next) => {
    const result = await next(e);
    if (state.pending && !state.pending.turnId) {
      state.pending = { turnId: e.turnId, since: Date.now() };
    }
    return result;
  });

  on('turn.complete', async ($, e, next) => {
    const result = await next(e);
    if (e.agentId) return result;
    await refresh($, state);
    const pending = state.pending;
    if (pending?.turnId && pending.turnId === e.turnId) {
      state.pending = null;
      // Run after this hook returns: the clear ends the session.
      void clearAndResume($, pending, e.reason).catch((error) =>
        logFailure($, 'clear and resume failed', error)
      );
      return result;
    }
    // Awaited here: a headless run exits as soon as its last turn ends, so a
    // request or a clear sent later finds no session (GROUND-0047 E4).
    await autoTurnEnd($, state, auto, e).catch((error) =>
      logFailure($, 'automatic handoff failed', error)
    );
    return result;
  });

  // Each model request of the main loop. A generator, as the engine requires.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e);
    // Not during the handoff turn of a button press: that flow clears itself.
    if (!e.agentId && !state.pending && result?.toolUses?.length > 0) {
      await autoMidTurn($, auto).catch((error) =>
        logFailure($, 'automatic handoff note failed', error)
      );
    }
    return result;
  });

  // The system prompt vouches for the cycle's requests while the cycle is on.
  on('prompt.compose', async ($, e, next) => {
    const result = await next(e);
    try {
      const { enabled } = await autoConfig($, auto);
      if (!enabled || !Array.isArray(result?.sections)) return result;
      const section = { id: SYSTEM_SECTION_ID, text: systemSection(), scope: 'session' };
      return { ...result, sections: [...result.sections, section] };
    } catch (error) {
      logFailure($, 'system prompt section not added', error);
      return result;
    }
  });

  on('session.compact', async ($, e, next) => {
    const result = await next(await withAutoInstructions($, auto, e));
    // A compaction of the main loop overtook the handoff: a file written for
    // the context that is gone must not clear the one that replaced it.
    if (!e.agentId) auto.cycle = null;
    await refresh($, state);
    return result;
  });

  // /clear ends the session with no session.start after it: drop the readings.
  on('session.end', async ($, e, next) => {
    const result = await next(e);
    state.pending = null;
    auto.cycle = null;
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
        Box({
          flexDirection: 'row',
          gap: 1,
          children: [
            Button({
              key: 'handoff',
              label: HANDOFF_LABEL,
              onPress: () => submitHandoff($, state),
            }),
            Button({
              key: 'clear-after',
              label: clearLabel(state.clearAfter),
              plain: true,
              dimColor: !state.clearAfter,
              onPress: () => toggleClearAfter($, state),
            }),
          ],
        }),
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
  state.briefingRun += 1;
  $.ui.invalidate('ui.render');
}

// Runs /ad-handoff as if typed: a plugin's prompt.submit of the same text did
// nothing in the desktop app (task-0116). With the box on, the handoff's own
// turn is followed by a clear and a resume (task-0115).
function submitHandoff($, state) {
  state.pending = state.clearAfter ? { turnId: null } : null;
  $.command.run({ command: 'ad-handoff' }).catch((error) => {
    state.pending = null;
    $.ui.toast('AD handoff could not start: run /ad-handoff yourself.');
    logFailure($, 'handoff not run', error);
  });
}

function toggleClearAfter($, state) {
  state.clearAfter = !state.clearAfter;
  // The latest choice wins, even over a handoff already running.
  if (!state.clearAfter) state.pending = null;
  $.store
    .set(CLEAR_KEY, state.clearAfter)
    .catch((error) => logFailure($, 'clear-and-continue not saved', error));
  $.ui.invalidate('ui.render');
}

// Runs once, after the handoff's own turn: clears only when that turn ended
// normally and wrote exactly one handoff file, so a session is never cleared
// with nothing, or someone else's work, to resume from.
async function clearAndResume($, pending, reason) {
  if (reason !== 'answer') {
    $.ui.toast('AD handoff: the handoff did not finish, so the session was not cleared.');
    return;
  }
  const tmpdir = await $.env.get('TMPDIR').catch(() => undefined);
  const found = [];
  for (const dir of handoffDirs(tmpdir)) {
    const entries = await $.fs.list(dir).catch(() => []);
    for (const name of handoffsSince(entries, pending.since)) found.push(`${dir}/${name}`);
  }
  if (found.length === 0) {
    $.ui.toast('AD handoff: no handoff file was written, so the session was not cleared.');
    return;
  }
  if (found.length > 1) {
    $.ui.toast('AD handoff: more than one new handoff file, so the session was not cleared.');
    return;
  }
  const [path] = found;
  try {
    await $.command.run({ command: 'clear' });
  } catch (error) {
    $.ui.toast(`AD handoff: the session was not cleared; the handoff is at ${path}.`);
    logFailure($, 'clear failed', error);
    return;
  }
  try {
    await $.prompt.submit({ text: resumePrompt(path), asUser: true });
  } catch (error) {
    $.ui.toast(
      `AD handoff: the session was cleared, but the resume prompt was not sent; resume from ${path}.`
    );
    logFailure($, 'resume prompt not submitted', error);
  }
}

async function autoConfig($, auto) {
  if (!auto.settings) {
    const env = await $.env.get('AGENTIC_AUTO_HANDOFF').catch(() => undefined);
    auto.settings = autoSettings(auto.options, env);
  }
  return auto.settings;
}

// The first reading after a resume. A session that starts already past the
// start point gains nothing from another rollover, and asking again would
// hand off for ever with no work in between: the cycle rests instead.
function tierNow(auto, fill, at) {
  const tier = tierOf(fill?.percent, at);
  if (auto.fresh && fill) {
    auto.fresh = false;
    if (tier > 0) auto.restUntil = Date.now() + COOLDOWN_MS;
  }
  return tier;
}

// Opens the cycle with the file the handoff goes to, or says why not.
async function openCycle($, auto) {
  if (auto.cycle) return true;
  if (Date.now() < auto.restUntil) return false;
  const home =
    (await $.env.get('HOME').catch(() => undefined)) ||
    (await $.env.get('USERPROFILE').catch(() => undefined));
  const sessionId = await $.session.id().catch(() => undefined);
  const path = autoHandoffPath(home, Date.now(), sessionId);
  if (!path) {
    logFailure($, 'automatic handoff off', 'no home directory to write the handoff under');
    return false;
  }
  auto.cycle = { path, noted: 0, prompted: 0 };
  return true;
}

// A turn still running past the start point: one note per tier, beside the
// tool results, so a long turn hands off before it reaches the compaction.
async function autoMidTurn($, auto) {
  const { enabled, at } = await autoConfig($, auto);
  if (!enabled) return;
  const { context } = await $.session.usage({ breakdown: 'summary' });
  const fill = fillReading(context);
  const tier = tierNow(auto, fill, at);
  if (tier === 0 || !(await openCycle($, auto))) return;
  const cycle = auto.cycle;
  if (tier <= Math.max(cycle.noted, cycle.prompted)) return;
  cycle.noted = tier;
  await $.session.append({
    message: {
      type: 'user',
      content: [{ type: 'text', text: midTurnNote(tier, fill, cycle.path) }],
    },
  });
}

// The end of a main-loop turn: a whole handoff is followed by the clear and
// the resume; otherwise the handoff is asked for, once per tier.
async function autoTurnEnd($, state, auto, e) {
  const { enabled, at } = await autoConfig($, auto);
  if (!enabled) return;
  const tier = tierNow(auto, state.fill, at);
  if (auto.cycle) {
    const { path } = auto.cycle;
    if (e.reason === 'answer' && (await handoffReady($, path, e.answer))) {
      auto.cycle = null;
      await rollOver($, auto, path);
      return;
    }
    // The context fell back (a compaction, a manual clear): drop the request.
    if (tier === 0) auto.cycle = null;
  }
  if (e.reason !== 'answer' || tier === 0 || !(await openCycle($, auto))) return;
  const cycle = auto.cycle;
  if (tier <= cycle.prompted) return;
  cycle.prompted = tier;
  await $.prompt.submit({ text: handoffRequest(tier, state.fill, cycle.path) });
}

// The file the model wrote, or the handoff it gave as its answer when the
// Write tool was refused, which the plugin saves itself.
async function handoffReady($, path, answer) {
  const text = await $.fs.read(path).catch(() => '');
  if (isHandoffComplete(text)) return true;
  const given = handoffInAnswer(answer);
  if (!given) return false;
  await $.fs.write(path, given);
  return true;
}

async function rollOver($, auto, path) {
  try {
    await $.command.run({ command: 'clear' });
  } catch (error) {
    $.ui.toast(`AD handoff: the session was not cleared; the handoff is at ${path}.`);
    logFailure($, 'automatic clear failed', error);
    // A host that refuses the clear would otherwise be asked for a new
    // handoff at every turn.
    auto.restUntil = Date.now() + COOLDOWN_MS;
    return;
  }
  auto.fresh = true;
  try {
    await $.prompt.submit({ text: autoResumePrompt(path), asUser: true });
    $.ui.toast(`AD handoff: context rolled over; resuming from ${path}.`);
  } catch (error) {
    $.ui.toast(
      `AD handoff: the session was cleared, but the resume prompt was not sent; resume from ${path}.`
    );
    logFailure($, 'automatic resume not submitted', error);
  }
}

// The safety net: an automatic compaction of the main loop that happens all
// the same is told what a handoff would have kept.
async function withAutoInstructions($, auto, e) {
  try {
    if (e.trigger !== 'auto' || e.agentId) return e;
    const { enabled } = await autoConfig($, auto);
    if (!enabled) return e;
    const instructions = [e.instructions, compactInstructions(auto.cycle?.path)]
      .filter(Boolean)
      .join('\n\n');
    return { ...e, instructions };
  } catch (error) {
    logFailure($, 'compaction instructions not added', error);
    return e;
  }
}

function logFailure($, what, error) {
  $.ui.log(`agentic-session: ${what} (${error?.message ?? error})`, { to: 'debug' });
}
