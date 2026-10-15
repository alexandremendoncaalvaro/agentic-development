#!/usr/bin/env node
// Task 0121, ADR-0094 decision 2: replay the command guard over every Bash or
// PowerShell call recorded in local Claude Code transcripts
// (~/.claude/projects/**/*.jsonl) and print the distinct commands it denies,
// to measure false blocks before a pattern changes. Repo-only tooling; reads
// local transcripts and prints matched commands, so run it on your own machine.
// Usage: node scripts/replay-command-guard.mjs [path-to-command-guard.mjs]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
const guardPath = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2])).href
  : new URL('../src/skills/claude-code/ad-hooks/scripts/command-guard.mjs', import.meta.url).href;
const { verdict } = await import(guardPath);
const root = join(homedir(), '.claude', 'projects');
let total = 0;
const denied = new Map();
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.jsonl')) {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        if (!line.includes('"tool_use"')) continue;
        let d;
        try {
          d = JSON.parse(line);
        } catch {
          continue;
        }
        for (const c of d.message?.content ?? []) {
          if (c.type !== 'tool_use' || !['Bash', 'PowerShell'].includes(c.name)) continue;
          const cmd = c.input?.command;
          if (typeof cmd !== 'string') continue;
          total += 1;
          const v = verdict(cmd);
          if (v.deny) denied.set(cmd, v.rule);
        }
      }
    }
  }
}
walk(root);
console.log(JSON.stringify({ total, deniedUnique: denied.size }));
for (const [cmd, rule] of denied) console.log(rule, '|', cmd.replace(/\n/g, '\\n').slice(0, 220));
