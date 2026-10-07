#!/usr/bin/env node
/**
 * ad-hooks receipt gates — the publish receipt (ADR-0089, task-0109).
 *
 * `node publish-receipt.mjs record --destination <target> --body-file <file>`
 * appends one receipt for an approved outward text to
 * `<repo>/.agentic/receipts/publish.jsonl`: the destination, the SHA-256 of
 * the normalized body and the approval time. `ad-publish` runs it after the
 * owner approves, then posts from the same file (GROUND-0041).
 *
 * Normalization: line endings become LF, trailing whitespace on each line and
 * trailing newlines are removed; nothing else changes, so a reformatted but
 * identical body matches and any other edit does not.
 *
 * The receipt is a local working copy; the durable record of an approval
 * stays the tracked task Notes or pull request body.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RECEIPTS_DIR, repositoryRoot } from './gate-run.mjs';

export const PUBLISH_FILE = 'publish.jsonl';

export function normalizeBody(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

export function bodyHash(text) {
  return createHash('sha256').update(normalizeBody(text)).digest('hex');
}

export function publishFile(root) {
  return join(root, RECEIPTS_DIR, PUBLISH_FILE);
}

/** Every publish receipt, oldest first, and the count of unreadable lines. */
export function readPublishReceipts(root) {
  const file = publishFile(root);
  const receipts = [];
  let unreadable = 0;
  if (!existsSync(file)) return { receipts, unreadable };
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const receipt = JSON.parse(line);
      if (receipt && typeof receipt.sha256 === 'string') receipts.push(receipt);
      else unreadable += 1;
    } catch {
      unreadable += 1;
    }
  }
  return { receipts, unreadable };
}

export function recordPublishReceipt(cwd, { destination, bodyFile }) {
  const root = repositoryRoot(cwd);
  const path = isAbsolute(bodyFile) ? bodyFile : join(cwd, bodyFile);
  const receipt = {
    at: new Date().toISOString(),
    destination,
    sha256: bodyHash(readFileSync(path, 'utf8')),
  };
  mkdirSync(join(root, RECEIPTS_DIR), { recursive: true });
  appendFileSync(publishFile(root), `${JSON.stringify(receipt)}\n`);
  return receipt;
}

/** The evidence for one outgoing body: `clear` when a receipt has its hash. */
export function checkPublish(cwd, body) {
  const root = repositoryRoot(cwd);
  const sha256 = bodyHash(body);
  const { receipts, unreadable } = readPublishReceipts(root);
  const receipt = [...receipts].reverse().find((r) => r.sha256 === sha256) ?? null;
  return {
    check: 'publish',
    state: receipt ? 'clear' : 'would-block',
    body_sha256: sha256,
    receipt: receipt ? receipt.destination : null,
    missing: receipt ? [] : ['publish'],
    unreadable_receipts: unreadable,
    reproduction:
      'approve the exact text through /ad-publish, which runs: node <ad-hooks>/scripts/' +
      'publish-receipt.mjs record --destination "<target>" --body-file <file>',
  };
}

