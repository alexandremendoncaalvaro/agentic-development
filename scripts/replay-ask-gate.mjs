#!/usr/bin/env node
// Task 0129, ADR-0099 decision 5: replay the ask gate over every reply that
// ended a turn in local Claude Code transcripts (~/.claude/projects/**/*.jsonl,
// subagent sidechains skipped): an assistant text followed by a typed user
// message. Prints the counts and, with --show N, the tail of N held replies
// and the owner's next message, for hand labelling. Repo-only tooling; reads
// local transcripts and prints excerpts, so run it on your own machine.
// Usage: node scripts/replay-ask-gate.mjs [--show N] [path-to-ask-gate.mjs]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const showAt = args.indexOf('--show');
const show = showAt >= 0 ? Number(args.splice(showAt, 2)[1]) : 0;
const gatePath = args[0]
  ? pathToFileURL(resolve(args[0])).href
  : new URL('../src/skills/claude-code/ad-hooks/scripts/ask-gate.mjs', import.meta.url).href;
const { askVerdict } = await import(gatePath);

function typedText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.some((c) => c.type === 'tool_result')) return null;
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

const turns = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name !== 'subagents') walk(p);
      continue;
    }
    if (!name.endsWith('.jsonl')) continue;
    let last = null;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      let d;
      try {
        d = JSON.parse(line);
      } catch {
        continue;
      }
      if (d.isSidechain) continue;
      const content = d.message?.content ?? [];
      if (d.type === 'assistant') {
        const text = Array.isArray(content)
          ? content
              .filter((c) => c.type === 'text')
              .map((c) => c.text)
              .join('\n')
          : '';
        if (text) last = text;
        else if (Array.isArray(content) && content.some((c) => c.type === 'tool_use')) last = null;
      } else if (d.type === 'user' && !d.isMeta) {
        const typed = typedText(content);
        if (typed == null) continue;
        if (last && typed && !typed.startsWith('<')) turns.push({ reply: last, next: typed });
        last = null;
      }
    }
  }
}
walk(join(homedir(), '.claude', 'projects'));

const counts = { turns: turns.length, asks: 0, held: 0, recommendation: 0, 'trade-offs': 0 };
const held = [];
for (const turn of turns) {
  const v = askVerdict(turn.reply);
  if (v.asks) counts.asks += 1;
  if (v.missing.length === 0) continue;
  counts.held += 1;
  for (const m of v.missing) counts[m] += 1;
  held.push(turn);
}
console.log(JSON.stringify(counts));
const step = show > 0 ? Math.max(1, Math.floor(held.length / show)) : 0;
for (let i = 0; show > 0 && i < held.length && i / step < show; i += step) {
  const { reply, next } = held[i];
  console.log(
    `--- ${i}\nA: ${reply.slice(-240).replace(/\s+/g, ' ')}\nU: ${next.slice(0, 100).replace(/\s+/g, ' ')}`
  );
}
