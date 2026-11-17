import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeCost } from '../eval/resume-cost.mjs';

const usage = (input, cacheRead, cacheCreation) => ({
  input_tokens: input,
  cache_read_input_tokens: cacheRead,
  cache_creation_input_tokens: cacheCreation,
});

const ROWS = [
  { type: 'user', message: { content: 'an earlier prompt' } },
  { type: 'assistant', message: { id: 'm0', usage: usage(1, 50_000, 0), content: [] } },
  { type: 'user', message: { content: 'Read "/tmp/agentic-handoffs/x-desk.md" first' } },
  { type: 'user', isMeta: true, message: { content: 'host-injected row' } },
  {
    type: 'assistant',
    message: {
      id: 'm1',
      usage: usage(2, 70_000, 5_000),
      content: [{ type: 'tool_use', id: 't1', name: 'Read' }],
    },
  },
  // The same API message streamed twice counts once.
  { type: 'assistant', message: { id: 'm1', usage: usage(2, 70_000, 5_000), content: [] } },
  {
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x'.repeat(400) }] },
  },
  {
    type: 'assistant',
    message: {
      id: 'm2',
      usage: usage(3, 75_000, 4_000),
      content: [{ type: 'tool_use', id: 't2', name: 'Bash' }],
    },
  },
  {
    type: 'user',
    message: {
      content: [
        { type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'ok' }] },
      ],
    },
  },
  // A subagent's own call runs in its own context and never counts here.
  {
    type: 'assistant',
    isSidechain: true,
    message: { id: 's1', usage: usage(1, 9_000, 0), content: [] },
  },
  { type: 'assistant', message: { id: 'm3', usage: usage(1, 79_000, 1_000), content: [] } },
  { type: 'user', message: { content: [{ type: 'text', text: 'the next prompt' }] } },
  { type: 'assistant', message: { id: 'm4', usage: usage(1, 99_000, 0), content: [] } },
];

test('resumeCost measures the turn from the marked prompt to the next prompt', () => {
  const cost = resumeCost(ROWS, 'x-desk.md');
  assert.equal(cost.apiCalls, 3);
  assert.equal(cost.firstCallContext, 75_002);
  assert.equal(cost.lastCallContext, 80_001);
  assert.equal(cost.resumeTurnGrowth, 4_999);
  // RESEARCH-0047 E1 reads growth from the second call, after the host's
  // first-call listings have landed.
  assert.equal(cost.growthPastFirstCall, 998);
  assert.equal(cost.toolResultChars, 400 + JSON.stringify([{ type: 'text', text: 'ok' }]).length);
  assert.deepEqual(Object.keys(cost.toolResultCharsByTool).sort(), ['Bash', 'Read']);
});

test('resumeCost returns null when no prompt carries the marker', () => {
  assert.equal(resumeCost(ROWS, 'absent.md'), null);
});
