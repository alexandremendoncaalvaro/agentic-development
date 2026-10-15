#!/usr/bin/env node
/**
 * ad-hooks reply-language detector, shadow only (task-0121).
 *
 * A `Stop` command hook. When a confirmed voice profile names the owner's
 * conversation language, it guesses the language of the reply just shown
 * (`last_assistant_message`) from common function words and appends one JSON
 * line when the two differ. It never blocks, prints nothing and stores no
 * reply text: the line carries the expected and detected languages and the
 * time, so a later read can measure drift before anything enforces it.
 * Languages it can tell apart: Portuguese, English, Spanish.
 *
 * Evidence: `<tmpdir>/agentic-reply-language/<session_id>.jsonl`,
 * `AD_REPLY_LANGUAGE_EVIDENCE_DIR` redirects it; `AD_REPLY_LANGUAGE=0`
 * silences the hook.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { conversationLanguage } from './workflow-checkpoint.mjs';

const STOPWORDS = {
  pt: [
    'não',
    'que',
    'para',
    'com',
    'uma',
    'você',
    'está',
    'são',
    'mas',
    'isso',
    'porque',
    'também',
    'já',
    'agora',
    'aqui',
  ],
  en: [
    'the',
    'and',
    'is',
    'for',
    'with',
    'you',
    'this',
    'that',
    'are',
    'but',
    'because',
    'also',
    'now',
    'here',
    'there',
  ],
  es: [
    'que',
    'para',
    'con',
    'una',
    'usted',
    'está',
    'son',
    'pero',
    'esto',
    'porque',
    'también',
    'ya',
    'ahora',
    'aquí',
    'el',
  ],
};
const MIN_HITS = 3;

/** The likeliest of pt, en and es for a text, or null when it is too short to tell. */
export function replyLanguage(text) {
  const words =
    String(text)
      .replace(/```[\s\S]*?```|`[^`]*`/g, ' ')
      .toLowerCase()
      .match(/\p{L}+/gu) ?? [];
  let best = null;
  let bestHits = 0;
  for (const [language, list] of Object.entries(STOPWORDS)) {
    const hits = words.filter((word) => list.includes(word)).length;
    if (hits > bestHits) {
      best = language;
      bestHits = hits;
    }
  }
  return bestHits >= MIN_HITS ? best : null;
}

function main() {
  if (process.env.AD_REPLY_LANGUAGE === '0') return;
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  const message = event?.last_assistant_message;
  if (typeof message !== 'string') return;
  const expected = conversationLanguage(process.env, process.env.HOME || homedir());
  if (!expected) return;
  const detected = replyLanguage(message);
  if (!detected || expected.toLowerCase().split('-')[0] === detected) return;
  const dir =
    process.env.AD_REPLY_LANGUAGE_EVIDENCE_DIR || join(tmpdir(), 'agentic-reply-language');
  const session = String(event.session_id || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
  mkdirSync(dir, { recursive: true });
  appendFileSync(
    join(dir, `${session}.jsonl`),
    `${JSON.stringify({ at: new Date().toISOString(), expected, detected })}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