const OPERATORS = ['&&', '||', ';', '|', '&', '\n'];
const QUOTED_HEREDOC = /^\$\(cat <<-?(['"])([A-Za-z_]\w*)\1\n([\s\S]*?)\n\2\n?\)/;

// A single-quoted string: literal up to the closing quote.
function singleQuoted(command, start) {
  const close = command.indexOf("'", start + 1);
  const end = close === -1 ? command.length : close;
  return { text: command.slice(start + 1, end), unreadable: false, end };
}

// A double-quoted string. "$(cat <<'EOF' ... EOF)" with a quoted delimiter is
// literal text, less the trailing newlines the substitution drops; any other
// `$` or backtick makes the word unreadable.
function doubleQuoted(command, start) {
  let text = '';
  let unreadable = false;
  let i = start + 1;
  for (; i < command.length && command[i] !== '"'; i += 1) {
    const heredoc = QUOTED_HEREDOC.exec(command.slice(i));
    const next = command[i + 1];
    if (heredoc) {
      text += heredoc[3].replace(/\n+$/, '');
      i += heredoc[0].length - 1;
    } else if (command[i] === '\\' && next === '\n') {
      i += 1;
    } else if (command[i] === '\\' && '"\\$`'.includes(next)) {
      text += next;
      i += 1;
    } else {
      unreadable ||= command[i] === '$' || command[i] === '`';
      text += command[i];
    }
  }
  return { text, unreadable, end: i };
}

// One unquoted character or escape: a line continuation adds nothing.
function bare(command, start) {
  const char = command[start];
  if (char !== '\\') return { text: char, unreadable: char === '$' || char === '`', end: start };
  if (command[start + 1] === '\n') return { text: '', unreadable: false, end: start + 1 };
  return { text: command[start + 1] ?? '', unreadable: false, end: start + 1 };
}

/**
 * Split a shell command into words and operators, without running anything.
 * Quotes and backslash escapes are honoured; a word that holds a parameter
 * expansion, a command substitution or a backtick is marked unreadable, since
 * its value is only known when the shell runs it (GROUND-0041 E4).
 */
export function tokenize(command) {
  const items = [];
  let word = null;
  const close = () => {
    if (word) items.push(word);
    word = null;
  };
  for (let i = 0; i < command.length; i += 1) {
    const operator = OPERATORS.find((candidate) => command.startsWith(candidate, i));
    if (operator) {
      close();
      items.push({ op: operator });
      i += operator.length - 1;
      continue;
    }
    if (command[i] === ' ' || command[i] === '\t') {
      close();
      continue;
    }
    const reader = { "'": singleQuoted, '"': doubleQuoted }[command[i]] ?? bare;
    const part = reader(command, i);
    if (part.text || part.unreadable || reader !== bare) {
      word ??= { value: '', unreadable: false };
      word.value += part.text;
      word.unreadable ||= part.unreadable;
    }
    i = part.end;
  }
  close();
  return items;
}

function segments(items) {
  const result = [[]];
  for (const item of items) {
    if (item.op) result.push([]);
    else result[result.length - 1].push(item);
  }
  return result;
}

function commentBody(action, args, context) {
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i].value;
    const [name, inline] = flag.includes('=') ? flag.split(/=(.*)/s) : [flag, undefined];
    const value =
      inline !== undefined ? { value: inline, unreadable: args[i].unreadable } : args[i + 1];
    if (name === '--delete-last') return null;
    if (['-e', '--editor', '-w', '--web'].includes(name)) {
      return { action, unreadable: `${name} writes the body interactively` };
    }
    if (name === '-b' || name === '--body') {
      if (!value || value.unreadable)
        return { action, unreadable: 'the body holds a shell expansion' };
      return { action, body: value.value };
    }
    if (name === '-F' || name === '--body-file') {
      if (!value || value.unreadable)
        return { action, unreadable: 'the body file path holds a shell expansion' };
      if (value.value === '-')
        return { action, unreadable: 'the body is read from standard input' };
      return bodyFromFile(action, value.value, context);
    }
  }
  return { action, unreadable: 'no body flag; gh would prompt for it' };
}

// Chat tools that post a message, and the input field holding its text
// (GROUND-0041 E2). Another connector is added here.
const CHAT_SEND_TOOLS = [{ pattern: /^mcp__.+__slack_send_message$/, field: 'message' }];

// A design choice: far above any comment body, small enough to keep the hook
// fast.
export const MAX_BODY_BYTES = 1024 * 1024;

// A body file read here must be the file the command will send. A path the
// shell resolves differently (after a `cd`, or under `~`), a non-regular or
// oversized file, or one that cannot be read leaves the body unknown, never a
// missing receipt.
function bodyFromFile(action, value, context) {
  if (value.startsWith('~')) return { action, unreadable: `${value} is expanded by the shell` };
  // AGENTS.md: the agent never reads these, and neither does its hook.
  if (/(^|\/)(\.env(\.[^/]*)?|\.npmrc)$/.test(value)) {
    return { action, unreadable: `${value} is not read by the gate` };
  }
  if (!isAbsolute(value) && context.changedDirectory) {
    return { action, unreadable: `${value} is relative to a directory changed earlier` };
  }
  const path = isAbsolute(value) ? value : join(context.cwd, value);
  try {
    const stat = statSync(path);
    if (!stat.isFile()) return { action, unreadable: `${value} is not a regular file` };
    if (stat.size > MAX_BODY_BYTES) return { action, unreadable: `${value} exceeds the size cap` };
    return { action, body: readFileSync(path, 'utf8') };
  } catch (error) {
    return { action, unreadable: `cannot read ${value} (${error.code})` };
  }
}

// `gh api <path>/comments` with a `body` field or an `--input` JSON body; a
// call without one (a listing) publishes nothing.
function apiBody(args, context) {
  const action = 'gh api comments';
  if (!args.some((w) => /\/comments(\/|$|\?)/.test(w.value))) return null;
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i].value;
    const next = args[i + 1];
    if (['-f', '--raw-field', '-F', '--field'].includes(name) && next?.value.startsWith('body=')) {
      if (next.unreadable) return { action, unreadable: 'the body holds a shell expansion' };
      const value = next.value.slice('body='.length);
      // Only the typed -F/--field reads `@<path>` from a file (GROUND-0041 E1).
      const fromFile = (name === '-F' || name === '--field') && value.startsWith('@');
      if (!fromFile) return { action, body: value };
      if (value === '@-') return { action, unreadable: 'the body is read from standard input' };
      return bodyFromFile(action, value.slice(1), context);
    }
    if (name === '--input') {
      if (!next || next.unreadable || next.value === '-') {
        return { action, unreadable: 'the request body is not a readable file' };
      }
      const input = bodyFromFile(action, next.value, context);
      if (input.unreadable) return input;
      let body;
      try {
        body = JSON.parse(input.body).body;
      } catch {
        return { action, unreadable: `${next.value} is not JSON` };
      }
      return typeof body === 'string' ? { action, body } : null;
    }
  }
  return null;
}

