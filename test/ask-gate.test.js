import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { askVerdict } from '../src/skills/claude-code/ad-hooks/scripts/ask-gate.mjs';

// Task 0129, ADR-0099: a turn that ends asking the owner must carry a
// recommendation, and a trade-off when it offers labelled options.

test('ask gate: a closing question without a recommendation is held', () => {
  const v = askVerdict('Terminei o ground e o plano está pronto.\n\nSigo com a revisão do #790?');
  assert.equal(v.asks, true);
  assert.deepEqual(v.missing, ['recommendation']);
});

test('ask gate: labelled options with a recommendation but no trade-off are held', () => {
  const v = askVerdict(
    'Duas saídas: opção A, cortar agora; opção B, esperar o 78.\n\nRecomendo a A. Qual você prefere?'
  );
  assert.deepEqual(v.missing, ['trade-offs']);
});

test('ask gate: a decision card with options, trade-offs and a recommendation passes', () => {
  const v = askVerdict(
    [
      '- **Opção A, cortar agora:** vantagem, você testa hoje; desvantagem, o viewer fica para o 78.',
      '- **Opção B, esperar:** vantagem, um corte só; desvantagem, mais um dia sem build.',
      '',
      'Recomendo a A, porque o viewer não bloqueia o teste. Corto agora?',
    ].join('\n')
  );
  assert.deepEqual(v, { asks: true, missing: [] });
});

test('ask gate: a question inside a quoted draft, a code block or quotation marks is not a question to the owner', () => {
  const draft = 'Rascunho para o cliente:\n\n> Could you send me one frame and your settings?';
  const code = 'Rodei isto:\n\n```sh\nread -p "Continue?"\n```';
  const quoted = 'Ele escreveu: "Is your concern disk or speed?"';
  for (const text of [draft, code, quoted]) assert.equal(askVerdict(text).asks, false, text);
});

test('ask gate: a closing question in bold still counts', () => {
  assert.deepEqual(askVerdict('O gate passou.\n\n**Corto o 77 agora?**').missing, [
    'recommendation',
  ]);
});

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-hooks',
  'scripts',
  'ask-gate.mjs'
);
const BARE = 'O plano está pronto.\n\nSigo com a revisão?';

function run(event, env = {}, evidence = mkdtempSync(join(tmpdir(), 'agentic-ask-gate-'))) {
  const stdout = execFileSync('node', [SCRIPT], {
    input: typeof event === 'string' ? event : JSON.stringify(event),
    encoding: 'utf8',
    env: { ...process.env, AD_ASK_GATE: '', AD_ASK_GATE_EVIDENCE_DIR: evidence, ...env },
  });
  const file = join(evidence, 's1.jsonl');
  const lines = existsSync(file)
    ? readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l))
    : [];
  return { stdout, lines, evidence };
}

const stop = (message, extra = {}) => ({
  hook_event_name: 'Stop',
  session_id: 's1',
  stop_hook_active: false,
  last_assistant_message: message,
  ...extra,
});

test('ask gate hook: a bare closing question keeps the turn going with a reason for the model', () => {
  const { stdout } = run(stop(BARE));
  const out = JSON.parse(stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /decide/i);
  assert.match(out.reason, /recommendation/);
});

test('ask gate hook: a turn the gate already continued is let stop', () => {
  assert.equal(run(stop(BARE, { stop_hook_active: true })).stdout, '');
});

test('ask gate hook: AD_ASK_GATE=0 turns the gate off', () => {
  const { stdout, lines } = run(stop(BARE), { AD_ASK_GATE: '0' });
  assert.equal(stdout, '');
  assert.deepEqual(lines, []);
});

test('ask gate hook: a block leaves one evidence line without the reply text', () => {
  const { lines } = run(stop(BARE));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].state, 'blocked');
  assert.deepEqual(lines[0].missing, ['recommendation']);
  assert.ok(!JSON.stringify(lines[0]).includes('revisão'));
});

test('ask gate hook: a second held question inside the cooldown is let stop and logged', () => {
  const first = run(stop(BARE));
  const second = run(stop(BARE), {}, first.evidence);
  assert.equal(second.stdout, '');
  assert.deepEqual(
    second.lines.map((l) => l.state),
    ['blocked', 'cooldown']
  );
});

test('ask gate hook: once the cooldown has elapsed the next held question is blocked again', () => {
  const first = run(stop(BARE), { AD_ASK_GATE_COOLDOWN_SECONDS: '0' });
  const second = run(stop(BARE), { AD_ASK_GATE_COOLDOWN_SECONDS: '0' }, first.evidence);
  assert.equal(JSON.parse(second.stdout).decision, 'block');
});

test('ask gate hook: shadow mode logs what it would hold and lets every turn stop', () => {
  const env = { AD_ASK_GATE: 'shadow' };
  const first = run(stop(BARE), env);
  const second = run(stop(BARE), env, first.evidence);
  assert.equal(first.stdout + second.stdout, '');
  assert.deepEqual(
    second.lines.map((l) => l.state),
    ['would-block', 'would-block']
  );
});

test('ask gate hook: malformed input and a reply with a recommendation stay silent', () => {
  assert.equal(run('not json').stdout, '');
  const ok = run(stop('Recomendo cortar agora, porque o gate passou. Corto?'));
  assert.equal(ok.stdout, '');
  assert.deepEqual(ok.lines, []);
});

test('ask gate: a recommendation phrased as the agent own pick counts', () => {
  for (const text of [
    'Eu ainda iria de 1, porque o cliente acabou de pagar. Qual prefere?',
    'Minha escolha é a A. Fecho assim?',
    'Sugiro cortar agora. Corto?',
    "I'd go with option 2 because it costs less. Which one?",
  ])
    assert.deepEqual(askVerdict(text).missing.includes('recommendation'), false, text);
});

test('ask gate: the agent stating its own pick counts as a recommendation', () => {
  for (const text of [
    "I'll go with A. OK?",
    'Escolho a A. Fecho?',
    'Vou de B, que custa menos. Sigo?',
  ])
    assert.equal(askVerdict(text).missing.includes('recommendation'), false, text);
});

test('ask gate: a closing question followed by a bracket, quote mark or emoji still counts', () => {
  for (const text of ['Quer que eu faça mais?)', 'Quer? 🙂', 'Fecho assim?]'])
    assert.equal(askVerdict(text).asks, true, text);
});

test('ask gate hook: an empty cooldown setting keeps the default cooldown', () => {
  const env = { AD_ASK_GATE_COOLDOWN_SECONDS: '' };
  const first = run(stop(BARE), env);
  const second = run(stop(BARE), env, first.evidence);
  assert.equal(second.stdout, '');
});

test('ask gate: an intent that names no pick is not a recommendation', () => {
  for (const text of [
    'Vou com calma.\nQual?',
    'I will go check the logs.\nQual?',
    'Vou de carro ao banco. Qual?',
  ])
    assert.deepEqual(askVerdict(text).missing, ['recommendation'], text);
});

test('ask gate hook: a blank cooldown setting keeps the default cooldown', () => {
  const env = { AD_ASK_GATE_COOLDOWN_SECONDS: ' ' };
  const first = run(stop(BARE), env);
  assert.equal(run(stop(BARE), env, first.evidence).stdout, '');
});
