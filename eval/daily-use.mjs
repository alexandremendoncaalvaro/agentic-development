#!/usr/bin/env node
// Task 0126: aggregate metrics of how the kit is used, read from local Claude
// Code session transcripts for one period. Repo-only and never shipped; it
// prints counts and ratios only, never transcript text.
//
// Usage: node eval/daily-use.mjs --from YYYY-MM-DD --to YYYY-MM-DD
// The period is [from, to) in UTC. AGENTIC_TRANSCRIPTS_DIR overrides the
// transcript root (default ~/.claude/projects).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REVIEWER = 'fresh-context-reviewer';
const AUDITOR = 'audit-group-reviewer';
// A GitHub CLI call in command position (after a separator, assignments and
// the `rtk`/`env` wrappers), read after quoted text is removed, so a commit
// message or an echo that mentions the command does not count.
const GH_CALL = String.raw`(?:^|[;&|\n(])\s*(?:(?:rtk|proxy|env)\s+|[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:gh|ghp)\s+`;
const PR_CREATE = new RegExp(`${GH_CALL}pr\\s+create\\b`);
const CI_FAILURE_READ = new RegExp(`${GH_CALL}run\\s+view\\b[^\\n;&|]*--log-failed`);

// The owner's corrections of standing rules, by rule. A message counts once in
// `ownerCorrections` and once per rule it matches. Frozen with the study's
// PRISM plan; a lexical proxy, not a classifier.
export const CORRECTION_RULES = {
  language: /(em portugu[eê]s|in portuguese|\bpt-br\b|reply in (english|portuguese))/i,
  repetition: /(j[aá] (te )?(falei|disse|pedi)|\bde novo\b|\bagain\b|i already (said|told|asked))/i,
  emoji: /\bemoji/i,
  estimates: /(estimativ|\bestimate|\bprazo\b|\bdeadline)/i,
};

function usage() {
  process.stderr.write('usage: daily-use.mjs --from YYYY-MM-DD --to YYYY-MM-DD\n');
  process.exit(2);
}

function argument(args, name) {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
}

function unquoted(command) {
  return command.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""');
}

function transcriptFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) files.push(...transcriptFiles(path));
    else if (name.endsWith('.jsonl')) files.push(path);
  }
  return files;
}

function text(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  if (content.some((part) => part?.type === 'tool_result')) return null;
  return content
    .filter((part) => part?.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

// A message the owner typed: `origin.kind` "human" where the host records it;
// in older transcripts without `origin`, a plain message that is not meta and
// does not open with markup.
function ownerText(entry) {
  if (entry.type !== 'user' || entry.isSidechain || entry.isMeta || entry.isCompactSummary) {
    return null;
  }
  const body = text(entry.message?.content);
  if (!body) return null;
  if (entry.origin !== undefined) return entry.origin?.kind === 'human' ? body : null;
  const start = body.trimStart();
  return start.startsWith('<') || start.startsWith('[Request interrupted') ? null : body;
}

function toolUses(entry) {
  if (entry.type !== 'assistant' || entry.isSidechain) return [];
  const content = entry.message?.content;
  return Array.isArray(content) ? content.filter((part) => part?.type === 'tool_use') : [];
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100) / 100;
}

export function dailyUse({ root, from, to }) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  const sessions = new Set();
  // A resumed or forked session copies earlier lines into a new file; a line
  // with a uuid already seen is that copy.
  const seen = new Set();
  const counts = {
    sessions: 0,
    ownerMessages: 0,
    reviewerDispatches: 0,
    auditorDispatches: 0,
    pullRequestsCreated: 0,
    ciFailureReads: 0,
    ownerCorrections: 0,
  };
  const correctionsByRule = Object.fromEntries(Object.keys(CORRECTION_RULES).map((k) => [k, 0]));
  for (const file of transcriptFiles(root)) {
    let lines;
    try {
      lines = readFileSync(file, 'utf8').split('\n');
    } catch {
      continue;
    }
    for (const line of lines) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      const at = Date.parse(entry?.timestamp ?? '');
      if (!(at >= start && at < end)) continue;
      if (entry.uuid) {
        if (seen.has(entry.uuid)) continue;
        seen.add(entry.uuid);
      }
      if (!entry.isSidechain && entry.sessionId) sessions.add(entry.sessionId);
      const owner = ownerText(entry);
      if (owner !== null) {
        counts.ownerMessages += 1;
        const rules = Object.entries(CORRECTION_RULES).filter(([, rule]) => rule.test(owner));
        if (rules.length > 0) counts.ownerCorrections += 1;
        for (const [name] of rules) correctionsByRule[name] += 1;
      }
      for (const use of toolUses(entry)) {
        const type = use.input?.subagent_type;
        if ((use.name === 'Agent' || use.name === 'Task') && type === REVIEWER) {
          counts.reviewerDispatches += 1;
        }
        if ((use.name === 'Agent' || use.name === 'Task') && type === AUDITOR) {
          counts.auditorDispatches += 1;
        }
        const command = use.name === 'Bash' ? unquoted(String(use.input?.command ?? '')) : '';
        if (PR_CREATE.test(command)) counts.pullRequestsCreated += 1;
        if (CI_FAILURE_READ.test(command)) counts.ciFailureReads += 1;
      }
    }
  }
  counts.sessions = sessions.size;
  return {
    period: { from, to },
    counts,
    correctionsByRule,
    ratios: {
      reviewerDispatchesPerSession: ratio(counts.reviewerDispatches, counts.sessions),
      auditorDispatchesPerSession: ratio(counts.auditorDispatches, counts.sessions),
      reviewerDispatchesPerPullRequest: ratio(
        counts.reviewerDispatches,
        counts.pullRequestsCreated
      ),
      auditorDispatchesPerPullRequest: ratio(counts.auditorDispatches, counts.pullRequestsCreated),
      ciFailureReadsPerPullRequest: ratio(counts.ciFailureReads, counts.pullRequestsCreated),
      ownerCorrectionsPerSession: ratio(counts.ownerCorrections, counts.sessions),
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const from = argument(args, '--from');
  const to = argument(args, '--to');
  if (!from || !to || from >= to) usage();
  const root = process.env.AGENTIC_TRANSCRIPTS_DIR || join(homedir(), '.claude', 'projects');
  try {
    if (!statSync(root).isDirectory()) usage();
  } catch {
    usage();
  }
  process.stdout.write(`${JSON.stringify(dailyUse({ root, from, to }), null, 2)}\n`);
}
