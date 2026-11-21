import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ADR-0088, task-0104: the agentic-session companion plugin. The engine run is
// verified live in the desktop app (GROUND-0035 limitations); these tests cover
// the band's pure rule and the manifests the marketplace install reads.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLUGIN = join(ROOT, 'plugins', 'agentic-session');
const {
  fillReading,
  normalizeThreshold,
  shouldShow,
  bandLabel,
  DEFAULT_THRESHOLD,
  HANDOFF_LABEL,
  handoffsSince,
  handoffDirs,
  resumePrompt,
} = await import(pathToFileURL(join(PLUGIN, 'hooks', 'band.mjs')).href);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('fillReading measures toward the auto-compact point when auto-compaction is on', () => {
  const reading = fillReading({
    tokens: 90_000,
    window: 200_000,
    breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 150_000 },
  });
  assert.deepEqual(reading, { percent: 60, basis: 'auto-compact' });
});

test('fillReading falls back to the model window when auto-compaction is off or unknown', () => {
  assert.deepEqual(
    fillReading({ tokens: 50_000, window: 200_000, breakdown: { isAutoCompactEnabled: false } }),
    { percent: 25, basis: 'window' }
  );
  assert.deepEqual(fillReading({ tokens: 50_000, window: 200_000 }), {
    percent: 25,
    basis: 'window',
  });
});

test('fillReading has no reading before the first response or without a window', () => {
  assert.equal(fillReading(undefined), null);
  assert.equal(fillReading({ window: 200_000 }), null);
  assert.equal(fillReading({ tokens: 10, window: 0 }), null);
});

test('fillReading caps the percentage at 100', () => {
  const reading = fillReading({
    tokens: 160_000,
    window: 200_000,
    breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 150_000 },
  });
  assert.equal(reading.percent, 100);
});

test('normalizeThreshold keeps 1 to 99 and falls back to the default otherwise', () => {
  assert.equal(DEFAULT_THRESHOLD, 80);
  assert.equal(normalizeThreshold(75), 75);
  assert.equal(normalizeThreshold('40'), 40);
  for (const bad of [undefined, null, '', 'x', 0, 100, -5, 150, Number.NaN]) {
    assert.equal(normalizeThreshold(bad), 80, String(bad));
  }
});

test('shouldShow draws at and above the threshold and never without a reading', () => {
  assert.equal(shouldShow({ percent: 60, basis: 'window' }, 60), true);
  assert.equal(shouldShow({ percent: 61, basis: 'window' }, 60), true);
  assert.equal(shouldShow({ percent: 59, basis: 'window' }, 60), false);
  assert.equal(shouldShow(null, 60), false);
});

test('the button names the kit and its skill', () => {
  assert.equal(HANDOFF_LABEL, 'AD handoff');
});

test('bandLabel names the percentage and what it is measured against', () => {
  assert.equal(
    bandLabel({ percent: 72, basis: 'auto-compact' }),
    'Context 72% of the auto-compact point'
  );
  assert.equal(bandLabel({ percent: 72, basis: 'window' }), 'Context 72% of the window');
});

test('the marketplace lists agentic-session by a relative source whose manifest name matches', () => {
  const marketplace = readJson(join(ROOT, '.claude-plugin', 'marketplace.json'));
  assert.equal(marketplace.name, 'agentic-development');
  assert.equal(typeof marketplace.owner?.name, 'string');
  const entry = marketplace.plugins.find((plugin) => plugin.name === 'agentic-session');
  assert.ok(entry, 'agentic-session is listed');
  assert.equal(entry.source, './plugins/agentic-session');
  const manifest = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'));
  assert.equal(manifest.name, entry.name, 'entry name equals manifest name');
});

test('the plugin manifest declares the threshold option and one hooks module that exists', () => {
  const manifest = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'));
  const threshold = manifest.userConfig?.threshold;
  assert.deepEqual(
    {
      type: threshold?.type,
      default: threshold?.default,
      min: threshold?.min,
      max: threshold?.max,
    },
    { type: 'number', default: 80, min: 1, max: 99 }
  );
  assert.equal(typeof threshold.title, 'string');
  assert.equal(typeof threshold.description, 'string');
  const allowed = new Set(['type', 'title', 'description', 'required', 'default', 'min', 'max']);
  for (const key of Object.keys(threshold))
    assert.ok(allowed.has(key), `unknown userConfig key ${key}`);
  const hooks = readJson(join(PLUGIN, 'hooks', 'hooks.json'));
  assert.equal(hooks.modules.length, 1);
  assert.ok(existsSync(join(PLUGIN, 'hooks', hooks.modules[0])), 'the hooks module exists');
});

// A fake engine: hooks keyed by event and matcher, and a host with no kit
// script installed unless `script` gives the path and the run's result.
function loadPlugin(
  threshold,
  usage,
  { script = null, handoffs = null, stored = {}, options = {}, env = {}, files = {} } = {}
) {
  return import(pathToFileURL(join(PLUGIN, 'hooks', 'register.mjs')).href).then(({ register }) => {
    const hooks = {};
    register(
      (event, ...rest) => {
        const matcher = rest.length > 1 ? rest[0] : {};
        const key = [event, matcher.component, matcher.requestId, matcher.command]
          .filter(Boolean)
          .join(':');
        hooks[key] = rest.at(-1);
      },
      { threshold, ...options }
    );
    const logs = [];
    const submitted = [];
    const runs = [];
    const opened = [];
    const commands = [];
    const ran = [];
    const toasts = [];
    const appended = [];
    const store = { ...stored };
    const element = (type) => (props) => ({ type, props });
    const $ = {
      session: {
        usage,
        root: async () => '/work/repo',
        id: async () => 'sess-1',
        append: async (input) => appended.push(input),
      },
      env: {
        get: async (name) => ({ HOME: '/home/ale', TMPDIR: '/var/tmp-x/', ...env })[name],
      },
      store: {
        get: async (key) => store[key],
        set: async (key, value) => {
          store[key] = value;
        },
      },
      fs: {
        list: async (path) => {
          if (handoffs && path === '/var/tmp-x/agentic-handoffs') return handoffs();
          throw new Error('ENOENT');
        },
        stat: async (path) => {
          if (script && path === script.path) return { size: 1 };
          throw new Error('ENOENT');
        },
        read: async (path) => {
          if (path in files) return files[path];
          throw new Error('ENOENT');
        },
        write: async (path, text) => {
          files[path] = text;
        },
      },
      process: {
        run: async (argv, init) => {
          runs.push({ argv, init });
          return typeof script.result === 'function' ? script.result() : script.result;
        },
      },
      command: {
        register: async (spec) => commands.push(spec),
        // The real /clear ends the session before it resolves.
        run: async (spec) => {
          ran.push(spec);
          if (spec.command === 'clear')
            await hooks['session.end']?.($, { reason: 'clear' }, async () => undefined);
        },
      },
      prompt: { submit: async (input) => submitted.push(input) },
      ui: {
        invalidate: () => {},
        open: async (request) => opened.push(request),
        log: (text, options) => logs.push({ text, options }),
        toast: (text) => toasts.push(text),
        resolve: () => ({ Box: element('Box'), Text: element('Text'), Button: element('Button') }),
      },
    };
    return {
      hooks,
      logs,
      submitted,
      runs,
      opened,
      commands,
      ran,
      toasts,
      store,
      appended,
      files,
      $,
    };
  });
}

