// Stage 4: the adoption check. Loads the ONNX export of a checkpoint through laya-ts (built
// from source; it is not on npm) with onnxruntime-node on CPU, answers the effect and size
// questions over heldout3, and compares each choice with the Python run's debug rows.
// Run from ~/.cache/laya-spike/node:  node <spike>/pipeline/06_node_probe.mjs <onnx-dir> <py-debug-dir>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// laya-ts is not on npm; LAYA_TS points at the locally built package's entry file.
const { Agent } = await import(process.env.LAYA_TS ?? 'laya-ts');

const [onnxDir, pyDebug] = process.argv.slice(2);
const spike = new URL('..', import.meta.url).pathname;
const fixture = (name) => JSON.parse(readFileSync(join(spike, 'fixtures', name), 'utf8'));
const jsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const definitions = fixture('test-effects.json').definitions;
const questions = {
  effect: { type: 'choice', instructions: 'What kind of effect does running this shell command have?', criteria: definitions },
  size: {
    type: 'choice',
    instructions: 'Is this a quick request, or does it need a real engineering workflow?',
    criteria: {
      quick: 'a question, an acknowledgement, or a one-line mechanical edit',
      workflow: 'a change that needs research, tests, review, or an outward step',
    },
  },
};

const t0 = performance.now();
const agent = await Agent.load(onnxDir);
const loadMs = performance.now() - t0;
const cfg = JSON.parse(readFileSync(join(onnxDir, 'rl_agent_config.json'), 'utf8'));
if (agent.cfg) Object.assign(agent.cfg, { max_len: cfg.max_len, head_max_len: cfg.head_max_len });

async function run(items, key, qid, pyFile, pyChoice) {
  const py = new Map(jsonl(join(pyDebug, pyFile)).map((r) => [r.id, r]));
  const rows = [];
  for (const item of items) {
    const start = performance.now();
    const out = await agent.predict(item[key], { [qid]: questions[qid] });
    const ms = performance.now() - start;
    const choice = out.answers[qid].choice;
    rows.push({ id: item.id, choice, ms, matchesPython: choice === pyChoice(py.get(item.id)) });
  }
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  return {
    n: rows.length,
    parity: rows.filter((r) => r.matchesPython).length / rows.length,
    p50_ms: Math.round(ms[Math.floor(ms.length / 2)]),
    p95_ms: Math.round(ms[Math.floor(ms.length * 0.95)]),
  };
}

const effects = await run(fixture('heldout3-effects.json').items, 'command', 'effect', 'effects-laya.jsonl', (r) => r.got);
const size = await run(fixture('heldout3-trivial.json').items, 'request', 'size', 'trivial-laya.jsonl',
  (r) => (r.got ? 'quick' : 'workflow'));
const summary = { runtime: `node ${process.version}, onnxruntime-node CPU`, load_ms: Math.round(loadMs), effects, size };
writeFileSync(join(spike, 'eval', 'node-probe-v1.json'), `${JSON.stringify(summary, null, 1)}\n`);
console.log(JSON.stringify(summary, null, 1));
