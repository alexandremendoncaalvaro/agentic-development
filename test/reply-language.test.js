import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replyLanguage } from '../src/skills/claude-code/ad-hooks/scripts/reply-language.mjs';

// Task 0121: a shadow detector that logs replies outside the owner's
// conversation language; it never blocks and prints nothing.
const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-hooks',
  'scripts',
  'reply-language.mjs'
);

const PT =
  'Terminei a auditoria e o relatório está pronto para você revisar com calma, porque não há bloqueio.';
const EN =
  'I finished the audit and the report is ready for you to review, because there is no blocker.';

test('reply language: a Portuguese reply reads as pt and an English one as en', () => {
  assert.equal(replyLanguage(PT), 'pt');
  assert.equal(replyLanguage(EN), 'en');
  assert.equal(replyLanguage('`npm test` 1410/1410'), null);
});

function voiceDir(language) {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-'));
  const profile = { status: 'confirmed', languages: { conversation: language } };
  writeFileSync(
    join(dir, 'profile.md'),
    `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${JSON.stringify(profile)}\n\`\`\`\n`
  );
  return dir;
}

function run(message, language = 'pt-BR') {
  const evidence = mkdtempSync(join(tmpdir(), 'agentic-reply-evidence-'));
  const out = execFileSync('node', [SCRIPT], {
    input: JSON.stringify({
      hook_event_name: 'Stop',
      session_id: 's1',
      last_assistant_message: message,
    }),
    encoding: 'utf8',
    env: {
      ...process.env,
      AD_REPLY_LANGUAGE: '',
      AGENTIC_VOICE_DIR: voiceDir(language),
      AD_REPLY_LANGUAGE_EVIDENCE_DIR: evidence,
    },
  });
  const file = join(evidence, 's1.jsonl');
  return {
    out,
    lines: existsSync(file)
      ? readFileSync(file, 'utf8')
          .trim()
          .split('\n')
          .map((l) => JSON.parse(l))
      : [],
  };
}

test('reply language: a reply outside the conversation language is logged, nothing is printed', () => {
  const { out, lines } = run(EN);
  assert.equal(out, '');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].expected, 'pt-BR');
  assert.equal(lines[0].detected, 'en');
  assert.equal(typeof lines[0].text, 'undefined', 'the reply text is never stored');
});

test('reply language: a reply in the conversation language or an undetectable one leaves no line', () => {
  assert.deepEqual(run(PT).lines, []);
  assert.deepEqual(run('ok').lines, []);
});

test('reply language: a conversation language it cannot tell apart is never logged as drift', () => {
  assert.deepEqual(run(EN, 'fr').lines, []);
});