/**
 * The outward publications a tool call performs, in order: each `{ action,
 * body }`, or `{ action, unreadable }` when its body cannot be known before it
 * runs. Empty when it publishes nothing.
 */
export function outgoingPublications(event, cwd, githubCommands = ['gh']) {
  const chat = CHAT_SEND_TOOLS.find((t) => t.pattern.test(String(event.tool_name)));
  if (chat) {
    const body = event.tool_input?.[chat.field];
    return [
      typeof body === 'string'
        ? { action: 'chat send', body }
        : { action: 'chat send', unreadable: `no ${chat.field} text in the tool input` },
    ];
  }
  const command = event.tool_name === 'Bash' ? event.tool_input?.command : null;
  if (typeof command !== 'string') return [];
  const publications = [];
  const context = { cwd, changedDirectory: false };
  for (const words of segments(tokenize(command))) {
    // The first word after any assignment, with a subshell or group opener
    // stripped: `( cd sub; ...)` changes directory too.
    const program = words
      .map((word) => word.value.replace(/^[({]+/, ''))
      .find((value) => value && !/^\w+=/.test(value));
    if (['cd', 'pushd', 'popd'].includes(program)) context.changedDirectory = true;
    const at = words.findIndex((w) => githubCommands.includes(w.value));
    if (at === -1) continue;
    const [kind, verb] = [words[at + 1]?.value, words[at + 2]?.value];
    if ((kind === 'pr' || kind === 'issue') && verb === 'comment') {
      const publication = commentBody(`gh ${kind} comment`, words.slice(at + 3), context);
      if (publication) publications.push(publication);
    }
    if (kind === 'api') {
      const publication = apiBody(words.slice(at + 2), context);
      if (publication) publications.push(publication);
    }
  }
  return publications;
}

function parseArgs(argv) {
  const [verb, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) options[rest[i]] = rest[i + 1];
  if (verb !== 'record' || !options['--destination'] || !options['--body-file']) return null;
  return { destination: options['--destination'], bodyFile: options['--body-file'] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    process.stderr.write(
      'usage: publish-receipt.mjs record --destination "<target>" --body-file <file>\n'
    );
    process.exitCode = 64;
    return;
  }
  let receipt;
  try {
    receipt = recordPublishReceipt(process.cwd(), args);
  } catch (error) {
    const reason = String(error.message).split('\n')[0];
    process.stderr.write(`publish-receipt: no receipt recorded (${reason})\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `publish-receipt: recorded ${receipt.sha256.slice(0, 12)} for ${receipt.destination}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
