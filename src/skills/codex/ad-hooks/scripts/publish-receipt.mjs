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
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
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

/** The newest receipt whose hash equals the outgoing body's, or null. */
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

/**
 * Split a shell command into words and operators, without running anything.
 * Quotes and backslash escapes are honoured; a word that holds a parameter
 * expansion, a command substitution or a backtick is marked unreadable, since
 * its value is only known when the shell runs it (GROUND-0041 E4).
 */
export function tokenize(command) {
  const items = [];
  let word = null;
  const begin = () => {
    if (!word) word = { value: '', unreadable: false };
  };
  const end = () => {
    if (word) items.push(word);
    word = null;
  };
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    const op = OPERATORS.find((o) => command.startsWith(o, i));
    if (op) {
      end();
      items.push({ op });
      i += op.length - 1;
    } else if (char === ' ' || char === '\t') {
      end();
    } else if (char === "'") {
      begin();
      const close = command.indexOf("'", i + 1);
      const stop = close === -1 ? command.length : close;
      word.value += command.slice(i + 1, stop);
      i = stop;
    } else if (char === '"') {
      begin();
      for (i += 1; i < command.length && command[i] !== '"'; i += 1) {
        // "$(cat <<'EOF' ... EOF)": a quoted delimiter keeps the text literal,
        // and the substitution drops trailing newlines.
        const heredoc = QUOTED_HEREDOC.exec(command.slice(i));
        if (heredoc) {
          word.value += heredoc[3].replace(/\n+$/, '');
          i += heredoc[0].length - 1;
          continue;
        }
        if (command[i] === '\\' && '"\\$`'.includes(command[i + 1])) {
          word.value += command[i + 1];
          i += 1;
        } else {
          if (command[i] === '$' || command[i] === '`') word.unreadable = true;
          word.value += command[i];
        }
      }
    } else if (char === '\\') {
      begin();
      word.value += command[i + 1] ?? '';
      i += 1;
    } else {
      begin();
      if (char === '$' || char === '`') word.unreadable = true;
      word.value += char;
    }
  }
  end();
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

function commentBody(action, args, cwd) {
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
      return bodyFromFile(action, value.value, cwd);
    }
  }
  return { action, unreadable: 'no body flag; gh would prompt for it' };
}

// Chat tools that post a message, and the input field holding its text
// (GROUND-0041 E2). Another connector is added here.
const CHAT_SEND_TOOLS = [{ pattern: /^mcp__.+__slack_send_message$/, field: 'message' }];

// A body file read here is the file the command will send; one that cannot be
// read leaves the body unknown, never a missing receipt.
function bodyFromFile(action, value, cwd) {
  const path = isAbsolute(value) ? value : join(cwd, value);
  try {
    return { action, body: readFileSync(path, 'utf8') };
  } catch (error) {
    return { action, unreadable: `cannot read ${value} (${error.code})` };
  }
}

// `gh api <path>/comments` with a `body` field or an `--input` JSON body; a
// call without one (a listing) publishes nothing.
function apiBody(args, cwd) {
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
      return bodyFromFile(action, value.slice(1), cwd);
    }
    if (name === '--input') {
      if (!next || next.unreadable || next.value === '-') {
        return { action, unreadable: 'the request body is not a readable file' };
      }
      const input = bodyFromFile(action, next.value, cwd);
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
 * The outward publication a tool call performs: `{ action, body }`, or
 * `{ action, unreadable }` when its body cannot be known before it runs, or
 * null when it publishes nothing.
 */
export function outgoingPublication(event, cwd, githubCommands = ['gh']) {
  const chat = CHAT_SEND_TOOLS.find((t) => t.pattern.test(String(event.tool_name)));
  if (chat) {
    const body = event.tool_input?.[chat.field];
    return typeof body === 'string'
      ? { action: 'chat send', body }
      : { action: 'chat send', unreadable: `no ${chat.field} text in the tool input` };
  }
  const command = event.tool_name === 'Bash' ? event.tool_input?.command : null;
  if (typeof command !== 'string') return null;
  for (const words of segments(tokenize(command))) {
    const at = words.findIndex((w) => githubCommands.includes(w.value));
    if (at === -1) continue;
    const [kind, verb] = [words[at + 1]?.value, words[at + 2]?.value];
    if ((kind === 'pr' || kind === 'issue') && verb === 'comment') {
      return commentBody(`gh ${kind} comment`, words.slice(at + 3), cwd);
    }
    if (kind === 'api') {
      const publication = apiBody(words.slice(at + 2), cwd);
      if (publication) return publication;
    }
  }
  return null;
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
  const receipt = recordPublishReceipt(process.cwd(), args);
  process.stdout.write(
    `publish-receipt: recorded ${receipt.sha256.slice(0, 12)} for ${receipt.destination}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