// The first element of a type in a drawn tree, depth first.
function findElement(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children].flat()) {
    const found = findElement(child, type);
    if (found) return found;
  }
  return null;
}

const FULL = async () => ({
  context: { tokens: 90000, window: 200000 },
});

test('the plugin draws and runs the handoff only: it hooks no tool call and rewrites no typed prompt', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(1, FULL);
  assert.deepEqual(Object.keys(hooks).sort(), [
    'command.run:agentic-briefing',
    'prompt.compose',
    'session.compact',
    'session.end',
    'session.start',
    'turn.complete',
    'turn.start',
    'turn.step',
    'ui.render:AbovePrompt',
    'ui.render:Pane:agentic-briefing',
  ]);
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(band.props.justifyContent, 'space-between', 'the button sits at the right edge');
  const button = findElement(band, 'Button');
  button.props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  // A plugin's prompt.submit of "/ad-handoff" did nothing in the desktop app;
  // the command runs as if typed (task-0116).
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
});

test('a rejected handoff command shows a toast and logs the reason', async () => {
  const { hooks, logs, toasts, $ } = await loadPlugin(1, FULL);
  $.command.run = async () => {
    throw new Error('submit refused');
  };
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  findElement(band, 'Button').props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logs.length, 1);
  assert.match(logs[0].text, /submit refused/);
  assert.deepEqual(logs[0].options, { to: 'debug' });
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /run \/ad-handoff yourself/);
});

// Task 0115: hand off, clear and continue.
const tick = () => new Promise((resolve) => setImmediate(resolve));
const buttons = (tree, found = []) => {
  if (!tree || typeof tree !== 'object') return found;
  if (tree.type === 'Button') found.push(tree);
  for (const child of [tree.props?.children].flat()) buttons(child, found);
  return found;
};
const press = (band, key) =>
  buttons(band)
    .find((b) => b.props.key === key)
    .props.onPress();

// One main-loop turn: its start, then its end with the given reason.
async function runTurn(hooks, $, turnId, reason = 'answer') {
  await hooks['turn.start']($, { turnId }, async () => undefined);
  await hooks['turn.complete']($, { turnId, reason }, async () => undefined);
  await tick();
  await tick();
}

test('regression: task-0115 handoffsSince lists handoffs written since a time, newest first', () => {
  const entries = [
    { name: '20261015T100000Z-old.md', kind: 'file', mtimeMs: 50 },
    { name: '20261015T110000Z-a.md', kind: 'file', mtimeMs: 100 },
    { name: '20261015T120000Z-b.md', kind: 'file', mtimeMs: 150 },
    { name: '20261015T130000Z-notes.txt', kind: 'file', mtimeMs: 200 },
    { name: '20261015T140000Z-dir.md', kind: 'dir', mtimeMs: 300 },
  ];
  assert.deepEqual(handoffsSince(entries, 100), ['20261015T120000Z-b.md', '20261015T110000Z-a.md']);
  assert.deepEqual(handoffsSince(entries, 160), []);
});

test('regression: task-0115 handoffsSince takes only names in the shape ad-handoff writes, free of control characters', () => {
  const at = (name) => ({ name, kind: 'file', mtimeMs: 200 });
  const entries = [
    at('notes.md'),
    at('20261015T120000Z-ok_slug.v2.md'),
    at('20261015T120001Z-two words.md'),
    at('20261015T120002Z-refatoração.md'),
    at('20261015T120000Z-tab\tname.md'),
    at('20261015T120000Z-nel\u0085name.md'),
    at('20261015T120000Z-ls\u2028name.md'),
    at('20261015T120000Z-rlo\u202ename.md'),
    at('20261015T120000Z-zw\u200bname.md'),
    at('20261015T120000Z-quote"name.md'),
    at('20261015T120000Z-line\nbreak.md'),
    at('2026-10-15-x.md'),
  ];
  assert.deepEqual(handoffsSince(entries, 100).sort(), [
    '20261015T120000Z-ok_slug.v2.md',
    '20261015T120001Z-two words.md',
    '20261015T120002Z-refatoração.md',
  ]);
});

test('regression: task-0115 the resume prompt names the handoff and its Resume protocol', () => {
  const text = resumePrompt('/var/tmp-x/agentic-handoffs/x.md');
  assert.match(text, /\/var\/tmp-x\/agentic-handoffs\/x\.md/);
  assert.match(text, /Resume protocol/);
  assert.ok(text.startsWith('Read "/var/tmp-x/agentic-handoffs/x.md" first'), 'the path is quoted');
});

test('regression: task-0115 with the box on, the handoff is followed by a clear and a resume', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(1, FULL, {
    handoffs: () => [{ name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: Date.now() + 1000 }],
    stored: { clearAfterHandoff: true },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].asUser, true);
  assert.match(submitted[0].text, /\/var\/tmp-x\/agentic-handoffs\/20261015T120000Z-h\.md/);
});

test('regression: task-0115 with the box off, the button only hands off', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(1, FULL, {
    handoffs: () => [{ name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: Date.now() + 1000 }],
  });
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
});

