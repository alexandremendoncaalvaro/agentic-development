#!/usr/bin/env node
// Task 0127: the context cost of one resume turn, read from a Claude Code
// session transcript (RESEARCH-0047). Repo-only and never shipped; it prints
// token counts and tool names only, never transcript text.
//
// Usage: node eval/resume-cost.mjs <transcript.jsonl> <marker>
// The resume turn starts at the first prompt the person typed that contains
// <marker> (the handoff file name, say) and ends before their next prompt.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// The context the model received on one API call.
const contextOf = (usage) =>
  (usage.input_tokens || 0) +
  (usage.cache_read_input_tokens || 0) +
  (usage.cache_creation_input_tokens || 0);

const contentOf = (row) => row.message?.content;

// A prompt the person typed, not a tool result or a host-injected meta row.
function isPrompt(row) {
  if (row.type !== 'user' || row.isMeta) return false;
  const content = contentOf(row);
  if (typeof content === 'string') return true;
  return (
    Array.isArray(content) &&
    content.some((part) => part.type === 'text') &&
    !content.some((part) => part.type === 'tool_result')
  );
}

function promptText(row) {
  const content = contentOf(row);
  if (typeof content === 'string') return content;
  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

// Context size at the first and last API call of the resume turn, their
// difference, the growth from the second call on (the first call's context
// still lacks the host's late listings, so RESEARCH-0047 E1 reads from the
// second), and the tool results the turn pulled in, by tool name. A
// subagent's own calls run in a separate context and are skipped.
export function resumeCost(rows, marker) {
  const start = rows.findIndex((row) => isPrompt(row) && promptText(row).includes(marker));
  if (start < 0) return null;
  let end = rows.findIndex((row, index) => index > start && isPrompt(row));
  if (end < 0) end = rows.length;

  const calls = [];
  const seen = new Set();
  const toolNames = new Map();
  const byTool = {};
  let resultChars = 0;
  for (const row of rows.slice(start, end)) {
    const content = contentOf(row);
    if (
      row.type === 'assistant' &&
      !row.isSidechain &&
      row.message?.usage &&
      !seen.has(row.message.id)
    ) {
      seen.add(row.message.id);
      calls.push(contextOf(row.message.usage));
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part.type === 'tool_use') toolNames.set(part.id, part.name);
      if (part.type !== 'tool_result') continue;
      const text = typeof part.content === 'string' ? part.content : JSON.stringify(part.content);
      const name = toolNames.get(part.tool_use_id) ?? 'unknown';
      byTool[name] = (byTool[name] ?? 0) + text.length;
      resultChars += text.length;
    }
  }
  const first = calls[0] ?? 0;
  const last = calls.at(-1) ?? 0;
  return {
    apiCalls: calls.length,
    firstCallContext: first,
    lastCallContext: last,
    resumeTurnGrowth: last - first,
    growthPastFirstCall: calls.length > 1 ? last - calls[1] : 0,
    toolResultChars: resultChars,
    toolResultCharsByTool: byTool,
  };
}

export function readTranscript(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [path, marker] = process.argv.slice(2);
  if (!path || !marker) {
    console.error('usage: node eval/resume-cost.mjs <transcript.jsonl> <marker>');
    process.exit(2);
  }
  const cost = resumeCost(readTranscript(path), marker);
  if (!cost) {
    console.error('no prompt contains the marker');
    process.exit(1);
  }
  console.log(JSON.stringify(cost, null, 2));
}
