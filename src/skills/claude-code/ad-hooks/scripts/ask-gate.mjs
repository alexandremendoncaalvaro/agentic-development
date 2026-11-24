#!/usr/bin/env node
/**
 * ad-hooks ask gate (ADR-0099, task-0129).
 *
 * A `Stop` command hook. When the reply just shown (`last_assistant_message`)
 * ends by asking the owner a question — a `?` closing one of its last three
 * prose lines, outside code, quotation marks and `>` blockquotes — and carries
 * no recommendation, or names labelled options (`opção A`, `option 2`) without
 * a trade-off, it keeps the turn going once with `{"decision":"block"}`. The
 * reason tells the model to decide when the evidence settles it, and otherwise
 * to restate the question as a decision card. Both hosts read that JSON on exit
 * 0; Codex turns the reason into a continuation prompt.
 *
 * Loop guards: `stop_hook_active` lets a continued turn stop, and a per-session
 * cooldown (`AD_ASK_GATE_COOLDOWN_SECONDS`, default 300) covers hosts where that
 * flag stays false. Each held reply appends one line, state `blocked`,
 * `cooldown` or `would-block`, to `<tmpdir>/agentic-ask-gate/<session_id>.jsonl`
 * (`AD_ASK_GATE_EVIDENCE_DIR` redirects it); no reply text is stored.
 * `AD_ASK_GATE=shadow` only logs; `AD_ASK_GATE=0` turns it off. It fails open.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_COOLDOWN_SECONDS = 300;
// A recommendation is the agent naming its own pick, not only the word itself.
const RECOMMENDATION =
  /recomend|recommend|sugiro|suggest|minha escolha|my pick|\biria de\b|\beu faria\b|\bescolho\b|\bvou (?:de|com) (?:a |o )?[a-d1-4]\b|\bI(?:'?d|'?ll| will) (?:go with|pick|choose)\b/i;
const LABELLED_OPTIONS = /\b(?:op[çc][ãa]o|option|caminho|path)\s+[a-d1-4]\b/i;
const TRADE_OFF =
  /vantage|trade-?off|\bpr[óo]s\b|\bcontras?\b|\bcons\b|upside|downside|\bcusto|\bcost|\brisco|\brisk/i;

/** The reply without code, quoted text and blockquotes: what the agent says in its own voice. */
function prose(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`[^`\n]*`/g, 'x')
    .replace(/"[^"\n]*"|“[^”\n]*”/g, 'q')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('>'));
}

/** Whether a reply ends by asking the owner, and what a decision card would still need. */
export function askVerdict(text) {
  const lines = prose(text);
  const asks = lines.slice(-3).some((line) => /\?[^\p{L}\p{N}?]*$/u.test(line));
  if (!asks) return { asks, missing: [] };
  const missing = [];
  const own = lines.join('\n');
  if (!RECOMMENDATION.test(own)) missing.push('recommendation');
  if (LABELLED_OPTIONS.test(own) && !TRADE_OFF.test(own)) missing.push('trade-offs');
  return { asks, missing };
}

function reason(missing) {
  return [
    `Ask gate (ad-hooks): your reply ends by asking the owner a question without ${missing.join(' or ')}.`,
    'If the evidence or an earlier decision already settles it, do not ask: decide, act, and report what you did.',
    'Ask only for a design or product call, an approval before something leaves the repository, or what grounding cannot settle;',
    'then restate it once as a decision card: the evidence, each option with its advantage and disadvantage, and your recommendation with a one-line reason.',
    'If it is a fact only the owner can supply, say so in one line and stop.',
  ].join(' ');
}

function evidenceFile(event) {
  const dir = process.env.AD_ASK_GATE_EVIDENCE_DIR || join(tmpdir(), 'agentic-ask-gate');
  const session = String(event.session_id || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
  return { dir, file: join(dir, `${session}.jsonl`) };
}

function record(event, line) {
  const { dir, file } = evidenceFile(event);
  mkdirSync(dir, { recursive: true });
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...line })}\n`);
}

/** Milliseconds since this session's last block, or Infinity when there is none. */
function sinceLastBlock(event, now) {
  const { file } = evidenceFile(event);
  if (!existsSync(file)) return Infinity;
  let last = -Infinity;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    try {
      const entry = JSON.parse(line);
      if (entry.state === 'blocked') last = Math.max(last, Date.parse(entry.at));
    } catch {
      // A torn or foreign line says nothing about the last block.
    }
  }
  return Number.isFinite(last) ? now - last : Infinity;
}

function cooldownMs() {
  const raw = process.env.AD_ASK_GATE_COOLDOWN_SECONDS;
  const seconds = raw?.trim() ? Number(raw) : NaN;
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_COOLDOWN_SECONDS) * 1000;
}

function main() {
  if (process.env.AD_ASK_GATE === '0') return;
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  const message = event?.last_assistant_message;
  if (typeof message !== 'string' || event.stop_hook_active === true) return;
  const { missing } = askVerdict(message);
  if (missing.length === 0) return;
  if (process.env.AD_ASK_GATE === 'shadow') {
    record(event, { state: 'would-block', missing });
    return;
  }
  if (sinceLastBlock(event, Date.now()) < cooldownMs()) {
    record(event, { state: 'cooldown', missing });
    return;
  }
  record(event, { state: 'blocked', missing });
  process.stdout.write(`${JSON.stringify({ decision: 'block', reason: reason(missing) })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