test('regression: task-0115 with no handoff file the session is left as it was', async () => {
  const { hooks, submitted, ran, toasts, $ } = await loadPlugin(1, FULL, {
    handoffs: () => [],
    stored: { clearAfterHandoff: true },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /no handoff file/i);
});

test('regression: task-0115 the clear-and-continue box toggles and is remembered', async () => {
  const { hooks, store, $ } = await loadPlugin(1, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  let band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  const box = () => buttons(band).find((b) => b.props.key === 'clear-after');
  assert.match(box().props.label, /^\[ \]/);
  box().props.onPress();
  await tick();
  assert.equal(store.clearAfterHandoff, true);
  band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.match(box().props.label, /^\[x\]/);
});

// Press with the box on and return the plugin, before any turn runs.
async function pressWithBoxOn(options) {
  const plugin = await loadPlugin(1, FULL, { stored: { clearAfterHandoff: true }, ...options });
  const { hooks, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  return plugin;
}
const oneNewFile = () => [
  { name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: Date.now() + 1000 },
];

test('regression: task-0115 a turn already running at the press does not trigger the clear', async () => {
  const plugin = await loadPlugin(1, FULL, {
    handoffs: oneNewFile,
    stored: { clearAfterHandoff: true },
  });
  const { hooks, ran, toasts, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  await hooks['turn.start']($, { turnId: 'busy' }, async () => undefined);
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  await hooks['turn.complete']($, { turnId: 'busy', reason: 'answer' }, async () => undefined);
  await tick();
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(toasts, []);
  await runTurn(hooks, $, 'handoff-turn');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
});

test('regression: task-0115 an interrupted handoff turn clears nothing', async () => {
  const { hooks, ran, toasts, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  await runTurn(hooks, $, 't1', 'aborted');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.match(toasts[0], /did not finish/);
});

test('regression: task-0115 handoffDirs reads TMPDIR, then /tmp, without duplicates', () => {
  assert.deepEqual(handoffDirs('/var/tmp-x/'), [
    '/var/tmp-x/agentic-handoffs',
    '/tmp/agentic-handoffs',
  ]);
  assert.deepEqual(handoffDirs(undefined), ['/tmp/agentic-handoffs']);
  assert.deepEqual(handoffDirs('/tmp'), ['/tmp/agentic-handoffs']);
});

test('regression: task-0115 a handoff file older than the handoff turn is not resumed from', async () => {
  const { hooks, ran, toasts, $ } = await pressWithBoxOn({
    handoffs: () => [
      { name: '20261015T110000Z-old.md', kind: 'file', mtimeMs: Date.now() - 60_000 },
    ],
  });
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.match(toasts[0], /no handoff file/);
});

test('regression: task-0115 two new handoff files clear nothing', async () => {
  const { hooks, ran, toasts, submitted, $ } = await pressWithBoxOn({
    handoffs: () => [
      { name: '20261015T120000Z-mine.md', kind: 'file', mtimeMs: Date.now() + 1000 },
      { name: '20261015T120001Z-other.md', kind: 'file', mtimeMs: Date.now() + 2000 },
    ],
  });
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
  assert.match(toasts[0], /more than one/);
});

test('regression: task-0115 a refused clear sends no resume and names the handoff', async () => {
  const plugin = await pressWithBoxOn({ handoffs: oneNewFile });
  const { hooks, ran, toasts, submitted, logs, $ } = plugin;
  $.command.run = async (spec) => {
    ran.push(spec);
    throw new Error('clear refused');
  };
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
  assert.deepEqual(submitted, []);
  assert.match(toasts[0], /not cleared.*\/var\/tmp-x\/agentic-handoffs\/20261015T120000Z-h\.md/);
  assert.match(logs.at(-1).text, /clear refused/);
});

test('regression: task-0115 a refused resume prompt says the session was cleared and where to resume', async () => {
  const { hooks, ran, toasts, logs, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  $.prompt.submit = async () => {
    throw new Error('submit refused');
  };
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
  assert.match(toasts[0], /cleared, but the resume prompt was not sent.*-h\.md/);
  assert.match(logs.at(-1).text, /submit refused/);
});

test('regression: task-0115 a handoff that could not start arms no clear', async () => {
  const plugin = await loadPlugin(1, FULL, {
    handoffs: oneNewFile,
    stored: { clearAfterHandoff: true },
  });
  const { hooks, ran, toasts, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  $.command.run = async (spec) => {
    ran.push(spec);
    if (spec.command === 'ad-handoff') throw new Error('refused');
  };
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  await runTurn(hooks, $, 'later');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /run \/ad-handoff yourself/);
});

test('regression: task-0115 a session that ends before the handoff turn arms no clear', async () => {
  const { hooks, ran, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  await hooks['session.end']($, { reason: 'clear' }, async () => undefined);
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
});

test('regression: task-0115 turning the box off after the press clears nothing', async () => {
  const { hooks, ran, toasts, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'clear-after'
  );
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(toasts, []);
});

test('regression: task-0115 a handoff written in the same millisecond the turn starts counts', async () => {
  let since = null;
  const { hooks, ran, $ } = await pressWithBoxOn({
    handoffs: () => [{ name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: since }],
  });
  const realNow = Date.now;
  Date.now = () => 1_000_000;
  try {
    since = 1_000_000;
    await runTurn(hooks, $, 't1');
  } finally {
    Date.now = realNow;
  }
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
});

test('regression: task-0115 an unreadable store leaves the box off', async () => {
  const { hooks, ran, $ } = await loadPlugin(1, FULL, { handoffs: oneNewFile });
  $.store.get = async () => {
    throw new Error('store down');
  };
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band');
  assert.match(buttons(band).find((b) => b.props.key === 'clear-after').props.label, /^\[ \]/);
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
});

test('the npm package does not ship the plugin or the marketplace', () => {
  const files = readJson(join(ROOT, 'package.json')).files;
  for (const entry of files) {
    assert.ok(!/^(plugins|\.claude-plugin)\b/.test(entry), `package.json#files ships ${entry}`);
  }
});

test('a failed reading hides the band and logs the reason to the debug log only', async () => {
  const { hooks, logs, $ } = await loadPlugin(1, async () => {
    throw new Error('usage unavailable');
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(logs.length, 1);
  assert.match(logs[0].text, /usage unavailable/);
  assert.deepEqual(logs[0].options, { to: 'debug' });
  const drawn = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(drawn, 'engine band', 'the engine band stands when no reading exists');
});

// ADR-0090, task-0111 slice 2: the briefing pane's model, on output recorded
// from ad-next/scripts/briefing.mjs. The plugin establishes no fact itself.
const { detailsMarkdown, paneModel, progressSvg, progressText, readBriefing, scriptCandidates } =
  await import(pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href);
const recorded = (name) => readJson(join(ROOT, 'test', 'fixtures', 'briefing', `${name}.json`));

test('readBriefing takes the script output only from a clean run that printed a JSON object', () => {
  const stdout = JSON.stringify(recorded('active-task'));
  assert.deepEqual(readBriefing({ exitCode: 0, stdout }), recorded('active-task'));
  assert.equal(readBriefing({ exitCode: 1, stdout }), null);
  assert.equal(readBriefing({ exitCode: 0, stdout: 'not json' }), null);
  assert.equal(readBriefing({ exitCode: 0, stdout: '[]' }), null);
  assert.equal(readBriefing({ exitCode: 0, stdout: 'null' }), null);
  assert.equal(
    readBriefing({ exitCode: 0, stdout: '{"task":null}', isStdoutTruncated: true }),
    null
  );
});

test('scriptCandidates looks for the project install first, then the user install', () => {
  assert.deepEqual(scriptCandidates('/work/repo', '/home/ale'), [
    '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs',
    '/home/ale/.claude/skills/ad-next/scripts/briefing.mjs',
  ]);
  assert.deepEqual(scriptCandidates('/work/repo', undefined), [
    '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs',
  ]);
});

const USER_SCRIPT = '/home/ale/.claude/skills/ad-next/scripts/briefing.mjs';
const PROJECT_SCRIPT = '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs';
const clean = (briefing) => ({ exitCode: 0, stdout: JSON.stringify(briefing), stderr: '' });

test('the project install of the script wins over the user install', async () => {
  const { hooks, runs, $ } = await loadPlugin(99, FULL, {
    script: { path: PROJECT_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(runs[0].argv[1], PROJECT_SCRIPT);
});

test('a failed script run draws no briefing and logs to the debug log only', async () => {
  const { hooks, logs, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: { exitCode: 1, stdout: '', stderr: 'boom' } },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const drawn = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(drawn, 'engine band');
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0].options, { to: 'debug' });
});

test('without an installed script nothing runs and nothing is logged', async () => {
  const { hooks, runs, logs, $ } = await loadPlugin(99, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  assert.deepEqual(runs, []);
  assert.deepEqual(logs, []);
  assert.equal(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band'),
    'engine band'
  );
});

test('the script runs with the session id in the project root, and the band stays the context band', async () => {
  const { hooks, runs, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.deepEqual(runs, [
    {
      argv: ['node', USER_SCRIPT, '--session', 'sess-1'],
      init: { cwd: '/work/repo', timeoutMs: 10_000 },
    },
  ]);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(band, 'engine band', 'below the threshold the band draws nothing of its own');
});

test('/agentic-briefing opens the pane, which draws the header, progress, health and details', async () => {
  const { hooks, commands, opened, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  $.ui.resolve = () => ({
    Box: (props) => ({ type: 'Box', props }),
    Text: (props) => ({ type: 'Text', props }),
    Button: (props) => ({ type: 'Button', props }),
    Svg: (props) => ({ type: 'Svg', props }),
    Markdown: (props) => ({ type: 'Markdown', props }),
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(commands[0].name, 'agentic-briefing');

  await hooks['command.run:agentic-briefing']($, {});
  assert.deepEqual(opened, [{ id: 'agentic-briefing', title: 'Briefing' }]);

  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'desktop' });
  const texts = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Text') texts.push(node.props.children);
    for (const child of [node.props?.children].flat()) walk(child);
  };
  walk(pane);
  assert.ok(texts.includes('Task 0111'));
  assert.ok(texts.includes('Show the work in progress briefing in the band'));
  assert.ok(texts.includes('Slice 2, the band and the pane'));
  assert.ok(texts.includes('6 of 10 checks would block; latest: audit before gh pr merge'));
  assert.equal(findElement(pane, 'Svg').props.alt, '2 of 5');
  assert.match(findElement(pane, 'Markdown').props.text, /^#### Plan/);
});

test('on the terminal the pane draws text bars instead of SVG', async () => {
  const { hooks, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'terminal' });
  assert.equal(findElement(pane, 'Svg'), null);
  const texts = JSON.stringify(pane);
  assert.match(texts, /██████░░░░░░░░░░ 2\/5/);
});

test('the pane says when there is no briefing to show', async () => {
  const { hooks, $ } = await loadPlugin(99, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  const pane = hooks['ui.render:Pane:agentic-briefing']($, {});
  assert.match(findElement(pane, 'Text').props.children, /No briefing/);
});

test('paneModel turns the briefing into a header, a next step, progress and health', () => {
  const model = paneModel(recorded('active-task'));
  assert.deepEqual(model.header, {
    number: '0111',
    title: 'Show the work in progress briefing in the band',
    status: 'in-progress',
    statusLevel: 'active',
    chosenBy: 'newest commit ahead of the base branch',
  });
  assert.deepEqual(model.next, {
    step: 'Slice 2, the band and the pane',
    detail:
      "red, then green in the plugin's pure module; live check in the desktop app (owner-observed, at a width that seats the pane and one that does not).",
  });
  assert.deepEqual(model.progress, [
    { label: 'Plan', done: 2, total: 5 },
    { label: 'Criteria', done: 2, total: 5 },
    { label: 'Definition of Done', done: 0, total: 4 },
    { label: 'Roadmap tasks', done: 66, total: 79 },
  ]);
  assert.deepEqual(model.health, [
    { label: 'Plan approval', value: 'before the first code', level: 'ok' },
    { label: 'Deviations', value: 'none recorded', level: 'ok' },
    {
      label: 'Gate (shadow)',
      value: '6 of 10 checks would block; latest: audit before gh pr merge',
      level: 'warn',
    },
  ]);
});

test('paneModel rates each plan-approval order the briefing can report', () => {
  const approvalOf = (approval) =>
    paneModel({ ...recorded('active-task'), approval }).health.find(
      (h) => h.label === 'Plan approval'
    );
  const entry = '2026-10-07 — plan approved';
  assert.deepEqual(approvalOf({ entry, precedesFirstImplementingCommit: false }), {
    label: 'Plan approval',
    value: 'after code was committed',
    level: 'warn',
  });
  assert.deepEqual(approvalOf({ entry: null, precedesFirstImplementingCommit: false }), {
    label: 'Plan approval',
    value: 'missing, and code is committed',
    level: 'warn',
  });
  assert.deepEqual(approvalOf({ entry, precedesFirstImplementingCommit: null }), {
    label: 'Plan approval',
    value: 'order unknown',
    level: 'unknown',
  });
  assert.deepEqual(approvalOf({ entry: null, precedesFirstImplementingCommit: null }), {
    label: 'Plan approval',
    value: 'not approved yet',
    level: 'ok',
  });
});

test('paneModel without an active task keeps only the roadmap and the gate', () => {
  const model = paneModel({
    ...recorded('active-task'),
    task: null,
    plan: null,
    acceptance: null,
    definitionOfDone: null,
    deviations: null,
    approval: null,
    gate: null,
  });
  assert.equal(model.header, null);
  assert.equal(model.next, null);
  assert.deepEqual(model.progress, [{ label: 'Roadmap tasks', done: 66, total: 79 }]);
  assert.deepEqual(model.health, [
    { label: 'Gate (shadow)', value: 'no evidence for this session', level: 'unknown' },
  ]);
});

test('detailsMarkdown renders the plan, open items and deviations as checklists', () => {
  const md = detailsMarkdown({
    ...recorded('active-task'),
    deviations: [{ heading: '2026-10-02 — deviation', text: 'Kept the old parser.' }],
    unreadable: [{ path: 'doc/tasks/0002-x.md', code: 'EISDIR' }],
  });
  assert.match(md, /^#### Plan\n- \[x\] Owner accepts ADR-0090 and approves this plan\.\n/);
  assert.match(md, /\n- \[ \] Slice 2, the band and the pane: red/);
  assert.match(md, /\n#### Open criteria\n- \[ \] The `agentic-session` plugin runs/);
  assert.match(md, /\n#### Definition of Done\n- \[ \] Local tests pass/);
  assert.match(md, /\n#### Deviations\n- \*\*2026-10-02 — deviation\*\*: Kept the old parser\.\n/);
  assert.match(md, /\n#### Unreadable\n- `doc\/tasks\/0002-x\.md` \(EISDIR\)/);
});

test('detailsMarkdown is empty without an active task or unreadable files', () => {
  assert.equal(detailsMarkdown({ ...recorded('active-task'), task: null, unreadable: [] }), '');
});

test('progressText draws a cell bar with the count, for the terminal', () => {
  assert.equal(progressText({ done: 2, total: 5 }, 10), '████░░░░░░ 2/5');
  assert.equal(progressText({ done: 0, total: 4 }, 8), '░░░░░░░░ 0/4');
  assert.equal(progressText({ done: 0, total: 0 }, 4), '░░░░ 0/0');
});

test('progressSvg fills the bar in proportion, for the desktop', () => {
  const svg = progressSvg({ done: 66, total: 79 }, 200);
  assert.match(svg, /^<svg [^>]*width="200" height="8"/);
  assert.match(svg, /<rect [^>]*width="167"/, 'filled share: round(200 * 66 / 79)');
  assert.match(progressSvg({ done: 0, total: 0 }, 200), /<rect [^>]*class="fill"[^>]*width="0"/);
});

test('regression: task-0111 paneModel shows what the script could not tell instead of a known state', () => {
  const model = paneModel({
    ...recorded('active-task'),
    approval: { entry: null, precedesFirstImplementingCommit: null },
    roadmap: null,
    cannotTell: ['roadmap', 'approval', 'git'],
  });
  assert.deepEqual(
    model.health.find((h) => h.label === 'Plan approval'),
    {
      label: 'Plan approval',
      value: 'cannot tell: commits ahead of the base branch not listed',
      level: 'unknown',
    }
  );
  assert.deepEqual(
    model.health.find((h) => h.label === 'Roadmap'),
    {
      label: 'Roadmap',
      value: 'cannot tell: no doc/product/PRD.md',
      level: 'unknown',
    }
  );
});

test('paneModel rates a gate with no would-block line as clear', () => {
  const gate = { lines: 3, wouldBlock: 0, last: null, lastWouldBlock: null };
  assert.deepEqual(paneModel({ ...recorded('active-task'), gate }).health.at(-1), {
    label: 'Gate (shadow)',
    value: 'none of 3 checks would block',
    level: 'ok',
  });
});

test('regression: task-0111 a slower earlier script run never overwrites a newer briefing', async () => {
  const releases = [];
  const { hooks, $ } = await loadPlugin(99, FULL, {
    script: {
      path: USER_SCRIPT,
      result: () => new Promise((resolve) => releases.push(resolve)),
    },
  });
  const older = {
    ...recorded('active-task'),
    task: { ...recorded('active-task').task, slug: '0001-older' },
  };
  const first = hooks['turn.complete']($, {}, async () => undefined);
  await new Promise((resolve) => setImmediate(resolve));
  const second = hooks['turn.complete']($, {}, async () => undefined);
  await new Promise((resolve) => setImmediate(resolve));
  releases[1](clean(recorded('active-task')));
  await second;
  releases[0](clean(older));
  await first;

  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'terminal' });
  assert.match(JSON.stringify(pane), /Task 0111/);
  assert.doesNotMatch(JSON.stringify(pane), /Task 0001/);
});

test('paneModel rates the task status for its mark', () => {
  const levelOf = (status) =>
    paneModel({ ...recorded('active-task'), task: { ...recorded('active-task').task, status } })
      .header.statusLevel;
  assert.equal(levelOf('done'), 'ok');
  assert.equal(levelOf('blocked'), 'warn');
  assert.equal(levelOf('proposed'), 'unknown');
});

test('detailsMarkdown cuts a long block at a line boundary and says so', () => {
  const long = Array.from({ length: 400 }, (_, i) => `Item ${i} with some words to fill the line.`);
  const md = detailsMarkdown({ ...recorded('active-task'), plan: { done: [], open: long } }, 2000);
  assert.ok(md.length <= 2000);
  assert.match(md, /\n\n_Cut to fit the pane; the task file has the rest\._$/);
  assert.match(md.split('\n\n_Cut')[0], /\.$/, 'the cut lands after a whole line');
});

test('regression: task-0111 a script run still in flight at /clear never brings the old briefing back', async () => {
  const releases = [];
  const { hooks, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: () => new Promise((resolve) => releases.push(resolve)) },
  });
  const inFlight = hooks['turn.complete']($, {}, async () => undefined);
  await new Promise((resolve) => setImmediate(resolve));
  await hooks['session.end']($, {}, async () => undefined);
  releases[0](clean(recorded('active-task')));
  await inFlight;

  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'terminal' });
  assert.match(findElement(pane, 'Text').props.children, /No briefing/);
});

test('regression: task-0111 paneModel and detailsMarkdown tolerate a briefing without cannotTell', () => {
  const { cannotTell, ...older } = recorded('active-task');
  void cannotTell;
  assert.equal(paneModel(older).health[0].label, 'Plan approval');
  assert.equal(detailsMarkdown({ ...older, task: null, unreadable: [] }, 50), '');
});

test('regression: task-0111 detailsMarkdown cuts a single long line without dropping into a garbled slice', () => {
  const md = detailsMarkdown(
    { ...recorded('active-task'), plan: { done: [], open: ['x'.repeat(3000)] } },
    500
  );
  assert.ok(md.length <= 500);
  assert.match(md, /_Cut to fit the pane; the task file has the rest\._$/);
});

// Task 0127, ADR-0098: the automatic rollover. Near the auto-compact point the
// plugin asks for a handoff, waits for the whole file, clears and resumes.
const auto = await import(pathToFileURL(join(PLUGIN, 'hooks', 'auto.mjs')).href);

const at = (tokens) => async () => ({
  context: {
    tokens,
    window: 200_000,
    breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 100_000 },
  },
});
const wholeHandoff = () =>
  [
    '# Handoff (automatic)',
    ...auto.REQUIRED_HEADINGS.map((h) => `${h}\n\n${'state '.repeat(30)}`),
    auto.END_MARKER,
  ].join('\n\n');
// One model request of the main loop, answered with or without tool uses.
async function runStep(hooks, $, toolUses = [{ name: 'Bash' }], agentId) {
  const step = hooks['turn.step'](
    $,
    { turnId: 't', index: 0, agentId },
    // eslint-disable-next-line require-yield
    async function* () {
      return { toolUses, stopReason: 'tool_use' };
    }
  );
  let result = await step.next();
  while (!result.done) result = await step.next();
  return result.value;
}
const endTurn = async (hooks, $, input = {}) => {
  await hooks['turn.complete'](
    $,
    { turnId: 't', reason: 'answer', answer: 'done', ...input },
    async () => undefined
  );
  await tick();
};
const requestedPath = (text) => /"([^"]+\.md)"/.exec(text)[1];

test('task-0127 autoSettings is on by default and the option or the environment turns it off', () => {
  assert.deepEqual(auto.autoSettings({}, undefined), { enabled: true, at: 80 });
  assert.deepEqual(auto.autoSettings({ autoHandoff: false }, undefined), {
    enabled: false,
    at: 80,
  });
  assert.equal(auto.autoSettings({ autoHandoff: 'false' }, undefined).enabled, false);
  assert.deepEqual(auto.autoSettings({ autoHandoffAt: 70 }, undefined), { enabled: true, at: 70 });
  for (const off of ['off', 'OFF', 'false', 'no', '0'])
    assert.equal(auto.autoSettings({}, off).enabled, false, off);
  assert.deepEqual(auto.autoSettings({ autoHandoff: false }, '30'), { enabled: true, at: 30 });
  assert.deepEqual(auto.autoSettings({ autoHandoff: false }, 'on'), { enabled: true, at: 80 });
  assert.deepEqual(auto.autoSettings({ autoHandoffAt: 150 }, 'nonsense'), {
    enabled: true,
    at: 80,
  });
});

test('task-0127 tierOf splits the way from the start point to the auto-compact point', () => {
  assert.equal(auto.tierOf(79, 80), 0);
  assert.equal(auto.tierOf(80, 80), 1);
  assert.equal(auto.tierOf(90, 80), 2);
  assert.equal(auto.tierOf(95, 80), 3);
  assert.equal(auto.tierOf(60, 60), 1);
  assert.equal(auto.tierOf(80, 60), 2);
  assert.equal(auto.tierOf(90, 60), 3);
  assert.equal(auto.tierOf(undefined, 80), 0);
});

test('task-0127 a handoff counts only when whole: long enough, every heading, the marker last', () => {
  const whole = wholeHandoff();
  assert.equal(auto.isHandoffComplete(whole), true);
  assert.equal(auto.isHandoffComplete(`${whole}\n\n`), true);
  assert.equal(auto.isHandoffComplete(whole.replace(auto.END_MARKER, '')), false);
  assert.equal(auto.isHandoffComplete(`${whole}\nmore`), false);
  assert.equal(auto.isHandoffComplete(whole.replace('## Roadmap', '## Plan')), false);
  assert.equal(
    auto.isHandoffComplete(whole.replace('## Roadmap', 'the ## Roadmap comes later')),
    false,
    'a heading is a line of its own'
  );
  assert.equal(auto.isHandoffComplete(`## Roadmap\n${auto.END_MARKER}`), false);
  assert.equal(auto.isHandoffComplete(undefined), false);
});

test('task-0127 the handoff path sits under the home directory on any system and refuses unsafe text', () => {
  const ms = Date.UTC(2026, 10, 21, 12, 5, 3);
  assert.equal(
    auto.autoHandoffPath('C:\\Users\\ale', ms, 'abcdef12-3456'),
    'C:/Users/ale/.agentic/handoffs/20261121T120503Z-auto-abcdef12.md'
  );
  assert.equal(
    auto.autoHandoffPath('/home/ale/', ms, 'sess-1'),
    '/home/ale/.agentic/handoffs/20261121T120503Z-auto-sess-1.md'
  );
  assert.equal(auto.autoHandoffPath(undefined, ms, 's'), null);
  assert.equal(auto.autoHandoffPath('/home/a"b', ms, 's'), null);
  assert.equal(auto.autoHandoffPath('/home/a\nb', ms, 's'), null);
  assert.match(auto.autoHandoffPath('/home/ale', ms, '../x"y'), /-auto-xy\.md$/);
  assert.ok(
    !auto.autoHandoffPath('/home/ale', ms, 's').includes('agentic-handoffs'),
    'outside the directory name the handoff-chip reminder fires on'
  );
});

test('task-0127 the request names the path, every section, the marker and the answer fallback', () => {
  const text = auto.handoffRequest(1, { percent: 81, basis: 'auto-compact' }, '/h/x.md');
  assert.match(text, /81% of the auto-compact point/);
  assert.match(text, /"\/h\/x\.md"/);
  for (const heading of auto.AUTO_HEADINGS) assert.ok(text.includes(heading), heading);
  assert.ok(text.includes(auto.END_MARKER));
  assert.match(text, /handoff deferred/);
  assert.match(text, /do not run \/clear/i);
  assert.doesNotMatch(
    auto.handoffRequest(3, { percent: 96, basis: 'window' }, '/h/x.md'),
    /deferred/
  );
  const resume = auto.autoResumePrompt('/h/x.md');
  assert.ok(resume.includes('"/h/x.md"'));
  assert.match(resume, /Resume protocol/);
});

test('task-0127 below the start point nothing is asked', async () => {
  const { hooks, submitted, appended, ran, $ } = await loadPlugin(80, at(70_000));
  await hooks['session.start']($, {}, async () => undefined);
  await runStep(hooks, $);
  await endTurn(hooks, $);
  assert.deepEqual([submitted, appended, ran], [[], [], []]);
});

test('task-0127 past the start point the turn end asks for the handoff, once per tier', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].asUser, undefined, 'the request is the plugin speaking, not the owner');
  assert.match(submitted[0].text, /\/home\/ale\/\.agentic\/handoffs\/\d{8}T\d{6}Z-auto-sess-1\.md/);
  await endTurn(hooks, $, { answer: 'handoff deferred: a job is running' });
  assert.equal(submitted.length, 1, 'a deferral is not asked again at the same tier');
  assert.deepEqual(ran, []);
});

test('task-0127 a deferred handoff is asked again when the next tier is reached', async () => {
  let tokens = 82_000;
  const { hooks, submitted, $ } = await loadPlugin(80, async () => at(tokens)());
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  tokens = 91_000;
  await endTurn(hooks, $);
  assert.equal(submitted.length, 2);
  assert.equal(requestedPath(submitted[1].text), requestedPath(submitted[0].text));
  assert.match(submitted[1].text, /this turn/i);
});

test('task-0127 a whole handoff is followed by a clear and a resume in the same window', async () => {
  const { hooks, submitted, ran, files, toasts, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  const path = requestedPath(submitted[0].text);
  files[path] = wholeHandoff();
  await endTurn(hooks, $, { answer: 'handoff written' });
  assert.deepEqual(ran, [{ command: 'clear' }]);
  assert.equal(submitted.length, 2);
  assert.equal(submitted[1].asUser, true);
  assert.equal(submitted[1].text, auto.autoResumePrompt(path));
  assert.equal(toasts.length, 1);
});

test('task-0127 an unfinished handoff file clears nothing', async () => {
  const { hooks, submitted, ran, files, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  files[requestedPath(submitted[0].text)] = wholeHandoff().replace(auto.END_MARKER, '');
  await endTurn(hooks, $, { answer: 'handoff written' });
  assert.deepEqual(ran, []);
  assert.equal(submitted.length, 1);
});

test('task-0127 a handoff given as the answer is saved by the plugin and then resumed from', async () => {
  const { hooks, submitted, ran, files, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  const path = requestedPath(submitted[0].text);
  await endTurn(hooks, $, { answer: `The Write tool was refused.\n\n${wholeHandoff()}` });
  assert.ok(auto.isHandoffComplete(files[path]));
  assert.ok(files[path].startsWith('# Handoff'), 'the words before the handoff are dropped');
  assert.deepEqual(ran, [{ command: 'clear' }]);
  assert.equal(submitted[1].asUser, true);
});

test('task-0127 in a long turn the handoff is asked mid-turn, as a note beside the tool results', async () => {
  const { hooks, submitted, appended, ran, files, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await runStep(hooks, $);
  assert.equal(appended.length, 1);
  const note = appended[0].message;
  assert.equal(note.type, 'user');
  const path = requestedPath(note.content[0].text);
  assert.ok(note.content[0].text.includes(auto.END_MARKER));
  await runStep(hooks, $);
  assert.equal(appended.length, 1, 'one note per tier');
  files[path] = wholeHandoff();
  await endTurn(hooks, $, { answer: 'handoff written' });
  assert.deepEqual(ran, [{ command: 'clear' }]);
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].text, auto.autoResumePrompt(path));
});

test('task-0127 a step that ends the turn or runs in a subagent gets no note', async () => {
  const { hooks, appended, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await runStep(hooks, $, []);
  await runStep(hooks, $, [{ name: 'Bash' }], 'agent-1');
  assert.deepEqual(appended, []);
  const result = await runStep(hooks, $);
  assert.deepEqual(result, { toolUses: [{ name: 'Bash' }], stopReason: 'tool_use' });
});

test('task-0127 a note the model ignored becomes a request at the end of the turn', async () => {
  const { hooks, submitted, appended, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await runStep(hooks, $);
  await endTurn(hooks, $);
  assert.equal(appended.length, 1);
  assert.equal(submitted.length, 1);
  assert.equal(
    requestedPath(submitted[0].text),
    requestedPath(appended[0].message.content[0].text)
  );
});

test('task-0127 turned off by the option or the environment, nothing is asked or cleared', async () => {
  for (const extra of [
    { options: { autoHandoff: false } },
    { env: { AGENTIC_AUTO_HANDOFF: 'off' } },
  ]) {
    const { hooks, submitted, appended, ran, $ } = await loadPlugin(80, at(97_000), extra);
    await hooks['session.start']($, {}, async () => undefined);
    await runStep(hooks, $);
    await endTurn(hooks, $);
    assert.deepEqual([submitted, appended, ran], [[], [], []]);
  }
});

test('task-0127 the environment sets the start point, for headless runs', async () => {
  const { hooks, submitted, $ } = await loadPlugin(80, at(35_000), {
    env: { AGENTIC_AUTO_HANDOFF: '30' },
  });
  await endTurn(hooks, $);
  assert.equal(submitted.length, 1, 'works with no session.start heard, as after a /clear');
});

test('task-0127 an interrupted or failed turn asks for nothing and clears nothing', async () => {
  const { hooks, submitted, ran, files, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $, { reason: 'aborted' });
  assert.deepEqual(submitted, []);
  await endTurn(hooks, $);
  files[requestedPath(submitted[0].text)] = wholeHandoff();
  await endTurn(hooks, $, { reason: 'error' });
  assert.deepEqual(ran, []);
});

test('task-0127 a subagent turn end never starts the cycle', async () => {
  const { hooks, submitted, $ } = await loadPlugin(80, at(97_000));
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $, { agentId: 'agent-1' });
  assert.deepEqual(submitted, []);
});

test('task-0127 the system prompt vouches for the requests, and bounds what they may ask', async () => {
  const engine = { sections: [{ id: 'intro', text: 'x', scope: 'shared' }] };
  const { hooks, $ } = await loadPlugin(80, at(10_000));
  const { sections } = await hooks['prompt.compose']($, {}, async () => engine);
  assert.deepEqual(sections[0], engine.sections[0], "the engine's sections stay first");
  assert.equal(sections.length, 2);
  assert.deepEqual(Object.keys(sections[1]).sort(), ['id', 'scope', 'text']);
  assert.equal(sections[1].id, 'agentic-session:auto-handoff');
  assert.equal(sections[1].scope, 'session');
  assert.ok(sections[1].text.includes(auto.AUTO_LABEL));
  assert.ok(sections[1].text.includes(auto.HANDOFF_DIR));
  for (const text of [
    auto.handoffRequest(1, { percent: 80 }, '/h/x.md'),
    auto.midTurnNote(2, { percent: 90 }, '/h/x.md'),
  ])
    assert.ok(text.startsWith(auto.AUTO_LABEL), 'every request opens with the label');
});

test('task-0127 with the cycle off the system prompt is left as the engine composed it', async () => {
  const engine = { sections: [{ id: 'intro', text: 'x', scope: 'shared' }] };
  const { hooks, $ } = await loadPlugin(80, at(10_000), {
    env: { AGENTIC_AUTO_HANDOFF: 'off' },
  });
  assert.equal(await hooks['prompt.compose']($, {}, async () => engine), engine);
});

// Ask, write the whole handoff and roll over: two prompts submitted.
async function rollOnce(hooks, $, submitted, files) {
  await endTurn(hooks, $);
  files[requestedPath(submitted.at(-1).text)] = wholeHandoff();
  await endTurn(hooks, $, { answer: 'handoff written' });
}

test('task-0127 a session resumed already past the start point rests instead of handing off for ever', async () => {
  let tokens = 82_000;
  const { hooks, submitted, appended, files, $ } = await loadPlugin(80, async () => at(tokens)());
  await hooks['session.start']($, {}, async () => undefined);
  await rollOnce(hooks, $, submitted, files);
  assert.equal(submitted.length, 2);
  await runStep(hooks, $);
  await endTurn(hooks, $);
  tokens = 97_000;
  await runStep(hooks, $);
  await endTurn(hooks, $);
  assert.equal(submitted.length, 2, 'no request while resting, critical or not');
  assert.deepEqual(appended, []);
});

test('task-0127 a session resumed below the start point is asked again when it reaches it', async () => {
  let tokens = 82_000;
  const { hooks, submitted, appended, files, ran, $ } = await loadPlugin(80, async () =>
    at(tokens)()
  );
  await hooks['session.start']($, {}, async () => undefined);
  await rollOnce(hooks, $, submitted, files);
  tokens = 30_000;
  await runStep(hooks, $);
  assert.deepEqual(appended, []);
  tokens = 85_000;
  await runStep(hooks, $);
  assert.equal(appended.length, 1, 'the long resumed turn is asked mid-turn');
  const second = requestedPath(appended[0].message.content[0].text);
  files[second] = wholeHandoff();
  await endTurn(hooks, $, { answer: 'handoff written' });
  assert.deepEqual(ran, [{ command: 'clear' }, { command: 'clear' }]);
  assert.equal(submitted.at(-1).text, auto.autoResumePrompt(second));
});

test('task-0127 a compaction that overtakes the handoff drops it: its file clears nothing', async () => {
  let tokens = 96_000;
  const { hooks, submitted, appended, files, ran, $ } = await loadPlugin(80, async () =>
    at(tokens)()
  );
  await hooks['session.start']($, {}, async () => undefined);
  await runStep(hooks, $);
  files[requestedPath(appended[0].message.content[0].text)] = wholeHandoff();
  await hooks['session.compact']($, { trigger: 'auto' }, async () => undefined);
  tokens = 30_000;
  await endTurn(hooks, $, { answer: 'ALL-DONE' });
  assert.deepEqual(ran, [], 'the work went on in the compacted context');
  assert.deepEqual(submitted, []);
});

test('task-0127 a request left behind is dropped when the context falls below the start point', async () => {
  let tokens = 82_000;
  const { hooks, submitted, ran, files, $ } = await loadPlugin(80, async () => at(tokens)());
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  const path = requestedPath(submitted[0].text);
  tokens = 20_000;
  await endTurn(hooks, $);
  files[path] = wholeHandoff();
  await endTurn(hooks, $);
  assert.deepEqual(ran, [], 'a file written for a dropped request clears nothing');
});

test('task-0127 a refused clear sends no resume and names the handoff', async () => {
  const { hooks, submitted, appended, ran, files, toasts, logs, $ } = await loadPlugin(
    80,
    at(82_000)
  );
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  const path = requestedPath(submitted[0].text);
  files[path] = wholeHandoff();
  $.command.run = async (spec) => {
    ran.push(spec);
    throw new Error('clear refused');
  };
  await endTurn(hooks, $, { answer: 'handoff written' });
  assert.equal(submitted.length, 1);
  assert.ok(toasts[0].includes(path));
  assert.match(logs.at(-1).text, /clear refused/);
  await runStep(hooks, $);
  await endTurn(hooks, $);
  assert.equal(submitted.length, 1, 'a refused clear rests: no new handoff every turn');
  assert.deepEqual(appended, []);
});

test('task-0127 the handoff turn of a button press gets no automatic note', async () => {
  const { hooks, appended, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  await runStep(hooks, $);
  assert.deepEqual(appended, []);
});

test('task-0127 a button press with the box off keeps the automatic cycle out of its turn', async () => {
  const { hooks, appended, submitted, ran, $ } = await loadPlugin(80, at(82_000), {
    handoffs: oneNewFile,
  });
  await hooks['session.start']($, {}, async () => undefined);
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  await hooks['turn.start']($, { turnId: 'manual' }, async () => undefined);
  await runStep(hooks, $);
  await hooks['turn.complete']($, { turnId: 'manual', reason: 'answer' }, async () => undefined);
  await tick();
  assert.deepEqual(appended, []);
  assert.deepEqual(submitted, []);
  assert.deepEqual(ran, [{ command: 'ad-handoff' }], 'the box is off: nothing is cleared');
  await endTurn(hooks, $);
  assert.equal(submitted.length, 1, 'the next turn is the automatic cycle again');
});

async function pressAtEighty() {
  const plugin = await loadPlugin(80, at(82_000), { handoffs: oneNewFile });
  const { hooks, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  return plugin;
}

test('task-0127 a subagent turn does not take the button press', async () => {
  const { hooks, submitted, $ } = await pressAtEighty();
  await hooks['turn.start']($, { turnId: 'sub', agentId: 'a1' }, async () => undefined);
  await hooks['turn.start']($, { turnId: 'manual' }, async () => undefined);
  await hooks['turn.complete']($, { turnId: 'manual', reason: 'answer' }, async () => undefined);
  await endTurn(hooks, $);
  assert.equal(submitted.length, 1, 'the press ended with its own turn');
});

test('task-0127 a button press that never got a turn stops holding the automatic cycle', async () => {
  const { hooks, submitted, $ } = await pressAtEighty();
  await endTurn(hooks, $);
  assert.deepEqual(submitted, [], 'held while the press is fresh');
  const realNow = Date.now;
  const later = realNow() + 11 * 60 * 1000;
  Date.now = () => later;
  try {
    await endTurn(hooks, $);
  } finally {
    Date.now = realNow;
  }
  assert.equal(submitted.length, 1);
});

test('task-0127 a refused request or resume never breaks the turn', async () => {
  const { hooks, ran, files, toasts, logs, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  const asked = [];
  $.prompt.submit = async (input) => {
    asked.push(input);
    throw new Error('submit refused');
  };
  await endTurn(hooks, $);
  assert.match(logs.at(-1).text, /submit refused/);
  files[requestedPath(asked[0].text)] = wholeHandoff();
  await endTurn(hooks, $, { answer: 'handoff written' });
  assert.deepEqual(ran, [{ command: 'clear' }]);
  assert.match(toasts.at(-1), /cleared, but the resume prompt was not sent/);
});

test('task-0127 with no home directory the cycle does nothing and says why in the debug log', async () => {
  const { hooks, submitted, logs, $ } = await loadPlugin(80, at(82_000), {
    env: { HOME: undefined },
  });
  await hooks['session.start']($, {}, async () => undefined);
  await endTurn(hooks, $);
  assert.deepEqual(submitted, []);
  assert.match(logs.at(-1).text, /no home directory/);
});

test('task-0127 an automatic compaction that still happens is told what to preserve', async () => {
  const { hooks, submitted, $ } = await loadPlugin(80, at(82_000));
  await hooks['session.start']($, {}, async () => undefined);
  const seen = [];
  const next = async (e) => {
    seen.push(e);
  };
  await hooks['session.compact']($, { trigger: 'auto', instructions: 'keep X' }, next);
  assert.match(seen[0].instructions, /^keep X\n\n/);
  assert.match(seen[0].instructions, /roadmap/i);
  await endTurn(hooks, $);
  await hooks['session.compact']($, { trigger: 'auto' }, next);
  assert.ok(seen[1].instructions.includes(requestedPath(submitted[0].text)));
  await hooks['session.compact']($, { trigger: 'manual', instructions: 'mine' }, next);
  assert.deepEqual(seen[2], { trigger: 'manual', instructions: 'mine' });
  await hooks['session.compact']($, { trigger: 'auto', agentId: 'a' }, next);
  assert.equal(seen[3].instructions, undefined);
});

test('task-0127 the manifest declares the automatic handoff options, on by default', () => {
  const config = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json')).userConfig;
  assert.equal(config.autoHandoff.type, 'boolean');
  assert.equal(config.autoHandoff.default, true);
  const point = config.autoHandoffAt;
  assert.deepEqual(
    [point.type, point.default, point.min, point.max],
    ['number', auto.DEFAULT_AUTO_AT, 1, 99]
  );
});

test('task-0127 the skill and the plugin agree on the automatic handoff contract', () => {
  for (const host of ['claude-code', 'codex']) {
    const dir = join(ROOT, 'src', 'skills', host, 'ad-handoff');
    const skill = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(dir, 'references', 'auto-handoff-template.md'), 'utf8');
    assert.match(skill, /--auto/, host);
    assert.ok(skill.includes(auto.END_MARKER), `${host} skill names the end marker`);
    assert.ok(skill.includes(auto.HANDOFF_DIR), `${host} skill names the stable directory`);
    for (const heading of auto.AUTO_HEADINGS)
      assert.ok(template.includes(`\n${heading}\n`), `${host} template has ${heading}`);
    assert.ok(
      template.trimEnd().endsWith(`${auto.END_MARKER}\n\`\`\`\``),
      `${host} template ends with the marker`
    );
  }
});
